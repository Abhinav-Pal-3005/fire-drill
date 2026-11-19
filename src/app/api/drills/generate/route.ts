import { NextRequest, NextResponse } from "next/server";
import { compileScamToDrill, type CustomScamTheme } from "@/features/drills/smartDrillCompiler";
import { validateDrillDefinition } from "@/features/drills/stepValidator";

const VALID_THEMES: ReadonlySet<string> = new Set([
  "auto",
  "upi-collect",
  "apk-phishing",
  "customs-call",
  "voice-clone",
  "instant-loan",
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      text?: unknown;
      theme?: unknown;
      title?: unknown;
    } | null;

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const rawTheme = typeof body?.theme === "string" ? body.theme : "auto";
    const theme: CustomScamTheme = VALID_THEMES.has(rawTheme) ? (rawTheme as CustomScamTheme) : "auto";
    const title = typeof body?.title === "string" ? body.title.trim() : undefined;

    if (!text && theme === "auto") {
      return NextResponse.json(
        { ok: false, error: "Provide a suspicious SMS/message or choose a scam theme." },
        { status: 400 },
      );
    }

    const drill = compileScamToDrill({ text, theme, title });
    const issues = validateDrillDefinition(drill);
    if (issues.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Compiled drill failed schema validation.", issues },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, drill });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unable to compile scenario." },
      { status: 500 },
    );
  }
}
