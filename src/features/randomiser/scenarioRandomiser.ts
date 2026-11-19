import type { Drill, Scenario, VariableSpec } from "@/types";
import { formatNumberIN } from "@/utils/formatters";
import { mulberry32, pick, randomInt, seedCode, DEMO_SEED, type Rng } from "@/utils/seedRandom";

export const DEMO_AMOUNT = 4500;

/** Defaults used when a drill does not define its own pool for a variable. */
const DEFAULT_VARIABLES: Record<string, VariableSpec> = {
  name: ["Rohit", "Meera", "Karan", "Ananya", "Imran", "Divya", "Sanjay", "Priya"],
  app: ["PayWave", "UPIGo", "QuickPay", "FlashUPI"],
  bank: ["Astra Bank", "Apex Trust Bank", "NeoCommerce"],
  amount: { min: 1500, max: 48000, step: 500 },
  balance: { min: 12000, max: 62000, step: 250 },
  telco: ["Zephyr Mobile", "Nimbus Telecom", "Orbit Cellular"],
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

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function mapStrings(value: unknown, fn: (s: string) => string): unknown {
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
 * Builds a scenario from a seed. Same seed => same names, amounts and wording.
 * Only text changes; step logic is identical on every run.
 */
export function createScenario(drill: Drill, seed: number, opts: { demo?: boolean } = {}): Scenario {
  const demo = Boolean(opts.demo);
  const effectiveSeed = demo ? DEMO_SEED : seed & 0xffff;
  const rng = mulberry32(effectiveSeed);

  const specs: Record<string, VariableSpec> = { ...DEFAULT_VARIABLES, ...drill.variables };
  const vars: Record<string, string> = {};

  // Sorted keys keep the random sequence stable even if JSON key order changes.
  for (const key of Object.keys(specs).sort()) {
    const value = resolveSpec(rng, specs[key]);
    vars[key] = NUMERIC_KEYS.has(key) && typeof value === "number" ? formatNumberIN(value) : String(value);
  }
  if (demo && "amount" in specs) vars.amount = formatNumberIN(DEMO_AMOUNT);

  vars.time = resolveTime(rng);
  vars.txnId = resolveTxnId(rng);
  if (!vars.upiId) {
    const handle = `${vars.name.toLowerCase()}.${randomInt(rng, 10, 99)}@${vars.app.toLowerCase()}`;
    vars.upiId = handle;
  }

  const rendered = mapStrings(drill, (s) => substitute(s, vars)) as Drill;
  // Keep the raw variable specs on the rendered copy (they are not templates).
  rendered.variables = drill.variables;

  return { seed: effectiveSeed, seedCode: seedCode(effectiveSeed), demo, vars, drill: rendered };
}

export { substitute };
