"""
Pytest configuration and global fixtures for backend tests.
"""

import os
import shutil
import pytest


@pytest.fixture(autouse=True)
def isolated_database_file(tmp_path, monkeypatch):
    """
    Autouse fixture that points TRUTHLENS_DATA_FILE to a temporary copy of the
    database seed file so tests never modify backend/data/database.json or runtime_database.json.
    """
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(tests_dir)
    seed_file = os.path.join(backend_dir, "data", "database.json")
    
    test_db_file = str(tmp_path / "test_runtime_database.json")
    
    if os.path.exists(seed_file):
        shutil.copyfile(seed_file, test_db_file)
    
    monkeypatch.setenv("TRUTHLENS_DATA_FILE", test_db_file)
    
    # Also update settings module if loaded
    try:
        from app.core.config import settings
        monkeypatch.setattr(settings, "TRUTHLENS_DATA_FILE", test_db_file, raising=False)
    except Exception:
        pass

    yield test_db_file
