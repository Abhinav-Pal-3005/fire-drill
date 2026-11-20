import { NextRequest, NextResponse } from "next/server";
import { compileScamToDrill, type ScamTheme } from "@/features/drills/smartDrillCompiler";
import { validateDrillDefinition } from "@/features/drills/stepValidator";

export const dynamic = "force-dynamic";

const ALLOWED_THEMES = new Set<ScamTheme>([
  "auto",
  "upi-collect",
  "phishing-apk",
  "authority-call",
  "loan-trap",
  "voice-clone",
]);

export async function POST(req: NextRequest) {
  let body: { text?: unknown; theme?: unknown; title?: unknown };
  try {
    body = (await req.json()) as { text?: unknown; theme?: unknown; title?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 8) {
    return NextResponse.json(
      { error: "Please paste at least 8 characters of a scam message or call script." },
      { status: 400 },
    );
  }

  const theme: ScamTheme =
    typeof body.theme === "string" && ALLOWED_THEMES.has(body.theme as ScamTheme)
      ? (body.theme as ScamTheme)
      : "auto";

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : undefined;
  const drill = compileScamToDrill({ text: text.slice(0, 2000), theme, title });
  const issues = validateDrillDefinition(drill);

  if (issues.length > 0) {
    return NextResponse.json({ error: issues.join("; ") }, { status: 422 });
  }

  return NextResponse.json({ drill });
}
