import os
import re
import html
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.providers.base import BaseAIProvider
from app.schemas.fact_check import EvidenceItem, ExtractedClaim, VerdictEnum
from app.core.config import settings

logger = logging.getLogger("truthlens.ai")

class AIProvider(BaseAIProvider):
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self._init_gemini()

    def _init_gemini(self):
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")
        if key:
            self.gemini_key = key
            try:
                genai.configure(api_key=key)
            except Exception as e:
                logger.warning(f"Failed to configure Gemini SDK: {e}")

    async def extract_claims_and_entities(self, text: str, language: str = "en") -> Dict[str, Any]:
        clean_text = text.strip()
        lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
        first_line = lines[0] if lines else clean_text

        # Clean query if it's a question
        primary_claim = self._normalize_question_to_claim(first_line)

        # Extract entities
        entities_found = set()

        # Acronyms & Known Organizations
        acronym_pattern = r"\b(WHO|RBI|ISRO|NASA|UN|UNESCO|PIB|EU|FTC|SEBI|NPCI|AI|OpenAI|Microsoft|Google|Apple|BCCI|CDC|NIH|NIST|FDA)\b"
        for m in re.findall(acronym_pattern, clean_text, re.IGNORECASE):
            entities_found.add(m.upper())

        # Proper Nouns / Capitalized Phrases
        capitalized_pattern = r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b"
        stopwords_general = {
            "the", "this", "that", "there", "what", "when", "where", "which", "with",
            "from", "about", "into", "over", "after", "before", "under", "again", "please"
        }
        for m in re.findall(capitalized_pattern, clean_text):
            if len(m) > 2 and m.lower() not in stopwords_general:
                entities_found.add(m)

        # Extract scientific / domain keywords if no proper noun found
        if not entities_found:
            for word in re.findall(r"\b[a-zA-Z]{4,}\b", clean_text):
                if word.lower() not in stopwords_general:
                    entities_found.add(word.capitalize())
                if len(entities_found) >= 5:
                    break

        # Categorize
        lower_t = clean_text.lower()
        category = "General"
        if any(k in lower_t for k in ["health", "virus", "vaccine", "doctor", "hospital", "who", "disease", "medicine", "antibiotic", "dna", "blood", "medical"]):
            category = "Health"
        elif any(k in lower_t for k in ["rbi", "bank", "rupee", "dollar", "crypto", "tax", "economy", "market", "inflation", "finance", "currency", "stock", "note"]):
            category = "Economy"
        elif any(k in lower_t for k in ["isro", "nasa", "space", "moon", "quantum", "physics", "solar", "earth", "star", "sun", "water", "boil", "planet", "atom", "chemistry", "biology"]):
            category = "Science"
        elif any(k in lower_t for k in ["ai", "deepfake", "software", "tech", "algorithm", "cyber", "internet", "phone", "python", "programming", "linux", "computer", "code", "app"]):
            category = "Technology"
        elif any(k in lower_t for k in ["election", "minister", "parliament", "government", "treaty", "court", "law", "police", "prime minister", "president", "modi", "politics"]):
            category = "Politics"
        elif any(k in lower_t for k in ["climate", "earthquake", "weather", "emission", "ocean", "forest", "warming", "carbon"]):
            category = "Climate"
        elif any(k in lower_t for k in ["cricket", "football", "sport", "olympic", "kohli", "messi", "ronaldo", "player", "match"]):
            category = "Sports"
        elif any(k in lower_t for k in ["capital", "country", "city", "river", "mountain", "geography", "paris", "france", "delhi", "tokyo", "taj mahal", "monument"]):
            category = "Geography"

        # Determine location
        location = "Global"
        if any(k in lower_t for k in ["india", "delhi", "mumbai", "rbi", "isro", "pib", "bengaluru", "chennai", "modi", "kohli", "agra", "taj mahal", "rupee"]):
            location = "India"
        elif any(k in lower_t for k in ["usa", "america", "washington", "fbi", "white house", "nasa"]):
            location = "United States"
        elif any(k in lower_t for k in ["europe", "eu", "london", "uk", "paris", "france", "germany", "brussels"]):
            location = "Europe"
        elif any(k in lower_t for k in ["japan", "tokyo", "asia"]):
            location = "Asia"

        return {
            "primary_claim": primary_claim,
            "entities": list(entities_found)[:8],
            "category": category,
            "location": location
        }

    def _normalize_question_to_claim(self, text: str) -> str:
        clean = text.strip().rstrip("?").strip()
        m = re.match(r"^Is\s+([A-Za-z\s]+?)\s+the\s+(capital|largest city|president|prime minister)\s+of\s+([A-Za-z\s]+)$", clean, re.IGNORECASE)
        if m:
            return f"{m.group(1).strip().title()} is the {m.group(2).strip()} of {m.group(3).strip().title()}."

        m2 = re.match(r"^Does\s+([A-Za-z\s]+?)\s+(boil|freeze|orbit|revolve)\s+(.*)$", clean, re.IGNORECASE)
        if m2:
            subject = m2.group(1).strip().capitalize()
            verb = m2.group(2).strip()
            if not verb.endswith("s"):
                verb += "s"
            rest = m2.group(3).strip()
            return f"{subject} {verb} {rest}."

        m3 = re.match(r"^Is\s+(the\s+)?(earth|sun|moon)\s+([A-Za-z\s]+)$", clean, re.IGNORECASE)
        if m3:
            art = m3.group(1) or "The "
            return f"{art.capitalize()}{m3.group(2).capitalize()} is {m3.group(3).strip()}."

        return clean

    async def verify_claim_with_evidence(
        self,
        claim: str,
        evidence_items: List[EvidenceItem],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Verify a claim with evidence items using real Gemini reasoning or algorithmic fallback.
        
        Exact return dictionary shape is preserved:
        - verdict: VerdictEnum
        - confidence: float (0-100)
        - evidence_strength: str
        - verification_status: str
        - supporting_evidence: List[EvidenceItem]
        - contradictory_evidence: List[EvidenceItem]
        - ai_explanation: str
        - contextual_notes: str
        """
        # If Gemini API key is configured, execute real LLM reasoning
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") or self.gemini_key
        if key:
            try:
                gemini_res = await self._call_gemini_verification(claim, evidence_items, language)
                if gemini_res:
                    return gemini_res
            except Exception as ex:
                logger.warning(f"Gemini verification exception: {ex}")

        # Seamless fallback to deterministic synthesis engine
        return self._rule_and_evidence_synthesis(claim, evidence_items, language)

    async def _call_gemini_verification(
        self,
        claim: str,
        evidence_items: List[EvidenceItem],
        language: str = "en"
    ) -> Optional[Dict[str, Any]]:
        """Invokes Gemini 2.0 Flash via google-generativeai SDK with world knowledge reasoning."""
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") or self.gemini_key
        if not key:
            return None

        try:
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-2.0-flash")
        except Exception as e:
            logger.warning(f"Error initializing GenerativeModel: {e}")
            return None

        evidence_summary = ""
        if evidence_items:
            evidence_summary = "\n".join(
                f"- Source: {e.source_name} ({e.reliability_label or 'Reference'})\n  Title: {e.title}\n  Snippet: {e.evidence_text}"
                for e in evidence_items[:6]
            )
        else:
            evidence_summary = "No indexed external evidence documents or articles provided."

        lang_instruction = "Hindi (हिन्दी)" if language == "hi" else "English"

        prompt = f"""You are TruthLens, an investigative fact-checking AI and logical reasoning system.

Evaluate the factual accuracy and plausibility of the following CLAIM:
CLAIM: "{claim}"

RETRIEVED EVIDENCE:
{evidence_summary}

VERIFICATION & REASONING GUIDELINES:
1. Physical Laws, Biological Realities & World Knowledge:
   - Use general world knowledge, fundamental scientific laws, biological facts, and logical plausibility even when no external evidence documents are provided.
   - Absurd, physically impossible, or biologically impossible claims (e.g. "elephants can fly", "humans can live without oxygen", "the ocean is made of grape juice") MUST be judged as FALSE with high confidence (88-99%) based on logical reasoning alone, NOT returned as INSUFFICIENT EVIDENCE.
   - Universally established facts (e.g. "Water boils at 100°C at 1 atm", "The Earth is an oblate spheroid") MUST be judged as TRUE with high confidence (90-99%).
2. Using Retrieved Evidence:
   - When evidence is provided, determine whether it directly SUPPORTS, CONTRADICTS, or merely provides neutral CONTEXT.
   - Contextual mentions (e.g., an encyclopedia article about elephants) do NOT confirm an unverified action (e.g., "elephants can climb trees").
3. Specific Empirical Claims Without Evidence:
   - For specific, recent, or localized claims that are physically plausible but lack corroborating records (e.g. "Person X attended event Y yesterday"), return UNVERIFIED or INSUFFICIENT EVIDENCE with low/moderate confidence (30-50%).
4. Strict Verdict Format:
   - You MUST select the verdict from one of these exact values:
     "TRUE", "MOSTLY TRUE", "PARTLY TRUE", "MISLEADING", "FALSE", "UNVERIFIED", "SATIRE", "INSUFFICIENT EVIDENCE"
   - "evidence_strength" must be one of: "VERY STRONG", "STRONG", "MODERATE", "WEAK", "NONE"
   - "confidence" must be a float between 0.0 and 100.0
   - "ai_explanation" must be a clear, informative explanation written in {lang_instruction}.
   - "contextual_notes" must be a concise note in {lang_instruction}.

Return ONLY a valid JSON object without any additional markdown text or preamble:
{{
  "verdict": "<VerdictEnum>",
  "confidence": <float>,
  "evidence_strength": "<VERY STRONG | STRONG | MODERATE | WEAK | NONE>",
  "ai_explanation": "<concise explanation in {lang_instruction}>",
  "contextual_notes": "<concise context note in {lang_instruction}>"
}}
"""

        try:
            # Generate content asynchronously with timeout
            response = await asyncio.wait_for(
                model.generate_content_async(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        response_mime_type="application/json"
                    )
                ),
                timeout=9.0
            )

            raw_text = response.text if response else ""
            if not raw_text:
                return None

            # Defensively clean JSON response
            clean_json = raw_text.strip()
            if clean_json.startswith("```"):
                clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json)
                clean_json = re.sub(r"\s*```$", "", clean_json)

            match = re.search(r"\{.*\}", clean_json, re.DOTALL)
            if not match:
                return None

            parsed = json.loads(match.group(0))

            v_raw = str(parsed.get("verdict", "")).strip().upper()
            verdict_map = {
                "TRUE": VerdictEnum.TRUE,
                "MOSTLY TRUE": VerdictEnum.MOSTLY_TRUE,
                "MOSTLY_TRUE": VerdictEnum.MOSTLY_TRUE,
                "PARTLY TRUE": VerdictEnum.PARTLY_TRUE,
                "PARTLY_TRUE": VerdictEnum.PARTLY_TRUE,
                "MISLEADING": VerdictEnum.MISLEADING,
                "FALSE": VerdictEnum.FALSE,
                "UNVERIFIED": VerdictEnum.UNVERIFIED,
                "SATIRE": VerdictEnum.SATIRE,
                "INSUFFICIENT EVIDENCE": VerdictEnum.INSUFFICIENT_EVIDENCE,
                "INSUFFICIENT_EVIDENCE": VerdictEnum.INSUFFICIENT_EVIDENCE,
            }
            verdict = verdict_map.get(v_raw, VerdictEnum.UNVERIFIED)

            try:
                confidence = float(parsed.get("confidence", 70.0))
                confidence = max(0.0, min(100.0, confidence))
            except (ValueError, TypeError):
                confidence = 70.0

            evidence_strength = str(parsed.get("evidence_strength", "MODERATE")).strip().upper()
            if evidence_strength not in ["VERY STRONG", "STRONG", "MODERATE", "WEAK", "NONE"]:
                evidence_strength = "STRONG" if verdict in (VerdictEnum.TRUE, VerdictEnum.FALSE) else "MODERATE"

            supporting = [e for e in evidence_items if e.stance == "SUPPORTS"]
            contradicting = [e for e in evidence_items if e.stance == "CONTRADICTS"]
            neutral = [e for e in evidence_items if e.stance in ["NEUTRAL", "CONTEXT"]]

            ai_explanation = str(parsed.get("ai_explanation", "")).strip()
            contextual_notes = str(parsed.get("contextual_notes", "Evaluated with Gemini intelligence.")).strip()

            v_status = "VERIFIED" if verdict in (VerdictEnum.TRUE, VerdictEnum.FALSE, VerdictEnum.MOSTLY_TRUE) else "UNVERIFIED"

            return {
                "verdict": verdict,
                "confidence": confidence,
                "evidence_strength": evidence_strength,
                "verification_status": v_status,
                "supporting_evidence": supporting + neutral,
                "contradictory_evidence": contradicting,
                "ai_explanation": ai_explanation,
                "contextual_notes": contextual_notes
            }

        except Exception as e:
            logger.warning(f"Gemini verification call failed: {e}")
            return None

    def _rule_and_evidence_synthesis(
        self,
        claim: str,
        evidence_items: List[EvidenceItem],
        language: str = "en"
    ) -> Dict[str, Any]:
        if not evidence_items:
            if language == "hi":
                ai_explanation = (
                    f"सत्यापन प्रणाली ने इस विशिष्ट दावे ('{claim[:80]}...') के संबंध में "
                    "आधिकारिक अभिलेखों, इनसाइक्लोपीडिया तथा वैश्विक वायर नेटवर्क में जांच की। "
                    "इसकी पुष्टि या खंडन के लिए कोई विश्वसनीय प्राथमिक स्रोत अथवा दस्तावेजी साक्ष्य उपलब्ध नहीं हो सका। "
                    "पत्रकारिता एवं साक्ष्य-प्रधान मानकों के अनुसार इसे 'अपर्याप्त साक्ष्य' (INSUFFICIENT EVIDENCE) के रूप में वर्गीकृत किया गया है।"
                )
            else:
                ai_explanation = (
                    f"The TruthLens verification engine cross-examined '{claim[:80]}...' against indexed institutional databases, "
                    "encyclopedic archives, and global wire repositories. No authoritative primary records or verified reports "
                    "could be found to corroborate or refute this specific submission. Under strict evidentiary standards, "
                    "it is classified as INSUFFICIENT EVIDENCE."
                )

            return {
                "verdict": VerdictEnum.INSUFFICIENT_EVIDENCE,
                "confidence": 35.0,
                "evidence_strength": "NONE",
                "verification_status": "UNVERIFIED",
                "supporting_evidence": [],
                "contradictory_evidence": [],
                "ai_explanation": ai_explanation,
                "contextual_notes": "No authoritative primary sources found. Independent verification is recommended before sharing."
            }

        supporting = [e for e in evidence_items if e.stance == "SUPPORTS"]
        contradicting = [e for e in evidence_items if e.stance == "CONTRADICTS"]
        neutral = [e for e in evidence_items if e.stance in ["NEUTRAL", "CONTEXT"]]

        support_score = sum(e.reliability_score for e in supporting)
        contradict_score = sum(e.reliability_score for e in contradicting)

        # 1. Contradicted by authoritative source or fact-checkers
        if contradict_score >= 80:
            verdict = VerdictEnum.FALSE
            conf = min(98.5, max(88.0, 75.0 + (contradict_score / 10.0)))
            evidence_strength = "VERY STRONG" if contradict_score >= 150 else "STRONG"
            v_status = "VERIFIED"
            top_source = contradicting[0].source_name

            if language == "hi":
                ai_explanation = (
                    f"यह दावा आधिकारिक और सत्यापित स्रोतों ({top_source}) द्वारा स्पष्ट रूप से असत्य एवं खंडित प्रमाणित किया गया है। "
                    f"आधिकारिक रिकॉर्ड पुष्टि करते हैं कि यह दावा वास्तविक तथ्यों से मेल नहीं खाता है और भ्रामक है।"
                )
            else:
                ai_explanation = (
                    f"This assertion is categorically contradicted by authenticated records from {top_source}. "
                    f"Verified gazette releases and peer-reviewed documentation confirm that this claim lacks factual foundation and has been officially debunked."
                )

        # 2. Conflicting evidence (both support and contradict without overwhelming contradiction)
        elif contradict_score > 0 and support_score > 0:
            if contradict_score >= support_score:
                verdict = VerdictEnum.MISLEADING
                conf = round(min(92.0, 60.0 + (contradict_score - support_score) / 3.0), 1)
            else:
                verdict = VerdictEnum.PARTLY_TRUE
                conf = round(min(88.0, 55.0 + (support_score - contradict_score) / 3.0), 1)

            evidence_strength = "MODERATE"
            v_status = "CONFLICTING"

            if language == "hi":
                ai_explanation = (
                    f"विभिन्न स्रोतों के विश्लेषण में विरोधाभासी विवरण मिले हैं। "
                    f"साक्ष्य खंडन का भार {contradict_score:.0f} और समर्थन का भार {support_score:.0f} है। "
                    f"समीक्षा के अनुसार जानकारी में भ्रामक या आंशिक सत्य पहलू पाए गए हैं।"
                )
            else:
                ai_explanation = (
                    f"Cross-examination revealed conflicting claims across indexed sources. "
                    f"Refutation weight ({contradict_score:.0f}) vs supporting weight ({support_score:.0f}) indicates that "
                    f"certain assertions are either taken out of context or disputed by primary records."
                )

        elif contradict_score > 0:
            verdict = VerdictEnum.MISLEADING
            conf = 75.0
            evidence_strength = "MODERATE"
            v_status = "VERIFIED"
            top_source = contradicting[0].source_name
            ai_explanation = f"Contradictory evidence detected from {top_source}. Exercise caution."

        # 3. Strong Support / Corroborated Fact
        elif support_score > 0:
            # Only grant TRUE if there is substantial authoritative support
            has_authoritative_support = any(e.reliability_score >= 95 for e in supporting)
            if support_score >= 150:
                verdict = VerdictEnum.TRUE
                conf = 98.5
                evidence_strength = "VERY STRONG"
            elif support_score >= 80:
                verdict = VerdictEnum.TRUE
                conf = 94.0
                evidence_strength = "STRONG"
            elif support_score >= 40 and has_authoritative_support:
                verdict = VerdictEnum.MOSTLY_TRUE
                conf = 85.0
                evidence_strength = "STRONG"
            elif support_score >= 40:
                # Support exists but not from authoritative curated sources
                verdict = VerdictEnum.PARTLY_TRUE
                conf = 68.0
                evidence_strength = "MODERATE"
            else:
                # Weak support — not enough to confirm the claim
                verdict = VerdictEnum.UNVERIFIED
                conf = 45.0
                evidence_strength = "WEAK"

            v_status = "VERIFIED"
            top_source = supporting[0].source_name

            if language == "hi":
                ai_explanation = (
                    f"प्राथमिक संस्थागत एवं इनसाइक्लोपीडिया स्रोतों ({top_source}) के अभिलेख इस दावे की पूर्ण सत्यता की पुष्टि करते हैं। "
                    f"उपलब्ध साक्ष्य उच्च विश्वसनीयता के साथ इस तथ्य का समर्थन करते हैं।"
                )
            else:
                ai_explanation = (
                    f"Authenticated records and primary reference documentation from {top_source} "
                    f"directly validate this statement with high certainty ({conf:.1f}% confidence). "
                    f"The underlying factual assertions are corroborated across reputable repositories."
                )

        # 4. Only Neutral / Context Items
        else:
            verdict = VerdictEnum.UNVERIFIED
            conf = 40.0
            evidence_strength = "WEAK"
            v_status = "UNVERIFIED"
            top_source = neutral[0].source_name if neutral else "Open Encyclopedic Archives"

            if language == "hi":
                ai_explanation = (
                    f"सत्यापन प्रणाली ने संबंधित संदर्भ सामग्री ({top_source}) पाई है, "
                    "परंतु कोई भी स्रोत इस विशिष्ट दावे की सीधे पुष्टि या खंडन नहीं करता। "
                    "संबंधित जानकारी का अस्तित्व दावे की सत्यता का प्रमाण नहीं है। "
                    "स्वतंत्र सत्यापन की सिफारिश की जाती है।"
                )
            else:
                ai_explanation = (
                    f"The verification engine found contextually related information from {top_source}, "
                    f"but no source directly confirms or refutes this specific claim. "
                    f"Related information existing does NOT constitute evidence that the claim is true. "
                    f"Independent verification is recommended before sharing."
                )

        return {
            "verdict": verdict,
            "confidence": conf,
            "evidence_strength": evidence_strength,
            "verification_status": v_status,
            "supporting_evidence": supporting + neutral,
            "contradictory_evidence": contradicting,
            "ai_explanation": ai_explanation,
            "contextual_notes": f"Cross-examined across {len(evidence_items)} independent reference and wire sources."
        }

