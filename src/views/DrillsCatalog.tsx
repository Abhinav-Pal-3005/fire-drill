import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Play,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Verified,
  Wand2,
} from "lucide-react";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { getReadiness, getRecommendedDrill, bestScoreFor } from "@/features/adaptive/adaptiveEngine";
import { getConcept, listBuiltInDrills } from "@/features/drills/drillLoader";
import { compileScamToDrill, type CustomScamTheme } from "@/features/drills/smartDrillCompiler";
import { useDrillStore } from "@/store/useDrillStore";
import { conceptIcons } from "@/theme/icons";
import type { Difficulty, Drill } from "@/types";
import { cn } from "@/utils/cn";
import { formatClock } from "@/utils/formatters";

const SEVERITY_LABEL: Record<Difficulty, { text: string; tone: string }> = {
  easy: { text: "Core Scenario", tone: "bg-st-surface-variant text-st-on-surface-variant" },
  medium: { text: "High Severity", tone: "bg-st-tertiary-fixed text-st-on-tertiary-fixed" },
  hard: { text: "Critical Risk", tone: "bg-st-error-container text-st-on-error-container" },
};

const THEME_OPTIONS: Array<{ id: CustomScamTheme; label: string }> = [
  { id: "auto", label: "Auto-detect" },
  { id: "upi-collect", label: "UPI Collect / QR" },
  { id: "apk-phishing", label: "APK / KYC Link" },
  { id: "customs-call", label: "Customs / IVR Call" },
  { id: "voice-clone", label: "Voice-Clone Call" },
  { id: "instant-loan", label: "Instant Loan Trap" },
];

const SAMPLE_SCAMS: Array<{ label: string; theme: CustomScamTheme; text: string }> = [
  {
    label: "Marketplace QR refund",
    theme: "upi-collect",
    text: "Hi I am buying your sofa for ₹14,500 right now. I sent a collect request from fastbuyer@okaxis. Approve and enter your UPI PIN urgently to receive the money!",
  },
  {
    label: "Electricity .APK cut",
    theme: "apk-phishing",
    text: "URGENT: Your electricity meter will be DISCONNECTED tonight at 9:30 PM for unpaid ₹3,200 bill. Install PowerBillUpdate.apk or click https://bit.ly/power-kyc9 immediately.",
  },
  {
    label: "Hospital voice emergency",
    theme: "voice-clone",
    text: "Please help! I met with an accident near the flyover. Do not call my regular number — send ₹25,000 urgently to nursehelp@okicici before they refuse hospital admission!",
  },
];

export default function DrillsCatalog() {
  const navigate = useNavigate();
  const attempts = useDrillStore((s) => s.attempts);
  const customDrills = useDrillStore((s) => s.customDrills);
  const syncCustomDrills = useDrillStore((s) => s.syncCustomDrills);
  const registerCustomDrill = useDrillStore((s) => s.registerCustomDrill);
  const removeCustomDrill = useDrillStore((s) => s.removeCustomDrill);
  const ensureSeed = useDrillStore((s) => s.ensureSeed);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [scamText, setScamText] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<CustomScamTheme>("auto");
  const [compiling, setCompiling] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);

  useEffect(() => {
    syncCustomDrills();
  }, [syncCustomDrills]);

  const builtInDrills = listBuiltInDrills();
  const drills: Drill[] = [...customDrills, ...builtInDrills];
  const readiness = getReadiness(attempts);
  const recommendation = getRecommendedDrill(attempts);
  const completedCount = new Set(attempts.filter((a) => a.grade.completed).map((a) => a.drillId)).size;

  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference * (1 - readiness / 100);

  const handleCompileAndLaunch = async () => {
    const trimmed = scamText.trim();
    if (!trimmed && selectedTheme === "auto") {
      setBuilderError("Paste a suspicious SMS/WhatsApp message or pick a scam theme first.");
      return;
    }

    setBuilderError(null);
    setCompiling(true);
    let compiled: Drill | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2200);
      try {
        const res = await fetch("/api/drills/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            theme: selectedTheme,
            title: customTitle.trim() || undefined,
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; drill?: Drill };
          if (data?.ok && data.drill) {
            compiled = data.drill;
          }
        }
      } catch {
        // Offline / static Capacitor build — fall through seamlessly to client-side compiler
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!compiled) {
        compiled = compileScamToDrill({
          text: trimmed,
          theme: selectedTheme,
          title: customTitle.trim() || undefined,
        });
      }

      const saved = registerCustomDrill(compiled);
      ensureSeed(saved.id, false);
      setBuilderOpen(false);
      setScamText("");
      setCustomTitle("");
      setSelectedTheme("auto");
      navigate(`/drills/${saved.id}/play`);
    } finally {
      setCompiling(false);
    }
  };

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
            {completedCount} of {drills.length} Drills completed · {attempts.length}{" "}
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

      {/* 3. Custom Scenario Builder Banner */}
      <div className="flex flex-col justify-between gap-3 rounded-[24px] border border-st-outline-variant/40 bg-st-surface-container p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-st-primary-fixed text-st-primary">
            <Wand2 size={20} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-st-primary">Turn any suspicious SMS into a playable drill</p>
            <p className="text-[13px] leading-snug text-st-on-surface-variant">
              Paste a real scam message or pick a theme to compile an instant offline PracticeOS drill.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setBuilderError(null);
            setBuilderOpen(true);
          }}
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-st-primary-container px-4 text-[13px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
        >
          <PlusCircle size={16} strokeWidth={2.2} aria-hidden />
          <span>Generate Custom Scenario</span>
        </button>
      </div>

      {/* 4. Active Fire Drills Section */}
      <section className="space-y-3" aria-labelledby="active-drills-heading">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Flame size={20} strokeWidth={2} className="text-st-primary" aria-hidden />
            <h1 id="active-drills-heading" className="text-[20px] font-bold tracking-tight text-st-primary">
              Active Fire Drills
            </h1>
          </div>
          <span className="text-[13px] font-semibold text-st-secondary">{drills.length} Timed Scenarios</span>
        </div>

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
                      <span className="inline-flex items-center gap-1 rounded-full bg-st-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-container">
                        <Clock size={12} strokeWidth={2} aria-hidden />
                        Timed · {formatClock(drill.timeLimitSec * 1000)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${severity.tone}`}>
                        {severity.text}
                      </span>
                      {drill.isCustom && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-st-primary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-st-primary">
                          <Layers size={11} strokeWidth={2} aria-hidden />
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {drill.isCustom && (
                        <button
                          type="button"
                          onClick={() => removeCustomDrill(drill.id)}
                          aria-label={`Remove ${drill.title}`}
                          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-st-surface text-st-on-surface-variant shadow-sm transition-colors hover:bg-st-error-container hover:text-st-on-error-container"
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

      {/* 5. Adaptive Recommendation Pill Box */}
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

      {/* Generate Custom Scenario Drawer */}
      <GlassSheet
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        title="Generate Custom Scenario"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <GlassButton
              size="lg"
              fullWidth
              disabled={compiling}
              icon={<Play size={17} strokeWidth={2} />}
              onClick={handleCompileAndLaunch}
            >
              {compiling ? "Compiling Drill…" : "Compile & Launch in PracticeOS"}
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-label-2">
            Paste any suspicious SMS, WhatsApp forward, or call script. Our offline compiler extracts amounts, links,
            UPI handles, and red flags into a playable PracticeOS simulation.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="custom-scam-text" className="block text-[12px] font-bold uppercase tracking-wider text-label-2">
              Suspicious message or script
            </label>
            <textarea
              id="custom-scam-text"
              rows={4}
              value={scamText}
              onChange={(e) => {
                setScamText(e.target.value);
                if (builderError) setBuilderError(null);
              }}
              placeholder="e.g. DEAR CONSUMER, your electricity power will be DISCONNECTED tonight. Install BillUpdate.apk or pay ₹2,400 urgently..."
              className="w-full rounded-2xl border border-black/10 bg-white/90 p-3 text-[13.5px] leading-relaxed text-label outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-label-2">
              Try a sample message
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_SCAMS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setScamText(sample.text);
                    setSelectedTheme(sample.theme);
                    setBuilderError(null);
                  }}
                  className="cursor-pointer rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-label transition-colors hover:bg-accent-tint hover:text-accent-text"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[12px] font-bold uppercase tracking-wider text-label-2">Scam theme</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((opt) => {
                const active = selectedTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(opt.id);
                      if (builderError) setBuilderError(null);
                    }}
                    className={cn(
                      "min-h-[40px] cursor-pointer rounded-xl border px-3 py-2 text-left text-[12px] font-bold transition-colors",
                      active
                        ? "border-accent bg-accent-tint text-accent-text"
                        : "border-black/10 bg-white/75 text-label hover:bg-white",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="custom-scam-title" className="block text-[12px] font-bold uppercase tracking-wider text-label-2">
              Scenario title (optional)
            </label>
            <input
              id="custom-scam-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Leave blank to auto-name"
              className="min-h-[44px] w-full rounded-xl border border-black/10 bg-white/90 px-3 text-[13.5px] text-label outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>

          {builderError && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-[12.5px] font-semibold text-danger-text">
              {builderError}
            </p>
          )}
        </div>
      </GlassSheet>
    </div>
  );
}
