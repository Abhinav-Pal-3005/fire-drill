import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import type { RedFlag } from "@/types";
import { PhoneBody, PhoneHeader } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";

export interface InboxMessage {
  id: string;
  sender: string;
  time: string;
  body: string;
  channel?: string;
}

interface MockInboxProps {
  title: string;
  subtitle?: string;
  messages: InboxMessage[];
  redFlags: RedFlag[];
  redFlagPhrases?: string[];
  found: string[];
  onFlag: (flagId: string) => void;
  onMiss: () => void;
  onBack?: () => void;
  /** Extra controls rendered under the messages (quick replies, actions). */
  children?: ReactNode;
}

/** Messages screen. Suspicious fragments inside sender lines and bodies are tappable. */
export function MockInbox({
  title,
  subtitle = "Tap anything that looks suspicious",
  messages,
  redFlags,
  redFlagPhrases,
  found,
  onFlag,
  onMiss,
  onBack,
  children,
}: MockInboxProps) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} subtitle={subtitle} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        {messages.map((m) => (
          <article key={m.id} className="rounded-[20px] bg-white p-3.5 text-[14px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
            <header className="mb-2 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-accent-text">
                <MessageCircle size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <RedFlagText
                  text={m.sender}
                  flags={redFlags}
                  phrases={redFlagPhrases}
                  found={found}
                  onFlag={onFlag}
                  onMiss={onMiss}
                  className="text-[13.5px] font-semibold"
                />
                <p className="text-[11.5px] text-[#4f5f7a]">
                  {m.channel ? `${m.channel} · ` : ""}
                  {m.time}
                </p>
              </div>
            </header>
            <RedFlagText
              text={m.body}
              flags={redFlags}
              phrases={redFlagPhrases}
              found={found}
              onFlag={onFlag}
              onMiss={onMiss}
            />
          </article>
        ))}
        {children}
      </PhoneBody>
    </>
  );
}
