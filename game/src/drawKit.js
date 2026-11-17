// The shared drawing kit every painter works with: the canvas context, the view
// transform that fits the fixed 1280x720 field to the window, and the small
// primitives — cached fonts, one text call, the heart path — that the garden,
// creature, HUD and screen painters all share, so each of them can stay a plain
// top-level function in its own file.

import { BODY_FONT, FIELD } from './config.js';

export function createDrawKit(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

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

  return { canvas, context, view, resize, text, heartPath };
}
