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
  Volume2,
  Gauge,
  Radio,
  Play,
  Check,
  Cpu,
  Flame,
  Scissors
} from 'lucide-react';
import { SoundFX } from '../SoundFX';
import RangeControl from '../RangeControl';
import MicroscopeSample from '../MicroscopeSample';

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
  const [circuitTiles, setCircuitTiles] = useState([
    { id: 0, label: 'АККУМУЛЯТОР 12V', rot: 90, targetRot: 0, type: 'source', desc: 'Первичный импульсный блок' },
    { id: 1, label: 'ШИНА ПИТАНИЯ', rot: 180, targetRot: 90, type: 'corner', desc: 'Угловой распределитель' },
    { id: 2, label: 'КОНДЕНСАТОР', rot: 270, targetRot: 180, type: 'straight', desc: 'Накопитель ёмкости' },
    { id: 3, label: 'РЕОСТАТ 0.1Ω', rot: 0, targetRot: 270, type: 'corner', desc: 'Катушка стабилизации' },
    { id: 4, label: 'ИМПУЛЬСАТОР', rot: 180, targetRot: 90, type: 'straight', desc: 'Быстродействующий тиристор' },
    { id: 5, label: 'ПОРОГОВАЯ ПЕТЛЯ', rot: 270, targetRot: 0, type: 'sink', desc: 'Выходной контакт на пороге' }
  ]);
  const [targetVoltage, setTargetVoltage] = useState(600); // Need >= 1200V
  const [circuitMessage, setCircuitMessage] = useState('');
  const [isSparking, setIsSparking] = useState(false);

  // Compute live energized path from Source
  const isNode0Powered = circuitTiles[0].rot === circuitTiles[0].targetRot;
  const isNode1Powered = isNode0Powered && circuitTiles[1].rot === circuitTiles[1].targetRot;
  const isNode2Powered = isNode1Powered && circuitTiles[2].rot === circuitTiles[2].targetRot;
  const isNode5Powered = isNode2Powered && circuitTiles[5].rot === circuitTiles[5].targetRot;
  const isNode4Powered = isNode5Powered && circuitTiles[4].rot === circuitTiles[4].targetRot;
  const isNode3Powered = isNode4Powered && circuitTiles[3].rot === circuitTiles[3].targetRot;

  const nodePowerMap = {
    0: isNode0Powered,
    1: isNode1Powered,
    2: isNode2Powered,
    3: isNode3Powered,
    4: isNode4Powered,
    5: isNode5Powered
  };

  const handleRotateTile = (idx) => {
    SoundFX.playRotate();
    setCircuitTiles(prev => prev.map((t, i) => i === idx ? { ...t, rot: (t.rot + 90) % 360 } : t));
    setCircuitMessage('');
  };

  const isCircuitAligned = circuitTiles.every(t => t.rot === t.targetRot);

  const handleTestCircuit = () => {
    SoundFX.playClick();
    if (!isCircuitAligned) {
      SoundFX.playAccessDenied();
      setCircuitMessage('ОШИБКА РАЗМЫКАНИЯ: Контур проводников не замкнут! Проверьте ориентацию светящихся шин.');
      return;
    }
    if (targetVoltage < 1200) {
      SoundFX.playAccessDenied();
      setCircuitMessage(`НЕДОСТАТОЧНОЕ НАПРЯЖЕНИЕ (${targetVoltage}V): Для мгновенного оглушения жертвы требуется импульс от 1200V!`);
      return;
    }

    setIsSparking(true);
    SoundFX.playAccessGranted();
    setTimeout(() => setIsSparking(false), 1200);

    setCircuitMessage('УСПЕХ! Импульс 1200V пробит через порог! Жертва потеряла сознание при входе.');
    markPuzzleSolved('circuit');
  };

  // =========================================================================
  // PUZZLE 2: 🧹 УФ-СКАНИРОВАНИЕ (ДВУХФАЗНЫЙ АНАЛИЗ: ЛЮМИНОЛ + СПЕКТРОМЕТРИЯ)
  // =========================================================================
  const [selectedToolUv, setSelectedToolUv] = useState('luminol'); // 'luminol' | 'uv_lamp' | 'spectrometer'
  const [uvLampOn, setUvLampOn] = useState(false);
  const [analyzingSectorKey, setAnalyzingSectorKey] = useState(null);
  const [sectorStates, setSectorStates] = useState({
    sec_threshold: {
      name: 'СЕКТОР #01: Порог мусоросжигателя',
      location: 'Входная дверь',
      sprayed: false,
      scanned: false,
      type: 'blood_footprint',
      label: 'След подошвы 38 размера (Кровь жертвы)',
      wavelength: '415 нм (Гемоглобин)',
      details: 'Чёткий контур каблука женской туфли 38 размера, оставленный в луже смытой крови.',
      decoy: false,
      color: '#6ddce5'
    },
    sec_drain: {
      name: 'СЕКТОР #02: Плитка у дренажного слива',
      location: 'Центр комнаты',
      sprayed: false,
      scanned: false,
      type: 'blood_streak',
      label: 'Смытая полоса крови жертвы',
      wavelength: '415 нм (Гемоглобин)',
      details: 'Длинный размазанный след волочения, замытый влажной тканью у решётки.',
      decoy: false,
      color: '#6ddce5'
    },
    sec_mop: {
      name: 'СЕКТОР #03: Рукоятка швабры в подсобке',
      location: 'Шкаф инвентаря',
      sprayed: false,
      scanned: false,
      type: 'silk_fibers',
      label: 'Микроволокна перчаток зачернённого',
      wavelength: '385 нм (Синтетический шёлк)',
      details: 'Тончайшие шёлковые волокна от перчаток убийцы, прилипшие к зажиму рукоятки.',
      decoy: false,
      color: '#c084fc'
    },
    sec_furnace: {
      name: 'СЕКТОР #04: Люк мусорной печи',
      location: 'Термокамера',
      sprayed: false,
      scanned: false,
      type: 'decoy_soot',
      label: 'Угольная сажа (Ложный след)',
      wavelength: 'Н/Д (Углеродная сажа)',
      details: 'Углеродные частицы гари после утилизации мусора. Люминесценция отсутствует.',
      decoy: true,
      color: '#64748b'
    },
    sec_crate: {
      name: 'СЕКТОР #05: Угол за железным ящиком',
      location: 'Складской угол',
      sprayed: false,
      scanned: false,
      type: 'decoy_oil',
      label: 'Машинное масло (Ложный след)',
      wavelength: '530 нм (Углеводороды)',
      details: 'Отработанное минеральное масло от сервоприводов вентиляции.',
      decoy: true,
      color: '#eab308'
    },
    sec_bucket: {
      name: 'СЕКТОР #06: Ведро с чистящей пеной',
      location: 'Рядом со шваброй',
      sprayed: false,
      scanned: false,
      type: 'decoy_soap',
      label: 'Фосфатная мыльная пена (Ложный след)',
      wavelength: '470 нм (Фосфаты)',
      details: 'Щелочной раствор поверхностно-активных веществ (ПАВ).',
      decoy: true,
      color: '#93c5fd'
    }
  });
  const [uvMessage, setUvMessage] = useState('');

  const handleInteractSector = (secKey) => {
    SoundFX.playClick();
    const current = sectorStates[secKey];

    if (selectedToolUv === 'luminol') {
      // Spray luminol reagent
      setSectorStates(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], sprayed: true }
      }));
      setUvMessage(`Реагент Люминола нанесён на [${current.name}]. Включите УФ-лампу для вызова флуоресценции!`);
    } else {
      // Spectrometer analysis
      if (!current.sprayed) {
        SoundFX.playAccessDenied();
        setUvMessage('ОШИБКА: Сначала распылите реагент Люминола на эту зону!');
        return;
      }
      if (!uvLampOn) {
        SoundFX.playAccessDenied();
        setUvMessage('ОШИБКА: Включите УФ-лампу (365 нм), чтобы зафиксировать длину волны излучения!');
        return;
      }

      setAnalyzingSectorKey(secKey);
      const isDecoy = current.decoy;

      setSectorStates(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], scanned: true }
      }));

      if (isDecoy) {
        SoundFX.playAccessDenied();
        setUvMessage(`СПЕКТРАЛЬНЫЙ АНАЛИЗ: ${current.label} (${current.wavelength}). Это постороннее загрязнение, а не след крови!`);
      } else {
        SoundFX.playAccessGranted();
        setUvMessage(`ВЕЩДОК ЗАФИКСИРОВАН: ${current.label} [Длина волны: ${current.wavelength}]!`);
      }

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
  // PUZZLE 3: ⏱️ ТАЙМЛАЙН (ТОЧНАЯ СЕТКА ВРЕМЕНИ С СИМУЛЯЦИЕЙ)
  // =========================================================================
  const timelineEvents = [
    {
      id: 'E_WAREHOUSE',
      title: 'Сбор деталей в складском отсеке',
      targetTime: '21:32',
      icon: '📦',
      tag: 'ПОДГОТОВКА',
      desc: 'Взяты аккумулятор 12V, медный провод и пластиковые стяжки из ящика запчастей.'
    },
    {
      id: 'E_WORKBENCH',
      title: 'Крафт электроловушки на верстаке',
      targetTime: '21:35',
      icon: '🛠️',
      tag: 'МОНТАЖ',
      desc: 'Сборка импульсатора и взвод храпового механизма капкана на верстаке мастерской.'
    },
    {
      id: 'E_HANDOVER',
      title: 'Тайная передача капкана сообщнику',
      targetTime: '21:38',
      icon: '🤝',
      tag: 'СГОВОР',
      desc: 'Встреча у ящиков склада. Убийца передаёт капкан: «Беги со всех ног и не оглядывайся!»'
    },
    {
      id: 'E_ZAP',
      title: 'Электрический разряд на пороге',
      targetTime: '21:40',
      icon: '⚡',
      tag: 'ЛОВУШКА',
      desc: 'Жертва наступает на порог мусоросжигателя. Импульс 1200V вызывает мгновенную потерю сознания.'
    },
    {
      id: 'E_TALK',
      title: 'Связывание и 30-секундный разговор',
      targetTime: '21:41',
      icon: '💬',
      tag: 'ДИАЛОГ',
      desc: 'Жертву обездвиживают стяжками. Очнувшись, она успевает задать вопрос убийце.'
    },
    {
      id: 'E_MOP',
      title: 'Захлопывание капкана и уборка пола',
      targetTime: '21:43',
      icon: '🧹',
      tag: 'СОКРЫТИЕ',
      desc: 'Финальный удар капканом. Убийца тщательно промывает кафель шваброй с мыльным раствором.'
    }
  ];

  const [timelineOrder, setTimelineOrder] = useState([
    'E_ZAP', 'E_WAREHOUSE', 'E_MOP', 'E_HANDOVER', 'E_TALK', 'E_WORKBENCH'
  ]);
  const [timelineFeedback, setTimelineFeedback] = useState('');
  const [timelineAnnouncement, setTimelineAnnouncement] = useState('');
  const movedTimelineControl = useRef(null);
  useEffect(() => {
    const control = movedTimelineControl.current;
    if (control?.isConnected) {
      (control.disabled ? control.parentElement.querySelector('button:not(:disabled)') : control)?.focus();
    }
  }, [timelineOrder]);
  const [isSimulatingTimeline, setIsSimulatingTimeline] = useState(false);
  const [simulatedIndex, setSimulatedIndex] = useState(-1);

  const moveTimelineItem = (index, direction, control) => {
    movedTimelineControl.current = control;
    SoundFX.playClick();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= timelineOrder.length) return;
    const copy = [...timelineOrder];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setTimelineOrder(copy);
    setTimelineAnnouncement(`Событие «${timelineEvents.find(e => e.id === temp)?.title}» перемещено на позицию ${targetIndex + 1} из ${copy.length}.`);
    setTimelineFeedback('');
  };

  const handleVerifyTimeline = () => {
    SoundFX.playClick();
    const correctSeq = ['E_WAREHOUSE', 'E_WORKBENCH', 'E_HANDOVER', 'E_ZAP', 'E_TALK', 'E_MOP'];
    const matches = timelineOrder.filter((id, idx) => id === correctSeq[idx]).length;

    setIsSimulatingTimeline(true);
    let step = 0;
    const interval = setInterval(() => {
      setSimulatedIndex(step);
      SoundFX.playClick();
      step++;
      if (step >= timelineOrder.length) {
        clearInterval(interval);
        setIsSimulatingTimeline(false);
        setSimulatedIndex(-1);

        if (matches === 6) {
          SoundFX.playAccessGranted();
          setTimelineFeedback('');
          markPuzzleSolved('timeline');
        } else {
          SoundFX.playAccessDenied();
          setTimelineFeedback(`ХРОНОЛОГИЯ НАРУШЕНА: Верно расставлено только ${matches} из 6 событий. Сверьтесь с протоколом подготовки и совершения убийства!`);
        }
      }
    }, 280);
  };

  // =========================================================================
  // PUZZLE 4: ⚙️ СПУСКОВОЙ МЕХАНИЗМ КАПКАНА (КРИПТОГРАФИЧЕСКИЙ РЕГУЛЯТОР)
  // =========================================================================
  const [dialSector, setDialSector] = useState(1); // Target: 4
  const [dialSeconds, setDialSeconds] = useState(15); // Target: 30
  const [dialWolf, setDialWolf] = useState(1); // Target: 4
  const [springTension, setSpringTension] = useState(50); // Need 70-80%
  const [trapMessage, setTrapMessage] = useState('');
  const [isTrapOpen, setIsTrapOpen] = useState(Boolean(solvedPuzzles.trap));

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

    setIsTrapOpen(true);
    SoundFX.playAccessGranted();
    setTrapMessage('ЩЕЛЧОК! Зубья капкана раскрыты! Из пружины механизма извлечены микроволокна перчаток зачернённого.');
    markPuzzleSolved('trap');
  };

  // =========================================================================
  // PUZZLE 5: ✂️ ВЕРСТАК (СПЛИТ-СКРИН МИКРОСКОП СРАВНЕНИЯ МИКРОРЕЛЬЕФА)
  // =========================================================================
  const [selectedTool, setSelectedTool] = useState(null);
  const [cutAngle, setCutAngle] = useState(15); // Target: 45 deg
  const [magnification, setMagnification] = useState(50); // Target: 80%+
  const [microscopeFocus, setMicroscopeFocus] = useState(60);
  const [overlayBlend, setOverlayBlend] = useState(0); // 0 = split, 100 = overlay
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
      SoundFX.playAccessGranted();
      setMicroscopeMessage('100% ТРАСОЛОГИЧЕСКОЕ СОВПАДЕНИЕ! Монтажные кусачки с верстака оставили диагональный срез 45° на стяжках жертвы и медном кабеле.');
      markPuzzleSolved('workbench');
    } else {
      SoundFX.playAccessDenied();
      setMicroscopeMessage(`НЕСООТВЕТСТВИЕ МИКРОРЕЛЬЕФА (${matchScore}%): Бороздки режущей кромки не совпадают! Настройте угол среза до 45° и увеличьте фокус.`);
    }
  };

  return (
    <div className="forensic-lab space-y-6 max-w-5xl mx-auto">

      {/* Toast Notification */}
      {rewardToast && (
        <div className="reward-toast fixed bottom-5 right-5 z-50 p-4 bg-[#142618] border-2 border-[#78dfa7] text-[#78dfa7] font-interface text-sm rounded shadow-[0_0_25px_rgba(120,223,167,0.5)]  flex items-center gap-3">
          <Award size={20} className="text-[#78dfa7]" />
          <span className="font-bold tracking-wider">{rewardToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="cyber-panel p-5 bg-[#0b0e17] border-2 border-[#6ddce5]/40 shadow-[0_0_20px_rgba(109,220,229,0.12)] relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2542] pb-3 mb-4">
          <div>
            <span className="text-sm font-interface text-[#6ddce5] uppercase tracking-wider block">
              КРИМИНАЛИСТИЧЕСКАЯ ЭКСПЕРТИЗА // РАССЛЕДОВАНИЕ ВЕЩДОКОВ
            </span>
            <h2 className="text-xl sm:text-2xl font-interface font-bold text-white flex items-center gap-2">
              <Zap className="text-[#ff2a85]" size={22} />
              <span>Лаборатория улик</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPuzzles}
              className="text-sm font-interface text-gray-500 hover:text-gray-300 underline flex items-center gap-1"
            >
              <RotateCcw size={11} />
              <span>Сбросить</span>
            </button>
            <span className="px-3 py-1 text-sm font-interface font-bold tracking-wider rounded border border-[#78dfa7] bg-[#78dfa7]/15 text-[#78dfa7]">
              РЕШЕНО: {solvedCount} / 5
            </span>
          </div>
        </div>

        <p className="text-sm font-interface text-gray-300 leading-relaxed mb-4">
          Исследуйте улики и соберите фрагменты имени для итогового вердикта.
        </p>

        {/* Letters Progress Bar (Dynamic from Server) */}
        <div className="p-3.5 bg-[#070a12] border border-[#1d2745] rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-interface text-gray-400 mb-2">
            <span className="flex items-center gap-1.5 text-[#6ddce5] font-bold">
              <Sparkles size={14} className="text-[#6ddce5]" />
              <span>Собранные фрагменты имени</span>
            </span>
            <span className="text-sm text-gray-500 font-interface">
              {solvedCount} из 5
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 max-w-lg mx-auto py-1">
            {puzzleSlots.map((slot, idx) => {
              const isRevealed = Boolean(solvedPuzzles[slot.id]);
              const letterVal = labLetters[slot.id];
              return (
                <div
                  key={slot.id}
                  className={`flex-1 min-w-0 h-12 rounded border flex flex-col items-center justify-center font-interface font-bold transition-all ${
                    isRevealed
                      ? 'bg-[#78dfa7]/15 border-[#78dfa7] text-[#78dfa7] shadow-[0_0_15px_rgba(120,223,167,0.3)] scale-105 text-base sm:text-lg'
                      : 'bg-[#0e1322] border-[#222c47] text-gray-600 text-sm'
                  }`}
                >
                  <span className="tracking-widest">{isRevealed ? (letterVal || '...') : '■'}</span>
                  <span className="text-sm font-interface text-gray-500">#{idx + 1}</span>
                </div>
              );
            })}
          </div>

          {solvedCount >= 4 && (
            <div className="mt-3 text-center">
              <button
                onClick={onNavigateToReconstruction}
                className="dr-btn dr-btn-primary py-2 px-6 text-sm font-interface font-bold flex items-center justify-center gap-2 mx-auto"
              >
                <span>ПЕРЕЙТИ К ФИНАЛЬНОЙ РЕКОНСТРУКЦИИ ИМЕНИ</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <label className="puzzle-select" htmlFor="active-analysis">Анализ улики
        <select id="active-analysis" aria-label="Анализ улики" value={activePuzzleId} onChange={(e) => { setActivePuzzleId(e.target.value); SoundFX.playNavigate(); }}>
          {puzzleSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.hint}{solvedPuzzles[slot.id] ? ' — завершено' : ''}</option>)}
        </select>
      </label>
      {/* Puzzle Tabs Navigation */}
      <div className="puzzle-tabs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-sm font-interface">
        <button
          onClick={() => { SoundFX.playNavigate(); setActivePuzzleId('circuit'); }}
          aria-pressed={activePuzzleId === 'circuit'}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            activePuzzleId === 'circuit'
              ? 'bg-[#151f38] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[#6ddce5] font-bold">#1 ЭЛЕКТРОЦЕПЬ</span>
            {solvedPuzzles.circuit && <CheckCircle2 size={13} className="text-gray-400" />}
          </div>
          <div className="font-semibold">Ротация узлов</div>
        </button>

        <button
          onClick={() => { SoundFX.playNavigate(); setActivePuzzleId('uv'); }}
          aria-pressed={activePuzzleId === 'uv'}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            activePuzzleId === 'uv'
              ? 'bg-[#151f38] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 font-bold">#2 УФ-СКАНИРОВАНИЕ</span>
            {solvedPuzzles.uv && <CheckCircle2 size={13} className="text-gray-400" />}
          </div>
          <div className="font-semibold">Люминол и спектр</div>
        </button>

        <button
          onClick={() => { SoundFX.playNavigate(); setActivePuzzleId('timeline'); }}
          aria-pressed={activePuzzleId === 'timeline'}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            activePuzzleId === 'timeline'
              ? 'bg-[#151f38] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 font-bold">#3 ТАЙМЛАЙН</span>
            {solvedPuzzles.timeline && <CheckCircle2 size={13} className="text-gray-400" />}
          </div>
          <div className="font-semibold">Сетка таймингов</div>
        </button>

        <button
          onClick={() => { SoundFX.playNavigate(); setActivePuzzleId('trap'); }}
          aria-pressed={activePuzzleId === 'trap'}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            activePuzzleId === 'trap'
              ? 'bg-[#151f38] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 font-bold">#4 КАПКАН</span>
            {solvedPuzzles.trap && <CheckCircle2 size={13} className="text-gray-400" />}
          </div>
          <div className="font-semibold">Храповик и натяжение</div>
        </button>

        <button
          onClick={() => { SoundFX.playNavigate(); setActivePuzzleId('workbench'); }}
          aria-pressed={activePuzzleId === 'workbench'}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            activePuzzleId === 'workbench'
              ? 'bg-[#151f38] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
              : 'bg-[#0a0d17] border-[#1b233a] text-gray-400 hover:bg-[#0f1424]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 font-bold">#5 ВЕРСТАК</span>
            {solvedPuzzles.workbench && <CheckCircle2 size={13} className="text-gray-400" />}
          </div>
          <div className="font-semibold">Микроскоп среза</div>
        </button>
      </div>

      <p className="lab-purpose">Выберите анализ, исследуйте образец и зафиксируйте заключение.</p>
      {/* Active Puzzle Workspace */}
      <div className="lab-workspace cyber-panel p-6 bg-[#090c15] border border-[#202945] rounded-xl font-interface">

        {/* ================================================================= */}
        {/* PUZZLE 1: CIRCUIT ROTATION (CYBER PCB BOARD) */}
        {/* ================================================================= */}
        {activePuzzleId === 'circuit' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-sm text-[#6ddce5] font-bold uppercase">ВЕЩДОК: ОСТАТКИ ЭЛЕКТРОЛОВУШКИ</span>
                <h3 className="text-lg font-interface font-bold text-white">
                  Ротация узлов электроцепи и балансировка напряжения
                </h3>
              </div>
              <span className="text-sm bg-[#6ddce5]/10 text-[#6ddce5] px-2.5 py-1 rounded border border-[#6ddce5]/30 font-bold">
                Заключение анализа
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              На пороге мусоросжигателя обнаружен импульсный разрядник. Поворачивайте узлы нажатием, чтобы соединить сплошную светящуюся неоновую шину от аккумулятора к порогу, и отрегулируйте напряжение импульса до поражающего значения (≥1200V).
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive Rotatable PCB Board */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-400 font-bold">
                  <span>Плата управления</span>
                  <span className="text-[#6ddce5] text-sm">
                    {isCircuitAligned ? '✓ ЦЕПЬ ЗАМКНУТА' : '⚠ ОБРЫВ КОНТУРА'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-[#060a14] border-2 border-[#1c2848] rounded-xl relative shadow-inner">
                  {circuitTiles.map((tile, idx) => {
                    const isPowered = Boolean(nodePowerMap[idx]);


                    return (
                      <button
                        key={tile.id}
                        aria-label={`${tile.label}, угол ${tile.rot}°. Повернуть на 90°`}
                        onClick={() => handleRotateTile(idx)}
                        className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                          isPowered
                            ? 'bg-[#0f1d35] border-[#6ddce5] text-[#6ddce5] shadow-[0_0_15px_rgba(109,220,229,0.3)]'
                            : 'bg-[#070b14] border-[#182138] text-gray-500 hover:border-gray-500'
                        }`}
                      >
                        {/* Status Power Pill */}
                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                          isPowered ? 'bg-[#78dfa7] shadow-[0_0_6px_#78dfa7]' : 'bg-gray-700'
                        }`} />

                        {/* Interactive SVG Node Graphic */}
                        <div
                          className="w-14 h-14 transition-transform duration-300 flex items-center justify-center"
                          style={{ transform: `rotate(${tile.rot}deg)` }}
                        >
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Circuit substrate */}
                            <rect x="5" y="5" width="90" height="90" rx="8" fill="#090f1d" stroke={isPowered ? "#6ddce5" : "#1a2540"} strokeWidth="2" />
                            <circle cx="50" cy="50" r="8" fill={isPowered ? "#78dfa7" : "#223150"} />

                            {/* Conduit tracks depending on component type */}
                            {tile.type === 'straight' && (
                              <g>
                                <line x1="0" y1="50" x2="100" y2="50" stroke={isPowered ? "#6ddce5" : "#3b4d75"} strokeWidth="8" strokeLinecap="round" />
                                {isPowered && (
                                  <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 6" className="animate-pulse" />
                                )}
                              </g>
                            )}

                            {tile.type === 'corner' && (
                              <g>
                                <path d="M 0 50 L 50 50 L 50 100" fill="none" stroke={isPowered ? "#6ddce5" : "#3b4d75"} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                {isPowered && (
                                  <path d="M 0 50 L 50 50 L 50 100" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 6" className="animate-pulse" />
                                )}
                              </g>
                            )}

                            {tile.type === 'source' && (
                              <g>
                                <rect x="25" y="30" width="30" height="40" rx="4" fill={isPowered ? "#ff2a85" : "#451a2f"} />
                                <line x1="55" y1="50" x2="100" y2="50" stroke={isPowered ? "#6ddce5" : "#3b4d75"} strokeWidth="8" strokeLinecap="round" />
                                <text x="40" y="55" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">⚡</text>
                              </g>
                            )}

                            {tile.type === 'sink' && (
                              <g>
                                <line x1="0" y1="50" x2="50" y2="50" stroke={isPowered ? "#6ddce5" : "#3b4d75"} strokeWidth="8" strokeLinecap="round" />
                                <polygon points="50,30 80,50 50,70" fill={isPowered ? "#78dfa7" : "#214732"} />
                              </g>
                            )}
                          </svg>
                        </div>

                        <div className="text-center w-full">
                          <span className="text-sm font-bold block">{['12 В', 'Шина', 'Ёмкость', 'Реостат', 'Импульс', 'Выход'][idx]}</span>
                          <span className="text-sm text-gray-500 font-interface">{tile.rot}°</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voltage Balance & Oscilloscope Display */}
              <div className="space-y-4 bg-[#060812] p-5 rounded-xl border border-[#1b2645] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap size={15} className="text-amber-400" />
                      <span>Импульсное напряжение</span>
                    </span>
                    <span className={`font-interface font-bold text-lg ${
                      targetVoltage >= 1200 ? 'text-[#78dfa7]' : 'text-amber-400'
                    }`}>
                      {targetVoltage} V
                    </span>
                  </div>

                  <RangeControl label="Напряжение импульса" value={targetVoltage} min={200} max={1800} step={100} unit="В" onChange={setTargetVoltage} />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>200V (Слабо)</span>
                    <span className="text-[#78dfa7] font-bold">1200V (Порог оглушения)</span>
                    <span>1800V (Перегрузка)</span>
                  </div>

                  {/* Real-time Oscilloscope Waveform Display */}
                  <div className="mt-4 p-3 bg-[#03060c] border border-[#18233c] rounded-lg">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-1.5 font-interface">
                      <span>ОСЦИЛЛОГРАФ ИМПУЛЬСА (V/t):</span>
                      <span className={targetVoltage >= 1200 ? 'text-[#78dfa7]' : 'text-amber-400'}>
                        {targetVoltage >= 1200 ? '⚡ КРИТИЧЕСКИЙ РАЗРЯД' : 'Низкий импульс'}
                      </span>
                    </div>

                    <div className="h-20 bg-[#020408] border border-[#141d30] rounded relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6ddce5_1px,transparent_1px)] [background-size:12px_12px]" />

                      {/* Dynamic SVG Waveform */}
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 80">
                        <path
                          d={`M 0 40 Q 30 ${40 - (targetVoltage / 40)}, 60 40 T 120 40 T 180 40 T 240 40 T 300 40`}
                          fill="none"
                          stroke={targetVoltage >= 1200 ? (isCircuitAligned ? "#78dfa7" : "#6ddce5") : "#eab308"}
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        {isSparking && (
                          <line x1="0" y1="40" x2="300" y2="40" stroke="#ffffff" strokeWidth="6" strokeDasharray="10 5" className="animate-ping" />
                        )}
                      </svg>
                    </div>

                    <div className="mt-2 text-sm text-gray-400 flex items-center justify-between">
                      <span>Статус контура:</span>
                      <strong className={isCircuitAligned ? 'text-[#78dfa7]' : 'text-amber-400'}>
                        {isCircuitAligned ? 'ШИНА ЗАМКНУТА (ТОК ТЕЧЁТ)' : 'ОБРЫВ ПРОВОДНИКА'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleTestCircuit}
                    className="w-full dr-btn dr-btn-primary py-3 text-sm font-interface font-bold flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(255,42,133,0.35)]"
                  >
                    <Zap size={16} />
                    <span>ПРОИЗВЕСТИ ИМПУЛЬСНЫЙ РАЗРЯД</span>
                  </button>

                  {circuitMessage && (
                    <div className={`p-2.5 rounded text-sm border font-interface animate-fade-in ${
                      circuitMessage.startsWith('УСПЕХ')
                        ? 'bg-[#78dfa7]/15 border-[#78dfa7] text-[#78dfa7]'
                        : 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                    }`} role="status" aria-live="polite">
                      {circuitMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 2: DUAL-PHASE UV & LUMINOL CRIME SCENE INVESTIGATION */}
        {/* ================================================================= */}
        {activePuzzleId === 'uv' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-sm text-[#ff2a85] font-bold uppercase">ВЕЩДОК: ШВАБРА И СМЫТЫЙ ПОЛ</span>
                <h3 className="text-lg font-interface font-bold text-white">
                  Двухфазный анализ: люминол + уф-спектрометрия (365 нм)
                </h3>
              </div>
              <span className="text-sm bg-[#ff2a85]/15 text-[#ff2a85] px-2.5 py-1 rounded border border-[#ff2a85]/40 font-bold">
                Заключение анализа
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Убийца вымыл кафельный пол шваброй, пытаясь уничтожить следы преступления.
              <br />
              1. <strong>Нанесите Люминол</strong> на подозрительные зоны, чтобы вызвать хемилюминесцентную реакцию с белками крови.
              <br />
              2. <strong>Включите УФ-лампу</strong> для возбуждения флуоресценции и <strong>считайте спектрометром</strong> пик гемоглобина (415 нм), отсеяв сажу, пену и машинное масло!
            </p>

            {/* Tactical Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070914] p-3 border border-[#1b2645] rounded-xl font-interface text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-400 font-bold">РЕЖИМ ОБСЛЕДОВАНИЯ:</span>
                <button
                  onClick={() => { SoundFX.playScan(); setSelectedToolUv('luminol'); }} aria-pressed={selectedToolUv === 'luminol'}
                  className={`px-3 py-1.5 rounded text-sm font-bold border transition-all flex items-center gap-1.5 ${
                    selectedToolUv === 'luminol'
                      ? 'bg-[#6ddce5]/20 border-[#6ddce5] text-[#6ddce5] shadow-[0_0_12px_rgba(109,220,229,0.3)]'
                      : 'bg-[#111728] border-gray-700 text-gray-400'
                  }`}
                >
                  <span>🧪 1. ПУЛЬВЕРИЗАТОР ЛЮМИНОЛА</span>
                </button>
                <button
                  onClick={() => { SoundFX.playScan(); setSelectedToolUv('spectrometer'); }} aria-pressed={selectedToolUv === 'spectrometer'}
                  className={`px-3 py-1.5 rounded text-sm font-bold border transition-all flex items-center gap-1.5 ${
                    selectedToolUv === 'spectrometer'
                      ? 'bg-[#c084fc]/20 border-[#c084fc] text-[#c084fc] shadow-[0_0_12px_rgba(192,132,252,0.3)]'
                      : 'bg-[#111728] border-gray-700 text-gray-400'
                  }`}
                >
                  <Activity size={14} />
                  <span>2. УФ-СПЕКТРОМЕТР (АНАЛИЗАТОР)</span>
                </button>
              </div>

              {/* UV Flashlight Toggle */}
              <button aria-pressed={uvLampOn} aria-label="УФ-лампа"
                onClick={() => {
                  SoundFX.playClick();
                  setUvLampOn(prev => !prev);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-interface font-bold border flex items-center gap-2 transition-all ${
                  uvLampOn
                    ? 'bg-[#9333ea] border-[#c084fc] text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] animate-pulse'
                    : 'bg-[#161b2e] border-[#29385c] text-gray-300 hover:text-white'
                }`}
              >
                <span>🟣</span>
                <span>{uvLampOn ? 'УФ-ЛАМПА: ВКЛЮЧЕНА (365 нм)' : 'ВКЛЮЧИТЬ УФ-ЛАМПУ'}</span>
              </button>
            </div>

            {/* Crime Scene Isometric Interactive Blueprint */}
            <div className={`p-4 rounded-xl border transition-all duration-300 relative ${
              uvLampOn
                ? 'bg-[#060411] border-[#9333ea]/60 shadow-[0_0_30px_rgba(147,51,234,0.2)]'
                : 'bg-[#080c18] border-[#1b2542]'
            }`}>
              {uvLampOn && (
                <div className="mb-3 text-sm text-purple-300 font-interface flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span>УФ-ПОЛЕ АКТИВНО // ФЛУОРЕСЦЕНЦИЯ ВИДИМА</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(sectorStates).map(([key, sec]) => {
                  const isDecoy = sec.decoy;
                  const isGlowing = uvLampOn && sec.sprayed;

                  return (
                    <button
                      key={key}
                      onClick={() => handleInteractSector(key)}
                      className={`p-4 rounded-xl border text-left space-y-2 transition-all relative overflow-hidden group ${
                        isGlowing
                          ? isDecoy
                            ? 'bg-[#1c1214] border-amber-600/60 shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                            : 'bg-[#071d2b] border-[#6ddce5] shadow-[0_0_20px_rgba(109,220,229,0.4)] scale-[1.02]'
                          : sec.sprayed
                          ? 'bg-[#101426] border-[#304169] text-gray-300'
                          : 'bg-[#0a0e1c] border-[#18233c] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-white">{sec.name}</span>
                        {sec.scanned && (
                          <span className={isDecoy ? 'text-red-400' : 'text-[#78dfa7]'}>
                            {isDecoy ? 'ЛОЖНО' : '✓ ВЕЩДОК'}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-400 font-interface">
                        Локация: <span className="text-gray-300">{sec.location}</span>
                      </div>

                      {/* Visual Crime Scene Graphic / Glowing Stain */}
                      <div className={`h-16 rounded border flex items-center justify-center p-2 text-center text-sm transition-all relative ${
                        isGlowing
                          ? isDecoy
                            ? 'bg-[#291b0c] border-amber-500/40 text-amber-300'
                            : 'bg-[#042035] border-[#6ddce5] text-[#6ddce5]'
                          : 'bg-[#05070e] border-[#151d30] text-gray-600'
                      }`}>
                        {isGlowing ? (
                          <div className="space-y-0.5 animate-pulse">
                            <span className="text-sm block">✨</span>
                            <span className="font-bold text-sm block">{sec.type === 'blood_footprint' ? 'ОТПЕЧАТОК 38Р' : sec.type === 'blood_streak' ? 'СМЫТАЯ КРОВЬ' : sec.type === 'silk_fibers' ? 'БЕЛЫЕ ВОЛОКНА' : 'МАСЛО / САЖА'}</span>
                            <span className="text-sm text-gray-400">{sec.wavelength}</span>
                          </div>
                        ) : sec.sprayed ? (
                          <span className="text-sm text-purple-300">Люминол нанесён (нужна УФ-лампа)</span>
                        ) : (
                          <span className="text-sm text-gray-500">Не обработано (клик для распыления)</span>
                        )}
                      </div>

                      <div className="text-sm text-gray-400 leading-tight">
                        {sec.scanned ? sec.details : 'Клик: использовать активный инструмент'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {uvMessage && (
              <div className={`p-3 rounded-lg text-sm font-interface border animate-fade-in ${
                uvMessage.includes('ВЕЩДОК ЗАФИКСИРОВАН')
                  ? 'bg-[#78dfa7]/15 border-[#78dfa7] text-[#78dfa7]'
                  : uvMessage.includes('ОШИБКА') || uvMessage.includes('ЛОЖНЫЙ')
                  ? 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                  : 'bg-[#0d1425] border-[#233355] text-gray-200'
              }`} role="status" aria-live="polite">
                {uvMessage}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 3: TIMELINE (CHRONO-SEQUENCER EVIDENCE TAPE) */}
        {/* ================================================================= */}
        {activePuzzleId === 'timeline' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-sm text-amber-400 font-bold uppercase">ВЕЩДОК: ХРОНОЛОГИЯ ПРЕСТУПЛЕНИЯ</span>
                <h3 className="text-lg font-interface font-bold text-white">
                  Реконструкция сетки времени // хроно-лента (21:32 ➜ 21:43)
                </h3>
              </div>
              <span className="text-sm bg-amber-400/15 text-amber-300 px-2.5 py-1 rounded border border-amber-400/40 font-bold">
                Заключение анализа
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Расставьте 6 ключевых действий убийцы в строгой последовательности, сопоставив их с поминутным хронометражем следствия. Используйте кнопки ▲ и ▼ для перемещения событий.
            </p>

            <p className="sr-only" role="status" aria-live="polite">{timelineAnnouncement}</p>
            {/* Chrono-Tape Sequence */}
            <div className="space-y-3 relative">
              <div className="absolute left-6 top-4 bottom-4 w-1 bg-[#1a2542] -z-0" />

              {timelineOrder.map((eventId, index) => {
                const event = timelineEvents.find(e => e.id === eventId);
                const assignedTimes = ['21:32', '21:35', '21:38', '21:40', '21:41', '21:43'];
                const assignedTime = assignedTimes[index];
                const isCorrectSlot = Boolean(solvedPuzzles.timeline) && event.targetTime === assignedTime;
                const isCurrentSimulated = simulatedIndex === index;

                return (
                  <div
                    key={eventId}
                    className={`timeline-item flex items-center justify-between p-3.5 rounded-xl border transition-all relative z-10 ${
                      isCurrentSimulated
                        ? 'bg-[#182a4d] border-[#6ddce5] shadow-[0_0_20px_rgba(109,220,229,0.4)] scale-[1.02]'
                        : isCorrectSlot
                        ? 'bg-[#0b1726] border-[#78dfa7]/50 shadow-[0_0_10px_rgba(120,223,167,0.15)]'
                        : 'bg-[#0a0e1c] border-[#1d2745] hover:border-[#6ddce5]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Time Marker Badge */}
                      <div className="flex flex-col items-center">
                        <span className="w-12 h-10 rounded-lg bg-[#141d33] border border-[#233358] text-amber-400 font-bold font-interface text-sm flex items-center justify-center shadow">
                          {assignedTime}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{event.icon}</span>
                          <span className="text-sm text-white font-bold">{event.title}</span>
                          <span className="text-sm bg-[#162038] text-gray-400 px-2 py-0.5 rounded border border-[#25355a]">
                            {event.tag}
                          </span>
                          {isCorrectSlot && (
                            <span className="text-sm text-[#78dfa7] font-bold">✓ ВЕРНО</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 leading-tight">
                          {event.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        aria-label={`Выше: ${event.title}`} onClick={(e) => moveTimelineItem(index, -1, e.currentTarget)}
                        disabled={index === 0 || isSimulatingTimeline}
                        className="p-1.5 rounded bg-[#162038] hover:bg-[#223155] disabled:opacity-30 text-gray-300 hover:text-white transition-colors border border-[#273860]"
                        title="Поднять выше"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        aria-label={`Ниже: ${event.title}`} onClick={(e) => moveTimelineItem(index, 1, e.currentTarget)}
                        disabled={index === timelineOrder.length - 1 || isSimulatingTimeline}
                        className="p-1.5 rounded bg-[#162038] hover:bg-[#223155] disabled:opacity-30 text-gray-300 hover:text-white transition-colors border border-[#273860]"
                        title="Опустить ниже"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleVerifyTimeline}
                disabled={isSimulatingTimeline}
                className="dr-btn dr-btn-primary py-2.5 px-6 text-sm font-interface font-bold flex items-center gap-2"
              >
                <Play size={14} />
                <span>{isSimulatingTimeline ? 'СИМУЛЯЦИЯ ХРОНОЛОГИИ...' : 'СМОДЕЛИРОВАТЬ ЦЕПОЧКУ СОБЫТИЙ'}</span>
              </button>

              {timelineFeedback && (
                <div className="text-sm text-[#ff2a85] font-interface animate-fade-in" role="status" aria-live="polite">
                  {timelineFeedback}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 4: TRAP MECHANISM WITH SVG BLUEPRINT & TENSION CONTROL */}
        {/* ================================================================= */}
        {activePuzzleId === 'trap' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-sm text-[#78dfa7] font-bold uppercase">ВЕЩДОК: ОХОТНИЧИЙ КАПКАН</span>
                <h3 className="text-lg font-interface font-bold text-white">
                  Деактивация храповика и контроль натяжения пружины
                </h3>
              </div>
              <span className="text-sm bg-[#78dfa7]/15 text-[#78dfa7] px-2.5 py-1 rounded border border-[#78dfa7]/40 font-bold">
                Заключение анализа
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Чтобы разжать стальные зубья капкана и освободить зажатую ткань, выставите параметры кода из материалов дела (Сектор, секунды диалога, модель капкана) и удерживайте ползунок натяжения пружины строго в безопасной зелёной зоне (70% – 80%).
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive SVG Bear Trap Blueprint */}
              <div className="trap-visual self-start p-4 bg-[#050812] border border-[#1b2645] rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                <div className="text-sm text-gray-400 font-interface w-full flex items-center justify-between mb-2">
                  <span>СХЕМА КАПКАНА WOLF TRAP:</span>
                  <span className={isTrapOpen ? 'text-[#78dfa7] font-bold' : 'text-amber-400'}>
                    {isTrapOpen ? '✓ ЗАМОК ОТЖАТ' : '⚠ ЗУБЬЯ ВЗВЕДЕНЫ'}
                  </span>
                </div>

                <div className="w-full h-48 relative flex items-center justify-center">
                  <svg viewBox="0 0 300 200" className="w-full h-full max-h-48">
                    {/* Central Base & Trigger Pan */}
                    <ellipse cx="150" cy="150" rx="60" ry="20" fill="#121829" stroke="#253556" strokeWidth="3" />
                    <circle cx="150" cy="145" r="18" fill="#1a2542" stroke={isTrapOpen ? "#78dfa7" : "#ff2a85"} strokeWidth="2" />

                    {/* Entrapped Cloth Fiber (appears when opened) */}
                    {isTrapOpen && (
                      <g className="animate-fade-in">
                        <path d="M 140 140 Q 150 120 160 145" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />
                        <text x="150" y="115" textAnchor="middle" fill="#78dfa7" fontSize="10" fontWeight="bold">ТКАНЬ ПЕРЧАТКИ</text>
                      </g>
                    )}

                    {/* Left Serrated Steel Jaw */}
                    <path
                      d="M 90 145 C 90 80, 130 50, 150 50"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="6"
                      strokeLinecap="round"
                      style={{
                        transformOrigin: '90px 145px',
                        transform: isTrapOpen ? 'rotate(-35deg)' : 'rotate(0deg)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    />

                    {/* Right Serrated Steel Jaw */}
                    <path
                      d="M 210 145 C 210 80, 170 50, 150 50"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="6"
                      strokeLinecap="round"
                      style={{
                        transformOrigin: '210px 145px',
                        transform: isTrapOpen ? 'rotate(35deg)' : 'rotate(0deg)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    />

                    {/* Coiled Tension Spring (Reacts to springTension) */}
                    <g transform="translate(30, 110)">
                      <path
                        d={`M 0 30 Q 10 ${30 - springTension / 5} 20 30 Q 30 ${30 + springTension / 5} 40 30`}
                        stroke={springTension >= 70 && springTension <= 80 ? "#78dfa7" : "#eab308"}
                        strokeWidth="5"
                        fill="none"
                      />
                      <text x="20" y="15" textAnchor="middle" fill="#64748b" fontSize="9">ПРУЖИНА</text>
                    </g>
                  </svg>
                </div>

                <span className="text-sm text-gray-500 font-interface mt-1">
                  {isTrapOpen ? 'Зубья раскрыты. Зажатые волокна ткани освобождены.' : 'Механизм под натяжением. Удерживайте натяжение в безопасной зоне.'}
                </span>
              </div>

              {/* Dials & Tension Slider Controls */}
              <div className="space-y-4">
                <div className="trap-dials grid grid-cols-1 gap-3">
                  <RangeControl showSlider={false} label="Сектор мусоросжигателя" value={dialSector} min={1} max={8} onChange={setDialSector} />
                  <RangeControl showSlider={false} label="Время диалога" value={dialSeconds} min={5} max={60} step={5} unit="с" onChange={setDialSeconds} />
                  <RangeControl showSlider={false} label="Модель Wolf Trap" value={dialWolf} min={1} max={6} onChange={setDialWolf} />
                </div>

                {/* Spring Tension Gauge Slider */}
                <div className="p-4 bg-[#070a13] border border-[#1d2745] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 font-bold">НАТЯЖЕНИЕ РЫЧАГА ПРУЖИНЫ:</span>
                    <span className={`font-interface font-bold ${
                      springTension >= 70 && springTension <= 80 ? 'text-[#78dfa7]' : 'text-amber-400'
                    }`}>
                      {springTension}% {springTension >= 70 && springTension <= 80 ? '(ОПТИМУМ)' : '(КРИТИЧНО)'}
                    </span>
                  </div>
                  <RangeControl label="Натяжение пружины" value={springTension} min={0} max={100} step={1} unit="%" onChange={setSpringTension} />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0% Срыв</span>
                    <span className="text-[#78dfa7] font-bold">70% – 80% (Зона деактивации)</span>
                    <span>100% Перетяжка</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleTriggerTrap}
                    className="w-full dr-btn dr-btn-primary py-2.5 px-6 text-sm font-interface font-bold"
                  >
                    РАЗЖАТЬ ПРУЖИННЫЙ ЗАМОК
                  </button>

                  {trapMessage && (
                    <div className={`p-2.5 rounded text-sm font-interface border animate-fade-in ${
                      trapMessage.startsWith('ЩЕЛЧОК') ? 'bg-[#78dfa7]/15 border-[#78dfa7] text-[#78dfa7]' : 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                    }`} role="status" aria-live="polite">
                      {trapMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUZZLE 5: SPLIT-SCREEN FORENSIC COMPARATOR MICROSCOPE */}
        {/* ================================================================= */}
        {activePuzzleId === 'workbench' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1b2540] pb-3 gap-2">
              <div>
                <span className="text-sm text-purple-400 font-bold uppercase">ВЕЩДОК: ВЕРСТАК И СТЯЖКИ</span>
                <h3 className="text-lg font-interface font-bold text-white">
                  Сравнительный микроскоп: сопоставление рельефа среза
                </h3>
              </div>
              <span className="text-sm bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded border border-purple-500/40 font-bold">
                Заключение анализа
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              На запястьях жертвы найдены срезанные строительные стяжки. Выберите инструмент из мастерской, сопоставьте угол среза (45°) и уровень резкости под микроскопом, чтобы добиться 95%+ совпадения микрорельефа кромки.
            </p>

            {/* Split Screen Comparator Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Screen: Evidence Sample */}
              <div className="p-4 bg-[#05070e] border border-[#1b2645] rounded-xl space-y-2">
                <span className="text-sm text-[#6ddce5] font-bold block">ЭТАЛОН: СРЕЗ СТЯЖКИ С ЗАПЯСТЬЯ (x100)</span>
                <div className="h-44 bg-[#080d1a] border border-[#203058] rounded-lg relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6ddce5_1px,transparent_1px)] [background-size:16px_16px]" />

                  <MicroscopeSample />
                </div>
                <p className="sample-caption text-sm text-gray-400">Угол фиксации: 45°. Ровный скос.</p>
              </div>

              {/* Right Screen: Candidate Tool Specimen */}
              <div className="p-4 bg-[#05070e] border border-[#1b2645] rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-gray-400 font-bold">Образец инструмента</span>
                  <span className={`font-interface font-bold ${matchScore >= 95 ? 'text-[#78dfa7]' : 'text-amber-400'}`}>
                    Совпадение: {matchScore}%
                  </span>
                </div>

                <div className="h-44 bg-[#080d1a] border border-[#203058] rounded-lg relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#c084fc_1px,transparent_1px)] [background-size:16px_16px]" />

                  {overlayBlend > 0 && <div className="absolute inset-0 flex items-center justify-center"><MicroscopeSample color="#e8edf5" opacity={overlayBlend / 100} /></div>}
                  {selectedTool ? <MicroscopeSample tool={selectedTool} angle={cutAngle} focus={microscopeFocus} zoom={magnification} color="#6ddce5" /> : <span className="text-sm text-gray-400">Выберите инструмент ниже</span>}

                </div>
                <p className="sample-caption text-sm text-gray-400">Угол: {cutAngle}°. Масштаб: {magnification}%. Фокус: {microscopeFocus}%.</p>
              </div>
            </div>

            {/* Tool Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={() => { SoundFX.playRotate(); setSelectedTool('hacksaw'); setMicroscopeMessage(''); }}
                className={`p-3.5 rounded-xl border text-left text-sm transition-all ${
                  selectedTool === 'hacksaw' ? 'bg-[#151f38] border-[#6ddce5] text-white' : 'bg-[#0d101c] border-[#1c233a] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <span>🪚</span>
                  <span>1. Слесарная ножовка</span>
                </div>
                <div className="text-sm text-gray-500">Зубчатый рваный рез 90°</div>
              </button>

              <button
                onClick={() => { SoundFX.playRotate(); setSelectedTool('pliers'); setMicroscopeMessage(''); }}
                className={`p-3.5 rounded-xl border text-left text-sm transition-all ${
                  selectedTool === 'pliers' ? 'bg-[#151f38] border-[#6ddce5] text-white' : 'bg-[#0d101c] border-[#1c233a] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Scissors size={14} />
                  <span>2. Монтажные кусачки</span>
                </div>
                <div className="text-sm text-gray-500">Диагональные лезвия 45°</div>
              </button>

              <button
                onClick={() => { SoundFX.playRotate(); setSelectedTool('knife'); setMicroscopeMessage(''); }}
                className={`p-3.5 rounded-xl border text-left text-sm transition-all ${
                  selectedTool === 'knife' ? 'bg-[#151f38] border-[#6ddce5] text-white' : 'bg-[#0d101c] border-[#1c233a] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <span>🔪</span>
                  <span>3. Канцелярский нож</span>
                </div>
                <div className="text-sm text-gray-500">Тонкий плоский скол</div>
              </button>
            </div>

            <p className="text-sm text-gray-400">Учебная визуализация: сравните расположение борозд. Фокус меняет чёткость, а увеличение — размер изображения.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RangeControl label="Фокус микроскопа" value={microscopeFocus} min={20} max={100} unit="%" onChange={setMicroscopeFocus} />
              <RangeControl label="Наложение эталона" value={overlayBlend} min={0} max={100} unit="%" onChange={setOverlayBlend} />
            </div>
            {/* Sliders for Angle and Zoom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060810] p-4 rounded-xl border border-[#1b2540]">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-300 font-interface">
                  <span>УГОЛ НАКЛОНА ЛЕЗВИЯ:</span>
                  <span className="font-bold text-[#6ddce5]">{cutAngle}°</span>
                </div>
                <RangeControl label="Угол среза" value={cutAngle} min={0} max={90} step={1} unit="°" onChange={(next) => { setCutAngle(next); setMicroscopeMessage(''); }} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-300 font-interface">
                  <span>МАСШТАБ ОБРАЗЦА:</span>
                  <span className="font-bold text-[#6ddce5]">{magnification}%</span>
                </div>
                <RangeControl label="Увеличение" value={magnification} min={20} max={100} step={1} unit="%" onChange={(next) => { setMagnification(next); setMicroscopeMessage(''); }} />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleConfirmMicroscope}
                className="dr-btn dr-btn-primary py-2.5 px-6 text-sm font-interface font-bold"
              >
                ФИКСИРОВАТЬ ЭКСПЕРТИЗУ ВЕРСТАКА
              </button>

              {microscopeMessage && (
                <div className={`p-2.5 rounded text-sm font-interface border animate-fade-in ${
                  microscopeMessage.startsWith('100%') ? 'bg-[#78dfa7]/15 border-[#78dfa7] text-[#78dfa7]' : 'bg-[#ff2a85]/15 border-[#ff2a85] text-[#ff2a85]'
                }`} role="status" aria-live="polite">
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
