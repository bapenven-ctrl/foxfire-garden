// The blessings the garden offers between nights: after each cleared night the player
// chooses one of three, drawn without repeats from this pool by the game's seeded
// generator. Each blessing is a small, legible change to the fox, its foxfire or the
// Bloom — the choices are the game's build, and stacking them is how a run grows strong
// enough for the Matriarch. apply() mutates the world's stats block (and, for the two
// heart blessings, the fox or the Bloom at once).

/** The twelve blessings by name, in pool order — the garden's whole build, at a glance. */
export const BLESSING_NAMES = [
  'Ember Bolts', 'Rapid Fire', 'Twin Fire', 'Piercing Light', 'Swift Wings', 'Vital Nectar',
  'Bloomheart', 'Long Dash', 'Pollen Magnet', 'Frost Petals', 'Spirit Ward', 'Golden Pollen',
];

export const BLESSINGS = [
  {
    id: 'ember',
    name: 'Ember Bolts',
    glyph: '✦',
    line: 'Foxfire hits harder.',
    detail: '+25% bullet damage',
    apply(stats) { stats.damageScale *= 1.25; },
  },
  {
    id: 'rapid',
    name: 'Rapid Fire',
    glyph: '≫',
    line: 'The fox spits fire faster.',
    detail: '+18% fire rate',
    apply(stats) { stats.fireIntervalScale *= 0.85; },
  },
  {
    id: 'twin',
    name: 'Twin Fire',
    glyph: '⋈',
    line: 'Every shot forks in two.',
    detail: '+1 projectile per shot',
    apply(stats) { stats.projectiles += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Light',
    glyph: '➤',
    line: 'Bolts pass through the gloom.',
    detail: '+1 pierce per bolt',
    apply(stats) { stats.pierce += 1; },
  },
  {
    id: 'swift',
    name: 'Swift Wings',
    glyph: '❧',
    line: 'Paws barely touch the grass.',
    detail: '+12% move speed',
    apply(stats) { stats.speedScale *= 1.12; },
  },
  {
    id: 'vital',
    name: 'Vital Nectar',
    glyph: '♥',
    line: 'The garden mends its keeper.',
    detail: '+1 max heart, heal 2',
    apply(stats, world) {
      world.state.player.maxHearts += 1;
      world.state.player.hearts = Math.min(world.state.player.maxHearts, world.state.player.hearts + 2);
    },
  },
  {
    id: 'bloomheart',
    name: 'Bloomheart',
    glyph: '❀',
    line: 'The Great Bloom grows sturdier.',
    detail: '+30 Bloom health, heal 30',
    apply(stats, world) {
      world.state.bloom.maxHp += 30;
      world.state.bloom.hp = Math.min(world.state.bloom.maxHp, world.state.bloom.hp + 30);
    },
  },
  {
    id: 'longdash',
    name: 'Long Dash',
    glyph: '↯',
    line: 'The dash comes back sooner.',
    detail: '−30% dash cooldown',
    apply(stats) { stats.dashCooldownScale *= 0.7; },
  },
  {
    id: 'magnet',
    name: 'Pollen Magnet',
    glyph: '◎',
    line: 'Pollen drifts to the fox.',
    detail: '+70% pollen pull radius',
    apply(stats) { stats.magnetScale *= 1.7; },
  },
  {
    id: 'frost',
    name: 'Frost Petals',
    glyph: '❄',
    line: 'Bolts carry winter with them.',
    detail: 'Hits slow enemies by 25%',
    apply(stats) { stats.slowScale = Math.min(stats.slowScale, 0.75); },
  },
  {
    id: 'ward',
    name: 'Spirit Ward',
    glyph: '⬡',
    line: 'A ward turns one blow a night.',
    detail: '+1 shield each night',
    apply(stats) { stats.wardsPerWave += 1; },
  },
  {
    id: 'golden',
    name: 'Golden Pollen',
    glyph: '✿',
    line: 'Every grain shines brighter.',
    detail: '+50% pollen from the gloom',
    apply(stats) { stats.pollenScale *= 1.5; },
  },
];

export function blessingById(id) {
  return BLESSINGS.find((blessing) => blessing.id === id) ?? BLESSINGS[0];
}

/**
 * Draw `count` distinct blessings for a choice screen. Already-owned one-time blessings
 * (none are one-time here — every blessing stacks) stay in the pool; the draw itself
 * never repeats within one choice.
 */
export function drawBlessings(random, count) {
  const pool = BLESSINGS.slice();
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    drawn.push(pool.splice(index, 1)[0]);
  }
  return drawn;
}
