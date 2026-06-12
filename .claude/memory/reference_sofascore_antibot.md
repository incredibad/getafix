---
name: reference-sofascore-antibot
description: Sofascore anti-bot mechanism — how the X-Requested-With token works and how to debug if it breaks again
metadata: 
  node_type: memory
  type: reference
  originSessionId: 54084719-46a2-498b-9d96-1b69c472e0bb
---

## Sofascore anti-bot: rotating X-Requested-With token

### What it is
Every request to `www.sofascore.com/api/v1/*` requires a header:
```
X-Requested-With: <6-char hex token>
```

The token rotates every 30 minutes. Without it, all endpoints return:
```json
{"error": {"code": 403, "reason": "challenge"}}
```

### How the token is generated
Reverse-engineered from `/_next/static/chunks/pages/_app-<hash>.js` (webpack module 39190), function `c()`:

```js
Math.floor(Date.now() / 1000 / 1800)  // current 30-min epoch bucket
→ SHA-256 of that integer as a string
→ first 6 hex chars
```

Python equivalent (in `backend/http_client.py` → `sofascore_headers()`):
```python
epoch_30min = int(time.time() // 1800)
token = hashlib.sha256(str(epoch_30min).encode()).hexdigest()[:6]
```

### Where it's implemented
`backend/http_client.py` — `sofascore_headers()` function. All Sofascore requests route through `get_json()` / `get_bytes()` which call this automatically.

### If it breaks again (403s on Sofascore)
1. Check the token is still the right algorithm: open sofascore.com in browser DevTools → Network tab → find any `www.sofascore.com/api/v1/*` XHR → inspect Request Headers for `X-Requested-With`
2. Verify the Python formula matches: `python3 -c "import hashlib,time; print(hashlib.sha256(str(int(time.time()//1800)).encode()).hexdigest()[:6])"`
3. If the token format has changed, find the new `_app-<hash>.js` chunk and search for `X-Requested-With` to locate the new `c()` function
4. The base URL is `www.sofascore.com/api/v1` (NOT `api.sofascore.com` — that subdomain doesn't exist)

### Background
- Added by Sofascore around June 2026, likely triggered by World Cup traffic/scraping surge
- Token is NOT cookie-based — no session needed, just the correct header value
- curl_cffi with `impersonate="chrome120"` handles TLS fingerprinting; the token handles the JS challenge layer
- FlareSolverr does NOT work — Sofascore's protection is custom, not Cloudflare
