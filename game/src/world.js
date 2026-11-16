// The garden's rules and state, with no drawing and no browser in it: the fox spirit,
// the Great Bloom, foxfire bolts, spores, pickups, particles and the gloom's five kinds,
// advanced one fixed step at a time. step() takes the player's control (from the real
// input or from the screenshot autopilot) and returns what happened as bit flags, so the
// caller can play sounds and announcements without the world knowing about either.
// Nothing here reads the clock or Math.random: the seeded generator handed in at
// creation decides every spawn, drop and burst, so a seed replays a run exactly.

import { BLOOM, FIELD, PLAYER, POLLEN, WAVES } from './config.js';
import {
  ENEMIES, KIND_BEETLE, KIND_DARTER, KIND_MATRIARCH, KIND_MOTH, KIND_SPITTER,
  buildSpawnQueue, spawnInterval, spawnPoint,
} from './enemies.js';
import { range } from './random.js';

export const EVENT_KILL = 1;
export const EVENT_PICKUP = 2;
export const EVENT_PLAYER_HURT = 4;
export const EVENT_BLOOM_HURT = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_BOSS_DOWN = 32;
export const EVENT_HEART_PICKUP = 64;
export const EVENT_WARD_BLOCK = 128;
export const EVENT_DASH = 256;
export const EVENT_HIT = 512;

const TAU = Math.PI * 2;

function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function defaultStats() {
  return {
    damageScale: 1,
    fireIntervalScale: 1,
    projectiles: 1,
    pierce: 0,
    speedScale: 1,
    dashCooldownScale: 1,
    magnetScale: 1,
    slowScale: 1,
    wardsPerWave: 0,
    pollenScale: 1,
  };
}

export function createWorld(random) {
  const player = {
    x: BLOOM.x, y: BLOOM.y + 130, vx: 0, vy: 0,
    hearts: PLAYER.maxHearts, maxHearts: PLAYER.maxHearts,
    aim: -Math.PI / 2, fireTimer: 0, dashTimer: 0, dashCooldown: 0,
    dashDirX: 1, dashDirY: 0, invulnerable: 0, wards: 0, moving: false,
  };
  const bloom = { x: BLOOM.x, y: BLOOM.y, hp: BLOOM.maxHp, maxHp: BLOOM.maxHp, pollenBank: 0 };
  const state = {
    time: 0,
    phase: 'title', // title | combat | cleared | won | lost
    loseReason: '',
    wave: 0,
    player,
    bloom,
    stats: defaultStats(),
    owned: [],
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    pollenCollected: 0,
    runTime: 0,
    enemies: [],
    bullets: [],
    spores: [],
    pickups: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnTotal: 0,
    spawnTimer: 0,
    boss: null,
    shake: 0,
    hitStop: 0,
    dawn: 0,
    banner: null,
  };

  // Decorative moths that drift over the title garden; updated by stepAmbient only.
  const ambientMoths = [];
  for (let i = 0; i < 6; i += 1) {
    ambientMoths.push({
      x: range(random, 80, FIELD.width - 80),
      y: range(random, 90, 430),
      phase: range(random, 0, TAU),
      speed: range(random, 9, 20),
    });
  }
  state.ambientMoths = ambientMoths;

  function burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const velocity = speed * (0.3 + random() * 0.7);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.6 + random() * 0.4),
        maxLife: life,
        size: size * (0.6 + random() * 0.8),
        color, drag: 3.2, grav: 0, kind: 'spark', angle: 0,
      });
    }
  }

  function petals(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const velocity = 40 + random() * 90;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 30,
        life: 0.9 + random() * 0.7,
        maxLife: 1.6,
        size: 5 + random() * 5,
        color: '#ff8fb2', drag: 1.4, grav: 60, kind: 'petal', angle: random() * TAU,
      });
    }
  }

  function floater(x, y, text, color, size = 17) {
    state.floaters.push({ x, y, t: 0, life: 0.9, text, color, size });
  }

  function setBanner(text, sub, seconds = 2.4) {
    state.banner = { text, sub, t: 0, seconds };
  }

  function reset() {
    state.phase = 'title';
    state.wave = 0;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.spores.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.floaters.length = 0;
    state.boss = null;
    state.dawn = 0;
    state.banner = null;
    bloom.hp = bloom.maxHp;
    bloom.pollenBank = 0;
    player.x = BLOOM.x;
    player.y = BLOOM.y + 130;
    player.hearts = player.maxHearts;
  }

  function startRun() {
    state.stats = defaultStats();
    state.owned = [];
    state.score = 0;
    state.kills = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.pollenCollected = 0;
    state.runTime = 0;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.spores.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.floaters.length = 0;
    state.boss = null;
    state.dawn = 0;
    state.shake = 0;
    state.hitStop = 0;
    player.maxHearts = PLAYER.maxHearts;
    player.hearts = PLAYER.maxHearts;
    player.x = BLOOM.x;
    player.y = BLOOM.y + 140;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.wards = 0;
    bloom.maxHp = BLOOM.maxHp;
    bloom.hp = BLOOM.maxHp;
    bloom.pollenBank = 0;
    state.wave = 0;
    beginNextWave();
  }

  function beginNextWave() {
    state.wave += 1;
    state.spawnQueue = buildSpawnQueue(random, state.wave);
    state.spawnTotal = state.spawnQueue.length;
    state.spawnTimer = 0.7;
    state.phase = 'combat';
    player.wards = state.stats.wardsPerWave;
    if (state.wave === WAVES.bossWave) {
      setBanner(`Night ${state.wave} — the last night`, 'The Matriarch comes for the Bloom', 3.2);
    } else {
      setBanner(`Night ${state.wave}`, state.wave === 1 ? 'The gloom stirs…' : 'The gloom returns, thicker', 2.4);
    }
  }

  function spawnEnemy(kind) {
    const def = ENEMIES[kind];
    const point = kind === KIND_MATRIARCH ? { x: FIELD.width / 2, y: -60 } : spawnPoint(random);
    const hpScale = 1 + (state.wave - 1) * 0.09;
    const enemy = {
      kind,
      x: point.x, y: point.y, vx: 0, vy: 0,
      hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
      radius: def.radius, t: range(random, 0, TAU), seed: random() * TAU,
      mode: 'stalk', modeT: 0, shootTimer: range(random, 1.2, def.sporeInterval ?? 2.6),
      burstTimer: 3.2, summonTimer: 5,
      chew: 0, slowT: 0, flash: 0, dead: false,
    };
    state.enemies.push(enemy);
    if (kind === KIND_MATRIARCH) state.boss = enemy;
    return enemy;
  }

  function dropPickups(enemy) {
    const def = ENEMIES[enemy.kind];
    let motes = Math.max(1, Math.round(def.pollen * state.stats.pollenScale));
    if (enemy.kind === KIND_MATRIARCH) motes = 12;
    const valueEach = enemy.kind === KIND_MATRIARCH ? 5 : 1;
    if (enemy.kind !== KIND_MATRIARCH) motes = Math.min(motes, 5);
    for (let i = 0; i < motes; i += 1) {
      const angle = random() * TAU;
      const velocity = 30 + random() * 80;
      state.pickups.push({
        kind: 'pollen', x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        value: valueEach, t: range(random, 0, TAU),
      });
    }
    const heartChance = enemy.kind === KIND_BEETLE ? 0.14 : enemy.kind === KIND_SPITTER ? 0.1 : 0;
    if (random() < heartChance) {
      state.pickups.push({
        kind: 'heart', x: enemy.x, y: enemy.y, vx: 0, vy: -30, value: 1, t: 0,
      });
    }
  }

  function killEnemy(enemy, events) {
    enemy.dead = true;
    const def = ENEMIES[enemy.kind];
    state.score += def.score;
    state.kills += 1;
    burst(enemy.x, enemy.y, enemy.kind === KIND_MATRIARCH ? '#b388eb' : '#c9bdf0', enemy.kind === KIND_MATRIARCH ? 46 : 13, 190, 0.55, 3.4);
    if (enemy.kind === KIND_MATRIARCH) petals(enemy.x, enemy.y, 26);
    floater(enemy.x, enemy.y - enemy.radius - 6, `+${def.score}`, '#ffd977', 17);
    dropPickups(enemy);
    if (enemy.kind === KIND_MATRIARCH) {
      state.boss = null;
      // Her court is banished with her: every remaining creature bursts into sparks,
      // and her spores fall out of the dawn sky.
      for (const other of state.enemies) {
        if (other !== enemy && !other.dead) {
          other.dead = true;
          burst(other.x, other.y, '#c9bdf0', 8, 140, 0.5, 3);
        }
      }
      state.enemies = state.enemies.filter((candidate) => !candidate.dead);
      state.spores.length = 0;
      state.phase = 'won';
      state.score += WAVES.clearScorePerWave * state.wave;
      state.hitStop = 0.35;
      state.shake = 14;
      setBanner('Dawn breaks', 'The Matriarch is banished', 3.4);
      return events | EVENT_BOSS_DOWN | EVENT_KILL;
    }
    return events | EVENT_KILL;
  }

  function hurtPlayer(damage, fromX, fromY) {
    if (player.invulnerable > 0 || player.dashTimer > 0 || state.phase !== 'combat') return 0;
    if (player.wards > 0) {
      player.wards -= 1;
      player.invulnerable = 1.1;
      floater(player.x, player.y - 30, 'Ward held!', '#ffd977', 18);
      burst(player.x, player.y, '#ffd977', 10, 150, 0.4, 3);
      return EVENT_WARD_BLOCK;
    }
    player.hearts -= damage;
    player.invulnerable = PLAYER.hurtInvulnerable;
    state.shake = Math.max(state.shake, 8);
    const away = Math.atan2(player.y - fromY, player.x - fromX);
    player.vx += Math.cos(away) * 260;
    player.vy += Math.sin(away) * 260;
    burst(player.x, player.y, '#ff6b81', 10, 160, 0.45, 3);
    if (player.hearts <= 0) {
      player.hearts = 0;
      state.phase = 'lost';
      state.loseReason = 'spirit';
      petals(player.x, player.y, 18);
    }
    return EVENT_PLAYER_HURT;
  }

  function hurtBloom(damage) {
    if (state.phase !== 'combat') return 0;
    bloom.hp -= damage;
    if (bloom.hp <= 0) {
      bloom.hp = 0;
      state.phase = 'lost';
      state.loseReason = 'bloom';
      petals(bloom.x, bloom.y, 30);
      state.shake = 14;
    }
    return EVENT_BLOOM_HURT;
  }

  function fireBullet(angle) {
    state.bullets.push({
      x: player.x + Math.cos(angle) * (PLAYER.radius + 6),
      y: player.y + Math.sin(angle) * (PLAYER.radius + 6),
      vx: Math.cos(angle) * PLAYER.bulletSpeed,
      vy: Math.sin(angle) * PLAYER.bulletSpeed,
      life: PLAYER.bulletLife,
      damage: PLAYER.bulletDamage * state.stats.damageScale,
      pierceLeft: state.stats.pierce,
      hitIds: new Set(),
    });
    state.shotsFired += 1;
  }

  function stepPlayer(dt, control, events) {
    const stats = state.stats;
    // Dash: a short burst along the move direction (or the aim, standing still).
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (control.dash && player.dashCooldown <= 0 && player.dashTimer <= 0) {
      let dx = control.moveX;
      let dy = control.moveY;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(player.aim);
        dy = Math.sin(player.aim);
      }
      const length = Math.sqrt(dx * dx + dy * dy) || 1;
      player.dashDirX = dx / length;
      player.dashDirY = dy / length;
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown * stats.dashCooldownScale;
      burst(player.x, player.y, '#ffb347', 8, 120, 0.35, 3);
      events |= EVENT_DASH;
    }

    const speed = PLAYER.speed * stats.speedScale;
    let vx = control.moveX * speed + player.vx;
    let vy = control.moveY * speed + player.vy;
    if (player.dashTimer > 0) {
      vx = player.dashDirX * speed * PLAYER.dashSpeedScale;
      vy = player.dashDirY * speed * PLAYER.dashSpeedScale;
    }
    player.x += vx * dt;
    player.y += vy * dt;
    // Knockback velocity bleeds off fast; ordinary movement is set fresh each step.
    player.vx *= Math.max(0, 1 - 10 * dt);
    player.vy *= Math.max(0, 1 - 10 * dt);
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius + 40, player.y));
    player.moving = control.moveX !== 0 || control.moveY !== 0 || player.dashTimer > 0;
    player.aim = Math.atan2(control.aimY - player.y, control.aimX - player.x);

    // Foxfire: hold to shoot, bolts fan out evenly when a blessing adds projectiles.
    player.fireTimer -= dt;
    if (control.firing && player.fireTimer <= 0) {
      const count = stats.projectiles;
      const spreadStep = 0.11;
      for (let i = 0; i < count; i += 1) {
        fireBullet(player.aim + (i - (count - 1) / 2) * spreadStep);
      }
      player.fireTimer = PLAYER.fireInterval * stats.fireIntervalScale;
      state.lastShotAt = state.time;
    }
    return events;
  }

  function stepBullets(dt, events) {
    for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
      const bullet = state.bullets[bi];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      let spent = bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20;
      if (!spent) {
        for (const enemy of state.enemies) {
          if (enemy.dead || bullet.hitIds.has(enemy)) continue;
          if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + 5) {
            bullet.hitIds.add(enemy);
            enemy.hp -= bullet.damage;
            enemy.flash = 0.08;
            if (state.stats.slowScale < 1) enemy.slowT = 1.2;
            state.shotsHit += 1;
            burst(bullet.x, bullet.y, '#ffd977', 3, 110, 0.25, 2.4);
            events |= EVENT_HIT;
            if (enemy.hp <= 0) events = killEnemy(enemy, events);
            if (bullet.pierceLeft > 0) bullet.pierceLeft -= 1;
            else spent = true;
            break;
          }
        }
      }
      if (spent) {
        state.bullets.splice(bi, 1);
      }
    }
    return events;
  }

  function enemyTarget(enemy) {
    if (enemy.kind === KIND_BEETLE || enemy.kind === KIND_MATRIARCH) return bloom;
    if (enemy.kind === KIND_DARTER) return player;
    const toPlayer = distance(enemy.x, enemy.y, player.x, player.y);
    const toBloom = distance(enemy.x, enemy.y, bloom.x, bloom.y);
    return toPlayer < toBloom ? player : bloom;
  }

  function stepEnemies(dt, events) {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const def = ENEMIES[enemy.kind];
      enemy.t += dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.slowT = Math.max(0, enemy.slowT - dt);
      const slow = enemy.slowT > 0 ? state.stats.slowScale : 1;
      const target = enemyTarget(enemy);
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      let vx = 0;
      let vy = 0;

      if (enemy.kind === KIND_MOTH) {
        const wobble = Math.sin(enemy.t * 3.1 + enemy.seed) * 26;
        vx = (ux * def.speed + -uy * wobble) * slow;
        vy = (uy * def.speed + ux * wobble) * slow;
      } else if (enemy.kind === KIND_BEETLE) {
        vx = ux * def.speed * slow;
        vy = uy * def.speed * slow;
      } else if (enemy.kind === KIND_DARTER) {
        enemy.modeT += dt;
        if (enemy.mode === 'stalk') {
          vx = ux * def.speed * slow;
          vy = uy * def.speed * slow;
          if (dist < 300 && enemy.modeT > def.stalkTime) {
            enemy.mode = 'lunge';
            enemy.modeT = 0;
            enemy.vx = ux * def.lungeSpeed;
            enemy.vy = uy * def.lungeSpeed;
          }
        } else if (enemy.mode === 'lunge') {
          vx = enemy.vx;
          vy = enemy.vy;
          if (enemy.modeT > def.lungeTime) {
            enemy.mode = 'recover';
            enemy.modeT = 0;
          }
        } else {
          vx = ux * def.speed * 0.3;
          vy = uy * def.speed * 0.3;
          if (enemy.modeT > def.recoverTime) {
            enemy.mode = 'stalk';
            enemy.modeT = 0;
          }
        }
      } else if (enemy.kind === KIND_SPITTER) {
        const strafe = Math.sin(enemy.t * 0.9 + enemy.seed) * 22;
        if (dist > def.keepRange + 24) {
          vx = ux * def.speed;
          vy = uy * def.speed;
        } else if (dist < def.keepRange - 24) {
          vx = -ux * def.speed * 0.8;
          vy = -uy * def.speed * 0.8;
        } else {
          vx = -uy * strafe;
          vy = ux * strafe;
        }
        vx *= slow;
        vy *= slow;
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && dist < 430) {
          enemy.shootTimer = def.sporeInterval * range(random, 0.9, 1.1);
          state.spores.push({
            x: enemy.x, y: enemy.y,
            vx: ux * def.sporeSpeed, vy: uy * def.sporeSpeed,
            life: 3.2, targetBloom: target === bloom,
          });
        }
      } else if (enemy.kind === KIND_MATRIARCH) {
        const enraged = enemy.hp < enemy.maxHp * 0.33;
        const orbitRadius = 285;
        const orbitAngle = Math.atan2(enemy.y - bloom.y, enemy.x - bloom.x) + dt * 0.12 * (enraged ? 1.5 : 1);
        const goalX = dist > orbitRadius + 130 ? target.x : bloom.x + Math.cos(orbitAngle) * orbitRadius;
        const goalY = dist > orbitRadius + 130 ? target.y : bloom.y + Math.sin(orbitAngle) * orbitRadius;
        const gx = goalX - enemy.x;
        const gy = goalY - enemy.y;
        const gDist = Math.sqrt(gx * gx + gy * gy) || 1;
        const speed = def.speed * (enraged ? 1.6 : 1) * slow;
        vx = (gx / gDist) * speed;
        vy = (gy / gDist) * speed;
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0 && enemy.y > 20) {
          enemy.burstTimer = def.burstInterval * (enraged ? 0.6 : 1);
          const offset = random() * TAU;
          for (let i = 0; i < def.burstCount; i += 1) {
            const angle = offset + (i / def.burstCount) * TAU;
            state.spores.push({
              x: enemy.x, y: enemy.y,
              vx: Math.cos(angle) * 168, vy: Math.sin(angle) * 168,
              life: 3.4, targetBloom: false,
            });
          }
        }
        enemy.summonTimer -= dt;
        if (enemy.summonTimer <= 0 && state.enemies.length < WAVES.maxAlive) {
          enemy.summonTimer = def.summonInterval;
          for (let i = 0; i < 2; i += 1) {
            const child = spawnEnemy(KIND_MOTH);
            child.x = enemy.x + range(random, -40, 40);
            child.y = enemy.y + range(random, -20, 30);
          }
        }
      }

      // Chewing the Bloom, or pressing against it, instead of walking through it.
      const bloomDist = distance(enemy.x, enemy.y, bloom.x, bloom.y);
      const chewRange = BLOOM.radius + enemy.radius - 4;
      if (bloomDist < chewRange && enemy.kind !== KIND_MATRIARCH) {
        vx = 0;
        vy = 0;
        enemy.chew += def.chewDps * dt;
        if (enemy.chew >= 1) {
          const whole = Math.floor(enemy.chew);
          enemy.chew -= whole;
          events |= hurtBloom(whole);
          if (state.phase !== 'combat') return events;
        }
      }
      enemy.x += vx * dt;
      enemy.y += vy * dt;

      // Contact with the fox.
      if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.radius + PLAYER.radius - 2) {
        const result = hurtPlayer(def.contactDamage, enemy.x, enemy.y);
        events |= result;
        if (result === EVENT_PLAYER_HURT || result === EVENT_WARD_BLOCK) {
          enemy.x -= ux * 14;
          enemy.y -= uy * 14;
        }
        if (state.phase !== 'combat') return events;
      }
    }

    // Gentle separation so a swarm reads as bodies, not one stacked sprite.
    const list = state.enemies;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.dead || b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const min = (a.radius + b.radius) * 0.8;
        if (d > 0.01 && d < min) {
          const push = ((min - d) / d) * 0.5;
          a.x -= dx * push * 0.5;
          a.y -= dy * push * 0.5;
          b.x += dx * push * 0.5;
          b.y += dy * push * 0.5;
        }
      }
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    return events;
  }

  function stepSpores(dt, events) {
    for (let i = state.spores.length - 1; i >= 0; i -= 1) {
      const spore = state.spores[i];
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;
      spore.life -= dt;
      let gone = spore.life <= 0;
      if (!gone && distance(spore.x, spore.y, player.x, player.y) < PLAYER.radius + 7) {
        events |= hurtPlayer(1, spore.x, spore.y);
        gone = true;
      } else if (!gone && distance(spore.x, spore.y, bloom.x, bloom.y) < BLOOM.radius + 4) {
        events |= hurtBloom(5); // a spore's bite on the Bloom (ENEMIES' sporeDamage)
        burst(spore.x, spore.y, '#a8e063', 5, 90, 0.3, 2.6);
        gone = true;
      }
      if (gone) state.spores.splice(i, 1);
      if (state.phase !== 'combat') break;
    }
    return events;
  }

  function stepPickups(dt, events) {
    const magnet = PLAYER.magnetRadius * state.stats.magnetScale;
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.t += dt;
      // Pollen is dew: unclaimed, it evaporates (a heart lasts a little longer).
      if (pickup.t > (pickup.kind === 'pollen' ? 26 : 30)) {
        state.pickups.splice(i, 1);
        continue;
      }
      const dist = distance(pickup.x, pickup.y, player.x, player.y);
      if (pickup.kind === 'pollen' && dist < magnet) {
        const pull = POLLEN.driftSpeed * (1.6 - dist / magnet);
        pickup.vx += ((player.x - pickup.x) / (dist || 1)) * pull * 4 * dt;
        pickup.vy += ((player.y - pickup.y) / (dist || 1)) * pull * 4 * dt;
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      pickup.vx *= Math.max(0, 1 - 3.4 * dt);
      pickup.vy *= Math.max(0, 1 - 3.4 * dt);
      if (dist < POLLEN.collectRadius + 8) {
        state.pickups.splice(i, 1);
        if (pickup.kind === 'pollen') {
          state.pollenCollected += pickup.value;
          state.score += POLLEN.score * pickup.value;
          bloom.pollenBank += pickup.value;
          if (bloom.pollenBank >= BLOOM.pollenPerHeal) {
            bloom.pollenBank -= BLOOM.pollenPerHeal;
            if (bloom.hp < bloom.maxHp) {
              bloom.hp = Math.min(bloom.maxHp, bloom.hp + BLOOM.healAmount);
              floater(bloom.x, bloom.y - BLOOM.radius - 16, `Bloom +${BLOOM.healAmount}`, '#8be0a4', 17);
              petals(bloom.x, bloom.y, 6);
            }
          }
          events |= EVENT_PICKUP;
        } else {
          player.hearts = Math.min(player.maxHearts, player.hearts + 1);
          floater(player.x, player.y - 30, '+1 heart', '#ff6b81', 18);
          events |= EVENT_HEART_PICKUP;
        }
      }
    }
    return events;
  }

  function stepFx(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.grav * dt;
      particle.vx *= Math.max(0, 1 - particle.drag * dt);
      particle.vy *= Math.max(0, 1 - particle.drag * dt);
      particle.angle += dt * 2.4;
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const floaterItem = state.floaters[i];
      floaterItem.t += dt;
      floaterItem.y -= 34 * dt;
      if (floaterItem.t > floaterItem.life) state.floaters.splice(i, 1);
    }
    if (state.banner !== null) {
      state.banner.t += dt;
      if (state.banner.t > state.banner.seconds) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - 26 * dt);
  }

  /** Advance the whole garden one fixed step under the given control. */
  function step(dt, control) {
    let events = 0;
    state.time += dt;
    if (state.hitStop > 0) {
      state.hitStop -= dt;
      stepFx(dt);
      return events;
    }
    if (state.phase === 'combat') {
      state.runTime += dt;
      // Spawn trickle.
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        const alive = state.enemies.length;
        if (state.spawnTimer <= 0 && alive < WAVES.maxAlive) {
          const kind = state.spawnQueue.shift();
          spawnEnemy(kind);
          const fractionLeft = state.spawnQueue.length / Math.max(1, state.spawnTotal);
          state.spawnTimer = spawnInterval(state.wave, fractionLeft);
        }
      }
      events = stepPlayer(dt, control, events);
      if (state.phase === 'combat') events = stepBullets(dt, events);
      if (state.phase === 'combat') events = stepEnemies(dt, events);
      if (state.phase === 'combat') events = stepSpores(dt, events);
      if (state.phase === 'combat' || state.phase === 'won') events = stepPickups(dt, events);
      // A night is cleared when its queue is spent and the garden is empty of gloom.
      if (state.phase === 'combat' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
        state.phase = 'cleared';
        state.score += WAVES.clearScorePerWave * state.wave;
        setBanner(`Night ${state.wave} cleared`, 'The garden offers a blessing', 2.2);
        events |= EVENT_WAVE_CLEAR;
      }
    } else if (state.phase === 'won') {
      state.dawn = Math.min(1, state.dawn + dt / 3.2);
      events = stepPickups(dt, events);
    }
    stepFx(dt);
    return events;
  }

  /** Advance only the living scenery: fireflies' hour — used behind the title and panels. */
  function stepAmbient(dt) {
    state.time += dt;
    for (const moth of state.ambientMoths) {
      moth.phase += dt * 0.7;
      moth.x += Math.cos(moth.phase * 0.6) * moth.speed * dt;
      moth.y += Math.sin(moth.phase) * 12 * dt;
      if (moth.x < -30) moth.x = FIELD.width + 30;
      if (moth.x > FIELD.width + 30) moth.x = -30;
      moth.y = Math.min(470, Math.max(70, moth.y));
    }
    if (state.phase === 'won') state.dawn = Math.min(1, state.dawn + dt / 3.2);
    stepFx(dt);
  }

  function applyBlessing(blessing) {
    blessing.apply(state.stats, { state });
    state.owned.push(blessing.id);
    burst(player.x, player.y, '#ffd977', 18, 170, 0.6, 3.2);
    petals(bloom.x, bloom.y, 10);
  }

  return { state, reset, startRun, beginNextWave, step, stepAmbient, applyBlessing };
}
