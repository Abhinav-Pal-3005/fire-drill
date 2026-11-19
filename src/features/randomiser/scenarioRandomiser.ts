import type { Drill, Scenario, VariableSpec } from "@/types";
import { formatNumberIN } from "@/utils/formatters";
import { mulberry32, pick, randomInt, seedCode, DEMO_SEED, type Rng } from "@/utils/seedRandom";

export const DEMO_AMOUNT = 4500;

/**
 * Realistic Indian scam variable pools used when a drill does not define its own pool.
 * Covers both legacy placeholders (name, app, bank, telco, upiId, txnId)
 * and parameterized PracticeOS placeholders (scammerName, scammerVpa, merchantName,
 * bankName, callerAgency, maskedPhone, fakeApkName, utrNumber).
 */
export const SCAM_VARIABLE_POOLS: Record<string, VariableSpec> = {
  name: ["Rohit", "Meera", "Karan", "Ananya", "Imran", "Divya", "Sanjay", "Priya"],
  app: ["PayWave", "UPIGo", "QuickPay", "FlashUPI"],
  bank: ["Astra Bank", "Apex Trust Bank", "NeoCommerce", "Surya National Bank"],
  bankName: ["Astra Bank", "Apex Trust Bank", "NeoCommerce", "Surya National Bank"],
  amount: { min: 1500, max: 48000, step: 500 },
  balance: { min: 12000, max: 62000, step: 250 },
  telco: ["Zephyr Mobile", "Nimbus Telecom", "Orbit Cellular"],
  scammerName: [
    "Vikram Sharma",
    "Rajesh Verma",
    "Arjun Malhotra",
    "Deepak Nair",
    "Sunil Tiwari",
    "Ramesh Kulkarni",
    "Amitabh Joshi",
    "Suresh Yadav",
  ],
  merchantName: [
    "QuickBazaar Mart",
    "MetroPower DISCOM",
    "UrbanKart Resale",
    "StateGrid Vidyut",
    "SwiftCourier India",
    "Vidyut Sewa Board",
  ],
  callerAgency: [
    "Mumbai Customs Enforcement",
    "FedEx India Security Desk",
    "TRAI Compliance Cell",
    "State Electricity Vigilance",
    "Narcotics & Parcel Clearance Desk",
  ],
  fakeApkName: [
    "PowerBill_Update_v4.apk",
    "VidyutKYC_QuickPay.apk",
    "SmartMeter_Sync.apk",
    "EBill_InstantFix.apk",
    "DiscomPay_Verify.apk",
  ],
  relativeRole: ["Cousin Rohan", "Uncle Rajesh", "Sister Neha", "Brother Amit"],
};

const UPI_HANDLES = ["okaxis", "ybl", "okicici", "ibl", "axl", "okhdfcbank"] as const;
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
  const prefix = String(randomInt(rng, 401, 499));
  let rest = "";
  for (let i = 0; i < 9; i += 1) rest += String(randomInt(rng, 0, 9));
  return `${prefix}${rest}`;
}

function resolveMaskedPhone(rng: Rng): string {
  const lead = pick(rng, ["98", "97", "96", "93", "88", "87", "79", "70"]);
  const tail = String(randomInt(rng, 1000, 9999));
  return `+91-${lead}XXX-${tail}`;
}

function resolveScammerVpa(rng: Rng, scammerName: string): string {
  const slug = scammerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .split(".")[0];
  const suffix = pick(rng, ["pay", "refund", "help", "verify", "desk", "care"]);
  const num = randomInt(rng, 11, 99);
  const handle = pick(rng, UPI_HANDLES);
  return `${slug}.${suffix}${num}@${handle}`;
}

/** Replaces every `{{placeholder}}` token cleanly so no raw template syntax leaks into the UI. */
export function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** Recursively walks any nested object/array/string and maps every string leaf. */
export function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = mapStrings(v, fn);
    }
    return out;
  }
  return value;
}

/** Recursively interpolates all `{{placeholder}}` tokens across a drill object, including composableSteps. */
export function interpolateDrillWithVars(drill: Drill, vars: Record<string, string>): Drill {
  const rendered = mapStrings(drill, (s) => substitute(s, vars)) as Drill;
  // Preserve raw variable specs untouched (they define pools/ranges, not display strings).
  rendered.variables = drill.variables;
  return rendered;
}

/**
 * Builds a deterministic scenario from a seed. Same seed => identical names, VPAs, amounts, and wording.
 * Replaying with a new seed generates fresh Indian scam identities, handles, phone numbers, and UTRs.
 */
export function createScenario(drill: Drill, seed: number, opts: { demo?: boolean } = {}): Scenario {
  const demo = Boolean(opts.demo);
  const effectiveSeed = demo ? DEMO_SEED : seed & 0xffff;
  const rng = mulberry32(effectiveSeed);

  const specs: Record<string, VariableSpec> = { ...SCAM_VARIABLE_POOLS, ...drill.variables };
  const vars: Record<string, string> = {};

  // Sorted keys keep the seeded random sequence deterministic across JSON key ordering.
  for (const key of Object.keys(specs).sort()) {
    const value = resolveSpec(rng, specs[key]);
    vars[key] = NUMERIC_KEYS.has(key) && typeof value === "number" ? formatNumberIN(value) : String(value);
  }

  if (demo && "amount" in specs) {
    vars.amount = formatNumberIN(DEMO_AMOUNT);
  }

  // Keep bank and bankName synchronized unless the drill explicitly overrides both.
  if (drill.variables?.bank && !drill.variables?.bankName) {
    vars.bankName = vars.bank;
  } else if (drill.variables?.bankName && !drill.variables?.bank) {
    vars.bank = vars.bankName;
  } else {
    vars.bankName = vars.bank;
  }

  vars.time = resolveTime(rng);
  vars.txnId = resolveTxnId(rng);
  vars.utrNumber = vars.utrNumber || resolveUtrNumber(rng);
  vars.maskedPhone = vars.maskedPhone || resolveMaskedPhone(rng);

  if (!vars.upiId) {
    const first = (vars.name || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
    const appSlug = (vars.app || "upi").toLowerCase().replace(/[^a-z0-9]/g, "");
    vars.upiId = `${first}.${randomInt(rng, 10, 99)}@${appSlug}`;
  }

  if (!vars.scammerVpa) {
    vars.scammerVpa = resolveScammerVpa(rng, vars.scammerName || vars.name || "helpdesk");
  }

  const rendered = interpolateDrillWithVars(drill, vars);

  return { seed: effectiveSeed, seedCode: seedCode(effectiveSeed), demo, vars, drill: rendered };
}
