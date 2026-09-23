import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "providers" in data

def test_fact_check_text_known_false_claim():
    response = client.post(
        "/api/fact-check/text",
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

def test_get_news_world():
    response = client.get("/api/news/world")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "World"
    assert len(data["articles"]) > 0

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

def test_admin_login_and_crud():
    # 1. Login
    login_resp = client.post(
        "/api/admin/login",
        json={"email": "admin@truthlens.ai", "password": "TruthLens@2026Admin"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Dashboard Stats
    stats_resp = client.get("/api/admin/dashboard", headers=headers)
    assert stats_resp.status_code == 200
    assert stats_resp.json()["total_fact_checks"] > 0

    # 3. Create Raw Data
    create_resp = client.post(
        "/api/admin/raw-data",
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
    del_resp = client.delete(f"/api/admin/raw-data/{item_id}", headers=headers)
    assert del_resp.status_code == 200
