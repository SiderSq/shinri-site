import React, { useState } from 'react';
import { HelpCircle, ArrowRight, LoaderCircle, AlertCircle } from 'lucide-react';
import { SoundFX } from '../SoundFX';
export default function PuzzleFrame({ visual, controls, proof, onSubmit, busy, feedback, hint, instruction, submitLabel = 'Проверить заключение' }) {
  const [hintOpen, setHintOpen] = useState(false);
  return <form aria-describedby={feedback ? 'lab-feedback' : undefined} className="instrument-form" onSubmit={e => { e.preventDefault(); if (!busy) onSubmit(proof); }}>
    <p className="instrument-instruction">{instruction}</p>
    <fieldset disabled={busy} className="instrument-layout">
      <section className={`instrument-scene ${feedback && !feedback.success ? 'scene-review' : ''}`}>{visual}</section>
      <aside className="instrument-controls">{controls}</aside>
    </fieldset>
    {feedback && <div id="lab-feedback" className={`instrument-feedback ${feedback.success ? 'is-success' : 'is-warning'}`} role={feedback.success ? 'status' : 'alert'}><AlertCircle size={20} aria-hidden="true" /><span>{feedback.message}</span></div>}
    <footer className="instrument-actions"><button type="submit" className="lab-primary" disabled={busy}>{busy ? <LoaderCircle className="spin-once" size={18} /> : <ArrowRight size={18} />}<span>{busy ? 'Проверка на сервере…' : submitLabel}</span></button><button className="lab-secondary" type="button" aria-expanded={hintOpen} onClick={() => { setHintOpen(!hintOpen); SoundFX.playClick(); }}><HelpCircle size={18} />{hintOpen ? 'Скрыть подсказку' : 'Подсказка'}</button></footer>
    {hintOpen && <div className="instrument-hint">{hint}</div>}
  </form>;
}
