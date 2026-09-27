import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, Monitor, Clock, User, X, Check } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function Header({
  state,
  clientIp,
  soundOn,
  setSoundOn,
  crtOn,
  setCrtOn,
  studentName = '',
  onStudentNameChange
}) {
  const [currentTime, setCurrentTime] = useState('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempName, setTempName] = useState(studentName);

  useEffect(() => {
    setTempName(studentName);
  }, [studentName]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    SoundFX.setEnabled(nextVal);
    setSoundOn(nextVal);
    if (nextVal) {
      SoundFX.playClick();
    }
  };

  const handleToggleCrt = () => {
    if (soundOn) SoundFX.playClick();
    setCrtOn(!crtOn);
  };

  const handleSaveName = (nameToSave) => {
    const clean = (nameToSave !== undefined ? nameToSave : tempName).trim();
    if (soundOn) SoundFX.playClick();
    if (onStudentNameChange) {
      onStudentNameChange(clean);
    }
    setIsNameModalOpen(false);
  };

  return (
    <header className="border-b border-[#222942] bg-[#090b12]/95 backdrop-blur-md px-4 py-2.5 sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Branding & In-Universe Node Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff2a85] animate-ping" />
            <span className="font-cyber font-bold tracking-wider text-white text-sm">
              SHINRI<span className="text-[#ff2a85]">TRIAL</span>
            </span>
          </div>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="font-mono text-gray-400 hidden sm:inline">
            NODE <span className="text-[#00f3ff]">04-271</span>
          </span>
          <span className="text-gray-600 hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1.5 text-gray-400 font-mono">
            <span className="text-xs text-gray-500">КУРАТОР:</span>
            <span className="text-[#00ff88] font-semibold">Н. КОМАЭДА</span>
          </div>
          <span className="text-gray-600 hidden sm:inline">|</span>
          {/* Active Student Badge */}
          <button
            onClick={() => {
              if (soundOn) SoundFX.playClick();
              setTempName(studentName);
              setIsNameModalOpen(true);
            }}
            title="Указать или изменить имя ученика / детективный никнейм"
            className="flex items-center gap-1.5 font-mono px-2 py-0.5 rounded border transition-all hover:border-[#00f3ff] text-xs bg-[#0e1424] border-[#1f2b47]"
          >
            <User size={13} className="text-[#00f3ff]" />
            <span className="text-gray-400 text-[11px]">УЧЕНИК:</span>
            {studentName ? (
              <span className="text-[#00ff88] font-bold truncate max-w-[120px] sm:max-w-[160px]">
                {studentName}
              </span>
            ) : (
              <span className="text-yellow-400/90 underline decoration-dashed text-[11px]">
                Ввести имя
              </span>
            )}
          </button>
        </div>

        {/* Center: System Status & Time */}
        <div className="flex items-center gap-3 font-mono text-gray-400">

          {/* Real-time local clock */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#0e1322] px-2.5 py-1 rounded border border-[#1e263d]">
            <span className="text-gray-500">ВРЕМЯ:</span>
            <span className="text-gray-200 tracking-wider font-semibold">{currentTime}</span>
          </div>

          {/* Node IP */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#0e1322] px-2.5 py-1 rounded border border-[#1e263d]">
            <span className="text-gray-500">УЗЕЛ IP:</span>
            <span className="text-[#00f3ff] font-semibold">{clientIp || '127.0.0.1'}</span>
          </div>

          {/* Solved / Active Case Badge */}
          {state === 'SOLVED' ? (
            <span className="bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-2.5 py-1 font-bold tracking-wide rounded-sm animate-pulse">
              ДЕЛО РАСКРЫТО
            </span>
          ) : (
            <span className="bg-[#ff2a85]/15 border border-[#ff2a85]/50 text-[#ff2a85] px-2.5 py-1 tracking-wide rounded-sm">
              АКТИВНОЕ ДЕЛО №0271
            </span>
          )}
        </div>

        {/* Right: Sound & CRT Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'Выключить звук терминала' : 'Включить звук терминала'}
            className={`p-1.5 rounded border transition-all ${
              soundOn
                ? 'bg-[#151c30] border-[#00f3ff] text-[#00f3ff]'
                : 'bg-[#101422] border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* CRT Toggle */}
          <button
            onClick={handleToggleCrt}
            title="Эффект ЭЛТ-монитора"
            className={`p-1.5 rounded border transition-all ${
              crtOn
                ? 'bg-[#151c30] border-[#ff2a85] text-[#ff2a85]'
                : 'bg-[#101422] border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Monitor size={15} />
          </button>
        </div>

      </div>

      {/* Student Name Modal Overlay - rendered via Portal directly to body to avoid header backdrop-filter clipping */}
      {isNameModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNameModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-[#0a0f1d] border-2 border-[#00f3ff] rounded-lg p-6 shadow-[0_0_35px_rgba(0,243,255,0.25)] space-y-4 font-mono text-left relative">
            <div className="flex items-center justify-between border-b border-[#1b2640] pb-2.5">
              <div className="flex items-center gap-2 text-[#00f3ff] font-cyber font-bold text-sm">
                <User size={18} className="text-[#ff2a85]" />
                <span>ИДЕНТИФИКАЦИЯ УЧЕНИКА // СУДЕБНЫЙ ПРОТОКОЛ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNameModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Укажите имя персонажа или ваш Discord/RP никнейм для текущей судебной сессии:
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    setIsNameModalOpen(false);
                  }
                }}
                placeholder="Введите свое имя"
                className="w-full bg-[#05080f] border-2 border-[#1f2b47] focus:border-[#00f3ff] text-white px-3.5 py-2.5 rounded text-sm font-mono leading-normal outline-none transition-colors shadow-inner"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1b2640]">
              <div>
                {studentName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTempName('');
                      handleSaveName('');
                    }}
                    className="text-[11px] font-mono text-red-400/80 hover:text-red-300 hover:underline transition-colors"
                  >
                    Очистить имя
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-3.5 py-1.5 rounded bg-[#101422] border border-gray-700 text-gray-300 hover:text-white text-xs font-mono transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveName()}
                  className="dr-btn dr-btn-cyan px-4 py-1.5 text-xs font-cyber flex items-center gap-1.5 font-bold"
                >
                  <Check size={14} />
                  <span>СОХРАНИТЬ</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
