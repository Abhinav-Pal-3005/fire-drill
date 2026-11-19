/** Small seeded PRNG (mulberry32) so every scenario is reproducible from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 16-bit seeds, shown as a 4-digit hex code such as A89F. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0x10000);
}

export function seedCode(seed: number): string {
  return (seed & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/** Fixed seed for the first-ever collect-request run. */
export const DEMO_SEED = 0xa89f;
