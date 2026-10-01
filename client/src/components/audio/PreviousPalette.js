// Previous merged palette, kept only for explicit A/B preview. No autoplay.
export const SOUND_NAMES = ['click', 'navigate', 'rotate', 'scan', 'adjust', 'granted', 'denied', 'recovery', 'truth', 'spin', 'lock', 'fire', 'ricochet', 'letter', 'alarm'];
const pitchSets = {
  click: [330, 370, 392], navigate: [392, 440, 494], rotate: [220, 247, 262],
  scan: [440, 494, 523], adjust: [294, 330, 349], recovery: [330, 392, 440], letter: [392, 440, 494],
};

// Exported for offline rendering/tests; all effects share gentle attack/release envelopes.
export function renderSound(ctx, destination, name, variant = 0, time = ctx.currentTime) {
  const sources = [];
  const tone = (freq, offset = 0, duration = 0.12, level = 0.045, type = 'sine', endFreq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = time + offset;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration * 0.8);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.gain.linearRampToValueAtTime(0, start + duration + 0.015);
    osc.connect(gain); gain.connect(destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(start); osc.stop(start + duration + 0.02);
    sources.push(osc);
  };
  const noise = (offset, duration, level, frequency) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.5;
    const gain = ctx.createGain(); const start = time + offset;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(start); source.stop(start + duration + 0.02); sources.push(source);
  };
  if (pitchSets[name]) {
    const choices = pitchSets[name]; const freq = choices[Math.abs(variant) % choices.length];
    tone(freq, 0, name === 'scan' ? 0.24 : 0.095, 0.035, name === 'rotate' ? 'triangle' : 'sine', freq * 0.92);
    if (name === 'navigate' || name === 'scan') tone(freq * 1.5, 0.045, 0.13, 0.016);
  } else if (name === 'granted') {
    [330, 440, 554.37].forEach((f, i) => tone(f, i * 0.09, 0.3, 0.048));
  } else if (name === 'denied') {
    // Directional descending phrase, not a harsh buzzer.
    tone(294, 0, 0.2, 0.05, 'triangle'); tone(247, 0.1, 0.24, 0.04);
  } else if (name === 'truth') {
    tone(110, 0, 0.6, 0.095, 'sine', 65);
    noise(0.035, 0.24, 0.035, 1800);
    [330, 440, 554.37, 659.25].forEach((f, i) => tone(f, 0.08 + i * 0.055, 0.85, 0.036));
  } else if (name === 'spin') {
    [0, 0.04, 0.08].forEach((d, i) => tone(330 + i * 55, d, 0.05, 0.025, 'triangle', 220));
  } else if (name === 'lock') {
    tone(659.25, 0, 0.12, 0.03); tone(880, 0.06, 0.16, 0.025);
  } else if (name === 'fire') {
    tone(330, 0, 0.19, 0.065, 'triangle', 82); noise(0, 0.085, 0.028, 1400);
  } else if (name === 'ricochet') {
    tone(554.37, 0, 0.17, 0.035); tone(440, 0.07, 0.22, 0.025);
  } else if (name === 'alarm') {
    // One brief school-broadcast chime, not a repeating siren.
    [392, 494, 440, 294].forEach((f, i) => {
      tone(f, i * 0.3, 0.48, 0.06); tone(f * 2, i * 0.3, 0.24, 0.012);
    });
  }
  return sources;
}

export function createSoundBus(context, volume = 0.5) {
  const master = context.createGain();
  const input = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  input.type = 'lowpass'; input.frequency.value = 2600; input.Q.value = 0.5;
  compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 5;
  compressor.attack.value = 0.006; compressor.release.value = 0.15;
  master.gain.value = Math.max(0, Math.min(1, volume));
  input.connect(compressor); compressor.connect(master); master.connect(context.destination);
  return { input, master };
}

