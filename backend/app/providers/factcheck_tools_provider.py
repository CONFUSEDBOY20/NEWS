"""
Google Fact Check Tools API Provider
Queries the Google Fact Check Tools API (https://factchecktools.googleapis.com/v1alpha1/claims:search)
and maps claimReview results from certified fact-checkers directly into EvidenceItem objects.
"""

import logging
from typing import List, Optional
import httpx

from app.core.config import settings
from app.schemas.fact_check import EvidenceItem

logger = logging.getLogger("truthlens.factcheck_tools")

# Standard rating mappings
CONTRADICT_RATINGS = {
    "false", "fake", "incorrect", "debunked", "misleading", "mostly false",
    "pants on fire", "untrue", "distorted", "hoax", "altered", "fabricated",
    "scam", "wrong", "inaccurate", "disproven", "manipulated"
}

SUPPORT_RATINGS = {
    "true", "correct", "accurate", "mostly true", "verified", "confirmed",
    "legitimate", "authentic", "fact"
}

class GoogleFactCheckToolsProvider:
    def __init__(self):
        self.api_key = settings.GOOGLE_FACTCHECK_API_KEY
        self.base_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

    async def search_claims(self, query: str, language: str = "en", limit: int = 5) -> List[EvidenceItem]:
        """
        Queries Google Fact Check Tools API for verified claim reviews.
        Returns a list of authoritative EvidenceItem objects.
        """
        if not self.api_key:
            return []

        clean_query = query.strip()
        if len(clean_query) < 3:
            return []

        params = {
            "query": clean_query,
            "key": self.api_key,
            "pageSize": limit,
        }
        if language:
            params["languageCode"] = language

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code != 200:
                    logger.warning(f"Google Fact Check API returned HTTP {response.status_code}")
                    return []

                data = response.json()
                claims = data.get("claims", [])
                evidence_items: List[EvidenceItem] = []

                for claim in claims:
                    claim_text = claim.get("text", "")
                    claimant = claim.get("claimant", "")
                    for review in claim.get("claimReview", []):
                        publisher_info = review.get("publisher", {})
                        pub_name = publisher_info.get("name", "Certified Fact Checker")
                        review_url = review.get("url", "")
                        rating = review.get("textualRating", "").strip()
                        review_title = review.get("title") or claim_text

                        # Determine stance from rating
                        rating_lower = rating.lower()
                        if any(term in rating_lower for term in CONTRADICT_RATINGS):
                            stance = "CONTRADICTS"
                        elif any(term in rating_lower for term in SUPPORT_RATINGS):
                            stance = "SUPPORTS"
                        else:
                            stance = "CONTEXT"

                        evidence_summary = (
                            f"Verified review by {pub_name}: Rated as '{rating}'. "
                            f"Original claim: \"{claim_text}\""
                        )
                        if claimant:
                            evidence_summary += f" (Claimed by {claimant})"

                        evidence_items.append(
                            EvidenceItem(
                                source_name=pub_name,
                                source_url=review_url or "https://toolbox.google.com/factcheck",
                                title=review_title,
                                evidence_text=evidence_summary,
                                stance=stance,
                                reliability_score=98.0,  # Certified IFCN / Fact Check publisher
                                reliability_label="Certified Fact Checker",
                                published_date=review.get("reviewDate")
                            )
                        )

                return evidence_items[:limit]

        except Exception as e:
            logger.warning(f"Error querying Google Fact Check Tools API: {e}")
            return []
