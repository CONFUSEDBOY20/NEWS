/**
 * Admin Authentication Endpoint (/api/admin/login)
 */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method Not Allowed. Use POST." });
  }

  const { email, password } = req.body || {};
  const expectedEmail = process.env.ADMIN_EMAIL || "admin@truthlens.ai";
  const expectedPassword = process.env.ADMIN_PASSWORD || "TruthLens@2026AdminSecretKey!";

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required." });
  }

  if (email.trim().toLowerCase() === expectedEmail.toLowerCase() && password === expectedPassword) {
    // Generate valid base64url token
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      sub: email.trim(),
      role: "Super Admin",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    })).toString("base64url");
    const token = `${header}.${payload}.sig_${Math.random().toString(36).substring(2, 15)}`;

    return res.status(200).json({
      access_token: token,
      token_type: "bearer",
      admin: {
        email: email.trim(),
        name: "System Administrator",
        role: "Super Admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
      }
    });
  }

  return res.status(401).json({ detail: "Invalid administrative email or security password." });
}
