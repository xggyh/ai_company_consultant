from __future__ import annotations

import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote

import requests

from records import ArticleRecord, ModelRecord


def _supabase_config() -> tuple[str, str]:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()
    )
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE service/anon key.")
    return url.rstrip("/"), key


def _headers(key: str, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _request(
    method: str,
    url: str,
    key: str,
    payload: dict[str, object] | list[dict[str, object]] | None = None,
    prefer: str | None = None,
) -> list[dict[str, object]]:
    response = requests.request(
        method,
        url,
        json=payload,
        headers=_headers(key, prefer),
        timeout=30,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase request failed [{response.status_code}] {response.text}")
    if not response.text.strip():
        return []
    parsed = response.json()
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        return [parsed]
    return []


def _is_missing_column_error(error: Exception, column: str) -> bool:
    return column in str(error)


def _normalize_timestamp(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None

    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(raw)
        except Exception:  # noqa: BLE001
            return None
    return parsed.astimezone(timezone.utc).isoformat()


def _model_payload(row: ModelRecord) -> dict[str, object]:
    return {
        "name": row.name.strip(),
        "provider": row.provider.strip(),
        "description": row.description.strip() if row.description else None,
        "cost_input": row.cost_input,
        "cost_output": row.cost_output,
        "api_url": row.api_url,
        "docs_url": row.docs_url,
        "business_scenarios": row.business_scenarios,
        "release_date": row.release_date,
        "source_url": row.source_url,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _article_payload(row: ArticleRecord) -> dict[str, object]:
    return {
        "title": row.title.strip(),
        "summary": row.summary.strip() if row.summary else None,
        "content": row.content.strip() if row.content else None,
        "source": row.source.strip() if row.source else None,
        "url": row.url.strip(),
        "tags": row.tags,
        "published_at": _normalize_timestamp(row.published_at),
    }


def upsert_models(rows: list[ModelRecord], run_id: str | None = None) -> int:
    if not rows:
        return 0
    base_url, key = _supabase_config()
    persisted = 0
    crawled_at = datetime.now(timezone.utc).isoformat()

    for row in rows:
        name = row.name.strip()
        provider = row.provider.strip()
        if not name or not provider:
            continue

        existing_url = (
            f"{base_url}/rest/v1/models"
            f"?select=id&name=eq.{quote(name, safe='')}"
            f"&provider=eq.{quote(provider, safe='')}&limit=1"
        )
        existing = _request("GET", existing_url, key)
        payload = _model_payload(row)
        if run_id:
            payload["crawl_run_id"] = run_id
        payload["last_crawled_at"] = crawled_at

        try:
            if existing:
                model_id = str(existing[0]["id"])
                patch_url = f"{base_url}/rest/v1/models?id=eq.{quote(model_id, safe='')}"
                _request("PATCH", patch_url, key, payload=payload, prefer="return=minimal")
            else:
                insert_url = f"{base_url}/rest/v1/models"
                _request("POST", insert_url, key, payload=payload, prefer="return=minimal")
        except RuntimeError as error:
            if _is_missing_column_error(error, "crawl_run_id") or _is_missing_column_error(
                error, "last_crawled_at"
            ):
                fallback_payload = dict(payload)
                fallback_payload.pop("crawl_run_id", None)
                fallback_payload.pop("last_crawled_at", None)
                if existing:
                    model_id = str(existing[0]["id"])
                    patch_url = f"{base_url}/rest/v1/models?id=eq.{quote(model_id, safe='')}"
                    _request("PATCH", patch_url, key, payload=fallback_payload, prefer="return=minimal")
                else:
                    insert_url = f"{base_url}/rest/v1/models"
                    _request("POST", insert_url, key, payload=fallback_payload, prefer="return=minimal")
            else:
                raise
        persisted += 1

    return persisted


def upsert_articles(rows: list[ArticleRecord], run_id: str | None = None) -> int:
    if not rows:
        return 0

    base_url, key = _supabase_config()
    crawled_at = datetime.now(timezone.utc).isoformat()
    payloads = []
    for row in rows:
        if not row.url.strip() or not row.title.strip():
            continue
        payload = _article_payload(row)
        if run_id:
            payload["crawl_run_id"] = run_id
        payload["last_crawled_at"] = crawled_at
        payloads.append(payload)
    if not payloads:
        return 0

    upsert_url = f"{base_url}/rest/v1/articles?on_conflict=url"
    try:
        _request(
            "POST",
            upsert_url,
            key,
            payload=payloads,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except RuntimeError as error:
        if _is_missing_column_error(error, "crawl_run_id") or _is_missing_column_error(
            error, "last_crawled_at"
        ):
            fallback_payloads: list[dict[str, object]] = []
            for payload in payloads:
                fallback = dict(payload)
                fallback.pop("crawl_run_id", None)
                fallback.pop("last_crawled_at", None)
                fallback_payloads.append(fallback)
            _request(
                "POST",
                upsert_url,
                key,
                payload=fallback_payloads,
                prefer="resolution=merge-duplicates,return=minimal",
            )
        else:
            raise
    return len(payloads)


def insert_crawler_run(
    *,
    run_id: str,
    started_at: str,
    finished_at: str,
    status: str,
    model_persisted: int,
    article_persisted: int,
    error_message: str | None = None,
) -> None:
    base_url, key = _supabase_config()
    payload = {
        "id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "status": status,
        "model_persisted": model_persisted,
        "article_persisted": article_persisted,
        "error_message": error_message,
    }
    insert_url = f"{base_url}/rest/v1/crawler_runs"
    try:
        _request("POST", insert_url, key, payload=payload, prefer="return=minimal")
    except RuntimeError as error:
        if "crawler_runs" in str(error):
            return
        raise
