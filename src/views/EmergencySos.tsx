import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DispatchingStep } from "@/components/emergency/DispatchingStep";
import { FrozenSelectTxStep } from "@/components/emergency/FrozenSelectTxStep";
import { GroundingModeStep } from "@/components/emergency/GroundingModeStep";
import { SelectVectorStep } from "@/components/emergency/SelectVectorStep";
import { toast } from "@/components/glass/GlassToast";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { cn } from "@/utils/cn";

const CANVAS_BY_STATE = {
  IDLE: "bg-[#FEF2F2]",
  FROZEN_SELECT_TX: "bg-[#FEF2F2] text-[#0F172A]",
  SELECT_VECTOR: "bg-[#FFFBEB] text-[#0F172A]",
  DISPATCHING: "bg-[#0F172A] text-white",
  GROUNDING_MODE: "bg-[#F1F5F9] text-[#0F172A]",
} as const;

/**
 * Panic-Proof Emergency Scam Response System.
 * Enforces: Containment before administration, zero typing, one primary action per screen,
 * silent forensic telemetry & auto-remediation, and emotional state shift to Grounding Blue.
 */
export default function EmergencySos() {
  const navigate = useNavigate();
  const exitingRef = useRef(false);

  const emergencyState = useEmergencyStore((s) => s.emergencyState);
  const returnPath = useEmergencyStore((s) => s.returnPath);
  const offlineQueued = useEmergencyStore((s) => Boolean(s.dispatchStatus?.offlineQueued));
  const triggerEmergency = useEmergencyStore((s) => s.triggerEmergency);
  const backToSelectTx = useEmergencyStore((s) => s.backToSelectTx);
  const retryOfflineSync = useEmergencyStore((s) => s.retryOfflineSync);
  const unfreezeAndExit = useEmergencyStore((s) => s.unfreezeAndExit);

  // Law 1: Entering /sos directly from IDLE immediately executes outbound lock without forms.
  useEffect(() => {
    if (emergencyState === "IDLE" && !exitingRef.current) {
      triggerEmergency("/");
    }
  }, [emergencyState, triggerEmergency]);

  // Keep viewport cleanly anchored to top on each state transition.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [emergencyState]);

  // Prevent accidental Capacitor hardware back button exit while under active emergency protection.
  useEffect(() => {
    const onNativeBack = (event: Event) => {
      if (emergencyState === "SELECT_VECTOR") {
        event.preventDefault();
        backToSelectTx();
        return;
      }
      if (emergencyState !== "IDLE") {
        event.preventDefault();
      }
    };
    window.addEventListener("mfd:back-button", onNativeBack);
    return () => window.removeEventListener("mfd:back-button", onNativeBack);
  }, [emergencyState, backToSelectTx]);

  // Auto-sync queued offline bank lien the instant network connectivity returns.
  useEffect(() => {
    if (emergencyState !== "GROUNDING_MODE" || !offlineQueued) return;

    const handleOnline = () => {
      void retryOfflineSync().then((synced) => {
        if (synced) {
          toast("Connection restored — interbank lien synced and confirmed");
        }
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [emergencyState, offlineQueued, retryOfflineSync]);

  const handleExit = () => {
    exitingRef.current = true;
    const destination = returnPath && !returnPath.startsWith("/sos") ? returnPath : "/";
    unfreezeAndExit();
    navigate(destination, { replace: true });
  };

  return (
    <div
      className={cn(
        "min-h-dvh w-full pt-[env(safe-area-inset-top)] transition-colors duration-500",
        CANVAS_BY_STATE[emergencyState],
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={emergencyState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {emergencyState === "FROZEN_SELECT_TX" && (
            <FrozenSelectTxStep onUnfreezeExit={handleExit} />
          )}
          {emergencyState === "SELECT_VECTOR" && <SelectVectorStep />}
          {emergencyState === "DISPATCHING" && <DispatchingStep />}
          {emergencyState === "GROUNDING_MODE" && (
            <GroundingModeStep onExitEmergency={handleExit} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
