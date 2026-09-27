import React, { useState, useEffect } from 'react';
import { AlertOctagon, Terminal, Database, Cpu, KeyRound, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function BrokenScreen({ onRecoveryInitiated }) {
  const [integrityProgress, setIntegrityProgress] = useState(0);
  const [isIntegrityDone, setIsIntegrityDone] = useState(false);

  // Recovery modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // Initial integrity check animation
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 20) + 12;
      if (current >= 100) {
        current = 100;
        setIntegrityProgress(100);
        setIsIntegrityDone(true);
        SoundFX.playAccessDenied();
        clearInterval(interval);
      } else {
        setIntegrityProgress(current);
        SoundFX.playClick();
      }
    }, 140);

    return () => clearInterval(interval);
  }, []);

  // System logs - notice NO leaked recovery keys or passwords!
  const logs = [
    { time: '02:41:11', event: 'DELETE REQUEST', desc: 'Принудительное уничтожение записей расследования', isSnapshot: false },
    { time: '02:41:12', event: 'DATABASE LOCK', desc: 'Блокировка секторов чтения и записи', isSnapshot: false },
    { time: '02:41:12', event: 'CACHE PRESERVED', desc: 'Аварийный образ ОЗУ зафиксирован', isSnapshot: false },
    { time: '02:41:17', event: 'SNAPSHOT CREATED', desc: 'Создан локальный снимок состояния памяти', isSnapshot: true },
    { time: '02:41:17', event: 'SYSTEM SHUTDOWN', desc: 'Принудительное завершение процессов хоста', isSnapshot: false }
  ];

  const handleSnapshotClick = () => {
    SoundFX.playClick();
    setIsModalOpen(true);
    setRecoveryError('');
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    if (!recoveryKey.trim() || isSubmitting) return;

    SoundFX.playClick();
    setIsSubmitting(true);
    setRecoveryError('');

    try {
      const res = await fetch('/api/investigation/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: recoveryKey.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        SoundFX.playAccessGranted();
        setIsModalOpen(false);
        // Triggers the cinematic restoration animation
        onRecoveryInitiated();
      } else {
        SoundFX.playAccessDenied();
        setRecoveryError(data.error || 'НЕДЕЙСТВИТЕЛЬНЫЙ КЛЮЧ ВОССТАНОВЛЕНИЯ.');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      setRecoveryError('ОШИБКА СОЕДИНЕНИЯ С СЕРВЕРОМ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Banner: Connection Established & Broken Alert */}
      <div className="cyber-panel p-5 bg-[#0b0e17] border border-[#ff2a85]/40 box-glow-pink relative">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e263d] pb-3 mb-4">
          <div className="flex items-center gap-3">
            <AlertOctagon className="text-[#ff2a85] animate-pulse" size={26} />
            <div>
              <span className="text-xs font-mono text-gray-500">АРХИВ ТЕРМИНАЛА // СТАТУС:</span>
              <h2 className="text-lg font-cyber font-bold text-white tracking-wide">
                ПОДКЛЮЧЕНИЕ К УЗЛУ 04-271 УСТАНОВЛЕНО
              </h2>
            </div>
          </div>
          <span className="font-mono text-xs text-[#00f3ff] bg-[#00f3ff]/10 px-2.5 py-1 border border-[#00f3ff]/30">
            СЕССИЯ: КУРАТОРСКИЙ МОНИТОРИНГ
          </span>
        </div>

        {/* Integrity Check Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-400">Проверка целостности данных архива:</span>
            <span className={integrityProgress === 100 ? 'text-[#ff2a85] font-bold' : 'text-[#00f3ff]'}>
              {integrityProgress}%
            </span>
          </div>
          <div className="w-full bg-[#131726] h-3 rounded-none overflow-hidden border border-[#232c45]">
            <div
              className={`h-full transition-all duration-150 ${
                integrityProgress === 100
                  ? 'bg-gradient-to-r from-red-600 to-[#ff2a85]'
                  : 'bg-gradient-to-r from-cyan-600 to-[#00f3ff]'
              }`}
              style={{ width: `${integrityProgress}%` }}
            />
          </div>
        </div>

        {/* Critical Failure Message */}
        {isIntegrityDone && (
          <div className="p-3 bg-[#ff2a85]/10 border border-[#ff2a85] text-[#ff2a85] font-mono text-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} />
              <span className="font-bold">КРИТИЧЕСКИЙ СБОЙ:</span>
              <span>ДАННЫЕ РАССЛЕДОВАНИЯ УДАЛЕНЫ ИЗ ОСНОВНОГО СЕКТОРА.</span>
            </div>
            <span className="text-xs uppercase bg-[#ff2a85] text-black px-2 py-0.5 font-bold">
              PURGED
            </span>
          </div>
        )}
      </div>

      {/* Main Broken Case Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Corrupted Database Info */}
        <div className="md:col-span-1 cyber-panel p-5 bg-[#0d101a] border border-[#20273f] space-y-4">
          <div className="flex items-center gap-2 text-gray-300 font-cyber font-semibold text-sm border-b border-[#1b2238] pb-2">
            <Database className="text-[#ff2a85]" size={16} />
            <span>АРХИВ ДЕЛА №0271</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between pb-1 border-b border-gray-800">
              <span className="text-gray-500">СТАТУС:</span>
              <span className="text-[#ff2a85] font-bold">КРИТИЧЕСКИЙ</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-gray-800">
              <span className="text-gray-500">СОСТОЯНИЕ АРХИВА:</span>
              <span className="text-amber-400 font-semibold">ПОВРЕЖДЕНО</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-gray-800">
              <span className="text-gray-500">АКТИВНЫХ ЗАПИСЕЙ:</span>
              <span className="text-gray-300 font-bold">0</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-gray-800">
              <span className="text-gray-500">ДОСТУПНЫХ ДОКУМЕНТОВ:</span>
              <span className="text-gray-300 font-bold">0</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-gray-800">
              <span className="text-gray-500">ПОСЛЕДНЯЯ СИНХР.:</span>
              <span className="text-gray-400">02:41:17</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-500">АВТОВОССТАНОВЛЕНИЕ:</span>
              <span className="text-red-400 font-semibold">НЕДОСТУПНО</span>
            </div>
          </div>

          {/* Nagito Clue Hint */}
          <div className="p-3 bg-[#111728] border-l-2 border-[#00ff88] text-[11px] font-mono text-gray-300 leading-relaxed italic">
            «Разве отчаяние не прекрасно? Тот, кто пытался уничтожить эти записи, думал, что стёр всё без следа... Но если у вас есть ключ к снимку — истина непременно вырвется наружу!»
          </div>
        </div>

        {/* Right: System Log */}
        <div className="md:col-span-2 cyber-panel p-5 bg-[#090b12] border border-[#222942]">
          <div className="flex items-center justify-between border-b border-[#1d243a] pb-2 mb-3">
            <div className="flex items-center gap-2 text-white font-cyber font-bold text-sm">
              <Terminal className="text-[#00f3ff]" size={16} />
              <span>СИСТЕМНЫЙ ЖУРНАЛ СБОЯ // SYSTEM LOG</span>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              ДАМП ПАМЯТИ 02:41:17
            </span>
          </div>

          <p className="text-xs font-mono text-gray-400 mb-3">
            Хроника аварийных операций ядра перед принудительным отключением:
          </p>

          {/* Terminal Log Rows */}
          <div className="space-y-1.5 font-mono text-xs">
            {logs.map((log, idx) => (
              <div
                key={idx}
                onClick={log.isSnapshot ? handleSnapshotClick : undefined}
                className={`p-2.5 rounded transition-all border ${
                  log.isSnapshot
                    ? 'bg-[#12192c] border-[#00f3ff]/60 hover:border-[#00f3ff] hover:bg-[#16223d] cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.2)] pulse-pink'
                    : 'bg-[#0e111c] border-[#181f33] text-gray-400'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-semibold">{log.time}</span>
                    <span
                      className={`font-bold tracking-wider ${
                        log.isSnapshot ? 'text-[#00f3ff]' : 'text-gray-300'
                      }`}
                    >
                      {log.event}
                    </span>
                  </div>

                  {log.isSnapshot && (
                    <span className="bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff] text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      [ АВАРИЙНЫЙ СНИМОК ОЗУ ]
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={log.isSnapshot ? 'text-gray-200 font-medium' : 'text-gray-500'}>
                    {log.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a2136] flex items-center justify-between text-[11px] font-mono text-gray-500">
            <span>НАЖМИТЕ НА СТРОКУ СНИМКА ДЛЯ ИНИЦИАЛИЗАЦИИ ВОССТАНОВЛЕНИЯ</span>
            <span className="text-gray-400">СТАТУС: ЗАПЕЧАТАНО</span>
          </div>
        </div>

      </div>

      {/* Recovery Input Modal (Notice: NO code hints or spoilers!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md cyber-panel p-6 bg-[#0e121f] border-2 border-[#00f3ff] shadow-[0_0_30px_rgba(0,243,255,0.3)] animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-[#1f2842] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="text-[#00f3ff]" size={20} />
                <h3 className="font-cyber font-bold text-white text-base">
                  ЛОКАЛЬНЫЙ СНИМОК ОБНАРУЖЕН
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs mb-5">
              <div className="p-2.5 bg-[#121626] border border-[#212b45] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Состояние снимка:</span>
                  <span className="text-amber-400 font-bold">ЗАПЕЧАТАНО</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Узел хранения:</span>
                  <span className="text-gray-300">NODE 04-271</span>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed">
                Для распаковки удалённых материалов следствия требуется служебный ключ восстановления.
              </p>
            </div>

            {/* Recovery Input Form */}
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  ВВЕДИТЕ КЛЮЧ ВОССТАНОВЛЕНИЯ:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Введите ключ..."
                    autoFocus
                    className="dr-input input-with-icon font-mono tracking-wider uppercase"
                  />
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00f3ff] pointer-events-none" size={16} />
                </div>
              </div>

              {recoveryError && (
                <div className="p-2 bg-[#ff2a85]/15 border border-[#ff2a85] text-[#ff2a85] text-xs font-mono">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 dr-btn py-2 text-xs font-mono"
                >
                  ОТМЕНА
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !recoveryKey.trim()}
                  className="flex-1 dr-btn dr-btn-cyan py-2 text-xs font-bold font-cyber flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>ПРОВЕРКА...</span>
                    </>
                  ) : (
                    <>
                      <span>ВОССТАНОВИТЬ</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
