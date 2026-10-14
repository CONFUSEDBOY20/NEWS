import io
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from typing import Optional
from PIL import Image

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

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB limit

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
    # Read in chunks to prevent memory exhaustion attacks
    chunks = []
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1 MB chunks

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")
        chunks.append(chunk)

    if total_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    content = b"".join(chunks)

    # Verify real image format with Pillow instead of trusting content_type
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        if img.format not in ("JPEG", "PNG", "WEBP", "MPO", "TIFF", "GIF"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format '{img.format}'. Supported formats: JPEG, PNG, WEBP"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    return await service.verify_image(content, filename=file.filename or "image.jpg", language=language)

@router.post("/live", response_model=LiveDetectionResponse)
async def live_detection(payload: FactCheckTextRequest):
    if not payload.text or len(payload.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide at least 5 characters of speech or stream text")
    return await service.detect_live_stream(payload.text.strip(), language=payload.language)

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
