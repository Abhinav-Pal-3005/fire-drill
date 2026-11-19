import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  BadgePercent,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Delete,
  Flag,
  Flashlight,
  Globe,
  IndianRupee,
  KeyRound,
  Landmark,
  Lightbulb,
  Lock,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  QrCode,
  Send,
  Settings,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { DrillRunner } from "@/features/drills/useDrillRunner";
import { nextIncompleteStep, redFlagGoal, sortedSteps } from "@/features/drills/stepValidator";
import { spring } from "@/theme/tokens";
import type { Drill, TimerMode } from "@/types";
import { cn } from "@/utils/cn";
import { MockComplaintForm } from "./MockComplaintForm";
import { MockInterestCalculator } from "./MockInterestCalculator";
import { MockLenderCheck } from "./MockLenderCheck";
import { MockPinPad } from "./MockPinPad";
import { MockTransactionHistory, type MockTransaction } from "./MockTransactionHistory";
import { PhoneFrame, type PhoneNotificationItem } from "./PhoneFrame";
import { RedFlagText } from "./RedFlagText";

type OSAppId =
  | "payeasy"
  | "messages"
  | "bank"
  | "phone"
  | "browser"
  | "settings"
  | "accounts"
  | "loan"
  | "videocall"
  | "report";

interface NavEntry {
  view: "lock" | "home" | "recents" | "app";
  appId?: OSAppId;
  screenId?: string;
}

interface AppMeta {
  id: OSAppId;
  name: string;
  subtitle: string;
  gradientClass: string;
  accentColor: string;
  icon: LucideIcon;
  homeScreenId: string;
}

const HISTORY: MockTransaction[] = [
  { id: "t1", title: "Campus canteen", subtitle: "Yesterday", amount: "120", direction: "debit" },
  { id: "t2", title: "Metro card top-up", subtitle: "2 days ago", amount: "300", direction: "debit" },
  { id: "t3", title: "Cashback", subtitle: "3 days ago", amount: "15", direction: "credit" },
];

const DIALER_KEYS: Array<{ digit: string; letters: string }> = [
  { digit: "1", letters: "∞" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

const ACCOUNTS_LIST = ["Email account", "Cloud backup and photos", "Social media accounts"];

interface PracticeOSPhoneProps {
  drill: Drill;
  vars: Record<string, string>;
  seedCode: string;
  timerMode?: TimerMode;
  runner: DrillRunner;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSteps: () => void;
}

function getFocusAppsForStep(drillType: string, stepActionKey?: string): OSAppId[] {
  if (!stepActionKey) return [];
  switch (drillType) {
    case "collect_request":
      if (stepActionKey === "spot_red_flags") return ["messages"];
      if (["open_app", "decline_request", "check_balance", "block_report"].includes(stepActionKey)) {
        return stepActionKey === "check_balance" ? ["payeasy", "bank"] : ["payeasy"];
      }
      return [];
    case "sms":
      if (stepActionKey === "spot_red_flags") return ["messages"];
      if (["open_official_app", "check_kyc_status"].includes(stepActionKey)) return ["bank"];
      if (stepActionKey === "block_report_sms") return ["report", "messages"];
      return [];
    case "loan_offer":
      if (stepActionKey === "spot_red_flags") return ["messages"];
      if (["use_calculator", "check_lender", "decline_revoke"].includes(stepActionKey)) return ["loan", "browser"];
      return [];
    case "lost_phone":
      if (["call_bank_helpline", "block_sim"].includes(stepActionKey)) return ["phone"];
      if (stepActionKey === "secure_accounts") return ["accounts"];
      if (stepActionKey === "report_cybercrime") return ["report", "phone"];
      return [];
    case "balance_alert":
      if (["skip_pleading", "note_txn_id", "raise_complaint"].includes(stepActionKey)) return ["payeasy"];
      if (stepActionKey === "contact_bank") return ["phone", "bank"];
      if (stepActionKey === "escalate_npci") return ["payeasy", "browser"];
      return [];
    case "digital_arrest":
      if (["spot_red_flags", "end_fake_call"].includes(stepActionKey)) return ["videocall"];
      if (stepActionKey === "talk_trusted_verify") return ["phone"];
      if (stepActionKey === "report_digital_arrest") return ["report", "phone"];
      return [];
    default:
      return [];
  }
}

export function PracticeOSPhone({
  drill,
  vars,
  seedCode,
  timerMode = "relaxed",
  runner,
  fullscreen,
  onToggleFullscreen,
  onOpenSteps,
}: PracticeOSPhoneProps) {
  const drillType = drill.trigger.type;
  const payload = drill.trigger.payloadTemplate;
  const steps = useMemo(() => sortedSteps(drill), [drill]);
  const nextStep = useMemo(() => nextIncompleteStep(drill, runner.run.actions), [drill, runner.run.actions]);
  const currentStepIdx = nextStep ? steps.findIndex((s) => s.id === nextStep.id) : steps.length - 1;
  const hasFlags = drill.redFlags.length > 0;
  const flagGoal = redFlagGoal(drill);

  const [navStack, setNavStack] = useState<NavEntry[]>([{ view: "lock" }]);
  const [recentApps, setRecentApps] = useState<OSAppId[]>([]);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [missionExpanded, setMissionExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);
  const [dialedNumber, setDialedNumber] = useState("");
  const [helplineCallActive, setHelplineCallActive] = useState(false);
  const [videoCallAnswered, setVideoCallAnswered] = useState(drillType === "digital_arrest");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loanContactsPerm, setLoanContactsPerm] = useState(true);
  const [loanGalleryPerm, setLoanGalleryPerm] = useState(true);
  const touchStartYRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
  }, []);

  useEffect(() => {
    if (!toastText) return;
    const id = window.setTimeout(() => setToastText(null), 2600);
    return () => window.clearTimeout(id);
  }, [toastText]);

  const appCatalog: Record<OSAppId, AppMeta> = useMemo(
    () => ({
      payeasy: {
        id: "payeasy",
        name: vars.app || "PayWave",
        subtitle: `UPI · ${vars.bank || "Bank"}`,
        gradientClass: "from-blue-500 to-indigo-700",
        accentColor: "#1D4ED8",
        icon: IndianRupee,
        homeScreenId: drillType === "balance_alert" ? "receipt" : "home",
      },
      messages: {
        id: "messages",
        name: "Messages",
        subtitle: "SMS & Chats",
        gradientClass: "from-emerald-500 to-green-700",
        accentColor: "#15803D",
        icon: MessageSquare,
        homeScreenId: "thread",
      },
      bank: {
        id: "bank",
        name: vars.bank || "Astra Bank",
        subtitle: "Official Banking",
        gradientClass: "from-slate-800 via-blue-900 to-amber-600",
        accentColor: "#1E3A8A",
        icon: Landmark,
        homeScreenId: "bank_home",
      },
      phone: {
        id: "phone",
        name: "Phone",
        subtitle: "Dialer & 1930 Helpline",
        gradientClass: "from-green-600 to-emerald-800",
        accentColor: "#166534",
        icon: Phone,
        homeScreenId: "dialer",
      },
      browser: {
        id: "browser",
        name: "Browser",
        subtitle: "https://upi-safety-guide.org",
        gradientClass: "from-sky-400 to-blue-600",
        accentColor: "#0284C7",
        icon: Globe,
        homeScreenId: drillType === "balance_alert" ? "dispute" : "guide",
      },
      settings: {
        id: "settings",
        name: "Settings",
        subtitle: "PracticeOS Security",
        gradientClass: "from-zinc-500 to-slate-700",
        accentColor: "#334155",
        icon: Settings,
        homeScreenId: "settings_home",
      },
      accounts: {
        id: "accounts",
        name: "Accounts",
        subtitle: "Sign-out & Passwords",
        gradientClass: "from-indigo-500 to-violet-700",
        accentColor: "#4338CA",
        icon: KeyRound,
        homeScreenId: "accounts_home",
      },
      loan: {
        id: "loan",
        name: "Loan Offer",
        subtitle: vars.lender || "Instant Offer",
        gradientClass: "from-violet-500 to-indigo-700",
        accentColor: "#4F46E5",
        icon: BadgePercent,
        homeScreenId: "offer",
      },
      videocall: {
        id: "videocall",
        name: "Video Call",
        subtitle: payload.channel || "WhatsApp Video",
        gradientClass: "from-teal-500 to-cyan-700",
        accentColor: "#0F766E",
        icon: Video,
        homeScreenId: "call",
      },
      report: {
        id: "report",
        name: "Report 1930",
        subtitle: "Cybercrime & Block",
        gradientClass: "from-rose-600 to-red-800",
        accentColor: "#BE123C",
        icon: Flag,
        homeScreenId: "report_home",
      },
    }),
    [vars, drillType, payload.channel],
  );

  const { homeApps, dockApps }: { homeApps: OSAppId[]; dockApps: OSAppId[] } = useMemo(() => {
    switch (drillType) {
      case "collect_request":
        return {
          homeApps: ["messages", "payeasy", "bank", "phone", "browser", "report", "settings"],
          dockApps: ["phone", "messages", "payeasy", "bank"],
        };
      case "sms":
        return {
          homeApps: ["messages", "bank", "payeasy", "phone", "report", "browser", "settings"],
          dockApps: ["phone", "messages", "bank", "report"],
        };
      case "loan_offer":
        return {
          homeApps: ["messages", "loan", "bank", "phone", "browser", "settings"],
          dockApps: ["phone", "messages", "loan", "browser"],
        };
      case "lost_phone":
        return {
          homeApps: ["phone", "accounts", "report", "messages", "bank", "browser", "settings"],
          dockApps: ["phone", "accounts", "report", "messages"],
        };
      case "balance_alert":
        return {
          homeApps: ["payeasy", "bank", "phone", "browser", "messages", "settings"],
          dockApps: ["phone", "payeasy", "bank", "browser"],
        };
      case "digital_arrest":
        return {
          homeApps: ["videocall", "phone", "report", "bank", "browser", "settings"],
          dockApps: ["videocall", "phone", "report", "browser"],
        };
      default:
        return {
          homeApps: ["messages", "payeasy", "bank", "phone", "browser", "settings"],
          dockApps: ["phone", "messages", "payeasy", "browser"],
        };
    }
  }, [drillType]);

  const navigateTo = useCallback(
    (entry: NavEntry) => {
      setMoreOpen(false);
      if (entry.view === "app" && entry.appId) {
        const appId = entry.appId;
        if (drillType === "collect_request" && appId === "payeasy" && !runner.doneKeys.has("open_app")) {
          runner.emit("open_app");
        }
        if (drillType === "sms" && appId === "bank" && !runner.doneKeys.has("open_official_app")) {
          runner.emit("open_official_app");
        }
        if (drillType === "loan_offer" && appId === "loan" && !runner.doneKeys.has("open_offer")) {
          runner.emit("open_offer");
        }
        setRecentApps((prev) => [appId, ...prev.filter((x) => x !== appId)]);
      }
      setNavStack((prev) => [...prev, entry]);
    },
    [drillType, runner],
  );

  const openApp = useCallback(
    (appId: OSAppId, screenId?: string) => {
      navigateTo({
        view: "app",
        appId,
        screenId: screenId ?? appCatalog[appId].homeScreenId,
      });
    },
    [navigateTo, appCatalog],
  );

  const currentNav = navStack[navStack.length - 1] ?? { view: "lock" };

  const handleBackNav = useCallback(() => {
    setMoreOpen(false);
    setHelplineCallActive(false);
    if (currentNav.view === "lock" || currentNav.view === "home") return;
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : [{ view: "home" }]));
  }, [currentNav.view]);

  const handleHomeNav = useCallback(() => {
    setMoreOpen(false);
    setHelplineCallActive(false);
    if (currentNav.view !== "home") {
      setNavStack((prev) => [...prev, { view: "home" }]);
    }
  }, [currentNav.view]);

  const handleRecentsNav = useCallback(() => {
    setMoreOpen(false);
    setNavStack((prev) => [...prev, { view: "recents" }]);
  }, []);

  // Intercept Android hardware back button while inside simulated phone sub-screens/PIN pad
  useEffect(() => {
    const onNativeBack = (e: Event) => {
      if (runner.pinMode) {
        e.preventDefault();
        runner.cancelPin();
        return;
      }
      if (currentNav.view === "app" || currentNav.view === "recents") {
        e.preventDefault();
        handleBackNav();
      }
    };
    window.addEventListener("mfd:back-button", onNativeBack);
    return () => window.removeEventListener("mfd:back-button", onNativeBack);
  }, [currentNav.view, handleBackNav, runner]);

  const rawNotifications: PhoneNotificationItem[] = useMemo(() => {
    const items: PhoneNotificationItem[] = [];
    if (drillType === "collect_request") {
      items.push({
        id: "n-msg",
        appName: `Messages · ${vars.name}`,
        title: "Marketplace buyer reply",
        body: payload.body,
        onOpen: () => openApp("messages", "thread"),
      });
      items.push({
        id: "n-upi",
        appName: vars.app,
        title: `Collect request ₹${vars.amount}`,
        body: `${vars.name} requested ₹${vars.amount}. Tap to review.`,
        onOpen: () => openApp("payeasy", "request"),
      });
    } else if (drillType === "sms") {
      items.push({
        id: "n-sms",
        appName: `Messages · ${payload.sender}`,
        title: `${vars.bank} KYC Alert`,
        body: payload.body,
        onOpen: () => openApp("messages", "thread"),
      });
    } else if (drillType === "loan_offer") {
      items.push({
        id: "n-loan",
        appName: `Messages · ${vars.lender}`,
        title: `Pre-approved ₹${vars.amount}`,
        body: payload.body,
        onOpen: () => openApp("messages", "thread"),
      });
    } else if (drillType === "lost_phone") {
      items.push({
        id: "n-lost-phone",
        appName: "Phone · Urgent",
        title: `Freeze ${vars.bank} & ${vars.telco} SIM`,
        body: "Tap to call official helplines first from this device.",
        onOpen: () => openApp("phone", "dialer"),
      });
      items.push({
        id: "n-lost-sms",
        appName: `Messages · ${payload.sender}`,
        title: "Found your phone?",
        body: payload.body,
        onOpen: () => openApp("messages", "thread"),
      });
    } else if (drillType === "balance_alert") {
      items.push({
        id: "n-wrong",
        appName: vars.app,
        title: `₹${vars.amount} sent to ${payload.senderId}`,
        body: `${vars.name} sent a follow-up message asking for a release fee.`,
        onOpen: () => openApp("payeasy", "receipt"),
      });
    } else if (drillType === "digital_arrest") {
      items.push({
        id: "n-call",
        appName: payload.channel || "Video Call",
        title: payload.sender,
        body: "Incoming urgent video call — tap to inspect.",
        onOpen: () => openApp("videocall", "call"),
      });
    }
    return items.filter((i) => !dismissedNotifs.includes(i.id));
  }, [drillType, vars, payload, openApp, dismissedNotifs]);

  const getAppBadge = (appId: OSAppId): number => {
    if (drillType === "collect_request") {
      if (appId === "messages" && !runner.doneKeys.has("spot_red_flags")) return 1;
      if (appId === "payeasy" && !runner.doneKeys.has("decline_request")) return 1;
    }
    if (drillType === "sms") {
      if (appId === "messages" && !runner.doneKeys.has("spot_red_flags")) return 1;
      if (appId === "bank" && !runner.doneKeys.has("check_kyc_status")) return 1;
    }
    if (drillType === "loan_offer") {
      if (appId === "messages" && !runner.doneKeys.has("spot_red_flags")) return 1;
      if (appId === "loan" && !runner.doneKeys.has("decline_revoke")) return 1;
    }
    if (drillType === "lost_phone") {
      if (appId === "phone" && (!runner.doneKeys.has("call_bank_helpline") || !runner.doneKeys.has("block_sim"))) return 1;
      if (appId === "accounts" && !runner.doneKeys.has("secure_accounts")) return 1;
    }
    if (drillType === "balance_alert") {
      if (appId === "payeasy" && !runner.doneKeys.has("raise_complaint")) return 1;
    }
    if (drillType === "digital_arrest") {
      if (appId === "videocall" && !runner.doneKeys.has("end_fake_call")) return 1;
    }
    return 0;
  };

  const focusApps = getFocusAppsForStep(drillType, nextStep?.actionKey);

  const handleLockTouchStart = (e: TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const handleLockTouchEnd = (e: TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY < -36) {
      if (drillType === "digital_arrest") {
        openApp("videocall", "call");
      } else {
        navigateTo({ view: "home" });
      }
    }
  };

  const wrongTap = (key: string, label: string) => {
    runner.emit(key, label);
    showToast("Done in sandbox. Nothing real happened.");
  };

  // Render decision buttons with PracticeOS styling (max 2 primary + More toggle for extras)
  const renderDecisionButtons = (
    primary: Array<{ id: string; label: string; onClick: () => void; done?: boolean }>,
    secondary: Array<{ id: string; label: string; onClick: () => void }> = [],
  ) => (
    <div className="space-y-2 pt-1">
      {primary.map((btn) => (
        <button
          key={btn.id}
          type="button"
          onClick={btn.onClick}
          className={cn(
            "flex min-h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-xs font-extrabold transition-colors",
            btn.done
              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
              : "border-blue-700 bg-white text-blue-950 hover:bg-blue-50",
          )}
        >
          <span>{btn.label}</span>
          {btn.done ? <CheckCircle2 size={16} strokeWidth={2.2} className="shrink-0 text-emerald-700" /> : null}
        </button>
      ))}
      {secondary.length > 0 && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setMoreOpen((m) => !m)}
            className="min-h-[38px] w-full cursor-pointer rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-200"
          >
            {moreOpen ? "Hide More ▲" : "⋯ More options"}
          </button>
          {moreOpen &&
            secondary.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={sec.onClick}
                className="min-h-[42px] w-full cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-left text-xs font-bold text-zinc-900 hover:bg-zinc-50"
              >
                {sec.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );

  // Render the active native PracticeOS app
  const renderActiveApp = (appId: OSAppId, screenId: string): ReactNode => {
    const app = appCatalog[appId];

    // Special Full-Screen Incoming / Live Video Call UI for Digital Arrest
    if (appId === "videocall" && screenId === "call") {
      const callEnded = runner.doneKeys.has("end_fake_call");
      return (
        <div className="z-20 flex flex-1 flex-col justify-between overflow-y-auto bg-gradient-to-b from-slate-950 via-zinc-900 to-slate-950 p-4 text-white">
          <div className="space-y-2 pt-2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[11px] font-extrabold text-amber-200">
              <Video size={12} strokeWidth={2.2} aria-hidden />
              {callEnded ? "Call Ended" : videoCallAnswered ? "Live Video Call · Pressure" : "Incoming Video Call"}
            </span>
            <div className="mx-auto mt-1 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-lg font-extrabold text-sky-300">
              IV
            </div>
            <h2 className="text-lg font-extrabold tracking-tight">{payload.sender}</h2>
            <p className="text-[11px] text-zinc-400">
              {callEnded ? "Disconnected & blocked" : "Fake uniform backdrop · WhatsApp Video"}
            </p>
          </div>

          {!videoCallAnswered && !callEnded ? (
            <div className="flex items-center justify-around py-6">
              <button
                type="button"
                onClick={() => {
                  runner.emit("end_fake_call");
                  showToast("Call declined and blocked.");
                }}
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg hover:bg-red-500">
                  <PhoneOff size={26} />
                </span>
                <span className="text-xs font-bold text-zinc-200">Decline</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoCallAnswered(true)}
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 shadow-lg hover:bg-emerald-500">
                  <Video size={26} />
                </span>
                <span className="text-xs font-bold text-zinc-200">Inspect Call</span>
              </button>
            </div>
          ) : (
            <div className="my-2 space-y-3">
              {/* Live Caller Captions with Tappable Red Flags */}
              <div className="space-y-2 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-zinc-900">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                  Caller statement · tap suspicious words ({runner.run.flagsFound.length}/{drill.redFlags.length})
                </p>
                <RedFlagText
                  text={payload.body}
                  flags={drill.redFlags}
                  found={runner.run.flagsFound}
                  onFlag={runner.tapFlag}
                  onMiss={() => runner.tapFlag(null)}
                  className="text-xs font-medium text-zinc-900"
                />
              </div>

              {callEnded ? (
                <div className="space-y-2">
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 p-3 text-xs font-bold text-emerald-200"
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden />
                    Call ended & caller blocked. Now verify with family & report on 1930.
                  </p>
                  <button
                    type="button"
                    onClick={() => openApp("phone", "dialer")}
                    className="min-h-[44px] w-full cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-500"
                  >
                    Open Phone to Verify & Call 1930
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    runner.emit("end_fake_call");
                    showToast("Call disconnected & blocked.");
                  }}
                  className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-red-500"
                >
                  <PhoneOff size={16} strokeWidth={2.2} aria-hidden />
                  Hang up and block caller
                </button>
              )}

              {/* Distractors */}
              <div className="space-y-1.5">
                {drill.distractors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      runner.emit(d.actionKey, d.label);
                      if (d.actionKey !== "pay_verification_fee") {
                        showToast("Done in sandbox. Nothing real happened.");
                      }
                    }}
                    className="min-h-[42px] w-full cursor-pointer rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-left text-xs font-bold text-white hover:bg-white/20"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom hint strip */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px]">
            <span className="truncate text-zinc-200">
              {runner.hint ? runner.hint.text : nextStep?.cue ?? "Spot red flags and hang up."}
            </span>
            <button
              type="button"
              onClick={runner.requestHint}
              className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-extrabold text-white"
            >
              Hint
            </button>
          </div>
        </div>
      );
    }

    // Standard PracticeOS App Container
    let screenTitle = app.name;
    let screenSubtitle = app.subtitle;
    let bodyContent: ReactNode = null;

    // ------------------------------------------------------------------
    // MESSAGES APP (SMS & Chat Inbox / Thread)
    // ------------------------------------------------------------------
    if (appId === "messages") {
      if (screenId === "inbox") {
        screenTitle = "Messages";
        screenSubtitle = "1 unread alert";
        bodyContent = (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => openApp("messages", "thread")}
              className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-xs hover:border-blue-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-700 text-xs font-extrabold text-white">
                {payload.sender.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-extrabold text-zinc-900">{payload.sender}</span>
                  <span className="tnum shrink-0 text-[10px] text-zinc-500">{payload.time}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-700">{payload.body}</p>
              </div>
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
            </button>
          </div>
        );
      } else {
        screenTitle = payload.sender;
        screenSubtitle = payload.channel ? `${payload.channel} · ${payload.time}` : `SMS · ${payload.time}`;
        const msgDistractors = drill.distractors.filter((d) => d.screen === "inbox" || d.screen === "messages");

        const primaryButtons: Array<{ id: string; label: string; onClick: () => void }> = [];
        if (drillType === "collect_request") {
          primaryButtons.push({
            id: "open-upi",
            label: `Open ${vars.app} Yourself`,
            onClick: () => openApp("payeasy", "home"),
          });
        } else if (drillType === "sms") {
          primaryButtons.push({
            id: "open-bank",
            label: `Open ${vars.bank} Official App`,
            onClick: () => openApp("bank", "bank_home"),
          });
        } else if (drillType === "loan_offer") {
          primaryButtons.push({
            id: "open-offer",
            label: "Open the offer",
            onClick: () => openApp("loan", "offer"),
          });
        } else if (drillType === "lost_phone") {
          primaryButtons.push({
            id: "open-phone",
            label: `Open Phone (${vars.bank} & ${vars.telco})`,
            onClick: () => openApp("phone", "dialer"),
          });
        }

        const distractorBtns = msgDistractors.map((d) => ({
          id: d.id,
          label: d.label,
          onClick: () => {
            runner.emit(d.actionKey, d.label);
            if (!d.opensPin) showToast("Done in sandbox. Nothing real happened.");
          },
        }));

        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl border border-amber-500 bg-amber-50 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                Inspect Sender & Text {hasFlags ? `(${runner.run.flagsFound.length}/${drill.redFlags.length} flags)` : ""}
              </p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                Tap suspicious phrases directly inside the message bubble before deciding.
              </p>
            </div>

            <div className="max-w-[96%] space-y-1.5 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-500">
                <RedFlagText
                  text={payload.sender}
                  flags={drill.redFlags}
                  found={runner.run.flagsFound}
                  onFlag={runner.tapFlag}
                  onMiss={() => runner.tapFlag(null)}
                  className="text-[11px] font-bold text-zinc-700"
                />
                <span className="shrink-0">{payload.time}</span>
              </div>
              <RedFlagText
                text={payload.body}
                flags={drill.redFlags}
                found={runner.run.flagsFound}
                onFlag={runner.tapFlag}
                onMiss={() => runner.tapFlag(null)}
                className="text-xs leading-relaxed text-zinc-900"
              />
            </div>

            {renderDecisionButtons(
              [...primaryButtons, ...distractorBtns.slice(0, 1)],
              [
                ...distractorBtns.slice(1),
                { id: "back-inbox", label: "Back to Inbox list", onClick: () => openApp("messages", "inbox") },
              ],
            )}
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // PAYEASY / UPI APP (Collect Request + Wrong Transfer + History)
    // ------------------------------------------------------------------
    else if (appId === "payeasy") {
      if (drillType === "balance_alert") {
        if (screenId === "complaint") {
          screenTitle = `Complaint in ${vars.app}`;
          screenSubtitle = "Official UPI dispute";
          bodyContent = (
            <MockComplaintForm
              embedded
              title={`Complaint in ${vars.app}`}
              intro="Tell the app what went wrong. Keep your transaction ID handy."
              details={[
                { label: "Transaction ID", value: payload.txnId },
                { label: "Amount", value: `₹${vars.amount}` },
                { label: "Sent to", value: payload.senderId },
              ]}
              reasons={["Sent to the wrong person", "Money debited but not received", "Possible fraud"]}
              submitLabel="Submit complaint"
              successText="Complaint submitted (sandbox)."
              onSubmit={() => {
                runner.emit("raise_complaint");
                showToast("Complaint submitted.");
              }}
              onBack={() => openApp("payeasy", "receipt")}
            />
          );
        } else {
          screenTitle = `${vars.app} · Payment Sent`;
          screenSubtitle = `Transaction ID ${payload.txnId}`;
          const wtDistractors = drill.distractors;
          bodyContent = (
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 text-center shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Sent to {payload.senderId}</p>
                <p className="tnum mt-0.5 text-2xl font-extrabold text-zinc-900">₹{vars.amount}</p>
                <p className="tnum mt-1 text-[11px] font-semibold text-zinc-500">Txn ID: {payload.txnId}</p>
              </div>

              <div className="rounded-2xl border border-amber-500 bg-amber-50 p-3 space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">Stranger&apos;s message</p>
                <RedFlagText
                  text={payload.body}
                  flags={drill.redFlags}
                  found={runner.run.flagsFound}
                  onFlag={runner.tapFlag}
                  onMiss={() => runner.tapFlag(null)}
                  className="text-xs font-semibold text-zinc-900"
                />
              </div>

              {renderDecisionButtons(
                [
                  {
                    id: "skip",
                    label: "Not now. Do not contact them.",
                    done: runner.doneKeys.has("skip_pleading"),
                    onClick: () => {
                      runner.emit("skip_pleading");
                      showToast("Good choice — avoided engaging stranger.");
                    },
                  },
                  {
                    id: "note",
                    label: "Save the transaction ID and a screenshot",
                    done: runner.doneKeys.has("note_txn_id"),
                    onClick: () => {
                      runner.emit("note_txn_id");
                      showToast("Transaction ID saved.");
                    },
                  },
                  {
                    id: "complaint",
                    label: `Raise a complaint in ${vars.app}`,
                    done: runner.doneKeys.has("raise_complaint"),
                    onClick: () => openApp("payeasy", "complaint"),
                  },
                  {
                    id: "bank",
                    label: `Contact ${vars.bank}`,
                    done: runner.doneKeys.has("contact_bank"),
                    onClick: () => openApp("phone", "dialer"),
                  },
                  {
                    id: "dispute",
                    label: "Dispute help (NPCI escalation)",
                    done: runner.doneKeys.has("escalate_npci"),
                    onClick: () => openApp("browser", "dispute"),
                  },
                ],
                wtDistractors.map((d) => ({
                  id: d.id,
                  label: d.label,
                  onClick: () => {
                    runner.emit(d.actionKey, d.label);
                    if (d.actionKey !== "pay_release_fee") showToast("Done in sandbox. Nothing real happened.");
                  },
                })),
              )}
            </div>
          );
        }
      } else if (screenId === "request") {
        screenTitle = `Collect Request · ₹${vars.amount}`;
        screenSubtitle = "Money will be DEBITED if approved";
        const declined = runner.doneKeys.has("decline_request");
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Requester UPI ID</p>
              <p className="text-sm font-extrabold text-zinc-900">
                {vars.name} ({payload.senderId})
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-amber-500 bg-amber-50 p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                Transaction Direction: DEBIT
              </p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                ₹{vars.amount} will be DEDUCTED from {vars.bank} if you enter your UPI PIN.
              </p>
            </div>
            <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Requester Note</p>
              <p className="text-xs font-bold text-zinc-900">{payload.note}</p>
            </div>

            {declined ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
              >
                <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Collect request declined. Now check your balance.
              </p>
            ) : (
              renderDecisionButtons(
                [
                  {
                    id: "decline",
                    label: "Decline Collect Request",
                    onClick: () => {
                      runner.emit("decline_request");
                      showToast("Collect request declined.");
                      openApp("payeasy", "home");
                    },
                  },
                  {
                    id: "approve",
                    label: `Approve & Enter UPI PIN (Pay ₹${vars.amount})`,
                    onClick: () => runner.emit("approve_request"),
                  },
                ],
                [
                  {
                    id: "block",
                    label: "Report & Block UPI ID",
                    onClick: () => openApp("payeasy", "report"),
                  },
                ],
              )
            )}
          </div>
        );
      } else if (screenId === "balance") {
        screenTitle = "Balance & History";
        screenSubtitle = vars.bank;
        const declined = runner.doneKeys.has("decline_request");
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Available Balance · {vars.bank}</p>
              <p className="tnum text-2xl font-extrabold text-zinc-900">₹{vars.balance}</p>
              {declined && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden />
                  No debit found for ₹{vars.amount}. Your balance is safe.
                </p>
              )}
            </div>
            <MockTransactionHistory items={HISTORY} />
            <button
              type="button"
              onClick={() => openApp("payeasy", "home")}
              className="min-h-[42px] w-full cursor-pointer rounded-xl border-2 border-blue-700 bg-white px-3 py-2 text-xs font-extrabold text-blue-950"
            >
              Back to {vars.app} Home
            </button>
          </div>
        );
      } else if (screenId === "report") {
        screenTitle = "Block & Report UPI ID";
        screenSubtitle = vars.app;
        bodyContent = (
          <MockComplaintForm
            embedded
            title="Block and report"
            intro="Blocking stops further requests from this UPI ID. Reporting helps protect others."
            details={[
              { label: "UPI ID", value: payload.senderId },
              { label: "Name shown", value: vars.name },
            ]}
            reasons={["Scam or fraud attempt", "Spam or unwanted requests", "Other"]}
            submitLabel="Block and report"
            successText="Blocked and reported (sandbox)."
            onSubmit={() => {
              runner.emit("block_report");
              showToast("UPI ID blocked & reported.");
            }}
            onBack={() => openApp("payeasy", "home")}
          />
        );
      } else {
        // PayEasy Home
        screenTitle = `${vars.app} UPI`;
        screenSubtitle = `${vars.bank} · Practice account`;
        const declined = runner.doneKeys.has("decline_request");
        const upiHomeDistractors = drill.distractors.filter((d) => d.screen === "upi_home");
        bodyContent = (
          <div className="space-y-3">
            {/* PayEasy Quick Actions Strip */}
            <div className="-mx-3.5 -mt-3.5 grid grid-cols-3 gap-2 bg-blue-800 px-3.5 py-2.5 text-center text-[11px] font-bold text-white">
              <button
                type="button"
                onClick={() => wrongTap("scan_qr", "Scan QR")}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-white/10 py-2 hover:bg-white/20"
              >
                <QrCode size={15} />
                Scan QR
              </button>
              <button
                type="button"
                onClick={() => wrongTap("send_money", "Pay Contacts")}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-white/10 py-2 hover:bg-white/20"
              >
                <Send size={15} />
                Pay Contacts
              </button>
              <button
                type="button"
                onClick={() => {
                  if (drillType === "collect_request") runner.emit("check_balance");
                  openApp("payeasy", "balance");
                }}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-white/10 py-2 hover:bg-white/20"
              >
                <Wallet size={15} />
                Check Balance
              </button>
            </div>

            {drillType === "collect_request" && (
              <>
                {declined ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Collect request declined.
                  </p>
                ) : (
                  <div className="space-y-1 rounded-2xl border border-amber-500 bg-amber-50 p-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                      Pending Collect Request · ₹{vars.amount}
                    </p>
                    <p className="text-xs font-bold text-zinc-900">
                      {vars.name} ({payload.senderId}) · Money will be DEBITED if approved.
                    </p>
                  </div>
                )}

                {renderDecisionButtons(
                  [
                    ...(!declined
                      ? [
                          {
                            id: "inspect-req",
                            label: `Inspect Collect Request (₹${vars.amount})`,
                            onClick: () => {
                              runner.emit("view_request");
                              openApp("payeasy", "request");
                            },
                          },
                        ]
                      : []),
                    {
                      id: "chk-bal",
                      label: "Check Balance & History",
                      done: runner.doneKeys.has("check_balance"),
                      onClick: () => {
                        runner.emit("check_balance");
                        openApp("payeasy", "balance");
                      },
                    },
                    {
                      id: "sec-help",
                      label: "Security & Block/Report",
                      done: runner.doneKeys.has("block_report"),
                      onClick: () => openApp("payeasy", "report"),
                    },
                  ],
                  upiHomeDistractors.map((d) => ({
                    id: d.id,
                    label: d.label,
                    onClick: () => wrongTap(d.actionKey, d.label),
                  })),
                )}
              </>
            )}

            {drillType !== "collect_request" && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{vars.bank} · Primary</p>
                <p className="tnum text-xl font-extrabold text-zinc-900">₹{vars.balance || "18,450"}</p>
              </div>
            )}
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // BANK APP (Official Banking / KYC Check)
    // ------------------------------------------------------------------
    else if (appId === "bank") {
      screenTitle = vars.bank || "Official Bank";
      screenSubtitle = "Verified Banking App";
      const kycChecked = runner.doneKeys.has("check_kyc_status");
      const balChecked = runner.doneKeys.has("check_balance");
      bodyContent = (
        <div className="space-y-3">
          <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Savings Account · Verified</p>
            <p className="tnum text-xl font-extrabold text-zinc-900">₹{vars.balance || "24,100"}</p>
          </div>

          {drillType === "sms" && (
            <>
              <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Account & KYC Centre</p>
                <p className="text-xs font-bold leading-relaxed text-zinc-900">
                  Check your real KYC notices inside {vars.bank}&apos;s official app instead of trusting SMS links.
                </p>
              </div>
              {kycChecked ? (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
                >
                  <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> KYC Active & Verified — No blocks pending!
                </p>
              ) : (
                renderDecisionButtons([
                  {
                    id: "check-kyc",
                    label: "Check KYC & account status",
                    onClick: () => {
                      runner.emit("check_kyc_status");
                      showToast("KYC verified active in official app.");
                    },
                  },
                ])
              )}
              <button
                type="button"
                onClick={() => openApp("report", "report_home")}
                className="min-h-[44px] w-full cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50"
              >
                Next: Block & Report Phishing SMS
              </button>
            </>
          )}

          {drillType === "collect_request" &&
            renderDecisionButtons([
              {
                id: "confirm-bal",
                label: "Confirm Balance Untouched",
                done: balChecked,
                onClick: () => {
                  runner.emit("check_balance");
                  showToast("Balance verified untouched.");
                },
              },
            ])}

          {(drillType === "balance_alert" || drillType === "lost_phone") &&
            renderDecisionButtons([
              {
                id: "call-bank-24x7",
                label: `Call ${vars.bank} 24×7 Official Helpline`,
                done: runner.doneKeys.has("contact_bank") || runner.doneKeys.has("call_bank_helpline"),
                onClick: () => {
                  if (drillType === "balance_alert") runner.emit("contact_bank");
                  if (drillType === "lost_phone") runner.emit("call_bank_helpline");
                  showToast(`Called ${vars.bank} 24×7 helpline (practice).`);
                },
              },
            ])}
        </div>
      );
    }

    // ------------------------------------------------------------------
    // LOAN OFFER APP (Calculator, Lender Lookup, Permissions, Decline)
    // ------------------------------------------------------------------
    else if (appId === "loan") {
      if (screenId === "lender") {
        screenTitle = "Lender Registration Check";
        screenSubtitle = "Practice RBI/NBFC Lookup";
        bodyContent = (
          <MockLenderCheck
            embedded
            lender={vars.lender}
            onChecked={() => {
              runner.emit("check_lender");
              showToast("Lender check complete.");
            }}
            onBack={() => openApp("loan", "offer")}
          />
        );
      } else {
        screenTitle = `Loan Offer · ${vars.lender}`;
        screenSubtitle = `₹${vars.amount} "Pre-approved"`;
        const principal = Number((vars.amount || "10000").replace(/,/g, "")) || 10000;
        const declined = runner.doneKeys.has("decline_revoke");
        const loanDistractors = drill.distractors;

        bodyContent = (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-700 p-3.5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/85">Pre-approved loan</p>
              <p className="tnum text-2xl font-extrabold">₹{vars.amount}</p>
              <p className="text-xs text-white/90">{vars.lender} · Instant claim</p>
            </div>

            <MockInterestCalculator
              principal={principal}
              onCalculate={() => {
                runner.emit("use_calculator");
                showToast("Total repayment calculated.");
              }}
            />

            <button
              type="button"
              onClick={() => openApp("loan", "lender")}
              className={cn(
                "flex min-h-[48px] w-full cursor-pointer items-center justify-between rounded-2xl border-2 px-3.5 py-2 text-left text-xs font-extrabold",
                runner.doneKeys.has("check_lender")
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-blue-700 bg-white text-blue-950 hover:bg-blue-50",
              )}
            >
              <span>Check the lender&apos;s registration</span>
              <ChevronRight size={16} />
            </button>

            <div className="space-y-1.5 rounded-2xl border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Permissions Requested</p>
              <label className="flex min-h-[40px] cursor-pointer items-center justify-between text-xs font-bold text-zinc-900">
                Contacts access
                <input
                  type="checkbox"
                  checked={loanContactsPerm}
                  onChange={(e) => setLoanContactsPerm(e.target.checked)}
                  className="h-4 w-4 accent-blue-700"
                />
              </label>
              <label className="flex min-h-[40px] cursor-pointer items-center justify-between text-xs font-bold text-zinc-900">
                Gallery access
                <input
                  type="checkbox"
                  checked={loanGalleryPerm}
                  onChange={(e) => setLoanGalleryPerm(e.target.checked)}
                  className="h-4 w-4 accent-blue-700"
                />
              </label>
            </div>

            {declined ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
              >
                <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Offer declined & permissions revoked!
              </p>
            ) : (
              renderDecisionButtons(
                [
                  {
                    id: "decline-loan",
                    label: "Decline offer and revoke permissions",
                    onClick: () => {
                      setLoanContactsPerm(false);
                      setLoanGalleryPerm(false);
                      runner.emit("decline_revoke");
                      showToast("Loan declined & permissions revoked.");
                    },
                  },
                ],
                loanDistractors.map((d) => ({
                  id: d.id,
                  label: d.label,
                  onClick: () => {
                    runner.emit(d.actionKey, d.label);
                    if (d.actionKey !== "accept_offer") showToast("Done in sandbox. Nothing real happened.");
                  },
                })),
              )
            )}
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // PHONE APP (T9 Dialer + Helplines + 1930)
    // ------------------------------------------------------------------
    else if (appId === "phone") {
      screenTitle = helplineCallActive ? "1930 Cybercrime Helpline" : "Phone";
      screenSubtitle = helplineCallActive ? "Simulated Connected Call" : "Helplines & T9 Dialer";

      if (helplineCallActive) {
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1.5 rounded-2xl border border-emerald-500 bg-emerald-50 p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-900">
                1930 Helpline Operator (Simulated)
              </p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                “Fraud report logged in sandbox. Keep transaction IDs, screenshots, and block suspicious senders immediately.”
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHelplineCallActive(false)}
              className="min-h-[46px] w-full cursor-pointer rounded-xl bg-red-600 px-3.5 py-2.5 text-xs font-extrabold text-white hover:bg-red-500"
            >
              End Helpline Call
            </button>
          </div>
        );
      } else {
        const quickContacts: Array<{ id: string; label: string; sub: string; done?: boolean; onCall: () => void }> = [];

        if (drillType === "lost_phone") {
          quickContacts.push({
            id: "call-bank",
            label: `${vars.bank} 24×7 helpline`,
            sub: "Block UPI & cards immediately",
            done: runner.doneKeys.has("call_bank_helpline"),
            onCall: () => {
              runner.emit("call_bank_helpline");
              showToast(`Called ${vars.bank} to freeze UPI & cards.`);
            },
          });
          quickContacts.push({
            id: "call-telco",
            label: `${vars.telco} customer care`,
            sub: "Block SIM card to stop OTPs",
            done: runner.doneKeys.has("block_sim"),
            onCall: () => {
              runner.emit("block_sim");
              showToast(`Called ${vars.telco} to block SIM.`);
            },
          });
          const smsDist = drill.distractors.find((d) => d.screen === "calls");
          if (smsDist) {
            quickContacts.push({
              id: smsDist.id,
              label: smsDist.label,
              sub: "Number from SMS",
              onCall: () => wrongTap(smsDist.actionKey, smsDist.label),
            });
          }
        }

        if (drillType === "balance_alert") {
          quickContacts.push({
            id: "wt-bank",
            label: `${vars.bank} 24×7 helpline`,
            sub: "Log wrong-credit reversal request",
            done: runner.doneKeys.has("contact_bank"),
            onCall: () => {
              runner.emit("contact_bank");
              showToast(`Logged reversal request with ${vars.bank}.`);
            },
          });
        }

        if (drillType === "digital_arrest") {
          quickContacts.push({
            id: "da-family",
            label: "Call family or trusted friend",
            sub: "Break isolation & verify safely",
            done: runner.doneKeys.has("talk_trusted_verify"),
            onCall: () => {
              runner.emit("talk_trusted_verify");
              showToast("Verified safely with trusted family member.");
            },
          });
        }

        quickContacts.push({
          id: "c-1930",
          label: "1930 · National Cybercrime Helpline",
          sub: "Official cyber fraud helpline",
          done: runner.doneKeys.has("report_cybercrime") || runner.doneKeys.has("report_digital_arrest"),
          onCall: () => {
            if (drillType === "lost_phone") runner.emit("report_cybercrime");
            if (drillType === "digital_arrest") runner.emit("report_digital_arrest");
            setHelplineCallActive(true);
            showToast("Connected to simulated 1930 helpline.");
          },
        });

        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-2">
              {quickContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={c.onCall}
                  className={cn(
                    "flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border bg-white px-3.5 py-2 text-left shadow-xs",
                    c.done ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 hover:border-emerald-600",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-zinc-900">{c.label}</p>
                    <p className="truncate text-[11px] font-semibold text-zinc-500">{c.sub}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white",
                      c.done ? "bg-emerald-700" : "bg-emerald-600",
                    )}
                  >
                    {c.done ? <Check size={12} /> : <PhoneCall size={12} />}
                    {c.done ? "Done" : "Call"}
                  </span>
                </button>
              ))}
            </div>

            {/* T9 Dialer Pad */}
            <div className="space-y-2.5 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="flex min-h-[34px] items-center justify-between border-b border-zinc-100 px-2 pb-1.5">
                <span className="tnum text-lg font-extrabold tracking-wider text-zinc-900">
                  {dialedNumber || "Dial 1930"}
                </span>
                {dialedNumber && (
                  <button
                    type="button"
                    onClick={() => setDialedNumber((d) => d.slice(0, -1))}
                    aria-label="Backspace"
                    className="cursor-pointer px-2 text-zinc-500 hover:text-zinc-900"
                  >
                    <Delete size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIALER_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    onClick={() => setDialedNumber((d) => (d.length < 13 ? d + k.digit : d))}
                    className="flex min-h-[42px] cursor-pointer flex-col items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200"
                  >
                    <span className="text-base font-extrabold leading-none text-zinc-900">{k.digit}</span>
                    {k.letters && <span className="mt-0.5 text-[9px] font-bold text-zinc-500">{k.letters}</span>}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (dialedNumber === "1930") {
                    if (drillType === "lost_phone") runner.emit("report_cybercrime");
                    if (drillType === "digital_arrest") runner.emit("report_digital_arrest");
                    setHelplineCallActive(true);
                    return;
                  }
                  showToast("Practice dialer: dial 1930 for Cyber Helpline.");
                }}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-emerald-600 text-sm font-extrabold text-white hover:bg-emerald-500"
              >
                <Phone size={15} /> Call
              </button>
            </div>
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // ACCOUNTS APP (Lost Phone: multi-account sign out)
    // ------------------------------------------------------------------
    else if (appId === "accounts") {
      screenTitle = "Secure Your Accounts";
      screenSubtitle = "Sign out lost device";
      const secured = runner.doneKeys.has("secure_accounts");
      const accDistractors = drill.distractors.filter((d) => d.screen === "accounts");
      const toggleAcc = (name: string) =>
        setSelectedAccounts((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

      bodyContent = (
        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Select at least 2 accounts to lock down
            </p>
            {ACCOUNTS_LIST.map((name) => (
              <label
                key={name}
                className={cn(
                  "flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-xs font-bold text-zinc-900",
                  selectedAccounts.includes(name) ? "border-blue-700 bg-blue-50" : "border-zinc-200 bg-zinc-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(name)}
                  onChange={() => toggleAcc(name)}
                  className="h-4 w-4 accent-blue-700"
                />
                {name}
              </label>
            ))}
          </div>

          {secured ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
            >
              <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Passwords changed & lost phone signed out!
            </p>
          ) : (
            <button
              type="button"
              disabled={selectedAccounts.length < 2}
              onClick={() => {
                runner.emit("secure_accounts");
                showToast("Passwords changed & sessions signed out.");
              }}
              className="min-h-[46px] w-full cursor-pointer rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Change passwords and sign out sessions
            </button>
          )}

          {accDistractors.length > 0 &&
            renderDecisionButtons(
              [],
              accDistractors.map((d) => ({
                id: d.id,
                label: d.label,
                onClick: () => wrongTap(d.actionKey, d.label),
              })),
            )}
        </div>
      );
    }

    // ------------------------------------------------------------------
    // REPORT 1930 APP
    // ------------------------------------------------------------------
    else if (appId === "report") {
      screenTitle = "Report & Block Fraud";
      screenSubtitle = "1930 & cybercrime.gov.in";

      if (drillType === "sms") {
        bodyContent = (
          <MockComplaintForm
            embedded
            title="Block & report phishing SMS"
            intro="Blocking stops repeat phishing texts. Reporting the URL helps take fake bank sites down."
            details={[
              { label: "SMS Sender", value: payload.sender },
              { label: "Suspicious link", value: "bit.ly/kyc-9x2" },
            ]}
            reasons={["Fake KYC / Phishing link", "Impersonating my bank", "Spam"]}
            submitLabel={runner.doneKeys.has("block_report_sms") ? "Reported" : "Block sender & report phishing"}
            successText="Sender blocked and phishing SMS reported (sandbox)."
            onSubmit={() => {
              runner.emit("block_report_sms");
              showToast("Phishing SMS blocked & reported.");
            }}
            onBack={handleHomeNav}
          />
        );
      } else if (drillType === "collect_request") {
        bodyContent = (
          <MockComplaintForm
            embedded
            title="Block and report"
            intro="Blocking stops further requests from this UPI ID."
            details={[
              { label: "UPI ID", value: payload.senderId },
              { label: "Name shown", value: vars.name },
            ]}
            reasons={["Scam or fraud attempt", "Spam or unwanted requests", "Other"]}
            submitLabel="Block and report"
            successText="Blocked and reported (sandbox)."
            onSubmit={() => {
              runner.emit("block_report");
              showToast("Blocked & reported.");
            }}
            onBack={handleHomeNav}
          />
        );
      } else {
        const reportKey = drillType === "digital_arrest" ? "report_digital_arrest" : "report_cybercrime";
        const done = runner.doneKeys.has(reportKey);
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Official Reporting Channels</p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                File an official incident record on the national cybercrime helpline or portal.
              </p>
            </div>
            {done ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
              >
                <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Official report logged (sandbox).
              </p>
            ) : (
              renderDecisionButtons([
                {
                  id: "rep-1930",
                  label: "Call 1930 · National Cybercrime Helpline",
                  onClick: () => {
                    runner.emit(reportKey);
                    showToast("Reported via 1930 (sandbox).");
                  },
                },
                {
                  id: "rep-portal",
                  label: "Report on cybercrime.gov.in",
                  onClick: () => {
                    runner.emit(reportKey);
                    showToast("Report submitted on cybercrime.gov.in (sandbox).");
                  },
                },
              ])
            )}
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // BROWSER APP (NPCI Dispute Help + Safety Guide)
    // ------------------------------------------------------------------
    else if (appId === "browser") {
      if (drillType === "balance_alert") {
        screenTitle = "https://npci.org.in/dispute-help";
        screenSubtitle = "Verified HTTPS · NPCI Dispute Redressal";
        const escalated = runner.doneKeys.has("escalate_npci");
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">NPCI Escalation</p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                If your payment app and bank do not resolve the wrong transfer within official timelines, escalate through the NPCI dispute process.
              </p>
            </div>
            {escalated ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-900"
              >
                <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden /> Escalation noted (sandbox).
              </p>
            ) : (
              renderDecisionButtons([
                {
                  id: "npci-esc",
                  label: "Escalate through the NPCI dispute process",
                  onClick: () => {
                    runner.emit("escalate_npci");
                    showToast("NPCI escalation recorded.");
                  },
                },
              ])
            )}
          </div>
        );
      } else {
        screenTitle = "https://upi-safety-guide.org";
        screenSubtitle = "Verified HTTPS · Safety Rules";
        bodyContent = (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Rule 1 · Receiving Money Needs Zero PIN
              </p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                A UPI PIN or OTP is only for sending money or approving logins — never to receive refunds or verify innocence.
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                Rule 2 · Open Official Apps Directly
              </p>
              <p className="text-xs font-bold leading-relaxed text-zinc-900">
                Never click shortened SMS links. Open your bank or payment app directly from the Home screen.
              </p>
            </div>
          </div>
        );
      }
    }

    // ------------------------------------------------------------------
    // SETTINGS APP
    // ------------------------------------------------------------------
    else {
      screenTitle = "Settings";
      screenSubtitle = "PracticeOS · Safe Simulated Device";
      bodyContent = (
        <div className="space-y-3">
          <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Scenario Seed</p>
            <p className="tnum text-sm font-extrabold text-zinc-900">#{seedCode} · Details randomised</p>
          </div>
          <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Active Drill</p>
            <p className="text-sm font-extrabold text-zinc-900">{drill.title}</p>
          </div>
        </div>
      );
    }

    const AppIcon = app.icon;

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#F6F7F9] text-zinc-900">
        {/* PracticeOS Colored App Top Bar */}
        <div style={{ backgroundColor: app.accentColor }} className="shrink-0 px-4 py-3 text-white shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold opacity-90">
                <AppIcon size={12} strokeWidth={2.2} aria-hidden />
                {app.name}
              </p>
              <h1 className="truncate text-base font-extrabold leading-snug">{screenTitle}</h1>
              {screenSubtitle && <p className="truncate text-[11px] opacity-90">{screenSubtitle}</p>}
            </div>
            <span className="tnum shrink-0 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-extrabold">
              Step {Math.min(currentStepIdx + 1, steps.length)}/{steps.length}
            </span>
          </div>
        </div>

        {/* Browser Address Bar */}
        {appId === "browser" && (
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-300 bg-zinc-200 px-3 py-2 text-xs text-zinc-800">
            <Lock size={13} strokeWidth={2.2} className="shrink-0 text-emerald-700" aria-hidden />
            <span className="flex-1 truncate rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-mono text-[11px]">
              {screenTitle}
            </span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5">{bodyContent}</div>

        {/* Subtle In-App Bottom Feedback & Hint Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 bg-white px-3.5 py-2">
          <p className="flex-1 truncate text-[11px] font-semibold text-zinc-700">
            {toastText ?? (runner.hint ? runner.hint.text : nextStep?.cue ?? "All steps complete!")}
          </p>
          <button
            type="button"
            onClick={runner.requestHint}
            disabled={runner.phase !== "running"}
            className="shrink-0 cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-800 disabled:opacity-45"
          >
            Hint
          </button>
        </div>
      </div>
    );
  };

  return (
    <PhoneFrame
      timer={{ remainingMs: runner.remainingMs, totalMs: runner.limitMs, mode: timerMode }}
      timeLabel={vars.time || "9:41"}
      notifications={rawNotifications}
      onDismissNotification={(id) => setDismissedNotifs((p) => [...p, id])}
      onClearNotifications={() => setDismissedNotifs(rawNotifications.map((n) => n.id))}
      onBackNav={handleBackNav}
      onHomeNav={handleHomeNav}
      onRecentsNav={handleRecentsNav}
      fullscreen={fullscreen}
      onToggleFullscreen={onToggleFullscreen}
      onHint={runner.requestHint}
      hintDisabled={runner.phase !== "running"}
      stepProgress={`${runner.doneStepIds.length}/${steps.length}`}
      onOpenSteps={onOpenSteps}
    >
      {/* LOCK SCREEN */}
      {currentNav.view === "lock" && (
        <div
          onTouchStart={handleLockTouchStart}
          onTouchEnd={handleLockTouchEnd}
          className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-5 text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-10 h-56 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.22),transparent_70%)]"
          />

          <div className="relative z-10 space-y-1 pt-4 text-center">
            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-sky-300/90">
              <Lock size={11} strokeWidth={2.2} aria-hidden /> {drill.title}
            </p>
            <p className="tnum text-5xl font-extralight tracking-tight text-white">{vars.time || "9:41"}</p>
            <p className="text-xs font-medium text-zinc-300">Thu, 19 Nov · Seed #{seedCode}</p>
            {flashlightOn && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-300/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                <Flashlight size={10} /> Flashlight On
              </span>
            )}
          </div>

          <div className="relative z-10 my-auto space-y-2.5 py-3">
            {rawNotifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={notif.onOpen}
                className="w-full cursor-pointer space-y-1 rounded-2xl border border-white/15 bg-white/12 p-3.5 text-left backdrop-blur-xl transition-colors hover:bg-white/18"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-sky-300">{notif.appName}</span>
                  <span className="text-zinc-300">Tap to open</span>
                </div>
                <p className="text-xs font-extrabold text-white">{notif.title}</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-200">{notif.body}</p>
              </button>
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFlashlightOn((f) => !f)}
              aria-label="Toggle flashlight"
              className={cn(
                "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md",
                flashlightOn
                  ? "border-amber-200 bg-amber-300 text-zinc-950"
                  : "border-white/15 bg-white/10 text-white",
              )}
            >
              <Flashlight size={18} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (drillType === "digital_arrest") {
                  openApp("videocall", "call");
                } else {
                  navigateTo({ view: "home" });
                }
              }}
              className="flex min-h-[46px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-extrabold tracking-wide text-white backdrop-blur-md hover:bg-white/25"
            >
              Tap or Swipe Up to Unlock
              <ArrowUp size={13} strokeWidth={2.5} aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => openApp("browser", "guide")}
              aria-label="Open safety guide"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md"
            >
              <Camera size={18} />
            </button>
          </div>
        </div>
      )}

      {/* HOME LAUNCHER */}
      {currentNav.view === "home" && (
        <div className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-4 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(16,185,129,0.14),transparent_55%)]"
          />

          {/* Top Widget + Collapsible Mission & Coach Pill */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-base font-bold tracking-tight text-white">Thu, 19 Nov</p>
                <p className="text-xs font-medium text-sky-200/90">{drill.title}</p>
              </div>
              <button
                type="button"
                onClick={onOpenSteps}
                className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-zinc-200 hover:bg-white/20"
              >
                Steps ({runner.doneStepIds.length}/{steps.length})
              </button>
            </div>

            <div className="rounded-2xl border border-sky-400/50 bg-sky-500/20 p-3 shadow-lg backdrop-blur-xl ring-1 ring-sky-300/30">
              <button
                type="button"
                aria-expanded={missionExpanded}
                onClick={() => setMissionExpanded((e) => !e)}
                className="flex w-full cursor-pointer items-start justify-between gap-2 text-left"
              >
                <div className="min-w-0 space-y-1">
                  <span className="inline-block rounded-full bg-sky-400/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-200">
                    Active Step {Math.min(currentStepIdx + 1, steps.length)} of {steps.length}
                  </span>
                  <p className="text-[13px] font-extrabold leading-snug text-white">
                    {nextStep?.label ?? "All steps complete"}
                  </p>
                  <p className="text-[11.5px] font-medium leading-snug text-sky-100">
                    {nextStep?.cue ?? "All mandatory steps complete."}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-zinc-100">
                  Coach
                  {missionExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </span>
              </button>

              {missionExpanded && (
                <div className="mt-2.5 space-y-2.5 border-t border-white/15 pt-2.5 text-xs">
                  <p className="leading-relaxed text-zinc-200">{drill.intro}</p>
                  {hasFlags && (
                    <p className="text-[11px] font-bold text-sky-200">
                      Red flags spotted: {runner.run.flagsFound.length} of {drill.redFlags.length} (need {flagGoal})
                    </p>
                  )}
                  {runner.hint && (
                    <div className="rounded-xl border border-sky-400/40 bg-sky-500/20 p-2.5 font-medium leading-relaxed text-sky-100">
                      {runner.hint.text}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={runner.requestHint}
                    disabled={runner.phase !== "running"}
                    className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-45"
                  >
                    <Lightbulb size={13} />
                    {runner.nextStepMeta?.alreadyUnlocked ? "Show hint (free)" : "Ask Coach (−5 pts)"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4-Column Squircle App Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-x-2 gap-y-4 py-3">
            {homeApps.map((appId) => {
              const app = appCatalog[appId];
              const Icon = app.icon;
              const badgeCount = getAppBadge(appId);
              const isTarget = focusApps.includes(appId);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => openApp(app.id)}
                  className="group flex cursor-pointer flex-col items-center gap-1.5"
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-[56px] w-[56px] items-center justify-center rounded-[18px] border border-white/20 bg-gradient-to-br text-white shadow-lg transition-transform group-active:scale-95",
                        app.gradientClass,
                        isTarget && "ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950",
                      )}
                    >
                      <Icon size={24} strokeWidth={2} aria-hidden />
                    </div>
                    {badgeCount > 0 && (
                      <span className="tnum absolute -right-1.5 -top-1.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border border-slate-950 bg-red-600 px-1 text-[11px] font-extrabold text-white shadow">
                        {badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-1 text-center text-[11px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {app.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Page Dots + Frosted-Glass Bottom Dock */}
          <div className="relative z-10 space-y-2.5">
            <div aria-hidden className="flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-[26px] border border-white/15 bg-white/15 p-2.5 shadow-xl backdrop-blur-xl">
              {dockApps.map((dockId) => {
                const app = appCatalog[dockId];
                const Icon = app.icon;
                const badgeCount = getAppBadge(dockId);
                return (
                  <button
                    key={`dock-${app.id}`}
                    type="button"
                    onClick={() => openApp(app.id)}
                    aria-label={`Open ${app.name}`}
                    className="group flex cursor-pointer flex-col items-center justify-center"
                  >
                    <div className="relative">
                      <div
                        className={cn(
                          "flex h-[48px] w-[48px] items-center justify-center rounded-[16px] border border-white/20 bg-gradient-to-br text-white shadow-md transition-transform group-active:scale-95",
                          app.gradientClass,
                        )}
                      >
                        <Icon size={21} strokeWidth={2} aria-hidden />
                      </div>
                      {badgeCount > 0 && (
                        <span className="tnum absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-slate-950 bg-red-600 px-1 text-[10px] font-extrabold text-white shadow">
                          {badgeCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RECENTS CAROUSEL */}
      {currentNav.view === "recents" && (
        <div className="flex flex-1 flex-col justify-between overflow-y-auto bg-zinc-900/95 p-4 text-white">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-zinc-200">Recent Apps</h2>
              {recentApps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentApps([])}
                  className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200"
                >
                  Clear all
                </button>
              )}
            </div>

            {recentApps.length === 0 ? (
              <div className="space-y-2 py-16 text-center">
                <p className="text-sm font-bold text-zinc-400">No recent items</p>
                <p className="text-xs text-zinc-500">Tap Home below to launch an app.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApps.map((appId) => {
                  const app = appCatalog[appId];
                  const Icon = app.icon;
                  return (
                    <button
                      key={`rec-${app.id}`}
                      type="button"
                      onClick={() => openApp(app.id)}
                      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 text-left shadow-lg hover:border-sky-400"
                    >
                      <div
                        style={{ backgroundColor: app.accentColor }}
                        className="flex items-center justify-between px-3.5 py-2 text-white"
                      >
                        <span className="flex items-center gap-1.5 text-xs font-extrabold">
                          <Icon size={13} strokeWidth={2.2} />
                          {app.name}
                        </span>
                        <span className="text-[11px] opacity-90">Tap to resume</span>
                      </div>
                      <div className="bg-zinc-900/80 p-3.5 text-xs text-zinc-300">{app.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE APP */}
      {currentNav.view === "app" && currentNav.appId && renderActiveApp(currentNav.appId, currentNav.screenId ?? "")}

      {/* FAKE PIN / OTP KEYPAD OVERLAY */}
      <AnimatePresence>
        {runner.pinMode && (
          <MockPinPad key="pin" mode={runner.pinMode} onComplete={runner.completePin} onCancel={runner.cancelPin} />
        )}
      </AnimatePresence>

      {/* 3-2-1 COUNTDOWN & FINISHED OVERLAYS */}
      <AnimatePresence>
        {runner.phase === "countdown" && (
          <motion.div
            key="countdown"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 text-white"
            exit={{ opacity: 0 }}
            role="status"
            aria-live="assertive"
          >
            <p className="text-sm font-semibold text-sky-300">Booting PracticeOS · Get ready</p>
            <AnimatePresence mode="wait">
              <motion.span
                key={runner.count}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={spring}
                className="tnum text-[92px] font-bold leading-none text-white"
              >
                {runner.count}
              </motion.span>
            </AnimatePresence>
            <p className="tnum px-6 text-center text-xs text-zinc-400">
              Scenario seed #{seedCode} · details randomised
            </p>
          </motion.div>
        )}
        {runner.phase === "finished" && (
          <motion.div
            key="finished"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
          >
            <CheckCircle2 size={56} strokeWidth={1.5} className="text-emerald-400" aria-hidden />
            <p className="text-xl font-extrabold">Drill over</p>
            <p className="text-sm text-zinc-300">Scoring your response…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
