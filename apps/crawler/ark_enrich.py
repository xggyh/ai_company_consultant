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
    if last_error:
        return None
    return None


def _fallback_tags(text: str) -> list[str]:
    lowered = text.lower()
    tags = [tag for tag, words in TAG_KEYWORDS.items() if any(word in lowered for word in words)]
    return tags or ["决策辅助"]


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
    return ""


def _normalize_tag_list(tags: list[str], fallback_text: str) -> list[str]:
    normalized = [_normalize_tag(tag) for tag in tags]
    filtered = [tag for tag in normalized if tag]
    if not filtered:
        return _fallback_tags(fallback_text)
    seen: set[str] = set()
    result: list[str] = []
    for tag in filtered:
        if tag in seen:
            continue
        seen.add(tag)
        result.append(tag)
    return result[:3]


def _fallback_article(record: ArticleRecord) -> ArticleRecord:
    seed = (record.content or record.title or "").strip()
    summary = re.sub(r"\s+", " ", seed)[:120]
    if not summary:
        summary = record.title
    tags = _fallback_tags(f"{record.title} {record.content}")
    return replace(record, summary=summary, tags=tags)


def _fallback_model(record: ModelRecord) -> ModelRecord:
    joined = f"{record.name} {record.description}"
    scenarios = _fallback_tags(joined)
    desc = (record.description or "").strip()
    if not desc:
        desc = f"{record.provider} 模型，适用于{('、'.join(scenarios[:2]))}场景。"
    return replace(record, description=desc, business_scenarios=scenarios)


def enrich_articles(records: list[ArticleRecord]) -> list[ArticleRecord]:
    client = _build_client()
    if client is None:
        return [_fallback_article(row) for row in records]

    enriched: list[ArticleRecord] = []
    for row in records:
        prompt = (
            "请返回 JSON，结构为 "
            '{"summary":"不超过120字","tags":["最多3个中文标签"]}。\n'
            f"title={row.title}\n"
            f"source={row.source}\n"
            f"content={row.content[:1000]}"
        )
        payload = _call_ark_json(client, prompt) or {}
        summary = str(payload.get("summary") or "").strip()
        tags = payload.get("tags")
        safe_tags = (
            _normalize_tag_list([str(item).strip() for item in tags], f"{row.title} {row.content}")
            if isinstance(tags, list)
            else _fallback_tags(f"{row.title} {row.content}")
        )

        if not summary or not safe_tags:
            enriched.append(_fallback_article(row))
            continue
        enriched.append(replace(row, summary=summary[:120], tags=safe_tags[:3]))
    return enriched


def enrich_models(records: list[ModelRecord]) -> list[ModelRecord]:
    client = _build_client()
    if client is None:
        return [_fallback_model(row) for row in records]

    enriched: list[ModelRecord] = []
    for row in records:
        prompt = (
            "请返回 JSON，结构为 "
            '{"description":"不超过80字中文描述","business_scenarios":["最多3个中文业务标签"]}。\n'
            f"name={row.name}\n"
            f"provider={row.provider}\n"
            f"description={row.description}"
        )
        payload = _call_ark_json(client, prompt) or {}
        description = str(payload.get("description") or "").strip()
        scenarios = payload.get("business_scenarios")
        safe_scenarios = (
            _normalize_tag_list([str(item).strip() for item in scenarios], f"{row.name} {row.description}")
            if isinstance(scenarios, list)
            else _fallback_tags(f"{row.name} {row.description}")
        )

        if not description or not safe_scenarios:
            enriched.append(_fallback_model(row))
            continue
        enriched.append(
            replace(
                row,
                description=description[:80],
                business_scenarios=safe_scenarios[:3],
            )
        )
    return enriched
