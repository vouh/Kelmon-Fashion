import { kenyaToday } from "@/lib/date-range";

/**
 * Orderings that keep one category from bunching up (a wall of perfumes).
 * Shuffles are seeded by the Kenya date, so the order holds all day and a
 * fresh mix appears tomorrow, rather than jumping on every refresh.
 */

type HasCategory = { category: string };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for arranging a shop window. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffledGroups<T extends HasCategory>(items: T[], salt: string): T[][] {
  const next = random(hash(`${kenyaToday()}:${salt}`));
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return shuffle([...groups.values()], next).map((group) => shuffle(group, next));
}

/**
 * One from each category in turn: bag, perfume, earrings, bag… Best for a
 * short row where every category should show up near the front.
 */
export function roundRobinByCategory<T extends HasCategory>(items: T[], salt = "row"): T[] {
  const groups = shuffledGroups(items, salt);
  const out: T[] = [];
  for (let round = 0; out.length < items.length; round++) {
    for (const group of groups) if (round < group.length) out.push(group[round]);
  }
  return out;
}

/**
 * Each category spread evenly through the whole list, so even the biggest one
 * is interleaved to the end instead of piling up once the others run out.
 */
export function spreadByCategory<T extends HasCategory>(items: T[], salt = "grid"): T[] {
  return shuffledGroups(items, salt)
    .flatMap((group, groupIndex) =>
      group.map((item, i) => ({ item, groupIndex, key: (i + 0.5) / group.length }))
    )
    .sort((a, b) => a.key - b.key || a.groupIndex - b.groupIndex)
    .map(({ item }) => item);
}
