import type { ComposableDrillStep, ConceptId, Difficulty, Drill, RedFlag, Step } from "@/types";
import { createId } from "@/utils/id";

export type CustomScamTheme =
  | "auto"
  | "upi-collect"
  | "apk-phishing"
  | "customs-call"
  | "voice-clone"
  | "instant-loan";

export interface CompileScamInput {
  text?: string;
  theme?: CustomScamTheme;
  title?: string;
}

interface ExtractedClues {
  amount: string;
  url: string | null;
  apkName: string | null;
  vpa: string | null;
  phone: string | null;
  redFlagMatches: Array<{ phrase: string; label: string; explanation: string }>;
}

const RED_FLAG_PATTERNS: Array<{ regex: RegExp; label: string; explanation: string }> = [
  {
    regex: /\b(?:enter|type|share)\s+(?:your\s+)?(?:upi\s+)?pin\b[^.!\n]*/i,
    label: "PIN requested",
    explanation: "A UPI PIN is only for sending money — never enter it to receive funds or refunds.",
  },
  {
    regex: /\b(?:share|tell|send|enter|read)\s+(?:the\s+|your\s+)?(?:\d+-digit\s+)?otp\b[^.!\n]*/i,
    label: "OTP harvesting",
    explanation: "No genuine bank, utility, or buyer ever asks you to share an OTP.",
  },
  {
    regex: /\b[\w-]+\.apk\b/i,
    label: "Malicious .APK file",
    explanation: "Installing .apk files outside official app stores gives attackers SMS and screen access.",
  },
  {
    regex: /https?:\/\/[^\s]+|\b(?:bit\.ly|tinyurl\.com|cutt\.ly|t\.ly)\/[^\s]+/i,
    label: "Unverified external link",
    explanation: "Shortened or unfamiliar links in urgent messages often point to credential-stealing pages.",
  },
  {
    regex: /\b(?:disconnected|blocked|suspended|frozen|arrest|warrant|seized|legal action)\b[^.!\n]*/i,
    label: "Fear & threat pressure",
    explanation: "Scammers threaten disconnection, account freeze, or arrest so you panic before verifying.",
  },
  {
    regex: /\b(?:urgent(?:ly)?|immediately|within\s+\d+\s*(?:mins?|minutes?|hours?)|tonight|today\s+only|last\s+chance|right\s+now)\b[^.!\n]*/i,
    label: "Artificial urgency",
    explanation: "Countdown pressure is designed to rush you past normal safety checks.",
  },
  {
    regex: /\b(?:kyc\s+(?:expired|pending|update|suspended)|pre-?approved|zero\s+documents?|instant\s+loan|verification\s+transfer|refundable\s+deposit)\b[^.!\n]*/i,
    label: "Classic scam pretext",
    explanation: "Fake KYC deadlines, instant zero-doc loans, and 'verification transfers' are common fraud scripts.",
  },
];

function extractClues(rawText: string): ExtractedClues {
  const text = rawText.trim();

  const amountMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const amount = amountMatch?.[1] ? amountMatch[1].replace(/\.00$/, "") : "{{amount}}";

  const urlMatch = text.match(/https?:\/\/[^\s]+|\b(?:bit\.ly|tinyurl\.com|cutt\.ly|t\.ly)\/[^\s]+/i);
  const url = urlMatch?.[0] ?? null;

  const apkMatch = text.match(/\b([\w.-]+\.apk)\b/i);
  const apkName = apkMatch?.[1] ?? null;

  const vpaMatch = text.match(/\b([a-z0-9._-]{2,}@[a-z]{2,})\b/i);
  const vpa = vpaMatch?.[1] ?? null;

  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\+91-\d{2}X{3}-\d{4}/i);
  const phone = phoneMatch?.[0] ?? null;

  const seen = new Set<string>();
  const redFlagMatches: ExtractedClues["redFlagMatches"] = [];

  for (const rule of RED_FLAG_PATTERNS) {
    const match = text.match(rule.regex);
    if (match?.[0]) {
      const phrase = match[0].trim().slice(0, 80);
      const key = phrase.toLowerCase();
      if (phrase.length >= 4 && !seen.has(key)) {
        seen.add(key);
        redFlagMatches.push({ phrase, label: rule.label, explanation: rule.explanation });
      }
    }
  }

  return { amount, url, apkName, vpa, phone, redFlagMatches };
}

function detectTheme(text: string, requestedTheme?: CustomScamTheme): Exclude<CustomScamTheme, "auto"> {
  if (requestedTheme && requestedTheme !== "auto") return requestedTheme;
  const lower = text.toLowerCase();

  if (/\b(loan|pre-?approved|emi|credit\s+limit|nbfc|processing\s+fee|disburs)/i.test(lower)) {
    return "instant-loan";
  }
  if (/\b(hospital|accident|mom|dad|brother|sister|relative|voice|emergency|admit)/i.test(lower)) {
    return "voice-clone";
  }
  if (/\b(fedex|customs|parcel|courier|aadhaar|police|cbi|ncb|arrest|warrant|trai|ivr)/i.test(lower)) {
    return "customs-call";
  }
  if (/\b(\.apk|electricity|power\s+cut|disconnect|kyc|pan\s+card|http|bit\.ly|tinyurl|link|update\s+app)/i.test(lower)) {
    return "apk-phishing";
  }
  return "upi-collect";
}

function toRedFlags(
  matches: ExtractedClues["redFlagMatches"],
  fallbackBody: string,
  defaults: Array<{ textFragment: string; label: string; explanation: string }>,
): { redFlags: RedFlag[]; redFlagPhrases: string[] } {
  const chosen: Array<{ textFragment: string; label: string; explanation: string }> = [];
  const lowerBody = fallbackBody.toLowerCase();

  for (const m of matches) {
    if (lowerBody.includes(m.phrase.toLowerCase()) && chosen.length < 3) {
      chosen.push({ textFragment: m.phrase, label: m.label, explanation: m.explanation });
    }
  }

  for (const def of defaults) {
    if (chosen.length >= 3) break;
    if (
      lowerBody.includes(def.textFragment.toLowerCase()) &&
      !chosen.some((c) => c.textFragment.toLowerCase() === def.textFragment.toLowerCase())
    ) {
      chosen.push(def);
    }
  }

  const redFlags: RedFlag[] = chosen.map((item, idx) => ({
    id: `custom-flag-${idx + 1}`,
    textFragment: item.textFragment,
    label: item.label,
    explanation: item.explanation,
  }));

  return {
    redFlags,
    redFlagPhrases: redFlags.map((f) => f.textFragment),
  };
}

/**
 * Deterministic, offline-capable Smart Scam-to-Drill Compiler.
 * Converts any pasted suspicious SMS/WhatsApp message or chosen scam theme into a
 * schema-valid, playable composable Drill using only registered ScreenWidgetType primitives.
 */
export function compileScamToDrill(input: CompileScamInput): Drill {
  const rawText = (input.text ?? "").trim();
  const theme = detectTheme(rawText, input.theme);
  const clues = extractClues(rawText);
  const id = createId(`custom-${theme}`);

  const displayAmount = clues.amount;
  const displayVpa = clues.vpa ?? "{{scammerVpa}}";
  const displayPhone = clues.phone ?? "{{maskedPhone}}";
  const displayApk = clues.apkName ?? "{{fakeApkName}}";
  const displayUrl = clues.url ?? "https://verify-urgent-update.in/now";

  let title = input.title?.trim() || "";
  let tagline = "";
  let concept: ConceptId = "upi-safety";
  let relatedConcepts: ConceptId[] = ["phishing-indicators"];
  let difficulty: Difficulty = "medium";
  let quizId = "upi-safety";
  let linkedLibraryIds: string[] = ["upi-01"];
  let criticalActions: string[] = ["ENTER_UPI_PIN", "SHARE_OTP"];
  let critical = {
    title: "You fell for the scam trap",
    explanation:
      "Never enter a UPI PIN to receive money, install an .apk sent by SMS, or share a bank OTP under pressure. Call 1930 immediately if real money is ever at risk.",
    reason: "Practise recognising pressure cues before taking any financial action.",
    concept: "upi-safety" as ConceptId,
  };

  let primaryBody = rawText;
  let steps: Step[] = [];
  let composableSteps: ComposableDrillStep[] = [];
  let hints: Record<string, string> = {};
  let redFlagBundle: { redFlags: RedFlag[]; redFlagPhrases: string[] };

  if (theme === "upi-collect") {
    title = title || "Custom UPI Collect & QR Drill";
    tagline = "Rehearse rejecting a suspicious UPI collect / QR refund claim safely.";
    concept = "upi-safety";
    relatedConcepts = ["phishing-indicators", "fraud-response"];
    difficulty = "easy";
    quizId = "upi-safety";
    linkedLibraryIds = ["upi-01", "upi-02"];
    criticalActions = ["ENTER_UPI_PIN"];
    primaryBody =
      rawText ||
      `Hi, I have sent a UPI collect request of ₹${displayAmount} from ${displayVpa}. Please approve and enter your UPI PIN urgently to receive the money!`;

    redFlagBundle = toRedFlags(clues.redFlagMatches, primaryBody, [
      {
        textFragment: "collect request",
        label: "Collect pulls money out",
        explanation: "A UPI collect request debits your account when approved.",
      },
      {
        textFragment: "enter your UPI PIN",
        label: "PIN to receive trap",
        explanation: "You never enter a UPI PIN to receive money.",
      },
      {
        textFragment: "urgently",
        label: "Artificial urgency",
        explanation: "Pressure tactics are designed to rush you into approving a debit.",
      },
    ]);

    steps = [
      {
        id: "step-sms",
        label: "Inspect the suspicious message & open {{app}} directly",
        actionKey: "OPEN_UPI_APP",
        order: 1,
        weight: 2,
        mandatory: true,
        cue: "Read the pasted message carefully, spot any red flags, and open your UPI app directly instead of tapping links.",
        explanation: "Inspecting payment claims directly inside your official UPI app exposes disguised collect requests.",
        mistakeConcept: "phishing-indicators",
      },
      {
        id: "step-collect",
        label: `Decline the ₹${displayAmount} collect request`,
        actionKey: "DECLINE_REQUEST",
        order: 2,
        weight: 3,
        mandatory: true,
        cue: "Receiving money never needs you to approve a collect request or enter a UPI PIN.",
        explanation: "Declining the collect request immediately prevents any debit from your {{bankName}} account.",
        mistakeConcept: "upi-safety",
      },
      {
        id: "step-report",
        label: "Block sender & file a 1930 report",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Log the scammer's UPI handle so they cannot target you again.",
        explanation: "Blocking and reporting mule UPI IDs to 1930 protects both you and future targets.",
        mistakeConcept: "fraud-response",
      },
    ];

    composableSteps = [
      {
        stepId: "step-sms",
        screenType: "SMS_INBOX",
        notification: {
          app: "Messages · Custom Alert",
          title: `Suspicious ₹${displayAmount} payment message`,
          body: primaryBody.slice(0, 96),
          urgent: true,
        },
        props: {
          title: "Messages · Incoming",
          sender: `{{scammerName}} · ${displayPhone}`,
          channel: "SMS / WhatsApp",
          time: "{{time}}",
          body: primaryBody,
          actions: [
            {
              intent: "OPEN_UPI_APP",
              label: "Open {{app}} directly to verify safely",
              subtitle: "Ignore chat instructions and check real UPI direction",
              variant: "primary",
            },
            {
              intent: "CLICK_EXTERNAL_LINK",
              label: `Tap link in message (${displayUrl.slice(0, 34)})`,
              subtitle: "Unverified external link",
              variant: "secondary",
            },
            {
              intent: "SHARE_OTP",
              label: "Reply with bank OTP to claim amount",
              subtitle: "Never share OTP in chat",
              variant: "secondary",
            },
          ],
        },
        redFlagPhrases: redFlagBundle.redFlagPhrases,
        validIntents: ["OPEN_UPI_APP"],
        trapIntents: {
          CLICK_EXTERNAL_LINK: "Never tap payment or refund links sent by strangers in SMS or WhatsApp.",
          SHARE_OTP: "No genuine payer ever asks for your OTP to send you money.",
        },
        nextStepMap: { OPEN_UPI_APP: "step-collect" },
      },
      {
        stepId: "step-collect",
        screenType: "COLLECT_SHEET",
        notification: {
          app: "{{app}} UPI",
          title: `Pending collect request: ₹${displayAmount}`,
          body: `${displayVpa} is requesting ₹${displayAmount} from {{bankName}}.`,
          urgent: true,
        },
        props: {
          appName: "{{app}}",
          scammerName: "{{scammerName}}",
          scammerVpa: displayVpa,
          amount: displayAmount,
          bankName: "{{bankName}}",
          note: `Claimed credit — approve to 'receive' ₹${displayAmount}`,
          warningBanner: `DEBIT WARNING: Approving sends ₹${displayAmount} OUT of {{bankName}} to ${displayVpa}.`,
        },
        redFlagPhrases: ["DEBIT WARNING", "approve to 'receive'"],
        validIntents: ["DECLINE_REQUEST"],
        trapIntents: {
          ACCEPT_COLLECT: `Approving pulls ₹${displayAmount} OUT of your account! Cancel the PIN screen immediately.`,
        },
        nextStepMap: {
          DECLINE_REQUEST: "step-report",
          ACCEPT_COLLECT: "step-pin-trap",
        },
      },
      {
        stepId: "step-pin-trap",
        screenType: "PIN_PAD",
        notification: {
          app: "{{app}} Security",
          title: "STOP — UPI PIN sends money OUT",
          body: "Tap Cancel immediately. Receiving money never needs your PIN.",
          urgent: true,
        },
        props: { mode: "pin" },
        validIntents: ["DECLINE_REQUEST"],
        trapIntents: {
          ENTER_UPI_PIN: `Entering your UPI PIN would immediately debit ₹${displayAmount} to ${displayVpa}!`,
        },
        nextStepMap: { DECLINE_REQUEST: "step-collect" },
      },
      {
        stepId: "step-report",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Block & Report · 1930",
          intro: "Submit this suspicious message and UPI handle to 1930 / cybercrime.gov.in.",
          details: [
            { label: "Reported Handle", value: displayVpa },
            { label: "Sender Number", value: displayPhone },
            { label: "Amount Mentioned", value: `₹${displayAmount}` },
          ],
          reasons: ["UPI Collect / QR PIN Trap", "Phishing / Fake Refund Message", "Suspicious Mule Handle"],
          submitLabel: "Block & file 1930 report",
          successText: "Custom scenario logged and sender blocked (sandbox).",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];

    hints = {
      "step-sms": "Inspect the pasted message for PIN/urgency red flags, then open {{app}} directly instead of tapping links.",
      "step-collect": "Look at the DEBIT WARNING banner and tap Decline to reject the collect request.",
      "step-pin-trap": "Tap Cancel immediately — never enter your UPI PIN to receive money.",
      "step-report": "Choose a reason and submit the 1930 report to finish.",
    };
  } else if (theme === "apk-phishing") {
    title = title || "Custom Phishing Link & .APK Drill";
    tagline = "Defend against an urgent SMS pushing a suspicious link or malicious .apk install.";
    concept = "phishing-indicators";
    relatedConcepts = ["fraud-response", "upi-safety"];
    difficulty = "medium";
    quizId = "phishing-indicators";
    linkedLibraryIds = ["phish-01", "phish-02"];
    criticalActions = ["INSTALL_APK", "SHARE_OTP"];
    critical = {
      title: "You installed an untrusted .APK or shared an OTP",
      explanation:
        "Malicious .apk files and phishing links steal SMS OTPs and banking logins silently. Always check utility bills or KYC status exclusively inside official apps.",
      reason: "Rehearse rejecting urgent links and sideloaded .apk files.",
      concept: "phishing-indicators",
    };

    primaryBody =
      rawText ||
      `URGENT: Your account / utility service will be DISCONNECTED tonight. Install ${displayApk} or visit ${displayUrl} immediately to avoid ₹${displayAmount} penalty.`;

    redFlagBundle = toRedFlags(clues.redFlagMatches, primaryBody, [
      {
        textFragment: "DISCONNECTED tonight",
        label: "Sudden threat",
        explanation: "Urgent disconnection threats are crafted to cause panic.",
      },
      {
        textFragment: displayApk,
        label: "Malicious .APK sideload",
        explanation: "Never install .apk files sent through SMS or chat.",
      },
      {
        textFragment: displayUrl,
        label: "Unverified link",
        explanation: "Always navigate to official bank or utility apps yourself.",
      },
    ]);

    steps = [
      {
        id: "step-sms",
        label: "Spot phishing cues & block the sender",
        actionKey: "BLOCK_SENDER",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "Do NOT click external links or download .apk installers from SMS. Block the sender safely.",
        explanation: "Blocking unknown phishing senders prevents repeat links and keeps spyware off your device.",
        mistakeConcept: "phishing-indicators",
      },
      {
        id: "step-call",
        label: "Hang up on the follow-up helpline scammer",
        actionKey: "HANG_UP_CALL",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "Refuse to share OTPs or install remote apps during a follow-up call.",
        explanation: "Scammers often follow phishing SMS messages with fake support calls to extract OTPs.",
        mistakeConcept: "fraud-response",
      },
      {
        id: "step-report",
        label: "Report the phishing link & number to 1930",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Submit the malicious link/file and sender number on 1930 / Chakshu.",
        explanation: "Reporting phishing headers and .apk links helps telecom operators block the sender quickly.",
        mistakeConcept: "fraud-response",
      },
    ];

    composableSteps = [
      {
        stepId: "step-sms",
        screenType: "SMS_INBOX",
        notification: {
          app: "Messages · Urgent Alert",
          title: `Urgent notice from ${displayPhone}`,
          body: primaryBody.slice(0, 96),
          urgent: true,
        },
        props: {
          title: "Messages · Phishing Check",
          sender: displayPhone,
          channel: "SMS / WhatsApp",
          time: "{{time}}",
          body: primaryBody,
          actions: [
            {
              intent: "BLOCK_SENDER",
              label: "Ignore link & block sender",
              subtitle: "Verify status only inside your official app",
              variant: "primary",
            },
            {
              intent: "INSTALL_APK",
              label: `Download & install ${displayApk}`,
              subtitle: "Unverified external installer",
              variant: "secondary",
            },
            {
              intent: "CLICK_EXTERNAL_LINK",
              label: `Open link: ${displayUrl.slice(0, 32)}`,
              subtitle: "Suspicious external URL",
              variant: "secondary",
            },
          ],
        },
        redFlagPhrases: redFlagBundle.redFlagPhrases,
        validIntents: ["BLOCK_SENDER", "IGNORE_MESSAGE"],
        trapIntents: {
          INSTALL_APK: `Installing ${displayApk} exposes your SMS OTPs and banking apps to remote hijacking!`,
          CLICK_EXTERNAL_LINK: "Opening phishing links leads to fake login pages that harvest your PIN and OTP.",
        },
        nextStepMap: { BLOCK_SENDER: "step-call", IGNORE_MESSAGE: "step-call" },
      },
      {
        stepId: "step-call",
        screenType: "INCOMING_CALL",
        notification: {
          app: "Phone · Unknown Caller",
          title: "{{scammerName}} · Fake Support Desk",
          body: `Calling from ${displayPhone} demanding urgent verification.`,
          urgent: true,
        },
        props: {
          callerName: "{{scammerName}}",
          callerNumber: displayPhone,
          agency: "Claimed: Verification & Billing Desk",
          channel: "Incoming Voice Call",
          badge: "Unverified Caller",
          transcript: `Your service will be blocked in 10 minutes! Install ${displayApk} and read me the 6-digit {{bankName}} OTP right now to complete verification.`,
          actions: [
            { intent: "HANG_UP_CALL", label: "Hang up immediately", variant: "primary" },
            { intent: "ANSWER_CALL", label: "Stay on call & argue", variant: "secondary" },
            { intent: "SHARE_OTP", label: "Share 6-digit {{bankName}} OTP", variant: "secondary" },
          ],
        },
        redFlagPhrases: ["blocked in 10 minutes", displayApk, "read me the 6-digit {{bankName}} OTP"],
        validIntents: ["HANG_UP_CALL"],
        trapIntents: {
          ANSWER_CALL: "Staying on the line gives scammers room to pressure you. Hang up immediately.",
          SHARE_OTP: "Sharing a bank OTP authorises immediate unauthorised debits!",
        },
        nextStepMap: { HANG_UP_CALL: "step-report" },
      },
      {
        stepId: "step-report",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Phishing · 1930 & Chakshu",
          intro: "Log this phishing SMS, link, and caller number so telecom filters can block it.",
          details: [
            { label: "Sender Number", value: displayPhone },
            { label: "Suspicious Link / APK", value: clues.apkName || clues.url || displayApk },
            { label: "Helpline", value: "1930 · Sanchar Saathi Chakshu" },
          ],
          reasons: ["Malicious .APK / Phishing Link", "Fake KYC / Utility Disconnection Alert", "OTP Theft Call"],
          submitLabel: "Submit 1930 report",
          successText: "Phishing sender and link reported in sandbox.",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];

    hints = {
      "step-sms": "Tap the suspicious phrases in the message, then choose 'Ignore link & block sender'.",
      "step-call": "Hang up immediately — genuine desks never ask for .apk installs or bank OTPs on a call.",
      "step-report": "Pick the phishing reason and submit the 1930 report.",
    };
  } else if (theme === "customs-call") {
    title = title || "Custom Customs & Authority Call Drill";
    tagline = "Shut down an impersonation call threatening arrest and demanding a verification transfer.";
    concept = "fraud-response";
    relatedConcepts = ["phishing-indicators", "upi-safety"];
    difficulty = "hard";
    quizId = "digital-arrest";
    linkedLibraryIds = ["arrest-01", "arrest-02"];
    criticalActions = ["ENTER_UPI_PIN", "SHARE_OTP"];
    critical = {
      title: "You complied with a fake authority transfer demand",
      explanation:
        "No police force, Customs office, or court ever demands a 'verification transfer' or conducts arrest over phone/video. Hang up and call 1930.",
      reason: "Rehearse breaking off coercive authority impersonation calls.",
      concept: "fraud-response",
    };

    primaryBody =
      rawText ||
      `This is {{scammerName}} from {{callerAgency}}. An illegal parcel linked to your Aadhaar was seized. Do not tell anyone — transfer ₹${displayAmount} to ${displayVpa} immediately or face arrest today.`;

    redFlagBundle = toRedFlags(clues.redFlagMatches, primaryBody, [
      {
        textFragment: "Do not tell anyone",
        label: "Isolation tactic",
        explanation: "Scammers isolate you from family so nobody spots the lie.",
      },
      {
        textFragment: displayVpa,
        label: "Personal / mule UPI handle",
        explanation: "Government agencies never collect deposits via personal UPI handles.",
      },
      {
        textFragment: "arrest today",
        label: "Coercive arrest threat",
        explanation: "Instant arrest threats over a call are always fake.",
      },
    ]);

    steps = [
      {
        id: "step-call",
        label: "Hang up on the fake {{callerAgency}} call",
        actionKey: "HANG_UP_CALL",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "End the intimidation call immediately — never share Aadhaar details or OTPs.",
        explanation: "Hanging up breaks the scammer's isolation script immediately.",
        mistakeConcept: "fraud-response",
      },
      {
        id: "step-history",
        label: "Verify your transaction ledger is untouched",
        actionKey: "CHECK_HISTORY",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "Confirm no verification transfer left your {{bankName}} account.",
        explanation: "Checking your own transaction ledger calmly confirms your funds remain safe.",
        mistakeConcept: "upi-safety",
      },
      {
        id: "step-report",
        label: "Report the impersonation call on 1930",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Log the caller number and demanded UPI handle to 1930 / cybercrime.gov.in.",
        explanation: "Reporting authority impersonation numbers helps trace and freeze scam networks.",
        mistakeConcept: "fraud-response",
      },
    ];

    composableSteps = [
      {
        stepId: "step-call",
        screenType: "INCOMING_CALL",
        notification: {
          app: "Phone · Urgent IVR",
          title: "{{callerAgency}} · Impersonation Alert",
          body: primaryBody.slice(0, 96),
          urgent: true,
        },
        props: {
          callerName: "{{scammerName}}",
          callerNumber: displayPhone,
          agency: "{{callerAgency}}",
          channel: "Incoming Voice / IVR Call",
          badge: "Unverified Caller",
          transcript: primaryBody,
          actions: [
            { intent: "HANG_UP_CALL", label: "Hang up & refuse intimidation", variant: "primary" },
            { intent: "ANSWER_CALL", label: "Stay on line & verify Aadhaar", variant: "secondary" },
            { intent: "SHARE_OTP", label: "Share verification OTP", variant: "secondary" },
          ],
        },
        redFlagPhrases: redFlagBundle.redFlagPhrases,
        validIntents: ["HANG_UP_CALL"],
        trapIntents: {
          ANSWER_CALL: "Do not stay on the line with an impersonator threatening arrest. Hang up immediately.",
          SHARE_OTP: "Never share OTPs on an incoming threat call.",
        },
        nextStepMap: { HANG_UP_CALL: "step-history" },
      },
      {
        stepId: "step-history",
        screenType: "TX_HISTORY",
        props: {
          title: "Transaction History",
          subtitle: "{{app}} · {{bankName}}",
          infoBanner: `No money was transferred to ${displayVpa}. Your account is completely safe.`,
          actions: [
            { intent: "CHECK_HISTORY", label: "Ledger verified — file 1930 report", variant: "primary" },
            { intent: "ENTER_UPI_PIN", label: `Send ₹${displayAmount} 'verification deposit'`, variant: "secondary" },
          ],
        },
        validIntents: ["CHECK_HISTORY", "CHECK_BALANCE"],
        trapIntents: {
          ENTER_UPI_PIN: "There is no such thing as an RBI or Customs 'verification transfer'!",
        },
        nextStepMap: { CHECK_HISTORY: "step-report", CHECK_BALANCE: "step-report" },
      },
      {
        stepId: "step-report",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Impersonation · 1930",
          intro: "Submit the fake authority call and mule UPI handle to 1930 / cybercrime.gov.in.",
          details: [
            { label: "Claimed Agency", value: "{{callerAgency}}" },
            { label: "Caller Number", value: displayPhone },
            { label: "Demanded Handle", value: displayVpa },
          ],
          reasons: ["Fake Courier / Customs Call", "Police / Government Impersonation", "Coercive Transfer Demand"],
          submitLabel: "Submit 1930 report",
          successText: "Impersonation attempt logged in 1930 sandbox.",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];

    hints = {
      "step-call": "Spot the threat & isolation cues and tap Hang Up right away.",
      "step-history": "Confirm your clean ledger and proceed to file a 1930 report.",
      "step-report": "Select the impersonation reason and submit your report.",
    };
  } else if (theme === "voice-clone") {
    title = title || "Custom Emergency Impersonation Drill";
    tagline = "Pause and independently verify a frantic emergency transfer request from an unknown number.";
    concept = "fraud-response";
    relatedConcepts = ["upi-safety", "phishing-indicators"];
    difficulty = "medium";
    quizId = "fraud-response";
    linkedLibraryIds = ["arrest-01", "upi-01"];
    criticalActions = ["ENTER_UPI_PIN", "SHARE_OTP"];
    critical = {
      title: "You sent money without verifying on your relative's real number",
      explanation:
        "AI voice clones and WhatsApp hijackers mimic relatives in fake hospital emergencies. Always hang up and call your relative's real saved number before sending any money.",
      reason: "Rehearse independent callback verification during emotional emergencies.",
      concept: "fraud-response",
    };

    primaryBody =
      rawText ||
      `Please help! I'm at the hospital after an accident. Do not call my regular number — send ₹${displayAmount} right now to ${displayVpa}!`;

    redFlagBundle = toRedFlags(clues.redFlagMatches, primaryBody, [
      {
        textFragment: "Do not call my regular number",
        label: "Blocks verification",
        explanation: "Scammers try to stop you from dialing your relative's real saved number.",
      },
      {
        textFragment: displayVpa,
        label: "Third-party UPI handle",
        explanation: "Emergency transfers to an unknown personal UPI handle are a major warning sign.",
      },
      {
        textFragment: "right now",
        label: "Emotional urgency",
        explanation: "Panic is used to make you pay before checking.",
      },
    ]);

    steps = [
      {
        id: "step-call",
        label: "Hang up & verify via your {{relativeRole}}'s real number",
        actionKey: "HANG_UP_CALL",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "Never transfer money on an unverified call from an unknown number.",
        explanation: "Hanging up lets you call your relative's real saved contact and confirm they are safe.",
        mistakeConcept: "fraud-response",
      },
      {
        id: "step-balance",
        label: "Confirm your {{bankName}} balance is safe",
        actionKey: "CHECK_BALANCE",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "After verifying your relative is safe, review your balance and proceed to report.",
        explanation: "Confirming your balance ensures zero funds left your account.",
        mistakeConcept: "upi-safety",
      },
      {
        id: "step-report",
        label: "Block caller & report to 1930",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Submit the unknown caller number and mule UPI ID to 1930.",
        explanation: "Reporting emergency impersonation numbers helps flag fraud rings quickly.",
        mistakeConcept: "fraud-response",
      },
    ];

    composableSteps = [
      {
        stepId: "step-call",
        screenType: "INCOMING_CALL",
        notification: {
          app: "Phone · Unknown Caller",
          title: `Urgent call from ${displayPhone}`,
          body: primaryBody.slice(0, 96),
          urgent: true,
        },
        props: {
          callerName: "Sounds like: {{relativeRole}}",
          callerNumber: displayPhone,
          agency: "Unknown Number · Possible Impersonation",
          channel: "Incoming Voice Call",
          badge: "Not in Contacts",
          transcript: primaryBody,
          actions: [
            { intent: "HANG_UP_CALL", label: "Hang up & call real saved contact", variant: "primary" },
            { intent: "ANSWER_CALL", label: "Stay on line & promise transfer", variant: "secondary" },
            { intent: "ENTER_UPI_PIN", label: `Transfer ₹${displayAmount} to ${displayVpa} now`, variant: "secondary" },
          ],
        },
        redFlagPhrases: redFlagBundle.redFlagPhrases,
        validIntents: ["HANG_UP_CALL"],
        trapIntents: {
          ANSWER_CALL: "Hang up so you can independently call your relative's real saved number.",
          ENTER_UPI_PIN: `Sending ₹${displayAmount} to ${displayVpa} without callback verification pays a scammer!`,
        },
        nextStepMap: { HANG_UP_CALL: "step-balance" },
      },
      {
        stepId: "step-balance",
        screenType: "BALANCE_VIEW",
        notification: {
          app: "Callback Confirmed",
          title: "Your {{relativeRole}} is safe!",
          body: "They never asked for money — you avoided an impersonation scam.",
          urgent: false,
        },
        props: {
          bankName: "{{bankName}}",
          balance: "{{balance}}",
          note: "Callback verified your {{relativeRole}} is safe and no money left your account.",
          actions: [
            { intent: "CHECK_BALANCE", label: "Balance safe — block & report caller", variant: "primary" },
            { intent: "ACCEPT_COLLECT", label: `Pay ₹${displayAmount} anyway`, variant: "secondary" },
          ],
        },
        validIntents: ["CHECK_BALANCE", "BLOCK_SENDER"],
        trapIntents: {
          ACCEPT_COLLECT: "Never pay once you know the emergency was faked.",
        },
        nextStepMap: { CHECK_BALANCE: "step-report", BLOCK_SENDER: "step-report" },
      },
      {
        stepId: "step-report",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Impersonation · 1930",
          intro: "Block the caller and log the mule UPI handle on 1930 / cybercrime.gov.in.",
          details: [
            { label: "Unknown Number", value: displayPhone },
            { label: "Mule UPI Handle", value: displayVpa },
            { label: "Requested Amount", value: `₹${displayAmount}` },
          ],
          reasons: ["AI Voice-Clone / Relative Impersonation", "Fake Hospital Emergency Demand", "Mule UPI Handle"],
          submitLabel: "Block & submit 1930 report",
          successText: "Impersonation caller blocked and reported in sandbox.",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];

    hints = {
      "step-call": "Hang up and verify by dialing your relative's real saved contact number.",
      "step-balance": "Confirm your balance is untouched and move to reporting.",
      "step-report": "Select the impersonation reason and submit the 1930 report.",
    };
  } else {
    // instant-loan
    title = title || "Custom Instant Loan Trap Drill";
    tagline = "Verify lender RBI registration and true repayment cost before approving any instant loan.";
    concept = "interest-credit";
    relatedConcepts = ["phishing-indicators", "fraud-response"];
    difficulty = "medium";
    quizId = "interest-credit";
    linkedLibraryIds = ["loan-01", "loan-02"];
    criticalActions = ["APPROVE_LOAN"];
    critical = {
      title: "You approved an unverified instant loan offer",
      explanation:
        "Unregistered instant loan apps charge predatory hidden fees and harvest contacts/gallery permissions for harassment. Always check RBI NBFC registration and full APR first.",
      reason: "Rehearse verifying lender registration and declining predatory instant loans.",
      concept: "interest-credit",
    };

    primaryBody =
      rawText ||
      `Congratulations! Pre-approved instant loan of ₹${displayAmount} with zero documents! Disbursal in 5 minutes — allow Contacts & Gallery access to claim today only.`;

    redFlagBundle = toRedFlags(clues.redFlagMatches, primaryBody, [
      {
        textFragment: "zero documents",
        label: "No KYC check",
        explanation: "RBI-regulated lenders always perform proper KYC and disclose full APR.",
      },
      {
        textFragment: "Pre-approved",
        label: "Unsolicited loan bait",
        explanation: "Unsolicited pre-approved loan messages often hide predatory processing fees.",
      },
      {
        textFragment: "today only",
        label: "Rush deadline",
        explanation: "Scam loan apps push short deadlines so you skip reading the Key Fact Statement.",
      },
    ]);

    steps = [
      {
        id: "step-loan",
        label: "Inspect the loan offer & check RBI registration",
        actionKey: "VERIFY_LENDER",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "Never tap Approve on an unsolicited loan offer. Check the lender's RBI NBFC registration first.",
        explanation: "Checking RBI registration immediately exposes unregistered predatory apps.",
        mistakeConcept: "interest-credit",
      },
      {
        id: "step-lender",
        label: "Confirm lender registration status",
        actionKey: "VERIFY_LENDER",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "Run the official RBI NBFC lookup inside PracticeOS.",
        explanation: "Only RBI-registered banks and NBFCs are legally permitted to issue digital loans in India.",
        mistakeConcept: "interest-credit",
      },
      {
        id: "step-report",
        label: "Decline & report the predatory loan app",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Block and report the unverified lender on 1930 / RBI Sachet.",
        explanation: "Reporting predatory loan apps helps authorities remove them from app stores and block payment gateways.",
        mistakeConcept: "fraud-response",
      },
    ];

    composableSteps = [
      {
        stepId: "step-loan",
        screenType: "LOAN_OFFER",
        notification: {
          app: "Loan Alert",
          title: `Pre-approved ₹${displayAmount} in 5 mins!`,
          body: primaryBody.slice(0, 96),
          urgent: true,
        },
        props: {
          lender: "{{merchantName}} Instant Cash",
          amount: displayAmount,
          headline: "Pre-approved instant loan",
          tagline: "Zero documents · 5-minute disbursal",
          termsNote: primaryBody,
          actions: [
            { intent: "VERIFY_LENDER", label: "Check RBI NBFC registration first", variant: "primary" },
            { intent: "DECLINE_REQUEST", label: "Decline offer immediately", variant: "secondary" },
            { intent: "APPROVE_LOAN", label: `Accept ₹${displayAmount} & grant Contacts access`, variant: "secondary" },
          ],
        },
        redFlagPhrases: redFlagBundle.redFlagPhrases,
        validIntents: ["VERIFY_LENDER", "DECLINE_REQUEST"],
        trapIntents: {
          APPROVE_LOAN: "Approving an unverified loan app hands over your contacts/gallery for extortion and huge hidden fees!",
        },
        nextStepMap: {
          VERIFY_LENDER: "step-lender",
          DECLINE_REQUEST: "step-report",
        },
      },
      {
        stepId: "step-lender",
        screenType: "LENDER_CHECK",
        props: {
          lender: "{{merchantName}} Instant Cash",
        },
        validIntents: ["VERIFY_LENDER"],
        trapIntents: {},
        nextStepMap: { VERIFY_LENDER: "step-report" },
      },
      {
        stepId: "step-report",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Predatory Loan App",
          intro: "Log this unverified loan offer on 1930 / RBI Sachet and block the sender.",
          details: [
            { label: "App / Lender", value: "{{merchantName}} Instant Cash" },
            { label: "Offered Amount", value: `₹${displayAmount}` },
            { label: "Portal", value: "1930 · sachet.rbi.org.in" },
          ],
          reasons: ["Unregistered Instant Loan App", "Predatory Hidden Fees / No KFS", "Invasive Contacts / Gallery Permissions"],
          submitLabel: "Decline & file report",
          successText: "Predatory loan offer declined and reported in sandbox.",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];

    hints = {
      "step-loan": "Inspect the offer for zero-document / urgency red flags and choose 'Check RBI NBFC registration first'.",
      "step-lender": "Tap to verify whether this lender appears in the official RBI NBFC register.",
      "step-report": "Select the unregistered loan app reason and submit the report.",
    };
  }

  return {
    id,
    title,
    tagline,
    concept,
    relatedConcepts,
    difficulty,
    timeLimitSec: 120,
    linkedLibraryIds,
    intro: `Custom simulation generated from your scenario input: "${primaryBody.slice(0, 150)}${primaryBody.length > 150 ? "…" : ""}" Spot the red flags and pick the safest moves inside PracticeOS.`,
    variables: {
      amount: { min: 2000, max: 35000, step: 500 },
    },
    trigger: {
      type: "composable",
      payloadTemplate: {
        channel: "Custom Scenario",
        sender: `{{scammerName}} (${displayPhone})`,
        senderId: displayVpa,
        time: "{{time}}",
        body: primaryBody,
      },
    },
    steps,
    composableSteps,
    distractors: [],
    criticalActions,
    critical,
    redFlags: redFlagBundle.redFlags,
    hints,
    quizId,
    isCustom: true,
    createdAt: Date.now(),
  };
}
