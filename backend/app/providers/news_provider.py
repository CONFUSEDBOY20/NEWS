import asyncio
import hashlib
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List, Optional, Dict, Tuple
from urllib.parse import quote_plus, urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup

from app.providers.base import BaseNewsProvider
from app.schemas.news import NewsArticle
from app.core.config import settings

CACHE_TTL_SECONDS = 90
_FEED_CACHE: Dict[str, Tuple[float, List[NewsArticle]]] = {}

USER_AGENT = (
    "Mozilla/5.0 (compatible; TruthLens/2.0; +https://truthlens.ai) "
    "AppleWebKit/537.36 Chrome/124.0.0.0"
)

GOOGLE_TOPIC_MAP = {
    "politics": "WORLD",
    "technology": "TECHNOLOGY",
    "health": "HEALTH",
    "economy": "BUSINESS",
    "science": "SCIENCE",
    "climate": "CLIMATE",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_id(prefix: str, url: str, title: str) -> str:
    raw = f"{url}|{title}".encode("utf-8", errors="ignore")
    return f"{prefix}-{hashlib.sha1(raw).hexdigest()[:12]}"


def _parse_date(value: Optional[str]) -> str:
    if not value:
        return _now_iso()
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            return _now_iso()


def _clean_html(html: Optional[str]) -> str:
    if not html:
        return ""
    text = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def _extract_article_url(entry) -> str:
    html = entry.get("summary") or entry.get("description") or ""
    if html:
        soup = BeautifulSoup(html, "lxml")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            host = urlparse(href).netloc.lower()
            if href.startswith("http") and "news.google.com" not in host and "google.com" not in host:
                return href
    link = entry.get("link") or ""
    if link:
        return link
    source = entry.get("source") or {}
    return source.get("href") or "https://news.google.com"


def _source_name(entry, fallback: str) -> str:
    source = entry.get("source")
    if isinstance(source, dict) and source.get("title"):
        return source["title"].strip()
    title = (entry.get("title") or "").strip()
    if " - " in title:
        candidate = title.rsplit(" - ", 1)[-1].strip()
        if candidate and len(candidate) < 48:
            return candidate
    for sep in [" – ", " — ", " | ", " - "]:
        if sep in (fallback or ""):
            return fallback.split(sep)[0].strip()
    return (fallback or "Live Wire").strip()


def _clean_title(title: str, source_name: str) -> str:
    title = (title or "").strip()
    title = re.sub(r"\s+", " ", title)
    suffix = f" - {source_name}"
    if source_name and title.endswith(suffix):
        return title[: -len(suffix)].strip()
    return title


def _infer_category(title: str, description: str, requested: Optional[str]) -> str:
    if requested and requested.lower() != "all":
        return requested.title()
    blob = f"{title} {description}".lower()
    rules = [
        ("Climate", ("climate", "emission", "carbon", "flood", "heatwave", "monsoon", "wildfire")),
        ("Health", ("health", "hospital", "vaccine", "who ", "outbreak", "medical")),
        ("Technology", ("ai ", "tech", "chip", "cyber", "software", "google", "apple", "microsoft")),
        ("Science", ("nasa", "isro", "space", "quantum", "research", "scientist")),
        ("Economy", ("market", "bank", "inflation", "gdp", "stock", "rupee", "fed ")),
        ("Politics", ("election", "minister", "parliament", "president", "congress", "policy", "court")),
    ]
    for label, keys in rules:
        if any(k in blob for k in keys):
            return label
    return "World Affairs"


class NewsProvider(BaseNewsProvider):
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.gnews_key = settings.GNEWS_API_KEY
        self.base_url = "https://newsapi.org/v2"

    async def get_world_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> List[NewsArticle]:
        return await self._live_feed("world", category, page, page_size, fresh=fresh)

    async def get_india_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> List[NewsArticle]:
        return await self._live_feed("india", category, page, page_size, fresh=fresh)

    async def search_news(self, query: str, page: int = 1, page_size: int = 20) -> List[NewsArticle]:
        cache_key = f"search:{query.lower().strip()}:{page}:{page_size}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        urls = [
            self._google_search_rss(query, "US", "en-US", "US:en"),
            self._google_search_rss(query, "IN", "en-IN", "IN:en"),
        ]
        articles = await self._fetch_feeds(urls, region="Global", category="Fact Check", id_prefix="search")
        if self.api_key:
            api_hits = await self._newsapi_search(query, page, page_size)
            articles = self._merge(articles, api_hits)

        if not articles:
            articles = [
                a for a in (
                    self._get_fallback_world_news(None) + self._get_fallback_india_news(None)
                )
                if query.lower() in a.title.lower() or (a.description and query.lower() in a.description.lower())
            ]

        sliced = articles[:page_size]
        self._cache_set(cache_key, sliced)
        return sliced

    async def _live_feed(
        self,
        region: str,
        category: Optional[str],
        page: int,
        page_size: int,
        fresh: bool = False,
    ) -> List[NewsArticle]:
        cat = (category or "all").lower()
        cache_key = f"{region}:{cat}:{page}:{page_size}"
        if not fresh:
            cached = self._cache_get(cache_key)
            if cached is not None:
                return cached

        urls = self._feed_urls(region, category)
        articles = await self._fetch_feeds(urls, region=region.title(), category=category, id_prefix=region)

        if self.api_key:
            extra = await self._newsapi_headlines(region, category, page, page_size)
            articles = self._merge(articles, extra)
        if self.gnews_key:
            extra = await self._gnews_headlines(region, category, page_size)
            articles = self._merge(articles, extra)

        if not articles:
            articles = (
                self._get_fallback_world_news(category)
                if region == "world"
                else self._get_fallback_india_news(category)
            )

        articles.sort(key=lambda a: a.published_at, reverse=True)
        articles = self._diversify(articles)
        start = max(page - 1, 0) * page_size
        sliced = articles[start:start + page_size]
        self._cache_set(cache_key, sliced)
        return sliced

    def _feed_urls(self, region: str, category: Optional[str]) -> List[str]:
        cat = (category or "all").lower()
        urls: List[str] = []

        if region == "world":
            hl, gl, ceid = "en-US", "US", "US:en"
            if cat == "climate":
                urls.append(self._google_search_rss("climate OR environment OR emissions", gl, hl, ceid))
            elif cat != "all" and cat in GOOGLE_TOPIC_MAP and GOOGLE_TOPIC_MAP[cat] != "CLIMATE":
                topic = GOOGLE_TOPIC_MAP[cat]
                urls.append(f"https://news.google.com/rss/headlines/section/topic/{topic}?hl={hl}&gl={gl}&ceid={ceid}")
            else:
                urls.extend([
                    f"https://news.google.com/rss?hl={hl}&gl={gl}&ceid={ceid}",
                    f"https://news.google.com/rss/headlines/section/topic/WORLD?hl={hl}&gl={gl}&ceid={ceid}",
                    "https://feeds.bbci.co.uk/news/world/rss.xml",
                    "https://www.aljazeera.com/xml/rss/all.xml",
                ])
        else:
            hl, gl, ceid = "en-IN", "IN", "IN:en"
            if cat == "climate":
                urls.append(self._google_search_rss("India climate OR monsoon OR heatwave", gl, hl, ceid))
            elif cat != "all" and cat in GOOGLE_TOPIC_MAP:
                topic = "NATION" if cat == "politics" else GOOGLE_TOPIC_MAP[cat]
                urls.append(
                    f"https://news.google.com/rss/headlines/section/topic/{topic}?hl={hl}&gl={gl}&ceid={ceid}"
                )
            else:
                urls.extend([
                    f"https://news.google.com/rss?hl={hl}&gl={gl}&ceid={ceid}",
                    f"https://news.google.com/rss/headlines/section/topic/NATION?hl={hl}&gl={gl}&ceid={ceid}",
                    "https://www.thehindu.com/news/national/feeder/default.rss",
                    "https://indianexpress.com/section/india/feed/",
                ])
        return urls

    def _google_search_rss(self, query: str, gl: str, hl: str, ceid: str) -> str:
        return f"https://news.google.com/rss/search?q={quote_plus(query)}&hl={hl}&gl={gl}&ceid={ceid}"

    async def _fetch_feeds(
        self,
        urls: List[str],
        region: str,
        category: Optional[str],
        id_prefix: str,
    ) -> List[NewsArticle]:
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml, */*"},
        ) as client:
            results = await asyncio.gather(
                *[self._download_feed(client, url) for url in urls],
                return_exceptions=True,
            )

        articles: List[NewsArticle] = []
        for payload in results:
            if not isinstance(payload, str) or not payload.strip():
                continue
            parsed = feedparser.parse(payload)
            source_fallback = parsed.feed.get("title", "Live Wire")
            for entry in parsed.entries:
                title_raw = (entry.get("title") or "").strip()
                if not title_raw:
                    continue
                source_name = _source_name(entry, source_fallback)
                title = _clean_title(title_raw, source_name)
                description = _clean_html(entry.get("summary") or entry.get("description"))
                if description.lower().startswith(title.lower()):
                    description = description[len(title):].lstrip(" -–|:").strip()
                url = _extract_article_url(entry)
                published = _parse_date(entry.get("published") or entry.get("updated"))
                cat = _infer_category(title, description, category)
                articles.append(
                    NewsArticle(
                        id=_stable_id(id_prefix, url, title),
                        title=title,
                        description=description or f"Live dispatch from {source_name}.",
                        summary=description or f"Live dispatch from {source_name}.",
                        content=description,
                        url=url,
                        url_to_image=None,
                        source_name=source_name,
                        author=entry.get("author") or source_name,
                        published_at=published,
                        category=cat,
                        region=region,
                        credibility_rating="Live Wire",
                        is_live=True,
                    )
                )
        return self._dedupe(articles)

    async def _download_feed(self, client: httpx.AsyncClient, url: str) -> str:
        try:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.text:
                return resp.text
        except Exception:
            return ""
        return ""

    async def _newsapi_headlines(
        self, region: str, category: Optional[str], page: int, page_size: int
    ) -> List[NewsArticle]:
        params = {"apiKey": self.api_key, "pageSize": page_size, "page": page}
        if region == "india":
            params["country"] = "in"
        else:
            params["language"] = "en"
            if not category or category.lower() == "all":
                params["q"] = "world OR international"
        if category and category.lower() not in ("all", "climate"):
            params["category"] = "business" if category.lower() == "economy" else category.lower()
        return await self._newsapi_request("/top-headlines", params, region, category)

    async def _newsapi_search(self, query: str, page: int, page_size: int) -> List[NewsArticle]:
        params = {
            "apiKey": self.api_key,
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "page": page,
        }
        return await self._newsapi_request("/everything", params, "Global", "Search")

    async def _newsapi_request(
        self, path: str, params: dict, region: str, category: Optional[str]
    ) -> List[NewsArticle]:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{self.base_url}{path}", params=params)
                if resp.status_code != 200:
                    return []
                articles = []
                for art in resp.json().get("articles", []):
                    title = art.get("title")
                    if not title or "[Removed]" in title:
                        continue
                    description = art.get("description") or ""
                    articles.append(
                        NewsArticle(
                            id=_stable_id("newsapi", art.get("url") or title, title),
                            title=title,
                            description=description,
                            summary=description,
                            content=art.get("content"),
                            url=art.get("url") or "https://news.google.com",
                            url_to_image=art.get("urlToImage"),
                            source_name=art.get("source", {}).get("name", "NewsAPI"),
                            source_id=art.get("source", {}).get("id"),
                            author=art.get("author"),
                            published_at=_parse_date(art.get("publishedAt")),
                            category=_infer_category(title, description, category),
                            region=region.title() if region != "world" else "World",
                            credibility_rating="Live Publisher",
                            is_live=True,
                        )
                    )
                return articles
        except Exception:
            return []

    async def _gnews_headlines(self, region: str, category: Optional[str], page_size: int) -> List[NewsArticle]:
        params = {
            "token": self.gnews_key,
            "lang": "en",
            "max": min(page_size, 10),
        }
        if region == "india":
            params["country"] = "in"
        cat = (category or "all").lower()
        if cat in ("technology", "health", "science", "sports"):
            params["topic"] = cat
        elif cat == "economy":
            params["topic"] = "business"
        elif cat == "politics":
            params["topic"] = "nation"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get("https://gnews.io/api/v4/top-headlines", params=params)
                if resp.status_code != 200:
                    return []
                out = []
                for art in resp.json().get("articles", []):
                    title = art.get("title")
                    if not title:
                        continue
                    description = art.get("description") or ""
                    out.append(
                        NewsArticle(
                            id=_stable_id("gnews", art.get("url") or title, title),
                            title=title,
                            description=description,
                            summary=description,
                            content=art.get("content"),
                            url=art.get("url") or "https://news.google.com",
                            url_to_image=art.get("image"),
                            source_name=(art.get("source") or {}).get("name", "GNews"),
                            author=art.get("source", {}).get("name"),
                            published_at=_parse_date(art.get("publishedAt")),
                            category=_infer_category(title, description, category),
                            region="India" if region == "india" else "World",
                            credibility_rating="Live Publisher",
                            is_live=True,
                        )
                    )
                return out
        except Exception:
            return []

    def _dedupe(self, articles: List[NewsArticle]) -> List[NewsArticle]:
        seen = set()
        unique = []
        for art in articles:
            key = re.sub(r"[^a-z0-9]+", "", art.title.lower())[:80]
            if key in seen:
                continue
            seen.add(key)
            unique.append(art)
        return unique

    def _diversify(self, articles: List[NewsArticle]) -> List[NewsArticle]:
        buckets: Dict[str, List[NewsArticle]] = {}
        for art in articles:
            buckets.setdefault(art.source_name, []).append(art)
        mixed: List[NewsArticle] = []
        while buckets:
            for source in list(buckets.keys()):
                mixed.append(buckets[source].pop(0))
                if not buckets[source]:
                    del buckets[source]
        return mixed

    def _merge(self, primary: List[NewsArticle], extra: List[NewsArticle]) -> List[NewsArticle]:
        return self._dedupe(primary + extra)

    def _cache_get(self, key: str) -> Optional[List[NewsArticle]]:
        hit = _FEED_CACHE.get(key)
        if not hit:
            return None
        ts, articles = hit
        if time.time() - ts > CACHE_TTL_SECONDS:
            return None
        return articles

    def _cache_set(self, key: str, articles: List[NewsArticle]) -> None:
        _FEED_CACHE[key] = (time.time(), articles)

    def _get_fallback_world_news(self, category: Optional[str]) -> List[NewsArticle]:
        articles = [
            NewsArticle(
                id="w-01",
                title="Global Climate Summit Finalizes Framework for High-Seas Ecosystem Protection",
                description="Delegates from 140+ countries sign landmark biodiversity agreement establishing enforceable maritime conservation corridors.",
                summary="Delegates from 140+ countries sign landmark biodiversity agreement establishing enforceable maritime conservation corridors.",
                url="https://www.reuters.com",
                source_name="Reuters",
                author="Wire Desk",
                published_at=_now_iso(),
                category="Climate",
                region="World",
                credibility_rating="Cached Wire",
                is_live=False,
            ),
        ]
        if category and category.lower() != "all":
            filtered = [a for a in articles if a.category.lower() == category.lower()]
            return filtered or articles
        return articles

    def _get_fallback_india_news(self, category: Optional[str]) -> List[NewsArticle]:
        articles = [
            NewsArticle(
                id="in-01",
                title="Live national wires temporarily unavailable — retry in a moment",
                description="The India live feed could not be reached just now. Refresh to pull the latest national headlines.",
                summary="The India live feed could not be reached just now. Refresh to pull the latest national headlines.",
                url="https://www.thehindu.com",
                source_name="National Wire",
                author="News Desk",
                published_at=_now_iso(),
                category="National",
                region="India",
                credibility_rating="Cached Wire",
                is_live=False,
            ),
        ]
        if category and category.lower() != "all":
            filtered = [a for a in articles if a.category.lower() == category.lower()]
            return filtered or articles
        return articles
