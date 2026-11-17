// The heads-up display painted over the play, blessing and pause screens: the
// Bloom's health and the pollen bank that mends it, the night and the gloom
// remaining, hearts, score and best, the blessings the keeper has stacked, the
// controls hint, the Matriarch's bar and the night's banner.

import { BLOOM, BODY_FONT, DISPLAY_FONT, FIELD, PALETTE } from './config.js';

export function bar(kit, x, y, width, height, fraction, fill, back = 'rgba(10, 8, 24, 0.72)') {
  const { context } = kit;
  context.fillStyle = back;
  context.fillRect(x, y, width, height);
  context.fillStyle = fill;
  context.fillRect(x, y, width * Math.min(1, Math.max(0, fraction)), height);
  context.strokeStyle = 'rgba(253, 246, 227, 0.4)';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

export function drawHud(kit, state, ui) {
  const { context, text, heartPath } = kit;
  const bloom = state.bloom;
  // Bloom health, top left.
  text('❀ THE GREAT BLOOM', 26, 34, 17, PALETTE.goldSoft, 'left', BODY_FONT, 'bold');
  bar(kit, 26, 44, 264, 15, bloom.hp / bloom.maxHp, '#ff8fb2');
  text(`${Math.ceil(bloom.hp)} / ${bloom.maxHp}`, 300, 58, 15, PALETTE.cream, 'left');
  text(`✿ Pollen ${state.pollenCollected}`, 26, 88, 18, PALETTE.pollen, 'left', BODY_FONT, 'bold');
  if (bloom.pollenBank > 0) {
    bar(kit, 150, 78, 90, 8, bloom.pollenBank / BLOOM.pollenPerHeal, '#8be0a4');
  }
  text('30 banked pollen mends the Bloom', 26, 108, 12.5, PALETTE.muted, 'left');
  // Night and the gloom left, top centre.
  text(`NIGHT ${Math.max(1, state.wave)} OF 10`, FIELD.width / 2, 36, 21, PALETTE.cream, 'center', DISPLAY_FONT, 'bold');
  const left = state.spawnQueue.length + state.enemies.length;
  if (state.phase === 'combat') {
    text(`gloom remaining: ${left}`, FIELD.width / 2, 62, 15, PALETTE.muted, 'center');
  }
  // The objective lives in the left column: the Matriarch holds the top centre.
  text('WIN: survive all 10 nights · LOSE: the Bloom falls', 26, 130, 13.5, PALETTE.muted, 'left');
  // Hearts, score and best, top right.
  for (let i = 0; i < state.player.maxHearts; i += 1) {
    const x = FIELD.width - 30 - i * 27;
    context.fillStyle = i < state.player.hearts ? PALETTE.heart : 'rgba(253, 246, 227, 0.18)';
    heartPath(x, 18, 11);
    context.fill();
  }
  text(`SCORE ${state.score}`, FIELD.width - 26, 76, 20, PALETTE.cream, 'right', BODY_FONT, 'bold');
  text(`best ${Math.max(ui.best, state.score)}`, FIELD.width - 26, 98, 14, PALETTE.muted, 'right');
  // Blessings owned, bottom left — captioned, so the row reads as a stacked build.
  if (state.owned.length > 0) {
    text(`✦ ${state.owned.length} BLESSINGS STACKED`, 26, FIELD.height - 52, 12.5, PALETTE.goldSoft, 'left', BODY_FONT, 'bold');
  }
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
    bar(kit, FIELD.width / 2 - 260, FIELD.height - 44, 520, 13, state.boss.hp / state.boss.maxHp, '#b388eb');
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
