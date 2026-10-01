/**
 * Vercel Serverless Function: /api/news
 * ============================================================
 * Primary: GNews API (https://gnews.io/api/v4)
 * Fallback: Server-side RSS Parsers (BBC, The Hindu, The Guardian)
 * Caching: Cache-Control: s-maxage=600, stale-while-revalidate=300 (10 min cache)
 * Output Schema: { articles: [{ title, description, url, image, source, publishedAt }], source: string }
 */

const FALLBACK_RSS_FEEDS = [
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
];

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

function parseRssXml(xmlText, sourceName) {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s>].*?<\/item>/gs) || [];

  for (const itemXml of itemMatches.slice(0, 10)) {
    const titleMatch = itemXml.match(/<title>(.*?)<\/title>/s);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/s);
    const descMatch = itemXml.match(/<description>(.*?)<\/description>/s);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s);

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

    const title = cleanHtml(titleMatch?.[1]);
    const description = cleanHtml(descMatch?.[1]);
    const url = cleanHtml(linkMatch?.[1]);
    const publishedAt = pubDateMatch?.[1]
      ? new Date(pubDateMatch[1]).toISOString()
      : new Date().toISOString();

    if (title && url) {
      items.push({
        title,
        description: description || "No summary provided for this news report.",
        url,
        image: imageUrl || "",
        source: sourceName,
        publishedAt,
      });
    }
  }

  return items;
}

async function fetchRssFallbacks() {
  const allArticles = [];

  for (const feed of FALLBACK_RSS_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TruthLens/2.0; +https://truthlens.ai)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      if (response.ok) {
        const xml = await response.text();
        const parsed = parseRssXml(xml, feed.name);
        allArticles.push(...parsed);
      }
    } catch (err) {
      console.warn(`RSS fallback failed for ${feed.name}:`, err.message);
    }
  }

  // Deduplicate by title
  const seen = new Set();
  return allArticles.filter((art) => {
    const key = art.title.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Set 5-10 minute public CDN caching to stay strictly within 100 requests/day
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=300"
  );

  const { q, category, country } = req.query || {};
  const apiKey = process.env.GNEWS_API_KEY;

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        lang: "en",
        max: "10",
        apikey: apiKey,
      });

      let endpoint = "https://gnews.io/api/v4/top-headlines";

      if (q) {
        endpoint = "https://gnews.io/api/v4/search";
        params.set("q", q);
      } else {
        if (category && category.toLowerCase() !== "top" && category.toLowerCase() !== "all") {
          const catMap = {
            india: "nation",
            tech: "technology",
          };
          params.set("category", catMap[category.toLowerCase()] || category.toLowerCase());
        }
        if (country) {
          params.set("country", country.toLowerCase());
        } else if (category && category.toLowerCase() === "india") {
          params.set("country", "in");
        }
      }

      const gnewsRes = await fetch(`${endpoint}?${params.toString()}`);

      if (gnewsRes.ok) {
        const data = await gnewsRes.json();
        if (data?.articles && Array.isArray(data.articles) && data.articles.length > 0) {
          const normalized = data.articles.map((art) => ({
            title: art.title || "Untitled Article",
            description: art.description || "No synopsis available for this story.",
            url: art.url || "#",
            image: art.image || "",
            source: art.source?.name || "News Wire",
            publishedAt: art.publishedAt || new Date().toISOString(),
          }));

          return res.status(200).json({
            articles: normalized,
            source: "gnews.io",
            cached_at: new Date().toISOString(),
          });
        }
      }
      console.warn("GNews API returned non-OK or empty articles, invoking server RSS fallback");
    } catch (gnewsErr) {
      console.warn("GNews fetch failed:", gnewsErr.message);
    }
  }

  // Server-side RSS fallback when GNews hits limit or is unavailable
  try {
    const fallbackArticles = await fetchRssFallbacks();
    let filtered = fallbackArticles;

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(
        (a) => a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query)
      );
    }

    return res.status(200).json({
      articles: filtered.slice(0, 10),
      source: "rss_fallback",
      cached_at: new Date().toISOString(),
    });
  } catch (rssErr) {
    return res.status(500).json({
      error: "Unable to retrieve real-time news feeds.",
      details: rssErr.message,
    });
  }
}
