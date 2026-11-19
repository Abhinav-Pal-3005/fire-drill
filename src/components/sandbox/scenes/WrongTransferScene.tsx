import { useState } from "react";
import { CheckCircle2, Copy, FileWarning, Landmark, MessageCircleOff, Scale, TriangleAlert, type LucideIcon } from "lucide-react";
import { MockComplaintForm } from "../MockComplaintForm";
import { MockDialer } from "../MockDialer";
import { PhoneBody, PhoneButton, PhoneHeader, PhoneRow, PhoneSection, useSnack } from "../phoneUi";
import { RedFlagText } from "../RedFlagText";
import type { SceneProps } from "./sceneTypes";

type Screen = "receipt" | "complaint" | "bank" | "dispute";

interface ActionRow {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClick: () => void;
  doneKey?: string;
}

/** Drill 3: money went to a stranger who now pressures you. */
export function WrongTransferScene({ drill, vars, emit, tapFlag, flagsFound, doneKeys }: SceneProps) {
  const [screen, setScreen] = useState<Screen>("receipt");
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    if (key !== "pay_release_fee") show("Done in the sandbox. Nothing real happened.");
  };

  const distractor = (key: string): ActionRow | null => {
    const d = drill.distractors.find((x) => x.actionKey === key);
    if (!d) return null;
    return {
      id: d.id,
      title: d.label,
      icon: key === "delete_chat" ? MessageCircleOff : key === "pay_release_fee" ? Landmark : FileWarning,
      onClick: () => wrongTap(d.actionKey, d.label),
    };
  };

  // Mixed order so correct and wrong options are not grouped.
  const rows: ActionRow[] = [
    distractor("send_pleading"),
    {
      id: "note",
      title: "Save the transaction ID and a screenshot",
      icon: Copy,
      onClick: () => emit("note_txn_id"),
      doneKey: "note_txn_id",
    },
    {
      id: "complaint",
      title: `Raise a complaint in ${vars.app}`,
      icon: FileWarning,
      onClick: () => setScreen("complaint"),
    },
    {
      id: "skip",
      title: "Not now. Do not contact them.",
      icon: MessageCircleOff,
      onClick: () => emit("skip_pleading"),
      doneKey: "skip_pleading",
    },
    { id: "bank", title: `Contact ${vars.bank}`, icon: Landmark, onClick: () => setScreen("bank") },
    distractor("pay_release_fee"),
    { id: "dispute", title: "Dispute help", icon: Scale, onClick: () => setScreen("dispute") },
    distractor("delete_chat"),
  ].filter((r): r is ActionRow => r !== null);

  if (screen === "complaint") {
    return (
      <>
        <MockComplaintForm
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
          onSubmit={() => emit("raise_complaint")}
          onBack={() => setScreen("receipt")}
        />
        {snack}
      </>
    );
  }

  if (screen === "bank") {
    return (
      <MockDialer
        title="Contact your bank"
        onBack={() => setScreen("receipt")}
        contacts={[
          {
            id: "bank-line",
            name: `${vars.bank} 24×7 helpline`,
            subtitle: "Official bank helpline",
            onCall: () => emit("contact_bank"),
          },
        ]}
      />
    );
  }

  if (screen === "dispute") {
    const done = doneKeys.has("escalate_npci");
    return (
      <>
        <div className="absolute inset-x-0 top-0 z-10">
          <PhoneHeader title="Dispute help" onBack={() => setScreen("receipt")} />
        </div>
        <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
          <p className="rounded-[20px] bg-white p-3.5 text-[13.5px] leading-snug text-[#33415c] ring-1 ring-[#e3eaf6]">
            If your payment app and your bank do not resolve the problem, you can escalate. NPCI has a dispute
            redressal process. Check the current steps on official channels.
          </p>
          {done ? (
            <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
              <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Escalation noted (sandbox).
            </p>
          ) : (
            <PhoneButton onClick={() => emit("escalate_npci")}>Escalate through the NPCI dispute process</PhoneButton>
          )}
        </PhoneBody>
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Payment sent" subtitle={vars.app} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <div className="rounded-[20px] bg-white p-4 text-center ring-1 ring-[#e3eaf6]">
          <p className="tnum text-[30px] font-bold tracking-tight text-[#0b1b3a]">₹{vars.amount}</p>
          <p className="mt-0.5 text-[13px] text-[#4f5f7a]">sent to {payload.senderId}</p>
          <p className="tnum mt-2 text-[12px] text-[#4f5f7a]">Transaction ID {payload.txnId}</p>
        </div>

        <p className="flex items-start gap-2 rounded-2xl bg-[#fff4e0] p-3 text-[13px] font-medium text-[#8f4b00]">
          <TriangleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
          {payload.alert}. This is not the person you meant to pay.
        </p>

        <article className="rounded-[20px] bg-white p-3.5 text-[14px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
          <p className="mb-1.5 text-[12px] font-semibold text-[#4f5f7a]">
            {payload.sender} · {payload.time}
          </p>
          <RedFlagText
            text={payload.body}
            flags={drill.redFlags}
            found={flagsFound}
            onFlag={tapFlag}
            onMiss={() => tapFlag(null)}
          />
        </article>

        <PhoneSection title="What would you like to do?">
          <div className="space-y-2">
            {rows.map((r) => (
              <PhoneRow
                key={r.id}
                icon={r.icon}
                title={r.title}
                onClick={r.onClick}
                trailing={
                  r.doneKey && doneKeys.has(r.doneKey) ? (
                    <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-[#1e7b34]" aria-label="Done" />
                  ) : undefined
                }
              />
            ))}
          </div>
        </PhoneSection>
      </PhoneBody>
      {snack}
    </>
  );
}
