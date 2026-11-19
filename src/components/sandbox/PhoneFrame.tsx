import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import {
  ArrowUpDown,
  BatteryFull,
  Bell,
  ChevronLeft,
  Circle,
  Clock,
  Lightbulb,
  Maximize2,
  Minimize2,
  Moon,
  Square,
  Sun,
  TimerOff,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import type { TimerMode } from "@/types";
import { cn } from "@/utils/cn";
import { formatClock } from "@/utils/formatters";

export interface PhoneNotificationItem {
  id: string;
  appName: string;
  title: string;
  body: string;
  onOpen: () => void;
}

interface PhoneFrameProps {
  children: ReactNode;
  timer?: { remainingMs: number; totalMs: number; mode?: TimerMode };
  timeLabel?: string;
  dateLabel?: string;
  notifications?: PhoneNotificationItem[];
  onDismissNotification?: (id: string) => void;
  onClearNotifications?: () => void;
  onBackNav?: () => void;
  onHomeNav?: () => void;
  onRecentsNav?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onHint?: () => void;
  hintDisabled?: boolean;
  stepProgress?: string;
  onOpenSteps?: () => void;
  className?: string;
}

/**
 * PracticeOS Titanium / Obsidian Smartphone Chassis:
 * - Android status bar with camera punch-hole island, live drill timer & pull-down Quick Settings shade
 * - Full-screen edge-to-edge mode on mobile screens
 * - Persistent Android 3-button navigation bar (Back, Home, Recents)
 */
export function PhoneFrame({
  children,
  timer,
  timeLabel = "9:41",
  dateLabel = "Thu, 19 Nov",
  notifications = [],
  onDismissNotification,
  onClearNotifications,
  onBackNav,
  onHomeNav,
  onRecentsNav,
  fullscreen = false,
  onToggleFullscreen,
  onHint,
  hintDisabled = false,
  stepProgress,
  onOpenSteps,
  className,
}: PhoneFrameProps) {
  const [shadeOpen, setShadeOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(true);
  const [mobileDataOn, setMobileDataOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [dndOn, setDndOn] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shadeOpen) return;
    const onBack = (e: Event) => {
      e.preventDefault();
      setShadeOpen(false);
    };
    window.addEventListener("mfd:back-button", onBack);
    return () => window.removeEventListener("mfd:back-button", onBack);
  }, [shadeOpen]);

  const noTimer = timer?.mode === "none";
  const fraction =
    timer && !noTimer && timer.totalMs > 0 ? Math.max(0, Math.min(1, timer.remainingMs / timer.totalMs)) : 1;
  const urgent = timer && !noTimer ? fraction <= 0.2 : false;
  const warn = timer && !noTimer ? !urgent && fraction <= 0.35 : false;

  const handleStatusTouchStart = (e: TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const handleStatusTouchEnd = (e: TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY > 18) setShadeOpen(true);
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        fullscreen ? "fixed inset-0 z-[70] h-[100dvh] w-full bg-zinc-950" : "w-full lg:w-auto",
        className,
      )}
    >
      {/* Side hardware buttons (Desktop chassis accents) */}
      {!fullscreen && (
        <>
          <div aria-hidden className="absolute -left-[3px] top-[156px] hidden h-[54px] w-[3px] rounded-l-sm bg-zinc-600 lg:block" />
          <div aria-hidden className="absolute -left-[3px] top-[224px] hidden h-[54px] w-[3px] rounded-l-sm bg-zinc-600 lg:block" />
          <div aria-hidden className="absolute -right-[3px] top-[192px] hidden h-[74px] w-[3px] rounded-r-sm bg-zinc-600 lg:block" />
        </>
      )}

      {/* Titanium / Obsidian outer bezel */}
      <div
        role="region"
        aria-label="PracticeOS Simulated Smartphone"
        className={cn(
          "flex flex-col bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900",
          fullscreen
            ? "h-[100dvh] w-full rounded-none bg-zinc-950 p-0 shadow-none"
            : "h-[calc(100dvh_-_176px)] min-h-[540px] w-full rounded-[34px] p-[7px] shadow-[0_24px_64px_rgba(0,0,0,0.65)] lg:[--ph:max(600px,min(812px,calc(100dvh_-_148px)))] lg:h-[var(--ph)] lg:w-[calc(var(--ph)*0.483)] lg:rounded-[44px] lg:p-[10px] lg:shadow-[0_28px_80px_rgba(0,0,0,0.85)]",
        )}
      >
        {/* Inner OLED display viewport */}
        <div
          className={cn(
            "relative flex h-full w-full flex-col overflow-hidden bg-zinc-950",
            fullscreen
              ? "rounded-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
              : "rounded-[28px] lg:rounded-[35px]",
          )}
        >
          {/* Screen brightness overlay (Quick Settings slider) */}
          <div
            aria-hidden
            style={{ opacity: Math.max(0, (100 - brightness) * 0.0065) }}
            className="pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-150"
          />

          {/* 1. Android Status Bar + Camera Punch-Hole Island */}
          <header
            className="z-30 flex h-[40px] w-full shrink-0 select-none items-center justify-between gap-1.5 border-b border-white/5 bg-zinc-950/95 px-3 text-[11px] font-bold text-zinc-100"
            onTouchStart={handleStatusTouchStart}
            onTouchEnd={handleStatusTouchEnd}
          >
            {/* Left: Time + Timer + Unread Bell */}
            <button
              type="button"
              onClick={() => setShadeOpen((o) => !o)}
              aria-label="Status bar — tap or pull down for Quick Settings and notifications"
              className="flex min-w-0 cursor-pointer items-center gap-1.5"
            >
              <span className="tnum text-[11.5px] font-extrabold tracking-tight">{timeLabel}</span>
              {notifications.length > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                  <Bell size={10} strokeWidth={2.2} aria-hidden />
                  {notifications.length}
                </span>
              )}
              {timer &&
                (noTimer ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
                    <TimerOff size={10} strokeWidth={2.3} aria-hidden />
                    No timer
                  </span>
                ) : (
                  <span
                    className={cn(
                      "tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold transition-colors",
                      urgent
                        ? "animate-pulse bg-red-500/25 text-red-300 ring-1 ring-red-400/50"
                        : warn
                          ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                          : "bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30",
                    )}
                  >
                    <Clock size={10} strokeWidth={2.3} aria-hidden />
                    {formatClock(timer.remainingMs)}
                  </span>
                ))}
            </button>

            {/* Center: Camera punch-hole + Practice pill */}
            <button
              type="button"
              onClick={() => setShadeOpen((o) => !o)}
              className="hidden items-center gap-1.5 rounded-full border border-zinc-800 bg-black px-2 py-0.5 sm:inline-flex"
              aria-label="Toggle notification shade"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-900 ring-1 ring-zinc-700" aria-hidden />
              <span className="whitespace-nowrap text-[9.5px] font-extrabold tracking-wide text-sky-300">
                PRACTICE · No real money
              </span>
            </button>

            {/* Right: Mobile Fullscreen/Controls OR Signal/Wi-Fi/Battery */}
            <div className="flex shrink-0 items-center gap-1.5">
              {fullscreen && stepProgress && onOpenSteps && (
                <button
                  type="button"
                  onClick={onOpenSteps}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-200 lg:hidden"
                >
                  {stepProgress}
                </button>
              )}
              {fullscreen && onHint && (
                <button
                  type="button"
                  onClick={onHint}
                  disabled={hintDisabled}
                  aria-label="Hint"
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-blue-600/80 px-2 text-[10px] font-bold text-white disabled:opacity-40 lg:hidden"
                >
                  <Lightbulb size={11} strokeWidth={2.2} aria-hidden />
                  Hint
                </button>
              )}
              {!fullscreen && (
                <div className="flex items-center gap-1 text-zinc-200" aria-hidden>
                  {mobileDataOn && <span className="text-[10px] text-zinc-300">5G</span>}
                  {wifiOn && <Wifi size={12} strokeWidth={2} />}
                  <BatteryFull size={14} strokeWidth={2} className="text-emerald-400" />
                </div>
              )}
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
                  title={fullscreen ? "Exit full screen" : "Full screen"}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-100 hover:bg-white/20 lg:hidden"
                >
                  {fullscreen ? (
                    <Minimize2 size={13} strokeWidth={2.2} aria-hidden />
                  ) : (
                    <Maximize2 size={13} strokeWidth={2.2} aria-hidden />
                  )}
                </button>
              )}
            </div>
          </header>

          {/* Slim 3px live countdown bar */}
          {timer && !noTimer && (
            <div className="h-[3px] w-full shrink-0 bg-zinc-900" aria-hidden>
              <div
                className={cn(
                  "h-full transition-[width,background-color] duration-200 ease-linear",
                  urgent ? "bg-red-500" : warn ? "bg-amber-400" : "bg-sky-400",
                )}
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </div>
          )}

          {/* 2. Frosted-Glass Quick Settings & Notification Shade */}
          {shadeOpen && (
            <div className="absolute inset-x-0 bottom-[48px] top-[43px] z-30 flex flex-col justify-between overflow-y-auto bg-zinc-950/90 p-4 text-zinc-100 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">{dateLabel} · Quick Settings</span>
                  <button
                    type="button"
                    onClick={() => setShadeOpen(false)}
                    className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white"
                  >
                    Close
                  </button>
                </div>

                {/* 2x2 Quick Settings Tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWifiOn((v) => !v)}
                    className={cn(
                      "flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                      wifiOn ? "bg-blue-600 text-white" : "bg-white/10 text-zinc-300",
                    )}
                  >
                    <Wifi size={16} strokeWidth={2} aria-hidden />
                    <div>
                      <p className="text-xs font-extrabold">Wi-Fi</p>
                      <p className="text-[10px] opacity-85">{wifiOn ? "HomeFiber_5G" : "Off"}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileDataOn((v) => !v)}
                    className={cn(
                      "flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                      mobileDataOn ? "bg-blue-600 text-white" : "bg-white/10 text-zinc-300",
                    )}
                  >
                    <ArrowUpDown size={16} strokeWidth={2} aria-hidden />
                    <div>
                      <p className="text-xs font-extrabold">Mobile Data</p>
                      <p className="text-[10px] opacity-85">{mobileDataOn ? "5G Active" : "Off"}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundOn((v) => !v)}
                    className={cn(
                      "flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                      soundOn ? "bg-blue-600 text-white" : "bg-white/10 text-zinc-300",
                    )}
                  >
                    {soundOn ? <Volume2 size={16} strokeWidth={2} aria-hidden /> : <VolumeX size={16} strokeWidth={2} aria-hidden />}
                    <div>
                      <p className="text-xs font-extrabold">Sound</p>
                      <p className="text-[10px] opacity-85">{soundOn ? "Ring & Alerts" : "Muted"}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDndOn((v) => !v)}
                    className={cn(
                      "flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                      dndOn ? "bg-indigo-600 text-white" : "bg-white/10 text-zinc-300",
                    )}
                  >
                    <Moon size={16} strokeWidth={2} aria-hidden />
                    <div>
                      <p className="text-xs font-extrabold">Do Not Disturb</p>
                      <p className="text-[10px] opacity-85">{dndOn ? "On" : "Off"}</p>
                    </div>
                  </button>
                </div>

                {/* Brightness Slider */}
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-2.5">
                  <Sun size={15} strokeWidth={2} className="text-amber-300" aria-hidden />
                  <input
                    type="range"
                    min={35}
                    max={100}
                    value={brightness}
                    aria-label="Screen brightness"
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full cursor-pointer accent-sky-400"
                  />
                  <span className="tnum text-[11px] font-bold text-zinc-300">{brightness}%</span>
                </div>

                {/* Actionable Notifications List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                      Notifications ({notifications.length})
                    </p>
                    {notifications.length > 0 && onClearNotifications && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        className="cursor-pointer text-xs font-bold text-sky-300"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="rounded-2xl bg-white/5 p-4 text-center text-xs text-zinc-400">
                      No unread notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="space-y-1.5 rounded-2xl border border-white/10 bg-white/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-extrabold text-sky-300">{n.appName}</span>
                          {onDismissNotification && (
                            <button
                              type="button"
                              onClick={() => onDismissNotification(n.id)}
                              aria-label="Dismiss notification"
                              className="cursor-pointer text-zinc-400 hover:text-white"
                            >
                              <X size={13} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-bold text-white">{n.title}</p>
                        <p className="text-xs leading-relaxed text-zinc-300">{n.body}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShadeOpen(false);
                            n.onOpen();
                          }}
                          className="mt-1 min-h-[36px] w-full cursor-pointer rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
                        >
                          Open
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShadeOpen(false)}
                aria-label="Close notification shade"
                className="flex w-full cursor-pointer justify-center pb-1 pt-3"
              >
                <span className="h-1 w-12 rounded-full bg-white/40" />
              </button>
            </div>
          )}

          {/* 3. Main Phone Viewport */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">{children}</div>

          {/* 4. Persistent Android 3-Button Navigation Bar */}
          <nav
            aria-label="Android system navigation"
            className="z-30 grid h-[48px] w-full shrink-0 grid-cols-3 border-t border-white/10 bg-zinc-950 text-zinc-200"
          >
            <button
              type="button"
              onClick={onBackNav}
              aria-label="Back"
              className="flex min-h-[48px] cursor-pointer items-center justify-center hover:bg-white/10 active:bg-white/15"
            >
              <ChevronLeft size={19} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onHomeNav}
              aria-label="Home"
              className="flex min-h-[48px] cursor-pointer items-center justify-center hover:bg-white/10 active:bg-white/15"
            >
              <Circle size={15} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onRecentsNav}
              aria-label="Recents"
              className="flex min-h-[48px] cursor-pointer items-center justify-center hover:bg-white/10 active:bg-white/15"
            >
              <Square size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
