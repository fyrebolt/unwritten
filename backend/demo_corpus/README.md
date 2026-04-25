# Unwritten — demo corpus

A curated collection of **115 insurance denial documents** assembled to demonstrate
Unwritten on real and realistic source material. Built for the LA Hacks demo —
judges can browse this folder and inspect what the system retrieves over.

## What's in here

```
demo_corpus/
├── real_imr/             35 redacted IMR decisions from California DMHC
├── reddit_shared/        0  (Reddit blocks anonymous JSON API since 2024)
├── policy_bulletins/     10 Aetna Clinical Policy Bulletins
├── synthetic/            70 synthetic denial letters
├── index.json            master index of every document with metadata
└── README.md             this file
```

Every document has a `.json` sidecar with the same stem name as the source
document. The sidecar contains the structured metadata (insurer, service,
denial reason, source URL, dates) — that's what powers the demo's browse view
and what the retrieval pipeline indexes against.

## Stats

- **Total documents:** 115
- **Real:** 45 (35 IMR decisions + 10 policy bulletins)
- **Synthetic:** 70 (clearly labeled — see below)
- **Distinct insurers represented:** 7
- **Distinct service categories:** 8 (all 8 targets covered)

### By insurer
| Insurer                | Documents |
| ---------------------- | --------- |
| California Health Plan | 35        |
| Aetna                  | 18        |
| Anthem Blue Cross      | 16        |
| Kaiser Permanente      | 14        |
| UnitedHealthcare       | 13        |
| Blue Cross Blue Shield | 11        |
| Cigna                  |  8        |

(IMR documents from CHHS show the plan as "California Health Plan" — the
public dataset redacts plan names for privacy. Insurer-specific variation
in the corpus comes from the synthetic letters.)

### By category
| Category                  | Documents |
| ------------------------- | --------- |
| GLP-1 medications         | 22        |
| Physical therapy          | 20        |
| Prescription drug (brand) | 18        |
| Durable medical equipment | 17        |
| Surgery                   | 16        |
| Fertility treatment       |  8        |
| Mental health treatment   |  7        |
| MRI / imaging             |  7        |

## Sources

### 1. California DMHC Independent Medical Review (IMR) decisions — 35 docs

Public, redacted decisions from California's Independent Medical Review system,
fetched from the **CHHS Open Data Portal** CKAN datastore API:

- Dataset: https://data.chhs.ca.gov/dataset/independent-medical-review-imr-determinations-trend
- License: California Open Data License (public domain for our purposes)

Each document is a real IMR review of a denied claim. The `Findings` field is a
multi-paragraph narrative describing the patient's condition, the service
denied, the appeal arguments, and the reviewer's reasoning. These are
**textbook examples of what we're appealing against**.

The sample of 35 is round-robin selected across diagnosis/treatment categories
to maximize variety. Filter applied: minimum 600-character Findings + a
recognizable category mapping. We pulled from the most recent 5,000 rows of
the dataset.

### 2. Reddit r/HealthInsurance — 0 docs (intentionally documented)

Attempted via `https://www.reddit.com/r/HealthInsurance/search.json` (and
`old.reddit.com`). Both endpoints **return HTTP 403 to anonymous requests**
since Reddit's June 2023 API policy change — anonymous JSON access was
deprecated and now requires OAuth. We did not pursue OAuth for a
hackathon-research use case. The synthetic letters cover this gap.

If a judge wants Reddit content for the demo, point them at the public web
view of the subreddit: https://www.reddit.com/r/HealthInsurance/

### 3. Aetna Clinical Policy Bulletins (CPBs) — 10 docs

Aetna publishes its Clinical Policy Bulletins as public HTML pages at stable
URLs under `aetna.com/cpb/medical/data/`. We pulled 10 CPBs spanning multiple
service categories: Infertility, Weight Reduction (GLP-1), TMS, Eating
Disorders, Bariatric Surgery, Gender-Affirming Surgery, Cochlear Implants,
Infliximab, Dengue Vaccine, and the Obsolete Tests reference page. These are
**not denial letters** — they're the **criteria documents that denials cite**.
Hugely useful as supporting sources for the appeal-drafting pipeline (the
system retrieves from them to quote specific coverage criteria back at the
insurer).

A few Aetna CPB numbers have been re-purposed over time (CPB 0438 was
wheelchairs, now points to "Obsolete Tests"; CPB 0341 used to be Adalimumab,
now points to Infliximab). The sidecars carry `"title_corrected": true` and
the actual title returned by the URL — not what we initially expected.

Other insurers' policy URLs (UnitedHealthcare, Cigna PDFs, BCBS, Anthem,
Kaiser) returned 404 / 410 / generic error pages on the URLs we tried — they
have moved or require login. We didn't burn time chasing them; the Aetna CPBs
are representative of how an insurer specifies coverage criteria.

### 4. Synthetic denial letters — 70 docs

**Clearly labeled. Every synthetic file's sidecar JSON has `"is_synthetic": true`.**
Every synthetic `.txt` file ends with the line:

```
THIS IS A SYNTHETIC DOCUMENT — generated for the Unwritten demo corpus.
Modeled on the structure of real insurer denial letters; no real PHI included.
```

Synthetic letters fill the volume gap (real, full denial letters with
unredacted insurer-specific letterhead are PHI and not publicly available at
scale). They were authored from templates that capture each insurer's typical:

- Letterhead conventions (address, phone, appeal address)
- Opening paragraph voice
- Denial-reason boilerplate language
- Appeal-rights section structure
- CMS denial codes (CO-50, CO-197, PR-204, CO-96, CO-242, CO-167, CO-119, CO-109)
- Specific service / diagnosis combinations with valid ICD-10 codes

Patient identifiers in synthetic letters are **placeholder strings** — no real
names, no real member IDs. The names are literally `[REDACTED]`. The member
IDs use a `SAMPLE-XXXXXX` prefix to make them unmistakably non-real.

Generation is **template-based**, not LLM-based, for three reasons: (1)
deterministic output you can inspect, (2) no API key / network dependency at
build time, (3) it matches what state-of-the-art ML labs do for synthetic
augmentation when ground truth structure is well-understood. To swap in
LLM-generated content later, replace `make_letter()` in
`backend/scripts/generate_synthetic.py` with a Claude call — the rest of the
pipeline (sidecar JSON, file naming, index ingestion) is unchanged.

## How the demo uses this

1. The frontend's `/dashboard` view can browse this corpus as "example denials"
   the judge can pick from to seed a new appeal.
2. The retrieval pipeline indexes the `policy_bulletins/` HTML files as the
   coverage-criteria source the appeal cites against.
3. The `real_imr/` documents are useful as **reference precedent** — when
   drafting an appeal, the system can surface "here's a real IMR where this
   exact denial was overturned."
4. `index.json` is the canonical view — load it once and you have every
   document's metadata for filtering / search / aggregation.

## Provenance and PHI

- No real patient names anywhere in the corpus.
- IMR decisions are redacted by CHHS before public release.
- Synthetic letters use placeholder identifiers (`SAMPLE-XXXXXX`, `[REDACTED]`).
- Policy bulletins are insurer-published documents about coverage criteria,
  no patient data involved.

If you find anything that looks like leaked PHI, delete the file and email
`hello@unwritten.health`.

## Rebuilding the corpus

```bash
cd backend
# Each script is idempotent and resumable.
python3 scripts/scrape_dmhc.py             # ~10s, 35 IMR decisions
python3 scripts/scrape_reddit.py           # currently blocked by Reddit
python3 scripts/download_policy_bulletins.py  # ~30s, 10-14 CPBs
python3 scripts/generate_synthetic.py --count 70 --seed 42
python3 scripts/build_index.py             # writes demo_corpus/index.json
```

Last built: see `index.json` `lastBuilt` field.
