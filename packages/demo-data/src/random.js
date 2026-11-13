/** Repeatable "random" numbers: the same text always gives the same sequence. */
export function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** Pick from `{ share }` items, where the shares add up to about 1. */
export const pickShare = (rand, list) => {
  let r = rand();
  for (const x of list) if ((r -= x.share) < 0) return x;
  return list[list.length - 1];
};

/** A whole number near `mean` (±20%). */
export const around = (rand, mean) => Math.max(0, Math.round(mean * (0.8 + rand() * 0.4)));

/** Whole number from min to max (inclusive). */
export const between = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));
