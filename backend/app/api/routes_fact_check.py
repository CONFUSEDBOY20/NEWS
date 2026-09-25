from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from app.schemas.fact_check import (
    FactCheckUrlRequest,
    FactCheckTextRequest,
    FactCheckResponse,
    LiveDetectionResponse
)
from app.services.fact_check_service import FactCheckService
from app.utils.url_safety import UnsafeURLError

router = APIRouter(prefix="/fact-check", tags=["Fact Check"])
service = FactCheckService()

@router.post("/url", response_model=FactCheckResponse)
async def check_url(payload: FactCheckUrlRequest):
    if not payload.url or not payload.url.strip().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Please provide a valid HTTP or HTTPS news URL")
    try:
        return await service.verify_url(payload.url.strip(), language=payload.language)
    except UnsafeURLError:
        raise HTTPException(status_code=400, detail="This URL cannot be checked.")

@router.post("/text", response_model=FactCheckResponse)
async def check_text(payload: FactCheckTextRequest):
    if not payload.text or len(payload.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide at least 5 characters of article text or claim")
    return await service.verify_text(payload.text.strip(), title=payload.title, language=payload.language)

@router.post("/image", response_model=FactCheckResponse)
async def check_image(
    file: UploadFile = File(...),
    language: str = Form("en")
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WEBP)")
    
    # Read file content (limit 15MB)
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 15MB limit")

    return await service.verify_image(contents, file.filename, language=language)

@router.get("/live-news", response_model=LiveDetectionResponse)
async def detect_live_news(
    region: str = "global",
    category: Optional[str] = None,
    limit: int = 8,
    language: str = "en"
):
    if region.lower() not in {"global", "world", "india"}:
        raise HTTPException(status_code=400, detail="Region must be global, world, or india")
    if limit < 1 or limit > 12:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 12")
    return await service.detect_live_news(
        region=region,
        category=category,
        limit=limit,
        language=language,
    )

@router.get("/{check_id}")
async def get_check_result(check_id: str):
    record = await service.get_check_by_id(check_id)
    if not record:
        raise HTTPException(status_code=404, detail="Fact-check record not found")
    return record
