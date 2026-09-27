import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Cpu,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  FileEdit,
  Quote
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

const DEFAULT_NOTES_TEMPLATE = `[СУДЕБНЫЕ ЗАМЕТКИ // НАГИТО КОМАЭДА]
• Орудие убийства: Охотничий капкан с инструментального верстака склада. На стеллаже остался пустой след от пыли.
• Ключевой след: На пружине и зубьях капкана обнаружены волокна ткани от перчаток.
• Передача сообщнику: В полутёмном проходе капкан был передан сообщнику до вечернего объявления.
• Главный аргумент: Убийца не мог взвести капкан голыми руками, а заявленное алиби противоречит следам уборки.
• Моя речь на суде: «Неужели этот капкан должен был захлопнуть дверь перед лицом абсолютной надежды?...»`;

const NAGITO_QUOTES = [
  {
    id: 'q1',
    label: 'О надежде и отчаянии',
    text: 'Ха-ха... Какой восхитительный узор отчаяния! Но разве оно не должно стать прекрасной ступенькой для истинной абсолютной надежды?'
  },
  {
    id: 'q2',
    label: 'Скромная ирония Нагито',
    text: 'Такой ничтожный и бесполезный мусор, как я, конечно не имеет права судить Абсолютных... Но улики с капканом и белыми волокнами говорят сами за себя!'
  },
  {
    id: 'q3',
    label: 'Разоблачение ложного алиби',
    text: 'Как бы тщательно ты ни стирала следы, Кируми-сан, ложь никогда не сравнится с ослепительным сиянием правды. Твое алиби с перчатками рассыпалось!'
  },
  {
    id: 'q4',
    label: 'Финальный удар надежды',
    text: 'Смерть Тогами-куна не будет напрасной! Давай же разобьём эту ловушку и позволим абсолютной надежде воссиять над этим залом!'
  }
];

export default function SystemHints({ hints = [], caseId = '0271', lastSync = '03:17:42' }) {
  // Scratchpad state with localStorage persistence
  const [scratchpad, setScratchpad] = useState(() => {
    try {
      const saved = localStorage.getItem('shinri_detective_notes');
      return saved !== null ? saved : DEFAULT_NOTES_TEMPLATE;
    } catch {
      return DEFAULT_NOTES_TEMPLATE;
    }
  });

  const [copiedNotes, setCopiedNotes] = useState(false);
  const [copiedQuoteId, setCopiedQuoteId] = useState(null);

  // Auto-save scratchpad
  useEffect(() => {
    try {
      localStorage.setItem('shinri_detective_notes', scratchpad);
    } catch {}
  }, [scratchpad]);

  const handleCopyNotes = () => {
    SoundFX.playClick();
    navigator.clipboard.writeText(scratchpad).then(() => {
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    });
  };

  const handleResetTemplate = () => {
    SoundFX.playClick();
    setScratchpad(DEFAULT_NOTES_TEMPLATE);
  };

  const handleClearNotes = () => {
    SoundFX.playClick();
    setScratchpad('');
  };

  const handleCopyQuote = (q) => {
    SoundFX.playClick();
    navigator.clipboard.writeText(q.text).then(() => {
      setCopiedQuoteId(q.id);
      setTimeout(() => setCopiedQuoteId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
        <div>
          <span className="text-xs font-mono text-[#00f3ff] uppercase tracking-wider block">
            СЛУЖЕБНЫЙ АРХИВ // МАТЕРИАЛЫ КЛАССНОГО СУДА
          </span>
          <h2 className="text-lg sm:text-xl font-cyber font-bold text-white">
            05 СУДЕБНЫЙ БЛОКНОТ // ЗАМЕТКИ ДЛЯ СУДА
          </h2>
        </div>
        <span className="text-xs font-mono text-gray-400 bg-[#0e1322] px-2.5 py-1 border border-[#1e263d]">
          УЗЕЛ: NODE 04-271
        </span>
      </div>

      {/* Atmospheric Nagito Komaeda Guide Note */}
      <div className="cyber-panel p-5 bg-[#0d1424] border-l-4 border-[#00ff88] text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 text-[#00ff88] font-cyber font-bold text-sm">
          <Sparkles size={16} />
          <span>НАПУТСТВИЕ НАГИТО КОМАЭДЫ:</span>
        </div>
        <p className="text-gray-300 italic leading-relaxed">
          «Не опускайте руки, детектив! Если логика кажется вам зашедшей в тупик — перечитайте зацепки ещё раз. Истина не прячется в сложных шифрах. Она кроется в простых несоответствиях: во времени, в номерах дверей и в оставленных на месте борьбы обломках. Настоящая надежда рождается именно тогда, когда отчаяние кажется непреодолимым!»
        </p>
      </div>

      {/* Interactive Detective Scratchpad (Судебный блокнот Нагито) */}
      <div className="cyber-panel p-5 bg-[#080b13] border-2 border-[#00f3ff]/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#18233a] pb-2">
          <div className="flex items-center gap-2 text-white font-cyber font-bold text-sm">
            <FileEdit className="text-[#00f3ff]" size={16} />
            <span>СУДЕБНЫЙ БЛОКНОТ НАГИТО (ДЛЯ ДЕБАТОВ В GMOD)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetTemplate}
              className="p-1 px-2 text-[11px] font-mono bg-[#11192b] hover:bg-[#1a2745] text-gray-300 hover:text-white rounded border border-[#223355] flex items-center gap-1 transition-all"
              title="Восстановить шаблон"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Шаблон</span>
            </button>
            <button
              onClick={handleClearNotes}
              className="p-1 px-2 text-[11px] font-mono bg-[#11192b] hover:bg-[#2b111a] text-gray-400 hover:text-[#ff2a85] rounded border border-[#223355] flex items-center gap-1 transition-all"
              title="Очистить блокнот"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Очистить</span>
            </button>
            <button
              onClick={handleCopyNotes}
              className="p-1 px-2.5 text-[11px] font-mono bg-[#15233c] hover:bg-[#1f355c] text-[#00f3ff] rounded border border-[#00f3ff]/50 flex items-center gap-1.5 transition-all font-bold"
              title="Скопировать заметки в чат Garry's Mod"
            >
              {copiedNotes ? <Check size={13} className="text-[#00ff88]" /> : <Copy size={13} />}
              <span>{copiedNotes ? 'СКОПИРОВАНО!' : 'КОПИРОВАТЬ ДЛЯ ЧАТА'}</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] font-mono text-gray-400">
          Ваш персональный блокнот расследования. Записи сохраняются локально. Используйте его для подготовки аргументов и реплик перед выступлением на Классном суде.
        </p>

        <textarea
          value={scratchpad}
          onChange={(e) => setScratchpad(e.target.value)}
          placeholder="Вводите свои гипотезы, заметки и таймкоды здесь..."
          rows={6}
          className="w-full bg-[#05070d] border border-[#1b2640] focus:border-[#00f3ff] p-3 text-xs font-mono text-gray-200 rounded outline-none resize-y leading-relaxed shadow-inner"
        />
      </div>

      {/* Roleplay Cheat Sheet: Nagito's Trial Quotes */}
      <div className="cyber-panel p-5 bg-[#0a0d16] border border-[#1f2842] space-y-3">
        <div className="flex items-center gap-2 text-white font-cyber font-bold text-sm border-b border-[#18233a] pb-2">
          <Quote className="text-[#ff2a85]" size={16} />
          <span>РЕПЛИКИ НАГИТО ДЛЯ КЛАССНОГО СУДА (SHINRI TRIAL RP)</span>
        </div>

        <p className="text-[11px] font-mono text-gray-400">
          Нажмите на кнопку справа от реплики, чтобы мгновенно скопировать её в буфер и отправить в игровой чат сервера:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NAGITO_QUOTES.map((q) => (
            <div
              key={q.id}
              className="p-3 bg-[#0d1220] border border-[#1b2540] rounded font-mono text-xs flex flex-col justify-between space-y-2 hover:border-[#00f3ff]/50 transition-all"
            >
              <div>
                <span className="text-[#00ff88] font-bold text-[10px] block mb-1">
                  [{q.label}]
                </span>
                <p className="text-gray-300 text-[11px] italic leading-relaxed">
                  «{q.text}»
                </p>
              </div>

              <div className="pt-2 border-t border-[#151e33] flex justify-end">
                <button
                  onClick={() => handleCopyQuote(q)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#141d30] hover:bg-[#1c2c4d] border border-[#233557] text-[#00f3ff] transition-all"
                >
                  {copiedQuoteId === q.id ? <Check size={12} className="text-[#00ff88]" /> : <Copy size={12} />}
                  <span>{copiedQuoteId === q.id ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hints Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle size={14} className="text-[#00f3ff]" />
          <span>ПОДСКАЗКИ АРХИВА:</span>
        </h3>

        {hints && hints.length > 0 ? (
          hints.map((hint, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#0a0d16] border border-[#1d2740] rounded font-mono text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#00f3ff] font-bold tracking-wider text-[11px]">
                  {hint.title || `ЗАМЕТКА #${idx + 1}`}
                </span>
                <span className="text-[10px] text-gray-500 uppercase">
                  АКТИВНО
                </span>
              </div>
              <p className="text-gray-200 leading-relaxed">
                {hint.text}
              </p>
            </div>
          ))
        ) : (
          <div className="p-4 bg-[#0a0d16] border border-gray-800 text-gray-500 font-mono text-xs text-center">
            Дополнительные заметки куратора отсутствуют.
          </div>
        )}
      </div>

      {/* Terminal Diagnostics */}
      <div className="cyber-panel p-5 bg-[#080a12] border border-[#1b233a] font-mono text-xs space-y-3">
        <div className="flex items-center gap-2 text-white font-cyber font-bold text-sm border-b border-[#182035] pb-2">
          <Cpu className="text-[#ff2a85]" size={16} />
          <span>ДИАГНОСТИКА СИСТЕМНОГО ТЕРМИНАЛА</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-400 text-[11px]">
          <div>ПЛАТФОРМА: <strong className="text-gray-200">SHINRI TRIAL NODE 04-271</strong></div>
          <div>ХРАНИЛИЩЕ: <strong className="text-[#00ff88]">СНИМОК РАСПАКОВАН</strong></div>
          <div>СИНХРОНИЗАЦИЯ: <strong className="text-gray-200">{lastSync}</strong></div>
          <div>ПРОТОКОЛ ПРОВЕРКИ: <strong className="text-[#00f3ff]">СЕРВЕРНАЯ ВАЛИДАЦИЯ (БЕЗ УТЕЧЕК)</strong></div>
        </div>
      </div>

    </div>
  );
}
