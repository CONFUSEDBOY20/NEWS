from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class VerdictEnum(str, Enum):
    TRUE = "TRUE"
    MOSTLY_TRUE = "MOSTLY TRUE"
    PARTLY_TRUE = "PARTLY TRUE"
    MISLEADING = "MISLEADING"
    FALSE = "FALSE"
    UNVERIFIED = "UNVERIFIED"
    SATIRE = "SATIRE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT EVIDENCE"

class EvidenceItem(BaseModel):
    id: str = Field(default_factory=lambda: "ev-" + str(datetime.now().timestamp()))
    source_name: str
    source_url: str
    title: str
    publication_date: Optional[str] = None
    evidence_text: str
    reliability_score: float = 85.0  # 0 to 100
    source_type: str = "news"  # news, fact_checker, official_record, academic
    stance: str = "SUPPORTS"  # SUPPORTS, CONTRADICTS, NEUTRAL, CONTEXT
    reliability_label: str = "High Credibility"

class ExtractedClaim(BaseModel):
    claim_text: str
    topic: Optional[str] = "General"
    entities: List[str] = []
    verdict: VerdictEnum
    confidence: float

class FactCheckUrlRequest(BaseModel):
    url: str
    language: str = "en"

class FactCheckTextRequest(BaseModel):
    text: str
    language: str = "en"
    title: Optional[str] = None

class LiveDetectionItem(BaseModel):
    article_id: str
    title: str
    source_name: str
    source_url: str
    published_at: str
    region: str
    category: str
    risk_level: str
    risk_score: float
    source_credibility: str = "Unknown Source"
    source_credibility_score: float = 50.0
    risk_signals: List[str] = []
    evidence_summary: str = ""
    matched_claim_group: str = "general"
    verdict: VerdictEnum
    confidence: float
    detection_reason: str
    fact_check_id: str
    checked_at: str

class LiveDetectionResponse(BaseModel):
    total_scanned: int
    high_risk_count: int
    medium_risk_count: int = 0
    low_risk_count: int = 0
    detections: List[LiveDetectionItem] = []
    claim_clusters: List[Dict[str, Any]] = []
    region: str
    category: str
    synced_at: str
    feed_mode: str = "realtime_detection"

class ImageAnalysisMetadata(BaseModel):
    filename: str
    file_size_kb: float
    dimensions: Optional[str] = None
    format: Optional[str] = None
    exif_found: bool = False
    manipulation_risk: str = "LOW"  # LOW, MODERATE, HIGH, CRITICAL
    ai_generated_probability: float = 0.0
    ela_anomaly_score: float = 0.0
    findings: List[str] = []

class FactCheckResponse(BaseModel):
    id: str
    submission_type: str  # url, text, image
    submitted_input: str
    primary_claim: str
    extracted_claims: List[ExtractedClaim] = []
    verdict: VerdictEnum
    confidence: float
    evidence_strength: str  # VERY STRONG, STRONG, MODERATE, WEAK, NONE
    verification_status: str  # VERIFIED, PARTIALLY VERIFIED, UNVERIFIED, CONFLICTING
    entities: List[str] = []
    category: str = "General"
    location: Optional[str] = "Global"
    language: str = "en"
    
    # Explanations & Evidence
    ai_explanation: str
    supporting_evidence: List[EvidenceItem] = []
    contradictory_evidence: List[EvidenceItem] = []
    contextual_notes: Optional[str] = None
    
    # Metadata
    processing_time_ms: int
    verification_providers: List[str] = ["TruthLens FactDB", "NewsAPI Source Graph", "Cross-Source Matrix"]
    created_at: str
    image_analysis: Optional[ImageAnalysisMetadata] = None
