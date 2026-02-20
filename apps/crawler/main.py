from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

from pipelines.model_pipeline import run_model_pipeline
from pipelines.news_pipeline import run_news_pipeline
from sources import MODEL_DAILY_LIMIT, NEWS_DAILY_LIMIT


def run(model_limit: int | None = None, news_limit: int | None = None) -> None:
    model_stats = run_model_pipeline(limit_per_source=model_limit or MODEL_DAILY_LIMIT)
    news_stats = run_news_pipeline(limit_per_source=news_limit or NEWS_DAILY_LIMIT)
    output = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
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
