import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  ExternalLink,
  Flag,
  History,
  KeyRound,
  Lock,
  PhoneOff,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/glass/EmptyState";
import type { DrillRunner } from "@/features/drills/useDrillRunner";
import { isComposableDrill } from "@/features/drills/stepValidator";
import { spring } from "@/theme/tokens";
import type { Drill, ScreenWidgetType, SemanticIntent } from "@/types";
import { MockBalance } from "./MockBalance";
import { MockCollectRequestSheet } from "./MockCollectRequestSheet";
import { MockComplaintForm } from "./MockComplaintForm";
import { MockDialer } from "./MockDialer";
import { MockInbox, type InboxMessage } from "./MockInbox";
import { MockInterestCalculator } from "./MockInterestCalculator";
import { MockLenderCheck } from "./MockLenderCheck";
import { MockLoanOffer } from "./MockLoanOffer";
import { MockNotificationBanner } from "./MockNotificationBanner";
import { MockPinPad } from "./MockPinPad";
import { MockTransactionHistory, type MockTransaction } from "./MockTransactionHistory";
import { MockUPIHome } from "./MockUPIHome";
import { PhoneBody, PhoneButton, PhoneHeader, PhoneRow, PhoneSection } from "./phoneUi";
import { CollectRequestScene } from "./scenes/CollectRequestScene";
import { DigitalArrestScene } from "./scenes/DigitalArrestScene";
import { LoanOfferScene } from "./scenes/LoanOfferScene";
import { LostPhoneScene } from "./scenes/LostPhoneScene";
import { PhishingSmsScene } from "./scenes/PhishingSmsScene";
import { WrongTransferScene } from "./scenes/WrongTransferScene";
import type { SceneProps, WidgetRenderProps } from "./scenes/sceneTypes";

export interface StepActionConfig {
  intent: SemanticIntent;
  label: string;
  subtitle?: string;
  variant?: "primary" | "secondary" | "danger";
}

function asString(val: unknown, fallback = ""): string {
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

function asActions(val: unknown): StepActionConfig[] {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (item): item is StepActionConfig =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as StepActionConfig).intent === "string" &&
      typeof (item as StepActionConfig).label === "string",
  );
}

function asTransactions(val: unknown, fallbackUtr?: string): MockTransaction[] {
  if (Array.isArray(val) && val.length > 0) {
    return val as MockTransaction[];
  }
  return [
    {
      id: "tx-1",
      title: "Metro Rail Recharge",
      subtitle: fallbackUtr ? `Yesterday · UTR ${fallbackUtr.slice(0, 8)}…` : "Yesterday",
      amount: "250",
      direction: "debit",
    },
    { id: "tx-2", title: "Grocery Mart UPI", subtitle: "2 days ago", amount: "480", direction: "debit" },
    { id: "tx-3", title: "Cashback Reward", subtitle: "4 days ago", amount: "25", direction: "credit" },
  ];
}

const DEFAULT_INTENT_LABELS: Record<SemanticIntent, string> = {
  DECLINE_REQUEST: "Decline request",
  HANG_UP_CALL: "Hang up & block caller",
  BLOCK_SENDER: "Block & report sender",
  VERIFY_LENDER: "Verify lender registration",
  CHECK_HISTORY: "Inspect transaction history",
  CHECK_BALANCE: "Confirm balance is safe",
  FILE_1930_REPORT: "File 1930 cybercrime report",
  FREEZE_UPI: "Freeze outbound UPI",
  IGNORE_MESSAGE: "Ignore & delete message",
  OPEN_UPI_APP: "Open official UPI app directly",
  ACCEPT_COLLECT: "Approve collect request",
  ENTER_UPI_PIN: "Enter UPI PIN",
  ANSWER_CALL: "Stay on call & comply",
  CLICK_EXTERNAL_LINK: "Open link in message",
  SHARE_OTP: "Share 6-digit OTP",
  INSTALL_APK: "Download & install .apk",
  APPROVE_LOAN: "Approve instant loan",
};

function iconForIntent(intent: SemanticIntent) {
  switch (intent) {
    case "OPEN_UPI_APP":
      return Banknote;
    case "CHECK_BALANCE":
      return Wallet;
    case "CHECK_HISTORY":
      return History;
    case "BLOCK_SENDER":
    case "FILE_1930_REPORT":
      return Flag;
    case "FREEZE_UPI":
      return Lock;
    case "HANG_UP_CALL":
      return PhoneOff;
    case "INSTALL_APK":
      return Download;
    case "CLICK_EXTERNAL_LINK":
      return ExternalLink;
    case "SHARE_OTP":
    case "ENTER_UPI_PIN":
      return KeyRound;
    case "VERIFY_LENDER":
      return ShieldCheck;
    default:
      return ShieldAlert;
  }
}

/** Builds declarative action buttons from explicit `step.props.actions` or falls back to valid+trap intents. */
function resolveStepActions(stepProps: Record<string, unknown>, validIntents: SemanticIntent[], trapIntents: Partial<Record<SemanticIntent, string>>): StepActionConfig[] {
  const configured = asActions(stepProps.actions);
  if (configured.length > 0) return configured;

  const built: StepActionConfig[] = [];
  for (const intent of validIntents) {
    built.push({ intent, label: DEFAULT_INTENT_LABELS[intent], variant: "primary" });
  }
  for (const intent of Object.keys(trapIntents) as SemanticIntent[]) {
    if (!built.some((a) => a.intent === intent)) {
      built.push({ intent, label: DEFAULT_INTENT_LABELS[intent], variant: "secondary" });
    }
  }
  return built;
}

/* ============================================================================
 * Composable OS Widget Registry
 * Maps every ScreenWidgetType to its corresponding Mock* mobile UI primitive.
 * ========================================================================== */

function SmsInboxWidget({ step, vars, redFlags, flagsFound, onAction, onFlag, onMiss }: WidgetRenderProps) {
  const p = step.props;
  const sender = asString(p.sender, vars.maskedPhone || vars.scammerName || "Unknown Sender");
  const time = asString(p.time, vars.time || "now");
  const channel = asString(p.channel, "SMS");
  const body = asString(p.body, "");
  const title = asString(p.title, "Messages");

  const messages: InboxMessage[] = Array.isArray(p.messages)
    ? (p.messages as InboxMessage[])
    : [{ id: `msg-${step.stepId}`, sender, time, channel, body }];

  const actions = resolveStepActions(p, step.validIntents, step.trapIntents);

  return (
    <MockInbox
      title={title}
      messages={messages}
      redFlags={redFlags}
      redFlagPhrases={step.redFlagPhrases}
      found={flagsFound}
      onFlag={onFlag}
      onMiss={onMiss}
    >
      <PhoneSection title="Choose your next move">
        <div className="space-y-2">
          {actions.map((act) => (
            <PhoneRow
              key={`${act.intent}-${act.label}`}
              icon={iconForIntent(act.intent)}
              title={act.label}
              subtitle={act.subtitle}
              onClick={() => onAction(act.intent, { label: act.label })}
            />
          ))}
        </div>
      </PhoneSection>
    </MockInbox>
  );
}

function IncomingCallWidget({ step, vars, redFlags, flagsFound, onAction, onFlag, onMiss }: WidgetRenderProps) {
  const p = step.props;
  const callerName = asString(p.callerName ?? p.sender, vars.scammerName || "Unknown Caller");
  const callerNumber = asString(p.callerNumber ?? p.maskedPhone, vars.maskedPhone || "+91-98XXX-0000");
  const agency = asString(p.agency ?? p.callerAgency, "");
  const channel = asString(p.channel, "Incoming Voice Call");
  const badge = asString(p.badge, channel);
  const transcript = asString(p.transcript ?? p.body, "");
  const isVideo = Boolean(p.isVideo);

  const actions = resolveStepActions(p, step.validIntents, step.trapIntents).filter(
    (a) => a.intent !== "HANG_UP_CALL" && a.intent !== "ANSWER_CALL",
  );
  const hasAnswerOption =
    step.validIntents.includes("ANSWER_CALL") ||
    Boolean(step.trapIntents.ANSWER_CALL) ||
    asActions(p.actions).some((a) => a.intent === "ANSWER_CALL");

  return (
    <MockDialer
      title={callerName}
      incomingCall={{
        callerName,
        callerNumber,
        agency: agency || undefined,
        channel,
        badge,
        transcript,
        isVideo,
        redFlags,
        redFlagPhrases: step.redFlagPhrases,
        found: flagsFound,
        onFlag,
        onMiss,
        onHangUp: () => onAction("HANG_UP_CALL", { label: "Hung up suspicious call" }),
        onAnswer: hasAnswerOption
          ? () => onAction("ANSWER_CALL", { label: "Stayed on call & complied" })
          : undefined,
        extraActions:
          actions.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {actions.map((act) => (
                <button
                  key={`${act.intent}-${act.label}`}
                  type="button"
                  onClick={() => onAction(act.intent, { label: act.label })}
                  className="min-h-[42px] w-full cursor-pointer rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-white/20"
                >
                  {act.label}
                </button>
              ))}
            </div>
          ) : undefined,
      }}
    />
  );
}

function UpiHomeWidget({ step, vars, onAction }: WidgetRenderProps) {
  const p = step.props;
  const appName = asString(p.appName, vars.app || "PayWave");
  const pendingTitle = asString(p.pendingTitle, "");
  const pendingSubtitle = asString(p.pendingSubtitle, "");
  const actions = resolveStepActions(p, step.validIntents, step.trapIntents);

  return (
    <MockUPIHome
      appName={appName}
      onCheckBalance={() => onAction("CHECK_BALANCE", { label: "Checked account balance" })}
      tiles={actions
        .filter((a) => a.intent !== "CHECK_BALANCE")
        .map((act, idx) => ({
          id: `${act.intent}-${idx}`,
          label: act.label,
          icon: iconForIntent(act.intent),
          onClick: () => onAction(act.intent, { label: act.label }),
        }))}
    >
      {pendingTitle && (
        <PhoneRow
          icon={Banknote}
          tone="alert"
          title={pendingTitle}
          subtitle={pendingSubtitle || "Tap to inspect safely"}
          onClick={() =>
            onAction(
              step.trapIntents.ACCEPT_COLLECT ? "ACCEPT_COLLECT" : step.validIntents[0] ?? "CHECK_HISTORY",
              { label: pendingTitle },
            )
          }
        />
      )}
    </MockUPIHome>
  );
}

function CollectSheetWidget({ step, vars, redFlags, flagsFound, onAction, onFlag, onMiss }: WidgetRenderProps) {
  const p = step.props;
  const appName = asString(p.appName, vars.app || "PayWave");
  const name = asString(p.scammerName ?? p.name, vars.scammerName || vars.name || "Unknown Requester");
  const upiId = asString(p.scammerVpa ?? p.upiId, vars.scammerVpa || vars.upiId || "requester@upi");
  const amount = asString(p.amount, vars.amount || "4,500");
  const note = asString(p.note, `Request to pay ₹${amount}`);
  const bankName = asString(p.bankName, vars.bankName || vars.bank || "Your Bank");
  const warningBanner = asString(
    p.warningBanner,
    `Transaction direction: DEBIT. Approving sends ₹${amount} OUT of ${bankName}.`,
  );

  return (
    <>
      <MockUPIHome appName={appName} tiles={[]} />
      <MockCollectRequestSheet
        name={name}
        upiId={upiId}
        amount={amount}
        note={note}
        bankName={bankName}
        warningBanner={warningBanner}
        redFlags={redFlags}
        redFlagPhrases={step.redFlagPhrases}
        found={flagsFound}
        onFlag={onFlag}
        onMiss={onMiss}
        onAction={onAction}
        onClose={() => onAction("DECLINE_REQUEST", { label: "Closed & declined collect request" })}
      />
    </>
  );
}

function PinPadWidget({ step, onAction }: WidgetRenderProps) {
  const mode = step.props.mode === "otp" ? "otp" : "pin";
  const trapIntent: SemanticIntent = mode === "otp" ? "SHARE_OTP" : "ENTER_UPI_PIN";
  const safeIntent: SemanticIntent = step.validIntents[0] ?? "DECLINE_REQUEST";

  return (
    <MockPinPad
      mode={mode}
      onComplete={() => onAction(trapIntent, { label: mode === "otp" ? "Entered OTP on trap screen" : "Entered UPI PIN on trap screen" })}
      onCancel={() => onAction(safeIntent, { label: "Backed out safely before entering PIN/OTP" })}
    />
  );
}

function BalanceViewWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const p = step.props;
  const balance = asString(p.balance, vars.balance || "28,500");
  const note = asString(p.note, "No unauthorised debit found. Your practice balance is safe.");
  const bankName = asString(p.bankName, vars.bankName || vars.bank || "Your Bank");
  const transactions = asTransactions(p.transactions, vars.utrNumber);
  const actions = resolveStepActions(p, step.validIntents, step.trapIntents);

  return (
    <MockBalance balance={balance} note={`${bankName} · ${note}`} onBack={onBack ?? (() => onAction(step.validIntents[0] ?? "CHECK_BALANCE"))}>
      <MockTransactionHistory items={transactions} />
      <div className="space-y-2 pt-2">
        {actions.map((act, idx) => (
          <PhoneButton
            key={`${act.intent}-${idx}`}
            variant={idx === 0 && step.validIntents.includes(act.intent) ? "primary" : "secondary"}
            onClick={() => onAction(act.intent, { label: act.label })}
          >
            {act.label}
          </PhoneButton>
        ))}
      </div>
    </MockBalance>
  );
}

function TxHistoryWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const p = step.props;
  const title = asString(p.title, "Transaction History");
  const subtitle = asString(p.subtitle, `${vars.app || "UPI"} · Recent ledger`);
  const infoBanner = asString(p.infoBanner, "Verify whether any unauthorised transfer left your account before acting.");
  const transactions = asTransactions(p.transactions, vars.utrNumber);
  const actions = resolveStepActions(p, step.validIntents, step.trapIntents);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} subtitle={subtitle} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-300 bg-[#e5f8ea] p-3 text-[12.5px] font-medium text-[#1e7b34]">
          <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
          <span>{infoBanner}</span>
        </div>
        <MockTransactionHistory items={transactions} />
        <PhoneSection title="Next step">
          <div className="space-y-2">
            {actions.map((act, idx) => (
              <PhoneButton
                key={`${act.intent}-${idx}`}
                variant={idx === 0 && step.validIntents.includes(act.intent) ? "primary" : "secondary"}
                onClick={() => onAction(act.intent, { label: act.label })}
              >
                {act.label}
              </PhoneButton>
            ))}
          </div>
        </PhoneSection>
      </PhoneBody>
    </>
  );
}

function LoanOfferWidget({ step, vars, redFlags, flagsFound, onAction, onFlag, onMiss, onBack }: WidgetRenderProps) {
  const p = step.props;
  const lender = asString(p.lender ?? p.merchantName, vars.lender || vars.merchantName || "Instant Cash Lender");
  const amount = asString(p.amount, vars.amount || "25,000");
  const headline = asString(p.headline, "“Pre-approved” for you");
  const tagline = asString(p.tagline, "“Instant money. Zero documents.”");
  const termsNote = asString(p.termsNote ?? p.body, "");
  const actions = resolveStepActions(p, step.validIntents, step.trapIntents);

  return (
    <MockLoanOffer
      lender={lender}
      amount={amount}
      headline={headline}
      tagline={tagline}
      termsNote={termsNote || undefined}
      redFlags={redFlags}
      redFlagPhrases={step.redFlagPhrases}
      found={flagsFound}
      onFlag={onFlag}
      onMiss={onMiss}
      onBack={onBack}
    >
      <PhoneSection title="What will you do?">
        <div className="space-y-2">
          {actions.map((act, idx) => (
            <PhoneButton
              key={`${act.intent}-${idx}`}
              variant={act.variant ?? (idx === 0 ? "primary" : "secondary")}
              onClick={() => onAction(act.intent, { label: act.label })}
            >
              {act.label}
            </PhoneButton>
          ))}
        </div>
      </PhoneSection>
    </MockLoanOffer>
  );
}

function LenderCheckWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const lender = asString(step.props.lender ?? step.props.merchantName, vars.lender || vars.merchantName || "Unknown Lender");
  return (
    <MockLenderCheck
      lender={lender}
      onChecked={() => onAction("VERIFY_LENDER", { label: `Checked registration for ${lender}` })}
      onBack={onBack ?? (() => undefined)}
    />
  );
}

function InterestCalcWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const rawAmount = asString(step.props.amount, vars.amount || "15,000");
  const principal = Number(rawAmount.replace(/,/g, "")) || 15000;
  const targetIntent: SemanticIntent = step.validIntents[0] ?? "VERIFY_LENDER";

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Repayment calculator" subtitle="Check real total cost" onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        <MockInterestCalculator
          principal={principal}
          onCalculate={() => onAction(targetIntent, { label: "Calculated full repayment cost" })}
        />
      </PhoneBody>
    </>
  );
}

function ComplaintFormWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const p = step.props;
  const title = asString(p.title, "Report & Block");
  const intro = asString(
    p.intro,
    "Submit an official incident report to 1930 / cybercrime.gov.in and block this sender so they cannot target you again.",
  );
  const details = Array.isArray(p.details)
    ? (p.details as Array<{ label: string; value: string }>)
    : [
        { label: "Reported ID / Number", value: vars.scammerVpa || vars.maskedPhone || "Unknown" },
        { label: "Helpline", value: "1930 · cybercrime.gov.in" },
      ];
  const reasons = Array.isArray(p.reasons)
    ? (p.reasons as string[])
    : ["UPI / Financial Fraud Attempt", "Impersonation / Phishing", "Malicious APK / Link"];
  const submitLabel = asString(p.submitLabel, "Submit report & block");
  const successText = asString(p.successText, "Report logged and sender blocked (sandbox).");
  const submitIntent: SemanticIntent = step.validIntents.includes("FILE_1930_REPORT")
    ? "FILE_1930_REPORT"
    : step.validIntents[0] ?? "BLOCK_SENDER";

  return (
    <MockComplaintForm
      title={title}
      intro={intro}
      details={details}
      reasons={reasons}
      submitLabel={submitLabel}
      successText={successText}
      onSubmit={() => onAction(submitIntent, { label: submitLabel })}
      onBack={onBack ?? (() => undefined)}
    />
  );
}

function LegacySceneAdapter({ drill, vars, step, flagsFound, doneKeys, onFlag, onMiss, onAction }: WidgetRenderProps) {
  const legacyProps: SceneProps = {
    drill,
    vars,
    stepProps: step.props,
    emit: (key) => {
      const mapped = (step.validIntents.find((i) => i.toLowerCase() === key.toLowerCase()) ?? key) as SemanticIntent;
      onAction(mapped, { label: key });
    },
    onAction,
    tapFlag: (id) => (id ? onFlag(id) : onMiss()),
    flagsFound,
    doneKeys,
  };
  return renderLegacySceneByTrigger(drill, legacyProps);
}

/** Declarative OS Widget Registry mapping every ScreenWidgetType to its mobile UI primitive. */
export const WIDGET_REGISTRY: Record<ScreenWidgetType, ComponentType<WidgetRenderProps>> = {
  UPI_HOME: UpiHomeWidget,
  COLLECT_SHEET: CollectSheetWidget,
  PIN_PAD: PinPadWidget,
  BALANCE_VIEW: BalanceViewWidget,
  TX_HISTORY: TxHistoryWidget,
  SMS_INBOX: SmsInboxWidget,
  INCOMING_CALL: IncomingCallWidget,
  LOAN_OFFER: LoanOfferWidget,
  LENDER_CHECK: LenderCheckWidget,
  INTEREST_CALC: InterestCalcWidget,
  COMPLAINT_FORM: ComplaintFormWidget,
  LEGACY_SCENE: LegacySceneAdapter,
};

function renderLegacySceneByTrigger(drill: Drill, props: SceneProps) {
  switch (drill.trigger.type) {
    case "collect_request":
      return <CollectRequestScene {...props} />;
    case "lost_phone":
      return <LostPhoneScene {...props} />;
    case "balance_alert":
      return <WrongTransferScene {...props} />;
    case "loan_offer":
      return <LoanOfferScene {...props} />;
    case "sms":
      return <PhishingSmsScene {...props} />;
    case "digital_arrest":
      return <DigitalArrestScene {...props} />;
    default:
      return (
        <EmptyState
          icon={Smartphone}
          title="No sandbox scene yet"
          description={`The "${drill.trigger.type}" trigger does not have a mock phone scene registered.`}
        />
      );
  }
}

interface SandboxSceneProps {
  drill: Drill;
  vars: Record<string, string>;
  runner: DrillRunner;
  onBack?: () => void;
}

/**
 * Renders either the Composable OS Widget Registry (for all JSON-driven composable drills)
 * or the backward-compatible legacy scene adapter, plus automatic notifications, trap feedback,
 * and the fake PIN/OTP overlay.
 */
export function SandboxScene({ drill, vars, runner, onBack }: SandboxSceneProps) {
  const activeStep = runner.activeComposableStep;
  const [dismissedBannerStep, setDismissedBannerStep] = useState<string | null>(null);

  if (isComposableDrill(drill) && activeStep) {
    const Widget = WIDGET_REGISTRY[activeStep.screenType] ?? WIDGET_REGISTRY.LEGACY_SCENE;
    const notif = activeStep.notification;
    const bannerVisible = Boolean(notif) && dismissedBannerStep !== activeStep.stepId;

    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f2f6fd]">
        <Widget
          drill={drill}
          step={activeStep}
          vars={vars}
          redFlags={drill.redFlags}
          flagsFound={runner.run.flagsFound}
          doneKeys={runner.doneKeys}
          onAction={runner.emitIntent}
          onFlag={(id) => runner.tapFlag(id)}
          onMiss={() => runner.tapFlag(null)}
          onBack={onBack}
        />

        {/* Automatic notification banner whenever step.notification is present */}
        {notif && (
          <MockNotificationBanner
            visible={bannerVisible}
            appName={notif.app}
            title={notif.title}
            body={notif.body}
            urgent={notif.urgent}
            onTap={() => setDismissedBannerStep(activeStep.stepId)}
          />
        )}

        {/* Immediate educational feedback whenever a trap intent is triggered */}
        <AnimatePresence>
          {runner.trapFeedback && (
            <motion.div
              key={runner.trapFeedback.timestamp}
              role="alert"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={spring}
              className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-amber-500/70 bg-[#fff7e6] p-3.5 text-[#5c2d00] shadow-xl"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                    Trap Alert · Readiness Deducted
                  </p>
                  <p className="text-[12.5px] font-semibold leading-snug text-[#1f1609]">
                    {runner.trapFeedback.explanation}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runner.dismissTrapFeedback}
                  aria-label="Dismiss trap alert"
                  className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-amber-900/10 text-amber-900 hover:bg-amber-900/20"
                >
                  <X size={14} strokeWidth={2.3} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {runner.pinMode && (
            <MockPinPad key="pin" mode={runner.pinMode} onComplete={runner.completePin} onCancel={runner.cancelPin} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Backward-compatible legacy scene path
  const legacyProps: SceneProps = {
    drill,
    vars,
    emit: runner.emit,
    tapFlag: runner.tapFlag,
    flagsFound: runner.run.flagsFound,
    doneKeys: runner.doneKeys,
  };

  return (
    <>
      {renderLegacySceneByTrigger(drill, legacyProps)}
      <AnimatePresence>
        {runner.pinMode && (
          <MockPinPad key="pin" mode={runner.pinMode} onComplete={runner.completePin} onCancel={runner.cancelPin} />
        )}
      </AnimatePresence>
    </>
  );
}
