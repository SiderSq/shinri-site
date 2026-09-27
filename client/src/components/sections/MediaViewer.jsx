import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Camera,
  ZoomIn,
  Clock,
  Tag,
  Copy,
  Check,
  Sparkles,
  Sliders,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function MediaViewer({ media = [] }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterMode, setFilterMode] = useState('normal'); // 'normal' | 'contrast' | 'thermal' | 'invert'
  const [copiedId, setCopiedId] = useState(null);

  const handleOpenPhoto = (photo) => {
    SoundFX.playClick();
    setSelectedPhoto(photo);
    setFilterMode('normal');
  };

  const handleClose = () => {
    SoundFX.playClick();
    setSelectedPhoto(null);
  };

  const handleCopyEvidence = (item, e) => {
    if (e) e.stopPropagation();
    SoundFX.playClick();
    const text = `[Улика Shinri Trial // ${item.title}] ${item.desc}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Helper to generate visual SVG graphics representing Garry's Mod crime scene photos
  const renderVisualArtifact = (item, activeFilter = 'normal') => {
    let filterClass = '';
    if (activeFilter === 'contrast') filterClass = 'contrast-150 brightness-110 saturate-150';
    if (activeFilter === 'invert') filterClass = 'invert hue-rotate-180';
    if (activeFilter === 'thermal') filterClass = 'hue-rotate-90 saturate-200 contrast-125';

    // If user provided an actual Garry's Mod screenshot URL
    if (item.customImageUrl) {
      return (
        <img
          src={item.customImageUrl}
          alt={item.title}
          className={`w-full h-48 sm:h-56 object-cover transition-all ${filterClass}`}
        />
      );
    }

    // 1. Corpse with bear trap in Incinerator Room
    if (item.svgType === 'corpse_trap') {
      return (
        <svg viewBox="0 0 320 180" className={`w-full h-48 sm:h-56 bg-[#070912] border border-[#1b233a] transition-all ${filterClass}`}>
          {/* Incinerator background furnace */}
          <rect x="210" y="25" width="85" height="105" fill="#180e0e" stroke="#ff5500" strokeWidth="2" rx="4" />
          <line x1="225" y1="45" x2="280" y2="45" stroke="#ff3300" strokeWidth="2" />
          <line x1="225" y1="65" x2="280" y2="65" stroke="#ff3300" strokeWidth="2" />
          <line x1="225" y1="85" x2="280" y2="85" stroke="#ff3300" strokeWidth="2" />
          <rect x="235" y="98" width="35" height="20" fill="#3a1005" stroke="#ff7700" strokeWidth="1" />
          <text x="252" y="112" fill="#ff7700" fontSize="8" fontFamily="monospace" textAnchor="middle">ПЕЧЬ</text>

          {/* Floor grid */}
          <line x1="0" y1="125" x2="320" y2="125" stroke="#162035" strokeWidth="1" />
          <line x1="60" y1="125" x2="20" y2="180" stroke="#162035" strokeWidth="1" />
          <line x1="160" y1="125" x2="140" y2="180" stroke="#162035" strokeWidth="1" />

          {/* Wiped mop water streaks (Cleaning attempt) */}
          <path d="M 40 148 Q 110 138 180 150" stroke="#00f3ff" strokeWidth="8" strokeOpacity="0.25" strokeLinecap="round" fill="none" />
          <path d="M 60 162 Q 130 152 210 160" stroke="#00f3ff" strokeWidth="6" strokeOpacity="0.2" strokeLinecap="round" fill="none" />

          {/* Danganronpa Pink Blood (partially wiped) */}
          <ellipse cx="140" cy="144" rx="35" ry="12" fill="#ff2a85" fillOpacity="0.55" />
          <circle cx="105" cy="148" r="5" fill="#ff2a85" fillOpacity="0.6" />
          <circle cx="175" cy="140" r="6" fill="#ff2a85" fillOpacity="0.5" />

          {/* Silhouette corpse */}
          <path d="M 65 138 L 125 133 L 160 140 L 195 145" stroke="#253255" strokeWidth="14" strokeLinecap="round" />
          <circle cx="60" cy="135" r="11" fill="#2d3b63" />

          {/* White zip-ties on victim wrists */}
          <rect x="110" y="128" width="6" height="10" rx="1" fill="#ffffff" stroke="#00f3ff" strokeWidth="1" />
          <text x="113" y="123" fill="#ffffff" fontSize="7" fontFamily="monospace" textAnchor="middle">СТЯЖКИ</text>

          {/* Steel Bear Trap Jaws clamped on victim's leg */}
          <g transform="translate(175, 128)">
            <ellipse cx="0" cy="10" rx="20" ry="11" fill="#181e2e" stroke="#00f3ff" strokeWidth="2" />
            <path d="M -16 6 L -12 -2 L -8 6 L -4 -2 L 0 6 L 4 -2 L 8 6 L 12 -2 L 16 6" stroke="#ff2a85" strokeWidth="2" fill="none" />
            <circle cx="0" cy="10" r="4" fill="#ff2a85" />
          </g>

          <text x="12" y="20" fill="#ff2a85" fontSize="10" fontFamily="monospace" fontWeight="bold">● МУСОРОСЖИГАТЕЛЬ // ТЕЛО ЖЕРТВЫ</text>
          <text x="12" y="168" fill="#00f3ff" fontSize="9" fontFamily="monospace">УЛИКИ: КАПКАН, СТЯЖКИ, ЗАМЫТЫЙ ПОЛ</text>
        </svg>
      );
    }

    // 2. Handover spot (The suspicious meeting corner with question)
    if (item.svgType === 'handover_spot') {
      return (
        <svg viewBox="0 0 320 180" className={`w-full h-48 sm:h-56 bg-[#070912] border border-[#1b233a] transition-all ${filterClass}`}>
          {/* Dim corridor corner */}
          <rect x="0" y="0" width="320" height="180" fill="#060810" />
          <polygon points="0,0 120,40 120,180 0,180" fill="#0c111e" />
          <polygon points="120,40 320,0 320,180 120,180" fill="#0e1526" />

          {/* Tool crate in corner */}
          <rect x="90" y="110" width="55" height="40" fill="#1a253d" stroke="#33466e" strokeWidth="1.5" />
          <line x1="90" y1="125" x2="145" y2="125" stroke="#33466e" />

          {/* Question mark overlay in circle */}
          <circle cx="160" cy="85" r="28" fill="#141c30" stroke="#ffb703" strokeWidth="2" strokeDasharray="4 2" />
          <text x="160" y="94" fill="#ffb703" fontSize="24" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">?</text>

          {/* Footprints in dust */}
          <ellipse cx="145" cy="155" rx="5" ry="9" fill="#2d3b55" />
          <ellipse cx="175" cy="152" rx="4" ry="8" fill="#2d3b55" />

          <text x="12" y="20" fill="#ffb703" fontSize="10" fontFamily="monospace" fontWeight="bold">● МЕСТО ТАЙНОЙ ВСТРЕЧИ У СКЛАДА</text>
          <text x="12" y="168" fill="#8899aa" fontSize="9" fontFamily="monospace">«ВОЗМОЖНО, ЗДЕСЬ ПЕРЕДАН КАПКАН СООБЩНИКУ?»</text>
        </svg>
      );
    }

    // 3. Electric trap at threshold
    if (item.svgType === 'electric_trap') {
      return (
        <svg viewBox="0 0 320 180" className={`w-full h-48 sm:h-56 bg-[#070912] border border-[#1b233a] transition-all ${filterClass}`}>
          {/* Threshold doorframe */}
          <rect x="20" y="20" width="280" height="140" fill="#090c17" stroke="#1d2745" strokeWidth="2" />
          <line x1="20" y1="140" x2="300" y2="140" stroke="#2a3a60" strokeWidth="3" />

          {/* Scorch mark on floor */}
          <ellipse cx="160" cy="145" rx="50" ry="16" fill="#120c18" stroke="#ff2a85" strokeWidth="1" strokeDasharray="3 2" />

          {/* Battery power unit */}
          <rect x="80" y="120" width="35" height="24" fill="#1b2438" stroke="#00f3ff" strokeWidth="1.5" rx="2" />
          <rect x="92" y="116" width="11" height="4" fill="#00f3ff" />
          <text x="97" y="135" fill="#00f3ff" fontSize="8" fontFamily="monospace" textAnchor="middle">12V</text>

          {/* Copper stripped wires leading across threshold */}
          <path d="M 115 132 Q 135 145 160 142 T 215 138" stroke="#d97706" strokeWidth="2.5" fill="none" />
          <path d="M 115 136 Q 140 152 170 148 T 225 142" stroke="#b45309" strokeWidth="2" fill="none" />

          {/* Spark discharge lightning bolts */}
          <path d="M 155 140 L 162 125 L 158 125 L 168 110 L 164 125 L 170 125 Z" fill="#00f3ff" />
          <path d="M 175 142 L 180 132 L 177 132 L 184 120 L 181 132 L 186 132 Z" fill="#ff2a85" />

          <text x="12" y="20" fill="#00f3ff" fontSize="10" fontFamily="monospace" fontWeight="bold">● ОСТАТКИ ЭЛЕКТРОЛОВУШКИ У ВХОДА</text>
          <text x="12" y="168" fill="#ff2a85" fontSize="9" fontFamily="monospace">ОГЛУШЕНИЕ ЖЕРТВЫ ЭЛЕКТРОРАЗРЯДОМ</text>
        </svg>
      );
    }

    // 4. Mop and wet cleanup evidence
    if (item.svgType === 'mop_cleanup') {
      return (
        <svg viewBox="0 0 320 180" className={`w-full h-48 sm:h-56 bg-[#070912] border border-[#1b233a] transition-all ${filterClass}`}>
          {/* Tile floor with wet reflections */}
          <rect x="0" y="110" width="320" height="70" fill="#0c111e" />
          <path d="M 30 135 Q 120 125 210 135 T 300 130" stroke="#00f3ff" strokeWidth="12" strokeOpacity="0.2" fill="none" />
          <path d="M 50 155 Q 140 145 230 155" stroke="#ff2a85" strokeWidth="8" strokeOpacity="0.25" fill="none" />

          {/* Cleaning Bucket with wheels */}
          <rect x="70" y="80" width="55" height="50" fill="#18233a" stroke="#00f3ff" strokeWidth="1.5" rx="3" />
          <circle cx="80" cy="133" r="5" fill="#304163" />
          <circle cx="115" cy="133" r="5" fill="#304163" />
          {/* Pink soapy solution inside bucket */}
          <ellipse cx="97" cy="85" rx="24" ry="7" fill="#ff2a85" fillOpacity="0.7" />

          {/* Mop handle and head */}
          <line x1="97" y1="85" x2="165" y2="15" stroke="#8d99ae" strokeWidth="4" strokeLinecap="round" />
          <path d="M 85 85 Q 97 98 110 85" stroke="#e0e1dd" strokeWidth="6" strokeLinecap="round" fill="none" />

          {/* Water drips & bubbles */}
          <circle cx="135" cy="140" r="3" fill="#ff2a85" fillOpacity="0.8" />
          <circle cx="150" cy="148" r="2" fill="#00f3ff" fillOpacity="0.7" />
          <circle cx="165" cy="138" r="4" fill="#00f3ff" fillOpacity="0.5" />

          <text x="12" y="20" fill="#ff2a85" fontSize="10" fontFamily="monospace" fontWeight="bold">● УЛИКА СОКРЫТИЯ // ШВАБРА И ВЕДРО</text>
          <text x="12" y="168" fill="#00f3ff" fontSize="9" fontFamily="monospace">УБОРКА ОТПЕЧАТКОВ И СМЫТАЯ КРОВЬ</text>
        </svg>
      );
    }

    // 5. Workbench in workshop
    return (
      <svg viewBox="0 0 320 180" className={`w-full h-48 sm:h-56 bg-[#070912] border border-[#1b233a] transition-all ${filterClass}`}>
        {/* Wooden workbench tabletop */}
        <rect x="30" y="65" width="260" height="70" fill="#1b1612" stroke="#4a3720" strokeWidth="2" rx="2" />
        <line x1="30" y1="85" x2="290" y2="85" stroke="#332414" strokeWidth="2" />

        {/* Vice on left edge */}
        <rect x="40" y="50" width="25" height="25" fill="#33415c" stroke="#5c677d" strokeWidth="1.5" />

        {/* Pack of white zip ties */}
        <rect x="90" y="72" width="45" height="15" fill="#ffffff" stroke="#00f3ff" strokeWidth="1" rx="1" />
        <line x1="95" y1="75" x2="130" y2="75" stroke="#94a3b8" strokeWidth="1" />
        <line x1="95" y1="80" x2="130" y2="80" stroke="#94a3b8" strokeWidth="1" />
        <text x="112" y="100" fill="#ffffff" fontSize="8" fontFamily="monospace" textAnchor="middle">СТЯЖКИ</text>

        {/* Wire cutter pliers */}
        <path d="M 155 70 L 175 88 M 175 70 L 155 88" stroke="#ff2a85" strokeWidth="3" strokeLinecap="round" />

        {/* Empty spot where trap was crafted */}
        <rect x="195" y="70" width="70" height="35" fill="#100b14" stroke="#ff2a85" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="230" y="91" fill="#ff2a85" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">МЕСТО КАПКАНА</text>

        <text x="12" y="20" fill="#00f3ff" fontSize="10" fontFamily="monospace" fontWeight="bold">● ВЕРСТАК В МАСТЕРСКОЙ</text>
        <text x="12" y="168" fill="#ffb703" fontSize="9" fontFamily="monospace">СЛЕДЫ СБОРКИ ЛОВУШЕК И СТЯЖЕК</text>
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
        <div>
          <span className="text-xs font-mono text-[#00f3ff] uppercase tracking-wider block">
            СНИМКИ С МЕСТА СОБЫТИЙ // FORENSIC EVIDENCE
          </span>
          <h2 className="text-lg sm:text-xl font-cyber font-bold text-white flex items-center gap-2">
            <Camera className="text-[#00f3ff]" size={20} />
            <span>03 ФОТОГРАФИИ И УЛИКИ</span>
          </h2>
        </div>
        <span className="text-xs font-mono text-gray-400 bg-[#0e1322] px-2.5 py-1 border border-[#1e263d]">
          СНИМКОВ В ДЕЛЕ: {media.length}
        </span>
      </div>

      <p className="text-xs font-mono text-gray-400">
        Материалы фотофиксации расследования. Вы можете сопоставлять снимки места преступления и передачу орудия для установления истины.
      </p>

      {/* Grid of Media Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {media.map((item) => (
          <div
            key={item.id}
            className="cyber-panel bg-[#0b0e17] border border-[#1e263e] overflow-hidden group hover:border-[#00f3ff] transition-all flex flex-col justify-between"
          >
            {/* Visual Canvas Container */}
            <div className="relative cursor-pointer overflow-hidden" onClick={() => handleOpenPhoto(item)}>
              {renderVisualArtifact(item)}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="dr-btn dr-btn-cyan text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <ZoomIn size={14} />
                  <span>ИНСПЕКЦИЯ СНИМКА</span>
                </span>
              </div>

              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur border border-[#1e263d] px-2 py-0.5 rounded text-[10px] font-mono text-[#00f3ff]">
                {item.camera || 'СНИМОК'}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="p-3.5 space-y-2 font-mono text-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">
                    {item.title}
                  </span>
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <Clock size={11} className="text-amber-400" />
                    {item.time}
                  </span>
                </div>

                <p className="text-gray-300 text-[11px] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-[#162035] flex items-center justify-between">
                <span className="text-[10px] text-[#00f3ff] font-semibold">
                  [{item.tag}]
                </span>

                <button
                  onClick={(e) => handleCopyEvidence(item, e)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#00f3ff] transition-all p-1"
                  title="Скопировать описание улики для чата суда"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={12} className="text-[#00ff88]" />
                      <span className="text-[#00ff88]">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Копировать для суда</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl cyber-panel p-6 bg-[#0a0d16] border-2 border-[#00f3ff] shadow-[0_0_40px_rgba(0,243,255,0.3)] animate-scale-up space-y-4 font-mono">
            
            <div className="flex items-center justify-between border-b border-[#1f2842] pb-3">
              <div>
                <span className="text-xs text-[#00f3ff] uppercase block">
                  ДЕТАЛЬНАЯ ИНСПЕКЦИЯ УЛИКИ // {selectedPhoto.code}
                </span>
                <h3 className="font-cyber font-bold text-white text-base">
                  {selectedPhoto.title}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Filter Toggle Toolbar */}
            <div className="flex items-center justify-between text-xs bg-[#060810] p-2 border border-[#18233a] rounded">
              <span className="text-gray-500 flex items-center gap-1">
                <Sliders size={12} />
                <span>ОБРАБОТКА ИЗОБРАЖЕНИЯ:</span>
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterMode('normal')}
                  className={`px-2 py-0.5 rounded text-[11px] border ${
                    filterMode === 'normal'
                      ? 'bg-[#152038] border-[#00f3ff] text-[#00f3ff] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Оригинал
                </button>
                <button
                  onClick={() => setFilterMode('contrast')}
                  className={`px-2 py-0.5 rounded text-[11px] border ${
                    filterMode === 'contrast'
                      ? 'bg-[#152038] border-[#00f3ff] text-[#00f3ff] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Контраст
                </button>
                <button
                  onClick={() => setFilterMode('thermal')}
                  className={`px-2 py-0.5 rounded text-[11px] border ${
                    filterMode === 'thermal'
                      ? 'bg-[#152038] border-[#00f3ff] text-[#00f3ff] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Спектр
                </button>
                <button
                  onClick={() => setFilterMode('invert')}
                  className={`px-2 py-0.5 rounded text-[11px] border ${
                    filterMode === 'invert'
                      ? 'bg-[#152038] border-[#00f3ff] text-[#00f3ff] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Инверсия
                </button>
              </div>
            </div>

            <div className="border border-[#1f2842] overflow-hidden rounded bg-black">
              {renderVisualArtifact(selectedPhoto, filterMode)}
            </div>

            <div className="p-4 bg-[#0e1322] border border-[#1b233a] text-xs space-y-2 text-gray-300">
              <div className="flex justify-between text-[11px] text-gray-400 border-b border-gray-800 pb-1">
                <span>ИСТОЧНИК: <strong className="text-white">{selectedPhoto.camera}</strong></span>
                <span>ВРЕМЯ: <strong className="text-amber-400">{selectedPhoto.time}</strong></span>
                <span>МЕТКА: <strong className="text-[#00f3ff]">{selectedPhoto.tag}</strong></span>
              </div>
              <p className="leading-relaxed">
                {selectedPhoto.desc}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={(e) => handleCopyEvidence(selectedPhoto, e)}
                className="dr-btn py-1.5 px-4 text-xs font-cyber flex items-center gap-1.5 border-[#00f3ff]/50 text-[#00f3ff]"
              >
                {copiedId === selectedPhoto.id ? <Check size={14} className="text-[#00ff88]" /> : <Copy size={14} />}
                <span>{copiedId === selectedPhoto.id ? 'СКОПИРОВАНО!' : 'СКОПИРОВАТЬ ДЛЯ СУДА'}</span>
              </button>

              <button onClick={handleClose} className="dr-btn py-1.5 px-4 text-xs font-cyber">
                ЗАКРЫТЬ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
