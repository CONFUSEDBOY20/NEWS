import asyncio
import time
import uuid
import httpx
import re
from datetime import datetime, timezone
from typing import Optional, List
from app.schemas.fact_check import (
    FactCheckResponse,
    VerdictEnum,
    EvidenceItem,
    ExtractedClaim,
    ImageAnalysisMetadata,
    LiveDetectionItem,
    LiveDetectionResponse
)
from app.providers.fact_db_provider import FactDatabaseProvider
from app.providers.search_provider import SearchProvider
from app.providers.ai_provider import AIProvider
from app.providers.image_provider import ImageVerificationProvider
from app.providers.news_provider import NewsProvider

RISKY_VERDICTS = {
    VerdictEnum.FALSE,
    VerdictEnum.MISLEADING,
    VerdictEnum.PARTLY_TRUE,
    VerdictEnum.UNVERIFIED,
    VerdictEnum.INSUFFICIENT_EVIDENCE,
}

VIRAL_RISK_TERMS = {
    "breaking",
    "urgent",
    "shocking",
    "viral",
    "guaranteed",
    "miracle",
    "secret",
    "exclusive",
    "ban",
    "mandatory",
    "scam",
    "fake",
    "deepfake",
    "hoax",
}

HIGH_CREDIBILITY_SOURCES = {
    "reuters",
    "associated press",
    "ap news",
    "bbc",
    "the hindu",
    "indian express",
    "press information bureau",
    "pib",
    "rbi",
    "who",
    "nasa",
    "isro",
    "noaa",
    "wikipedia",
    "britannica",
}

MEDIUM_CREDIBILITY_SOURCES = {
    "al jazeera",
    "hindustan times",
    "ndtv",
    "times of india",
    "the guardian",
    "cnbc",
    "bloomberg",
}

class FactCheckService:
    def __init__(self):
        self.fact_db = FactDatabaseProvider()
        self.search_provider = SearchProvider()
        self.ai_provider = AIProvider()
        self.image_provider = ImageVerificationProvider()
        self.news_provider = NewsProvider()

    async def verify_url(self, url: str, language: str = "en") -> FactCheckResponse:
        start_time = time.time()
        
        # 1. Fetch URL content
        extracted_text = ""
        page_title = url
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "TruthLens Fact-Check Bot/2.0"})
                if resp.status_code == 200:
                    html_content = resp.text
                    # Extract basic title and paragraphs
                    title_match = re.search(r"<title>(.*?)</title>", html_content, re.IGNORECASE | re.DOTALL)
                    if title_match:
                        page_title = title_match.group(1).strip()
                    # Strip tags
                    clean_p = re.findall(r"<p[^>]*>(.*?)</p>", html_content, re.IGNORECASE | re.DOTALL)
                    text_parts = [re.sub(r"<[^>]+>", "", p).strip() for p in clean_p]
                    extracted_text = " ".join([p for p in text_parts if len(p) > 20])[:2000]
        except Exception:
            extracted_text = page_title

        if not extracted_text:
            extracted_text = page_title

        return await self._run_pipeline(
            submission_type="url",
            submitted_input=url,
            text_content=f"{page_title}\n{extracted_text}",
            language=language,
            start_time=start_time,
        )

    async def verify_text(self, text: str, title: Optional[str] = None, language: str = "en") -> FactCheckResponse:
        start_time = time.time()
        content = f"{title}\n{text}" if title else text
        return await self._run_pipeline(
            submission_type="text",
            submitted_input=text[:500],
            text_content=content,
            language=language,
            start_time=start_time,
        )

    async def verify_image(self, image_bytes: bytes, filename: str, language: str = "en") -> FactCheckResponse:
        start_time = time.time()
        
        # 1. Image Forensics
        img_meta = await self.image_provider.analyze_image(image_bytes, filename)
        
        # 2. Extract textual cues from filename
        clean_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        text_content = f"Image forensic verification: {clean_name}"

        response = await self._run_pipeline(
            submission_type="image",
            submitted_input=filename,
            text_content=text_content,
            language=language,
            start_time=start_time,
            image_analysis=img_meta,
        )
        return response

    async def detect_live_news(
        self,
        region: str = "global",
        category: Optional[str] = None,
        limit: int = 8,
        language: str = "en"
    ) -> LiveDetectionResponse:
        normalized_region = region.lower()
        page_size = max(1, min(limit, 12))

        if normalized_region == "world":
            articles = await self.news_provider.get_world_news(category=category, page_size=page_size, fresh=True)
        elif normalized_region == "india":
            articles = await self.news_provider.get_india_news(category=category, page_size=page_size, fresh=True)
        else:
            world, india = await asyncio.gather(
                self.news_provider.get_world_news(category=category, page_size=max(1, page_size // 2), fresh=True),
                self.news_provider.get_india_news(category=category, page_size=page_size, fresh=True),
            )
            articles = (world + india)[:page_size]

        checks = await asyncio.gather(
            *[self._detect_article(article, language) for article in articles],
            return_exceptions=True,
        )
        detections = [item for item in checks if isinstance(item, LiveDetectionItem)]
        detections.sort(key=lambda item: item.risk_score, reverse=True)
        clusters = self._claim_clusters(detections)

        return LiveDetectionResponse(
            total_scanned=len(articles),
            high_risk_count=sum(1 for item in detections if item.risk_level == "HIGH"),
            medium_risk_count=sum(1 for item in detections if item.risk_level == "MEDIUM"),
            low_risk_count=sum(1 for item in detections if item.risk_level == "LOW"),
            detections=detections,
            claim_clusters=clusters,
            region=normalized_region.title() if normalized_region != "global" else "Global",
            category=category or "All",
            synced_at=datetime.now(timezone.utc).isoformat(),
        )

    async def _detect_article(self, article, language: str) -> LiveDetectionItem:
        text_content = ". ".join(
            part for part in [article.title, article.description, article.summary] if part
        )
        result = await self._run_pipeline(
            submission_type="live_news",
            submitted_input=article.title[:500],
            text_content=f"{article.title}\n{text_content}",
            language=language,
            start_time=time.time(),
            persist=False,
        )
        risk_score = self._risk_score(result, text_content)
        source_label, source_score = self._source_credibility(article.source_name)
        signals = self._risk_signals(result, text_content, source_label, source_score)
        if risk_score >= 75:
            risk_level = "HIGH"
        elif risk_score >= 45:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return LiveDetectionItem(
            article_id=article.id,
            title=article.title,
            source_name=article.source_name,
            source_url=article.url,
            published_at=article.published_at,
            region=article.region,
            category=article.category,
            risk_level=risk_level,
            risk_score=risk_score,
            source_credibility=source_label,
            source_credibility_score=source_score,
            risk_signals=signals,
            evidence_summary=self._evidence_summary(result),
            matched_claim_group=self._claim_group(article.title),
            verdict=result.verdict,
            confidence=result.confidence,
            detection_reason=self._detection_reason(result, risk_level),
            fact_check_id=result.id,
            checked_at=result.created_at,
        )

    def _risk_score(self, result: FactCheckResponse, text_content: str) -> float:
        if result.verdict in (VerdictEnum.FALSE, VerdictEnum.MISLEADING):
            base = result.confidence
        elif result.verdict == VerdictEnum.PARTLY_TRUE:
            base = min(74.0, result.confidence + 8.0)
        elif result.verdict in (VerdictEnum.UNVERIFIED, VerdictEnum.INSUFFICIENT_EVIDENCE):
            base = 42.0
        else:
            base = max(5.0, 100.0 - result.confidence)

        lowered = text_content.lower()
        term_boost = min(12.0, sum(2.0 for term in VIRAL_RISK_TERMS if term in lowered))
        contradiction_boost = min(10.0, len(result.contradictory_evidence) * 3.0)
        return round(min(100.0, base + term_boost + contradiction_boost), 1)

    def _source_credibility(self, source_name: str) -> tuple[str, float]:
        lowered = (source_name or "").lower()
        if any(source in lowered for source in HIGH_CREDIBILITY_SOURCES):
            return "Verified publisher / institution", 92.0
        if any(source in lowered for source in MEDIUM_CREDIBILITY_SOURCES):
            return "Established publisher", 78.0
        if any(token in lowered for token in ["wire", "news", "times", "post", "daily", "express"]):
            return "Known media source", 68.0
        return "Unrated source", 48.0

    def _risk_signals(self, result: FactCheckResponse, text_content: str, source_label: str, source_score: float) -> list[str]:
        signals = []
        if result.verdict in (VerdictEnum.FALSE, VerdictEnum.MISLEADING):
            signals.append("Contradicted by indexed evidence")
        if result.verdict in (VerdictEnum.UNVERIFIED, VerdictEnum.INSUFFICIENT_EVIDENCE):
            signals.append("Insufficient corroborating evidence")
        if result.contradictory_evidence:
            signals.append(f"{len(result.contradictory_evidence)} contradictory source match")
        lowered = text_content.lower()
        matched_terms = [term for term in VIRAL_RISK_TERMS if term in lowered][:4]
        if matched_terms:
            signals.append(f"Viral language: {', '.join(matched_terms)}")
        if source_score < 60:
            signals.append(source_label)
        if not signals:
            signals.append("No major misinformation signal detected")
        return signals

    def _evidence_summary(self, result: FactCheckResponse) -> str:
        support = len(result.supporting_evidence)
        contradict = len(result.contradictory_evidence)
        return (
            f"{support} supporting evidence item(s), {contradict} contradictory item(s), "
            f"evidence strength {result.evidence_strength.lower()}."
        )

    def _claim_group(self, title: str) -> str:
        words = [
            word.lower()
            for word in re.findall(r"[A-Za-z0-9]+", title or "")
            if len(word) > 3 and word.lower() not in {"with", "from", "that", "this", "will", "live", "news"}
        ]
        return " ".join(words[:4]) or "general"

    def _claim_clusters(self, detections: list[LiveDetectionItem]) -> list[dict]:
        grouped: dict[str, list[LiveDetectionItem]] = {}
        for item in detections:
            grouped.setdefault(item.matched_claim_group, []).append(item)
        clusters = []
        for group, items in grouped.items():
            clusters.append({
                "id": group,
                "label": group.title(),
                "count": len(items),
                "highest_risk": max(item.risk_score for item in items),
                "sources": sorted({item.source_name for item in items})[:5],
                "risk_level": max(items, key=lambda item: item.risk_score).risk_level,
            })
        clusters.sort(key=lambda item: (item["count"], item["highest_risk"]), reverse=True)
        return clusters[:8]

    def _detection_reason(self, result: FactCheckResponse, risk_level: str) -> str:
        if result.verdict in RISKY_VERDICTS:
            return (
                f"{risk_level} risk because live verification returned {result.verdict} "
                f"with {result.confidence:.1f}% confidence and {result.evidence_strength.lower()} evidence."
            )
        return (
            f"{risk_level} risk because the headline is currently corroborated as {result.verdict} "
            f"with {result.confidence:.1f}% confidence."
        )

    async def _run_pipeline(
        self,
        submission_type: str,
        submitted_input: str,
        text_content: str,
        language: str,
        start_time: float,
        image_analysis: Optional[ImageAnalysisMetadata] = None,
        persist: bool = True
    ) -> FactCheckResponse:
        # Step 1: Claim extraction & categorization
        claim_info = await self.ai_provider.extract_claims_and_entities(text_content, language=language)
        primary_claim = claim_info["primary_claim"]
        entities = claim_info["entities"]
        category = claim_info["category"]
        location = claim_info["location"]

        # Step 2 & 3: Concurrently search internal FactDB and external trusted sources
        db_task = self.fact_db.search_fact_database(primary_claim)
        web_task = self.search_provider.search_trusted_sources(primary_claim, limit=6)
        gathered = await asyncio.gather(db_task, web_task, return_exceptions=True)

        # Step 4: Combine & Deduplicate evidence items
        all_evidence: List[EvidenceItem] = []
        seen_urls = set()
        for ev_batch in gathered:
            if isinstance(ev_batch, list):
                for ev in ev_batch:
                    if ev.source_url not in seen_urls:
                        seen_urls.add(ev.source_url)
                        all_evidence.append(ev)

        # Step 5: Run AI reasoning & verdict determination
        ai_result = await self.ai_provider.verify_claim_with_evidence(
            claim=primary_claim,
            evidence_items=all_evidence,
            language=language
        )

        # Handle Image Forensics Influence if applicable
        verdict = ai_result["verdict"]
        confidence = ai_result["confidence"]
        evidence_strength = ai_result["evidence_strength"]
        verification_status = ai_result["verification_status"]
        ai_explanation = ai_result["ai_explanation"]

        # SAFETY NET: Override verdicts when evidence doesn't actually support them
        # This prevents the system from saying TRUE when no evidence actually SUPPORTS the claim.
        has_real_support = any(e.stance == "SUPPORTS" for e in all_evidence)
        has_real_contradict = any(e.stance == "CONTRADICTS" for e in all_evidence)

        if verdict in (VerdictEnum.TRUE, VerdictEnum.MOSTLY_TRUE) and not has_real_support:
            # AI or heuristic said TRUE, but no evidence actually supports the claim
            # Context/neutral evidence does NOT confirm a claim
            verdict = VerdictEnum.UNVERIFIED
            confidence = min(confidence, 42.0)
            evidence_strength = "WEAK"
            verification_status = "UNVERIFIED"
            ai_explanation = (
                f"While contextually related information was found, no authoritative source "
                f"directly confirms or validates the specific claim: \"{primary_claim[:80]}...\". "
                f"Related information does not constitute evidence of truth. "
                f"This claim remains UNVERIFIED pending primary source confirmation."
            )

        if image_analysis:
            if image_analysis.manipulation_risk == "HIGH" or image_analysis.ai_generated_probability > 75.0:
                verdict = VerdictEnum.MISLEADING
                confidence = max(confidence, 88.0)
                ai_explanation += f" Forensic imaging analysis detected high manipulation risk ({image_analysis.ai_generated_probability:.0f}% AI synthesis probability / ELA score {image_analysis.ela_anomaly_score})."
            elif image_analysis.exif_found:
                ai_explanation += " Digital camera provenance metadata verified without synthetic tampering indicators."

        # Step 6: Create response object
        check_id = f"fc-{uuid.uuid4().hex[:10]}"
        elapsed_ms = int((time.time() - start_time) * 1000)

        response = FactCheckResponse(
            id=check_id,
            submission_type=submission_type,
            submitted_input=submitted_input,
            primary_claim=primary_claim,
            extracted_claims=[
                ExtractedClaim(
                    claim_text=primary_claim,
                    topic=category,
                    entities=entities,
                    verdict=verdict,
                    confidence=confidence
                )
            ],
            verdict=verdict,
            confidence=confidence,
            evidence_strength=evidence_strength,
            verification_status=verification_status,
            entities=entities,
            category=category,
            location=location,
            language=language,
            ai_explanation=ai_explanation,
            supporting_evidence=ai_result["supporting_evidence"],
            contradictory_evidence=ai_result["contradictory_evidence"],
            contextual_notes=ai_result["contextual_notes"],
            processing_time_ms=elapsed_ms,
            verification_providers=["TruthLens FactDB", "Wikipedia & Open Knowledge Matrix", "Wire Source Graph"],
            created_at=datetime.now(timezone.utc).isoformat(),
            image_analysis=image_analysis
        )

        # Step 7: Persist fact-check record
        if persist:
            await self.fact_db.save_fact_check(response.model_dump())

        return response

    async def get_check_by_id(self, check_id: str) -> Optional[dict]:
        return await self.fact_db.get_fact_check(check_id)
