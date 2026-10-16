/**
 * Admin Raw Data CRUD Endpoint (/api/admin/raw-data)
 */
let MEMORY_RAW_DATA = [
  {
    id: "raw-001",
    title: "5G towers and biological cellular radiation",
    claim: "5G cellular frequencies cause biological cellular decay and respiratory infections",
    raw_text: "Viral WhatsApp forward claiming 5G network tests led to sudden respiratory hospital admissions.",
    source: "Viral Social Media",
    source_url: "https://twitter.com/example/status/123",
    category: "Health",
    language: "en",
    region: "Global",
    verdict: "FALSE",
    evidence: "Peer-reviewed analysis from WHO, FCC, and ICNIRP confirm non-ionizing RF spectrum safe within public guidelines.",
    tags: ["5G", "Health", "Cellular"],
    entities: ["5G", "WHO", "ICNIRP"],
    publication_date: "2026-09-12",
    verification_date: "2026-09-13",
    reliability_score: 98.0,
    notes: "Debunked by multiple institutional radiation councils.",
    image_url: null,
    created_by: "admin@truthlens.ai",
    created_at: "2026-09-13T10:00:00Z",
    updated_at: "2026-09-13T10:00:00Z",
    status: "PUBLISHED"
  },
  {
    id: "raw-002",
    title: "Free laptops scheme announced by Ministry of Education",
    claim: "Government announces free laptops for all students registering on third-party portal",
    raw_text: "Phishing SMS circulating offering immediate laptop dispatch upon paying registration processing fee.",
    source: "Phishing SMS Syndicate",
    source_url: "https://pib.gov.in/factcheck",
    category: "Economy",
    language: "en",
    region: "India",
    verdict: "FALSE",
    evidence: "Press Information Bureau (PIB) issued official clarification: No such laptop distribution portal operated by Central Ministry.",
    tags: ["PIB", "Scam", "Phishing"],
    entities: ["Ministry of Education", "PIB"],
    publication_date: "2026-09-20",
    verification_date: "2026-09-21",
    reliability_score: 99.0,
    notes: "Financial phishing campaign targeting students.",
    image_url: null,
    created_by: "admin@truthlens.ai",
    created_at: "2026-09-21T08:30:00Z",
    updated_at: "2026-09-21T08:30:00Z",
    status: "PUBLISHED"
  }
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Administrative authentication required." });
  }

  const { method } = req;
  const { category, verdict, search } = req.query || {};

  if (method === "GET") {
    let records = [...MEMORY_RAW_DATA];
    if (category && category !== "All") {
      records = records.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }
    if (verdict && verdict !== "All") {
      records = records.filter(r => r.verdict.toLowerCase() === verdict.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.claim.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
      );
    }
    return res.status(200).json(records);
  }

  if (method === "POST") {
    const record = req.body || {};
    const newRecord = {
      ...record,
      id: record.id || `raw-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "admin@truthlens.ai",
      status: record.status || "PUBLISHED"
    };
    MEMORY_RAW_DATA.unshift(newRecord);
    return res.status(201).json(newRecord);
  }

  return res.status(405).json({ detail: "Method Not Allowed." });
}
