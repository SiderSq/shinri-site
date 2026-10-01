import crypto from "node:crypto";
export const fingerprint = (data) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify([data.archiveRound, data.accessCode, data.recoveryKey]),
    )
    .digest("hex");
export function chronology(round) {
  const ids = round.events.map((e) => e.id),
    result = [];
  while (result.length < ids.length) {
    const available = ids.filter(
      (id) =>
        !result.includes(id) &&
        round.edges
          .filter((e) => e[1] === id)
          .every((e) => result.includes(e[0])),
    );
    if (available.length !== 1)
      throw new Error(
        "Хронология должна иметь единственный порядок, без циклов.",
      );
    result.push(available[0]);
  }
  return result;
}
export const circuitAnswer = (r) =>
  r.circuit.rows
    .filter(
      (x) =>
        x.closed && x.fuse && x.voltage / x.resistance >= r.circuit.threshold,
    )
    .map((x) => x.id)
    .sort();
export function interpret(t) {
  const d = t.measurement;
  if (!d) throw new Error("У каждой улики нужны структурированные измерения.");
  if (t.kind === "spectrum") {
    if (
      !Number.isFinite(d.sample) ||
      !Array.isArray(d.bands) ||
      d.bands.some(
        (b) =>
          !b.name ||
          !Number.isFinite(b.min) ||
          !Number.isFinite(b.max) ||
          b.min > b.max,
      )
    )
      throw new Error("Неверные эталоны спектра.");
    const matches = d.bands.filter(
      (b) => d.sample >= b.min && d.sample <= b.max,
    );
    if (matches.length === 1) return matches[0].name;
  }
  if (t.kind === "tool") {
    if (
      !Array.isArray(d.marks) ||
      d.marks.length < 3 ||
      d.marks.some(
        (v, i) => !Number.isFinite(v) || (i && v <= d.marks[i - 1]),
      ) ||
      !Array.isArray(d.tools) ||
      d.tools.some((x) => !x.name || !Number.isFinite(x.step) || x.step <= 0)
    )
      throw new Error("Неверные эталоны среза.");
    const matches = d.tools.filter((x) =>
      d.marks
        .slice(1)
        .every((v, i) => Math.abs(v - d.marks[i] - x.step) < 1e-8),
    );
    if (matches.length === 1) return matches[0].name;
  }
  if (t.kind === "clock") {
    if (
      !Array.isArray(d.interval) ||
      d.interval.length !== 2 ||
      d.interval.some((x) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(x)) ||
      !Number.isInteger(d.fastByMinutes)
    )
      throw new Error("Неверная поправка часов.");
    const mins = d.interval.map(
      (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)) - d.fastByMinutes,
    );
    if (mins[0] < 0 || mins[1] >= 1440 || mins[0] >= mins[1])
      throw new Error("Интервал должен лежать в одних сутках и идти вперёд.");
    return mins
      .map(
        (v) =>
          `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`,
      )
      .join("–");
  }
  throw new Error("Из измерения нельзя вывести единственный результат.");
}
export function observation(t) {
  const d = t.measurement;
  if (t.kind === "spectrum")
    return `Максимум спектра: ${d.sample} нм. Эталоны: ${d.bands.map((b) => `${b.name}: ${b.min}–${b.max} нм`).join("; ")}. Границы включены. Найдите совместимый материал.`;
  if (t.kind === "tool")
    return `Борозды находятся на расстоянии ${d.marks.join(" / ")} мм от края. Эталоны: ${d.tools.map((x) => `${x.name}: шаг ${x.step} мм`).join("; ")}. Сравните расстояния между соседними бороздами, не последнее число.`;
  return `Датчик записал ${d.interval.join("–")}. Его часы ${d.fastByMinutes >= 0 ? "спешат" : "отстают"} на ${Math.abs(d.fastByMinutes)} мин. Переведите весь интервал на серверное время.`;
}
export const traceAnswer = (r) => r.traces.map(interpret);
export const contenders = (r) =>
  r.participants.filter((p) =>
    r.traces.every((t) => p.profile[t.key] === t.value),
  );
export function validateRound(r) {
  if (
    !r ||
    !r.id ||
    !r.title ||
    !r.brief ||
    !["archive", "live"].includes(r.mode)
  )
    throw new Error("Укажите id, title, brief и mode.");
  const unique = (list) =>
    new Set(list).size === list.length &&
    list.every((x) => typeof x === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(x));
  if (
    !Array.isArray(r.participants) ||
    r.participants.length < 4 ||
    r.participants.length > 30 ||
    !unique(r.participants.map((p) => p.id)) ||
    r.participants.some((p) => !p.name || !p.profile)
  )
    throw new Error(
      "Нужны 4–30 участников с уникальными ID, именами и профилями.",
    );
  if (
    !Array.isArray(r.events) ||
    r.events.length < 4 ||
    r.events.length > 8 ||
    !unique(r.events.map((e) => e.id)) ||
    r.events.some((e) => !e.text) ||
    !Array.isArray(r.edges) ||
    r.edges.some(
      (e) =>
        !Array.isArray(e) ||
        e.length !== 2 ||
        e.some((id) => !r.events.some((x) => x.id === id)),
    )
  )
    throw new Error("Некорректные события или причинные связи.");
  chronology(r);
  if (
    !r.circuit ||
    !Array.isArray(r.circuit.rows) ||
    r.circuit.rows.length < 3 ||
    !Number.isFinite(r.circuit.threshold) ||
    r.circuit.threshold <= 0 ||
    !unique(r.circuit.rows.map((x) => x.id)) ||
    r.circuit.rows.some(
      (x) =>
        !Number.isFinite(x.voltage) ||
        x.voltage <= 0 ||
        !Number.isFinite(x.resistance) ||
        x.resistance <= 0 ||
        typeof x.closed !== "boolean" ||
        typeof x.fuse !== "boolean",
    )
  )
    throw new Error("Некорректная таблица электроцепи.");
  if (
    !circuitAnswer(r).length ||
    circuitAnswer(r).length === r.circuit.rows.length
  )
    throw new Error("Цепь должна содержать рабочие и нерабочие измерения.");
  if (
    !Array.isArray(r.traces) ||
    r.traces.length !== 3 ||
    !unique(r.traces.map((t) => t.id)) ||
    new Set(r.traces.map((t) => t.key)).size !== 3 ||
    r.traces.some(
      (t) =>
        !t.title ||
        !t.provenance ||
        !Array.isArray(t.options) ||
        t.options.length < 3 ||
        new Set(t.options).size !== t.options.length ||
        !t.options.includes(t.value) ||
        r.participants.some((p) => !t.options.includes(p.profile[t.key])),
    )
  )
    throw new Error(
      "Нужны три независимые улики с источниками, вариантами и полными профилями.",
    );
  if (r.traces.some((t) => interpret(t) !== t.value))
    throw new Error("Скрытый вывод не совпадает с измерениями.");
  if (contenders(r).length !== 1)
    throw new Error("Улики должны выделять ровно одного участника.");
  // Every trace must add information; no single fact is already a ready-made verdict.
  if (
    r.traces.some(
      (t) =>
        r.participants.filter((p) => p.profile[t.key] === t.value).length < 2,
    )
  )
    throw new Error("Одна улика не должна сразу раскрывать личность.");
  if (
    r.traces.some(
      (ignored) =>
        r.participants.filter((p) =>
          r.traces
            .filter((t) => t.id !== ignored.id)
            .every((t) => p.profile[t.key] === t.value),
        ).length < 2,
    )
  )
    throw new Error(
      "Каждая улика должна быть необходима: без неё должны оставаться альтернативы.",
    );
  if (!r.attribution || (r.mode === "live" && r.confirmed !== true))
    throw new Error(
      "Нужны условия атрибуции и подтверждение фактов ведущим для live.",
    );
  if (r.mode === "live" && !r.driveUrl)
    throw new Error("Для живого раунда обязательна папка Google Drive.");
  if (r.driveUrl && !/^https:\/\/drive\.google\.com\//.test(r.driveUrl))
    throw new Error("Допустима только HTTPS-ссылка Google Drive.");
  return r;
}
const sameSet = (a, b) =>
  Array.isArray(a) &&
  a.length === b.length &&
  new Set(a).size === a.length &&
  [...a].sort().every((v, i) => v === [...b].sort()[i]);
export function checkPuzzle(r, id, answer) {
  if (id === "circuit")
    return (
      sameSet(answer?.selected, circuitAnswer(r)) &&
      !!answer.currents &&
      Object.keys(answer.currents).length === r.circuit.rows.length &&
      r.circuit.rows.every((x) => {
        const current = x.closed && x.fuse ? x.voltage / x.resistance : 0;
        return (
          ["number", "string"].includes(typeof answer.currents[x.id]) &&
          String(answer.currents[x.id]).trim() !== "" &&
          Number.isFinite(Number(answer.currents[x.id])) &&
          Math.abs(Number(answer.currents[x.id]) - current) <= 0.01
        );
      })
    );
  if (id === "timeline")
    return (
      Array.isArray(answer) &&
      answer.length === r.events.length &&
      chronology(r).every((v, i) => answer[i] === v)
    );
  if (id === "traces")
    return (
      Array.isArray(answer) &&
      answer.length === 3 &&
      traceAnswer(r).every((v, i) => answer[i] === v)
    );
  return false;
}
export function checkVerdict(r, body) {
  const winner = contenders(r)[0];
  if (
    body.suspectId !== winner.id ||
    !sameSet(
      body.evidenceIds,
      r.traces.map((t) => t.id),
    )
  )
    return false;
  const others = r.participants.filter((p) => p.id !== winner.id);
  return (
    !!body.exclusions &&
    Object.keys(body.exclusions).length === others.length &&
    others.every((p) => {
      const t = r.traces.find((x) => x.id === body.exclusions[p.id]);
      return t && p.profile[t.key] !== t.value;
    })
  );
}
export function publicRound(r) {
  const safe = Object.fromEntries(
    [
      "id",
      "mode",
      "title",
      "brief",
      "driveUrl",
      "driveInstructions",
      "attribution",
      "circuit",
      "events",
      "edges",
      "chronologySource",
      "participants",
      "exhibits",
    ].map((key) => [key, r[key]]),
  );
  return {
    ...safe,
    traces: r.traces.map(({ value, observation: unused, ...t }) => ({
      ...t,
      observation: observation(t),
    })),
  };
}
