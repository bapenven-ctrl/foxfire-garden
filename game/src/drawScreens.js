// The screens: the title with its rules panel, the blessing choice with its
// three cards, the pause panel, and the two endings — the scattered spirit and
// dawn breaking — each with the run's tallies in a shared stats grid and its
// restart line. Everything here is panel and text over the garden the other
// painters draw.

import { BODY_FONT, DISPLAY_FONT, FIELD, PALETTE } from './config.js';

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

export function panel(kit, x, y, width, height) {
  const { context } = kit;
  context.fillStyle = PALETTE.panel;
  context.fillRect(x, y, width, height);
  context.strokeStyle = PALETTE.panelEdge;
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, width - 2, height - 2);
  context.strokeStyle = 'rgba(242, 201, 76, 0.3)';
  context.lineWidth = 1;
  context.strokeRect(x + 6.5, y + 6.5, width - 13, height - 13);
}

export function statsGrid(kit, state, x, y, width) {
  const { text } = kit;
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

export function drawTitle(kit, state, ui) {
  const { context, text } = kit;
  text('FOXFIRE', FIELD.width / 2, 148, 96, PALETTE.gold, 'center', DISPLAY_FONT, 'bold');
  text('— Garden of the Last Bloom —', FIELD.width / 2, 196, 31, PALETTE.cream, 'center', DISPLAY_FONT, 'italic');
  text('The gloom comes for the Great Bloom. You are its keeper: a fox spirit with a tail of fire.',
    FIELD.width / 2, 532, 20, PALETTE.cream, 'center');
  panel(kit, 250, 544, 780, 148);
  text('WIN: survive all 10 nights — fell the Matriarch on the tenth, and dawn breaks',
    FIELD.width / 2, 574, 17.5, PALETTE.cream, 'center');
  text('LOSE: the Bloom falls to the gloom, or the fox\'s hearts run out',
    FIELD.width / 2, 600, 17.5, PALETTE.cream, 'center');
  text('WASD / arrows · mouse aim · hold to shoot · Space dash — untouchable mid-dash',
    FIELD.width / 2, 626, 17.5, PALETTE.muted, 'center');
  text('Gather pollen to heal the Bloom · choose a blessing after every night',
    FIELD.width / 2, 652, 17.5, PALETTE.muted, 'center');
  text('Five kinds of gloom · twelve blessings to stack · one Matriarch',
    FIELD.width / 2, 678, 17.5, PALETTE.goldSoft, 'center');
  const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
  context.globalAlpha = pulse;
  text('CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 244, 24, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  context.globalAlpha = 1;
  if (ui.best > 0) text(`Best score ${ui.best}`, FIELD.width / 2, 712 - 6, 15, PALETTE.muted, 'center');
}

export function drawBlessing(kit, state, ui) {
  const { context, text } = kit;
  context.fillStyle = 'rgba(6, 4, 18, 0.55)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  text('THE GARDEN OFFERS A BLESSING', FIELD.width / 2, 168, 36, PALETTE.goldSoft, 'center', DISPLAY_FONT, 'bold');
  text(`Night ${state.wave} is cleared. Choose one — click a card or press 1, 2 or 3.`,
    FIELD.width / 2, 206, 20, PALETTE.cream, 'center');
  text('One of three, drawn from the garden\'s twelve — every blessing stacks.',
    FIELD.width / 2, 238, 16.5, PALETTE.goldSoft, 'center');
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

export function drawPaused(kit, state) {
  const { context, text } = kit;
  context.fillStyle = 'rgba(6, 4, 18, 0.6)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(kit, 440, 250, 400, 210);
  text('PAUSED', FIELD.width / 2, 330, 42, PALETTE.cream, 'center', DISPLAY_FONT, 'bold');
  text('The gloom waits with you.', FIELD.width / 2, 372, 19, PALETTE.muted, 'center');
  text('Press P or Enter to resume', FIELD.width / 2, 424, 20, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
}

export function drawOver(kit, state, ui) {
  const { context, text } = kit;
  context.fillStyle = 'rgba(20, 4, 10, 0.62)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(kit, 390, 108, 500, 520);
  const title = state.loseReason === 'bloom' ? 'THE BLOOM HAS FADED' : 'THE SPIRIT IS SCATTERED';
  text(title, FIELD.width / 2, 182, 31, '#ff8fa3', 'center', DISPLAY_FONT, 'bold');
  text(state.loseReason === 'bloom'
    ? `The gloom ate the last petal on night ${state.wave}.`
    : `The foxfire gutters out on night ${state.wave}.`,
  FIELD.width / 2, 222, 19, PALETTE.cream, 'center');
  statsGrid(kit, state, 440, 286, 400);
  const bestLine = state.score >= ui.best && state.score > 0 ? `New best score!` : `Best score ${ui.best}`;
  text(bestLine, FIELD.width / 2, 540, 19, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
  context.globalAlpha = pulse;
  text('PRESS ENTER OR CLICK TO TRY AGAIN', FIELD.width / 2, 586, 21, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  context.globalAlpha = 1;
}

/** The dawn's grade for a finished run, read straight off its real score. */
export function victoryGrade(score) {
  if (score >= 6000) return 'S';
  if (score >= 5000) return 'A';
  if (score >= 4000) return 'B';
  return 'C';
}

export function drawVictory(kit, state, ui) {
  const { context, text } = kit;
  context.fillStyle = 'rgba(24, 10, 30, 0.35)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(kit, 380, 96, 520, 528);
  text('DAWN BREAKS', FIELD.width / 2, 172, 44, PALETTE.gold, 'center', DISPLAY_FONT, 'bold');
  text('The Matriarch is banished. The Bloom blooms on.', FIELD.width / 2, 210, 18.5, PALETTE.cream, 'center');
  text(`✦ GRADE ${victoryGrade(state.score)} ✦`, FIELD.width / 2, 248, 23, PALETTE.goldSoft, 'center', DISPLAY_FONT, 'bold');
  statsGrid(kit, state, 430, 282, 420);
  const bestLine = state.score >= ui.best && state.score > 0 ? 'A new best score!' : `Best score ${ui.best}`;
  text(bestLine, FIELD.width / 2, 516, 19, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  const pulse = 0.8 + 0.2 * Math.sin(state.time * 2.6);
  context.globalAlpha = pulse;
  text('PRESS ENTER OR CLICK TO PLAY AGAIN', FIELD.width / 2, 566, 21, PALETTE.goldSoft, 'center', BODY_FONT, 'bold');
  context.globalAlpha = 1;
}
