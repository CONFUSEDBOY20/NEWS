/**
 * Forward multipart image checks to the TruthLens backend.
 * This keeps detector credentials and image processing on the server.
 */
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method Not Allowed. Use POST." });
  }

  const configuredBase = process.env.BACKEND_API_URL || "https://truthlens-api.onrender.com/api";
  if (!/^https:\/\//i.test(configuredBase)) {
    return res.status(503).json({ detail: "Image analysis backend is not configured." });
  }

  const target = `${configuredBase.replace(/\/$/, "")}/fact-check/image`;
  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": req.headers["content-type"] || "multipart/form-data",
        ...(req.headers["content-length"] ? { "Content-Length": req.headers["content-length"] } : {}),
      },
      body: req,
      duplex: "half",
      signal: AbortSignal.timeout(55_000),
    });
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("Image analysis backend request failed:", error?.message || error);
    return res.status(503).json({ detail: "Image analysis backend is unavailable." });
  }
}
