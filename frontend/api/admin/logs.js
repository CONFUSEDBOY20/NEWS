/**
 * Admin Audit Logs Endpoint (/api/admin/logs)
 */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Administrative authentication required." });
  }

  const logs = [
    {
      id: "log-1",
      admin_id: "admin@truthlens.ai",
      action: "LOGIN",
      target_collection: "auth",
      target_id: "session",
      timestamp: new Date().toISOString(),
      details: "Admin session authenticated successfully",
      ip_address: "127.0.0.1"
    },
    {
      id: "log-2",
      admin_id: "admin@truthlens.ai",
      action: "UPDATE",
      target_collection: "system_settings",
      target_id: "thresholds",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      details: "Confidence threshold synchronized",
      ip_address: "127.0.0.1"
    }
  ];

  return res.status(200).json(logs);
}
