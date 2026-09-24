import urllib.request
import urllib.error
import json
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("truthlens.http")

class ResilientHTTPClient:
    """HTTP client with configurable timeout, retry logic, and user-agent rotation."""
    
    DEFAULT_TIMEOUT = 8.0  # seconds
    MAX_RETRIES = 2
    BACKOFF_FACTOR = 0.5
    
    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 TruthLens/2.0",
        "Accept": "application/json, text/html, application/xhtml+xml, */*",
        "Accept-Language": "en-US,en;q=0.9"
    }

    @classmethod
    def get(
        cls,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = MAX_RETRIES,
        as_json: bool = True
    ) -> Optional[Any]:
        req_headers = cls.DEFAULT_HEADERS.copy()
        if headers:
            req_headers.update(headers)
            
        req = urllib.request.Request(url, headers=req_headers, method="GET")
        
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    raw_data = response.read().decode("utf-8", errors="ignore")
                    if as_json:
                        return json.loads(raw_data)
                    return raw_data
            except urllib.error.HTTPError as e:
                logger.warning(f"HTTP GET {url} failed with status {e.code} (attempt {attempt + 1}/{retries + 1})")
                if e.code in [401, 403, 404]:
                    # Non-retryable client errors
                    return None
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                logger.warning(f"Network error on GET {url}: {e} (attempt {attempt + 1}/{retries + 1})")
            except Exception as e:
                logger.warning(f"Unexpected error on GET {url}: {e}")
                return None
                
            if attempt < retries:
                time.sleep(cls.BACKOFF_FACTOR * (2 ** attempt))
                
        return None

    @classmethod
    def post(
        cls,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = MAX_RETRIES,
        as_json: bool = True
    ) -> Optional[Any]:
        req_headers = cls.DEFAULT_HEADERS.copy()
        req_headers["Content-Type"] = "application/json"
        if headers:
            req_headers.update(headers)
            
        json_bytes = json.dumps(data).encode("utf-8") if data is not None else b""
        req = urllib.request.Request(url, data=json_bytes, headers=req_headers, method="POST")
        
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    raw_data = response.read().decode("utf-8", errors="ignore")
                    if as_json:
                        return json.loads(raw_data)
                    return raw_data
            except urllib.error.HTTPError as e:
                logger.warning(f"HTTP POST {url} failed with status {e.code} (attempt {attempt + 1}/{retries + 1})")
                if e.code in [400, 401, 403, 404, 422]:
                    return None
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                logger.warning(f"Network error on POST {url}: {e} (attempt {attempt + 1}/{retries + 1})")
            except Exception as e:
                logger.warning(f"Unexpected error on POST {url}: {e}")
                return None
                
            if attempt < retries:
                time.sleep(cls.BACKOFF_FACTOR * (2 ** attempt))
                
        return None
