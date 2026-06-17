import type { Rng } from "./types";

export function mulberry32(seed: number): Rng {
  return function rand(): number {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rand: Rng, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function randomChoice<T>(rand: Rng, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
