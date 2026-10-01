// Instrument-specific earcons. Text/visual feedback always carries the same meaning.
export const SOUND_NAMES = ['click','navigate','rotate','scan','adjust','granted','denied','recovery','truth','spin','lock','fire','ricochet','letter','alarm','connect','latch','compare','stage','analysis'];
export const SOUND_DESCRIPTIONS = {
  navigate: 'Короткий цифровой переход', rotate: 'Механическая трещотка', scan: 'Нарастающий скан и фиксация',
  latch: 'Щелчок и освобождение штифта', compare: 'Два тактильных отсчёта', stage: 'Подтверждение этапа',
  analysis: 'Заключение прибора', denied: 'Приглушённый нисходящий удар', truth: 'Раскрытие истины',
};
export function renderSound(ctx, destination, name, variant = 0, time = ctx.currentTime, params = {}) {
  const sources = [];
  const v = Math.abs(variant) % 3;
  const tone = (frequency, offset, duration, gain, type = 'sine', endFrequency, cutoff = 5000) => {
    const source = ctx.createOscillator(), envelope = ctx.createGain(), filter = ctx.createBiquadFilter();
    const start = time + offset;
    source.type = type; source.frequency.setValueAtTime(frequency, start);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * .75);
    filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = .5;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(.008, duration / 6));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    envelope.gain.linearRampToValueAtTime(0, start + duration + .015);
    source.connect(filter); filter.connect(envelope); envelope.connect(destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(start); source.stop(start + duration + .02); sources.push(source);
  };
  const texture = (offset, duration, level, frequency, quality = .8, seed = 71) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0); let state = seed + v * 131;
    for (let i = 0; i < data.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; data[i] = state / 2147483648 - 1; }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = quality;
    const start = time + offset; envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(level, start + Math.min(.006, duration / 6)); envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(start); source.stop(start + duration + .02); sources.push(source);
  };
  const chord = (frequencies, offset = 0, duration = .6, gain = .06) => frequencies.forEach((f, i) => { tone(f, offset + i * .035, duration, gain, 'triangle', undefined, 2800); tone(f * 2, offset + i * .035, duration * .6, gain * .12); });
  if (name === 'click') {
    texture(0, .032, .12, 1300 + v * 120, .8); tone(480 + v * 35, 0, .045, .06, 'triangle', 310);
  } else if (name === 'navigate') {
    tone(370 + v * 20, 0, .11, .08, 'triangle', 740 + v * 40); tone(988, .055, .1, .032); texture(0, .06, .025, 2700);
  } else if (name === 'rotate' || name === 'spin') {
    [0, .022, .05].forEach((d, i) => texture(d, .026, .12 / (i + 1), 850 + i * 350 + v * 80, .7, 311 + i));
    tone(165 + v * 12, 0, .085, .075, 'triangle', 85); tone(780, .04, .055, .02);
  } else if (name === 'scan' || name === 'recovery') {
    const d = name === 'scan' ? .46 : .18;
    tone(220 + v * 25, 0, d, .075, 'triangle', 1100, 2400); texture(.02, d, .055, 1200, .4, 431);
    tone(1318.5, d, .13, .04); tone(1760, d + .045, .13, .018);
  } else if (name === 'adjust') {
    const normalized = Number.isFinite(params.value) ? Math.max(0, Math.min(100, params.value)) / 100 : .5;
    tone(180 + normalized * 320, 0, .055, .04, 'triangle'); texture(0, .018, .05, 650 + normalized * 600);
  } else if (name === 'latch') {
    texture(0, .07, .16, 600, .6, 83); tone(190, 0, .13, .1, 'triangle', 110);
    texture(.11, .05, .1, 1900, 1.2, 193); tone(880, .115, .12, .035);
  } else if (name === 'compare') {
    texture(0, .035, .07, 1000, 1.1); texture(.12, .04, .07, 1600, 1.1); tone(440, .12, .16, .065);
  } else if (name === 'connect' || name === 'lock') {
    tone(440, 0, .13, .07); tone(880, .06, .22, .05); texture(.03, .04, .04, 2000);
  } else if (name === 'letter') {
    tone([494, 554, 659][v], 0, .15, .08); texture(0, .025, .05, 1400);
  } else if (name === 'granted' || name === 'stage') {
    [440, 554.37, 659.25].forEach((f, i) => tone(f, i * .085, .3, .07, 'triangle', undefined, 2200));
    texture(.03, .09, .025, 2100);
  } else if (name === 'analysis') {
    tone(220, 0, .55, .1); chord([440, 554.37, 659.25], .07, .8, .065);
    [1318.5, 1760].forEach((f, i) => tone(f, .38 + i * .08, .45, .035)); texture(.03, .16, .035, 2700);
  } else if (name === 'denied' || name === 'ricochet') {
    texture(0, .09, .15, 260, .6, 751); tone(220, 0, .22, .1, 'triangle', 146.8, 950); tone(146.8, .12, .19, .055);
  } else if (name === 'fire') {
    texture(0, .11, .22, 1500, .5); tone(260, 0, .25, .13, 'triangle', 65, 1800);
  } else if (name === 'truth') {
    tone(100, 0, .8, .32, 'sine', 40); texture(.025, .2, .13, 2100, .4, 903);
    chord([220, 330, 440, 554.37, 659.25], .1, 1.4, .07);
    [1318.5, 1760, 2093].forEach((f, i) => tone(f, .48 + i * .065, .7, .035));
  } else if (name === 'alarm') {
    [392, 494, 440, 294].forEach((f, i) => { tone(f, i * .27, .5, .09); tone(f * 2.76, i * .27, .2, .02); });
  }
  return sources;
}
export function createSoundBus(context, volume = .6) {
  const input = context.createBiquadFilter(), highpass = context.createBiquadFilter(), compressor = context.createDynamicsCompressor(), master = context.createGain();
  input.type = 'lowpass'; input.frequency.value = 6200; input.Q.value = .5;
  highpass.type = 'highpass'; highpass.frequency.value = 30; highpass.Q.value = .5;
  compressor.threshold.value = -16; compressor.knee.value = 14; compressor.ratio.value = 6; compressor.attack.value = .004; compressor.release.value = .18;
  master.gain.value = Math.max(0, Math.min(1, volume));
  input.connect(highpass); highpass.connect(compressor); compressor.connect(master); master.connect(context.destination);
  return { input, master, dispose: () => [input, highpass, compressor, master].forEach(node => node.disconnect()) };
}
let ctx, master, filter;
let enabled = true, volume = 0.6;
const active = new Set();
const alarms = new Set();
const lastPlayed = new Map();
const variations = new Map();
try {
  const saved = localStorage.getItem('shinri_sound_enabled');
  if (saved !== null) enabled = saved === 'true';
  const savedVolume = localStorage.getItem('shinri_sound_volume');
  if (savedVolume !== null && Number.isFinite(Number(savedVolume))) volume = Math.max(0, Math.min(1, Number(savedVolume)));
} catch { /* Storage is optional. */ }
const persist = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* Private browsing. */ } };
function stopSources(set) {
  for (const source of set) { try { source.stop(); } catch { /* Already ended. */ } }
  set.clear();
}
function context() {
  if (!enabled || typeof window === 'undefined' || document.hidden) return null;
  if (!ctx) {
    // Do not create audio from timer-driven effects before a user's first gesture.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try {
      ctx = new Audio();
      const bus = createSoundBus(ctx, volume); master = bus.master; filter = bus.input;
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function play(name, value) {
  const audio = context(); if (!audio || !volume) return;
  const now = performance.now();
  const quiet = ['click', 'navigate', 'rotate', 'scan', 'adjust', 'recovery', 'letter', 'spin', 'lock'].includes(name);
  const key = quiet ? 'interaction' : name;
  const cooldown = name === 'alarm' ? 5000 : quiet ? 65 : name === 'truth' ? 1800 : 300;
  if (now - (lastPlayed.get(key) ?? -Infinity) < cooldown) return;
  // Bounded polyphony prevents sliders/rapid taps from producing a noisy pile-up.
  if (active.size > 18) return;
  lastPlayed.set(key, now);
  const variant = variations.get(name) ?? 0; variations.set(name, variant + 1);
  try {
    const sources = renderSound(audio, filter, name, variant, audio.currentTime, { value });
    for (const source of sources) {
      active.add(source); if (name === 'alarm') alarms.add(source);
      const cleanup = source.onended;
      source.onended = () => { cleanup?.(); active.delete(source); alarms.delete(source); };
    }
  } catch { /* Audio must never interrupt the investigation. */ }
}
export const SoundFX = {
  isEnabled: () => enabled,
  getVolume: () => volume,
  setEnabled(value) {
    enabled = Boolean(value); persist('shinri_sound_enabled', enabled);
    if (!enabled) { stopSources(active); alarms.clear(); }
    if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.015); }
  },
  setVolume(value) {
    if (!Number.isFinite(Number(value))) return;
    volume = Math.max(0, Math.min(1, Number(value))); persist('shinri_sound_volume', volume);
    if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.015); }
  },
  playConnect: () => play('connect'), playLatch: () => play('latch'), playCompare: () => play('compare'),
  playStageComplete: () => play('stage'), playAnalysisComplete: () => play('analysis'),
  preview: name => { if (SOUND_NAMES.includes(name)) play(name); },
  playClick: () => play('click'), playNavigate: () => play('navigate'), playRotate: () => play('rotate'),
  playScan: () => play('scan'), playAdjust: value => play('adjust', value),
  playAccessGranted: () => play('granted'), playAccessDenied: () => play('denied'),
  playRecoveryStep: () => play('recovery'), playTruthBreak: () => play('truth'),
  playRevolverSpin: () => play('spin'), playCylinderRotate: () => play('spin'),
  playLockOn: () => play('lock'), playReticleLock: () => play('lock'),
  playGunshot: () => play('fire'), playBulletFire: () => play('fire'),
  playRicochet: () => play('ricochet'), playDeflect: () => play('ricochet'),
  playLetterSelect: () => play('letter'), playMonokumaAlarm: () => play('alarm'),
  stopMonokumaAlarm() { stopSources(alarms); },
};
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopSources(active); alarms.clear(); }
  });
}
