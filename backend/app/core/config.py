import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "TruthLens AI News Fact-Checker"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "truthlens_super_secure_jwt_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Admin Credentials (fallback default for zero-friction local testing)
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@truthlens.ai")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "TruthLens@2026Admin")
    
    # External APIs
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("AI_API_KEY", "")
    SEARCH_API_KEY: str = os.getenv("SEARCH_API_KEY", "")
    # Optional: https://gnews.io (free tier 100 req/day)
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")
    # Optional: Google Fact Check Tools API key (enhances results, works without key too)
    GOOGLE_FACTCHECK_API_KEY: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    
    # Firebase
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "")
    
    # Rate Limiting & Verification Thresholds
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    CONFIDENCE_THRESHOLD_TRUE: float = 80.0
    CONFIDENCE_THRESHOLD_PARTIAL: float = 55.0
    CACHE_DURATION_HOURS: int = 4
    MAINTENANCE_MODE: bool = False

settings = Settings()
