import React, { useState } from 'react';
import { Lock, KeyRound, AlertTriangle, ArrowRight, Loader2, CheckCircle2, User } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function GatewayScreen({ onLoginSuccess }) {
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('shinri_student_name') || '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    const cleanCode = code.trim();

    if (!cleanName) {
      SoundFX.playAccessDenied();
      setErrorMessage('Пожалуйста, укажите ваше имя перед входом в судебную сессию.');
      return;
    }

    if (!cleanCode || loading || isAccepted) return;

    SoundFX.playClick();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('РЕГИСТРАЦИЯ УЧАСТНИКА И ПРОВЕРКА КЛЮЧА...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, playerName: cleanName })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAccepted(true);
        setStatusMessage(`УЧАСТНИК [${cleanName.toUpperCase()}] ЗАРЕГИСТРИРОВАН. ВХОД...`);
        try {
          localStorage.setItem('shinri_student_name', cleanName);
        } catch {}
        SoundFX.playAccessGranted();
        setTimeout(() => {
          onLoginSuccess(data.sessionId, cleanName);
        }, 1200);
      } else {
        SoundFX.playAccessDenied();
        setErrorMessage(data.error || 'ОШИБКА ДОСТУПА. КЛЮЧ НЕ РАСПОЗНАН.');
        setStatusMessage('');
      }
    } catch (err) {
      SoundFX.playAccessDenied();
      setErrorMessage('ОШИБКА СЕТЕВОГО СОЕДИНЕНИЯ С УЗЛОМ.');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl cyber-panel p-6 sm:p-8 relative overflow-hidden bg-[#0d101a]/95 border border-[#222942] shadow-2xl">
        
        {/* Top Accent Warning Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff2a85]" />

        {/* Header Terminal Info */}
        <div className="border-b border-[#1e263d] pb-4 mb-6">
          <div className="flex flex-wrap items-center justify-between text-sm font-mono text-gray-500 mb-2 gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff2a85] animate-ping" />
              NODE 04-271 // SECURE GATEWAY
            </span>
            <span className="text-[#6ddce5] font-bold">PROTOCOL v4.19</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-interface font-bold tracking-wider text-white flex items-center gap-2.5 my-2">
            <Lock className="text-[#ff2a85]" size={22} />
            <span>Вход в архив</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-block px-2.5 py-1 bg-[#ff2a85]/15 border border-[#ff2a85] text-[#ff2a85] font-mono text-sm font-semibold tracking-wider rounded-sm">
              СИСТЕМА ЗАПЕЧАТАНА
            </span>
            <span className="text-sm font-mono text-gray-400">
              Введите имя и код ведущего
            </span>
          </div>
        </div>

        {/* Nagito Atmosphere Quote */}
        <div className="mb-6 p-3 bg-[#111626] border-l-2 border-[#78dfa7] text-sm text-gray-400 font-mono italic">
          «Если перед вами запечатана дверь — значит, за ней скрыта истина, способная породить величайшую надежду...»
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm font-mono text-gray-400 mb-2">
              <label htmlFor="player-name" className="text-[#6ddce5] font-bold flex items-center gap-1.5">
                <User size={13} className="text-[#6ddce5]" />
                Имя участника
              </label>
              <span className="text-amber-400 text-sm font-bold tracking-wider">Обязательно</span>
            </div>
            
            <div className="relative w-full">
              <input
                id="player-name" type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading || isAccepted}
                placeholder="Имя персонажа или никнейм"
                autoFocus={!playerName}
                maxLength={50}
                className={`dr-input input-with-icon font-mono text-sm tracking-wide ${
                  isAccepted
                    ? 'border-[#78dfa7] text-[#78dfa7] bg-[#78dfa7]/10'
                    : ''
                }`}
              />
              <User
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  isAccepted ? 'text-[#78dfa7]' : 'text-gray-400'
                }`}
                size={18}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm font-mono text-gray-400 mb-2">
              <label htmlFor="access-code">Код доступа</label>
              <span className="text-gray-500">[ СИМВОЛОВ: {code.length} ]</span>
            </div>
            
            <div className="relative w-full">
              <input
                id="access-code" type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading || isAccepted}
                placeholder="Код доступа..."
                autoFocus={Boolean(playerName)}
                className={`dr-input input-with-icon font-mono text-base tracking-widest ${
                  isAccepted
                    ? 'border-[#78dfa7] text-[#78dfa7] bg-[#78dfa7]/10'
                    : errorMessage
                    ? 'border-[#ff2a85] text-[#ff2a85] bg-[#ff2a85]/10'
                    : ''
                }`}
              />
              <KeyRound
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  isAccepted
                    ? 'text-[#78dfa7]'
                    : errorMessage
                    ? 'text-[#ff2a85]'
                    : 'text-gray-400'
                }`}
                size={18}
              />
            </div>
          </div>

          {/* Feedback messages */}
          {statusMessage && (
            <div role="status" className="flex items-center gap-2 p-2.5 bg-[#6ddce5]/10 border border-[#6ddce5]/40 text-[#6ddce5] text-sm font-mono rounded">
              <Loader2 className="animate-spin" size={14} />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="flex items-center gap-2 p-2.5 bg-[#ff2a85]/10 border border-[#ff2a85] text-[#ff2a85] text-sm font-mono rounded animate-shake">
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isAccepted || !code.trim() || !playerName.trim()}
            className="w-full dr-btn dr-btn-primary py-3.5 text-sm font-interface font-bold tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>РЕГИСТРАЦИЯ...</span>
              </>
            ) : isAccepted ? (
              <>
                <CheckCircle2 size={16} className="text-[#78dfa7]" />
                <span>ДОСТУП РАЗРЕШЁН</span>
              </>
            ) : (
              <>
                <span>Открыть терминал</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 pt-4 border-t border-[#1e263d] text-sm text-gray-400">Код доступа выдаёт ведущий. Если код не подходит, уточните, для какого раунда он выдан.</p>

        {/* Hazard pattern on corner */}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 hazard-stripes rotate-45 pointer-events-none opacity-40" />
      </div>
    </div>
  );
}
