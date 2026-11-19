import { useState } from "react";
import { ShieldQuestion } from "lucide-react";
import { MockInbox } from "../MockInbox";
import { MockInterestCalculator } from "../MockInterestCalculator";
import { MockLenderCheck } from "../MockLenderCheck";
import { MockLoanOffer } from "../MockLoanOffer";
import { DistractorRows, PhoneButton, PhoneRow, PhoneSection, useSnack } from "../phoneUi";
import type { SceneProps } from "./sceneTypes";

type Screen = "sms" | "offer" | "lender";

/** Drill 4: an instant-loan SMS with red flags, a calculator and a lender check. */
export function LoanOfferScene({ drill, vars, emit, tapFlag, flagsFound, doneKeys }: SceneProps) {
  const [screen, setScreen] = useState<Screen>("sms");
  const [contacts, setContacts] = useState(true);
  const [gallery, setGallery] = useState(true);
  const { snack, show } = useSnack();
  const payload = drill.trigger.payloadTemplate;
  const principal = Number(vars.amount.replace(/,/g, "")) || 10000;
  const declined = doneKeys.has("decline_revoke");

  const wrongTap = (key: string, label: string) => {
    emit(key, label);
    if (key !== "accept_offer") show("Done in the sandbox. Nothing real happened.");
  };

  if (screen === "lender") {
    return (
      <MockLenderCheck lender={vars.lender} onChecked={() => emit("check_lender")} onBack={() => setScreen("offer")} />
    );
  }

  if (screen === "offer") {
    return (
      <>
        <MockLoanOffer lender={vars.lender} amount={vars.amount} onBack={() => setScreen("sms")}>
          <MockInterestCalculator principal={principal} onCalculate={() => emit("use_calculator")} />

          <PhoneSection title="Before you decide">
            <PhoneRow
              icon={ShieldQuestion}
              title="Check the lender's registration"
              subtitle="Practice lookup"
              onClick={() => setScreen("lender")}
            />
          </PhoneSection>

          <PhoneSection title="Offer actions">
            <DistractorRows drill={drill} screen="offer" onTap={wrongTap} />
          </PhoneSection>

          <PhoneSection title="Permissions requested">
            <div className="space-y-2 rounded-[20px] bg-white p-3.5 ring-1 ring-[#e3eaf6]">
              <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px] text-[#0b1b3a]">
                Contacts access
                <input type="checkbox" checked={contacts} onChange={(e) => setContacts(e.target.checked)} className="h-5 w-5 accent-[#007aff]" />
              </label>
              <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px] text-[#0b1b3a]">
                Gallery access
                <input type="checkbox" checked={gallery} onChange={(e) => setGallery(e.target.checked)} className="h-5 w-5 accent-[#007aff]" />
              </label>
            </div>
          </PhoneSection>

          {declined ? (
            <p role="status" className="rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
              Offer declined and permissions revoked (sandbox).
            </p>
          ) : (
            <PhoneButton
              variant="secondary"
              onClick={() => {
                setContacts(false);
                setGallery(false);
                emit("decline_revoke");
              }}
            >
              Decline offer and revoke permissions
            </PhoneButton>
          )}
        </MockLoanOffer>
        {snack}
      </>
    );
  }

  return (
    <MockInbox
      title="Messages"
      messages={[{ id: "m1", sender: payload.sender, time: payload.time, body: payload.body }]}
      redFlags={drill.redFlags}
      found={flagsFound}
      onFlag={tapFlag}
      onMiss={() => tapFlag(null)}
    >
      <PhoneButton
        onClick={() => {
          emit("open_offer");
          setScreen("offer");
        }}
      >
        Open the offer
      </PhoneButton>
    </MockInbox>
  );
}
