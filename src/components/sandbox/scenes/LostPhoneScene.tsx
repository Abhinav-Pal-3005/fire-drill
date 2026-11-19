import { useState } from "react";
import { CheckCircle2, Flag, KeyRound, MessageSquare, Phone, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { MockDialer, type DialerContact } from "../MockDialer";
import { MockInbox } from "../MockInbox";
import { DistractorRows, PhoneBody, PhoneButton, PhoneHeader, PhoneRow, useSnack } from "../phoneUi";
import type { SceneProps } from "./sceneTypes";

type Tab = "messages" | "calls" | "accounts" | "report";

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "accounts", label: "Accounts", icon: KeyRound },
  { id: "report", label: "Report", icon: Flag },
];

const DEFAULT_ACCOUNTS = ["Email account", "Cloud backup and photos", "Social media accounts"];

function str(val: unknown, fallback: string): string {
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

/** Drill 2: you are on a friend's phone after losing yours. */
export function LostPhoneScene({ drill, vars, stepProps, emit, tapFlag, flagsFound, doneKeys }: SceneProps) {
  const [tab, setTab] = useState<Tab>("messages");
  const [selected, setSelected] = useState<string[]>([]);
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;

  const bank = str(stepProps?.bankName ?? stepProps?.bank, vars.bank || vars.bankName || "Your Bank");
  const telco = str(stepProps?.telco, vars.telco || "Mobile Operator");
  const sender = str(stepProps?.sender, payload.sender || vars.maskedPhone || "Unknown number");
  const time = str(stepProps?.time, payload.time || vars.time || "now");
  const body = str(stepProps?.body, payload.body || "");
  const accounts = Array.isArray(stepProps?.accounts) ? (stepProps.accounts as string[]) : DEFAULT_ACCOUNTS;

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    show("Done in the sandbox. Nothing real happened.");
  };

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const contacts: DialerContact[] = [
    {
      id: "telco",
      name: `${telco} customer care`,
      subtitle: "Mobile operator",
      onCall: () => emit("block_sim"),
    },
    ...drill.distractors
      .filter((d) => d.screen === "calls")
      .map((d) => ({
        id: d.id,
        name: d.label,
        subtitle: sender,
        onCall: () => emit(d.actionKey, d.label),
      })),
    {
      id: "bank",
      name: `${bank} 24×7 helpline`,
      subtitle: "Bank helpline",
      onCall: () => emit("call_bank_helpline"),
    },
  ];

  const secured = doneKeys.has("secure_accounts");
  const reported = doneKeys.has("report_cybercrime");

  return (
    <>
      {tab === "messages" && (
        <MockInbox
          title="Messages"
          messages={[{ id: "m1", sender, time, body }]}
          redFlags={drill.redFlags}
          found={flagsFound}
          onFlag={tapFlag}
          onMiss={() => tapFlag(null)}
        >
          <DistractorRows drill={drill} screen="messages" onTap={wrongTap} />
        </MockInbox>
      )}

      {tab === "calls" && <MockDialer title="Calls" contacts={contacts} />}

      {tab === "accounts" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title="Secure your accounts" subtitle="Do this from another device" />
          </div>
          <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
            <fieldset className="space-y-2">
              <legend className="px-1 pb-1 text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Accounts to secure</legend>
              {accounts.map((name) => (
                <label
                  key={name}
                  className={cn(
                    "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl bg-white px-3 text-[14px] font-medium text-[#0b1b3a] ring-1",
                    selected.includes(name) ? "ring-2 ring-accent" : "ring-[#e3eaf6] hover:bg-[#f7faff]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggle(name)}
                    className="h-5 w-5 accent-[#007aff]"
                  />
                  {name}
                </label>
              ))}
            </fieldset>
            {secured ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Passwords changed and sessions signed out (sandbox).
              </p>
            ) : (
              <PhoneButton disabled={selected.length < 2} onClick={() => emit("secure_accounts")}>
                Change passwords and sign out sessions
              </PhoneButton>
            )}
            {selected.length < 2 && !secured && (
              <p className="px-1 text-[12px] text-[#4f5f7a]">Select at least two accounts to continue.</p>
            )}
            <DistractorRows drill={drill} screen="accounts" onTap={wrongTap} />
          </PhoneBody>
        </>
      )}

      {tab === "report" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title="Report cyber fraud" subtitle="Practice only" />
          </div>
          <PhoneBody className="space-y-2 px-3 pb-24 pt-[68px]">
            <PhoneRow icon={Phone} title="Call 1930" subtitle="National cybercrime helpline" onClick={() => emit("report_cybercrime")} />
            <PhoneRow icon={Flag} title="Open cybercrime.gov.in" subtitle="National reporting portal" onClick={() => emit("report_cybercrime")} />
            {reported && (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Report started (sandbox).
              </p>
            )}
          </PhoneBody>
        </>
      )}

      <nav aria-label="Phone tabs" className="absolute inset-x-0 bottom-0 z-10 flex border-t border-[#e3eaf6] bg-white/95 px-1 pb-1 pt-1 lg:pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors",
                active ? "text-accent-text" : "text-[#4f5f7a] hover:text-[#0b1b3a]",
              )}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </nav>
      {snack}
    </>
  );
}
