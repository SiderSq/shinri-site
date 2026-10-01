import crypto from 'node:crypto';
import { GAME_IDS, circuitReading, trapReading, comparisonScore, correctSpectralIds } from '../../shared/lab-model.js';
export { GAME_IDS };
const TITLES = { circuit: 'Электроцепь', uv: 'Спектрометр', timeline: 'Хронология', trap: 'Механизм капкана', workbench: 'Микрорельеф' };
export const STAGE_NAMES = ['Освоение прибора', 'Контроль помех', 'Комплексная экспертиза'];
const between = (n, a, b) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b;
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && b.every(x => a.includes(x));
const fail = (message, fields = []) => ({ success: false, message, fields });
const seedValue = seed => crypto.createHash('sha256').update(String(seed)).digest().readUInt32BE(0);
const shuffle = (items, seed) => [...items].sort((a, b) => seedValue(`${seed}:${a.id}`) - seedValue(`${seed}:${b.id}`));
export function makeChallenge(gameId, stage = 0, seed = 'test') {
  if (!GAME_IDS.includes(gameId) || !Number.isInteger(stage) || stage < 0 || stage > 2) throw new Error('Unknown analysis stage');
  const ch = { gameId, stage, title: TITLES[gameId], stageName: STAGE_NAMES[stage], model: 'Учебная модель прибора; не новые факты дела.' };
  const n = seedValue(`${seed}:${gameId}:${stage}`);
  if (gameId === 'circuit') {
    const cols = stage === 0 ? 2 : 3, rows = stage === 2 ? 3 : 2;
    const route = stage === 0 ? [0, 1, 3] : stage === 1 ? [0, 1, 2, 5] : [0, 1, 2, 5, 4, 7, 8];
    const tiles = Array.from({ length: cols * rows }, (_, i) => ({ id: `node-${i}`, label: i === 0 ? 'Источник' : i === cols * rows - 1 ? 'Выход' : `Узел ${i + 1}`, ports: [0, 1], rotation: (n + i * 3) % 4, fixed: false, damaged: !route.includes(i) && stage > 0 }));
    for (let k = 0; k < route.length; k++) {
      const i = route[k]; const neighbors = [route[k - 1], route[k + 1]].filter(x => x !== undefined);
      tiles[i].ports = neighbors.map(j => j === i + 1 ? 1 : j === i - 1 ? 3 : j === i + cols ? 2 : 0);
      tiles[i].fixed = k === 0 || k === route.length - 1;
      if (tiles[i].fixed) tiles[i].rotation = 0;
    }
    return { ...ch, cols, rows, tiles, resistance: 400 + stage * 50, currentBand: [2.8, 3.2], voltage: 600, voltageMin: 200, voltageMax: 1800, voltageStep: 50 };
  }
  if (gameId === 'uv') {
    const drift = stage === 0 ? 0 : 2 + n % 4;
    const list = [
      { id: 'floor', label: 'Плитка у слива', peak: 414 + drift, reaction: 'positive', ratio: 2.6 },
      { id: 'ash', label: 'Панель с сажей', peak: 450 + drift, reaction: 'positive', ratio: 1.1 },
      { id: 'blank', label: 'Контрольный образец', peak: 412 + drift, reaction: 'negative', ratio: 0.4 },
    ];
    if (stage > 0) list.push({ id: 'handle', label: 'Рукоятка инструмента', peak: 420 + drift, reaction: 'positive', ratio: 2.3 });
    if (stage > 1) list.push({ id: 'cleaner', label: 'Остаток чистящего состава', peak: 419 + drift, reaction: 'positive', ratio: 1.4 });
    return { ...ch, samples: shuffle(list, seed + stage), calibration: { expected: 405, observed: 405 + drift }, band: [405, 425], minRatio: stage === 2 ? 2 : 0.8 };
  }
  if (gameId === 'timeline') {
    const all = [
      { id: 'parts', title: 'Получение деталей', note: 'Без деталей сборка не могла начаться.', minute: 32, source: 'СКУД' },
      { id: 'assemble', title: 'Сборка разрядника', note: 'Сборка завершилась до передачи капкана.', minute: 35, source: 'Мастерская' },
      { id: 'handover', title: 'Передача капкана', note: 'Передача произошла до входа в помещение.', minute: 38, source: 'Камера' },
      { id: 'shock', title: 'Вход и разряд', note: 'Разговор относится к периоду после разряда.', minute: 40, source: 'Терминал' },
      { id: 'talk', title: 'Разговор', note: 'Обнаруженные следы уборки появились позже.', minute: 41, source: 'Терминал' },
      { id: 'clean', title: 'Уборка следов', note: 'Уборка — заключительное действие этой модели.', minute: 43, source: 'Камера' },
    ];
    const events = stage === 0 ? all.filter(x => ['assemble', 'handover', 'shock'].includes(x.id)) : stage === 1 ? all.filter(x => x.id !== 'talk') : all;
    const drift = stage === 2 ? 2 + n % 3 : 0;
    const log = events.map(e => ({ ...e, observedMinute: e.minute + (e.source === 'Терминал' ? drift : 0) }));
    const edges = events.slice(1).map((e, i) => [events[i].id, e.id]);
    return { ...ch, events: shuffle(log.map(({ minute: _minute, ...e }) => e), seed + stage), constraints: edges.map(([a, b]) => `${events.find(e => e.id === a).title} раньше, чем ${events.find(e => e.id === b).title.toLowerCase()}.`), sync: stage === 2 ? { observed: 32 + drift, reference: 32 } : null };
  }
  if (gameId === 'trap') {
    return { ...ch, baseLoad: stage === 2 ? 135 : 125, leverage: stage === 0 ? 0 : stage === 1 ? 0.5 : 0.8, damping: stage === 2 ? 2 : 0, safeBand: [45, 55], openingBand: stage === 0 ? [0, 0] : [25, 35], maxRelease: 100, maxDamper: stage === 2 ? 30 : 0 };
  }
  const ridges = {
    A: [14, 27, 43, 58, 82], B: [10, 28, 40, 66, 85],
  };
  const samples = [
    { id: 'cutter', label: 'Монтажные кусачки', ridges },
    { id: 'saw', label: 'Слесарная ножовка', ridges: { A: [12, 30, 46, 63, 87], B: [18, 30, 48, 60, 80] } },
    { id: 'blade', label: 'Канцелярский нож', ridges: { A: [20, 31, 51, 70, 94], B: [20, 35, 52, 73, 92] } },
  ];
  const chosen = samples[n % samples.length];
  return { ...ch, samples: shuffle(samples, seed + stage), reference: { ridges: chosen.ridges, rotation: stage === 0 ? 6 : (n % 15) - 7, offset: stage === 0 ? 0 : (n % 9) - 4 }, windows: stage === 2 ? ['A', 'B'] : ['A'], threshold: 95 };
}
export function evaluateChallenge(ch, proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return fail('Передайте настройки и вывод анализа.');
  if (ch.gameId === 'circuit') {
    if (!Array.isArray(proof.rotations) || proof.rotations.length !== ch.tiles.length || !proof.rotations.every(x => Number.isInteger(x) && x >= 0 && x < 4) || !between(proof.voltage, ch.voltageMin, ch.voltageMax) || (proof.voltage - ch.voltageMin) % ch.voltageStep) return fail('Проверьте повороты узлов и диапазон напряжения.', ['circuit']);
    const state = circuitReading(ch, proof);
    if (!state.connected) return fail('Выход не соединён с источником. Проверьте стыки соседних проводников.', ['circuit']);
    if (state.fault) return fail('В запитанную ветвь попал повреждённый предохранитель. Обойдите его.', ['circuit']);
    if (!between(state.current, ...ch.currentBand)) return fail('Ток вне рабочего диапазона. Используйте I = U / R и паспорт нагрузки.', ['voltage']);
  } else if (ch.gameId === 'uv') {
    const zero = ch.calibration.observed - ch.calibration.expected;
    if (!between(proof.zeroOffset, -10, 10) || proof.zeroOffset !== zero) return fail('Сначала откалибруйте спектрометр по контрольной линии.', ['zeroOffset']);
    if (!sameSet(proof.sampleIds, correctSpectralIds(ch, proof.zeroOffset))) return fail('Выбранный набор не удовлетворяет всем критериям. Сравните реакцию, скорректированный пик и отношение сигналов.', ['samples']);
  } else if (ch.gameId === 'timeline') {
    if (!sameSet(proof.order, ch.events.map(e => e.id))) return fail('Каждое событие должно присутствовать ровно один раз.', ['order']);
    const correction = ch.sync ? ch.sync.reference - ch.sync.observed : 0;
    if (!between(proof.clockCorrection, -5, 5) || proof.clockCorrection !== correction) return fail('Поправка журнала не согласована с контрольной синхронизацией.', ['clockCorrection']);
    const corrected = [...ch.events].map(e => ({ ...e, minute: e.observedMinute + (e.source === 'Терминал' ? correction : 0) })).sort((a, b) => a.minute - b.minute);
    if (!proof.order.every((id, i) => id === corrected[i].id)) return fail('Порядок нарушает временные отметки и причинные связи. Проверьте, что могло произойти раньше.', ['order']);
  } else if (ch.gameId === 'trap') {
    if (!between(proof.release, 0, 100) || !between(proof.opening, ...ch.openingBand) || !between(proof.damper, 0, ch.maxDamper)) return fail('Проверьте раскрытие и допустимые положения регуляторов.', ['trap']);
    if (ch.stage > 0 && (proof.pinReleased !== true || !between(proof.primingRelease, 0, 100) || !between(ch.baseLoad - proof.primingRelease, ...ch.safeBand))) return fail('Предохранительный штифт можно извлечь только после разгрузки пружины.', ['pin']);
    if (!between(trapReading(ch, proof), ...ch.safeBand)) return fail('Усилие вышло из безопасного окна. Раскрытие повышает нагрузку; компенсируйте разгрузкой или демпфером.', ['trap']);
  } else if (ch.gameId === 'workbench') {
    if (!between(proof.rotation, -20, 20) || !between(proof.offset, -15, 15) || !between(proof.focus, 20, 100) || !ch.samples.some(s => s.id === proof.sampleId)) return fail('Выберите образец и допустимые настройки микроскопа.', ['microscope']);
    if (!sameSet(proof.checkedWindows, ch.windows)) return fail('Сравните каждый участок образца перед заключением.', ['windows']);
    if (!ch.windows.every(w => comparisonScore(ch, proof, w) >= ch.threshold)) return fail('Совпадение недостаточно. Проверьте борозды, совмещение и фокус на всех участках.', ['microscope']);
  }
  return { success: true, message: 'Заключение подтверждено.' };
}
export function ensureLab(session, caseData) {
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([caseData.caseId, caseData.killer, caseData.documents, 'lab-v2'])).digest('hex');
  if (!session.labV2 || session.labV2.fingerprint !== fingerprint) session.labV2 = { fingerprint, nonce: crypto.randomUUID(), progress: Object.fromEntries(GAME_IDS.map(id => [id, 0])), letters: {}, lastSubmit: -Infinity, attempts: [] };
  return session.labV2;
}
export function publicLab(session, caseData) {
  const lab = ensureLab(session, caseData);
  return { version: lab.nonce, progress: lab.progress, letters: lab.letters, games: GAME_IDS.map(id => makeChallenge(id, Math.min(2, lab.progress[id]), lab.nonce)) };
}
export function rewardLetter(gameId, word) {
  const chars = String(word || '').trim().toUpperCase().split('');
  const index = GAME_IDS.indexOf(gameId);
  return index === 4 ? (chars.slice(4).join(' & ') || chars.at(-1) || '') : (chars[index] || '');
}
