import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, Monitor, User, X, Check } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function Header({ state, clientIp, soundOn, setSoundOn, crtOn, setCrtOn, studentName = '', onStudentNameChange }) {
  const [currentTime, setCurrentTime] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const [volume, setVolume] = useState(SoundFX.getVolume());
  const dialog = useRef(null);
  const nameTrigger = useRef(null);
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('ru-RU'));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (nameOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [nameOpen]);
  const closeName = () => { setNameOpen(false); nameTrigger.current?.focus(); };
  const saveName = () => {
    onStudentNameChange?.(tempName.trim()); SoundFX.playAccessGranted(); closeName();
  };
  const toggleSound = () => {
    const next = !soundOn; SoundFX.setEnabled(next); setSoundOn(next);
    if (next) SoundFX.playClick();
  };
  const toggleCrt = () => {
    const next = !crtOn; setCrtOn(next); SoundFX.playClick();
    try { localStorage.setItem('shinri_crt_enabled', String(next)); } catch { /* Storage optional. */ }
  };
  return (
    <header className="terminal-header">
      <div className="terminal-header-inner">
        <div className="terminal-identity">
          <span className="terminal-wordmark">SHINRI<span>TRIAL</span></span>
          <span className="terminal-node font-mono">04-271</span>
          <button ref={nameTrigger} type="button" className="terminal-user" aria-label={studentName ? `Изменить имя: ${studentName}` : 'Указать имя участника'} onClick={() => { setTempName(studentName); setNameOpen(true); SoundFX.playClick(); }}>
            <User size={18} aria-hidden="true" /> <span>{studentName || 'Участник'}</span>
          </button>
        </div>
        <div className="terminal-case" role="status">
          <span className={state === 'SOLVED' ? 'status-dot status-dot-success' : 'status-dot'} aria-hidden="true" />
          {state === 'SOLVED' ? 'Дело раскрыто' : 'Дело №0271'}
          <time className="terminal-clock font-mono">{currentTime}</time>
          <span className="terminal-ip font-mono">Узел {clientIp || '127.0.0.1'}</span>
        </div>
        <div className="terminal-controls">
          <button type="button" className="terminal-icon-button" aria-label="Звук терминала" aria-pressed={soundOn} title={soundOn ? 'Выключить звук' : 'Включить звук'} onClick={toggleSound}>
            {soundOn ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
          </button>
          <label className="volume-control">
            <span>Громкость</span>
            <input type="range" min="0" max="100" step="5" value={Math.round(volume * 100)} aria-valuetext={`${Math.round(volume * 100)} процентов`} onChange={(e) => { const next = Number(e.target.value) / 100; setVolume(next); SoundFX.setVolume(next); }} onPointerUp={() => SoundFX.playClick()} onKeyUp={(e) => { if (e.key.startsWith('Arrow')) SoundFX.playClick(); }} />
          </label>
          <button type="button" className="terminal-icon-button" aria-label="Эффект ЭЛТ-монитора" aria-pressed={crtOn} onClick={toggleCrt}>
            <Monitor size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
      {nameOpen && createPortal(
        <dialog ref={dialog} className="student-dialog" aria-labelledby="student-dialog-title" onCancel={closeName} onClose={closeName} onClick={(e) => { if (e.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeName(); } }}>
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }}>
            <div className="student-dialog-heading"><h2 id="student-dialog-title">Участник расследования</h2><button type="button" className="terminal-icon-button" aria-label="Закрыть окно имени" onClick={closeName}><X size={20} /></button></div>
            <label htmlFor="student-name">Имя персонажа или игровой никнейм</label>
            <input id="student-name" className="dr-input" type="text" value={tempName} maxLength={50} autoFocus onChange={(e) => setTempName(e.target.value)} />
            <div className="student-dialog-actions"><button type="button" className="dr-btn" onClick={closeName}>Отмена</button><button type="submit" className="dr-btn dr-btn-cyan"><Check size={17} aria-hidden="true" />Сохранить</button></div>
          </form>
        </dialog>, document.body
      )}
    </header>
  );
}
