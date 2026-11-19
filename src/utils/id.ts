let counter = 0;

/** Short unique id. Uses crypto.randomUUID when available. */
export function createId(prefix: string): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}${counter.toString(36)}`;
}

/** Anonymous learner id, e.g. L-3F9A. No personal data is involved. */
export function createLearnerId(): string {
  return `L-${Math.floor(Math.random() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0")}`;
}
