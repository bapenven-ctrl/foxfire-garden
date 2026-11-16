// The gloom that comes for the Great Bloom, and the director that sends it. Five kinds,
// each with its own silhouette, target and temper, so a night is read at a glance:
// moths drift at whatever is nearest, beetles march only for the Bloom and chew it hard,
// darters stalk the fox and lunge, spitters keep their distance and lob spores, and on
// the tenth night the Matriarch comes herself. The director spends each night's budget
// on kinds the night has unlocked, in trickle groups from the garden's edge.

import { FIELD, WAVES } from './config.js';
import { range } from './random.js';

export const KIND_MOTH = 'moth';
export const KIND_BEETLE = 'beetle';
export const KIND_DARTER = 'darter';
export const KIND_SPITTER = 'spitter';
export const KIND_MATRIARCH = 'matriarch';

export const ENEMIES = {
  [KIND_MOTH]: {
    hp: 3, speed: 62, radius: 15, cost: 1, score: 10, pollen: 1,
    chewDps: 2.2, contactDamage: 1, unlockWave: 1,
  },
  [KIND_BEETLE]: {
    hp: 14, speed: 34, radius: 24, cost: 3, score: 30, pollen: 3,
    chewDps: 6, contactDamage: 1, unlockWave: 2,
  },
  [KIND_DARTER]: {
    hp: 4, speed: 76, radius: 13, cost: 2, score: 20, pollen: 2,
    chewDps: 1.6, contactDamage: 1, unlockWave: 3,
    lungeSpeed: 335, lungeTime: 0.42, stalkTime: 0.9, recoverTime: 0.6,
  },
  [KIND_SPITTER]: {
    hp: 6, speed: 48, radius: 17, cost: 3, score: 25, pollen: 2,
    chewDps: 1.6, contactDamage: 1, unlockWave: 4,
    keepRange: 252, sporeInterval: 2.6, sporeSpeed: 215, sporeDamage: 5,
  },
  [KIND_MATRIARCH]: {
    hp: 340, speed: 30, radius: 46, cost: 0, score: 500, pollen: 50,
    chewDps: 12, contactDamage: 2, unlockWave: 10,
    burstInterval: 3.4, burstCount: 14, summonInterval: 6.5,
  },
};

/** The kinds a night may field, cheapest first. */
export function unlockedKinds(wave) {
  return Object.keys(ENEMIES).filter(
    (kind) => kind !== KIND_MATRIARCH && ENEMIES[kind].unlockWave <= wave,
  );
}

/**
 * A spawn point just outside one edge of the garden, so creatures walk in from the dark.
 * The top edge is left clear near the moon gate: most of the gloom comes from the sides
 * and the bottom, where the fox can meet it before it reaches the Bloom.
 */
export function spawnPoint(random) {
  const side = Math.floor(random() * 3); // 0 left, 1 right, 2 bottom
  if (side === 0) return { x: -36, y: range(random, 90, FIELD.height - 40) };
  if (side === 1) return { x: FIELD.width + 36, y: range(random, 90, FIELD.height - 40) };
  return { x: range(random, 60, FIELD.width - 60), y: FIELD.height + 36 };
}

/**
 * Build the night's spawn queue: a shuffled list of kinds whose total cost fits the
 * night's budget, favouring the night's newest kind a little so each unlock is felt.
 * The boss night fields the Matriarch plus a moth trickle instead.
 */
export function buildSpawnQueue(random, wave) {
  if (wave === WAVES.bossWave) {
    const queue = [KIND_MATRIARCH];
    for (let i = 0; i < 10; i += 1) queue.push(KIND_MOTH);
    return queue;
  }
  let budget = WAVES.budgetBase + WAVES.budgetPerWave * wave;
  const kinds = unlockedKinds(wave);
  const queue = [];
  while (budget > 0) {
    const affordable = kinds.filter((kind) => ENEMIES[kind].cost <= budget);
    if (affordable.length === 0) break;
    // Weight the newest unlocked kind double, so a night's new threat actually shows up.
    const newest = kinds[kinds.length - 1];
    const weighted = affordable.concat(affordable.includes(newest) ? [newest] : []);
    const kind = weighted[Math.floor(random() * weighted.length)];
    queue.push(kind);
    budget -= ENEMIES[kind].cost;
  }
  // Shuffle so kinds interleave instead of arriving in cost order.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const hold = queue[i];
    queue[i] = queue[j];
    queue[j] = hold;
  }
  return queue;
}

/** Seconds between spawns: the trickle quickens as the night's queue drains. */
export function spawnInterval(wave, fractionLeft) {
  const quickening = WAVES.spawnStart + (WAVES.spawnEnd - WAVES.spawnStart) * (1 - fractionLeft);
  return Math.max(0.3, quickening - wave * 0.02);
}
