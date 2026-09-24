# TruthLens Backend Architecture & Engineering Specification

**Version:** 2.0.0  
**Framework:** FastAPI (Python 3.10+)  
**Data Layer:** Firestore (Cloud) + Local Resilient JSON Fallback  
**Authentication:** JWT (HMAC-SHA256) with Constant-Time Cryptographic Comparison  

---

## 1. Architectural Overview

The TruthLens backend follows a strict **Layered Clean Architecture** pattern designed for high throughput, modularity, resiliency, and clean separation of concerns.

```
                  ┌─────────────────────────────────────┐
                  │          Client Applications         │
                  │   (Vite/React, Mobile, Admin UI)   │
                  └──────────────────┬──────────────────┘
                                     │ HTTP / REST
                                     ▼
                  ┌─────────────────────────────────────┐
                  │        FastAPI Middleware Layer     │
                  │  • CORS (Whitelist Restricted)      │
                  │  • Request ID Generation (UUID)     │
                  │  • Latency Tracking & Sec Headers   │
                  │  • Token-Bucket Rate Limiter        │
                  │  • Centralized Exception Handlers   │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────┐                           ┌──────────────────────┐
│  API Layer (/api/v1) │                           │  Legacy API (/api)   │
│  • routes_health     │                           │  • Backward-compat   │
│  • routes_fact_check │                           │    routing proxies   │
│  • routes_news       │                           └──────────────────────┘
│  • routes_articles   │
│  • routes_admin      │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Orchestration Layer                    │
│   • FactCheckService: Multi-source claim verification & stance analysis │
│   • NewsService: Aggregation, deduplication, caching & ticker engine    │
│   • AdminService: Dashboard analytics, audit logs, CRUD operations      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│           Providers Layer            │   │      Database & Persistence  │
│  • AIProvider (Gemini / Heuristic)   │   │  • DatabaseManager           │
│  • SearchProvider (Multi-Engine)     │   │  • Firestore Live Client     │
│  • NewsProvider (Wire Feeds/Scraper) │   │  • Atomic Local JSON Store   │
│  • ImageProvider (Forensics)         │   │  • In-Memory Fast Cache      │
│  • FactDBProvider (Index Search)     │   └──────────────────────────────┘
└──────────────────┬───────────────────┘
                   │ Resilient HTTP Client (Timeouts + Exponential Retries)
                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           External Integrations                         │
│   • Google Gemini Flash 1.5                                             │
│   • Google Fact Check Tools API                                         │
│   • NewsAPI.org & GNews.io                                              │
│   • DuckDuckGo & Public Verified Intelligence Indexes                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Layer Separation

```
backend/
├── app/
│   ├── api/                     # HTTP Route Handlers
│   │   ├── v1/                  # Primary Version 1 API Routes
│   │   │   ├── __init__.py      # Bundled v1 Router
│   │   │   ├── routes_health.py # Standard health endpoints
│   │   │   ├── routes_fact_check.py
│   │   │   ├── routes_news.py
│   │   │   ├── routes_articles.py
│   │   │   └── routes_admin.py
│   │   ├── routes_admin.py      # Legacy backward-compatible mounts
│   │   ├── routes_articles.py
│   │   ├── routes_fact_check.py
│   │   └── routes_news.py
│   ├── core/                    # Core Configuration & Infrastructure
│   │   ├── config.py            # Pydantic Settings & Dotenv Loader
│   │   ├── security.py          # JWT, Passwords & Constant-time hashing
│   │   ├── exceptions.py        # Custom Domain Application Exceptions
│   │   ├── handlers.py          # Centralized Global Exception Handlers
│   │   └── logging.py           # Structured JSON and console logging
│   ├── db/                      # Database & Persistence Abstraction
│   │   └── database.py          # DatabaseManager (Firestore + Local File)
│   ├── providers/               # External Network Adapters & Forensics
│   │   ├── base.py              # Abstract Base Provider Interfaces
│   │   ├── ai_provider.py       # Gemini AI & Semantic Inference Engine
│   │   ├── search_provider.py   # Multi-engine claim corroboration
│   │   ├── news_provider.py     # Live feeds, RSS & scraping pipeline
│   │   ├── image_provider.py    # Visual forensics & metadata analysis
│   │   └── fact_db_provider.py  # Fact database indexing & search
│   ├── schemas/                 # Strongly-typed Pydantic Validation Schemas
│   │   ├── fact_check.py        # Fact verification requests/responses
│   │   ├── news.py              # News feeds & search schemas
│   │   └── admin.py             # Admin metrics, logs, CRUD payloads
│   ├── services/                # Business Logic Orchestrators
│   │   ├── fact_check_service.py
│   │   ├── news_service.py
│   │   └── admin_service.py
│   ├── utils/                   # Shared Utilities
│   │   ├── http_client.py       # Resilient HTTP Client (timeouts & retries)
│   │   └── text.py              # Text cleaning & keyword extraction
│   └── main.py                  # FastAPI Application Entrypoint
├── data/
│   └── database.json            # Seed and persistent fact-check archive
└── tests/
    └── test_api.py              # Automated Pytest Suite
```

---

## 3. Centralized Error Handling

All uncaught exceptions, HTTP exceptions, validation errors, and custom application exceptions are captured by global FastAPI exception handlers defined in `app/core/handlers.py`.

### Error Response Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | RATE_LIMIT_EXCEEDED | EXTERNAL_API_ERROR | INTERNAL_SERVER_ERROR",
    "message": "Descriptive human-readable error explanation",
    "details": [ ... ]
  },
  "timestamp": "2026-09-23T14:00:00Z",
  "status_code": 400,
  "request_id": "a9f82d1c-e4b"
}
```

### Application Exception Hierarchy (`app/core/exceptions.py`)

- `TruthLensException` (Base Exception)
  - `NotFoundException` (`404 NOT_FOUND`)
  - `ValidationException` (`422 VALIDATION_ERROR`)
  - `AuthenticationException` (`401 UNAUTHORIZED`)
  - `RateLimitException` (`429 RATE_LIMIT_EXCEEDED`)
  - `ExternalAPIException` (`502 EXTERNAL_API_ERROR`)

---

## 4. Resiliency, Timeouts & Retry Handling

External API network calls (Gemini, NewsAPI, GNews, Google Fact Check) are routed through `ResilientHTTPClient` (`app/utils/http_client.py`):

1. **Configurable Timeouts**: Default 8.0-second hard ceiling per outbound network request.
2. **Exponential Backoff**: Automatic retry on network drops, URLErrors, or timeouts (up to 2 retries with backoff factors).
3. **Graceful Degradation**: If external AI or news wire services fail or exhaust quota, the system falls back to the curated in-memory fact database and heuristic verification engines without crashing.

---

## 5. Structured Request Logging

Middleware in `app/main.py` intercepts every request:
1. Assigns a unique `X-Request-ID` header.
2. Measures total server processing time (`X-Response-Time: 12.4ms`).
3. Logs structured information:
   ```
   2026-09-23 19:35:32 | INFO     | [truthlens.main] POST /api/v1/fact-check/text -> 200 (14.2ms) [ReqID: 9a8c1f0e2b]
   ```

---

## 6. API Versioning & Endpoints

Both `/api/v1/...` and `/api/...` endpoints are supported concurrently.

### Health Endpoints
- `GET /health`
- `GET /api/health`
- `GET /api/v1/health`

**Standard Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-23T14:00:00.000000+00:00",
  "version": "2.0.0",
  "service": "TruthLens Fact-Checking Engine",
  "providers": {
    "fact_database": "active",
    "search_graph": "active",
    "image_forensics": "active",
    "news_wire": "active"
  }
}
```

### Fact Check Endpoints
- `POST /api/v1/fact-check/text` & `POST /api/fact-check/text`
- `POST /api/v1/fact-check/url` & `POST /api/fact-check/url`
- `POST /api/v1/fact-check/image` & `POST /api/fact-check/image`
- `POST /api/v1/fact-check/live` & `POST /api/fact-check/live`

### News & Intelligence Feeds
- `GET /api/v1/news/world`
- `GET /api/v1/news/india`
- `GET /api/v1/news/search?q={query}`
- `GET /api/v1/news/ticker`

### Editorial Fact Articles
- `GET /api/v1/articles`
- `GET /api/v1/articles/{article_id}`

### Administrative Suite (Secured with JWT)
- `POST /api/v1/admin/login`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/raw-data`
- `POST /api/v1/admin/raw-data`
- `PUT /api/v1/admin/raw-data/{id}`
- `DELETE /api/v1/admin/raw-data/{id}`
- `GET /api/v1/admin/articles`
- `POST /api/v1/admin/articles`
- `PUT /api/v1/admin/articles/{id}`
- `DELETE /api/v1/admin/articles/{id}`
- `GET /api/v1/admin/settings`
- `POST /api/v1/admin/settings`
- `GET /api/v1/admin/logs`

---

## 7. Automated Test Verification

Run test suite:
```bash
python -m pytest backend/tests/test_api.py -v
```

All 8 integration test scenarios pass with 100% success rate:
- `test_health_check_root_and_v1` -> `PASSED`
- `test_fact_check_text_known_false_claim` -> `PASSED`
- `test_fact_check_insufficient_evidence` -> `PASSED`
- `test_get_news_world_and_v1` -> `PASSED`
- `test_get_news_india` -> `PASSED`
- `test_get_articles` -> `PASSED`
- `test_validation_error_envelope` -> `PASSED`
- `test_admin_login_and_crud` -> `PASSED`
