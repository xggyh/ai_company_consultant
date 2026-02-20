from records import ArticleRecord, ModelRecord
from sources import Source



def test_run_model_pipeline_dedupes_by_provider_name(monkeypatch):
    from pipelines import model_pipeline

    fake_sources = [
        Source(key="a", name="A", url="https://a.example"),
        Source(key="b", name="B", url="https://b.example"),
    ]

    def fake_fetch(source, limit):
        if source.key == "a":
            return [
                ModelRecord(name="Code Copilot", provider="LiteLLM", source_url="https://x/1"),
                ModelRecord(name="Code-Copilot", provider="litellm", source_url="https://x/2"),
            ]
        return [
            ModelRecord(name="Ark Enterprise Chat", provider="ByteDance Ark", source_url="https://x/3"),
        ]

    persisted = {}

    monkeypatch.setattr(model_pipeline, "MODEL_SOURCES", fake_sources)
    monkeypatch.setattr(model_pipeline, "fetch_models_for_source", fake_fetch)
    monkeypatch.setattr(model_pipeline, "enrich_models", lambda rows: rows)

    def fake_upsert(rows):
        persisted["rows"] = rows
        return len(rows)

    monkeypatch.setattr(model_pipeline, "upsert_models", fake_upsert)

    stats = model_pipeline.run_model_pipeline(limit_per_source=50)

    assert stats["sources"] == 2
    assert stats["fetched"] == 3
    assert stats["deduped"] == 2
    assert stats["persisted"] == 2
    assert len(persisted["rows"]) == 2



def test_run_news_pipeline_dedupes_by_normalized_url(monkeypatch):
    from pipelines import news_pipeline

    fake_sources = [
        Source(key="a", name="A", url="https://a.example"),
        Source(key="b", name="B", url="https://b.example"),
    ]

    def fake_fetch(source, limit):
        if source.key == "a":
            return [
                ArticleRecord(
                    title="t1",
                    source="A",
                    url="https://a.example/post?id=1&utm_source=wx",
                    content="hello",
                )
            ]
        return [
            ArticleRecord(
                title="t1-dup",
                source="B",
                url="https://a.example/post?id=1",
                content="dup",
            ),
            ArticleRecord(
                title="t2",
                source="B",
                url="https://b.example/post/2",
                content="world",
            ),
        ]

    persisted = {}

    monkeypatch.setattr(news_pipeline, "NEWS_SOURCES", fake_sources)
    monkeypatch.setattr(news_pipeline, "fetch_news_for_source", fake_fetch)
    monkeypatch.setattr(news_pipeline, "enrich_articles", lambda rows: rows)

    def fake_upsert(rows):
        persisted["rows"] = rows
        return len(rows)

    monkeypatch.setattr(news_pipeline, "upsert_articles", fake_upsert)

    stats = news_pipeline.run_news_pipeline(limit_per_source=20)

    assert stats["sources"] == 2
    assert stats["fetched"] == 3
    assert stats["deduped"] == 2
    assert stats["persisted"] == 2
    assert len(persisted["rows"]) == 2
