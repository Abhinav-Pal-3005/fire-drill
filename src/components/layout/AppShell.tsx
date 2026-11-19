import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Settings, ShieldCheck, User } from "lucide-react";
import { PersistentSosButton } from "@/components/emergency/PersistentSosButton";
import { NavTitleContext } from "@/components/glass/GlassNavBar";
import { ToastHost } from "@/components/glass/GlassToast";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { useUserStore } from "@/store/useUserStore";
import { routeTransition } from "@/theme/tokens";
import { cn } from "@/utils/cn";
import EmergencySos from "@/views/EmergencySos";
import { DisclaimerPill, ResourcesSheet } from "./DisclaimerPill";
import { RoleChip } from "./RoleChip";
import { sidebarItems, tabItems } from "./navItems";

function SandboxBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex min-h-[44px] items-center gap-2.5" aria-label="Money Fire Drill home">
      <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-gradient-to-b from-accent to-accent-pressed text-white shadow-[0_6px_14px_rgba(0,98,204,0.3)]">
        <Flame size={19} strokeWidth={1.75} aria-hidden />
      </span>
      {!compact && <span className="t-headline leading-tight">Money Fire Drill</span>}
    </Link>
  );
}

function routeHeaderTitle(pathname: string): string {
  if (pathname === "/") return "Money Fire Drill";
  if (pathname.startsWith("/drills")) return "Drills";
  if (pathname.startsWith("/library")) return "Scam Library";
  if (pathname.startsWith("/sos")) return "Emergency SOS";
  if (pathname.startsWith("/progress")) return "Readiness";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/admin")) return "Admin Analytics";
  if (pathname.startsWith("/about")) return "Settings & Info";
  return "Money Fire Drill";
}

/** Global shell: Stitch warm-paper & forest-emerald UI everywhere except active sandbox (/play) or active Emergency Mode. */
export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = useUserStore((s) => s.role);
  const displayName = useUserStore((s) => s.displayName);
  const emergencyState = useEmergencyStore((s) => s.emergencyState);
  const triggerEmergency = useEmergencyStore((s) => s.triggerEmergency);
  const [title, setTitle] = useState("");
  const [resourcesOpen, setResourcesOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Feature-detect the optional SVG displacement lens (Chromium only). Degrades silently.
  useEffect(() => {
    const ua = navigator.userAgent;
    const chromium = /Chrome\//.test(ua) && !/Firefox\//.test(ua);
    const supported =
      typeof CSS !== "undefined" && CSS.supports("backdrop-filter", "url(#mfd-lens) blur(10px)");
    if (chromium && supported) document.documentElement.classList.add("lens-enabled");
    return () => document.documentElement.classList.remove("lens-enabled");
  }, []);

  const focusMode = pathname.endsWith("/play");
  const tabs = useMemo(() => tabItems(role), [role]);
  const side = useMemo(() => sidebarItems(), []);

  // Law 3: Full Chrome Stripping whenever emergencyState !== 'IDLE'.
  // Removes all nav bars, sidebars, bottom tabs, settings, and distractions for panic-proof focus.
  if (emergencyState !== "IDLE") {
    return (
      <NavTitleContext.Provider value={setTitle}>
        <div className="min-h-dvh overflow-x-clip">
          <EmergencySos />
        </div>
        <ToastHost />
      </NavTitleContext.Provider>
    );
  }

  const handleInstantSos = () => {
    triggerEmergency(pathname);
    navigate("/sos");
  };

  // PracticeOS obsidian studio shell during active /play drills only (Stitch shell elsewhere untouched).
  if (focusMode) {
    return (
      <NavTitleContext.Provider value={setTitle}>
        <div className="relative min-h-dvh overflow-x-clip bg-neutral-950 text-zinc-100">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.16),transparent_65%)]"
          />
          <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-[var(--gutter)]">
              <div className="flex min-w-0 items-center gap-2.5">
                <SandboxBrand compact />
                <div className="min-w-0">
                  <span className="block truncate text-[14px] font-bold leading-tight text-white">
                    {title || "PracticeOS Drill"}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-300/90">
                    PracticeOS · Safe Sandbox
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden md:block">
                  <DisclaimerPill sandbox onClick={() => setResourcesOpen(true)} />
                </div>
                <RoleChip sandbox />
                <PersistentSosButton compact />
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto w-full max-w-[1120px] px-[var(--gutter)] pb-16 pt-4">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={routeTransition}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
        <ResourcesSheet open={resourcesOpen} onClose={() => setResourcesOpen(false)} />
        <ToastHost />
      </NavTitleContext.Provider>
    );
  }

  const headerTitle = routeHeaderTitle(pathname);
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AR";

  return (
    <NavTitleContext.Provider value={setTitle}>
      <div className="min-h-dvh overflow-x-clip bg-st-surface text-st-on-surface">
        {/* Desktop Sidebar */}
        <aside className="no-print fixed bottom-4 left-4 top-4 z-50 hidden w-[244px] flex-col rounded-[28px] bg-st-surface-low p-3 shadow-[0_2px_16px_rgba(20,38,30,0.06)] ring-1 ring-st-outline-variant/40 lg:flex">
          <Link to="/" className="flex items-center gap-2.5 px-3 pb-4 pt-2.5" aria-label="Money Fire Drill home">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-st-primary-container text-st-on-primary shadow-sm">
              <Flame size={19} strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-[16px] font-bold tracking-tight text-st-primary-container">
                Money Fire Drill
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                Safe Sandbox
              </span>
            </div>
          </Link>

          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
            {side.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              const isSos = item.tone === "sos";
              if (isSos) {
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={handleInstantSos}
                    className="relative flex min-h-[48px] w-full items-center gap-3 rounded-full bg-[#DC2626] px-4 text-left text-[15px] font-semibold text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] transition-transform hover:bg-[#B91C1C] active:scale-[0.98]"
                  >
                    <Icon size={19} strokeWidth={2.2} aria-hidden />
                    <span className="whitespace-nowrap">SOS / Scammed?</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[46px] items-center gap-3 rounded-full px-4 text-[15px] font-semibold transition-all",
                    active
                      ? "bg-st-primary-container text-st-on-primary shadow-sm"
                      : "text-st-on-surface-variant hover:bg-st-surface-container hover:text-st-primary",
                  )}
                >
                  <Icon size={19} strokeWidth={2} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-2 rounded-2xl bg-st-surface-container p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
              <ShieldCheck size={14} strokeWidth={2} aria-hidden />
              <span>100% Mock Sandbox</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-st-on-surface-variant">
              No real money, banks or PINs stored.
            </p>
          </div>
        </aside>

        {/* Main Column */}
        <div className="min-w-0 lg:pl-[268px]">
          <header className="no-print sticky top-0 z-40 bg-st-surface-low/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl shadow-[0_1px_8px_rgba(20,38,30,0.04)]">
            <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between gap-3 px-4 sm:px-6">
              <Link to="/" className="flex min-w-0 items-center gap-2.5 lg:gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-st-primary-container text-st-on-primary shadow-sm lg:hidden">
                  <Flame size={19} strokeWidth={2} aria-hidden />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[18px] font-bold leading-tight tracking-tight text-st-primary-container sm:text-[20px]">
                    {headerTitle}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
                    Money Fire Drill
                  </span>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <PersistentSosButton />
                <div className="hidden sm:block">
                  <RoleChip />
                </div>
                <Link
                  to="/about"
                  aria-label="Settings"
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full text-st-on-surface-variant transition-colors hover:bg-st-surface-highest hover:text-st-primary-container",
                    pathname.startsWith("/about") && "bg-st-surface-highest text-st-primary-container",
                  )}
                >
                  <Settings size={20} strokeWidth={1.9} aria-hidden />
                </Link>
                <Link
                  to="/profile"
                  aria-label="Profile"
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full bg-st-primary-container text-[12px] font-bold text-st-on-primary shadow-sm transition-all hover:ring-2 hover:ring-st-secondary",
                    pathname.startsWith("/profile") && "ring-2 ring-st-secondary",
                  )}
                >
                  {initials || <User size={16} />}
                </Link>
              </div>
            </div>
          </header>

          <div className="no-print mx-auto flex max-w-[960px] justify-center px-4 pt-3 sm:px-6">
            <DisclaimerPill onClick={() => setResourcesOpen(true)} />
          </div>

          <main className="mx-auto w-full min-w-0 max-w-[960px] px-4 pb-28 pt-3 sm:px-6 lg:pb-14">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={routeTransition}
              className="min-w-0"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <nav
          aria-label="Primary"
          className="no-print fixed bottom-0 left-0 right-0 z-50 bg-st-surface-low/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-[0_-2px_16px_rgba(20,38,30,0.06)] lg:hidden"
        >
          <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around px-1">
            {tabs.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              const isSos = item.tone === "sos";
              if (isSos) {
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={handleInstantSos}
                    aria-label="SOS — Scammed? Immediately freeze outbound payments"
                    className="flex min-h-[48px] min-w-[56px] flex-col items-center justify-center py-1 text-[#DC2626] transition-transform active:scale-95"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#DC2626] text-white shadow-[0_3px_10px_rgba(220,38,38,0.35)]">
                      <Icon size={18} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className="mt-1 text-center text-[11px] font-bold leading-none text-[#DC2626]">
                      {item.label}
                    </span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[48px] min-w-[56px] flex-col items-center justify-center py-1 transition-all",
                    active
                      ? "scale-[1.03] font-semibold text-st-primary-container"
                      : "text-st-on-surface-variant hover:text-st-primary",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  <span className="mt-1 text-center text-[11px] leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <ResourcesSheet open={resourcesOpen} onClose={() => setResourcesOpen(false)} />
        <ToastHost />
      </div>
    </NavTitleContext.Provider>
  );
}

