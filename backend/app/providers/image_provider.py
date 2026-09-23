import io
from typing import List
from PIL import Image, ImageChops, ImageEnhance
from app.providers.base import BaseImageVerificationProvider
from app.schemas.fact_check import ImageAnalysisMetadata

class ImageVerificationProvider(BaseImageVerificationProvider):
    async def analyze_image(self, image_bytes: bytes, filename: str) -> ImageAnalysisMetadata:
        file_size_kb = round(len(image_bytes) / 1024.0, 2)
        dimensions = "Unknown"
        img_format = "Unknown"
        exif_found = False
        findings: List[str] = []
        ai_prob = 15.0
        ela_score = 12.5
        manipulation_risk = "LOW"

        try:
            image = Image.open(io.BytesIO(image_bytes))
            dimensions = f"{image.width}x{image.height}"
            img_format = image.format or "JPEG"

            # Check EXIF
            exif_data = image.getexif()
            if exif_data and len(exif_data) > 0:
                exif_found = True
                findings.append(f"Authentic Camera EXIF metadata present ({len(exif_data)} tags identified).")
                # Look for camera model or software
                software = exif_data.get(0x0131)
                make = exif_data.get(0x010f)
                if make:
                    findings.append(f"Hardware source signature: {make}")
                if software and any(k in str(software).lower() for k in ["photoshop", "gimp", "midjourney", "stable", "dall-e"]):
                    findings.append(f"Digital editing/generative software tag found: {software}")
                    manipulation_risk = "HIGH"
                    ai_prob = 85.0
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
                findings.append("Compression error level gradients indicate non-uniform re-saving or regional splicing.")
            else:
                findings.append("Uniform error level distribution across image matrix. No obvious local splicing detected.")

            # Synthetic image checks
            if not exif_found and image.width in [1024, 512, 768] and image.height in [1024, 512, 768]:
                ai_prob = 65.0
                findings.append("Square standard resolution matching typical latent diffusion model default dimensions (1024x1024 / 512x512).")
                if manipulation_risk != "HIGH":
                    manipulation_risk = "MODERATE"

        except Exception as e:
            findings.append(f"Image analysis error: {str(e)}")

        return ImageAnalysisMetadata(
            filename=filename,
            file_size_kb=file_size_kb,
            dimensions=dimensions,
            format=img_format,
            exif_found=exif_found,
            manipulation_risk=manipulation_risk,
            ai_generated_probability=ai_prob,
            ela_anomaly_score=ela_score,
            findings=findings
        )
