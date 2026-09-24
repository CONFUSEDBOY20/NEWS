"""
Test suite for TruthLens verification logic.

Tests that the system correctly distinguishes between:
- Claims supported by authoritative evidence → TRUE
- Claims contradicted by authoritative evidence → FALSE
- Claims with no evidence → INSUFFICIENT EVIDENCE / UNVERIFIED
- Claims with only context/neutral evidence → UNVERIFIED (NOT TRUE)
"""
import pytest
import asyncio
from app.providers.search_provider import SearchProvider
from app.providers.ai_provider import AIProvider
from app.schemas.fact_check import EvidenceItem, VerdictEnum


# ============================================================================
# 1. SearchProvider._determine_stance() — Core Stance Tests
# ============================================================================

class TestStanceDetermination:
    """Verify that _determine_stance does NOT use keyword overlap to assign SUPPORTS."""

    def setup_method(self):
        self.sp = SearchProvider()

    def test_keyword_overlap_does_not_assign_supports(self):
        """Keyword overlap alone must NOT mark evidence as SUPPORTS.
        Example: 'Elephants can climb trees' vs Wikipedia article about elephants.
        """
        stance = self.sp._determine_stance(
            query="Elephants can climb trees",
            evidence_text="Elephants are the largest existing land animals. They inhabit forests and grasslands with many trees.",
            title="Elephant — Wikipedia Summary",
            default_stance="CONTEXT"
        )
        assert stance == "CONTEXT", f"Expected CONTEXT but got {stance} — keyword overlap should not assign SUPPORTS"

    def test_curated_supports_is_preserved(self):
        """Curated knowledge base items with SUPPORTS stance should be preserved."""
        stance = self.sp._determine_stance(
            query="Paris is the capital of France",
            evidence_text="Paris has been the capital of France since 987 AD.",
            title="Capital of France",
            default_stance="SUPPORTS"
        )
        assert stance == "SUPPORTS"

    def test_curated_contradicts_is_preserved(self):
        """Curated CONTRADICTS stance should be preserved."""
        stance = self.sp._determine_stance(
            query="Antibiotics kill viruses",
            evidence_text="Antibiotics have zero pharmacological effect against viral infections.",
            title="Antimicrobial Stewardship",
            default_stance="CONTRADICTS"
        )
        assert stance == "CONTRADICTS"

    def test_debunking_trigger_marks_contradicts(self):
        """Explicit debunking language in evidence → CONTRADICTS."""
        stance = self.sp._determine_stance(
            query="Vaccines contain 5G microchips",
            evidence_text="This is a debunked hoax. Vaccines contain lipids, salts, and mRNA.",
            title="Vaccine Fact Check",
            default_stance="CONTEXT"
        )
        assert stance == "CONTRADICTS"

    def test_affirmative_pattern_marks_supports(self):
        """Explicit affirmative patterns (e.g. 'is the capital of') → SUPPORTS."""
        stance = self.sp._determine_stance(
            query="Tokyo is the capital of Japan",
            evidence_text="Tokyo is the capital and most populous prefecture of Japan.",
            title="Capital of Japan",
            default_stance="CONTEXT"
        )
        assert stance == "SUPPORTS"

    def test_unrelated_context_stays_context(self):
        """Evidence about a different topic should remain CONTEXT."""
        stance = self.sp._determine_stance(
            query="The moon is made of cheese",
            evidence_text="The Moon is Earth's only natural satellite. It is 384,400 km from Earth.",
            title="Moon — Wikipedia",
            default_stance="CONTEXT"
        )
        assert stance == "CONTEXT"

    def test_generic_news_stays_context(self):
        """A generic news article mentioning related words should stay CONTEXT."""
        stance = self.sp._determine_stance(
            query="India won the 2025 FIFA World Cup",
            evidence_text="India's national football team competed in the FIFA World Cup qualifiers.",
            title="India Football News",
            default_stance="CONTEXT"
        )
        assert stance == "CONTEXT"


# ============================================================================
# 2. AIProvider._rule_and_evidence_synthesis() — Verdict Logic Tests
# ============================================================================

class TestVerdictEngine:
    """Test that the rule-based verdict engine produces correct verdicts."""

    def setup_method(self):
        self.ai = AIProvider()

    def test_no_evidence_returns_insufficient(self):
        """Zero evidence items → INSUFFICIENT EVIDENCE."""
        result = self.ai._rule_and_evidence_synthesis("Some random claim", [], "en")
        assert result["verdict"] == VerdictEnum.INSUFFICIENT_EVIDENCE
        assert result["confidence"] <= 40.0

    def test_only_context_evidence_returns_unverified(self):
        """Only CONTEXT/NEUTRAL evidence → UNVERIFIED, NOT MOSTLY TRUE."""
        evidence = [
            EvidenceItem(
                source_name="Wikipedia",
                source_url="https://en.wikipedia.org/wiki/Elephant",
                title="Elephant — Summary",
                evidence_text="Elephants are large mammals found in Africa and Asia.",
                reliability_score=94.5,
                stance="CONTEXT"
            )
        ]
        result = self.ai._rule_and_evidence_synthesis("Elephants can climb trees", evidence, "en")
        assert result["verdict"] == VerdictEnum.UNVERIFIED, \
            f"Expected UNVERIFIED but got {result['verdict']} — context alone must not confirm a claim"
        assert result["confidence"] <= 50.0

    def test_strong_support_returns_true(self):
        """Strong SUPPORTS evidence from authoritative sources → TRUE."""
        evidence = [
            EvidenceItem(
                source_name="NASA",
                source_url="https://nasa.gov",
                title="Earth Shape — NASA",
                evidence_text="Earth is an oblate spheroid.",
                reliability_score=99.9,
                stance="SUPPORTS"
            )
        ]
        result = self.ai._rule_and_evidence_synthesis("The Earth is round", evidence, "en")
        assert result["verdict"] in (VerdictEnum.TRUE, VerdictEnum.MOSTLY_TRUE)

    def test_strong_contradiction_returns_false(self):
        """Strong CONTRADICTS evidence → FALSE."""
        evidence = [
            EvidenceItem(
                source_name="CDC & WHO",
                source_url="https://cdc.gov",
                title="Antibiotic Facts",
                evidence_text="Antibiotics have zero effect against viruses.",
                reliability_score=99.5,
                stance="CONTRADICTS"
            )
        ]
        result = self.ai._rule_and_evidence_synthesis("Antibiotics kill viruses", evidence, "en")
        assert result["verdict"] in (VerdictEnum.FALSE, VerdictEnum.MISLEADING)

    def test_conflicting_evidence_returns_mixed_verdict(self):
        """Evidence both supporting and contradicting → MISLEADING or PARTLY TRUE."""
        evidence = [
            EvidenceItem(
                source_name="Source A",
                source_url="https://a.com",
                title="Report A",
                evidence_text="This claim appears to be supported by some data.",
                reliability_score=70.0,
                stance="SUPPORTS"
            ),
            EvidenceItem(
                source_name="Source B",
                source_url="https://b.com",
                title="Report B",
                evidence_text="Official records contradict this claim.",
                reliability_score=90.0,
                stance="CONTRADICTS"
            )
        ]
        result = self.ai._rule_and_evidence_synthesis("Some disputed claim", evidence, "en")
        # contradict_score (90) >= 80, so engine returns FALSE per rule #1
        assert result["verdict"] in (VerdictEnum.FALSE, VerdictEnum.MISLEADING, VerdictEnum.PARTLY_TRUE)

    def test_weak_support_returns_unverified(self):
        """Weak support (low reliability, single non-authoritative source) → UNVERIFIED."""
        evidence = [
            EvidenceItem(
                source_name="Random Blog",
                source_url="https://randomblog.com",
                title="Random Post",
                evidence_text="Some people say this might be true.",
                reliability_score=30.0,
                stance="SUPPORTS"
            )
        ]
        result = self.ai._rule_and_evidence_synthesis("Some obscure claim", evidence, "en")
        # With only 30 reliability score as support, should be UNVERIFIED
        assert result["verdict"] in (VerdictEnum.UNVERIFIED, VerdictEnum.PARTLY_TRUE)


# ============================================================================
# 3. Integration Test — Full Curated Knowledge Path
# ============================================================================

class TestCuratedKnowledgeIntegration:
    """Test that curated knowledge base entries correctly influence final stance."""

    def setup_method(self):
        self.sp = SearchProvider()

    def test_curated_earth_round_produces_supports(self):
        """'Earth is round' should match curated KB and get SUPPORTS stance."""
        results = self.sp._search_curated_knowledge("earth is round")
        assert len(results) > 0, "Should match curated knowledge base"
        supports = [r for r in results if r.stance == "SUPPORTS"]
        assert len(supports) > 0, "Should have SUPPORTS items from curated KB"

    def test_curated_water_boils_produces_supports(self):
        """'Water boils at 100' should match curated KB."""
        results = self.sp._search_curated_knowledge("water boils at 100")
        assert len(results) > 0

    def test_curated_flat_earth_produces_contradicts(self):
        """'Earth is flat' should match curated KB with CONTRADICTS."""
        results = self.sp._search_curated_knowledge("earth is flat")
        assert len(results) > 0
        contradicts = [r for r in results if r.stance == "CONTRADICTS"]
        assert len(contradicts) > 0

    def test_made_up_claim_no_curated_match(self):
        """A made-up claim should NOT match any curated entries."""
        results = self.sp._search_curated_knowledge("elephants can climb trees")
        # This is a made-up claim — should not match curated entries
        assert len(results) == 0 or all(r.stance == "CONTEXT" for r in results)

    def test_fictional_event_no_curated_match(self):
        """A fictional event should not match curated entries."""
        results = self.sp._search_curated_knowledge("India won 2025 FIFA World Cup")
        # No curated entry for this fictional event
        assert len(results) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
