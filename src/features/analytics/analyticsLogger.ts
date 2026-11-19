import type { LogEventInput } from "@/types";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

/** Stores one anonymous event in localStorage. Nothing leaves the device. */
export function logEvent(input: LogEventInput): void {
  useAnalyticsStore.getState().add(input);
}
