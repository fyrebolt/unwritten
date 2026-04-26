#!/usr/bin/env python3
"""
scrape_reddit.py

Pull recent posts from r/HealthInsurance via Reddit's public JSON API
(no auth required for read). Save posts whose body looks like a quoted
denial letter to backend/demo_corpus/reddit_shared/.

Polite: 2.0s sleep between requests (Reddit allows ~60/min, we use ~30/min).
Resumable: skips post IDs we already have on disk.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo_corpus" / "reddit_shared"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Reddit blocks unauth'd requests with non-browser UAs. We use a browser-like UA.
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SLEEP_SECONDS = 2.0
MIN_BODY_LEN = 400  # below this we don't have enough denial-letter-like content
MAX_PER_QUERY = 100

QUERIES = [
    "denial letter",
    "denied claim",
    "appeal denied",
    "insurance denied",
    "prior authorization denied",
    "medical necessity denied",
]

INSURERS = [
    ("Anthem", ["anthem", "blue cross of california", "blue cross blue shield of california"]),
    ("Aetna", ["aetna"]),
    ("UnitedHealthcare", ["unitedhealthcare", "united healthcare", "uhc", "united health"]),
    ("Blue Cross Blue Shield", ["bcbs", "blue cross blue shield", "blue shield"]),
    ("Cigna", ["cigna", "evernorth"]),
    ("Kaiser", ["kaiser", "kaiser permanente"]),
    ("Humana", ["humana"]),
    ("Molina", ["molina"]),
]

CATEGORIES = [
    ("GLP-1 medications", [
        "ozempic", "wegovy", "mounjaro", "zepbound", "saxenda",
        "glp-1", "glp1", "semaglutide", "tirzepatide",
    ]),
    ("MRI/imaging", ["mri", "ct scan", "pet scan", "ultrasound", "imaging", "radiology"]),
    ("Mental health treatment", [
        "therapy", "psychiatric", "mental health", "tms", "esketamine",
        "ketamine", "depression", "anxiety", "counseling", "psychologist",
    ]),
    ("Physical therapy", ["physical therapy", "pt session", "rehab", "occupational therapy"]),
    ("Surgery", ["surgery", "surgical", "operation", "procedure"]),
    ("Fertility treatment", ["ivf", "fertility", "egg retrieval", "embryo"]),
    ("Durable medical equipment", ["wheelchair", "cpap", "bipap", "dme", "medical equipment", "oxygen"]),
    ("Prescription drug (brand)", ["prescription", "brand-name", "non-formulary", "step therapy"]),
]

DENIAL_SIGNALS = [
    "denied", "denial", "claim number", "appeal rights", "medical necessity",
    "not medically necessary", "adverse determination", "not covered",
    "we are unable to approve", "we have determined", "this service is not",
    "prior authorization", "step therapy", "not a covered benefit",
    "investigational", "experimental",
]


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    print(f"[{ts}] {msg}", flush=True)


def fetch_json(url: str) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as e:
        log(f"  · fetch failed: {e}")
        return None


def looks_like_denial(body: str) -> bool:
    if len(body) < MIN_BODY_LEN:
        return False
    lower = body.lower()
    hits = sum(1 for s in DENIAL_SIGNALS if s in lower)
    # need at least 3 distinct signals to qualify
    return hits >= 3


def detect_insurer(text: str) -> str | None:
    lower = text.lower()
    for canonical, aliases in INSURERS:
        for alias in aliases:
            if alias in lower:
                return canonical
    return None


def detect_category(text: str) -> str | None:
    lower = text.lower()
    for canonical, keywords in CATEGORIES:
        for kw in keywords:
            if kw in lower:
                return canonical
    return None


def detect_denial_reason(text: str) -> str | None:
    lower = text.lower()
    if "not medically necessary" in lower or "medical necessity" in lower:
        return "Not medically necessary"
    if "step therapy" in lower:
        return "Step therapy not completed"
    if "investigational" in lower or "experimental" in lower:
        return "Investigational / experimental"
    if "out of network" in lower or "out-of-network" in lower:
        return "Out of network"
    if "prior auth" in lower:
        return "Prior authorization not obtained"
    if "not a covered benefit" in lower or "not covered" in lower:
        return "Service not covered under plan"
    if "formulary" in lower:
        return "Non-formulary drug"
    return None


def collect_posts(query: str) -> list[dict]:
    """Try www.reddit.com first, fall back to old.reddit.com (less aggressive blocking)."""
    base_urls = [
        "https://old.reddit.com/r/HealthInsurance/search.json",
        "https://www.reddit.com/r/HealthInsurance/search.json",
    ]
    for base in base_urls:
        url = (
            f"{base}?q={urllib.parse.quote(query)}"
            f"&restrict_sr=1&sort=new&limit={MAX_PER_QUERY}"
        )
        log(f"  GET {url}")
        data = fetch_json(url)
        if data:
            children = data.get("data", {}).get("children", [])
            log(f"  · {len(children)} results")
            return [c.get("data", {}) for c in children if c.get("data")]
        time.sleep(1.5)
    return []


def save(post: dict) -> bool:
    body = (post.get("selftext") or "").strip()
    title = (post.get("title") or "").strip()
    post_id = post.get("id")
    if not post_id:
        return False

    out_path = OUT_DIR / f"reddit_{post_id}.txt"
    if out_path.exists():
        return False

    full = f"# {title}\n\n{body}".strip()
    if not looks_like_denial(full):
        return False

    out_path.write_text(full)

    insurer = detect_insurer(full)
    category = detect_category(full)
    denial_reason = detect_denial_reason(full)

    sidecar = {
        "id": f"reddit_{post_id}",
        "source": "Reddit r/HealthInsurance",
        "is_synthetic": False,
        "post_id": post_id,
        "post_url": f"https://www.reddit.com{post.get('permalink', '')}",
        "subreddit": post.get("subreddit", "HealthInsurance"),
        "title": title,
        "post_date": datetime.fromtimestamp(post.get("created_utc", 0), tz=timezone.utc).isoformat() if post.get("created_utc") else None,
        "score": post.get("score"),
        "num_comments": post.get("num_comments"),
        "insurer": insurer,
        "service": None,
        "category": category,
        "denial_reason": denial_reason,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT_DIR / f"reddit_{post_id}.json").write_text(json.dumps(sidecar, indent=2))
    return True


def main() -> int:
    log("Reddit scraper starting")
    log(f"output: {OUT_DIR}")

    seen_ids: set[str] = set()
    saved = 0
    for q in QUERIES:
        log(f"query: {q!r}")
        posts = collect_posts(q)
        for post in posts:
            pid = post.get("id")
            if not pid or pid in seen_ids:
                continue
            seen_ids.add(pid)
            try:
                if save(post):
                    saved += 1
                    log(f"  · saved reddit_{pid} (total={saved})")
            except Exception as e:
                log(f"  · save error {pid}: {e}")
        time.sleep(SLEEP_SECONDS)

    log(f"done — saved={saved} posts (seen={len(seen_ids)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
