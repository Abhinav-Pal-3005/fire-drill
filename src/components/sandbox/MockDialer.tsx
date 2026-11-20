import { useState } from "react";
import { Phone, PhoneIncoming, PhoneOff, ShieldAlert, Video } from "lucide-react";
import type { RedFlag, SemanticIntent } from "@/types";
import { PhoneBody, PhoneButton, PhoneHeader, PhoneRow } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";
import type { WidgetActionHandler } from "./scenes/sceneTypes";

export interface DialerContact {
  id: string;
  name: string;
  subtitle: string;
  /** Called the moment the call starts. */
  onCall: () => void;
}

export interface IncomingCallConfig {
  callerName: string;
  maskedPhone?: string;
  agency?: string;
  channel?: string;
  isVideo?: boolean;
  transcript?: string;
  redFlags?: RedFlag[];
  redFlagPhrases?: string[];
  found?: string[];
  onFlag?: (flagId: string) => void;
  onMiss?: () => void;
  highlightHints?: boolean;
  extraActions?: Array<{
    label: string;
    intent: SemanticIntent;
    variant?: "primary" | "secondary" | "danger";
  }>;
}

interface MockDialerProps {
  title: string;
  contacts?: DialerContact[];
  incomingCall?: IncomingCallConfig;
  onAction?: WidgetActionHandler;
  onBack?: () => void;
}

/** Contact list or incoming call simulation screen. Nothing is dialled for real. */
export function MockDialer({ title, contacts = [], incomingCall, onAction, onBack }: MockDialerProps) {
  const [calling, setCalling] = useState<DialerContact | null>(null);

  if (incomingCall) {
    const {
      callerName,
      maskedPhone,
      agency,
      channel = incomingCall.isVideo ? "Video Call" : "Voice Call",
      isVideo = false,
      transcript,
      redFlags = [],
      redFlagPhrases,
      found = [],
      onFlag,
      onMiss,
      highlightHints = false,
      extraActions = [],
    } = incomingCall;

    return (
      <>
        <div className="absolute inset-x-0 top-0 z-10">
          <PhoneHeader title={title} subtitle={channel} onBack={onBack} />
        </div>
        <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
          <div className="rounded-[20px] bg-gradient-to-b from-[#0b1b3a] to-[#1b3566] p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {agency && (
                  <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                    <ShieldAlert size={12} strokeWidth={2} aria-hidden />
                    {agency}
                  </p>
                )}
                <p className="mt-2 truncate text-[18px] font-bold leading-snug">{callerName}</p>
                {maskedPhone && <p className="tnum text-[12.5px] text-white/80">{maskedPhone}</p>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ff3b30] px-2.5 py-1 text-[11px] font-bold text-white">
                {isVideo ? <Video size={13} strokeWidth={2} aria-hidden /> : <PhoneIncoming size={13} strokeWidth={2} aria-hidden />}
                {isVideo ? "Video" : "Incoming"}
              </span>
            </div>
          </div>

          {transcript && (
            <article className="rounded-[20px] bg-white p-3.5 text-[14px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
              <p className="mb-1.5 text-[12px] font-semibold text-[#4f5f7a]">
                Caller statement · tap suspicious words
              </p>
              {onFlag && onMiss ? (
                <RedFlagText
                  text={transcript}
                  flags={redFlags}
                  phrases={redFlagPhrases}
                  found={found}
                  onFlag={onFlag}
                  onMiss={onMiss}
                  highlightHints={highlightHints}
                />
              ) : (
                <p className="leading-relaxed">{transcript}</p>
              )}
            </article>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <PhoneButton
              variant="danger"
              onClick={() => onAction?.("HANG_UP_CALL", { callerName, label: "Hang up and block caller" })}
              icon={<PhoneOff size={17} strokeWidth={2} />}
            >
              Hang up
            </PhoneButton>
            <PhoneButton
              variant="secondary"
              onClick={() => onAction?.("ANSWER_CALL", { callerName, label: "Stay on call / Comply" })}
              icon={<Phone size={17} strokeWidth={2} />}
            >
              Answer
            </PhoneButton>
          </div>

          {extraActions.length > 0 && (
            <div className="space-y-2 pt-1">
              {extraActions.map((act, idx) => (
                <PhoneButton
                  key={`${act.intent}-${idx}`}
                  variant={act.variant ?? "secondary"}
                  onClick={() => onAction?.(act.intent, { label: act.label })}
                >
                  {act.label}
                </PhoneButton>
              ))}
            </div>
          )}
        </PhoneBody>
      </>
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
