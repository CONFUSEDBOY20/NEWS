import json
import logging
from typing import Optional, Any
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("truthlens.firestore_db")

_firestore_client = None

def is_firestore_configured() -> bool:
    """Return True if any valid Firebase credentials configuration is present."""
    if settings.FIREBASE_CREDENTIALS_JSON:
        try:
            parsed = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            if isinstance(parsed, dict) and (parsed.get("project_id") or parsed.get("type")):
                return True
        except Exception:
            pass

    if settings.FIREBASE_CREDENTIALS_PATH:
        path = Path(settings.FIREBASE_CREDENTIALS_PATH)
        if path.exists() and path.is_file():
            return True

    return bool(
        settings.FIREBASE_PROJECT_ID and
        settings.FIREBASE_CLIENT_EMAIL and
        settings.FIREBASE_PRIVATE_KEY
    )

def init_firestore() -> Optional[Any]:
    """Initializes and returns the Firestore client from available credentials.
    
    Priority:
    1. FIREBASE_CREDENTIALS_JSON (direct JSON string)
    2. FIREBASE_CREDENTIALS_PATH (JSON credentials file path)
    3. Individual settings: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    """
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    if not is_firestore_configured():
        logger.info("Firestore credentials not configured. Using local JSON store.")
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = None

            # 1. Direct JSON String
            if settings.FIREBASE_CREDENTIALS_JSON:
                try:
                    cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                    cred = credentials.Certificate(cred_dict)
                    logger.info("Firebase Admin initialized using FIREBASE_CREDENTIALS_JSON.")
                except Exception as e:
                    logger.warning(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")

            # 2. File Path
            if cred is None and settings.FIREBASE_CREDENTIALS_PATH:
                cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
                if cred_path.exists():
                    cred = credentials.Certificate(str(cred_path))
                    logger.info(f"Firebase Admin initialized using credentials path: {cred_path}")

            # 3. Individual Environment Variables
            if cred is None and settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
                cred = credentials.Certificate({
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
                })
                logger.info(f"Firebase Admin initialized for project: {settings.FIREBASE_PROJECT_ID}")

            if cred:
                firebase_admin.initialize_app(cred)
            else:
                logger.warning("No valid Firebase credentials could be loaded.")
                return None

        _firestore_client = firestore.client()
        logger.info("Connected to Firestore instance.")
        return _firestore_client

    except Exception as e:
        logger.error(f"Failed to initialize Firestore: {e}")
        return None

def get_firestore_client() -> Optional[Any]:
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = init_firestore()
    return _firestore_client
