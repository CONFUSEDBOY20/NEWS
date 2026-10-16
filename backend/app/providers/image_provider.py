import io
import logging
from typing import List, Optional
import httpx
from PIL import Image, ImageChops
from app.providers.base import BaseImageVerificationProvider
from app.schemas.fact_check import ImageAnalysisMetadata
from app.core.config import settings

logger = logging.getLogger("truthlens.image")
SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json"

class ImageVerificationProvider(BaseImageVerificationProvider):
    async def analyze_image(self, image_bytes: bytes, filename: str) -> ImageAnalysisMetadata:
        file_size_kb = round(len(image_bytes) / 1024.0, 2)
        dimensions = "Unknown"
        img_format = "Unknown"
        exif_found = False
        findings: List[str] = []
        ai_prob: Optional[float] = None
        ela_score = 12.5
        manipulation_risk = "LOW"
        detector_status = "not_configured"
        detector_verdict = "INCONCLUSIVE"
        generator_scores = {}

        try:
            image = Image.open(io.BytesIO(image_bytes))
            dimensions = f"{image.width}x{image.height}"
            img_format = image.format or "JPEG"

            # Check EXIF
            exif_data = image.getexif()
            if exif_data and len(exif_data) > 0:
                exif_found = True
                findings.append(f"EXIF metadata is present ({len(exif_data)} tags). This metadata can be edited and does not prove authenticity.")
                software = exif_data.get(0x0131)
                make = exif_data.get(0x010f)
                if make:
                    findings.append(f"EXIF device maker field: {str(make)[:100]}")
                if software:
                    findings.append(f"EXIF software field: {str(software)[:100]}")
            else:
                findings.append("No EXIF metadata found (common in compressed social media images or AI-generated outputs).")

            # Error Level Analysis (ELA) check on JPEG/PNG
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Save temporary compressed buffer for differential check
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=90)
            buffer.seek(0)
            compressed = Image.open(buffer)

            diff = ImageChops.difference(image, compressed)
            extrema = diff.getextrema()
            max_diff = max([ex[1] for ex in extrema])
            ela_score = round((max_diff / 255.0) * 100.0, 2)

            if ela_score > 40.0:
                manipulation_risk = "MODERATE"
                findings.append("Compression differences were observed; re-encoding and image format can also cause this signal.")

            findings.append("Compression analysis is a weak manipulation clue; it cannot identify AI generation on its own.")

        except Exception as e:
            findings.append(f"Image analysis error: {str(e)}")

        if settings.SIGHTENGINE_API_USER and settings.SIGHTENGINE_API_SECRET:
            detector_status = "error"
            try:
                timeout = httpx.Timeout(18.0, connect=5.0)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        SIGHTENGINE_URL,
                        data={
                            "models": "genai",
                            "api_user": settings.SIGHTENGINE_API_USER,
                            "api_secret": settings.SIGHTENGINE_API_SECRET,
                        },
                        files={"media": (filename, image_bytes, "application/octet-stream")},
                    )
                    response.raise_for_status()
                    result = response.json()
                    if result.get("status") != "success":
                        raise ValueError("Detector returned an unsuccessful status")
                    raw_score = result.get("type", {}).get("ai_generated")
                    if isinstance(raw_score, (int, float)) and 0 <= raw_score <= 1:
                        ai_prob = round(float(raw_score) * 100, 1)
                        detector_status = "available"
                        detector_verdict = "LIKELY_AI" if ai_prob >= 80 else "LIKELY_NOT_AI" if ai_prob <= 20 else "INCONCLUSIVE"
                        generators = result.get("type", {}).get("ai_generators", {})
                        if isinstance(generators, dict):
                            generator_scores = {
                                str(name): round(float(score) * 100, 1)
                                for name, score in generators.items()
                                if isinstance(score, (int, float)) and 0 <= score <= 1
                            }
                        findings.append("Pixel-based AI image detection completed. Its score is probabilistic and may be wrong.")
                    else:
                        raise ValueError("Detector response did not contain a valid AI probability")
            except Exception as exc:
                logger.warning("AI image detection provider failed: %s", exc)
                findings.append("Pixel-based AI detector was unavailable; AI generation could not be assessed.")
        else:
            findings.append("Pixel-based AI detector is not configured; AI generation could not be assessed.")

        return ImageAnalysisMetadata(
            filename=filename,
            file_size_kb=file_size_kb,
            dimensions=dimensions,
            format=img_format,
            exif_found=exif_found,
            manipulation_risk=manipulation_risk,
            ai_generated_probability=ai_prob,
            ai_detection_status=detector_status,
            ai_detection_verdict=detector_verdict,
            ai_detection_provider="Sightengine" if detector_status == "available" else None,
            ai_generator_scores=generator_scores,
            ela_anomaly_score=ela_score,
            findings=findings
        )
