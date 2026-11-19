// Generates src/data/seed-analytics.json: synthetic, anonymised demo data (no real people).
import { writeFileSync } from "node:fs";

let s = 20240611;
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const drills = {
  "collect-request": { concept: "upi-safety", limit: 120, steps: ["spot-flags", "open-app", "decline-request", "check-balance", "block-report"], weak: ["spot-flags", "block-report", "check-balance"] },
  "lost-phone": { concept: "fraud-response", limit: 120, steps: ["call-bank", "block-sim", "secure-accounts", "report-cybercrime"], weak: ["secure-accounts", "report-cybercrime", "block-sim"] },
  "wrong-transfer": { concept: "reversals", limit: 150, steps: ["skip-pleading", "note-txn", "raise-complaint", "contact-bank", "escalate-npci"], weak: ["escalate-npci", "note-txn", "skip-pleading"] },
  "loan-offer": { concept: "interest-credit", limit: 150, steps: ["spot-flags", "use-calculator", "check-lender", "decline-revoke"], weak: ["check-lender", "use-calculator", "spot-flags"] },
};
const ids = Object.keys(drills);
const cohorts = ["Cohort A", "Cohort B", "Cohort C"];
const used = new Set();
const records = [];

for (let i = 0; i < 40; i++) {
  let id;
  do { id = "L-" + int(0x1000, 0xffff).toString(16).toUpperCase(); } while (used.has(id));
  used.add(id);
  const cohort = cohorts[i % 3];
  const skill = 0.45 + rnd() * 0.5;
  const nAttempts = int(2, 5);
  const start = int(30, 56);
  for (let a = 0; a < nAttempts; a++) {
    const drillId = ids[(i + a) % ids.length];
    const d = drills[drillId];
    const growth = a * 0.06;
    const base = Math.min(0.98, skill + growth + (rnd() - 0.5) * 0.18);
    const critical = rnd() < (0.22 - skill * 0.14 - a * 0.02);
    const missed = [];
    for (const st of d.steps) {
      const p = (d.weak.includes(st) ? 0.42 : 0.14) * (1.15 - base);
      if (rnd() < p) missed.push(st);
    }
    let score = Math.round(Math.max(18, Math.min(100, base * 100 - missed.length * 8)));
    if (critical) score = Math.min(score, 20);
    const orderScore = Math.round(Math.max(20, Math.min(100, 100 - missed.length * 14 - (1 - base) * 25)));
    const speed = Math.round(Math.max(15, Math.min(100, base * 100 + (rnd() - 0.5) * 24)));
    const redFlags = Math.round(Math.max(0, Math.min(100, base * 100 + (rnd() - 0.4) * 30)));
    const completionSec = Math.round(d.limit * (0.35 + (1 - base) * 0.6 + rnd() * 0.1));
    records.push({
      learnerId: id, cohort, drillId, concept: d.concept,
      daysAgo: Math.max(0, start - a * int(5, 11) - int(0, 3)),
      score, order: orderScore, speed, redFlags, critical,
      completionSec: Math.min(completionSec, d.limit),
      quizPassed: !critical && rnd() < 0.55 + base * 0.4,
      missedStepIds: missed,
    });
  }
}

const out = { note: "Synthetic demo data for Money Fire Drill. Not real learners, not real statistics.", records };
writeFileSync("src/data/seed-analytics.json", JSON.stringify(out, null, 1));
console.log("records:", records.length, "learners:", used.size);
