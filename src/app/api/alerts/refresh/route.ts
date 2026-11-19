import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { ConceptId, LibraryEntry, ScamType } from "@/types";

export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<ScamType, { concept: ConceptId; linkedDrillId: string }> = {
  "upi-pin-trap": { concept: "upi-safety", linkedDrillId: "collect-request" },
  "wrong-transfer": { concept: "reversals", linkedDrillId: "wrong-transfer" },
  "lost-phone": { concept: "fraud-response", linkedDrillId: "lost-phone" },
  "instant-loan": { concept: "interest-credit", linkedDrillId: "loan-offer" },
  phishing: { concept: "phishing-indicators", linkedDrillId: "phishing-sms" },
  "digital-arrest": { concept: "fraud-response", linkedDrillId: "digital-arrest" },
};

const VALID_SCAM_TYPES = new Set<ScamType>(Object.keys(CATEGORY_MAP) as ScamType[]);

interface RawCaseStudy {
  title?: string;
  scamType?: string;
  location?: string;
  amountLost?: string;
  date?: string;
  summary?: string;
  howItWorks?: string[];
  redFlags?: string[];
  howToStop?: string[];
  sourceName?: string;
  sourcePublisher?: string;
  sourceUrl?: string;
}

function getIsoWeekKey(date: Date): string {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function slugifyId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function extractJsonArray(rawText: string): RawCaseStudy[] {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (Array.isArray(parsed)) return parsed as RawCaseStudy[];
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { cases?: unknown }).cases)) {
      return (parsed as { cases: RawCaseStudy[] }).cases;
    }
  } catch {
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start !== -1 && end > start) {
      const sliced = candidate.slice(start, end + 1);
      const parsed = JSON.parse(sliced) as unknown;
      if (Array.isArray(parsed)) return parsed as RawCaseStudy[];
    }
  }
  return [];
}

function normalizeUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed.slice(0, 600);
  return "";
}

function cleanStringList(list: unknown, maxLen: number, fallback: string[]): string[] {
  if (!Array.isArray(list)) return fallback;
  const cleaned = list
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim().slice(0, maxLen))
    .filter((s) => s.length > 0)
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : fallback;
}

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to refresh weekly live scam alerts.",
      },
      { status: 500 },
    );
  }

  const now = new Date();
  const weekKey = getIsoWeekKey(now);
  const refreshedAt = now.getTime();
  const dateContext = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const prompt = `Today is ${dateContext} (week ${weekKey}). Use Google Search to find 5 real, recently reported financial, UPI, cyber, loan-app, SIM-swap, or digital-arrest fraud incidents in India (reported in credible Indian news outlets like Times of India, Indian Express, The Hindu, Economic Times, Hindustan Times, LiveMint, Deccan Herald, NDTV, PIB, or police advisories).

Return ONLY a valid JSON array of 5 objects with these exact keys (no extra prose outside the JSON):
[
  {
    "title": "Short factual incident headline (max 110 chars)",
    "scamType": "One of: upi-pin-trap | wrong-transfer | lost-phone | instant-loan | phishing | digital-arrest",
    "location": "City, State (e.g. Bengaluru, Karnataka)",
    "amountLost": "Reported loss in INR (e.g. ₹3.5 lakh)",
    "date": "Reported month/date (e.g. Nov 2026)",
    "summary": "2 concise sentences summarizing the real reported incident without inventing facts.",
    "howItWorks": ["Step 1...", "Step 2...", "Step 3..."],
    "redFlags": ["Warning sign 1...", "Warning sign 2...", "Warning sign 3..."],
    "howToStop": ["Safety step 1 (e.g. call 1930 / cybercrime.gov.in)...", "Safety step 2...", "Safety step 3..."],
    "sourceName": "Exact headline of the news report or advisory",
    "sourcePublisher": "Publisher name (e.g. The Indian Express)",
    "sourceUrl": "Direct https URL of the article from your search results"
  }
]

Ensure variety across scamType categories and strictly use real, grounded facts from search results.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a factual Indian cyber-fraud consumer safety researcher. Always ground case studies in Google Search results and output clean valid JSON only.",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? "";
    const rawCases = extractJsonArray(text);

    if (rawCases.length === 0) {
      return NextResponse.json(
        { error: "Could not parse grounded fraud case studies from search response. Please try refreshing again." },
        { status: 502 },
      );
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundedLinks = chunks
      .map((c) => ({
        uri: normalizeUrl(c.web?.uri),
        title: (c.web?.title ?? "").trim(),
      }))
      .filter((c) => Boolean(c.uri));

    const entries: LibraryEntry[] = rawCases.slice(0, 6).map((raw, idx) => {
      const scamType: ScamType = VALID_SCAM_TYPES.has(raw.scamType as ScamType)
        ? (raw.scamType as ScamType)
        : "upi-pin-trap";
      const meta = CATEGORY_MAP[scamType];
      const title = String(raw.title ?? "").trim().slice(0, 180) || `Reported ${scamType} fraud case`;
      const slug = slugifyId(title) || `case-${idx + 1}`;
      const id = `live-${weekKey}-${idx + 1}-${slug}`.slice(0, 64);

      const candidateUrl = normalizeUrl(raw.sourceUrl);
      const matchedChunk =
        groundedLinks.find((g) => {
          const pub = (raw.sourcePublisher ?? "").toLowerCase();
          return pub && g.title.toLowerCase().includes(pub);
        }) ?? groundedLinks[idx % Math.max(1, groundedLinks.length)];

      const resolvedUrl = candidateUrl || matchedChunk?.uri || "";
      const dateLabel = String(raw.date ?? "").trim().slice(0, 40) || now.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

      return {
        id,
        title,
        scamType,
        concept: meta.concept,
        location: String(raw.location ?? "").trim().slice(0, 100) || undefined,
        amountLost: String(raw.amountLost ?? "").trim().slice(0, 60) || undefined,
        summary:
          String(raw.summary ?? "").trim().slice(0, 500) ||
          "Recently reported financial cyber-fraud case study compiled for consumer awareness.",
        howItWorks: cleanStringList(raw.howItWorks, 360, [
          "Scammers initiated unsolicited contact posing as a trusted authority or payment counterparty.",
          "They created artificial urgency to push the victim into an unsafe payment or credential action.",
        ]),
        redFlags: cleanStringList(raw.redFlags, 260, [
          "Unsolicited urgency or threat demanding immediate financial action",
          "Request for UPI PIN, OTP, remote-access app, or transfer to an unfamiliar account",
        ]),
        howToStop: cleanStringList(raw.howToStop, 260, [
          "Disconnect immediately and verify independently through your bank's official helpline.",
          "Report within the Golden Hour by calling 1930 or filing on cybercrime.gov.in.",
        ]),
        source: {
          name: String(raw.sourceName ?? "").trim().slice(0, 180) || title,
          publisher:
            String(raw.sourcePublisher ?? "").trim().slice(0, 120) ||
            matchedChunk?.title ||
            "Reported News Advisory",
          url: resolvedUrl,
          date: dateLabel,
        },
        linkedDrillId: meta.linkedDrillId,
        verified: Boolean(resolvedUrl),
        lastVerifiedOn: dateLabel,
        isLiveAlert: true,
        weekKey,
        refreshedAt,
      };
    });

    return NextResponse.json({
      weekKey,
      refreshedAt,
      entries,
    });
  } catch (err) {
    console.error("Failed to fetch live weekly scam alerts:", err);
    const rawMsg = err instanceof Error ? err.message : "Failed to fetch weekly live scam alerts.";
    let friendlyMsg = rawMsg;
    let status = 502;

    try {
      const parsed = JSON.parse(rawMsg) as { error?: { code?: number; message?: string; status?: string } };
      if (parsed?.error?.message) {
        friendlyMsg = parsed.error.message.trim();
      }
      if (typeof parsed?.error?.code === "number" && parsed.error.code >= 400) {
        status = parsed.error.code;
      }
    } catch {
      // Keep rawMsg if not JSON
    }

    if (status === 429 || rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      status = 429;
      friendlyMsg =
        "Live search quota is temporarily exceeded. Check your Gemini API plan or try refreshing again later.";
    } else if (status === 403 || rawMsg.includes("PERMISSION_DENIED") || rawMsg.includes("API_KEY_INVALID")) {
      status = status === 400 ? 400 : 403;
      friendlyMsg = "Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.";
    }

    return NextResponse.json({ error: friendlyMsg }, { status });
  }
}
