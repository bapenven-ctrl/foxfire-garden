// The garden itself: night sky and dawn, the flower field, and the Great Bloom.
// The scenery (stars, flowers, grass, fireflies, the stone ring) is laid out once
// from its own seeded generator, and everything that moves is a function of the
// world's simulated time, so a staged scene always paints the same frame.

import { BLOOM, FIELD, PALETTE } from './config.js';
import { createRandom, range } from './random.js';

const TAU = Math.PI * 2;

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

// --- The garden's fixed scenery, laid out once from its own seed. ---
let sceneryCache = null;
function scenery() {
  if (sceneryCache !== null) return sceneryCache;
  const rng = createRandom(20261116);
  const stars = [];
  for (let i = 0; i < 120; i += 1) {
    stars.push({ x: range(rng, 0, FIELD.width), y: range(rng, 0, 300), r: range(rng, 0.7, 2.1), phase: range(rng, 0, TAU) });
  }
  const flowers = [];
  const FLOWER_COLORS = ['#ff8fb2', '#ffd977', '#c9bdf0', '#8be0a4', '#ffb59f'];
  for (let i = 0; i < 110; i += 1) {
    flowers.push({
      x: range(rng, 14, FIELD.width - 14),
      y: range(rng, 486, FIELD.height - 12),
      size: range(rng, 2.4, 4.6),
      color: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
      phase: range(rng, 0, TAU),
    });
  }
  const grass = [];
  for (let i = 0; i < 90; i += 1) {
    grass.push({ x: range(rng, 6, FIELD.width - 6), y: range(rng, 470, FIELD.height - 6), h: range(rng, 8, 17), phase: range(rng, 0, TAU) });
  }
  const fireflies = [];
  for (let i = 0; i < 26; i += 1) {
    fireflies.push({ x: range(rng, 30, FIELD.width - 30), y: range(rng, 300, 660), phase: range(rng, 0, TAU), speed: range(rng, 0.24, 0.6) });
  }
  const stones = [];
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * TAU;
    stones.push({ x: BLOOM.x + Math.cos(angle) * 96, y: BLOOM.y + Math.sin(angle) * 40 + 26, r: range(rng, 6, 10) });
  }
  sceneryCache = { stars, flowers, grass, fireflies, stones };
  return sceneryCache;
}

export function drawSky(kit, state) {
  const { context } = kit;
  const { stars } = scenery();
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

export function drawField(kit, state) {
  const { context } = kit;
  const { flowers, grass, fireflies, stones } = scenery();
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

export function drawBloom(kit, state) {
  const { context } = kit;
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
