import type { ReactNode } from "react";
import { Wallet } from "lucide-react";
import { PhoneBody, PhoneButton, type HomeTile } from "./phoneUi";

interface MockUPIHomeProps {
  appName: string;
  tiles: HomeTile[];
  /** Pending cards (e.g. a collect request) shown above the tiles. */
  children?: ReactNode;
  onCheckBalance?: () => void;
}

/** Home screen of the fictional payment app (clean blue and white). */
export function MockUPIHome({ appName, tiles, children, onCheckBalance }: MockUPIHomeProps) {
  return (
    <PhoneBody>
      <div className="bg-gradient-to-b from-[#0a58d6] to-[#2b7fff] px-4 pb-6 pt-4 text-white">
        <div className="flex items-center justify-between">
          <p className="text-[19px] font-bold tracking-tight">{appName}</p>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-[13px] font-bold" aria-hidden>
            You
          </span>
        </div>
        <p className="mt-3 text-[13px] text-white/90">Practice account · no real money</p>
      </div>

      <div className="-mt-4 space-y-4 px-3 pb-24">
        {onCheckBalance && (
          <div className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 ring-1 ring-[#e3eaf6]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf3ff] text-accent-text">
              <Wallet size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#0b1b3a]">Account balance</p>
              <p className="text-[12.5px] text-[#4f5f7a]">Tap to view balance and history</p>
            </div>
            <PhoneButton full={false} variant="secondary" onClick={onCheckBalance} className="min-h-[44px]">
              View
            </PhoneButton>
          </div>
        )}
        {children}
        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={t.onClick}
                className="flex min-h-[88px] flex-col items-start justify-between gap-2 rounded-[20px] bg-white p-3 text-left ring-1 ring-[#e3eaf6] transition-colors hover:bg-[#f7faff] active:bg-[#eaf3ff]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3ff] text-accent-text">
                  <Icon size={19} strokeWidth={1.75} />
                </span>
                <span className="text-[13.5px] font-semibold leading-snug text-[#0b1b3a]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </PhoneBody>
  );
}
