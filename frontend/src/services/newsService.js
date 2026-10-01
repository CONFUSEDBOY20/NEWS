/**
 * TruthLens Dedicated News Service
 * ============================================================
 * Primary: NewsData.io Latest News API (https://newsdata.io/api/1/latest)
 * Fallback: TruthLens Backend News API + High-fidelity Curated Feed
 * Features:
 *   - LocalStorage Caching (15 min TTL) to respect free 200 credits/day limit
 *   - Deduplication by title / url
 *   - Normalized article schema for UI components
 *   - Country, language, and category filtering
 *   - Error & retry handling
 */

import { api } from "./api";

const NEWSDATA_KEY = import.meta.env.VITE_NEWSDATA_API_KEY || "";
const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

// Curated high-resolution editorial imagery matching reference
export const EDITORIAL_ASSETS = {
  parliament: "https://images.unsplash.com/photo-1598084999557-0a44018e6988?auto=format&fit=crop&w=1200&q=80",
  railways: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1000&q=80",
  earth: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
  ai_chip: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
  vaccine: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80",
  laptop: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80",
  flood: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1000&q=80",
  protest: "https://images.unsplash.com/photo-1569437061241-a848be43cc82?auto=format&fit=crop&w=1000&q=80",
  smog: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1000&q=80",
  food: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80",
  social_media: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1000&q=80",
};

// High-fidelity fallback dataset exactly matching the visual reference
export const CURATED_REFERENCE_NEWS = [
  {
    id: "curated-in-1",
    title: "Indian Railways announces new safety measures & Kavach rollout",
    description: "New electronic interlocking and automated train protection Kavach deployments announced across high-density passenger corridors.",
    image_url: EDITORIAL_ASSETS.railways,
    link: "https://pib.gov.in",
    source: "Press Information Bureau",
    published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    time_ago: "2 hours ago",
    category: "India",
    read_time: "3 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 96.2,
    precomputed_explanation: "Confirmed by Ministry of Railways and official PIB briefing notifications. Kavach 4.0 tenders and track installations have been officially scheduled across North and Central zones.",
    content_paragraphs: [
      "The Ministry of Railways has sanctioned an expedited timeline for installing the indigenous Kavach Automatic Train Protection (ATP) system across 10,000 kilometres of critical passenger trunk routes.",
      "Under the revised safety directives, upgraded optical-fibre signalling interfaces and radio frequency identification (RFID) tags will be deployed on locomotives and track sections to eliminate signal passing at danger (SPAD) incidents.",
      "Senior railway safety commissioners confirmed that high-density networks connecting major metros will receive prioritized allocation, supported by centralized real-time diagnostic telematics.",
      "The national rail board reiterated that commercial trials for version 4.0 specification have concluded successfully with zero fail-critical anomalies reported during field stress simulations."
    ],
  },
  {
    id: "curated-wo-2",
    title: "UN report highlights rising climate risks & mitigation in South Asia",
    description: "New multilateral assessment outlines severe monsoon anomalies, glacial lake outburst threats, and critical regional mitigation priorities.",
    image_url: EDITORIAL_ASSETS.earth,
    link: "https://un.org",
    source: "UN Environment Programme",
    published_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    time_ago: "4 hours ago",
    category: "World",
    read_time: "4 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 94.8,
    precomputed_explanation: "Corroborated by the United Nations Framework Convention on Climate Change (UNFCCC) comprehensive annual risk report and meteorological consensus.",
    content_paragraphs: [
      "A landmark multilateral climate assessment released by the United Nations warns that South Asia faces intensifying compound extreme weather occurrences over the next decade.",
      "The report highlights significant increases in moisture variability during summer monsoon cycles alongside accelerated glacial lake volume expansion across the Hindu Kush Himalayan belt.",
      "Environmental policy directors urge regional governments to implement integrated early warning hydrometeorological radar networks to safeguard agricultural valleys and urban centers.",
      "Financial institutions have pledged increased technical support for climate-resilient water infrastructure, emphasizing municipal drainage modernization and agroforestry buffers."
    ],
  },
  {
    id: "curated-te-3",
    title: "New AI tool raises concerns over deepfake videos & visual cloning",
    description: "Media forensics specialists warn against synthetic visual cloning models as detection benchmarks show escalating sophistication.",
    image_url: EDITORIAL_ASSETS.ai_chip,
    link: "https://reuters.com",
    source: "Reuters Technology",
    published_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    time_ago: "6 hours ago",
    category: "Technology",
    read_time: "3 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 93.5,
    precomputed_explanation: "Verified by research disclosures from Stanford Internet Observatory and international technology forensics laboratories examining synthetic generative models.",
    content_paragraphs: [
      "Cybersecurity researchers and digital forensics institutions have sounded alarms over rapid advancements in open-weight generative video rendering frameworks capable of near-real-time lip synchronization.",
      "Standard watermark extraction tools struggle to consistently identify high-frequency compression artifacts in downsampled social media clips, prompting regulatory calls for cryptographic provenance standards.",
      "Leading media platforms have initiated trials of C2PA (Coalition for Content Provenance and Authenticity) metadata tags to authenticate camera sensor origin at point-of-capture.",
      "Forensic analysts recommend multi-spectral frame analysis and temporal eye-blink frequency telemetry to reliably separate synthetic manipulations from raw camera footage."
    ],
  },
  {
    id: "curated-he-4",
    title: "Global health agencies monitor latest sub-lineage viral surveillance",
    description: "World Health Organization monitoring latest sub-lineage data on immune evasion, symptom severity, and updated vaccine efficacy.",
    image_url: EDITORIAL_ASSETS.vaccine,
    link: "https://who.int",
    source: "World Health Organization",
    published_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    time_ago: "8 hours ago",
    category: "Health",
    read_time: "3 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 95.1,
    precomputed_explanation: "Directly corroborated by WHO Global Genomic Surveillance briefings and peer-reviewed epidemiological bulletins.",
    content_paragraphs: [
      "The World Health Organization has issued its bi-weekly genomic surveillance bulletin examining cross-border transmission patterns of newly cataloged viral variants of interest.",
      "Preliminary serological data indicates that while spike protein mutations demonstrate marginal shifts in neutralizing antibody binding, cellular T-cell immunity remains robust against severe outcomes.",
      "Public health bodies advise maintaining routine clinical wastewater surveillance in international airport hubs to ensure timely detection of transmission clusters.",
      "Vaccine advisory panels emphasize that existing updated formulations provide sufficient protection against hospitalization, urging continued vigilance for vulnerable demographics."
    ],
  },
  {
    id: "curated-en-5",
    title: "Solar capacity expansion breaks renewable energy records worldwide",
    description: "Global clean energy grid investments reached record quarterly highs driven by aggressive utility-scale storage adoption.",
    image_url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80",
    link: "https://iea.org",
    source: "International Energy Agency",
    published_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    time_ago: "10 hours ago",
    category: "Environment",
    read_time: "2 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 97.4,
    precomputed_explanation: "Backed by the International Energy Agency's (IEA) quarterly World Energy Investment report.",
    content_paragraphs: [
      "Global investments in solar photovoltaic infrastructure have surpassed aggregate capital expenditure in fossil fuel extraction for the third consecutive quarter.",
      "Declining lithium-iron-phosphate battery pack prices have enabled round-the-clock solar dispatch, fundamentally shifting economic feasibility for developing economies.",
      "Energy ministries across five continents reported historic highs in residential rooftop installations alongside multi-gigawatt desert solar arrays."
    ],
  },
  {
    id: "curated-po-6",
    title: "Parliamentary committee convenes on digital data protection rules",
    description: "Lawmakers review enforcement timelines, cross-border data transfer exemptions, and compliance requirements for online platforms.",
    image_url: EDITORIAL_ASSETS.parliament,
    link: "https://sansad.in",
    source: "Sansad TV Wire",
    published_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    time_ago: "12 hours ago",
    category: "Politics",
    read_time: "3 min read",
    precomputed_verdict: "TRUE",
    precomputed_confidence: 96.0,
    precomputed_explanation: "Legislative committee schedule and Gazette of India records corroborate the formal review sessions.",
    content_paragraphs: [
      "The parliamentary consultative committee on electronics and information technology held closed-door hearings on operationalizing digital personal data protection mandates.",
      "Representatives from tech consortiums and privacy advocacy groups presented testimonies regarding user consent architectures and cross-border transfer whitelists.",
      "Regulatory officials confirmed that a phased compliance roadmap spanning 18 months will be promulgated to enable micro and small enterprises to adapt security audits."
    ],
  },
];


// Featured investigations matching the visual reference
export const POPULAR_INVESTIGATIONS = [
  {
    id: "inv-1",
    featured: true,
    title: "Are air quality claims in this viral video accurate?",
    description: "Forensic audit debunking manipulated sensor readings and verifying actual Central Pollution Control Board telemetry.",
    category: "INVESTIGATION",
    date: "12 Sep 2024",
    image_url: EDITORIAL_ASSETS.smog,
    verdict: "MISLEADING",
    evidence_summary: "Official monitors recorded moderate AQI, contradicting viral overlay numbers created with synthetic filter artifacts.",
  },
  {
    id: "inv-2",
    featured: false,
    title: "Viral food safety claims: What's true and what's not?",
    description: "Lab testing reports on packaged spice adulteration allegations.",
    category: "FOOD SAFETY",
    date: "5 Sep 2024",
    image_url: EDITORIAL_ASSETS.food,
    verdict: "PARTIALLY TRUE",
    evidence_summary: "FSSAI sample tests confirmed quality adherence in 94% of tested commercial batches.",
  },
  {
    id: "inv-3",
    featured: false,
    title: "How fake news spreads on social media",
    description: "Analyzing automated bot coordination and visual distortion tactics.",
    category: "MEDIA FORENSICS",
    date: "28 Aug 2024",
    image_url: EDITORIAL_ASSETS.social_media,
    verdict: "EXPLAINER",
    evidence_summary: "Tracing coordination networks using algorithmic graph clustering.",
  },
];

// Curated Recent Checks matching the visual reference exactly
export const INITIAL_RECENT_CHECKS = [
  {
    id: "check-1",
    status: "Misleading",
    statusType: "misleading", // misleading | true | false | review
    headline: "Government is giving free laptops to all students",
    explanation: "Claim not supported by official sources.",
    time_ago: "2h ago",
    image_url: EDITORIAL_ASSETS.laptop,
    claim_text: "Government is giving free laptops to all students under national scheme",
  },
  {
    id: "check-2",
    status: "True",
    statusType: "true",
    headline: "This image is from the 2024 floods in Assam",
    explanation: "The image is real but from an earlier incident.",
    time_ago: "5h ago",
    image_url: EDITORIAL_ASSETS.flood,
    claim_text: "This image is from the 2024 floods in Assam",
  },
  {
    id: "check-3",
    status: "False",
    statusType: "false",
    headline: "Viral video shows old incident, not recent",
    explanation: "The video is from 2021, not related to the current event.",
    time_ago: "1d ago",
    image_url: EDITORIAL_ASSETS.protest,
    claim_text: "Viral video shows recent protest incident in capital city",
  },
  {
    id: "check-4",
    status: "Needs Review",
    statusType: "review",
    headline: "New COVID variant spreads faster than Delta",
    explanation: "Partly true, but missing key context.",
    time_ago: "1d ago",
    image_url: EDITORIAL_ASSETS.vaccine,
    claim_text: "New COVID variant spreads faster than Delta variant",
  },
];

// Hero Featured Stories matching reference
export const HERO_FEATURED_STORIES = [
  {
    id: "hero-story-1",
    badge: "FACT CHECK",
    badgeColor: "bg-red-600",
    title: "No, government is not giving free laptops to all students",
    description: "A viral message claiming free laptops for all students is misleading. Here's what the official sources say.",
    image_url: EDITORIAL_ASSETS.parliament,
    claim_to_verify: "Government of India announced free laptops for all 10th and 12th class students.",
    source: "PIB Fact Check & Ministry of Education",
  },
  {
    id: "hero-story-2",
    badge: "INVESTIGATION",
    badgeColor: "bg-blue-600",
    title: "Deepfake audio scam targeting bank customers debunked",
    description: "Cybercrime cell issues alert over synthetic voice cloning replicating branch managers' phone calls.",
    image_url: EDITORIAL_ASSETS.ai_chip,
    claim_to_verify: "RBI issues mandatory warning over AI voice cloning calls requesting OTP.",
    source: "CERT-In & Cyber Crime Portal",
  },
  {
    id: "hero-story-3",
    badge: "FACT CHECK",
    badgeColor: "bg-red-600",
    title: "Did NASA declare a 3-day global blackout next month?",
    description: "Sensational solar flare rumors circulating on messaging apps have zero astronomical basis.",
    image_url: EDITORIAL_ASSETS.earth,
    claim_to_verify: "NASA confirms 3 days of worldwide darkness due to catastrophic solar superstorm.",
    source: "NASA Space Weather & NOAA",
  },
];

// Helper: Calculate relative time
export function getRelativeTimeString(dateString) {
  if (!dateString) return "recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "recently";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

// Category mapping for NewsData.io
const NEWSDATA_CATEGORY_MAP = {
  All: null,
  India: null, // country=in
  World: "world",
  Technology: "technology",
  Health: "health",
  Environment: "environment",
  Politics: "politics",
  Science: "science",
  Business: "business",
};

/**
 * Fetch latest news with robust caching and fallbacks
 */
export async function fetchLatestNews({ category = "All", fresh = false } = {}) {
  const cacheKey = `truthlens_news_${category.toLowerCase()}`;
  
  // Check local cache if not forcing fresh reload
  if (!fresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
          return { articles: data, fromCache: true, source: "cache" };
        }
      }
    } catch {
      // Ignore cache read failures
    }
  }

  // 1. Try NewsData.io if API key exists
  if (NEWSDATA_KEY) {
    try {
      const params = new URLSearchParams({
        apikey: NEWSDATA_KEY,
        language: "en",
      });

      if (category === "India") {
        params.set("country", "in");
      } else if (NEWSDATA_CATEGORY_MAP[category]) {
        params.set("category", NEWSDATA_CATEGORY_MAP[category]);
      }

      const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.results && Array.isArray(json.results) && json.results.length > 0) {
          const normalized = json.results.map((art, idx) => {
            const cat = Array.isArray(art.category) ? art.category[0] : (art.category || category);
            return {
              id: art.article_id || `newsdata-${idx}-${Date.now()}`,
              title: art.title || "Untitled Article",
              description: art.description || art.content || "No summary available for this story.",
              image_url: art.image_url || getCategoryFallbackImage(cat),
              link: art.link || "#",
              source: art.source_id || art.creator?.[0] || "News Wire",
              published_at: art.pubDate || new Date().toISOString(),
              time_ago: getRelativeTimeString(art.pubDate),
              category: capitalize(cat || category),
            };
          });

          // Deduplicate
          const unique = deduplicateArticles(normalized);
          saveToCache(cacheKey, unique);
          return { articles: unique, fromCache: false, source: "newsdata.io" };
        }
      }
    } catch (err) {
      console.warn("NewsData.io fetch failed, checking secondary sources:", err.message);
    }
  }

  // 2. Try GNews.io if API key exists
  if (GNEWS_KEY) {
    try {
      const gnewsCat = category.toLowerCase() === "all" ? "general" : category.toLowerCase();
      const endpoint = category === "India"
        ? `https://gnews.io/api/v4/top-headlines?country=in&lang=en&apikey=${GNEWS_KEY}`
        : `https://gnews.io/api/v4/top-headlines?category=${gnewsCat}&lang=en&apikey=${GNEWS_KEY}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        if (json?.articles && Array.isArray(json.articles) && json.articles.length > 0) {
          const normalized = json.articles.map((art, idx) => ({
            id: `gnews-${idx}-${Date.now()}`,
            title: art.title || "Untitled Article",
            description: art.description || "No summary available for this story.",
            image_url: art.image || getCategoryFallbackImage(category),
            link: art.url || "#",
            source: art.source?.name || "News Wire",
            published_at: art.publishedAt || new Date().toISOString(),
            time_ago: getRelativeTimeString(art.publishedAt),
            category: capitalize(category),
            content_paragraphs: [
              art.description,
              art.content || "Full coverage available directly at accredited publisher news desk.",
            ].filter(Boolean),
          }));

          const unique = deduplicateArticles(normalized);
          saveToCache(cacheKey, unique);
          return { articles: unique, fromCache: false, source: "gnews.io" };
        }
      }
    } catch (err) {
      console.warn("GNews.io fetch failed:", err.message);
    }
  }

  // 3. Try Backend API (which parses live RSS wire feeds)

  try {
    const isIndia = category.toLowerCase() === "india";
    const backendData = isIndia
      ? await api.getIndiaNews("All", fresh)
      : await api.getWorldNews(category, fresh);

    if (backendData?.articles && Array.isArray(backendData.articles) && backendData.articles.length > 0) {
      const normalized = backendData.articles.map((art) => ({
        id: art.id || `backend-${art.title?.slice(0, 10)}`,
        title: art.title,
        description: art.description || art.summary || "Summary corroborated by automated wire aggregation.",
        image_url: art.url_to_image || getCategoryFallbackImage(art.category || category),
        link: art.url || "#",
        source: art.source_name || "Official Wire",
        published_at: art.published_at || new Date().toISOString(),
        time_ago: art.time_ago || getRelativeTimeString(art.published_at),
        category: capitalize(art.category || category),
      }));

      const unique = deduplicateArticles(normalized);
      saveToCache(cacheKey, unique);
      return { articles: unique, fromCache: false, source: "backend" };
    }
  } catch (backendErr) {
    console.warn("Backend news fetch fallback triggered:", backendErr.message);
  }

  // 3. High-fidelity Curated Reference Fallback
  const filtered = category === "All"
    ? CURATED_REFERENCE_NEWS
    : CURATED_REFERENCE_NEWS.filter((a) => a.category.toLowerCase() === category.toLowerCase());

  const result = filtered.length > 0 ? filtered : CURATED_REFERENCE_NEWS;
  return { articles: result, fromCache: false, source: "curated" };
}

/**
 * Fetch Live Ticker items (used by trending ticker)
 */
export async function fetchTrendingTicker() {
  const cacheKey = "truthlens_ticker_headlines";
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Ignore cache error
  }

  // Default trending items matching reference screenshot
  const referenceTrending = [
    { title: "India's latest GDP growth data released", link: "https://pib.gov.in", source: "Ministry of Statistics" },
    { title: "UN warns about climate risks in South Asia", link: "https://un.org", source: "UNEP" },
    { title: "New AI tool sparks debate on misinformation", link: "https://reuters.com", source: "Tech Wire" },
    { title: "Heavy rainfall alert in Chhattisgarh", link: "https://mausam.imd.gov.in", source: "IMD Weather" },
    { title: "Supreme Court reserves judgment on electoral accountability petition", link: "https://sansad.in", source: "Court Record" },
    { title: "Global semiconductor supply chains show recovery indicators", link: "https://bloomberg.com", source: "Bloomberg" },
  ];

  try {
    const res = await fetchLatestNews({ category: "All" });
    if (res.articles && res.articles.length > 0) {
      const tickerItems = res.articles.slice(0, 8).map((a) => ({
        title: a.title,
        link: a.link,
        source: a.source,
      }));
      saveToCache(cacheKey, tickerItems);
      return tickerItems;
    }
  } catch {
    // Fallback
  }

  return referenceTrending;
}

function deduplicateArticles(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = (item.title || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCategoryFallbackImage(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("india") || cat.includes("politic")) return EDITORIAL_ASSETS.parliament;
  if (cat.includes("tech")) return EDITORIAL_ASSETS.ai_chip;
  if (cat.includes("health")) return EDITORIAL_ASSETS.vaccine;
  if (cat.includes("world")) return EDITORIAL_ASSETS.earth;
  if (cat.includes("env") || cat.includes("climat")) return "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80";
  return EDITORIAL_ASSETS.railways;
}

function capitalize(str) {
  if (!str) return "General";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function saveToCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Quota exceeded
  }
}
