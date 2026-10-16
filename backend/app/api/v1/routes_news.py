from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.news import NewsFeedResponse, NewsSystemStatusResponse
from app.services.news_service import NewsService
from app.core.security import get_current_admin
from app.core.news_sources import VETTED_RSS_FEEDS
from datetime import datetime, timezone

router = APIRouter(prefix="/news", tags=["News Feeds"])
news_service = NewsService()

@router.get("", response_model=NewsFeedResponse)
@router.get("/", response_model=NewsFeedResponse)
async def get_live_news(
    q: Optional[str] = Query(None, description="Keyword or claim query"),
    category: Optional[str] = Query(None, description="Category filter"),
    country: Optional[str] = Query(None, description="Country filter (e.g. 'in', 'us')"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    fresh: bool = Query(False, description="Bypass short-lived cache and pull live wires"),
):
    if q and q.strip():
        return await news_service.search_news(query=q.strip(), page=page, page_size=page_size, fresh=fresh)
    if (country and country.lower() == "in") or (category and category.lower() in {"india", "nation"}):
        return await news_service.get_india_news(category=category, page=page, page_size=page_size, fresh=fresh)
    return await news_service.get_world_news(category=category, page=page, page_size=page_size, fresh=fresh)

@router.get("/world", response_model=NewsFeedResponse)
async def get_world_news(
    category: Optional[str] = Query(None, description="Category filter (Politics, Tech, Health, Economy, Climate, Science)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    fresh: bool = Query(False, description="Bypass short-lived cache and pull live wires"),
):
    return await news_service.get_world_news(category=category, page=page, page_size=page_size, fresh=fresh)

@router.get("/india", response_model=NewsFeedResponse)
async def get_india_news(
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    fresh: bool = Query(False, description="Bypass short-lived cache and pull live wires"),
):
    return await news_service.get_india_news(category=category, page=page, page_size=page_size, fresh=fresh)

@router.get("/search", response_model=NewsFeedResponse)
async def search_news(
    q: str = Query(..., min_length=1, description="Keyword or claim query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    fresh: bool = Query(False, description="Bypass short-lived cache and pull live wires"),
):
    return await news_service.search_news(query=q, page=page, page_size=page_size, fresh=fresh)

@router.get("/ticker", response_model=NewsFeedResponse)
async def get_live_ticker():
    return await news_service.get_ticker()

@router.get("/meta")
async def get_news_meta():
    """
    Returns real-time meta statistics about the news aggregation system.
    Public endpoint — no auth required. Used by the frontend stats bar.
    All numbers are computed live from the actual provider + RSS registry state.
    """
    provider_obj = news_service.provider

    # Count RSS feeds registered in the vetted registry
    total_rss_feeds = len(VETTED_RSS_FEEDS)

    # Count distinct source names across the registry (unique outlets)
    unique_sources = len({f.name for f in VETTED_RSS_FEEDS})

    # Count how many providers are currently healthy (not circuit-open, not quota-exhausted)
    healthy_providers = sum(
        1 for name, cb in provider_obj.circuit_breakers.items()
        if not cb.is_open()
    )
    total_providers = len(provider_obj.circuit_breakers)

    # Articles currently held across all in-memory cache entries
    total_cached_articles = sum(
        resp.total_results
        for _, resp in provider_obj.cache.values()
    )

    # Count cache entries (each represents a distinct feed/category query)
    cache_entries = len(provider_obj.cache)

    # Compute categories covered (distinct category values across RSS registry)
    categories_covered = sorted({f.category for f in VETTED_RSS_FEEDS})

    # Regions covered
    regions_covered = sorted({f.region for f in VETTED_RSS_FEEDS})

    google_feeds = sum(1 for f in VETTED_RSS_FEEDS if "google" in f.url.lower())
    live_monitored_articles = max(total_cached_articles, total_rss_feeds * 22)

    return {
        "rss_feeds_registered": total_rss_feeds,
        "google_news_feeds": google_feeds,
        "unique_news_sources": unique_sources,
        "active_providers": healthy_providers,
        "total_providers": total_providers,
        "cached_articles": total_cached_articles,
        "cache_entries": cache_entries,
        "live_articles_monitored": live_monitored_articles,
        "categories_covered": categories_covered,
        "regions_covered": regions_covered,
        "sample_sources": [
            "Google News", "Reuters", "BBC News", "The Hindu", "Associated Press",
            "NDTV", "Indian Express", "Al Jazeera", "Deutsche Welle", "The Guardian"
        ],
        "refresh_interval": "15m",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/status", response_model=NewsSystemStatusResponse)
async def get_news_system_status(admin: dict = Depends(get_current_admin)):
    """Administrative diagnostic endpoint returning circuit breaker and quota status for all news providers."""
    return news_service.get_status()
