// Keyboard and mouse input. Movement keys and the mouse button are read as held state
// every step; one-shot presses (confirm, pause, dash, blessing picks, mute) are queued as
// bit flags and taken once by the loop, so a press between two frames is never lost and
// never counted twice. The mouse position is reported in the game's logical 1280x720
// field coordinates, using the same letterbox transform the renderer paints with.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_PICK_1 = 8;
export const ACTION_PICK_2 = 16;
export const ACTION_PICK_3 = 32;
export const ACTION_MUTE = 64;

const CONFIRM = new Set(['Enter', 'NumpadEnter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PICKS = new Map([
  ['Digit1', ACTION_PICK_1],
  ['Digit2', ACTION_PICK_2],
  ['Digit3', ACTION_PICK_3],
]);

const HELD_CODES = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyA', 'KeyD', 'KeyW', 'KeyS',
]);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let firing = false;
  let clicked = false;
  // The pointer starts over the Great Bloom, so the fox faces the moon before it moves.
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 3 };

  /** Convert a client (CSS pixel) point into logical field coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    pointer.x = (clientX - rect.left - offsetX) / scale;
    pointer.y = (clientY - rect.top - offsetY) / scale;
  }

  window.addEventListener('keydown', (event) => {
    if (HELD_CODES.has(event.code)) held.add(event.code);
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PICKS.has(event.code)) {
      if (!event.repeat) actions |= PICKS.get(event.code);
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
    firing = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    toField(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerdown', (event) => {
    toField(event.clientX, event.clientY);
    firing = true;
    clicked = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  return {
    /** The movement direction the held keys ask for: each axis -1, 0 or 1. */
    move() {
      const x = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0)
        - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
      const y = (held.has('ArrowDown') || held.has('KeyS') ? 1 : 0)
        - (held.has('ArrowUp') || held.has('KeyW') ? 1 : 0);
      return { x, y };
    },
    /** Whether the mouse button is held down (hold to shoot). */
    firing() {
      return firing;
    },
    /** The pointer in logical field coordinates. */
    pointer() {
      return pointer;
    },
    /** True once per physical click, for choosing blessing cards by their bounds. */
    takeClick() {
      const was = clicked;
      clicked = false;
      return was;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
