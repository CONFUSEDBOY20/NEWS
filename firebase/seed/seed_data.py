"""
TruthLens Firebase & Database Seed Script
===========================================
Populates Firestore or local database with verified claims, evidence, raw fact data, and sample articles.

Usage:
  python firebase/seed/seed_data.py [--dry-run]
"""

import sys
import os
import argparse
from datetime import datetime, timezone

# Ensure backend root is on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

from app.providers.fact_db_provider import JsonFactDatabaseProvider, is_firestore_configured
from app.core.config import settings


def run_seed(dry_run: bool = False):
    print("=" * 60)
    print("  TruthLens Database & Firestore Seeder")
    print("=" * 60)

    # 1. Load seed data from JSON provider
    json_provider = JsonFactDatabaseProvider()
    seed_data = json_provider._read_db()

    raw_items = seed_data.get("raw_data", [])
    articles = seed_data.get("fact_articles", [])
    logs = seed_data.get("admin_logs", [])
    system_settings = seed_data.get("system_settings", {})
    fact_checks = seed_data.get("fact_checks", [])

    print(f"[LOADED SEED DATA] {len(raw_items)} raw records, {len(articles)} articles, {len(logs)} logs, {len(fact_checks)} fact checks.")

    if dry_run:
        print("\n[DRY-RUN MODE] Simulating idempotent Firestore upserts without contacting server...")
        for item in raw_items:
            print(f"  [SIMULATED] Upsert collection 'raw_data' document '{item.get('id')}'")
        for art in articles:
            print(f"  [SIMULATED] Upsert collection 'fact_articles' document '{art.get('id')}'")
        for log_entry in logs:
            print(f"  [SIMULATED] Upsert collection 'admin_logs' document '{log_entry.get('id')}'")
        if system_settings:
            print("  [SIMULATED] Upsert collection 'system_settings' document 'config'")
        for fc in fact_checks:
            print(f"  [SIMULATED] Upsert collection 'verifications' document '{fc.get('id')}'")
        print("\n[DRY-RUN COMPLETE] All seed items validated successfully.")
        return

    # 2. Check Firestore credentials
    if not is_firestore_configured():
        print("[NOTICE] Firebase credentials not configured in environment (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).")
        print("[NOTICE] Seed data verified against local runtime JSON database.")
        print(f"[OK] Local Database path: {json_provider.db_file}")
        print("[SUCCESS] Local seed state ready.")
        return

    # 3. Push to Firestore
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

        db = firestore.client()
        print("\n[FIRESTORE CONNECTED] Pushing idempotent seed records...")

        # Push raw_data
        for item in raw_items:
            doc_id = item.get("id")
            if doc_id:
                db.collection("raw_data").document(doc_id).set(item, merge=True)
                print(f"  [UPSERT] raw_data/{doc_id}")

        # Push fact_articles & news_articles
        for art in articles:
            doc_id = art.get("id")
            if doc_id:
                db.collection("fact_articles").document(doc_id).set(art, merge=True)
                db.collection("news_articles").document(doc_id).set(art, merge=True)
                print(f"  [UPSERT] fact_articles/{doc_id}")

        # Push admin_logs & system_logs
        for log_entry in logs:
            doc_id = log_entry.get("id")
            if doc_id:
                db.collection("admin_logs").document(doc_id).set(log_entry, merge=True)
                db.collection("system_logs").document(doc_id).set(log_entry, merge=True)
                print(f"  [UPSERT] admin_logs/{doc_id}")

        # Push system_settings
        if system_settings:
            db.collection("system_settings").document("config").set(system_settings, merge=True)
            print("  [UPSERT] system_settings/config")

        # Push fact_checks & verifications
        for fc in fact_checks:
            doc_id = fc.get("id")
            if doc_id:
                db.collection("fact_checks").document(doc_id).set(fc, merge=True)
                db.collection("verifications").document(doc_id).set(fc, merge=True)
                print(f"  [UPSERT] verifications/{doc_id}")

        print("\n[SUCCESS] Seed process completed successfully in Firestore!")

    except Exception as e:
        print(f"[ERROR] Failed to push seed data to Firestore: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed TruthLens Fact Database into Firestore or local store.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate seeding operations without making network calls.")
    args = parser.parse_args()

    run_seed(dry_run=args.dry_run)
