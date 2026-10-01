import React, { useState } from "react";
export default function RoundEditor() {
  const [isError, setIsError] = useState(false);
  const [password, setPassword] = useState(""),
    [token, setToken] = useState(""),
    [text, setText] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function request(path, method, body, auth = token) {
    const res = await fetch("/api/admin" + path, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-token": auth },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
    return data;
  }
  async function act(fn) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      await fn();
    } catch (e) {
      setIsError(true);
      setMessage(
        e instanceof SyntaxError
          ? "JSON не читается: проверьте кавычки, запятые и структуру. " +
              e.message
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="archive">
      <main className="round-editor">
        <a href="/admin">← Панель ведущего</a>
        <h1 style={{ fontSize: 44, marginTop: 24 }}>Конструктор раунда</h1>
        <p>
          Движок один, состав и источники разные. Проверка запрещает
          неоднозначный вердикт, циклы в хронологии и готовую личность по одной
          улике. Меняйте ID раунда при публикации; сохранение сбрасывает старый
          прогресс через отпечаток конфигурации.
        </p>
        <p>
          Для живого раунда заполните реальные наблюдения и личные ведомости,
          подтвердите условия атрибуции, установите mode: "live", confirmed:
          true. Нельзя просто переименовать учебные профили в игроков: это
          создаст ложные обвинения.
        </p>
        <div
          role={isError ? "alert" : "status"}
          className={isError ? "error" : "notice"}
        >
          {message ||
            "Частная настройка ведущего. Секреты не передаются игрокам."}
        </div>
        {!token ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const d = await request("/login", "POST", { password }, "");
                const r = await request(
                  "/archive-round",
                  "GET",
                  undefined,
                  d.token,
                );
                setToken(d.token);
                setPassword("");
                setText(JSON.stringify(r.round, null, 2));
              });
            }}
          >
            <label>
              Пароль ведущего
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button disabled={busy}>Войти</button>
          </form>
        ) : (
          <>
            <label>
              Конфигурация раунда (JSON)
              <textarea
                spellCheck="false"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <p>
              driveUrl — HTTPS-ссылка на Google Drive. Ключ recoveryKey задаётся
              в параметрах дела и размещается только во внешнем документе.
              Значения traces[].value скрыты от игрока; Измерения measurement
              должны однозначно давать эти значения; текст условий генерируется
              автоматически.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await request("/archive-round", "PUT", JSON.parse(text));
                  setMessage(
                    "Раунд проверен и опубликован. Улики выделяют ровно один профиль; хронология однозначна.",
                  );
                })
              }
            >
              Проверить и опубликовать
            </button>{" "}
            <button
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await request("/logout", "POST", {});
                  setToken("");
                  setText("");
                  setMessage("Вы вышли из панели.");
                })
              }
            >
              Выйти
            </button>
          </>
        )}
      </main>
    </div>
  );
}
