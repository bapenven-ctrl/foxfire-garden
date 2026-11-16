// Every tuning number and colour of FOXFIRE in one place. The garden is a fixed 1280x720
// logical field; the renderer scales it to the window, so no rule below depends on the
// screen size, and the simulation advances in fixed 1/60 s steps whatever the display rate.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The Great Bloom stands at the garden's heart; everything defends or attacks this point. */
export const BLOOM = {
  x: 640,
  y: 396,
  radius: 46,
  maxHp: 135,
  /** Pollen gathered per automatic bloom heal, and how much one heal restores. */
  pollenPerHeal: 30,
  healAmount: 14,
};

export const PLAYER = {
  radius: 16,
  speed: 252,
  maxHearts: 6,
  fireInterval: 0.155,
  bulletSpeed: 660,
  bulletDamage: 1,
  bulletLife: 0.95,
  dashTime: 0.16,
  dashSpeedScale: 3.1,
  dashCooldown: 1.6,
  hurtInvulnerable: 0.9,
  magnetRadius: 54,
};

export const WAVES = {
  /** Ten nights: clear the tenth, whose Matriarch leads it, and dawn breaks. */
  total: 10,
  bossWave: 10,
  /** Spawn points a night spends on gloom creatures (the boss is extra). */
  budgetBase: 9,
  budgetPerWave: 3,
  /** Seconds between spawns at a night's start and at its end: the trickle quickens. */
  spawnStart: 1.15,
  spawnEnd: 0.42,
  /** Nothing like a fair fight past this many creatures on screen at once. */
  maxAlive: 26,
  clearScorePerWave: 50,
};

export const POLLEN = { score: 5, driftSpeed: 120, collectRadius: 20 };

/** The night-garden palette: deep indigo darks, warm gold light, vermillion accents. */
export const PALETTE = {
  skyTop: '#0b0e24',
  skyMid: '#1c1440',
  skyLow: '#3a1f4d',
  dawnTop: '#2c2a5e',
  dawnMid: '#8a4470',
  dawnLow: '#e8906f',
  hillFar: '#171233',
  hillNear: '#100c26',
  groundTop: '#17352c',
  groundLow: '#0d2019',
  path: '#274435',
  moon: '#f6ead0',
  moonGlow: '#f2c94c',
  gold: '#f2c94c',
  goldSoft: '#ffd977',
  cream: '#fdf6e3',
  muted: '#b8aed6',
  vermillion: '#e5534b',
  foxfire: '#ffb347',
  bloomPetal: '#ff8fb2',
  bloomPetalDeep: '#e5538a',
  bloomHeart: '#ffd166',
  panel: 'rgba(16, 12, 38, 0.88)',
  panelEdge: '#f2c94c',
  moth: '#9d8bd0',
  mothWing: '#c9bdf0',
  beetle: '#2e7d6b',
  beetleShell: '#41a58c',
  darter: '#e5534b',
  darterWing: '#ffb59f',
  spitter: '#7fb069',
  spitterSac: '#c6e265',
  matriarch: '#b388eb',
  spore: '#a8e063',
  pollen: '#ffd977',
  heart: '#ff6b81',
};

export const DISPLAY_FONT = 'Georgia, "Times New Roman", serif';
export const BODY_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'foxfire.best';
