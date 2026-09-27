// Web Audio API Synthesizer for Danganronpa / Terminal Sound FX

let audioCtx = null;
let soundEnabled = true;
let alarmInterval = null;
let alarmOscillators = [];

function clearAlarmInternals() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  alarmOscillators.forEach(node => {
    try {
      node.stop();
      node.disconnect();
    } catch {}
  });
  alarmOscillators = [];
}

// Load sound preference from localStorage
try {
  const saved = localStorage.getItem('shinri_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
} catch {
  soundEnabled = true;
}

function getAudioContext() {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const SoundFX = {
  isEnabled() {
    return soundEnabled;
  },

  setEnabled(val) {
    soundEnabled = val;
    if (!val) {
      clearAlarmInternals();
    }
    try {
      localStorage.setItem('shinri_sound_enabled', String(val));
    } catch {}
  },

  playClick() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  },

  playAccessGranted() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.22);
      });
    } catch {}
  },

  playAccessDenied() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [140, 130].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        gain.gain.setValueAtTime(0.12, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.35);
      });
    } catch {}
  },

  playRecoveryStep() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  },

  // Dramatic Danganronpa "BREAK!" / Glass shatter / Climax impact
  playTruthBreak() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Sub-bass hit & drop
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.85);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.45);

      // Cyber chord triumphant fanfare
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.05);
        osc.stop(now + 1.65);
      });

      // Noise burst for glass fracture and shard explosion
      const bufferSize = Math.floor(ctx.sampleRate * 0.55);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3200;
      noiseFilter.Q.value = 0.8;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  },

  playRevolverSpin() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.035, 0.07].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1100 - idx * 120, now + delay);
        osc.frequency.exponentialRampToValueAtTime(280, now + delay + 0.025);
        gain.gain.setValueAtTime(0.08, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.028);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.032);
      });
    } catch {}
  },

  playCylinderRotate() {
    this.playRevolverSpin();
  },

  playLockOn() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // High-tech targeting lock tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.065);

      // Secondary confirm pip
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2800, now + 0.04);
      gain2.gain.setValueAtTime(0.06, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.085);
    } catch {}
  },

  playReticleLock() {
    this.playLockOn();
  },

  playGunshot() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. Sharp high-energy crack noise
      const bufSize = Math.floor(ctx.sampleRate * 0.09);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 2600;
      noiseFilter.Q.value = 1.2;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // 2. Punchy laser punch drop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    } catch {}
  },

  playBulletFire() {
    this.playGunshot();
  },

  playRicochet() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Dissonant metallic deflection ping with pitch flutter
      [680, 840, 1120].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.16);
        gain.gain.setValueAtTime(0.08 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      });
    } catch {}
  },

  playDeflect() {
    this.playRicochet();
  },

  playLetterSelect() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  },

  // Monokuma's alert: Ding-dong-dang-dong chime followed by two-tone emergency warning siren klaxon
  playMonokumaAlarm() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    clearAlarmInternals();

    const now = ctx.currentTime;

    // 1. School broadcast chime melody: G4 -> B4 -> A4 -> D4
    const chimes = [
      { freq: 392.00, delay: 0 },
      { freq: 493.88, delay: 0.32 },
      { freq: 440.00, delay: 0.64 },
      { freq: 293.66, delay: 0.96 }
    ];

    chimes.forEach(({ freq, delay }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.6);
        alarmOscillators.push(osc);

        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(freq * 2, now + delay);
        harmGain.gain.setValueAtTime(0.04, now + delay);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
        harm.connect(harmGain);
        harmGain.connect(ctx.destination);
        harm.start(now + delay);
        harm.stop(now + delay + 0.4);
        alarmOscillators.push(harm);
      } catch {}
    });

    // 2. Urgent alternating two-tone emergency warning siren klaxon (880Hz / 659Hz)
    const sirenStartTime = now + 1.45;
    let high = true;

    const playSirenPulse = (scheduledTime) => {
      if (!soundEnabled) {
        clearAlarmInternals();
        return;
      }
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const targetFreq = high ? 880 : 659.25;
        osc.frequency.setValueAtTime(targetFreq, scheduledTime);
        osc.frequency.exponentialRampToValueAtTime(targetFreq * 0.96, scheduledTime + 0.28);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, scheduledTime);
        filter.Q.value = 2.0;

        gain.gain.setValueAtTime(0.10, scheduledTime);
        gain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + 0.32);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(scheduledTime);
        osc.stop(scheduledTime + 0.34);
        alarmOscillators.push(osc);

        if (alarmOscillators.length > 25) {
          alarmOscillators = alarmOscillators.slice(-10);
        }

        high = !high;
      } catch {}
    };

    playSirenPulse(sirenStartTime);
    playSirenPulse(sirenStartTime + 0.35);
    playSirenPulse(sirenStartTime + 0.70);
    playSirenPulse(sirenStartTime + 1.05);

    let cycleCount = 0;
    const intervalMs = 350;
    const initialDelayMs = 1450 + 4 * 350;

    const startTimer = setTimeout(() => {
      alarmInterval = setInterval(() => {
        if (!soundEnabled) {
          clearAlarmInternals();
          return;
        }
        playSirenPulse(ctx.currentTime);
        cycleCount++;
        if (cycleCount > 20) {
          clearAlarmInternals();
        }
      }, intervalMs);
    }, initialDelayMs);

    alarmOscillators.push({
      stop: () => clearTimeout(startTimer),
      disconnect: () => {}
    });
  },

  stopMonokumaAlarm() {
    clearAlarmInternals();
  }
};
