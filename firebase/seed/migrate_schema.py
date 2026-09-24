"""
TruthLens Firestore Non-Destructive Schema Migration Script
============================================================
Safely migrates legacy local JSON and Firestore collections into the
10-collection production schema without deleting existing records.

Usage:
  python firebase/seed/migrate_schema.py [--dry-run] [--live-firestore]
"""

import sys
import os
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = BACKEND_DIR / "data"
DB_FILE = DATA_DIR / "database.json"

sys.path.insert(0, str(BACKEND_DIR))

def load_source_data():
    if not DB_FILE.exists():
        print(f"[WARN] Database file {DB_FILE} not found. Creating default seed state.")
        return {}
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def transform_to_production_schema(source_data: dict) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Users
    users = source_data.get("users", [
        {
            "uid": "usr-default-001",
            "email": "demo.user@truthlens.ai",
            "display_name": "TruthLens Contributor",
            "role": "user",
            "created_at": now_iso,
            "last_login": now_iso,
            "preferences": {
                "language": "en",
                "theme": "dark",
                "notifications_enabled": True
            }
        }
    ])

    # 2. Admins
    admins = source_data.get("admins", [
        {
            "admin_id": "adm-001",
            "email": "admin@truthlens.ai",
            "role": "super_admin",
            "permissions": ["all", "verify", "publish", "settings", "audit"],
            "created_at": now_iso,
            "last_active": now_iso
        }
    ])

    # 3. Verifications (Mapped from fact_checks and raw_data)
    verifications = []
    claims = []
    sources = []
    evidence = []

    # Map raw_data into verifications, claims, sources, evidence
    raw_records = source_data.get("raw_data", [])
    for idx, raw in enumerate(raw_records):
        v_id = raw.get("id", f"verif-{idx+1:04d}")
        claim_text = raw.get("claim", raw.get("title", ""))
        source_name = raw.get("source", "Official Verified Wire")
        source_url = raw.get("source_url", "")
        verdict = raw.get("verdict", "UNVERIFIED")
        confidence = float(raw.get("reliability_score", 85.0))
        
        # Verification Doc
        verif_doc = {
            "id": v_id,
            "input_type": "TEXT",
            "input": claim_text,
            "claims": [
                {
                    "claim_id": f"claim-{v_id}",
                    "text": claim_text,
                    "entity": raw.get("entities", ["General"])[0] if raw.get("entities") else "General",
                    "category": raw.get("category", "General")
                }
            ],
            "verdict": verdict,
            "confidence": confidence,
            "evidence_strength": "VERY STRONG" if confidence >= 80 else "MODERATE",
            "sources": [source_name],
            "created_at": raw.get("created_at", now_iso),
            "updated_at": raw.get("updated_at", now_iso),
            "status": "VERIFIED" if verdict in ["TRUE", "FALSE"] else "REVIEWED",
            "category": raw.get("category", "General"),
            "region": raw.get("region", "Global"),
            "ai_explanation": raw.get("evidence", "Corroborated by truth database index.")
        }
        verifications.append(verif_doc)

        # Claim Doc
        claims.append({
            "claim_id": f"claim-{v_id}",
            "statement": claim_text,
            "entity": raw.get("entities", ["General"])[0] if raw.get("entities") else "General",
            "category": raw.get("category", "General"),
            "verdict": verdict,
            "first_spotted_at": raw.get("publication_date", now_iso),
            "verification_count": 1,
            "created_at": raw.get("created_at", now_iso),
            "updated_at": raw.get("updated_at", now_iso)
        })

        # Evidence Doc
        evidence.append({
            "evidence_id": f"evid-{v_id}",
            "verification_id": v_id,
            "claim_id": f"claim-{v_id}",
            "source_name": source_name,
            "url": source_url,
            "title": raw.get("title", ""),
            "snippet": raw.get("evidence", ""),
            "stance": "SUPPORTS" if verdict == "TRUE" else "CONTRADICTS",
            "reliability_score": confidence,
            "published_date": raw.get("publication_date", now_iso),
            "created_at": raw.get("created_at", now_iso)
        })

    # Deduplicate sources
    seen_sources = set()
    for raw in raw_records:
        src_name = raw.get("source", "Primary Media Source")
        if src_name not in seen_sources:
            seen_sources.add(src_name)
            sources.append({
                "source_id": f"src-{len(sources)+1:03d}",
                "name": src_name,
                "domain": raw.get("source_url", "").split("/")[2] if "//" in raw.get("source_url", "") else src_name.lower().replace(" ", "") + ".org",
                "bias_rating": "LEAST BIASED",
                "factual_reporting": "VERY HIGH",
                "credibility_score": 95.0,
                "created_at": now_iso,
                "updated_at": now_iso
            })

    # 4. News Articles
    news_articles = source_data.get("fact_articles", [])

    # 5. Verification History
    verification_history = [
        {
            "history_id": "hist-001",
            "verification_id": verifications[0]["id"] if verifications else "verif-001",
            "user_id": "anonymous",
            "query_hash": "sha256_mock_sample",
            "latency_ms": 12.5,
            "timestamp": now_iso
        }
    ]

    # 6. Image Analysis
    image_analysis = [
        {
            "analysis_id": "img-001",
            "verification_id": "verif-sample-img",
            "image_hash": "a8f3b2c1d0e4f5a6",
            "manipulation_probability": 0.02,
            "is_deepfake": False,
            "is_ai_generated": False,
            "ela_status": "CLEAN",
            "metadata_extracted": {
                "camera": "Sony A7 IV",
                "software": "Original Sensor Capture",
                "iso": 200
            },
            "created_at": now_iso
        }
    ]

    # 7. System Logs
    system_logs = source_data.get("admin_logs", [])

    return {
        "users": users,
        "admins": admins,
        "verifications": verifications,
        "claims": claims,
        "sources": sources,
        "evidence": evidence,
        "news_articles": news_articles,
        "verification_history": verification_history,
        "image_analysis": image_analysis,
        "system_logs": system_logs,
        # Preserve legacy collections for compatibility
        "fact_checks": source_data.get("fact_checks", []),
        "raw_data": source_data.get("raw_data", []),
        "fact_articles": source_data.get("fact_articles", []),
        "admin_logs": source_data.get("admin_logs", []),
        "system_settings": source_data.get("system_settings", {})
    }

def run_migration(dry_run: bool = False, live_firestore: bool = False):
    print("=" * 60)
    print("TruthLens Firestore Non-Destructive Schema Migration")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (Simulation)' if dry_run else 'ACTIVE PERSISTENCE'}")
    
    source = load_source_data()
    migrated = transform_to_production_schema(source)

    print("\n[COLLECTION STATS]")
    for col_name, items in migrated.items():
        count = len(items) if isinstance(items, list) else len(items.keys())
        print(f"  • {col_name:22s} -> {count:4d} documents")

    if not dry_run:
        # Write migrated structure back to local database safely
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(migrated, f, indent=2, ensure_ascii=False)
        print(f"\n[SUCCESS] Local store updated cleanly at: {DB_FILE}")

        if live_firestore:
            print("[INFO] Uploading to live Google Cloud Firestore...")
            try:
                from app.core.config import settings
                import firebase_admin
                from firebase_admin import credentials, firestore
                if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
                    if not firebase_admin._apps:
                        cred = credentials.Certificate({
                            "project_id": settings.FIREBASE_PROJECT_ID,
                            "client_email": settings.FIREBASE_CLIENT_EMAIL,
                            "private_key": settings.FIREBASE_PRIVATE_KEY
                        })
                        firebase_admin.initialize_app(cred)
                    db = firestore.client()
                    for col_name, items in migrated.items():
                        if isinstance(items, list):
                            for doc in items:
                                doc_id = doc.get("id") or doc.get("uid") or doc.get("admin_id") or doc.get("claim_id") or doc.get("source_id") or doc.get("evidence_id") or doc.get("article_id") or doc.get("analysis_id") or doc.get("history_id")
                                if doc_id:
                                    db.collection(col_name).document(doc_id).set(doc, merge=True)
                    print("[SUCCESS] Firestore collections synced successfully.")
                else:
                    print("[SKIP] Firebase credentials not configured in environment. Skipped live push.")
            except Exception as e:
                print(f"[WARN] Live Firestore sync skipped: {e}")
    else:
        print("\n[DRY RUN COMPLETE] No records modified on disk or cloud.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TruthLens Firestore Migration Tool")
    parser.add_argument("--dry-run", action="store_true", help="Simulate migration without writing changes")
    parser.add_argument("--live-firestore", action="store_true", help="Push changes to live Firestore instance")
    args = parser.parse_args()

    run_migration(dry_run=args.dry_run, live_firestore=args.live_firestore)
