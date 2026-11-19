import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  History,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { summariseEvents } from "@/features/analytics/adminSelectors";
import {
  getConceptWeakness,
  getMastery,
  getReadiness,
  getRecommendedDrill,
} from "@/features/adaptive/adaptiveEngine";
import { getConcept, getDrill, listConcepts } from "@/features/drills/drillLoader";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { conceptIcons } from "@/theme/icons";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/formatters";

type View = "me" | "family";

const CHECKLISTS: Record<View, Array<{ id: string; text: string }>> = {
  me: [
    { id: "me-1", text: "Save my bank's 24×7 helpline and 1930 in my phone." },
    { id: "me-2", text: "Remember: a UPI PIN is only for sending money, never for receiving." },
    { id: "me-3", text: "Know how to block UPI and cards by calling my bank's helpline." },
    { id: "me-4", text: "Know who to call to block my SIM." },
    { id: "me-5", text: "Keep screenshots and transaction IDs after any payment problem." },
    { id: "me-6", text: "Never share my PIN or OTP, even if a message looks official." },
  ],
  family: [
    { id: "fam-1", text: "Save 1930 and the bank helpline on every family phone." },
    { id: "fam-2", text: "Tell everyone: nobody needs a PIN to send you money." },
    { id: "fam-3", text: "Agree to call a family member before acting on any urgent money message." },
    { id: "fam-4", text: "Practise one fire drill together this week." },
    { id: "fam-5", text: "Keep a list of the family's banks and cards somewhere safe." },
    { id: "fam-6", text: "Know where to report: 1930 and cybercrime.gov.in." },
  ],
};

export default function ProgressChecklist() {
  const attempts = useDrillStore((s) => s.attempts);
  const events = useAnalyticsStore((s) => s.events);
  const checked = useUserStore((s) => s.checklist);
  const toggle = useUserStore((s) => s.toggleChecklist);
  const [view, setView] = useState<View>("me");

  const concepts = listConcepts();
  const mastery = useMemo(() => getMastery(attempts), [attempts]);
  const readiness = useMemo(() => getReadiness(attempts), [attempts]);
  const weakness = useMemo(() => getConceptWeakness(attempts), [attempts]);
  const recommendation = useMemo(() => getRecommendedDrill(attempts), [attempts]);
  const summary = useMemo(() => summariseEvents(events), [events]);
  const history = useMemo(() => [...attempts].sort((a, b) => b.finishedAt - a.finishedAt), [attempts]);
  const items = CHECKLISTS[view];
  const doneCount = items.filter((i) => checked.includes(i.id)).length;

  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference * (1 - readiness / 100);

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 pb-6">
      <div className="no-print flex flex-col gap-5">
        {/* Section 1: Overall Readiness Header Card */}
        <section className="relative flex flex-col items-center overflow-hidden rounded-[28px] bg-st-surface-low p-6 text-center shadow-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-st-secondary-fixed/40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-st-primary-fixed-dim/30 blur-xl" />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-secondary-container px-3 py-1 text-[12px] font-semibold text-st-on-secondary-container">
            <ShieldCheck size={15} strokeWidth={2} aria-hidden />
            {readiness >= 75 ? "Tier 1 Defender: Shield Ready" : "Active Fire Drill Training"}
          </span>

          <div className="relative my-3 grid h-36 w-36 place-items-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e3e2e0" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="#006c48"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline">
                <span className="tnum text-[32px] font-bold leading-none tracking-tight text-st-primary">
                  {readiness}
                </span>
                <span className="ml-0.5 text-[12px] text-st-on-surface-variant">/100</span>
              </div>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-st-secondary">
                {readiness >= 80 ? "Excellent" : readiness >= 50 ? "Building" : "Start Drills"}
              </span>
            </div>
          </div>

          <h1 className="text-[22px] font-bold tracking-tight text-st-primary">Financial Cyber Readiness</h1>
          <p className="mt-1 max-w-[340px] text-[14px] text-st-on-surface-variant">
            See what you know, what to rehearse next, and your real-life emergency checklist.
          </p>

          <div className="mt-4 grid w-full max-w-[460px] grid-cols-2 gap-2 rounded-2xl bg-st-surface-container/80 p-3 sm:grid-cols-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                Step Accuracy
              </span>
              <span className="tnum mt-0.5 text-[15px] font-bold text-st-primary">
                {summary.stepActions === 0 ? "–" : `${summary.stepAccuracy}%`}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                Red Flags
              </span>
              <span className="tnum mt-0.5 text-[15px] font-bold text-st-secondary">
                {summary.flagTaps === 0 ? "–" : `${summary.flagAccuracy}%`}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                Critical
              </span>
              <span className="tnum mt-0.5 text-[15px] font-bold text-st-on-surface">{summary.criticalCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                Taps Logged
              </span>
              <span className="tnum mt-0.5 text-[15px] font-bold text-st-on-surface">{summary.stepActions}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Concept Mastery & Adaptive Mistake Tracking */}
        <section className="space-y-4 rounded-[28px] bg-st-surface-low p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[20px] font-bold text-st-primary">Concept Mastery &amp; Tracking</h2>
              <p className="text-[13px] text-st-on-surface-variant">
                Weighted by your recent simulation scores and mistakes
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-st-surface-highest text-st-on-surface-variant">
              <BarChart3 size={19} strokeWidth={2} aria-hidden />
            </span>
          </div>

          <ul className="space-y-2.5">
            {concepts.map((c) => {
              const Icon = conceptIcons[c.id];
              const value = mastery[c.id];
              const needsPractice = weakness[c.id] > 0;
              return (
                <li key={c.id} className="space-y-2 rounded-2xl bg-st-surface p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} strokeWidth={2} className="text-st-secondary" aria-hidden />
                      <span className="text-[15px] font-bold text-st-on-surface">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {needsPractice && (
                        <span className="rounded-full bg-st-tertiary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-st-on-tertiary-fixed">
                          Needs practice
                        </span>
                      )}
                      <span
                        className={cn(
                          "tnum text-[14px] font-bold",
                          value !== null && value >= 70 ? "text-st-secondary" : "text-st-primary",
                        )}
                      >
                        {value === null ? "Not started" : `${value}%`}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-st-surface-container">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        value !== null && value >= 70 ? "bg-st-secondary" : "bg-st-primary-container",
                      )}
                      style={{ width: `${value ?? 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Adaptive Target Micro-Drill CTA */}
          <div className="flex flex-col gap-3 rounded-2xl bg-st-surface-container p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
                <Sparkles size={17} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-st-primary">Suggested next: {recommendation.drill.title}</p>
                <p className="text-[12px] text-st-on-surface-variant">{recommendation.reason}</p>
              </div>
            </div>
            <Link
              to={`/drills/${recommendation.drill.id}/brief`}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
            >
              <RotateCcw size={16} strokeWidth={2} aria-hidden />
              <span>Run Target Drill</span>
            </Link>
          </div>
        </section>

        {/* Section 3: Attempt History */}
        <section className="space-y-3 rounded-[28px] bg-st-surface-low p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold text-st-primary">Attempt History</h2>
            <span className="text-[12px] font-semibold text-st-on-surface-variant">
              {history.length} total
            </span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-st-surface p-8 text-center">
              <History size={28} strokeWidth={1.75} className="text-st-on-surface-variant" aria-hidden />
              <p className="text-[16px] font-bold text-st-primary">No attempts yet</p>
              <p className="max-w-[34ch] text-[13px] text-st-on-surface-variant">
                Your drills will appear here with scores and the concepts to revisit.
              </p>
              <Link
                to="/drills"
                className="mt-1 rounded-full bg-st-primary-container px-5 py-2.5 text-[14px] font-semibold text-st-on-primary"
              >
                Pick a drill
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 12).map((a) => {
                const drill = getDrill(a.drillId);
                const quizScore = a.quiz
                  ? `${a.quiz.answers.filter((x) => x.correct).length}/${a.quiz.answers.length}`
                  : null;
                return (
                  <li key={a.id}>
                    <Link
                      to={`/drills/${a.drillId}/results?attempt=${a.id}`}
                      className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl bg-st-surface p-4 shadow-sm transition-colors hover:bg-st-surface-lowest"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-st-on-surface">{drill?.title ?? a.drillId}</p>
                        <p className="text-[12px] text-st-on-surface-variant">
                          {formatDateTime(a.finishedAt)} · {getConcept(a.concept).title}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {a.grade.critical && (
                          <span className="rounded-full bg-st-error px-2.5 py-0.5 text-[11px] font-semibold text-st-on-error">
                            Critical
                          </span>
                        )}
                        {quizScore && (
                          <span className="rounded-full bg-st-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-surface-variant">
                            Quiz {quizScore}
                          </span>
                        )}
                        <span className="tnum w-12 text-right text-[16px] font-bold text-st-secondary">
                          {a.grade.total}%
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Section 4: Real-Life Armor / Emergency Checklist (also prints cleanly) */}
      <section className="space-y-4 rounded-[28px] bg-st-surface-low p-6 shadow-sm" aria-labelledby="checklist-heading">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-st-secondary-fixed text-st-on-secondary-fixed">
              <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h2 id="checklist-heading" className="text-[20px] font-bold leading-tight text-st-primary">
                Real-Life Armor Checklist
              </h2>
              <p className="text-[13px] text-st-on-surface-variant">Account &amp; family emergency safeguards</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="tnum rounded-full bg-st-secondary-container px-3 py-1 text-[12px] font-bold text-st-secondary">
              {doneCount} / {items.length} Done
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-st-surface px-3.5 text-[13px] font-semibold text-st-primary shadow-sm"
            >
              <Printer size={15} strokeWidth={2} aria-hidden />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Segmented Switch */}
        <div className="no-print inline-flex w-full max-w-[360px] rounded-full bg-st-surface-container p-1">
          <button
            type="button"
            onClick={() => setView("me")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-semibold transition-all",
              view === "me" ? "bg-st-primary-container text-st-on-primary shadow-sm" : "text-st-on-surface-variant",
            )}
          >
            <User size={15} strokeWidth={2} aria-hidden />
            <span>My checklist</span>
          </button>
          <button
            type="button"
            onClick={() => setView("family")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-semibold transition-all",
              view === "family" ? "bg-st-primary-container text-st-on-primary shadow-sm" : "text-st-on-surface-variant",
            )}
          >
            <Users size={15} strokeWidth={2} aria-hidden />
            <span>Family view</span>
          </button>
        </div>

        <p className="print-only text-[20px] font-bold">
          Money Fire Drill · {view === "me" ? "My emergency checklist" : "Family emergency checklist"}
        </p>

        <div className="space-y-2">
          {items.map((item) => {
            const done = checked.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl bg-st-surface px-4 py-3 shadow-sm transition-colors hover:bg-st-surface-lowest"
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(item.id)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#006c48]"
                />
                <span className={cn("text-[15px]", done && "text-st-on-surface-variant line-through opacity-75")}>
                  {item.text}
                </span>
              </label>
            );
          })}
        </div>

        <p className="text-[12px] text-st-on-surface-variant">
          Education, not personal advice · No real payments. In an emergency use your bank&apos;s 24×7 helpline, call
          1930 or visit cybercrime.gov.in.
        </p>
      </section>
    </div>
  );
}
