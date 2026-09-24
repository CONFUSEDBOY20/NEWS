from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, List, Dict, Any
from app.schemas.admin import (
    LoginRequest,
    TokenResponse,
    DashboardOverviewStats,
    RawDataRecord,
    FactArticle,
    SystemSettings
)
from app.core.security import create_access_token, get_current_admin, verify_admin_credentials
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin Portal"])
admin_service = AdminService()

@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest):
    if verify_admin_credentials(payload.email, payload.password):
        token = create_access_token(payload.email)
        admin_service.fact_db.add_admin_log(payload.email, "LOGIN", "auth", "session", "Admin authenticated via v1 API")
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

@router.get("/raw-data", response_model=List[RawDataRecord])
async def get_raw_data(
    category: Optional[str] = None,
    verdict: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    return admin_service.get_raw_data(category=category, verdict=verdict, search=search)

@router.post("/raw-data", response_model=RawDataRecord)
async def create_raw_data(record: RawDataRecord, admin: dict = Depends(get_current_admin)):
    return admin_service.create_raw_data(record)

@router.put("/raw-data/{item_id}", response_model=RawDataRecord)
async def update_raw_data(item_id: str, record: RawDataRecord, admin: dict = Depends(get_current_admin)):
    payload_dict = record.model_dump() if hasattr(record, "model_dump") else record.dict()
    updated = admin_service.update_raw_data(item_id, payload_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Record not found")
    return updated

@router.delete("/raw-data/{item_id}")
async def delete_raw_data(item_id: str, admin: dict = Depends(get_current_admin)):
    deleted = admin_service.delete_raw_data(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted successfully", "id": item_id}

@router.get("/articles", response_model=List[FactArticle])
async def get_fact_articles(admin: dict = Depends(get_current_admin)):
    return admin_service.list_articles()

@router.post("/articles", response_model=FactArticle)
async def create_fact_article(article: FactArticle, admin: dict = Depends(get_current_admin)):
    return admin_service.create_article(article)

@router.put("/articles/{article_id}", response_model=FactArticle)
async def update_fact_article(article_id: str, article: FactArticle, admin: dict = Depends(get_current_admin)):
    payload_dict = article.model_dump() if hasattr(article, "model_dump") else article.dict()
    updated = admin_service.update_article(article_id, payload_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Article not found")
    return updated

@router.delete("/articles/{article_id}")
async def delete_fact_article(article_id: str, admin: dict = Depends(get_current_admin)):
    deleted = admin_service.delete_article(article_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted successfully", "id": article_id}

@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(admin: dict = Depends(get_current_admin)):
    return admin_service.get_settings()

@router.post("/settings", response_model=SystemSettings)
async def update_system_settings(settings_payload: SystemSettings, admin: dict = Depends(get_current_admin)):
    payload_dict = settings_payload.model_dump() if hasattr(settings_payload, "model_dump") else settings_payload.dict()
    return admin_service.update_settings(payload_dict)

@router.get("/logs")
async def get_audit_logs(admin: dict = Depends(get_current_admin)):
    return admin_service.get_logs()
