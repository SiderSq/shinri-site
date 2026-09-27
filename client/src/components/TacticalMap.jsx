import React, { useState, useEffect } from 'react';
import {
  Compass,
  Video,
  Activity,
  Thermometer,
  Zap,
  Radio,
  Eye,
  AlertTriangle,
  Maximize2,
  X,
  Lock,
  Unlock,
  ShieldAlert,
  Sparkles,
  Filter
} from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function TacticalMap({ caseData }) {
  // Active sector selection: 'A' | 'B' | 'C'
  const [selectedSectorId, setSelectedSectorId] = useState('C');
  const [hoveredSectorId, setHoveredSectorId] = useState(null);

  // Inspector deck sub-tab: 'skud' | 'sensors' | 'cctv'
  const [activeDeckTab, setActiveDeckTab] = useState('skud');

  // СКУД event filter
  const [skudFilter, setSkudFilter] = useState('ALL');

  // CCTV active camera
  const [activeCamId, setActiveCamId] = useState('CAM_04');
  const [cctvModalOpen, setCctvModalOpen] = useState(false);

  // Live telemetry state from /api/investigation/sectors
  const [sectorsData, setSectorsData] = useState(null);
  const [skudLogs, setSkudLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch telemetry from server
  useEffect(() => {
    let isMounted = true;
    async function fetchSectors() {
      try {
        const res = await fetch('/api/investigation/sectors');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.sectors) {
            setSectorsData(data.sectors);
            setSkudLogs(data.skudLogs || []);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('TacticalMap: Live fetch error, using fallback telemetry', err);
      }

      // Fallback from caseData or default baseline
      if (isMounted) {
        if (caseData?.sectors) {
          setSectorsData(caseData.sectors);
          setSkudLogs(caseData.skudLogs || []);
        }
        setIsLoading(false);
      }
    }

    fetchSectors();
    return () => {
      isMounted = false;
    };
  }, [caseData]);

  // Sector configurations
  const fallbackSectors = {
    A: {
      id: 'A',
      code: 'SEC-A-01',
      name: 'Сектор A — Серверная',
      subtitle: 'Серверный кластер и хранилище резервных копий ОЗУ',
      status: 'ONLINE',
      powerLoad: '84.2 kW',
      atmosphereStatus: 'ИЗОЛИРОВАНО (НОРМА)',
      themeColor: '#00f3ff',
      doors: [
        {
          id: 'DOOR_ROOM_A',
          label: 'Шлюз A-1',
          code: 'GATE-A-01',
          status: 'LOCKED',
          type: 'EMERGENCY_HERMETIC',
          lastAccess: '21:47:33',
          lastUser: 'НЕИЗВЕСТНЫЙ [Служебный мастер-ключ]'
        }
      ],
      sensors: [
        {
          id: 'SNS_A_TEMP',
          type: 'thermal',
          label: 'Сенсор охлаждения крио-стоек А-1',
          status: 'NORMAL',
          telemetry: '17.4°C / В пределах нормы',
          value: '17.4°C'
        },
        {
          id: 'SNS_A_MOTION',
          type: 'motion',
          label: 'Детектор объёмного присутствия А-Холл',
          status: 'ACTIVE',
          telemetry: '24.1°C / Одиночный сигнал',
          value: 'АКТИВНОСТЬ: 0%'
        }
      ],
      cameras: [
        {
          id: 'CAM_01',
          name: 'Серверный коридор',
          label: 'Входной створ шлюза А',
          status: 'RECORDING',
          glitch: false,
          fps: 29.97,
          stillId: 'PHOTO_04',
          still: {
            timestamp: '21:47:33',
            title: 'Схема движения через шлюз А',
            desc: 'Силуэт в форменной одежде горничной, спешно покидающий сектор после тревоги.'
          }
        }
      ],
      nagitoCommentary: 'Ах, холодное сердце Академии... Все секреты, зашифрованные в кремниевых кристаллах. Тогами-кун думал, что резервный снимок спасёт его замысел. Но разве не удивительно, как надежда ускользает в самый последний момент?'
    },
    B: {
      id: 'B',
      code: 'SEC-B-02',
      name: 'Сектор B — Мастерская',
      subtitle: 'Участок резервного энергоснабжения и мастерская Соды',
      status: 'ALERT',
      powerLoad: '142.8 kW (ПИК)',
      atmosphereStatus: 'ВЕНТИЛЯЦИЯ АКТИВНА',
      themeColor: '#ffb703',
      doors: [
        {
          id: 'DOOR_WORKSHOP',
          label: 'Мастерская Соды',
          code: 'GATE-B-02',
          status: 'UNLOCKED',
          type: 'WORKSHOP_GATE',
          lastAccess: '21:20:11',
          lastUser: 'Кадзуити Сода'
        }
      ],
      sensors: [
        {
          id: 'SNS_B_TEMP',
          type: 'thermal',
          label: 'Датчик нагрева генератора',
          status: 'NORMAL',
          telemetry: '21.5°C / Стабильно',
          value: '21.5°C'
        },
        {
          id: 'SNS_B_MOTION',
          type: 'motion',
          label: 'Детектор вибрации/нагрузки PWR-B',
          status: 'ACTIVE',
          telemetry: '78 Гц / Рабочая частота',
          value: '78 Гц'
        }
      ],
      cameras: [
        {
          id: 'CAM_02',
          name: 'Генераторный отсек',
          label: 'Мастерская и распределительный щит',
          status: 'RECORDING',
          glitch: false,
          fps: 29.97,
          stillId: 'PHOTO_GEN',
          still: {
            timestamp: '21:20:11',
            title: 'Технический пост B',
            desc: 'Кадзуити Сода за распределительным щитом резервного генератора.'
          }
        }
      ],
      nagitoCommentary: 'Мастерская Соды-куна! Всюду машинное масло, искры и тщетные попытки обуздать хаос. Кадзуити так отчаянно латал генератор... Но понимал ли он, чьё передвижение прикрывает эта минутная тьма?'
    },
    C: {
      id: 'C',
      code: 'SEC-C-03',
      name: 'Сектор C — Архив',
      subtitle: 'Архивный блок / Место преступления (Узел 04-271)',
      status: 'CRIME_SCENE',
      powerLoad: '12.0 kW (АВАРИЯ)',
      atmosphereStatus: 'РАЗГЕРМЕТИЗАЦИЯ / ОЦЕПЛЕНО',
      themeColor: '#ff2a85',
      doors: [
        {
          id: 'DOOR_ROOM_C',
          label: 'Вход в Архив C-3',
          code: 'GATE-C-03',
          status: 'SEALED',
          type: 'HERMETIC_SEALED',
          lastAccess: '21:43:18',
          lastUser: 'Блокировка терминала'
        }
      ],
      sensors: [
        {
          id: 'SNS_C_TEMP',
          type: 'thermal',
          label: 'Биометрический термодатчик Архива',
          status: 'ALERT',
          telemetry: '31.2°C / 1 угасающая био-сигнатура',
          value: '31.2°C'
        },
        {
          id: 'SNS_C_MOTION',
          type: 'motion',
          label: 'Инфракрасный детектор присутствия С-3',
          status: 'OFFLINE',
          telemetry: '0.0°C / Сбой датчика',
          value: 'ОБРЫВ ЛИНИИ'
        }
      ],
      cameras: [
        {
          id: 'CAM_04',
          name: 'Терминал 04-271',
          label: 'Архивный зал С-3',
          status: 'SIGNAL_LOST',
          glitch: true,
          fps: 0,
          stillId: 'PHOTO_01',
          still: {
            timestamp: '21:44:58',
            title: 'Стоп-кадр CAM-04 (21:44:58)',
            desc: 'Последний кадр перед сбоем камеры. В дальнем углу виден силуэт в форменной одежде горничной с нашивкой «К».'
          }
        }
      ],
      nagitoCommentary: 'Место, где оборвалась жизнь наследника клана Тогами... Какая ирония! Человек, державший в руках весь мир, пал жертвой тихой преданности идеалу. Посмотри на этот лог СКУД — видишь, как надежда зачернённого вступила в смертельную схватку с надеждой жертвы?'
    }
  };

  const sectors = sectorsData || fallbackSectors;
  const currentSector = sectors[selectedSectorId] || sectors.C;

  // Sync active camera when switching sectors
  const handleSelectSector = (sectorId) => {
    SoundFX.playClick();
    setSelectedSectorId(sectorId);
    if (sectorId === 'A') setActiveCamId('CAM_01');
    else if (sectorId === 'B') setActiveCamId('CAM_02');
    else if (sectorId === 'C') setActiveCamId('CAM_04');
  };

  const handleSelectTab = (tab) => {
    SoundFX.playClick();
    setActiveDeckTab(tab);
  };

  const handleSelectCam = (camId) => {
    SoundFX.playClick();
    setActiveCamId(camId);
  };

  // Find camera data
  const allCameras = [
    ...(sectors.A?.cameras || []),
    ...(sectors.B?.cameras || []),
    ...(sectors.C?.cameras || [])
  ];
  const activeCamera = allCameras.find(c => c.id === activeCamId) || currentSector?.cameras?.[0] || allCameras[0];

  // Filter СКУД logs
  const sectorLogs = skudLogs.filter(log => (log.sector || log.sectorId || '').toUpperCase() === selectedSectorId);
  const filteredLogs = sectorLogs.filter(log => {
    if (skudFilter === 'ALL') return true;
    if (skudFilter === 'ACCESS') return (log.action || '').includes('ACCESS') || (log.action || '').includes('UNLOCK') || (log.action || '').includes('OPEN');
    if (skudFilter === 'DENIED') return (log.action || '').includes('DENIED') || (log.action || '').includes('LOCKOUT') || (log.action || '').includes('OVERRIDE');
    if (skudFilter === 'MAINTENANCE') return (log.action || '').includes('MAINTENANCE') || (log.action || '').includes('OVERRIDE');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Cyberpunk Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0d18] border border-[#1e2742] p-4 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#00f3ff]" />
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#00f3ff] uppercase">
            <Compass size={14} className="animate-spin text-[#00f3ff]" style={{ animationDuration: '10s' }} />
            <span>SHINRI TRIAL // ТАКТИЧЕСКИЙ ТЕРМИНАЛ СЕКТОРОВ</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-[#00f3ff]/10 border border-[#00f3ff]/40 text-[#00f3ff] rounded font-bold">
              {isLoading ? 'СИНХРОНИЗАЦИЯ...' : 'СКУД ОНЛАЙН'}
            </span>
          </div>
          <h2 className="text-xl font-mono font-bold text-white tracking-wide mt-1 flex items-center gap-3">
            <span>ИНТЕРАКТИВНАЯ КАРТА АРХИВНОГО КОМПЛЕКСА</span>
          </h2>
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            Узел 04-271 • Телеметрия шлюзов, гермозон, стоп-кадров видеонаблюдения и био-сенсоров
          </p>
        </div>

        {/* Quick Sector Selector Buttons */}
        <div className="flex items-center gap-2">
          {['A', 'B', 'C'].map((secId) => {
            const isSelected = selectedSectorId === secId;
            const themeColor = secId === 'C' ? '#ff2a85' : secId === 'B' ? '#ffb703' : '#00f3ff';
            return (
              <button
                key={secId}
                onClick={() => handleSelectSector(secId)}
                className={`px-3 py-2 rounded font-mono text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'shadow-[0_0_15px_rgba(0,243,255,0.3)] text-white'
                    : 'bg-[#0f1424] text-gray-400 border-[#1f2942] hover:border-gray-500 hover:text-gray-200'
                }`}
                style={{
                  borderColor: isSelected ? themeColor : undefined,
                  backgroundColor: isSelected ? `${themeColor}22` : undefined
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: themeColor }}
                />
                <span>[{secId}] {secId === 'A' ? 'СЕРВЕРНАЯ' : secId === 'B' ? 'МАСТЕРСКАЯ' : 'АРХИВ (СУД)'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Blueprint SVG Map (Left/Top) & Telemetry Inspector Deck (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Vector SVG Blueprint */}
        <div className="lg:col-span-7 bg-[#080b16] border border-[#1b233a] rounded-lg p-4 flex flex-col relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
          {/* Blueprint Frame Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#161d31] text-[10px] font-mono text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-[#00f3ff] font-bold">ЧЕРТЁЖ:</span>
              <span className="text-gray-200">АРХИВНЫЙ БЛОК СЕКТОРОВ A / B / C</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">СЕТКА: 10×10 м</span>
              <span className="text-[#00ff88]">● ТЕЛЕМЕТРИЯ СИНХРОНИЗИРОВАНА</span>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full aspect-[920/540] bg-[#05070e] rounded border border-[#151c2f] overflow-hidden select-none">
            <svg
              viewBox="0 0 920 540"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Tech Grid Pattern */}
                <pattern id="tac-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#131b2e" strokeWidth="0.8" />
                  <circle cx="30" cy="30" r="1" fill="#1b253d" />
                </pattern>

                {/* Surveillance Cone Gradients */}
                <radialGradient id="camConeA" cx="80" cy="85" r="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#00f3ff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#00f3ff" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="camConeB" cx="320" cy="335" r="190" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffb703" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#ffb703" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ffb703" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="camConeC" cx="840" cy="85" r="220" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff2a85" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#ff2a85" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ff2a85" stopOpacity="0" />
                </radialGradient>

                {/* Glitch Filter for CAM-04 */}
                <filter id="svgGlitch">
                  <feTurbulence type="fractalNoise" baseFrequency="0.05 0.95" numOctaves="1" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width="920" height="540" fill="url(#tac-grid)" />

              {/* Technical Blueprint Coordinate Frame */}
              <g stroke="#1b253d" strokeWidth="1" opacity="0.6">
                <line x1="20" y1="20" x2="60" y2="20" />
                <line x1="20" y1="20" x2="20" y2="60" />
                <line x1="900" y1="20" x2="860" y2="20" />
                <line x1="900" y1="20" x2="900" y2="60" />
                <line x1="20" y1="520" x2="60" y2="520" />
                <line x1="20" y1="520" x2="20" y2="480" />
                <line x1="900" y1="520" x2="860" y2="520" />
                <line x1="900" y1="520" x2="900" y2="480" />
              </g>

              {/* Connecting Corridors & Airlock Passages */}
              {/* Corridor Alpha: Sector A down to Sector B */}
              <path
                d="M 160 250 L 160 380 L 290 380"
                fill="none"
                stroke="#1e2c4a"
                strokeWidth="28"
                strokeLinecap="square"
              />
              <path
                d="M 160 250 L 160 380 L 290 380"
                fill="none"
                stroke="#00f3ff"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.6"
              />

              {/* Corridor Beta: Sector C down to Sector B */}
              <path
                d="M 700 250 L 700 380 L 630 380"
                fill="none"
                stroke="#1e2c4a"
                strokeWidth="28"
                strokeLinecap="square"
              />
              <path
                d="M 700 250 L 700 380 L 630 380"
                fill="none"
                stroke="#ff2a85"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.6"
              />

              {/* Central Transit Junction Label */}
              <text x="460" y="270" textAnchor="middle" fill="#3b4d75" fontSize="10" fontFamily="monospace" letterSpacing="2">
                ТРАНЗИТНАЯ МАГИСТРАЛЬ // ШЛЮЗОВАЯ ЗОНА
              </text>

              {/* Camera Coverage Cones */}
              {/* CAM-01 Cone (Sector A) */}
              <path
                d="M 80 85 L 290 140 L 200 240 Z"
                fill="url(#camConeA)"
                stroke="#00f3ff"
                strokeWidth="0.8"
                strokeDasharray="4 3"
                opacity="0.7"
              />

              {/* CAM-02 Cone (Sector B) */}
              <path
                d="M 320 335 L 560 380 L 480 490 Z"
                fill="url(#camConeB)"
                stroke="#ffb703"
                strokeWidth="0.8"
                strokeDasharray="4 3"
                opacity="0.7"
              />

              {/* CAM-04 Cone (Sector C) - Glitched Crime Scene Cone */}
              <g>
                <path
                  d="M 840 85 L 610 120 L 700 260 Z"
                  fill="url(#camConeC)"
                  stroke="#ff2a85"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.85"
                />
                <circle cx="840" cy="85" r="7" fill="#ff2a85" className="animate-ping" opacity="0.6" />
              </g>

              {/* ================================================= */}
              {/* SECTOR A: СЕРВЕРНАЯ (SERVER ROOM)                 */}
              {/* ================================================= */}
              <g
                role="button"
                tabIndex="0"
                onClick={() => handleSelectSector('A')}
                onMouseEnter={() => setHoveredSectorId('A')}
                onMouseLeave={() => setHoveredSectorId(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Sector A Polygon */}
                <polygon
                  points="50,60 330,60 330,250 190,250 190,270 130,270 130,250 50,250"
                  fill={selectedSectorId === 'A' ? 'rgba(0, 243, 255, 0.16)' : hoveredSectorId === 'A' ? 'rgba(0, 243, 255, 0.08)' : 'rgba(9, 16, 32, 0.85)'}
                  stroke={selectedSectorId === 'A' ? '#00f3ff' : hoveredSectorId === 'A' ? '#33c9ff' : '#1e3355'}
                  strokeWidth={selectedSectorId === 'A' ? '2.5' : '1.5'}
                />

                {/* Server Core Visual Nodes */}
                <rect x="70" y="80" width="40" height="80" fill="#0c172d" stroke="#00f3ff" strokeWidth="1" opacity="0.8" />
                <rect x="120" y="80" width="40" height="80" fill="#0c172d" stroke="#00f3ff" strokeWidth="1" opacity="0.8" />
                <rect x="170" y="80" width="40" height="80" fill="#0c172d" stroke="#00f3ff" strokeWidth="1" opacity="0.8" />
                {/* Blinking Server LEDs */}
                <circle cx="80" cy="95" r="2" fill="#00ff88" className="animate-pulse" />
                <circle cx="90" cy="95" r="2" fill="#00f3ff" />
                <circle cx="130" cy="95" r="2" fill="#00ff88" />
                <circle cx="140" cy="95" r="2" fill="#00f3ff" className="animate-pulse" />
                <circle cx="180" cy="95" r="2" fill="#00ff88" />
                <circle cx="190" cy="95" r="2" fill="#00f3ff" />

                {/* Sector A Labels */}
                <text x="180" y="195" textAnchor="middle" fill="#00f3ff" fontSize="14" fontFamily="monospace" fontWeight="bold">
                  СЕКТОР A // СЕРВЕРНАЯ
                </text>
                <text x="180" y="215" textAnchor="middle" fill="#6d8cb0" fontSize="10" fontFamily="monospace">
                  SEC-A-01 • КРИО-СТОЙКИ ОЗУ
                </text>

                {/* Sensor T-A1 Indicator */}
                <g transform="translate(260, 90)">
                  <circle cx="10" cy="10" r="10" fill="#071b2f" stroke="#00f3ff" strokeWidth="1" />
                  <text x="10" y="14" textAnchor="middle" fill="#00f3ff" fontSize="9" fontFamily="monospace" fontWeight="bold">T</text>
                  <text x="26" y="14" fill="#00f3ff" fontSize="9" fontFamily="monospace">17.4°C</text>
                </g>

                {/* Camera 01 Icon */}
                <g transform="translate(70, 75)">
                  <circle cx="10" cy="10" r="8" fill="#00f3ff" opacity="0.9" />
                  <text x="10" y="28" textAnchor="middle" fill="#00f3ff" fontSize="8" fontFamily="monospace">CAM-01</text>
                </g>
              </g>

              {/* Airlock Door A (DOOR_ROOM_A) */}
              <g transform="translate(130, 246)">
                <rect x="0" y="0" width="60" height="12" fill="#0a1222" stroke="#00f3ff" strokeWidth="1.5" />
                <text x="30" y="9" textAnchor="middle" fill="#00f3ff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  ШЛЮЗ A-1 [LOCKED]
                </text>
              </g>

              {/* ================================================= */}
              {/* SECTOR B: МАСТЕРСКАЯ (WORKSHOP)                   */}
              {/* ================================================= */}
              <g
                role="button"
                tabIndex="0"
                onClick={() => handleSelectSector('B')}
                onMouseEnter={() => setHoveredSectorId('B')}
                onMouseLeave={() => setHoveredSectorId(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Sector B Polygon */}
                <polygon
                  points="290,310 630,310 630,500 290,500"
                  fill={selectedSectorId === 'B' ? 'rgba(255, 183, 3, 0.16)' : hoveredSectorId === 'B' ? 'rgba(255, 183, 3, 0.08)' : 'rgba(9, 16, 32, 0.85)'}
                  stroke={selectedSectorId === 'B' ? '#ffb703' : hoveredSectorId === 'B' ? '#ffc73b' : '#332914'}
                  strokeWidth={selectedSectorId === 'B' ? '2.5' : '1.5'}
                />

                {/* Generator Block Schematics */}
                <rect x="330" y="370" width="90" height="90" fill="#1b1607" stroke="#ffb703" strokeWidth="1.2" strokeDasharray="3 2" />
                <circle cx="375" cy="415" r="24" fill="none" stroke="#ffb703" strokeWidth="1.5" />
                <path d="M 375 395 L 375 435 M 355 415 L 395 415" stroke="#ffb703" strokeWidth="1" />
                <text x="375" y="445" textAnchor="middle" fill="#ffb703" fontSize="8" fontFamily="monospace">
                  ГЕНЕРАТОР PWR-B
                </text>

                {/* Workshop Workbenches */}
                <rect x="460" y="370" width="130" height="35" fill="#16151c" stroke="#ffb703" strokeWidth="1" opacity="0.7" />
                <text x="525" y="392" textAnchor="middle" fill="#ffb703" fontSize="9" fontFamily="monospace">
                  ВЕРСТАК СОДЫ
                </text>

                {/* Sector B Labels */}
                <text x="460" y="475" textAnchor="middle" fill="#ffb703" fontSize="14" fontFamily="monospace" fontWeight="bold">
                  СЕКТОР B // МАСТЕРСКАЯ СОДЫ
                </text>
                <text x="460" y="492" textAnchor="middle" fill="#8c7746" fontSize="10" fontFamily="monospace">
                  SEC-B-02 • РАСПРЕДЕЛИТЕЛЬНЫЙ ЩИТ 142.8 kW
                </text>

                {/* Camera 02 Icon */}
                <g transform="translate(310, 325)">
                  <circle cx="10" cy="10" r="8" fill="#ffb703" opacity="0.9" />
                  <text x="10" y="28" textAnchor="middle" fill="#ffb703" fontSize="8" fontFamily="monospace">CAM-02</text>
                </g>
              </g>

              {/* Airlock Door B (DOOR_WORKSHOP) */}
              <g transform="translate(430, 304)">
                <rect x="0" y="0" width="60" height="12" fill="#1a1405" stroke="#ffb703" strokeWidth="1.5" />
                <text x="30" y="9" textAnchor="middle" fill="#ffb703" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  ШЛЮЗ B [OPEN]
                </text>
              </g>

              {/* ================================================= */}
              {/* SECTOR C: АРХИВ / МЕСТО ПРЕСТУПЛЕНИЯ (CRIME SCENE)*/}
              {/* ================================================= */}
              <g
                role="button"
                tabIndex="0"
                onClick={() => handleSelectSector('C')}
                onMouseEnter={() => setHoveredSectorId('C')}
                onMouseLeave={() => setHoveredSectorId(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Sector C Polygon */}
                <polygon
                  points="590,60 870,60 870,280 730,280 730,250 670,250 670,280 590,280"
                  fill={selectedSectorId === 'C' ? 'rgba(255, 42, 133, 0.2)' : hoveredSectorId === 'C' ? 'rgba(255, 42, 133, 0.1)' : 'rgba(20, 8, 16, 0.85)'}
                  stroke={selectedSectorId === 'C' ? '#ff2a85' : hoveredSectorId === 'C' ? '#ff4f9d' : '#4d142d'}
                  strokeWidth={selectedSectorId === 'C' ? '2.5' : '1.5'}
                />

                {/* Crime Scene Outline (Victim: Togami Body Contour Marker) */}
                <g transform="translate(760, 165)">
                  {/* Forensic Caution Circle */}
                  <circle cx="20" cy="20" r="28" fill="none" stroke="#ff2a85" strokeWidth="1.5" strokeDasharray="4 3" className="animate-pulse" />
                  {/* Body Silhouette Outline */}
                  <ellipse cx="20" cy="8" rx="8" ry="7" fill="none" stroke="#ff2a85" strokeWidth="1.5" />
                  <line x1="20" y1="15" x2="20" y2="34" stroke="#ff2a85" strokeWidth="2" />
                  <line x1="8" y1="22" x2="32" y2="22" stroke="#ff2a85" strokeWidth="2" />
                  <line x1="20" y1="34" x2="10" y2="48" stroke="#ff2a85" strokeWidth="2" />
                  <line x1="20" y1="34" x2="30" y2="48" stroke="#ff2a85" strokeWidth="2" />
                  <text x="20" y="62" textAnchor="middle" fill="#ff2a85" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    МЕТКА: ТОГАМИ (21:49)
                  </text>
                </g>

                {/* Archive Terminal 04-271 Node */}
                <rect x="620" y="85" width="70" height="50" fill="#140710" stroke="#ff2a85" strokeWidth="1.2" />
                <text x="655" y="105" textAnchor="middle" fill="#ff2a85" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  ТЕРМИНАЛ
                </text>
                <text x="655" y="120" textAnchor="middle" fill="#ff2a85" fontSize="8" fontFamily="monospace">
                  04-271
                </text>

                {/* Broken Cable & Disrupted Sensor Warning */}
                <g transform="translate(620, 150)">
                  <path d="M 0 0 L 15 15 M 20 20 L 35 35" stroke="#ff2a85" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="40" y="25" fill="#ff2a85" fontSize="8" fontFamily="monospace">
                    ⚡ КАБЕЛЬ ПЕРЕРЕЗАН
                  </text>
                </g>

                {/* Sector C Labels */}
                <text x="730" y="240" textAnchor="middle" fill="#ff2a85" fontSize="14" fontFamily="monospace" fontWeight="bold">
                  СЕКТОР C // АРХИВ (МЕСТО ПРЕСТУПЛЕНИЯ)
                </text>
                <text x="730" y="255" textAnchor="middle" fill="#b05c83" fontSize="10" fontFamily="monospace">
                  SEC-C-03 • КРАЙНИЙ ИНЦИДЕНТ 21:45
                </text>

                {/* Camera 04 Glitched Icon */}
                <g transform="translate(830, 75)">
                  <circle cx="10" cy="10" r="9" fill="#ff2a85" />
                  <text x="10" y="28" textAnchor="middle" fill="#ff2a85" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    CAM-04 ⚠️
                  </text>
                </g>
              </g>

              {/* Airlock Door C (DOOR_ROOM_C) */}
              <g transform="translate(670, 246)">
                <rect x="0" y="0" width="60" height="12" fill="#1e0a13" stroke="#ff2a85" strokeWidth="1.5" />
                <text x="30" y="9" textAnchor="middle" fill="#ff2a85" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  ГЕРМОДВЕРЬ C-3 [SEALED]
                </text>
              </g>
            </svg>

            {/* Bottom Floating Legend / Coordinates */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-gray-400 bg-[#070b18]/80 backdrop-blur px-2.5 py-1 rounded border border-[#17223b]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00f3ff]" />
                  <span>Сектор A (Сервер)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ffb703]" />
                  <span>Сектор B (Мастерская)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ff2a85]" />
                  <span>Сектор C (Архив / Убийство)</span>
                </span>
              </div>
              <span className="text-[#00f3ff] font-bold hidden sm:inline">КЛИКНИТЕ НА СЕКТОР ДЛЯ ИНСПЕКЦИИ ТЕЛЕМЕТРИИ</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Inspector Deck */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Active Sector Summary Header */}
          <div
            className="p-4 rounded-lg border bg-[#0a0e1c] relative overflow-hidden transition-all"
            style={{ borderColor: currentSector.themeColor || '#00f3ff' }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: currentSector.themeColor || '#00f3ff' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                {currentSector.code} • ТАКТИЧЕСКИЙ УЗЕЛ
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase"
                style={{
                  backgroundColor: `${currentSector.themeColor}1a`,
                  borderColor: currentSector.themeColor,
                  color: currentSector.themeColor
                }}
              >
                {currentSector.status}
              </span>
            </div>

            <h3 className="text-lg font-mono font-bold text-white mt-1">
              {currentSector.name}
            </h3>
            <p className="text-xs font-mono text-gray-400 mt-0.5">
              {currentSector.subtitle}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#182138] text-[11px] font-mono">
              <div className="bg-[#0e1426] p-2 rounded border border-[#1b2642]">
                <div className="text-gray-500 text-[10px]">ЭНЕРГОНАГРУЗКА</div>
                <div className="text-gray-200 font-bold mt-0.5 flex items-center gap-1.5">
                  <Zap size={13} className="text-[#ffb703]" />
                  <span>{currentSector.powerLoad}</span>
                </div>
              </div>
              <div className="bg-[#0e1426] p-2 rounded border border-[#1b2642]">
                <div className="text-gray-500 text-[10px]">АТМОСФЕРА / ИЗОЛЯЦИЯ</div>
                <div className="text-gray-200 font-bold mt-0.5 flex items-center gap-1.5">
                  <Activity size={13} className="text-[#00ff88]" />
                  <span className="truncate">{currentSector.atmosphereStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inspector Sub-Tabs Switcher */}
          <div className="flex items-center gap-1 bg-[#0a0d18] p-1 rounded border border-[#1c253d]">
            <button
              onClick={() => handleSelectTab('skud')}
              className={`flex-1 py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeckTab === 'skud'
                  ? 'bg-[#141b30] text-[#00f3ff] border border-[#00f3ff]/40 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#101424]'
              }`}
            >
              <ShieldAlert size={14} />
              <span>СКУД / ACCESS</span>
            </button>
            <button
              onClick={() => handleSelectTab('sensors')}
              className={`flex-1 py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeckTab === 'sensors'
                  ? 'bg-[#141b30] text-[#00f3ff] border border-[#00f3ff]/40 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#101424]'
              }`}
            >
              <Activity size={14} />
              <span>ДАТЧИКИ / SENSORS</span>
            </button>
            <button
              onClick={() => handleSelectTab('cctv')}
              className={`flex-1 py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeckTab === 'cctv'
                  ? 'bg-[#141b30] text-[#00f3ff] border border-[#00f3ff]/40 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#101424]'
              }`}
            >
              <Video size={14} />
              <span>КАМЕРЫ / CCTV</span>
            </button>
          </div>

          {/* Sub-Tab 1: СКУД Access Logs */}
          {activeDeckTab === 'skud' && (
            <div className="bg-[#090d1a] border border-[#1b253f] rounded-lg p-3 flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-300">
                  <Filter size={13} className="text-[#00f3ff]" />
                  <span>ЖУРНАЛ СКУД СЕКТОРА [{selectedSectorId}]</span>
                  <span className="text-[10px] text-gray-500">({filteredLogs.length} событий)</span>
                </div>
                {/* Event Filters */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setSkudFilter('ALL')}
                    className={`px-2 py-0.5 rounded ${skudFilter === 'ALL' ? 'bg-[#00f3ff]/20 text-[#00f3ff] font-bold border border-[#00f3ff]/40' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    ВСЕ
                  </button>
                  <button
                    onClick={() => setSkudFilter('ACCESS')}
                    className={`px-2 py-0.5 rounded ${skudFilter === 'ACCESS' ? 'bg-[#00ff88]/20 text-[#00ff88] font-bold border border-[#00ff88]/40' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    ВХОД
                  </button>
                  <button
                    onClick={() => setSkudFilter('DENIED')}
                    className={`px-2 py-0.5 rounded ${skudFilter === 'DENIED' ? 'bg-[#ff2a85]/20 text-[#ff2a85] font-bold border border-[#ff2a85]/40' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    ОТКАЗ
                  </button>
                </div>
              </div>

              {/* Logs List Container */}
              <div className="space-y-2 overflow-y-auto max-h-[310px] pr-1">
                {filteredLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-gray-500 bg-[#0d1324] rounded border border-[#17223b]">
                    НЕТ СООТВЕТСТВУЮЩИХ СОБЫТИЙ СКУД ДЛЯ ВЫБРАННОГО СЕКТОРА
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isDenied = (log.action || '').includes('DENIED') || (log.action || '').includes('LOCKOUT');
                    const isOverride = (log.action || '').includes('OVERRIDE');
                    const isMaint = (log.action || '').includes('MAINTENANCE');

                    let badgeColor = '#00ff88';
                    if (isDenied || isOverride) badgeColor = '#ff2a85';
                    else if (isMaint) badgeColor = '#ffb703';

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded bg-[#0d1324] border border-[#19243e] hover:border-[#2b3a61] transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00f3ff] font-bold">[{log.timestamp || log.time}]</span>
                            <span className="text-gray-300 font-bold">{log.doorLabel || log.doorId}</span>
                          </div>
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider"
                            style={{
                              color: badgeColor,
                              borderColor: `${badgeColor}66`,
                              backgroundColor: `${badgeColor}18`
                            }}
                          >
                            {log.action || log.event}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-gray-300 flex items-center justify-between bg-[#080c18] px-2 py-1 rounded">
                          <span className="text-gray-400">КАРТА: <span className="text-[#00f3ff]">{log.cardId}</span></span>
                          <span className="text-gray-200">{log.holder}</span>
                        </div>

                        {log.studentTitle && (
                          <div className="text-[10px] font-mono text-gray-400">
                            СТАТУС ТАЛАНТА: <span className="text-gray-300">{log.studentTitle}</span>
                          </div>
                        )}

                        <div className="text-[11px] font-mono text-gray-400 leading-relaxed border-t border-[#141d33] pt-1">
                          {log.desc || log.description}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Sensors & Telemetry */}
          {activeDeckTab === 'sensors' && (
            <div className="bg-[#090d1a] border border-[#1b253f] rounded-lg p-3 flex-1 flex flex-col space-y-3">
              <div className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <Activity size={14} className="text-[#00f3ff]" />
                <span>ОПРОС ДАТЧИКОВ ПРИСУТСТВИЯ И ТЕМПЕРАТУРЫ</span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[310px] pr-1">
                {/* Thermal Sensor Card */}
                {currentSector.sensors?.filter(s => s.type === 'thermal').map((sensor) => (
                  <div key={sensor.id} className="p-3 bg-[#0d1324] border border-[#1a2540] rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-gray-200">
                        <Thermometer size={14} className="text-[#00f3ff]" />
                        <span>{sensor.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                        sensor.status === 'ALERT'
                          ? 'bg-[#ff2a85]/20 text-[#ff2a85] border-[#ff2a85]/40'
                          : 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40'
                      }`}>
                        {sensor.status}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-sm font-mono">
                      <span className="text-gray-400 text-xs">ПОКАЗАНИЕ:</span>
                      <span className="text-xl font-bold text-white tracking-wide">{sensor.value || sensor.telemetry}</span>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="w-full h-1.5 bg-[#080c18] rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00f3ff] via-[#ffb703] to-[#ff2a85] transition-all"
                        style={{
                          width: selectedSectorId === 'C' ? '92%' : selectedSectorId === 'B' ? '55%' : '35%'
                        }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">{sensor.telemetry}</div>
                  </div>
                ))}

                {/* Motion Presence Sensor Card */}
                {currentSector.sensors?.filter(s => s.type === 'motion').map((sensor) => (
                  <div key={sensor.id} className="p-3 bg-[#0d1324] border border-[#1a2540] rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-gray-200">
                        <Radio size={14} className="text-[#ffb703]" />
                        <span>{sensor.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                        sensor.status === 'OFFLINE'
                          ? 'bg-[#ff2a85]/20 text-[#ff2a85] border-[#ff2a85]/40'
                          : 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40'
                      }`}>
                        {sensor.status}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-sm font-mono">
                      <span className="text-gray-400 text-xs">СТАТУС СИГНАЛА:</span>
                      <span className="text-sm font-bold text-white tracking-wide">{sensor.value}</span>
                    </div>

                    {/* Simulated Waveform Sparkline */}
                    <div className="flex items-end gap-1 h-6 bg-[#080c18] p-1 rounded">
                      {[4, 8, 12, 6, 2, 0, 16, 22, 18, 5, 0, 0, 0, 0].map((h, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: sensor.status === 'OFFLINE' ? '2px' : `${h}px`,
                            backgroundColor: sensor.status === 'OFFLINE' ? '#ff2a85' : '#00f3ff'
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">{sensor.telemetry}</div>
                  </div>
                ))}

                {/* Door / Barrier Hermetic State */}
                {currentSector.doors?.map((door) => (
                  <div key={door.id} className="p-3 bg-[#0d1324] border border-[#1a2540] rounded space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-gray-200 font-bold">
                        {door.status === 'SEALED' || door.status === 'LOCKED' ? (
                          <Lock size={14} className="text-[#ff2a85]" />
                        ) : (
                          <Unlock size={14} className="text-[#00ff88]" />
                        )}
                        <span>{door.label}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-400">[{door.status}]</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 flex justify-between">
                      <span>ПОСЛЕДНЕЕ СОБЫТИЕ: {door.lastAccess}</span>
                      <span className="text-gray-300">{door.lastUser}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tab 3: CCTV Surveillance Stills */}
          {activeDeckTab === 'cctv' && (
            <div className="bg-[#090d1a] border border-[#1b253f] rounded-lg p-3 flex-1 flex flex-col space-y-3">
              {/* Camera Switcher Pills */}
              <div className="flex items-center gap-1.5">
                {allCameras.map((cam) => {
                  const isActive = activeCamId === cam.id;
                  const isGlitched = Boolean(cam.glitch);
                  return (
                    <button
                      key={cam.id}
                      onClick={() => handleSelectCam(cam.id)}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                        isActive
                          ? isGlitched
                            ? 'bg-[#ff2a85]/20 border-[#ff2a85] text-white shadow-[0_0_10px_rgba(255,42,133,0.3)]'
                            : 'bg-[#00f3ff]/20 border-[#00f3ff] text-white shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                          : 'bg-[#0d1222] border-[#18223a] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Video size={11} className={isGlitched ? 'text-[#ff2a85]' : 'text-[#00f3ff]'} />
                      <span>{cam.id}</span>
                      {isGlitched && <span className="text-[#ff2a85]">⚡</span>}
                    </button>
                  );
                })}
              </div>

              {/* Monitor Screen Frame */}
              <div className="relative aspect-[16/9] bg-[#050811] rounded border border-[#1c2947] overflow-hidden flex flex-col justify-between p-3 select-none">
                {/* CRT Glitch & Static Overlay for CAM-04 */}
                {activeCamera?.glitch ? (
                  <div className="absolute inset-0 bg-[#070104] flex flex-col items-center justify-center overflow-hidden">
                    {/* Scanline bars jitter */}
                    <div
                      className="absolute inset-0 opacity-25 pointer-events-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,42,133,0.15) 0px, rgba(255,42,133,0.15) 2px, transparent 2px, transparent 4px)',
                        backgroundSize: '100% 4px'
                      }}
                    />
                    <div className="z-10 text-center space-y-2 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ff2a85]/20 border border-[#ff2a85] text-[#ff2a85] text-xs font-mono font-bold rounded animate-pulse">
                        <AlertTriangle size={14} />
                        <span>ПОТЕРЯ СИГНАЛА CAM-04 // СБОЙ ПИТАНИЯ</span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-300">
                        21:45:00 • Аварийный обрыв кабеля передачи данных
                      </p>
                      <p className="text-[10px] font-mono text-[#ff2a85]">
                        ПОСЛЕДНИЙ КОРРЕКТНЫЙ КАДР: 21:44:58 (ЗАФИКСИРОВАН)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[#040813] flex items-center justify-center">
                    {/* Simulated Camera Still Vector Graphics */}
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center relative opacity-85">
                      <div className="w-36 h-28 border border-[#00f3ff]/40 rounded flex items-center justify-center relative">
                        <div className="w-4 h-4 border-t border-l border-[#00f3ff] absolute top-1 left-1" />
                        <div className="w-4 h-4 border-t border-r border-[#00f3ff] absolute top-1 right-1" />
                        <div className="w-4 h-4 border-b border-l border-[#00f3ff] absolute bottom-1 left-1" />
                        <div className="w-4 h-4 border-b border-r border-[#00f3ff] absolute bottom-1 right-1" />
                        <Eye size={24} className="text-[#00f3ff] animate-pulse" />
                      </div>
                      <div className="text-[10px] font-mono text-[#00f3ff] mt-2">
                        {activeCamera?.name || activeCamera?.label}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Telemetry Overlay */}
                <div className="relative z-20 flex items-center justify-between text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeCamera?.glitch ? 'bg-[#ff2a85] animate-ping' : 'bg-[#00ff88] animate-pulse'}`} />
                    <span className="font-bold">{activeCamera?.glitch ? 'NO SIGNAL' : '● REC'} [{activeCamera?.id}]</span>
                  </div>
                  <span>{activeCamera?.still?.timestamp || '21:47:33'}</span>
                  <span>FPS: {activeCamera?.fps}</span>
                </div>

                {/* Bottom Overlay Action Button */}
                <div className="relative z-20 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-gray-400 bg-black/60 px-2 py-0.5 rounded">
                    CODEC: H.264-MONO // ARCHIVE_SEC
                  </span>
                  <button
                    onClick={() => {
                      SoundFX.playClick();
                      setCctvModalOpen(true);
                    }}
                    className="px-2 py-1 bg-[#12192d] hover:bg-[#1a2542] border border-[#00f3ff]/40 text-[#00f3ff] rounded text-[10px] font-mono flex items-center gap-1 transition-all"
                  >
                    <Maximize2 size={11} />
                    <span>УВЕЛИЧИТЬ СТОП-КАДР</span>
                  </button>
                </div>
              </div>

              {/* Forensic Details Card */}
              {activeCamera?.still && (
                <div className="p-2.5 rounded bg-[#0d1324] border border-[#19243e] text-[11px] font-mono space-y-1">
                  <div className="text-[#00f3ff] font-bold flex items-center justify-between">
                    <span>{activeCamera.still.title}</span>
                    <span className="text-gray-400 text-[10px]">{activeCamera.still.timestamp}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-[10px]">
                    {activeCamera.still.desc}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nagito Komaeda Persona Commentary Box */}
      <div className="bg-[#0b0e1b] border-l-4 border-l-[#00ff88] border border-[#1a233b] p-4 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-4">
          {/* Clover / Nagito Badge */}
          <div className="w-12 h-12 rounded-lg bg-[#0f172a] border border-[#00ff88]/40 flex-shrink-0 flex items-center justify-center relative shadow-[0_0_15px_rgba(0,255,136,0.2)]">
            <Sparkles size={24} className="text-[#00ff88]" />
            <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold bg-[#00ff88] text-black px-1 rounded">
              77-B
            </span>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#00ff88] tracking-widest uppercase">
                СУДЕБНЫЙ КУРАТОР // НАГИТО КОМАЭДА
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                КОНТЕКСТНЫЙ АНАЛИЗ СЕКТОРА [{selectedSectorId}]
              </span>
            </div>
            <p className="text-xs font-mono text-gray-300 italic leading-relaxed">
              «{currentSector.nagitoCommentary}»
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen CCTV Still Modal */}
      {cctvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0d18] border border-[#00f3ff] rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-[0_0_30px_rgba(0,243,255,0.3)]">
            <div className="flex items-center justify-between border-b border-[#1b253f] pb-3">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-[#00f3ff]" />
                <span className="text-sm font-mono font-bold text-white tracking-wide">
                  КРИМИНАЛИСТИЧЕСКИЙ СТОП-КАДР // {activeCamera?.id}
                </span>
              </div>
              <button
                onClick={() => setCctvModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#18233c] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Enlarged Forensic Image Mockup */}
            <div className="relative aspect-video bg-[#050811] rounded border border-[#1e2c4d] overflow-hidden flex items-center justify-center p-4">
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, #00f3ff 0px, #00f3ff 1px, transparent 1px, transparent 3px)',
                  backgroundSize: '100% 3px'
                }}
              />
              <div className="text-center space-y-2 z-10 p-4">
                <div className="text-lg font-mono font-bold text-[#00f3ff]">
                  {activeCamera?.still?.title || activeCamera?.name}
                </div>
                <div className="text-xs font-mono text-gray-300 max-w-md mx-auto leading-relaxed">
                  {activeCamera?.still?.desc || 'Архивная видеозапись служебного протокола.'}
                </div>
                <div className="pt-2 text-[10px] font-mono text-gray-500">
                  МАРКИРОВКА СУДА: EVIDENCE-PHOTO // SHINRI TRIAL 0271
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCctvModalOpen(false)}
                className="px-4 py-2 bg-[#12192d] hover:bg-[#192440] border border-[#00f3ff]/40 text-[#00f3ff] rounded font-mono text-xs font-bold transition-all"
              >
                ЗАКРЫТЬ ПРОСМОТРЩИК
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
