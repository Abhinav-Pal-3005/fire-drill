import type { Concept, ConceptId, Drill, LibraryData, LibraryEntry, Quiz, ScamType, Scenario } from "@/types";
import conceptsJson from "@/data/concepts.json";
import collectRequest from "@/data/drills/collect-request.json";
import lostPhone from "@/data/drills/lost-phone.json";
import wrongTransfer from "@/data/drills/wrong-transfer.json";
import loanOffer from "@/data/drills/loan-offer.json";
import phishingSms from "@/data/drills/phishing-sms.json";
import digitalArrest from "@/data/drills/digital-arrest.json";
import qrMarketplaceRefund from "@/data/drills/qr-marketplace-refund.json";
import electricityBillApk from "@/data/drills/electricity-bill-apk.json";
import fedexCustomsParcel from "@/data/drills/fedex-customs-parcel.json";
import voiceCloneEmergency from "@/data/drills/voice-clone-emergency.json";
import quizUpi from "@/data/quizzes/upi-safety.json";
import quizFraud from "@/data/quizzes/fraud-response.json";
import quizReversals from "@/data/quizzes/reversals.json";
import quizInterest from "@/data/quizzes/interest-credit.json";
import quizPhishing from "@/data/quizzes/phishing-indicators.json";
import quizDigitalArrest from "@/data/quizzes/digital-arrest.json";
import { fraudCases, fraudCategories, type FraudCategoryId } from "@/data/fraudCases";
import { createScenario } from "@/features/randomiser/scenarioRandomiser";
import { newSeed } from "@/utils/seedRandom";

export const CUSTOM_DRILLS_STORAGE_KEY = "mfd_custom_drills";

/**
 * DRILL REGISTRY.
 * To add a drill: drop a new JSON file in src/data/drills, import it above and add it to BUILT_IN_DRILLS.
 * Composable drills require zero new React scene files.
 */
const BUILT_IN_DRILLS: Drill[] = [
  collectRequest,
  wrongTransfer,
  lostPhone,
  loanOffer,
  phishingSms,
  digitalArrest,
  qrMarketplaceRefund,
  electricityBillApk,
  fedexCustomsParcel,
  voiceCloneEmergency,
] as unknown as Drill[];

let customDrillsCache: Drill[] | null = null;

function readStoredCustomDrills(): Drill[] {
  if (typeof window === "undefined") return customDrillsCache ?? [];
  if (customDrillsCache !== null) return customDrillsCache;
  try {
    const raw = window.localStorage.getItem(CUSTOM_DRILLS_STORAGE_KEY);
    if (!raw) {
      customDrillsCache = [];
      return customDrillsCache;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      customDrillsCache = [];
      return customDrillsCache;
    }
    customDrillsCache = parsed.filter(
      (item): item is Drill =>
        Boolean(item) && typeof item === "object" && typeof (item as Drill).id === "string" && typeof (item as Drill).title === "string",
    );
    return customDrillsCache;
  } catch {
    customDrillsCache = [];
    return customDrillsCache;
  }
}

function writeStoredCustomDrills(drills: Drill[]): void {
  customDrillsCache = drills;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_DRILLS_STORAGE_KEY, JSON.stringify(drills));
  } catch {
    // Ignore storage quota / private-browsing errors
  }
}

/** Register (or update) a custom drill in memory and persist it in localStorage (`mfd_custom_drills`). */
export function registerCustomDrill(drill: Drill): Drill {
  const normalized: Drill = {
    ...drill,
    isCustom: true,
    createdAt: drill.createdAt ?? Date.now(),
  };
  const current = readStoredCustomDrills().filter((d) => d.id !== normalized.id);
  const next = [normalized, ...current];
  writeStoredCustomDrills(next);
  return normalized;
}

/** Remove a custom drill by id from memory and localStorage. */
export function removeCustomDrill(id: string): void {
  const current = readStoredCustomDrills();
  const next = current.filter((d) => d.id !== id);
  writeStoredCustomDrills(next);
}

/** List all registered custom drills persisted in localStorage. */
export function listCustomDrills(): Drill[] {
  return [...readStoredCustomDrills()];
}

const QUIZZES: Quiz[] = [
  quizUpi,
  quizFraud,
  quizReversals,
  quizInterest,
  quizPhishing,
  quizDigitalArrest,
] as unknown as Quiz[];

const CONCEPTS = conceptsJson as unknown as Concept[];

const CATEGORY_META: Record<
  FraudCategoryId,
  { label: string; concept: ConceptId; linkedDrillId: string }
> = {
  "upi-pin-trap": { label: "UPI PIN Trap", concept: "upi-safety", linkedDrillId: "collect-request" },
  "wrong-transfer": { label: "Wrong Transfer / Refund", concept: "reversals", linkedDrillId: "wrong-transfer" },
  "lost-phone": { label: "Lost Phone", concept: "fraud-response", linkedDrillId: "lost-phone" },
  "instant-loan": { label: "Instant Loan App", concept: "interest-credit", linkedDrillId: "loan-offer" },
  phishing: { label: "Phishing SMS", concept: "phishing-indicators", linkedDrillId: "phishing-sms" },
  "digital-arrest": { label: "Digital Arrest", concept: "fraud-response", linkedDrillId: "digital-arrest" },
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const LIBRARY_DATA: LibraryData = {
  updateNote: "18 reported Indian fraud cases across 6 categories · Cited news & police sources",
  scamTypes: fraudCategories.map((c) => ({
    id: c.id as ScamType,
    label: CATEGORY_META[c.id].label,
  })),
  entries: fraudCases.map((fc) => {
    const meta = CATEGORY_META[fc.categoryId];
    return {
      id: fc.id,
      title: fc.title,
      scamType: fc.categoryId,
      concept: meta.concept,
      location: fc.location,
      amountLost: fc.amountLost,
      summary: fc.summary,
      howItWorks: splitSentences(fc.howItWorked),
      redFlags: fc.warningSigns,
      howToStop: fc.safetyTips,
      source: {
        name: fc.source.title,
        publisher: fc.source.publisher,
        url: fc.source.url,
        date: fc.date,
      },
      linkedDrillId: meta.linkedDrillId,
      verified: true,
      lastVerifiedOn: fc.date,
    };
  }),
};

/** Returns all built-in drills plus any custom user-generated drills. */
export function listDrills(): Drill[] {
  const custom = readStoredCustomDrills();
  return [...custom, ...BUILT_IN_DRILLS];
}

export function listBuiltInDrills(): Drill[] {
  return BUILT_IN_DRILLS;
}

export function getDrill(id: string | undefined): Drill | undefined {
  if (!id) return undefined;
  return readStoredCustomDrills().find((d) => d.id === id) ?? BUILT_IN_DRILLS.find((d) => d.id === id);
}

/**
 * Loads a drill by ID and recursively interpolates all `{{placeholder}}` tokens across
 * step props, notifications, trigger payloads, red flags, and hints using a deterministic seed.
 */
export function loadInterpolatedDrill(
  id: string | undefined,
  seed: number = newSeed(),
  opts: { demo?: boolean } = {},
): Scenario | undefined {
  const raw = getDrill(id);
  if (!raw) return undefined;
  return createScenario(raw, seed, opts);
}

export function listConcepts(): Concept[] {
  return CONCEPTS;
}

export function getConcept(id: ConceptId): Concept {
  const found = CONCEPTS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown concept: ${id}`);
  return found;
}

export function getQuiz(id: string | null | undefined): Quiz | undefined {
  return QUIZZES.find((q) => q.id === id);
}

/** Drills that practise a concept, as primary or related concept. */
export function drillsForConcept(concept: ConceptId): Drill[] {
  return listDrills().filter((d) => d.concept === concept || d.relatedConcepts.includes(concept));
}

export function getLibrary(): LibraryData {
  return LIBRARY_DATA;
}

export function getLibraryEntry(id: string | undefined): LibraryEntry | undefined {
  return LIBRARY_DATA.entries.find((e) => e.id === id);
}
