import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Wrench,
  Search,
  Eye,
  Sliders,
  Award,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Activity,
  Maximize2,
  Crosshair,
  Volume2
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function ForensicLab({ onNavigateToReconstruction }) {
  // Solved state persisted in localStorage
  const [solvedPuzzles, setSolvedPuzzles] = useState(() => {
    try {
      const saved = localStorage.getItem('shinri_solved_puzzles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Dynamic letters received from server for the solved minigames
  const [labLetters, setLabLetters] = useState(() => {
    try {
      const saved = localStorage.getItem('shinri_lab_letters');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activePuzzleId, setActivePuzzleId] = useState('circuit');
  const [rewardToast, setRewardToast] = useState(null);

  // Five forensic puzzle slots
  const puzzleSlots = [
    { id: 'circuit', label: 'УЗЕЛ #1 (ЦЕПЬ)', hint: 'Электроцепь ловушки' },
    { id: 'uv', label: 'УЗЕЛ #2 (СПЕКТРОМЕТР)', hint: 'УФ-сканирование люминола' },
    { id: 'timeline', label: 'УЗЕЛ #3 (ТАЙМЛАЙН)', hint: 'Хронология событий' },
    { id: 'trap', label: 'УЗЕЛ #4 (МЕХАНИЗМ)', hint: 'Регулятор капкана' },
    { id: 'workbench', label: 'УЗЕЛ #5 (ВЕРСТАК)', hint: 'Микрорельеф среза' }
  ];

  // Sync missing letters from server on mount or when puzzles are solved
  useEffect(() => {
    const fetchMissingLetters = async () => {
      let updated = { ...labLetters };
      let changed = false;
      for (const slot of puzzleSlots) {
        if (solvedPuzzles[slot.id] && !updated[slot.id]) {
          try {
            const res = await fetch('/api/investigation/lab/solve-minigame', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ minigameId: slot.id })
            });
            const data = await res.json();
            if (data.success && data.letter) {
              updated[slot.id] = data.letter;
              changed = true;
            }
          } catch (err) {
            console.error('Error fetching minigame letter for', slot.id, err);
          }
        }
      }
      if (changed) {
        setLabLetters(updated);
        try {
          localStorage.setItem('shinri_lab_letters', JSON.stringify(updated));
        } catch {}
      }
    };

    fetchMissingLetters();
  }, [solvedPuzzles]);

  // Mark solved and request corresponding letter from server
  const markPuzzleSolved = async (puzzleId) => {
    SoundFX.playAccessGranted();
    const updated = { ...solvedPuzzles, [puzzleId]: true };
    setSolvedPuzzles(updated);
    try {
      localStorage.setItem('shinri_solved_puzzles', JSON.stringify(updated));
    } catch {}

    let letterReward = labLetters[puzzleId] || '...';
    try {
      const res = await fetch('/api/investigation/lab/solve-minigame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minigameId: puzzleId })
      });
      const data = await res.json();
      if (data.success && data.letter) {
        letterReward = data.letter;
        const newLetters = { ...labLetters, [puzzleId]: data.letter };
        setLabLetters(newLetters);
        try {
          localStorage.setItem('shinri_lab_letters', JSON.stringify(newLetters));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch solved letter from server:', err);
    }

    setRewardToast(`РАСШИФРОВАН ФРАГМЕНТ ИМЕНИ: [ ${letterReward} ]`);
    setTimeout(() => setRewardToast(null), 4000);
  };

  const handleResetPuzzles = () => {
    SoundFX.playClick();
    if (window.confirm('Сбросить прогресс решения всех криминалистических головоломок?')) {
      setSolvedPuzzles({});
      setLabLetters({});
      try {
        localStorage.removeItem('shinri_solved_puzzles');
        localStorage.removeItem('shinri_lab_letters');
      } catch {}
    }
  };

  const solvedCount = Object.keys(solvedPuzzles).length;

  // =========================================================================
  // PUZZLE 1: ⚡ ЭЛЕКТРОЦЕПЬ (СЕТКА ПРОВОДНИКОВ С РОТАЦИЕЙ И БАЛАНСОМ ВОЛЬТАЖА)
  // =========================================================================
  // 6 rotatable conduit nodes (0, 90, 180, 270 deg)
  // Solution requires matching proper orientation: [0, 90, 180, 270, 90, 0]
  const [circuitTiles, setCircuitTiles] = useState([
    { id: 0, label: 'БЛОК 12V', rot: 90, targetRot: 0, type: 'source' },
    { id: 1, label: 'ШИНА ПИТАНИЯ', rot: 180, targetRot: 90, type: 'corner' },
    { id: 2, label: 'КОНДЕНСАТОР', rot: 270, targetRot: 180, type: 'straight' },
    { id: 3, label: 'РЕОСТАТ 0.1Ω', rot: 0, targetRot: 270, type: 'corner' },
    { id: 4, label: 'ИМПУЛЬСАТОР', rot: 180, targetRot: 90, type: 'straight' },
    { id: 5, label: 'ПОРОГОВАЯ ПЕТЛЯ', rot: 270, targetRot: 0, type: 'sink' }
  ]);
  const [targetVoltage, setTargetVoltage] = useState(600); // Need 1200V
  const [circuitMessage, setCircuitMessage] = useState('');

  const handleRotateTile = (idx) => {
    SoundFX.playClick();
    setCircuitTiles(prev => prev.map((t, i) => i === idx ? { ...t, rot: (t.rot + 90) % 360 } : t));
    setCircuitMessage('');
  };

  const isCircuitAligned = circuitTiles.every(t => t.rot === t.targetRot);

  const handleTestCircuit = () => {
    SoundFX.playClick();
    if (!isCircuitAligned) {
      SoundFX.playAccessDenied();
      setCircuitMessage('ОШИБКА РАЗМЫКАНИЯ: Контур проводников не замкнут! Проверьте ориентацию узлов импульса.');
      return;
    }
    if (targetVoltage < 1200) {
      SoundFX.playAccessDenied();
      setCircuitMessage(`НЕДОСТАТОЧНОЕ НАПРЯЖЕНИЕ (${targetVoltage}V): Для мгновенного оглушения жертвы требуется импульс от 1200V!`);
      return;
    }

    setCircuitMessage('УСПЕХ! Импульс 1200V пробит через порог! Жертва потеряла сознание при входе.');
    markPuzzleSolved('circuit');
  };

  // =========================================================================
  // PUZZLE 2: 🧹 УФ-СКАНИРОВАНИЕ (ДВУХФАЗНЫЙ АНАЛИЗ: ЛЮМИНОЛ + СПЕКТРОМЕТРИЯ)
  // =========================================================================
  // 6 forensic sectors in the incinerator room
  const [selectedToolUv, setSelectedToolUv] = useState('luminol'); // 'luminol' | 'spectrometer'
  const [sectorStates, setSectorStates] = useState({
    sec_threshold: { name: 'СЕКТОР #01: Порог мусоросжигателя', sprayed: false, scanned: false, type: 'blood_footprint', label: 'След обуви 38р (Кровь)' },
    sec_drain: { name: 'СЕКТОР #02: Плитка у дренажного слива', sprayed: false, scanned: false, type: 'blood_streak', label: 'Смытая кровь жертвы' },
    sec_mop: { name: 'СЕКТОР #03: Рукоятка швабры в подсобке', sprayed: false, scanned: false, type: 'silk_fibers', label: 'Микроволокна перчатки зачернённого' },
    sec_furnace: { name: 'СЕКТОР #04: Люк мусорной печи', sprayed: false, scanned: false, type: 'decoy_soot', label: 'Угольная сажа (Ложная улика)' },
    sec_crate: { name: 'СЕКТОР #05: Угол за железным ящиком', sprayed: false, scanned: false, type: 'decoy_oil', label: 'Машинное масло (Ложная улика)' },
    sec_bucket: { name: 'СЕКТОР #06: Ведро с чистящей пеной', sprayed: false, scanned: false, type: 'decoy_soap', label: 'Фосфатная мыльная пена' }
  });
  const [uvMessage, setUvMessage] = useState('');

  const handleInteractSector = (secKey) => {
    SoundFX.playClick();
    const current = sectorStates[secKey];

    if (selectedToolUv === 'luminol') {
      // Spray luminol
      setSectorStates(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], sprayed: true }
      }));
      setUvMessage(`Люминол нанесён на [${current.name}]. Используйте УФ-спектрометр для считывания молекулярного следа.`);
    } else {
      // Spectrometer scanning
      if (!current.sprayed) {
        SoundFX.playAccessDenied();
        setUvMessage('ОШИБКА: Сначала нанесите реагент люминола на сектор, чтобы вызвать хемилюминесценцию!');
        return;
      }

      setSectorStates(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], scanned: true }
      }));

      if (current.type.startsWith('decoy')) {
        SoundFX.playAccessDenied();
        setUvMessage(`ВНИМАНИЕ: Спектрометр зафиксировал ложный след: ${current.label}. Это не кровь жертвы!`);
      } else {
        setUvMessage(`УСПЕШНАЯ ФИКСАЦИЯ ВЕЩДОКА: ${current.label}!`);
      }

      // Check if all 3 authentic clues are confirmed
      const updated = {
        ...sectorStates,
        [secKey]: { ...current, scanned: true }
      };

      const trueClues = ['sec_threshold', 'sec_drain', 'sec_mop'];
      const allTrueConfirmed = trueClues.every(k => updated[k].sprayed && updated[k].scanned);

      if (allTrueConfirmed) {
        markPuzzleSolved('uv');
      }
    }
  };

  // =========================================================================
  // PUZZLE 3: ⏱️ ТАЙМЛАЙН (ТОЧНАЯ СЕТКА ВРЕМЕНИ БЕЗ НУМЕРАЦИИ)
  // =========================================================================
  const timelineEvents = [
    { id: 'E_WAREHOUSE', title: 'Сбор деталей (аккумулятор, провода, стяжки) в складском отсеке', targetTime: '21:32' },
    { id: 'E_WORKBENCH', title: 'Крафт электроловушки и взвод капкана на верстаке мастерской', targetTime: '21:35' },
    { id: 'E_HANDOVER', title: 'Тайная передача капкана сообщнику у ящиков склада («беги со всех ног!»)', targetTime: '21:38' },
    { id: 'E_ZAP', title: 'Срабатывание электрического разряда на пороге мусоросжигателя', targetTime: '21:40' },
    { id: 'E_TALK', title: 'Обездвиживание стяжками, пробуждение жертвы и 30-секундный разговор', targetTime: '21:41' },
    { id: 'E_MOP', title: 'Захлопывание капкана и влажная уборка пола шваброй для удаления следов', targetTime: '21:43' }
  ];

  // Scrambled timeline order initially
  const [timelineOrder, setTimelineOrder] = useState([
    'E_ZAP', 'E_WAREHOUSE', 'E_MOP', 'E_HANDOVER', 'E_TALK', 'E_WORKBENCH'
  ]);
  const [timelineFeedback, setTimelineFeedback] = useState('');

  const moveTimelineItem = (index, direction) => {
    SoundFX.playClick();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= timelineOrder.length) return;
    const copy = [...timelineOrder];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setTimelineOrder(copy);
    setTimelineFeedback('');
  };

  const handleVerifyTimeline = () => {
    SoundFX.playClick();
    const correctSeq = ['E_WAREHOUSE', 'E_WORKBENCH', 'E_HANDOVER', 'E_ZAP', 'E_TALK', 'E_MOP'];
    const matches = timelineOrder.filter((id, idx) => id === correctSeq[idx]).length;

    if (matches === 6) {
      setTimelineFeedback('');
      markPuzzleSolved('timeline');
    } else {
      SoundFX.playAccessDenied();
      setTimelineFeedback(`ХРОНОЛОГИЯ НАРУШЕНА: Верно расставлено только ${matches} из 6 событий. Сверьтесь с протоколом подготовки и совершения убийства!`);
    }
  };

  // =========================================================================
  // PUZZLE 4: ⚙️ СПУСКОВОЙ МЕХАНИЗМ КАПКАНА (КРИПТОГРАФИЧЕСКИЙ РЕГУЛЯТОР)
  // =========================================================================
  // Code derived from case clues:
  // Dial 1: Сектор архива (04)
  // Dial 2: Длительность диалога в секундах (30)
  // Dial 3: Заводской номер Wolf Trap (04)
  const [dialSector, setDialSector] = useState(1);
  const [dialSeconds, setDialSeconds] = useState(15);
  const [dialWolf, setDialWolf] = useState(1);
  const [springTension, setSpringTension] = useState(50); // Need 75% tension
  const [trapMessage, setTrapMessage] = useState('');

  const handleTriggerTrap = () => {
    SoundFX.playClick();
    const isCodeCorrect = dialSector === 4 && dialSeconds === 30 && dialWolf === 4;
    const isTensionCorrect = springTension >= 70 && springTension <= 80;

    if (!isTensionCorrect) {
      SoundFX.playAccessDenied();
      setTrapMessage(`ОШИБКА НАТЯЖЕНИЯ (${springTension}%): Для открытия храповика требуется точное натяжение в безопасном диапазоне 70% – 80%!`);
      return;
    }

    if (!isCodeCorrect) {
      SoundFX.playAccessDenied();
      setTrapMessage('ХРАПОВИК ЗАКЛИНИЛО: Комбинация регуляторов не совпадает с материалами дела!');
      return;
    }

    setTrapMessage('ЩЕЛЧОК! Зубья капкана раскрыты! Из пружины механизма извлечены микроволокна перчаток зачернённого.');
    markPuzzleSolved('trap');
  };

  // =========================================================================
  // PUZZLE 5: ✂️ ВЕРСТАК (СПЛИТ-СКРИН МИКРОСКОП СРАВНЕНИЯ МИКРОРЕЛЬЕФА)
  // =========================================================================
  const [selectedTool, setSelectedTool] = useState(null);
  const [cutAngle, setCutAngle] = useState(15); // Target: 45 deg
  const [magnification, setMagnification] = useState(50); // Target: 80%+
  const [microscopeMessage, setMicroscopeMessage] = useState('');

  // Calculate matching accuracy percentage
  let matchScore = 0;
  if (selectedTool === 'pliers') {
    const angleDiff = Math.abs(cutAngle - 45);
    const magBonus = magnification >= 75 ? 40 : 20;
    const angleScore = Math.max(0, 60 - angleDiff * 2.5);
    matchScore = Math.min(100, Math.round(angleScore + magBonus));
  } else if (selectedTool === 'hacksaw') {
    matchScore = 18;
  } else if (selectedTool === 'knife') {
    matchScore = 32;
  }

  const handleConfirmMicroscope = () => {
    SoundFX.playClick();
    if (!selectedTool) {
      SoundFX.playAccessDenied();
      setMicroscopeMessage('Выберите образец инструмента для сравнения со срезом на строительной стяжке!');
      return;
    }

    if (matchScore >= 95) {
      setMicroscopeMessage('100% ТРАСОЛОГИЧЕСКОЕ СОВПАДЕНИЕ! Монтажные кусачки с верстака оставили диагональный срез 45° на стяжках жертвы и медном кабеле.');
      markPuzzleSolved('workbench');
    } else {
      SoundFX.playAccessDenied();
      setMicroscopeMessage(`НЕСООТВЕТСТВИЕ МИКРОРЕЛЬЕФА (${matchScore}%): Бороздки режущей кромки не совпадают! Настройте угол среза до 45° и увеличьте фокус.`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Toast Notification */}
      {rewardToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-[#142618] border-2 border-[#00ff88] text-[#00ff88] font-cyber text-sm rounded shadow-[0_0_20px_rgba(0,255,136,0.4)] animate-bounce flex items-center gap-3">
          <Award size={20} className="text-[#00ff88]" />
          <span className="font-bold tracking-wider">{rewardToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="cyber-panel p-5 bg-[#0b0e17] border-2 border-[#00f3ff]/40 shadow-[0_0_15px_rgba(0,243,255,0.08)] relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2542] pb-3 mb-4">
          <div>
            <span className="text-xs font-mono text-[#00f3ff] uppercase tracking-wider block">
              КРИМИНАЛИСТИЧЕСКАЯ ЭКСПЕРТИЗА // РАССЛЕДОВАНИЕ ВЕЩДОКОВ
            </span>
            <h2 className="text-xl sm:text-2xl font-cyber font-bold text-white flex items-center gap-2">
              <Zap className="text-[#ff2a85]" size={22} />
              <span>03 ЛАБОРАТОРИЯ ВЕЩДОКОВ И ГОЛОВОЛОМКИ</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPuzzles}
              className="text-[10px] font-mono text-gray-500 hover:text-gray-300 underline flex items-center gap-1"
            >
              <RotateCcw size={11} />
              <span>Сбросить</span>
            </button>
            <span className="px-3 py-1 text-xs font-mono font-bold tracking-wider rounded border border-[#00ff88] bg-[#00ff88]/15 text-[#00ff88]">
              РЕШЕНО: {solvedCount} / 5
            </span>
          </div>
        </div>

        <p className="text-xs font-mono text-gray-300 leading-relaxed mb-4">
          Исследуйте материальные улики инцидента в мусоросжигателе. Каждая решённая криминалистическая головоломка шаг за шагом раскрывает скрытые символы имени убийцы для трибунала.
        </p>

        {/* Letters Progress Bar (Dynamic from Server) */}
        <div className="p-3.5 bg-[#070a12] border border-[#1d2745] rounded-lg">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
            <span className="flex items-center gap-1.5 text-[#00f3ff] font-bold">
              <Sparkles size={14} className="text-[#00f3ff]" />
              <span>РАСШИФРОВАННЫЕ БУКВЫ ИМЕНИ ЗАЧЕРНЁННОГО:</span>
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              РЕШЕНО УЗЛОВ: {solvedCount} / 5
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 max-w-lg mx-auto py-1">
            {puzzleSlots.map((slot, idx) => {
              const isRevealed = Boolean(solvedPuzzles[slot.id]);
              const letterVal = labLetters[slot.id];
              return (
                <div
                  key={slot.id}
                  className={`flex-1 min-w-[50px] h-12 rounded border flex flex-col items-center justify-center font-cyber font-bold transition-all ${
                    isRevealed
                      ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)] scale-105 text-base sm:text-lg'
                      : 'bg-[#0e1322] border-[#222c47] text-gray-600 text-sm'
                  }`}
                >
                  <span className="tracking-widest">{isRevealed ? (letterVal || '...') : '■'}</span>
                  <span className="text-[8px] font-mono text-gray-500">#{idx + 1}</span>
                </div>
              );
            })}
          </div>

          {solvedCount >= 4 && (
            <div className="mt-3 text-center">
              <button
                onClick={onNavigateToReconstruction}
                className="dr-btn dr-btn-primary py-2 px-6 text-xs font-cyber font-bold flex items-center justify-center gap-2 mx-auto"
              >
                <span>ПЕРЕЙТИ К ФИНАЛЬНОЙ РЕКОНСТРУКЦИИ ИМЕНИ</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Puzzle Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
        <button
          onClick={() => { SoundFX.playClick(); setActivePuzzleId('circuit'); }}
          className={`p-2.5 rounded border text-left transition-all ${
            activePuzzleId === 'circuit'
              ? 'bg-[#151f38] border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#00f3ff] font-bold">#1 ЭЛЕКТРОЦЕПЬ</span>
            {solvedPuzzles.circuit && <CheckCircle2 size={13} className="text-[#00ff88]" />}
          </div>
          <div className="font-semibold truncate">Ротация узлов</div>
        </button>

        <button
          onClick={() => { SoundFX.playClick(); setActivePuzzleId('uv'); }}
          className={`p-2.5 rounded border text-left transition-all ${
            activePuzzleId === 'uv'
              ? 'bg-[#151f38] border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#ff2a85] font-bold">#2 УФ-СКАНИРОВАНИЕ</span>
            {solvedPuzzles.uv && <CheckCircle2 size={13} className="text-[#00ff88]" />}
          </div>
          <div className="font-semibold truncate">Люминол и спектр</div>
        </button>

        <button
          onClick={() => { SoundFX.playClick(); setActivePuzzleId('timeline'); }}
          className={`p-2.5 rounded border text-left transition-all ${
            activePuzzleId === 'timeline'
              ? 'bg-[#151f38] border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-amber-400 font-bold">#3 ТАЙМЛАЙН</span>
            {solvedPuzzles.timeline && <CheckCircle2 size={13} className="text-[#00ff88]" />}
          </div>
          <div className="font-semibold truncate">Сетка таймингов</div>
        </button>

        <button
          onClick={() => { SoundFX.playClick(); setActivePuzzleId('trap'); }}
          className={`p-2.5 rounded border text-left transition-all ${
            activePuzzleId === 'trap'
              ? 'bg-[#151f38] border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#00ff88] font-bold">#4 КАПКАН</span>
            {solvedPuzzles.trap && <CheckCircle2 size={13} className="text-[#00ff88]" />}
          </div>
          <div className="font-semibold truncate">Храповик и натяжение</div>
        </button>

        <button
          onClick={() => { SoundFX.playClick(); setActivePuzzleId('workbench'); }}
          className={`p-2.5 rounded border text-left transition-all ${
            activePuzzleId === 'workbench'
              ? 'bg-[#151f38] border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-purple-400 font-bold">#5 ВЕРСТАК</span>
            {solvedPuzzles.workbench && <CheckCircle2 size={13} className="text-[#00ff88]" />}
          </div>
          <div className="font-semibold truncate">Микроскоп среза</div>
        </button>
      </div>

      {/* Active Puzzle Workspace */}
      <div className="cyber-panel p-6 bg-[#090c15] border border-[#202945] rounded-lg font-mono">
        
        {/* ================================================================= */}
        {/* PUZZLE 1: CIRCUIT ROTATION */}
        {/* ================================================================= */}
        {activePuzzleId === 'circuit' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-[11px] text-[#00f3ff] font-bold uppercase">ВЕЩДОК: ОСТАТКИ ЭЛЕКТРОЛОВУШКИ</span>
                <h3 className="text-lg font-cyber font-bold text-white">
                  РОТАЦИЯ УЗЛОВ ЭЛЕКТРОЦЕПИ И БАЛАНСИРОВКА НАПРЯЖЕНИЯ
                </h3>
              </div>
              <span className="text-xs bg-[#00f3ff]/10 text-[#00f3ff] px-2.5 py-1 rounded border border-[#00f3ff]/30 font-bold">
                НАГРАДА: БУКВА #1 [ К ]
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              На пороге мусоросжигателя обнаружен импульсный разрядник. Кликайте по узлам проводников для их поворота на 90°, чтобы составить сплошную неразрывную шину от аккумулятора к порогу, и отрегулируйте напряжение импульса до поражающего значения (≥1200V).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Interactive Rotatable Conduits Grid */}
              <div className="space-y-3">
                <span className="text-xs text-gray-400 block font-bold">УЗЛЫ ПРОВОДНИКОВ (КЛИКАЙТЕ ДЛЯ ПОВОРОТА):</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {circuitTiles.map((tile, idx) => {
                    const isTileCorrect = tile.rot === tile.targetRot;
                    return (
                      <button
                        key={tile.id}
                        onClick={() => handleRotateTile(idx)}
                        className={`p-3 rounded border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isTileCorrect
                            ? 'bg-[#101b2f] border-[#00f3ff] text-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,0.25)]'
                            : 'bg-[#0d101a] border-[#222a40] text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 border border-current rounded flex items-center justify-center font-bold text-sm transition-transform duration-200"
                          style={{ transform: `rotate(${tile.rot}deg)` }}
                        >
                          {tile.type === 'straight' && '━'}
                          {tile.type === 'corner' && '┗'}
                          {tile.type === 'source' && '▶'}
                          {tile.type === 'sink' && '⚡'}
                        </div>
                        <span className="text-[9px] font-bold truncate max-w-full">{tile.label}</span>
                        <span className="text-[8px] text-gray-500">{tile.rot}°</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voltage Balance Controls */}
              <div className="space-y-4 bg-[#060810] p-4 rounded border border-[#1b2540] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                    <span className="font-bold flex items-center gap-1">
                      <Zap size={13} className="text-amber-400" />
                      <span>ИМПУЛЬСНОЕ НАПРЯЖЕНИЕ:</span>
                    </span>
                    <span className={`font-cyber font-bold text-base ${
                      targetVoltage >= 1200 ? 'text-[#00ff88]' : 'text-amber-400'
                    }`}>
                      {targetVoltage} V
                    </span>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max="1800"
                    step="100"
                    value={targetVoltage}
                    onChange={(e) => setTargetVoltage(Number(e.target.value))}
                    className="w-full accent-[#00f3ff] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>200V (Слабо)</span>
                    <span className="text-[#00ff88] font-bold">1200V (Оглушение)</span>
                    <span>1800V (Перегрузка)</span>
                  </div>

                  <div className="mt-4 p-3 bg-[#0a0e1c] border border-[#18233c] rounded text-[11px] text-gray-400 space-y-1">
                    <div>СТАТУС КОНТУРА: <strong className={isCircuitAligned ? 'text-[#00ff88]' : 'text-amber-400'}>{isCircuitAligned ? 'ЦЕПЬ СОГЛАСОВАНА' : 'ОБРЫВ ПРОВОДНИКА'}</strong></div>
                    <div>ПОТЕРИ В РЕОСТАТЕ: <strong className="text-gray-300">0.1 Ом (Медный шлейф)</strong></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleTestCircuit}
                    className="w-full dr-btn dr-btn-primary py-2.5 text-xs font-cyber font-bold"
                  >
                    ПРОИЗВЕСТИ ИМПУЛЬСНЫЙ РАЗРЯД
                  </button>

                  {circuitMessage && (
                    <div className={`p-2.5 rounded text-xs border animate-fadeIn ${
                      circuitMessage.startsWith('УСПЕХ')
                        ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]'
                        : 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                    }`}>
                      {circuitMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 2: DUAL-PHASE UV & LUMINOL SPECTROMETER */}
        {/* ================================================================= */}
        {activePuzzleId === 'uv' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-[11px] text-[#ff2a85] font-bold uppercase">ВЕЩДОК: ШВАБРА И СМЫТЫЙ ПОЛ</span>
                <h3 className="text-lg font-cyber font-bold text-white">
                  ДВУХФАЗНЫЙ АНАЛИЗ: ЛЮМИНОЛ + УФ-СПЕКТРОМЕТРИЯ
                </h3>
              </div>
              <span className="text-xs bg-[#ff2a85]/15 text-[#ff2a85] px-2.5 py-1 rounded border border-[#ff2a85]/40 font-bold">
                НАГРАДА: БУКВА #2 [ И ]
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Убийца вымыл пол шваброй с мыльным раствором. Сначала распылите Люминол на подозрительные сектора, чтобы вызвать реакцию с белками гемоглобина, а затем просканируйте активные зоны УФ-спектрометром, отделяя кровь от ложных пятен (масла, сажи и мыла).
            </p>

            {/* Tool Switcher */}
            <div className="flex items-center gap-3 bg-[#070912] p-2.5 border border-[#1b2540] rounded">
              <span className="text-xs text-gray-400 font-bold">АКТИВНЫЙ ИНСТРУМЕНТ:</span>
              <button
                onClick={() => { SoundFX.playClick(); setSelectedToolUv('luminol'); }}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                  selectedToolUv === 'luminol'
                    ? 'bg-[#00f3ff]/20 border-[#00f3ff] text-[#00f3ff] shadow-[0_0_10px_#00f3ff]'
                    : 'bg-[#111728] border-gray-700 text-gray-400'
                }`}
              >
                1. РАСПЫЛИТЕЛЬ ЛЮМИНОЛА (РЕАГЕНТ)
              </button>
              <button
                onClick={() => { SoundFX.playClick(); setSelectedToolUv('spectrometer'); }}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                  selectedToolUv === 'spectrometer'
                    ? 'bg-[#c084fc]/20 border-[#c084fc] text-[#c084fc] shadow-[0_0_10px_#c084fc]'
                    : 'bg-[#111728] border-gray-700 text-gray-400'
                }`}
              >
                2. УФ-СПЕКТРОМЕТР (365 нм)
              </button>
            </div>

            {/* Sector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(sectorStates).map(([key, sec]) => {
                const isDecoy = sec.type.startsWith('decoy');
                return (
                  <button
                    key={key}
                    onClick={() => handleInteractSector(key)}
                    className={`p-3.5 rounded border text-left space-y-1.5 transition-all relative overflow-hidden ${
                      sec.scanned
                        ? isDecoy
                          ? 'bg-[#180d12] border-red-500/50 text-gray-400'
                          : 'bg-[#0e2118] border-[#00ff88] text-white shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                        : sec.sprayed
                        ? 'bg-[#16122a] border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-[#0a0d17] border-[#1d2640] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white truncate">{sec.name}</span>
                      {sec.scanned && (
                        <span className={isDecoy ? 'text-red-400' : 'text-[#00ff88]'}>
                          {isDecoy ? 'ЛОЖНО' : '✓ ВЕЩДОК'}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-400">
                      СТАТУС: {sec.scanned ? sec.label : sec.sprayed ? 'Хемилюминесцентное свечение (Требуется УФ-скан)' : 'Не обработано'}
                    </div>

                    <div className="text-[9px] text-[#00f3ff]/70 font-mono">
                      Клик: {selectedToolUv === 'luminol' ? 'Распылить люминол' : 'Спектральный анализ'}
                    </div>
                  </button>
                );
              })}
            </div>

            {uvMessage && (
              <div className="p-3 bg-[#0d1425] border border-[#233355] text-xs text-gray-200 rounded animate-fadeIn">
                {uvMessage}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 3: TIMELINE (ACCURATE TIMESTAMP SEQUENCE) */}
        {/* ================================================================= */}
        {activePuzzleId === 'timeline' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-[11px] text-amber-400 font-bold uppercase">ВЕЩДОК: ХРОНОЛОГИЯ ПРЕСТУПЛЕНИЯ</span>
                <h3 className="text-lg font-cyber font-bold text-white">
                  РЕКОНСТРУКЦИЯ СЕТКИ ВРЕМЕНИ (БЕЗ ПОДСКАЗОК В ТЕКСТЕ)
                </h3>
              </div>
              <span className="text-xs bg-amber-400/15 text-amber-300 px-2.5 py-1 rounded border border-amber-400/40 font-bold">
                НАГРАДА: БУКВА #3 [ Р ]
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Расставьте 6 ключевых действий убийцы в строгой последовательности, сопоставив их с хронометражем следствия (21:32 ➜ 21:43). Используйте стрелки ▲ и ▼ для перемещения событий.
            </p>

            <div className="space-y-2">
              {timelineOrder.map((eventId, index) => {
                const event = timelineEvents.find(e => e.id === eventId);
                const assignedTimes = ['21:32', '21:35', '21:38', '21:40', '21:41', '21:43'];
                const assignedTime = assignedTimes[index];

                return (
                  <div
                    key={eventId}
                    className="flex items-center justify-between p-3 bg-[#0d1222] border border-[#1d2745] rounded hover:border-[#00f3ff]/50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded bg-[#162038] text-amber-400 font-bold font-mono text-xs border border-[#2b3a5e]">
                        {assignedTime}
                      </span>
                      <span className="text-gray-200">{event.title}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveTimelineItem(index, -1)}
                        disabled={index === 0}
                        className="p-1 rounded bg-[#162038] hover:bg-[#223155] disabled:opacity-30 text-gray-300 hover:text-white"
                        title="Выше"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveTimelineItem(index, 1)}
                        disabled={index === timelineOrder.length - 1}
                        className="p-1 rounded bg-[#162038] hover:bg-[#223155] disabled:opacity-30 text-gray-300 hover:text-white"
                        title="Ниже"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleVerifyTimeline}
                className="dr-btn dr-btn-primary py-2.5 px-6 text-xs font-cyber font-bold"
              >
                ПРОВЕРИТЬ СООТВЕТСТВИЕ ВРЕМЕНИ
              </button>

              {timelineFeedback && (
                <div className="text-xs text-[#ff2a85] font-mono">
                  {timelineFeedback}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 4: TRAP MECHANISM WITH SPRING TENSION GAUGE */}
        {/* ================================================================= */}
        {activePuzzleId === 'trap' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-[11px] text-[#00ff88] font-bold uppercase">ВЕЩДОК: ОХОТНИЧИЙ КАПКАН</span>
                <h3 className="text-lg font-cyber font-bold text-white">
                  ДЕАКТИВАЦИЯ ХРАПОВИКА И КОНТРОЛЬ НАТЯЖЕНИЯ ПРУЖИНЫ
                </h3>
              </div>
              <span className="text-xs bg-[#00ff88]/15 text-[#00ff88] px-2.5 py-1 rounded border border-[#00ff88]/40 font-bold">
                НАГРАДА: БУКВА #4 [ У ]
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Чтобы разжать стальные зубья капкана и освободить зажатую ткань, выставите параметры кода из материалов дела (Сектор, секунды диалога, модель капкана) и удерживайте ползунок натяжения пружины строго в безопасной зелёной зоне (70% – 80%).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              {/* Dial 1 */}
              <div className="p-4 bg-[#0c1120] border border-[#1b2645] rounded text-center space-y-2">
                <span className="text-[11px] text-gray-400 block font-bold">СЕКТОР МУСОРОСЖИГАТЕЛЯ</span>
                <div className="text-2xl font-cyber font-bold text-[#00f3ff]">0{dialSector}</div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => { SoundFX.playClick(); setDialSector(s => Math.max(1, s - 1)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">-</button>
                  <button onClick={() => { SoundFX.playClick(); setDialSector(s => Math.min(8, s + 1)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">+</button>
                </div>
              </div>

              {/* Dial 2 */}
              <div className="p-4 bg-[#0c1120] border border-[#1b2645] rounded text-center space-y-2">
                <span className="text-[11px] text-gray-400 block font-bold">ВРЕМЯ ДИАЛОГА (СЕК)</span>
                <div className="text-2xl font-cyber font-bold text-amber-400">{dialSeconds} с</div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => { SoundFX.playClick(); setDialSeconds(t => Math.max(5, t - 5)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">-</button>
                  <button onClick={() => { SoundFX.playClick(); setDialSeconds(t => Math.min(60, t + 5)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">+</button>
                </div>
              </div>

              {/* Dial 3 */}
              <div className="p-4 bg-[#0c1120] border border-[#1b2645] rounded text-center space-y-2">
                <span className="text-[11px] text-gray-400 block font-bold">МОДЕЛЬ WOLF TRAP</span>
                <div className="text-2xl font-cyber font-bold text-[#ff2a85]">#{dialWolf}</div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => { SoundFX.playClick(); setDialWolf(m => Math.max(1, m - 1)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">-</button>
                  <button onClick={() => { SoundFX.playClick(); setDialWolf(m => Math.min(6, m + 1)); }} className="px-3 py-1 bg-[#16213a] text-white rounded text-xs">+</button>
                </div>
              </div>
            </div>

            {/* Spring Tension Gauge Slider */}
            <div className="p-4 bg-[#070a13] border border-[#1d2745] rounded space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-bold">НАТЯЖЕНИЕ РЫЧАГА ПРУЖИНЫ:</span>
                <span className={`font-cyber font-bold ${
                  springTension >= 70 && springTension <= 80 ? 'text-[#00ff88]' : 'text-amber-400'
                }`}>
                  {springTension}% {springTension >= 70 && springTension <= 80 ? '(ОПТИМУМ)' : '(КРИТИЧНО)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={springTension}
                onChange={(e) => setSpringTension(Number(e.target.value))}
                className="w-full accent-[#00ff88] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0% Срыв</span>
                <span className="text-[#00ff88] font-bold">70% – 80% (Зона деактивации)</span>
                <span>100% Перетяжка</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleTriggerTrap}
                className="dr-btn dr-btn-primary py-2.5 px-6 text-xs font-cyber font-bold"
              >
                РАЗЖАТЬ ПРУЖИННЫЙ ЗАМОК
              </button>

              {trapMessage && (
                <div className={`text-xs font-mono ${
                  trapMessage.startsWith('ЩЕЛЧОК') ? 'text-[#00ff88]' : 'text-[#ff2a85]'
                }`}>
                  {trapMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 5: SPLIT-SCREEN COMPARISON MICROSCOPE */}
        {/* ================================================================= */}
        {activePuzzleId === 'workbench' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-[11px] text-purple-400 font-bold uppercase">ВЕЩДОК: ВЕРСТАК И СТЯЖКИ</span>
                <h3 className="text-lg font-cyber font-bold text-white">
                  СРАВНИТЕЛЬНЫЙ МИКРОСКОП: СОПОСТАВЛЕНИЕ РЕЛЬЕФА СРЕЗА
                </h3>
              </div>
              <span className="text-xs bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded border border-purple-500/40 font-bold">
                НАГРАДА: БУКВЫ #5 И #6 [ М & И ]
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              На запястьях жертвы найдены срезанные строительные стяжки. Выберите инструмент из мастерской, сопоставьте угол среза (45°) и уровень резкости под микроскопом, чтобы добиться 95%+ совпадения микрорельефа кромки.
            </p>

            {/* Split Screen Comparator Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Screen: Evidence Sample */}
              <div className="p-4 bg-[#05070e] border border-[#1b2645] rounded space-y-2">
                <span className="text-[11px] text-[#00f3ff] font-bold block">ЭТАЛОН: СРЕЗ СТЯЖКИ С ЗАПЯСТЬЯ (x100)</span>
                <div className="h-40 bg-[#080d1a] border border-[#203058] rounded relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:16px_16px]" />
                  {/* Visual cut shape at 45 deg */}
                  <div className="w-24 h-24 border-r-4 border-t-4 border-white rotate-45 opacity-80" />
                  <div className="absolute bottom-2 left-2 text-[9px] text-gray-500">УГОЛ ФИКСАЦИИ: 45° // РОВНЫЙ СКОС</div>
                </div>
              </div>

              {/* Right Screen: Candidate Tool Specimen */}
              <div className="p-4 bg-[#05070e] border border-[#1b2645] rounded space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-purple-400 font-bold">ТЕСТОВЫЙ ОБРАЗЕЦ ИНСТРУМЕНТА</span>
                  <span className={`font-cyber font-bold ${matchScore >= 95 ? 'text-[#00ff88]' : 'text-amber-400'}`}>
                    СОВПАДЕНИЕ: {matchScore}%
                  </span>
                </div>

                <div className="h-40 bg-[#080d1a] border border-[#203058] rounded relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#c084fc_1px,transparent_1px)] [background-size:16px_16px]" />
                  
                  {/* Dynamic candidate cut shape reflecting angle & tool */}
                  {selectedTool ? (
                    <div
                      className={`w-24 h-24 transition-all duration-150 ${
                        selectedTool === 'pliers'
                          ? 'border-r-4 border-t-4 border-[#00ff88]'
                          : selectedTool === 'hacksaw'
                          ? 'border-r-4 border-dashed border-red-400'
                          : 'border-b-4 border-white'
                      }`}
                      style={{
                        transform: `rotate(${cutAngle}deg) scale(${magnification / 75})`,
                        opacity: magnification / 100
                      }}
                    />
                  ) : (
                    <span className="text-xs text-gray-600">Выберите инструмент ниже</span>
                  )}

                  <div className="absolute bottom-2 left-2 text-[9px] text-gray-500">
                    УГОЛ: {cutAngle}° // МАСШТАБ: {magnification}%
                  </div>
                </div>
              </div>
            </div>

            {/* Microscope Adjustments */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => { SoundFX.playClick(); setSelectedTool('hacksaw'); }}
                className={`p-3 rounded border text-left text-xs ${
                  selectedTool === 'hacksaw' ? 'bg-[#181122] border-purple-500 text-white' : 'bg-[#0d101c] border-[#1c233a] text-gray-400'
                }`}
              >
                <div className="font-bold">1. Слесарная ножовка</div>
                <div className="text-[10px] text-gray-500">Зубчатый рез 90°</div>
              </button>

              <button
                onClick={() => { SoundFX.playClick(); setSelectedTool('pliers'); }}
                className={`p-3 rounded border text-left text-xs ${
                  selectedTool === 'pliers' ? 'bg-[#181122] border-[#00ff88] text-white shadow-sm' : 'bg-[#0d101c] border-[#1c233a] text-gray-400'
                }`}
              >
                <div className="font-bold text-[#00ff88]">2. Монтажные кусачки</div>
                <div className="text-[10px] text-gray-500">Диагональные лезвия 45°</div>
              </button>

              <button
                onClick={() => { SoundFX.playClick(); setSelectedTool('knife'); }}
                className={`p-3 rounded border text-left text-xs ${
                  selectedTool === 'knife' ? 'bg-[#181122] border-purple-500 text-white' : 'bg-[#0d101c] border-[#1c233a] text-gray-400'
                }`}
              >
                <div className="font-bold">3. Канцелярский нож</div>
                <div className="text-[10px] text-gray-500">Тонкий плоский скол</div>
              </button>
            </div>

            {/* Sliders for Angle and Zoom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060810] p-4 rounded border border-[#1b2540]">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>УГОЛ НАКЛОНА ЛЕЗВИЯ:</span>
                  <span className="font-bold text-[#00f3ff]">{cutAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={cutAngle}
                  onChange={(e) => setCutAngle(Number(e.target.value))}
                  className="w-full accent-[#00f3ff] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>ФОКУС И УВЕЛИЧЕНИЕ МИКРОСКОПА:</span>
                  <span className="font-bold text-[#00f3ff]">{magnification}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={magnification}
                  onChange={(e) => setMagnification(Number(e.target.value))}
                  className="w-full accent-[#00f3ff] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleConfirmMicroscope}
                className="dr-btn dr-btn-primary py-2.5 px-6 text-xs font-cyber font-bold"
              >
                ЗАФИКСИРОВАТЬ ТРАСОЛОГИЧЕСКИЙ ВЕРДИКТ
              </button>

              {microscopeMessage && (
                <div className={`text-xs font-mono ${
                  microscopeMessage.startsWith('100%') ? 'text-[#00ff88]' : 'text-[#ff2a85]'
                }`}>
                  {microscopeMessage}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
