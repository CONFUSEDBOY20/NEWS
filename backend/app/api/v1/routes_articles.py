from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.providers.fact_db_provider import FactDatabaseProvider
from app.schemas.admin import FactArticle

router = APIRouter(prefix="/articles", tags=["Fact Articles"])
db_provider = FactDatabaseProvider()

@router.get("", response_model=List[FactArticle])
async def get_articles():
    return db_provider.get_articles()

@router.get("/{article_id}", response_model=FactArticle)
async def get_article(article_id: str):
    article = db_provider.get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article
