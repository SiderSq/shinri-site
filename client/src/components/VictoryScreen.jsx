import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, Sparkles, Shield, ArrowLeft, Copy, Check, ShieldCheck, KeyRound, RefreshCw, Terminal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundFX } from './SoundFX';

export default function VictoryScreen({
  killer,
  solvedAt,
  quote,
  onBackToDatabase,
  studentName = '',
  onStudentNameChange
}) {
  const [playerTag, setPlayerTag] = useState(() => {
    try {
      return studentName || localStorage.getItem('shinri_student_name') || '';
    } catch {
      return '';
    }
  });
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState({ checking: false, verified: null, message: '' });
  const [copied, setCopied] = useState(false);
  const [certError, setCertError] = useState(null);

  useEffect(() => {
    SoundFX.playTruthBreak();

    // Fire festive Danganronpa-colored confetti
    try {
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff2a85', '#6ddce5', '#78dfa7', '#ffffff']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ff2a85', '#6ddce5', '#78dfa7', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {}

    // Auto-generate certificate only if student name is already established
    const initialName = studentName || (() => {
      try { return localStorage.getItem('shinri_student_name') || ''; } catch { return ''; }
    })();

    if (initialName && initialName.trim()) {
      generateCertificate(initialName.trim());
    }
  }, []);

  const generateCertificate = async (tagToUse) => {
    const cleanTag = (tagToUse !== undefined ? tagToUse : playerTag || '').trim();
    if (!cleanTag) {
      setCertError('Пожалуйста, укажите имя ученика перед формированием сертификата.');
      return;
    }

    setLoading(true);
    setCertError(null);
    setCopied(false);

    try {
      const res = await fetch('/api/investigation/verdict-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerTag: cleanTag,
          suspectId: 'SUSPECT_03'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ошибка при генерации сертификата');
      }

      const data = await res.json();
      setCertificate(data);
      setPlayerTag(cleanTag);
      if (onStudentNameChange) {
        onStudentNameChange(cleanTag);
      } else {
        try {
          localStorage.setItem('shinri_student_name', cleanTag);
        } catch {}
      }
      setIsEditingTag(false);

      // Verify certificate authenticity with server
      verifyCertificateOnline(data.verdictCode, data.hmacSeal);
    } catch (err) {
      console.error('Certificate generation error:', err);
      setCertError(err.message || 'Не удалось сформировать сертификат вердикта.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCertificateOnline = async (verdictCode, hmacSeal) => {
    setVerifyStatus({ checking: true, verified: null, message: 'Проверка криптографической подписи...' });
    try {
      const query = new URLSearchParams({ verdictCode, hmacSeal }).toString();
      const res = await fetch(`/api/investigation/verify-verdict?${query}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setVerifyStatus({
          checking: false,
          verified: true,
          message: data.message || 'ВЕРДИКТ ПОДТВЕРЖДЁН СЕРВЕРОМ // ЦЕЛОСТНОСТЬ HMAC-SHA256 ГАРАНТИРОВАНА'
        });
      } else {
        setVerifyStatus({
          checking: false,
          verified: false,
          message: data.message || 'ОШИБКА ВЕРИФИКАЦИИ ПОДПИСИ'
        });
      }
    } catch (err) {
      setVerifyStatus({
        checking: false,
        verified: false,
        message: 'Не удалось связаться с сервером верификации.'
      });
    }
  };

  const handleCopyDiscordReport = () => {
    if (!certificate?.discordReport) return;
    SoundFX.playClick();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(certificate.discordReport)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = certificate.discordReport;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            }
          } catch (e) {
            console.warn('Clipboard copy fallback failed:', e);
          }
        });
    } else {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = certificate.discordReport;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      } catch (e) {
        console.warn('Clipboard copy fallback failed:', e);
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl cyber-panel p-6 sm:p-10 bg-[#090d16] border-2 border-[#78dfa7] box-glow-cyan text-center space-y-6 relative overflow-hidden">
        
        {/* Background Decorative Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-[#78dfa7]/10 pointer-events-none" />

        {/* Dramatic BREAK! Announcement */}
        <div className="inline-block px-4 py-1 bg-[#ff2a85] text-white font-cyber font-black tracking-widest text-lg sm:text-2xl transform -rotate-1 shadow-[0_0_20px_rgba(255,42,133,0.8)] animate-pulse">
          BREAK! TRUTH BULLET HIT
        </div>

        <div>
          <span className="text-xs font-mono text-[#78dfa7] uppercase tracking-widest block mb-2">
            ВЕРИФИКАЦИЯ МАТЕРИАЛОВ ЗАВЕРШЕНА // CASE CLOSED
          </span>
          <h1 className="text-3xl sm:text-5xl font-cyber font-extrabold text-white tracking-wider glow-hope">
            ДЕЛО РАСКРЫТО
          </h1>
        </div>

        {/* Established Identity Card */}
        <div className="p-6 bg-[#0f172a] border-2 border-[#78dfa7] rounded space-y-3">
          <div className="text-xs font-mono text-gray-400">
            УСТАНОВЛЕННАЯ ЛИЧНОСТЬ НАСТОЯЩЕГО УБИЙЦЫ:
          </div>

          <div className="text-4xl sm:text-6xl font-cyber font-black tracking-widest text-[#78dfa7] glow-hope select-all">
            {killer || 'ЗАЧЕРНЁННЫЙ'}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-gray-400 pt-3 border-t border-[#1e2a4a]">
            <span>ВРЕМЯ ФИКСАЦИИ: <strong className="text-white">{solvedAt ? new Date(solvedAt).toLocaleTimeString() : '22:47:13'}</strong></span>
            <span>СТАТУС В БАЗЕ: <strong className="text-[#78dfa7]">SOLVED & ARCHIVED</strong></span>
          </div>
        </div>

        {/* If certificate is not yet generated because name hasn't been input */}
        {!certificate && !loading && (
          <div className="p-6 bg-[#0a0f1d] border-2 border-[#6ddce5] rounded-lg text-left space-y-4 shadow-[0_0_30px_rgba(109,220,229,0.2)]">
            <div className="flex items-center gap-2.5 text-[#6ddce5] font-cyber font-bold text-base border-b border-[#1b2640] pb-3">
              <KeyRound size={20} className="text-[#ff2a85]" />
              <span>РЕГИСТРАЦИЯ ИМЕНИ ДЕТЕКТИВА // ВЫДАЧА СЕРТИФИКАТА ВЕРДИКТА</span>
            </div>

            <p className="text-xs font-mono text-gray-300 leading-relaxed">
              Дело об инциденте в мусоросжигателе успешно раскрыто! В расследовании участвуют около 15 учеников.
              Введите ваше имя или RP-никнейм — оно будет зафиксировано в криптографическом судебном сертификате вердикта с защитой HMAC-SHA256:
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-gray-400 block font-semibold">
                ИМЯ УЧЕНИКА / RP НИКНЕЙМ:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={playerTag}
                  onChange={(e) => setPlayerTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      generateCertificate(playerTag);
                    }
                  }}
                  placeholder="Введите свое имя"
                  className="flex-1 bg-[#060a12] border-2 border-[#6ddce5]/60 focus:border-[#78dfa7] text-white px-3.5 py-2.5 rounded font-mono text-sm leading-normal outline-none transition-colors shadow-inner"
                  autoFocus
                />
                <button
                  onClick={() => generateCertificate(playerTag)}
                  disabled={!playerTag.trim() || loading}
                  className="dr-btn dr-btn-cyan px-5 py-2.5 text-xs font-cyber flex items-center justify-center gap-2 shrink-0 font-bold"
                >
                  <Sparkles size={15} />
                  <span>СФОРМИРОВАТЬ СЕРТИФИКАТ</span>
                </button>
              </div>

              {certError && (
                <div className="p-2 bg-red-950/60 border border-red-500/60 text-red-200 text-xs font-mono rounded mt-2">
                  {certError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="p-8 bg-[#0a0f1d] border-2 border-[#6ddce5]/50 rounded-lg text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#6ddce5] mx-auto" />
            <div className="font-cyber text-sm text-[#6ddce5]">ГЕНЕРАЦИЯ КРИПТОГРАФИЧЕСКОГО СЕРТИФИКАТА...</div>
            <div className="text-xs font-mono text-gray-400">Формирование цифровой подписи HMAC-SHA256 для ученика {playerTag}...</div>
          </div>
        )}

        {/* Cryptographic Verdict Generator Section */}
        {certificate && (
          <div className="p-6 bg-[#0a0f1d] border-2 border-[#6ddce5]/40 rounded-lg text-left space-y-4 relative shadow-[0_0_25px_rgba(109,220,229,0.15)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2640] pb-3">
              <div className="flex items-center gap-2 text-[#6ddce5] font-cyber font-bold text-sm">
                <KeyRound size={18} />
                <span>КРИПТОГРАФИЧЕСКИЙ ВЕРДИКТ СУДА // HMAC-SHA256 CERTIFICATE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-[#6ddce5]/10 text-[#6ddce5] border border-[#6ddce5]/30">
                <ShieldCheck size={12} />
                <span>TAMPER-EVIDENT SEAL</span>
              </div>
            </div>

            {/* Student Detective Badge & Edit Button */}
            <div className="p-3 bg-[#0d1527] border border-[#1e2f52] rounded flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-gray-400">ВЫДАН УЧЕНИКУ-ДЕТЕКТИВУ:</span>
                <span className="text-sm sm:text-base font-cyber font-black text-[#78dfa7] tracking-wider px-2 py-0.5 bg-[#78dfa7]/10 rounded border border-[#78dfa7]/30">
                  {certificate.playerTag || playerTag}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTag(!isEditingTag)}
                className="text-xs font-mono px-2.5 py-1 rounded bg-[#152038] hover:bg-[#1f2f54] text-gray-300 hover:text-white border border-[#273860] transition-colors flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>{isEditingTag ? 'Скрыть редактирование' : 'Изменить имя'}</span>
              </button>
            </div>

            {/* Inline Name Editor if student wants to change name */}
            {isEditingTag && (
              <div className="p-3 bg-[#080d1a] border border-[#6ddce5]/40 rounded space-y-2 animate-in fade-in duration-200">
                <label className="text-[11px] font-mono text-gray-400 block">
                  ВВЕДИТЕ НОВОЕ ИМЯ УЧЕНИКА ДЛЯ ПЕРЕВЫПУСКА СЕРТИФИКАТА:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerTag}
                    onChange={(e) => setPlayerTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        generateCertificate(playerTag);
                      }
                    }}
                    placeholder="Введите свое имя"
                    className="flex-1 bg-[#060a12] border border-[#2a3860] focus:border-[#6ddce5] text-white px-3.5 py-2 rounded font-mono text-xs leading-normal outline-none transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={() => generateCertificate(playerTag)}
                    disabled={loading || !playerTag.trim()}
                    className="dr-btn dr-btn-cyan px-3 py-1.5 text-xs font-cyber flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    <span>ОБНОВИТЬ СЕРТИФИКАТ</span>
                  </button>
                </div>
              </div>
            )}

            {certError && (
              <div className="p-2.5 bg-red-950/60 border border-red-500/60 text-red-200 text-xs font-mono rounded">
                {certError}
              </div>
            )}

            {/* Cryptographic Badges */}
            <div className="space-y-3 pt-2">
              {/* Verdict Code & HMAC Seal Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#0f1728] border border-[#6ddce5]/30 rounded">
                  <div className="text-[10px] font-mono text-gray-400 mb-1">
                    ШИФР-КОД ВЕРДИКТА (VERDICT CODE):
                  </div>
                  <div className="font-cyber font-bold text-sm text-[#6ddce5] tracking-wider select-all">
                    {certificate.verdictCode}
                  </div>
                </div>

                <div className="p-3 bg-[#0f1728] border border-[#ff2a85]/30 rounded">
                  <div className="text-[10px] font-mono text-gray-400 mb-1">
                    ЭЦП СЕРВЕРА (HMAC-SHA256 SEAL):
                  </div>
                  <div className="font-mono text-[11px] text-[#ff2a85] truncate tracking-wider select-all" title={certificate.hmacSeal}>
                    {certificate.hmacSeal}
                  </div>
                </div>
              </div>

              {/* Online Verification Status Badge */}
              <div className={`p-2.5 rounded border text-xs font-mono flex items-center gap-2 transition-all ${
                verifyStatus.verified === true
                  ? 'bg-[#78dfa7]/10 border-[#78dfa7]/50 text-[#78dfa7]'
                  : verifyStatus.verified === false
                  ? 'bg-red-950/40 border-red-500/50 text-red-400'
                  : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-300'
              }`}>
                {verifyStatus.verified === true ? (
                  <CheckCircle size={15} className="shrink-0 text-[#78dfa7]" />
                ) : verifyStatus.verified === false ? (
                  <Shield size={15} className="shrink-0 text-red-400" />
                ) : (
                  <RefreshCw size={15} className="shrink-0 animate-spin text-yellow-400" />
                )}
                <span className="font-semibold tracking-wide">
                  {verifyStatus.message || 'Проверка онлайн-верификации...'}
                </span>
              </div>

              {/* Discord Report Preview Box */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Terminal size={13} className="text-[#6ddce5]" />
                    <span>ГОТОВЫЙ ОТЧЕТ ДЛЯ ЧАТА SHINRI TRIAL RP (DISCORD MARKDOWN / ANSI):</span>
                  </div>
                  <span className="text-[10px] text-gray-500">READY TO PASTE</span>
                </div>

                <pre className="p-3.5 bg-[#05080f] border border-[#1b2640] rounded text-[11px] font-mono text-gray-300 whitespace-pre-wrap break-all overflow-x-auto max-h-48 leading-relaxed select-all">
                  {certificate.discordReport}
                </pre>
              </div>

              {/* One-Click Copy Button */}
              <div className="pt-2">
                <button
                  onClick={handleCopyDiscordReport}
                  className={`w-full py-3 px-4 rounded font-cyber font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                    copied
                      ? 'bg-[#78dfa7] text-black shadow-[0_0_20px_rgba(120,223,167,0.6)]'
                      : 'dr-btn dr-btn-cyan shadow-[0_0_15px_rgba(109,220,229,0.3)]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      <span>СКОПИРОВАНО В БУФЕР ОБМЕНА! ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>СКОПИРОВАТЬ ОТЧЕТ ДЛЯ DISCORD</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nagito Komaeda Final Monologue */}
        <div className="p-5 bg-[#10192e] border-l-4 border-[#78dfa7] text-left space-y-2">
          <div className="flex items-center gap-2 text-[#78dfa7] font-cyber font-bold text-xs">
            <Sparkles size={16} />
            <span>ВЕРДИКТ КУРАТОРА: НАГИТО КОМАЭДА</span>
          </div>
          <p className="font-mono text-xs sm:text-sm text-gray-300 italic leading-relaxed">
            «Ха-ха-ха! {playerTag ? `${playerTag}, вы` : 'Вы'} действительно это сделали! Даже среди запутанных коридоров лжи и уничтоженных файлов вы сумели разглядеть абсолютную истину. Это не просто победа логики — это триумф надежды над отчаянием! Благодарю за великолепную партию, детектив{playerTag ? ` ${playerTag}` : ''}!»
          </p>
        </div>

        {/* Back to Database button to inspect files */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={onBackToDatabase}
            className="dr-btn dr-btn-cyan px-6 py-2.5 text-xs font-cyber flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>ВЕРНУТЬСЯ К АРХИВУ МАТЕРИАЛОВ</span>
          </button>
        </div>

      </div>
    </div>
  );
}
