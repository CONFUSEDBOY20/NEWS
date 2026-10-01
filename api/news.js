/**
 * TruthLens Multi-Source News Aggregator (/api/news)
 * ============================================================
 * Vercel Serverless Function aggregating:
 * 1. Google News RSS (real-time live wire, zero key requirement)
 * 2. GNews API (process.env.GNEWS_API_KEY)
 * 3. NewsAPI (process.env.NEWS_API_KEY / process.env.NEWSAPI_KEY)
 * 4. NewsData.io (process.env.NEWSDATA_API_KEY)
 * 5. Institutional Fallback Feeds (BBC, The Hindu, The Guardian)
 *
 * Edge Caching:
 * Cache-Control: public, s-maxage=600, stale-while-revalidate=300 (10-minute CDN cache)
 *
 * Output Schema:
 * {
 *   articles: [{
 *     id: string,
 *     title: string,
 *     description: string,
 *     url: string,
 *     image: string,
 *     source: string,
 *     publishedAt: string,
 *     credibility_score: number,
 *     credibility_level: string
 *   }],
 *   sources_queried: string[],
 *   cached_at: string
 * }
 */

const HIGH_CREDIBILITY_SOURCES = [
  "reuters",
  "associated press",
  "ap news",
  "bbc",
  "bbc news",
  "afp",
  "agence france-presse",
  "bloomberg",
  "the hindu",
  "the guardian",
  "press trust of india",
  "pti",
  "pib",
  "press information bureau",
  "npr",
  "pbs",
  "nature",
  "science",
  "financial times",
];

const VERIFIED_PUBLISHERS = [
  "the new york times",
  "new york times",
  "nyt",
  "the washington post",
  "washington post",
  "wall street journal",
  "wsj",
  "times of india",
  "the times of india",
  "hindustan times",
  "the indian express",
  "indian express",
  "ndtv",
  "cnn",
  "techcrunch",
  "wired",
  "forbes",
  "the verge",
  "al jazeera",
  "dw",
  "deutsche welle",
];

function getSourceCredibility(sourceName) {
  if (!sourceName) {
    return { score: 80, level: "Syndicated Media" };
  }
  const clean = sourceName.toLowerCase().trim();
  const isHigh = HIGH_CREDIBILITY_SOURCES.some((s) => clean.includes(s));
  if (isHigh) {
    return { score: 96, level: "Accredited Wire" };
  }
  const isVerified = VERIFIED_PUBLISHERS.some((s) => clean.includes(s));
  if (isVerified) {
    return { score: 90, level: "Verified Publisher" };
  }
  return { score: 82, level: "Syndicated Media" };
}

function cleanHtml(raw) {
  if (!raw) return "";
  return raw
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseRssXml(xmlText, defaultSource = "News Wire") {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s>].*?<\/item>/gs) || [];

  for (const itemXml of itemMatches.slice(0, 15)) {
    const titleMatch = itemXml.match(/<title>(.*?)<\/title>/s);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/s);
    const descMatch = itemXml.match(/<description>(.*?)<\/description>/s);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s);
    const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/s);

    // Media & Image extraction
    const mediaContent = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const imgInsideDesc = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);

    const imageUrl =
      mediaContent?.[1] ||
      mediaThumbnail?.[1] ||
      enclosure?.[1] ||
      imgInsideDesc?.[1] ||
      "";

    let title = cleanHtml(titleMatch?.[1] || "");
    const description = cleanHtml(descMatch?.[1] || "");
    const url = cleanHtml(linkMatch?.[1] || "");
    let sourceName = cleanHtml(sourceMatch?.[1] || defaultSource);

    // If title has " - Source Name" at end (typical in Google News RSS), split it
    if (title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts.length > 1) {
        const potentialSource = parts.pop().trim();
        if (potentialSource && !sourceMatch) {
          sourceName = potentialSource;
        }
        title = parts.join(" - ").trim();
      }
    }

    const publishedAt = pubDateMatch?.[1]
      ? new Date(pubDateMatch[1]).toISOString()
      : new Date().toISOString();

    const cred = getSourceCredibility(sourceName);

    if (title && url) {
      items.push({
        id: `rss-${Buffer.from(url).toString("base64").substring(0, 16)}`,
        title,
        description: description || "Detailed reporting published via syndicated wire services.",
        url,
        image: imageUrl || "",
        source: sourceName,
        publishedAt,
        credibility_score: cred.score,
        credibility_level: cred.level,
      });
    }
  }

  return items;
}

// 1. Google News RSS (zero key, real-time live wire)
async function fetchGoogleNewsRss(query, category, country) {
  const isIndia =
    (country && country.toLowerCase() === "in") ||
    (category && (category.toLowerCase() === "india" || category.toLowerCase() === "nation"));

  let rssUrl = isIndia
    ? "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
    : "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";

  if (query) {
    rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${
      isIndia ? "en-IN&gl=IN&ceid=IN:en" : "en-US&gl=US&ceid=US:en"
    }`;
  } else if (category) {
    const cat = category.toLowerCase();
    if (cat === "world") {
      rssUrl = "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en";
    } else if (cat === "india" || cat === "nation") {
      rssUrl = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en";
    } else if (cat === "tech" || cat === "technology") {
      rssUrl = "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en";
    } else if (cat === "business") {
      rssUrl = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en";
    } else if (cat === "health") {
      rssUrl = "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en";
    }
  }

  const res = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error(`Google News RSS responded with ${res.status}`);
  const xml = await res.text();
  return parseRssXml(xml, isIndia ? "Google News India" : "Google News");
}

// 2. GNews API
async function fetchGNews(apiKey, query, category) {
  let url;
  if (query) {
    url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=${apiKey}`;
  } else {
    const catParam = category && category.toLowerCase() !== "top" ? `&category=${encodeURIComponent(category.toLowerCase())}` : "";
    url = `https://gnews.io/api/v4/top-headlines?lang=en&max=10${catParam}&apikey=${apiKey}`;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GNews responded with ${res.status}`);
  const data = await res.json();

  return (data.articles || []).map((art, idx) => {
    const cred = getSourceCredibility(art.source?.name);
    return {
      id: `gnews-${idx}-${Date.now()}`,
      title: art.title,
      description: art.description || "",
      url: art.url,
      image: art.image || "",
      source: art.source?.name || "GNews Wire",
      publishedAt: art.publishedAt || new Date().toISOString(),
      credibility_score: cred.score,
      credibility_level: cred.level,
    };
  });
}

// 3. NewsAPI
async function fetchNewsAPI(apiKey, query, category) {
  let url;
  if (query) {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&pageSize=10&apiKey=${apiKey}`;
  } else {
    const cat = category && category.toLowerCase() !== "top" ? `&category=${encodeURIComponent(category.toLowerCase())}` : "";
    url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=10${cat}&apiKey=${apiKey}`;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`NewsAPI responded with ${res.status}`);
  const data = await res.json();

  return (data.articles || []).map((art, idx) => {
    const cred = getSourceCredibility(art.source?.name);
    return {
      id: `newsapi-${idx}-${Date.now()}`,
      title: art.title,
      description: art.description || "",
      url: art.url,
      image: art.urlToImage || "",
      source: art.source?.name || "NewsAPI Wire",
      publishedAt: art.publishedAt || new Date().toISOString(),
      credibility_score: cred.score,
      credibility_level: cred.level,
    };
  });
}

// 4. NewsData.io API
async function fetchNewsData(apiKey, query, category) {
  let url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&language=en`;
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  } else if (category && category.toLowerCase() !== "top") {
    url += `&category=${encodeURIComponent(category.toLowerCase())}`;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`NewsData responded with ${res.status}`);
  const data = await res.json();

  return (data.results || []).map((art, idx) => {
    const sourceName = art.source_id || art.creator?.[0] || "NewsData Wire";
    const cred = getSourceCredibility(sourceName);
    return {
      id: `newsdata-${idx}-${Date.now()}`,
      title: art.title,
      description: art.description || "",
      url: art.link || art.source_url,
      image: art.image_url || "",
      source: sourceName,
      publishedAt: art.pubDate || new Date().toISOString(),
      credibility_score: cred.score,
      credibility_level: cred.level,
    };
  });
}

// 5. Additional Institutional RSS Feeds (BBC, The Hindu, The Guardian)
async function fetchInstitutionalRss(category, country) {
  const feeds = [];
  const cat = (category || "").toLowerCase();
  const isIndia = (country && country.toLowerCase() === "in") || cat === "india" || cat === "nation";

  if (isIndia) {
    feeds.push({ name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" });
  } else {
    feeds.push({ name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" });
    feeds.push({ name: "The Guardian", url: "https://www.theguardian.com/world/rss" });
  }

  const results = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TruthLens/2.0)" },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const xml = await res.text();
        results.push(...parseRssXml(xml, feed.name));
      }
    } catch {
      // Continue to next feed
    }
  }
  return results;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { q = "", category = "", country = "" } = req.query || {};

  // Edge Public CDN Caching (10 minutes with stale-while-revalidate)
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=300"
  );

  const articles = [];
  const sourcesQueried = [];

  // Aggregator tasks to run concurrently
  const tasks = [];

  // 1. Google News RSS (Always runs - fast, real-time, no key needed)
  sourcesQueried.push("Google News RSS");
  tasks.push(
    fetchGoogleNewsRss(q, category, country)
      .then((items) => ({ source: "Google News RSS", items }))
      .catch((err) => ({ source: "Google News RSS", error: err.message, items: [] }))
  );

  // 2. GNews (if key present in env)
  const gnewsKey = process.env.GNEWS_API_KEY;
  if (gnewsKey) {
    sourcesQueried.push("GNews API");
    tasks.push(
      fetchGNews(gnewsKey, q, category)
        .then((items) => ({ source: "GNews API", items }))
        .catch((err) => ({ source: "GNews API", error: err.message, items: [] }))
    );
  }

  // 3. NewsAPI (if key present in env)
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  if (newsApiKey) {
    sourcesQueried.push("NewsAPI");
    tasks.push(
      fetchNewsAPI(newsApiKey, q, category)
        .then((items) => ({ source: "NewsAPI", items }))
        .catch((err) => ({ source: "NewsAPI", error: err.message, items: [] }))
    );
  }

  // 4. NewsData.io (if key present in env)
  const newsDataKey = process.env.NEWSDATA_API_KEY;
  if (newsDataKey) {
    sourcesQueried.push("NewsData.io");
    tasks.push(
      fetchNewsData(newsDataKey, q, category)
        .then((items) => ({ source: "NewsData.io", items }))
        .catch((err) => ({ source: "NewsData.io", error: err.message, items: [] }))
    );
  }

  // 5. Institutional Feeds (BBC, The Hindu, The Guardian)
  sourcesQueried.push("Institutional RSS (BBC / The Hindu / The Guardian)");
  tasks.push(
    fetchInstitutionalRss(category, country)
      .then((items) => ({ source: "Institutional RSS", items }))
      .catch((err) => ({ source: "Institutional RSS", error: err.message, items: [] }))
  );

  // Await all aggregators concurrently
  const settled = await Promise.allSettled(tasks);

  for (const outcome of settled) {
    if (outcome.status === "fulfilled" && Array.isArray(outcome.value?.items)) {
      articles.push(...outcome.value.items);
    }
  }

  // Deduplicate articles by title similarity
  const seen = new Set();
  const deduplicated = [];

  for (const art of articles) {
    if (!art.title || !art.url) continue;
    const normalizedTitle = art.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .trim()
      .slice(0, 50);

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      deduplicated.push(art);
    }
  }

  // Sort by published date descending
  deduplicated.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return res.status(200).json({
    articles: deduplicated.slice(0, 30),
    total: deduplicated.length,
    sources_queried: sourcesQueried,
    cached_at: new Date().toISOString(),
    query: q || null,
    category: category || "all",
  });
}
