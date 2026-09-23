from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from app.schemas.fact_check import (
    FactCheckUrlRequest,
    FactCheckTextRequest,
    FactCheckResponse
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
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WEBP)")
    
    # Read file content (limit 15MB)
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 15MB limit")

    return await service.verify_image(contents, file.filename, language=language)

@router.get("/{check_id}")
async def get_check_result(check_id: str):
    record = await service.get_check_by_id(check_id)
    if not record:
        raise HTTPException(status_code=404, detail="Fact-check record not found")
    return record
