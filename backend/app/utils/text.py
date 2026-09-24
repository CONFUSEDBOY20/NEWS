import re
import html
import unicodedata
from typing import List

def clean_text(text: str) -> str:
    """Sanitize and normalize text input."""
    if not text:
        return ""
    # Unescape HTML entities
    text = html.unescape(text)
    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)
    # Collapse multiple whitespace/newlines
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_keywords(text: str, max_words: int = 10) -> List[str]:
    """Extract informative keywords from text for search or cache matching."""
    cleaned = clean_text(text).lower()
    # Remove punctuation
    tokens = re.findall(r"\b[a-z0-9_]{3,}\b", cleaned)
    stop_words = {
        "the", "and", "for", "that", "this", "with", "from", "have", "will",
        "about", "what", "which", "there", "their", "they", "been", "were"
    }
    keywords = [tok for tok in tokens if tok not in stop_words]
    return keywords[:max_words]
