"""
TruthLens Multi-Provider News Aggregator
Priority: Tier 1 (live RSS + GDELT, zero keys) -> Tier 2 (Guardian, Currents) -> Tier 3 (NewsData, GNews, NewsAPI - delayed)

Engine Features:
- Concurrent provider fan-out with per-provider 8s timeouts.
- Circuit breaker per provider (trips after 3 failures for 5 minutes).
- Daily quota counters per keyed provider stopping before limits are reached.
- Canonical URL deduplication + fuzzy title similarity deduplication (difflib > 0.90).
- In-memory TTL cache (5 min headlines, 15 min search) with stale-while-revalidate fallback.
- Strictly honest metadata: is_live is True ONLY if Tier 1/2 answered; is_delayed is True for Tier 3.
- If all providers fail and cache is empty, raises HTTP 503. Never returns fake articles.
"""

import asyncio
import difflib
import hashlib
import html
import logging
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse, quote_plus

import feedparser
import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.news_sources import VETTED_RSS_FEEDS, NewsSourceFeed
from app.schemas.news import (
    NormalizedArticle,
    ProviderStatus,
    NewsFeedResponse,
    NewsProviderHealth,
    NewsSystemStatusResponse,
)

logger = logging.getLogger("truthlens.news")

# ---------------------------------------------------------------------------
# Circuit Breaker & Quota Tracker
# ---------------------------------------------------------------------------

class CircuitBreaker:
    """Trips after failure_threshold consecutive errors; stays open for recovery_seconds."""
    def __init__(self, failure_threshold: int = 3, recovery_seconds: float = 300.0):
        self.failure_threshold = failure_threshold
        self.recovery_seconds = recovery_seconds
        self.failure_count = 0
        self.last_failure_time = 0.0

    def is_open(self) -> bool:
        if self.failure_count >= self.failure_threshold:
            if time.time() - self.last_failure_time < self.recovery_seconds:
                return True
            # Recovery window passed: allow next attempt (half-open)
            return False
        return False

    def record_success(self):
        self.failure_count = 0
        self.last_failure_time = 0.0

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()

    def remaining_cooldown_seconds(self) -> int:
        if not self.is_open():
            return 0
        elapsed = time.time() - self.last_failure_time
        return max(0, int(self.recovery_seconds - elapsed))


class QuotaTracker:
    """Tracks daily API calls against free tier ceilings in UTC."""
    def __init__(self, daily_limit: int):
        self.daily_limit = daily_limit
        self.used_today = 0
        self.current_day = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def can_call(self) -> bool:
        now_day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if now_day != self.current_day:
            self.current_day = now_day
            self.used_today = 0
        return self.used_today < self.daily_limit

    def record_call(self):
        self.can_call()
        self.used_today += 1


# ---------------------------------------------------------------------------
# Canonical URL & Text Helpers
# ---------------------------------------------------------------------------

TRACKING_QUERY_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "ref", "source", "at_medium", "at_campaign",
}

def canonicalize_url(url: str) -> str:
    """Normalizes URL for canonical deduplication by stripping tracking parameters."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        
        # Filter tracking query parameters
        qs = parse_qs(parsed.query)
        cleaned_qs = {k: v for k, v in qs.items() if k.lower() not in TRACKING_QUERY_PARAMS}
        new_query = urlencode(cleaned_qs, doseq=True)

        path = parsed.path.rstrip("/")
        return urlunparse((parsed.scheme.lower(), netloc, path, "", new_query, ""))
    except Exception:
        return url.strip()

def hash_canonical_url(url: str, title: str) -> str:
    canon = canonicalize_url(url) or title.strip()
    return hashlib.sha256(canon.encode("utf-8", errors="ignore")).hexdigest()[:16]

def parse_to_utc_iso(date_str: Optional[str]) -> str:
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            # GDELT date format YYYYMMDDTHHMMSSZ or YYYYMMDDHHMMSS
            digits = re.sub(r"\D", "", date_str)
            if len(digits) >= 14:
                try:
                    dt = datetime.strptime(digits[:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
                    return dt.isoformat()
                except Exception:
                    pass
            return datetime.now(timezone.utc).isoformat()

def clean_text(raw: Optional[str]) -> str:
    if not raw:
        return ""
    text = html.unescape(raw)
    text = (
        text.replace("\ufffd", "'")
        .replace("â€™", "'")
        .replace("â€œ", '"')
        .replace("â€\x9d", '"')
        .replace("â€”", "—")
        .replace("â€“", "–")
    )
    soup = BeautifulSoup(text, "lxml")
    clean = soup.get_text(" ", strip=True)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


# ---------------------------------------------------------------------------
# NewsProvider Class
# ---------------------------------------------------------------------------

class NewsProvider:
    def __init__(self):
        # Circuit breakers per provider
        self.circuit_breakers: Dict[str, CircuitBreaker] = {
            "rss": CircuitBreaker(failure_threshold=4, recovery_seconds=180.0),
            "gdelt": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
            "guardian": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
            "currents": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
            "newsdata": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
            "gnews": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
            "newsapi": CircuitBreaker(failure_threshold=3, recovery_seconds=300.0),
        }

        # Daily quota counters for keyed providers (safety margins before free tier limits)
        self.quotas: Dict[str, QuotaTracker] = {
            "guardian": QuotaTracker(daily_limit=480),   # 500 free calls/day
            "currents": QuotaTracker(daily_limit=580),   # 600 free calls/day
            "newsdata": QuotaTracker(daily_limit=190),   # 200 free credits/day
            "gnews": QuotaTracker(daily_limit=95),       # 100 free req/day
            "newsapi": QuotaTracker(daily_limit=95),     # 100 free req/day (dev only)
        }

        # In-Memory Cache: key -> (timestamp, NewsFeedResponse)
        self.cache: Dict[str, Tuple[float, NewsFeedResponse]] = {}

    # -----------------------------------------------------------------------
    # Public Endpoint Methods
    # -----------------------------------------------------------------------

    async def get_world_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        cache_key = f"world:{category or 'all'}:{page}:{page_size}"
        return await self._aggregate(
            region="World",
            category=category,
            query=None,
            page=page,
            page_size=page_size,
            cache_key=cache_key,
            ttl_seconds=300.0,  # 5 min TTL
            fresh=fresh,
        )

    async def get_india_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        cache_key = f"india:{category or 'all'}:{page}:{page_size}"
        return await self._aggregate(
            region="India",
            category=category,
            query=None,
            page=page,
            page_size=page_size,
            cache_key=cache_key,
            ttl_seconds=300.0,  # 5 min TTL
            fresh=fresh,
        )

    async def search_news(
        self, query: str, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        clean_q = query.strip()
        cache_key = f"search:{clean_q.lower()}:{page}:{page_size}"
        return await self._aggregate(
            region="Global",
            category=None,
            query=clean_q,
            page=page,
            page_size=page_size,
            cache_key=cache_key,
            ttl_seconds=900.0,  # 15 min TTL for search
            fresh=fresh,
        )

    async def get_ticker(self) -> NewsFeedResponse:
        """Fetches top current items across World and India for the ticker banner."""
        cache_key = "ticker:live"
        cached = self._get_cached(cache_key, ttl_seconds=120.0)
        if cached:
            return cached

        # Quick fetch of top headlines
        world_resp = await self.get_world_news(page=1, page_size=8)
        india_resp = await self.get_india_news(page=1, page_size=8)

        combined = world_resp.articles[:6] + india_resp.articles[:6]
        ticker_resp = NewsFeedResponse(
            articles=combined,
            count=len(combined),
            total_results=len(combined),
            synced_at=datetime.now(timezone.utc).isoformat(),
            is_live=world_resp.is_live or india_resp.is_live,
            stale=world_resp.stale and india_resp.stale,
            category="Live",
            region="Global",
            providers=world_resp.providers + india_resp.providers,
        )
        self.cache[cache_key] = (time.time(), ticker_resp)
        return ticker_resp

    def get_provider_status(self) -> NewsSystemStatusResponse:
        """Returns diagnostic health and quota stats for all news providers."""
        provider_list: List[NewsProviderHealth] = []

        tiers = {
            "rss": 1,
            "gdelt": 1,
            "guardian": 2,
            "currents": 2,
            "newsdata": 3,
            "gnews": 3,
            "newsapi": 3,
        }

        keys_present = {
            "rss": True,
            "gdelt": True,
            "guardian": bool(settings.GUARDIAN_API_KEY),
            "currents": bool(settings.CURRENTS_API_KEY),
            "newsdata": bool(settings.NEWSDATA_API_KEY),
            "gnews": bool(settings.GNEWS_API_KEY),
            "newsapi": bool(settings.NEWS_API_KEY),
        }

        for name, tier in tiers.items():
            cb = self.circuit_breakers[name]
            qt = self.quotas.get(name)

            if not keys_present[name]:
                st = "not_configured"
            elif cb.is_open():
                st = "circuit_open"
            elif qt and not qt.can_call():
                st = "quota_exhausted"
            else:
                st = "healthy"

            cooldown = cb.remaining_cooldown_seconds()
            until = f"{cooldown}s" if cooldown > 0 else None

            provider_list.append(
                NewsProviderHealth(
                    name=name,
                    tier=tier,
                    status=st,
                    consecutive_failures=cb.failure_count,
                    circuit_open_until=until,
                    quota_used_today=qt.used_today if qt else 0,
                    quota_limit=qt.daily_limit if qt else None,
                )
            )

        active = sum(1 for p in provider_list if p.status == "healthy")
        return NewsSystemStatusResponse(
            status="healthy" if active > 0 else "degraded",
            timestamp=datetime.now(timezone.utc).isoformat(),
            active_providers_count=active,
            providers=provider_list,
            cache_entries=len(self.cache),
        )

    # -----------------------------------------------------------------------
    # Core Aggregation & Fallback Pipeline
    # -----------------------------------------------------------------------

    async def _aggregate(
        self,
        region: str,
        category: Optional[str],
        query: Optional[str],
        page: int,
        page_size: int,
        cache_key: str,
        ttl_seconds: float,
        fresh: bool,
    ) -> NewsFeedResponse:
        # Check cache if not requesting fresh wires
        if not fresh:
            cached = self._get_cached(cache_key, ttl_seconds)
            if cached is not None:
                return cached

        provider_statuses: List[ProviderStatus] = []
        collected_articles: List[NormalizedArticle] = []

        # Tasks to execute concurrently
        tasks = []
        task_names = []

        # ---------------- Tier 1: RSS Feeds (Always On) ----------------
        if not self.circuit_breakers["rss"].is_open():
            tasks.append(self._fetch_tier1_rss(region, category, query))
            task_names.append("rss")
        else:
            provider_statuses.append(
                ProviderStatus(name="rss", status="skipped", circuit_open=True)
            )

        # ---------------- Tier 1: GDELT DOC 2.0 API ----------------
        if not self.circuit_breakers["gdelt"].is_open():
            tasks.append(self._fetch_tier1_gdelt(region, category, query))
            task_names.append("gdelt")
        else:
            provider_statuses.append(
                ProviderStatus(name="gdelt", status="skipped", circuit_open=True)
            )

        # ---------------- Tier 2: The Guardian ----------------
        if settings.GUARDIAN_API_KEY:
            cb = self.circuit_breakers["guardian"]
            qt = self.quotas["guardian"]
            if not cb.is_open() and qt.can_call():
                tasks.append(self._fetch_tier2_guardian(category, query))
                task_names.append("guardian")
            else:
                st = "quota" if not qt.can_call() else "skipped"
                provider_statuses.append(
                    ProviderStatus(name="guardian", status=st, circuit_open=cb.is_open())
                )

        # ---------------- Tier 2: Currents API ----------------
        if settings.CURRENTS_API_KEY:
            cb = self.circuit_breakers["currents"]
            qt = self.quotas["currents"]
            if not cb.is_open() and qt.can_call():
                tasks.append(self._fetch_tier2_currents(category, query))
                task_names.append("currents")
            else:
                st = "quota" if not qt.can_call() else "skipped"
                provider_statuses.append(
                    ProviderStatus(name="currents", status=st, circuit_open=cb.is_open())
                )

        # ---------------- Tier 3: Delayed Backups (Called if configured) ----------------
        if settings.NEWSDATA_API_KEY:
            cb = self.circuit_breakers["newsdata"]
            qt = self.quotas["newsdata"]
            if not cb.is_open() and qt.can_call():
                tasks.append(self._fetch_tier3_newsdata(region, category, query))
                task_names.append("newsdata")

        if settings.GNEWS_API_KEY:
            cb = self.circuit_breakers["gnews"]
            qt = self.quotas["gnews"]
            if not cb.is_open() and qt.can_call():
                tasks.append(self._fetch_tier3_gnews(region, category, query))
                task_names.append("gnews")

        if settings.NEWS_API_KEY and settings.ENV != "production":
            cb = self.circuit_breakers["newsapi"]
            qt = self.quotas["newsapi"]
            if not cb.is_open() and qt.can_call():
                tasks.append(self._fetch_tier3_newsapi(region, category, query))
                task_names.append("newsapi")

        # Execute all providers concurrently with per-provider 8s timeout
        results = await asyncio.gather(*tasks, return_exceptions=True)

        tier1_or_tier2_success = False

        for name, res in zip(task_names, results):
            is_delayed = name in ("newsdata", "gnews", "newsapi")
            if isinstance(res, list) and not isinstance(res, Exception):
                self.circuit_breakers[name].record_success()
                if name in self.quotas:
                    self.quotas[name].record_call()
                count = len(res)
                provider_statuses.append(
                    ProviderStatus(name=name, status="ok", count=count, delayed=is_delayed)
                )
                collected_articles.extend(res)
                if not is_delayed and count > 0:
                    tier1_or_tier2_success = True
            else:
                # Provider failed or timed out
                self.circuit_breakers[name].record_failure()
                logger.warning(f"Provider {name} failed: {res}")
                provider_statuses.append(
                    ProviderStatus(name=name, status="failed", count=0, delayed=is_delayed)
                )

        # Deduplicate and sort
        deduped = self._deduplicate_articles(collected_articles)
        deduped.sort(key=lambda a: a.published_at, reverse=True)

        if deduped:
            # Paginate
            start = max(page - 1, 0) * page_size
            sliced = deduped[start:start + page_size]

            now_iso = datetime.now(timezone.utc).isoformat()
            feed_resp = NewsFeedResponse(
                articles=sliced,
                count=len(sliced),
                total_results=len(deduped),
                synced_at=now_iso,
                fetched_at=now_iso,
                is_live=tier1_or_tier2_success,
                stale=False,
                category=category or "All",
                region=region,
                providers=provider_statuses,
            )
            # Store in cache
            self.cache[cache_key] = (time.time(), feed_resp)
            return feed_resp

        # A successful search with no matches is an empty result, not an
        # aggregation outage. Keep 503 for cases where every provider failed.
        if query and any(provider.status == "ok" for provider in provider_statuses):
            now_iso = datetime.now(timezone.utc).isoformat()
            return NewsFeedResponse(
                articles=[],
                count=0,
                total_results=0,
                synced_at=now_iso,
                fetched_at=now_iso,
                is_live=tier1_or_tier2_success,
                stale=False,
                category=category or "All",
                region=region,
                providers=provider_statuses,
            )

        # If all providers failed on this run: serve stale-while-revalidate from cache if available
        stale_hit = self._get_stale_cached(cache_key)
        if stale_hit is not None:
            logger.warning(f"All live providers failed. Serving stale cached response for {cache_key}.")
            stale_copy = stale_hit.model_copy(deep=True)
            stale_copy.stale = True
            stale_copy.is_live = False
            stale_copy.providers = provider_statuses
            return stale_copy

        # If ALL providers failed and cache is empty: FAIL HONESTLY (HTTP 503)
        # NEVER invent or show simulated/fake articles!
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live news aggregation service is temporarily unavailable. All news sources timed out or failed.",
        )

    # -----------------------------------------------------------------------
    # Tier 1: RSS Feeds (Vetted, No Key, Always On)
    # -----------------------------------------------------------------------

    async def _fetch_tier1_rss(
        self, region: str, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        cat_lower = (category or "").lower().strip()
        reg_lower = (region or "global").lower().strip()

        # Select relevant feeds from vetted registry
        selected_feeds: List[NewsSourceFeed] = []
        for feed in VETTED_RSS_FEEDS:
            # Match by region
            if query and reg_lower == "global":
                # News search spans the full vetted registry, including India
                # and topic feeds, instead of silently excluding them.
                selected_feeds.append(feed)
            elif reg_lower in ("world", "global") and feed.region in ("World", "Global"):
                selected_feeds.append(feed)
            elif reg_lower == "india" and feed.region in ("India", "Global"):
                selected_feeds.append(feed)
            elif not reg_lower:
                selected_feeds.append(feed)

        # Match category if specified
        if cat_lower and cat_lower != "all":
            category_filtered = [f for f in selected_feeds if f.category.lower() == cat_lower]
            if category_filtered:
                selected_feeds = category_filtered

        if not selected_feeds:
            selected_feeds = VETTED_RSS_FEEDS[:6]

        # Fetch in parallel with per-feed 8s timeout
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
            },
        ) as client:
            tasks = [self._fetch_single_rss(client, feed) for feed in selected_feeds]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        articles: List[NormalizedArticle] = []
        for feed_articles in results:
            if isinstance(feed_articles, list) and not isinstance(feed_articles, Exception):
                articles.extend(feed_articles)

        # Filter by search query if in search mode
        if query:
            stop_words = {
                "a", "an", "and", "about", "are", "find", "for", "headline",
                "headlines", "in", "is", "latest", "news", "of", "on", "or",
                "search", "story", "stories", "the", "to", "verify",
            }
            query_terms = [
                term for term in re.findall(r"[\w]+", query.lower())
                if len(term) > 1 and term not in stop_words
            ]
            if not query_terms:
                query_terms = [query.lower()]
            articles = [
                a for a in articles
                if all(
                    term in f"{a.title} {a.description or ''}".lower()
                    for term in query_terms
                )
            ]

        return articles

    async def _fetch_single_rss(self, client: httpx.AsyncClient, feed: NewsSourceFeed) -> List[NormalizedArticle]:
        try:
            resp = await client.get(feed.url)
            if resp.status_code != 200 or not resp.content:
                return []

            parsed = feedparser.parse(resp.content)
            items: List[NormalizedArticle] = []
            is_google_news = "news.google.com" in feed.url

            for entry in parsed.entries[:25]:
                raw_title = clean_text(entry.get("title"))
                if not raw_title:
                    continue

                if is_google_news:
                    # Google News embeds the outlet name as a suffix: "Headline - Outlet Name"
                    # Extract it as the real source name, then strip it from the title.
                    source_name, title = self._split_google_news_title(raw_title)
                    # Resolve the real article URL (Google wraps links in a redirect)
                    link = self._unwrap_google_news_url(entry)
                else:
                    # Strip source suffix from title if present (e.g. "Headline - BBC News")
                    title = re.sub(rf"\s*[-–|]\s*{re.escape(feed.name)}.*$", "", raw_title, flags=re.IGNORECASE).strip()
                    source_name = feed.name
                    link = entry.get("link") or ""

                if not title:
                    title = raw_title

                raw_desc = entry.get("summary") or entry.get("description") or ""
                desc = clean_text(raw_desc)

                canon_url = canonicalize_url(link)
                if not canon_url:
                    continue

                pub_iso = parse_to_utc_iso(entry.get("published") or entry.get("updated"))
                img_url = self._extract_entry_image(entry)

                items.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc or f"Live dispatch from {source_name}.",
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source_name,
                        source_reliability=feed.reliability_score,
                        category=feed.category,
                        region=feed.region,
                        language=feed.language,
                        published_at=pub_iso,
                        provider="rss",
                        is_delayed=False,
                        is_live=True,
                    )
                )

            return items
        except Exception as e:
            logger.debug(f"Failed to fetch RSS feed {feed.name}: {e}")
            return []

    @staticmethod
    def _split_google_news_title(raw_title: str):
        """
        Google News titles look like: "Headline text - Outlet Name"
        Returns (outlet_name, clean_headline). Falls back to ("Google News", raw_title).
        """
        # Match last " - Source" or " | Source" suffix
        m = re.match(r"^(.+?)\s+[-–|]\s+([^-–|]+)$", raw_title.strip())
        if m:
            headline = m.group(1).strip()
            outlet = m.group(2).strip()
            if outlet and len(outlet) < 80:
                return outlet, headline
        return "Google News", raw_title.strip()

    @staticmethod
    def _unwrap_google_news_url(entry) -> str:
        """
        Google News RSS wraps article links in a google.com redirect.
        The real URL is available in the <source> tag's URL attribute or
        can be extracted from the redirect link's `url` query param.
        Falls back to the raw entry link.
        """
        # feedparser exposes <source> as entry.source
        src = entry.get("source") or {}
        if isinstance(src, dict):
            src_href = src.get("href") or src.get("url") or ""
            if src_href and not src_href.startswith("https://news.google.com"):
                return src_href

        raw_link = entry.get("link") or ""
        # Try to extract ?url= or &url= param from the redirect
        try:
            parsed = urlparse(raw_link)
            qs = parse_qs(parsed.query)
            if "url" in qs:
                return qs["url"][0]
        except Exception:
            pass
        return raw_link

    # -----------------------------------------------------------------------
    # Tier 1: GDELT DOC 2.0 API (Free, No Key, ~15 min freshness)
    # -----------------------------------------------------------------------

    async def _fetch_tier1_gdelt(
        self, region: str, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        # Formulate query
        q_parts = []
        if query:
            q_parts.append(query.strip())
        elif region.lower() == "india":
            q_parts.append("India")
        else:
            q_parts.append("world")

        if category and category.lower() != "all":
            q_parts.append(category.strip())

        full_q = " ".join(q_parts)
        url = (
            f"https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={quote_plus(full_q)}&mode=artlist&format=json&maxrecords=40&sort=datedesc"
        )

        try:
            async with httpx.AsyncClient(
                timeout=8.0,
                headers={"User-Agent": "Mozilla/5.0 (TruthLens Fact-Check Aggregator/2.0)"},
            ) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return []
                data = resp.json()

            articles: List[NormalizedArticle] = []
            for art in data.get("articles", []):
                title = clean_text(art.get("title"))
                url_str = art.get("url")
                if not title or not url_str:
                    continue

                canon_url = canonicalize_url(url_str)
                source = art.get("domain") or "GDELT Wire"
                pub_iso = parse_to_utc_iso(art.get("seendate"))
                img_url = art.get("socialimage") or None

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=f"Global event wire report from {source}.",
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source,
                        source_reliability=78.0,
                        category=category.title() if category and category.lower() != "all" else "General",
                        region=region.title() if region != "world" else "World",
                        language=art.get("language") or "en",
                        published_at=pub_iso,
                        provider="gdelt",
                        is_delayed=False,
                        is_live=True,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"GDELT fetch error: {e}")
            return []

    # -----------------------------------------------------------------------
    # Tier 2: The Guardian Open Platform (Developer Key)
    # -----------------------------------------------------------------------

    async def _fetch_tier2_guardian(
        self, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        params = {
            "api-key": settings.GUARDIAN_API_KEY,
            "show-fields": "thumbnail,trailText",
            "order-by": "newest",
            "page-size": 25,
        }
        if query:
            params["q"] = query.strip()
        if category and category.lower() not in ("all", "general"):
            section_map = {
                "tech": "technology", "technology": "technology",
                "science": "science", "business": "business",
                "economy": "business", "politics": "politics",
                "health": "society", "world": "world"
            }
            sec = section_map.get(category.lower())
            if sec:
                params["section"] = sec

        url = "https://content.guardianapis.com/search"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json().get("response", {})

            articles: List[NormalizedArticle] = []
            for item in data.get("results", []):
                title = clean_text(item.get("webTitle"))
                url_str = item.get("webUrl")
                if not title or not url_str:
                    continue

                fields = item.get("fields") or {}
                desc = clean_text(fields.get("trailText"))
                img_url = fields.get("thumbnail") or None
                canon_url = canonicalize_url(url_str)
                pub_iso = parse_to_utc_iso(item.get("webPublicationDate"))
                sec_name = item.get("sectionName") or "World"

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc or f"Dispatch from The Guardian ({sec_name}).",
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name="The Guardian",
                        source_reliability=92.0,
                        category=sec_name,
                        region="World",
                        language="en",
                        published_at=pub_iso,
                        provider="guardian",
                        is_delayed=False,
                        is_live=True,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"Guardian fetch error: {e}")
            return []

    # -----------------------------------------------------------------------
    # Tier 2: Currents API
    # -----------------------------------------------------------------------

    async def _fetch_tier2_currents(
        self, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        params = {
            "apiKey": settings.CURRENTS_API_KEY,
            "language": "en",
        }
        if query:
            url = "https://api.currentsapi.services/v1/search"
            params["keywords"] = query.strip()
        else:
            url = "https://api.currentsapi.services/v1/latest-news"
            if category and category.lower() != "all":
                params["category"] = category.lower()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()

            articles: List[NormalizedArticle] = []
            for item in data.get("news", []):
                title = clean_text(item.get("title"))
                url_str = item.get("url")
                if not title or not url_str:
                    continue

                canon_url = canonicalize_url(url_str)
                desc = clean_text(item.get("description"))
                img_url = item.get("image") or None
                pub_iso = parse_to_utc_iso(item.get("published"))
                source = item.get("author") or "Currents Wire"

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc,
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source,
                        source_reliability=80.0,
                        category=category.title() if category and category.lower() != "all" else "General",
                        region="World",
                        language="en",
                        published_at=pub_iso,
                        provider="currents",
                        is_delayed=False,
                        is_live=True,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"Currents fetch error: {e}")
            return []

    # -----------------------------------------------------------------------
    # Tier 3: Delayed Backup Providers (NewsData, GNews, NewsAPI)
    # Marked as is_delayed: True
    # -----------------------------------------------------------------------

    async def _fetch_tier3_newsdata(
        self, region: str, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        params = {
            "apikey": settings.NEWSDATA_API_KEY,
            "language": "en",
        }
        if query:
            params["q"] = query.strip()
        if region.lower() == "india":
            params["country"] = "in"
        if category and category.lower() != "all":
            params["category"] = category.lower()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get("https://newsdata.io/api/1/news", params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()

            articles: List[NormalizedArticle] = []
            for item in data.get("results", []):
                title = clean_text(item.get("title"))
                url_str = item.get("link")
                if not title or not url_str:
                    continue

                canon_url = canonicalize_url(url_str)
                desc = clean_text(item.get("description"))
                img_url = item.get("image_url") or None
                pub_iso = parse_to_utc_iso(item.get("pubDate"))
                source = item.get("source_id") or "NewsData Feed"

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc,
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source,
                        source_reliability=75.0,
                        category=category.title() if category and category.lower() != "all" else "General",
                        region=region.title() if region != "world" else "World",
                        language="en",
                        published_at=pub_iso,
                        provider="newsdata",
                        is_delayed=True,  # Tier 3 Delayed
                        is_live=False,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"NewsData fetch error: {e}")
            return []

    async def _fetch_tier3_gnews(
        self, region: str, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        params = {
            "token": settings.GNEWS_API_KEY,
            "lang": "en",
            "max": 15,
        }
        if query:
            url = "https://gnews.io/api/v4/search"
            params["q"] = query.strip()
        else:
            url = "https://gnews.io/api/v4/top-headlines"
            if region.lower() == "india":
                params["country"] = "in"
            if category and category.lower() != "all":
                params["topic"] = category.lower()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()

            articles: List[NormalizedArticle] = []
            for item in data.get("articles", []):
                title = clean_text(item.get("title"))
                url_str = item.get("url")
                if not title or not url_str:
                    continue

                canon_url = canonicalize_url(url_str)
                desc = clean_text(item.get("description"))
                img_url = item.get("image") or None
                pub_iso = parse_to_utc_iso(item.get("publishedAt"))
                source = (item.get("source") or {}).get("name", "GNews")

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc,
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source,
                        source_reliability=75.0,
                        category=category.title() if category and category.lower() != "all" else "General",
                        region=region.title() if region != "world" else "World",
                        language="en",
                        published_at=pub_iso,
                        provider="gnews",
                        is_delayed=True,  # Tier 3 Delayed
                        is_live=False,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"GNews fetch error: {e}")
            return []

    async def _fetch_tier3_newsapi(
        self, region: str, category: Optional[str], query: Optional[str]
    ) -> List[NormalizedArticle]:
        params = {
            "apiKey": settings.NEWS_API_KEY,
            "pageSize": 20,
        }
        if query:
            url = "https://newsapi.org/v2/everything"
            params["q"] = query.strip()
            params["sortBy"] = "publishedAt"
        else:
            url = "https://newsapi.org/v2/top-headlines"
            params["country"] = "in" if region.lower() == "india" else "us"
            if category and category.lower() != "all":
                params["category"] = category.lower()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()

            articles: List[NormalizedArticle] = []
            for item in data.get("articles", []):
                title = clean_text(item.get("title"))
                url_str = item.get("url")
                if not title or not url_str or "[Removed]" in title:
                    continue

                canon_url = canonicalize_url(url_str)
                desc = clean_text(item.get("description"))
                img_url = item.get("urlToImage") or None
                pub_iso = parse_to_utc_iso(item.get("publishedAt"))
                source = (item.get("source") or {}).get("name", "NewsAPI")

                articles.append(
                    NormalizedArticle(
                        id=hash_canonical_url(canon_url, title),
                        title=title,
                        description=desc,
                        url=canon_url,
                        image_url=img_url,
                        url_to_image=img_url,
                        source_name=source,
                        source_reliability=72.0,
                        category=category.title() if category and category.lower() != "all" else "General",
                        region=region.title() if region != "world" else "World",
                        language="en",
                        published_at=pub_iso,
                        provider="newsapi",
                        is_delayed=True,  # Tier 3 Delayed
                        is_live=False,
                    )
                )

            return articles
        except Exception as e:
            logger.debug(f"NewsAPI fetch error: {e}")
            return []

    # -----------------------------------------------------------------------
    # Deduplication & Image Extraction
    # -----------------------------------------------------------------------

    def _deduplicate_articles(self, articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
        """
        Deduplicates by canonical URL and fuzzy title similarity (SequenceMatcher ratio > 0.90).
        """
        seen_urls = set()
        seen_titles: List[Tuple[str, NormalizedArticle]] = []
        unique: List[NormalizedArticle] = []

        for art in articles:
            canon = canonicalize_url(art.url)
            if canon in seen_urls:
                continue

            # Normalized title for fuzzy matching
            norm_title = re.sub(r"[^a-z0-9]+", " ", art.title.lower()).strip()
            if not norm_title:
                continue

            is_duplicate = False
            for past_title, past_art in seen_titles:
                # Fast length guard before running difflib
                len_diff = abs(len(norm_title) - len(past_title))
                if len_diff > 25:
                    continue

                ratio = difflib.SequenceMatcher(None, norm_title, past_title).ratio()
                if ratio > 0.90:
                    is_duplicate = True
                    break

            if is_duplicate:
                continue

            seen_urls.add(canon)
            seen_titles.append((norm_title, art))
            unique.append(art)

        return unique

    def _extract_entry_image(self, entry) -> Optional[str]:
        """Extracts media thumbnail or enclosure image if present; never injects fake stock images."""
        thumbs = entry.get("media_thumbnail")
        if thumbs and isinstance(thumbs, list) and thumbs[0].get("url"):
            return thumbs[0]["url"]

        media = entry.get("media_content")
        if media and isinstance(media, list):
            for m in media:
                if m.get("url"):
                    return m["url"]

        encs = entry.get("enclosures")
        if encs and isinstance(encs, list):
            for enc in encs:
                if enc.get("type", "").startswith("image/") and enc.get("href"):
                    return enc["href"]
                if enc.get("url"):
                    return enc["url"]

        # Parse <img> tag from summary/description
        for field in ["summary", "description"]:
            raw = entry.get(field)
            if isinstance(raw, str) and "<img" in raw:
                match = re.search(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', raw)
                if match:
                    img_url = match.group(1)
                    if not any(x in img_url.lower() for x in ["pixel", "beacon", "1x1", "spacer"]):
                        return img_url

        return None

    # -----------------------------------------------------------------------
    # In-Memory Cache Helpers
    # -----------------------------------------------------------------------

    def _get_cached(self, key: str, ttl_seconds: float) -> Optional[NewsFeedResponse]:
        hit = self.cache.get(key)
        if not hit:
            return None
        ts, data = hit
        if time.time() - ts > ttl_seconds:
            return None
        return data

    def _get_stale_cached(self, key: str) -> Optional[NewsFeedResponse]:
        hit = self.cache.get(key)
        if not hit:
            return None
        return hit[1]
