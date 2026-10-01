import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Volume2, ArrowLeft } from 'lucide-react';
import { renderSound, createSoundBus, SOUND_DESCRIPTIONS } from './SoundFX';
import { renderSound as renderPrevious, createSoundBus as previousBus } from './audio/PreviousPalette';
const cues = ['navigate','rotate','scan','latch','compare','stage','analysis','denied','truth'];
const oldNames = { latch: 'click', compare: 'click', stage: 'granted', analysis: 'granted' };
export default function AudioPreview() {
  const [cue, setCue] = useState('rotate'), [playing, setPlaying] = useState(false), [error, setError] = useState(''), [volume, setVolume] = useState(.6);
  const context = useRef(null), voices = useRef([]), playback = useRef(0);
  useEffect(() => () => { voices.current.forEach(s => { try { s.stop(); } catch { /* Ended. */ } }); context.current?.close(); }, []);
  const stop = () => { playback.current++; voices.current.forEach(s => { try { s.stop(); } catch { /* Ended. */ } }); voices.current = []; setPlaying(false); };
  const play = async (previous) => {
    stop(); setError(''); const token = ++playback.current;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Браузер не поддерживает Web Audio.');
      if (!context.current) context.current = new Audio();
      await context.current.resume();
      const bus = (previous ? previousBus : createSoundBus)(context.current, volume);
      const sources = (previous ? renderPrevious : renderSound)(context.current, bus.input, previous ? oldNames[cue] || cue : cue);
      let remaining = sources.length; voices.current = sources; setPlaying(true);
      sources.forEach(source => { const end = source.onended; source.onended = () => { end?.(); remaining--; if (!remaining) { bus.dispose?.(); bus.master.disconnect(); bus.input.disconnect(); if (playback.current === token) setPlaying(false); } }; });
    } catch (e) { setError(e.message); setPlaying(false); }
  };
  return <main className="shinri-shell audio-preview-page">
    <a className="audio-back" href="/"><ArrowLeft size={18} />Вернуться к терминалу</a>
    <header><span className="audio-preview-mark">Shinri / лаборатория звука</span><h1>Слышно, что произошло.</h1><p>Сравните предыдущую и новую версии на одном устройстве. Первые сигналы короткие; раскрытие дела звучит дольше. Запуск — только по нажатию.</p></header>
    <section className="audio-preview-controls">
      <label>Действие<select value={cue} onChange={e => { stop(); setCue(e.target.value); }}>{cues.map(name => <option key={name} value={name}>{SOUND_DESCRIPTIONS[name]}</option>)}</select></label>
      <label className="preview-volume"><Volume2 size={18} />Громкость {Math.round(volume * 100)}%<input type="range" min={0} max={100} step={5} value={volume * 100} onChange={e => setVolume(Number(e.target.value) / 100)} /></label>
      <div className="audio-ab-buttons"><button className="dr-btn" disabled={playing} onClick={() => play(true)}><Play size={18} />Предыдущая версия</button><button className="dr-btn dr-btn-cyan" disabled={playing} onClick={() => play(false)}><Play size={18} />Новая версия</button><button className="dr-btn" disabled={!playing} onClick={stop}><Square size={18} />Остановить</button></div>
      <p role="status">{error || (playing ? 'Воспроизведение…' : 'Выберите действие и версию.')}</p>
    </section>
    <p className="audio-preview-note">Это сравнение реальных рецептов Web Audio из проекта, а не отдельные подменённые демозаписи. У новых сигналов отличаются фактура, ритм и длительность; одинаковое положение громкости не означает одинаковую воспринимаемую громкость.</p>
  </main>;
}
