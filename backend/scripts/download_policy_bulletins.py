#!/usr/bin/env python3
"""
download_policy_bulletins.py

Download public Medical Policy Bulletins (MPBs) from major insurers. These
PDFs define when a treatment is covered/denied — they're the documents *cited*
in denial letters, so they're hugely useful as supporting docs for appeals.

Approach: hit a curated list of known-public MPB URLs. We do not scrape via
search APIs (rate-limited / requires keys). The list below was assembled from
the insurers' own published policy directories.

Resumable: skips files already on disk. Polite: 2.0s between requests.
If a URL 404s or moves, log and continue.
"""

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo_corpus" / "policy_bulletins"
OUT_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SLEEP_SECONDS = 1.0
TIMEOUT = 15  # short — many of these URLs are stale


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    print(f"[{ts}] {msg}", flush=True)


# Curated list — public policy URLs as of 2024-2025. Aetna's CPB system is the
# most consistently public-accessible; we lean on it heavily. If a URL has moved
# or expired, the script logs and skips. Each entry: (insurer, category, title, url)
POLICIES: list[tuple[str, str, str, str]] = [
    # Aetna Clinical Policy Bulletins (most reliable — public, stable URLs)
    ("Aetna", "GLP-1 medications",
     "Weight Reduction Medications — CPB 0039",
     "https://www.aetna.com/cpb/medical/data/1_99/0039.html"),
    ("Aetna", "Fertility treatment",
     "Infertility — CPB 0327",
     "https://www.aetna.com/cpb/medical/data/300_399/0327.html"),
    ("Aetna", "Mental health treatment",
     "Transcranial Magnetic Stimulation — CPB 0469",
     "https://www.aetna.com/cpb/medical/data/400_499/0469.html"),
    ("Aetna", "Surgery",
     "Bariatric Surgery — CPB 0157",
     "https://www.aetna.com/cpb/medical/data/100_199/0157.html"),
    ("Aetna", "MRI/imaging",
     "Magnetic Resonance Imaging — CPB 0349",
     "https://www.aetna.com/cpb/medical/data/300_399/0349.html"),
    ("Aetna", "Physical therapy",
     "Physical Therapy — CPB 0325",
     "https://www.aetna.com/cpb/medical/data/300_399/0325.html"),
    ("Aetna", "Durable medical equipment",
     "Wheelchairs (Manual and Power) — CPB 0438",
     "https://www.aetna.com/cpb/medical/data/400_499/0438.html"),
    ("Aetna", "Mental health treatment",
     "Eating Disorders — CPB 0511",
     "https://www.aetna.com/cpb/medical/data/500_599/0511.html"),
    ("Aetna", "Surgery",
     "Cochlear Implants — CPB 0013",
     "https://www.aetna.com/cpb/medical/data/1_99/0013.html"),
    ("Aetna", "Prescription drug (brand)",
     "Adalimumab (Humira) — CPB 0341",
     "https://www.aetna.com/cpb/medical/data/300_399/0341.html"),
    ("Aetna", "Mental health treatment",
     "Esketamine (Spravato) — CPB 1010",
     "https://www.aetna.com/cpb/medical/data/1000_1099/1010.html"),
    ("Aetna", "Surgery",
     "Gender Affirming Surgery — CPB 0615",
     "https://www.aetna.com/cpb/medical/data/600_699/0615.html"),

    # Cigna — try alternate HTML coverage policy URLs (PDFs were 404'ing)
    ("Cigna", "Mental health treatment",
     "Transcranial Magnetic Stimulation — Coverage Policy",
     "https://static.cigna.com/assets/chcp/resourceLibrary/medicalResourcesList/medicalDoingBusinessWithCigna/medicalDbwcMedicalCoveragePolicies.html"),
]


def already_have(filename: str) -> bool:
    return (OUT_DIR / filename).exists()


def slugify(text: str) -> str:
    out = []
    for ch in text.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_", "/"):
            out.append("_")
    return "".join(out).strip("_").replace("__", "_")[:60]


def download(insurer: str, category: str, title: str, url: str) -> bool:
    insurer_slug = slugify(insurer)
    cat_slug = slugify(category)
    is_pdf_url = url.lower().endswith(".pdf")
    ext = "pdf" if is_pdf_url else "html"
    base = f"{insurer_slug}_{cat_slug}_{abs(hash(url)) % 10**6:06d}.{ext}"

    if already_have(base):
        log(f"  · skip (cached) {base}")
        return True

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = resp.read()
            content_type = resp.headers.get("Content-Type", "")
    except Exception as e:
        log(f"  · download failed [{insurer} / {category}]: {e}")
        return False

    if not body:
        log(f"  · empty body [{insurer} / {category}]")
        return False

    actual_ext = "pdf" if (body[:4] == b"%PDF" or "pdf" in content_type.lower()) else "html"
    base = f"{insurer_slug}_{cat_slug}_{abs(hash(url)) % 10**6:06d}.{actual_ext}"
    (OUT_DIR / base).write_bytes(body)

    sidecar = {
        "id": Path(base).stem,
        "source": "Insurer Medical Policy Bulletin",
        "is_synthetic": False,
        "is_denial_letter": False,
        "doc_type": "medical_policy_bulletin",
        "insurer": insurer,
        "category": category,
        "policy_title": title,
        "policy_url": url,
        "content_type": content_type,
        "size_bytes": len(body),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT_DIR / f"{Path(base).stem}.json").write_text(json.dumps(sidecar, indent=2))
    log(f"  · saved {base} ({len(body):,} bytes)")
    return True


def main() -> int:
    log("Policy Bulletin downloader starting")
    log(f"output: {OUT_DIR}")
    log(f"targets: {len(POLICIES)} curated policies")

    saved = 0
    failed = 0
    for insurer, category, title, url in POLICIES:
        log(f"GET [{insurer} / {category}] {title}")
        ok = download(insurer, category, title, url)
        if ok:
            saved += 1
        else:
            failed += 1
        time.sleep(SLEEP_SECONDS)

    log(f"done — saved={saved} failed={failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
