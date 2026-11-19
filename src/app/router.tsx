import { useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { EntryFlow } from "@/components/entry/EntryFlow";
import { AppShell } from "@/components/layout/AppShell";
import AboutEducation from "@/views/AboutEducation";
import AdminDashboard from "@/views/AdminDashboard";
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
    return <EntryFlow initialPhase={entryPhase} onStart={handleStart} />;
  }

  return (
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
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="about" element={<AboutEducation />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
