from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.services.admin_service import AdminService

router = APIRouter(prefix="/articles", tags=["Fact Articles"])
admin_service = AdminService()

@router.get("")
async def get_fact_articles(category: Optional[str] = Query(None)):
    articles = admin_service.list_articles(category=category)
    # Only return published articles to public endpoint
    return [a for a in articles if a.get("status") == "PUBLISHED"]

@router.get("/{identifier}")
async def get_article_detail(identifier: str):
    art = admin_service.get_article(identifier)
    if not art or art.get("status") != "PUBLISHED":
        raise HTTPException(status_code=404, detail="Article not found")
    return art
