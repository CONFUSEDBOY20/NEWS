"""
Tests for backend/app/utils/url_safety.py — SSRF protection.

All DNS and HTTP calls are mocked so these tests never touch the real network.
"""

import pytest
import socket
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.utils.url_safety import fetch_public_url, UnsafeURLError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(coro):
    """Helper to run async functions synchronously without pytest-asyncio."""
    return asyncio.run(coro)


def _make_addrinfo(ip: str, family=socket.AF_INET):
    """Simulate one socket.getaddrinfo result tuple."""
    return (family, socket.SOCK_STREAM, 6, "", (ip, 0))


def _patch_dns(ip: str, family=socket.AF_INET):
    """Return a patch that makes every hostname resolve to *ip*."""
    return patch(
        "app.utils.url_safety.socket.getaddrinfo",
        return_value=[_make_addrinfo(ip, family)],
    )


def _patch_dns_multi(ips: list[str]):
    """Resolve to multiple IPs (e.g. one safe, one unsafe)."""
    results = [_make_addrinfo(ip) for ip in ips]
    return patch("app.utils.url_safety.socket.getaddrinfo", return_value=results)


def _html_response(body: str = "<html><body>ok</body></html>", status: int = 200, headers=None):
    """Build a fake httpx.Response with text/html content-type."""
    h = {"content-type": "text/html; charset=utf-8"}
    if headers:
        h.update(headers)
    request = httpx.Request("GET", "https://example.com")
    return httpx.Response(
        status_code=status,
        headers=h,
        content=body.encode(),
        request=request,
    )


def _redirect_response(location: str, status: int = 302):
    """Build a fake redirect response."""
    request = httpx.Request("GET", "https://example.com")
    return httpx.Response(
        status_code=status,
        headers={"location": location},
        content=b"",
        request=request,
    )


def _mock_client(response):
    """Return an AsyncMock httpx.AsyncClient whose .get() yields *response*."""
    client_inst = AsyncMock()
    client_inst.get = AsyncMock(return_value=response)
    client_inst.__aenter__ = AsyncMock(return_value=client_inst)
    client_inst.__aexit__ = AsyncMock(return_value=False)
    return client_inst


# ---------------------------------------------------------------------------
# Tests: scheme validation
# ---------------------------------------------------------------------------

class TestSchemeValidation:
    def test_file_scheme_rejected(self):
        with pytest.raises(UnsafeURLError, match="scheme"):
            _run(fetch_public_url("file:///etc/passwd"))

    def test_ftp_scheme_rejected(self):
        with pytest.raises(UnsafeURLError, match="scheme"):
            _run(fetch_public_url("ftp://mirror.example.com/pub"))

    def test_data_scheme_rejected(self):
        with pytest.raises(UnsafeURLError, match="scheme"):
            _run(fetch_public_url("data:text/html,<h1>hi</h1>"))

    def test_javascript_scheme_rejected(self):
        with pytest.raises(UnsafeURLError, match="scheme"):
            _run(fetch_public_url("javascript:alert(1)"))


# ---------------------------------------------------------------------------
# Tests: credentials in URL
# ---------------------------------------------------------------------------

class TestCredentials:
    def test_url_with_user_pass_rejected(self):
        with pytest.raises(UnsafeURLError, match="credentials"):
            _run(fetch_public_url("https://admin:secret@example.com/page"))

    def test_url_with_user_only_rejected(self):
        with pytest.raises(UnsafeURLError, match="credentials"):
            _run(fetch_public_url("https://admin@example.com/page"))


# ---------------------------------------------------------------------------
# Tests: port validation
# ---------------------------------------------------------------------------

class TestPorts:
    def test_non_standard_port_rejected(self):
        with pytest.raises(UnsafeURLError, match="port"):
            _run(fetch_public_url("https://example.com:8080/page"))

    def test_port_22_rejected(self):
        with pytest.raises(UnsafeURLError, match="port"):
            _run(fetch_public_url("http://example.com:22/"))


# ---------------------------------------------------------------------------
# Tests: private / reserved IP resolution
# ---------------------------------------------------------------------------

class TestPrivateIPs:
    def test_localhost_rejected(self):
        with _patch_dns("127.0.0.1"):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://localhost/"))

    def test_127_0_0_1_rejected(self):
        with _patch_dns("127.0.0.1"):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://127.0.0.1/"))

    def test_10_x_rejected(self):
        with _patch_dns("10.0.0.5"):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://internal.corp/"))

    def test_192_168_x_rejected(self):
        with _patch_dns("192.168.1.1"):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://router.local/"))

    def test_169_254_metadata_rejected(self):
        with _patch_dns("169.254.169.254"):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://169.254.169.254/latest/meta-data/"))

    def test_ipv6_loopback_rejected(self):
        with _patch_dns("::1", family=socket.AF_INET6):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://[::1]/"))

    def test_mixed_ips_one_private_rejected(self):
        """Even if one A record is public, a single private record → reject."""
        with _patch_dns_multi(["93.184.216.34", "10.0.0.1"]):
            with pytest.raises(UnsafeURLError, match="private"):
                _run(fetch_public_url("http://example.com/"))


# ---------------------------------------------------------------------------
# Tests: redirect to internal IP (SSRF via redirect)
# ---------------------------------------------------------------------------

class TestRedirectSSRF:
    def test_redirect_to_internal_ip_rejected(self):
        """First hop resolves to a public IP, redirect targets a private IP."""
        call_count = 0

        def dns_side_effect(hostname, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First hop: public
                return [_make_addrinfo("93.184.216.34")]
            else:
                # Redirect target: private
                return [_make_addrinfo("10.0.0.1")]

        redirect_resp = _redirect_response("http://internal.corp/secret")

        with patch("app.utils.url_safety.socket.getaddrinfo", side_effect=dns_side_effect):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(redirect_resp)
                with pytest.raises(UnsafeURLError, match="private"):
                    _run(fetch_public_url("http://example.com/page"))


# ---------------------------------------------------------------------------
# Tests: too many redirects
# ---------------------------------------------------------------------------

class TestMaxRedirects:
    def test_too_many_redirects(self):
        redirect_resp = _redirect_response("http://example.com/loop")

        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(redirect_resp)
                with pytest.raises(UnsafeURLError, match="redirect"):
                    _run(fetch_public_url("http://example.com/loop", max_redirects=2))


# ---------------------------------------------------------------------------
# Tests: oversized response
# ---------------------------------------------------------------------------

class TestOversizedResponse:
    def test_body_exceeds_max_bytes(self):
        big_body = "x" * (3 * 1024 * 1024)  # 3 MB
        resp = _html_response(body=big_body)

        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(resp)
                with pytest.raises(UnsafeURLError, match="limit"):
                    _run(fetch_public_url("http://example.com/big", max_bytes=2 * 1024 * 1024))

    def test_content_length_header_enforced(self):
        resp = _html_response(body="ok", headers={"content-length": "99999999"})

        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(resp)
                with pytest.raises(UnsafeURLError, match="limit"):
                    _run(fetch_public_url("http://example.com/big", max_bytes=1024))


# ---------------------------------------------------------------------------
# Tests: content-type validation
# ---------------------------------------------------------------------------

class TestContentType:
    def test_json_content_type_rejected(self):
        request = httpx.Request("GET", "https://example.com")
        resp = httpx.Response(
            200,
            headers={"content-type": "application/json"},
            content=b'{"key": "val"}',
            request=request,
        )
        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(resp)
                with pytest.raises(UnsafeURLError, match="content-type"):
                    _run(fetch_public_url("http://example.com/api"))


# ---------------------------------------------------------------------------
# Tests: happy path — valid public URL
# ---------------------------------------------------------------------------

class TestHappyPath:
    def test_valid_public_html_url(self):
        resp = _html_response("<html><title>News</title><body><p>Content</p></body></html>")

        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = _mock_client(resp)
                result = _run(fetch_public_url("https://example.com/news"))
                assert result.status_code == 200
                assert "News" in result.text

    def test_valid_redirect_then_html(self):
        """One redirect hop to another public URL, then HTML."""
        call_count = 0

        async def get_side_effect(url, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _redirect_response("https://www.example.com/news")
            else:
                return _html_response("<html><body>Final</body></html>")

        client_inst = AsyncMock()
        client_inst.get = AsyncMock(side_effect=get_side_effect)
        client_inst.__aenter__ = AsyncMock(return_value=client_inst)
        client_inst.__aexit__ = AsyncMock(return_value=False)

        with _patch_dns("93.184.216.34"):
            with patch("app.utils.url_safety.httpx.AsyncClient") as MockClient:
                MockClient.return_value = client_inst
                result = _run(fetch_public_url("https://example.com/old"))
                assert result.status_code == 200
                assert "Final" in result.text
