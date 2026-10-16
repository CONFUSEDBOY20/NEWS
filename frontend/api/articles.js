/**
 * Fact Articles & Dossiers endpoint for TruthLens Vercel Serverless environment
 */
const SEED_ARTICLES = [
  {
    id: "art-001",
    title: "Anatomy of a Viral Deepfake: How Synthetic Media Manipulates Elections",
    slug: "anatomy-of-a-viral-deepfake-elections",
    summary: "An in-depth investigation into modern generative video pipelines, voice cloning tactics, and how journalists detect forensic artifacts.",
    content: "### The Evolution of Synthetic Deception\n\nIn recent months, synthetic media has evolved from easily detectable distortions to photorealistic generative video capable of misleading even seasoned observers...\n\n### Key Detection Signals\n\n1. **Phoneme Discrepancies**: Subtle mismatches between mouth articulation and audio transients.\n2. **Lighting Inconsistencies**: Specular reflections in pupils that do not match background lighting vectors.\n3. **Spectral Voice Anomalies**: Harmonic frequency dropouts characteristic of diffusion-based neural vocoders.\n\n### Best Practices for Digital Consumers\n\nAlways verify breaking audio/video clips through primary publisher channels and independent institutional fact-checking repositories.",
    category: "Technology",
    thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    tags: ["Deepfake", "AI", "Election Security", "Media Literacy"],
    author: "TruthLens Investigation Team",
    published_at: "2026-07-28T10:00:00Z",
    verdict_context: "MISLEADING",
    read_time_minutes: 5,
    is_featured: true,
    status: "PUBLISHED"
  },
  {
    id: "art-002",
    title: "Disinformation Pipelines in Public Health: Analyzing Coordinated Bot Networks",
    slug: "disinformation-pipelines-public-health-bots",
    summary: "Quantitative forensic breakdown of automated sockpuppet networks spreading unverified pharmaceutical claims across microblogging platforms.",
    content: "### Tracking Bot Amplification\n\nPublic health discussions frequently experience artificial velocity spikes driven by automated accounts operating in synchronized clusters...\n\n### Network Metrics\n\n- **Temporal Synchrony**: Over 800 accounts posting identical message structures within 120-second windows.\n- **Account Age**: Over 70% of propagating nodes were registered under 45 days prior to campaign initiation.\n- **Linguistic Markers**: Repeated grammatical anomalies typical of automated multi-hop translations.",
    category: "Health",
    thumbnail_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    tags: ["Public Health", "Bots", "Network Analysis", "Disinformation"],
    author: "TruthLens Data Unit",
    published_at: "2026-08-14T14:30:00Z",
    verdict_context: "FALSE",
    read_time_minutes: 7,
    is_featured: true,
    status: "PUBLISHED"
  },
  {
    id: "art-003",
    title: "The Financial Incentive of Clickbait: Ad-Tech Arbitrage Behind Fabricated Outrage",
    slug: "financial-incentive-clickbait-ad-tech",
    summary: "Follow the money: How programmatic ad exchanges inadvertently fund hyper-partisan falsehoods and synthetic content farms.",
    content: "### Monetizing Uncertainty\n\nFabricated outrage relies on programmatic display advertising to generate revenue through sensationalized claims designed for high click-through rates.\n\n### The Ad Arbitrage Cycle\n\n1. Sensational headline generated to trigger emotional engagement.\n2. Social algorithmic distribution amplifies engagement through outrage.\n3. Impressions delivered across programmatic ad networks before content verification occurs.",
    category: "Economy",
    thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    tags: ["AdTech", "Monetization", "Economy", "Media Literacy"],
    author: "TruthLens Investigative Unit",
    published_at: "2026-09-02T09:15:00Z",
    verdict_context: "MISLEADING",
    read_time_minutes: 6,
    is_featured: false,
    status: "PUBLISHED"
  }
];

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");

  const { category, id } = req.query;

  if (id) {
    const article = SEED_ARTICLES.find((a) => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ detail: "Article not found" });
    }
    return res.status(200).json(article);
  }

  let results = SEED_ARTICLES;
  if (category && category !== "All") {
    results = results.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  }

  return res.status(200).json(results);
}
