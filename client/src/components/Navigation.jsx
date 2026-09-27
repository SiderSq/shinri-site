import React from 'react';
import {
  FileText,
  Radio,
  Image as ImageIcon,
  FolderOpen,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function Navigation({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, isSolved }) {
  const tabs = [
    { id: 'overview', number: '01', title: 'ОБЗОР ДЕЛА', icon: FolderOpen },
    { id: 'documents', number: '02', title: 'ФАЙЛ МОНОКУМЫ', icon: FileText },
    { id: 'media', number: '03', title: 'ФОТОАРХИВ СУДА', icon: ImageIcon },
    { id: 'puzzles', number: '04', title: 'ЛАБОРАТОРИЯ УЛИК', icon: Radio },
    { id: 'reconstruction', number: '05', title: 'РЕКОНСТРУКЦИЯ ИМЕНИ', icon: Sparkles, highlight: true }
  ];

  const handleSelectTab = (id) => {
    SoundFX.playClick();
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#0d101a] border-b border-[#1e263d]">
        <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
          <span className="text-[#00f3ff] font-bold">РАЗДЕЛ:</span>
          <span>{tabs.find(t => t.id === activeTab)?.title}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-[#131726] border border-[#2a3655] text-[#00f3ff] rounded flex items-center gap-1.5 text-xs font-mono"
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          <span>МЕНЮ</span>
        </button>
      </div>

      {/* Navigation List (Desktop Sidebar & Mobile Drawer) */}
      <nav
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-[#0a0d16] border-r border-[#1e263d] p-3 space-y-1 select-none flex-shrink-0`}
      >
        <div className="px-3 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-[#1a2033] mb-2 flex items-center justify-between">
          <span>АРХИВ ТЕРМИНАЛА</span>
          {isSolved && <span className="text-[#00ff88] font-bold">✓ РАСКРЫТО</span>}
        </div>

        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-mono transition-all text-left border ${
                  isActive
                    ? tab.highlight
                      ? 'bg-[#ff2a85]/20 border-[#ff2a85] text-white font-bold shadow-[0_0_12px_rgba(255,42,133,0.3)]'
                      : 'bg-[#151d30] border-[#00f3ff] text-[#00f3ff] font-bold shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                    : tab.highlight
                    ? 'border-[#ff2a85]/40 text-[#ff2a85] hover:bg-[#ff2a85]/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#121626]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? (tab.highlight ? 'text-[#ff2a85]' : 'text-[#00f3ff]') : 'text-gray-500'} />
                  <span className="tracking-wide">{tab.title}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">{tab.number}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom System Info Widget */}
        <div className="pt-4 mt-4 border-t border-[#1a2033] text-[10px] font-mono text-gray-500 px-3 space-y-1 hidden md:block">
          <div>СТАТУС БАЗЫ: <span className="text-[#00ff88]">ВОССТАНОВЛЕНО</span></div>
          <div>СНИМОК: <span className="text-gray-300">АКТИВЕН</span></div>
          <div className="text-[9px] text-gray-600 pt-1">SHINRI TRIAL // NODE 04-271</div>
        </div>
      </nav>
    </>
  );
}
