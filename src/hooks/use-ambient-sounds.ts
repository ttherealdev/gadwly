"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ambient sounds generated with the Web Audio API so there r no audio files to download
 * no loop gap, and nothing that sounds like a compressed 10-second clip on repeat. (current one)
 */

export type SoundName = "rain" | "fire" | "noise";
export const SOUND_NAMES: SoundName[] = ["rain", "fire", "noise"];

const STORAGE_KEY = "gadwly:sound-volumes";
const DEFAULT_VOLUME: Record<SoundName, number> = {
  rain: 60,
  fire: 55,
  noise: 40,
};
const TRIM: Record<SoundName, number> = { rain: 1, fire: 0.8, noise: 0.5 };
const level = (name: SoundName, v: number) =>
  TRIM[name] * Math.pow(v / 100, 1.7);

/* ------------------------------------------------------------------ */
/* Noise buffers                                                       */
/* ------------------------------------------------------------------ */

type NoiseKind = "white" | "pink" | "brown";
export type Bufs = {
  white: AudioBuffer;
  pink: AudioBuffer;
  brown: AudioBuffer;
};

/** Stereo noise that loops seamlessly (the tail is cross-faded into the head). */
export function makeNoise(
  ctx: BaseAudioContext,
  kind: NoiseKind,
  seconds = 8,
): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const fade = Math.floor(rate * 0.3);
  const buf = ctx.createBuffer(2, len, rate);

  for (let c = 0; c < 2; c++) {
    const raw = new Float32Array(len + fade);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0,
      last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") {
        raw[i] = w * 0.5;
      } else if (kind === "brown") {
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last * 3.5;
      } else {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    const out = buf.getChannelData(c);
    out.set(raw.subarray(0, len));
    for (let i = 0; i < fade; i++) {
      const x = (i / fade) * (Math.PI / 2);
      out[i] = raw[i] * Math.sin(x) + raw[len + i] * Math.cos(x);
    }
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

type Voice = { stop: () => void };
export type Sched = (
  ctx: BaseAudioContext,
  tick: (from: number, to: number) => void,
) => () => void;

/** Schedules audio events ~1.5s ahead, so sound keeps going even when the tab's timers are throttled. */
export const startScheduler: Sched = (ctx, tick) => {
  let done = 0;
  const run = () => {
    const to = ctx.currentTime + 1.5;
    if (to > done) {
      tick(Math.max(done, ctx.currentTime), to);
      done = to;
    }
  };
  run();
  const id = setInterval(run, 250);
  return () => clearInterval(id);
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const expo = (mean: number) => -Math.log(1 - Math.random()) * mean;

function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  freq: number,
  q = 0.7,
) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function panner(ctx: BaseAudioContext, value: number) {
  const p = ctx.createStereoPanner();
  p.pan.value = value;
  return p;
}

/** A short one-shot burst of filtered noise: the building block of drops and crackles. */
function burst(
  ctx: BaseAudioContext,
  out: AudioNode,
  white: AudioBuffer,
  t: number,
  o: {
    dur: number;
    peak: number;
    band: number;
    q: number;
    high?: number;
    attack?: number;
  },
) {
  const s = ctx.createBufferSource();
  s.buffer = white;
  const bp = filter(ctx, "bandpass", o.band, o.q);
  const g = ctx.createGain();
  const attack = o.attack ?? 0.002;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  s.connect(bp);
  if (o.high) {
    const hp = filter(ctx, "highpass", o.high, 0.7);
    bp.connect(hp);
    hp.connect(g);
  } else {
    bp.connect(g);
  }
  g.connect(panner(ctx, rand(-0.8, 0.8))).connect(out);
  s.start(t, rand(0, Math.max(0, white.duration - 0.2)), o.dur + 0.02);
}

/** Looping source, started at a random offset so layers never line up. */
function loopSource(
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  stops: (() => void)[],
) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(0, Math.random() * buf.duration);
  stops.push(() => {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  });
  return s;
}

/** Slow sine that gently moves an AudioParam, so the sound "breathes". */
function wobble(
  ctx: BaseAudioContext,
  hz: number,
  depth: number,
  param: AudioParam,
  stops: (() => void)[],
) {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(param);
  osc.start();
  stops.push(() => {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
}

/* ------------------------------------------------------------------ */
/* Voices                                                              */
/* ------------------------------------------------------------------ */

export function buildRain(
  ctx: BaseAudioContext,
  out: AudioNode,
  bufs: Bufs,
  sched: Sched = startScheduler,
): Voice {
  const stops: (() => void)[] = [];

  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.5;
  loopSource(ctx, bufs.pink, stops)
    .connect(filter(ctx, "highpass", 600, 0.5))
    .connect(filter(ctx, "lowpass", 8500, 0.5))
    .connect(hissGain)
    .connect(out);
  wobble(ctx, 0.11, 0.09, hissGain.gain, stops);

  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.3;
  loopSource(ctx, bufs.brown, stops)
    .connect(filter(ctx, "lowpass", 520, 0.6))
    .connect(bodyGain)
    .connect(out);
  wobble(ctx, 0.07, 0.06, bodyGain.gain, stops);

  let next = 0;
  stops.push(
    sched(ctx, (from, to) => {
      if (next < from) next = from;
      while (next < to) {
        burst(ctx, out, bufs.white, next, {
          dur: rand(0.01, 0.03),
          peak: rand(0.04, 0.16),
          band: rand(2200, 6500),
          q: rand(2, 6),
        });
        next += rand(0.012, 0.06);
      }
    }),
  );

  return { stop: () => stops.forEach((s) => s()) };
}

export function buildFire(
  ctx: BaseAudioContext,
  out: AudioNode,
  bufs: Bufs,
  sched: Sched = startScheduler,
): Voice {
  const stops: (() => void)[] = [];

  const rumble = ctx.createGain();
  rumble.gain.value = 0.8;
  loopSource(ctx, bufs.brown, stops)
    .connect(filter(ctx, "lowpass", 380, 0.6))
    .connect(rumble)
    .connect(out);

  // the mid "whoosh"
  const body = ctx.createGain();
  body.gain.value = 0.1;
  loopSource(ctx, bufs.pink, stops)
    .connect(filter(ctx, "bandpass", 700, 0.7))
    .connect(body)
    .connect(out);
  wobble(ctx, 0.23, 0.05, body.gain, stops);

  // random pops, sometimes in little clusters, now and then a loud snap
  let next = 0;
  let nextWobble = 0;
  stops.push(
    sched(ctx, (from, to) => {
      if (next < from) next = from;
      if (nextWobble < from) nextWobble = from;
      while (next < to) {
        if (next >= nextWobble) {
          rumble.gain.setTargetAtTime(rand(0.5, 1), next, 0.35);
          nextWobble = next + rand(0.6, 1.4);
        }
        const big = Math.random() < 0.08;
        const cluster =
          Math.random() < 0.25 ? 2 + Math.floor(Math.random() * 3) : 1;
        for (let k = 0; k < cluster; k++) {
          const isBig = big && k === 0;
          burst(ctx, out, bufs.white, next + k * rand(0.012, 0.04), {
            dur: isBig ? rand(0.05, 0.1) : rand(0.008, 0.038),
            peak: isBig ? rand(0.5, 0.8) : rand(0.06, 0.3),
            band: rand(1500, 5000),
            q: rand(0.7, 1.7),
            high: rand(900, 2100),
            attack: 0.001,
          });
        }
        next += expo(0.16);
      }
    }),
  );

  return { stop: () => stops.forEach((s) => s()) };
}

export function buildNoise(
  ctx: BaseAudioContext,
  out: AudioNode,
  bufs: Bufs,
): Voice {
  const stops: (() => void)[] = [];
  loopSource(ctx, bufs.brown, stops)
    .connect(filter(ctx, "lowpass", 1400, 0.5))
    .connect(out);
  return { stop: () => stops.forEach((s) => s()) };
}

/** A soft three-note rising chime that rings out: pleasant, not an alarm. */
export function playChime(
  ctx: BaseAudioContext,
  out: AudioNode,
  at = ctx.currentTime + 0.03,
) {
  const notes = [659.25, 830.61, 987.77, 1318.51]; // E5 G#5 B5 E6
  notes.forEach((freq, i) => {
    const t = at + i * 0.17;
    const last = i === notes.length - 1;
    const dur = last ? 2.4 : 1.2;
    [1, 2.01, 3.02].forEach((mult, k) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      const peak = [0.22, 0.07, 0.025][k] * (last ? 1.15 : 1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + k * 0.6));
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  });
}

const BUILDERS: Record<
  SoundName,
  (ctx: BaseAudioContext, out: AudioNode, bufs: Bufs) => Voice
> = {
  rain: (c, o, b) => buildRain(c, o, b),
  fire: (c, o, b) => buildFire(c, o, b),
  noise: (c, o, b) => buildNoise(c, o, b),
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

type Entry = {
  gain: GainNode;
  voice: Voice;
  kill?: ReturnType<typeof setTimeout>;
};

export function useAmbientSounds() {
  const [enabled, setEnabled] = useState<Record<SoundName, boolean>>({
    rain: false,
    fire: false,
    noise: false,
  });
  const [volume, setVolumeState] =
    useState<Record<SoundName, number>>(DEFAULT_VOLUME);
  const [loaded, setLoaded] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const bufsRef = useRef<Bufs | null>(null);
  const entries = useRef<Partial<Record<SoundName, Entry>>>({});

  // Browsers only allow audio after a user gesture, so the context is created from click handlers.
  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // saved volumes (sounds themselves always start off)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      setVolumeState((v) => {
        const next = { ...v };
        for (const n of SOUND_NAMES) {
          if (typeof saved?.[n] === "number")
            next[n] = Math.min(100, Math.max(0, saved[n]));
        }
        return next;
      });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volume));
    } catch {
      /* ignore */
    }
  }, [loaded, volume]);

  // state -> audio graph
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const name of SOUND_NAMES) {
      const entry = entries.current[name];
      if (enabled[name]) {
        const target = level(name, volume[name]);
        if (!entry) {
          bufsRef.current ??= {
            white: makeNoise(ctx, "white"),
            pink: makeNoise(ctx, "pink"),
            brown: makeNoise(ctx, "brown"),
          };
          const gain = ctx.createGain();
          gain.gain.value = 0;
          gain.connect(ctx.destination);
          const voice = BUILDERS[name](ctx, gain, bufsRef.current);
          gain.gain.setTargetAtTime(target, ctx.currentTime, 0.5); // slow fade-in
          entries.current[name] = { gain, voice };
        } else {
          if (entry.kill) {
            clearTimeout(entry.kill);
            entry.kill = undefined;
          }
          entry.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
        }
      } else if (entry && !entry.kill) {
        entry.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); // fade out, then free everything
        entry.kill = setTimeout(() => {
          entry.voice.stop();
          entry.gain.disconnect();
          delete entries.current[name];
        }, 1200);
      }
    }
  }, [enabled, volume]);

  useEffect(
    () => () => {
      for (const e of Object.values(entries.current)) {
        if (!e) continue;
        if (e.kill) clearTimeout(e.kill);
        e.voice.stop();
        e.gain.disconnect();
      }
      entries.current = {};
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  const toggle = useCallback(
    (name: SoundName) => {
      unlock();
      setEnabled((e) => ({ ...e, [name]: !e[name] }));
    },
    [unlock],
  );

  const setVolume = useCallback((name: SoundName, v: number) => {
    setVolumeState((s) => ({ ...s, [name]: Math.min(100, Math.max(0, v)) }));
  }, []);

  const chime = useCallback(() => {
    try {
      const ctx = unlock();
      const g = ctx.createGain();
      g.gain.value = 0.55;
      g.connect(ctx.destination);
      playChime(ctx, g);
      setTimeout(() => g.disconnect(), 4000);
    } catch {
      /* audio not available */
    }
  }, [unlock]);

  return { enabled, volume, toggle, setVolume, unlock, chime };
}
