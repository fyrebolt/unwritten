#!/usr/bin/env python3
"""
scrape_dmhc.py

Pull California DMHC Independent Medical Review (IMR) decisions from the
canonical public source: the California Health and Human Services (CHHS)
Open Data Portal. CHHS publishes the IMR decision dataset as a CSV that
contains one row per redacted decision with fields including DiagnosisCategory,
TreatmentCategory, Determination, and the full Findings narrative.

This is *higher quality* than scraping the wpso.dmhc.ca.gov interactive site
(which 403s default user agents and requires session cookies). The CKAN API
endpoint is stable, public, and rate-limit-friendly.

Source dataset:
  https://data.chhs.ca.gov/dataset/independent-medical-review-imr-determinations-trend

Resumable: skips IMRs that already exist on disk.
Polite: 1.0s sleep between fetches.
"""

import csv
import io
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo_corpus" / "real_imr"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Browser-like UA — CHHS portal accepts this without issue.
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Direct CSV resource. The dataset is updated periodically; this is the
# stable resource ID. If it ever moves, the package_show call below
# discovers the current resource URL automatically.
CKAN_PACKAGE = "https://data.chhs.ca.gov/api/3/action/package_show?id=independent-medical-review-imr-determinations-trend"

CATEGORY_MAP = {
    # Map CHHS DiagnosisCategory values → our 8 corpus categories.
    "Mental": "Mental health treatment",
    "Mental Disorders": "Mental health treatment",
    "Mental Health": "Mental health treatment",
    "Cancer": "Surgery",
    "Endocrine": "GLP-1 medications",
    "Endocrine/Metabolic": "GLP-1 medications",
    "Endocrine / Metabolic": "GLP-1 medications",
    "OB-GYN/ Pregnancy": "Fertility treatment",
    "OB-GYN / Pregnancy": "Fertility treatment",
    "Pregnancy": "Fertility treatment",
    "Orthopedic": "Surgery",
    "Orthopedic/Musculoskeletal": "Surgery",
    "Orthopedic / Musculoskeletal": "Surgery",
    "Musculoskeletal": "Physical therapy",
}

# Map CHHS TreatmentCategory → our category buckets (more specific signal)
TREATMENT_MAP = {
    "Pharmacy": "Prescription drug (brand)",
    "DME": "Durable medical equipment",
    "Mental": "Mental health treatment",
    "Diagnostic Imaging/Tests": "MRI/imaging",
    "Diagnostic Imaging / Tests": "MRI/imaging",
    "Rehab/Mental Health/Substance Abuse": "Mental health treatment",
    "Rehab / Mental Health / Substance Abuse": "Mental health treatment",
    "OB-GYN/Pregnancy": "Fertility treatment",
    "OB-GYN / Pregnancy": "Fertility treatment",
    "Cancer": "Surgery",
    "Special": "Surgery",
    "Cardiac/Circulatory Problems": "Surgery",
    "General Surgery": "Surgery",
    "Orthopedic": "Surgery",
    "Other": None,
    "Reconstr/Plast Procedures": "Surgery",
    "Autonomic Nervous System": None,
}

# Map CHHS plan column to canonical insurer names (best-effort)
PLAN_INSURER_MAP = {
    "ANTHEM BLUE CROSS": "Anthem",
    "ANTHEM": "Anthem",
    "AETNA HEALTH OF CALIFORNIA INC.": "Aetna",
    "AETNA": "Aetna",
    "UNITEDHEALTHCARE": "UnitedHealthcare",
    "UNITED HEALTHCARE OF CALIFORNIA": "UnitedHealthcare",
    "UNITEDHEALTHCARE BENEFITS PLAN OF CALIFORNIA": "UnitedHealthcare",
    "BLUE SHIELD OF CALIFORNIA": "Blue Cross Blue Shield",
    "BLUE CROSS OF CALIFORNIA": "Blue Cross Blue Shield",
    "CIGNA HEALTHCARE OF CALIFORNIA": "Cigna",
    "CIGNA": "Cigna",
    "KAISER FOUNDATION HEALTH PLAN, INC.": "Kaiser",
    "KAISER PERMANENTE": "Kaiser",
    "KAISER FOUNDATION HEALTH PLAN INC": "Kaiser",
    "HEALTH NET": "Health Net",
}

TARGET_TOTAL = 35  # we want about this many real IMRs


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    print(f"[{ts}] {msg}", flush=True)


def fetch(url: str, *, binary: bool = False, timeout: int = 60):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        return data if binary else data.decode("utf-8", errors="replace")


def discover_resource_id() -> str | None:
    """Discover the CKAN resource ID for the IMR CSV."""
    log("CKAN: discovering resource ID")
    try:
        body = fetch(CKAN_PACKAGE, timeout=30)
    except Exception as e:
        log(f"CKAN package_show failed: {e}")
        return None
    try:
        meta = json.loads(body)
    except json.JSONDecodeError as e:
        log(f"CKAN parse failed: {e}")
        return None
    resources = meta.get("result", {}).get("resources", [])
    for r in resources:
        fmt = (r.get("format") or "").lower()
        if fmt == "csv":
            rid = r.get("id")
            log(f"CKAN: resource_id={rid}")
            return rid
    return None


def fetch_rows_via_datastore(resource_id: str, page_size: int = 1000) -> list[dict]:
    """Page through datastore_search — works without 403."""
    rows: list[dict] = []
    offset = 0
    while True:
        url = (
            f"https://data.chhs.ca.gov/api/3/action/datastore_search"
            f"?resource_id={resource_id}&limit={page_size}&offset={offset}"
        )
        log(f"CKAN datastore_search offset={offset}")
        try:
            body = fetch(url, timeout=60)
        except Exception as e:
            log(f"  · page failed: {e}")
            break
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            break
        records = data.get("result", {}).get("records", [])
        if not records:
            break
        rows.extend(records)
        offset += len(records)
        if len(records) < page_size:
            break
        if len(rows) >= 5000:  # plenty of headroom
            break
        time.sleep(1.0)
    return rows


def categorize(diag_cat: str, treat_cat: str) -> str | None:
    if treat_cat in TREATMENT_MAP and TREATMENT_MAP[treat_cat]:
        return TREATMENT_MAP[treat_cat]
    if diag_cat in CATEGORY_MAP:
        return CATEGORY_MAP[diag_cat]
    return None


def normalize_insurer(plan: str) -> str | None:
    if not plan:
        return None
    upper = plan.strip().upper()
    if upper in PLAN_INSURER_MAP:
        return PLAN_INSURER_MAP[upper]
    for key, canonical in PLAN_INSURER_MAP.items():
        if key in upper:
            return canonical
    return plan.title()  # keep original (title-cased) if unknown


def already_have(imr_id: str) -> bool:
    return (OUT_DIR / f"{imr_id}.txt").exists()


def keep_row(row: dict) -> bool:
    """Filter to most useful rows: rich findings + recognizable category."""
    findings = (row.get("Findings") or row.get("findings") or "").strip()
    if len(findings) < 600:
        return False
    diag = (row.get("DiagnosisCategory") or "").strip()
    treat = (row.get("TreatmentCategory") or "").strip()
    cat = categorize(diag, treat)
    return cat is not None


def render_imr_text(row: dict) -> str:
    findings = (row.get("Findings") or "").strip()
    ref_id = row.get("ReferenceID") or row.get("Reference ID") or "REDACTED"
    year = row.get("ReportYear") or row.get("Year") or ""
    diag_cat = row.get("DiagnosisCategory") or ""
    diag_sub = row.get("DiagnosisSubCategory") or ""
    treat_cat = row.get("TreatmentCategory") or ""
    treat_sub = row.get("TreatmentSubCategory") or ""
    determination = row.get("Determination") or ""
    imr_type = row.get("Type") or row.get("IMRType") or ""
    age = row.get("AgeRange") or ""
    gender = row.get("PatientGender") or ""
    days_review = row.get("DaysToReview") or ""
    days_adopt = row.get("DaysToAdopt") or ""

    header = (
        "CALIFORNIA DEPARTMENT OF MANAGED HEALTH CARE\n"
        "INDEPENDENT MEDICAL REVIEW (IMR) DECISION — REDACTED\n"
        "Source: CHHS Open Data Portal\n"
        f"Reference ID: {ref_id}\n"
        f"Report Year: {year}\n"
        f"Diagnosis Category: {diag_cat}{(' / ' + diag_sub) if diag_sub else ''}\n"
        f"Treatment Category: {treat_cat}{(' / ' + treat_sub) if treat_sub else ''}\n"
        f"IMR Type: {imr_type}\n"
        f"Patient: age {age or 'n/a'}, gender {gender or 'n/a'}\n"
        f"Days to review: {days_review}     Days to adopt: {days_adopt}\n"
        f"Determination: {determination}\n"
        "----------------------------------------------------------\n\n"
    )
    return header + "FINDINGS\n\n" + findings + "\n"


def save_imr(row: dict) -> bool:
    ref_id = (row.get("ReferenceID") or row.get("Reference ID") or "").strip()
    if not ref_id:
        return False
    imr_id = f"imr_{ref_id}"
    if already_have(imr_id):
        return False

    text = render_imr_text(row)
    (OUT_DIR / f"{imr_id}.txt").write_text(text)

    diag = (row.get("DiagnosisCategory") or "").strip()
    treat = (row.get("TreatmentCategory") or "").strip()
    plan = (row.get("PlanType") or row.get("Plan Type") or "").strip()
    determination = (row.get("Determination") or "").strip()

    sidecar = {
        "id": imr_id,
        "source": "DMHC IMR (via CHHS Open Data Portal)",
        "is_synthetic": False,
        "is_denial_letter": False,  # this is the IMR review of a denial
        "doc_type": "imr_decision",
        "reference_id": ref_id,
        "report_year": row.get("ReportYear") or row.get("Year"),
        "insurer": "California Health Plan",  # CHHS dataset doesn't always expose plan name
        "plan_type": plan,
        "diagnosis_category": diag,
        "diagnosis_subcategory": row.get("DiagnosisSubCategory"),
        "treatment_category": treat,
        "treatment_subcategory": row.get("TreatmentSubCategory"),
        "imr_type": row.get("Type") or row.get("IMRType"),
        "category": categorize(diag, treat),
        "service": row.get("TreatmentSubCategory") or treat,
        "denial_reason": diag_to_denial_reason(diag, treat, determination),
        "outcome": determination,  # "Overturned" / "Upheld" / "Modified"
        "patient_age_range": row.get("AgeRange"),
        "patient_gender": row.get("PatientGender"),
        "days_to_review": row.get("DaysToReview"),
        "days_to_adopt": row.get("DaysToAdopt"),
        "url": "https://data.chhs.ca.gov/dataset/independent-medical-review-imr-determinations-trend",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT_DIR / f"{imr_id}.json").write_text(json.dumps(sidecar, indent=2))
    return True


def diag_to_denial_reason(diag_cat: str, treat_cat: str, determination: str) -> str:
    # Heuristic — most IMR cases turn on medical necessity
    if "experimental" in (treat_cat or "").lower():
        return "Investigational / experimental"
    return "Not medically necessary"


def main() -> int:
    log("DMHC IMR scraper starting (via CHHS Open Data Portal)")
    log(f"output: {OUT_DIR}")

    resource_id = discover_resource_id()
    if not resource_id:
        log("could not resolve resource_id — aborting")
        return 1

    all_rows = fetch_rows_via_datastore(resource_id, page_size=1000)
    log(f"fetched {len(all_rows):,} rows via datastore_search")

    saved = 0
    seen = len(all_rows)
    rows = [r for r in all_rows if keep_row(r)]
    log(f"CKAN: {seen:,} rows total, {len(rows):,} usable")

    # Sort newest first
    rows.sort(key=lambda r: int(r.get("ReportYear") or r.get("Year") or 0), reverse=True)

    # Diversify by treatment category
    by_cat: dict[str, list[dict]] = {}
    for r in rows:
        cat = categorize(r.get("DiagnosisCategory", ""), r.get("TreatmentCategory", ""))
        if not cat:
            continue
        by_cat.setdefault(cat, []).append(r)

    # round-robin pull
    target = TARGET_TOTAL
    selected: list[dict] = []
    cats = list(by_cat.keys())
    while target > 0 and any(by_cat[c] for c in cats):
        for c in cats:
            if not by_cat[c] or target <= 0:
                continue
            selected.append(by_cat[c].pop(0))
            target -= 1

    log(f"selected {len(selected)} diverse IMR decisions")
    for row in selected:
        if save_imr(row):
            saved += 1

    log(f"done — saved={saved} IMR decisions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
