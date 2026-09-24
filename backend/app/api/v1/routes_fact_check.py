from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from app.schemas.fact_check import (
    FactCheckUrlRequest,
    FactCheckTextRequest,
    FactCheckResponse,
    LiveDetectionResponse
)
from app.services.fact_check_service import FactCheckService

router = APIRouter(prefix="/fact-check", tags=["Fact Check"])
service = FactCheckService()

@router.post("/url", response_model=FactCheckResponse)
async def check_url(payload: FactCheckUrlRequest):
    if not payload.url or not payload.url.strip().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Please provide a valid HTTP or HTTPS news URL")
    return await service.verify_url(payload.url.strip(), language=payload.language)

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
        raise HTTPException(status_code=400, detail="File must be a valid image (JPEG, PNG, WEBP)")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")
    return await service.verify_image(content, filename=file.filename, language=language)

@router.post("/live", response_model=LiveDetectionResponse)
async def live_detection(payload: FactCheckTextRequest):
    if not payload.text or len(payload.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide at least 5 characters of speech or stream text")
    return await service.detect_live_stream(payload.text.strip(), language=payload.language)
