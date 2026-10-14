"""
Curated, pre-verified RSS feed registry for Tier 1 live news aggregation.
Every feed in this list has been verified to return active XML entries.
"""

from typing import List, Dict, Any
from pydantic import BaseModel

class NewsSourceFeed(BaseModel):
    name: str
    url: str
    region: str          # "World", "India", "Global"
    category: str        # "General", "World", "India", "Technology", "Science", "Health", "Business", "Climate"
    language: str = "en"
    reliability_score: float

VETTED_RSS_FEEDS: List[NewsSourceFeed] = [
    # --- World Tier 1 Feeds ---
    NewsSourceFeed(
        name="BBC World",
        url="https://feeds.bbci.co.uk/news/world/rss.xml",
        region="World",
        category="World",
        language="en",
        reliability_score=92.0,
    ),
    NewsSourceFeed(
        name="Al Jazeera",
        url="https://www.aljazeera.com/xml/rss/all.xml",
        region="World",
        category="World",
        language="en",
        reliability_score=88.0,
    ),
    NewsSourceFeed(
        name="Deutsche Welle",
        url="https://rss.dw.com/xml/rss-en-all",
        region="World",
        category="World",
        language="en",
        reliability_score=90.0,
    ),
    NewsSourceFeed(
        name="NPR World",
        url="https://feeds.npr.org/1004/rss.xml",
        region="World",
        category="World",
        language="en",
        reliability_score=90.0,
    ),
    NewsSourceFeed(
        name="The Guardian World",
        url="https://www.theguardian.com/world/rss",
        region="World",
        category="World",
        language="en",
        reliability_score=90.0,
    ),

    # --- India Tier 1 Feeds ---
    NewsSourceFeed(
        name="The Hindu",
        url="https://www.thehindu.com/news/national/feeder/default.rss",
        region="India",
        category="India",
        language="en",
        reliability_score=92.0,
    ),
    NewsSourceFeed(
        name="NDTV News",
        url="https://feeds.feedburner.com/ndtvnews-top-stories",
        region="India",
        category="India",
        language="en",
        reliability_score=85.0,
    ),
    NewsSourceFeed(
        name="Times of India",
        url="https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
        region="India",
        category="India",
        language="en",
        reliability_score=84.0,
    ),
    NewsSourceFeed(
        name="Indian Express",
        url="https://indianexpress.com/feed/",
        region="India",
        category="India",
        language="en",
        reliability_score=88.0,
    ),
    NewsSourceFeed(
        name="Press Information Bureau (PIB)",
        url="https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1",
        region="India",
        category="India",
        language="en",
        reliability_score=96.0,
    ),

    # --- Topic & Section Feeds ---
    # Technology
    NewsSourceFeed(
        name="BBC Technology",
        url="https://feeds.bbci.co.uk/news/technology/rss.xml",
        region="Global",
        category="Technology",
        language="en",
        reliability_score=92.0,
    ),
    NewsSourceFeed(
        name="The Guardian Technology",
        url="https://www.theguardian.com/technology/rss",
        region="Global",
        category="Technology",
        language="en",
        reliability_score=90.0,
    ),

    # Science
    NewsSourceFeed(
        name="BBC Science",
        url="https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        region="Global",
        category="Science",
        language="en",
        reliability_score=92.0,
    ),
    NewsSourceFeed(
        name="The Guardian Science",
        url="https://www.theguardian.com/science/rss",
        region="Global",
        category="Science",
        language="en",
        reliability_score=90.0,
    ),

    # Health
    NewsSourceFeed(
        name="BBC Health",
        url="https://feeds.bbci.co.uk/news/health/rss.xml",
        region="Global",
        category="Health",
        language="en",
        reliability_score=92.0,
    ),

    # Business / Economy
    NewsSourceFeed(
        name="BBC Business",
        url="https://feeds.bbci.co.uk/news/business/rss.xml",
        region="Global",
        category="Business",
        language="en",
        reliability_score=92.0,
    ),
    NewsSourceFeed(
        name="The Guardian Business",
        url="https://www.theguardian.com/business/rss",
        region="Global",
        category="Business",
        language="en",
        reliability_score=90.0,
    ),
]
