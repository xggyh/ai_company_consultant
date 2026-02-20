from __future__ import annotations

from dataclasses import asdict

from adapters.news import fetch_news_for_source
from ark_enrich import enrich_articles
from db import upsert_articles
from records import ArticleRecord
from sources import NEWS_DAILY_LIMIT, NEWS_SOURCES
from transform import dedupe_by_url


def run_news_pipeline(limit_per_source: int = NEWS_DAILY_LIMIT) -> dict[str, int]:
    fetched: list[ArticleRecord] = []
    for source in NEWS_SOURCES:
        try:
            fetched.extend(fetch_news_for_source(source, limit=limit_per_source))
        except Exception:  # noqa: BLE001
            continue

    deduped = dedupe_by_url([asdict(row) for row in fetched])
    article_rows = [ArticleRecord(**row) for row in deduped]
    enriched = enrich_articles(article_rows)
    persisted = upsert_articles(enriched)

    return {
        "sources": len(NEWS_SOURCES),
        "fetched": len(fetched),
        "deduped": len(article_rows),
        "persisted": persisted,
    }
