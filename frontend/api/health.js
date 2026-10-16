/**
 * Health check endpoint for TruthLens Vercel Serverless environment
 */
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.status(200).json({
    status: "healthy",
    version: "2.0.0",
    service: "truthlens-api",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString()
  });
}
