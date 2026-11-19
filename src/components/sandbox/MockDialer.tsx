import { useState, type ReactNode } from "react";
import { Phone, PhoneCall, PhoneOff, ShieldAlert, Video } from "lucide-react";
import type { RedFlag } from "@/types";
import { PhoneBody, PhoneButton, PhoneHeader, PhoneRow } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";

export interface DialerContact {
  id: string;
  name: string;
  subtitle: string;
  /** Called the moment the call starts. */
  onCall: () => void;
}

export interface IncomingCallConfig {
  callerName: string;
  callerNumber?: string;
  agency?: string;
  channel?: string;
  badge?: string;
  transcript: string;
  isVideo?: boolean;
  redFlags?: RedFlag[];
  redFlagPhrases?: string[];
  found?: string[];
  onFlag?: (flagId: string) => void;
  onMiss?: () => void;
  onHangUp: () => void;
  onAnswer?: () => void;
  extraActions?: ReactNode;
}

interface MockDialerProps {
  title: string;
  contacts?: DialerContact[];
  incomingCall?: IncomingCallConfig;
  onBack?: () => void;
}

/** Contact dialer & incoming/live scam call screen. Nothing is dialled for real. */
export function MockDialer({ title, contacts = [], incomingCall, onBack }: MockDialerProps) {
  const [calling, setCalling] = useState<DialerContact | null>(null);

  if (incomingCall) {
    const initials = incomingCall.callerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <PhoneBody className="z-20 flex flex-col justify-between bg-gradient-to-b from-[#0b1b3a] via-[#13294f] to-[#0b1b3a] p-4 pb-6 text-white">
        <div className="space-y-2.5 pt-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[11px] font-extrabold text-amber-200">
            {incomingCall.isVideo ? <Video size={12} strokeWidth={2.2} aria-hidden /> : <PhoneCall size={12} strokeWidth={2.2} aria-hidden />}
            {incomingCall.badge ?? incomingCall.channel ?? "Incoming Voice Call"}
          </span>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base font-extrabold text-sky-200">
            {initials || "ID"}
          </div>

          <div>
            <h2 className="text-[18px] font-extrabold leading-tight tracking-tight">{incomingCall.callerName}</h2>
            {incomingCall.agency && <p className="mt-0.5 text-[12px] font-semibold text-sky-200">{incomingCall.agency}</p>}
            {incomingCall.callerNumber && (
              <p className="tnum mt-0.5 text-[11.5px] text-white/70">{incomingCall.callerNumber}</p>
            )}
          </div>
        </div>

        <div className="my-3 space-y-2.5">
          <div className="space-y-1.5 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-left text-[#0b1b3a] shadow-sm">
            <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-blue-700">
              <ShieldAlert size={12} strokeWidth={2.2} aria-hidden />
              Caller transcript · tap suspicious phrases
            </p>
            <RedFlagText
              text={incomingCall.transcript}
              flags={incomingCall.redFlags}
              phrases={incomingCall.redFlagPhrases}
              found={incomingCall.found}
              onFlag={incomingCall.onFlag}
              onMiss={incomingCall.onMiss}
              className="text-[13px] font-medium text-[#0b1b3a]"
            />
          </div>

          <div className="space-y-2">
            <PhoneButton
              variant="danger"
              onClick={incomingCall.onHangUp}
              icon={<PhoneOff size={17} strokeWidth={2} aria-hidden />}
            >
              Hang up &amp; disconnect
            </PhoneButton>
            {incomingCall.onAnswer && (
              <PhoneButton
                variant="secondary"
                onClick={incomingCall.onAnswer}
                icon={<Phone size={17} strokeWidth={2} aria-hidden />}
              >
                Stay on call &amp; comply
              </PhoneButton>
            )}
            {incomingCall.extraActions}
          </div>
        </div>
      </PhoneBody>
    );
  }

  if (calling) {
    return (
      <PhoneBody className="z-20 flex flex-col items-center justify-between bg-gradient-to-b from-[#0b1b3a] to-[#1b3566] p-6 text-white">
        <div className="mt-10 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15">
            <Phone size={34} strokeWidth={1.5} />
          </span>
          <p className="mt-5 text-[22px] font-bold">{calling.name}</p>
          <p className="mt-1 text-[14px] text-white/80" role="status">
            Calling (practice call)…
          </p>
        </div>
        <PhoneButton variant="danger" onClick={() => setCalling(null)} icon={<PhoneOff size={18} strokeWidth={1.75} />}>
          End call
        </PhoneButton>
      </PhoneBody>
    );
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} subtitle="Practice calls only" onBack={onBack} />
      </div>
      <PhoneBody className="space-y-2 px-3 pb-24 pt-[68px]">
        {contacts.map((c) => (
          <PhoneRow
            key={c.id}
            icon={Phone}
            title={c.name}
            subtitle={c.subtitle}
            onClick={() => {
              setCalling(c);
              c.onCall();
            }}
          />
        ))}
      </PhoneBody>
    </>
  );
}
