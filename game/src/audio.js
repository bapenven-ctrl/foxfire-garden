// Procedural sound: every effect and the whole score are synthesised with WebAudio —
// no audio files, nothing to load, and the game stays silent until the player's first
// click or keypress opens the context (the browser's autoplay rule). A tiny lookahead
// scheduler in update() walks a slow pentatonic progression for the night garden and
// plays soft plucked sparks over it; M mutes everything.

const MASTER_GAIN = 0.5;
const MUSIC_GAIN = 0.16;
const STEP_SECONDS = 2.4;
/** Am — F — C — G, one chord a step: roots and fifths for the pad, in Hz. */
const PROGRESSION = [
  [110.0, 164.81, 261.63],
  [87.31, 174.61, 220.0],
  [130.81, 196.0, 261.63],
  [98.0, 146.83, 246.94],
];
/** A minor pentatonic ladder for the plucked sparks, in Hz. */
const SPARKS = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
/** Every synthesised effect the game plays, by the name the audio factory returns it under. */
export const SOUND_EFFECTS = [
  'shoot', 'hitEnemy', 'killEnemy', 'bossDown', 'pickup', 'heartPickup', 'playerHurt',
  'bloomHurt', 'dash', 'waveStart', 'waveClear', 'blessing', 'victory', 'gameOver',
];

export function createAudio(random) {
  let context = null;
  let master = null;
  let musicBus = null;
  let muted = false;
  let stepIndex = 0;
  let nextStepAt = 0;
  let shotFlip = false;

  /** Open the context on the first user gesture; safe to call on every gesture. */
  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_GAIN;
    master.connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = MUSIC_GAIN;
    musicBus.connect(master);
    nextStepAt = context.currentTime + 0.1;
  }

  function tone({ freq, freqEnd = null, type = 'sine', at = 0, dur = 0.2, vol = 0.3, bus = null }) {
    if (context === null) return;
    const start = context.currentTime + at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(bus ?? master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  function noise({ at = 0, dur = 0.15, vol = 0.2, freq = 1200, q = 0.8 }) {
    if (context === null) return;
    const start = context.currentTime + at;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  /** One pad chord and, on most steps, one or two plucked sparks above it. */
  function scheduleStep() {
    const chord = PROGRESSION[stepIndex % PROGRESSION.length];
    for (const freq of chord) {
      tone({ freq, type: 'triangle', dur: STEP_SECONDS * 1.05, vol: 0.11, bus: musicBus });
      tone({ freq: freq * 2, type: 'sine', dur: STEP_SECONDS * 1.05, vol: 0.03, bus: musicBus });
    }
    if (random() < 0.85) {
      const at = random() * STEP_SECONDS * 0.5;
      tone({ freq: SPARKS[Math.floor(random() * SPARKS.length)], type: 'sine', at, dur: 0.7, vol: 0.06, bus: musicBus });
    }
    if (random() < 0.4) {
      const at = STEP_SECONDS * (0.5 + random() * 0.4);
      tone({ freq: SPARKS[Math.floor(random() * SPARKS.length)], type: 'sine', at, dur: 0.6, vol: 0.045, bus: musicBus });
    }
    stepIndex += 1;
    nextStepAt += STEP_SECONDS;
  }

  return {
    unlock,
    /** Advance the music scheduler; call once a frame with the audio clock in mind. */
    update() {
      if (context === null || muted) return;
      while (nextStepAt < context.currentTime + STEP_SECONDS) scheduleStep();
    },
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : MASTER_GAIN;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      shotFlip = !shotFlip;
      tone({ freq: shotFlip ? 880 : 830, freqEnd: 320, type: 'square', dur: 0.09, vol: 0.07 });
    },
    hitEnemy() {
      noise({ dur: 0.06, vol: 0.10, freq: 2400, q: 1.2 });
    },
    killEnemy() {
      tone({ freq: 520, freqEnd: 90, type: 'sawtooth', dur: 0.22, vol: 0.12 });
      noise({ dur: 0.18, vol: 0.10, freq: 900, q: 0.6 });
    },
    bossDown() {
      tone({ freq: 196, freqEnd: 40, type: 'sawtooth', dur: 0.9, vol: 0.22 });
      noise({ dur: 0.8, vol: 0.16, freq: 500, q: 0.5 });
      tone({ freq: 392, type: 'triangle', at: 0.5, dur: 0.5, vol: 0.12 });
    },
    pickup() {
      tone({ freq: 987.77, type: 'sine', dur: 0.12, vol: 0.10 });
      tone({ freq: 1318.5, type: 'sine', at: 0.05, dur: 0.16, vol: 0.08 });
    },
    heartPickup() {
      tone({ freq: 659.25, type: 'sine', dur: 0.16, vol: 0.12 });
      tone({ freq: 987.77, type: 'sine', at: 0.08, dur: 0.24, vol: 0.10 });
    },
    playerHurt() {
      tone({ freq: 220, freqEnd: 110, type: 'sawtooth', dur: 0.25, vol: 0.18 });
    },
    bloomHurt() {
      tone({ freq: 130, freqEnd: 70, type: 'sine', dur: 0.3, vol: 0.22 });
    },
    dash() {
      noise({ dur: 0.16, vol: 0.12, freq: 1600, q: 0.4 });
    },
    waveStart() {
      tone({ freq: 261.63, type: 'triangle', dur: 0.5, vol: 0.14 });
      tone({ freq: 392.0, type: 'triangle', at: 0.02, dur: 0.5, vol: 0.10 });
    },
    waveClear() {
      tone({ freq: 523.25, type: 'triangle', dur: 0.3, vol: 0.12 });
      tone({ freq: 659.25, type: 'triangle', at: 0.09, dur: 0.3, vol: 0.12 });
      tone({ freq: 783.99, type: 'triangle', at: 0.18, dur: 0.45, vol: 0.12 });
    },
    blessing() {
      tone({ freq: 587.33, type: 'sine', dur: 0.35, vol: 0.12 });
      tone({ freq: 739.99, type: 'sine', at: 0.07, dur: 0.35, vol: 0.12 });
      tone({ freq: 880.0, type: 'sine', at: 0.14, dur: 0.5, vol: 0.12 });
      tone({ freq: 1174.66, type: 'sine', at: 0.21, dur: 0.6, vol: 0.10 });
    },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => tone({ freq, type: 'triangle', at: i * 0.13, dur: 0.5, vol: 0.13 }));
    },
    gameOver() {
      const notes = [392.0, 329.63, 261.63, 196.0];
      notes.forEach((freq, i) => tone({ freq, type: 'triangle', at: i * 0.22, dur: 0.55, vol: 0.13 }));
    },
  };
}
