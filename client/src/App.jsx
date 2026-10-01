import {
  Fingerprint,
  FolderSearch,
  FlaskConical,
  Scale,
  CircuitBoard,
  GitBranch,
  ScanLine,
  FileText,
  Crosshair,
  Radio,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminDashboard from "./components/admin/AdminDashboard";
import RoundEditor from "./components/admin/RoundEditor";
import "./Archive.css";

async function api(path, body) {
  const res = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Не удалось выполнить запрос.");
  return data;
}
const stages = ["Доступ", "Снимок", "Исследование", "Вердикт"];
const labs = [
  ["circuit", "01", "Электрический порог"],
  ["timeline", "02", "Причина → следствие"],
  ["traces", "03", "Три независимых следа"],
];
function ArchiveSignal() {
  return (
    <div className="archive-signal" aria-hidden="true">
      <div className="signal-topline">
        <Radio size={16} /> NODE 04–271 <span>ARCHIVE LINK</span>
      </div>
      <svg viewBox="0 0 360 150" fill="none" className="signal-diagram">
        <defs>
          <pattern
            id="signal-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path d="M20 0H0V20" stroke="currentColor" strokeOpacity=".14" />
          </pattern>
        </defs>
        <path fill="url(#signal-grid)" d="M0 0H360V150H0Z" />
        <path
          d="M20 75H100L140 35H215L250 75H340M100 75L140 115H215L250 75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="100" cy="75" r="18" stroke="currentColor" />
        <circle cx="100" cy="75" r="6" fill="currentColor" />
        <path d="M166 51H194V99H166Z" stroke="currentColor" />
        <path d="M173 62H187M173 72H187M173 82H183" stroke="currentColor" />
        <circle cx="250" cy="75" r="18" stroke="currentColor" />
        <path d="M242 75L248 81L260 68" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 15V5H40M350 15V5H320M10 135V145H40M350 135V145H320"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <div className="signal-bottomline">
        <span>ИСТОЧНИК</span>
        <span>УЛИКА</span>
        <span>ВЕРДИКТ</span>
      </div>
    </div>
  );
}
const sectionIcons = { case: FolderSearch, lab: FlaskConical, verdict: Scale };
const labIcons = {
  circuit: CircuitBoard,
  timeline: GitBranch,
  traces: ScanLine,
};

export default function App() {
  const [gateway, setGateway] = useState(null),
    [record, setRecord] = useState(null);
  const [tab, setTab] = useState("case"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [key, setKey] = useState("");
  const [active, setActive] = useState("circuit"),
    [selected, setSelected] = useState([]),
    [order, setOrder] = useState([]),
    [readings, setReadings] = useState(["", "", ""]);
  const [currents, setCurrents] = useState({});
  const [suspect, setSuspect] = useState(""),
    [evidence, setEvidence] = useState([]),
    [exclusions, setExclusions] = useState({});
  const [admin, setAdmin] = useState(
    location.pathname === "/admin" || location.hash === "#admin",
  );
  async function refresh() {
    const g = await api("/api/archive/gateway");
    setGateway(g);
    if (["RECOVERED", "SOLVED"].includes(g.state)) {
      const r = await api("/api/archive/round");
      setRecord(r);
      setOrder((prev) =>
        prev.length ? prev : r.round.events.map((e) => e.id),
      );
    } else {
      setRecord(null);
      setOrder([]);
    }
  }
  useEffect(() => {
    queueMicrotask(() => refresh().catch((e) => setError(e.message)));
  }, []);
  useEffect(() => {
    const fn = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyA") {
        e.preventDefault();
        setAdmin(true);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  async function act(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const toggle = (list, id, setter) =>
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const r = record?.round,
    progress = record?.progress || [];
  const stage = record?.verdict
    ? 3
    : record
      ? 2
      : gateway?.state === "AUTHENTICATED"
        ? 1
        : 0;
  const move = (index, delta) => {
    const next = [...order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrder(next);
  };
  async function solve(id, answer) {
    await act(async () => {
      const result = await api("/api/archive/solve", { puzzleId: id, answer });
      setRecord({
        ...record,
        progress: result.progress,
        findings: result.findings,
      });
      setNotice(result.message);
    });
  }
  if (location.pathname === "/admin/round") return <RoundEditor />;
  if (admin)
    return (
      <>
        <div className="archive-admin-link">
          <a href="/admin/round">Новый архив → настройки и проверка раунда</a>
        </div>
        <AdminDashboard
          onClose={() => {
            setAdmin(false);
            history.replaceState(null, "", "/");
          }}
        />
      </>
    );
  return (
    <div className={`archive ${record ? "is-investigating" : "is-gateway"}`}>
      <header className="masthead">
        <a className="brand" href="/" aria-label="Shinri Trial — главная">
          <span className="brand-mark">
            S<span>◆</span>T
          </span>
          <span>
            SHINRI TRIAL<small>INVESTIGATION ARCHIVE / 04–271</small>
          </span>
        </a>
        <span className="connection">
          <i />
          {gateway ? "УЗЕЛ В СЕТИ" : "СОЕДИНЕНИЕ…"}
        </span>
      </header>
      <main>
        <div className="chapter-line">
          <span>NAGITO KOMAEDA / PRIVATE TERMINAL</span>
          <span>HOPE IS NOT A GUESS.</span>
        </div>
        <div className={record ? "workspace-opening" : "gateway-opening"}>
          <section className="hero">
            <div>
              <p className="eyebrow">
                {record
                  ? "Восстановленный архив"
                  : "Надежда требует доказательств"}
              </p>
              <h1>
                {record ? (
                  <>
                    ЦЕНА
                    <br />
                    <em>НАДЕЖДЫ.</em>
                  </>
                ) : (
                  <>
                    ДОВЕРЯЙ
                    <br />
                    <em>НЕ УДАЧЕ.</em>
                  </>
                )}
              </h1>
              <p className="hero-copy">
                «Моя удача может открыть дверь. Но только ваши доказательства
                превратят отчаяние в надежду».
              </p>
              <span className="signature">
                — Нагито Комаэда / куратор архива
              </span>
            </div>
            <div className="hero-stamp" aria-hidden="true">
              <span>TRUTH</span>
              <strong>希望</strong>
              <span>BEFORE HOPE</span>
              <div className="stamp-index">04 / 271</div>
              <span className="stamp-orbit" />
            </div>
          </section>
          <ol className="route">
            {stages.map((s, i) => (
              <li
                key={s}
                className={stage === i ? "current" : stage > i ? "done" : ""}
                aria-current={stage === i ? "step" : undefined}
              >
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{s}</span>
                {stage > i && <span aria-label="Завершено">✓</span>}
              </li>
            ))}
          </ol>
          <div className="feedback" aria-live="polite">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="notice">{notice}</p>}
          </div>
          {!gateway && (
            <section className="paper">
              <h2>Подключение к архиву</h2>
              <p>Ожидаем ответ терминала.</p>
              {error && (
                <button onClick={() => act(refresh)}>
                  Повторить соединение
                </button>
              )}
            </section>
          )}
          {gateway && !record && (
            <section className="entry-grid">
              <div className="paper intro">
                <p className="eyebrow">
                  {stage === 0
                    ? "01 / Закрытый терминал"
                    : "02 / Удалённая база"}
                </p>
                <h2>
                  {stage === 0
                    ? "Не каждый ключ — ответ."
                    : "Архив уничтожен. Снимок сохранился."}
                </h2>
                <p>
                  {stage === 0
                    ? "Войдите с кодом ведущего. Затем получите ключ аварийного снимка в Google Drive, восстановите улики и докажите свою версию."
                    : "Внешняя копия — единственный путь к уликам. Пароль из документа Google Drive восстанавливает доступ к делу, но не подсказывает убийцу."}
                </p>
                <div className="margin-note">
                  <b>ПРАВИЛО РАССЛЕДОВАНИЯ</b>
                  <p>
                    Совпадение — не доказательство. В финале придётся объяснить
                    и свою версию, и невозможность остальных.
                  </p>
                </div>
                <p className="small-note">
                  {gateway.mode === "archive"
                    ? "УЧЕБНЫЙ АРХИВ • не обвинение игроков текущего раунда"
                    : "ЖИВОЙ РАУНД • факты подтверждены ведущим"}
                </p>
              </div>
              <div className="terminal access-terminal">
                <ArchiveSignal />
                <p className="eyebrow">
                  ACCESS PROTOCOL / {stage === 0 ? "LOGIN" : "RECOVERY"}
                </p>
                {stage === 0 ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        await api("/api/auth/login", {
                          playerName: name,
                          code,
                        });
                        setCode("");
                        await refresh();
                      });
                    }}
                  >
                    <h2>Идентификация</h2>
                    <label>
                      Имя в текущей сессии
                      <input
                        autoComplete="nickname"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={50}
                      />
                    </label>
                    <label>
                      Код ведущего
                      <input
                        autoComplete="off"
                        type="password"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                      />
                    </label>
                    <button disabled={busy} type="submit">
                      {busy ? "Проверка…" : "Открыть терминал →"}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        await api("/api/archive/recover", { key });
                        setKey("");
                        await refresh();
                      });
                    }}
                  >
                    <h2>Восстановить снимок</h2>
                    <p>{gateway.driveInstructions}</p>
                    {gateway.driveUrl ? (
                      <a
                        className="drive-link"
                        href={gateway.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть Google Drive ↗
                      </a>
                    ) : (
                      <p className="setup-warning">
                        Ссылка Google Drive не настроена. Запросите папку у
                        ведущего; этот шаг пока нельзя проверить на реальном
                        Drive.
                      </p>
                    )}
                    <label>
                      Ключ из внешнего документа
                      <input
                        autoComplete="off"
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        required
                      />
                    </label>
                    <button disabled={busy} type="submit">
                      {busy ? "Восстановление…" : "Восстановить архив →"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}
        </div>
        {r && (
          <>
            <div className="case-bar">
              <div>
                <b>{r.title}</b>
                <small>
                  {r.mode === "archive"
                    ? "АРХИВНОЕ УЧЕБНОЕ ДЕЛО"
                    : "ФАКТЫ ТЕКУЩЕГО РАУНДА"}{" "}
                  / {r.id}
                </small>
              </div>
              <span className="status-chip">
                {record.verdict
                  ? "ДОКАЗАНО"
                  : `${progress.length} / 3 ЗАКЛЮЧЕНИЯ`}
              </span>
            </div>
            <nav className="tabs" aria-label="Разделы расследования">
              {[
                ["case", "Материалы дела"],
                ["lab", "Лаборатория"],
                ["verdict", "Классный суд"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() => {
                    setTab(id);
                    setError("");
                    setNotice("");
                  }}
                >
                  {React.createElement(sectionIcons[id], {
                    size: 19,
                    "aria-hidden": true,
                  })}
                  {label}
                </button>
              ))}
            </nav>
            {tab === "case" && (
              <section className="investigation-grid">
                <article className="paper dossier-panel">
                  <div className="dossier-heading">
                    <p className="eyebrow">CASE FILE / 01</p>
                    <Fingerprint size={30} aria-hidden="true" />
                  </div>
                  <div className="case-metrics">
                    <div>
                      <FileText size={18} aria-hidden="true" />
                      <strong>{(r.exhibits || []).length}</strong>
                      <span>материалы</span>
                    </div>
                    <div>
                      <Crosshair size={18} aria-hidden="true" />
                      <strong>{r.participants.length}</strong>
                      <span>профили</span>
                    </div>
                    <div>
                      <FlaskConical size={18} aria-hidden="true" />
                      <strong>{progress.length} / 3</strong>
                      <span>анализ</span>
                    </div>
                  </div>
                  <h2>За ловушкой — человек.</h2>
                  <p>{r.brief}</p>
                  <details>
                    <summary>
                      Условия, при которых возможен вывод о личности
                    </summary>
                    <p>{r.attribution}</p>
                  </details>
                  <div className="exhibits">
                    {(r.exhibits || []).map((d, i) => (
                      <details key={d.id}>
                        <summary>
                          <span className="exhibit-index" aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{d.title}</span>
                        </summary>
                        <p>{d.content}</p>
                        {d.image && <img src={d.image} alt={d.title} />}
                      </details>
                    ))}
                  </div>
                  <button onClick={() => setTab("lab")}>
                    Начать исследование →
                  </button>
                </article>
                <aside className="terminal field-notes">
                  <p className="eyebrow">FIELD NOTES / N.K.</p>
                  <h2>
                    Три проверки.
                    <br />
                    Ни одной догадки.
                  </h2>
                  <ol className="notebook">
                    <li>
                      Определите рабочие измерения цепи — без слепого перебора.
                    </li>
                    <li>Восстановите порядок по причинным зависимостям.</li>
                    <li>Прочитайте следы и исключите несовместимые профили.</li>
                  </ol>
                  <p className="nagito-note">
                    «Как соблазнительно сразу назвать имя… Но такая надежда
                    ничего не стоит».
                  </p>
                  <h3>Журнал заключений</h3>
                  {labs.map(([id, n, label]) => (
                    <p className="journal" key={id}>
                      <span>{progress.includes(id) ? "✓" : "○"}</span>
                      {n} / {label}
                    </p>
                  ))}
                </aside>
              </section>
            )}
            {tab === "lab" && (
              <section className="lab-grid">
                <aside className="lab-nav">
                  {labs.map(([id, n, label], i) => (
                    <button
                      key={id}
                      aria-current={active === id ? "step" : undefined}
                      disabled={i > progress.length}
                      onClick={() => {
                        setActive(id);
                        setError("");
                        setNotice("");
                      }}
                    >
                      <span>
                        {n} /{" "}
                        {progress.includes(id)
                          ? "ПОДТВЕРЖДЕНО ✓"
                          : i > progress.length
                            ? "ЗАКРЫТО"
                            : "АНАЛИЗ"}
                      </span>
                      <b>
                        {React.createElement(labIcons[id], {
                          size: 22,
                          "aria-hidden": true,
                        })}
                        {label}
                      </b>
                    </button>
                  ))}
                  <p>
                    Ответ проверяет сервер. Перезагрузка не выдаёт награду и не
                    меняет условия.
                  </p>
                </aside>
                <article className="paper lab-panel" key={active}>
                  <div className="lab-heading-mark" aria-hidden="true">
                    {React.createElement(labIcons[active], { size: 30 })}
                  </div>
                  <p className="eyebrow">
                    TRUTH LAB / {labs.find((x) => x[0] === active)?.[1]}
                  </p>
                  {active === "circuit" && (
                    <>
                      <h2>Не всякое напряжение — разряд.</h2>
                      <p>
                        Рассчитайте ток каждой строки и выберите <b>все</b>{" "}
                        измерения, способные запустить ловушку. Требования: цепь
                        замкнута, предохранитель цел, ток не менее{" "}
                        {r.circuit.threshold} А. Закон Ома: <b>I = U / R</b>.
                        При разрыве цепи или перегоревшем предохранителе ток
                        равен 0. Для дробных значений точность — 0,01 А.
                      </p>
                      <div className="measurements">
                        {r.circuit.rows.map((row) => (
                          <div
                            className={
                              "measurement-row " +
                              (selected.includes(row.id) ? "chosen" : "")
                            }
                            key={row.id}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={selected.includes(row.id)}
                                onChange={() =>
                                  toggle(selected, row.id, setSelected)
                                }
                              />
                              <b>{row.id}</b>
                              <span>
                                {row.voltage} В / {row.resistance} Ом
                                <small>
                                  {row.closed ? "Замкнута" : "Разомкнута"} ·{" "}
                                  {row.fuse
                                    ? "Предохранитель цел"
                                    : "Предохранитель перегорел"}
                                </small>
                              </span>
                            </label>
                            <label className="current-input">
                              Ток, А
                              <input
                                aria-label={`Ток строки ${row.id}, А`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={currents[row.id] ?? ""}
                                onChange={(e) =>
                                  setCurrents({
                                    ...currents,
                                    [row.id]: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                      <button
                        disabled={
                          busy ||
                          progress.includes(active) ||
                          !selected.length ||
                          r.circuit.rows.some(
                            (row) =>
                              currents[row.id] === undefined ||
                              currents[row.id] === "",
                          )
                        }
                        onClick={() => solve(active, { selected, currents })}
                      >
                        Проверить весь набор →
                      </button>
                    </>
                  )}
                  {active === "timeline" && (
                    <>
                      <h2>Следствие не бывает раньше причины.</h2>
                      <blockquote>{r.chronologySource}</blockquote>
                      <p>
                        Переставьте события кнопками. Требуется причинный
                        порядок, не угадывание времени. Все действия доступны
                        для сравнения одновременно.
                      </p>
                      <ol className="timeline">
                        {order.map((id, i) => (
                          <li key={id}>
                            <b>{i + 1}</b>
                            <span>
                              {r.events.find((e) => e.id === id)?.text}
                            </span>
                            <div>
                              <button
                                aria-label={`Выше: ${r.events.find((e) => e.id === id)?.text}`}
                                disabled={i === 0}
                                onClick={() => move(i, -1)}
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Ниже: ${r.events.find((e) => e.id === id)?.text}`}
                                disabled={i === order.length - 1}
                                onClick={() => move(i, 1)}
                              >
                                ↓
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <button
                        disabled={busy || progress.includes(active)}
                        onClick={() => solve(active, order)}
                      >
                        Проверить причинную цепь →
                      </button>
                    </>
                  )}
                  {active === "traces" && (
                    <>
                      <h2>Наблюдение. Поправка. Вывод.</h2>
                      <p>
                        Три источника независимы. Прочитайте измерения и
                        получите вывод из каждого; ни один след в одиночку не
                        указывает на человека.
                      </p>
                      <div className="trace-list">
                        {r.traces.map((t, i) => (
                          <section key={t.id}>
                            <h3>{t.title}</h3>
                            <p>{t.observation}</p>
                            <small>ИСТОЧНИК: {t.provenance}</small>
                            <label>
                              Ваш вывод
                              <select
                                value={readings[i]}
                                onChange={(e) =>
                                  setReadings(
                                    readings.map((v, j) =>
                                      j === i ? e.target.value : v,
                                    ),
                                  )
                                }
                              >
                                <option value="">Выберите вывод</option>
                                {t.options.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            </label>
                          </section>
                        ))}
                      </div>
                      <button
                        disabled={
                          busy ||
                          progress.includes(active) ||
                          readings.some((x) => !x)
                        }
                        onClick={() => solve(active, readings)}
                      >
                        Подтвердить три вывода →
                      </button>
                    </>
                  )}
                  {progress.includes(active) && (
                    <div className="solved-note">
                      <b>✓ Заключение подтверждено</b>
                      <p>
                        {record.findings?.[active] ||
                          "Сохранено на сервере для текущего раунда."}
                      </p>
                      <button
                        onClick={() => {
                          const next = labs[progress.length];
                          if (next) setActive(next[0]);
                          else setTab("verdict");
                        }}
                      >
                        {progress.length === 3
                          ? "Перейти к доказательству →"
                          : "Следующий анализ →"}
                      </button>
                    </div>
                  )}
                </article>
              </section>
            )}
            {tab === "verdict" && (
              <section className="paper verdict-panel">
                <p className="eyebrow">CLASS TRIAL / CLOSING ARGUMENT</p>
                <h2>
                  {record.verdict
                    ? "Надежда выдержала проверку."
                    : "Не назови. Докажи."}
                </h2>
                {record.verdict ? (
                  <>
                    <p className="winner">{record.verdict.name}</p>
                    <pre className="report">{record.verdict.report}</pre>
                    <button
                      onClick={() =>
                        act(async () => {
                          await navigator.clipboard.writeText(
                            record.verdict.report,
                          );
                          setNotice("Отчёт скопирован.");
                        })
                      }
                    >
                      Скопировать отчёт для RP
                    </button>
                    <p className="small-note">
                      Вердикт относится только к условиям и данным этого дела.
                    </p>
                  </>
                ) : progress.length < 3 ? (
                  <>
                    <p>
                      Суд ещё закрыт. Подтвердите все три анализа в лаборатории:
                      имя без цепочки доказательств не принимается.
                    </p>
                    <button onClick={() => setTab("lab")}>
                      Вернуться к уликам →
                    </button>
                  </>
                ) : (
                  <>
                    <div className="saved-findings">
                      <h3>Подтверждённые выводы</h3>
                      <p>{record.findings?.traces}</p>
                    </div>
                    <p>
                      Сопоставьте ваши выводы с ведомостью. Выбранный профиль
                      должен совпадать со всеми тремя следами. Для каждого
                      другого профиля укажите хотя бы одну несовместимую улику.
                    </p>
                    <details>
                      <summary>Условия атрибуции и пределы вывода</summary>
                      <p>{r.attribution}</p>
                    </details>
                    <div className="profiles">
                      {r.participants.map((p) => (
                        <article key={p.id}>
                          <h3>{p.name}</h3>
                          <small>{p.id} / ЛИЧНАЯ ВЕДОМОСТЬ</small>
                          <dl>
                            {r.traces.map((t) => (
                              <div key={t.id}>
                                <dt>{t.title}</dt>
                                <dd>{p.profile[t.key]}</dd>
                              </div>
                            ))}
                          </dl>
                        </article>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(async () => {
                          const data = await api("/api/archive/verdict", {
                            suspectId: suspect,
                            evidenceIds: evidence,
                            exclusions: Object.fromEntries(
                              Object.entries(exclusions).filter(
                                ([id]) => id !== suspect,
                              ),
                            ),
                          });
                          setRecord({ ...record, verdict: data.verdict });
                          setNotice("TRUTH BREAK — версия доказана.");
                        });
                      }}
                    >
                      <label>
                        Кто совместим со всей цепью?
                        <select
                          required
                          value={suspect}
                          onChange={(e) => setSuspect(e.target.value)}
                        >
                          <option value="">Выберите профиль</option>
                          {r.participants.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset>
                        <legend>
                          На каких независимых уликах основан вывод?
                        </legend>
                        {r.traces.map((t) => (
                          <label className="check-line" key={t.id}>
                            <input
                              type="checkbox"
                              checked={evidence.includes(t.id)}
                              onChange={() =>
                                toggle(evidence, t.id, setEvidence)
                              }
                            />
                            {t.title}
                          </label>
                        ))}
                      </fieldset>
                      {suspect &&
                        r.participants
                          .filter((p) => p.id !== suspect)
                          .map((p) => (
                            <label key={p.id}>
                              Почему исключён {p.name}?
                              <select
                                required
                                value={exclusions[p.id] || ""}
                                onChange={(e) =>
                                  setExclusions({
                                    ...exclusions,
                                    [p.id]: e.target.value,
                                  })
                                }
                              >
                                <option value="">
                                  Выберите противоречащий источник
                                </option>
                                {r.traces.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                      <button
                        type="submit"
                        disabled={busy || !suspect || evidence.length !== 3}
                      >
                        {busy
                          ? "Проверяем доказательство…"
                          : "Предъявить доказательство →"}
                      </button>
                    </form>
                  </>
                )}
              </section>
            )}
          </>
        )}
        <footer>
          <span>SHINRI TRIAL / UNOFFICIAL RP ARCHIVE</span>
          <span>ДОКАЗАТЕЛЬСТВО &gt; УДАЧА</span>
        </footer>
      </main>
    </div>
  );
}
