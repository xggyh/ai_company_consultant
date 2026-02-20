from dataclasses import dataclass


@dataclass(frozen=True)
class Source:
    key: str
    name: str
    url: str
    fallback: str | None = None


MODEL_SOURCES = [
    Source(
        key="openrouter",
        name="OpenRouter",
        url="https://openrouter.ai/models",
        fallback="https://openrouter.ai/api/v1/models",
    ),
    Source(
        key="huggingface",
        name="HuggingFace Models",
        url="https://huggingface.co/models",
        fallback="https://huggingface.co/api/models?limit=50&sort=downloads",
    ),
    Source(
        key="litellm",
        name="LiteLLM",
        url="https://litellm.ai",
        fallback="https://docs.litellm.ai/docs/providers",
    ),
]

NEWS_SOURCES = [
    Source(
        key="jiqizhixin",
        name="机器之心",
        url="https://www.jiqizhixin.com",
        fallback="https://www.jiqizhixin.com/rss",
    ),
    Source(
        key="qbitai",
        name="量子位",
        url="https://www.qbitai.com",
        fallback="https://www.qbitai.com/feed",
    ),
    Source(
        key="36kr-ai",
        name="36氪AI",
        url="https://36kr.com/column/104812",
        fallback="https://36kr.com/feed",
    ),
    Source(
        key="tmtpost-ai",
        name="钛媒体AI",
        url="https://www.tmtpost.com/column/ai",
        fallback="https://www.tmtpost.com/rss",
    ),
    Source(
        key="ai-xinzhiyuan",
        name="新智元",
        url="https://www.ai-xinzhiyuan.com",
        fallback="https://www.ai-xinzhiyuan.com/feed",
    ),
    Source(
        key="infoq-ai",
        name="InfoQ中国",
        url="https://www.infoq.cn/topic/artificial-intelligence",
        fallback="https://www.infoq.cn/feed",
    ),
]

MODEL_DAILY_LIMIT = 50
NEWS_DAILY_LIMIT = 20
NEWS_DETAIL_RETRY = 3
ARK_RETRY = 2
