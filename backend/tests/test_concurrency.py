"""
Tests for FactDatabaseProvider concurrency safety.
"""

import asyncio
import json
import os
import pytest
from app.providers.fact_db_provider import FactDatabaseProvider


def _run(coro):
    return asyncio.run(coro)


def test_50_concurrent_save_fact_check_calls():
    """Fire 50 concurrent save_fact_check calls and verify JSON integrity and record count."""
    provider = FactDatabaseProvider()

    async def save_one(index: int):
        record = {
            "id": f"concurrent-check-{index}",
            "title": f"Concurrent Claim #{index}",
            "claim": f"Claim content {index}",
            "verdict": "TRUE",
            "confidence": 95.0,
            "verification_status": "VERIFIED"
        }
        return await provider.save_fact_check(record)

    async def run_all():
        tasks = [save_one(i) for i in range(50)]
        return await asyncio.gather(*tasks)

    results = _run(run_all())
    assert len(results) == 50

    db_path = provider.db_file
    assert os.path.exists(db_path)

    # Read and parse JSON file to ensure it's valid JSON
    with open(db_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    fact_checks = data.get("fact_checks", [])
    concurrent_records = [fc for fc in fact_checks if fc.get("id", "").startswith("concurrent-check-")]

    assert len(concurrent_records) == 50, f"Expected 50 concurrent records, found {len(concurrent_records)}"
    
    unique_ids = {fc["id"] for fc in concurrent_records}
    assert len(unique_ids) == 50, "All 50 concurrent records must have unique IDs saved in DB"
