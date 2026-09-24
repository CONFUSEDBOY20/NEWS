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

# Import versioned routers
from app.api.v1 import v1_router

# Import legacy routers for backward compatibility
from app.api.routes_fact_check import router as legacy_fact_check_router
from app.api.routes_news import router as legacy_news_router
from app.api.routes_articles import router as legacy_articles_router
from app.api.routes_admin import router as legacy_admin_router

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


# Register Global Exception Handlers
app.add_exception_handler(TruthLensException, truthlens_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS Configuration
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# In-Memory Rate Limiting Registry
RATE_LIMIT_REGISTRY = {}

@app.middleware("http")
async def request_lifecycle_and_rate_limit_middleware(request: Request, call_next):
    # Attach unique request identifier
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
    request.state.request_id = request_id
    
    start_time = time.time()
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Rate Limiting for verification endpoints
    if "/fact-check" in request.url.path:
        window = RATE_LIMIT_REGISTRY.get(client_ip, [])
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
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "service": "TruthLens Fact-Checking Engine",
        "providers": {
            "fact_database": "active",
            "search_graph": "active",
            "image_forensics": "active",
            "news_wire": "active"
        }
    }

# Mount Versioned API (v1)
app.include_router(v1_router, prefix="/api/v1")

# Mount Legacy Routes for Backward Compatibility
app.include_router(legacy_fact_check_router, prefix="/api")
app.include_router(legacy_news_router, prefix="/api")
app.include_router(legacy_articles_router, prefix="/api")
app.include_router(legacy_admin_router, prefix="/api")
