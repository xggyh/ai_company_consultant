from transform import dedupe_by_url, dedupe_models_by_provider_name, normalize_url


def test_dedupe_by_url_removes_duplicates():
    items = [
        {"url": "https://a.com/1", "title": "A"},
        {"url": "https://a.com/1", "title": "A-dup"},
        {"url": "https://a.com/2", "title": "B"},
    ]
    result = dedupe_by_url(items)
    assert len(result) == 2


def test_normalize_url_removes_tracking_query():
    url = "https://A.com/path/?utm_source=x&k=v"
    assert normalize_url(url) == "https://a.com/path?k=v"


def test_dedupe_models_by_provider_name():
    items = [
        {"provider": "LiteLLM", "name": "Code-Copilot", "url": "a"},
        {"provider": "litellm", "name": "code copilot", "url": "b"},
        {"provider": "OpenRouter", "name": "A", "url": "c"},
    ]
    result = dedupe_models_by_provider_name(items)
    assert len(result) == 2
