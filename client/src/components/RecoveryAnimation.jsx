import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SoundFX } from './SoundFX';

export default function RecoveryAnimation({ onComplete }) {
  const steps = [
    { title: 'ПОИСК СНИМКА В КЭШЕ СИСТЕМЫ...', progress: 20 },
    { title: 'ПРОВЕРКА ЦЕЛОСТНОСТИ БЛОКОВ ПАМЯТИ...', progress: 40 },
    { title: 'ВОССТАНОВЛЕНИЕ СТРУКТУРЫ ФАЙЛОВ И ТАБЛИЦ...', progress: 65 },
    { title: 'РЕКОНСТРУКЦИЯ СИСТЕМНЫХ ЖУРНАЛОВ И ЧАТОВ...', progress: 85 },
    { title: 'СИНХРОНИЗАЦИЯ УЛИК РАССЛЕДОВАНИЯ 0271...', progress: 100 }
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [percent, setPercent] = useState(10);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      SoundFX.playRecoveryStep();
      step++;
      if (step < steps.length) {
        setCurrentStepIndex(step);
        setPercent(steps[step].progress);
      } else {
        setPercent(100);
        setIsDone(true);
        SoundFX.playAccessGranted();
        clearInterval(interval);

        // Transition to main dashboard after displaying stats
        setTimeout(() => {
          onComplete();
        }, 2200);
      }
    }, 700);

    return () => clearInterval(interval);
  }, []);

  // Helper to render ASCII-styled progress bar
  const renderAsciiBar = (percentage) => {
    const totalBlocks = 20;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl cyber-panel p-8 bg-[#0b0e18] border-2 border-[#00f3ff] shadow-[0_0_40px_rgba(0,243,255,0.25)] text-center space-y-6">
        
        {/* Animated Cyber Core Icon */}
        <div className="inline-flex p-4 rounded-full bg-[#11192e] border border-[#00f3ff]/50 animate-pulse">
          <Cpu className="text-[#00f3ff]" size={42} />
        </div>

        <div>
          <span className="text-xs font-mono text-[#00f3ff] uppercase tracking-widest block mb-1">
            СЛУЖБА АВАРИЙНОЙ РЕКОНСТРУКЦИИ // SHINRI RECOVERY
          </span>
          <h2 className="text-xl sm:text-2xl font-cyber font-bold text-white tracking-wider">
            РАСПАКОВКА АВАРИЙНОГО СНИМКА
          </h2>
        </div>

        {/* Current Step Description */}
        <div className="p-4 bg-[#121626] border border-[#1e2740] rounded font-mono text-xs sm:text-sm text-left space-y-3">
          <div className="flex justify-between text-gray-400">
            <span>ЭТАП: {currentStepIndex + 1} / {steps.length}</span>
            <span className="text-[#00f3ff] font-bold">{percent}%</span>
          </div>

          <div className="text-white font-semibold flex items-center gap-2">
            <span className="text-[#00ff88]">➜</span>
            <span>{steps[currentStepIndex].title}</span>
          </div>

          {/* ASCII Bar */}
          <div className="text-[#00f3ff] font-mono tracking-widest text-center text-sm sm:text-base py-1 select-none">
            [{renderAsciiBar(percent)}]
          </div>
        </div>

        {/* Completion Statistics */}
        {isDone && (
          <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88] text-[#00ff88] font-mono text-xs sm:text-sm text-left space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-white text-base">
              <ShieldCheck className="text-[#00ff88]" size={20} />
              <span>ВОССТАНОВЛЕНИЕ УСПЕШНО ЗАВЕРШЕНО!</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#00ff88]/30 text-center">
              <div>
                <span className="block text-gray-400 text-[11px]">ФАЙЛОВ:</span>
                <span className="text-white font-bold text-base">47</span>
              </div>
              <div>
                <span className="block text-gray-400 text-[11px]">ЗАПИСЕЙ:</span>
                <span className="text-white font-bold text-base">126</span>
              </div>
              <div>
                <span className="block text-gray-400 text-[11px]">ПОВРЕЖДЕНО:</span>
                <span className="text-amber-400 font-bold text-base">8</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center pt-2">
              Инициализация основного терминала расследования...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
