import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * PracticeOS — Standalone Simulated Smartphone Environment & Event Director
 *
 * Boots directly into a realistic Android-style smartphone chassis with:
 *  - Lock Screen with live clock, notifications, flashlight/camera shortcuts & swipe/tap unlock
 *  - Frosted-glass Quick Settings & Notification Shade (brightness, Wi-Fi, Data, Sound, DND)
 *  - Home Screen Launcher with At-a-Glance widget, collapsible Mission & Coach Pill,
 *    gradient squircle app icons with unread badges, and frosted-glass dock
 *  - Realistic native apps: PayEasy (UPI + NPCI PIN keypad trap), Messages (SMS),
 *    ChatNest (live typing indicator + chat), Sunrise Bank, Phone (T9 dialer + 1930 helpline
 *    + full-screen incoming scam call), Browser, and Settings
 *  - End-of-Drill Debrief Sheet upon completing all safe steps
 */

// ============================================================================
// 1. DATA CONTRACTS & SCENARIO DEFINITIONS
// ============================================================================

export type AppId =
  | 'payeasy'
  | 'messages'
  | 'chatnest'
  | 'sunrise'
  | 'phone'
  | 'browser'
  | 'settings';

export type ScreenLayout =
  | 'list'
  | 'thread'
  | 'detail'
  | 'dialer'
  | 'keypad';

export interface Block {
  id: string;
  kind: 'info' | 'message' | 'field' | 'warning' | 'transaction';
  sender?: string;
  senderMeta?: string;
  avatarText?: string;
  avatarColor?: string;
  title?: string;
  body: string;
  timestamp?: string;
  isIncoming?: boolean;
  unread?: boolean;
  classification?: 'legit' | 'scam';
  linkLabel?: string;
  linkTargetAppId?: AppId;
  linkTargetScreenId?: string;
  openAppId?: AppId;
  openScreenId?: string;
}

export interface Action {
  id: string;
  label: string;
  priority?: 'primary' | 'secondary';
  grantsStepId?: string;
  triggersUnsafeId?: string;
  trapLesson?: string;
  phishingClueNote?: string;
  nextAppId?: AppId;
  nextScreenId?: string;
  feedbackMessage: string;
}

export interface PhoneScreen {
  id: string;
  title: string;
  subtitle?: string;
  layout: ScreenLayout;
  keypadHint?: string;
  keypadTrapUnsafeId?: string;
  keypadTrapMessage?: string;
  dialNumbers?: Array<{
    number: string;
    label: string;
    targetScreenId: string;
  }>;
  blocks: Block[];
  actions: Action[];
}

export interface PhoneApp {
  id: AppId;
  name: string;
  subtitle: string;
  gradientClass: string;
  accentColor: string;
  glyph: string;
  homeScreenId: string;
  screens: Record<string, PhoneScreen>;
}

export type Trigger =
  | { type: 'atSecond'; seconds: number }
  | { type: 'afterAction'; actionId: string }
  | { type: 'ifIdleFor'; seconds: number }
  | { type: 'onAppOpened'; appId: AppId }
  | { type: 'onScreenShown'; screenId: string };

export interface CallReplyOption {
  id: string;
  label: string;
  grantsStepId?: string;
  triggersUnsafeId?: string;
  trapLesson?: string;
  nextAppId?: AppId;
  nextScreenId?: string;
  endCall?: boolean;
  feedbackMessage: string;
}

export type EventPayload =
  | {
      type: 'notification';
      appId: AppId;
      screenId: string;
      appName: string;
      title: string;
      body: string;
    }
  | {
      type: 'chatMessage';
      appId: AppId;
      screenId: string;
      sender: string;
      body: string;
    }
  | {
      type: 'incomingCall';
      callerName: string;
      callerNumber: string;
      pressureTag: string;
      dialogueLines: string[];
      replies: CallReplyOption[];
    }
  | {
      type: 'changeBattery';
      batteryPercent: number;
    };

export interface ScriptEvent {
  id: string;
  trigger: Trigger;
  event: EventPayload;
  label?: 'legit' | 'scam';
}

export interface DrillStep {
  id: string;
  stepId: string;
  title: string;
  where: AppId;
  screen?: string;
  prompt: string;
  focusApps: AppId[];
  coachTips: {
    nudge: string;
    direction: string;
    spotlight: string;
  };
  successFeedback: string;
}

export interface ScenarioDefinition {
  id: string;
  shortName: string;
  title: string;
  conceptTag: string;
  goal: string;
  goldenRule: string;
  youAre: string;
  startTime: string;
  startDate: string;
  weatherText: string;
  initialBattery: number;
  homeApps: AppId[];
  dockApps: AppId[];
  steps: DrillStep[];
  appDefinitions: Record<AppId, PhoneApp>;
  inbox: ScriptEvent[];
  script: ScriptEvent[];
}

export interface ActionLogEntry {
  timestampSec: number;
  appId: string;
  screenId: string;
  actionId: string;
  label: string;
}

// ============================================================================
// 2. DETERMINISTIC EVENT DIRECTOR
// ============================================================================

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function evaluateDirectorTriggers(
  script: readonly ScriptEvent[],
  ctx: {
    elapsedSeconds: number;
    idleSeconds: number;
    currentAppId: AppId | null;
    currentScreenId: string | null;
    completedActionIds: ReadonlySet<string>;
    firedEventIds: ReadonlySet<string>;
    seedKey: string;
  }
): ScriptEvent[] {
  const rng = mulberry32(hashSeed(ctx.seedKey));
  const jitterOffset = Math.floor(rng() * 2); // 0 or 1s deterministic jitter
  const due: ScriptEvent[] = [];

  for (const item of script) {
    if (ctx.firedEventIds.has(item.id)) {
      continue;
    }
    const trig = item.trigger;
    if (
      trig.type === 'atSecond' &&
      ctx.elapsedSeconds >= trig.seconds + jitterOffset
    ) {
      due.push(item);
    } else if (
      trig.type === 'ifIdleFor' &&
      ctx.idleSeconds >= trig.seconds + jitterOffset
    ) {
      due.push(item);
    } else if (
      trig.type === 'afterAction' &&
      ctx.completedActionIds.has(trig.actionId)
    ) {
      due.push(item);
    } else if (trig.type === 'onAppOpened' && ctx.currentAppId === trig.appId) {
      due.push(item);
    } else if (
      trig.type === 'onScreenShown' &&
      ctx.currentScreenId === trig.screenId
    ) {
      due.push(item);
    }
  }
  return due;
}

// ============================================================================
// 3. SCENARIOS CATALOG (UPI Collect Request Scam + Bank KYC Smishing SMS)
// ============================================================================

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'upi_collect_scam',
    shortName: 'Scenario 1 · UPI Collect Scam',
    title: 'Fake Marketplace Refund Request',
    conceptTag: 'UPI Collect Request Scam',
    goal: 'Protect your ₹18,450 balance from a fake refund collect request.',
    goldenRule:
      'A UPI PIN is ONLY needed when money leaves your bank account — never to receive a refund.',
    youAre: 'Priya, selling a sofa on MarketMall',
    startTime: '6:42',
    startDate: 'Thu, 19 Nov',
    weatherText: '24°C Clear',
    initialBattery: 74,
    homeApps: [
      'payeasy',
      'messages',
      'chatnest',
      'sunrise',
      'phone',
      'browser',
      'settings',
    ],
    dockApps: ['phone', 'messages', 'payeasy', 'browser'],
    steps: [
      {
        id: 'st_1',
        stepId: 'inspect_sms',
        title: 'Inspect the SMS Alert',
        where: 'messages',
        screen: 'sms_thread_scam',
        prompt: 'Does the refund text come from an official bank header?',
        focusApps: ['messages'],
        coachTips: {
          nudge:
            'Look closely at the sender ID (VK-PAYEZY) and the unencrypted http:// link.',
          direction:
            'Open Messages and tap the VK-PAYEZY conversation to inspect it.',
          spotlight:
            'Compare both neutral choices below the message bubble before deciding.',
        },
        successFeedback: '✓ Phishing SMS flagged! Now check PayEasy.',
      },
      {
        id: 'st_2',
        stepId: 'decline_collect',
        title: 'Review Collect Request',
        where: 'payeasy',
        screen: 'payeasy_request',
        prompt: 'Will approving this request SEND money or RECEIVE money?',
        focusApps: ['payeasy'],
        coachTips: {
          nudge:
            'Check whether ₹4,500 is being debited FROM your account or credited to you.',
          direction:
            'Open PayEasy and inspect the pending ₹4,500 collect request.',
          spotlight:
            'Read both decision buttons carefully — approving asks for your UPI PIN.',
        },
        successFeedback: '✓ Collect request declined! ₹4,500 stayed safe.',
      },
      {
        id: 'st_3',
        stepId: 'verify_balance',
        title: 'Confirm Bank Balance',
        where: 'sunrise',
        screen: 'sb_home',
        prompt: 'Did any money leave your Sunrise Bank savings account?',
        focusApps: ['sunrise'],
        coachTips: {
          nudge:
            'Check your official bank ledger to confirm zero unauthorized debits.',
          direction:
            'Open Sunrise Bank and confirm your ₹18,450.00 balance.',
          spotlight: 'Tap the confirmation action below your account card.',
        },
        successFeedback: '✓ Account verified at ₹18,450.00!',
      },
    ],
    appDefinitions: {
      payeasy: {
        id: 'payeasy',
        name: 'PayEasy',
        subtitle: 'Priya · priya@payeasy',
        gradientClass: 'from-blue-500 to-indigo-700',
        accentColor: '#1D4ED8',
        glyph: '₹',
        homeScreenId: 'payeasy_home',
        screens: {
          payeasy_home: {
            id: 'payeasy_home',
            title: 'PayEasy UPI',
            subtitle: 'Priya · priya@payeasy',
            layout: 'detail',
            blocks: [
              {
                id: 'pe_bank_card',
                kind: 'field',
                title: 'Sunrise Bank ••4821 · Primary',
                body: '₹18,450.00',
              },
              {
                id: 'pe_collect_banner',
                kind: 'warning',
                title: 'Pending Collect Request · ₹4,500',
                body: 'Rohan Verma (rohan.refund99@payeasy-sim) · Money will be DEBITED from your bank if approved.',
              },
            ],
            actions: [
              {
                id: 'act_pe_open_req',
                label: 'Inspect Collect Request (₹4,500)',
                priority: 'primary',
                nextScreenId: 'payeasy_request',
                feedbackMessage: 'Opened collect request details.',
              },
              {
                id: 'act_pe_tx_hist',
                label: 'Recent UPI Transactions',
                priority: 'primary',
                nextScreenId: 'payeasy_history',
                feedbackMessage: 'Viewed recent UPI transactions.',
              },
            ],
          },
          payeasy_request: {
            id: 'payeasy_request',
            title: 'Collect Request · ₹4,500',
            subtitle: 'Money will be DEBITED from your bank',
            layout: 'detail',
            blocks: [
              {
                id: 'req_payee',
                kind: 'field',
                title: 'Requester UPI ID',
                body: 'Rohan Verma (rohan.refund99@payeasy-sim)',
              },
              {
                id: 'req_debit_warn',
                kind: 'warning',
                title: 'Transaction Direction: DEBIT',
                body: '₹4,500 will be DEDUCTED from Sunrise Bank ••4821.',
              },
              {
                id: 'req_note',
                kind: 'info',
                title: 'Requester Note',
                body: 'Sofa Refund — Enter UPI PIN to receive ₹4,500',
              },
            ],
            actions: [
              {
                id: 'act_decline_collect',
                label: 'Decline Collect Request',
                priority: 'primary',
                grantsStepId: 'decline_collect',
                nextAppId: 'sunrise',
                nextScreenId: 'sb_home',
                feedbackMessage:
                  'Declined collect request! ₹4,500 remained safely in your bank.',
              },
              {
                id: 'act_approve_pin_trap',
                label: 'Approve & Enter UPI PIN',
                priority: 'primary',
                nextScreenId: 'payeasy_pin_keypad',
                feedbackMessage:
                  'Opened UPI PIN screen — notice it authorizes a debit.',
              },
              {
                id: 'act_block_upi',
                label: 'Report & Block UPI ID',
                priority: 'secondary',
                phishingClueNote:
                  'Reported & blocked rohan.refund99@payeasy-sim',
                feedbackMessage: 'Reported and blocked requester UPI ID.',
              },
            ],
          },
          payeasy_pin_keypad: {
            id: 'payeasy_pin_keypad',
            title: 'NPCI UPI PIN',
            subtitle: 'Sunrise Bank ••4821 · PAYING ₹4,500 TO Rohan Verma',
            layout: 'keypad',
            keypadHint: 'ENTER 4-DIGIT UPI PIN',
            keypadTrapUnsafeId: 'entered_upi_pin_on_collect',
            keypadTrapMessage:
              'A UPI PIN is ONLY used to send money out of your account — never to receive a refund. Zero digits were stored.',
            blocks: [
              {
                id: 'pin_debit_info',
                kind: 'warning',
                title: 'PAYING ₹4,500 TO Rohan Verma',
                body: 'You are authorizing money to LEAVE your bank account.',
              },
            ],
            actions: [
              {
                id: 'act_cancel_pin',
                label: 'Go Back Safely',
                priority: 'primary',
                nextScreenId: 'payeasy_request',
                feedbackMessage: 'Exited UPI PIN keypad safely.',
              },
              {
                id: 'act_decline_from_pin',
                label: 'Decline Request Instead',
                priority: 'primary',
                grantsStepId: 'decline_collect',
                nextAppId: 'sunrise',
                nextScreenId: 'sb_home',
                feedbackMessage:
                  'Declined collect request! Your ₹18,450 is safe.',
              },
            ],
          },
          payeasy_history: {
            id: 'payeasy_history',
            title: 'Transaction History',
            subtitle: 'Sunrise Bank ••4821',
            layout: 'list',
            blocks: [
              {
                id: 'tx_1',
                kind: 'transaction',
                title: 'Metro Fresh Mart',
                body: 'Paid ₹240.00 · UPI Ref 6321894012',
                timestamp: 'Yesterday',
              },
              {
                id: 'tx_2',
                kind: 'transaction',
                title: 'City Metro Card Recharge',
                body: 'Paid ₹150.00 · UPI Ref 6320114892',
                timestamp: '16 Nov',
              },
            ],
            actions: [
              {
                id: 'act_pe_hist_back',
                label: 'Back to PayEasy Home',
                priority: 'primary',
                nextScreenId: 'payeasy_home',
                feedbackMessage: 'Returned to PayEasy home.',
              },
            ],
          },
        },
      },
      messages: {
        id: 'messages',
        name: 'Messages',
        subtitle: 'SMS & RCS',
        gradientClass: 'from-emerald-500 to-green-700',
        accentColor: '#15803D',
        glyph: '💬',
        homeScreenId: 'sms_inbox',
        screens: {
          sms_inbox: {
            id: 'sms_inbox',
            title: 'Messages',
            subtitle: '2 conversations · 1 unread',
            layout: 'list',
            blocks: [
              {
                id: 'sms_row_scam',
                kind: 'message',
                sender: 'VK-PAYEZY',
                senderMeta: 'Unknown SMS Header',
                avatarText: 'VK',
                avatarColor: '#B45309',
                title: 'Collect request ₹4,500',
                body: 'Rohan Verma sent ₹4,500 refund. Tap link or enter UPI PIN in PayEasy now.',
                timestamp: '6:41 PM',
                unread: true,
                classification: 'scam',
                openScreenId: 'sms_thread_scam',
              },
              {
                id: 'sms_row_legit',
                kind: 'message',
                sender: 'JD-DELIVR',
                senderMeta: 'Verified Business',
                avatarText: 'JD',
                avatarColor: '#0369A1',
                title: 'Package Out for Delivery',
                body: 'Your BookBazaar order #4821 is out for delivery today. No payment due.',
                timestamp: '5:50 PM',
                unread: false,
                classification: 'legit',
              },
            ],
            actions: [],
          },
          sms_thread_scam: {
            id: 'sms_thread_scam',
            title: 'VK-PAYEZY',
            subtitle: 'Unknown SMS Header · Unverified Link',
            layout: 'thread',
            blocks: [
              {
                id: 'sms_warn_banner',
                kind: 'warning',
                title: 'Unknown SMS Header · Unverified Link',
                body: 'Sender "VK-PAYEZY" is not verified and contains an unencrypted http:// link.',
              },
              {
                id: 'sms_bubble_scam',
                kind: 'message',
                sender: 'VK-PAYEZY',
                body: 'URGENT: Rohan Verma sent ₹4,500 refund. Claim via http://payezy-refund-sim.in or approve in PayEasy with your UPI PIN within 2 mins!',
                timestamp: '6:41 PM',
                isIncoming: true,
                classification: 'scam',
              },
            ],
            actions: [
              {
                id: 'act_flag_sms_suspicious',
                label: 'Mark Suspicious & Open PayEasy',
                priority: 'primary',
                grantsStepId: 'inspect_sms',
                phishingClueNote:
                  'Flagged spoofed VK-PAYEZY SMS & http:// link',
                nextAppId: 'payeasy',
                nextScreenId: 'payeasy_request',
                feedbackMessage:
                  'Marked SMS suspicious and opened PayEasy directly.',
              },
              {
                id: 'act_open_phish_link',
                label: 'Open Link in Browser',
                priority: 'primary',
                triggersUnsafeId: 'clicked_phishing_sms_link',
                trapLesson:
                  'Never tap unverified http:// links in urgent payment texts. Always open your official payment app directly.',
                feedbackMessage:
                  'Unsafe link intercepted in Practice Mode.',
              },
              {
                id: 'act_sms_back_inbox',
                label: 'Back to Inbox',
                priority: 'secondary',
                nextScreenId: 'sms_inbox',
                feedbackMessage: 'Returned to Messages inbox.',
              },
            ],
          },
        },
      },
      chatnest: {
        id: 'chatnest',
        name: 'ChatNest',
        subtitle: 'Instant Messaging',
        gradientClass: 'from-teal-500 to-cyan-700',
        accentColor: '#0F766E',
        glyph: '💭',
        homeScreenId: 'chat_list',
        screens: {
          chat_list: {
            id: 'chat_list',
            title: 'ChatNest',
            subtitle: 'Chats',
            layout: 'list',
            blocks: [
              {
                id: 'cn_row_scammer',
                kind: 'message',
                sender: 'Rohan Verma',
                senderMeta: 'Not in contacts',
                avatarText: 'RV',
                avatarColor: '#475569',
                body: 'I sent ₹4,500 request on PayEasy, tap Approve and type PIN!',
                timestamp: '6:42 PM',
                unread: true,
                classification: 'scam',
                openScreenId: 'chat_thread_rohan',
              },
              {
                id: 'cn_row_friend',
                kind: 'message',
                sender: 'Ananya',
                senderMeta: 'Saved Contact',
                avatarText: 'AN',
                avatarColor: '#059669',
                body: 'Are we still meeting at 7:15 PM near Metro Gate 2?',
                timestamp: '6:15 PM',
                unread: false,
                classification: 'legit',
              },
            ],
            actions: [],
          },
          chat_thread_rohan: {
            id: 'chat_thread_rohan',
            title: 'Rohan Verma',
            subtitle: 'Not in contacts · +91 9XXXX XXX12',
            layout: 'thread',
            blocks: [
              {
                id: 'cn_msg_1',
                kind: 'message',
                sender: 'Rohan Verma',
                body: 'Hi Priya, I am buying your sofa. Sending ₹4,500 advance now.',
                timestamp: '6:40 PM',
                isIncoming: true,
              },
              {
                id: 'cn_msg_2',
                kind: 'message',
                sender: 'Rohan Verma',
                body: 'Open pending request in PayEasy and enter your UPI PIN to receive ₹4,500.',
                timestamp: '6:42 PM',
                isIncoming: true,
                classification: 'scam',
              },
            ],
            actions: [
              {
                id: 'act_chat_switch_payeasy',
                label: 'Open PayEasy to Inspect Request',
                priority: 'primary',
                nextAppId: 'payeasy',
                nextScreenId: 'payeasy_request',
                feedbackMessage: 'Switched to PayEasy app.',
              },
              {
                id: 'act_chat_block',
                label: 'Block Contact',
                priority: 'primary',
                phishingClueNote: 'Blocked scammer on ChatNest',
                feedbackMessage: 'Blocked Rohan Verma on ChatNest.',
              },
            ],
          },
        },
      },
      sunrise: {
        id: 'sunrise',
        name: 'Sunrise Bank',
        subtitle: 'Official Banking',
        gradientClass: 'from-slate-800 via-blue-900 to-amber-600',
        accentColor: '#1E3A8A',
        glyph: '🏦',
        homeScreenId: 'sb_home',
        screens: {
          sb_home: {
            id: 'sb_home',
            title: 'Sunrise Bank',
            subtitle: 'Savings Account ••4821',
            layout: 'detail',
            blocks: [
              {
                id: 'sb_bal_card',
                kind: 'field',
                title: 'Available Balance · Savings ••4821',
                body: '₹18,450.00',
              },
              {
                id: 'sb_tx_1',
                kind: 'transaction',
                title: 'Metro Groceries',
                body: 'Debit -₹240.00 · Completed yesterday',
                timestamp: 'Yesterday',
              },
              {
                id: 'sb_status_ok',
                kind: 'info',
                title: 'Account Security Status',
                body: 'Zero unauthorized debits. All UPI collect mandates inactive.',
              },
            ],
            actions: [
              {
                id: 'act_confirm_balance',
                label: 'Confirm Balance Untouched',
                priority: 'primary',
                grantsStepId: 'verify_balance',
                feedbackMessage:
                  'Verified ₹18,450.00 untouched in Sunrise Bank!',
              },
              {
                id: 'act_sb_statement',
                label: 'Download Mini Statement',
                priority: 'primary',
                feedbackMessage: 'Viewed simulated mini statement.',
              },
            ],
          },
        },
      },
      phone: {
        id: 'phone',
        name: 'Phone',
        subtitle: 'Calls & 1930 Helpline',
        gradientClass: 'from-green-600 to-emerald-800',
        accentColor: '#166534',
        glyph: '📞',
        homeScreenId: 'phone_dialer',
        screens: {
          phone_dialer: {
            id: 'phone_dialer',
            title: 'Phone',
            subtitle: 'Simulated Dialer & Helplines',
            layout: 'dialer',
            dialNumbers: [
              {
                number: '1930',
                label: 'National Cybercrime Helpline',
                targetScreenId: 'helpline_1930',
              },
            ],
            blocks: [],
            actions: [],
          },
          helpline_1930: {
            id: 'helpline_1930',
            title: '1930 Cybercrime Helpline',
            subtitle: 'Simulated Connected Call · 00:18',
            layout: 'detail',
            blocks: [
              {
                id: 'h1930_guidance',
                kind: 'info',
                title: 'Cyber Helpline Operator',
                body: '“Never enter your UPI PIN to receive money. Decline the collect request inside PayEasy and block the sender.”',
              },
            ],
            actions: [
              {
                id: 'act_end_1930',
                label: 'End Helpline Call',
                priority: 'primary',
                nextScreenId: 'phone_dialer',
                feedbackMessage: 'Ended simulated 1930 helpline call.',
              },
            ],
          },
        },
      },
      browser: {
        id: 'browser',
        name: 'Browser',
        subtitle: 'https://upi-safety-guide.org',
        gradientClass: 'from-sky-400 to-blue-600',
        accentColor: '#0284C7',
        glyph: '🌐',
        homeScreenId: 'br_home',
        screens: {
          br_home: {
            id: 'br_home',
            title: 'https://upi-safety-guide.org',
            subtitle: 'Verified HTTPS · Digital Payment Safety',
            layout: 'detail',
            blocks: [
              {
                id: 'br_rule_1',
                kind: 'info',
                title: 'Rule 1: Receiving Money Requires Zero Action',
                body: 'When someone sends you money via UPI, it credits automatically. You never enter a UPI PIN or approve a collect request.',
              },
              {
                id: 'br_rule_2',
                kind: 'info',
                title: 'Rule 2: Check SMS Sender Headers',
                body: 'Ignore urgent refund links sent over unencrypted http:// URLs.',
              },
            ],
            actions: [],
          },
        },
      },
      settings: {
        id: 'settings',
        name: 'Settings',
        subtitle: 'Device & PracticeOS',
        gradientClass: 'from-zinc-500 to-slate-700',
        accentColor: '#334155',
        glyph: '⚙',
        homeScreenId: 'set_home',
        screens: {
          set_home: {
            id: 'set_home',
            title: 'Settings',
            subtitle: 'PracticeOS Android 15 · Simulated Device',
            layout: 'detail',
            blocks: [
              {
                id: 'set_security',
                kind: 'field',
                title: 'App Lock & Biometrics',
                body: 'Active on PayEasy & Sunrise Bank',
              },
              {
                id: 'set_spam',
                kind: 'field',
                title: 'SMS Spam & Phishing Filter',
                body: 'Enabled (Flags unverified http:// links)',
              },
            ],
            actions: [],
          },
        },
      },
    },
    inbox: [
      {
        id: 'notif_pe_collect',
        trigger: { type: 'atSecond', seconds: 0 },
        label: 'scam',
        event: {
          type: 'notification',
          appId: 'payeasy',
          screenId: 'payeasy_request',
          appName: 'PayEasy',
          title: 'Collect request ₹4,500',
          body: 'Rohan Verma requested ₹4,500 from your bank account.',
        },
      },
      {
        id: 'notif_sms_refund',
        trigger: { type: 'atSecond', seconds: 0 },
        label: 'scam',
        event: {
          type: 'notification',
          appId: 'messages',
          screenId: 'sms_thread_scam',
          appName: 'Messages · VK-PAYEZY',
          title: 'Refund ₹4,500 waiting',
          body: 'Tap link or approve collect request in PayEasy within 2 mins.',
        },
      },
    ],
    script: [
      {
        id: 'evt_chat_nudge_4s',
        trigger: { type: 'atSecond', seconds: 4 },
        label: 'scam',
        event: {
          type: 'chatMessage',
          appId: 'chatnest',
          screenId: 'chat_thread_rohan',
          sender: 'Rohan Verma',
          body: 'Bhai jaldi! Open PayEasy and enter your UPI PIN so ₹4,500 credits to your bank.',
        },
      },
      {
        id: 'evt_idle_call_14s',
        trigger: { type: 'ifIdleFor', seconds: 14 },
        label: 'scam',
        event: {
          type: 'incomingCall',
          callerName: 'Rohan Verma (Buyer)',
          callerNumber: '+91 9XXXX XXX12',
          pressureTag: 'Urgency Pressure',
          dialogueLines: [
            'Hello Priya! I already sent ₹4,500 for the sofa.',
            'Just open PayEasy, tap Approve, and enter your 4-digit UPI PIN so the money enters your bank!',
          ],
          replies: [
            {
              id: 'rep_call_refuse',
              label: 'Refuse (“Receiving money never needs a PIN”) & Hang Up',
              endCall: true,
              feedbackMessage:
                'Hung up on the caller — receiving money never requires a PIN.',
            },
            {
              id: 'rep_call_comply',
              label: 'Agree to Enter UPI PIN',
              triggersUnsafeId: 'agreed_to_pin_on_call',
              trapLesson:
                'Scammers stay on the call to rush you into entering your UPI PIN on a debit request.',
              nextAppId: 'payeasy',
              nextScreenId: 'payeasy_pin_keypad',
              endCall: true,
              feedbackMessage: 'Caller pressured you toward the PIN keypad.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'kyc_smishing_scam',
    shortName: 'Scenario 2 · Bank KYC SMS',
    title: 'Urgent Bank KYC Suspension SMS',
    conceptTag: 'Smishing & Fake KYC Link',
    goal: 'Verify an account block SMS without opening the phishing link.',
    goldenRule:
      'Banks never send KYC update links from personal 10-digit mobile numbers.',
    youAre: 'Arjun, checking evening texts after work',
    startTime: '8:15',
    startDate: 'Fri, 20 Nov',
    weatherText: '21°C Clear',
    initialBattery: 62,
    homeApps: [
      'messages',
      'sunrise',
      'payeasy',
      'chatnest',
      'phone',
      'browser',
      'settings',
    ],
    dockApps: ['phone', 'messages', 'payeasy', 'browser'],
    steps: [
      {
        id: 'kyc_st_1',
        stepId: 'inspect_kyc_sms',
        title: 'Inspect the KYC Warning SMS',
        where: 'messages',
        screen: 'kyc_sms_thread',
        prompt: 'Does the sender number match an official bank header?',
        focusApps: ['messages'],
        coachTips: {
          nudge:
            'Look at the 10-digit personal phone number (+91 88210 99412) and the http:// link.',
          direction:
            'Open Messages and inspect the KYC suspension text thread.',
          spotlight: 'Compare the two neutral actions below the SMS bubble.',
        },
        successFeedback: '✓ Smishing SMS flagged! Now verify in Sunrise Bank.',
      },
      {
        id: 'kyc_st_2',
        stepId: 'verify_kyc_bank',
        title: 'Verify KYC in Sunrise Bank',
        where: 'sunrise',
        screen: 'kyc_sb_home',
        prompt: 'Does your official bank app show any KYC suspension?',
        focusApps: ['sunrise'],
        coachTips: {
          nudge:
            'Open your official Sunrise Bank app directly to see your real KYC status.',
          direction: 'Tap Sunrise Bank and check your KYC Compliance card.',
          spotlight: 'Confirm your active KYC status below.',
        },
        successFeedback: '✓ Official KYC status verified active!',
      },
    ],
    appDefinitions: {
      messages: {
        id: 'messages',
        name: 'Messages',
        subtitle: 'SMS & RCS',
        gradientClass: 'from-emerald-500 to-green-700',
        accentColor: '#15803D',
        glyph: '💬',
        homeScreenId: 'kyc_sms_inbox',
        screens: {
          kyc_sms_inbox: {
            id: 'kyc_sms_inbox',
            title: 'Messages',
            subtitle: '1 unread alert',
            layout: 'list',
            blocks: [
              {
                id: 'kyc_row_1',
                kind: 'message',
                sender: '+91 88210 99412',
                senderMeta: 'Personal Mobile Number',
                avatarText: '88',
                avatarColor: '#B45309',
                title: 'Sunrise Bank KYC Blocked Tonight',
                body: 'FINAL NOTICE: Account suspends at 9 PM. Update PAN: http://sunrise-kyc-verify-sim.in',
                timestamp: '8:14 PM',
                unread: true,
                classification: 'scam',
                openScreenId: 'kyc_sms_thread',
              },
            ],
            actions: [],
          },
          kyc_sms_thread: {
            id: 'kyc_sms_thread',
            title: '+91 88210 99412',
            subtitle: 'Personal Mobile Sender · Unverified Link',
            layout: 'thread',
            blocks: [
              {
                id: 'kyc_warn_b',
                kind: 'warning',
                title: 'Unverified Mobile Sender',
                body: 'Official bank alerts never come from 10-digit personal numbers.',
              },
              {
                id: 'kyc_bubble',
                kind: 'message',
                sender: '+91 88210 99412',
                body: 'FINAL NOTICE: Your Sunrise Bank netbanking will be blocked at 9:00 PM today. Complete PAN KYC at http://sunrise-kyc-verify-sim.in',
                timestamp: '8:14 PM',
                isIncoming: true,
                classification: 'scam',
              },
            ],
            actions: [
              {
                id: 'act_report_kyc_sms',
                label: 'Report Spam & Open Sunrise Bank',
                priority: 'primary',
                grantsStepId: 'inspect_kyc_sms',
                phishingClueNote: 'Flagged 10-digit mobile KYC smishing text',
                nextAppId: 'sunrise',
                nextScreenId: 'kyc_sb_home',
                feedbackMessage:
                  'Reported smishing SMS and opened Sunrise Bank directly.',
              },
              {
                id: 'act_open_kyc_link',
                label: 'Open KYC Link in Browser',
                priority: 'primary',
                triggersUnsafeId: 'opened_kyc_phishing_link',
                trapLesson:
                  'Banks never send KYC update links via personal mobile numbers. Always check inside the official bank app.',
                feedbackMessage:
                  'Blocked lookalike KYC website in Practice Mode.',
              },
            ],
          },
        },
      },
      sunrise: {
        id: 'sunrise',
        name: 'Sunrise Bank',
        subtitle: 'Official Banking',
        gradientClass: 'from-slate-800 via-blue-900 to-amber-600',
        accentColor: '#1E3A8A',
        glyph: '🏦',
        homeScreenId: 'kyc_sb_home',
        screens: {
          kyc_sb_home: {
            id: 'kyc_sb_home',
            title: 'Sunrise Bank',
            subtitle: 'Savings Account ••4821 · Verified App',
            layout: 'detail',
            blocks: [
              {
                id: 'kyc_status_card',
                kind: 'field',
                title: 'KYC Compliance Status',
                body: 'Active & Verified · No action required',
              },
              {
                id: 'kyc_bal_card',
                kind: 'info',
                title: 'Account Standing',
                body: 'Savings ••4821 is active with ₹24,100.00 balance.',
              },
            ],
            actions: [
              {
                id: 'act_kyc_confirm_ok',
                label: 'Confirm KYC Active & Safe',
                priority: 'primary',
                grantsStepId: 'verify_kyc_bank',
                feedbackMessage: 'Confirmed official KYC status is active!',
              },
              {
                id: 'act_kyc_notices',
                label: 'Check Official Bank Inbox',
                priority: 'primary',
                feedbackMessage: 'Zero pending official bank alerts.',
              },
            ],
          },
        },
      },
      payeasy: {
        id: 'payeasy',
        name: 'PayEasy',
        subtitle: 'Arjun · arjun@payeasy',
        gradientClass: 'from-blue-500 to-indigo-700',
        accentColor: '#1D4ED8',
        glyph: '₹',
        homeScreenId: 'kyc_pe_home',
        screens: {
          kyc_pe_home: {
            id: 'kyc_pe_home',
            title: 'PayEasy UPI',
            subtitle: 'No pending requests',
            layout: 'detail',
            blocks: [
              {
                id: 'kyc_pe_bal',
                kind: 'field',
                title: 'Sunrise Bank ••4821',
                body: '₹24,100.00 · Normal',
              },
            ],
            actions: [],
          },
        },
      },
      chatnest: {
        id: 'chatnest',
        name: 'ChatNest',
        subtitle: 'Instant Messaging',
        gradientClass: 'from-teal-500 to-cyan-700',
        accentColor: '#0F766E',
        glyph: '💭',
        homeScreenId: 'kyc_cn_home',
        screens: {
          kyc_cn_home: {
            id: 'kyc_cn_home',
            title: 'ChatNest',
            subtitle: 'Chats',
            layout: 'list',
            blocks: [
              {
                id: 'kyc_cn_1',
                kind: 'message',
                sender: 'Family Group',
                avatarText: 'FG',
                avatarColor: '#059669',
                body: 'Dinner at 9:30 PM tonight!',
                timestamp: '7:45 PM',
              },
            ],
            actions: [],
          },
        },
      },
      phone: {
        id: 'phone',
        name: 'Phone',
        subtitle: 'Calls & 1930 Helpline',
        gradientClass: 'from-green-600 to-emerald-800',
        accentColor: '#166534',
        glyph: '📞',
        homeScreenId: 'kyc_phone',
        screens: {
          kyc_phone: {
            id: 'kyc_phone',
            title: 'Phone',
            subtitle: 'Simulated Dialer & Helplines',
            layout: 'dialer',
            dialNumbers: [
              {
                number: '1930',
                label: 'National Cybercrime Helpline',
                targetScreenId: 'kyc_1930',
              },
            ],
            blocks: [],
            actions: [],
          },
          kyc_1930: {
            id: 'kyc_1930',
            title: '1930 Cybercrime Helpline',
            subtitle: 'Simulated Connected Call',
            layout: 'detail',
            blocks: [
              {
                id: 'kyc_1930_b',
                kind: 'info',
                title: 'Cyber Helpline Operator',
                body: '“Do not open SMS KYC links. Report the mobile number and verify status inside your official bank app.”',
              },
            ],
            actions: [
              {
                id: 'act_kyc_end_1930',
                label: 'End Helpline Call',
                priority: 'primary',
                nextScreenId: 'kyc_phone',
                feedbackMessage: 'Ended helpline call.',
              },
            ],
          },
        },
      },
      browser: {
        id: 'browser',
        name: 'Browser',
        subtitle: 'https://upi-safety-guide.org',
        gradientClass: 'from-sky-400 to-blue-600',
        accentColor: '#0284C7',
        glyph: '🌐',
        homeScreenId: 'kyc_br',
        screens: {
          kyc_br: {
            id: 'kyc_br',
            title: 'https://upi-safety-guide.org',
            subtitle: 'Verified HTTPS · KYC Safety',
            layout: 'detail',
            blocks: [
              {
                id: 'kyc_br_1',
                kind: 'info',
                title: 'How Real Bank KYC Works',
                body: 'Banks notify KYC updates inside your official banking app or branch — never via random mobile numbers.',
              },
            ],
            actions: [],
          },
        },
      },
      settings: {
        id: 'settings',
        name: 'Settings',
        subtitle: 'Device & PracticeOS',
        gradientClass: 'from-zinc-500 to-slate-700',
        accentColor: '#334155',
        glyph: '⚙',
        homeScreenId: 'kyc_set',
        screens: {
          kyc_set: {
            id: 'kyc_set',
            title: 'Settings',
            subtitle: 'PracticeOS Android 15 · Simulated Device',
            layout: 'detail',
            blocks: [
              {
                id: 'kyc_set_1',
                kind: 'field',
                title: 'Safe Browsing Protection',
                body: 'Active · Warns on unencrypted http:// sites',
              },
            ],
            actions: [],
          },
        },
      },
    },
    inbox: [
      {
        id: 'kyc_notif_1',
        trigger: { type: 'atSecond', seconds: 0 },
        label: 'scam',
        event: {
          type: 'notification',
          appId: 'messages',
          screenId: 'kyc_sms_thread',
          appName: 'Messages · +91 88210 99412',
          title: 'Sunrise Bank KYC Blocked Tonight',
          body: 'Update PAN immediately via http://sunrise-kyc-verify-sim.in',
        },
      },
    ],
    script: [],
  },
];

// ============================================================================
// 4. TYPES & HELPERS
// ============================================================================

interface PracticeNotification {
  id: string;
  appId: AppId;
  screenId: string;
  appName: string;
  title: string;
  body: string;
}

interface ActiveCallState {
  callerName: string;
  callerNumber: string;
  pressureTag: string;
  dialogueLines: string[];
  replies: CallReplyOption[];
  status: 'ringing' | 'connected';
  revealedLinesCount: number;
  speakerOn: boolean;
  muted: boolean;
}

interface NavEntry {
  view: 'lock' | 'home' | 'recents' | 'app';
  appId?: AppId;
  screenId?: string;
}

const DIALER_KEYS: Array<{ digit: string; letters: string }> = [
  { digit: '1', letters: '∞' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

// ============================================================================
// 5. MAIN STANDALONE PRACTICEOS SMARTPHONE COMPONENT (`App`)
// ============================================================================

export default function App() {
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);
  const scenario = SCENARIOS[scenarioIndex] ?? SCENARIOS[0]!;

  // Device Quick Settings & Hardware Toggles
  const [wifiOn, setWifiOn] = useState<boolean>(true);
  const [mobileDataOn, setMobileDataOn] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [dndOn, setDndOn] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);

  // OS Navigation & Overlay State
  const [navStack, setNavStack] = useState<NavEntry[]>([{ view: 'lock' }]);
  const [shadeOpen, setShadeOpen] = useState<boolean>(false);
  const [recentApps, setRecentApps] = useState<AppId[]>([]);
  const [batteryPercent, setBatteryPercent] = useState<number>(
    scenario.initialBattery
  );
  const [notifications, setNotifications] = useState<PracticeNotification[]>(
    []
  );
  const [dynamicBlocksByScreen, setDynamicBlocksByScreen] = useState<
    Record<string, Block[]>
  >({});
  const [typingBanner, setTypingBanner] = useState<string | null>(null);
  const [headsUpBanner, setHeadsUpBanner] = useState<PracticeNotification | null>(
    null
  );
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [moreActionsOpen, setMoreActionsOpen] = useState<boolean>(false);

  // Mission & Coach Pill State
  const [missionExpanded, setMissionExpanded] = useState<boolean>(false);
  const [coachTier, setCoachTier] = useState<0 | 1 | 2 | 3>(0);
  const [toastText, setToastText] = useState<string | null>(null);
  const [trapLesson, setTrapLesson] = useState<string | null>(null);
  const [debriefOpen, setDebriefOpen] = useState<boolean>(false);

  // Telemetry & Event Director State
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [triggeredUnsafeIds, setTriggeredUnsafeIds] = useState<string[]>([]);
  const [phishingClueNotes, setPhishingClueNotes] = useState<string[]>([]);
  const [actionsLog, setActionsLog] = useState<ActionLogEntry[]>([]);

  const sessionStartMsRef = useRef<number>(Date.now());
  const lastInteractionMsRef = useRef<number>(Date.now());
  const completedActionIdsRef = useRef<Set<string>>(new Set());
  const firedEventIdsRef = useRef<Set<string>>(new Set());
  const touchStartYRef = useRef<number | null>(null);

  // Initialize or reboot scenario
  const bootScenario = useCallback((idx: number) => {
    const nextScenario = SCENARIOS[idx] ?? SCENARIOS[0]!;
    setScenarioIndex(idx);
    setNavStack([{ view: 'lock' }]);
    setShadeOpen(false);
    setRecentApps([]);
    setBatteryPercent(nextScenario.initialBattery);
    setDynamicBlocksByScreen({});
    setTypingBanner(null);
    setHeadsUpBanner(null);
    setActiveCall(null);
    setDialedNumber('');
    setMoreActionsOpen(false);
    setMissionExpanded(false);
    setCoachTier(0);
    setToastText(null);
    setTrapLesson(null);
    setDebriefOpen(false);
    setFlashlightOn(false);
    setCompletedStepIds([]);
    setTriggeredUnsafeIds([]);
    setPhishingClueNotes([]);
    setActionsLog([]);

    sessionStartMsRef.current = Date.now();
    lastInteractionMsRef.current = Date.now();
    completedActionIdsRef.current = new Set();
    firedEventIdsRef.current = new Set();

    const initialNotifs: PracticeNotification[] = nextScenario.inbox.map(
      (evt) => {
        if (evt.event.type === 'notification') {
          return {
            id: evt.id,
            appId: evt.event.appId,
            screenId: evt.event.screenId,
            appName: evt.event.appName,
            title: evt.event.title,
            body: evt.event.body,
          };
        }
        return {
          id: evt.id,
          appId: 'messages',
          screenId: '',
          appName: 'Messages',
          title: 'New Alert',
          body: 'Tap to inspect',
        };
      }
    );
    setNotifications(initialNotifs);
  }, []);

  useEffect(() => {
    bootScenario(0);
  }, [bootScenario]);

  const currentNav = navStack[navStack.length - 1] ?? { view: 'lock' };
  const currentAppId: AppId | null =
    currentNav.view === 'app' && currentNav.appId ? currentNav.appId : null;

  const currentStepIndex = useMemo(() => {
    const idx = scenario.steps.findIndex(
      (s) => !completedStepIds.includes(s.stepId)
    );
    return idx === -1 ? scenario.steps.length - 1 : idx;
  }, [scenario.steps, completedStepIds]);

  const activeStep = scenario.steps[currentStepIndex]!;

  const bumpInteraction = useCallback(() => {
    lastInteractionMsRef.current = Date.now();
  }, []);

  const navigateTo = useCallback(
    (entry: NavEntry) => {
      bumpInteraction();
      setShadeOpen(false);
      setMoreActionsOpen(false);
      setTrapLesson(null);
      setNavStack((prev) => [...prev, entry]);
      if (entry.view === 'app' && entry.appId) {
        const appId = entry.appId;
        setRecentApps((prev) => [
          appId,
          ...prev.filter((existing) => existing !== appId),
        ]);
      }
    },
    [bumpInteraction]
  );

  // Android Hardware / Navigation Bar Back
  const handleBack = useCallback(() => {
    bumpInteraction();
    if (debriefOpen) {
      setDebriefOpen(false);
      return;
    }
    if (shadeOpen) {
      setShadeOpen(false);
      return;
    }
    if (activeCall) {
      setActiveCall(null);
      return;
    }
    if (currentNav.view === 'lock' || currentNav.view === 'home') {
      return;
    }
    setNavStack((prev) =>
      prev.length > 1 ? prev.slice(0, prev.length - 1) : [{ view: 'home' }]
    );
  }, [bumpInteraction, debriefOpen, shadeOpen, activeCall, currentNav.view]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack]);

  // Optional Web Speech API voiceover when Sound is ON
  const speakCallerLine = useCallback(
    (line: string) => {
      if (!soundOn || dndOn) {
        return;
      }
      try {
        if (
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          typeof window.SpeechSynthesisUtterance !== 'undefined'
        ) {
          window.speechSynthesis.cancel();
          const utter = new window.SpeechSynthesisUtterance(line);
          utter.rate = 1.02;
          window.speechSynthesis.speak(utter);
        }
      } catch {
        // Ignore if unavailable
      }
    },
    [soundOn, dndOn]
  );

  useEffect(() => {
    return () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }
    };
  }, []);

  // Deterministic Event Director loop
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (debriefOpen) {
        return;
      }
      const now = Date.now();
      const elapsedSec = Math.floor((now - sessionStartMsRef.current) / 1000);
      const idleSec = Math.floor((now - lastInteractionMsRef.current) / 1000);

      const due = evaluateDirectorTriggers(scenario.script, {
        elapsedSeconds: elapsedSec,
        idleSeconds: idleSec,
        currentAppId,
        currentScreenId: currentNav.screenId ?? null,
        completedActionIds: completedActionIdsRef.current,
        firedEventIds: firedEventIdsRef.current,
        seedKey: scenario.id + ':' + String(sessionStartMsRef.current),
      });

      for (const evt of due) {
        firedEventIdsRef.current.add(evt.id);
        const p = evt.event;

        if (p.type === 'chatMessage') {
          setTypingBanner(`${p.sender} is typing...`);
          window.setTimeout(() => {
            setTypingBanner(null);
            setDynamicBlocksByScreen((prev) => {
              const existing = prev[p.screenId] ?? [];
              return {
                ...prev,
                [p.screenId]: [
                  ...existing,
                  {
                    id: evt.id,
                    kind: 'message',
                    sender: p.sender,
                    body: p.body,
                    timestamp: 'Just now',
                    isIncoming: true,
                    classification: evt.label,
                  },
                ],
              };
            });
            const incomingNotif: PracticeNotification = {
              id: evt.id + '_n',
              appId: p.appId,
              screenId: p.screenId,
              appName: `ChatNest · ${p.sender}`,
              title: p.sender,
              body: p.body,
            };
            setNotifications((prev) => [incomingNotif, ...prev]);
            if (!dndOn) {
              setHeadsUpBanner(incomingNotif);
              window.setTimeout(() => {
                setHeadsUpBanner((cur) =>
                  cur?.id === incomingNotif.id ? null : cur
                );
              }, 4200);
            }
          }, 1100);
        } else if (p.type === 'incomingCall') {
          if (activeCall) {
            continue;
          }
          try {
            if (
              soundOn &&
              !dndOn &&
              typeof navigator !== 'undefined' &&
              'vibrate' in navigator
            ) {
              navigator.vibrate([220, 120, 220]);
            }
          } catch {
            // Optional vibration
          }
          setActiveCall({
            callerName: p.callerName,
            callerNumber: p.callerNumber,
            pressureTag: p.pressureTag,
            dialogueLines: p.dialogueLines,
            replies: p.replies,
            status: 'ringing',
            revealedLinesCount: 0,
            speakerOn: true,
            muted: false,
          });
        } else if (p.type === 'changeBattery') {
          setBatteryPercent(p.batteryPercent);
        }
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [
    scenario,
    debriefOpen,
    currentAppId,
    currentNav.screenId,
    activeCall,
    soundOn,
    dndOn,
  ]);

  // Sequential caller captions once incoming call is answered
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      return;
    }
    if (activeCall.revealedLinesCount >= activeCall.dialogueLines.length) {
      return;
    }
    const nextIdx = activeCall.revealedLinesCount;
    const delay = nextIdx === 0 ? 350 : 2100;
    const timer = window.setTimeout(() => {
      const line = activeCall.dialogueLines[nextIdx];
      if (line) {
        speakCallerLine(line);
      }
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              revealedLinesCount: Math.min(
                prev.dialogueLines.length,
                prev.revealedLinesCount + 1
              ),
            }
          : null
      );
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeCall, speakCallerLine]);

  // Execute an in-app or call action
  const executeAction = useCallback(
    (act: Action) => {
      bumpInteraction();
      setMoreActionsOpen(false);
      completedActionIdsRef.current.add(act.id);

      const elapsed = Math.max(
        1,
        Math.floor((Date.now() - sessionStartMsRef.current) / 1000)
      );
      setActionsLog((prev) => [
        ...prev,
        {
          timestampSec: elapsed,
          appId: currentAppId ?? 'practiceos',
          screenId: currentNav.screenId ?? currentNav.view,
          actionId: act.id,
          label: act.label,
        },
      ]);

      if (act.triggersUnsafeId) {
        const unsafeId = act.triggersUnsafeId;
        setTriggeredUnsafeIds((prev) =>
          prev.includes(unsafeId) ? prev : [...prev, unsafeId]
        );
        setTrapLesson(
          act.trapLesson ??
            'Unsafe choice detected. Pause and verify through official channels.'
        );
        return;
      }

      if (act.phishingClueNote) {
        const note = act.phishingClueNote;
        setPhishingClueNotes((prev) =>
          prev.includes(note) ? prev : [...prev, note]
        );
      }

      let nextSteps = completedStepIds;
      if (act.grantsStepId && !completedStepIds.includes(act.grantsStepId)) {
        nextSteps = [...completedStepIds, act.grantsStepId];
        setCompletedStepIds(nextSteps);
        setCoachTier(0);
        const completedStepObj = scenario.steps.find(
          (s) => s.stepId === act.grantsStepId
        );
        setToastText(
          completedStepObj?.successFeedback ?? act.feedbackMessage
        );
      } else {
        setToastText(act.feedbackMessage);
      }

      // Check if all scenario steps are completed -> open End-of-Drill Debrief Sheet
      if (nextSteps.length >= scenario.steps.length) {
        window.setTimeout(() => {
          setDebriefOpen(true);
        }, 550);
        return;
      }

      if (act.nextAppId || act.nextScreenId) {
        const targetAppId = act.nextAppId ?? currentAppId ?? 'payeasy';
        const targetApp = scenario.appDefinitions[targetAppId];
        navigateTo({
          view: 'app',
          appId: targetAppId,
          screenId: act.nextScreenId ?? targetApp.homeScreenId,
        });
      }
    },
    [
      bumpInteraction,
      currentAppId,
      currentNav,
      completedStepIds,
      scenario,
      navigateTo,
    ]
  );

  // PIN keypad trap (first tap triggers lesson immediately; zero digits stored)
  const handleKeypadDigitTap = useCallback(
    (screen: PhoneScreen) => {
      bumpInteraction();
      const unsafeId = screen.keypadTrapUnsafeId ?? 'entered_upi_pin_trap';
      setTriggeredUnsafeIds((prev) =>
        prev.includes(unsafeId) ? prev : [...prev, unsafeId]
      );
      setTrapLesson(
        screen.keypadTrapMessage ??
          'A UPI PIN is ONLY used to send money out of your account — never to receive a refund. Zero digits were stored.'
      );
    },
    [bumpInteraction]
  );

  // Touch swipe handlers for status bar pull-down and lock screen swipe-up
  const handleStatusTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const handleStatusTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) {
      return;
    }
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY > 18) {
      setShadeOpen(true);
    }
  };

  const handleLockTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const handleLockTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) {
      return;
    }
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY < -36) {
      navigateTo({ view: 'home' });
    }
  };

  // Compute unread badge per app
  const getAppBadgeCount = (appId: AppId): number => {
    if (appId === 'payeasy') {
      return completedStepIds.includes('decline_collect') ? 0 : 1;
    }
    if (appId === 'messages') {
      return completedStepIds.includes('inspect_sms') ||
        completedStepIds.includes('inspect_kyc_sms')
        ? 0
        : 1;
    }
    if (appId === 'chatnest') {
      return scenario.id === 'upi_collect_scam' &&
        !completedStepIds.includes('decline_collect')
        ? 1
        : 0;
    }
    return 0;
  };

  // Coach tip message for current step
  const activeCoachMessage = useMemo(() => {
    if (coachTier === 0) {
      return null;
    }
    if (coachTier === 1) {
      return `Nudge: ${activeStep.coachTips.nudge}`;
    }
    if (coachTier === 2) {
      return `Direction: ${activeStep.coachTips.direction}`;
    }
    return `Spotlight: ${activeStep.coachTips.spotlight}`;
  }, [coachTier, activeStep]);

  const safetyScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((completedStepIds.length / scenario.steps.length) * 100) -
        triggeredUnsafeIds.length * 25
    )
  );

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-zinc-900 sm:p-6 flex items-center justify-center font-sans relative overflow-hidden">
      {/* Subtle studio ambient glow on desktop */}
      <div
        aria-hidden="true"
        className="hidden sm:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.16),transparent_65%)]"
      />

      {/* ==================================================================
          REALISTIC TITANIUM / OBSIDIAN SMARTPHONE CHASSIS
         ================================================================== */}
      <div className="relative flex items-center justify-center w-full h-[100dvh] sm:w-auto sm:h-auto">
        {/* Side Hardware Buttons (Desktop Chassis Accents) */}
        <div
          aria-hidden="true"
          className="hidden sm:block absolute -left-[3px] top-[156px] w-[3px] h-[54px] rounded-l-sm bg-zinc-600"
        />
        <div
          aria-hidden="true"
          className="hidden sm:block absolute -left-[3px] top-[224px] w-[3px] h-[54px] rounded-l-sm bg-zinc-600"
        />
        <div
          aria-hidden="true"
          className="hidden sm:block absolute -right-[3px] top-[192px] w-[3px] h-[74px] rounded-r-sm bg-zinc-600"
        />

        {/* Phone Outer Bezel */}
        <div
          role="region"
          aria-label="PracticeOS Simulated Smartphone"
          className="w-full h-[100dvh] sm:w-[392px] sm:h-[812px] sm:max-h-[94dvh] sm:rounded-[44px] sm:p-[10px] bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-[0_28px_80px_rgba(0,0,0,0.85)] flex flex-col"
        >
          {/* Inner OLED Display Viewport */}
          <div className="w-full h-full sm:rounded-[35px] bg-zinc-950 overflow-hidden flex flex-col relative">
            {/* Screen Brightness Overlay (controlled by Quick Settings slider) */}
            <div
              aria-hidden="true"
              style={{ opacity: Math.max(0, (100 - brightness) * 0.0065) }}
              className="pointer-events-none absolute inset-0 bg-black z-40 transition-opacity duration-150"
            />

            {/* ==============================================================
                1. REALISTIC ANDROID STATUS BAR + CAMERA PUNCH-HOLE ISLAND
               ============================================================== */}
            <header
              onClick={() => setShadeOpen((o) => !o)}
              onTouchStart={handleStatusTouchStart}
              onTouchEnd={handleStatusTouchEnd}
              role="button"
              tabIndex={0}
              aria-label="Status bar — tap or pull down for Quick Settings and notifications"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShadeOpen((o) => !o);
                }
              }}
              className="w-full h-[38px] px-4 bg-zinc-950/95 text-zinc-100 flex items-center justify-between text-[11px] font-bold select-none shrink-0 z-30 cursor-pointer border-b border-white/5"
            >
              {/* Left: Time + Notification Bell Badge */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="tabular-nums tracking-tight text-xs font-extrabold">
                  {scenario.startTime}
                </span>
                {notifications.length > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 px-1.5 py-0.2 text-[10px] text-amber-300">
                    🔔 {notifications.length}
                  </span>
                ) : null}
              </div>

              {/* Center: Front Camera Punch-Hole + Compact Safety Pill */}
              <div className="flex items-center gap-1.5 rounded-full bg-black border border-zinc-800 px-2 py-0.5">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full bg-zinc-900 ring-1 ring-zinc-700 inline-block"
                />
                <span className="text-[9.5px] font-extrabold tracking-wide text-sky-300 whitespace-nowrap">
                  PRACTICE · No real money
                </span>
              </div>

              {/* Right: 5G, Wi-Fi & Battery */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-zinc-300">
                  {mobileDataOn ? '5G' : ''}
                </span>
                {wifiOn ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="w-3.5 h-3.5 fill-current text-zinc-200"
                  >
                    <path d="M8 13.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm-3.18-2.68a4.5 4.5 0 0 1 6.36 0l1.06-1.06a6 6 0 0 0-8.48 0l1.06 1.06zm-2.12-2.12a7.5 7.5 0 0 1 10.6 0l1.06-1.06a9 9 0 0 0-12.72 0l1.06 1.06z" />
                  </svg>
                ) : null}
                <div className="flex items-center gap-1">
                  <span
                    className={`tabular-nums text-[10px] ${
                      batteryPercent <= 20 ? 'text-amber-400' : 'text-zinc-200'
                    }`}
                  >
                    {batteryPercent}%
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-4 h-2.5 rounded-[3px] border border-zinc-400 p-[1px] flex items-center"
                  >
                    <span
                      style={{ width: `${Math.max(15, batteryPercent)}%` }}
                      className={`h-full rounded-[1px] ${
                        batteryPercent <= 20 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  </span>
                </div>
              </div>
            </header>

            {/* Heads-Up Floating Notification Banner (when live message arrives) */}
            {headsUpBanner && !shadeOpen && !activeCall ? (
              <div className="absolute top-[44px] left-3 right-3 z-30 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 p-3 shadow-2xl flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-sky-300">
                    {headsUpBanner.appName}
                  </p>
                  <p className="text-xs font-bold text-white truncate">
                    {headsUpBanner.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetApp =
                      scenario.appDefinitions[headsUpBanner.appId];
                    setHeadsUpBanner(null);
                    navigateTo({
                      view: 'app',
                      appId: headsUpBanner.appId,
                      screenId:
                        headsUpBanner.screenId || targetApp.homeScreenId,
                    });
                  }}
                  className="min-h-[34px] rounded-xl bg-blue-600 text-white px-3 text-xs font-bold shrink-0 cursor-pointer"
                >
                  Open
                </button>
              </div>
            ) : null}

            {/* Live Typing Indicator Bar */}
            {typingBanner && !shadeOpen && !activeCall ? (
              <div className="px-4 py-1.5 bg-teal-950 text-teal-200 text-[11px] font-bold border-b border-teal-800/60 shrink-0">
                💬 {typingBanner}
              </div>
            ) : null}

            {/* ==============================================================
                2. FROSTED-GLASS QUICK SETTINGS & NOTIFICATION SHADE
               ============================================================== */}
            {shadeOpen ? (
              <div className="absolute inset-x-0 top-[38px] bottom-[48px] z-30 bg-zinc-950/88 backdrop-blur-xl text-zinc-100 p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  {/* Shade Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">
                      {scenario.startDate} · Quick Settings
                    </span>
                    <button
                      type="button"
                      onClick={() => setShadeOpen(false)}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white cursor-pointer"
                    >
                      Close ↑
                    </button>
                  </div>

                  {/* Quick Settings 2x2 Tile Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWifiOn((v) => !v)}
                      className={`min-h-[54px] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        wifiOn
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span className="text-base">📶</span>
                      <div>
                        <p className="text-xs font-extrabold">Wi-Fi</p>
                        <p className="text-[10px] opacity-85">
                          {wifiOn ? 'HomeFiber_5G' : 'Off'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileDataOn((v) => !v)}
                      className={`min-h-[54px] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        mobileDataOn
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span className="text-base">⇅</span>
                      <div>
                        <p className="text-xs font-extrabold">Mobile Data</p>
                        <p className="text-[10px] opacity-85">
                          {mobileDataOn ? '5G Active' : 'Off'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoundOn((v) => !v)}
                      className={`min-h-[54px] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        soundOn
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span className="text-base">{soundOn ? '🔊' : '🔇'}</span>
                      <div>
                        <p className="text-xs font-extrabold">Sound</p>
                        <p className="text-[10px] opacity-85">
                          {soundOn ? 'Ring & Voice' : 'Muted'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDndOn((v) => !v)}
                      className={`min-h-[54px] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        dndOn
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span className="text-base">🌙</span>
                      <div>
                        <p className="text-xs font-extrabold">Do Not Disturb</p>
                        <p className="text-[10px] opacity-85">
                          {dndOn ? 'On' : 'Off'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Brightness Slider */}
                  <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 flex items-center gap-3">
                    <span className="text-sm" aria-hidden="true">
                      ☀
                    </span>
                    <input
                      type="range"
                      min={35}
                      max={100}
                      value={brightness}
                      aria-label="Screen brightness"
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold tabular-nums text-zinc-300">
                      {brightness}%
                    </span>
                  </div>

                  {/* Actionable Notifications List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                        Notifications ({notifications.length})
                      </p>
                      {notifications.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setNotifications([])}
                          className="text-xs font-bold text-sky-300 cursor-pointer"
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="rounded-2xl bg-white/5 p-4 text-center text-xs text-zinc-400">
                        No unread notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-2xl bg-white/10 border border-white/10 p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold text-sky-300">
                              {n.appName}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setNotifications((prev) =>
                                  prev.filter((item) => item.id !== n.id)
                                )
                              }
                              aria-label="Dismiss notification"
                              className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-xs font-bold text-white">
                            {n.title}
                          </p>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {n.body}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const targetApp =
                                scenario.appDefinitions[n.appId];
                              navigateTo({
                                view: 'app',
                                appId: n.appId,
                                screenId: n.screenId || targetApp.homeScreenId,
                              });
                            }}
                            className="w-full min-h-[36px] rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer mt-1"
                          >
                            Open {scenario.appDefinitions[n.appId]?.name}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bottom Pull Handle */}
                <button
                  type="button"
                  onClick={() => setShadeOpen(false)}
                  aria-label="Close notification shade"
                  className="w-full pt-3 pb-1 flex justify-center cursor-pointer"
                >
                  <span className="w-12 h-1 rounded-full bg-white/40" />
                </button>
              </div>
            ) : null}

            {/* ==============================================================
                3. FULL-SCREEN INCOMING & ACTIVE SCAM CALL OVERLAY
               ============================================================== */}
            {activeCall ? (
              <div className="flex-1 bg-gradient-to-b from-slate-950 via-zinc-900 to-slate-950 text-white p-5 flex flex-col justify-between z-20">
                <div className="text-center space-y-2 pt-4">
                  <span className="inline-block rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-[11px] font-extrabold text-amber-200">
                    {activeCall.status === 'ringing'
                      ? 'Incoming Call'
                      : 'Connected'}{' '}
                    · {activeCall.pressureTag}
                  </span>
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-extrabold text-sky-300 mt-2">
                    RV
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    {activeCall.callerName}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {activeCall.callerNumber}
                  </p>
                </div>

                {activeCall.status === 'ringing' ? (
                  <div className="space-y-6 pb-6">
                    <p className="text-center text-xs text-zinc-300">
                      {soundOn && !dndOn
                        ? 'Ringing...'
                        : 'Incoming call (muted)...'}
                    </p>
                    <div className="flex items-center justify-around px-4">
                      <button
                        type="button"
                        onClick={() => {
                          bumpInteraction();
                          setActiveCall(null);
                          setToastText('Declined incoming scam call.');
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <span className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-2xl shadow-lg">
                          📵
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          Decline
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          bumpInteraction();
                          setActiveCall((prev) =>
                            prev ? { ...prev, status: 'connected' } : null
                          );
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <span className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-2xl shadow-lg">
                          📞
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          Answer
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Live Caller Speech Captions */}
                    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5 space-y-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                        Live Caller Audio Captions
                      </p>
                      {activeCall.dialogueLines
                        .slice(0, activeCall.revealedLinesCount)
                        .map((line, i) => (
                          <p
                            key={'cl-' + String(i)}
                            className="text-xs leading-relaxed text-white font-medium"
                          >
                            “{line}”
                          </p>
                        ))}
                      {activeCall.revealedLinesCount === 0 ? (
                        <p className="text-xs text-zinc-400">
                          Connecting audio...
                        </p>
                      ) : null}
                    </div>

                    {/* Speaker / Mute / End Call Controls */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCall((prev) =>
                            prev
                              ? { ...prev, speakerOn: !prev.speakerOn }
                              : null
                          )
                        }
                        className={`min-h-[42px] rounded-xl text-xs font-bold cursor-pointer ${
                          activeCall.speakerOn
                            ? 'bg-white text-zinc-900'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {activeCall.speakerOn ? '🔊 Speaker' : '🔈 Earpiece'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCall((prev) =>
                            prev ? { ...prev, muted: !prev.muted } : null
                          )
                        }
                        className={`min-h-[42px] rounded-xl text-xs font-bold cursor-pointer ${
                          activeCall.muted
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {activeCall.muted ? '🔇 Muted' : '🎤 Mute'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          bumpInteraction();
                          setActiveCall(null);
                        }}
                        className="min-h-[42px] rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
                      >
                        End Call
                      </button>
                    </div>

                    {/* Branching Reply Choices */}
                    <div className="space-y-2 pt-1">
                      {activeCall.replies.map((rep) => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => {
                            executeAction({
                              id: rep.id,
                              label: rep.label,
                              grantsStepId: rep.grantsStepId,
                              triggersUnsafeId: rep.triggersUnsafeId,
                              trapLesson: rep.trapLesson,
                              nextAppId: rep.nextAppId,
                              nextScreenId: rep.nextScreenId,
                              feedbackMessage: rep.feedbackMessage,
                            });
                            if (rep.endCall) {
                              setActiveCall(null);
                            }
                          }}
                          className="w-full min-h-[46px] rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-left text-xs font-bold text-white cursor-pointer"
                        >
                          {rep.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ==============================================================
                4. MAIN PHONE SCREEN VIEWPORT (Lock / Home / Recents / Apps)
               ============================================================== */}
            {!activeCall ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
                {/* ----------------------------------------------------------
                    VIEW A: LOCK SCREEN (Initial Boot View)
                   ---------------------------------------------------------- */}
                {currentNav.view === 'lock' ? (
                  <div
                    onTouchStart={handleLockTouchStart}
                    onTouchEnd={handleLockTouchEnd}
                    className="flex-1 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white p-5 flex flex-col justify-between relative overflow-y-auto"
                  >
                    {/* Ambient Twilight Glow */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-10 inset-x-0 h-56 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.22),transparent_70%)]"
                    />

                    {/* Lock Clock & Date */}
                    <div className="text-center pt-5 space-y-1 relative z-10">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-sky-300/90">
                        🔒 {scenario.shortName}
                      </p>
                      <p className="text-6xl font-extralight tracking-tight text-white tabular-nums">
                        {scenario.startTime}
                      </p>
                      <p className="text-sm font-medium text-zinc-300">
                        {scenario.startDate} · {scenario.weatherText}
                      </p>
                      {flashlightOn ? (
                        <span className="inline-block mt-1 rounded-full bg-amber-300/20 border border-amber-300/50 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                          🔦 Flashlight On
                        </span>
                      ) : null}
                    </div>

                    {/* Frosted-Glass Lock Screen Notification Cards */}
                    <div className="space-y-2.5 relative z-10 my-auto py-3">
                      {notifications.map((notif) => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => {
                            const targetApp =
                              scenario.appDefinitions[notif.appId];
                            navigateTo({
                              view: 'app',
                              appId: notif.appId,
                              screenId:
                                notif.screenId || targetApp.homeScreenId,
                            });
                          }}
                          className="w-full rounded-2xl bg-white/12 hover:bg-white/18 backdrop-blur-xl border border-white/15 p-3.5 text-left space-y-1 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-sky-300">
                              {notif.appName}
                            </span>
                            <span className="text-zinc-300">Tap to open</span>
                          </div>
                          <p className="text-xs font-extrabold text-white">
                            {notif.title}
                          </p>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {notif.body}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Bottom Lock Shortcuts + Swipe/Tap to Unlock */}
                    <div className="flex items-center justify-between gap-2 pt-2 relative z-10">
                      <button
                        type="button"
                        onClick={() => setFlashlightOn((f) => !f)}
                        aria-label="Toggle flashlight"
                        className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center text-base cursor-pointer ${
                          flashlightOn
                            ? 'bg-amber-300 text-zinc-950 border-amber-200'
                            : 'bg-white/10 text-white border-white/15'
                        }`}
                      >
                        🔦
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo({ view: 'home' })}
                        className="flex-1 min-h-[46px] rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-4 py-2 text-xs font-extrabold text-white tracking-wide cursor-pointer"
                      >
                        Tap or Swipe Up to Unlock ↑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigateTo({
                            view: 'app',
                            appId: 'browser',
                            screenId:
                              scenario.appDefinitions.browser.homeScreenId,
                          })
                        }
                        aria-label="Open safety guide"
                        className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-base text-white cursor-pointer"
                      >
                        📷
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* ----------------------------------------------------------
                    VIEW B: REALISTIC HOME SCREEN LAUNCHER
                   ---------------------------------------------------------- */}
                {currentNav.view === 'home' ? (
                  <div className="flex-1 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white p-4 flex flex-col justify-between relative overflow-y-auto">
                    {/* Subtle Wallpaper Glow */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(16,185,129,0.14),transparent_55%)]"
                    />

                    {/* Top At-a-Glance Widget + Collapsible Mission & Coach Pill */}
                    <div className="space-y-2.5 relative z-10">
                      <div className="px-1 flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold tracking-tight text-white">
                            {scenario.startDate}
                          </p>
                          <p className="text-xs text-sky-200/90 font-medium">
                            ☀ {scenario.weatherText} · {scenario.youAre}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDebriefOpen(true)}
                          className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 text-[10px] font-bold text-zinc-200 cursor-pointer"
                        >
                          Summary
                        </button>
                      </div>

                      {/* Sleek Collapsible Mission & Coach Pill */}
                      <div className="rounded-2xl bg-white/12 backdrop-blur-xl border border-white/20 p-3 shadow-lg">
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={missionExpanded}
                          onClick={() => setMissionExpanded((e) => !e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setMissionExpanded((prev) => !prev);
                            }
                          }}
                          className="flex items-start justify-between gap-2 cursor-pointer"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                              Step {currentStepIndex + 1} of{' '}
                              {scenario.steps.length} · {activeStep.title}
                            </span>
                            <p className="text-xs font-bold text-white leading-snug">
                              {activeStep.prompt}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-zinc-100 shrink-0">
                            {missionExpanded ? '▲' : 'Coach ▼'}
                          </span>
                        </div>

                        {missionExpanded ? (
                          <div className="mt-2.5 pt-2.5 border-t border-white/15 space-y-2.5 text-xs">
                            <p className="text-zinc-200 leading-relaxed">
                              <span className="font-bold text-white">
                                Goal:{' '}
                              </span>
                              {scenario.goal}
                            </p>

                            {activeCoachMessage ? (
                              <div className="rounded-xl bg-sky-500/20 border border-sky-400/40 p-2.5 text-sky-100 font-medium leading-relaxed">
                                💡 {activeCoachMessage}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCoachTier((t) =>
                                    t >= 3 ? 1 : ((t + 1) as 1 | 2 | 3)
                                  )
                                }
                                className="min-h-[34px] rounded-xl bg-blue-600 text-white px-3 py-1 text-xs font-bold cursor-pointer"
                              >
                                {coachTier === 0
                                  ? 'Ask Coach (Hint 1/3)'
                                  : `Next Hint (${coachTier}/3)`}
                              </button>
                              <button
                                type="button"
                                onClick={() => bootScenario(scenarioIndex)}
                                className="min-h-[34px] rounded-xl bg-white/15 text-white px-3 py-1 text-xs font-bold cursor-pointer"
                              >
                                ↻ Reboot
                              </button>
                            </div>

                            {/* Quick Scenario Switcher */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {SCENARIOS.map((sc, idx) => (
                                <button
                                  key={sc.id}
                                  type="button"
                                  onClick={() => bootScenario(idx)}
                                  className={`min-h-[34px] rounded-xl px-2.5 py-1 text-[11px] font-bold text-left truncate cursor-pointer border ${
                                    idx === scenarioIndex
                                      ? 'bg-white text-zinc-950 border-white'
                                      : 'bg-white/10 text-zinc-200 border-white/15'
                                  }`}
                                >
                                  {sc.shortName}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Authentic Squircle App Icon Grid */}
                    <div className="grid grid-cols-4 gap-y-4 gap-x-2 py-3 relative z-10">
                      {scenario.homeApps.map((appId) => {
                        const app = scenario.appDefinitions[appId];
                        const badgeCount = getAppBadgeCount(appId);
                        const isTargetApp = activeStep.focusApps.includes(appId);

                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() =>
                              navigateTo({
                                view: 'app',
                                appId: app.id,
                                screenId: app.homeScreenId,
                              })
                            }
                            className="flex flex-col items-center gap-1.5 group cursor-pointer"
                          >
                            <div className="relative">
                              <div
                                className={`w-[58px] h-[58px] rounded-[18px] bg-gradient-to-br ${app.gradientClass} flex items-center justify-center text-2xl font-extrabold text-white shadow-lg border border-white/20 transition-transform group-active:scale-95 ${
                                  isTargetApp
                                    ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950'
                                    : ''
                                }`}
                              >
                                {app.glyph}
                              </div>
                              {badgeCount > 0 ? (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-red-600 text-white text-[11px] font-extrabold flex items-center justify-center px-1 shadow border border-slate-950">
                                  {badgeCount}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-center leading-tight line-clamp-1">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Page Dots + Frosted-Glass Bottom Dock */}
                    <div className="space-y-2.5 relative z-10">
                      <div
                        aria-hidden="true"
                        className="flex items-center justify-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/35" />
                      </div>

                      <div className="rounded-[26px] bg-white/15 backdrop-blur-xl border border-white/15 p-2.5 grid grid-cols-4 gap-2 shadow-xl">
                        {scenario.dockApps.map((dockAppId) => {
                          const app = scenario.appDefinitions[dockAppId];
                          const badgeCount = getAppBadgeCount(dockAppId);
                          return (
                            <button
                              key={'dock-' + app.id}
                              type="button"
                              onClick={() =>
                                navigateTo({
                                  view: 'app',
                                  appId: app.id,
                                  screenId: app.homeScreenId,
                                })
                              }
                              className="flex flex-col items-center justify-center cursor-pointer group"
                            >
                              <div className="relative">
                                <div
                                  className={`w-[50px] h-[50px] rounded-[16px] bg-gradient-to-br ${app.gradientClass} flex items-center justify-center text-xl font-extrabold text-white shadow-md border border-white/20 transition-transform group-active:scale-95`}
                                >
                                  {app.glyph}
                                </div>
                                {badgeCount > 0 ? (
                                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow border border-slate-950">
                                    {badgeCount}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ----------------------------------------------------------
                    VIEW C: RECENT APPS CAROUSEL (`□` Recents)
                   ---------------------------------------------------------- */}
                {currentNav.view === 'recents' ? (
                  <div className="flex-1 bg-zinc-900/95 text-white p-4 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-zinc-200">
                          Recent Apps
                        </h2>
                        {recentApps.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setRecentApps([])}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200 cursor-pointer"
                          >
                            Clear all
                          </button>
                        ) : null}
                      </div>

                      {recentApps.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                          <p className="text-sm font-bold text-zinc-400">
                            No recent items
                          </p>
                          <p className="text-xs text-zinc-500">
                            Tap Home (○) below to launch an app.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentApps.map((appId) => {
                            const app = scenario.appDefinitions[appId];
                            return (
                              <button
                                key={'recent-' + app.id}
                                type="button"
                                onClick={() =>
                                  navigateTo({
                                    view: 'app',
                                    appId: app.id,
                                    screenId: app.homeScreenId,
                                  })
                                }
                                className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden text-left shadow-lg cursor-pointer hover:border-sky-400"
                              >
                                <div
                                  style={{ backgroundColor: app.accentColor }}
                                  className="px-3.5 py-2 flex items-center justify-between text-white"
                                >
                                  <span className="text-xs font-extrabold">
                                    {app.glyph} {app.name}
                                  </span>
                                  <span className="text-[11px] opacity-90">
                                    Tap to resume
                                  </span>
                                </div>
                                <div className="p-3.5 bg-zinc-900/80 text-xs text-zinc-300">
                                  {app.subtitle}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* ----------------------------------------------------------
                    VIEW D: LIFELIKE NATIVE APP RENDERER
                   ---------------------------------------------------------- */}
                {currentNav.view === 'app' && currentNav.appId
                  ? (() => {
                      const app = scenario.appDefinitions[currentNav.appId];
                      const screenId =
                        currentNav.screenId ?? app.homeScreenId;
                      const screen = app.screens[screenId];
                      if (!screen) {
                        return null;
                      }

                      const dynamicBlocks =
                        dynamicBlocksByScreen[screen.id] ?? [];
                      const allBlocks = [...screen.blocks, ...dynamicBlocks];
                      const primaryActions = screen.actions.slice(0, 2);
                      const secondaryActions = screen.actions.slice(2);

                      return (
                        <div className="flex-1 min-h-0 flex flex-col bg-[#F6F7F9] text-zinc-900">
                          {/* App Top Bar */}
                          <div
                            style={{ backgroundColor: app.accentColor }}
                            className="px-4 py-3 text-white shrink-0 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold opacity-90">
                                  {app.glyph} {app.name}
                                </p>
                                <h1 className="text-base font-extrabold leading-snug truncate">
                                  {screen.title}
                                </h1>
                                {screen.subtitle ? (
                                  <p className="text-[11px] opacity-90 truncate">
                                    {screen.subtitle}
                                  </p>
                                ) : null}
                              </div>

                              {/* Subtle in-app Step Progress Badge */}
                              <span className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-extrabold shrink-0">
                                Step {currentStepIndex + 1}/
                                {scenario.steps.length}
                              </span>
                            </div>
                          </div>

                          {/* PayEasy Quick Actions Strip on PayEasy Home */}
                          {screen.id === 'payeasy_home' ? (
                            <div className="bg-blue-800 text-white px-4 py-2.5 grid grid-cols-3 gap-2 text-center text-[11px] font-bold shrink-0">
                              <div className="rounded-xl bg-white/10 py-1.5">
                                📷 Scan QR
                              </div>
                              <div className="rounded-xl bg-white/10 py-1.5">
                                👤 Pay Contacts
                              </div>
                              <div className="rounded-xl bg-white/10 py-1.5">
                                🏦 Check Balance
                              </div>
                            </div>
                          ) : null}

                          {/* Browser Address Bar on Browser Screen */}
                          {app.id === 'browser' ? (
                            <div className="bg-zinc-200 px-3 py-2 flex items-center gap-2 text-xs text-zinc-800 border-b border-zinc-300 shrink-0">
                              <span className="text-emerald-700 font-bold">
                                🔒
                              </span>
                              <span className="flex-1 rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] truncate border border-zinc-300">
                                {screen.title}
                              </span>
                            </div>
                          ) : null}

                          {/* Scrollable Screen Body */}
                          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                            {/* PIN / Unsafe Trap Educational Sheet */}
                            {trapLesson ? (
                              <div
                                role="alert"
                                className="rounded-2xl border-2 border-red-600 bg-red-50 p-3.5 space-y-2 shadow-sm"
                              >
                                <p className="text-xs font-extrabold uppercase tracking-wide text-red-900">
                                  ⚠ Practice Trap Triggered
                                </p>
                                <p className="text-xs font-bold text-red-950 leading-relaxed">
                                  {trapLesson}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setTrapLesson(null)}
                                  className="min-h-[36px] rounded-xl bg-red-700 text-white px-3 py-1 text-xs font-bold cursor-pointer"
                                >
                                  Got it — Try Safely
                                </button>
                              </div>
                            ) : null}

                            {/* Screen Content Blocks */}
                            {allBlocks.map((block) => {
                              if (block.kind === 'warning') {
                                return (
                                  <div
                                    key={block.id}
                                    className="rounded-2xl border border-amber-500 bg-amber-50 p-3.5 space-y-1"
                                  >
                                    {block.title ? (
                                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                                        {block.title}
                                      </p>
                                    ) : null}
                                    <p className="text-xs font-bold text-zinc-900 leading-relaxed">
                                      {block.body}
                                    </p>
                                  </div>
                                );
                              }

                              if (block.kind === 'message') {
                                const isThreadRow = Boolean(
                                  block.openScreenId || block.openAppId
                                );

                                if (isThreadRow) {
                                  return (
                                    <div
                                      key={block.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() =>
                                        navigateTo({
                                          view: 'app',
                                          appId: block.openAppId ?? app.id,
                                          screenId:
                                            block.openScreenId ??
                                            app.homeScreenId,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === 'Enter' ||
                                          e.key === ' '
                                        ) {
                                          e.preventDefault();
                                          navigateTo({
                                            view: 'app',
                                            appId: block.openAppId ?? app.id,
                                            screenId:
                                              block.openScreenId ??
                                              app.homeScreenId,
                                          });
                                        }
                                      }}
                                      className="rounded-2xl bg-white border border-zinc-200 p-3 flex items-start gap-3 shadow-xs hover:border-blue-500 cursor-pointer"
                                    >
                                      <span
                                        style={{
                                          backgroundColor:
                                            block.avatarColor ?? '#334155',
                                        }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                                      >
                                        {block.avatarText ??
                                          (block.sender ?? 'U').slice(0, 2)}
                                      </span>
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-extrabold text-zinc-900 truncate">
                                            {block.sender}
                                          </span>
                                          <span className="text-[10px] text-zinc-500 shrink-0">
                                            {block.timestamp}
                                          </span>
                                        </div>
                                        {block.senderMeta ? (
                                          <p className="text-[10px] font-semibold text-zinc-500">
                                            {block.senderMeta}
                                          </p>
                                        ) : null}
                                        <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed">
                                          {block.body}
                                        </p>
                                      </div>
                                      {block.unread ? (
                                        <span
                                          aria-label="Unread"
                                          className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1.5 shrink-0"
                                        />
                                      ) : null}
                                    </div>
                                  );
                                }

                                // Chat / SMS Bubble inside Thread
                                return (
                                  <div
                                    key={block.id}
                                    className="rounded-2xl rounded-tl-sm bg-white border border-zinc-200 p-3.5 shadow-xs space-y-1 max-w-[92%]"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold">
                                      <span>{block.sender}</span>
                                      <span>{block.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-zinc-900 leading-relaxed">
                                      {block.body}
                                    </p>
                                  </div>
                                );
                              }

                              if (block.kind === 'transaction') {
                                return (
                                  <div
                                    key={block.id}
                                    className="rounded-2xl bg-white border border-zinc-200 p-3 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-xs font-extrabold text-zinc-900">
                                        {block.title}
                                      </p>
                                      <p className="text-[11px] text-zinc-600">
                                        {block.body}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400">
                                      {block.timestamp}
                                    </span>
                                  </div>
                                );
                              }

                              // Field / Info Card
                              return (
                                <div
                                  key={block.id}
                                  className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-xs space-y-0.5"
                                >
                                  {block.title ? (
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                      {block.title}
                                    </p>
                                  ) : null}
                                  <p className="text-sm font-extrabold text-zinc-900 leading-relaxed">
                                    {block.body}
                                  </p>
                                </div>
                              );
                            })}

                            {/* NPCI-Style 4-Digit UPI PIN Keypad Layout */}
                            {screen.layout === 'keypad' ? (
                              <div className="rounded-2xl bg-white border border-zinc-300 p-3.5 space-y-3 shadow-sm">
                                <p className="text-center text-[11px] font-extrabold tracking-wider text-zinc-700">
                                  {screen.keypadHint ??
                                    'ENTER 4-DIGIT UPI PIN'}
                                </p>
                                <div className="flex justify-center gap-3.5 py-1">
                                  {[0, 1, 2, 3].map((dot) => (
                                    <span
                                      key={'pin-dot-' + String(dot)}
                                      className="w-4 h-4 rounded-full border-2 border-zinc-500 inline-block"
                                    />
                                  ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    '1',
                                    '2',
                                    '3',
                                    '4',
                                    '5',
                                    '6',
                                    '7',
                                    '8',
                                    '9',
                                    '0',
                                  ].map((digit) => (
                                    <button
                                      key={'npci-key-' + digit}
                                      type="button"
                                      onClick={() =>
                                        handleKeypadDigitTap(screen)
                                      }
                                      className={`min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-lg cursor-pointer ${
                                        digit === '0' ? 'col-span-3' : ''
                                      }`}
                                    >
                                      {digit}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {/* Realistic T9 Phone Dialer Layout */}
                            {screen.layout === 'dialer' ? (
                              <div className="space-y-3">
                                {screen.dialNumbers?.map((dn) => (
                                  <button
                                    key={dn.number}
                                    type="button"
                                    onClick={() =>
                                      navigateTo({
                                        view: 'app',
                                        appId: app.id,
                                        screenId: dn.targetScreenId,
                                      })
                                    }
                                    className="w-full min-h-[54px] rounded-2xl bg-white border border-zinc-200 px-3.5 py-2.5 flex items-center justify-between text-left shadow-xs cursor-pointer hover:border-emerald-600"
                                  >
                                    <div>
                                      <p className="text-xs font-extrabold text-zinc-900">
                                        {dn.label}
                                      </p>
                                      <p className="text-xs font-bold text-emerald-700">
                                        {dn.number}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold">
                                      📞 Call
                                    </span>
                                  </button>
                                ))}

                                <div className="rounded-2xl bg-white border border-zinc-200 p-3 space-y-2.5">
                                  <div className="min-h-[34px] flex items-center justify-between px-2 border-b border-zinc-100 pb-1.5">
                                    <span className="text-lg font-extrabold tracking-wider text-zinc-900 tabular-nums">
                                      {dialedNumber || 'Enter number'}
                                    </span>
                                    {dialedNumber ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDialedNumber((d) =>
                                            d.slice(0, -1)
                                          )
                                        }
                                        aria-label="Backspace"
                                        className="text-sm font-bold text-zinc-500 px-2 cursor-pointer"
                                      >
                                        ⌫
                                      </button>
                                    ) : null}
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5">
                                    {DIALER_KEYS.map((k) => (
                                      <button
                                        key={'t9-' + k.digit}
                                        type="button"
                                        onClick={() =>
                                          setDialedNumber((d) =>
                                            d.length < 13 ? d + k.digit : d
                                          )
                                        }
                                        className="min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200 flex flex-col items-center justify-center cursor-pointer"
                                      >
                                        <span className="text-base font-extrabold text-zinc-900 leading-none">
                                          {k.digit}
                                        </span>
                                        {k.letters ? (
                                          <span className="text-[9px] font-bold text-zinc-500 mt-0.5">
                                            {k.letters}
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (dialedNumber === '1930') {
                                        const target =
                                          screen.dialNumbers?.[0]
                                            ?.targetScreenId;
                                        if (target) {
                                          navigateTo({
                                            view: 'app',
                                            appId: app.id,
                                            screenId: target,
                                          });
                                          return;
                                        }
                                      }
                                      setToastText(
                                        'Practice dialer: dial 1930 for Cyber Helpline.'
                                      );
                                    }}
                                    className="w-full min-h-[44px] rounded-full bg-emerald-600 text-white font-extrabold text-sm cursor-pointer"
                                  >
                                    📞 Call
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {/* Settings Scenario Switcher & Reset inside Settings App */}
                            {app.id === 'settings' ? (
                              <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 space-y-2.5">
                                <p className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">
                                  PracticeOS Scenario Control
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {SCENARIOS.map((sc, idx) => (
                                    <button
                                      key={'set-sc-' + sc.id}
                                      type="button"
                                      onClick={() => bootScenario(idx)}
                                      className={`min-h-[42px] rounded-xl px-3 py-2 text-left text-xs font-bold border cursor-pointer ${
                                        idx === scenarioIndex
                                          ? 'bg-blue-50 border-blue-700 text-blue-900'
                                          : 'bg-zinc-50 border-zinc-300 text-zinc-800'
                                      }`}
                                    >
                                      {idx === scenarioIndex ? '✓ ' : ''}
                                      {sc.shortName}: {sc.title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {/* Neutral Decision Action Buttons (Max 2 primary + "⋯ More") */}
                            {primaryActions.length > 0 ? (
                              <div
                                className={`space-y-2 pt-1 rounded-2xl ${
                                  coachTier === 3
                                    ? 'ring-2 ring-blue-600 p-2 bg-blue-50/70'
                                    : ''
                                }`}
                              >
                                {primaryActions.map((act) => (
                                  <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => executeAction(act)}
                                    className="w-full min-h-[46px] rounded-xl border-2 border-blue-700 bg-white hover:bg-blue-50 text-blue-950 px-3.5 py-2.5 text-xs font-extrabold cursor-pointer transition-colors"
                                  >
                                    {act.label}
                                  </button>
                                ))}

                                {secondaryActions.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMoreActionsOpen((m) => !m)
                                      }
                                      className="w-full min-h-[38px] rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-800 px-3 py-1.5 text-xs font-bold cursor-pointer"
                                    >
                                      {moreActionsOpen
                                        ? 'Hide More ▲'
                                        : '⋯ More'}
                                    </button>
                                    {moreActionsOpen
                                      ? secondaryActions.map((sec) => (
                                          <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => executeAction(sec)}
                                            className="w-full min-h-[42px] rounded-xl border border-zinc-300 bg-white text-zinc-900 px-3 py-2 text-xs font-bold cursor-pointer"
                                          >
                                            {sec.label}
                                          </button>
                                        ))
                                      : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {/* Subtle Bottom Feedback / Coach Bar inside App */}
                          <div className="px-3.5 py-2 bg-white border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0">
                            <p className="text-[11px] font-semibold text-zinc-700 truncate flex-1">
                              {activeCoachMessage
                                ? `💡 ${activeCoachMessage}`
                                : toastText ?? activeStep.prompt}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setCoachTier((t) =>
                                  t >= 3 ? 1 : ((t + 1) as 1 | 2 | 3)
                                )
                              }
                              className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-extrabold text-blue-800 shrink-0 cursor-pointer"
                            >
                              Hint
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  : null}

                {/* ============================================================
                    5. END-OF-DRILL DEBRIEF SHEET (Native Bottom Sheet)
                   ============================================================ */}
                {debriefOpen ? (
                  <div className="absolute inset-0 z-30 bg-black/65 backdrop-blur-xs flex items-end">
                    <div className="w-full rounded-t-[28px] bg-white text-zinc-900 p-5 space-y-3.5 max-h-[90%] overflow-y-auto shadow-2xl">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-emerald-100 text-emerald-900 px-3 py-0.5 text-xs font-extrabold">
                          {completedStepIds.length >= scenario.steps.length
                            ? 'Drill Complete ✓'
                            : 'Practice Summary'}
                        </span>
                        <span className="text-sm font-extrabold text-blue-800">
                          Safety Score: {safetyScore}%
                        </span>
                      </div>

                      <h2 className="text-lg font-extrabold text-zinc-900 leading-snug">
                        {scenario.title}
                      </h2>

                      {/* Safe Steps Checklist */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">
                          Safe Steps Checklist
                        </p>
                        {scenario.steps.map((st) => {
                          const done = completedStepIds.includes(st.stepId);
                          return (
                            <div
                              key={'deb-' + st.id}
                              className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-zinc-900">
                                {st.title}
                              </span>
                              <span
                                className={
                                  done
                                    ? 'font-extrabold text-emerald-700'
                                    : 'font-bold text-zinc-400'
                                }
                              >
                                {done ? '✓ Safe' : 'Pending'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Traps & Actions Summary */}
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                        <p className="font-extrabold text-zinc-900">
                          {triggeredUnsafeIds.length === 0
                            ? '0 unsafe actions — Clean run!'
                            : `${triggeredUnsafeIds.length} trap(s) triggered during practice`}
                        </p>
                        {phishingClueNotes.length > 0 ? (
                          <p className="text-zinc-600">
                            Clues spotted: {phishingClueNotes.join(' · ')}
                          </p>
                        ) : null}
                        <p className="text-zinc-700 pt-1">
                          <span className="font-bold">Golden Rule: </span>
                          {scenario.goldenRule}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Recorded {actionsLog.length} simulated action(s).
                        </p>
                      </div>

                      {/* Replay or Switch Scenario */}
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => bootScenario(scenarioIndex)}
                          className="w-full min-h-[46px] rounded-xl bg-blue-700 text-white font-extrabold text-sm cursor-pointer"
                        >
                          Replay Scenario
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            bootScenario((scenarioIndex + 1) % SCENARIOS.length)
                          }
                          className="w-full min-h-[44px] rounded-xl border-2 border-blue-700 bg-white text-blue-900 font-extrabold text-xs cursor-pointer"
                        >
                          Try{' '}
                          {
                            SCENARIOS[(scenarioIndex + 1) % SCENARIOS.length]!
                              .shortName
                          }
                        </button>
                        {completedStepIds.length < scenario.steps.length ? (
                          <button
                            type="button"
                            onClick={() => setDebriefOpen(false)}
                            className="w-full min-h-[38px] text-xs font-bold text-zinc-500 cursor-pointer"
                          >
                            Continue Practicing
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ==============================================================
                6. PERSISTENT ANDROID 3-BUTTON NAVIGATION BAR (◁  ○  □)
               ============================================================== */}
            <nav
              aria-label="Android system navigation"
              className="w-full h-[48px] bg-zinc-950 text-zinc-200 border-t border-white/10 grid grid-cols-3 shrink-0 z-30"
            >
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back"
                className="min-h-[48px] flex items-center justify-center text-base font-bold hover:bg-white/10 active:bg-white/15 cursor-pointer"
              >
                ◁
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ view: 'home' })}
                aria-label="Home"
                className="min-h-[48px] flex items-center justify-center text-base font-bold hover:bg-white/10 active:bg-white/15 cursor-pointer"
              >
                ○
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ view: 'recents' })}
                aria-label="Recents"
                className="min-h-[48px] flex items-center justify-center text-base font-bold hover:bg-white/10 active:bg-white/15 cursor-pointer"
              >
                □
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}