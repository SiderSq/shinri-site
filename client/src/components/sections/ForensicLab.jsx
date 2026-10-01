import React, { useCallback, useEffect, useState } from 'react';
import { CircuitBoard, ScanLine, History, ShieldCheck, Microscope, ArrowRight, Check, RefreshCw, Volume2 } from 'lucide-react';
import { SoundFX } from '../SoundFX';
import { PUZZLES } from '../lab/registry';
import '../lab/workstation.css';
const META = [
  { id: 'circuit', name: 'Электроцепь', icon: CircuitBoard, note: 'Стыки, нагрузка и повреждённые ветви' },
  { id: 'uv', name: 'Спектрометр', icon: ScanLine, note: 'Реакция, калибровка и ложные сигналы' },
  { id: 'timeline', name: 'Хронология', icon: History, note: 'Причинные связи и разные часы' },
  { id: 'trap', name: 'Механизм', icon: ShieldCheck, note: 'Предохранитель и баланс нагрузки' },
  { id: 'workbench', name: 'Микрорельеф', icon: Microscope, note: 'Совмещение и два участка образца' },
];
function mirrorProgress(data) {
  try {
    localStorage.setItem('shinri_solved_puzzles', JSON.stringify(Object.fromEntries(META.map(g => [g.id, data.progress[g.id] === 3]))));
    localStorage.setItem('shinri_lab_letters', JSON.stringify(data.letters));
    window.dispatchEvent(new Event('shinri:lab-updated'));
  } catch { /* The server, not localStorage, owns progress. */ }
}
export default function ForensicLab({ onNavigateToReconstruction }) {
  const [data, setData] = useState(null), [active, setActive] = useState('circuit'), [feedback, setFeedback] = useState(null), [loadError, setLoadError] = useState(''), [busy, setBusy] = useState(false), [retryUntil, setRetryUntil] = useState(0), [now, setNow] = useState(Date.now);
  const load = useCallback(async (signal) => {
    try { const response = await fetch('/api/investigation/lab/workstation', { signal }); const next = await response.json(); if (!response.ok) throw new Error(next.error || 'Не удалось загрузить приборы.'); setLoadError(''); setData(next); mirrorProgress(next); }
    catch (e) { if (e.name !== 'AbortError') setLoadError(e.message); }
  }, []);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { if (!retryUntil) return; const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, [retryUntil]);
  const choose = id => { setActive(id); setFeedback(null); SoundFX.playNavigate(); };
  const submit = async proof => {
    if (!data || busy || Date.now() < retryUntil) return;
    setBusy(true); setFeedback(null);
    try {
      const ch = data.games.find(g => g.gameId === active);
      const response = await fetch('/api/investigation/lab/submit-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: active, stage: ch.stage, version: data.version, proof }) });
      const next = await response.json();
      if (!response.ok) {
        setFeedback({ success: false, message: next.message || next.error || 'Проверка не завершена.' }); SoundFX.playAccessDenied();
        if (response.status === 429) { const until = Date.now() + (next.retryAfter || 1) * 1000; setNow(Date.now()); setRetryUntil(until); }
        if (response.status === 409) await load();
        return;
      }
      setData(next); mirrorProgress(next);
      setFeedback({ success: true, message: next.completedGame ? 'Три этапа подтверждены. Фрагмент имени добавлен в протокол.' : 'Этап подтверждён. Прибор подготовлен к следующей задаче.' });
      if (next.completedGame) SoundFX.playAnalysisComplete(); else SoundFX.playStageComplete();
    } catch { setFeedback({ success: false, message: 'Связь с сервером потеряна. Настройки сохранены на экране — повторите проверку.' }); }
    finally { setBusy(false); }
  };
  if (!data) return <section className="lab-v2 lab-loading"><h2>Лаборатория следствия</h2><p role="status">{loadError || 'Подготовка приборов…'}</p>{loadError && <button className="lab-secondary" onClick={() => load()}><RefreshCw size={18} />Повторить загрузку</button>}</section>;
  const meta = META.find(g => g.id === active), ch = data.games.find(g => g.gameId === active), Puzzle = PUZZLES[active];
  const complete = META.filter(g => data.progress[g.id] === 3).length, completed = data.progress[active] === 3;
  const remaining = Math.max(0, Math.ceil((retryUntil - now) / 1000));
  return <section className="lab-v2">
    <header className="lab-header"><div><h2>Лаборатория следствия</h2><p>Пять приборов. Пятнадцать проверок. Один доказательный путь.</p></div><div className="lab-total"><strong className="font-mono">{complete}<span>/5</span></strong><span>заключений</span></div></header>
    <div className="lab-workstation">
      <nav className="lab-rail" aria-label="Лабораторные анализы">{META.map(g => { const Icon = g.icon; return <button type="button" key={g.id} aria-current={active === g.id ? 'page' : undefined} onClick={() => choose(g.id)}><Icon size={21} aria-hidden="true" /><span><strong>{g.name}</strong><small>{g.note}</small><span className="rail-progress" aria-label={`${data.progress[g.id]} из 3 этапов`}>{[0,1,2].map(i => <i key={i} className={data.progress[g.id] > i ? 'filled' : ''} />)}</span></span>{data.progress[g.id] === 3 && <Check size={18} className="rail-check" />}</button>; })}</nav>
      <div className="lab-mobile-selector"><label htmlFor="lab-analysis">Прибор</label><select id="lab-analysis" value={active} onChange={e => choose(e.target.value)}>{META.map(g => <option key={g.id} value={g.id}>{g.name} — {data.progress[g.id]}/3</option>)}</select></div>
      <div className="lab-bench">
        <header className="lab-task-header"><div><span className="task-stage">{completed ? 'Заключение готово' : `Этап ${ch.stage + 1} из 3`}</span><h3>{meta.name}: {ch.stageName.toLowerCase()}</h3></div><ol className="stage-track" aria-label="Последовательность сложности">{['Освоение','Помехи','Экспертиза'].map((s,i) => <li key={s} className={completed || i < ch.stage ? 'stage-done' : i === ch.stage ? 'stage-current' : ''}><span>{i + 1}</span>{s}</li>)}</ol></header>
        {completed ? <div className="lab-certificate"><ShieldCheck size={48} /><h4>Заключение подтверждено</h4><p>Вы освоили прибор, учли помехи и прошли комплексную проверку.</p><div className="certificate-fragment"><span>Фрагмент имени</span><strong className="font-mono">{data.letters[active] || '—'}</strong></div><button className="lab-primary" onClick={() => { const next = META.find(g => data.progress[g.id] < 3); if (next) choose(next.id); else onNavigateToReconstruction?.(); }}><ArrowRight size={18} />{complete === 5 ? 'Перейти к вердикту' : 'Следующий анализ'}</button></div> : <Puzzle key={`${data.version}:${active}:${ch.stage}`} challenge={ch} onSubmit={submit} busy={busy || remaining > 0} feedback={feedback} />}
        {completed && feedback && <p className="sr-only" role="status">{feedback.message}</p>}
        {remaining > 0 && <p className="lab-retry" role="status">Следующая проверка через {remaining} с.</p>}
        <p className="lab-model-note">{ch.model} Изменения касаются приборных заданий; материалы дела не переписаны.</p>
      </div>
    </div>
    <footer className="lab-footer"><div><span>Протокол заключений</span><div className="lab-fragments">{META.map(g => <span key={g.id} aria-label={`${g.name}: ${data.letters[g.id] || 'не подтверждено'}`}>{data.letters[g.id] || '—'}</span>)}</div></div><a href="/audio-preview" className="lab-audio-link"><Volume2 size={18} />Сравнить звук: до / после</a>{complete === 5 && <button className="lab-primary" onClick={onNavigateToReconstruction}>Собрать вердикт<ArrowRight size={18} /></button>}</footer>
  </section>;
}
