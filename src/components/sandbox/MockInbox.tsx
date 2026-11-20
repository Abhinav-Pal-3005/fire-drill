import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import type { RedFlag, SemanticIntent } from "@/types";
import { PhoneBody, PhoneButton, PhoneHeader } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";
import type { WidgetActionHandler } from "./scenes/sceneTypes";

export interface InboxMessage {
  id: string;
  sender: string;
  time: string;
  body: string;
  channel?: string;
}

export interface InboxActionItem {
  label: string;
  intent: SemanticIntent;
  variant?: "primary" | "secondary" | "danger";
}

interface MockInboxProps {
  title: string;
  subtitle?: string;
  messages: InboxMessage[];
  redFlags: RedFlag[];
  redFlagPhrases?: string[];
  highlightHints?: boolean;
  found: string[];
  onFlag: (flagId: string) => void;
  onMiss: () => void;
  onBack?: () => void;
  actions?: InboxActionItem[];
  onAction?: WidgetActionHandler;
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
  highlightHints = false,
  found,
  onFlag,
  onMiss,
  onBack,
  actions,
  onAction,
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
                  highlightHints={highlightHints}
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
              highlightHints={highlightHints}
              found={found}
              onFlag={onFlag}
              onMiss={onMiss}
            />
          </article>
        ))}
        {actions && actions.length > 0 && onAction && (
          <div className="space-y-2 pt-1">
            {actions.map((action, idx) => (
              <PhoneButton
                key={`${action.intent}-${idx}`}
                variant={action.variant ?? "secondary"}
                onClick={() => onAction(action.intent, { label: action.label })}
              >
                {action.label}
              </PhoneButton>
            ))}
          </div>
        )}
        {children}
      </PhoneBody>
    </>
  );
}
