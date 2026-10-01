import React, { useState, useEffect, useRef } from 'react';
import { Trash2, CheckCircle2, Loader2, Target, ShieldAlert, Sparkles } from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function NameReconstruction({
  killerLength = 6,
  availableLetters = ['А', 'Б', 'Д', 'Е', 'И', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'],
  onSolveSuccess,
  onFailedSubmission
}) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [focusedLetterId, setFocusedLetterId] = useState(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  const [slots, setSlots] = useState(Array(killerLength).fill(''));
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Lab letters decoded via Forensic puzzles (dynamically from server / localStorage)
  const [labLetters, setLabLetters] = useState(() => {
    try {
      const savedLetters = localStorage.getItem('shinri_lab_letters');
      if (savedLetters) {
        const parsed = JSON.parse(savedLetters);
        const map = [];
        if (parsed.circuit) map[0] = parsed.circuit;
        if (parsed.uv) map[1] = parsed.uv;
        if (parsed.timeline) map[2] = parsed.timeline;
        if (parsed.trap) map[3] = parsed.trap;
        if (parsed.workbench) {
          const parts = String(parsed.workbench).split(/[\s&]+/);
          if (parts[0]) map[4] = parts[0];
          if (parts[1]) map[5] = parts[1];
        }
        return map;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Re-sync lab letters when window focuses or storage changes
  useEffect(() => {
    const handleSyncLetters = () => {
      try {
        const savedLetters = localStorage.getItem('shinri_lab_letters');
        if (savedLetters) {
          const parsed = JSON.parse(savedLetters);
          const map = [];
          if (parsed.circuit) map[0] = parsed.circuit;
          if (parsed.uv) map[1] = parsed.uv;
          if (parsed.timeline) map[2] = parsed.timeline;
          if (parsed.trap) map[3] = parsed.trap;
          if (parsed.workbench) {
            const parts = String(parsed.workbench).split(/[\s&]+/);
            if (parts[0]) map[4] = parts[0];
            if (parts[1]) map[5] = parts[1];
          }
          setLabLetters(map);
        }
      } catch {}
    };

    handleSyncLetters();
    window.addEventListener('focus', handleSyncLetters);
    window.addEventListener('storage', handleSyncLetters);
    return () => {
      window.removeEventListener('focus', handleSyncLetters);
      window.removeEventListener('storage', handleSyncLetters);
    };
  }, []);

  const handleApplyLabLetters = () => {
    SoundFX.playAccessGranted();
    const newSlots = [...slots];
    labLetters.forEach((char, idx) => {
      if (char && idx < newSlots.length) {
        newSlots[idx] = char;
      }
    });
    setSlots(newSlots);
  };

  // Hover & impact effects
  const [hoveredLetterId, setHoveredLetterId] = useState(null);
  const [impactEffect, setImpactEffect] = useState(null);

  // Initialize floating letters physics - continuous smooth drifting
  const [floatingLetters, setFloatingLetters] = useState(() => {
    return (availableLetters || []).map((char, index) => {
      const cols = 5;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const baseX = 12 + col * 18 + ((index % 3) * 3);
      const baseY = 18 + row * 26 + ((index % 2) * 4);
      const angle = (index * 47) % 360;
      const rad = (angle * Math.PI) / 180;
      const speed = 0.22 + (index % 4) * 0.06;

      return {
        id: `fl-${char}-${index}`,
        char,
        x: Math.min(88, Math.max(10, baseX)),
        y: Math.min(82, Math.max(14, baseY)),
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        rot: ((index * 13) % 20) - 10
      };
    });
  });

  // Re-sync slots when killerLength changes
  useEffect(() => {
    setSlots(Array(killerLength).fill(''));
  }, [killerLength]);

  // Re-sync floating letters when availableLetters updates
  useEffect(() => {
    setFloatingLetters((availableLetters || []).map((char, index) => {
      const cols = 5;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const baseX = 12 + col * 18 + ((index % 3) * 3);
      const baseY = 18 + row * 26 + ((index % 2) * 4);
      const angle = (index * 47) % 360;
      const rad = (angle * Math.PI) / 180;
      const speed = 0.22 + (index % 4) * 0.06;

      return {
        id: `fl-${char}-${index}`,
        char,
        x: Math.min(88, Math.max(10, baseX)),
        y: Math.min(82, Math.max(14, baseY)),
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        rot: ((index * 13) % 20) - 10
      };
    }));
  }, [availableLetters]);

  // Retain the kinetic arena, but respect OS preferences and pause focused letters.
  const animFrameRef = useRef(null);
  useEffect(() => {
    if (reducedMotion) return;
    const updatePhysics = () => {
      setFloatingLetters(prev => prev.map(item => {
        // Slow down slightly on hover for precise aim, but keep subtle drift
        const speed = focusedLetterId === item.id ? 0 : hoveredLetterId === item.id ? 0.08 : 1.0;

        let nx = item.x + item.vx * speed;
        let ny = item.y + item.vy * speed;
        let nvx = item.vx;
        let nvy = item.vy;

        if (nx <= 6) { nx = 6; nvx = Math.abs(nvx); }
        if (nx >= 92) { nx = 92; nvx = -Math.abs(nvx); }
        if (ny <= 10) { ny = 10; nvy = Math.abs(nvy); }
        if (ny >= 88) { ny = 88; nvy = -Math.abs(nvy); }

        return {
          ...item,
          x: nx,
          y: ny,
          vx: nvx,
          vy: nvy
        };
      }));

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hoveredLetterId, focusedLetterId, reducedMotion]);

  // Handle letter click from letter bank
  const handleSelectLetter = (char, letterId) => {
    SoundFX.playLetterSelect();
    setErrorMessage('');

    // Trigger visual hit effect
    if (letterId) {
      setImpactEffect(letterId);
      setTimeout(() => setImpactEffect(null), 300);
    }

    // Find first empty slot
    const emptyIndex = slots.findIndex(s => s === '');
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = char;
      setSlots(newSlots);
    }
  };

  // Handle slot click (to remove placed letter)
  const handleSlotClick = (index) => {
    if (!slots[index]) return;
    SoundFX.playClick();
    const newSlots = [...slots];
    newSlots[index] = '';
    setSlots(newSlots);
  };

  // Clear all slots
  const handleClear = () => {
    SoundFX.playClick();
    setSlots(Array(killerLength).fill(''));
    setErrorMessage('');
  };

  // Submit assembled name for server-side verification
  const handleVerify = async () => {
    const assembledName = slots.join('').trim();
    if (assembledName.length !== killerLength) {
      setErrorMessage(`Заполните все ${killerLength} ячеек имени перед проверкой!`);
      SoundFX.playAccessDenied();
      return;
    }

    SoundFX.playClick();
    setIsChecking(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/investigation/verify-killer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: assembledName })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSolveSuccess(data);
      } else if (res.status === 423 || data.locked) {
        SoundFX.playAccessDenied();
        onFailedSubmission(data.remainingSeconds || 600, data.lockedUntil);
      } else {
        SoundFX.playAccessDenied();
        setErrorMessage(data.error || 'ОШИБКА РЕКОНСТРУКЦИИ.');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      setErrorMessage('ОШИБКА СЕТЕВОГО СОЕДИНЕНИЯ.');
    } finally {
      setIsChecking(false);
    }
  };

  // Physical keyboard typing listener for PC players in Garry's Mod
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target?.tagName)) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        SoundFX.playClick();
        setSlots(prev => {
          const lastFilledIdx = [...prev].reverse().findIndex(s => s !== '');
          if (lastFilledIdx !== -1) {
            const realIdx = prev.length - 1 - lastFilledIdx;
            const updated = [...prev];
            updated[realIdx] = '';
            return updated;
          }
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerify();
      } else if (/^[а-яёa-z0-9]$/i.test(e.key)) {
        const char = e.key.toUpperCase();
        SoundFX.playClick();
        setSlots(prev => {
          const emptyIdx = prev.findIndex(s => s === '');
          if (emptyIdx !== -1) {
            const updated = [...prev];
            updated[emptyIdx] = char;
            return updated;
          }
          return prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slots, killerLength]);

  const isComplete = slots.every(s => s !== '');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="cyber-panel p-5 bg-[#0e0915] border-2 border-[#ff2a85] box-glow-pink relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d1830] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Target className="text-[#ff2a85] animate-spin-slow" size={22} />
            <h2 className="text-xl sm:text-2xl font-interface font-bold text-white tracking-wider glow-pink">
              Реконструкция имени
            </h2>
          </div>
          <span className="text-sm font-mono bg-[#ff2a85]/20 text-[#ff2a85] px-2.5 py-1 border border-[#ff2a85] font-bold">
            ФИНАЛЬНЫЙ ТРИБУНАЛ
          </span>
        </div>

        <p className="text-sm font-mono text-gray-300 leading-relaxed">
          Символы дрейфуют в цифровом поле архива. Ловите нужные буквы кликом мыши, чтобы собрать имя зачернённого в правильном хронологическом порядке.
        </p>
      </div>

      {/* Critical Warning Callout (Updated for 1 of 16 students) */}
      <div className="p-3.5 bg-[#180a14] border-l-4 border-[#ff2a85] text-sm font-mono text-gray-300 flex items-center gap-3">
        <ShieldAlert size={22} className="text-[#ff2a85] flex-shrink-0" />
        <div>
          <strong className="text-[#ff2a85]">ВНИМАНИЕ: БЛОКИРОВКА МОНОПАДА!</strong> Ошибка в реконструкции карается <strong>10 МИНУТАМИ</strong> отключения терминала. Вы временно выбываете из расследования, пока остальные 15 учеников продолжают сбор улик перед Классным судом!
        </div>
      </div>

      {/* Name Constructor Slots */}
      <div className="cyber-panel p-6 sm:p-8 bg-[#090b12] border border-[#202945] text-center space-y-6">
        
        <span className="text-sm font-mono text-gray-400 uppercase tracking-widest block">
          СТРУКТУРА ИМЕНИ [{slots.filter(s => s !== '').length} / {killerLength}]:
        </span>

        {/* Lab Decoded Letters Banner */}
        {labLetters.filter(Boolean).length > 0 && (
          <div className="p-3 bg-[#78dfa7]/10 border border-[#78dfa7]/40 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm font-mono max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-[#78dfa7] font-bold">
              <Sparkles size={16} className="text-[#78dfa7]" />
              <span>ДОБЫТО В ЛАБОРАТОРИИ УЛИК:</span>
              <span className="tracking-widest bg-[#78dfa7]/20 px-2 py-0.5 rounded text-white">
                {labLetters.map((c, i) => c || '_').join(' ')}
              </span>
            </div>
            <button
              onClick={handleApplyLabLetters}
              className="px-3 py-1 bg-[#78dfa7]/20 hover:bg-[#78dfa7]/30 border border-[#78dfa7] text-[#78dfa7] rounded text-sm font-bold transition-all"
            >
              ⚡ ВСТАВИТЬ В СЛОТЫ
            </button>
          </div>
        )}

        {/* The Target Slots */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 my-4">
          {slots.map((char, idx) => (
            <button
              key={idx}
              aria-label={`Ячейка ${idx + 1}: ${char || 'пусто'}. Очистить`}
              onClick={() => handleSlotClick(idx)}
              className={`w-14 h-16 sm:w-16 sm:h-20 rounded border-2 font-interface font-extrabold text-2xl sm:text-3xl flex items-center justify-center transition-all ${
                char
                  ? 'bg-[#181125] border-[#ff2a85] text-white shadow-[0_0_15px_rgba(255,42,133,0.4)] hover:bg-[#201533] hover:scale-105'
                  : 'bg-[#0e1220] border-[#222a45] text-gray-600 border-dashed hover:border-gray-500'
              }`}
            >
              {char || '_'}
            </button>
          ))}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div role="alert" className="p-3 bg-[#ff2a85]/15 border border-[#ff2a85] text-[#ff2a85] text-sm font-mono rounded animate-shake max-w-md mx-auto">
            {errorMessage}
          </div>
        )}

        {/* Dynamic Letter Arena (Always Moving Letters / Hangman's Gambit) */}
        <div className="pt-4 border-t border-[#1a2238] space-y-3">
          
          {/* Arena Title Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm font-mono">
            <span className="text-[#6ddce5] flex items-center gap-2 font-bold tracking-wider">
              <Sparkles size={14} className="text-[#6ddce5] animate-pulse" />
              <span>ГРАВИТАЦИОННАЯ АРЕНА БУКВ // HANGMAN'S GAMBIT</span>
            </span>
            <span className="text-sm font-mono text-gray-500 bg-[#0e1322] px-2.5 py-0.5 border border-[#1e263d] rounded">
              {reducedMotion ? 'Буквы неподвижны' : 'Плавный дрейф'}
            </span>
          </div>

          {/* Continuous Floating Letters Arena */}
          <div className={`letter-arena ${reducedMotion ? 'is-static' : ''} relative w-full h-[280px] sm:h-[320px] bg-[#060810] border-2 border-[#1c2847] rounded-lg overflow-hidden select-none cursor-crosshair shadow-inner`}>
            
            {/* Background Digital Grid & HUD Details */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#6ddce5_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute top-3 left-3 text-sm font-mono text-gray-600 pointer-events-none">
              ZONE // [04-271]
            </div>
            <div className="absolute top-3 right-3 text-sm font-mono text-gray-600 pointer-events-none">
              ZERO-GRAVITY: ACTIVE
            </div>
            <div className="absolute bottom-3 left-3 text-sm font-mono text-[#6ddce5]/40 pointer-events-none">
              TARGET LOCK: READY
            </div>
            <div className="absolute bottom-3 right-3 text-sm font-mono text-gray-600 pointer-events-none">
              STATUS: CONTINUOUS MOTION
            </div>

            {/* Drifting Floating Letters */}
            {floatingLetters.map((item) => {
              const isHovered = hoveredLetterId === item.id;
              const isImpact = impactEffect === item.id;

              return (
                <button
                  key={item.id}
                  aria-label={`Выбрать букву ${item.char}`}
                  onFocus={() => setFocusedLetterId(item.id)}
                  onBlur={() => setFocusedLetterId(null)}
                  onClick={() => handleSelectLetter(item.char, item.id)}
                  onMouseEnter={() => setHoveredLetterId(item.id)}
                  onMouseLeave={() => setHoveredLetterId(null)}
                  disabled={isChecking}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rot}deg) ${isHovered ? 'scale(1.28)' : 'scale(1)'}`
                  }}
                  className={`absolute w-11 h-11 sm:w-13 sm:h-13 rounded-lg border flex items-center justify-center font-interface font-bold text-lg sm:text-xl transition-transform duration-100 ${
                    isImpact
                      ? 'bg-[#ff2a85] text-white border-white scale-140 shadow-[0_0_25px_#ff2a85]'
                      : isHovered
                      ? 'bg-[#18233d] border-[#6ddce5] text-white shadow-[0_0_20px_rgba(109,220,229,0.7)] z-20'
                      : 'bg-[#0f1424]/90 border-[#232f4e] text-gray-200 hover:text-white shadow-md z-10'
                  }`}
                >
                  {item.char}

                  {/* Aiming Reticle on Hover */}
                  {isHovered && (
                    <span className="absolute -inset-1 border border-[#6ddce5] rounded-lg animate-ping opacity-75 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-sm font-mono text-gray-400 text-center">
            Выберите букву нажатием или клавишей Enter. Клавиша Tab перемещает фокус между буквами; можно также вводить имя с клавиатуры.
          </div>
        </div>

        {/* Action Buttons: Clear & Verify */}
        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <button
            onClick={handleClear}
            disabled={isChecking || slots.every(s => s === '')}
            className="dr-btn py-2.5 px-5 text-sm font-interface flex items-center gap-2 border-gray-700 text-gray-400 hover:text-white"
          >
            <Trash2 size={14} />
            <span>ОЧИСТИТЬ</span>
          </button>

          <button
            onClick={handleVerify}
            disabled={isChecking || !isComplete}
            className="dr-btn dr-btn-primary py-2.5 px-8 text-sm font-interface font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>ПРОВЕРКА...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>ПРОВЕРИТЬ ИМЯ</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}

