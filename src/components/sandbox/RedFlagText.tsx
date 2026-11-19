import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { RedFlag } from "@/types";
import { cn } from "@/utils/cn";

interface RedFlagTextProps {
  text: string;
  flags?: RedFlag[];
  /** Optional raw red-flag phrases from ComposableDrillStep.redFlagPhrases for dynamic highlighting. */
  phrases?: string[];
  /** When true, subtly highlights unfound phrases (e.g. post-step or hint review). */
  highlightHints?: boolean;
  found?: string[];
  onFlag?: (flagId: string) => void;
  /** Called when plain (non-suspicious) text is tapped. */
  onMiss?: () => void;
  className?: string;
}

type Segment =
  | { kind: "plain"; text: string }
  | { kind: "flag"; text: string; flag: RedFlag };

function mergeFlags(flags: RedFlag[], phrases?: string[]): RedFlag[] {
  if (!phrases || phrases.length === 0) return flags;
  const existing = new Set(flags.map((f) => f.textFragment.toLowerCase()));
  const extras: RedFlag[] = [];
  phrases.forEach((phrase, idx) => {
    const clean = phrase.trim();
    if (!clean || existing.has(clean.toLowerCase())) return;
    existing.add(clean.toLowerCase());
    extras.push({
      id: `rf-phrase-${idx}-${clean.slice(0, 12).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      textFragment: clean,
      label: "Red flag cue",
      explanation: `“${clean}” is a classic social-engineering indicator used to rush or deceive you.`,
    });
  });
  return [...flags, ...extras];
}

function buildSegments(text: string, flags: RedFlag[]): Segment[] {
  const lowerText = text.toLowerCase();
  const hits = flags
    .map((flag) => {
      const exactIdx = text.indexOf(flag.textFragment);
      const index = exactIdx >= 0 ? exactIdx : lowerText.indexOf(flag.textFragment.toLowerCase());
      return { flag, index };
    })
    .filter((h) => h.index >= 0 && h.flag.textFragment.length > 0)
    .sort((a, b) => a.index - b.index || b.flag.textFragment.length - a.flag.textFragment.length);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.index < cursor) continue; // skip overlaps
    if (hit.index > cursor) segments.push({ kind: "plain", text: text.slice(cursor, hit.index) });
    const matched = text.slice(hit.index, hit.index + hit.flag.textFragment.length);
    segments.push({ kind: "flag", text: matched, flag: hit.flag });
    cursor = hit.index + matched.length;
  }
  if (cursor < text.length) segments.push({ kind: "plain", text: text.slice(cursor) });
  return segments;
}

/**
 * Message text whose suspicious fragments (from `flags` or `phrases`) are tappable & keyboard accessible.
 * Correct flags pulse green and show a short explanation; plain-text taps shake softly red.
 */
export function RedFlagText({
  text,
  flags = [],
  phrases,
  highlightHints = false,
  found = [],
  onFlag,
  onMiss,
  className,
}: RedFlagTextProps) {
  const mergedFlags = useMemo(() => mergeFlags(flags, phrases), [flags, phrases]);
  const segments = useMemo(() => buildSegments(text, mergedFlags), [text, mergedFlags]);
  const [bad, setBad] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const miss = (key: string) => {
    onMiss?.();
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
                onClick={() => onFlag?.(seg.flag.id)}
                aria-label={`Suspicious part: ${seg.text}`}
                className={cn(
                  "-mx-0.5 inline cursor-pointer rounded px-0.5 text-left align-baseline decoration-2 underline-offset-4 transition-colors hover:underline focus-visible:underline",
                  isFound
                    ? "flag-pulse-ok bg-success/20 underline decoration-success"
                    : highlightHints
                      ? "bg-amber-200/60 underline decoration-amber-600 decoration-dashed"
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
                onClick={() => (onMiss ? miss(key) : undefined)}
                className={cn(onMiss && "cursor-pointer rounded-sm", bad === key && "flag-shake-bad")}
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
