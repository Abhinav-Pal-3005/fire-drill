/* All shared types for Money Fire Drill. */

export type ConceptId =
  | "upi-safety"
  | "fraud-response"
  | "reversals"
  | "interest-credit"
  | "phishing-indicators";

export interface Concept {
  id: ConceptId;
  title: string;
  summary: string;
  keyFact: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export type TriggerType = "sms" | "chat" | "collect_request" | "loan_offer" | "lost_phone" | "balance_alert" | "digital_arrest";

export type VariableSpec = Array<string | number> | { min: number; max: number; step: number };

/** A tappable thing in the sandbox that is NOT a correct step (a plausible wrong move). */
export interface Action {
  id: string;
  actionKey: string;
  label: string;
  /** Which mock screen surfaces this action as a button. */
  screen: string;
  mistakeConcept: ConceptId;
  explanation: string;
  /** If set, tapping opens the fake PIN/OTP pad; completing it is a critical mistake. */
  opensPin?: "pin" | "otp";
}

export interface Step {
  id: string;
  label: string;
  actionKey: string;
  order: number;
  weight: number;
  mandatory: boolean;
  cue?: string;
  explanation: string;
  mistakeConcept: ConceptId;
}

export interface RedFlag {
  id: string;
  textFragment: string;
  label: string;
  explanation: string;
}

export interface CriticalInfo {
  title: string;
  explanation: string;
  /** Used by the adaptive engine, e.g. "You entered a PIN on a collect request last time, so rehearse this next." */
  reason: string;
  concept: ConceptId;
}

export interface Drill {
  id: string;
  title: string;
  tagline: string;
  concept: ConceptId;
  relatedConcepts: ConceptId[];
  difficulty: Difficulty;
  timeLimitSec: number;
  linkedLibraryIds: string[];
  intro: string;
  variables: Record<string, VariableSpec>;
  trigger: { type: TriggerType; payloadTemplate: Record<string, string> };
  steps: Step[];
  distractors: Action[];
  criticalActions: string[];
  critical: CriticalInfo;
  redFlags: RedFlag[];
  hints: Record<string, string>;
  quizId: string;
}

/* ---------------- Run + grading ---------------- */

export type ActionKind = "step" | "out_of_order" | "duplicate" | "distractor" | "critical" | "neutral";

export interface LoggedAction {
  actionKey: string;
  label: string;
  tMs: number;
  kind: ActionKind;
  stepId?: string;
}

export interface RunState {
  actions: LoggedAction[];
  flagsFound: string[];
  wrongTaps: number;
  hintsUsed: string[];
  critical: boolean;
}

export type StepStatus = "correct" | "wrong" | "out_of_order" | "missed" | "critical";

export interface StepResult {
  id: string;
  label: string;
  status: StepStatus;
  timeMs: number | null;
  explanation: string;
  kind: "step" | "extra";
  mistakeConcept?: ConceptId;
}

export type MistakeKind = "wrong" | "missed" | "out_of_order" | "critical" | "quiz";

export interface Mistake {
  concept: ConceptId;
  kind: MistakeKind;
  label: string;
}

export interface DrillGrade {
  /** 0-100 */
  total: number;
  stepScore: number;
  orderScore: number;
  redFlagScore: number;
  speedScore: number;
  hintsUsed: number;
  hintPenalty: number;
  critical: boolean;
  timedOut: boolean;
  completed: boolean;
  elapsedMs: number;
  flagsFound: number;
  flagsTotal: number;
  wrongTaps: number;
  results: StepResult[];
  mistakeConcepts: ConceptId[];
  mistakes: Mistake[];
}

/* ---------------- Randomiser ---------------- */

export interface Scenario {
  seed: number;
  seedCode: string;
  demo: boolean;
  vars: Record<string, string>;
  /** Drill with every template placeholder substituted. Step logic is identical across seeds. */
  drill: Drill;
}

/* ---------------- Quiz ---------------- */

export interface QuizOption {
  text: string;
  /** Shown when this wrong option is picked. Omitted for the correct option. */
  explanationWrong?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctIndex: number;
  explanationCorrect: string;
}

export interface Quiz {
  id: string;
  concept: ConceptId;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
}

/* ---------------- Library ---------------- */

export type ScamType =
  | "upi-pin-trap"
  | "wrong-transfer"
  | "lost-phone"
  | "instant-loan"
  | "phishing"
  | "digital-arrest";

export interface LibrarySource {
  name: string;
  publisher: string;
  url: string;
  date: string;
}

export interface LibraryEntry {
  id: string;
  title: string;
  scamType: ScamType;
  concept: ConceptId;
  location?: string;
  amountLost?: string;
  summary: string;
  howItWorks: string[];
  redFlags: string[];
  howToStop: string[];
  source: LibrarySource;
  linkedDrillId: string;
  verified: boolean;
  lastVerifiedOn: string;
}

export interface LibraryData {
  updateNote: string;
  scamTypes: Array<{ id: ScamType; label: string }>;
  entries: LibraryEntry[];
}

/* ---------------- Persisted attempts ---------------- */

export interface Attempt {
  id: string;
  drillId: string;
  concept: ConceptId;
  seed: number;
  demoSeed: boolean;
  startedAt: number;
  finishedAt: number;
  grade: DrillGrade;
  quiz?: { quizId: string; concept: ConceptId; answers: QuizAnswer[] };
}

/* ---------------- Analytics ---------------- */

export type EventType =
  | "drill_started"
  | "step_action"
  | "red_flag_tapped"
  | "critical_mistake"
  | "drill_completed"
  | "quiz_answered"
  | "library_opened"
  | "library_to_drill_clicked";

export interface AnalyticsEvent {
  id: string;
  ts: number;
  type: EventType;
  drillId: string;
  concept: ConceptId;
  stepId?: string;
  correct?: boolean;
  timeMs: number;
  seed: number;
}

export type LogEventInput = Omit<AnalyticsEvent, "id" | "ts">;

/** One anonymised attempt row, from seed data or the current learner. */
export interface AttemptRecord {
  learnerId: string;
  cohort: string;
  drillId: string;
  concept: ConceptId;
  daysAgo: number;
  score: number;
  order: number;
  speed: number;
  redFlags: number;
  critical: boolean;
  completionSec: number;
  quizPassed: boolean;
  missedStepIds: string[];
}

export interface SeedAnalytics {
  note: string;
  records: AttemptRecord[];
}

export type Role = "learner" | "admin";
