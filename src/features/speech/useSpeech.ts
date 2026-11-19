"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const subscribeNoop = (): (() => void) => () => undefined;

function detectSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Optional "Read aloud" using the Web Speech API. `supported` is false when unavailable (hide the button). */
export function useSpeech(): {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
} {
  const supported = useSyncExternalStore(subscribeNoop, detectSupport, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(
    () => () => {
      if (detectSupport()) window.speechSynthesis.cancel();
    },
    [],
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { supported, speaking, speak, stop };
}
