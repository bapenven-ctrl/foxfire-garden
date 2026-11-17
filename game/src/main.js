// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens — title, play, blessing, paused, game over
// and victory — and this file owns the moves between them, the sounds each event earns,
// and the best score's keeping.
//
// ?seed=N fixes the garden's randomness. ?shot=title|battle|blessing|defeat|victory
// (with &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BLOOM_HURT, EVENT_BOSS_DOWN, EVENT_DASH, EVENT_HEART_PICKUP, EVENT_HIT, EVENT_KILL, EVENT_PICKUP, EVENT_PLAYER_HURT, EVENT_WARD_BLOCK } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2, ACTION_PICK_3 } from './input.js';
import { createAudio } from './audio.js';
import { blessingById, drawBlessings } from './blessings.js';
import { blessingCardRect, createRenderer, SCREEN_BLESSING, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { createShotScenes } from './shots.js';

const { stageShot } = createShotScenes();

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const choiceRandom = createRandom(seed ^ 0x51ab);
const audio = createAudio(createRandom(seed ^ 0x9e37));
const renderer = createRenderer(canvas);

const ui = {
  best: 0,
  choices: [],
  hoverCard: -1,
  muted: false,
  glyphOf: (id) => blessingById(id).glyph,
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, seed);
  ui.best = scene.best;
  ui.choices = scene.choices ?? [];
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let lastShotAt = -1;
  const soundAt = { hit: 0, kill: 0, pickup: 0, bloom: 0 };
  ui.best = readBest();
  world.reset();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.startRun();
    screen = SCREEN_PLAY;
    audio.waveStart();
    announce(`Night 1. Guard the Great Bloom. ${world.state.player.hearts} hearts.`);
  }

  function finishRun() {
    if (world.state.score > ui.best) {
      ui.best = world.state.score;
      saveBest(ui.best);
    }
  }

  function pickBlessing(index) {
    const blessing = ui.choices[index];
    if (!blessing) return;
    world.applyBlessing(blessing);
    ui.choices = [];
    audio.blessing();
    world.beginNextWave();
    screen = SCREEN_PLAY;
    audio.waveStart();
    announce(`Blessing taken: ${blessing.name}. Night ${world.state.wave} begins.`);
  }

  function handleEvents(events) {
    const now = performance.now();
    if (world.state.lastShotAt !== undefined && world.state.lastShotAt !== lastShotAt) {
      lastShotAt = world.state.lastShotAt;
      audio.shoot();
    }
    if ((events & EVENT_HIT) && now - soundAt.hit > 50) { soundAt.hit = now; audio.hitEnemy(); }
    if ((events & EVENT_KILL) && now - soundAt.kill > 60) { soundAt.kill = now; audio.killEnemy(); }
    if ((events & EVENT_PICKUP) && now - soundAt.pickup > 90) { soundAt.pickup = now; audio.pickup(); }
    if (events & EVENT_HEART_PICKUP) audio.heartPickup();
    if (events & EVENT_PLAYER_HURT) {
      audio.playerHurt();
      announce(world.state.player.hearts === 1 ? 'Hit. One heart left.' : `Hit. ${world.state.player.hearts} hearts left.`);
    }
    if (events & EVENT_WARD_BLOCK) audio.pickup();
    if ((events & EVENT_BLOOM_HURT) && now - soundAt.bloom > 320) { soundAt.bloom = now; audio.bloomHurt(); }
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_BOSS_DOWN) audio.bossDown();
  }

  function handlePhaseChanges() {
    const phase = world.state.phase;
    if (screen === SCREEN_PLAY && phase === 'cleared') {
      ui.choices = drawBlessings(choiceRandom, 3);
      input.takeClick(); // the click that fired the last shot must not pick a card
      screen = SCREEN_BLESSING;
      audio.waveClear();
      announce(`Night ${world.state.wave} cleared. Choose a blessing.`);
    } else if (screen === SCREEN_PLAY && phase === 'lost') {
      screen = SCREEN_OVER;
      finishRun();
      audio.gameOver();
      announce(`Game over. Score ${world.state.score}. Press Enter to play again.`);
    } else if (screen === SCREEN_PLAY && phase === 'won') {
      screen = SCREEN_VICTORY;
      finishRun();
      audio.victory();
      announce(`Dawn breaks. You win. Score ${world.state.score}. Press Enter to play again.`);
    }
  }

  function controlFromInput(actions) {
    const move = input.move();
    const pointer = input.pointer();
    let moveX = move.x;
    let moveY = move.y;
    if (moveX !== 0 && moveY !== 0) {
      moveX *= Math.SQRT1_2;
      moveY *= Math.SQRT1_2;
    }
    return {
      moveX,
      moveY,
      aimX: pointer.x,
      aimY: pointer.y,
      firing: input.firing(),
      dash: (actions & ACTION_DASH) !== 0,
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) ui.muted = audio.toggleMute();
    audio.unlock();

    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
      else {
        while (accumulator >= STEP) {
          world.stepAmbient(STEP);
          accumulator -= STEP;
        }
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
        accumulator = 0;
      } else {
        const control = controlFromInput(actions);
        let first = true;
        while (accumulator >= STEP && screen === SCREEN_PLAY) {
          const stepControl = first ? control : { ...control, dash: false };
          first = false;
          const events = world.step(STEP, stepControl);
          handleEvents(events);
          handlePhaseChanges();
          accumulator -= STEP;
        }
      }
    } else if (screen === SCREEN_BLESSING) {
      const pointer = input.pointer();
      ui.hoverCard = -1;
      for (let i = 0; i < ui.choices.length; i += 1) {
        const rect = blessingCardRect(i);
        if (pointer.x >= rect.x && pointer.x <= rect.x + rect.w && pointer.y >= rect.y && pointer.y <= rect.y + rect.h) {
          ui.hoverCard = i;
        }
      }
      if (input.takeClick() && ui.hoverCard >= 0) pickBlessing(ui.hoverCard);
      else if (actions & ACTION_PICK_1) pickBlessing(0);
      else if (actions & ACTION_PICK_2) pickBlessing(1);
      else if (actions & ACTION_PICK_3) pickBlessing(2);
      while (accumulator >= STEP) {
        world.stepAmbient(STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      accumulator = 0;
    } else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      if (actions & ACTION_CONFIRM) startGame();
      else {
        while (accumulator >= STEP) {
          world.stepAmbient(STEP);
          accumulator -= STEP;
        }
      }
    }
    audio.update();
    renderer.draw(world.state, screen, ui);
  }

  // Leaving the tab pauses a running game rather than letting the gloom feed unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('FOXFIRE, Garden of the Last Bloom. Click or press Enter to begin.');
  requestAnimationFrame(frame);

  // A small handle for scripted play-tests: read the screen and the world's state.
  window.__foxfire = { world, screen: () => screen };
}

if (shot) runShot(shot);
else runGame();
