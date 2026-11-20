import type { Drill, Scenario, VariableSpec } from "@/types";
import { formatNumberIN } from "@/utils/formatters";
import { mulberry32, pick, randomInt, seedCode, DEMO_SEED, type Rng } from "@/utils/seedRandom";

export const DEMO_AMOUNT = 4500;

/** Expanded variable pools for legacy and composable Indian fraud drills. */
export const SCAM_VARIABLE_POOLS: Record<string, VariableSpec> = {
  name: ["Rohit", "Meera", "Karan", "Ananya", "Imran", "Divya", "Sanjay", "Priya"],
  app: ["PayWave", "UPIGo", "QuickPay", "FlashUPI"],
  bank: ["Astra Bank", "Apex Trust Bank", "NeoCommerce Bank"],
  bankName: ["Astra Bank", "Apex Trust Bank", "NeoCommerce Bank", "Sahyadri Bank"],
  amount: { min: 1500, max: 48000, step: 500 },
  balance: { min: 12000, max: 62000, step: 250 },
  telco: ["Zephyr Mobile", "Nimbus Telecom", "Orbit Cellular"],
  lender: ["QuickRupee Now", "InstaCash Hub", "FastFunds Lend"],
  scammerName: [
    "Rakesh Verma",
    "Vikram Malhotra",
    "Suresh Sharma",
    "Amit Khanna",
    "Pooja Nair",
    "Deepak Tiwari",
  ],
  scammerVpa: [
    "refund.desk@okaxis",
    "claim.help@ybl",
    "kyc.verify@ibl",
    "cashback.care@paytm",
    "customs.pay@okicici",
  ],
  merchantName: ["OLX QuickSell", "QuickBazaar", "UrbanMart India", "SnapDeals Hub", "MetroShop"],
  callerAgency: [
    "Mumbai Cyber Crime Cell",
    "FedEx Customs Desk",
    "TRAI Enforcement Unit",
    "Maharashtra Electricity Board",
    "CBI Narcotics Desk",
  ],
  maskedPhone: [
    "+91-98XXX-4120",
    "+91-97XXX-8304",
    "+91-91XXX-6592",
    "+91-88XXX-2941",
    "+91-93XXX-5718",
  ],
  fakeApkName: [
    "BESCOM_BillUpdate_v2.apk",
    "MSEDCL_PayFix.apk",
    "KSEB_KYC_Support.apk",
    "PowerGrid_QuickPay.apk",
  ],
  relativeRole: ["Dad", "Mom", "Elder Brother", "Cousin Arjun", "Aunt Meera"],
};

const NUMERIC_KEYS = new Set(["amount", "balance"]);

function resolveSpec(rng: Rng, spec: VariableSpec): string | number {
  if (Array.isArray(spec)) return pick(rng, spec);
  const steps = Math.floor((spec.max - spec.min) / spec.step);
  return spec.min + randomInt(rng, 0, steps) * spec.step;
}

function resolveTime(rng: Rng): string {
  const h = randomInt(rng, 8, 21);
  const m = randomInt(rng, 0, 59);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function resolveTxnId(rng: Rng): string {
  let digits = "";
  for (let i = 0; i < 10; i += 1) digits += String(randomInt(rng, 0, 9));
  return `T${digits}`;
}

function resolveUtrNumber(rng: Rng): string {
  let digits = String(randomInt(rng, 4, 6));
  for (let i = 0; i < 11; i += 1) digits += String(randomInt(rng, 0, 9));
  return digits;
}

export function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = mapStrings(v, fn);
    return out;
  }
  return value;
}

/**
 * Recursively interpolates `{{placeholder}}` tokens across drill copy, trigger payload,
 * steps, composableSteps (`props`, `notification`, `redFlagPhrases`, `trapIntents`), redFlags, and hints.
 * Card `tagline` strings stay static so catalog cards never display raw tokens.
 */
export function interpolateDrillWithVars(drill: Drill, vars: Record<string, string>): Drill {
  const replace = (s: string) => substitute(s, vars);
  const rendered: Drill = {
    ...drill,
    title: replace(drill.title),
    tagline: drill.tagline,
    intro: replace(drill.intro),
    variables: drill.variables,
    trigger: mapStrings(drill.trigger, replace) as Drill["trigger"],
    steps: mapStrings(drill.steps, replace) as Drill["steps"],
    distractors: mapStrings(drill.distractors, replace) as Drill["distractors"],
    critical: mapStrings(drill.critical, replace) as Drill["critical"],
    redFlags: mapStrings(drill.redFlags, replace) as Drill["redFlags"],
    hints: mapStrings(drill.hints, replace) as Drill["hints"],
  };

  if (drill.composableSteps) {
    rendered.composableSteps = mapStrings(drill.composableSteps, replace) as Drill["composableSteps"];
  }

  return rendered;
}

/**
 * Builds a scenario from a seed. Same seed => same names, amounts and wording.
 * Only text changes; step logic is identical on every run.
 */
export function createScenario(drill: Drill, seed: number, opts: { demo?: boolean } = {}): Scenario {
  const demo = Boolean(opts.demo);
  const effectiveSeed = demo ? DEMO_SEED : seed & 0xffff;
  const rng = mulberry32(effectiveSeed);

  const specs: Record<string, VariableSpec> = { ...SCAM_VARIABLE_POOLS, ...drill.variables };
  const vars: Record<string, string> = {};

  // Sorted keys keep the random sequence stable even if JSON key order changes.
  for (const key of Object.keys(specs).sort()) {
    const value = resolveSpec(rng, specs[key]);
    vars[key] = NUMERIC_KEYS.has(key) && typeof value === "number" ? formatNumberIN(value) : String(value);
  }
  if (demo && "amount" in specs) vars.amount = formatNumberIN(DEMO_AMOUNT);

  // Keep bank / bankName aligned when a drill specifies only one of them
  if (drill.variables?.bank && !drill.variables?.bankName) {
    vars.bankName = vars.bank;
  } else if (drill.variables?.bankName && !drill.variables?.bank) {
    vars.bank = vars.bankName;
  }

  vars.time = resolveTime(rng);
  vars.txnId = resolveTxnId(rng);
  vars.utrNumber = vars.utrNumber || resolveUtrNumber(rng);
  if (!vars.upiId) {
    const handle = `${vars.name.toLowerCase()}.${randomInt(rng, 10, 99)}@${vars.app.toLowerCase()}`;
    vars.upiId = handle;
  }

  const rendered = interpolateDrillWithVars(drill, vars);

  return { seed: effectiveSeed, seedCode: seedCode(effectiveSeed), demo, vars, drill: rendered };
}
