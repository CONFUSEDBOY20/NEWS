from datetime import datetime, timezone
from typing import Optional
from app.providers.news_provider import NewsProvider
from app.schemas.news import NewsFeedResponse

class NewsService:
    def __init__(self):
        self.news_provider = NewsProvider()

    async def get_world_news(self, category: Optional[str] = None, page: int = 1, page_size: int = 20) -> NewsFeedResponse:
        articles = await self.news_provider.get_world_news(category=category, page=page, page_size=page_size)
        return NewsFeedResponse(
            total_results=len(articles),
            articles=articles,
            category=category or "All",
            region="World",
            synced_at=datetime.now(timezone.utc).isoformat()
        )

    async def get_india_news(self, category: Optional[str] = None, page: int = 1, page_size: int = 20) -> NewsFeedResponse:
        articles = await self.news_provider.get_india_news(category=category, page=page, page_size=page_size)
        return NewsFeedResponse(
            total_results=len(articles),
            articles=articles,
            category=category or "All",
            region="India",
            synced_at=datetime.now(timezone.utc).isoformat()
        )

    async def search_news(self, query: str, page: int = 1, page_size: int = 20) -> NewsFeedResponse:
        articles = await self.news_provider.search_news(query=query, page=page, page_size=page_size)
        return NewsFeedResponse(
            total_results=len(articles),
            articles=articles,
            category="Search Results",
            region="Global",
            synced_at=datetime.now(timezone.utc).isoformat()
        )
