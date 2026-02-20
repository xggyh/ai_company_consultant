from records import ArticleRecord, ModelRecord



def test_enrich_articles_without_ark_key_returns_local_fallback(monkeypatch):
    monkeypatch.delenv("ARK_API_KEY", raising=False)

    from ark_enrich import enrich_articles

    rows = [
        ArticleRecord(
            title="企业私有知识库问答的架构清单",
            source="量子位",
            url="https://example.com/a",
            content="这是一篇关于知识库和RAG实践的文章，包含实施路径与成本分析。",
        )
    ]

    enriched = enrich_articles(rows)

    assert len(enriched) == 1
    assert enriched[0].summary
    assert isinstance(enriched[0].tags, list)
    assert enriched[0].tags



def test_enrich_models_without_ark_key_returns_local_fallback(monkeypatch):
    monkeypatch.delenv("ARK_API_KEY", raising=False)

    from ark_enrich import enrich_models

    rows = [
        ModelRecord(
            name="Code Copilot",
            provider="LiteLLM",
            description="",
            source_url="https://example.com/m",
        )
    ]

    enriched = enrich_models(rows)

    assert len(enriched) == 1
    assert enriched[0].description
    assert isinstance(enriched[0].business_scenarios, list)


def test_enrich_models_normalizes_alias_tags(monkeypatch):
    from ark_enrich import enrich_models

    monkeypatch.setattr("ark_enrich._build_client", lambda: object())
    monkeypatch.setattr(
        "ark_enrich._call_ark_json",
        lambda *_args, **_kwargs: {
            "description": "企业级助手",
            "business_scenarios": ["企业知识管理", "智能客服", "数据分析洞察"],
        },
    )

    rows = [
        ModelRecord(
            name="Ark Enterprise Chat",
            provider="ByteDance Ark",
            source_url="https://example.com/m",
        )
    ]
    enriched = enrich_models(rows)

    assert enriched[0].business_scenarios == ["知识问答", "客服对话", "数据分析"]
