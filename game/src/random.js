// A small seeded random number generator (mulberry32) plus the few helpers the game
// draws from it. The same seed always gives the same garden, the same spawn pattern and
// the same screenshot scenes, which is what makes the game's renders repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max) from the given generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max] inclusive from the given generator. */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of a non-empty array, chosen by the given generator. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
