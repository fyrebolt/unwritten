#!/usr/bin/env python3
"""
generate_synthetic.py

Generate ~60 synthetic insurance denial letters that read and look like real
ones. They fill the gap because actual unredacted denial letters are PHI and
not publicly available at scale.

Every output file's JSON sidecar has `"is_synthetic": true`. We do not deceive
anyone — these are clearly labeled as augmentation data. State-of-the-art ML
pipelines use synthetic data routinely.

Why no Anthropic API call?
Generating via API would cost money, require keys, and add network flakiness
to a 90-minute task. The templates below were authored with reference to real
DMHC IMR documents and capture insurer-specific phrasing patterns. Output is
deterministic given a seed — easier to inspect, faster to iterate on.

If you want to swap in API-generated content later, hook into make_letter()
and replace the template assembly with a Claude call — the rest of the
pipeline (sidecar JSON, file naming, index ingestion) is unchanged.

Usage: python3 generate_synthetic.py [--count 60] [--seed 42]
"""

import argparse
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo_corpus" / "synthetic"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    print(f"[{ts}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Insurer letterhead + voice profiles
# ---------------------------------------------------------------------------

INSURERS = {
    "Anthem Blue Cross": {
        "address": "P.O. Box 60007, Los Angeles, CA 90060-0007",
        "phone": "1-800-407-4627",
        "appeal_address": "Anthem Blue Cross — Grievance and Appeals\nP.O. Box 4310\nWoodland Hills, CA 91365-4310",
        "appeal_fax": "1-855-661-1828",
        "signoff_name": "Member Services — Anthem Blue Cross",
        "voice": "anthem",
    },
    "Aetna": {
        "address": "P.O. Box 14079, Lexington, KY 40512-4079",
        "phone": "1-800-872-3862",
        "appeal_address": "Aetna — National Appeals Unit\nP.O. Box 14463\nLexington, KY 40512",
        "appeal_fax": "1-959-282-2335",
        "signoff_name": "Aetna Clinical Coverage Review",
        "voice": "aetna",
    },
    "UnitedHealthcare": {
        "address": "P.O. Box 740800, Atlanta, GA 30374-0800",
        "phone": "1-866-633-2446",
        "appeal_address": "UnitedHealthcare — Appeals\nP.O. Box 30432\nSalt Lake City, UT 84130",
        "appeal_fax": "1-866-654-6323",
        "signoff_name": "UnitedHealthcare Clinical Services",
        "voice": "uhc",
    },
    "Blue Cross Blue Shield": {
        "address": "P.O. Box 660044, Dallas, TX 75266-0044",
        "phone": "1-800-521-2227",
        "appeal_address": "Blue Cross Blue Shield — Member Appeals\nP.O. Box 660717\nDallas, TX 75266-0717",
        "appeal_fax": "1-855-235-1055",
        "signoff_name": "Member Appeals — Blue Cross Blue Shield",
        "voice": "bcbs",
    },
    "Cigna": {
        "address": "900 Cottage Grove Road, Hartford, CT 06152",
        "phone": "1-800-244-6224",
        "appeal_address": "Cigna — National Appeals Organization\nP.O. Box 188011\nChattanooga, TN 37422-8011",
        "appeal_fax": "1-855-840-1678",
        "signoff_name": "Cigna Coverage Review Department",
        "voice": "cigna",
    },
    "Kaiser Permanente": {
        "address": "393 East Walnut Street, Pasadena, CA 91188",
        "phone": "1-800-464-4000",
        "appeal_address": "Kaiser Permanente — Member Relations Department\nP.O. Box 23170\nOakland, CA 94623",
        "appeal_fax": "1-510-625-5599",
        "signoff_name": "Member Relations — Kaiser Permanente",
        "voice": "kaiser",
    },
}


# ---------------------------------------------------------------------------
# Service categories with realistic specifics
# ---------------------------------------------------------------------------

SERVICES = {
    "GLP-1 medications": [
        ("Ozempic 1mg weekly injection",        "E11.65", "diabetes mellitus type 2 with hyperglycemia"),
        ("Wegovy 2.4mg weekly injection",        "E66.01", "morbid obesity, BMI 38.4"),
        ("Mounjaro 5mg weekly injection",        "E11.9",  "type 2 diabetes mellitus without complications"),
        ("Zepbound 10mg weekly injection",       "E66.01", "obesity with hypertension comorbidity"),
        ("Saxenda daily injection",              "E66.9",  "obesity, unspecified"),
        ("Trulicity 1.5mg weekly injection",     "E11.65", "type 2 diabetes with comorbid hypertension"),
    ],
    "MRI/imaging": [
        ("MRI lumbar spine without contrast",    "M51.16", "lumbar disc disorder with radiculopathy"),
        ("MRI brain with and without contrast",  "G43.909","migraine with aura, intractable"),
        ("MRI right knee without contrast",      "M23.205","derangement of meniscus, right knee"),
        ("CT chest with contrast",               "R91.8",  "abnormal findings on imaging of lung"),
        ("PET/CT scan whole body",               "C50.911","malignant neoplasm of breast, staging"),
        ("MRA brain and neck",                   "I65.23", "occlusion of bilateral carotid arteries"),
    ],
    "Mental health treatment": [
        ("Transcranial Magnetic Stimulation, 36 sessions",
         "F33.2",  "major depressive disorder, recurrent, severe"),
        ("Intensive Outpatient Program, 12 weeks",
         "F31.9",  "bipolar disorder, unspecified"),
        ("Esketamine (Spravato) nasal spray, 8 treatments",
         "F33.2",  "treatment-resistant major depression"),
        ("Inpatient psychiatric admission, 14 days",
         "F32.4",  "major depressive disorder with suicidal ideation"),
        ("Eating disorder residential program, 30 days",
         "F50.01", "anorexia nervosa, restricting type"),
        ("Applied Behavior Analysis, 25 hours/week",
         "F84.0",  "autism spectrum disorder"),
    ],
    "Physical therapy": [
        ("Physical therapy, 24 visits over 12 weeks",
         "M54.5",  "low back pain, post-surgical"),
        ("Aquatic therapy, 3x weekly for 8 weeks",
         "M17.11", "unilateral primary osteoarthritis, right knee"),
        ("Vestibular rehabilitation, 12 sessions",
         "H81.10", "benign paroxysmal positional vertigo"),
        ("Pelvic floor PT, 16 sessions",
         "N39.46", "mixed urinary incontinence"),
        ("Post-op rotator cuff PT, 30 sessions",
         "M75.101","unspecified rotator cuff tear, right shoulder"),
        ("Pediatric PT, 2x weekly for 6 months",
         "G80.9",  "cerebral palsy, unspecified"),
    ],
    "Surgery": [
        ("Laparoscopic gastric sleeve",          "E66.01", "morbid obesity, BMI 42.1"),
        ("Bilateral cochlear implant",           "H90.3",  "sensorineural hearing loss, bilateral"),
        ("Gender-affirming top surgery",         "F64.0",  "gender dysphoria"),
        ("Total hip arthroplasty, right",        "M16.11", "primary osteoarthritis of right hip"),
        ("Spinal fusion L4-L5",                  "M51.36", "degeneration of lumbar disc"),
        ("Septoplasty with turbinate reduction", "J34.2",  "deviated nasal septum"),
    ],
    "Fertility treatment": [
        ("In Vitro Fertilization (IVF) cycle 1", "N97.9",  "female infertility, unspecified"),
        ("Frozen embryo transfer",               "N97.0",  "female infertility associated with anovulation"),
        ("Intracytoplasmic sperm injection (ICSI)","N46.9","male infertility, unspecified"),
        ("Egg retrieval and cryopreservation",   "Z31.41", "encounter for fertility testing"),
        ("Genetic testing — preimplantation (PGT-A)","Z31.430","encounter for genetic carrier testing"),
        ("Letrozole-induced IUI cycles, 4 cycles","N97.9", "anovulatory infertility"),
    ],
    "Durable medical equipment": [
        ("Power wheelchair Group 3",             "G35",    "multiple sclerosis"),
        ("BiPAP machine with humidifier",        "G47.33", "obstructive sleep apnea, severe"),
        ("Continuous Glucose Monitor (Dexcom G7)","E10.9", "type 1 diabetes mellitus"),
        ("Hospital bed, semi-electric",          "M62.81", "muscle weakness, generalized"),
        ("Oxygen concentrator, portable",        "J44.9",  "chronic obstructive pulmonary disease"),
        ("Lower-limb prosthesis, microprocessor knee",
         "Z89.519","acquired absence of unspecified lower leg"),
    ],
    "Prescription drug (brand)": [
        ("Humira 40mg auto-injector pen, biweekly",
         "M06.9",  "rheumatoid arthritis, unspecified"),
        ("Dupixent 300mg subcutaneous injection",
         "L20.9",  "atopic dermatitis, severe"),
        ("Eliquis 5mg twice daily",
         "I48.91", "atrial fibrillation, unspecified"),
        ("Trikafta (elexacaftor/tezacaftor/ivacaftor)",
         "E84.9",  "cystic fibrosis"),
        ("Vyvanse 50mg daily",
         "F90.2",  "ADHD, combined presentation"),
        ("Sotyktu 6mg daily",
         "L40.0",  "plaque psoriasis, severe"),
    ],
}


# ---------------------------------------------------------------------------
# Denial reason templates with CMS code references
# ---------------------------------------------------------------------------

DENIAL_REASONS = [
    {
        "code": "CO-50",
        "label": "Not medically necessary",
        "summary": "The service does not meet the plan's criteria for medical necessity.",
        "boilerplate": "Based on the clinical information submitted, we have determined that the requested service does not meet our criteria for medical necessity. Our clinical reviewers compared the request against our published Medical Policy and the documentation provided does not establish that this service is required to evaluate, diagnose, or treat your condition.",
    },
    {
        "code": "CO-197",
        "label": "Prior authorization not obtained",
        "summary": "Required prior authorization was not obtained before the service was provided.",
        "boilerplate": "Our records show that prior authorization was not obtained for this service before it was rendered. Your plan requires that prior authorization be approved by us before services of this type are provided. Without prior authorization on file, this claim is not eligible for benefits under your contract.",
    },
    {
        "code": "PR-204",
        "label": "Service not covered under plan",
        "summary": "The service is not a covered benefit under the member's plan.",
        "boilerplate": "After careful review of your benefit plan, this service is not a covered benefit. Your Evidence of Coverage (EOC) lists categories of services that are excluded from coverage, and the requested service falls within one of those exclusions. We are therefore unable to authorize payment for this request.",
    },
    {
        "code": "CO-96",
        "label": "Non-covered charge",
        "summary": "Charge is not covered because the procedure is investigational/experimental.",
        "boilerplate": "Our medical policy classifies the requested procedure as investigational or experimental. This determination is based on a review of peer-reviewed published literature, position statements from medical specialty societies, and FDA labeling. Until established efficacy is demonstrated by adequately powered studies, this service does not meet our coverage criteria.",
    },
    {
        "code": "CO-242",
        "label": "Step therapy required",
        "summary": "Member must try and fail preferred therapy before this service is approved.",
        "boilerplate": "Our pharmacy benefit requires step therapy for this medication. Step therapy means you must first try one or more preferred medications before we will cover the requested non-preferred medication. Our records do not show documented trial and failure of the preferred alternatives required by your formulary.",
    },
    {
        "code": "CO-167",
        "label": "Diagnosis is not covered",
        "summary": "The diagnosis submitted is not a covered indication for this service.",
        "boilerplate": "The diagnosis you submitted with this request is not on the list of covered indications for this service. Our policy lists specific diagnostic conditions for which this service is approved, and the submitted diagnosis is not among them.",
    },
    {
        "code": "CO-119",
        "label": "Benefit maximum reached",
        "summary": "The benefit maximum for this service has been reached for this benefit period.",
        "boilerplate": "Your plan has a benefit limit on this service category. According to our records, the maximum number of visits or units allowed within the current benefit period has been reached. Additional services beyond this limit are the member's financial responsibility.",
    },
    {
        "code": "CO-109",
        "label": "Out-of-network provider",
        "summary": "The provider is not part of the member's network.",
        "boilerplate": "The provider who rendered this service is not contracted within your plan's network. Your plan covers services from in-network providers only, except in cases of emergency or pre-approved out-of-network referral. The submitted service does not appear to qualify under either exception.",
    },
]


# Voice-specific opening + closing snippets to make letters feel insurer-specific
VOICE_OPENING = {
    "anthem":  "Thank you for choosing Anthem Blue Cross. We have completed our review of the request submitted on your behalf and write to inform you of our determination.",
    "aetna":   "Aetna has completed clinical review of the service request below. This letter is your Notice of Adverse Benefit Determination.",
    "uhc":     "We received a request for prior authorization on your behalf. UnitedHealthcare has finished its medical necessity review and we are writing to share the outcome.",
    "bcbs":    "Blue Cross Blue Shield has completed review of the service request listed below. This letter explains the outcome and your appeal rights.",
    "cigna":   "We have completed our coverage review for the service identified below. The purpose of this letter is to inform you of Cigna's determination and your right to appeal.",
    "kaiser":  "This letter is to inform you of the outcome of your request for the service identified below. Kaiser Permanente has completed its review.",
}

VOICE_CLOSING = {
    "anthem":  "If you have questions about this notice, please call the Customer Care number on the back of your member ID card.",
    "aetna":   "If you have any questions, please contact Aetna Member Services using the number on your member ID card.",
    "uhc":     "We are committed to working with you. If you would like to discuss this decision, please call the number on the back of your health plan ID card.",
    "bcbs":    "If you have any questions about this letter or your benefits, please call the Member Services number on your ID card.",
    "cigna":   "If you have any questions, please call Cigna Customer Service at the number on your ID card.",
    "kaiser":  "If you have any questions, please call Member Services at the number listed on your Kaiser Permanente ID card.",
}


# ---------------------------------------------------------------------------
# Patient profile generator (no real names — clearly marked sample IDs)
# ---------------------------------------------------------------------------

FIRST_NAMES = ["Sample", "Patient", "Member", "Insured"]  # deliberately not real first names
LAST_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"]


def fake_member(rng: random.Random) -> dict:
    initial = rng.choice(LAST_NAMES)
    return {
        "name": f"[REDACTED]",
        "ref_letter": initial,
        "member_id": f"SAMPLE-{rng.randint(100000, 999999)}",
        "group_number": f"GRP-{rng.randint(10000, 99999)}",
        "dob": "[REDACTED]",
        "address_line": "[Member Address on File]",
        "claim_number": f"CLM-{rng.randint(10**8, 10**9-1)}",
        "auth_number": f"AUTH-{rng.choice('ABCDEFGHJKL')}{rng.randint(10**6, 10**7-1)}",
    }


def fake_provider(rng: random.Random) -> dict:
    return {
        "name": f"[Provider on File]",
        "npi": f"{rng.randint(10**9, 10**10-1)}",
        "facility": f"[Facility — Sample]",
    }


def random_date(rng: random.Random) -> datetime:
    base = datetime(2024, 1, 15)
    return base + timedelta(days=rng.randint(0, 720))


# ---------------------------------------------------------------------------
# Letter assembly
# ---------------------------------------------------------------------------

def make_letter(rng: random.Random, idx: int) -> tuple[str, dict]:
    insurer_name = rng.choice(list(INSURERS.keys()))
    insurer = INSURERS[insurer_name]

    category = rng.choice(list(SERVICES.keys()))
    service, dx_code, dx_label = rng.choice(SERVICES[category])

    reason = rng.choice(DENIAL_REASONS)
    member = fake_member(rng)
    provider = fake_provider(rng)
    notice_date = random_date(rng)
    service_date = notice_date - timedelta(days=rng.randint(7, 45))
    appeal_deadline = notice_date + timedelta(days=180)

    voice = insurer["voice"]
    opening = VOICE_OPENING[voice]
    closing = VOICE_CLOSING[voice]

    # Body — varies by reason code
    body = reason["boilerplate"]

    if reason["code"] == "CO-50":
        body += (
            f"\n\nSpecifically, the documentation submitted does not establish that {service} "
            f"is required for the diagnosis of {dx_label} (ICD-10 {dx_code}) under our published "
            f"Medical Policy. Conservative measures and lower-cost alternatives have not been "
            f"sufficiently documented as having been tried and failed."
        )
    elif reason["code"] == "CO-242":
        body += (
            f"\n\nFor {service}, our formulary requires documented trial and failure (or "
            f"contraindication) of two preferred alternatives before non-preferred therapy is "
            f"approved. The clinical notes submitted do not include this documentation."
        )
    elif reason["code"] == "CO-96":
        body += (
            f"\n\nWith regard to {service} for {dx_label}, our Medical Policy classifies this "
            f"intervention as investigational. We have not identified Phase III randomized "
            f"controlled trials supporting routine clinical use for this indication."
        )
    elif reason["code"] == "CO-197":
        body += (
            f"\n\nFor the date of service {service_date.strftime('%B %d, %Y')}, no prior "
            f"authorization request for {service} was received in our system before the service "
            f"was rendered."
        )
    elif reason["code"] == "PR-204":
        body += (
            f"\n\nYour Evidence of Coverage excludes {category.lower()} from covered benefits "
            f"except in narrowly defined circumstances. The documentation submitted does not "
            f"demonstrate that an exception applies."
        )
    else:
        body += (
            f"\n\nThe specific service under review is {service}, billed for the diagnosis of "
            f"{dx_label} (ICD-10 {dx_code})."
        )

    # Build the letter text
    lines = []
    lines.append(insurer_name.upper())
    lines.append(insurer["address"])
    lines.append(f"Customer Care: {insurer['phone']}")
    lines.append("")
    lines.append(notice_date.strftime("%B %d, %Y"))
    lines.append("")
    lines.append(member["name"])
    lines.append(member["address_line"])
    lines.append("")
    lines.append(f"Member: {member['name']}    DOB: {member['dob']}")
    lines.append(f"Member ID: {member['member_id']}    Group: {member['group_number']}")
    lines.append(f"Claim #: {member['claim_number']}    Auth #: {member['auth_number']}")
    lines.append(f"Provider: {provider['name']}    NPI: {provider['npi']}")
    lines.append(f"Date of service: {service_date.strftime('%m/%d/%Y')}")
    lines.append("")
    lines.append("RE: Notice of Adverse Benefit Determination")
    lines.append(f"Service: {service}")
    lines.append(f"Diagnosis: {dx_label} (ICD-10 {dx_code})")
    lines.append(f"Determination: DENIED — {reason['label']} ({reason['code']})")
    lines.append("")
    lines.append("Dear Member,")
    lines.append("")
    lines.append(opening)
    lines.append("")
    lines.append("REASON FOR DENIAL")
    lines.append(body)
    lines.append("")
    lines.append("MEDICAL POLICY APPLIED")
    lines.append(
        f"This determination was made under our Medical Policy / Clinical Policy Bulletin "
        f"covering {category}. You may request a free copy of the policy used in this review by "
        f"calling Member Services."
    )
    lines.append("")
    lines.append("YOUR APPEAL RIGHTS")
    lines.append(
        "You have the right to appeal this decision. To file an appeal, you or your authorized "
        "representative must submit a written request within 180 days of the date of this notice "
        f"({appeal_deadline.strftime('%B %d, %Y')}). Send your appeal to:"
    )
    lines.append("")
    lines.append(insurer["appeal_address"])
    lines.append(f"Fax: {insurer['appeal_fax']}")
    lines.append("")
    lines.append(
        "You may also request an Independent Medical Review (IMR) through your state regulator, "
        "and you may have rights to expedited review if a delay would seriously jeopardize your "
        "life or health. If your plan is governed by ERISA, you have additional federal appeal "
        "rights, including the right to bring civil action under §502(a) following exhaustion of "
        "the plan's internal appeal process."
    )
    lines.append("")
    lines.append("WHAT TO SUBMIT WITH YOUR APPEAL")
    lines.append(
        "Please include: (1) a copy of this notice; (2) the specific reasons you disagree with "
        "the determination; (3) any additional medical records, peer-reviewed literature, or "
        "letters of medical necessity that support your appeal; and (4) any other information you "
        "believe is relevant."
    )
    lines.append("")
    lines.append(closing)
    lines.append("")
    lines.append("Sincerely,")
    lines.append("")
    lines.append(insurer["signoff_name"])
    lines.append("")
    lines.append("---")
    lines.append("THIS IS A SYNTHETIC DOCUMENT — generated for the Unwritten demo corpus.")
    lines.append("Modeled on the structure of real insurer denial letters; no real PHI included.")

    text = "\n".join(lines)

    insurer_slug = insurer_name.lower().replace(" ", "_").replace("/", "")
    cat_slug = category.lower().replace(" ", "_").replace("/", "_")
    file_id = f"synth_{insurer_slug}_{cat_slug}_{idx:03d}"

    sidecar = {
        "id": file_id,
        "source": "Synthetic — Unwritten demo corpus",
        "is_synthetic": True,
        "is_denial_letter": True,
        "doc_type": "denial_letter",
        "insurer": insurer_name,
        "service": service,
        "category": category,
        "diagnosis_label": dx_label,
        "diagnosis_icd10": dx_code,
        "denial_code": reason["code"],
        "denial_reason": reason["label"],
        "denial_summary": reason["summary"],
        "outcome": "Denied",
        "notice_date": notice_date.date().isoformat(),
        "service_date": service_date.date().isoformat(),
        "appeal_deadline": appeal_deadline.date().isoformat(),
        "member_id_redacted": member["member_id"],
        "claim_number_redacted": member["claim_number"],
        "auth_number_redacted": member["auth_number"],
        "generator": "template-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "SYNTHETIC — generated for demo corpus. No real PHI.",
    }
    return text, sidecar


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=60)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    log(f"Synthetic denial letter generator — count={args.count} seed={args.seed}")
    log(f"output: {OUT_DIR}")

    written = 0
    for i in range(1, args.count + 1):
        text, sidecar = make_letter(rng, i)
        file_id = sidecar["id"]
        (OUT_DIR / f"{file_id}.txt").write_text(text)
        (OUT_DIR / f"{file_id}.json").write_text(json.dumps(sidecar, indent=2))
        written += 1
        if i % 10 == 0:
            log(f"  · {i}/{args.count} written")

    log(f"done — {written} synthetic letters written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
