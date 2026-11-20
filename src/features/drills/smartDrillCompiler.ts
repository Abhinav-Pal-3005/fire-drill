import type {
  ComposableDrillStep,
  ConceptId,
  Drill,
  RedFlag,
  Step,
  TrapIntent,
} from "@/types";

export type ScamTheme =
  | "auto"
  | "upi-collect"
  | "phishing-apk"
  | "authority-call"
  | "loan-trap"
  | "voice-clone";

export interface CompileScamInput {
  text: string;
  theme?: ScamTheme;
  title?: string;
}

type ResolvedTheme = Exclude<ScamTheme, "auto">;

function slugifyId(input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return clean || "scenario";
}

function stableShortHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

function extractTokens(text: string) {
  const amountMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]{2,12})/i);
  const urlMatch = text.match(
    /(?:https?:\/\/|bit\.ly\/|tinyurl\.com\/|wa\.me\/)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/i,
  );
  const apkMatch = text.match(/[A-Za-z0-9._-]+\.apk\b/i);
  const upiMatch = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z]{2,20}/);
  const phoneMatch = text.match(/(?:\+91[-\s]?)?[6-9]\d{2}[X\d\-\s]{4,10}\d/);

  return {
    amount: amountMatch?.[1] ?? "4,500",
    url: urlMatch?.[0] ?? "",
    apk: apkMatch?.[0] ?? "",
    upi: upiMatch?.[0] ?? "verify.help@okaxis",
    phone: phoneMatch?.[0]?.trim() ?? "+91-98XXX-4120",
  };
}

function detectTheme(text: string, requested?: ScamTheme): ResolvedTheme {
  if (requested && requested !== "auto") return requested;
  const lower = text.toLowerCase();

  if (
    /\.apk\b|electricity|power\s*(supply|cut|disconnect)|kyc|bit\.ly|http:\/\/|https:\/\/|pan\s*update|link/.test(
      lower,
    )
  ) {
    return "phishing-apk";
  }
  if (/police|cbi|customs|fedex|courier|parcel|trai|digital\s*arrest|warrant|narcotics|court/.test(lower)) {
    return "authority-call";
  }
  if (/loan|pre-approved|emi|credit\s*limit|lender|interest|disburs/.test(lower)) {
    return "loan-trap";
  }
  if (/voice|hospital|accident|mom|dad|mother|father|brother|sister|relative|emergency/.test(lower)) {
    return "voice-clone";
  }
  return "upi-collect";
}

function extractRedFlagsFromText(
  text: string,
  tokens: ReturnType<typeof extractTokens>,
  theme: ResolvedTheme,
): { redFlags: RedFlag[]; phrases: string[] } {
  const candidates: Array<{ fragment: string; label: string; explanation: string }> = [];

  if (tokens.apk) {
    candidates.push({
      fragment: tokens.apk,
      label: "Suspicious .apk installer",
      explanation: "Genuine providers never ask you to sideload .apk files sent via SMS or chat.",
    });
  }
  if (tokens.url) {
    candidates.push({
      fragment: tokens.url,
      label: "Unverified external link",
      explanation: "Shortened or unknown URLs hide lookalike phishing pages designed to capture OTPs or logins.",
    });
  }
  if (tokens.upi && text.includes(tokens.upi)) {
    candidates.push({
      fragment: tokens.upi,
      label: "Unverified UPI handle",
      explanation: "Fraudsters route payments through personal or temporary mule handles unrelated to official brands.",
    });
  }
  if (tokens.phone && text.includes(tokens.phone)) {
    candidates.push({
      fragment: tokens.phone,
      label: "Unverified phone number",
      explanation: "Official alerts do not route critical verification through random mobile numbers.",
    });
  }

  const urgencyMatch = text.match(
    /(immediately|today|tonight|within \d+ (?:min|mins|minutes|hours)|blocked|suspended|disconnected|arrest|urgent|right now|scan (?:this )?qr|enter (?:your )?(?:upi )?pin|otp)/i,
  );
  if (urgencyMatch) {
    candidates.push({
      fragment: urgencyMatch[0],
      label: "Urgency or credential trap",
      explanation: "Artificial deadlines and PIN/OTP demands rush you before you can verify independently.",
    });
  }

  if (candidates.length === 0) {
    const words = text.trim().split(/\s+/);
    const snippet = words.slice(0, Math.min(5, words.length)).join(" ");
    if (snippet) {
      candidates.push({
        fragment: snippet,
        label: "Unsolicited financial claim",
        explanation: "Unexpected requests involving money, links, or credentials should always be verified via official apps.",
      });
    }
  }

  const redFlags: RedFlag[] = candidates.slice(0, 3).map((c, idx) => ({
    id: `custom-rf-${theme}-${idx + 1}`,
    textFragment: c.fragment,
    label: c.label,
    explanation: c.explanation,
  }));

  return {
    redFlags,
    phrases: redFlags.map((r) => r.textFragment),
  };
}

const THEME_DEFAULTS: Record<
  ResolvedTheme,
  {
    title: string;
    concept: ConceptId;
    quizId: string;
    tagline: string;
  }
> = {
  "upi-collect": {
    title: "Custom UPI / QR Trap",
    concept: "upi-safety",
    quizId: "upi-safety",
    tagline: "Custom scenario practising how to spot collect requests and protect your UPI PIN.",
  },
  "phishing-apk": {
    title: "Custom Phishing / APK Alert",
    concept: "phishing-indicators",
    quizId: "phishing-indicators",
    tagline: "Custom scenario practising how to reject suspicious links, .apk installers, and OTP traps.",
  },
  "authority-call": {
    title: "Custom Authority Impersonation",
    concept: "fraud-response",
    quizId: "digital-arrest",
    tagline: "Custom scenario practising how to hang up on fake police, customs, or parcel threats.",
  },
  "loan-trap": {
    title: "Custom Instant Loan Trap",
    concept: "interest-credit",
    quizId: "interest-credit",
    tagline: "Custom scenario practising how to verify RBI lender registration and reject predatory loan offers.",
  },
  "voice-clone": {
    title: "Custom Emergency Call Scam",
    concept: "fraud-response",
    quizId: "fraud-response",
    tagline: "Custom scenario practising out-of-band callback verification before rushing an urgent transfer.",
  },
};

/**
 * Deterministic offline scam-to-drill compiler.
 * Produces a schema-valid Composable Drill matching Firestore ID constraints (`^[a-zA-Z0-9_-]{1,64}$`).
 */
export function compileScamToDrill(input: CompileScamInput): Drill {
  const cleanText = input.text.trim();
  const theme = detectTheme(cleanText, input.theme);
  const meta = THEME_DEFAULTS[theme];
  const tokens = extractTokens(cleanText);
  const { redFlags, phrases } = extractRedFlagsFromText(cleanText, tokens, theme);

  const resolvedTitle = input.title?.trim() || meta.title;
  const slug = slugifyId(resolvedTitle);
  const hash = stableShortHash(`${theme}:${cleanText}`);
  const id = `custom-${slug}-${hash}`.slice(0, 64);

  let composableSteps: ComposableDrillStep[] = [];
  let steps: Step[] = [];
  let hints: Record<string, string> = {};
  let criticalActions: TrapIntent[] = ["ENTER_UPI_PIN"];
  let critical = {
    title: "You fell for a critical scam action",
    explanation:
      "Never approve collect requests, share OTPs, install unknown APKs, or transfer verification fees. Freeze accounts via your bank helpline and report to 1930.",
    reason: "Practise rejecting pressure tactics on your custom scenario.",
    concept: meta.concept,
  };

  if (theme === "upi-collect") {
    composableSteps = [
      {
        stepId: "custom-step-1",
        screenType: "SMS_INBOX",
        notification: {
          app: "Messages",
          title: resolvedTitle,
          body: cleanText.slice(0, 110),
          urgent: true,
        },
        props: {
          title: "Incoming Message",
          subtitle: "Tap suspicious details before deciding",
          sender: tokens.phone,
          time: "{{time}}",
          channel: "Chat / SMS",
          body: cleanText,
          actions: [
            { intent: "OPEN_UPI_APP", label: "Open {{app}} directly to verify" },
            ...(tokens.url ? [{ intent: "CLICK_EXTERNAL_LINK", label: `Open ${tokens.url}` }] : []),
            { intent: "IGNORE_MESSAGE", label: "Ignore prompt & inspect in official app" },
          ],
        },
        redFlagPhrases: phrases,
        validIntents: ["OPEN_UPI_APP", "IGNORE_MESSAGE"],
        trapIntents: {
          CLICK_EXTERNAL_LINK: "Links inside unsolicited payment claims open fake collect prompts.",
        },
        nextStepMap: {
          OPEN_UPI_APP: "custom-step-2",
          IGNORE_MESSAGE: "custom-step-2",
        },
      },
      {
        stepId: "custom-step-2",
        screenType: "COLLECT_SHEET",
        notification: {
          app: "{{app}}",
          title: `Collect request ₹${tokens.amount}`,
          body: `From ${tokens.upi}`,
          urgent: true,
        },
        props: {
          appName: "{{app}}",
          requesterName: "{{scammerName}}",
          upiId: tokens.upi,
          amount: tokens.amount,
          note: cleanText.slice(0, 48),
          directionLabel: "Collect request · Money leaves your account",
          warningText: "Receiving money never requires approving a collect sheet or entering your UPI PIN.",
          approveLabel: `Pay ₹${tokens.amount}`,
          declineLabel: "Decline request",
        },
        redFlagPhrases: [tokens.upi],
        validIntents: ["DECLINE_REQUEST"],
        trapIntents: {
          ACCEPT_COLLECT: `Approving sends ₹${tokens.amount} OUT of your bank account to ${tokens.upi}.`,
        },
        nextStepMap: {
          ACCEPT_COLLECT: "custom-pin-trap",
          DECLINE_REQUEST: "custom-step-3",
        },
      },
      {
        stepId: "custom-pin-trap",
        screenType: "PIN_PAD",
        props: { isTrapBranch: true, pinMode: "pin" },
        validIntents: ["DECLINE_REQUEST"],
        trapIntents: {
          ENTER_UPI_PIN: "Entering your UPI PIN authorises money to leave your account immediately.",
        },
        nextStepMap: { DECLINE_REQUEST: "custom-step-3" },
      },
      {
        stepId: "custom-step-3",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Block & Report to 1930",
          intro: `Block ${tokens.upi} and log the scam text for fraud takedown.`,
          details: [
            { label: "Suspicious VPA", value: tokens.upi },
            { label: "Amount", value: `₹${tokens.amount}` },
          ],
          reasons: ["UPI collect / QR trap", "Fake refund claim", "Spam"],
          submitLabel: "Block VPA & report on 1930",
          successText: "Handle blocked and incident reported (sandbox).",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];
    steps = [
      {
        id: "custom-step-1",
        label: "Open official payment app directly instead of links",
        actionKey: "OPEN_UPI_APP",
        order: 1,
        weight: 2,
        mandatory: true,
        cue: "Inspect the message red flags and open your UPI app directly.",
        explanation: "Opening your official app prevents falling for spoofed payment links.",
        mistakeConcept: "upi-safety",
      },
      {
        id: "custom-step-2",
        label: `Decline the ₹${tokens.amount} collect request`,
        actionKey: "DECLINE_REQUEST",
        order: 2,
        weight: 3,
        mandatory: true,
        cue: "Decline any collect sheet asking you to pay or enter a PIN to receive money.",
        explanation: "Collect requests only debit funds; declining stops the scam immediately.",
        mistakeConcept: "upi-safety",
      },
      {
        id: "custom-step-3",
        label: "Block the handle and file a 1930 report",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Submit the suspicious VPA to block future requests.",
        explanation: "Reporting helps fraud teams block mule UPI handles.",
        mistakeConcept: "fraud-response",
      },
    ];
    hints = {
      "custom-step-1": "Tap suspicious phrases inside the message, then open {{app}} directly.",
      "custom-step-2": "Never pay a collect sheet for a refund or prize—tap Decline request.",
      "custom-step-3": "Select a reason and submit the complaint to finish.",
    };
    criticalActions = ["ENTER_UPI_PIN"];
    critical = {
      title: "You entered your UPI PIN on a collect request",
      explanation: `Entering a UPI PIN sends ₹${tokens.amount} to ${tokens.upi}. Receiving money never requires a PIN. Call your bank and 1930 immediately if compromised.`,
      reason: "Rehearse declining collect requests without entering your PIN.",
      concept: "upi-safety",
    };
  } else if (theme === "phishing-apk") {
    const hasApk = Boolean(tokens.apk);
    composableSteps = [
      {
        stepId: "custom-step-1",
        screenType: "SMS_INBOX",
        notification: {
          app: "Messages",
          title: resolvedTitle,
          body: cleanText.slice(0, 110),
          urgent: true,
        },
        props: {
          title: "SMS / Chat Inbox",
          subtitle: "Tap suspicious phrases before acting",
          sender: tokens.phone,
          time: "{{time}}",
          channel: "SMS",
          body: cleanText,
          actions: [
            ...(hasApk
              ? [{ intent: "INSTALL_APK", label: `Download & install ${tokens.apk}` }]
              : [{ intent: "CLICK_EXTERNAL_LINK", label: `Open ${tokens.url || "verification link"}` }]),
            { intent: "BLOCK_SENDER", label: "Block sender & verify in official app" },
            { intent: "SHARE_OTP", label: "Reply with OTP to stop block" },
          ],
        },
        redFlagPhrases: phrases,
        validIntents: ["BLOCK_SENDER", "IGNORE_MESSAGE"],
        trapIntents: {
          INSTALL_APK: `Installing ${tokens.apk || "an unverified APK"} lets attackers read your SMS OTPs remotely.`,
          CLICK_EXTERNAL_LINK: "External links in threat messages steal bank logins and OTPs.",
          SHARE_OTP: "Sharing an OTP lets fraudsters drain your account immediately.",
        },
        nextStepMap: {
          BLOCK_SENDER: "custom-step-2",
          IGNORE_MESSAGE: "custom-step-2",
        },
      },
      {
        stepId: "custom-step-2",
        screenType: "BALANCE_VIEW",
        props: {
          balance: "{{balance}}",
          note: "Account status checked directly. No unauthorised debit occurred.",
          actions: [{ intent: "CHECK_BALANCE", label: "Confirm account safe & report sender" }],
        },
        validIntents: ["CHECK_BALANCE"],
        trapIntents: {},
        nextStepMap: { CHECK_BALANCE: "custom-step-3" },
      },
      {
        stepId: "custom-step-3",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Phishing Alert to 1930",
          intro: "Submit the phishing sender, link, or APK filename to block it.",
          details: [
            { label: "Sender", value: tokens.phone },
            { label: "Indicator", value: tokens.apk || tokens.url || "Phishing SMS" },
          ],
          reasons: ["Phishing link / fake KYC", "Malicious APK attachment", "Impersonation"],
          submitLabel: "Block & report on 1930",
          successText: "Phishing indicator reported (sandbox).",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];
    steps = [
      {
        id: "custom-step-1",
        label: "Reject the phishing link / APK and block sender",
        actionKey: "BLOCK_SENDER",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "Never install .apk files or open urgency links from messages.",
        explanation: "Blocking and verifying inside official apps keeps credentials safe.",
        mistakeConcept: "phishing-indicators",
      },
      {
        id: "custom-step-2",
        label: "Verify account safety directly in your banking view",
        actionKey: "CHECK_BALANCE",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "Check your official balance directly to confirm nothing changed.",
        explanation: "Official apps show real account notices without external links.",
        mistakeConcept: "phishing-indicators",
      },
      {
        id: "custom-step-3",
        label: "Report the phishing message to 1930",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Report the suspicious link, APK, and phone number.",
        explanation: "Reporting speeds up takedown of phishing domains and numbers.",
        mistakeConcept: "fraud-response",
      },
    ];
    hints = {
      "custom-step-1": "Block the sender—never tap links, download APKs, or share OTPs.",
      "custom-step-2": "Confirm your balance is untouched and proceed to reporting.",
      "custom-step-3": "Pick a phishing reason and submit the complaint.",
    };
    criticalActions = ["INSTALL_APK", "SHARE_OTP"];
    critical = {
      title: "You opened a dangerous APK or shared an OTP",
      explanation:
        "Malicious APKs and phishing links intercept SMS OTPs and banking logins. Enable Aeroplane Mode, remove unknown apps, notify your bank, and dial 1930.",
      reason: "Rehearse rejecting unverified links and .apk files.",
      concept: "phishing-indicators",
    };
  } else if (theme === "loan-trap") {
    composableSteps = [
      {
        stepId: "custom-step-1",
        screenType: "LOAN_OFFER",
        notification: {
          app: "Messages",
          title: resolvedTitle,
          body: cleanText.slice(0, 110),
          urgent: true,
        },
        props: {
          lender: tokens.upi.split("@")[0] || "Instant Credit App",
          amount: tokens.amount,
          subtitle: "Unverified loan offer",
          termsNote: cleanText,
          actions: [
            { intent: "VERIFY_LENDER", label: "Check RBI NBFC registration first" },
            { intent: "APPROVE_LOAN", label: `Accept ₹${tokens.amount} instant loan now` },
          ],
        },
        redFlagPhrases: phrases,
        validIntents: ["VERIFY_LENDER", "DECLINE_REQUEST"],
        trapIntents: {
          APPROVE_LOAN: "Approving unregistered loan apps exposes your contacts and triggers predatory hidden fees.",
        },
        nextStepMap: {
          VERIFY_LENDER: "custom-step-2",
          DECLINE_REQUEST: "custom-step-2",
        },
      },
      {
        stepId: "custom-step-2",
        screenType: "LENDER_CHECK",
        props: {
          lender: tokens.upi.split("@")[0] || "Instant Credit App",
        },
        validIntents: ["VERIFY_LENDER"],
        trapIntents: {},
        nextStepMap: { VERIFY_LENDER: "custom-step-3" },
      },
      {
        stepId: "custom-step-3",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Report Predatory Loan Offer",
          intro: "Report unregistered instant-loan offers and revoke app permissions.",
          details: [
            { label: "Sender", value: tokens.phone },
            { label: "Offer amount", value: `₹${tokens.amount}` },
          ],
          reasons: ["Unregistered loan app", "Hidden charges / harassment risk", "Spam"],
          submitLabel: "Decline & file 1930 report",
          successText: "Loan offer declined and reported (sandbox).",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];
    steps = [
      {
        id: "custom-step-1",
        label: "Inspect the offer and initiate lender verification",
        actionKey: "VERIFY_LENDER",
        order: 1,
        weight: 2,
        mandatory: true,
        cue: "Never accept an instant loan without checking official RBI registration.",
        explanation: "Scam loan apps lure borrowers with pre-approved amounts before harvesting contacts.",
        mistakeConcept: "interest-credit",
      },
      {
        id: "custom-step-2",
        label: "Verify lender registration in the lookup tool",
        actionKey: "VERIFY_LENDER",
        order: 2,
        weight: 3,
        mandatory: true,
        cue: "Search the lender name to confirm whether it is a registered NBFC.",
        explanation: "Checking registration reveals unregistered predatory lenders immediately.",
        mistakeConcept: "interest-credit",
      },
      {
        id: "custom-step-3",
        label: "Decline and report the unverified lender",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "Report unregistered loan harassment attempts to 1930.",
        explanation: "Declining and reporting prevents permission abuse and extortion.",
        mistakeConcept: "fraud-response",
      },
    ];
    hints = {
      "custom-step-1": "Choose 'Check RBI NBFC registration first' instead of approving the offer.",
      "custom-step-2": "Tap 'Check registration' on the lookup screen.",
      "custom-step-3": "Pick a reason and submit the complaint to finish.",
    };
    criticalActions = ["APPROVE_LOAN"];
    critical = {
      title: "You accepted an unverified loan offer",
      explanation:
        "Unregistered loan apps demand contacts/gallery access and charge hidden fees or harass borrowers. Verify lenders on RBI Sachet / official lists before applying.",
      reason: "Practise verifying lender registration before accepting any loan.",
      concept: "interest-credit",
    };
  } else {
    // authority-call & voice-clone share safe call-rejection -> balance verification -> 1930 flow
    const isAuthority = theme === "authority-call";
    composableSteps = [
      {
        stepId: "custom-step-1",
        screenType: "INCOMING_CALL",
        notification: {
          app: isAuthority ? "Video / Voice Call" : "Phone · Unknown",
          title: resolvedTitle,
          body: cleanText.slice(0, 110),
          urgent: true,
        },
        props: {
          title: isAuthority ? "Incoming Authority Call" : "Incoming Emergency Call",
          callerName: isAuthority ? "{{callerAgency}}" : "Sounds like {{relativeRole}}",
          maskedPhone: tokens.phone,
          agency: isAuthority ? "{{callerAgency}}" : "Unverified Caller",
          channel: isAuthority ? "Video Call" : "Voice Call",
          isVideo: isAuthority,
          transcript: cleanText,
          extraActions: [
            { intent: "ACCEPT_COLLECT", label: `Transfer ₹${tokens.amount} to ${tokens.upi}` },
            { intent: "SHARE_OTP", label: "Share OTP / Aadhaar details" },
          ],
        },
        redFlagPhrases: phrases,
        validIntents: ["HANG_UP_CALL", "VERIFY_LENDER"],
        trapIntents: {
          ANSWER_CALL: "Staying on an intimidation or panic call gives scammers time to manipulate you.",
          ACCEPT_COLLECT: `Never transfer ₹${tokens.amount} to ${tokens.upi} during an unsolicited call.`,
          SHARE_OTP: "Never read OTPs or sensitive ID codes over an incoming call.",
        },
        nextStepMap: {
          HANG_UP_CALL: "custom-step-2",
          VERIFY_LENDER: "custom-step-2",
        },
      },
      {
        stepId: "custom-step-2",
        screenType: "BALANCE_VIEW",
        props: {
          balance: "{{balance}}",
          note: "Verified safely out-of-band. No funds were transferred.",
          actions: [{ intent: "CHECK_BALANCE", label: "Confirm balance safe & file report" }],
        },
        validIntents: ["CHECK_BALANCE"],
        trapIntents: {},
        nextStepMap: { CHECK_BALANCE: "custom-step-3" },
      },
      {
        stepId: "custom-step-3",
        screenType: "COMPLAINT_FORM",
        props: {
          title: "Block & Report to 1930",
          intro: "Submit the impersonation caller number and demanded UPI handle to 1930.",
          details: [
            { label: "Caller", value: tokens.phone },
            { label: "Handle", value: tokens.upi },
          ],
          reasons: [
            isAuthority ? "Fake police / customs intimidation" : "Voice impersonation emergency",
            "Urgent money demand",
            "Impersonation",
          ],
          submitLabel: "Block caller & report on 1930",
          successText: "Caller blocked and incident reported on 1930 (sandbox).",
        },
        validIntents: ["FILE_1930_REPORT", "BLOCK_SENDER"],
        trapIntents: {},
        nextStepMap: { FILE_1930_REPORT: "__FINISH__", BLOCK_SENDER: "__FINISH__" },
      },
    ];
    steps = [
      {
        id: "custom-step-1",
        label: "Hang up and verify independently",
        actionKey: "HANG_UP_CALL",
        order: 1,
        weight: 3,
        mandatory: true,
        cue: "Hang up immediately instead of staying on the panic call or transferring money.",
        explanation: "Breaking isolation and calling saved numbers stops impersonation scams immediately.",
        mistakeConcept: "fraud-response",
      },
      {
        id: "custom-step-2",
        label: "Confirm your account balance remained untouched",
        actionKey: "CHECK_BALANCE",
        order: 2,
        weight: 2,
        mandatory: true,
        cue: "Verify your official balance after disconnecting safely.",
        explanation: "Confirming your balance ensures zero unauthorised transfers occurred.",
        mistakeConcept: "fraud-response",
      },
      {
        id: "custom-step-3",
        label: "Report the impersonation call on 1930",
        actionKey: "FILE_1930_REPORT",
        order: 3,
        weight: 2,
        mandatory: true,
        cue: "File a complaint with the caller's number and handle.",
        explanation: "Reporting helps authorities disconnect scam numbers quickly.",
        mistakeConcept: "fraud-response",
      },
    ];
    hints = {
      "custom-step-1": "Tap Hang up immediately—real agencies or family members can be verified on official/saved numbers.",
      "custom-step-2": "Review your balance screen and continue to the 1930 complaint form.",
      "custom-step-3": "Pick an impersonation reason and submit the complaint.",
    };
    criticalActions = ["ACCEPT_COLLECT", "SHARE_OTP"];
    critical = {
      title: "You complied with an impersonation call",
      explanation:
        "Never stay isolated on a panic call, share OTPs, or send verification transfers. Hang up, verify via saved official contacts, and report to 1930 immediately.",
      reason: "Rehearse hanging up immediately on high-pressure impersonation calls.",
      concept: "fraud-response",
    };
  }

  return {
    id,
    title: resolvedTitle,
    tagline: meta.tagline,
    concept: meta.concept,
    relatedConcepts: ["upi-safety", "fraud-response"],
    difficulty: "medium",
    timeLimitSec: 120,
    linkedLibraryIds: [],
    intro: `Practice how to handle this real-world prompt safely: "${cleanText.slice(0, 140)}${cleanText.length > 140 ? "…" : ""}"`,
    variables: {
      app: ["PayWave", "UPIGo", "QuickPay", "FlashUPI"],
      bank: ["Astra Bank", "Apex Trust Bank", "NeoCommerce Bank"],
      amount: [tokens.amount],
    },
    trigger: {
      type: "composable",
      payloadTemplate: {
        sender: tokens.phone,
        time: "{{time}}",
        channel: theme === "authority-call" ? "Video Call" : "SMS / Call",
        senderId: tokens.upi,
        body: cleanText,
      },
    },
    steps,
    composableSteps,
    distractors: [],
    criticalActions,
    critical,
    redFlags,
    hints,
    quizId: meta.quizId,
    isCustom: true,
    createdAt: Date.now(),
  };
}
