from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import time
from app.core.config import settings
from app.api.routes_fact_check import router as fact_check_router
from app.api.routes_news import router as news_router
from app.api.routes_articles import router as articles_router
from app.api.routes_admin import router as admin_router

app = FastAPI(
    title="TruthLens AI Fact-Checker API",
    description="Production-grade AI-powered News & Claim Fact-Checking API Layer",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting & Audit In-Memory Registry
RATE_LIMIT_REGISTRY = {}

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Check rate limit for fact checking
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    if request.url.path.startswith("/api/fact-check"):
        window = RATE_LIMIT_REGISTRY.get(client_ip, [])
        # Keep only requests within last 60 seconds
        window = [t for t in window if now - t < 60]
        if len(window) >= settings.RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Verification request rate limit exceeded. Please wait a minute before submitting again."}
            )
        window.append(now)
        RATE_LIMIT_REGISTRY[client_ip] = window

    # Add security headers
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Mount API Routers
app.include_router(fact_check_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(articles_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TruthLens Fact-Checking Engine",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "providers": {
            "fact_database": "active",
            "search_graph": "active",
            "image_forensics": "active",
            "news_wire": "active"
        }
    }

@app.get("/")
async def root():
    return {
        "app": "TruthLens Fact-Checker Platform",
        "documentation": "/api/docs",
        "health": "/api/health"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Safe error message without exposing sensitive credentials or stack trace
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal processing error occurred while verifying the request. Please retry with more specific text or URL."}
    )
