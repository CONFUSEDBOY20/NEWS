from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class NormalizedArticle(BaseModel):
    id: str                               # Hash of canonical url
    title: str
    description: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    url_to_image: Optional[str] = None    # Alias for frontend compatibility
    source_name: str
    source_reliability: float = 85.0
    category: str = "General"
    region: str = "World"                 # World, India, Global
    language: str = "en"
    published_at: str                     # UTC ISO
    provider: str                         # rss, gdelt, guardian, currents, newsdata, gnews, newsapi
    is_delayed: bool = False              # True if from Tier 3 delayed backup (12-24h)
    
    # Extra fields for backward compatibility with frontend UI
    credibility_rating: Optional[str] = "Verified Source"
    is_live: bool = True
    author: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None

# Backward compatibility alias
NewsArticle = NormalizedArticle

class ProviderStatus(BaseModel):
    name: str
    status: str                           # ok | failed | skipped | quota
    count: int = 0
    delayed: bool = False
    circuit_open: bool = False
    quota_used: Optional[int] = None
    quota_limit: Optional[int] = None

class NewsFeedResponse(BaseModel):
    articles: List[NormalizedArticle]
    count: int
    total_results: int                    # For legacy compatibility
    synced_at: str
    fetched_at: Optional[str] = None      # ISO timestamp when the feed was fetched
    is_live: bool                         # True only if at least one Tier 1/2 provider answered
    stale: bool = False                   # True if served from stale cache because all providers failed
    feed_mode: str = "realtime"
    category: str = "General"
    region: str = "World"
    providers: List[ProviderStatus] = []

class NewsProviderHealth(BaseModel):
    name: str
    tier: int                             # 1, 2, or 3
    status: str                           # "healthy", "circuit_open", "quota_exhausted", "not_configured"
    consecutive_failures: int = 0
    circuit_open_until: Optional[str] = None
    quota_used_today: int = 0
    quota_limit: Optional[int] = None

class NewsSystemStatusResponse(BaseModel):
    status: str
    timestamp: str
    active_providers_count: int
    providers: List[NewsProviderHealth]
    cache_entries: int

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
