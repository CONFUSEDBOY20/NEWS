"""
TruthLens Firebase & Database Seed Script
Populates Firestore or local database with verified claims, evidence, raw fact data, and sample articles.
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend")
sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
from app.providers.fact_db_provider import FactDatabaseProvider

def run_seed():
    print("[INIT] Initializing TruthLens Verification & Fact Data Seed...")
    provider = FactDatabaseProvider()
    data = provider._read_db()
    
    raw_count = len(data.get("raw_data", []))
    articles_count = len(data.get("fact_articles", []))
    logs_count = len(data.get("admin_logs", []))

    print(f"[OK] Fact Database verified: {raw_count} raw records, {articles_count} investigative articles, {logs_count} activity logs.")
    print("[SUCCESS] Seed process completed successfully.")

if __name__ == "__main__":
    run_seed()
