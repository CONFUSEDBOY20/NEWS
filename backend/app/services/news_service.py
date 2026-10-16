from typing import Optional
from app.providers.news_provider import NewsProvider
from app.schemas.news import NewsFeedResponse, NewsSystemStatusResponse

class NewsService:
    def __init__(self):
        self.news_provider = NewsProvider()

    @property
    def provider(self) -> NewsProvider:
        return self.news_provider

    async def get_world_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        return await self.news_provider.get_world_news(
            category=category, page=page, page_size=page_size, fresh=fresh
        )

    async def get_india_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        return await self.news_provider.get_india_news(
            category=category, page=page, page_size=page_size, fresh=fresh
        )

    async def search_news(
        self, query: str, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> NewsFeedResponse:
        return await self.news_provider.search_news(
            query=query, page=page, page_size=page_size, fresh=fresh
        )

    async def get_ticker(self) -> NewsFeedResponse:
        return await self.news_provider.get_ticker()

    def get_status(self) -> NewsSystemStatusResponse:
        return self.news_provider.get_provider_status()
