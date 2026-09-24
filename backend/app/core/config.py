import os
import secrets
import logging
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from project root or backend directory if present
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent.parent
_project_root = _backend_dir.parent

load_dotenv(_backend_dir / ".env")
load_dotenv(_project_root / ".env")
load_dotenv()

logger = logging.getLogger("truthlens.security")

# Generate an ephemeral secret key if none provided via environment
_DEFAULT_SECRET = os.getenv("SECRET_KEY")
if not _DEFAULT_SECRET:
    logger.warning("SECRET_KEY not set in environment. Generating temporary ephemeral key.")
    _DEFAULT_SECRET = secrets.token_hex(32)

class Settings(BaseModel):
    PROJECT_NAME: str = "TruthLens AI News Fact-Checker"
    API_V1_STR: str = "/api"
    
    # Security Configuration
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 1 day
    
    # Admin Credentials (configured exclusively via environment variables)
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@truthlens.ai")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "")
    
    # CORS Allowed Origins (comma-separated list)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )
    
    # External APIs (configured via .env)
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("AI_API_KEY", "")
    SEARCH_API_KEY: str = os.getenv("SEARCH_API_KEY", "")
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")
    GOOGLE_FACTCHECK_API_KEY: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    
    # Firebase Cloud Configuration (Backend Server-Side Only)
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    
    # Rate Limiting & Verification Thresholds
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    CONFIDENCE_THRESHOLD_TRUE: float = 80.0
    CONFIDENCE_THRESHOLD_PARTIAL: float = 55.0
    CACHE_DURATION_HOURS: int = 4
    MAINTENANCE_MODE: bool = False

settings = Settings()
