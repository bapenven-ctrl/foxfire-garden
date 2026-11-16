// The screenshot scenes behind ?shot=title|battle|blessing|victory (with &seed=N).
// Each scene plays the real rules forward from a fresh world, steered by the autopilot
// below — it guards the Bloom the way the game asks a player to: meet the gloom on the
// Bloom's side, aim with a little lead, fall back when pressed, dash out of lunges —
// so the frame is what a real game looks like, and the same seed always stages the
// same frame. The victory scene plays whole runs until one is won (a lost attempt's
// tallies seed the fallback, so the numbers on the panel always came from real play).

import { BLOOM, STEP } from './config.js';
import { ENEMIES } from './enemies.js';
import { drawBlessings } from './blessings.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { SCREEN_BLESSING, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

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
 * Stage the battle scene by scouting: a throwaway world with the same seed plays the
 * run once while every step past the third night is scored for drama; the real world
 * then replays the identical run (same seed, same pilot, same blessing draws) and
 * freezes on the best step the scout found.
 */
function stageBattle(world, seed) {
  const scout = createWorld(createRandom(seed));
  const scoutChoices = createRandom(seed ^ 0x51ab);
  scout.startRun();
  let bestStep = -1;
  let bestScore = -1;
  const maxSteps = Math.floor(300 / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const state = scout.state;
    if (state.phase === 'cleared') {
      scout.applyBlessing(pilotBlessingChoice(drawBlessings(scoutChoices, 3), state));
      scout.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') break;
    scout.step(STEP, autopilotControl(state));
    if (state.wave >= 4) {
      const score = dramaScore(state);
      if (score > bestScore) {
        bestScore = score;
        bestStep = i;
      }
    }
  }
  const choices = createRandom(seed ^ 0x51ab);
  world.startRun();
  for (let i = 0; bestStep >= 0 && i <= bestStep; i += 1) {
    const state = world.state;
    if (state.phase === 'cleared') {
      world.applyBlessing(pilotBlessingChoice(drawBlessings(choices, 3), state));
      world.beginNextWave();
      continue;
    }
    if (state.phase !== 'combat') break;
    world.step(STEP, autopilotControl(state));
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the best score
 * to show, and (for the blessing scene) the three choices on its cards.
 */
export function stageShot(name, world, seed) {
  const random = createRandom(seed ^ 0x77c1);
  if (name === 'battle') return stageBattle(world, seed);
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
