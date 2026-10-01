import express from "express";
import { getCase, addAudit } from "../storage.js";
import { getSession, updateSessionState } from "../utils/session.js";
import {
  fingerprint,
  validateRound,
  publicRound,
  checkPuzzle,
  checkVerdict,
  contenders,
  circuitAnswer,
  chronology,
  traceAnswer,
} from "./engine.js";
const router = express.Router();
const steps = ["circuit", "timeline", "traces"];
function findings(session, r) {
  const result = {};
  for (const id of session.archiveProgress || []) {
    if (id === "circuit")
      result[id] =
        `Рабочие измерения: ${circuitAnswer(r).join(", ")}. Нулевой ток при разрыве цепи или неисправном предохранителе.`;
    if (id === "timeline")
      result[id] = chronology(r)
        .map((id) => r.events.find((e) => e.id === id).text)
        .join(" → ");
    if (id === "traces")
      result[id] = r.traces
        .map((t, i) => `${t.title}: ${traceAnswer(r)[i]}`)
        .join("; ");
  }
  return result;
}
function context(req) {
  const data = getCase();
  const session = getSession(
    req.cookies?.shinri_session || req.headers["x-session-id"],
  );
  const version = fingerprint(data);
  if (session) {
    if (session.archiveVersion && session.archiveVersion !== version) {
      session.state = "NEW";
      session.archiveProgress = [];
      session.archiveVerdict = null;
    }
    session.archiveVersion = version;
  }
  return { data, session };
}
router.get("/gateway", (req, res) => {
  const { data, session } = context(req);
  const r = data.archiveRound;
  res.json({
    state: session?.state || "NEW",
    driveUrl: r?.driveUrl || "",
    driveInstructions:
      r?.driveInstructions || "Ведущий ещё не подключил Google Drive.",
    mode: r?.mode || "archive",
  });
});
router.post("/recover", (req, res) => {
  const { data, session } = context(req);
  if (!session || session.state !== "AUTHENTICATED")
    return res.status(403).json({ error: "Сначала войдите в терминал." });
  if (!attempt(session, res)) return;
  if (
    typeof req.body.key !== "string" ||
    req.body.key.trim().toUpperCase() !==
      String(data.recoveryKey).trim().toUpperCase()
  )
    return res
      .status(400)
      .json({
        error:
          "Ключ не совпал. Проверьте документ аварийного снимка в Google Drive.",
      });
  try {
    validateRound(data.archiveRound);
  } catch (e) {
    return res.status(503).json({ error: `Раунд не готов: ${e.message}` });
  }
  updateSessionState(session.sessionId, "RECOVERED");
  session.archiveProgress = [];
  res.json({ success: true });
});
function attempt(s, res) {
  const now = Date.now();
  if (s.archiveAttemptAt && now - s.archiveAttemptAt < 1200) {
    res
      .set("Retry-After", "2")
      .status(429)
      .json({
        error: "Не спешите: сопоставьте условия и повторите через 2 секунды.",
      });
    return false;
  }
  const window = s.archiveAttempts || { at: now, count: 0 };
  if (now - window.at > 60000) {
    window.at = now;
    window.count = 0;
  }
  if (window.count >= 12) {
    res
      .set("Retry-After", "60")
      .status(429)
      .json({
        error:
          "Слишком много проверок. Вернитесь к источникам; следующая попытка через минуту.",
      });
    return false;
  }
  window.count++;
  s.archiveAttempts = window;
  s.archiveAttemptAt = now;
  return true;
}
router.use((req, res, next) => {
  const ctx = context(req);
  if (!ctx.session || !["RECOVERED", "SOLVED"].includes(ctx.session.state))
    return res
      .status(403)
      .json({ error: "Архив закрыт. Войдите и восстановите снимок." });
  try {
    validateRound(ctx.data.archiveRound);
  } catch (e) {
    return res.status(503).json({ error: `Раунд не готов: ${e.message}` });
  }
  req.archive = ctx;
  next();
});
router.get("/round", (req, res) => {
  const { data, session } = req.archive;
  res.json({
    round: publicRound(data.archiveRound),
    progress: session.archiveProgress || [],
    findings: findings(session, data.archiveRound),
    verdict: session.archiveVerdict || null,
  });
});
router.post("/solve", (req, res) => {
  const { data, session } = req.archive;
  const { puzzleId, answer } = req.body;
  const progress = session.archiveProgress || [];
  if (!steps.includes(puzzleId))
    return res.status(400).json({ error: "Неизвестное задание." });
  if (progress.includes(puzzleId))
    return res.json({
      success: true,
      progress,
      findings: findings(session, data.archiveRound),
      message: "Заключение уже сохранено.",
    });
  if (puzzleId !== steps[progress.length])
    return res
      .status(409)
      .json({ error: "Сначала завершите предыдущий анализ." });
  if (!attempt(session, res)) return;
  if (!checkPuzzle(data.archiveRound, puzzleId, answer))
    return res.status(422).json({
      error: {
        circuit:
          "Набор не подтверждён. Для каждой строки одновременно проверьте замкнутость, целый предохранитель и I = U / R. Выберите все подходящие строки и подтвердите расчёт тока каждой строки; при разрыве ток равен нулю.",
        timeline:
          "Причинная цепь нарушена. Для каждого события найдите условие, которое должно произойти раньше; ориентируйтесь на протокол, а не на порядок карточек.",
        traces:
          "Сопоставление не подтверждено. Проверьте единицы измерения, знак поправки часов и границы интервала. Все три вывода должны следовать из источников.",
      }[puzzleId],
    });
  progress.push(puzzleId);
  session.archiveProgress = progress;
  res.json({
    success: true,
    progress,
    findings: findings(session, data.archiveRound),
    message: "TRUTH BREAK — анализ подтверждён. Заключение добавлено в журнал.",
  });
});
router.post("/verdict", (req, res) => {
  const { data, session } = req.archive;
  if (steps.some((id) => !session.archiveProgress?.includes(id)))
    return res
      .status(409)
      .json({
        error: "Нужны три подтверждённых заключения, а не догадка об имени.",
      });
  if (!attempt(session, res)) return;
  if (!checkVerdict(data.archiveRound, req.body))
    return res
      .status(422)
      .json({
        error:
          "Версия не доказана. Нужны совместимость с тремя уликами и конкретное противоречие для каждого другого профиля. Совпадение только с уборкой не доказывает убийство.",
      });
  const r = data.archiveRound,
    winner = contenders(r)[0];
  const report = `SHINRI TRIAL // ${r.title}\n${r.mode === "archive" ? "Учебная реконструкция архивного дела" : "Раунд: " + r.id}\nВывод: ${winner.name} [${winner.id}]\n${r.traces.map((t) => `${t.title}: ${t.value}. Источник: ${t.provenance}`).join("\n")}\nИсключены: ${Object.entries(
    req.body.exclusions,
  )
    .map(([id, tid]) => `${id} — ${r.traces.find((t) => t.id === tid).title}`)
    .join("; ")}\nУсловия вывода: ${r.attribution}`;
  session.archiveVerdict = {
    name: winner.name,
    report,
    solvedAt: new Date().toISOString(),
  };
  updateSessionState(session.sessionId, "SOLVED");
  addAudit(session.ip, "ARCHIVE_SOLVED", r.id, session.playerName);
  res.json({ success: true, verdict: session.archiveVerdict });
});
export default router;
