import os
import secrets
import logging
from pathlib import Path
from typing import Optional
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

ENV = os.getenv("ENV", "development").strip().lower()

KNOWN_INSECURE_SECRETS = {
    "9f834a81b2c7e6d5a4f3e2d1c0b9a876543210fedcba9876543210abcdef1234",
    "secret",
    "secret_key",
    "changeme",
    "change_me",
    "change_me_in_production",
    "admin123",
    "SetYourStrongAdminPassword2026!",
    "demo-admin-token",
}

raw_secret = os.getenv("SECRET_KEY", "").strip()
raw_admin_pw = os.getenv("ADMIN_PASSWORD", "").strip()
raw_admin_hash = os.getenv("ADMIN_PASSWORD_HASH", "").strip()

# Enforce strict production security: refuse to start with insecure secrets
if ENV == "production":
    if not raw_secret or raw_secret in KNOWN_INSECURE_SECRETS or len(raw_secret) < 32:
        raise ValueError(
            "FATAL: In production, SECRET_KEY must be set to a secure, unique string of at least 32 characters. "
            "Refusing to start."
        )
    if not raw_admin_pw and not raw_admin_hash:
        raise ValueError(
            "FATAL: In production, either ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be configured. "
            "Refusing to start."
        )
    if raw_admin_pw in KNOWN_INSECURE_SECRETS or raw_admin_hash in KNOWN_INSECURE_SECRETS:
        raise ValueError(
            "FATAL: In production, ADMIN_PASSWORD / ADMIN_PASSWORD_HASH cannot use known placeholder values. "
            "Refusing to start."
        )

# In development/test, generate an ephemeral secret key if none provided
_DEFAULT_SECRET = raw_secret
if not _DEFAULT_SECRET:
    logger.warning("SECRET_KEY not set in environment. Generating temporary ephemeral key.")
    _DEFAULT_SECRET = secrets.token_hex(32)

class Settings(BaseModel):
    PROJECT_NAME: str = "TruthLens AI News Fact-Checker"
    API_V1_STR: str = "/api"
    ENV: str = ENV
    
    # Security Configuration
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 1 day
    
    # Admin Credentials (configured exclusively via environment variables)
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@truthlens.ai")
    ADMIN_PASSWORD: str = raw_admin_pw
    ADMIN_PASSWORD_HASH: str = raw_admin_hash
    
    # CORS Allowed Origins (comma-separated list).
    # Default includes production Vercel deployment https://truthlens-frontend-five.vercel.app
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,"
        "https://truthlens-frontend-five.vercel.app,https://truthlens.vercel.app"
    )
    # CORS Origin Regex for Vercel preview environments (*.vercel.app)
    CORS_ORIGIN_REGEX: Optional[str] = os.getenv("CORS_ORIGIN_REGEX", r"^https:\/\/(?:[a-zA-Z0-9-]+\.)?vercel\.app$")
    
    # Reverse proxy header trust (Render, Cloudflare, ALB, Vercel)
    TRUST_PROXY: bool = os.getenv("TRUST_PROXY", "false").lower() in ("true", "1", "yes")

    # External APIs (configured via .env)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("AI_API_KEY", "")
    GUARDIAN_API_KEY: str = os.getenv("GUARDIAN_API_KEY", "")
    CURRENTS_API_KEY: str = os.getenv("CURRENTS_API_KEY", "")
    NEWSDATA_API_KEY: str = os.getenv("NEWSDATA_API_KEY", "")
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "") or os.getenv("NEWSAPI_KEY", "")
    SEARCH_API_KEY: str = os.getenv("SEARCH_API_KEY", "")
    GOOGLE_FACTCHECK_API_KEY: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    # Optional pixel-based AI image detector. Keep credentials server-side only.
    SIGHTENGINE_API_USER: str = os.getenv("SIGHTENGINE_API_USER", "")
    SIGHTENGINE_API_SECRET: str = os.getenv("SIGHTENGINE_API_SECRET", "")
    
    # Firebase Cloud Configuration (Backend Server-Side Only)
    # Supports JSON payload, credential file path, or individual fields
    FIREBASE_CREDENTIALS_JSON: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    
    # Rate Limiting & Verification Thresholds
    TRUTHLENS_DATA_FILE: str = os.getenv("TRUTHLENS_DATA_FILE", os.path.join(_backend_dir, "data", "runtime_database.json"))
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    CONFIDENCE_THRESHOLD_TRUE: float = 80.0
    CONFIDENCE_THRESHOLD_PARTIAL: float = 55.0
    CACHE_DURATION_HOURS: int = 4
    MAINTENANCE_MODE: bool = False

settings = Settings()
