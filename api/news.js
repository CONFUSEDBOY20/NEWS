/**
 * TruthLens Vercel API Proxy (/api/news)
 * Proxies requests to the real TruthLens FastAPI backend news engine on Render.
 * Zero client-side API keys; all news aggregation is handled by the multi-tier backend.
 */

export default async function handler(req, res) {
  const backendBase = process.env.VITE_API_URL || process.env.BACKEND_API_URL || "https://truthlens-api.onrender.com/api";
  
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const reqUrl = new URL(req.url, `https://${host}`);
    const search = reqUrl.search || "";
    
    // Forward to backend /api/news
    const targetUrl = `${backendBase.replace(/\/$/, "")}/news${search}`;
    const resp = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "TruthLens-Vercel-Proxy/2.0",
      },
    });

    const data = await resp.json();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=120");
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(503).json({
      error: "TruthLens backend news service is unreachable.",
      details: err.message,
    });
  }
}
