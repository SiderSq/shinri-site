import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, AlertTriangle, Users, Lock, Wifi } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function LockoutScreen({ remainingSeconds: initialSeconds, lockedUntil, clientIp, onUnlocked }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds || 600);

  useEffect(() => {
    // Calculate accurate countdown from lockedUntil timestamp if available
    const calculateRemaining = () => {
      if (lockedUntil) {
        const diff = Math.ceil((lockedUntil - Date.now()) / 1000);
        return Math.max(0, diff);
      }
      return secondsLeft;
    };

    setSecondsLeft(calculateRemaining());

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        SoundFX.playAccessGranted();
        if (onUnlocked) onUnlocked();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedUntil]);

  const formatTimer = (totalSec) => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl cyber-panel p-6 sm:p-10 bg-[#0d0910] border-2 border-[#ff2a85] box-glow-pink relative text-center space-y-6">
        
        {/* Animated Warning Icon */}
        <div className="inline-flex p-4 rounded-full bg-[#ff2a85]/15 border-2 border-[#ff2a85] pulse-pink">
          <ShieldAlert className="text-[#ff2a85]" size={48} />
        </div>

        <div>
          <span className="text-xs font-mono text-[#ff2a85] uppercase tracking-widest block mb-1">
            КРИТИЧЕСКИЙ ПРОТОКОЛ // МОНОПАД ЗАБЛОКИРОВАН
          </span>
          <h1 className="text-2xl sm:text-4xl font-cyber font-extrabold text-white tracking-wider glow-pink">
            TERMINAL LOCKED
          </h1>
          <p className="text-sm font-mono text-gray-300 mt-2">
            Система Монокумы временно изолировала ваш личный Монопад от архивной сети.
          </p>
        </div>

        {/* Live Countdown Display */}
        <div className="p-6 bg-[#160c18] border border-[#ff2a85]/60 rounded space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-gray-400">
            <Clock size={16} className="text-[#ff2a85] animate-spin" />
            <span>ПОВТОРНАЯ ПОПЫТКА БУДЕТ ДОСТУПНА ЧЕРЕЗ:</span>
          </div>
          
          <div className="text-4xl sm:text-6xl font-mono font-bold tracking-widest text-[#ff2a85] font-cyber glitch-text select-none">
            {formatTimer(secondsLeft)}
          </div>

          <div className="text-[11px] font-mono text-gray-500 pt-1">
            БЛОКИРОВКА СОХРАНЯЕТСЯ ПРИ ОБНОВЛЕНИИ СТРАНИЦЫ И СМЕНЕ БРАУЗЕРА
          </div>
        </div>

        {/* IP Lock & Peer Investigation Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-mono text-xs">
          <div className="p-3 bg-[#110d18] border border-[#2b172a] rounded space-y-1">
            <span className="text-gray-500 block">ПРИЧИНА ОГРАНИЧЕНИЯ:</span>
            <span className="text-[#ff2a85] font-bold">НЕВЕРНАЯ РЕКОНСТРУКЦИЯ</span>
          </div>

          <div className="p-3 bg-[#110d18] border border-[#2b172a] rounded space-y-1">
            <span className="text-gray-500 block">ЗАБЛОКИРОВАННЫЙ ТЕРМИНАЛ (IP):</span>
            <span className="text-[#6ddce5] font-bold">{clientIp || '127.0.0.1'}</span>
          </div>
        </div>

        {/* Collaborative Lore Notice (1 of 16 students) */}
        <div className="p-4 bg-[#14101e] border-l-4 border-amber-500 text-left space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Users size={16} />
            <span>СТАТУС: ИЗОЛЯЦИЯ ТЕРМИНАЛА (1 ИЗ 16 УЧЕНИКОВ)</span>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Вы выдвинули ошибочную версию в реконструкции имени. По протоколу Монокумы ваш личный Монопад отключен на 10 минут. В это время остальные <strong>15 учеников</strong> продолжают обыскивать Академию и опрашивать свидетелей. Вы временно отрезаны от архива, но можете сопоставить факты в памяти и подготовиться к Классному суду!
          </p>
        </div>

        {/* Nagito Atmosphere Quote */}
        <div className="p-3 bg-[#0a0f18] border-l-2 border-[#78dfa7] text-xs text-gray-400 font-mono italic text-left">
          «Оя-оя... Какая нетерпеливость! Отчаяние заставило тебя назвать имя наугад? Теперь твой Монопад заморожен на 10 минут, пока остальные 15 учеников ведут поиски в коридорах. Но не унывай: даже в этой изоляции ты можешь сопоставить крупицы истины в своей голове...» — Нагито Комаэда
        </div>

      </div>
    </div>
  );
}
