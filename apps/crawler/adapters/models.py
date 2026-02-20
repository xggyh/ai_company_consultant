from __future__ import annotations

from dataclasses import asdict
from typing import Any

from bs4 import BeautifulSoup

from http_client import fetch_json, fetch_text
from sources import Source
from transform import dedupe_models_by_provider_name
from records import ModelRecord

SCENARIO_MAP = {
    "text-generation": "内容生成",
    "text2text-generation": "内容生成",
    "question-answering": "知识问答",
    "summarization": "文档处理",
    "translation": "文档处理",
    "text-classification": "数据分析",
    "image-to-text": "图像处理",
    "image-classification": "图像处理",
    "automatic-speech-recognition": "语音处理",
    "feature-extraction": "数据分析",
}


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        num = float(str(value).replace("$", "").replace(",", "").strip())
        if num < 0:
            return None
        if 0 < num < 0.01:
            return round(num * 1_000_000, 4)
        return round(num, 4)
    except Exception:  # noqa: BLE001
        return None


def _openrouter(source: Source, limit: int) -> list[ModelRecord]:
    endpoint = source.fallback or source.url
    payload = fetch_json(endpoint)
    rows = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        return []

    records: list[ModelRecord] = []
    for item in rows[: limit * 2]:
        name = item.get("name") or item.get("id")
        if not name:
            continue
        pricing = item.get("pricing") or {}
        arch = item.get("architecture") or {}
        scenarios = []
        modality = arch.get("modality")
        if modality:
            scenarios.append("多模态" if "image" in str(modality).lower() else "内容生成")

        records.append(
            ModelRecord(
                name=str(name),
                provider="OpenRouter",
                description=str(item.get("description") or ""),
                cost_input=_safe_float(pricing.get("prompt")),
                cost_output=_safe_float(pricing.get("completion")),
                docs_url=str(item.get("id") or ""),
                business_scenarios=scenarios,
                source_url=f"https://openrouter.ai/models/{item.get('id')}"
                if item.get("id")
                else source.url,
            )
        )

    return records[:limit]


def _huggingface(source: Source, limit: int) -> list[ModelRecord]:
    endpoint = source.fallback or source.url
    rows = fetch_json(endpoint)
    if not isinstance(rows, list):
        return []

    records: list[ModelRecord] = []
    for item in rows[: limit * 2]:
        model_id = item.get("id")
        if not model_id:
            continue
        pipeline_tag = str(item.get("pipeline_tag") or "").lower()
        scenario = SCENARIO_MAP.get(pipeline_tag, "内容生成")
        records.append(
            ModelRecord(
                name=str(model_id),
                provider="HuggingFace",
                description=f"pipeline={pipeline_tag or 'unknown'}",
                business_scenarios=[scenario],
                source_url=f"https://huggingface.co/{model_id}",
            )
        )

    return records[:limit]


def _litellm(source: Source, limit: int) -> list[ModelRecord]:
    html = fetch_text(source.fallback or source.url)
    soup = BeautifulSoup(html, "html.parser")

    candidates: list[str] = []
    for code in soup.select("code"):
        text = code.get_text(" ", strip=True)
        if 2 <= len(text) <= 80 and "/" in text:
            candidates.append(text)
    for heading in soup.select("h2, h3, h4"):
        text = heading.get_text(" ", strip=True)
        if 4 <= len(text) <= 80:
            candidates.append(text)

    deduped = []
    seen = set()
    for name in candidates:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(name)

    if not deduped:
        deduped = ["gpt-4o-mini", "claude-3-5-sonnet", "deepseek-chat"]

    records = [
        ModelRecord(
            name=name,
            provider="LiteLLM",
            description="LiteLLM provider/model catalog entry",
            business_scenarios=["自动化工作流"],
            source_url=source.url,
        )
        for name in deduped[:limit]
    ]
    return records


def fetch_models_for_source(source: Source, limit: int) -> list[ModelRecord]:
    if source.key == "openrouter":
        records = _openrouter(source, limit)
    elif source.key == "huggingface":
        records = _huggingface(source, limit)
    elif source.key == "litellm":
        records = _litellm(source, limit)
    else:
        records = []

    deduped = dedupe_models_by_provider_name([asdict(item) for item in records])
    return [ModelRecord(**item) for item in deduped][:limit]
