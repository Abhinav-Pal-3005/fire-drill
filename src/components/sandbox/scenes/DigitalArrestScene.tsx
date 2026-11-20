import { useState } from "react";
import { CheckCircle2, Flag, Phone, PhoneOff, ShieldCheck, Users, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { DistractorRows, PhoneBody, PhoneButton, PhoneHeader, PhoneRow, PhoneSection, useSnack } from "../phoneUi";
import { RedFlagText } from "../RedFlagText";
import type { SceneProps } from "./sceneTypes";

type Tab = "call" | "verify" | "report";

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "call", label: "Video Call", icon: Video },
  { id: "verify", label: "Verify", icon: Users },
  { id: "report", label: "Report", icon: Flag },
];

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

/** Drill: fake authority / digital arrest video call intimidation. */
export function DigitalArrestScene({
  drill,
  vars,
  emit,
  tapFlag,
  flagsFound,
  doneKeys,
  stepProps,
  onAction,
}: SceneProps) {
  const [tab, setTab] = useState<Tab>("call");
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;

  const callerSender = str(stepProps?.callerName, payload.sender || vars.callerAgency || "Unknown caller");
  const channelLabel = str(stepProps?.channel, payload.channel || "Video Call");
  const statementBody = str(stepProps?.transcript, payload.body || "");
  const amount = str(stepProps?.amount, vars.amount || "0");

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    if (key !== "pay_verification_fee") show("Done in the sandbox. Nothing real happened.");
  };

  const callEnded = doneKeys.has("end_fake_call") || doneKeys.has("HANG_UP_CALL");
  const verified = doneKeys.has("talk_trusted_verify") || doneKeys.has("VERIFY_LENDER");
  const reported = doneKeys.has("report_digital_arrest") || doneKeys.has("FILE_1930_REPORT");

  return (
    <>
      {tab === "call" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title={callEnded ? "Call ended" : "Incoming video call"} subtitle={channelLabel} />
          </div>
          <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
            <div className="rounded-[20px] bg-[#0b1b3a] p-4 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold">{callerSender}</p>
                  <p className="text-[11.5px] text-white/75">{callEnded ? "Disconnected" : "Live call · Fake uniform backdrop"}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", callEnded ? "bg-white/15" : "bg-[#ff3b30]")}>
                  {callEnded ? "Ended" : "Live"}
                </span>
              </div>
            </div>

            <article className="rounded-[20px] bg-white p-3.5 text-[14px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
              <p className="mb-1.5 text-[12px] font-semibold text-[#4f5f7a]">
                Caller statement · tap suspicious words
              </p>
              <RedFlagText
                text={statementBody}
                flags={drill.redFlags}
                found={flagsFound}
                onFlag={tapFlag}
                onMiss={() => tapFlag(null)}
              />
            </article>

            {callEnded ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Call ended and caller blocked.
              </p>
            ) : (
              <PhoneButton
                variant="danger"
                onClick={() => {
                  emit("end_fake_call");
                  onAction?.("HANG_UP_CALL", { callerName: callerSender });
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <PhoneOff size={17} strokeWidth={2} aria-hidden />
                  Hang up and block caller
                </span>
              </PhoneButton>
            )}

            <PhoneSection title="Other call options">
              <DistractorRows drill={drill} screen="call" onTap={wrongTap} />
            </PhoneSection>
          </PhoneBody>
        </>
      )}

      {tab === "verify" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title="Verify safely" subtitle="Break the isolation" />
          </div>
          <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
            <div className="rounded-[20px] bg-white p-4 text-[13.5px] leading-snug text-[#33415c] ring-1 ring-[#e3eaf6]">
              <p className="flex items-center gap-2 font-bold text-[#0b1b3a]">
                <ShieldCheck size={18} strokeWidth={2} className="text-accent-text" aria-hidden />
                No &ldquo;digital arrest&rdquo; exists in India
              </p>
              <p className="mt-1.5">
                Real police and agencies never ask you to stay isolated on a video call or transfer ₹{amount} for verification.
              </p>
            </div>
            {verified ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Spoke to family &amp; verified independently (sandbox).
              </p>
            ) : (
              <>
                <PhoneRow
                  icon={Users}
                  title="Call a family member or trusted friend"
                  subtitle="Share what happened immediately"
                  onClick={() => {
                    emit("talk_trusted_verify");
                    onAction?.("VERIFY_LENDER");
                  }}
                />
                <PhoneRow
                  icon={Phone}
                  title="Check official agency directory"
                  subtitle="Verify independently via official website"
                  onClick={() => {
                    emit("talk_trusted_verify");
                    onAction?.("VERIFY_LENDER");
                  }}
                />
              </>
            )}
          </PhoneBody>
        </>
      )}

      {tab === "report" && (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <PhoneHeader title="Report impersonation" subtitle="Practice only" />
          </div>
          <PhoneBody className="space-y-2.5 px-3 pb-24 pt-[68px]">
            <PhoneRow
              icon={Phone}
              title="Call 1930"
              subtitle="National cybercrime helpline"
              onClick={() => {
                emit("report_digital_arrest");
                onAction?.("FILE_1930_REPORT");
              }}
            />
            <PhoneRow
              icon={Flag}
              title="Report on cybercrime.gov.in"
              subtitle="Submit caller number & screenshot"
              onClick={() => {
                emit("report_digital_arrest");
                onAction?.("FILE_1930_REPORT");
              }}
            />
            {reported && (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Impersonation report logged (sandbox).
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
