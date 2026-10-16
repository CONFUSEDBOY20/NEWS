/**
 * Admin System Settings Endpoint (/api/admin/settings)
 */
let CURRENT_SETTINGS = {
  news_categories: ["All", "Politics", "Technology", "Health", "Economy", "Climate", "Science", "Entertainment"],
  supported_languages: [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi (हिंदी)" }
  ],
  confidence_threshold_true: 80.0,
  confidence_threshold_partial: 55.0,
  enabled_providers: {
    fact_database: true,
    news_api: true,
    gemini_ai: true,
    search_graph: true,
    image_forensics: true
  },
  cache_duration_hours: 4,
  rate_limit_per_minute: 60,
  maintenance_mode: false,
  allow_public_submissions: true
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Administrative authentication required." });
  }

  if (req.method === "POST") {
    CURRENT_SETTINGS = { ...CURRENT_SETTINGS, ...req.body };
    return res.status(200).json(CURRENT_SETTINGS);
  }

  return res.status(200).json(CURRENT_SETTINGS);
}
