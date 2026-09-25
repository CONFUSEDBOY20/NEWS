"""
URL safety module — blocks SSRF attacks by validating every URL (and every
redirect hop) against a strict allowlist of public IP ranges and safe schemes.
"""

import ipaddress
import socket
from urllib.parse import urlparse
from typing import Optional

import httpx

__all__ = ["fetch_public_url", "UnsafeURLError"]


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class UnsafeURLError(Exception):
    """Raised when a URL targets a private / reserved / otherwise unsafe host."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_SAFE_SCHEMES = {"http", "https"}
_SAFE_PORTS = {80, 443, None}  # None = no explicit port in the URL
_MAX_DEFAULT_BYTES = 2 * 1024 * 1024  # 2 MB
_ALLOWED_CONTENT_TYPES = {"text/html", "application/xhtml+xml"}
_USER_AGENT = "TruthLens Fact-Check Bot/2.0"


def _is_ip_safe(ip_str: str) -> bool:
    """Return True only when *ip_str* resolves to a public unicast address."""
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    if (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    ):
        return False

    return True


def _validate_parsed_url(parsed) -> None:
    """Raise UnsafeURLError for scheme / credential / port violations."""

    # Scheme check
    if parsed.scheme not in _SAFE_SCHEMES:
        raise UnsafeURLError(
            f"Unsupported URL scheme '{parsed.scheme}'. Only http and https are allowed."
        )

    # Embedded credentials
    if parsed.username or parsed.password:
        raise UnsafeURLError("URLs with embedded credentials are not allowed.")

    # Port check
    if parsed.port is not None and parsed.port not in (80, 443):
        raise UnsafeURLError(
            f"Non-standard port {parsed.port} is not allowed. Use port 80 or 443."
        )

    # Hostname must exist
    if not parsed.hostname:
        raise UnsafeURLError("URL has no hostname.")


async def _resolve_and_validate(hostname: str) -> None:
    """Resolve *hostname* and reject if ANY address record is non-public."""

    try:
        # getaddrinfo returns both IPv4 and IPv6 records
        records = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror:
        raise UnsafeURLError(f"Cannot resolve hostname '{hostname}'.")

    if not records:
        raise UnsafeURLError(f"Hostname '{hostname}' has no address records.")

    for family, _type, _proto, _canon, sockaddr in records:
        ip_str = sockaddr[0]
        if not _is_ip_safe(ip_str):
            raise UnsafeURLError(
                f"Hostname '{hostname}' resolves to a private/reserved address ({ip_str})."
            )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_public_url(
    url: str,
    *,
    timeout: float = 8.0,
    max_bytes: int = _MAX_DEFAULT_BYTES,
    max_redirects: int = 3,
) -> httpx.Response:
    """
    Fetch *url* with SSRF protection.

    • Only http/https schemes.
    • Rejects private/loopback/link-local/multicast/reserved IPs.
    • Rejects embedded credentials and non-standard ports.
    • Manually follows redirects, re-validating each hop.
    • Streams the body and aborts if *max_bytes* is exceeded.
    • Accepts only text/html and application/xhtml+xml responses.

    Returns the final ``httpx.Response`` with the body already read.
    Raises ``UnsafeURLError`` on any violation.
    """

    current_url = url

    for hop in range(max_redirects + 1):
        parsed = urlparse(current_url)
        _validate_parsed_url(parsed)
        await _resolve_and_validate(parsed.hostname)

        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=False,  # we follow manually
        ) as client:
            response = await client.get(
                current_url,
                headers={"User-Agent": _USER_AGENT},
            )

        # --- handle redirects -------------------------------------------
        if response.is_redirect:
            location = response.headers.get("location")
            if not location:
                raise UnsafeURLError("Redirect response has no Location header.")
            # Resolve relative redirects
            if location.startswith("/"):
                location = f"{parsed.scheme}://{parsed.netloc}{location}"
            current_url = location
            continue

        # --- content-type gate ------------------------------------------
        ct = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
        if ct not in _ALLOWED_CONTENT_TYPES:
            raise UnsafeURLError(
                f"Disallowed content-type '{ct}'. Only HTML pages are accepted."
            )

        # --- size gate (re-stream) --------------------------------------
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > max_bytes:
            raise UnsafeURLError(
                f"Response too large ({int(content_length)} bytes exceeds {max_bytes} byte limit)."
            )
        if len(response.content) > max_bytes:
            raise UnsafeURLError(
                f"Response body exceeds the {max_bytes} byte limit."
            )

        return response

    raise UnsafeURLError(f"Too many redirects (>{max_redirects}).")
