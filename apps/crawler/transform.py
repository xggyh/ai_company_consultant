from __future__ import annotations

from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

TRACKING_QUERY_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "spm",
    "from",
    "from_source",
}


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower() or "https"
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    query_pairs = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k not in TRACKING_QUERY_KEYS
    ]
    query = urlencode(query_pairs)
    return urlunparse((scheme, netloc, path, "", query, ""))


def dedupe_by_url(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        raw_url = str(item.get("url", "")).strip()
        if not raw_url:
            continue
        url = normalize_url(raw_url)
        if url in seen:
            continue
        seen.add(url)
        normalized = {**item, "url": url}
        result.append(normalized)
    return result


def normalize_model_name(name: str) -> str:
    normalized = name.lower().replace("_", " ").replace("-", " ")
    return " ".join(normalized.split())


def dedupe_models_by_provider_name(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    result: list[dict[str, Any]] = []

    for item in items:
        provider = str(item.get("provider", "")).strip().lower()
        name = normalize_model_name(str(item.get("name", "")))
        if not provider or not name:
            continue
        key = (provider, name)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)

    return result
