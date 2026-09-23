from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: Dict[str, Any]

class RawDataRecord(BaseModel):
    id: str = Field(default_factory=lambda: "raw-" + str(datetime.now().timestamp()).replace(".", ""))
    title: str
    claim: str
    raw_text: Optional[str] = None
    source: str
    source_url: str
    category: str = "General"
    language: str = "en"
    region: str = "Global"
    verdict: str  # TRUE, MOSTLY TRUE, FALSE, MISLEADING, UNVERIFIED, SATIRE
    evidence: str
    tags: List[str] = []
    entities: List[str] = []
    publication_date: Optional[str] = None
    verification_date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    reliability_score: float = 85.0
    notes: Optional[str] = None
    image_url: Optional[str] = None
    created_by: str = "admin@truthlens.ai"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = "PUBLISHED"  # DRAFT, PUBLISHED, ARCHIVED

class FactArticle(BaseModel):
    id: str = Field(default_factory=lambda: "art-" + str(datetime.now().timestamp()).replace(".", ""))
    title: str
    slug: str
    summary: str
    content: str  # Markdown or rich text
    category: str = "Fact Investigation"
    thumbnail_url: Optional[str] = None
    tags: List[str] = []
    author: str = "TruthLens Investigative Desk"
    published_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    verdict_context: Optional[str] = "MISLEADING"
    read_time_minutes: int = 4
    is_featured: bool = False
    status: str = "PUBLISHED"  # PUBLISHED, DRAFT

class AdminLog(BaseModel):
    id: str = Field(default_factory=lambda: "log-" + str(datetime.now().timestamp()).replace(".", ""))
    admin_id: str
    action: str  # CREATE, UPDATE, DELETE, LOGIN, SETTINGS_CHANGE, IMPORT, EXPORT
    target_collection: str  # raw_data, fact_articles, system_settings, fact_checks
    target_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    details: Optional[str] = None
    ip_address: Optional[str] = "127.0.0.1"

class SystemSettings(BaseModel):
    news_categories: List[str] = ["All", "Politics", "Technology", "Health", "Economy", "Climate", "Science", "Entertainment"]
    supported_languages: List[Dict[str, str]] = [
        {"code": "en", "name": "English"},
        {"code": "hi", "name": "Hindi (हिंदी)"}
    ]
    confidence_threshold_true: float = 80.0
    confidence_threshold_partial: float = 55.0
    enabled_providers: Dict[str, bool] = {
        "fact_database": True,
        "news_api": True,
        "gemini_ai": True,
        "search_graph": True,
        "image_forensics": True
    }
    cache_duration_hours: int = 4
    rate_limit_per_minute: int = 60
    maintenance_mode: bool = False
    allow_public_submissions: bool = True

class DashboardOverviewStats(BaseModel):
    total_fact_checks: int
    today_checks: int
    false_claims_detected: int
    verified_claims: int
    pending_verification: int
    raw_data_records: int
    news_records_indexed: int
    api_usage_today: int
    verdict_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    daily_volume: List[Dict[str, Any]]
    regional_distribution: Dict[str, int]
