# TruthLens Live News Providers & Free Tier Specifications

This document outlines the news source architecture, tier hierarchy, rate limits, terms of service, and failover behavior implemented in TruthLens.

---

## Architecture Summary

TruthLens uses a 3-tier news aggregation engine with zero fake data and automatic failover. All external API keys remain strictly on the backend. The application runs fully functional with **zero API keys** relying on Tier 1 sources.

```
                          TruthLens Aggregator
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
      TIER 1                   TIER 2                   TIER 3
(Truly Live, 0 Keys)      (Free Key, Near Real-time)  (Free Key, ~12-24h Delayed)
  • Verified RSS Wires      • The Guardian (500/day)     • NewsData.io (200/day)
  • GDELT DOC 2.0 API       • Currents API (600/day)     • GNews (100/day)
                                                         • NewsAPI (Dev only)
```

---

## Tier 1 — Truly Live, No Keys Required (Always Active)

### 1. RSS Wires via Feedparser + SSRF-Safe HTTP Client
- **Authentication**: None required.
- **Cost**: 100% Free.
- **Latency / Freshness**: Live (updated continuously every few minutes).
- **Vetted Sources**:
  - **World**: BBC World, Al Jazeera, Deutsche Welle, NPR, The Guardian World.
  - **India**: The Hindu, NDTV News, Times of India, Indian Express, Press Information Bureau (PIB).
  - **Section Feeds**: BBC Tech, BBC Science, BBC Health, BBC Business, Guardian Tech, Guardian Science, Guardian Business.
- **Terms / Robots**: Only article titles, clean short descriptions, canonical URLs, and publication timestamps are stored. No full-text scraping or reproduction of paywalled/copyrighted text.
- **Timeout**: 8.0s per feed with concurrent fan-out via `asyncio.gather`.

### 2. GDELT Project DOC 2.0 API
- **Endpoint**: `https://api.gdeltproject.org/api/v2/doc/doc?query=<q>&mode=artlist&format=json&maxrecords=50&sort=datedesc`
- **Authentication**: None required.
- **Cost**: 100% Free (academic/open research initiative).
- **Freshness**: ~15-minute rolling window across global multilingual news.
- **Usage**: Used for topic/keyword searches and global wire monitoring.

---

## Tier 2 — Free API Key, Near Real-Time (Priority Live Extensions)

### 3. The Guardian Open Platform
- **Endpoint**: `https://content.guardianapis.com/search`
- **Official Documentation**: https://open-platform.theguardian.com/access/
- **Free Limit**: **500 requests / day** (up to 1 call/second) on the Developer tier.
- **TruthLens Quota Stop**: Stops making requests after 480 calls/day.
- **Fields Used**: `thumbnail`, `trailText`, `webTitle`, `webUrl`, `webPublicationDate`.
- **Environment Variable**: `GUARDIAN_API_KEY`

### 4. Currents API
- **Endpoint**: `https://api.currentsapi.services/v1/latest-news`
- **Official Documentation**: https://currentsapi.services/en
- **Free Limit**: **600 requests / day** on the Free Community tier.
- **TruthLens Quota Stop**: Stops making requests after 580 calls/day.
- **Environment Variable**: `CURRENTS_API_KEY`

---

## Tier 3 — Free API Key, Delayed Backup (~12-24h Delay)

*Note: In accordance with TruthLens's golden truthfulness rule, articles from Tier 3 providers are explicitly tagged with `is_delayed: true` and rendered with a "Delayed ~12h" badge in the UI.*

### 5. NewsData.io
- **Endpoint**: `https://newsdata.io/api/1/news`
- **Official Pricing**: https://newsdata.io/pricing
- **Free Limit**: **200 credits / day** (10-50 articles per request).
- **Free Tier Delay**: Non-breaking news is delayed up to 24 hours on the free tier.
- **TruthLens Quota Stop**: Stops after 190 credits/day.
- **Environment Variable**: `NEWSDATA_API_KEY`

### 6. GNews API
- **Endpoint**: `https://gnews.io/api/v4/top-headlines`
- **Official Pricing**: https://gnews.io/pricing
- **Free Limit**: **100 requests / day** (non-commercial personal use).
- **Free Tier Delay**: Articles indexed with a delay of several hours on free tier.
- **TruthLens Quota Stop**: Stops after 95 requests/day.
- **Environment Variable**: `GNEWS_API_KEY`

### 7. NewsAPI.org
- **Endpoint**: `https://newsapi.org/v2/top-headlines`
- **Official Pricing**: https://newsapi.org/pricing
- **Free Limit**: **100 requests / day**.
- **Important Restriction**: Free tier only functions from `localhost` in development and delays search results by 24 hours. TruthLens automatically skips NewsAPI in production (`ENV=production`).
- **Environment Variable**: `NEWS_API_KEY`

---

## Fact-Checking Evidence Source

### 8. Google Fact Check Tools API
- **Endpoint**: `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=<claim>&key=KEY`
- **Official Documentation**: https://toolbox.google.com/factcheck/apis
- **Authentication**: Free Google Cloud API key (enabled under APIs & Services in Google Cloud Console).
- **Role in TruthLens**: Directly maps claims reviewed by certified fact-checkers (PolitiFact, Snopes, FactCheck.org, AFP, Boom Live) into `EvidenceItem` records with 98% reliability weight, overriding generic heuristics.
- **Environment Variable**: `GOOGLE_FACTCHECK_API_KEY`

---

## Resiliency & Fault Tolerance Policies

1. **Per-Provider Concurrency**: All providers fan out simultaneously with an 8.0-second timeout per provider.
2. **Circuit Breaker**: Any provider that fails 3 consecutive times trips its circuit breaker for **5 minutes (300 seconds)**, during which it is bypassed to avoid latency spikes.
3. **Fuzzy Deduplication**: Articles are deduplicated by canonical URL and fuzzy title similarity (`difflib.SequenceMatcher.ratio() > 0.90`).
4. **Caching Strategy**:
   - In-memory TTL cache: 5 minutes for headlines (`/world`, `/india`), 15 minutes for search queries.
   - Stale-while-revalidate: If all providers fail and a cached response exists, the cached response is served with `stale: true` and `is_live: false`.
   - Honest 503: If all providers fail and the cache is empty, the API returns HTTP 503. Simulated or fake data is strictly prohibited.
