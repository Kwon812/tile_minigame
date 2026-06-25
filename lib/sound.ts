// Tiny Web Audio SFX synth — no asset files. Sounds are generated from
// oscillators so the whole thing is self-contained.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  delay?: number;
}

function tone({ freq, dur, type = "sine", vol = 0.2, slideTo, delay = 0 }: ToneOpts) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Resume the audio context after a user gesture (call on first click). */
  unlock() {
    ac();
  },
  /** Countdown / timer tick. */
  tick() {
    tone({ freq: 1000, dur: 0.05, type: "square", vol: 0.07 });
  },
  /** Round start "go". */
  go() {
    tone({ freq: 660, dur: 0.1, type: "square", vol: 0.13 });
    tone({ freq: 990, dur: 0.16, type: "square", vol: 0.13, delay: 0.1 });
  },
  /** Answer reveal chime. */
  reveal() {
    tone({ freq: 587, dur: 0.12, type: "triangle", vol: 0.18 });
    tone({ freq: 880, dur: 0.22, type: "triangle", vol: 0.18, delay: 0.08 });
  },
  /** Tiles drop / players eliminated — falling whoosh. */
  eliminate() {
    tone({ freq: 320, dur: 0.35, type: "sawtooth", vol: 0.16, slideTo: 70 });
  },
  /** Victory fanfare. */
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: "square", vol: 0.16, delay: i * 0.13 })
    );
  },
  /** Eliminated self / no winner. */
  lose() {
    tone({ freq: 300, dur: 0.5, type: "sine", vol: 0.15, slideTo: 120 });
  },
};
