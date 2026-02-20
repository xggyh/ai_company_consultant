from __future__ import annotations

import json
import os
import re
import time
from dataclasses import replace
from typing import Any

from records import ArticleRecord, ModelRecord
from sources import ARK_RETRY

try:
    from openai import OpenAI
except Exception:  # noqa: BLE001
    OpenAI = None  # type: ignore[assignment]


ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark-ap-southeast.byteintl.net/api/v3")
ARK_MODEL = os.getenv("ARK_MODEL", "ep-20250831170629-d8d45")

TAG_KEYWORDS = {
    "知识问答": ["知识库", "问答", "rag", "检索"],
    "自动化工作流": ["agent", "流程", "自动化", "编排"],
    "决策辅助": ["分析", "策略", "决策", "roi"],
    "客服对话": ["客服", "对话", "聊天", "机器人"],
    "代码辅助": ["代码", "编程", "review", "debug"],
    "多模态": ["图文", "多模态", "视频", "语音"],
    "数据分析": ["报表", "数据", "指标", "洞察"],
}

CANONICAL_SCENARIOS = tuple(TAG_KEYWORDS.keys()) + (
    "内容生成",
    "文档处理",
    "图像处理",
    "语音处理",
)

TAG_ALIASES = {
    "企业知识管理": "知识问答",
    "智能客服": "客服对话",
    "数据分析洞察": "数据分析",
    "商业分析": "决策辅助",
}


def _build_client() -> Any | None:
    api_key = os.getenv("ARK_API_KEY", "").strip()
    if not api_key or OpenAI is None:
        return None
    return OpenAI(base_url=ARK_BASE_URL, api_key=api_key)


def _extract_json_payload(text: str) -> dict[str, Any] | None:
    raw = text.strip()
    if not raw:
        return None

    for candidate in [raw]:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def _call_ark_json(client: Any, prompt: str) -> dict[str, Any] | None:
    last_error: Exception | None = None
    for attempt in range(ARK_RETRY + 1):
        try:
            completion = client.chat.completions.create(
                model=ARK_MODEL,
                temperature=0.1,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an assistant that only returns valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = completion.choices[0].message.content if completion.choices else ""
            if isinstance(content, list):
                content = "".join(
                    part.get("text", "") if isinstance(part, dict) else str(part) for part in content
                )
            if not isinstance(content, str):
                content = str(content or "")
            payload = _extract_json_payload(content)
            if payload is not None:
                return payload
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt < ARK_RETRY:
                time.sleep(2**attempt)
    return None


def _normalize_tag(tag: str) -> str:
    clean = tag.strip()
    if not clean:
        return ""
    if clean in CANONICAL_SCENARIOS:
        return clean
    if clean in TAG_ALIASES:
        return TAG_ALIASES[clean]
    lowered = clean.lower()
    for canonical, words in TAG_KEYWORDS.items():
        if any(word in lowered for word in words):
            return canonical
    return clean


def _normalize_tag_list(tags: list[str]) -> list[str]:
    normalized = [_normalize_tag(tag) for tag in tags]
    filtered = [tag for tag in normalized if tag]
    seen: set[str] = set()
    result: list[str] = []
    for tag in filtered:
        if tag in seen:
            continue
        seen.add(tag)
        result.append(tag)
    return result[:3]


def enrich_articles(records: list[ArticleRecord]) -> list[ArticleRecord]:
    client = _build_client()
    if client is None:
        raise RuntimeError("ARK_API_KEY is required for article enrichment")

    enriched: list[ArticleRecord] = []
    for row in records:
        prompt = (
            "请返回 JSON，结构为 "
            '{"summary":"不超过120字","tags":["最多3个中文标签"]}。\n'
            f"title={row.title}\n"
            f"source={row.source}\n"
            f"content={row.content[:1000]}"
        )
        payload = _call_ark_json(client, prompt)
        if not payload:
            raise RuntimeError(f"Ark enrich failed for article: {row.url}")
        summary = str(payload.get("summary") or "").strip()
        tags = payload.get("tags")
        safe_tags = (
            _normalize_tag_list([str(item).strip() for item in tags]) if isinstance(tags, list) else []
        )

        if not summary or not safe_tags:
            raise RuntimeError(f"Ark returned invalid article payload: {row.url}")
        enriched.append(replace(row, summary=summary[:120], tags=safe_tags[:3]))
    return enriched


def enrich_models(records: list[ModelRecord]) -> list[ModelRecord]:
    client = _build_client()
    if client is None:
        raise RuntimeError("ARK_API_KEY is required for model enrichment")

    enriched: list[ModelRecord] = []
    for row in records:
        prompt = (
            "请返回 JSON，结构为 "
            '{"description":"不超过80字中文描述","business_scenarios":["最多3个中文业务标签"]}。\n'
            f"name={row.name}\n"
            f"provider={row.provider}\n"
            f"description={row.description}"
        )
        payload = _call_ark_json(client, prompt)
        if not payload:
            raise RuntimeError(f"Ark enrich failed for model: {row.provider}/{row.name}")
        description = str(payload.get("description") or "").strip()
        scenarios = payload.get("business_scenarios")
        safe_scenarios = (
            _normalize_tag_list([str(item).strip() for item in scenarios]) if isinstance(scenarios, list) else []
        )

        if not description or not safe_scenarios:
            raise RuntimeError(f"Ark returned invalid model payload: {row.provider}/{row.name}")
        enriched.append(
            replace(
                row,
                description=description[:80],
                business_scenarios=safe_scenarios[:3],
            )
        )
    return enriched
