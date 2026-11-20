import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { RedFlag } from "@/types";
import { cn } from "@/utils/cn";

interface RedFlagTextProps {
  text: string;
  flags: RedFlag[];
  found: string[];
  onFlag: (flagId: string) => void;
  /** Called when plain (non-suspicious) text is tapped. */
  onMiss: () => void;
  phrases?: string[];
  highlightHints?: boolean;
  className?: string;
}

type Segment =
  | { kind: "plain"; text: string }
  | { kind: "flag"; text: string; flag: RedFlag; isSynthetic?: boolean };

function mergeFlagsAndPhrases(
  text: string,
  flags: RedFlag[],
  phrases?: string[],
): Array<{ flag: RedFlag; index: number; isSynthetic: boolean }> {
  const hits: Array<{ flag: RedFlag; index: number; isSynthetic: boolean }> = [];
  const lowerText = text.toLowerCase();

  for (const flag of flags) {
    if (!flag.textFragment) continue;
    let index = text.indexOf(flag.textFragment);
    if (index < 0) index = lowerText.indexOf(flag.textFragment.toLowerCase());
    if (index >= 0) {
      hits.push({ flag, index, isSynthetic: false });
    }
  }

  if (phrases && phrases.length > 0) {
    phrases.forEach((phrase, idx) => {
      const clean = phrase.trim();
      if (!clean) return;
      let index = text.indexOf(clean);
      if (index < 0) index = lowerText.indexOf(clean.toLowerCase());
      if (index < 0) return;

      const end = index + clean.length;
      const overlaps = hits.some(
        (h) => index < h.index + h.flag.textFragment.length && end > h.index,
      );
      if (overlaps) return;

      const matchedText = text.slice(index, end);
      hits.push({
        index,
        isSynthetic: true,
        flag: {
          id: `phrase-${idx}-${clean.slice(0, 16).replace(/\W+/g, "-").toLowerCase()}`,
          textFragment: matchedText,
          label: "Suspicious detail",
          explanation: `Watch out for "${matchedText}" — urgency, requests for PIN/OTP, unknown links, or unverified IDs are classic scam signals.`,
        },
      });
    });
  }

  return hits.sort((a, b) => a.index - b.index);
}

function buildSegments(text: string, flags: RedFlag[], phrases?: string[]): Segment[] {
  const hits = mergeFlagsAndPhrases(text, flags, phrases);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.index < cursor) continue; // skip overlaps
    if (hit.index > cursor) segments.push({ kind: "plain", text: text.slice(cursor, hit.index) });
    const slice = text.slice(hit.index, hit.index + hit.flag.textFragment.length);
    segments.push({ kind: "flag", text: slice, flag: hit.flag, isSynthetic: hit.isSynthetic });
    cursor = hit.index + hit.flag.textFragment.length;
  }
  if (cursor < text.length) segments.push({ kind: "plain", text: text.slice(cursor) });
  return segments;
}

/**
 * Message text whose suspicious fragments are tappable (keyboard accessible).
 * Correct flags pulse green and show a short explanation; plain-text taps shake softly red.
 */
export function RedFlagText({
  text,
  flags,
  found,
  onFlag,
  onMiss,
  phrases,
  highlightHints = false,
  className,
}: RedFlagTextProps) {
  const segments = useMemo(() => buildSegments(text, flags, phrases), [text, flags, phrases]);
  const [bad, setBad] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const miss = (key: string) => {
    onMiss();
    setBad(key);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBad(null), 480);
  };

  const foundHere = segments.flatMap((s) => (s.kind === "flag" && found.includes(s.flag.id) ? [s.flag] : []));

  return (
    <div className={className}>
      <p className="leading-relaxed">
        {segments.map((seg, si) => {
          if (seg.kind === "flag") {
            const isFound = found.includes(seg.flag.id);
            return (
              <button
                key={`f-${si}`}
                type="button"
                onClick={() => onFlag(seg.flag.id)}
                aria-label={`Suspicious part: ${seg.text}`}
                className={cn(
                  "-mx-0.5 inline rounded px-0.5 text-left align-baseline decoration-2 underline-offset-4 transition-colors hover:underline focus-visible:underline",
                  isFound
                    ? "flag-pulse-ok bg-success/20 underline decoration-success"
                    : highlightHints
                      ? "bg-amber-100/75 underline decoration-amber-500 decoration-dotted hover:bg-amber-200/80"
                      : "decoration-dotted hover:bg-accent-tint",
                )}
              >
                {seg.text}
              </button>
            );
          }
          return seg.text.split(/(\s+)/).map((token, ti) => {
            if (token === "" || /^\s+$/.test(token)) return token;
            const key = `${si}-${ti}`;
            return (
              <span
                key={key}
                onClick={() => miss(key)}
                className={cn("cursor-pointer rounded-sm", bad === key && "flag-shake-bad")}
              >
                {token}
              </span>
            );
          });
        })}
      </p>
      {foundHere.length > 0 && (
        <ul aria-live="polite" className="mt-2 space-y-1.5">
          {foundHere.map((flag) => (
            <li
              key={flag.id}
              className="flex items-start gap-1.5 rounded-xl bg-success/12 px-2.5 py-1.5 text-[12.5px] leading-snug text-success-text"
            >
              <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">{flag.label}.</strong> {flag.explanation}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
