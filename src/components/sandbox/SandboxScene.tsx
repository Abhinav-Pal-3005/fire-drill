import { useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  FileWarning,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/glass/EmptyState";
import type { DrillRunner } from "@/features/drills/useDrillRunner";
import { spring } from "@/theme/tokens";
import type { Drill, SemanticIntent, ScreenWidgetType } from "@/types";
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
import type { WidgetActionHandler, WidgetRenderProps } from "./scenes/sceneTypes";

interface SandboxSceneProps {
  drill: Drill;
  vars: Record<string, string>;
  runner: DrillRunner;
  onExitToHome?: () => void;
}

interface ActionSpec {
  intent: SemanticIntent;
  label: string;
  variant?: "primary" | "secondary" | "danger";
}

const DEFAULT_INTENT_LABELS: Record<SemanticIntent, string> = {
  DECLINE_REQUEST: "Decline request",
  HANG_UP_CALL: "Hang up & block caller",
  BLOCK_SENDER: "Block & report sender",
  VERIFY_LENDER: "Verify registration / details independently",
  CHECK_HISTORY: "Check transaction history",
  CHECK_BALANCE: "Check bank balance in official app",
  FILE_1930_REPORT: "Report on 1930 / cybercrime.gov.in",
  FREEZE_UPI: "Freeze UPI & call bank helpline",
  IGNORE_MESSAGE: "Ignore & do not engage",
  OPEN_UPI_APP: "Open official UPI / bank app directly",
  ACCEPT_COLLECT: "Approve collect request",
  ENTER_UPI_PIN: "Enter UPI PIN",
  ANSWER_CALL: "Stay on call & comply",
  CLICK_EXTERNAL_LINK: "Open external link",
  SHARE_OTP: "Share OTP",
  INSTALL_APK: "Download & install APK file",
  APPROVE_LOAN: "Accept instant loan",
};

const DEFAULT_TX_HISTORY: MockTransaction[] = [
  { id: "tx-1", title: "Campus store", subtitle: "Yesterday", amount: "180", direction: "debit" },
  { id: "tx-2", title: "Metro smartcard", subtitle: "2 days ago", amount: "250", direction: "debit" },
  { id: "tx-3", title: "UPI Cashback", subtitle: "3 days ago", amount: "25", direction: "credit" },
];

function str(val: unknown, fallback = ""): string {
  return typeof val === "string" && val.trim().length > 0 ? val : fallback;
}

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolveStepActions(props: WidgetRenderProps["step"]["props"], step: WidgetRenderProps["step"]): ActionSpec[] {
  const rawList = Array.isArray(props.actions)
    ? (props.actions as Array<Record<string, unknown>>)
    : Array.isArray(props.extraActions)
      ? (props.extraActions as Array<Record<string, unknown>>)
      : null;

  if (rawList) {
    const custom = rawList
      .filter((a) => typeof a?.intent === "string" && typeof a?.label === "string")
      .map((a) => ({
        intent: a.intent as SemanticIntent,
        label: a.label as string,
        variant: (a.variant === "primary" || a.variant === "secondary" || a.variant === "danger"
          ? a.variant
          : "secondary") as "primary" | "secondary" | "danger",
      }));
    if (custom.length > 0) return custom;
  }

  const combined: SemanticIntent[] = [
    ...step.validIntents,
    ...(Object.keys(step.trapIntents) as SemanticIntent[]),
  ];
  const unique = Array.from(new Set(combined));
  unique.sort((a, b) => stableHash(`${step.stepId}:${a}`) - stableHash(`${step.stepId}:${b}`));

  return unique.map((intent) => ({
    intent,
    label: DEFAULT_INTENT_LABELS[intent] ?? intent,
    variant: "secondary",
  }));
}

function ActionButtonList({
  actions,
  onAction,
}: {
  actions: ActionSpec[];
  onAction: WidgetActionHandler;
}) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-2 pt-1">
      {actions.map((act, idx) => (
        <PhoneButton
          key={`${act.intent}-${idx}`}
          variant={act.variant ?? "secondary"}
          onClick={() => onAction(act.intent, { label: act.label })}
        >
          {act.label}
        </PhoneButton>
      ))}
    </div>
  );
}

/* ----------------------------- Widget Implementations ----------------------------- */

function UPIHomeWidget({ step, drill, vars, onAction, onBack }: WidgetRenderProps) {
  const props = step.props;
  const appName = str(props.appName, vars.app || "PayWave");
  const requesterName = str(props.requesterName, vars.scammerName || vars.name || "Unknown requester");
  const amount = str(props.amount, vars.amount || "0");
  const showPending = props.showPendingRequest === true || Boolean(props.pendingTitle);
  const pendingTitle = str(props.pendingTitle, `Collect request: ₹${amount}`);
  const pendingSubtitle = str(props.pendingSubtitle, `${requesterName} · tap to inspect`);
  const actions = resolveStepActions(props, step);

  return (
    <MockUPIHome
      appName={appName}
      onCheckBalance={
        step.validIntents.includes("CHECK_BALANCE")
          ? () => onAction("CHECK_BALANCE", { label: "Check balance" })
          : undefined
      }
      tiles={[
        {
          id: "history",
          label: "Transaction history",
          icon: Banknote,
          onClick: () => {
            if (step.validIntents.includes("CHECK_HISTORY") || "CHECK_HISTORY" in step.trapIntents) {
              onAction("CHECK_HISTORY", { label: "Check transaction history" });
            } else {
              onAction(actions[0]?.intent ?? "CHECK_BALANCE");
            }
          },
        },
        {
          id: "report",
          label: "Report & 1930 Help",
          icon: ShieldCheck,
          onClick: () => {
            if (step.validIntents.includes("FILE_1930_REPORT") || "FILE_1930_REPORT" in step.trapIntents) {
              onAction("FILE_1930_REPORT", { label: "Report on 1930 / cybercrime.gov.in" });
            } else if (onBack) {
              onBack();
            }
          },
        },
      ]}
    >
      {showPending && (
        <PhoneRow
          icon={Banknote}
          tone="alert"
          title={pendingTitle}
          subtitle={pendingSubtitle}
          onClick={() => {
            const inspectIntent =
              step.validIntents.find((i) => i !== "ACCEPT_COLLECT" as never) ?? actions[0]?.intent;
            if (inspectIntent) onAction(inspectIntent, { label: pendingTitle });
          }}
        />
      )}
      {str(props.infoBanner) && (
        <p className="rounded-2xl bg-[#eef4ff] p-3 text-[12.5px] font-medium text-[#1b3566] ring-1 ring-[#d6e4ff]">
          {str(props.infoBanner)}
        </p>
      )}
      <PhoneSection title={str(props.actionsHeading, "Available actions")}>
        <ActionButtonList actions={actions} onAction={onAction} />
      </PhoneSection>
      {drill.id === "" && null}
    </MockUPIHome>
  );
}

function CollectSheetWidget({ step, drill, vars, onAction, tapFlag, flagsFound, onBack }: WidgetRenderProps) {
  const props = step.props;
  const appName = str(props.appName, vars.app || "PayWave");
  const name = str(props.requesterName, vars.scammerName || vars.name || "Unknown sender");
  const upiId = str(props.upiId, vars.scammerVpa || "buyer@upi");
  const amount = str(props.amount, vars.amount || "0");
  const note = str(props.note, "Refund / collect payment");
  const extraActions = resolveStepActions(props, step).filter(
    (a) => a.intent !== "ACCEPT_COLLECT" && a.intent !== "DECLINE_REQUEST",
  );

  return (
    <div className="relative flex-1 overflow-hidden bg-[#f2f6fd]">
      <MockUPIHome
        appName={appName}
        tiles={[{ id: "security", label: "Help & 1930", icon: ShieldCheck, onClick: () => onAction("FILE_1930_REPORT") }]}
      >
        {extraActions.length > 0 && <ActionButtonList actions={extraActions} onAction={onAction} />}
      </MockUPIHome>
      <MockCollectRequestSheet
        name={name}
        upiId={upiId}
        amount={amount}
        note={note}
        directionLabel={str(props.directionLabel, "Collect request · Money leaves your account")}
        warningText={str(props.warningText)}
        approveLabel={str(props.approveLabel, `Pay ₹${amount}`)}
        declineLabel={str(props.declineLabel, "Decline")}
        redFlags={drill.redFlags}
        redFlagPhrases={step.redFlagPhrases}
        found={flagsFound}
        onFlag={(id) => tapFlag(id)}
        onMiss={() => tapFlag(null)}
        onAction={onAction}
        onClose={onBack}
      />
    </div>
  );
}

function PinPadWidget({ step, onAction }: WidgetRenderProps) {
  const mode = step.props.pinMode === "otp" ? "otp" : "pin";
  const submitIntent: SemanticIntent =
    mode === "otp" && "SHARE_OTP" in step.trapIntents ? "SHARE_OTP" : "ENTER_UPI_PIN";
  const cancelIntent: SemanticIntent = step.validIntents[0] ?? "DECLINE_REQUEST";

  return (
    <div className="relative flex-1 overflow-hidden">
      <MockPinPad
        mode={mode}
        onComplete={() => onAction(submitIntent, { mode })}
        onCancel={() => onAction(cancelIntent, { label: "Cancelled keypad safely" })}
      />
    </div>
  );
}

function BalanceViewWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const props = step.props;
  const balance = str(props.balance, vars.balance || "24,500");
  const note = str(props.note) || undefined;
  const transactions = Array.isArray(props.transactions)
    ? (props.transactions as MockTransaction[])
    : DEFAULT_TX_HISTORY;
  const actions = resolveStepActions(props, step);

  return (
    <MockBalance balance={balance} note={note} onBack={onBack ?? (() => {})}>
      <MockTransactionHistory items={transactions} />
      <PhoneSection title={str(props.actionsHeading, "Next action")}>
        <ActionButtonList actions={actions} onAction={onAction} />
      </PhoneSection>
    </MockBalance>
  );
}

function TxHistoryWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const props = step.props;
  const title = str(props.title, "Transaction History");
  const subtitle = str(props.subtitle, vars.app || "Recent UPI ledger");
  const transactions = Array.isArray(props.transactions)
    ? (props.transactions as MockTransaction[])
    : DEFAULT_TX_HISTORY;
  const actions = resolveStepActions(props, step);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} subtitle={subtitle} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        {str(props.summaryBanner) && (
          <div className="flex items-start gap-2 rounded-2xl bg-[#eef4ff] p-3 text-[12.5px] font-medium text-[#1b3566] ring-1 ring-[#d6e4ff]">
            <Building2 size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            <span>{str(props.summaryBanner)}</span>
          </div>
        )}
        <MockTransactionHistory
          items={transactions}
          onSelect={() => {
            if (step.validIntents.includes("CHECK_HISTORY")) {
              onAction("CHECK_HISTORY", { label: "Inspected transaction record" });
            }
          }}
        />
        <PhoneSection title={str(props.actionsHeading, "Choose an action")}>
          <ActionButtonList actions={actions} onAction={onAction} />
        </PhoneSection>
      </PhoneBody>
    </>
  );
}

function SmsInboxWidget({ step, drill, vars, onAction, tapFlag, flagsFound, onBack }: WidgetRenderProps) {
  const props = step.props;
  const title = str(props.title, "Messages");
  const subtitle = str(props.subtitle, "Tap suspicious phrases, then decide");
  const messages: InboxMessage[] = Array.isArray(props.messages)
    ? (props.messages as InboxMessage[])
    : [
        {
          id: "msg-1",
          sender: str(props.sender, drill.trigger.payloadTemplate.sender || vars.maskedPhone || "Unknown sender"),
          time: str(props.time, drill.trigger.payloadTemplate.time || vars.time || "Just now"),
          channel: str(props.channel, drill.trigger.payloadTemplate.channel || "SMS"),
          body: str(props.body, drill.trigger.payloadTemplate.body || ""),
        },
      ];
  const actions = resolveStepActions(props, step);

  return (
    <MockInbox
      title={title}
      subtitle={subtitle}
      messages={messages}
      redFlags={drill.redFlags}
      redFlagPhrases={step.redFlagPhrases}
      found={flagsFound}
      onFlag={(id) => tapFlag(id)}
      onMiss={() => tapFlag(null)}
      actions={actions}
      onAction={onAction}
      onBack={onBack}
    />
  );
}

function IncomingCallWidget({ step, drill, vars, onAction, tapFlag, flagsFound, onBack }: WidgetRenderProps) {
  const props = step.props;
  const actions = resolveStepActions(props, step);
  const extraActions = actions.filter((a) => a.intent !== "HANG_UP_CALL" && a.intent !== "ANSWER_CALL");

  return (
    <MockDialer
      title={str(props.title, "Incoming Call")}
      onBack={onBack}
      onAction={onAction}
      incomingCall={{
        callerName: str(props.callerName, vars.callerAgency || vars.scammerName || "Unknown caller"),
        maskedPhone: str(props.maskedPhone, vars.maskedPhone) || undefined,
        agency: str(props.agency, vars.callerAgency) || undefined,
        channel: str(props.channel, props.isVideo ? "Video Call" : "Voice Call"),
        isVideo: props.isVideo === true,
        transcript: str(props.transcript, drill.trigger.payloadTemplate.body || ""),
        redFlags: drill.redFlags,
        redFlagPhrases: step.redFlagPhrases,
        found: flagsFound,
        onFlag: (id) => tapFlag(id),
        onMiss: () => tapFlag(null),
        extraActions,
      }}
    />
  );
}

function LoanOfferWidget({ step, drill, vars, onAction, tapFlag, flagsFound, onBack }: WidgetRenderProps) {
  const props = step.props;
  const lender = str(props.lender, vars.lender || "Instant Credit App");
  const amount = str(props.amount, vars.amount || "15,000");
  const actions = resolveStepActions(props, step);

  return (
    <MockLoanOffer
      lender={lender}
      amount={amount}
      subtitle={str(props.subtitle, lender)}
      badgeLabel={str(props.badgeLabel) || undefined}
      headline={str(props.headline) || undefined}
      termsNote={str(props.termsNote) || undefined}
      redFlags={drill.redFlags}
      redFlagPhrases={step.redFlagPhrases}
      found={flagsFound}
      onFlag={(id) => tapFlag(id)}
      onMiss={() => tapFlag(null)}
      onAction={onAction}
      onBack={onBack}
    >
      <ActionButtonList actions={actions} onAction={onAction} />
    </MockLoanOffer>
  );
}

function LenderCheckWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const lender = str(step.props.lender, vars.lender || "Unknown Lender");
  return (
    <MockLenderCheck
      lender={lender}
      onChecked={() => onAction("VERIFY_LENDER", { lender })}
      onBack={onBack ?? (() => {})}
    />
  );
}

function InterestCalcWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const rawPrincipal = Number(str(step.props.amount, vars.amount || "10000").replace(/,/g, ""));
  const principal = Number.isFinite(rawPrincipal) && rawPrincipal > 0 ? rawPrincipal : 10000;
  const actions = resolveStepActions(propsOrEmpty(step.props), step);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Repayment Check" subtitle="Calculate real borrowing cost" onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        <MockInterestCalculator
          principal={principal}
          onCalculate={() => {
            if (step.validIntents.includes("VERIFY_LENDER")) {
              onAction("VERIFY_LENDER", { principal });
            }
          }}
        />
        <ActionButtonList actions={actions} onAction={onAction} />
      </PhoneBody>
    </>
  );
}

function propsOrEmpty(p: Record<string, unknown> | undefined) {
  return p ?? {};
}

function ComplaintFormWidget({ step, vars, onAction, onBack }: WidgetRenderProps) {
  const props = step.props;
  const rawDetails = Array.isArray(props.details)
    ? (props.details as Array<{ label: string; value: string }>)
    : [
        { label: "Helpline", value: "1930 / cybercrime.gov.in" },
        { label: "Bank / App", value: vars.app || vars.bankName || "Official Channel" },
      ];
  const reasons = Array.isArray(props.reasons)
    ? (props.reasons as string[])
    : ["Suspected cyber fraud attempt", "Phishing / impersonation", "Unauthorised payment request"];
  const primaryIntent = step.validIntents[0] ?? "FILE_1930_REPORT";
  const trapActions = (Object.keys(step.trapIntents) as SemanticIntent[]).map((intent) => ({
    intent,
    label: DEFAULT_INTENT_LABELS[intent] ?? intent,
    variant: "secondary" as const,
  }));

  return (
    <MockComplaintForm
      title={str(props.title, "Report to 1930 & Bank")}
      intro={str(
        props.intro,
        "File an official complaint on 1930 / cybercrime.gov.in and freeze compromised channels immediately.",
      )}
      details={rawDetails}
      reasons={reasons}
      submitLabel={str(props.submitLabel, "Submit official 1930 report")}
      successText={str(props.successText, "Incident reported and channels secured (sandbox).")}
      onSubmit={() => onAction(primaryIntent, { label: str(props.submitLabel, "Submit official report") })}
      onBack={onBack ?? (() => {})}
    >
      {trapActions.length > 0 && <ActionButtonList actions={trapActions} onAction={onAction} />}
    </MockComplaintForm>
  );
}

function LegacySceneWidget({ step, drill, vars, onAction, tapFlag, flagsFound, doneKeys }: WidgetRenderProps) {
  const sceneProps = {
    drill,
    vars,
    emit: (key: string, label?: string) => {
      onAction(key as SemanticIntent, label ? { label } : undefined);
    },
    tapFlag,
    flagsFound,
    doneKeys,
    stepProps: step.props,
    onAction,
  };

  switch (drill.trigger.type) {
    case "collect_request":
      return <CollectRequestScene {...sceneProps} />;
    case "lost_phone":
      return <LostPhoneScene {...sceneProps} />;
    case "balance_alert":
      return <WrongTransferScene {...sceneProps} />;
    case "loan_offer":
      return <LoanOfferScene {...sceneProps} />;
    case "sms":
      return <PhishingSmsScene {...sceneProps} />;
    case "digital_arrest":
      return <DigitalArrestScene {...sceneProps} />;
    default:
      return (
        <EmptyState
          icon={Smartphone}
          title="No sandbox scene"
          description={`Trigger "${drill.trigger.type}" is not mapped to a legacy scene.`}
        />
      );
  }
}

export const WIDGET_REGISTRY: Record<ScreenWidgetType, ComponentType<WidgetRenderProps>> = {
  UPI_HOME: UPIHomeWidget,
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
  LEGACY_SCENE: LegacySceneWidget,
};

/** Renders either the declarative composable widget registry or the legacy 6-scene switch. */
export function SandboxScene({ drill, vars, runner, onExitToHome }: SandboxSceneProps) {
  const activeStep = runner.activeComposableStep;
  const stepId = activeStep?.stepId ?? null;
  const [bannerDismissedForStep, setBannerDismissedForStep] = useState<string | null>(null);

  const composableNotification = runner.isComposable ? activeStep?.notification : undefined;
  const showNotifBanner = Boolean(composableNotification && bannerDismissedForStep !== stepId);

  const WidgetComponent = useMemo(() => {
    if (!activeStep) return null;
    return WIDGET_REGISTRY[activeStep.screenType] ?? null;
  }, [activeStep]);

  if (runner.isComposable && activeStep && WidgetComponent) {
    const trapFeedback = runner.trapFeedback;
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f6f7f9] text-zinc-900">
        {/* Step Progress Strip */}
        <div className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3.5 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CheckCircle2 size={14} strokeWidth={2.2} className="shrink-0 text-blue-700" aria-hidden />
            <span className="truncate text-[11px] font-extrabold text-zinc-900">
              {str(activeStep.notification?.app, vars.app || "PracticeOS")}
            </span>
          </div>
          <span className="tnum shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 ring-1 ring-blue-200">
            Step {Math.max(1, runner.doneStepIds.length + (runner.phase === "running" ? 1 : 0))}/{drill.steps.length}
          </span>
        </div>

        {/* Active Registered Widget Viewport */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <WidgetComponent
            step={activeStep}
            drill={drill}
            vars={vars}
            onAction={runner.emitIntent}
            tapFlag={runner.tapFlag}
            flagsFound={runner.run.flagsFound}
            doneKeys={runner.doneKeys}
            onBack={onExitToHome}
          />

          {/* Automatic Step Notification Banner */}
          {composableNotification && (
            <MockNotificationBanner
              visible={showNotifBanner}
              appName={composableNotification.app}
              title={composableNotification.title}
              body={composableNotification.body}
              urgent={composableNotification.urgent}
              onTap={() => setBannerDismissedForStep(stepId)}
            />
          )}

          {/* Animated Trap Feedback Alert Overlay */}
          <AnimatePresence>
            {trapFeedback && !trapFeedback.isCritical && runner.phase === "running" && (
              <motion.div
                key={`trap-${trapFeedback.stepId}-${trapFeedback.intent}-${trapFeedback.tMs}`}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={spring}
                role="alert"
                className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border-2 border-red-500 bg-[#fff5f5] p-3.5 text-zinc-900 shadow-xl"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-600 text-white">
                    <AlertTriangle size={15} strokeWidth={2.2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-red-700">
                      Trap triggered · Practice warning
                    </p>
                    <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-zinc-900">
                      {trapFeedback.explanation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runner.dismissTrapFeedback}
                    aria-label="Dismiss warning"
                    className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-500 hover:bg-red-100 hover:text-zinc-900"
                  >
                    <X size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Hint Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 bg-white px-3.5 py-2">
          <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-zinc-700">
            <FileWarning size={13} strokeWidth={2} className="shrink-0 text-amber-600" aria-hidden />
            <span className="truncate">
              {runner.hint
                ? runner.hint.text
                : drill.steps.find((s) => s.id === activeStep.stepId)?.cue ?? "Inspect details and respond safely."}
            </span>
          </p>
          <button
            type="button"
            onClick={runner.requestHint}
            disabled={runner.phase !== "running"}
            className="shrink-0 cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-800 disabled:opacity-45"
          >
            Hint
          </button>
        </div>
      </div>
    );
  }

  // Legacy 6-scene fallback
  const legacyProps = {
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
      scene = <CollectRequestScene {...legacyProps} />;
      break;
    case "lost_phone":
      scene = <LostPhoneScene {...legacyProps} />;
      break;
    case "balance_alert":
      scene = <WrongTransferScene {...legacyProps} />;
      break;
    case "loan_offer":
      scene = <LoanOfferScene {...legacyProps} />;
      break;
    case "sms":
      scene = <PhishingSmsScene {...legacyProps} />;
      break;
    case "digital_arrest":
      scene = <DigitalArrestScene {...legacyProps} />;
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
