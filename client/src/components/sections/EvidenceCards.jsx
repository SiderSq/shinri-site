import React, { useState } from 'react';
import { Key, Target, Clock, ShieldCheck, ChevronRight, Zap, Sparkles } from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function EvidenceCards({ evidence, onNavigateToReconstruction }) {
  const [activeEvidenceId, setActiveEvidenceId] = useState(null);

  const handleCardClick = (id) => {
    SoundFX.playClick();
    setActiveEvidenceId(activeEvidenceId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
        <div>
          <span className="text-xs font-mono text-[#ff2a85] uppercase tracking-wider block">
            ЦЕНТРАЛЬНЫЕ ДОКАЗАТЕЛЬСТВА // TRUTH BULLETS
          </span>
          <h2 className="text-lg sm:text-xl font-cyber font-bold text-white">
            06 КАРТОТЕКА УЛИК
          </h2>
        </div>
        <span className="text-xs font-mono text-[#00ff88] bg-[#00ff88]/10 px-2.5 py-1 border border-[#00ff88]/30 font-bold">
          ВЕЩДОКОВ В ОБОЙМЕ: {evidence?.length || 0}
        </span>
      </div>

      <p className="text-xs font-mono text-gray-400">
        Каждая улика опровергает ложные показания одного из подозреваемых и содержит фрагмент имени истинного виновника.
      </p>

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(evidence || []).map((item) => {
          const isExpanded = activeEvidenceId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              className={`cyber-panel p-5 cursor-pointer transition-all border ${
                isExpanded
                  ? 'bg-[#150f1c] border-[#ff2a85] shadow-[0_0_15px_rgba(255,42,133,0.25)]'
                  : 'bg-[#0b0e18] border-[#1e2740] hover:border-[#00f3ff]'
              }`}
            >
              {/* Card Top: Number, Type, Linked Letter */}
              <div className="flex items-center justify-between border-b border-[#1f2842] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-cyber font-bold text-xs bg-[#ff2a85] text-white px-2 py-0.5 rounded-sm">
                    #{item.number}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    {item.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-500">
                    ПОЗИЦИЯ: <strong>#{item.position}</strong>
                  </span>
                  <span className="font-cyber font-bold text-sm bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-2 py-0.5 rounded">
                    [{item.linkedLetter}]
                  </span>
                </div>
              </div>

              {/* Title & Danganronpa Bullet Name */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-[#00f3ff] text-xs font-mono font-semibold">
                  <Target size={13} />
                  <span>ПУЛЯ ПРАВДЫ: {item.truthBulletName || item.title}</span>
                </div>
                <h3 className="font-cyber font-bold text-white text-sm">
                  {item.title}
                </h3>
              </div>

              {/* Description */}
              <p className="font-mono text-xs text-gray-300 leading-relaxed bg-[#0e1220] p-3 rounded border border-[#182136]">
                {item.description}
              </p>

              {/* Meta details */}
              <div className="mt-3 pt-2 border-t border-[#182136] flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400">
                <span>ИСТОЧНИК: <strong className="text-gray-300">{item.source}</strong></span>
                <span>ВРЕМЯ: <strong className="text-amber-400">{item.time}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action banner to go to Reconstruction */}
      <div className="p-4 bg-[#140e1c] border border-[#ff2a85]/50 rounded flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-cyber font-bold text-white">
            <Sparkles size={16} className="text-[#ff2a85]" />
            <span>Улики собраны? Переходите к Реконструкции Имени!</span>
          </div>
          <p className="text-xs font-mono text-gray-400">
            Сопоставьте номера позиций улик с найденными буквами и сложите имя убийцы.
          </p>
        </div>

        <button
          onClick={onNavigateToReconstruction}
          className="dr-btn dr-btn-primary py-2 px-4 text-xs font-cyber flex items-center gap-1.5"
        >
          <span>ПЕРЕЙТИ К РЕКОНСТРУКЦИИ</span>
          <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
}
