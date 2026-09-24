import asyncio
from datetime import datetime, timezone
from typing import Optional
from app.providers.news_provider import NewsProvider
from app.schemas.news import NewsFeedResponse

class NewsService:
    def __init__(self):
        self.news_provider = NewsProvider()

    async def get_world_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        articles = await self.news_provider.get_world_news(
            category=category, page=page, page_size=page_size, fresh=fresh
        )
        return self._pack(articles, category or "All", "World")

    async def get_india_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        articles = await self.news_provider.get_india_news(
            category=category, page=page, page_size=page_size, fresh=fresh
        )
        return self._pack(articles, category or "All", "India")

    async def search_news(self, query: str, page: int = 1, page_size: int = 20) -> NewsFeedResponse:
        articles = await self.news_provider.search_news(query=query, page=page, page_size=page_size)
        return self._pack(articles, "Search Results", "Global")

    async def get_ticker(self) -> NewsFeedResponse:
        world, india = await asyncio.gather(
            self.news_provider.get_world_news(page_size=8),
            self.news_provider.get_india_news(page_size=8),
        )
        combined = world[:6] + india[:6]
        return self._pack(combined, "Live", "Global")

    def _pack(self, articles, category: str, region: str) -> NewsFeedResponse:
        live = bool(articles) and all(getattr(a, "is_live", True) for a in articles)
        return NewsFeedResponse(
            total_results=len(articles),
            articles=articles,
            category=category,
            region=region,
            synced_at=datetime.now(timezone.utc).isoformat(),
            is_live=live,
            feed_mode="realtime",
        )
