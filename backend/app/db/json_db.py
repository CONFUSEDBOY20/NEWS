import os
import json
import shutil
import tempfile
import threading
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("truthlens.json_db")

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
SEED_FILE = DATA_DIR / "database.json"
TMP_DB_FILE = Path(tempfile.gettempdir()) / "database.json"

class JsonDatabaseManager:
    """Thread-safe JSON Database manager with Vercel read-only filesystem resilience.
    
    If the filesystem is read-only (e.g. Vercel Serverless environment where VERCEL=1,
    or on PermissionError/OSError), it copies the seed database.json to /tmp/database.json
    and reads/writes safely from /tmp.
    """
    
    def __init__(self, custom_path: Optional[str] = None):
        self._lock = threading.RLock()
        self._is_vercel = os.getenv("VERCEL") in ("1", "true", "True")
        
        if custom_path:
            self._target_path = Path(custom_path)
        elif self._is_vercel:
            self._target_path = TMP_DB_FILE
        else:
            env_path = os.getenv("TRUTHLENS_DATA_FILE")
            self._target_path = Path(env_path) if env_path else (DATA_DIR / "database.json")
            
        self._ensure_storage()

    @property
    def db_path(self) -> Path:
        return self._target_path

    def _fallback_to_tmp(self):
        """Switch storage location to /tmp when read-only filesystem is encountered."""
        logger.warning(f"Filesystem at {self._target_path} is read-only. Falling back to {TMP_DB_FILE}")
        self._target_path = TMP_DB_FILE
        self._copy_seed_to_path(self._target_path)

    def _copy_seed_to_path(self, target: Path):
        """Copies seed database.json to the target destination if not already present."""
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                if SEED_FILE.exists() and SEED_FILE.resolve() != target.resolve():
                    shutil.copy2(SEED_FILE, target)
                    logger.info(f"Copied seed database from {SEED_FILE} to {target}")
                else:
                    target.write_text("{}", encoding="utf-8")
        except (PermissionError, OSError) as e:
            if target != TMP_DB_FILE:
                self._fallback_to_tmp()
            else:
                logger.error(f"Failed to initialize tmp storage: {e}")

    def _ensure_storage(self):
        with self._lock:
            try:
                self._target_path.parent.mkdir(parents=True, exist_ok=True)
                if not self._target_path.exists():
                    self._copy_seed_to_path(self._target_path)
            except (PermissionError, OSError):
                self._fallback_to_tmp()

    def read_data(self) -> Dict[str, Any]:
        with self._lock:
            if not self._target_path.exists():
                self._ensure_storage()
            try:
                with open(self._target_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading JSON database at {self._target_path}: {e}")
                # Try reading seed as last resort
                if SEED_FILE.exists() and SEED_FILE != self._target_path:
                    try:
                        with open(SEED_FILE, "r", encoding="utf-8") as sf:
                            return json.load(sf)
                    except Exception:
                        pass
                return {}

    def write_data(self, data: Dict[str, Any]) -> bool:
        with self._lock:
            try:
                return self._atomic_write(self._target_path, data)
            except (PermissionError, OSError) as e:
                logger.warning(f"Write failed at {self._target_path} ({e}). Switching to /tmp...")
                self._fallback_to_tmp()
                try:
                    return self._atomic_write(self._target_path, data)
                except Exception as ex:
                    logger.error(f"Write failed even in /tmp ({self._target_path}): {ex}")
                    return False

    def _atomic_write(self, target: Path, data: Dict[str, Any]) -> bool:
        temp_file = target.with_suffix(f".tmp.{os.getpid()}")
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            temp_file.replace(target)
            return True
        except Exception:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass
            raise

json_db = JsonDatabaseManager()
