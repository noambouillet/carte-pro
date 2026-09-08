const UINT32_RANGE = 4294967296;

export function xmur3(input: string): () => number {
  let hash = 1779033703 ^ input.length;

  for (let i = 0; i < input.length; i++) {
    const character = input.charCodeAt(i);

    hash = Math.imul(hash ^ character, 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822519);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489917);
    hash ^= hash >>> 16;

    return hash >>> 0;
  };
}

export function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let value = Math.imul(
      state ^ (state >>> 15),
      1 | state,
    );

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export type Rng = () => number;

export function makeRng(seed: string): Rng {
  return mulberry32(xmur3(seed)());
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randAmount(rng: Rng, min: number, max: number, step = 0.5): number {
  const steps = Math.round((max - min) / step);
  return Math.round((min + randInt(rng, 0, steps) * step) * 100) / 100;
}

export function hex(rng: Rng, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++)
    s += Math.floor(rng() * 16).toString(16);
  return s;
}
