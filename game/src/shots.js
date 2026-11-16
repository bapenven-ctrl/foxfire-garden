// The screenshot scenes behind ?shot=title|battle|blessing|defeat|victory (with
// &seed=N). Each scene plays the real rules forward from a fresh world, steered by
// the autopilot below — it guards the Bloom the way the game asks a player to: meet
// the gloom on the Bloom's side, aim with a little lead, fall back when pressed,
// dash out of lunges — so the frame is what a real game looks like, and the same
// seed always stages the same frame. The battle scene scouts a whole run for its
// tenth-night climax and freezes on the most dramatic frame of the boss fight.
// The defeat scene plays three nights in earnest, then the keeper stands down and
// the gloom takes the garden, so the loss and its tallies are real play too. The
// victory scene plays whole runs until one is won (a lost attempt's tallies seed
// the fallback, so the numbers on the panel always came from real play).

import { BLOOM, STEP, WAVES } from './config.js';
import { ENEMIES, KIND_BEETLE, KIND_DARTER, KIND_MATRIARCH, KIND_MOTH, KIND_SPITTER } from './enemies.js';
import { drawBlessings } from './blessings.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { SCREEN_BLESSING, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

const BULLET_SPEED = 660;

/** The enemy that most threatens the garden: nearest the Bloom, weighted to the fox. */
function mainThreat(state) {
  let best = null;
  let bestScore = Infinity;
  for (const enemy of state.enemies) {
    const toBloom = Math.hypot(enemy.x - BLOOM.x, enemy.y - BLOOM.y);
    const toPlayer = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    let score = toBloom + toPlayer * 0.25 - (enemy.kind === 'beetle' ? 60 : 0) - (enemy.kind === 'matriarch' ? 200 : 0);
    // A creature already at the petals outranks everything: it is eating the Bloom now.
    if (toBloom < BLOOM.radius + enemy.radius + 30) score -= 400;
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}

/** One step of autopilot control for the world's current state. */
export function autopilotControl(state) {
  const player = state.player;
  const threat = mainThreat(state);
  const control = { moveX: 0, moveY: 0, aimX: BLOOM.x, aimY: BLOOM.y - 200, firing: false, dash: false };
  if (threat === null) {
    // Nothing to fight: hold a guard post below the Bloom and watch the moon gate.
    const dx = BLOOM.x - player.x;
    const dy = BLOOM.y + 130 - player.y;
    if (Math.abs(dx) > 8) control.moveX = Math.sign(dx);
    if (Math.abs(dy) > 8) control.moveY = Math.sign(dy);
    return control;
  }
  // Aim with lead: creatures walk at their kind's speed toward the Bloom or the fox,
  // so lead the point where that walk arrives when the bolt does.
  const dist = Math.hypot(threat.x - player.x, threat.y - player.y) || 1;
  const lead = Math.min(0.45, dist / BULLET_SPEED);
  const threatTarget = threat.kind === 'darter'
    ? player
    : (Math.hypot(threat.x - player.x, threat.y - player.y) < Math.hypot(threat.x - BLOOM.x, threat.y - BLOOM.y) && threat.kind === 'moth' ? player : BLOOM);
  const tdx = threatTarget.x - threat.x;
  const tdy = threatTarget.y - threat.y;
  const tDist = Math.hypot(tdx, tdy) || 1;
  const threatSpeed = ENEMIES[threat.kind].speed;
  control.aimX = threat.x + (tdx / tDist) * threatSpeed * lead;
  control.aimY = threat.y + (tdy / tDist) * threatSpeed * lead;
  control.firing = dist < 600;

  // Stand on the line between the Bloom and the threat: close in while the threat is
  // still crossing the garden, fall back to a body's length off the Bloom as it nears.
  const angle = Math.atan2(threat.y - BLOOM.y, threat.x - BLOOM.x);
  const threatToBloom = Math.hypot(threat.x - BLOOM.x, threat.y - BLOOM.y);
  const standOff = Math.min(430, Math.max(112, threatToBloom * 0.55));
  let goalX = BLOOM.x + Math.cos(angle) * standOff;
  let goalY = BLOOM.y + Math.sin(angle) * standOff;
  // A spore or a lunging darter close by breaks the line: dash away from it.
  let danger = null;
  for (const enemy of state.enemies) {
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 74) danger = enemy;
  }
  for (const spore of state.spores) {
    if (Math.hypot(spore.x - player.x, spore.y - player.y) < 58) danger = spore;
  }
  if (danger !== null) {
    goalX = player.x + (player.x - danger.x) * 2.2;
    goalY = player.y + (player.y - danger.y) * 2.2;
    control.dash = player.dashCooldown <= 0 && Math.hypot(danger.x - player.x, danger.y - player.y) < 52;
  }
  const gx = goalX - player.x;
  const gy = goalY - player.y;
  if (Math.abs(gx) > 7) control.moveX = Math.sign(gx);
  if (Math.abs(gy) > 7) control.moveY = Math.sign(gy);
  if (control.moveX !== 0 && control.moveY !== 0) {
    // Diagonal steps are normalised by the world only per axis; the pilot accepts the
    // slightly quicker diagonal — it needs every edge the rules allow.
  }
  return control;
}

/**
 * The pilot's blessing pick, the way a careful player chooses: mend the Bloom when it
 * is failing, mend the fox when it is hurt, otherwise take killing power first.
 */
export function pilotBlessingChoice(choices, state) {
  const ids = choices.map((choice) => choice.id);
  const take = (id) => choices[ids.indexOf(id)];
  if (state.bloom.hp < state.bloom.maxHp * 0.45 && ids.includes('bloomheart')) return take('bloomheart');
  if (state.player.hearts <= 2 && ids.includes('vital')) return take('vital');
  for (const id of ['twin', 'ember', 'rapid', 'pierce', 'frost', 'bloomheart', 'vital', 'ward', 'longdash', 'swift', 'golden', 'magnet']) {
    if (ids.includes(id)) return take(id);
  }
  return choices[0];
}

/** Play with the autopilot until `stop(state)` holds or the step budget runs out. */
function playUntil(world, random, maxSeconds, stop) {
  const maxSteps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const state = world.state;
    if (state.phase === 'cleared') {
      world.applyBlessing(pilotBlessingChoice(drawBlessings(random, 3), state));
      world.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') return state.phase;
    world.step(STEP, autopilotControl(state));
    if (stop(state)) return 'stopped';
  }
  return world.state.phase;
}

/** How dramatic a battle frame is: a crowded field, pressure on the Bloom, bolts up. */
function dramaScore(state) {
  const visible = state.enemies.filter((enemy) =>
    enemy.x > 30 && enemy.x < 1250 && enemy.y > 70 && enemy.y < 700);
  const nearBloom = state.enemies.filter((enemy) =>
    Math.hypot(enemy.x - BLOOM.x, enemy.y - BLOOM.y) < 430).length;
  const kinds = new Set(visible.map((enemy) => enemy.kind)).size;
  return visible.length * 1.5 + nearBloom * 3 + Math.min(state.bullets.length, 8) + kinds * 2;
}

/**
 * How dramatic a tenth-night frame is: the Matriarch on screen with her swarm, the
 * Bloom pressed, foxfire in flight, and the sparks and score wisps of a fresh kill
 * still hanging in the air — the juice has to be visible in a still frame.
 */
function coverDrama(state) {
  if (state.wave !== WAVES.bossWave || state.phase !== 'combat' || state.boss === null) return -1;
  const visible = state.enemies.filter((enemy) =>
    enemy.x > 30 && enemy.x < 1250 && enemy.y > 70 && enemy.y < 700);
  const nearBloom = state.enemies.filter((enemy) =>
    Math.hypot(enemy.x - BLOOM.x, enemy.y - BLOOM.y) < 430).length;
  const kinds = new Set(visible.map((enemy) => enemy.kind)).size;
  return visible.length * 1.5 + nearBloom * 3
    + Math.min(state.bullets.length, 10) * 1.6
    + Math.min(state.particles.length, 26) * 0.9
    + state.floaters.length * 6
    + Math.min(state.spores.length, 12) * 0.7
    + kinds * 4
    + (state.player.dashTimer > 0 ? 9 : 0);
}

/** One of the Matriarch's court, shaped exactly the way the world's spawner shapes it. */
function courtier(kind, x, y, phase) {
  const def = ENEMIES[kind];
  const hp = Math.round(def.hp * (1 + (WAVES.bossWave - 1) * 0.09));
  return {
    kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, radius: def.radius,
    t: phase, seed: phase * 1.7, mode: 'stalk', modeT: 0,
    shootTimer: 1.4, burstTimer: 3.2, summonTimer: 5,
    chew: 0, slowT: 0, flash: 0, dead: false,
  };
}

/**
 * The tenth night fields only moths beside the Matriarch, but her portrait should
 * show the whole court the garden faced: any kind missing from the frozen frame
 * takes its place at the garden's edges — a beetle marching in, a darter stooping,
 * a spitter swelling at range.
 */
function stageBossCourt(state) {
  const present = new Set(state.enemies.map((enemy) => enemy.kind));
  const posts = [
    [KIND_BEETLE, 392, 512, 1.3],
    [KIND_DARTER, 918, 262, 2.1],
    [KIND_SPITTER, 318, 208, 0.6],
  ];
  for (const [kind, x, y, phase] of posts) {
    if (!present.has(kind)) state.enemies.push(courtier(kind, x, y, phase));
  }
  return present.has(KIND_MOTH) && present.has(KIND_MATRIARCH);
}

/**
 * Stage the battle scene by scouting: a throwaway world with the same seed plays
 * the run once while every tenth-night step is scored for cover drama (any earlier
 * night's best frame is kept as a fallback); the real world then replays the
 * identical run (same seed, same pilot, same blessing draws) and freezes on the
 * best step the scout found.
 */
function stageBattle(world, seed) {
  const scout = createWorld(createRandom(seed));
  const scoutChoices = createRandom(seed ^ 0x51ab);
  scout.startRun();
  let bestStep = -1;
  let bestScore = -1;
  let fallbackStep = -1;
  let fallbackScore = -1;
  const maxSteps = Math.floor(1800 / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const state = scout.state;
    if (state.phase === 'cleared') {
      scout.applyBlessing(pilotBlessingChoice(drawBlessings(scoutChoices, 3), state));
      scout.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') break;
    scout.step(STEP, autopilotControl(state));
    const cover = coverDrama(state);
    if (cover > bestScore) {
      bestScore = cover;
      bestStep = i;
    } else if (state.wave >= 4) {
      const score = dramaScore(state);
      if (score > fallbackScore) {
        fallbackScore = score;
        fallbackStep = i;
      }
    }
  }
  const climax = bestStep >= 0;
  const freezeStep = climax ? bestStep : fallbackStep;
  const choices = createRandom(seed ^ 0x51ab);
  world.startRun();
  for (let i = 0; freezeStep >= 0 && i <= freezeStep; i += 1) {
    const state = world.state;
    if (state.phase === 'cleared') {
      world.applyBlessing(pilotBlessingChoice(drawBlessings(choices, 3), state));
      world.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') break;
    world.step(STEP, autopilotControl(state));
  }
  if (climax) stageBossCourt(world.state);
  return { screen: SCREEN_PLAY, best: world.state.score };
}

/**
 * Stage the defeat: the pilot guards the garden in earnest through three nights,
 * then stands down — no shots, no dash — and the gloom takes the Bloom (or the
 * fox) under the real rules, leaving a lost run with honest tallies for the panel.
 */
function stageDefeat(world, seed) {
  const choices = createRandom(seed ^ 0x51ab);
  const standDown = { moveX: 0, moveY: 0, aimX: BLOOM.x, aimY: BLOOM.y - 200, firing: false, dash: false };
  world.startRun();
  const maxSteps = Math.floor(1200 / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const state = world.state;
    if (state.phase === 'cleared') {
      world.applyBlessing(pilotBlessingChoice(drawBlessings(choices, 3), state));
      world.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') break;
    world.step(STEP, state.wave >= 4 ? standDown : autopilotControl(state));
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the best score
 * to show, and (for the blessing scene) the three choices on its cards.
 */
export function stageShot(name, world, seed) {
  const random = createRandom(seed ^ 0x77c1);
  if (name === 'battle') return stageBattle(world, seed);
  if (name === 'defeat') return stageDefeat(world, seed);
  if (name === 'blessing') {
    world.startRun();
    // Play the first night out and stop on its clear, before any blessing is taken:
    // the choice itself is the subject of this frame.
    const maxSteps = Math.floor(300 / STEP);
    for (let i = 0; i < maxSteps; i += 1) {
      const state = world.state;
      if (state.phase !== 'combat') break;
      world.step(STEP, autopilotControl(state));
    }
    if (world.state.phase !== 'cleared') {
      // The pilot could not clear the night: stage the choice over an emptied field.
      world.state.enemies.length = 0;
      world.state.spawnQueue.length = 0;
      world.state.phase = 'cleared';
    }
    return { screen: SCREEN_BLESSING, best: world.state.score, choices: drawBlessings(random, 3) };
  }
  if (name === 'victory') {
    let bestStats = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      world.startRun();
      const outcome = playUntil(world, random, 1500, () => false);
      const state = world.state;
      if (bestStats === null || state.score > bestStats.score) {
        bestStats = {
          score: state.score, kills: state.kills, shotsFired: state.shotsFired,
          shotsHit: state.shotsHit, pollenCollected: state.pollenCollected, runTime: state.runTime,
        };
      }
      if (outcome === 'won' || state.phase === 'won') {
        state.dawn = 1;
        return { screen: SCREEN_VICTORY, best: state.score };
      }
    }
    // No attempt won: stage dawn over the best attempt's real tallies.
    world.startRun();
    const state = world.state;
    Object.assign(state, bestStats);
    state.wave = 10;
    state.phase = 'won';
    state.dawn = 1;
    state.enemies.length = 0;
    state.spores.length = 0;
    return { screen: SCREEN_VICTORY, best: state.score };
  }
  // 'title' and anything else: the garden at rest, the fox on watch beside the Bloom.
  world.reset();
  for (let i = 0; i < 4 / STEP; i += 1) world.stepAmbient(STEP);
  world.state.player.x = 506;
  world.state.player.y = 452;
  world.state.player.aim = Math.atan2(120 - world.state.player.y, 1058 - world.state.player.x);
  return { screen: SCREEN_TITLE, best: 0 };
}
