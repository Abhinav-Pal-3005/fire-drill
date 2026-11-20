import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Verified,
  Wand2,
  X,
} from "lucide-react";
import { getReadiness, getRecommendedDrill, bestScoreFor } from "@/features/adaptive/adaptiveEngine";
import { getConcept, listBuiltinDrills } from "@/features/drills/drillLoader";
import { compileScamToDrill, type ScamTheme } from "@/features/drills/smartDrillCompiler";
import { useDrillStore } from "@/store/useDrillStore";
import { conceptIcons } from "@/theme/icons";
import type { Difficulty, Drill } from "@/types";
import { formatClock } from "@/utils/formatters";

const SEVERITY_LABEL: Record<Difficulty, { text: string; tone: string }> = {
  easy: { text: "Core Scenario", tone: "bg-st-surface-variant text-st-on-surface-variant" },
  medium: { text: "High Severity", tone: "bg-st-tertiary-fixed text-st-on-tertiary-fixed" },
  hard: { text: "Critical Risk", tone: "bg-st-error-container text-st-on-error-container" },
};

const THEME_OPTIONS: Array<{ id: ScamTheme; label: string }> = [
  { id: "auto", label: "Auto-detect" },
  { id: "upi-collect", label: "UPI / QR Trap" },
  { id: "phishing-apk", label: "Phishing / APK" },
  { id: "authority-call", label: "Authority Call" },
  { id: "loan-trap", label: "Loan Offer" },
  { id: "voice-clone", label: "Emergency Call" },
];

const SAMPLE_SCAMS: Array<{ label: string; theme: ScamTheme; title: string; text: string }> = [
  {
    label: "QR Refund",
    theme: "upi-collect",
    title: "OLX Sofa QR Refund",
    text: "Buyer sending ₹8,500 advance for your sofa. Open your UPI app and enter PIN on qr.refund@okaxis collect request to receive the refund.",
  },
  {
    label: "Power APK",
    theme: "phishing-apk",
    title: "Power Cut APK Alert",
    text: "URGENT: Your electricity meter will be disconnected tonight at 9:30 PM. Install BESCOM_Support.apk and pay ₹12 immediately.",
  },
  {
    label: "Customs Call",
    theme: "authority-call",
    title: "Mumbai Customs Hold",
    text: "FedEx Customs HQ calling: an illegal parcel in your Aadhaar name is seized. Stay on video call and transfer ₹24,000 verification deposit now.",
  },
  {
    label: "Loan App",
    theme: "loan-trap",
    title: "Zero-Doc Instant Loan",
    text: "Pre-approved ₹50,000 instant credit in 2 minutes! Approve loan now, zero RBI check needed, auto-debit via credit.fast@okicici.",
  },
  {
    label: "Family SOS",
    theme: "voice-clone",
    title: "Hospital Voice Clone",
    text: "Mom I had a bike accident near station, my phone broke! Transfer ₹15,000 immediately to ambulance.pay@ybl before doctors start.",
  },
];

export default function DrillsCatalog() {
  const navigate = useNavigate();
  const attempts = useDrillStore((s) => s.attempts);
  const customDrills = useDrillStore((s) => s.customDrills);
  const refreshCustomDrills = useDrillStore((s) => s.refreshCustomDrills);
  const addCustomDrill = useDrillStore((s) => s.addCustomDrill);
  const deleteCustomDrill = useDrillStore((s) => s.deleteCustomDrill);
  const ensureSeed = useDrillStore((s) => s.ensureSeed);

  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [scamText, setScamText] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ScamTheme>("auto");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshCustomDrills();
  }, [refreshCustomDrills]);

  const builtinDrills = useMemo(() => listBuiltinDrills(), []);
  const drills = useMemo(() => [...customDrills, ...builtinDrills], [customDrills, builtinDrills]);

  const readiness = getReadiness(attempts);
  const recommendation = getRecommendedDrill(attempts);
  const completedCount = new Set(attempts.filter((a) => a.grade.completed).map((a) => a.drillId)).size;

  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference * (1 - readiness / 100);

  async function handleGenerateSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = scamText.trim();
    if (trimmed.length < 8) {
      setErrorMsg("Paste at least 8 characters of a suspicious SMS, WhatsApp forward, or call script.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    let compiled: Drill | null = null;
    try {
      const res = await fetch("/api/drills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          theme: selectedTheme,
          title: customTitle.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { drill?: Drill };
        if (data.drill) compiled = data.drill;
      } else if (res.status === 400 || res.status === 422) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(errData.error ?? "Unable to compile this prompt. Try adding more detail.");
        setSubmitting(false);
        return;
      }
    } catch {
      // Offline / Capacitor static WebView fallback handled below
    }

    if (!compiled) {
      compiled = compileScamToDrill({
        text: trimmed,
        theme: selectedTheme,
        title: customTitle.trim() || undefined,
      });
    }

    addCustomDrill(compiled);
    ensureSeed(compiled.id, false);
    setSubmitting(false);
    setGeneratorOpen(false);
    setScamText("");
    setCustomTitle("");
    navigate(`/drills/${compiled.id}/play`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-5 pb-6">
      {/* 1. Top Safe Sandbox Banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-st-surface-container px-4 py-3 shadow-sm">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-fixed text-st-primary">
          <ShieldCheck size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
            Safe Sandbox Mode
          </span>
          <p className="truncate text-[13px] text-st-on-surface-variant">
            Education simulation only. No real money or bank accounts accessed.
          </p>
        </div>
      </div>

      {/* 2. Quick Readiness Stat Card */}
      <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <div className="z-10 flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-st-secondary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-st-on-secondary-container">
            <Verified size={13} strokeWidth={2} aria-hidden />
            Fraud Readiness
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum text-[32px] font-bold leading-none tracking-tight text-st-primary">{readiness}%</span>
            <span className="text-[19px] font-semibold text-st-secondary">
              {readiness >= 75 ? "Ready" : attempts.length === 0 ? "Start" : "In Progress"}
            </span>
          </div>
          <p className="text-[13px] text-st-on-surface-variant">
            {completedCount} of {drills.length} Scenarios completed · {attempts.length}{" "}
            {attempts.length === 1 ? "attempt" : "attempts"}
          </p>
        </div>

        <div className="relative z-10 grid h-20 w-20 shrink-0 place-items-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="30" fill="transparent" stroke="#e3e2e0" strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="transparent"
              stroke="#006c48"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="absolute grid place-items-center text-st-secondary">
            <Verified size={22} strokeWidth={2} aria-hidden />
          </span>
        </div>

        <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-st-secondary-container/25" />
      </div>

      {/* 3. Active Fire Drills Section + Custom Generator */}
      <section className="space-y-3" aria-labelledby="active-drills-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Flame size={20} strokeWidth={2} className="text-st-primary" aria-hidden />
            <h1 id="active-drills-heading" className="text-[20px] font-bold tracking-tight text-st-primary">
              Active Fire Drills
            </h1>
            <span className="text-[13px] font-semibold text-st-secondary">· {drills.length}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setGeneratorOpen((prev) => !prev);
              setErrorMsg(null);
            }}
            aria-expanded={generatorOpen}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-st-primary-container px-4 py-1.5 text-[13px] font-semibold text-st-on-primary shadow-sm transition-transform hover:-translate-y-px active:scale-[0.98]"
          >
            {generatorOpen ? <X size={15} strokeWidth={2.2} aria-hidden /> : <Plus size={15} strokeWidth={2.2} aria-hidden />}
            <span>{generatorOpen ? "Close Builder" : "Generate Custom Scenario"}</span>
          </button>
        </div>

        {generatorOpen && (
          <form
            onSubmit={handleGenerateSubmit}
            className="space-y-4 rounded-[28px] border border-st-outline/20 bg-st-surface-container p-5 shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
                  <Wand2 size={18} strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold text-st-primary">Custom Scam-to-Drill Compiler</h2>
                  <p className="text-[13px] text-st-on-surface-variant">
                    Paste any suspicious SMS, WhatsApp forward, or call script to turn it into an interactive Practice OS drill.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
                Quick Sample Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SCAMS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setScamText(sample.text);
                      setCustomTitle(sample.title);
                      setSelectedTheme(sample.theme);
                      setErrorMsg(null);
                    }}
                    className="rounded-full bg-st-surface px-3 py-1 text-[12px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-secondary-container"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
                Scenario Pattern
              </span>
              <div className="flex flex-wrap gap-1.5">
                {THEME_OPTIONS.map((opt) => {
                  const active = selectedTheme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTheme(opt.id)}
                      className={
                        active
                          ? "rounded-full bg-st-primary-container px-3 py-1 text-[12px] font-semibold text-st-on-primary shadow-xs"
                          : "rounded-full bg-st-surface px-3 py-1 text-[12px] font-medium text-st-on-surface-variant shadow-xs hover:text-st-primary"
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <label htmlFor="custom-drill-title" className="mb-1 block text-[12px] font-semibold text-st-on-surface">
                  Scenario Title (optional)
                </label>
                <input
                  id="custom-drill-title"
                  type="text"
                  maxLength={80}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Suspicious Courier Customs Call"
                  className="w-full rounded-2xl border border-st-outline/25 bg-st-surface px-3.5 py-2.5 text-[14px] text-st-on-surface placeholder:text-st-outline focus:border-st-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="custom-scam-text" className="mb-1 block text-[12px] font-semibold text-st-on-surface">
                  Scam Message or Call Script
                </label>
                <textarea
                  id="custom-scam-text"
                  rows={3}
                  maxLength={2000}
                  value={scamText}
                  onChange={(e) => {
                    setScamText(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Paste the message, UPI handle, .apk filename, or caller threat you want to rehearse…"
                  className="w-full rounded-2xl border border-st-outline/25 bg-st-surface px-3.5 py-2.5 text-[14px] text-st-on-surface placeholder:text-st-outline focus:border-st-primary focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <p role="alert" className="rounded-xl bg-st-error-container px-3.5 py-2 text-[13px] font-medium text-st-on-error-container">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGeneratorOpen(false)}
                className="min-h-[42px] rounded-full bg-st-surface px-4 text-[13px] font-semibold text-st-on-surface-variant shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <Sparkles size={16} strokeWidth={2} aria-hidden />
                <span>{submitting ? "Compiling Drill…" : "Launch Practice Drill"}</span>
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {drills.map((drill, idx) => {
            const Icon = conceptIcons[drill.concept];
            const done = attempts.some((a) => a.drillId === drill.id && a.grade.completed);
            const best = bestScoreFor(attempts, drill.id);
            const severity = SEVERITY_LABEL[drill.difficulty];
            const featured = idx === 0 || (!done && recommendation.drill.id === drill.id);

            return (
              <div
                key={drill.id}
                className="flex flex-col justify-between gap-4 rounded-[28px] bg-st-surface-container p-5 shadow-sm transition-transform hover:-translate-y-px"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {drill.isCustom && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-st-primary-fixed px-2.5 py-0.5 text-[11px] font-bold text-st-primary">
                          <Sparkles size={11} strokeWidth={2} aria-hidden />
                          Custom
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-st-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-container">
                        <Clock size={12} strokeWidth={2} aria-hidden />
                        Timed · {formatClock(drill.timeLimitSec * 1000)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${severity.tone}`}>
                        {severity.text}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {drill.isCustom && (
                        <button
                          type="button"
                          onClick={() => deleteCustomDrill(drill.id)}
                          aria-label={`Delete custom scenario ${drill.title}`}
                          className="grid h-8 w-8 place-items-center rounded-full bg-st-surface text-st-on-surface-variant shadow-sm transition-colors hover:bg-st-error-container hover:text-st-on-error-container"
                        >
                          <Trash2 size={14} strokeWidth={2} aria-hidden />
                        </button>
                      )}
                      {done ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-st-secondary">
                          <CheckCircle2 size={15} strokeWidth={2} aria-hidden />
                          {best !== null ? `${best}%` : "Done"}
                        </span>
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-surface text-st-primary-container shadow-sm">
                          <Icon size={17} strokeWidth={2} aria-hidden />
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-[19px] font-bold leading-snug text-st-primary">{drill.title}</h2>
                    <p className="mt-1 text-[14px] leading-relaxed text-st-on-surface-variant">{drill.tagline}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-st-surface p-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-error-container text-st-on-error-container">
                        <AlertTriangle size={15} strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-st-on-surface">
                          {getConcept(drill.concept).title}
                        </p>
                        <p className="truncate text-[12px] text-st-on-tertiary-fixed-variant">
                          {drill.steps.length} graded steps · {drill.redFlags.length} red flags
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
                  </div>
                </div>

                <Link
                  to={`/drills/${drill.id}/brief`}
                  className={
                    featured
                      ? "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-st-primary-container px-5 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
                      : "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-st-surface px-5 text-[15px] font-semibold text-st-primary shadow-sm transition-transform hover:bg-st-surface-lowest active:scale-[0.98]"
                  }
                >
                  {done ? <RotateCcw size={17} strokeWidth={2} aria-hidden /> : <Play size={17} strokeWidth={2} aria-hidden />}
                  <span>{done ? "Practice Again" : "Start Drill"}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Adaptive Recommendation Pill Box */}
      <Link
        to={`/drills/${recommendation.drill.id}/brief`}
        className="flex items-center gap-3.5 rounded-[24px] bg-st-surface-container p-4 shadow-sm transition-transform hover:-translate-y-px active:scale-[0.99]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
          <Brain size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-st-secondary">
            Adaptive Recommendation
          </span>
          <h3 className="mt-0.5 truncate text-[15px] font-bold text-st-primary">{recommendation.drill.title}</h3>
          <p className="line-clamp-1 text-[13px] text-st-on-surface-variant">{recommendation.reason}</p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-st-outline" aria-hidden />
      </Link>
    </div>
  );
}

