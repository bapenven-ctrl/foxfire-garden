// The creatures: the fox keeper with her foxfire halo and aim line, the five
// kinds of gloom — moth, beetle, darter, spitter and the crowned Matriarch —
// and everything that flies between them: spores, foxfire bolts, pickups,
// particles and score floaters. Each kind wears its own colours and silhouette,
// far enough apart to name across a crowded frame.

import { BODY_FONT, PALETTE, PLAYER } from './config.js';
import { KIND_BEETLE, KIND_DARTER, KIND_MATRIARCH, KIND_MOTH, KIND_SPITTER } from './enemies.js';

const TAU = Math.PI * 2;

/** The fox is painted half again its hitbox size, so the keeper reads at a glance. */
const FOX_SCALE = 1.5;

export function drawFox(kit, state) {
  const { context } = kit;
  const player = state.player;
  // The blink of a fresh hurt: on alternate flash frames the fox is not drawn at all.
  if (player.invulnerable > 0 && player.dashTimer <= 0 && state.phase === 'combat'
    && Math.floor(state.time * 12) % 2 === 0) return;
  const aim = player.aim;
  const flip = Math.cos(aim) < 0 ? -1 : 1;
  // The foxfire halo: warm gold over vermillion, so the keeper glows against the
  // indigo garden and the eye finds her even in a crowded frame.
  const halo = context.createRadialGradient(player.x, player.y, 4, player.x, player.y, 64);
  halo.addColorStop(0, 'rgba(255, 179, 71, 0.42)');
  halo.addColorStop(0.55, 'rgba(229, 83, 75, 0.17)');
  halo.addColorStop(1, 'rgba(229, 83, 75, 0)');
  context.fillStyle = halo;
  context.fillRect(player.x - 64, player.y - 64, 128, 128);
  // The aim line: a dashed thread of foxfire toward where the bolts will fly.
  if (state.phase === 'combat') {
    context.save();
    context.strokeStyle = 'rgba(255, 217, 119, 0.55)';
    context.lineWidth = 2;
    context.setLineDash([7, 7]);
    context.beginPath();
    context.moveTo(player.x + Math.cos(aim) * 34, player.y + Math.sin(aim) * 34);
    context.lineTo(player.x + Math.cos(aim) * 122, player.y + Math.sin(aim) * 122);
    context.stroke();
    context.restore();
  }
  context.save();
  context.translate(player.x, player.y);
  context.scale(FOX_SCALE, FOX_SCALE);
  // Dash afterimages.
  if (player.dashTimer > 0) {
    context.globalAlpha = 0.3;
    context.fillStyle = PALETTE.foxfire;
    context.beginPath();
    context.ellipse(-player.dashDirX * 20, -player.dashDirY * 20, 15, 10, 0, 0, TAU);
    context.fill();
    context.globalAlpha = 1;
  }
  // Tail with its foxfire flame, wagging as it runs.
  const wag = Math.sin(state.time * (player.moving ? 16 : 4)) * 0.16;
  context.save();
  context.rotate(wag - flip * 0.5);
  context.fillStyle = '#f4ead8';
  context.beginPath();
  context.ellipse(-flip * 17, 3, 13, 7.5, flip * 0.5, 0, TAU);
  context.fill();
  context.fillStyle = PALETTE.foxfire;
  context.beginPath();
  context.ellipse(-flip * 26, 0, 6.5, 4.6, flip * 0.5, 0, TAU);
  context.fill();
  context.restore();
  // Body.
  context.fillStyle = '#fdf6e3';
  context.beginPath();
  context.ellipse(0, 2, 15.5, 11, 0, 0, TAU);
  context.fill();
  context.fillStyle = '#f0dfba';
  context.beginPath();
  context.ellipse(0, 6.5, 10, 6.5, 0, 0, TAU);
  context.fill();
  // Head, turned to the aim.
  context.save();
  context.translate(flip * 10, -6);
  context.fillStyle = '#fdf6e3';
  context.beginPath();
  context.arc(0, 0, 9.5, 0, TAU);
  context.fill();
  // Ears.
  context.fillStyle = '#f4ead8';
  context.beginPath();
  context.moveTo(-7, -6);
  context.lineTo(-9.5, -16);
  context.lineTo(-2.5, -9);
  context.closePath();
  context.moveTo(3, -8.5);
  context.lineTo(6.5, -17.5);
  context.lineTo(8.5, -7.5);
  context.closePath();
  context.fill();
  context.fillStyle = PALETTE.vermillion;
  context.beginPath();
  context.moveTo(-7, -7.5);
  context.lineTo(-8.6, -13.5);
  context.lineTo(-4.4, -9.4);
  context.closePath();
  context.moveTo(4.2, -9.6);
  context.lineTo(6.3, -15);
  context.lineTo(7.6, -8.8);
  context.closePath();
  context.fill();
  // Eye and nose.
  context.fillStyle = '#241b2e';
  context.beginPath();
  context.arc(flip * 3.4, -1.5, 1.7, 0, TAU);
  context.fill();
  context.beginPath();
  context.arc(flip * 9.2, 1.6, 1.5, 0, TAU);
  context.fill();
  context.restore();
  context.restore();
  // The ward, when a blessing's shield stands ready.
  if (player.wards > 0) {
    context.strokeStyle = `rgba(255, 217, 119, ${0.55 + 0.3 * Math.sin(state.time * 3)})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius * FOX_SCALE + 8, 0, TAU);
    context.stroke();
  }
  // Dash readiness, a small arc under the fox while it recharges.
  if (player.dashCooldown > 0 && state.phase === 'combat') {
    const total = 1.6 * state.stats.dashCooldownScale;
    const fraction = 1 - player.dashCooldown / total;
    context.strokeStyle = 'rgba(253, 246, 227, 0.35)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y + PLAYER.radius * FOX_SCALE + 10, 9, -Math.PI / 2, -Math.PI / 2 + fraction * TAU);
    context.stroke();
  }
}

function wingFlap(enemy, speed = 15) {
  return Math.sin(enemy.t * speed + enemy.seed) * 0.55;
}

export function drawMothLike(kit, enemy, scale, bodyColor, wingColor, crowned) {
  const { context } = kit;
  const flap = wingFlap(enemy);
  context.save();
  context.translate(enemy.x, enemy.y);
  context.fillStyle = wingColor;
  context.globalAlpha = 0.9;
  for (const side of [-1, 1]) {
    context.save();
    context.scale(side, 1);
    context.rotate(-flap * 0.7);
    context.beginPath();
    context.ellipse(13 * scale, -4 * scale, 15 * scale, 8.5 * scale, -0.5, 0, TAU);
    context.fill();
    context.beginPath();
    context.ellipse(10 * scale, 5 * scale, 10.5 * scale, 6 * scale, 0.4, 0, TAU);
    context.fill();
    context.restore();
  }
  context.globalAlpha = 1;
  // A plain moth wears deep-violet wing spots; only the Matriarch wears gold.
  if (!crowned) {
    context.fillStyle = 'rgba(74, 44, 148, 0.55)';
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(side * 14 * scale, -3 * scale, 3.6 * scale, 0, TAU);
      context.fill();
    }
  }
  context.fillStyle = bodyColor;
  context.beginPath();
  context.ellipse(0, 0, 6.5 * scale, 10 * scale, 0, 0, TAU);
  context.fill();
  context.beginPath();
  context.arc(0, -9 * scale, 5 * scale, 0, TAU);
  context.fill();
  // Glowing eyes.
  context.fillStyle = '#ffe9a8';
  context.beginPath();
  context.arc(-2.4 * scale, -9 * scale, 1.4 * scale, 0, TAU);
  context.arc(2.4 * scale, -9 * scale, 1.4 * scale, 0, TAU);
  context.fill();
  if (crowned) {
    context.fillStyle = PALETTE.gold;
    context.beginPath();
    context.moveTo(-7 * scale, -15 * scale);
    context.lineTo(-3.5 * scale, -21 * scale);
    context.lineTo(0, -15.5 * scale);
    context.lineTo(3.5 * scale, -21 * scale);
    context.lineTo(7 * scale, -15 * scale);
    context.closePath();
    context.fill();
    // Wing moons.
    context.fillStyle = 'rgba(255, 233, 168, 0.8)';
    context.beginPath();
    context.arc(-16 * scale, -2 * scale, 3.4 * scale, 0, TAU);
    context.arc(16 * scale, -2 * scale, 3.4 * scale, 0, TAU);
    context.fill();
  }
  context.restore();
}

export function drawBeetle(kit, enemy) {
  const { context } = kit;
  context.save();
  context.translate(enemy.x, enemy.y);
  const chewShake = enemy.vx === 0 && enemy.vy === 0 ? Math.sin(enemy.t * 22) * 1.2 : 0;
  context.translate(chewShake, 0);
  context.strokeStyle = '#1d4a3e';
  context.lineWidth = 3;
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 3; leg += 1) {
      const lx = (leg - 1) * 10;
      context.beginPath();
      context.moveTo(lx, side * 10);
      context.lineTo(lx + Math.sin(enemy.t * 9 + leg * 2 + (side > 0 ? 1 : 0)) * 4, side * 19);
      context.stroke();
    }
  }
  context.fillStyle = PALETTE.beetle;
  context.beginPath();
  context.ellipse(0, 0, 23, 18, 0, 0, TAU);
  context.fill();
  context.fillStyle = PALETTE.beetleShell;
  context.beginPath();
  context.ellipse(0, -3, 18, 13, 0, Math.PI, TAU);
  context.fill();
  context.strokeStyle = 'rgba(20, 50, 42, 0.7)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -16);
  context.lineTo(0, 14);
  context.stroke();
  // A gold racing stripe down the shell, so the beetle reads teal-and-gold at once.
  context.strokeStyle = 'rgba(242, 201, 76, 0.85)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, -13);
  context.lineTo(0, 11);
  context.stroke();
  // The horn and the eyes face the Bloom (down-field of its march).
  context.fillStyle = '#d8cf9f';
  context.beginPath();
  context.moveTo(-4, -14);
  context.lineTo(0, -26);
  context.lineTo(4, -14);
  context.closePath();
  context.fill();
  context.fillStyle = '#ffe9a8';
  context.beginPath();
  context.arc(-7, -10, 2, 0, TAU);
  context.arc(7, -10, 2, 0, TAU);
  context.fill();
  context.restore();
}

export function drawDarter(kit, enemy) {
  const { context } = kit;
  const flap = wingFlap(enemy, 34);
  context.save();
  context.translate(enemy.x, enemy.y);
  const angle = Math.atan2(enemy.vy || 0.01, enemy.vx || 0.01);
  context.rotate(enemy.mode === 'stalk' ? Math.sin(enemy.t * 2 + enemy.seed) * 0.3 : angle * 0.2);
  context.fillStyle = PALETTE.gold;
  context.globalAlpha = 0.85;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.ellipse(side * 8, -8 - flap * 3, 10, 4, side * (0.7 + flap * 0.4), 0, TAU);
    context.fill();
  }
  context.globalAlpha = 1;
  context.fillStyle = PALETTE.darter;
  context.beginPath();
  context.ellipse(0, 0, 7.5, 14.5, 0, 0, TAU);
  context.fill();
  context.fillStyle = '#ffd166';
  context.beginPath();
  context.ellipse(0, 2, 7, 4.5, 0, 0, TAU);
  context.fill();
  // Stinger.
  context.fillStyle = '#fdf6e3';
  context.beginPath();
  context.moveTo(-3, 12);
  context.lineTo(0, 21);
  context.lineTo(3, 12);
  context.closePath();
  context.fill();
  context.fillStyle = '#241b2e';
  context.beginPath();
  context.arc(-3, -9, 1.8, 0, TAU);
  context.arc(3, -9, 1.8, 0, TAU);
  context.fill();
  context.restore();
}

export function drawSpitter(kit, enemy) {
  const { context } = kit;
  context.save();
  context.translate(enemy.x, enemy.y);
  const swell = 1 + Math.sin(enemy.t * 2.6 + enemy.seed) * 0.08;
  context.fillStyle = PALETTE.spitter;
  context.beginPath();
  context.ellipse(0, 2, 16, 14, 0, 0, TAU);
  context.fill();
  // A dark moss outline, so the spitter's green holds its shape against the grass.
  context.strokeStyle = '#2c4a26';
  context.lineWidth = 2.2;
  context.beginPath();
  context.ellipse(0, 2, 16, 14, 0, 0, TAU);
  context.stroke();
  // The spore sac, swelling before each shot.
  const charge = 1 - Math.max(0, enemy.shootTimer) / 2.6;
  context.fillStyle = PALETTE.spitterSac;
  context.beginPath();
  context.arc(0, -10, (6 + charge * 4) * swell, 0, TAU);
  context.fill();
  context.fillStyle = '#241b2e';
  context.beginPath();
  context.arc(-5, -2, 2, 0, TAU);
  context.arc(5, -2, 2, 0, TAU);
  context.fill();
  context.strokeStyle = '#4a7c43';
  context.lineWidth = 2.4;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 10, 10);
    context.quadraticCurveTo(side * 16, 16, side * 13, 21);
    context.stroke();
  }
  context.restore();
}

export function drawEnemy(kit, enemy) {
  const { context } = kit;
  // A soft shadow grounds every creature.
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.beginPath();
  context.ellipse(enemy.x, enemy.y + enemy.radius * 0.85, enemy.radius * 0.9, enemy.radius * 0.32, 0, 0, TAU);
  context.fill();
  // Each kind wears its own colours, far enough apart to name across a crowded frame:
  // the moth deep violet, the Matriarch magenta with her gold crown.
  if (enemy.kind === KIND_MOTH) drawMothLike(kit, enemy, 1, '#7e63d8', PALETTE.mothWing, false);
  else if (enemy.kind === KIND_BEETLE) drawBeetle(kit, enemy);
  else if (enemy.kind === KIND_DARTER) drawDarter(kit, enemy);
  else if (enemy.kind === KIND_SPITTER) drawSpitter(kit, enemy);
  else if (enemy.kind === KIND_MATRIARCH) drawMothLike(kit, enemy, 2.9, '#cf6fe0', '#ecd9ff', true);
  if (enemy.flash > 0) {
    context.globalAlpha = Math.min(1, enemy.flash * 9);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(enemy.x, enemy.y, enemy.radius, 0, TAU);
    context.fill();
    context.globalAlpha = 1;
  }
  if (enemy.slowT > 0) {
    context.strokeStyle = 'rgba(160, 220, 255, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(enemy.x, enemy.y, enemy.radius + 3, 0, TAU);
    context.stroke();
  }
  // A slim health bar once a creature is hurt (the Matriarch gets the big bar instead).
  if (enemy.hp < enemy.maxHp && enemy.kind !== KIND_MATRIARCH) {
    const width = enemy.radius * 2;
    context.fillStyle = 'rgba(10, 8, 24, 0.7)';
    context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 5);
    context.fillStyle = '#ff8fa3';
    context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
  }
}

export function drawProjectilesAndPickups(kit, state) {
  const { context, text, heartPath } = kit;
  for (const spore of state.spores) {
    const pulse = 1 + Math.sin(state.time * 9 + spore.x) * 0.15;
    context.fillStyle = 'rgba(168, 224, 99, 0.3)';
    context.beginPath();
    context.arc(spore.x, spore.y, 11 * pulse, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.spore;
    context.beginPath();
    context.arc(spore.x, spore.y, 6 * pulse, 0, TAU);
    context.fill();
  }
  for (const bullet of state.bullets) {
    // A vermillion halo around the gold core: a stream of foxfire reads as fire,
    // not lamplight, against the lavender gloom.
    context.fillStyle = 'rgba(229, 83, 75, 0.38)';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 12, 0, TAU);
    context.fill();
    context.fillStyle = 'rgba(255, 179, 71, 0.35)';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 8, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.goldSoft;
    context.beginPath();
    context.arc(bullet.x, bullet.y, 4.6, 0, TAU);
    context.fill();
    context.fillStyle = '#fff6d8';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 2.1, 0, TAU);
    context.fill();
  }
  for (const pickup of state.pickups) {
    const bob = Math.sin(state.time * 4 + pickup.t * 3) * 3;
    // A pickup near the end of its life fades, so the eye can tell it is going.
    const lifetime = pickup.kind === 'pollen' ? 26 : 30;
    if (pickup.t > lifetime - 3) context.globalAlpha = Math.max(0, (lifetime - pickup.t) / 3);
    if (pickup.kind === 'pollen') {
      context.save();
      context.translate(pickup.x, pickup.y + bob);
      context.rotate(Math.PI / 4);
      context.fillStyle = PALETTE.pollen;
      context.fillRect(-4.4, -4.4, 8.8, 8.8);
      context.fillStyle = '#fff3c4';
      context.fillRect(-2, -2, 4, 4);
      context.restore();
    } else {
      context.fillStyle = PALETTE.heart;
      heartPath(pickup.x, pickup.y + bob - 6, 11);
      context.fill();
      context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      context.lineWidth = 1.4;
      context.stroke();
    }
    context.globalAlpha = 1;
  }
  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    context.globalAlpha = alpha;
    if (particle.kind === 'petal') {
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.angle);
      context.fillStyle = particle.color;
      context.beginPath();
      context.ellipse(0, 0, particle.size, particle.size * 0.55, 0, 0, TAU);
      context.fill();
      context.restore();
    } else {
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * alpha + 0.6, 0, TAU);
      context.fill();
    }
  }
  context.globalAlpha = 1;
  context.textBaseline = 'middle';
  for (const floater of state.floaters) {
    context.globalAlpha = Math.max(0, 1 - floater.t / floater.life);
    text(floater.text, floater.x, floater.y, floater.size, floater.color, 'center', BODY_FONT, 'bold');
  }
  context.globalAlpha = 1;
  context.textBaseline = 'alphabetic';
}
