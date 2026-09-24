from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["System Health"])

@router.get("/health")
async def health_check():
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
