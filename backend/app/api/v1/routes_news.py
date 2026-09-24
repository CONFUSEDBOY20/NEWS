from fastapi import APIRouter, Query
from typing import Optional
from app.schemas.news import NewsFeedResponse
from app.services.news_service import NewsService

router = APIRouter(prefix="/news", tags=["News Feeds"])
news_service = NewsService()

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
    page_size: int = Query(20, ge=1, le=50)
):
    return await news_service.search_news(query=q, page=page, page_size=page_size)

@router.get("/ticker", response_model=NewsFeedResponse)
async def get_live_ticker():
    return await news_service.get_ticker()
