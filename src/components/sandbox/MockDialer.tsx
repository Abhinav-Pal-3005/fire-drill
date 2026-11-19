import { useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { PhoneBody, PhoneButton, PhoneHeader, PhoneRow } from "./phoneUi";

export interface DialerContact {
  id: string;
  name: string;
  subtitle: string;
  /** Called the moment the call starts. */
  onCall: () => void;
}

interface MockDialerProps {
  title: string;
  contacts: DialerContact[];
  onBack?: () => void;
}

/** Contact list that "calls" when tapped. Nothing is dialled for real. */
export function MockDialer({ title, contacts, onBack }: MockDialerProps) {
  const [calling, setCalling] = useState<DialerContact | null>(null);

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
