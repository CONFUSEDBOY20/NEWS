from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.admin_service import AdminService
from app.schemas.admin import FactArticle

router = APIRouter(prefix="/articles", tags=["Fact Articles"])
admin_service = AdminService()

@router.get("", response_model=List[FactArticle])
async def get_fact_articles(category: Optional[str] = Query(None)):
    articles = admin_service.list_articles(category=category)
    # Return published articles (or all if status not explicitly draft)
    published = [a for a in articles if a.get("status", "PUBLISHED") == "PUBLISHED"]
    return published

@router.get("/{article_id}", response_model=FactArticle)
async def get_article(article_id: str):
    art = admin_service.get_article(article_id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found")
    return art
