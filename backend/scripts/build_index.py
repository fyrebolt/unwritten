#!/usr/bin/env python3
"""
build_index.py

Walk backend/demo_corpus/{real_imr,reddit_shared,policy_bulletins,synthetic}/
and assemble backend/demo_corpus/index.json.

Each subdirectory holds source documents (PDF / TXT / HTML) plus a `.json`
sidecar per document describing it. The index is the union of all sidecars
plus aggregate counts by source / insurer / category.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "demo_corpus"

SUBDIRS = ["real_imr", "reddit_shared", "policy_bulletins", "synthetic"]


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    print(f"[{ts}] {msg}", flush=True)


def find_doc_path(sidecar: Path) -> Path | None:
    """Find the source document next to a sidecar JSON file."""
    stem = sidecar.stem
    for ext in (".pdf", ".txt", ".html", ".htm"):
        candidate = sidecar.with_suffix(ext)
        if candidate.exists():
            return candidate
    # last resort — same stem, any non-json sibling
    for sibling in sidecar.parent.glob(f"{stem}.*"):
        if sibling.suffix.lower() != ".json":
            return sibling
    return None


def main() -> int:
    log(f"Building corpus index from {CORPUS}")
    documents: list[dict] = []
    by_source: dict[str, int] = {}
    by_insurer: dict[str, int] = {}
    by_category: dict[str, int] = {}

    for sub in SUBDIRS:
        sub_dir = CORPUS / sub
        if not sub_dir.exists():
            log(f"  · skipping missing dir {sub_dir}")
            continue
        sidecars = sorted(sub_dir.glob("*.json"))
        log(f"  · {sub}: {len(sidecars)} sidecars")
        for s in sidecars:
            try:
                meta = json.loads(s.read_text())
            except json.JSONDecodeError as e:
                log(f"    skip malformed {s.name}: {e}")
                continue
            doc_path = find_doc_path(s)
            entry = {
                "id": meta.get("id") or s.stem,
                "path": str(doc_path.relative_to(CORPUS)) if doc_path else None,
                "source_dir": sub,
                "source": meta.get("source", sub),
                "is_synthetic": bool(meta.get("is_synthetic", False)),
                "is_denial_letter": meta.get("is_denial_letter"),
                "doc_type": meta.get("doc_type", "denial_letter" if sub != "policy_bulletins" else "medical_policy_bulletin"),
                "insurer": meta.get("insurer"),
                "service": meta.get("service"),
                "category": meta.get("category"),
                "denial_code": meta.get("denial_code"),
                "denial_reason": meta.get("denial_reason"),
                "outcome": meta.get("outcome"),
                "notice_date": meta.get("notice_date"),
                "service_date": meta.get("service_date"),
                "post_date": meta.get("post_date"),
                "url": meta.get("url") or meta.get("post_url") or meta.get("policy_url"),
                "fetched_at": meta.get("fetched_at") or meta.get("generated_at"),
                "disclaimer": meta.get("disclaimer"),
            }
            documents.append(entry)
            by_source[sub] = by_source.get(sub, 0) + 1
            ins = entry.get("insurer")
            if ins:
                by_insurer[ins] = by_insurer.get(ins, 0) + 1
            cat = entry.get("category")
            if cat:
                by_category[cat] = by_category.get(cat, 0) + 1

    # sort: real first (denial letters first), then synthetic
    documents.sort(key=lambda d: (
        0 if d["source_dir"] == "real_imr" else
        1 if d["source_dir"] == "reddit_shared" else
        2 if d["source_dir"] == "policy_bulletins" else 3,
        d["id"],
    ))

    index = {
        "totalDocuments": len(documents),
        "lastBuilt": datetime.now(timezone.utc).isoformat(),
        "bySource": by_source,
        "byInsurer": dict(sorted(by_insurer.items(), key=lambda kv: -kv[1])),
        "byCategory": dict(sorted(by_category.items(), key=lambda kv: -kv[1])),
        "syntheticCount": sum(1 for d in documents if d.get("is_synthetic")),
        "realCount": sum(1 for d in documents if not d.get("is_synthetic")),
        "documents": documents,
    }
    out = CORPUS / "index.json"
    out.write_text(json.dumps(index, indent=2))
    log(f"wrote {out} — {len(documents)} docs ({index['realCount']} real, {index['syntheticCount']} synthetic)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
