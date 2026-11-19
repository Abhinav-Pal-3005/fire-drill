import type { Concept, ConceptId, Drill, LibraryData, LibraryEntry, Quiz, ScamType } from "@/types";
import conceptsJson from "@/data/concepts.json";
import collectRequest from "@/data/drills/collect-request.json";
import lostPhone from "@/data/drills/lost-phone.json";
import wrongTransfer from "@/data/drills/wrong-transfer.json";
import loanOffer from "@/data/drills/loan-offer.json";
import phishingSms from "@/data/drills/phishing-sms.json";
import digitalArrest from "@/data/drills/digital-arrest.json";
import quizUpi from "@/data/quizzes/upi-safety.json";
import quizFraud from "@/data/quizzes/fraud-response.json";
import quizReversals from "@/data/quizzes/reversals.json";
import quizInterest from "@/data/quizzes/interest-credit.json";
import quizPhishing from "@/data/quizzes/phishing-indicators.json";
import quizDigitalArrest from "@/data/quizzes/digital-arrest.json";
import { fraudCases, fraudCategories, type FraudCategoryId } from "@/data/fraudCases";

/**
 * DRILL REGISTRY.
 * To add a drill: drop a new JSON file in src/data/drills, import it above and add it to this list.
 */
const DRILLS: Drill[] = [
  collectRequest,
  wrongTransfer,
  lostPhone,
  loanOffer,
  phishingSms,
  digitalArrest,
] as unknown as Drill[];

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

export function listDrills(): Drill[] {
  return DRILLS;
}

export function getDrill(id: string | undefined): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
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
  return DRILLS.filter((d) => d.concept === concept || d.relatedConcepts.includes(concept));
}

export function getLibrary(): LibraryData {
  return LIBRARY_DATA;
}

export function getLibraryEntry(id: string | undefined): LibraryEntry | undefined {
  return LIBRARY_DATA.entries.find((e) => e.id === id);
}
