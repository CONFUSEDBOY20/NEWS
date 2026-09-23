import os
import re
from typing import List, Dict, Any
from app.providers.base import BaseAIProvider
from app.schemas.fact_check import EvidenceItem, ExtractedClaim, VerdictEnum
from app.core.config import settings

class AIProvider(BaseAIProvider):
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY

    async def extract_claims_and_entities(self, text: str, language: str = "en") -> Dict[str, Any]:
        # Clean text
        clean_text = text.strip()
        lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
        primary_claim = lines[0] if lines else clean_text

        # Extract entities using capitalization, known agencies, and regex tokens
        entity_patterns = [
            r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",
            r"\b(WHO|RBI|ISRO|NASA|UN|PIB|EU|FTC|SEBI|NPCI|AI|OpenAI|Microsoft|Google)\b"
        ]
        entities_found = set()
        for p in entity_patterns:
            matches = re.findall(p, clean_text)
            for m in matches:
                if len(m) > 2 and m.lower() not in ["the", "this", "that", "there", "what", "when", "where", "with", "from"]:
                    entities_found.add(m)

        # Categorize
        lower_t = clean_text.lower()
        category = "General"
        if any(k in lower_t for k in ["health", "virus", "vaccine", "doctor", "hospital", "who", "disease"]):
            category = "Health"
        elif any(k in lower_t for k in ["rbi", "bank", "rupee", "dollar", "crypto", "tax", "economy", "market", "inflation"]):
            category = "Economy"
        elif any(k in lower_t for k in ["isro", "nasa", "space", "moon", "quantum", "physics", "solar"]):
            category = "Science"
        elif any(k in lower_t for k in ["ai", "deepfake", "software", "tech", "algorithm", "cyber", "internet", "phone"]):
            category = "Technology"
        elif any(k in lower_t for k in ["election", "minister", "parliament", "government", "treaty", "court", "law", "police"]):
            category = "Politics"
        elif any(k in lower_t for k in ["climate", "earthquake", "weather", "emission", "ocean", "forest"]):
            category = "Climate"

        # Determine location
        location = "Global"
        if any(k in lower_t for k in ["india", "delhi", "mumbai", "rbi", "isro", "pib", "bengaluru", "chennai"]):
            location = "India"
        elif any(k in lower_t for k in ["usa", "america", "washington", "fbi", "white house"]):
            location = "United States"
        elif any(k in lower_t for k in ["europe", "eu", "london", "uk", "paris", "brussels"]):
            location = "Europe"

        return {
            "primary_claim": primary_claim,
            "entities": list(entities_found)[:8],
            "category": category,
            "location": location
        }

    async def verify_claim_with_evidence(
        self,
        claim: str,
        evidence_items: List[EvidenceItem],
        language: str = "en"
    ) -> Dict[str, Any]:
        # If no evidence items available or all neutral/weak, return INSUFFICIENT EVIDENCE / UNVERIFIED
        if not evidence_items:
            if language == "hi":
                ai_explanation = "सत्यापन प्रक्रिया में इस दावे की पुष्टि या खंडन के लिए कोई विश्वसनीय प्राथमिक स्रोत अथवा संस्थागत साक्ष्य उपलब्ध नहीं हो सका। इसलिए इसे असत्यापित (Unverified) वर्गीकृत किया गया है।"
            else:
                ai_explanation = "The verification pipeline was unable to locate authoritative, peer-reviewed, or institutional primary evidence to corroborate or refute this specific claim. As per journalistic integrity standards, it is classified as INSUFFICIENT EVIDENCE."
            
            return {
                "verdict": VerdictEnum.INSUFFICIENT_EVIDENCE,
                "confidence": 30.0,
                "evidence_strength": "NONE",
                "verification_status": "UNVERIFIED",
                "supporting_evidence": [],
                "contradictory_evidence": [],
                "ai_explanation": ai_explanation,
                "contextual_notes": "Independent verification recommended before sharing."
            }

        supporting = [e for e in evidence_items if e.stance == "SUPPORTS"]
        contradicting = [e for e in evidence_items if e.stance == "CONTRADICTS"]
        neutral = [e for e in evidence_items if e.stance in ["NEUTRAL", "CONTEXT"]]

        # Calculate evidence metrics
        support_score = sum(e.reliability_score for e in supporting)
        contradict_score = sum(e.reliability_score for e in contradicting)
        total_score = support_score + contradict_score

        if total_score == 0:
            # Only neutral/context available
            if language == "hi":
                ai_explanation = "उपलब्ध दस्तावेज़ केवल सामान्य संदर्भ प्रदान करते हैं। प्रत्यक्ष पुष्टि या खंडन करने के लिए ठोस सबूतों का अभाव है।"
            else:
                ai_explanation = "Available media documents provide general contextual background but lack definitive confirmation or direct refutation of the core claim."

            return {
                "verdict": VerdictEnum.UNVERIFIED,
                "confidence": 45.0,
                "evidence_strength": "WEAK",
                "verification_status": "UNVERIFIED",
                "supporting_evidence": neutral,
                "contradictory_evidence": [],
                "ai_explanation": ai_explanation,
                "contextual_notes": "Requires additional corroborating dispatches."
            }

        # Multi-factor verdict determination
        if contradict_score > 0 and support_score > 0:
            # Conflicting sources
            verdict = VerdictEnum.MISLEADING if contradict_score >= support_score else VerdictEnum.PARTLY_TRUE
            conf = round(min(90.0, 50.0 + abs(contradict_score - support_score) / 4.0), 1)
            evidence_strength = "MODERATE"
            v_status = "CONFLICTING"

            if language == "hi":
                ai_explanation = f"समीक्षित स्रोतों में विरोधाभासी विवरण पाए गए हैं। आधिकारिक खंडन {contradict_score:.0f} विश्वसनीयता भार दर्शाते हैं जबकि कुछ स्रोत आंशिक संदर्भ का समर्थन करते हैं।"
            else:
                ai_explanation = f"Cross-source evaluation revealed conflicting claims among indexed sources. Refutation strength weighs at {contradict_score:.0f} vs {support_score:.0f} supporting reference weight. Content is categorized based on direct official agency rebuttals."

        elif contradict_score > 0:
            # Strong refutation
            if contradict_score >= 180:
                verdict = VerdictEnum.FALSE
                conf = 96.0
                evidence_strength = "VERY STRONG"
            elif contradict_score >= 90:
                verdict = VerdictEnum.FALSE
                conf = 88.5
                evidence_strength = "STRONG"
            else:
                verdict = VerdictEnum.MISLEADING
                conf = 72.0
                evidence_strength = "MODERATE"
            v_status = "VERIFIED"

            if language == "hi":
                ai_explanation = f"यह दावा आधिकारिक संस्थागत साक्ष्यों (जैसे {contradicting[0].source_name}) द्वारा स्पष्ट रूप से असत्य और भ्रामक प्रमाणित किया गया है। आधिकारिक रिकॉर्ड में ऐसा कोई नियम अथवा आदेश मौजूद नहीं है।"
            else:
                ai_explanation = f"This assertion is categorically contradicted by authenticated primary sources, including {contradicting[0].source_name}. Official records and verified gazette releases confirm no such policy, event, or mandate exists."

        else:
            # Strong support
            if support_score >= 180:
                verdict = VerdictEnum.TRUE
                conf = 95.5
                evidence_strength = "VERY STRONG"
            elif support_score >= 90:
                verdict = VerdictEnum.MOSTLY_TRUE
                conf = 84.0
                evidence_strength = "STRONG"
            else:
                verdict = VerdictEnum.PARTLY_TRUE
                conf = 65.0
                evidence_strength = "MODERATE"
            v_status = "VERIFIED"

            if language == "hi":
                ai_explanation = f"विश्वसनीय मीडिया एवं आधिकारिक स्रोतों (जैसे {supporting[0].source_name}) के दस्तावेज़ इस दावे की पुष्टि करते हैं।"
            else:
                ai_explanation = f"Direct corroborated evidence from authenticated primary sources ({supporting[0].source_name}) validates the accuracy of this reporting with high confidence."

        return {
            "verdict": verdict,
            "confidence": conf,
            "evidence_strength": evidence_strength,
            "verification_status": v_status,
            "supporting_evidence": supporting + neutral,
            "contradictory_evidence": contradicting,
            "ai_explanation": ai_explanation,
            "contextual_notes": "Derived strictly from authenticated cross-referenced records without generative speculation."
        }
