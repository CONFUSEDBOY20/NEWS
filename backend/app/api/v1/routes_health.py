from fastapi import APIRouter
from datetime import datetime, timezone
from app.providers.fact_db_provider import is_firestore_configured

router = APIRouter(tags=["System Health"])

@router.get("/health")
async def health_check():
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
