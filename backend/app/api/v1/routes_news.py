from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.news import NewsFeedResponse, NewsSystemStatusResponse
from app.services.news_service import NewsService
from app.core.security import get_current_admin

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

@router.get("/status", response_model=NewsSystemStatusResponse)
async def get_news_system_status(admin: dict = Depends(get_current_admin)):
    """Administrative diagnostic endpoint returning circuit breaker and quota status for all news providers."""
    return news_service.get_status()
