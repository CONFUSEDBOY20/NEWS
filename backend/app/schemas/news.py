from pydantic import BaseModel, Field
from typing import List, Optional

class NewsArticle(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    url_to_image: Optional[str] = None
    source_name: str
    source_id: Optional[str] = None
    author: Optional[str] = None
    published_at: str
    category: str = "General"
    region: str = "World"  # World, India, etc.
    credibility_rating: str = "Verified Source"  # Verified Source, Trusted News, Independent
    summary: Optional[str] = None
    is_live: bool = True

class NewsFeedResponse(BaseModel):
    total_results: int
    articles: List[NewsArticle]
    category: str
    region: str
    synced_at: str
    is_live: bool = True
    feed_mode: str = "realtime"

class ArticleReadRequest(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    source_name: Optional[str] = None

class ArticleReaderResponse(BaseModel):
    id: str
    title: str
    source_name: str
    url: Optional[str] = None
    published_at: Optional[str] = None
    author: Optional[str] = None
    full_text: str
    ai_summary: List[str]
    extracted_claims: List[str]
    bias_score: str
    reading_time_minutes: int
    credibility_rating: str
