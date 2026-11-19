import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Cloud,
  Edit3,
  HeartHandshake,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  RotateCcw,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "@/components/glass/GlassToast";
import { getReadiness } from "@/features/adaptive/adaptiveEngine";
import { getDrill } from "@/features/drills/drillLoader";
import { useFirebaseAuth } from "@/providers/FirebaseProvider";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { formatDuration } from "@/utils/formatters";

export default function Profile() {
  const attempts = useDrillStore((s) => s.attempts);
  const displayName = useUserStore((s) => s.displayName);
  const photoUrl = useUserStore((s) => s.photoUrl);
  const setDisplayName = useUserStore((s) => s.setDisplayName);
  const learnerId = useUserStore((s) => s.learnerId);
  const { user, syncing, authLoading, authError, signInWithGoogle, signOutUser } = useFirebaseAuth();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  const readiness = useMemo(() => getReadiness(attempts), [attempts]);
  const completedCount = useMemo(
    () => attempts.filter((a) => a.grade.completed).length,
    [attempts],
  );
  const avgScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((sum, a) => sum + a.grade.total, 0) / attempts.length);
  }, [attempts]);
  const avgMs = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((sum, a) => sum + a.grade.elapsedMs, 0) / attempts.length);
  }, [attempts]);
  const cleanRuns = useMemo(
    () => attempts.filter((a) => !a.grade.critical && a.grade.completed).length,
    [attempts],
  );
  const recent = useMemo(
    () => [...attempts].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 4),
    [attempts],
  );

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AR";

  const saveName = () => {
    setDisplayName(draftName);
    setEditing(false);
    toast(user ? "Profile name saved to Firestore" : "Profile label updated locally");
  };

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 pb-6">
      {/* Status Capsule */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-st-surface-container px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
        <span className="flex items-center gap-1.5">
          {user ? (
            <Cloud size={14} className="text-st-secondary" aria-hidden />
          ) : (
            <ShieldCheck size={14} className="text-st-secondary" aria-hidden />
          )}
          {user
            ? syncing
              ? "Syncing with Firestore..."
              : "Firestore Cloud Sync · Google Auth"
            : "Guest Mode · Local Browser Storage"}
        </span>
        <span className="font-bold text-st-secondary">{user ? "Cloud Protected" : "Safe Sandbox"}</span>
      </div>

      {!user && (
        <div className="flex flex-col justify-between gap-3 rounded-[24px] bg-st-secondary-container/70 p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-st-on-secondary-container">
              Sign in with Google to save your progress
            </p>
            <p className="text-[12.5px] text-st-on-secondary-container/85">
              Back up your drill history, readiness index, and checklist securely in Firestore.
            </p>
            {authError && (
              <p role="alert" className="mt-1 text-[12px] font-semibold text-st-error">
                {authError}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={authLoading}
            onClick={() => void signInWithGoogle()}
            className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-full bg-st-primary-container px-4 text-[13px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {authLoading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <LogIn size={15} aria-hidden />}
            <span>{authLoading ? "Signing in..." : "Sign in with Google"}</span>
          </button>
        </div>
      )}

      {/* User Profile Header Card */}
      <section className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <div className="grid h-16 w-16 overflow-hidden place-items-center rounded-full bg-st-primary-container text-[20px] font-bold text-st-on-primary shadow-sm">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-st-secondary text-st-on-secondary shadow-sm">
                <Shield size={13} strokeWidth={2.2} aria-hidden />
              </span>
            </div>
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Profile display name"
                    className="w-40 rounded-full bg-st-surface-lowest px-3 py-1.5 text-[15px] font-semibold text-st-on-surface ring-1 ring-st-outline-variant focus:outline-none focus:ring-2 focus:ring-st-secondary"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    className="grid h-8 w-8 place-items-center rounded-full bg-st-primary-container text-st-on-primary"
                    aria-label="Save display name"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-[22px] font-bold text-st-on-surface">{displayName}</h1>
                  <CheckCircle2 size={18} className="shrink-0 text-st-secondary" aria-hidden />
                </div>
              )}
              <p className="truncate text-[13px] text-st-on-surface-variant">
                {user?.email ? (
                  <span>{user.email}</span>
                ) : (
                  <>
                    Guest ID: <span className="font-mono font-semibold">{learnerId}</span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-st-on-surface-variant">
                {readiness >= 75 ? "Tier 1 Cyber Defender" : "Active Sandbox Learner"} ·{" "}
                {user ? "Synced with Firestore" : "Local storage only"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftName(displayName);
              setEditing((v) => !v);
            }}
            aria-label="Edit profile display name"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-st-surface-low text-st-on-surface-variant shadow-sm transition-transform active:scale-95"
          >
            <Edit3 size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Readiness Metric Banner */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface-lowest p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-st-secondary-fixed text-st-on-secondary-fixed">
              <HeartHandshake size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="text-[12px] text-st-on-surface-variant">Overall Readiness Index</p>
              <p className="tnum text-[16px] font-bold text-st-on-surface">
                {readiness} / 100{" "}
                <span className="ml-1 font-normal text-st-secondary">
                  · {readiness >= 75 ? "Strong Reflex" : attempts.length === 0 ? "Start First Drill" : "Building"}
                </span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-secondary-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-st-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-st-secondary" aria-hidden />
            {readiness >= 75 ? "Protected" : "Active"}
          </span>
        </div>
      </section>

      {/* Simulation Metrics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[19px] font-bold text-st-on-surface">Simulation Metrics</h2>
          <span className="text-[12px] text-st-on-surface-variant">Live Local Telemetry</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex h-28 flex-col justify-between rounded-2xl bg-st-surface-container p-4 shadow-sm">
            <div className="flex items-center justify-between text-st-on-surface-variant">
              <span className="text-[13px]">Drills Done</span>
              <CheckCircle2 size={18} className="text-st-secondary" aria-hidden />
            </div>
            <div>
              <p className="tnum text-[24px] font-bold leading-none text-st-on-surface">{completedCount}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase text-st-secondary">
                {attempts.length} Total Runs
              </p>
            </div>
          </div>

          <div className="flex h-28 flex-col justify-between rounded-2xl bg-st-surface-container p-4 shadow-sm">
            <div className="flex items-center justify-between text-st-on-surface-variant">
              <span className="text-[13px]">Reflex Score</span>
              <Zap size={18} className="text-st-secondary" aria-hidden />
            </div>
            <div>
              <p className="tnum text-[24px] font-bold leading-none text-st-on-surface">
                {attempts.length === 0 ? "—" : `${avgScore}%`}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase text-st-secondary">
                {avgScore >= 80 ? "Strong Reflex" : "Practice Builds Speed"}
              </p>
            </div>
          </div>

          <div className="flex h-28 flex-col justify-between rounded-2xl bg-st-surface-container p-4 shadow-sm">
            <div className="flex items-center justify-between text-st-on-surface-variant">
              <span className="text-[13px]">Avg Response</span>
              <Timer size={18} className="text-st-secondary" aria-hidden />
            </div>
            <div>
              <p className="tnum text-[24px] font-bold leading-none text-st-on-surface">
                {attempts.length === 0 ? "—" : formatDuration(avgMs)}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase text-st-secondary">Per Scenario</p>
            </div>
          </div>

          <div className="flex h-28 flex-col justify-between rounded-2xl bg-st-surface-container p-4 shadow-sm">
            <div className="flex items-center justify-between text-st-on-surface-variant">
              <span className="text-[13px]">Clean Clears</span>
              <RotateCcw size={18} className="text-st-secondary" aria-hidden />
            </div>
            <div>
              <p className="tnum text-[24px] font-bold leading-none text-st-on-surface">{cleanRuns}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase text-st-secondary">Zero Critical Errors</p>
            </div>
          </div>
        </div>

        {/* Recent Simulation Drills */}
        <div className="flex flex-col gap-2 rounded-[24px] bg-st-surface-container p-4 shadow-sm">
          <div className="px-1 py-1 text-[15px] font-bold text-st-on-surface">Recent Simulation Drills</div>
          {recent.length === 0 ? (
            <div className="flex items-center justify-between rounded-2xl bg-st-surface-lowest p-4">
              <p className="text-[13px] text-st-on-surface-variant">
                No drill runs yet. Complete a timed sandbox drill to see your breakdown here.
              </p>
              <Link
                to="/drills"
                className="ml-3 shrink-0 rounded-full bg-st-primary-container px-4 py-2 text-[13px] font-semibold text-st-on-primary"
              >
                Start
              </Link>
            </div>
          ) : (
            recent.map((a) => {
              const d = getDrill(a.drillId);
              return (
                <Link
                  key={a.id}
                  to={`/drills/${a.drillId}/results?attempt=${a.id}`}
                  className="flex items-center justify-between rounded-2xl bg-st-surface-lowest p-3.5 shadow-sm transition-colors hover:bg-st-surface"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-[14px] font-semibold text-st-on-surface">{d?.title ?? a.drillId}</p>
                    <p className="truncate text-[12px] text-st-on-surface-variant">
                      {a.grade.critical ? "Critical mistake triggered" : "Completed safely"} ·{" "}
                      {formatDuration(a.grade.elapsedMs)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`tnum text-[13px] font-bold ${
                        a.grade.critical ? "text-st-error" : "text-st-secondary"
                      }`}
                    >
                      {a.grade.total}%
                    </span>
                    <CheckCircle2
                      size={17}
                      className={a.grade.critical ? "text-st-error" : "text-st-secondary"}
                      aria-hidden
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-st-surface-low p-4">
        <Lock size={18} className="mt-0.5 shrink-0 text-st-secondary" aria-hidden />
        <p className="text-[13px] leading-relaxed text-st-on-surface-variant">
          {user
            ? "Your Google account securely identifies your private Firestore profile. Only your practice scores, bookmarks, and preparedness checklist are saved—never real UPI PINs or bank credentials."
            : "Your profile currently stores drill practice metrics in this browser. Sign in with Google anytime to back up and sync with Firestore."}
        </p>
      </div>

      {/* Settings / Auth Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {user && (
          <button
            type="button"
            disabled={authLoading}
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-1.5 rounded-full bg-st-surface-container px-4 py-2 text-[13px] font-semibold text-st-on-surface transition-colors hover:bg-st-surface-high disabled:opacity-60"
          >
            <LogOut size={15} aria-hidden />
            <span>Sign out</span>
          </button>
        )}
        <Link
          to="/about"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-st-on-surface-variant transition-colors hover:text-st-error"
        >
          <RotateCcw size={15} aria-hidden />
          <span>Manage Settings &amp; Reset Data</span>
        </Link>
      </div>
    </div>
  );
}
