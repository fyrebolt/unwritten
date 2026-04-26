/**
 * Sanity test for the LiveLetter typing pacing.
 *
 * Reproduces the math from `LiveLetter.tsx` against the real `appealLetter`
 * fixture and asserts:
 *   1. The typing finishes BEFORE the `done` flag fires (so there's no jump).
 *   2. `dynamicCharTarget` is monotonically non-decreasing across the timeline.
 *   3. The final `dynamicCharTarget` equals the total letter length.
 *   4. The "settle buffer" is honoured — typing reaches the end before
 *      `simulationSeconds`.
 *
 * Run with: node scripts/test-typing-pacing.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const letterPath = resolve(here, "..", "lib", "mock", "letter.ts");
const letterSource = readFileSync(letterPath, "utf8");

// Pull every sentence's `text:` literal out of the TS source. Avoids needing
// a transpile step just to count characters.
const TEXT_RE = /text:\s*"((?:[^"\\]|\\.)*)"/g;
const sentenceTexts = [];
let m;
while ((m = TEXT_RE.exec(letterSource)) !== null) {
  sentenceTexts.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}
if (sentenceTexts.length === 0) {
  throw new Error("Couldn't find any sentence texts in lib/mock/letter.ts");
}

const TOTAL_LETTER_CHARS = sentenceTexts.reduce(
  (sum, t) => sum + t.length + 1,
  0,
);

// Mirror the constants in CaseWorkspaceClient.tsx + LiveLetter.tsx.
const SIMULATION_SECONDS = 20;
const DRAFTING_START = 12.4;
const TYPING_SETTLE_BUFFER_S = 0.55;
const TYPING_DURATION = Math.max(0.5, SIMULATION_SECONDS - DRAFTING_START);

const effectiveDuration = Math.max(0.5, TYPING_DURATION - TYPING_SETTLE_BUFFER_S);
const charsPerSec = TOTAL_LETTER_CHARS / effectiveDuration;

function visibleCharsAt(elapsed) {
  const letterProgress = Math.max(0, elapsed - DRAFTING_START);
  const ratio = Math.min(1, Math.max(0, letterProgress / effectiveDuration));
  const dynamic = Math.min(
    TOTAL_LETTER_CHARS,
    Math.round(ratio * TOTAL_LETTER_CHARS),
  );
  const done = elapsed >= SIMULATION_SECONDS;
  return done ? TOTAL_LETTER_CHARS : dynamic;
}

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

console.log("=== Typing pacing test ===");
console.log(`  letter total chars     = ${TOTAL_LETTER_CHARS}`);
console.log(`  simulation seconds     = ${SIMULATION_SECONDS}`);
console.log(`  drafting starts at     = ${DRAFTING_START}s`);
console.log(`  typing duration        = ${TYPING_DURATION.toFixed(2)}s`);
console.log(`  settle buffer          = ${TYPING_SETTLE_BUFFER_S}s`);
console.log(`  effective duration     = ${effectiveDuration.toFixed(2)}s`);
console.log(`  derived charsPerSec    = ${charsPerSec.toFixed(1)}`);
console.log("");

// --- Test 1: monotonically non-decreasing ----------------------------------
let prev = 0;
let sample;
for (let t = 0; t <= SIMULATION_SECONDS + 1; t += 1 / 60) {
  sample = visibleCharsAt(t);
  if (sample < prev) {
    failures.push(`regression at t=${t.toFixed(3)}: ${sample} < ${prev}`);
    break;
  }
  prev = sample;
}
assert(prev === TOTAL_LETTER_CHARS, `final visibleChars = ${prev}, expected ${TOTAL_LETTER_CHARS}`);

// --- Test 2: typing finishes BEFORE done fires -----------------------------
const epsilon = 1 / 240; // sub-frame
const justBeforeDone = visibleCharsAt(SIMULATION_SECONDS - epsilon);
const atDone = visibleCharsAt(SIMULATION_SECONDS);
assert(
  justBeforeDone === TOTAL_LETTER_CHARS,
  `at t=${SIMULATION_SECONDS - epsilon}, visibleChars=${justBeforeDone}, expected ${TOTAL_LETTER_CHARS} (typing should be complete BEFORE done fires)`,
);
assert(
  atDone === TOTAL_LETTER_CHARS,
  `at t=${SIMULATION_SECONDS}, visibleChars=${atDone}, expected ${TOTAL_LETTER_CHARS}`,
);

// --- Test 3: no jump at the done boundary ----------------------------------
const delta = atDone - justBeforeDone;
assert(
  delta === 0,
  `JUMP DETECTED at done boundary: visibleChars went ${justBeforeDone} -> ${atDone} (delta ${delta})`,
);

// --- Test 4: settle buffer honoured ----------------------------------------
// At simulation - settleBuffer, typing should already be complete.
const atSettlePoint = visibleCharsAt(
  SIMULATION_SECONDS - TYPING_SETTLE_BUFFER_S,
);
assert(
  atSettlePoint === TOTAL_LETTER_CHARS,
  `at settle point t=${SIMULATION_SECONDS - TYPING_SETTLE_BUFFER_S}, visibleChars=${atSettlePoint}, expected ${TOTAL_LETTER_CHARS}`,
);

// --- Test 5: nothing visible before drafting starts ------------------------
assert(
  visibleCharsAt(DRAFTING_START - 0.1) === 0,
  `expected 0 chars before drafting starts`,
);
assert(
  visibleCharsAt(DRAFTING_START) === 0,
  `expected 0 chars exactly at drafting start`,
);

// --- Reporting -------------------------------------------------------------
const samples = [0, DRAFTING_START, DRAFTING_START + 1, DRAFTING_START + 3.5,
  SIMULATION_SECONDS - TYPING_SETTLE_BUFFER_S - 0.05,
  SIMULATION_SECONDS - TYPING_SETTLE_BUFFER_S,
  SIMULATION_SECONDS - 0.1, SIMULATION_SECONDS, SIMULATION_SECONDS + 0.5];
console.log("Sampled visible-char count by elapsed (s):");
for (const t of samples) {
  const v = visibleCharsAt(t);
  const pct = ((v / TOTAL_LETTER_CHARS) * 100).toFixed(1);
  console.log(`  t=${t.toFixed(2).padStart(5)}s  ->  ${String(v).padStart(5)} chars  (${pct}%)`);
}
console.log("");

if (failures.length === 0) {
  console.log("PASS — typing reaches the end before `done` fires; no jump.");
  process.exit(0);
} else {
  console.error("FAIL —");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
