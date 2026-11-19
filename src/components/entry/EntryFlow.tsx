import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2, LogIn } from "lucide-react";
import { AppLogo } from "@/components/branding/AppLogo";
import { APP_NAME, BRAND_COLORS, ENTRY_DISCLAIMER, SPLASH_DURATION_MS } from "@/constants/branding";
import { useFirebaseAuth } from "@/providers/FirebaseProvider";
import { useUserStore } from "@/store/useUserStore";

interface EntryFlowProps {
  initialPhase?: "splash" | "welcome";
  onStart: () => void;
}

export function EntryFlow({ initialPhase = "splash", onStart }: EntryFlowProps) {
  const [phase, setPhase] = useState<"splash" | "welcome">(initialPhase);
  const reduceMotion = useReducedMotion();
  const { user, authReady, authLoading, authError, signInWithGoogle } = useFirebaseAuth();
  const setGuestMode = useUserStore((s) => s.setGuestMode);

  useEffect(() => {
    if (phase !== "splash") return;
    const timer = window.setTimeout(() => {
      setPhase("welcome");
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleGoogleContinue = async () => {
    const signedIn = await signInWithGoogle();
    if (signedIn) {
      setGuestMode(false);
      onStart();
    }
  };

  const handleGuestContinue = () => {
    setGuestMode(true);
    onStart();
  };

  return (
    <div
      style={{ backgroundColor: BRAND_COLORS.background, color: BRAND_COLORS.textPrimary }}
      className="min-h-dvh w-full flex flex-col"
    >
      <AnimatePresence mode="wait">
        {phase === "splash" ? (
          <motion.main
            key="splash"
            aria-label="Loading"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-between px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div aria-hidden className="h-4" />
            <div className="flex flex-1 items-center justify-center">
              <AppLogo size="lg" />
            </div>
            <footer className="w-full pt-4 text-center">
              <p className="text-[12px] font-medium leading-relaxed text-slate-500">
                {ENTRY_DISCLAIMER}
              </p>
            </footer>
          </motion.main>
        ) : (
          <motion.main
            key="welcome"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: "easeOut" }}
            className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-between px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Upper-center branding */}
            <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
              <AppLogo size="lg" />
              <h1
                style={{ color: BRAND_COLORS.textPrimary }}
                className="mt-5 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
              >
                {APP_NAME}
              </h1>
              {authReady && user && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-st-secondary-container px-3.5 py-1 text-[12px] font-semibold text-st-on-secondary-container">
                  <CheckCircle2 size={14} aria-hidden />
                  <span>Signed in as {user.displayName || user.email}</span>
                </p>
              )}
            </div>

            {/* Primary Auth / Start actions */}
            <div className="flex w-full max-w-[360px] flex-col items-center gap-3 pb-8">
              {user ? (
                <button
                  type="button"
                  onClick={onStart}
                  style={{
                    backgroundColor: BRAND_COLORS.primary,
                    color: BRAND_COLORS.onPrimary,
                  }}
                  className="min-h-[54px] w-full cursor-pointer rounded-2xl px-6 text-[16px] font-semibold shadow-[0_8px_22px_rgba(1,45,29,0.18)] transition-all duration-150 hover:brightness-110 active:scale-[0.98] active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006c48]"
                >
                  Start
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => void handleGoogleContinue()}
                    style={{
                      backgroundColor: BRAND_COLORS.primary,
                      color: BRAND_COLORS.onPrimary,
                    }}
                    className="inline-flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-semibold shadow-[0_8px_22px_rgba(1,45,29,0.18)] transition-all duration-150 hover:brightness-110 active:scale-[0.98] active:brightness-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006c48]"
                  >
                    {authLoading ? (
                      <Loader2 size={18} className="animate-spin" aria-hidden />
                    ) : (
                      <LogIn size={18} aria-hidden />
                    )}
                    <span>{authLoading ? "Signing in..." : "Continue with Google"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestContinue}
                    className="min-h-[44px] w-full cursor-pointer rounded-2xl px-4 text-[14px] font-semibold text-st-on-surface-variant transition-colors hover:bg-st-surface-container hover:text-st-primary"
                  >
                    Continue as Guest
                  </button>
                </>
              )}

              {authError && (
                <p role="alert" className="text-center text-[12px] font-medium text-st-error">
                  {authError}
                </p>
              )}
            </div>

            {/* Bottom disclaimer */}
            <footer className="w-full pt-2 text-center">
              <p className="text-[12px] font-medium leading-relaxed text-slate-500">
                {ENTRY_DISCLAIMER}
              </p>
            </footer>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
