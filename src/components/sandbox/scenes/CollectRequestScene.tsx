import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, ShieldCheck } from "lucide-react";
import { MockBalance } from "../MockBalance";
import { MockCollectRequestSheet } from "../MockCollectRequestSheet";
import { MockComplaintForm } from "../MockComplaintForm";
import { MockInbox } from "../MockInbox";
import { MockNotificationBanner } from "../MockNotificationBanner";
import { MockTransactionHistory, type MockTransaction } from "../MockTransactionHistory";
import { MockUPIHome } from "../MockUPIHome";
import { DistractorRows, PhoneRow, distractorTiles, useSnack } from "../phoneUi";
import type { SceneProps } from "./sceneTypes";

type Screen = "inbox" | "home" | "request" | "balance" | "report";

const DEFAULT_HISTORY: MockTransaction[] = [
  { id: "t1", title: "Campus canteen", subtitle: "Yesterday", amount: "120", direction: "debit" },
  { id: "t2", title: "Metro card top-up", subtitle: "2 days ago", amount: "300", direction: "debit" },
  { id: "t3", title: "Cashback", subtitle: "3 days ago", amount: "15", direction: "credit" },
];

function str(val: unknown, fallback: string): string {
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

/** Drill 1: a marketplace buyer sends a "receive money" collect request. */
export function CollectRequestScene({ drill, vars, stepProps, emit, tapFlag, flagsFound, doneKeys }: SceneProps) {
  const [screen, setScreen] = useState<Screen>("inbox");
  const [banner, setBanner] = useState(false);
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;
  const declined = doneKeys.has("decline_request");

  const appName = str(stepProps?.appName, vars.app || "PayWave");
  const requesterName = str(stepProps?.scammerName ?? stepProps?.name, vars.name || vars.scammerName || "Buyer");
  const upiId = str(stepProps?.scammerVpa ?? stepProps?.upiId, payload.senderId || vars.upiId || vars.scammerVpa || "buyer@upi");
  const amount = str(stepProps?.amount, vars.amount || "4,500");
  const balance = str(stepProps?.balance, vars.balance || "24,500");
  const note = str(stepProps?.note, payload.note || `Payment to receive ₹${amount}`);
  const sender = str(stepProps?.sender, payload.sender || requesterName);
  const body = str(stepProps?.body, payload.body || "");
  const channel = str(stepProps?.channel, payload.channel || "Marketplace chat");
  const time = str(stepProps?.time, payload.time || vars.time || "now");
  const history = Array.isArray(stepProps?.transactions) ? (stepProps.transactions as MockTransaction[]) : DEFAULT_HISTORY;

  useEffect(() => {
    const id = window.setTimeout(() => setBanner(true), 1400);
    return () => window.clearTimeout(id);
  }, []);

  const openApp = () => {
    emit("open_app");
    setBanner(false);
    setScreen("home");
  };

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    show("Done in the sandbox. Nothing real happened.");
  };

  const home = (
    <MockUPIHome
      appName={appName}
      onCheckBalance={() => {
        emit("check_balance");
        setScreen("balance");
      }}
      tiles={[
        { id: "security", label: "Security and help", icon: ShieldCheck, onClick: () => setScreen("report") },
        ...distractorTiles(drill, "upi_home", wrongTap),
      ]}
    >
      {declined ? (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
          <CheckCircle2 size={18} strokeWidth={2} aria-hidden /> Request declined.
        </p>
      ) : (
        <PhoneRow
          icon={Banknote}
          tone="alert"
          title={`Collect request: ₹${amount}`}
          subtitle={`${requesterName} · tap to review`}
          onClick={() => {
            emit("view_request");
            setScreen("request");
          }}
        />
      )}
    </MockUPIHome>
  );

  return (
    <>
      {screen === "inbox" && (
        <>
          <MockInbox
            title="Messages"
            messages={[{ id: "m1", sender, time, body, channel }]}
            redFlags={drill.redFlags}
            found={flagsFound}
            onFlag={tapFlag}
            onMiss={() => tapFlag(null)}
          >
            <DistractorRows drill={drill} screen="inbox" onTap={wrongTap} />
          </MockInbox>
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-[#e3eaf6] bg-white/95 px-4 py-2.5">
            <p className="text-[12px] text-[#4f5f7a]">Apps</p>
            <button
              type="button"
              onClick={openApp}
              aria-label={`Open ${appName}`}
              className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#eaf3ff] px-3 text-[14px] font-semibold text-accent-text hover:bg-[#dbe9ff]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white">
                <Banknote size={17} strokeWidth={1.75} />
              </span>
              {appName}
            </button>
          </div>
          <MockNotificationBanner
            visible={banner}
            appName={appName}
            title={`${requesterName} requested ₹${amount}`}
            body="Tap to open and review the request."
            onTap={openApp}
          />
        </>
      )}

      {(screen === "home" || screen === "request") && home}

      {screen === "request" && (
        <MockCollectRequestSheet
          name={requesterName}
          upiId={upiId}
          amount={amount}
          note={note}
          onClose={() => setScreen("home")}
          onApprove={() => emit("approve_request")}
          onDecline={() => {
            emit("decline_request");
            setScreen("home");
          }}
        />
      )}

      {screen === "balance" && (
        <MockBalance
          balance={balance}
          note={declined ? `No debit found for the ₹${amount} request. Your balance is unchanged.` : undefined}
          onBack={() => setScreen("home")}
        >
          <MockTransactionHistory items={history} />
        </MockBalance>
      )}

      {screen === "report" && (
        <MockComplaintForm
          title="Block and report"
          intro="Blocking stops further requests from this UPI ID. Reporting helps protect other people."
          details={[
            { label: "UPI ID", value: upiId },
            { label: "Name shown", value: requesterName },
          ]}
          reasons={["Scam or fraud attempt", "Spam or unwanted requests", "Other"]}
          submitLabel="Block and report"
          successText="Blocked and reported (sandbox)."
          onSubmit={() => emit("block_report")}
          onBack={() => setScreen("home")}
        />
      )}
      {snack}
    </>
  );
}
