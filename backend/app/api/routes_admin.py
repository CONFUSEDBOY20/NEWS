from fastapi import APIRouter, HTTPException, Depends, status, Response
from typing import Optional, List, Dict, Any
from app.schemas.admin import (
    LoginRequest,
    TokenResponse,
    DashboardOverviewStats,
    RawDataRecord,
    FactArticle,
    SystemSettings
)
from app.core.security import create_access_token, get_current_admin, verify_password
from app.core.config import settings
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin Portal"])
admin_service = AdminService()

@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest):
    # Authenticate admin user
    if payload.email.strip().lower() == settings.ADMIN_EMAIL.lower() and verify_password(payload.password, settings.ADMIN_PASSWORD):
        token = create_access_token(payload.email)
        admin_service.fact_db.add_admin_log(payload.email, "LOGIN", "auth", "session", "Admin successfully authenticated via portal")
        return TokenResponse(
            access_token=token,
            admin={
                "email": payload.email,
                "name": "System Administrator",
                "role": "Super Admin",
                "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            }
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid administrative email or security password"
    )

@router.get("/dashboard", response_model=DashboardOverviewStats)
async def get_dashboard_overview(admin: dict = Depends(get_current_admin)):
    return admin_service.get_dashboard_stats()

# Raw Data CRUD
@router.get("/raw-data")
async def list_raw_fact_data(
    category: Optional[str] = None,
    verdict: Optional[str] = None,
    region: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    return admin_service.list_raw_data(
        category=category,
        verdict=verdict,
        region=region,
        language=language,
        search=search
    )

@router.post("/raw-data")
async def create_raw_fact_data(payload: RawDataRecord, admin: dict = Depends(get_current_admin)):
    return admin_service.create_raw_data(payload)

@router.put("/raw-data/{item_id}")
async def update_raw_fact_data(item_id: str, updates: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    res = admin_service.update_raw_data(item_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Raw data record not found")
    return res

@router.delete("/raw-data/{item_id}")
async def delete_raw_fact_data(item_id: str, admin: dict = Depends(get_current_admin)):
    ok = admin_service.delete_raw_data(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Raw data record not found")
    return {"status": "success", "message": f"Record {item_id} deleted successfully"}

@router.get("/raw-data/export/csv")
async def export_raw_data(admin: dict = Depends(get_current_admin)):
    csv_str = admin_service.export_raw_data_csv()
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=truthlens_raw_facts.csv"}
    )

# Fact Articles Management
@router.get("/articles")
async def list_admin_articles(category: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    return admin_service.list_articles(category=category)

@router.post("/articles")
async def create_admin_article(article: FactArticle, admin: dict = Depends(get_current_admin)):
    return admin_service.create_article(article)

@router.put("/articles/{article_id}")
async def update_admin_article(article_id: str, updates: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    res = admin_service.update_article(article_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Article not found")
    return res

@router.delete("/articles/{article_id}")
async def delete_admin_article(article_id: str, admin: dict = Depends(get_current_admin)):
    ok = admin_service.delete_article(article_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"status": "success", "message": f"Article {article_id} deleted"}

# Activity Logs & System Settings
@router.get("/logs")
async def get_admin_activity_logs(limit: int = 100, admin: dict = Depends(get_current_admin)):
    return admin_service.get_logs(limit=limit)

@router.get("/settings")
async def get_system_settings(admin: dict = Depends(get_current_admin)):
    return admin_service.get_settings()

@router.put("/settings")
async def update_system_settings(updates: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    return admin_service.update_settings(updates)
