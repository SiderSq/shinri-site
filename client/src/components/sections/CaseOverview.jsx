import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Clock,
  MapPin,
  User,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Lock,
  HelpCircle,
  FileCheck2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { SoundFX } from '../SoundFX';

export default function CaseOverview({ data, onNavigateToSection }) {
  const suspectsList = data?.suspects || [];
  const [unlockedMap, setUnlockedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('shinri_unlocked_suspects');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const unlockedCount = suspectsList.filter(s => s.isUnlocked || Boolean(unlockedMap[s.id])).length;

  const [activeDecryptId, setActiveDecryptId] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});
  const [decryptErrors, setDecryptErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState({});
  const [showHint, setShowHint] = useState({});

  const handleUnlockSubmit = async (e, suspectId) => {
    e.preventDefault();
    const answer = (answerInputs[suspectId] || '').trim();
    if (!answer) return;

    SoundFX.playClick();
    setIsSubmitting(prev => ({ ...prev, [suspectId]: true }));
    setDecryptErrors(prev => ({ ...prev, [suspectId]: '' }));

    try {
      const res = await fetch('/api/investigation/unlock-suspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspectId, answer })
      });
      const resJson = await res.json();

      if (res.ok && resJson.success) {
        SoundFX.playAccessGranted();
        const updated = {
          ...unlockedMap,
          [suspectId]: {
            realName: resJson.realName,
            realRole: resJson.realRole
          }
        };
        setUnlockedMap(updated);
        try {
          localStorage.setItem('shinri_unlocked_suspects', JSON.stringify(updated));
        } catch {}
        setActiveDecryptId(null);
      } else {
        SoundFX.playAccessDenied();
        setDecryptErrors(prev => ({
          ...prev,
          [suspectId]: resJson.error || 'ОШИБКА ДЕШИФРОВКИ.'
        }));
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      setDecryptErrors(prev => ({ ...prev, [suspectId]: 'ОШИБКА СЕТИ.' }));
    } finally {
      setIsSubmitting(prev => ({ ...prev, [suspectId]: false }));
    }
  };

  const handleRelock = (suspectId) => {
    SoundFX.playClick();
    const updated = { ...unlockedMap };
    delete updated[suspectId];
    setUnlockedMap(updated);
    try {
      localStorage.setItem('shinri_unlocked_suspects', JSON.stringify(updated));
    } catch {}
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      
      {/* Case Header Card */}
      <div className="cyber-panel p-5 bg-[#0b0e17] border border-[#202945] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 hazard-stripes rotate-45 pointer-events-none opacity-20" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b233a] pb-3 mb-4">
          <div>
            <span className="text-sm font-interface text-[#6ddce5] uppercase tracking-wider block">
              АРХИВ SHINRI TRIAL // КУРАТОРСКОЕ ДОСЬЕ
            </span>
            <h2 className="text-xl sm:text-2xl font-interface font-bold text-white tracking-wide">
              {data.title || 'ДЕЛО № 0271 // ИНЦИДЕНТ В МУСОРОСЖИГАТЕЛЕ'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-sm font-interface font-bold tracking-wider rounded border ${
              data.isSolved
                ? 'bg-[#78dfa7]/20 border-[#78dfa7] text-[#78dfa7]'
                : 'bg-[#ff2a85]/20 border-[#ff2a85] text-[#ff2a85]'
            }`}>
              {data.status || 'СТАТУС: ОТКРЫТО'}
            </span>
          </div>
        </div>

        {/* Core Case Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-interface text-sm">
          <div className="p-3 bg-[#111626] border border-[#1d2640] rounded">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <User size={14} className="text-[#ff2a85]" />
              <span>ПОСТРАДАВШИЙ:</span>
            </div>
            <div className="text-white font-semibold text-sm">
              {data.victim || 'Бьякуя Тогами [Абсолютный Наследник]'}
            </div>
          </div>

          <div className="p-3 bg-[#111626] border border-[#1d2640] rounded">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <MapPin size={14} className="text-[#6ddce5]" />
              <span>МЕСТО ПРОИСШЕСТВИЯ:</span>
            </div>
            <div className="text-white font-semibold text-sm">
              {data.location || 'Помещение мусоросжигателя (Incinerator)'}
            </div>
          </div>

          <div className="p-3 bg-[#111626] border border-[#1d2640] rounded">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Clock size={14} className="text-amber-400" />
              <span>ВРЕМЯ ИНЦИДЕНТА:</span>
            </div>
            <div className="text-white font-semibold text-sm">
              {data.incidentTime || '21:40 – 21:45'}
            </div>
          </div>

          <div className="p-3 bg-[#111626] border border-[#1d2640] rounded">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <ShieldAlert size={14} className="text-[#78dfa7]" />
              <span>ОРУДИЯ И МЕХАНИЗМ:</span>
            </div>
            <div className="text-white font-semibold text-sm">
              {data.weapon || 'Электроловушка, стяжки, капкан, швабра'}
            </div>
          </div>
        </div>

        {/* Nagito's Cryptic Quote */}
        {data.quote && (
          <div className="mt-4 p-3.5 bg-[#0d1424] border-l-2 border-[#78dfa7] text-sm font-interface text-gray-300 italic leading-relaxed">
            {data.quote}
          </div>
        )}
      </div>

      {/* Trial Evidence Synthesis Box (Quick Trial Reference for Nagito RP) */}
      <div className="cyber-panel p-5 bg-[#090e18] border-2 border-[#6ddce5]/40 shadow-[0_0_15px_rgba(109,220,229,0.08)]">
        <div className="flex items-center gap-2 border-b border-[#1b2844] pb-3 mb-3">
          <FileCheck2 className="text-[#6ddce5]" size={18} />
          <h3 className="font-interface font-bold text-white text-sm tracking-wide">
            сводка ключевых аргументов для классного суда
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-interface">
          <div className="p-3 bg-[#0d1322] border border-[#1a2540] rounded space-y-1">
            <span className="text-[#ff2a85] font-bold block text-sm">ФАКТ 1: ДВОЙНАЯ ЛОВУШКА И СТЯЖКИ</span>
            <p className="text-gray-300 text-sm leading-relaxed">
              Жертва была оглушена кустарной электроловушкой на пороге, связана строительными стяжками и разбужена. После 30-секундной беседы нога жертвы была поставлена на капкан.
            </p>
          </div>

          <div className="p-3 bg-[#0d1322] border border-[#1a2540] rounded space-y-1">
            <span className="text-amber-400 font-bold block text-sm">ФАКТ 2: СБОРКА И ПЕРЕДАЧА СООБЩНИКУ</span>
            <p className="text-gray-300 text-sm leading-relaxed">
              Убийца собрал детали на складе, скрафтил ловушки на верстаке и передал капкан сообщнику, приказав установить в мусоросжигателе и бежать со всех ног.
            </p>
          </div>

          <div className="p-3 bg-[#0d1322] border border-[#1a2540] rounded space-y-1">
            <span className="text-[#78dfa7] font-bold block text-sm">ФАКТ 3: ЗАМЕТАНИЕ СЛЕДОВ ШВАБРОЙ</span>
            <p className="text-gray-300 text-sm leading-relaxed">
              После убийства пол был тщательно вымыт шваброй для удаления отпечатков обуви и брызг крови, а на замке капкана застряли шёлковые волокна перчаток.
            </p>
          </div>
        </div>
      </div>

      {/* Suspects Dossier */}
      <div className="cyber-panel p-5 bg-[#0a0d16] border border-[#1f2842]">
        <div className="flex flex-wrap items-center justify-between border-b border-[#1b233a] pb-2 mb-3 gap-2">
          <div className="flex items-center gap-2 text-white font-interface font-bold text-sm">
            <ShieldAlert className="text-[#ff2a85]" size={18} />
            <span>СПИСОК ПОДОЗРЕВАЕМЫХ ЛИЦ (ЗАСЕКРЕЧЕННЫЕ ДОСЬЕ)</span>
          </div>
          <span className="text-sm font-interface text-[#6ddce5] bg-[#6ddce5]/10 px-2 py-0.5 rounded border border-[#6ddce5]/30">
            ДЕШИФРОВАНО: {unlockedCount} / {suspectsList.length} ФИГУРАНТОВ
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#111726] h-1.5 rounded-full overflow-hidden mb-4 border border-[#1e2742]">
          <div
            className="h-full bg-gradient-to-r from-[#6ddce5] to-[#78dfa7] transition-all duration-500"
            style={{ width: `${suspectsList.length > 0 ? (unlockedCount / suspectsList.length) * 100 : 0}%` }}
          />
        </div>

        <p className="text-sm font-interface text-gray-400 mb-4 leading-relaxed">
          Имена и таланты фигурантов зашифрованы протоколом безопасности архива. Для полной идентификации решите архивную контрольную загадку или сопоставьте материалы дела.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suspectsList.map((suspect) => {
            const isUnlocked = suspect.isUnlocked || Boolean(unlockedMap[suspect.id]);
            const displayName = isUnlocked
              ? (unlockedMap[suspect.id]?.realName || suspect.realName || suspect.name)
              : (suspect.maskedName || suspect.name || `Фигурант #${suspect.id} // ■■■■■■■ ■■■■■■`);
            const displayRole = isUnlocked
              ? (unlockedMap[suspect.id]?.realRole || suspect.realRole || suspect.role)
              : (suspect.maskedRole || suspect.role || 'Абсолютный(-ая) ■■■■■■■');
            const isDrawerOpen = activeDecryptId === suspect.id;

            return (
              <div
                key={suspect.id}
                className={`p-4 rounded border transition-all ${
                  isUnlocked
                    ? 'bg-[#0e1626] border-[#78dfa7]/50 shadow-[0_0_12px_rgba(120,223,167,0.1)]'
                    : 'bg-[#0e1220] border-[#1d253d]'
                }`}
              >
                <div className="suspect-heading flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-sm font-interface font-bold text-[#6ddce5] bg-[#6ddce5]/10 px-1.5 py-0.5 rounded">
                      #{suspect.id}
                    </span>
                    <span className={`font-interface font-bold text-sm tracking-wide ${
                      isUnlocked ? 'text-[#78dfa7] glow-hope' : 'text-white'
                    }`}>
                      {displayName}
                    </span>
                  </div>
                  {isUnlocked ? (
                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-sm font-interface font-bold tracking-wider rounded border border-[#78dfa7]/60 bg-[#78dfa7]/10 text-[#78dfa7] flex items-center gap-1">
                      <ShieldCheck size={11} />
                      РАССЕКРЕЧЕНО
                    </span>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-sm font-interface font-bold tracking-wider rounded border border-[#2a3655] bg-[#111728] text-gray-400 flex items-center gap-1">
                      <Lock size={10} className="text-[#ff2a85]" />
                      ЗАСЕКРЕЧЕНО
                    </span>
                  )}
                </div>

                <div className="space-y-2 font-interface text-sm">
                  <div className="text-gray-400 flex items-center justify-between">
                    <span>
                      <strong className="text-gray-500">ТАЛАНТ / ДОЛЖНОСТЬ:</strong>{' '}
                      <span className={isUnlocked ? 'text-[#6ddce5] font-semibold' : 'text-amber-400/90'}>
                        {displayRole}
                      </span>
                    </span>
                    {isUnlocked && (
                      <span className="text-sm font-interface text-[#78dfa7] flex items-center gap-1">
                        <ShieldCheck size={13} />
                        <span>ДОСЬЕ ОТКРЫТО</span>
                      </span>
                    )}
                  </div>


                  {/* Riddle Decryption Section */}
                  {!isUnlocked ? (
                    <div className="pt-2 border-t border-[#1a223a]">
                      {!isDrawerOpen ? (
                        <button
                          onClick={() => {
                            SoundFX.playClick();
                            setActiveDecryptId(suspect.id);
                            setAnswerInputs(prev => ({ ...prev, [suspect.id]: '' }));
                            setDecryptErrors(prev => ({ ...prev, [suspect.id]: '' }));
                          }}
                          className="w-full py-1.5 px-3 rounded bg-[#162038] hover:bg-[#1f2d52] border border-[#273760] hover:border-[#6ddce5] text-[#6ddce5] font-interface text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <Lock size={12} className="text-[#ff2a85]" />
                          <span>РАССЛЕДОВАТЬ И ДЕШИФРОВАТЬ ДОСЬЕ</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-[#0a0f1d] border border-[#6ddce5]/40 rounded space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-sm font-interface text-[#6ddce5]">
                            <span className="flex items-center gap-1 font-bold">
                              <HelpCircle size={13} />
                              <span>КОНТРОЛЬНЫЙ ВОПРОС МОНОПАДА:</span>
                            </span>
                            <button
                              onClick={() => setActiveDecryptId(null)}
                              className="text-gray-500 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>

                          <p className="text-sm text-gray-300 italic leading-relaxed">
                            {suspect.puzzle?.question || 'Изучите документы в архиве для дешифровки личности.'}
                          </p>

                          {suspect.puzzle?.hint && (
                            <div>
                              <button
                                onClick={() => setShowHint(prev => ({ ...prev, [suspect.id]: !prev[suspect.id] }))}
                                className="text-sm text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Sparkles size={11} />
                                <span>{showHint[suspect.id] ? 'Скрыть подсказку' : 'Показать подсказку к вопросу'}</span>
                              </button>
                              {showHint[suspect.id] && (
                                <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-sm text-amber-200">
                                  {suspect.puzzle.hint}
                                </div>
                              )}
                            </div>
                          )}

                          <form
                            onSubmit={(e) => handleUnlockSubmit(e, suspect.id)}
                            className="flex gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={answerInputs[suspect.id] || ''}
                              onChange={(e) => setAnswerInputs(prev => ({ ...prev, [suspect.id]: e.target.value }))}
                              placeholder="Введите ответ на загадку..."
                              className="flex-1 px-2.5 py-1.5 bg-[#090d18] border border-[#253255] focus:border-[#6ddce5] text-white text-sm rounded font-interface outline-none"
                              disabled={isSubmitting[suspect.id]}
                            />
                            <button
                              type="submit"
                              disabled={isSubmitting[suspect.id] || !answerInputs[suspect.id]?.trim()}
                              className="px-3 py-1.5 bg-[#6ddce5]/20 hover:bg-[#6ddce5]/30 text-[#6ddce5] border border-[#6ddce5] font-interface text-sm rounded font-bold transition-all disabled:opacity-50"
                            >
                              {isSubmitting[suspect.id] ? '...' : 'ОТВЕТ'}
                            </button>
                          </form>

                          {decryptErrors[suspect.id] && (
                            <div className="text-sm font-interface text-[#ff2a85] animate-shake">
                              {decryptErrors[suspect.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#162738] flex items-center justify-between text-sm font-interface text-[#78dfa7]">
                      <span>✓ Имя и Абсолютный талант подтверждены</span>
                      <button
                        onClick={() => handleRelock(suspect.id)}
                        className="text-sm text-gray-500 hover:text-gray-300 underline"
                      >
                        Засекретить
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Navigation Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateToSection('documents')}
          className="cyber-panel p-3.5 bg-[#0f1424] hover:bg-[#141c33] border border-[#232d4b] hover:border-[#6ddce5] text-left transition-all group"
        >
          <div className="text-sm font-interface text-[#6ddce5] mb-1">02 ФАЙЛ МОНОКУМЫ</div>
          <div className="text-sm font-interface font-bold text-white group-hover:text-[#6ddce5] flex items-center justify-between">
            <span>Протокол инцидента</span>
            <ChevronRight size={15} />
          </div>
          <p className="text-sm font-interface text-gray-400 mt-1">
            Официальный отчёт: время, место и способ убийства
          </p>
        </button>

        <button
          onClick={() => onNavigateToSection('puzzles')}
          className="cyber-panel p-3.5 bg-[#0f1424] hover:bg-[#141c33] border border-[#232d4b] hover:border-[#ff2a85] text-left transition-all group"
        >
          <div className="text-sm font-interface text-[#ff2a85] mb-1">03 ЛАБОРАТОРИЯ УЛИК</div>
          <div className="text-sm font-interface font-bold text-white group-hover:text-[#ff2a85] flex items-center justify-between">
            <span>Экспертиза и головоломки</span>
            <ChevronRight size={15} />
          </div>
          <p className="text-sm font-interface text-gray-400 mt-1">
            Электроцепь, УФ-сканер, таймлайн, капкан и верстак
          </p>
        </button>

        <button
          onClick={() => onNavigateToSection('reconstruction')}
          className="cyber-panel p-3.5 bg-[#17101f] hover:bg-[#20152b] border border-[#ff2a85]/50 hover:border-[#ff2a85] text-left transition-all group"
        >
          <div className="text-sm font-interface text-[#78dfa7] mb-1">04 РЕКОНСТРУКЦИЯ</div>
          <div className="text-sm font-interface font-bold text-white group-hover:text-[#78dfa7] flex items-center justify-between">
            <span>Собрать имя убийцы</span>
            <ChevronRight size={15} />
          </div>
          <p className="text-sm font-interface text-gray-400 mt-1">
            Гравитационная арена букв // Hangman's Gambit
          </p>
        </button>
      </div>

    </div>
  );
}
