import { useState } from "react";
import { Building2, CheckCircle2, Flag, MessageSquare, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { MockComplaintForm } from "../MockComplaintForm";
import { MockInbox } from "../MockInbox";
import { DistractorRows, PhoneBody, PhoneButton, PhoneHeader, PhoneRow, useSnack } from "../phoneUi";
import type { SceneProps } from "./sceneTypes";

type Tab = "messages" | "bank" | "report";

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "bank", label: "Bank App", icon: Building2 },
  { id: "report", label: "Report", icon: Flag },
];

/** Drill: fake bank KYC SMS phishing link vs opening official bank app directly. */
export function PhishingSmsScene({ drill, vars, emit, tapFlag, flagsFound, doneKeys }: SceneProps) {
  const [tab, setTab] = useState<Tab>("messages");
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    if (key !== "tap_kyc_link") show("Done in the sandbox. Nothing real happened.");
  };

  const openBankTab = () => {
    emit("open_official_app");
    setTab("bank");
  };

  const kycChecked = doneKeys.has("check_kyc_status");
  const reported = doneKeys.has("block_report_sms");

  return (
    <>
      {tab === "messages" && (
        <MockInbox
          title="Messages"
          messages={[
            {
              id: "m1",
              sender: payload.sender,
              time: payload.time,
              channel: payload.channel,
              body: payload.body,
            },
          ]}
          redFlags={drill.redFlags}
          found={flagsFound}
          onFlag={tapFlag}
          onMiss={() => tapFlag(null)}
        >
          <DistractorRows drill={drill} screen="messages" onTap={wrongTap} />
        </MockInbox>
      )}

      {tab === "bank" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title={`${vars.bank} Official`} subtitle="Opened directly" />
          </div>
          <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
            <div className="rounded-[20px] bg-white p-4 ring-1 ring-[#e3eaf6]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf3ff] text-accent-text">
                  <ShieldCheck size={20} strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-bold text-[#0b1b3a]">Account &amp; KYC Centre</p>
                  <p className="text-[12px] text-[#4f5f7a]">Official {vars.bank} status</p>
                </div>
              </div>
              <p className="mt-3 text-[13.5px] leading-snug text-[#33415c]">
                Check your real account notifications here instead of trusting SMS links.
              </p>
            </div>

            {kycChecked ? (
              <div role="status" className="space-y-1.5 rounded-2xl bg-[#e5f8ea] p-3.5 text-[#1e7b34]">
                <p className="flex items-center gap-2 text-[14px] font-semibold">
                  <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> KYC verified &amp; active
                </p>
                <p className="text-[12.5px] leading-snug">
                  Your {vars.bank} account is active with no pending KYC blocks. That SMS link was a phishing trap.
                </p>
              </div>
            ) : (
              <PhoneButton onClick={() => emit("check_kyc_status")}>Check KYC &amp; account status</PhoneButton>
            )}
          </PhoneBody>
        </>
      )}

      {tab === "report" && (
        <MockComplaintForm
          title="Block & report phishing SMS"
          intro="Blocking stops repeat phishing texts. Reporting the URL helps take fake bank sites down."
          details={[
            { label: "SMS Sender", value: payload.sender },
            { label: "Suspicious link", value: "bit.ly/kyc-9x2" },
          ]}
          reasons={["Fake KYC / Phishing link", "Impersonating my bank", "Spam"]}
          submitLabel={reported ? "Reported" : "Block sender & report phishing"}
          successText="Sender blocked and phishing SMS reported (sandbox)."
          onSubmit={() => emit("block_report_sms")}
          onBack={() => setTab("messages")}
        />
      )}

      <nav aria-label="Phone tabs" className="absolute inset-x-0 bottom-0 z-10 flex border-t border-[#e3eaf6] bg-white/95 px-1 pb-1 pt-1 lg:pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => (t.id === "bank" ? openBankTab() : setTab(t.id))}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors",
                active ? "text-accent-text" : "text-[#4f5f7a] hover:text-[#0b1b3a]",
              )}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {t.id === "bank" ? vars.bank : t.label}
            </button>
          );
        })}
      </nav>
      {snack}
    </>
  );
}
