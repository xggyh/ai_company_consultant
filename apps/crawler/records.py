from dataclasses import dataclass, field


@dataclass
class ModelRecord:
    name: str
    provider: str
    description: str = ""
    cost_input: float | None = None
    cost_output: float | None = None
    api_url: str | None = None
    docs_url: str | None = None
    business_scenarios: list[str] = field(default_factory=list)
    release_date: str | None = None
    source_url: str = ""


@dataclass
class ArticleRecord:
    title: str
    source: str
    url: str
    summary: str = ""
    content: str = ""
    tags: list[str] = field(default_factory=list)
    published_at: str | None = None
