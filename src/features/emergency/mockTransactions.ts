import type { OutboundTransaction } from "./types";

interface SeedTransactionTemplate {
  id: string;
  recipientName: string;
  recipientVpa: string;
  beneficiaryBank: string;
  amountInr: number;
  minutesAgo: number;
  relativeTime: string;
  utrPrefix: string;
  rail: "UPI" | "IMPS" | "CARD";
}

const TEMPLATES: SeedTransactionTemplate[] = [
  {
    id: "tx-emg-1",
    recipientName: "Ramesh Kumar Verification Desk",
    recipientVpa: "kyc.verify88@okaxis",
    beneficiaryBank: "Axis Bank",
    amountInr: 48500,
    minutesAgo: 2,
    relativeTime: "2 min ago",
    utrPrefix: "432419",
    rail: "UPI",
  },
  {
    id: "tx-emg-2",
    recipientName: "Express Parcel Customs Hold",
    recipientVpa: "clearance.desk24@ybl",
    beneficiaryBank: "YES Bank",
    amountInr: 19999,
    minutesAgo: 7,
    relativeTime: "7 min ago",
    utrPrefix: "432418",
    rail: "UPI",
  },
  {
    id: "tx-emg-3",
    recipientName: "Suresh Enterprise Settlement",
    recipientVpa: "IMPS-A/C ····6419",
    beneficiaryBank: "IndusInd Bank",
    amountInr: 75000,
    minutesAgo: 18,
    relativeTime: "18 min ago",
    utrPrefix: "432417",
    rail: "IMPS",
  },
  {
    id: "tx-emg-4",
    recipientName: "Instant Refund Support Care",
    recipientVpa: "refund.care99@okicici",
    beneficiaryBank: "ICICI Bank",
    amountInr: 9450,
    minutesAgo: 41,
    relativeTime: "41 min ago",
    utrPrefix: "432416",
    rail: "UPI",
  },
  {
    id: "tx-emg-5",
    recipientName: "Global Digital Services POS",
    recipientVpa: "VISA ····4821",
    beneficiaryBank: "HDFC Bank",
    amountInr: 14200,
    minutesAgo: 135,
    relativeTime: "2 hr ago",
    utrPrefix: "432414",
    rail: "CARD",
  },
];

function generateSixDigits(seedOffset: number): string {
  const base = (Date.now() + seedOffset * 7919) % 900000;
  return String(100000 + Math.abs(base)).slice(0, 6);
}

/**
 * Produces realistic recent outbound transactions anchored to the exact moment SOS is triggered,
 * carrying hidden bank routing metadata (12-digit UTR, VPA, beneficiary bank, exact ISO time)
 * so the panicked user only taps cards and never types a single digit.
 */
export function buildRecentOutboundTransactions(nowMs = Date.now()): OutboundTransaction[] {
  return TEMPLATES.map((tpl, idx) => ({
    id: tpl.id,
    recipientName: tpl.recipientName,
    recipientVpa: tpl.recipientVpa,
    beneficiaryBank: tpl.beneficiaryBank,
    amountInr: tpl.amountInr,
    relativeTime: tpl.relativeTime,
    timestampIso: new Date(nowMs - tpl.minutesAgo * 60_000).toISOString(),
    utr: `${tpl.utrPrefix}${generateSixDigits(idx + 1)}`,
    rail: tpl.rail,
  }));
}
