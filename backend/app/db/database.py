import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("truthlens.db")

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
DB_FILE = DATA_DIR / "database.json"

class DatabaseManager:
    """Manages reading and writing to the TruthLens persistent store (Local JSON & Firestore ready)."""
    
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.db_path = DB_FILE
        self._firestore_client = None
        self._init_firestore_if_configured()

    def _init_firestore_if_configured(self):
        """Optional Firestore adapter if Firebase service credentials are provided."""
        if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
            try:
                import firebase_admin
                from firebase_admin import credentials, firestore
                
                if not firebase_admin._apps:
                    cred = credentials.Certificate({
                        "project_id": settings.FIREBASE_PROJECT_ID,
                        "client_email": settings.FIREBASE_CLIENT_EMAIL,
                        "private_key": settings.FIREBASE_PRIVATE_KEY
                    })
                    firebase_admin.initialize_app(cred)
                self._firestore_client = firestore.client()
                logger.info("Connected to Firebase Firestore live instance.")
            except Exception as e:
                logger.warning(f"Firestore initialization skipped: {e}. Defaulting to local persistent store.")

    def read_data(self) -> Dict[str, Any]:
        """Read data from local JSON database."""
        if not self.db_path.exists():
            return {}
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading database file: {e}")
            return {}

    def write_data(self, data: Dict[str, Any]) -> bool:
        """Atomically write data to local JSON database."""
        temp_path = self.db_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            temp_path.replace(self.db_path)
            return True
        except Exception as e:
            logger.error(f"Error writing database file: {e}")
            if temp_path.exists():
                temp_path.unlink()
            return False

db_manager = DatabaseManager()
