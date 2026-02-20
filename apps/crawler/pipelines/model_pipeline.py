from __future__ import annotations

from dataclasses import asdict

from adapters.models import fetch_models_for_source
from ark_enrich import enrich_models
from db import upsert_models
from records import ModelRecord
from sources import MODEL_DAILY_LIMIT, MODEL_SOURCES
from transform import dedupe_models_by_provider_name


def run_model_pipeline(limit_per_source: int = MODEL_DAILY_LIMIT, run_id: str | None = None) -> dict[str, int]:
    fetched: list[ModelRecord] = []
    for source in MODEL_SOURCES:
        try:
            fetched.extend(fetch_models_for_source(source, limit=limit_per_source))
        except Exception:  # noqa: BLE001
            continue

    deduped = dedupe_models_by_provider_name([asdict(row) for row in fetched])
    model_rows = [ModelRecord(**row) for row in deduped]
    enriched = enrich_models(model_rows)
    persisted = upsert_models(enriched, run_id=run_id)

    return {
        "sources": len(MODEL_SOURCES),
        "fetched": len(fetched),
        "deduped": len(model_rows),
        "persisted": persisted,
    }
