import type {
  Concept,
  ConceptId,
  Drill,
  LibraryData,
  LibraryEntry,
  Quiz,
  ScamType,
  Scenario,
} from "@/types";
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
import { DEMO_SEED } from "@/utils/seedRandom";

const CUSTOM_DRILLS_KEY = "mfd_custom_drills";
const SHORT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * DRILL REGISTRY.
 * To add a drill: drop a new JSON file in src/data/drills, import it above and add it to this list.
 */
const BUILTIN_DRILLS: Drill[] = [
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

function readCustomDrillsFromStorage(): Drill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_DRILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is Drill =>
        Boolean(
          d &&
            typeof d === "object" &&
            typeof (d as Drill).id === "string" &&
            SHORT_ID_PATTERN.test((d as Drill).id),
        ),
    );
  } catch {
    return [];
  }
}

function writeCustomDrillsToStorage(drills: Drill[]) {
  customDrillsCache = drills;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_DRILLS_KEY, JSON.stringify(drills));
  } catch {
    // Ignore storage quota errors in restricted WebViews
  }
}

export function listCustomDrills(): Drill[] {
  if (typeof window === "undefined") return customDrillsCache ?? [];
  const fresh = readCustomDrillsFromStorage();
  customDrillsCache = fresh;
  return fresh;
}

export function registerCustomDrill(drill: Drill): Drill[] {
  if (!SHORT_ID_PATTERN.test(drill.id)) {
    throw new Error(`Invalid custom drill ID: ${drill.id}`);
  }
  const normalized: Drill = {
    ...drill,
    isCustom: true,
    createdAt: drill.createdAt ?? Date.now(),
  };
  const current = listCustomDrills().filter((d) => d.id !== normalized.id);
  const next = [normalized, ...current];
  writeCustomDrillsToStorage(next);
  return next;
}

export function removeCustomDrill(id: string): Drill[] {
  const next = listCustomDrills().filter((d) => d.id !== id);
  writeCustomDrillsToStorage(next);
  return next;
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

export function listBuiltinDrills(): Drill[] {
  return BUILTIN_DRILLS;
}

export function listDrills(): Drill[] {
  return [...listCustomDrills(), ...BUILTIN_DRILLS];
}

export function getDrill(id: string | undefined): Drill | undefined {
  if (!id) return undefined;
  return BUILTIN_DRILLS.find((d) => d.id === id) ?? listCustomDrills().find((d) => d.id === id);
}

export function loadInterpolatedDrill(
  id: string | undefined,
  seed = DEMO_SEED,
  opts: { demo?: boolean } = {},
): Scenario | undefined {
  const drill = getDrill(id);
  if (!drill) return undefined;
  return createScenario(drill, seed, opts);
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
