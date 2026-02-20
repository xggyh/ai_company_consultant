from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from uuid import uuid4

from db import insert_crawler_run
from pipelines.model_pipeline import run_model_pipeline
from pipelines.news_pipeline import run_news_pipeline
from sources import MODEL_DAILY_LIMIT, NEWS_DAILY_LIMIT


def run(model_limit: int | None = None, news_limit: int | None = None) -> None:
    run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}_{uuid4().hex[:8]}"
    started_at = datetime.now(timezone.utc).isoformat()
    errors: list[str] = []

    model_stats = {"sources": 0, "fetched": 0, "deduped": 0, "persisted": 0}
    news_stats = {"sources": 0, "fetched": 0, "deduped": 0, "persisted": 0}

    try:
        model_stats = run_model_pipeline(limit_per_source=model_limit or MODEL_DAILY_LIMIT, run_id=run_id)
    except Exception as error:  # noqa: BLE001
        errors.append(f"model_pipeline: {error}")

    try:
        news_stats = run_news_pipeline(limit_per_source=news_limit or NEWS_DAILY_LIMIT, run_id=run_id)
    except Exception as error:  # noqa: BLE001
        errors.append(f"news_pipeline: {error}")

    model_persisted = int(model_stats.get("persisted", 0))
    article_persisted = int(news_stats.get("persisted", 0))

    if errors:
        status = "partial" if (model_persisted > 0 or article_persisted > 0) else "failed"
    elif model_persisted > 0 and article_persisted > 0:
        status = "success"
    elif model_persisted > 0 or article_persisted > 0:
        status = "partial"
    else:
        status = "failed"

    finished_at = datetime.now(timezone.utc).isoformat()
    error_message = "\n".join(errors) if errors else None
    insert_crawler_run(
        run_id=run_id,
        started_at=started_at,
        finished_at=finished_at,
        status=status,
        model_persisted=model_persisted,
        article_persisted=article_persisted,
        error_message=error_message,
    )

    output = {
        "run_id": run_id,
        "timestamp_utc": finished_at,
        "status": status,
        "errors": errors,
        "models": model_stats,
        "articles": news_stats,
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run crawler for models and articles.")
    parser.add_argument("--model-limit", type=int, default=0, help="Model limit per source")
    parser.add_argument("--news-limit", type=int, default=0, help="News limit per source")
    args = parser.parse_args()
    run(model_limit=args.model_limit, news_limit=args.news_limit)
