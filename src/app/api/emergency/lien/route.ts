import { NextRequest, NextResponse } from "next/server";
import type { ForensicDisputePayload } from "@/features/emergency/types";

export const dynamic = "force-dynamic";

function generateLienReference(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LIEN-NPCI-${stamp}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ForensicDisputePayload>;
    if (!body?.caseReferenceId || !body?.attackVector) {
      return NextResponse.json(
        { ok: false, error: "Invalid forensic dispute payload" },
        { status: 400 },
      );
    }

    // Brief realistic settlement-rail acknowledgement latency
    await new Promise((resolve) => setTimeout(resolve, 420));

    const lienReference = generateLienReference();

    return NextResponse.json({
      ok: true,
      status: "LOCKED",
      lienReference,
      caseReferenceId: body.caseReferenceId,
      disputedAmountInr: body.totalDisputedAmountInr ?? 0,
      utrsFlagged: Array.isArray(body.selectedTransactions)
        ? body.selectedTransactions.map((tx) => tx.utr)
        : [],
      lockedAtIso: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to process lien request" },
      { status: 500 },
    );
  }
}
