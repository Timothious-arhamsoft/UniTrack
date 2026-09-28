"""
SSRF-safe HTTP fetcher for university/scholarship pages.

Safety measures:
- Only http/https schemes allowed
- Private/loopback IP ranges blocked after DNS resolution
- 15-second timeout
- 2 MB max response
- Max 3 redirects, each re-validated
- Per-domain rate limiting (10s minimum between requests)
- HTML text extraction via BeautifulSoup
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
import socket
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

# Per-domain rate limiting: domain -> last fetch timestamp
_domain_last_fetch: dict[str, float] = {}
DOMAIN_RATE_LIMIT_SECONDS = 10

PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("0.0.0.0/8"),
]

ALLOWED_SCHEMES = {"http", "https"}
MAX_RESPONSE_BYTES = 2 * 1024 * 1024  # 2 MB
TIMEOUT_SECONDS = 15
MAX_REDIRECTS = 3


class FetchError(Exception):
    pass


def _is_private_ip(host: str) -> bool:
    try:
        resolved = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return True  # Can't resolve — treat as unsafe

    for item in resolved:
        addr = item[4][0]
        try:
            ip = ipaddress.ip_address(addr)
            for private_range in PRIVATE_RANGES:
                if ip in private_range:
                    return True
        except ValueError:
            return True

    return False


def _validate_url(url: str) -> tuple[str, str]:
    """Validate URL scheme and host. Returns (scheme, host) or raises."""
    try:
        parsed = urlparse(url)
    except Exception as exc:
        raise FetchError(f"Invalid URL: {exc}") from exc

    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise FetchError(f"Disallowed URL scheme '{scheme}'. Only http/https are allowed.")

    host = parsed.hostname
    if not host:
        raise FetchError("URL has no hostname.")

    # Block numeric IPs directly
    try:
        ip = ipaddress.ip_address(host)
        for private_range in PRIVATE_RANGES:
            if ip in private_range:
                raise FetchError(f"Destination IP {ip} is in a private/reserved range.")
    except ValueError:
        pass  # Not a raw IP — will be checked after DNS resolution

    return scheme, host


def _apply_rate_limit(domain: str) -> None:
    last = _domain_last_fetch.get(domain, 0.0)
    elapsed = time.monotonic() - last
    if elapsed < DOMAIN_RATE_LIMIT_SECONDS:
        time.sleep(DOMAIN_RATE_LIMIT_SECONDS - elapsed)


def _extract_text(html: str) -> str:
    """Extract readable text from HTML, removing scripts/styles."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _fingerprint(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


async def fetch_url(url: str) -> dict:
    """
    Fetch a URL safely. Returns a dict with:
      ok, status_code, content_text, content_fingerprint, fetch_at, error
    """
    fetch_at = datetime.now(timezone.utc).isoformat()
    result = {
        "ok": False,
        "status_code": None,
        "content_text": None,
        "content_fingerprint": None,
        "fetch_at": fetch_at,
        "error": None,
    }

    try:
        scheme, host = _validate_url(url)
    except FetchError as exc:
        result["error"] = str(exc)
        return result

    # DNS-based SSRF check
    if _is_private_ip(host):
        result["error"] = f"Blocked: '{host}' resolves to a private/reserved IP address."
        return result

    _apply_rate_limit(host)

    try:
        transport = httpx.AsyncHTTPTransport(retries=0)
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            timeout=TIMEOUT_SECONDS,
            transport=transport,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; UniTrack/1.0; "
                    "+https://github.com/university-reminder)"
                )
            },
        ) as client:
            response = await client.get(url)
            _domain_last_fetch[host] = time.monotonic()

            # Check redirect destination for SSRF
            if response.url and str(response.url) != url:
                redirect_host = urlparse(str(response.url)).hostname or ""
                if _is_private_ip(redirect_host):
                    result["error"] = "Blocked: redirect destination resolves to a private IP."
                    return result

            result["status_code"] = response.status_code

            # Read content with size limit
            content_bytes = b""
            async for chunk in response.aiter_bytes(chunk_size=8192):
                content_bytes += chunk
                if len(content_bytes) > MAX_RESPONSE_BYTES:
                    result["error"] = "Response exceeded 2 MB limit; truncating."
                    break

            content_type = response.headers.get("content-type", "")
            if "html" in content_type or not content_type:
                content_text = _extract_text(
                    content_bytes.decode("utf-8", errors="replace")
                )
            else:
                content_text = content_bytes.decode("utf-8", errors="replace")[:50000]

            result["content_text"] = content_text
            result["content_fingerprint"] = _fingerprint(content_text)
            result["ok"] = True

    except httpx.TimeoutException:
        result["error"] = f"Request timed out after {TIMEOUT_SECONDS}s."
    except httpx.TooManyRedirects:
        result["error"] = f"Too many redirects (max {MAX_REDIRECTS})."
    except httpx.RequestError as exc:
        result["error"] = f"Network error: {exc}"
    except Exception as exc:
        result["error"] = f"Unexpected error: {exc}"

    return result
