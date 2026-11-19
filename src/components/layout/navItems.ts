import { BarChart3, BookOpenCheck, Flame, Home, Settings, Shield, Siren, User, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface StitchNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  tone?: "sos";
}

const HOME: StitchNavItem = { to: "/", label: "Home", icon: Home, match: (p) => p === "/" };
const DRILLS: StitchNavItem = {
  to: "/drills",
  label: "Drills",
  icon: Flame,
  match: (p) => p.startsWith("/drills"),
};
const LIBRARY: StitchNavItem = {
  to: "/library",
  label: "Library",
  icon: BookOpenCheck,
  match: (p) => p.startsWith("/library"),
};
const SOS: StitchNavItem = {
  to: "/sos",
  label: "SOS",
  icon: Siren,
  match: (p) => p.startsWith("/sos"),
  tone: "sos",
};
const READINESS: StitchNavItem = {
  to: "/progress",
  label: "Readiness",
  icon: Shield,
  match: (p) => p.startsWith("/progress"),
};
const PROFILE: StitchNavItem = {
  to: "/profile",
  label: "Profile",
  icon: User,
  match: (p) => p.startsWith("/profile"),
};
const SETTINGS: StitchNavItem = {
  to: "/about",
  label: "Settings",
  icon: Settings,
  match: (p) => p.startsWith("/about"),
};
const ADMIN: StitchNavItem = {
  to: "/admin",
  label: "Admin",
  icon: BarChart3,
  match: (p) => p.startsWith("/admin"),
};

/** Mobile tab bar matching Stitch navigation: Drills, Library, SOS, Readiness, Profile (+ Admin when active). */
export function tabItems(role: Role): StitchNavItem[] {
  const base = [DRILLS, LIBRARY, SOS, READINESS, PROFILE];
  return role === "admin" ? [...base, ADMIN] : base;
}

/** Desktop sidebar navigation. */
export function sidebarItems(): StitchNavItem[] {
  return [HOME, DRILLS, LIBRARY, SOS, READINESS, PROFILE, SETTINGS, ADMIN];
}
