import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_health_check_root_and_v1():
    # Test root health endpoint
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "healthy"]
    assert "version" in data
    assert "timestamp" in data

    # Test v1 health endpoint
    v1_resp = client.get("/api/v1/health")
    assert v1_resp.status_code == 200
    v1_data = v1_resp.json()
    assert v1_data["status"] in ["ok", "healthy"]

def test_fact_check_text_known_false_claim():
    response = client.post(
        "/api/v1/fact-check/text",
        json={"text": "Reserve Bank of India RBI is discontinuing 500 rupee notes immediately", "language": "en"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["FALSE", "MISLEADING"]
    assert data["confidence"] >= 70.0
    assert len(data["contradictory_evidence"]) > 0 or len(data["supporting_evidence"]) > 0

def test_fact_check_insufficient_evidence():
    response = client.post(
        "/api/fact-check/text",
        json={"text": "A completely unrecorded alien artifact was found in a random backyard yesterday xyz9876", "language": "en"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["INSUFFICIENT EVIDENCE", "UNVERIFIED"]

def test_get_news_world_and_v1():
    # Legacy endpoint
    response = client.get("/api/news/world")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "World"
    assert len(data["articles"]) > 0

    # V1 endpoint
    v1_resp = client.get("/api/v1/news/world")
    assert v1_resp.status_code == 200
    assert len(v1_resp.json()["articles"]) > 0

def test_get_news_india():
    response = client.get("/api/news/india")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "India"
    assert len(data["articles"]) > 0

def test_get_articles():
    response = client.get("/api/articles")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_validation_error_envelope():
    # Submit invalid payload (< 5 chars)
    response = client.post(
        "/api/v1/fact-check/text",
        json={"text": "abc"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data or "detail" in data

def test_admin_login_and_crud():
    # 1. Login
    admin_email = settings.ADMIN_EMAIL
    admin_pwd = settings.ADMIN_PASSWORD or "TestAdminSecretPass2026!"
    if not settings.ADMIN_PASSWORD and not settings.ADMIN_PASSWORD_HASH:
        settings.ADMIN_PASSWORD = admin_pwd

    login_resp = client.post(
        "/api/v1/admin/login",
        json={"email": admin_email, "password": admin_pwd}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Dashboard Stats
    stats_resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert stats_resp.status_code == 200
    assert stats_resp.json()["total_fact_checks"] > 0

    # 3. Create Raw Data
    create_resp = client.post(
        "/api/v1/admin/raw-data",
        headers=headers,
        json={
            "title": "Test Claim Automation",
            "claim": "Test automated claim verification record",
            "source": "Test Unit Wire",
            "source_url": "https://example.com/test",
            "category": "Technology",
            "region": "Global",
            "verdict": "TRUE",
            "evidence": "Corroborated by integration test runner."
        }
    )
    assert create_resp.status_code == 200
    item_id = create_resp.json()["id"]

    # 4. Delete Raw Data
    del_resp = client.delete(f"/api/v1/admin/raw-data/{item_id}", headers=headers)
    assert del_resp.status_code == 200
