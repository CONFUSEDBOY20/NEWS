from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.schemas.fact_check import ExtractedClaim, EvidenceItem, ImageAnalysisMetadata
from app.schemas.news import NewsArticle

class BaseNewsProvider(ABC):
    @abstractmethod
    async def get_world_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> List[NewsArticle]:
        pass

    @abstractmethod
    async def get_india_news(
        self, category: Optional[str] = None, page: int = 1, page_size: int = 20, fresh: bool = False
    ) -> List[NewsArticle]:
        pass

    @abstractmethod
    async def search_news(self, query: str, page: int = 1, page_size: int = 20) -> List[NewsArticle]:
        pass

class BaseSearchProvider(ABC):
    @abstractmethod
    async def search_trusted_sources(self, query: str, limit: int = 5) -> List[EvidenceItem]:
        pass

class BaseAIProvider(ABC):
    @abstractmethod
    async def extract_claims_and_entities(self, text: str, language: str = "en") -> Dict[str, Any]:
        pass

    @abstractmethod
    async def verify_claim_with_evidence(
        self,
        claim: str,
        evidence_items: List[EvidenceItem],
        language: str = "en"
    ) -> Dict[str, Any]:
        pass

class BaseFactDatabaseProvider(ABC):
    @abstractmethod
    async def search_fact_database(self, query: str) -> List[EvidenceItem]:
        pass

    @abstractmethod
    async def save_fact_check(self, record: Dict[str, Any]) -> str:
        pass

    @abstractmethod
    async def get_fact_check(self, check_id: str) -> Optional[Dict[str, Any]]:
        pass

class BaseImageVerificationProvider(ABC):
    @abstractmethod
    async def analyze_image(self, image_bytes: bytes, filename: str) -> ImageAnalysisMetadata:
        pass
