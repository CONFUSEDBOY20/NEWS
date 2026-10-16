from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime, timezone
import time
import uuid
import logging

from app.core.config import settings
from app.core.exceptions import TruthLensException
from app.core.handlers import (
    truthlens_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.core.logging import setup_logger

# Import single versioned API router
from app.api.v1 import v1_router

logger = setup_logger("truthlens.main")

app = FastAPI(
    title="TruthLens AI Fact-Checker API",
    description="Modular, resilient AI-powered Fact-Checking & Intelligence API Layer",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Aliases for /api/docs, /api/openapi.json, /api/redoc
@app.get("/api/docs", include_in_schema=False)
async def api_docs_redirect():
    return RedirectResponse(url="/docs")

@app.get("/api/openapi.json", include_in_schema=False)
async def api_openapi_redirect():
    return RedirectResponse(url="/openapi.json")

@app.get("/api/redoc", include_in_schema=False)
async def api_redoc_redirect():
    return RedirectResponse(url="/redoc")


from typing import Any, cast

# Register Global Exception Handlers
app.add_exception_handler(TruthLensException, cast(Any, truthlens_exception_handler))
app.add_exception_handler(HTTPException, cast(Any, http_exception_handler))
app.add_exception_handler(RequestValidationError, cast(Any, validation_exception_handler))
app.add_exception_handler(Exception, cast(Any, generic_exception_handler))

# CORS Configuration
# Supports explicit origins list and regex pattern for Vercel preview and production environments
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://truthlens-frontend-five.vercel.app",
        "https://truthlens.vercel.app"
    ],
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or r"^https:\/\/(?:[a-zA-Z0-9-]+\.)?vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# In-Memory Rate Limiting Registry
# NOTE: In a multi-worker or distributed production deployment (e.g. multiple Gunicorn/Uvicorn
# workers or containers), this in-memory rate limiter is per-process. A distributed store
# like Redis (e.g. via redis-py or fast-api-limiter) is required for cluster-wide enforcement.
RATE_LIMIT_REGISTRY = {}

@app.middleware("http")
async def request_lifecycle_and_rate_limit_middleware(request: Request, call_next):
    # Attach unique request identifier
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
    request.state.request_id = request_id
    
    start_time = time.time()
    
    # Read client IP from X-Forwarded-For only when TRUST_PROXY is explicitly enabled
    forwarded = request.headers.get("x-forwarded-for")
    if settings.TRUST_PROXY and forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Rate Limiting for verification endpoints matched by prefix
    path = request.url.path
    if (
        path.startswith("/api/fact-check")
        or path.startswith("/api/v1/fact-check")
        or path.startswith("/fact-check")
    ):
        window = RATE_LIMIT_REGISTRY.get(client_ip, [])
        # Evict entries older than 60 seconds
        window = [t for t in window if start_time - t < 60]
        if len(window) >= settings.RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Verification request rate limit exceeded. Please wait a minute before submitting again."
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "request_id": request_id
                }
            )
        window.append(start_time)
        RATE_LIMIT_REGISTRY[client_ip] = window

        # Evict completely stale IP keys to prevent unbounded memory growth
        if len(RATE_LIMIT_REGISTRY) > 200:
            stale_keys = [k for k, v in RATE_LIMIT_REGISTRY.items() if not v or (start_time - v[-1] > 120)]
            for k in stale_keys:
                RATE_LIMIT_REGISTRY.pop(k, None)

    # Execute request
    response = await call_next(request)
    
    # Calculate latency and add security headers
    latency_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{latency_ms}ms"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Log structured request summary
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({latency_ms}ms) [ReqID: {request_id}]")
    
    return response

# Standard Health Endpoints
@app.get("/health", tags=["System Health"])
@app.get("/api/health", tags=["System Health"])
async def root_health_check():
    from app.providers.fact_db_provider import is_firestore_configured
    storage_mode = "firestore" if is_firestore_configured() else "json"
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "service": "TruthLens Fact-Checking Engine",
        "storage": storage_mode,
        "providers": {
            "fact_database": "active",
            "search_graph": "active",
            "image_forensics": "active",
            "news_wire": "active"
        }
    }


# Mount Single Versioned API at /api (for frontend) and /api/v1 (as versioned alias)
app.include_router(v1_router, prefix="/api")
app.include_router(v1_router, prefix="/api/v1")
