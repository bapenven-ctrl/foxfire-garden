// Drawing only: the world's state and the current screen in, pixels out. The
// renderer itself is just the frame's conductor — it clears the canvas, lays
// the view transform, and calls the painters in their layers: the garden
// (drawGarden.js), the creatures (drawCreatures.js), the HUD (drawHud.js) and
// the screens (drawScreens.js), all working through one shared kit
// (drawKit.js). Everything that moves is a function of the world's simulated
// time, so a staged scene always paints the same frame.

import { FIELD, PALETTE } from './config.js';
import { createDrawKit } from './drawKit.js';
import { drawBloom, drawField, drawSky } from './drawGarden.js';
import { drawEnemy, drawFox, drawMothLike, drawProjectilesAndPickups } from './drawCreatures.js';
import { drawHud } from './drawHud.js';
import { drawBlessing, drawOver, drawPaused, drawTitle, drawVictory } from './drawScreens.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BLESSING = 'blessing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export { blessingCardRect } from './drawScreens.js';

export function createRenderer(canvas) {
  const kit = createDrawKit(canvas);
  const { context, view } = kit;

  /** Paint one frame: scenery, creatures, effects, then HUD and the screen's panel. */
  function draw(state, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.skyTop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.time * 91.7) * state.shake * 0.5 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.time * 83.3) * state.shake * 0.4 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    context.textBaseline = 'alphabetic';

    drawSky(kit, state);
    drawField(kit, state);
    drawBloom(kit, state);
    if (screen === SCREEN_TITLE) {
      for (const moth of state.ambientMoths) {
        drawMothLike(kit, { x: moth.x, y: moth.y, t: state.time, seed: moth.phase }, 0.9, PALETTE.moth, PALETTE.mothWing, false);
      }
    }
    for (const enemy of state.enemies) drawEnemy(kit, enemy);
    drawFox(kit, state);
    drawProjectilesAndPickups(kit, state);

    if (screen === SCREEN_PLAY || screen === SCREEN_BLESSING || screen === SCREEN_PAUSED) drawHud(kit, state, ui);
    if (screen === SCREEN_TITLE) drawTitle(kit, state, ui);
    else if (screen === SCREEN_BLESSING) drawBlessing(kit, state, ui);
    else if (screen === SCREEN_PAUSED) drawPaused(kit, state);
    else if (screen === SCREEN_OVER) drawOver(kit, state, ui);
    else if (screen === SCREEN_VICTORY) drawVictory(kit, state, ui);

    // A soft vignette to close the frame.
    const vignette = context.createRadialGradient(640, 360, 380, 640, 360, 780);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(2, 2, 10, 0.42)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  kit.resize();
  window.addEventListener('resize', kit.resize);
  return { draw };
}
