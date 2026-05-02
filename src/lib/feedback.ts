"use client";

// Lightweight haptic + audio feedback helpers for the quiz. The sounds are
// synthesized in real-time via the Web Audio API so we don't have to ship
// any audio files. Vibrations use the standard Vibration API where
// available (ignored silently on desktops).

type AC = typeof AudioContext;

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: AC }).AudioContext ||
    (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.1,
  delay = 0,
) {
  const c = getCtx();
  if (!c || !enabled) return;
  // Resume the context on first user gesture; browsers lock it until then.
  if (c.state === "suspended") {
    void c.resume();
  }
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (!enabled) return;
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw when the page is backgrounded; ignore.
    }
  }
}

export const feedback = {
  /** Called the moment the user taps an answer choice. */
  pick() {
    vibrate(12);
    tone(880, 0.05, "sine", 0.08);
  },
  /** Positive, punchy major chord arpeggio on a correct answer. */
  correct() {
    vibrate([30, 40, 30]);
    tone(523.25, 0.12, "triangle", 0.1, 0);
    tone(659.25, 0.12, "triangle", 0.1, 0.08);
    tone(783.99, 0.22, "triangle", 0.12, 0.16);
  },
  /** Low, slightly dissonant buzz on a wrong answer. */
  wrong() {
    vibrate([90, 40, 90]);
    tone(220, 0.22, "sawtooth", 0.12, 0);
    tone(185, 0.18, "sawtooth", 0.1, 0.08);
  },
  /** Quiet metronome blip used in the kana quiz Reading mode at the
   *  1.0s and 2.0s marks of the 4s show window — punctuates the
   *  countdown without dominating the user's focus. */
  tickSoft() {
    tone(880, 0.06, "sine", 0.04);
  },
  /** Brighter, slightly louder cue at the 3.0s mark of the same
   *  show window, telegraphing "answer reveal incoming" right
   *  before the card flips. */
  tickFinal() {
    tone(1320, 0.09, "triangle", 0.06);
  },
  setEnabled(v: boolean) {
    enabled = v;
  },
  isEnabled() {
    return enabled;
  },
};
