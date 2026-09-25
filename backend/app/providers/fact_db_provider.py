import json
import os
import shutil
import tempfile
import asyncio
import threading
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.providers.base import BaseFactDatabaseProvider
from app.schemas.fact_check import EvidenceItem, VerdictEnum
from app.core.config import settings

logger = logging.getLogger("truthlens.db")

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
SEED_FILE = os.path.join(DATA_DIR, "database.json")

STOPWORDS = {
    "the", "and", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "shall", "should", "may", "might", "must", "can", "could",
    "this", "that", "these", "those", "it", "its", "they", "them", "their", "we", "us",
    "our", "you", "your", "he", "him", "his", "she", "her", "what", "which", "who", "whom",
    "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "found", "yesterday", "today", "tomorrow", "recent", "random", "completely"
}


def is_firestore_configured() -> bool:
    """Return True only when all required Firebase credentials are set."""
    return bool(
        settings.FIREBASE_PROJECT_ID and
        settings.FIREBASE_CLIENT_EMAIL and
        settings.FIREBASE_PRIVATE_KEY
    )


class JsonFactDatabaseProvider(BaseFactDatabaseProvider):
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self._lock = None
        self._tlock = threading.RLock()
        self._ensure_db()

    @property
    def _async_lock(self):
        if not hasattr(self, "_lock") or self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    @property
    def _thread_lock(self):
        if not hasattr(self, "_tlock") or self._tlock is None:
            self._tlock = threading.RLock()
        return self._tlock

    @property
    def db_file(self) -> str:
        return os.getenv("TRUTHLENS_DATA_FILE") or os.path.join(DATA_DIR, "runtime_database.json")

    def _ensure_db(self):
        with self._thread_lock:
            target_path = self.db_file
            target_dir = os.path.dirname(target_path)
            if target_dir:
                os.makedirs(target_dir, exist_ok=True)
            if not os.path.exists(target_path):
                if os.path.exists(SEED_FILE) and os.path.abspath(SEED_FILE) != os.path.abspath(target_path):
                    try:
                        with open(SEED_FILE, "r", encoding="utf-8") as sf:
                            seed_data = json.load(sf)
                        self._write_db(seed_data)
                        return
                    except Exception:
                        pass
                initial_data = {
                    "fact_checks": [],
                    "raw_data": self._get_initial_raw_data(),
                    "fact_articles": self._get_initial_articles(),
                    "admin_logs": [
                        {
                            "id": "log-001",
                            "admin_id": "system@truthlens.ai",
                            "action": "SYSTEM_INIT",
                            "target_collection": "system",
                            "target_id": "root",
                            "timestamp": datetime.now().isoformat(),
                            "details": "TruthLens Database & Seed verification index initialized successfully."
                        }
                    ],
                    "system_settings": {
                        "news_categories": ["All", "Politics", "Technology", "Health", "Economy", "Climate", "Science", "Entertainment"],
                        "supported_languages": [
                            {"code": "en", "name": "English"},
                            {"code": "hi", "name": "Hindi (हिंदी)"}
                        ],
                        "confidence_threshold_true": 80.0,
                        "confidence_threshold_partial": 55.0,
                        "enabled_providers": {
                            "fact_database": True,
                            "news_api": True,
                            "gemini_ai": True,
                            "search_graph": True,
                            "image_forensics": True
                        },
                        "cache_duration_hours": 4,
                        "rate_limit_per_minute": 60,
                        "maintenance_mode": False,
                        "allow_public_submissions": True
                    }
                }
                self._write_db(initial_data)

    def _read_db(self) -> Dict[str, Any]:
        with self._thread_lock:
            try:
                with open(self.db_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                self._ensure_db()
                with open(self.db_file, "r", encoding="utf-8") as f:
                    return json.load(f)

    def _write_db(self, data: Dict[str, Any]):
        with self._thread_lock:
            target_path = self.db_file
            dir_name = os.path.dirname(target_path) or "."
            os.makedirs(dir_name, exist_ok=True)
            fd, tmp_path = tempfile.mkstemp(dir=dir_name, prefix=".tmp_db_", suffix=".json")
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp_path, target_path)
            except Exception:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
                raise

    def _get_initial_raw_data(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "raw-101",
                "title": "Claim: WHO Announced Mandatory Global Digital Health Passports for 2026",
                "claim": "The World Health Organization has mandated compulsory digital IDs and health passports for all global travel starting late 2026.",
                "raw_text": "Viral messages across Telegram and WhatsApp claim WHO passed a resolution forcing all member states to implement mandatory digital biometric health passports.",
                "source": "WHO Official Fact Portal & Reuters Fact Check",
                "source_url": "https://www.who.int/news-room/fact-sheets",
                "category": "Health",
                "language": "en",
                "region": "Global",
                "verdict": "FALSE",
                "evidence": "WHO guidelines and the Global Digital Health Certification Network (GDHCN) are entirely voluntary technical standards for member states. No mandatory international health passport exists.",
                "tags": ["WHO", "Health", "Digital ID", "Travel", "GDHCN"],
                "entities": ["World Health Organization", "GDHCN", "United Nations"],
                "publication_date": "2026-03-12",
                "verification_date": "2026-03-14",
                "reliability_score": 98.0,
                "notes": "Verified by official WHO spokesperson and international health treaty records.",
                "image_url": "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80",
                "created_by": "admin@truthlens.ai",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "PUBLISHED"
            },
            {
                "id": "raw-102",
                "title": "Claim: Reserve Bank of India (RBI) Discontinuing All 500 Rupee Notes",
                "claim": "RBI will withdraw all ₹500 currency notes from circulation by end of year.",
                "raw_text": "A viral social media clip claims RBI governor announced the phase out of 500 rupee banknotes.",
                "source": "RBI Press Releases & PIB Fact Check",
                "source_url": "https://pib.gov.in/factcheck",
                "category": "Economy",
                "language": "en",
                "region": "India",
                "verdict": "FALSE",
                "evidence": "The Press Information Bureau (PIB) and Reserve Bank of India issued a categorical clarification that ₹500 notes remain legal tender with zero plans for discontinuation.",
                "tags": ["RBI", "Currency", "Economy", "India", "500", "Banknote"],
                "entities": ["Reserve Bank of India", "PIB Fact Check", "Ministry of Finance"],
                "publication_date": "2026-04-05",
                "verification_date": "2026-04-06",
                "reliability_score": 99.0,
                "notes": "Recurring hoax circulating on WhatsApp since currency demonetization years.",
                "image_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
                "created_by": "admin@truthlens.ai",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "PUBLISHED"
            },
            {
                "id": "raw-103",
                "title": "Claim: ISRO Launches Lunar Water Prospecting Rover with Real-Time Spectrometry",
                "claim": "ISRO has successfully placed a dedicated micro-rover capable of direct subsurface water-ice extraction mapping on the Moon's South Pole.",
                "raw_text": "News reports detailing ISRO's joint lunar exploration initiative with international deep-space spectroscopic sensors.",
                "source": "ISRO Official Missions & The Hindu Science Desk",
                "source_url": "https://www.isro.gov.in",
                "category": "Science",
                "language": "en",
                "region": "India",
                "verdict": "TRUE",
                "evidence": "ISRO mission telemetry and peer-reviewed mission profiles confirm deployment and data transmission from the onboard infrared reflection spectrometer.",
                "tags": ["ISRO", "Space", "Moon", "Science", "Chandrayaan"],
                "entities": ["ISRO", "Chandrayaan Program", "Department of Space"],
                "publication_date": "2026-05-18",
                "verification_date": "2026-05-19",
                "reliability_score": 95.0,
                "notes": "Confirmed via official Indian Space Research Organisation telemetry press conference.",
                "image_url": "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
                "created_by": "admin@truthlens.ai",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "PUBLISHED"
            },
            {
                "id": "raw-104",
                "title": "Claim: Deepfake Video of Global Tech CEO Endorsing Crypto Trading Platform",
                "claim": "Viral video shows OpenAI and Microsoft leadership promoting a guaranteed 300% daily return AI crypto token.",
                "raw_text": "Synthetic lip-synced video circulated on YouTube Ads and TikTok urging viewers to deposit cryptocurrency.",
                "source": "BBC Verify & Digital Forensics Lab",
                "source_url": "https://www.bbc.com/news/reality_check",
                "category": "Technology",
                "language": "en",
                "region": "Global",
                "verdict": "FALSE",
                "evidence": "Audio frequency analysis reveals voice cloning artifacts, audio-visual phoneme desynchronization, and zero official company disclosures. Confirmed financial scam.",
                "tags": ["Deepfake", "AI Scam", "Crypto", "Tech", "Voice Clone"],
                "entities": ["OpenAI", "Microsoft", "YouTube Ads"],
                "publication_date": "2026-06-01",
                "verification_date": "2026-06-02",
                "reliability_score": 97.0,
                "notes": "Reported to FTC and social media trust & safety teams.",
                "image_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                "created_by": "admin@truthlens.ai",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "PUBLISHED"
            },
            {
                "id": "raw-105",
                "title": "Claim: Solar Storm of 2026 Will Permanently Destroy the Global Internet Grid",
                "claim": "An unprecedented G5 class geomagnetic coronal mass ejection will irreversibly shut down all undersea fiber optic cables for months.",
                "raw_text": "Sensationalized articles claiming impending total technological blackout caused by Carrington-level solar flares.",
                "source": "NOAA Space Weather Prediction Center & NASA Heliophysics",
                "source_url": "https://www.swpc.noaa.gov",
                "category": "Science",
                "language": "en",
                "region": "Global",
                "verdict": "MISLEADING",
                "evidence": "While solar cycle 25 peaks can induce high-latitude grid fluctuations and satellite GPS radio blackouts, undersea fiber cables use optical signals immune to magnetic induction. Claims of permanent global internet destruction are grossly exaggerated.",
                "tags": ["Solar Storm", "Internet", "NASA", "Space Weather", "Geomagnetic"],
                "entities": ["NOAA", "NASA", "Space Weather Prediction Center"],
                "publication_date": "2026-07-10",
                "verification_date": "2026-07-11",
                "reliability_score": 93.0,
                "notes": "Misrepresentation of scientific vulnerability papers on optical repeater power lines.",
                "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
                "created_by": "admin@truthlens.ai",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "PUBLISHED"
            }
        ]

    def _get_initial_articles(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "art-001",
                "title": "Anatomy of a Viral Deepfake: How Synthetic Media Manipulates Elections",
                "slug": "anatomy-of-a-viral-deepfake-elections",
                "summary": "An in-depth investigation into modern generative video pipelines, voice cloning tactics, and how journalists detect forensic artifacts.",
                "content": "### The Evolution of Synthetic Deception\n\nIn recent months, synthetic media has evolved from easily detectable distortions to photorealistic generative video capable of misleading even seasoned observers...\n\n### Key Detection Signals\n\n1. **Phoneme Discrepancies**: Subtle mismatches between mouth articulation and audio transients.\n2. **Lighting Inconsistencies**: Specular reflections in pupils that do not match background lighting vectors.\n3. **Spectral Voice Anomalies**: Harmonic frequency dropouts characteristic of diffusion-based neural vocoders.\n\n### Best Practices for Digital Consumers\n\nAlways verify breaking audio/video clips through primary publisher channels and independent institutional fact-checking repositories.",
                "category": "Technology",
                "thumbnail_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                "tags": ["Deepfake", "AI", "Election Security", "Media Literacy"],
                "author": "TruthLens Investigation Team",
                "published_at": "2026-07-28T10:00:00Z",
                "verdict_context": "MISLEADING",
                "read_time_minutes": 5,
                "is_featured": True,
                "status": "PUBLISHED"
            },
            {
                "id": "art-002",
                "title": "Medical Misinformation in the Age of Social Algorithms",
                "slug": "medical-misinformation-social-algorithms",
                "summary": "Why health hoaxes spread 6x faster than peer-reviewed medical guidance and the psychological levers exploited by pseudo-scientific influencers.",
                "content": "### The Amplification Loop\n\nHealth-related anxiety triggers rapid sharing behavior. When sensational health cures or fear-mongering health narratives are fed into algorithmic recommendation feeds, engagement metrics reward outrage over accuracy...\n\n### Clinical Verification Standards\n\nScientific consensus requires replicated randomized controlled trials, peer review, and regulatory meta-analyses. Single-case anecdotal videos do not constitute scientific fact.",
                "category": "Health",
                "thumbnail_url": "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80",
                "tags": ["Health", "Medicine", "Fact Check", "Social Media"],
                "author": "Dr. Sarah Chen, TruthLens Health Desk",
                "published_at": "2026-08-02T14:30:00Z",
                "verdict_context": "FALSE",
                "read_time_minutes": 6,
                "is_featured": True,
                "status": "PUBLISHED"
            },
            {
                "id": "art-003",
                "title": "Financial Fraud & AI Voice Impersonation: Protecting Your Assets",
                "slug": "financial-fraud-ai-voice-impersonation",
                "summary": "Emergency response guide on how cybercriminals use 3-second voice samples to impersonate executives and family members.",
                "content": "### The Three-Second Vulnerability\n\nModern zero-shot neural voice cloning models can approximate a human voice timbre with under four seconds of clean reference audio extracted from public podcasts or phone calls...\n\n### Safety Protocols\n\nEstablish verbal security passphrases within organizations and family circles before executing emergency wire transfers or sharing sensitive financial credentials.",
                "category": "Economy",
                "thumbnail_url": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
                "tags": ["Cybersecurity", "Finance", "AI Scams", "Safety"],
                "author": "Marcus Vance, Cyber Threat Analyst",
                "published_at": "2026-08-10T09:15:00Z",
                "verdict_context": "FALSE",
                "read_time_minutes": 4,
                "is_featured": False,
                "status": "PUBLISHED"
            }
        ]

    async def search_fact_database(self, query: str) -> List[EvidenceItem]:
        data = self._read_db()
        raw_items = data.get("raw_data", [])
        results: List[EvidenceItem] = []
        
        query_words = {w.lower() for w in query.split() if len(w) > 2 and w.lower() not in STOPWORDS}
        
        for item in raw_items:
            title_claim = f"{item.get('title', '')} {item.get('claim', '')} {' '.join(item.get('tags', []))}".lower()
            matched_words = [w for w in query_words if w in title_claim]
            
            if len(matched_words) >= 2 or (len(query_words) == 1 and list(query_words)[0] in title_claim and len(list(query_words)[0]) > 4):
                stance = "SUPPORTS" if item.get("verdict") == "TRUE" else "CONTRADICTS"
                results.append(
                    EvidenceItem(
                        id=f"db-{item.get('id')}",
                        source_name=item.get("source", "TruthLens Internal FactDB"),
                        source_url=item.get("source_url", "https://truthlens.ai/db"),
                        title=item.get("title", ""),
                        publication_date=item.get("verification_date") or item.get("publication_date"),
                        evidence_text=item.get("evidence", ""),
                        reliability_score=float(item.get("reliability_score", 90.0)),
                        source_type="fact_checker",
                        stance=stance,
                        reliability_label=f"Verified Archive ({item.get('verdict')})"
                    )
                )
        return results

    async def save_fact_check(self, record: Dict[str, Any]) -> str:
        async with self._async_lock:
            with self._thread_lock:
                data = self._read_db()
                data.setdefault("fact_checks", []).insert(0, record)
                data.setdefault("verifications", []).insert(0, record)
                if len(data["fact_checks"]) > 500:
                    data["fact_checks"] = data["fact_checks"][:500]
                if len(data["verifications"]) > 500:
                    data["verifications"] = data["verifications"][:500]
                self._write_db(data)
                return record.get("id", "")

    async def get_fact_check(self, check_id: str) -> Optional[Dict[str, Any]]:
        async with self._async_lock:
            with self._thread_lock:
                data = self._read_db()
                for fc in data.get("verifications", []) + data.get("fact_checks", []):
                    if fc.get("id") == check_id:
                        return fc
                return None

    # Raw Data CRUD
    def get_all_raw_data(self) -> List[Dict[str, Any]]:
        with self._thread_lock:
            return self._read_db().get("raw_data", [])

    def add_raw_data(self, item: Dict[str, Any]) -> Dict[str, Any]:
        with self._thread_lock:
            data = self._read_db()
            data.setdefault("raw_data", []).insert(0, item)
            self._write_db(data)
            self.add_admin_log("admin@truthlens.ai", "CREATE", "raw_data", item.get("id"), f"Created raw record: {item.get('title')}")
            return item

    def update_raw_data(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._thread_lock:
            data = self._read_db()
            for idx, item in enumerate(data.get("raw_data", [])):
                if item.get("id") == item_id:
                    data["raw_data"][idx].update(updates)
                    data["raw_data"][idx]["updated_at"] = datetime.now().isoformat()
                    self._write_db(data)
                    self.add_admin_log("admin@truthlens.ai", "UPDATE", "raw_data", item_id, f"Updated raw record: {updates.get('title', item_id)}")
                    return data["raw_data"][idx]
            return None

    def delete_raw_data(self, item_id: str) -> bool:
        with self._thread_lock:
            data = self._read_db()
            initial_len = len(data.get("raw_data", []))
            data["raw_data"] = [item for item in data.get("raw_data", []) if item.get("id") != item_id]
            if len(data["raw_data"]) < initial_len:
                self._write_db(data)
                self.add_admin_log("admin@truthlens.ai", "DELETE", "raw_data", item_id, f"Deleted raw record: {item_id}")
                return True
            return False

    # Fact Articles CRUD
    def get_all_articles(self) -> List[Dict[str, Any]]:
        with self._thread_lock:
            return self._read_db().get("fact_articles", [])

    def get_article_by_id_or_slug(self, identifier: str) -> Optional[Dict[str, Any]]:
        with self._thread_lock:
            for art in self.get_all_articles():
                if art.get("id") == identifier or art.get("slug") == identifier:
                    return art
            return None

    def add_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        with self._thread_lock:
            data = self._read_db()
            data.setdefault("fact_articles", []).insert(0, article)
            self._write_db(data)
            self.add_admin_log("admin@truthlens.ai", "CREATE", "fact_articles", article.get("id"), f"Created article: {article.get('title')}")
            return article

    def update_article(self, article_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._thread_lock:
            data = self._read_db()
            for idx, item in enumerate(data.get("fact_articles", [])):
                if item.get("id") == article_id:
                    data["fact_articles"][idx].update(updates)
                    self._write_db(data)
                    self.add_admin_log("admin@truthlens.ai", "UPDATE", "fact_articles", article_id, f"Updated article: {article_id}")
                    return data["fact_articles"][idx]
            return None

    def delete_article(self, article_id: str) -> bool:
        with self._thread_lock:
            data = self._read_db()
            initial_len = len(data.get("fact_articles", []))
            data["fact_articles"] = [art for art in data.get("fact_articles", []) if art.get("id") != article_id]
            if len(data["fact_articles"]) < initial_len:
                self._write_db(data)
                self.add_admin_log("admin@truthlens.ai", "DELETE", "fact_articles", article_id, f"Deleted article: {article_id}")
                return True
            return False

    # Admin Logs
    def get_admin_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._thread_lock:
            return self._read_db().get("admin_logs", [])[:limit]

    def add_admin_log(self, admin_id: str, action: str, target_collection: str, target_id: Optional[str], details: str):
        with self._thread_lock:
            data = self._read_db()
            log_entry = {
                "id": f"log-{int(datetime.now().timestamp()*1000)}",
                "admin_id": admin_id,
                "action": action,
                "target_collection": target_collection,
                "target_id": target_id,
                "timestamp": datetime.now().isoformat(),
                "details": details,
                "ip_address": "127.0.0.1"
            }
            data.setdefault("admin_logs", []).insert(0, log_entry)
            if len(data["admin_logs"]) > 500:
                data["admin_logs"] = data["admin_logs"][:500]
            self._write_db(data)

    # Settings
    def get_settings(self) -> Dict[str, Any]:
        with self._thread_lock:
            return self._read_db().get("system_settings", {})

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self._thread_lock:
            data = self._read_db()
            data.setdefault("system_settings", {}).update(updates)
            self._write_db(data)
            self.add_admin_log("admin@truthlens.ai", "SETTINGS_CHANGE", "system_settings", "config", "Updated system thresholds and provider configurations")
            return data["system_settings"]


class FirestoreFactDatabaseProvider(BaseFactDatabaseProvider):
    """Google Cloud Firestore implementation of BaseFactDatabaseProvider."""

    def __init__(self):
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = credentials.Certificate({
                "project_id": settings.FIREBASE_PROJECT_ID,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "private_key": settings.FIREBASE_PRIVATE_KEY
            })
            firebase_admin.initialize_app(cred)

        self.db = firestore.client()
        logger.info("FirestoreFactDatabaseProvider initialized (storage: firestore)")

    async def search_fact_database(self, query: str) -> List[EvidenceItem]:
        docs = self.db.collection("raw_data").stream()
        results: List[EvidenceItem] = []
        query_words = {w.lower() for w in query.split() if len(w) > 2 and w.lower() not in STOPWORDS}

        for doc in docs:
            item = doc.to_dict() or {}
            title_claim = f"{item.get('title', '')} {item.get('claim', '')} {' '.join(item.get('tags', []))}".lower()
            matched_words = [w for w in query_words if w in title_claim]

            if len(matched_words) >= 2 or (len(query_words) == 1 and list(query_words)[0] in title_claim and len(list(query_words)[0]) > 4):
                stance = "SUPPORTS" if item.get("verdict") == "TRUE" else "CONTRADICTS"
                results.append(
                    EvidenceItem(
                        id=f"db-{item.get('id')}",
                        source_name=item.get("source", "TruthLens Internal FactDB"),
                        source_url=item.get("source_url", "https://truthlens.ai/db"),
                        title=item.get("title", ""),
                        publication_date=item.get("verification_date") or item.get("publication_date"),
                        evidence_text=item.get("evidence", ""),
                        reliability_score=float(item.get("reliability_score", 90.0)),
                        source_type="fact_checker",
                        stance=stance,
                        reliability_label=f"Verified Archive ({item.get('verdict')})"
                    )
                )
        return results

    async def save_fact_check(self, record: Dict[str, Any]) -> str:
        doc_id = record.get("id") or f"verif-{int(datetime.now().timestamp()*1000)}"
        record["id"] = doc_id
        self.db.collection("fact_checks").document(doc_id).set(record, merge=True)
        self.db.collection("verifications").document(doc_id).set(record, merge=True)
        return doc_id

    async def get_fact_check(self, check_id: str) -> Optional[Dict[str, Any]]:
        doc = self.db.collection("verifications").document(check_id).get()
        if not doc.exists:
            doc = self.db.collection("fact_checks").document(check_id).get()
        return doc.to_dict() if doc.exists else None

    # Raw Data CRUD
    def get_all_raw_data(self) -> List[Dict[str, Any]]:
        docs = self.db.collection("raw_data").stream()
        return [d.to_dict() for d in docs if d.to_dict()]

    def add_raw_data(self, item: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = item.get("id") or f"raw-{int(datetime.now().timestamp()*1000)}"
        item["id"] = doc_id
        self.db.collection("raw_data").document(doc_id).set(item, merge=True)
        self.add_admin_log("admin@truthlens.ai", "CREATE", "raw_data", doc_id, f"Created raw record: {item.get('title')}")
        return item

    def update_raw_data(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc_ref = self.db.collection("raw_data").document(item_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        updates["updated_at"] = datetime.now().isoformat()
        doc_ref.set(updates, merge=True)
        updated_doc = doc_ref.get()
        updated_data = updated_doc.to_dict() if updated_doc.exists else updates
        self.add_admin_log("admin@truthlens.ai", "UPDATE", "raw_data", item_id, f"Updated raw record: {updates.get('title', item_id)}")
        return updated_data

    def delete_raw_data(self, item_id: str) -> bool:
        doc_ref = self.db.collection("raw_data").document(item_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        self.add_admin_log("admin@truthlens.ai", "DELETE", "raw_data", item_id, f"Deleted raw record: {item_id}")
        return True

    # Fact Articles CRUD
    def get_all_articles(self) -> List[Dict[str, Any]]:
        docs = self.db.collection("fact_articles").stream()
        return [d.to_dict() for d in docs if d.to_dict()]

    def get_article_by_id_or_slug(self, identifier: str) -> Optional[Dict[str, Any]]:
        doc = self.db.collection("fact_articles").document(identifier).get()
        if doc.exists:
            return doc.to_dict()
        docs = self.db.collection("fact_articles").where("slug", "==", identifier).limit(1).stream()
        for d in docs:
            return d.to_dict()
        return None

    def add_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = article.get("id") or f"art-{int(datetime.now().timestamp()*1000)}"
        article["id"] = doc_id
        self.db.collection("fact_articles").document(doc_id).set(article, merge=True)
        self.add_admin_log("admin@truthlens.ai", "CREATE", "fact_articles", doc_id, f"Created article: {article.get('title')}")
        return article

    def update_article(self, article_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc_ref = self.db.collection("fact_articles").document(article_id)
        if not doc_ref.get().exists:
            return None
        doc_ref.set(updates, merge=True)
        self.add_admin_log("admin@truthlens.ai", "UPDATE", "fact_articles", article_id, f"Updated article: {article_id}")
        updated_doc = doc_ref.get()
        return updated_doc.to_dict() if updated_doc.exists else updates

    def delete_article(self, article_id: str) -> bool:
        doc_ref = self.db.collection("fact_articles").document(article_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        self.add_admin_log("admin@truthlens.ai", "DELETE", "fact_articles", article_id, f"Deleted article: {article_id}")
        return True

    # Admin Logs
    def get_admin_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            from firebase_admin import firestore
            docs = self.db.collection("admin_logs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
            return [d.to_dict() for d in docs if d.to_dict()]
        except Exception:
            docs = self.db.collection("admin_logs").stream()
            logs = [d.to_dict() for d in docs if d.to_dict()]
            logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return logs[:limit]

    def add_admin_log(self, admin_id: str, action: str, target_collection: str, target_id: Optional[str], details: str):
        log_id = f"log-{int(datetime.now().timestamp()*1000)}"
        log_entry = {
            "id": log_id,
            "admin_id": admin_id,
            "action": action,
            "target_collection": target_collection,
            "target_id": target_id,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "ip_address": "127.0.0.1"
        }
        self.db.collection("admin_logs").document(log_id).set(log_entry, merge=True)
        self.db.collection("system_logs").document(log_id).set(log_entry, merge=True)

    # Settings
    def get_settings(self) -> Dict[str, Any]:
        doc = self.db.collection("system_settings").document("config").get()
        return doc.to_dict() if doc.exists else {}

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        doc_ref = self.db.collection("system_settings").document("config")
        doc_ref.set(updates, merge=True)
        self.add_admin_log("admin@truthlens.ai", "SETTINGS_CHANGE", "system_settings", "config", "Updated system thresholds and provider configurations")
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else updates


def get_fact_database_provider() -> BaseFactDatabaseProvider:
    """Return FirestoreFactDatabaseProvider if Firebase environment variables are set, else JsonFactDatabaseProvider."""
    if is_firestore_configured():
        logger.info("Selected FirestoreFactDatabaseProvider (storage: firestore)")
        return FirestoreFactDatabaseProvider()
    else:
        logger.info("Selected JsonFactDatabaseProvider (storage: json)")
        return JsonFactDatabaseProvider()


class FactDatabaseProvider:
    """Polymorphic factory class returning either Firestore or JSON database provider."""

    def __new__(cls, *args, **kwargs):
        return get_fact_database_provider()
