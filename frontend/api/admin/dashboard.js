/**
 * Admin Dashboard Stats Endpoint (/api/admin/dashboard)
 */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // Check auth header
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Administrative authentication required." });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Return standard statistics compliant with DashboardOverviewStats schema
  const stats = {
    total_fact_checks: 142,
    today_checks: 18,
    false_claims_detected: 49,
    verified_claims: 68,
    pending_verification: 25,
    raw_data_records: 124,
    news_records_indexed: 532,
    api_usage_today: 87,
    verdict_distribution: {
      "TRUE": 34,
      "MOSTLY TRUE": 34,
      "PARTLY TRUE": 18,
      "MISLEADING": 28,
      "FALSE": 21,
      "UNVERIFIED": 5,
      "INSUFFICIENT EVIDENCE": 2
    },
    category_distribution: {
      "Politics": 42,
      "Technology": 31,
      "Health": 29,
      "Economy": 22,
      "Science": 11,
      "Climate": 7
    },
    daily_volume: [
      { date: "2026-10-10", volume: 15 },
      { date: "2026-10-11", volume: 18 },
      { date: "2026-10-12", volume: 22 },
      { date: "2026-10-13", volume: 19 },
      { date: "2026-10-14", volume: 25 },
      { date: "2026-10-15", volume: 29 },
      { date: todayStr, volume: 18 }
    ],
    regional_distribution: {
      "Global": 65,
      "India": 48,
      "World": 29
    }
  };

  return res.status(200).json(stats);
}
