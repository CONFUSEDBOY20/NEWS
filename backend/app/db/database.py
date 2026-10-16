import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from app.core.config import settings
from app.db.json_db import json_db
from app.db.firestore_db import get_firestore_client, is_firestore_configured

logger = logging.getLogger("truthlens.db")

class DatabaseManager:
    """Manages reading and writing to the TruthLens persistent store (Local JSON & Firestore ready)."""
    
    def __init__(self):
        self._json_db = json_db
        self._firestore_client = None

    @property
    def db_path(self) -> Path:
        return self._json_db.db_path

    @property
    def firestore(self):
        if self._firestore_client is None and is_firestore_configured():
            self._firestore_client = get_firestore_client()
        return self._firestore_client

    def read_data(self) -> Dict[str, Any]:
        """Read data from local JSON database."""
        return self._json_db.read_data()

    def write_data(self, data: Dict[str, Any]) -> bool:
        """Atomically write data to local JSON database."""
        return self._json_db.write_data(data)

db_manager = DatabaseManager()
