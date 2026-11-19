import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, GraduationCap } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { GlassSegmented } from "@/components/glass/GlassSegmented";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { useUserStore } from "@/store/useUserStore";
import type { Role } from "@/types";

/**
 * Role chip + sheet. The role is a FAKE switch for demos: there is no sign-in.
 * v2: replace with real authentication and server-side permissions.
 */
export function RoleChip({ sandbox = false }: { sandbox?: boolean }) {
  const role = useUserStore((s) => s.role);
  const setRole = useUserStore((s) => s.setRole);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const change = (next: Role) => {
    setRole(next);
    if (next === "admin") navigate("/admin");
    else if (pathname.startsWith("/admin")) navigate("/");
    setOpen(false);
  };

  const Icon = role === "admin" ? BarChart3 : GraduationCap;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Role: ${role === "admin" ? "Admin" : "Learner"}. Change role`}
        className={
          sandbox
            ? "glass-regular relative inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-label transition-transform active:scale-[0.97]"
            : "relative inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-st-surface-container-high px-3 text-[13px] font-semibold text-st-primary transition-colors hover:bg-st-surface-highest active:scale-[0.97]"
        }
      >
        <Icon size={15} strokeWidth={2} className={sandbox ? "text-accent-text" : "text-st-secondary"} aria-hidden />
        <span>{role === "admin" ? "Admin" : "Learner"}</span>
      </button>
      <GlassSheet open={open} onClose={() => setOpen(false)} title="Choose a view">
        <div className="space-y-4">
          <GlassSegmented<Role>
            ariaLabel="Role"
            value={role}
            onChange={change}
            options={[
              { value: "learner", label: "Learner", icon: <GraduationCap size={16} strokeWidth={1.75} /> },
              { value: "admin", label: "Admin", icon: <BarChart3 size={16} strokeWidth={1.75} /> },
            ]}
          />
          <p className="t-subhead text-label-2">
            Learners practise drills. Admins see aggregated learning analytics for a whole group.
          </p>
          <GlassBadge tone="warning">Demo switch · no sign-in (v2)</GlassBadge>
        </div>
      </GlassSheet>
    </>
  );
}
