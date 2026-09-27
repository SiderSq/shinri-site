import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  FastForward,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Info,
  Volume2
} from 'lucide-react';
import { SoundFX } from './SoundFX';

// Fallback initial debate data if caseData not yet loaded
const DEFAULT_STATEMENTS = [
  {
    id: 'STMT_01',
    speaker: 'Кируми Тодзё',
    role: 'Абсолютная Горничная',
    text: 'В 21:00 я закончила протирать серверные стойки и подготовила зал к утренней инспекции.',
    speed: 'normal',
    trajectory: 'linear',
    weakPoints: [
      {
        id: 'WP_01',
        phrase: 'закончила протирать серверные стойки',
        startIndex: 9,
        endIndex: 44
      }
    ]
  },
  {
    id: 'STMT_02',
    speaker: 'Кируми Тодзё',
    role: 'Абсолютная Горничная',
    text: 'Питание отключилось только после моего ухода, и я покинула сектор C до 21:03!',
    speed: 'fast',
    trajectory: 'wave',
    weakPoints: [
      {
        id: 'WP_02',
        phrase: 'покинула сектор C до 21:03',
        startIndex: 50,
        endIndex: 76
      }
    ]
  },
  {
    id: 'STMT_03',
    speaker: 'Кируми Тодзё',
    role: 'Абсолютная Горничная',
    text: 'У меня не было никаких причин задерживаться в архиве или искать встречи с Бьякуей.',
    speed: 'normal',
    trajectory: 'linear'
  },
  {
    id: 'STMT_04',
    speaker: 'Кируми Тодзё',
    role: 'Абсолютная Горничная',
    text: 'Камеры отключились из-за аварийного скачка напряжения, я не имею к этому отношения!',
    speed: 'fast',
    trajectory: 'perspective',
    weakPoints: [
      {
        id: 'WP_04',
        phrase: 'аварийного скачка напряжения',
        startIndex: 23,
        endIndex: 51
      }
    ]
  },
  {
    id: 'STMT_05',
    speaker: 'Кируми Тодзё',
    role: 'Абсолютная Горничная',
    text: 'Никаких следов моего присутствия в архивной комнате после девяти вечера нет!',
    speed: 'normal',
    trajectory: 'wave',
    weakPoints: [
      {
        id: 'WP_05',
        phrase: 'Никаких следов моего присутствия',
        startIndex: 0,
        endIndex: 32
      }
    ]
  }
];

const DEFAULT_BULLETS = [
  {
    id: 'CHAT_01',
    code: 'CHAT_01',
    title: 'Перехват сессии #829',
    summary: 'В 21:03 Кируми пишет: «Я уже в архивном секторе. Жду его возле главного терминала».'
  },
  {
    id: 'DOC_01',
    code: 'DOC_01',
    title: 'Файл Монокумы №0271',
    summary: 'Протокол смерти Тогами: удушение тросом в 21:42-21:46.'
  },
  {
    id: 'DOC_02',
    code: 'DOC_02',
    title: 'Заявка Монопада AR-883',
    summary: 'Допуск Кируми в Сектор C был одобрен до 22:00.'
  },
  {
    id: 'DOC_03',
    code: 'DOC_03',
    title: 'Лоскут перчатки с литерой «Р»',
    summary: 'Вещдок из руки жертвы: лента от перчатки с меткой «Р».'
  },
  {
    id: 'DOC_04',
    code: 'DOC_04',
    title: 'Схема гермозон и шлюзов Архива 04',
    summary: 'В момент сбоя 21:43 все стандартные выходы были запечатаны.'
  },
  {
    id: 'MEDIA_01',
    code: 'MEDIA_01',
    title: 'Стоп-кадр CAM-04 (21:44:58)',
    summary: 'Силуэт горничной с шевроном «К» в архивной комнате перед отключением камеры.'
  }
];

export default function NonStopDebate({ caseData, onDebateResolved }) {
  const statements = caseData?.debate?.statements || DEFAULT_STATEMENTS;
  const bullets = caseData?.debate?.bullets || DEFAULT_BULLETS;

  // Statement carousel state
  const [statementIndex, setStatementIndex] = useState(0);
  const [statementProgress, setStatementProgress] = useState(0); // 0 to 1
  const [isPaused, setIsPaused] = useState(false);
  const [isFastForward, setIsFastForward] = useState(false);

  // Revolver cylinder state (active bullet index 0..bullets.length-1)
  const [selectedBulletIndex, setSelectedBulletIndex] = useState(0);
  const [cylinderRotation, setCylinderRotation] = useState(0);

  // Targeting reticle & mouse coordinates inside debate stage
  const [reticlePos, setReticlePos] = useState({ x: -100, y: -100 });
  const [lockedTarget, setLockedTarget] = useState(null); // { statementId, weakPointId }
  const [isCursorInside, setIsCursorInside] = useState(false);

  // Firing & cooldown
  const [isFiring, setIsFiring] = useState(false);
  const [laserBeam, setLaserBeam] = useState(null); // { x1, y1, x2, y2 }
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Truth Break Sequence (Stages 1..5)
  const [truthBreakStage, setTruthBreakStage] = useState(0); // 0 = inactive, 1 = freeze/flash, 2 = shatter, 3 = break banner, 4 = nagito cutin, 5 = resolved
  const [truthBreakData, setTruthBreakData] = useState(null);
  const [isResolved, setIsResolved] = useState(Boolean(caseData?.debateResolved));

  // Ricochet / Deflection state
  const [ricochetInfo, setRicochetInfo] = useState(null); // { message, penaltyRemaining }
  const [screenShake, setScreenShake] = useState(false);

  // Shard canvas ref
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const activeBullet = bullets[selectedBulletIndex] || bullets[0];
  const activeStatement = statements[statementIndex] || statements[0];

  // Rotate revolver cylinder
  const rotateCylinder = useCallback((delta) => {
    SoundFX.playRevolverSpin();
    setSelectedBulletIndex((prev) => {
      const total = bullets.length;
      return (prev + delta + total) % total;
    });
    setCylinderRotation((prev) => prev + delta * 60);
  }, [bullets.length]);

  // Select bullet directly
  const selectBullet = (idx) => {
    if (idx === selectedBulletIndex) return;
    SoundFX.playRevolverSpin();
    const delta = idx - selectedBulletIndex;
    setSelectedBulletIndex(idx);
    setCylinderRotation((prev) => prev + delta * 60);
  };

  // Keyboard navigation: Q/E or Arrow keys for bullets, Space for pause, Tab for fast-forward
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (truthBreakStage > 0 && truthBreakStage < 5) return;

      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        e.preventDefault();
        rotateCylinder(-1);
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        e.preventDefault();
        rotateCylinder(1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsFastForward((ff) => !ff);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateCylinder, truthBreakStage]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, Math.round((prev - 0.1) * 10) / 10));
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Floating statements animation loop
  useEffect(() => {
    if (truthBreakStage > 0 && truthBreakStage < 5) {
      // Freeze statement in place during truth break
      return;
    }

    const duration = (activeStatement.speed === 'fast' ? 10000 : 14000) / (isFastForward ? 2.5 : 1);

    const step = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!isPaused) {
        setStatementProgress((prev) => {
          const next = prev + dt / duration;
          if (next >= 1) {
            // Advance to next statement
            setStatementIndex((idx) => (idx + 1) % statements.length);
            return 0;
          }
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = null;
    };
  }, [isPaused, isFastForward, activeStatement.speed, statements.length, truthBreakStage]);

  // Track cursor position inside debate stage
  const handleMouseMove = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setReticlePos({ x, y });
  };

  // Weak Point hover detection
  const handleWeakPointEnter = (wpId, stmtId) => {
    SoundFX.playLockOn();
    setLockedTarget({ statementId: stmtId, weakPointId: wpId });
  };

  const handleWeakPointLeave = () => {
    setLockedTarget(null);
  };

  // Fire Truth Bullet
  const fireBullet = async (targetOverride = null) => {
    if (cooldownSeconds > 0 || isFiring || (truthBreakStage > 0 && truthBreakStage < 5)) return;

    setIsFiring(true);
    SoundFX.playGunshot();

    // Trigger laser beam animation from cylinder to reticle
    const stageWidth = stageRef.current ? stageRef.current.clientWidth : 800;
    const stageHeight = stageRef.current ? stageRef.current.clientHeight : 450;
    const startX = 140; // cylinder center
    const startY = stageHeight - 70;
    const endX = reticlePos.x > 0 ? reticlePos.x : stageWidth / 2;
    const endY = reticlePos.y > 0 ? reticlePos.y : stageHeight / 2;

    setLaserBeam({ x1: startX, y1: startY, x2: endX, y2: endY });
    setTimeout(() => setLaserBeam(null), 140);

    // Apply screen shake
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 120);

    // Cooldown 2.5s
    setCooldownSeconds(2.5);

    const target = targetOverride || lockedTarget;

    if (!target) {
      // Shot missed entirely (into empty space)
      setTimeout(() => {
        setIsFiring(false);
      }, 200);
      return;
    }

    try {
      const response = await fetch('/api/investigation/debate/fire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementId: target.statementId,
          weakPointId: target.weakPointId,
          bulletId: activeBullet.id
        })
      });

      const data = await response.json();

      if (data.success && data.verdict === 'TRUTH_BREAK') {
        // SUCCESS: Execute 5-stage Truth Break climax!
        triggerTruthBreakSequence(data, endX, endY);
      } else {
        // FAILURE: Ricochet
        triggerRicochetSequence(data);
      }
    } catch (err) {
      console.error('Debate fire request failed:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // 5-Stage Truth Break AV Sequence
  const triggerTruthBreakSequence = (data, hitX, hitY) => {
    setTruthBreakData(data);

    // Stage 1: Freeze + Flash
    setTruthBreakStage(1);
    SoundFX.playTruthBreak();

    // Stage 2: Glass Fracture & Canvas Shard Explosion
    setTimeout(() => {
      setTruthBreakStage(2);
      spawnGlassShards(hitX, hitY);
    }, 120);

    // Stage 3: Iconic "BREAK!" Chromatic Banner
    setTimeout(() => {
      setTruthBreakStage(3);
    }, 450);

    // Stage 4: Nagito Refutation Cut-in Banner
    setTimeout(() => {
      setTruthBreakStage(4);
    }, 1400);

    // Stage 5: Resolved
    setTimeout(() => {
      setTruthBreakStage(5);
      setIsResolved(true);
      if (onDebateResolved) onDebateResolved();
    }, 4200);
  };

  // Canvas 3D Polygon Glass Shards Explosion
  const spawnGlassShards = (originX, originY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const numShards = 45;
    const shards = [];

    // Crack lines radiating from hit point
    const cracks = Array.from({ length: 14 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const length = 80 + Math.random() * 260;
      return {
        x1: originX,
        y1: originY,
        x2: originX + Math.cos(angle) * length,
        y2: originY + Math.sin(angle) * length
      };
    });

    for (let i = 0; i < numShards; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 250 + Math.random() * 650;
      shards.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        size: 10 + Math.random() * 32,
        color: Math.random() > 0.4 ? 'rgba(0, 243, 255, ' : 'rgba(255, 42, 133, ',
        alpha: 1,
        sides: 3 + Math.floor(Math.random() * 3)
      });
    }

    let startTime = null;
    const duration = 1400; // ms

    const animateShards = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw glass cracks
      if (progress < 0.6) {
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.8 * (1 - progress / 0.6)})`;
        ctx.lineWidth = 2.5;
        cracks.forEach((crack) => {
          ctx.beginPath();
          ctx.moveTo(crack.x1, crack.y1);
          ctx.lineTo(crack.x2, crack.y2);
          ctx.stroke();
        });
      }

      // Draw flying polygon glass shards
      shards.forEach((shard) => {
        const dt = 0.016;
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.vy += 380 * dt; // gravity
        shard.rotation += shard.rotSpeed * dt;
        shard.alpha = Math.max(0, 1 - progress * 1.1);

        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);
        ctx.fillStyle = shard.color + shard.alpha + ')';
        ctx.strokeStyle = `rgba(255, 255, 255, ${shard.alpha * 0.9})`;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        for (let s = 0; s < shard.sides; s++) {
          const a = (s * 2 * Math.PI) / shard.sides;
          const r = shard.size * (0.6 + Math.sin(a * 2) * 0.4);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      if (progress < 1) {
        requestAnimationFrame(animateShards);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    requestAnimationFrame(animateShards);
  };

  // Ricochet sequence
  const triggerRicochetSequence = (data) => {
    SoundFX.playRicochet();
    setRicochetInfo({
      message: data.message || 'Улика не противоречит этому утверждению.',
      penaltyRemaining: data.penaltyRemaining
    });

    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 240);

    setTimeout(() => {
      setRicochetInfo(null);
    }, 3200);
  };

  // Compute 3D / wave trajectory positioning for statement
  const getStatementTransform = () => {
    const trajectory = activeStatement.trajectory || 'linear';

    // x moves from right (100%) to left (-100%)
    const xPercent = (1 - statementProgress * 2) * 80;

    let yOffset = 0;
    let scale = 1;
    let rotation = -1.5;

    if (trajectory === 'wave') {
      yOffset = Math.sin(statementProgress * Math.PI * 3.5) * 42;
    } else if (trajectory === 'perspective') {
      // Scales up in middle, recedes at edges
      const distFromCenter = Math.abs(statementProgress - 0.5) * 2;
      scale = 0.8 + (1 - distFromCenter) * 0.35;
      rotation = (statementProgress - 0.5) * 8;
    }

    return {
      transform: `translate3d(${xPercent}%, ${yOffset}px, 0) scale(${scale}) rotate(${rotation}deg)`,
      opacity: statementProgress < 0.05 ? statementProgress * 20 : statementProgress > 0.92 ? (1 - statementProgress) * 12.5 : 1
    };
  };

  // Render statement text with embedded .dr-weak-point elements
  const renderStatementText = () => {
    const text = activeStatement.text;
    const weakPoints = activeStatement.weakPoints || [];

    if (!weakPoints.length) {
      return <span>{text}</span>;
    }

    // Sort weak points by startIndex
    const sortedWp = [...weakPoints].sort((a, b) => a.startIndex - b.startIndex);
    const elements = [];
    let lastIdx = 0;

    sortedWp.forEach((wp) => {
      // Find start and end indices
      const start = wp.startIndex !== undefined ? wp.startIndex : text.indexOf(wp.phrase);
      const end = wp.endIndex !== undefined ? wp.endIndex : start + (wp.phrase ? wp.phrase.length : 0);

      if (start > lastIdx) {
        elements.push(
          <span key={`text-${lastIdx}`}>{text.substring(lastIdx, start)}</span>
        );
      }

      const phrase = text.substring(start, end);
      const isTargeted = lockedTarget?.weakPointId === wp.id;

      elements.push(
        <span
          key={`wp-${wp.id}`}
          data-wp-id={wp.id}
          className={`dr-weak-point inline-block cursor-crosshair font-bold transition-all px-1.5 py-0.5 rounded mx-1 ${
            isTargeted
              ? 'bg-[#ff2a85]/30 text-[#ff2a85] border border-[#ff2a85] shadow-[0_0_15px_rgba(255,42,133,0.8)] scale-105'
              : 'text-[#ffb703] border-b-2 border-dashed border-[#ffb703]/60 hover:text-[#ff2a85] hover:border-[#ff2a85]'
          }`}
          onMouseEnter={() => handleWeakPointEnter(wp.id, activeStatement.id)}
          onMouseLeave={handleWeakPointLeave}
          onClick={(e) => {
            e.stopPropagation();
            fireBullet({ statementId: activeStatement.id, weakPointId: wp.id });
          }}
        >
          <span className="text-xs opacity-75 font-mono mr-0.5">&gt;</span>
          {phrase}
          <span className="text-xs opacity-75 font-mono ml-0.5">&lt;</span>
        </span>
      );

      lastIdx = end;
    });

    if (lastIdx < text.length) {
      elements.push(
        <span key={`text-end`}>{text.substring(lastIdx)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Tactical Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0c101d] border border-[#2a3860] p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#ff2a85] animate-ping" />
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <span>ПЕРЕКРЁСТНЫЙ ДОПРОС // NON-STOP DEBATE</span>
              {isResolved && (
                <span className="text-[10px] bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-2 py-0.5 rounded">
                  ✓ АЛИБИ ОПРОВЕРГНУТО
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-400">
              Найдите противоречие в показаниях фигуранта и выстрелите подходящей Пулей Правды
            </p>
          </div>
        </div>

        {/* Playback & Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 font-mono transition-colors ${
              isPaused
                ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
                : 'bg-[#151c2e] border-[#2c3b5d] text-gray-300 hover:text-white'
            }`}
            title="Пауза движения показаний [ПРОБЕЛ]"
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? 'ПУСК' : 'ПАУЗА'}</span>
          </button>

          <button
            onClick={() => setIsFastForward(!isFastForward)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 font-mono transition-colors ${
              isFastForward
                ? 'bg-[#00f3ff]/20 border-[#00f3ff] text-[#00f3ff]'
                : 'bg-[#151c2e] border-[#2c3b5d] text-gray-300 hover:text-white'
            }`}
            title="Ускорение 2.5x [TAB]"
          >
            <FastForward size={14} />
            <span>2.5x</span>
          </button>

          <button
            onClick={() => {
              setStatementProgress(0);
              setStatementIndex((idx) => (idx + 1) % statements.length);
            }}
            className="px-2.5 py-1.5 bg-[#151c2e] border border-[#2c3b5d] text-gray-300 hover:text-white rounded flex items-center gap-1.5 font-mono"
            title="Следующая реплика"
          >
            <RotateCcw size={14} />
            <span>СЛЕД.</span>
          </button>
        </div>
      </div>

      {/* Main Debate Interactive Viewport (Stage) */}
      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsCursorInside(true)}
        onMouseLeave={() => {
          setIsCursorInside(false);
          setLockedTarget(null);
        }}
        onClick={() => fireBullet()}
        className={`relative w-full h-[380px] sm:h-[440px] md:h-[480px] bg-gradient-to-b from-[#070a14] via-[#090e1c] to-[#04060c] rounded-lg border border-[#253252] overflow-hidden select-none cursor-crosshair ${
          screenShake ? 'animate-bounce' : ''
        }`}
      >
        {/* CRT Scanline & Cyber Grid Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 243, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Ambient Radial Target Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-[#00f3ff]/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-dashed border-[#ff2a85]/10 pointer-events-none animate-spin" style={{ animationDuration: '60s' }} />

        {/* Canvas for glass fracture & polygon shard physics */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-30"
        />

        {/* Laser Gunshot Tracer Beam */}
        {laserBeam && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-25">
            <line
              x1={laserBeam.x1}
              y1={laserBeam.y1}
              x2={laserBeam.x2}
              y2={laserBeam.y2}
              stroke="#00f3ff"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <circle cx={laserBeam.x2} cy={laserBeam.y2} r="8" fill="#ff2a85" />
          </svg>
        )}

        {/* Stage 1 Flash Overlay */}
        {truthBreakStage === 1 && (
          <div className="absolute inset-0 bg-white/90 z-40 animate-ping pointer-events-none" />
        )}

        {/* Stage 3: Giant Diagonal "BREAK!" Typographic Banner with Chromatic Glitch */}
        {truthBreakStage >= 3 && truthBreakStage <= 4 && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="relative transform -rotate-6 scale-110 sm:scale-125 transition-transform animate-pulse">
              <div
                className="text-7xl sm:text-9xl font-black tracking-widest text-[#ff2a85] drop-shadow-[0_0_35px_rgba(255,42,133,0.9)] select-none"
                style={{
                  fontFamily: 'Impact, sans-serif',
                  textShadow: '4px 4px 0 #00f3ff, -4px -4px 0 #ffffff'
                }}
              >
                BREAK!
              </div>
              <div className="text-center font-mono font-bold tracking-widest text-xs sm:text-sm text-cyan-300 bg-black/70 px-3 py-1 rounded border border-cyan-400 mt-2">
                // TRUTH BREAK CONFIRMED // АЛИБИ РАЗРУШЕНО //
              </div>
            </div>
          </div>
        )}

        {/* Stage 4: Nagito Komaeda Refutation Cut-in Banner */}
        {truthBreakStage === 4 && truthBreakData && (
          <div className="absolute bottom-6 left-0 right-0 z-50 px-4 pointer-events-none animate-slide-in">
            <div className="max-w-3xl mx-auto bg-gradient-to-r from-[#180a22]/95 via-[#25103a]/95 to-[#12071a]/95 border-y-2 border-[#ff2a85] p-4 shadow-[0_0_30px_rgba(255,42,133,0.6)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#00f3ff] overflow-hidden flex-shrink-0 bg-[#0e172a] flex items-center justify-center text-[#00f3ff] font-bold font-mono text-sm">
                  NK
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#ff2a85] tracking-widest font-bold mb-1">
                    <span>НАГИТО КОМАЭДА // ОПРОВЕРЖЕНИЕ</span>
                    <span className="text-cyan-400">«SORE WA CHIGAU YO!»</span>
                  </div>
                  <p className="text-sm sm:text-base font-serif italic text-white font-medium">
                    {truthBreakData.counterStatement}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ricochet Alert Notification */}
        {ricochetInfo && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-35 bg-red-950/90 border border-red-500 text-red-200 px-4 py-2 rounded-lg font-mono text-xs shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400 animate-pulse" />
            <div>
              <div className="font-bold text-red-400">РИКОШЕТ! ПУЛЯ ПРАВДЫ ОТСКОЧИЛА</div>
              <div className="text-[11px] text-gray-300">{ricochetInfo.message}</div>
              {typeof ricochetInfo.penaltyRemaining === 'number' && (
                <div className="text-[10px] text-amber-400 mt-0.5">
                  Осталось попыток: {ricochetInfo.penaltyRemaining}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Suspect Statements Carousel */}
        {truthBreakStage === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              style={getStatementTransform()}
              className="pointer-events-auto transition-transform duration-75 max-w-2xl px-4"
            >
              <div className="relative bg-[#0d1326]/90 border border-[#2b3a60] p-4 sm:p-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-md">
                {/* Speaker Header Badge */}
                <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-[#1f2c4a]">
                  <div className="w-8 h-8 rounded-full bg-[#172038] border border-[#ff2a85] flex items-center justify-center text-xs font-bold text-[#ff2a85]">
                    KT
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-white tracking-wide">
                      {activeStatement.speaker}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">
                      {activeStatement.role} // ТАКТ: {activeStatement.trajectory}
                    </div>
                  </div>
                </div>

                {/* Main Statement Content with Weak Points */}
                <div className="text-sm sm:text-base md:text-lg font-mono text-gray-100 leading-relaxed">
                  «{renderStatementText()}»
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resolved Climax View (Stage 5) */}
        {truthBreakStage === 5 && truthBreakData && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="max-w-xl w-full bg-[#0a1020] border-2 border-[#00ff88] rounded-xl p-6 text-center space-y-4 shadow-[0_0_40px_rgba(0,255,136,0.3)]">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] mb-1">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-white font-mono tracking-wider">
                ЛОЖНОЕ АЛИБИ КИРУМИ ТОДЗЁ ОПРОВЕРГНУТО!
              </h3>
              <p className="text-xs font-mono text-gray-300 leading-relaxed bg-[#121a30] p-3 rounded border border-[#233257]">
                {truthBreakData.counterStatement}
              </p>
              <div className="text-[11px] font-mono text-[#00f3ff] bg-[#00f3ff]/10 py-1.5 px-3 rounded border border-[#00f3ff]/40 inline-block">
                ★ ПОЛУЧЕНА УЛИКА: {truthBreakData.unlockedClue}
              </div>
              <div>
                <button
                  onClick={() => setTruthBreakStage(0)}
                  className="px-4 py-2 bg-[#1a2544] hover:bg-[#253560] border border-[#00ff88] text-[#00ff88] font-mono text-xs rounded transition-colors"
                >
                  ПОВТОРИТЬ ДЕБАТЫ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Crosshair Targeting Reticle Tracking Cursor */}
        {isCursorInside && truthBreakStage === 0 && (
          <div
            className="pointer-events-none absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: reticlePos.x, top: reticlePos.y }}
          >
            <div
              className={`relative w-14 h-14 transition-all duration-75 ${
                lockedTarget ? 'scale-125' : 'scale-100'
              }`}
            >
              {/* Outer Ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 border-dashed animate-spin ${
                  lockedTarget ? 'border-[#ff2a85]' : 'border-[#00f3ff]'
                }`}
                style={{ animationDuration: lockedTarget ? '2s' : '10s' }}
              />

              {/* Crosshair Lines */}
              <div
                className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${
                  lockedTarget ? 'bg-[#ff2a85]' : 'bg-[#00f3ff]/80'
                }`}
              />
              <div
                className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 ${
                  lockedTarget ? 'bg-[#ff2a85]' : 'bg-[#00f3ff]/80'
                }`}
              />

              {/* Center Lock Dot */}
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  lockedTarget ? 'bg-[#ff2a85] animate-ping' : 'bg-white'
                }`}
              />

              {/* Lock-on Tag */}
              {lockedTarget && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#ff2a85] text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded tracking-widest whitespace-nowrap shadow-[0_0_10px_rgba(255,42,133,0.8)]">
                  TARGET LOCK
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Left: Rotary 6-Chamber Truth Bullet Cylinder (Котодама) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 left-3 z-20 flex items-center gap-3 bg-[#080d1a]/90 border border-[#233152] p-2.5 rounded-xl shadow-xl backdrop-blur-md max-w-sm"
        >
          {/* Cylinder Radial UI */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              rotateCylinder(e.deltaY > 0 ? 1 : -1);
            }}
            className="relative w-20 h-20 flex-shrink-0 cursor-pointer"
            title="Крутите колесо мыши или нажимайте [Q]/[E] для смены пули"
          >
            {/* Outer Chamber Base */}
            <div className="absolute inset-0 rounded-full border-2 border-[#1f2d4d] bg-[#0c1324] shadow-inner" />

            {/* 6 Chambers */}
            {bullets.slice(0, 6).map((b, idx) => {
              const angle = ((idx - selectedBulletIndex) * 60) * (Math.PI / 180);
              const radius = 26;
              const cx = 40 + Math.sin(angle) * radius;
              const cy = 40 - Math.cos(angle) * radius;
              const isSelected = idx === selectedBulletIndex;

              return (
                <div
                  key={b.id}
                  onClick={() => selectBullet(idx)}
                  style={{ left: `${cx}px`, top: `${cy}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-[#00f3ff] text-black border-white shadow-[0_0_12px_rgba(0,243,255,0.9)] scale-125 z-10'
                      : 'bg-[#141d33] text-gray-400 border-[#2d3f6b] hover:border-gray-200'
                  }`}
                >
                  {idx + 1}
                </div>
              );
            })}

            {/* Cylinder Core Axle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#18233d] border border-[#3b5080]" />
          </div>

          {/* Active Bullet Info HUD */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-0.5">
              <span className="text-[#00f3ff] font-bold">ПУЛЯ ПРАВДЫ [{selectedBulletIndex + 1}/{bullets.length}]</span>
              <span className="text-gray-500 font-bold">[Q / E]</span>
            </div>
            <div className="text-xs font-bold text-white font-mono truncate">
              {activeBullet.title}
            </div>
            <div className="text-[10px] text-gray-400 line-clamp-2 mt-0.5 leading-tight">
              {activeBullet.summary}
            </div>
            {cooldownSeconds > 0 && (
              <div className="mt-1 text-[9px] font-mono text-amber-400 flex items-center gap-1">
                <span>ПЕРЕЗАРЯДКА: {cooldownSeconds.toFixed(1)}с</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Right: Quick Fire Action & Shortcuts Hint */}
        <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fireBullet();
            }}
            disabled={cooldownSeconds > 0 || isFiring}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg border transition-all ${
              cooldownSeconds > 0
                ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#ff2a85] to-[#c71585] border-white/20 text-white hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(255,42,133,0.4)]'
            }`}
          >
            <span>ВЫСТРЕЛ</span>
            <span className="text-[10px] opacity-75">[КЛИК]</span>
          </button>
        </div>
      </div>

      {/* Loaded Evidence Bullets Shelf */}
      <div className="bg-[#0b0f1c] border border-[#202b47] rounded-lg p-3">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[#00f3ff] font-bold">АРСЕНАЛ КОТОДАМА:</span>
            <span>Выберите активную Пулю Правды для стрельбы по уязвимым точкам</span>
          </div>
          <span className="text-gray-500 text-[10px]">Колесо мыши / Q / E</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {bullets.map((b, idx) => {
            const isSelected = idx === selectedBulletIndex;
            return (
              <button
                key={b.id}
                onClick={() => selectBullet(idx)}
                className={`p-2.5 rounded border text-left font-mono transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#15233d] border-[#00f3ff] text-white shadow-[0_0_12px_rgba(0,243,255,0.25)]'
                    : 'bg-[#0e1424] border-[#1d2945] text-gray-400 hover:text-gray-200 hover:border-[#2e406b]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isSelected ? 'text-[#00f3ff] font-bold' : 'text-gray-500 font-bold'}>
                    #{idx + 1} {b.code}
                  </span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00f3ff]" />}
                </div>
                <div className="text-[11px] font-bold text-gray-200 truncate">
                  {b.title}
                </div>
                <div className="text-[9px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                  {b.summary}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
