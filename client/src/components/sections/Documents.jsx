import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  User,
  Tag,
  Copy,
  Check,
  Skull,
  FileSearch,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function Documents({ documents = [] }) {
  const [selectedId, setSelectedId] = useState(documents?.[0]?.id || 'DOC_01');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        doc.title?.toLowerCase().includes(q) ||
        doc.code?.toLowerCase().includes(q) ||
        doc.author?.toLowerCase().includes(q) ||
        doc.content?.toLowerCase().includes(q) ||
        doc.tags?.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [documents, searchQuery]);

  const selectedDoc = documents.find(d => d.id === selectedId) || filteredDocs[0] || documents[0];

  const handleSelect = (id) => {
    SoundFX.playClick();
    setSelectedId(id);
  };

  const handleCopyDocSnippet = () => {
    if (!selectedDoc) return;
    SoundFX.playClick();
    const snippet = `[Shinri Trial // ${selectedDoc.title}]\n${selectedDoc.content}`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    });
  };

  const isMonokumaFile = selectedDoc?.code?.includes('MONOKUMA') || selectedDoc?.category?.includes('Монокум');

  return (
    <div className="documents-view space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
        <div>
          <span className="text-sm font-interface text-[#6ddce5] uppercase tracking-wider block">
            МАТЕРИАЛЫ СЛЕДСТВИЯ // MONOKUMA PROTOCOL
          </span>
          <h2 className="text-lg sm:text-xl font-interface font-bold text-white flex items-center gap-2">
            <FileText className="text-[#ff2a85]" size={20} />
            <span>Материалы дела</span>
          </h2>
        </div>
        <span className="text-sm font-interface text-gray-400 bg-[#0e1322] px-2.5 py-1 border border-[#1e263d]">
          ДОКУМЕНТОВ: {filteredDocs.length} / {documents.length}
        </span>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 gap-3 bg-[#0a0d16] p-2.5 border border-[#1a2238] rounded font-interface text-sm">
        <span className="text-gray-400 hidden sm:inline">
          Изучите официальные данные от Монокумы и свидетельские показания:
        </span>
        <div className="w-full sm:w-72">
          <input
            type="search" aria-label="Поиск по материалам дела"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по материалам дела..."
            className="dr-input text-sm px-3 py-1.5 font-interface w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Document List */}
        <div className="min-w-0 lg:col-span-4 space-y-2">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            const isMono = doc.code?.includes('MONOKUMA') || doc.category?.includes('Монокум');

            return (
              <button
                key={doc.id}
                onClick={() => handleSelect(doc.id)}
                className={`w-full text-left p-3 rounded transition-all border font-interface ${
                  isSelected
                    ? isMono
                      ? 'bg-[#20101b] border-[#ff2a85] text-white shadow-[0_0_14px_rgba(255,42,133,0.3)]'
                      : 'bg-[#151d32] border-[#6ddce5] text-white shadow-[0_0_12px_rgba(109,220,229,0.25)]'
                    : 'bg-[#0c0f1a] border-[#182035] text-gray-400 hover:text-gray-200 hover:bg-[#101524]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? isMono
                        ? 'bg-[#ff2a85] text-[#07080d]'
                        : 'bg-[#6ddce5] text-black'
                      : 'bg-[#182136] text-gray-400'
                  }`}>
                    [{doc.code}]
                  </span>
                  <span className="text-sm text-gray-500">{doc.time}</span>
                </div>
                <div className="text-sm font-semibold tracking-wide text-gray-200 line-clamp-1">
                  {doc.title}
                </div>
                <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate flex items-center gap-1">
                    <User size={10} />
                    {doc.author}
                  </span>
                  <span className="text-sm text-[#6ddce5]/70 font-semibold uppercase">
                    {doc.category}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="p-6 text-center text-gray-500 font-interface text-sm border border-[#1b233a] rounded">
              Документы не найдены
            </div>
          )}
        </div>

        {/* Right: Active Document Viewer */}
        <div className="document-viewer min-w-0 lg:col-span-8 cyber-panel p-5 bg-[#090c15] border border-[#202945] relative space-y-4 font-interface">
          {selectedDoc ? (
            <div className="space-y-4">
              
              {/* Monokuma File Stylized Top Banner if applicable */}
              {isMonokumaFile ? (
                <div className="bg-gradient-to-r from-[#ff2a85]/30 via-[#260f1d] to-[#0d0f17] border-l-4 border-[#ff2a85] p-3 rounded flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Skull className="text-[#ff2a85] animate-pulse" size={18} />
                    <span className="font-interface font-bold tracking-wider text-white">
                      ОФИЦИАЛЬНЫЙ ФАЙЛ МОНОКУМЫ // ПРИГОВОР КЛАССНОГО СУДА
                    </span>
                  </div>
                  <span className="text-sm font-interface text-[#ff2a85] font-bold uppercase">
                    MONOKUMA FILE
                  </span>
                </div>
              ) : (
                <div className="bg-[#0e1628] border-l-4 border-[#6ddce5] p-2.5 rounded text-sm flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gray-300 font-bold flex items-center gap-2">
                    <FileSearch size={15} className="text-[#6ddce5]" />
                    <span>СВИДЕТЕЛЬСКИЕ МАТЕРИАЛЫ КЛАССНОГО СУДА</span>
                  </span>
                  <span className="text-sm text-gray-400">РЕФ: {selectedDoc.code}</span>
                </div>
              )}

              {/* Document Stamp Header */}
              <div className="border-b border-[#1b233a] pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-[#ff2a85] font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>{selectedDoc.category || 'МАТЕРИАЛ ДЕЛА'}</span>
                    <span className="text-gray-600">//</span>
                    <span className="text-gray-400">ФИКСАЦИЯ: {selectedDoc.time}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-interface font-bold text-white mt-0.5">
                    {selectedDoc.title}
                  </h3>
                  <div className="text-sm text-gray-400 mt-0.5">
                    АВТОР: <strong className="text-gray-200">{selectedDoc.author}</strong>
                  </div>
                </div>

                <button
                  onClick={handleCopyDocSnippet}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121a2d] hover:bg-[#1a2745] border border-[#233355] hover:border-[#6ddce5] text-gray-300 hover:text-[#6ddce5] rounded text-sm transition-all font-bold"
                  title="Скопировать выдержку для чата суда"
                >
                  {copiedSnippet ? <Check size={14} className="text-[#78dfa7]" /> : <Copy size={14} />}
                  <span>{copiedSnippet ? 'Скопировано' : 'Скопировать для суда'}</span>
                </button>
              </div>

              {/* Tags */}
              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-sm bg-[#121829] border border-[#212c47] text-gray-400 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Document Text Body (Clean and easy to read during GMod voice/text RP) */}
              <div className="document-body p-4 sm:p-5 bg-[#0e121e] border border-[#1a2238] rounded text-sm sm:text-sm text-gray-200 whitespace-pre-line leading-relaxed shadow-inner font-interface">
                {selectedDoc.content}
              </div>



            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 font-interface text-sm">
              Выберите документ из списка слева для просмотра.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
