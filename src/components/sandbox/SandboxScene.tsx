import { AnimatePresence } from "framer-motion";
import { Smartphone } from "lucide-react";
import { EmptyState } from "@/components/glass/EmptyState";
import type { DrillRunner } from "@/features/drills/useDrillRunner";
import type { Drill } from "@/types";
import { MockPinPad } from "./MockPinPad";
import { CollectRequestScene } from "./scenes/CollectRequestScene";
import { DigitalArrestScene } from "./scenes/DigitalArrestScene";
import { LoanOfferScene } from "./scenes/LoanOfferScene";
import { LostPhoneScene } from "./scenes/LostPhoneScene";
import { PhishingSmsScene } from "./scenes/PhishingSmsScene";
import { WrongTransferScene } from "./scenes/WrongTransferScene";

interface SandboxSceneProps {
  drill: Drill;
  vars: Record<string, string>;
  runner: DrillRunner;
}

/** Picks the mock phone scene from the drill's trigger type, and layers the fake PIN pad on top. */
export function SandboxScene({ drill, vars, runner }: SandboxSceneProps) {
  const props = {
    drill,
    vars,
    emit: runner.emit,
    tapFlag: runner.tapFlag,
    flagsFound: runner.run.flagsFound,
    doneKeys: runner.doneKeys,
  };

  let scene;
  switch (drill.trigger.type) {
    case "collect_request":
      scene = <CollectRequestScene {...props} />;
      break;
    case "lost_phone":
      scene = <LostPhoneScene {...props} />;
      break;
    case "balance_alert":
      scene = <WrongTransferScene {...props} />;
      break;
    case "loan_offer":
      scene = <LoanOfferScene {...props} />;
      break;
    case "sms":
      scene = <PhishingSmsScene {...props} />;
      break;
    case "digital_arrest":
      scene = <DigitalArrestScene {...props} />;
      break;
    default:
      scene = (
        <EmptyState
          icon={Smartphone}
          title="No sandbox scene yet"
          description={`The "${drill.trigger.type}" trigger does not have a mock phone scene in v1.`}
        />
      );
  }

  return (
    <>
      {scene}
      <AnimatePresence>
        {runner.pinMode && (
          <MockPinPad key="pin" mode={runner.pinMode} onComplete={runner.completePin} onCancel={runner.cancelPin} />
        )}
      </AnimatePresence>
    </>
  );
}
