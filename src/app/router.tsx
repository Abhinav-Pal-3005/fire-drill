import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { EntryFlow } from "@/components/entry/EntryFlow";
import { AppShell } from "@/components/layout/AppShell";
import AboutEducation from "@/views/AboutEducation";
import CaseDetail from "@/views/CaseDetail";
import DrillBriefing from "@/views/DrillBriefing";
import DrillQuiz from "@/views/DrillQuiz";
import DrillResults from "@/views/DrillResults";
import DrillSandbox from "@/views/DrillSandbox";
import DrillsCatalog from "@/views/DrillsCatalog";
import EmergencySos from "@/views/EmergencySos";
import FraudLibrary from "@/views/FraudLibrary";
import Home from "@/views/Home";
import NotFound from "@/views/NotFound";
import Profile from "@/views/Profile";
import ProgressChecklist from "@/views/ProgressChecklist";

interface CapacitorAppPlugin {
  addListener?: (
    eventName: "backButton",
    handler: (data: { canGoBack?: boolean }) => void,
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => void };
  exitApp?: () => Promise<void> | void;
}

function NativeBackHandler() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cap = (
      window as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { App?: CapacitorAppPlugin } } }
    ).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const appPlugin = cap.Plugins?.App;
    if (!appPlugin?.addListener) return;

    let removed = false;
    let handle: { remove: () => Promise<void> | void } | undefined;

    const listenerResult = appPlugin.addListener("backButton", () => {
      const ev = new CustomEvent("mfd:back-button", { cancelable: true });
      window.dispatchEvent(ev);
      if (ev.defaultPrevented) return;

      if (pathname !== "/") {
        const idx = typeof window.history.state?.idx === "number" ? window.history.state.idx : 0;
        if (idx > 0) {
          navigate(-1);
        } else {
          navigate("/", { replace: true });
        }
        return;
      }

      void appPlugin.exitApp?.();
    });

    if (listenerResult && typeof (listenerResult as Promise<unknown>).then === "function") {
      void (listenerResult as Promise<{ remove: () => Promise<void> }>).then((h) => {
        if (removed) void h.remove?.();
        else handle = h;
      });
    } else {
      handle = listenerResult as { remove: () => void };
    }

    return () => {
      removed = true;
      void handle?.remove?.();
    };
  }, [pathname, navigate]);

  return null;
}

export function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Show Splash -> Welcome when the app opens on root ("/") or "/welcome".
  const [entryPhase, setEntryPhase] = useState<"splash" | "welcome" | null>(() => {
    if (typeof window === "undefined") return null;
    if (window.location.pathname === "/welcome") return "welcome";
    if (window.location.pathname === "/") return "splash";
    return null;
  });

  const handleStart = () => {
    // TODO: Route to the next onboarding or auth step when added; currently routes to Home.
    setEntryPhase(null);
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  };

  if (entryPhase !== null && (location.pathname === "/" || location.pathname === "/welcome")) {
    return (
      <>
        <NativeBackHandler />
        <EntryFlow initialPhase={entryPhase} onStart={handleStart} />
      </>
    );
  }

  return (
    <>
      <NativeBackHandler />
      <Routes>
        <Route
          path="welcome"
          element={<EntryFlow initialPhase="welcome" onStart={handleStart} />}
        />
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="drills" element={<DrillsCatalog />} />
          <Route path="drills/:id/brief" element={<DrillBriefing />} />
          <Route path="drills/:id/play" element={<DrillSandbox />} />
          <Route path="drills/:id/quiz" element={<DrillQuiz />} />
          <Route path="drills/:id/results" element={<DrillResults />} />
          <Route path="library" element={<FraudLibrary />} />
          <Route path="library/:id" element={<CaseDetail />} />
          <Route path="sos" element={<EmergencySos />} />
          <Route path="progress" element={<ProgressChecklist />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<AboutEducation />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
