from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import asdict
from datetime import datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from http_client import fetch_text
from sources import NEWS_DETAIL_RETRY, Source
from transform import dedupe_by_url
from records import ArticleRecord


def _extract_links_from_listing(html: str, base_url: str, max_candidates: int = 200) -> list[dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    base_domain = urlparse(base_url).netloc

    links: list[dict[str, str]] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "").strip()
        text = " ".join(anchor.get_text(" ", strip=True).split())
        if not href or href.startswith("javascript:") or href.startswith("#"):
            continue
        if len(text) < 8 or len(text) > 120:
            continue

        url = urljoin(base_url, href)
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            continue
        if base_domain not in parsed.netloc:
            continue

        links.append({"title": text, "url": url})
        if len(links) >= max_candidates:
            break

    return dedupe_by_url(links)


def _extract_rss_items(xml_text: str, source_url: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    for node in root.findall(".//item"):
        title = (node.findtext("title") or "").strip()
        link = (node.findtext("link") or "").strip()
        pub = (node.findtext("pubDate") or node.findtext("published") or "").strip()
        if not title or not link:
            continue
        items.append(
            {
                "title": title,
                "url": urljoin(source_url, link),
                "published_at": pub,
            }
        )

    return dedupe_by_url(items)


def _extract_article_content(html: str) -> tuple[str, str, str | None]:
    soup = BeautifulSoup(html, "html.parser")

    title_node = soup.select_one("h1") or soup.select_one("title")
    title = title_node.get_text(" ", strip=True) if title_node else ""

    time_node = soup.select_one("time")
    published_at = None
    if time_node:
        published_at = time_node.get("datetime") or time_node.get_text(" ", strip=True)

    blocks = []
    article = soup.select_one("article")
    if article:
        blocks = [p.get_text(" ", strip=True) for p in article.find_all("p")]

    if not blocks:
        blocks = [p.get_text(" ", strip=True) for p in soup.find_all("p")]

    content = "\n".join([line for line in blocks if len(line) >= 20][:60])
    return title, content, published_at


def _fetch_detail_with_retry(url: str, retries: int) -> tuple[str, str, str | None]:
    last_title = ""
    for _ in range(retries):
        try:
            html = fetch_text(url, retries=1)
            title, content, published_at = _extract_article_content(html)
            last_title = title or last_title
            if title:
                return title, content, published_at
        except Exception:  # noqa: BLE001
            continue
    return last_title, "", None


def fetch_news_for_source(source: Source, limit: int) -> list[ArticleRecord]:
    candidates: list[dict[str, str]] = []

    try:
        listing_html = fetch_text(source.url, retries=1)
        candidates.extend(_extract_links_from_listing(listing_html, source.url, max_candidates=limit * 10))
    except Exception:  # noqa: BLE001
        pass

    if len(candidates) < limit and source.fallback:
        try:
            rss = fetch_text(source.fallback, retries=1)
            candidates.extend(_extract_rss_items(rss, source.url))
        except Exception:  # noqa: BLE001
            pass

    unique_candidates = dedupe_by_url(candidates)[:limit]

    records: list[ArticleRecord] = []
    for item in unique_candidates:
        title, content, published_at = _fetch_detail_with_retry(item["url"], NEWS_DETAIL_RETRY)
        final_title = title or item.get("title") or "Untitled"
        final_published = published_at or datetime.utcnow().isoformat()

        records.append(
            ArticleRecord(
                title=final_title,
                source=source.name,
                url=item["url"],
                content=content,
                published_at=final_published,
            )
        )

    deduped = dedupe_by_url([asdict(row) for row in records])
    return [ArticleRecord(**row) for row in deduped][:limit]
