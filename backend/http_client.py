"""Central HTTP client — all outbound requests route through here."""
import hashlib
import logging
import time

import httpx
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)

_SOFASCORE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0"


class HTTPError(Exception):
    def __init__(self, status_code: int):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


def sofascore_headers() -> dict:
    """Build Sofascore request headers with the current rotating token."""
    epoch_30min = int(time.time() // 1800)
    token = hashlib.sha256(str(epoch_30min).encode()).hexdigest()[:6]
    return {
        "Referer": "https://www.sofascore.com/",
        "User-Agent": _SOFASCORE_UA,
        "Accept": "*/*",
        "X-Requested-With": token,
    }


async def get_json(url: str, params: dict | None = None, headers: dict | None = None, timeout: int = 20) -> dict:
    """GET a JSON endpoint. Auto-selects curl_cffi+token for Sofascore, httpx for everything else."""
    if "sofascore.com" in url:
        h = {**sofascore_headers(), **(headers or {})}
        async with AsyncSession(impersonate="chrome120", timeout=timeout) as s:
            r = await s.get(url, headers=h, params=params)
            if r.status_code >= 400:
                raise HTTPError(r.status_code)
            return r.json()
    else:
        h = headers or {}
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as s:
            r = await s.get(url, headers=h, params=params)
            if r.status_code >= 400:
                raise HTTPError(r.status_code)
            return r.json()


async def get_bytes(url: str, headers: dict | None = None, timeout: int = 10) -> tuple[bytes, str]:
    """GET a binary resource. Returns (content, content_type)."""
    if "sofascore.com" in url:
        h = {**sofascore_headers(), **(headers or {})}
        async with AsyncSession(impersonate="chrome120", timeout=timeout) as s:
            r = await s.get(url, headers=h)
            if r.status_code >= 400:
                raise HTTPError(r.status_code)
            return r.content, r.headers.get("content-type", "application/octet-stream")
    else:
        h = {"User-Agent": "GetAFix/1.0", **(headers or {})}
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as s:
            r = await s.get(url, headers=h)
            if r.status_code >= 400:
                raise HTTPError(r.status_code)
            return r.content, r.headers.get("content-type", "application/octet-stream")
