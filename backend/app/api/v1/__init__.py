from fastapi import APIRouter
from app.api.v1.routes_health import router as health_router
from app.api.v1.routes_fact_check import router as fact_check_router
from app.api.v1.routes_news import router as news_router
from app.api.v1.routes_articles import router as articles_router
from app.api.v1.routes_admin import router as admin_router

v1_router = APIRouter()

v1_router.include_router(health_router)
v1_router.include_router(fact_check_router)
v1_router.include_router(news_router)
v1_router.include_router(articles_router)
v1_router.include_router(admin_router)
