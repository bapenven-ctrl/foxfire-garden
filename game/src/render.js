// Drawing only: the world's state and the current screen in, pixels out. The garden is
// painted in layers — night sky, moon, hills, flower field, the Great Bloom, creatures,
// foxfire, then the HUD and the screen's panel — all in the fixed 1280x720 field the
// renderer scales to the window. The scenery (stars, flowers, grass, fireflies) is laid
// out once from its own seeded generator, and everything that moves is a function of the
// world's simulated time, so a staged scene always paints the same frame.

import { BLOOM, BODY_FONT, DISPLAY_FONT, FIELD, PALETTE, PLAYER } from './config.js';
import { KIND_BEETLE, KIND_DARTER, KIND_MATRIARCH, KIND_MOTH, KIND_SPITTER } from './enemies.js';
import { createRandom, range } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BLESSING = 'blessing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const TAU = Math.PI * 2;

/** The fox is painted half again its hitbox size, so the keeper reads at a glance. */
const FOX_SCALE = 1.5;

function hexRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function mix(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

/** The three blessing cards' rectangles, shared by the painter and the click handler. */
export function blessingCardRect(index) {
  const width = 300;
  const height = 330;
  const gap = 24;
  const total = width * 3 + gap * 2;
  return { x: (FIELD.width - total) / 2 + index * (width + gap), y: 252, w: width, h: height };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  // --- The garden's fixed scenery, laid out once from its own seed. ---
  const scenery = createRandom(20261116);
  const stars = [];
  for (let i = 0; i < 120; i += 1) {
    stars.push({ x: range(scenery, 0, FIELD.width), y: range(scenery, 0, 300), r: range(scenery, 0.7, 2.1), phase: range(scenery, 0, TAU) });
  }
  const flowers = [];
  const FLOWER_COLORS = ['#ff8fb2', '#ffd977', '#c9bdf0', '#8be0a4', '#ffb59f'];
  for (let i = 0; i < 110; i += 1) {
    flowers.push({
      x: range(scenery, 14, FIELD.width - 14),
      y: range(scenery, 486, FIELD.height - 12),
      size: range(scenery, 2.4, 4.6),
      color: FLOWER_COLORS[Math.floor(scenery() * FLOWER_COLORS.length)],
      phase: range(scenery, 0, TAU),
    });
  }
  const grass = [];
  for (let i = 0; i < 90; i += 1) {
    grass.push({ x: range(scenery, 6, FIELD.width - 6), y: range(scenery, 470, FIELD.height - 6), h: range(scenery, 8, 17), phase: range(scenery, 0, TAU) });
  }
  const fireflies = [];
  for (let i = 0; i < 26; i += 1) {
    fireflies.push({ x: range(scenery, 30, FIELD.width - 30), y: range(scenery, 300, 660), phase: range(scenery, 0, TAU), speed: range(scenery, 0.24, 0.6) });
  }
  const stones = [];
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * TAU;
    stones.push({ x: BLOOM.x + Math.cos(angle) * 96, y: BLOOM.y + Math.sin(angle) * 40 + 26, r: range(scenery, 6, 10) });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function font(size, family, weight = '') {
    const key = `${weight}${size}${family}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${family}`.trim());
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align = 'center', family = BODY_FONT, weight = '') {
    context.font = font(size, family, weight);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function heartPath(x, y, size) {
    context.beginPath();
    context.moveTo(x, y + size * 0.9);
    context.bezierCurveTo(x - size * 1.15, y + size * 0.1, x - size * 0.62, y - size * 0.85, x, y - size * 0.25);
    context.bezierCurveTo(x + size * 0.62, y - size * 0.85, x + size * 1.15, y + size * 0.1, x, y + size * 0.9);
    context.closePath();
  }

  // --- Scenery layers -------------------------------------------------------

  function drawSky(state) {
    const dawn = state.dawn;
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, mix(PALETTE.skyTop, PALETTE.dawnTop, dawn));
    gradient.addColorStop(0.45, mix(PALETTE.skyMid, PALETTE.dawnMid, dawn));
    gradient.addColorStop(0.72, mix(PALETTE.skyLow, PALETTE.dawnLow, dawn));
    gradient.addColorStop(0.73, mix(PALETTE.groundTop, '#2c5a3c', dawn));
    gradient.addColorStop(1, mix(PALETTE.groundLow, '#1d4030', dawn));
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars fade as dawn comes.
    if (dawn < 0.85) {
      for (const star of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(state.time * 1.7 + star.phase);
        context.globalAlpha = (1 - dawn) * 0.85 * twinkle;
        context.fillStyle = PALETTE.cream;
        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    // The moon, with its halo; at dawn a low sun answers it from the east.
    const moonX = 1058;
    const moonY = 118;
    const halo = context.createRadialGradient(moonX, moonY, 10, moonX, moonY, 130);
    halo.addColorStop(0, `rgba(242, 201, 76, ${0.32 * (1 - dawn * 0.6)})`);
    halo.addColorStop(1, 'rgba(242, 201, 76, 0)');
    context.fillStyle = halo;
    context.fillRect(moonX - 130, moonY - 130, 260, 260);
    context.globalAlpha = 1 - dawn * 0.45;
    context.fillStyle = PALETTE.moon;
    context.beginPath();
    context.arc(moonX, moonY, 46, 0, TAU);
    context.fill();
    context.fillStyle = 'rgba(190, 170, 130, 0.35)';
    context.beginPath();
    context.arc(moonX - 14, moonY - 8, 9, 0, TAU);
    context.arc(moonX + 16, moonY + 14, 6, 0, TAU);
    context.fill();
    context.globalAlpha = 1;
    if (dawn > 0.05) {
      const sunY = 560 - dawn * 330;
      const sunHalo = context.createRadialGradient(150, sunY, 8, 150, sunY, 170);
      sunHalo.addColorStop(0, `rgba(255, 170, 90, ${0.5 * dawn})`);
      sunHalo.addColorStop(1, 'rgba(255, 170, 90, 0)');
      context.fillStyle = sunHalo;
      context.fillRect(-20, sunY - 170, 340, 340);
      context.fillStyle = `rgba(255, 196, 110, ${dawn})`;
      context.beginPath();
      context.arc(150, sunY, 34, 0, TAU);
      context.fill();
    }

    // Two hill silhouettes and the garden gate the gloom slips past.
    context.fillStyle = mix(PALETTE.hillFar, '#3a2a55', dawn);
    context.beginPath();
    context.moveTo(0, 520);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, 500 - Math.sin(x * 0.004 + 1.3) * 42 - Math.sin(x * 0.011) * 12);
    }
    context.lineTo(FIELD.width, 540);
    context.lineTo(0, 540);
    context.closePath();
    context.fill();
    context.fillStyle = mix(PALETTE.hillNear, '#2c2044', dawn);
    context.beginPath();
    context.moveTo(0, 548);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, 534 - Math.sin(x * 0.005 + 4.1) * 26);
    }
    context.lineTo(FIELD.width, 580);
    context.lineTo(0, 580);
    context.closePath();
    context.fill();
    // The gate: two posts and a beam, far left, small against the hills.
    context.fillStyle = mix(PALETTE.hillNear, '#2c2044', dawn);
    context.fillRect(66, 452, 10, 74);
    context.fillRect(150, 452, 10, 74);
    context.fillRect(52, 440, 122, 10);
    context.fillRect(60, 462, 106, 6);
  }

  function drawField(state) {
    // Flower field and grass, swaying on the simulated breeze.
    for (const tuft of grass) {
      const sway = Math.sin(state.time * 1.3 + tuft.phase) * 2.2;
      context.strokeStyle = 'rgba(64, 140, 100, 0.75)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(tuft.x, tuft.y);
      context.quadraticCurveTo(tuft.x + sway, tuft.y - tuft.h * 0.6, tuft.x + sway * 1.6, tuft.y - tuft.h);
      context.stroke();
    }
    for (const flower of flowers) {
      const sway = Math.sin(state.time * 1.1 + flower.phase) * 1.4;
      context.fillStyle = flower.color;
      context.globalAlpha = 0.85;
      context.beginPath();
      context.arc(flower.x + sway, flower.y, flower.size, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
    // The stone ring around the Bloom's clearing.
    context.fillStyle = 'rgba(120, 130, 120, 0.5)';
    for (const stone of stones) {
      context.beginPath();
      context.ellipse(stone.x, stone.y, stone.r, stone.r * 0.55, 0, 0, TAU);
      context.fill();
    }
    // Fireflies: slow gold sparks that never hurry.
    for (const fly of fireflies) {
      const x = fly.x + Math.sin(state.time * fly.speed + fly.phase) * 34;
      const y = fly.y + Math.cos(state.time * fly.speed * 0.8 + fly.phase * 2) * 20;
      const glow = 0.4 + 0.6 * Math.abs(Math.sin(state.time * 0.9 + fly.phase));
      context.globalAlpha = glow * (1 - state.dawn * 0.7);
      context.fillStyle = PALETTE.goldSoft;
      context.beginPath();
      context.arc(x, y, 2.4, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  // --- The Bloom and the fox -------------------------------------------------

  function drawBloom(state) {
    const bloom = state.bloom;
    const fraction = Math.max(0, bloom.hp / bloom.maxHp);
    const pulse = 1 + Math.sin(state.time * 2.1) * 0.05;
    // Its light on the grass.
    const glow = context.createRadialGradient(bloom.x, bloom.y, 8, bloom.x, bloom.y, 175 * pulse);
    glow.addColorStop(0, `rgba(255, 143, 178, ${0.30 + 0.25 * fraction})`);
    glow.addColorStop(1, 'rgba(255, 143, 178, 0)');
    context.fillStyle = glow;
    context.fillRect(bloom.x - 180, bloom.y - 180, 360, 360);
    // Stem and leaves.
    context.strokeStyle = '#2e7d5b';
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(bloom.x, bloom.y + 74);
    context.quadraticCurveTo(bloom.x - 8, bloom.y + 34, bloom.x, bloom.y + 8);
    context.stroke();
    context.fillStyle = '#359268';
    context.beginPath();
    context.ellipse(bloom.x - 22, bloom.y + 52, 17, 7, -0.6, 0, TAU);
    context.ellipse(bloom.x + 22, bloom.y + 58, 17, 7, 0.6, 0, TAU);
    context.fill();
    // Petals: eight, opening with health, wilting darker and lower as it fades.
    const open = 0.55 + fraction * 0.6;
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + Math.sin(state.time * 0.7) * 0.05;
      const length = BLOOM.radius * open * pulse;
      const px = bloom.x + Math.cos(angle) * length * 0.62;
      const py = bloom.y + Math.sin(angle) * length * 0.62 - 4;
      context.save();
      context.translate(px, py);
      context.rotate(angle + Math.PI / 2 + (1 - fraction) * 0.5);
      context.fillStyle = i % 2 === 0 ? PALETTE.bloomPetal : PALETTE.bloomPetalDeep;
      context.globalAlpha = 0.55 + fraction * 0.45;
      context.beginPath();
      context.ellipse(0, 0, 13 * open + 4, length * 0.52, 0, 0, TAU);
      context.fill();
      context.restore();
    }
    context.globalAlpha = 1;
    // The shining heart.
    const heartGlow = context.createRadialGradient(bloom.x, bloom.y - 4, 2, bloom.x, bloom.y - 4, 30 * pulse);
    heartGlow.addColorStop(0, 'rgba(255, 209, 102, 0.95)');
    heartGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    context.fillStyle = heartGlow;
    context.fillRect(bloom.x - 32, bloom.y - 36, 64, 64);
    context.fillStyle = PALETTE.bloomHeart;
    context.beginPath();
    context.arc(bloom.x, bloom.y - 4, 11 * pulse, 0, TAU);
    context.fill();
  }

  function drawFox(state) {
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

  // --- The gloom --------------------------------------------------------------

  function wingFlap(enemy, speed = 15) {
    return Math.sin(enemy.t * speed + enemy.seed) * 0.55;
  }

  function drawMothLike(enemy, scale, bodyColor, wingColor, crowned) {
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

  function drawBeetle(enemy) {
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

  function drawDarter(enemy) {
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

  function drawSpitter(enemy) {
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

  function drawEnemy(enemy) {
    // A soft shadow grounds every creature.
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.beginPath();
    context.ellipse(enemy.x, enemy.y + enemy.radius * 0.85, enemy.radius * 0.9, enemy.radius * 0.32, 0, 0, TAU);
    context.fill();
    // Each kind wears its own colours, far enough apart to name across a crowded frame:
    // the moth deep violet, the Matriarch magenta with her gold crown.
    if (enemy.kind === KIND_MOTH) drawMothLike(enemy, 1, '#7e63d8', PALETTE.mothWing, false);
    else if (enemy.kind === KIND_BEETLE) drawBeetle(enemy);
    else if (enemy.kind === KIND_DARTER) drawDarter(enemy);
    else if (enemy.kind === KIND_SPITTER) drawSpitter(enemy);
    else if (enemy.kind === KIND_MATRIARCH) drawMothLike(enemy, 2.9, '#cf6fe0', '#ecd9ff', true);
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

  // --- Effects, HUD and panels --------------------------------------------------

  function drawProjectilesAndPickups(state) {
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

  function bar(x, y, width, height, fraction, fill, back = 'rgba(10, 8, 24, 0.72)') {
    context.fillStyle = back;
    context.fillRect(x, y, width, height);
    context.fillStyle = fill;
    context.fillRect(x, y, width * Math.min(1, Math.max(0, fraction)), height);
    context.strokeStyle = 'rgba(253, 246, 227, 0.4)';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  function drawHud(state, ui) {
    const bloom = state.bloom;
    // Bloom health, top left.
    text('❀ THE GREAT BLOOM', 26, 34, 17, PALETTE.goldSoft, 'left', BODY_FONT, 'bold');
    bar(26, 44, 264, 15, bloom.hp / bloom.maxHp, '#ff8fb2');
    text(`${Math.ceil(bloom.hp)} / ${bloom.maxHp}`, 300, 58, 15, PALETTE.cream, 'left');
    text(`✿ Pollen ${state.pollenCollected}`, 26, 88, 18, PALETTE.pollen, 'left', BODY_FONT, 'bold');
    if (bloom.pollenBank > 0) {
      bar(150, 78, 90, 8, bloom.pollenBank / BLOOM.pollenPerHeal, '#8be0a4');
    }
    // Night and the gloom left, top centre.
    text(`NIGHT ${Math.max(1, state.wave)} OF 10`, FIELD.width / 2, 36, 21, PALETTE.cream, 'center', DISPLAY_FONT, 'bold');
    const left = state.spawnQueue.length + state.enemies.length;
    if (state.phase === 'combat') {
      text(`gloom remaining: ${left}`, FIELD.width / 2, 62, 15, PALETTE.muted, 'center');
    }
    // Hearts, score and best, top right.
    for (let i = 0; i < state.player.maxHearts; i += 1) {
      const x = FIELD.width - 30 - i * 27;
      context.fillStyle = i < state.player.hearts ? PALETTE.heart : 'rgba(253, 246, 227, 0.18)';
      heartPath(x, 18, 11);
      context.fill();
    }
    text(`SCORE ${state.score}`, FIELD.width - 26, 76, 20, PALETTE.cream, 'right', BODY_FONT, 'bold');
    text(`best ${Math.max(ui.best, state.score)}`, FIELD.width - 26, 98, 14, PALETTE.muted, 'right');
    // Blessings owned, bottom left.
    state.owned.forEach((id, index) => {
      const x = 26 + index * 34;
      const y = FIELD.height - 40;
      context.fillStyle = 'rgba(16, 12, 38, 0.8)';
      context.fillRect(x, y, 30, 30);
      context.strokeStyle = 'rgba(242, 201, 76, 0.55)';
      context.strokeRect(x + 0.5, y + 0.5, 29, 29);
      const glyph = ui.glyphOf(id);
      text(glyph, x + 15, y + 21, 16, PALETTE.goldSoft, 'center');
    });
    // Controls hint, bottom right; the sound state with it.
    text(`WASD move · mouse aim · hold to shoot · Space dash · P pause · M sound ${ui.muted ? '(off)' : '(on)'}`,
      FIELD.width - 26, FIELD.height - 18, 13.5, 'rgba(184, 174, 214, 0.8)', 'right');
    // The Matriarch's bar, bottom centre.
    if (state.boss !== null) {
      text('✦ THE MATRIARCH ✦', FIELD.width / 2, FIELD.height - 52, 17, '#d9c8f5', 'center', DISPLAY_FONT, 'bold');
      bar(FIELD.width / 2 - 260, FIELD.height - 44, 520, 13, state.boss.hp / state.boss.maxHp, '#b388eb');
    }
    // The night's banner.
    if (state.banner !== null) {
      const banner = state.banner;
      const fadeIn = Math.min(1, banner.t / 0.35);
      const fadeOut = Math.min(1, Math.max(0, (banner.seconds - banner.t) / 0.5));
      context.globalAlpha = Math.min(fadeIn, fadeOut);
      text(banner.text, FIELD.width / 2, 168, 44, PALETTE.goldSoft, 'center', DISPLAY_FONT, 'bold');
      if (banner.sub) text(banner.sub, FIELD.width / 2, 202, 20, PALETTE.cream, 'center', BODY_FONT, 'italic');
      context.globalAlpha = 1;
    }
  }

  function panel(x, y, width, height) {
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, width - 2, height - 2);
    context.strokeStyle = 'rgba(242, 201, 76, 0.3)';
    context.lineWidth = 1;
    context.strokeRect(x + 6.5, y + 6.5, width - 13, height - 13);
  }

  function statsGrid(state, x, y, width) {
    const accuracy = state.shotsFired === 0 ? 0 : Math.round((state.shotsHit / state.shotsFired) * 100);
    const rows = [
      ['Score', `${state.score}`],
      ['Nights cleared', `${state.phase === 'won' ? 10 : Math.max(0, state.wave - (state.phase === 'cleared' ? 0 : 1))}`],
      ['Gloom banished', `${state.kills}`],
      ['Pollen gathered', `${state.pollenCollected}`],
      ['Foxfire accuracy', `${accuracy}%`],
      ['Time in the garden', formatTime(state.runTime)],
    ];
    rows.forEach(([label, value], index) => {
      const rowY = y + index * 34;
      text(label, x, rowY, 19, PALETTE.muted, 'left');
      text(value, x + width, rowY, 19, PALETTE.cream, 'right', BODY_FONT, 'bold');
    });
    return y + rows.length * 34;
  }

  function drawTitle(state, ui) {
    text('FOXFIRE', FIELD.width / 2, 148, 96, PALETTE.gold, 'center', DISPLAY_FONT, 'bold');
    text('— Garden of the Last Bloom —', FIELD.width / 2, 196, 31, PALETTE.cream, 'center', DISPLAY_FONT, 'italic');
    text('The gloom comes for the Great Bloom. You are its keeper: a fox spirit with a tail of fire.',
      FIELD.width / 2, 540, 20, PALETTE.cream, 'center');
    panel(250, 566, 780, 106);
    text('Guard the Bloom through ten nights — fell the Matriarch on the tenth, and dawn breaks.',
      FIELD.width / 2, 598, 17.5, PALETTE.cream, 'center');
    text('WASD / arrows move · mouse aims · hold mouse to shoot · Space dashes',
      FIELD.width / 2, 626, 17.5, PALETTE.muted, 'center');
    text('Gather pollen to heal the Bloom · choose a blessing after every night',
      FIELD.width / 2, 654, 17.5, PALETTE.muted, 'center');
    const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
    context.globalAlpha = pulse;
    text('CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 244, 24, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
    context.globalAlpha = 1;
    if (ui.best > 0) text(`Best score ${ui.best}`, FIELD.width / 2, 712 - 6, 15, PALETTE.muted, 'center');
  }

  function drawBlessing(state, ui) {
    context.fillStyle = 'rgba(6, 4, 18, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THE GARDEN OFFERS A BLESSING', FIELD.width / 2, 168, 36, PALETTE.goldSoft, 'center', DISPLAY_FONT, 'bold');
    text(`Night ${state.wave} is cleared. Choose one — click a card or press 1, 2 or 3.`,
      FIELD.width / 2, 206, 20, PALETTE.cream, 'center');
    ui.choices.forEach((blessing, index) => {
      const rect = blessingCardRect(index);
      const hovered = ui.hoverCard === index;
      context.fillStyle = hovered ? 'rgba(46, 34, 84, 0.95)' : PALETTE.panel;
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
      context.strokeStyle = hovered ? PALETTE.goldSoft : PALETTE.panelEdge;
      context.lineWidth = hovered ? 3 : 2;
      context.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      text(blessing.glyph, rect.x + rect.w / 2, rect.y + 92, 54, PALETTE.gold, 'center');
      text(blessing.name, rect.x + rect.w / 2, rect.y + 140, 26, PALETTE.cream, 'center', DISPLAY_FONT, 'bold');
      text(blessing.line, rect.x + rect.w / 2, rect.y + 186, 17.5, PALETTE.muted, 'center');
      text(blessing.detail, rect.x + rect.w / 2, rect.y + 232, 19, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
      text(`${index + 1}`, rect.x + rect.w / 2, rect.y + 292, 17, PALETTE.muted, 'center');
    });
  }

  function drawPaused(state) {
    context.fillStyle = 'rgba(6, 4, 18, 0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(440, 250, 400, 210);
    text('PAUSED', FIELD.width / 2, 330, 42, PALETTE.cream, 'center', DISPLAY_FONT, 'bold');
    text('The gloom waits with you.', FIELD.width / 2, 372, 19, PALETTE.muted, 'center');
    text('Press P or Enter to resume', FIELD.width / 2, 424, 20, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  }

  function drawOver(state, ui) {
    context.fillStyle = 'rgba(20, 4, 10, 0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(390, 108, 500, 520);
    const title = state.loseReason === 'bloom' ? 'THE BLOOM HAS FADED' : 'THE SPIRIT IS SCATTERED';
    text(title, FIELD.width / 2, 182, 31, '#ff8fa3', 'center', DISPLAY_FONT, 'bold');
    text(state.loseReason === 'bloom'
      ? `The gloom ate the last petal on night ${state.wave}.`
      : `The foxfire gutters out on night ${state.wave}.`,
    FIELD.width / 2, 222, 19, PALETTE.cream, 'center');
    statsGrid(state, 440, 286, 400);
    const bestLine = state.score >= ui.best && state.score > 0 ? `New best score!` : `Best score ${ui.best}`;
    text(bestLine, FIELD.width / 2, 540, 19, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
    const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
    context.globalAlpha = pulse;
    text('PRESS ENTER OR CLICK TO TRY AGAIN', FIELD.width / 2, 586, 21, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
    context.globalAlpha = 1;
  }

  function drawVictory(state, ui) {
    context.fillStyle = 'rgba(24, 10, 30, 0.35)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(380, 96, 520, 528);
    text('DAWN BREAKS', FIELD.width / 2, 172, 44, PALETTE.gold, 'center', DISPLAY_FONT, 'bold');
    text('The Matriarch is banished. The Bloom blooms on.', FIELD.width / 2, 210, 18.5, PALETTE.cream, 'center');
    statsGrid(state, 430, 262, 420);
    const bestLine = state.score >= ui.best && state.score > 0 ? 'A new best score!' : `Best score ${ui.best}`;
    text(bestLine, FIELD.width / 2, 516, 19, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
    const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
    context.globalAlpha = pulse;
    text('PRESS ENTER OR CLICK TO PLAY AGAIN', FIELD.width / 2, 566, 21, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
    context.globalAlpha = 1;
  }

  /** Paint one frame: scenery, creatures, effects, then HUD and the screen's panel. */
  function draw(state, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.skyTop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.time * 91.7) * state.shake * 0.5 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.time * 83.3) * state.shake * 0.4 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    context.textBaseline = 'alphabetic';

    drawSky(state);
    drawField(state);
    drawBloom(state);
    if (screen === SCREEN_TITLE) {
      for (const moth of state.ambientMoths) {
        drawMothLike({ x: moth.x, y: moth.y, t: state.time, seed: moth.phase }, 0.9, PALETTE.moth, PALETTE.mothWing, false);
      }
    }
    for (const enemy of state.enemies) drawEnemy(enemy);
    drawFox(state);
    drawProjectilesAndPickups(state);

    if (screen === SCREEN_PLAY || screen === SCREEN_BLESSING || screen === SCREEN_PAUSED) drawHud(state, ui);
    if (screen === SCREEN_TITLE) drawTitle(state, ui);
    else if (screen === SCREEN_BLESSING) drawBlessing(state, ui);
    else if (screen === SCREEN_PAUSED) drawPaused(state);
    else if (screen === SCREEN_OVER) drawOver(state, ui);
    else if (screen === SCREEN_VICTORY) drawVictory(state, ui);

    // A soft vignette to close the frame.
    const vignette = context.createRadialGradient(640, 360, 380, 640, 360, 780);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(2, 2, 10, 0.42)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
