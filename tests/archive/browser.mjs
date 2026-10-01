import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = path.join(ROOT, "test-results", "archive");
fs.mkdirSync(OUT, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "shinri-ui-"));
fs.copyFileSync(
  path.join(ROOT, "server/data/case.json"),
  path.join(temp, "case.json"),
);
const server = spawn(process.execPath, ["server/server.js"], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: "3221",
    SHINRI_DATA_DIR: temp,
    ADMIN_PASSWORD: "preview-only",
  },
  stdio: "ignore",
});
server.unref();
process.on("exit", () => {
  server.kill();
  fs.rmSync(temp, { recursive: true, force: true });
});
for (let i = 0; i < 80; i++) {
  try {
    await fetch("http://127.0.0.1:3221/api/archive/gateway");
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}
const browser = await chromium.launch({
  executablePath: [
    process.env.CHROMIUM_PATH,
    "/usr/local/bin/chromium",
    "/usr/bin/chromium",
  ].find((p) => p && fs.existsSync(p)),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function capture(name) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(80);
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw new Error(`Horizontal overflow ${name}`);
    fs.writeFileSync(
      path.join(OUT, `${name}.html`),
      await page.evaluate(() => {
        const el = document.querySelector(".archive").cloneNode(true);
        const styles = [...document.styleSheets]
          .flatMap((s) => {
            try {
              return [...s.cssRules].map((r) => r.cssText);
            } catch {
              return [];
            }
          })
          .join("\n");
        return `<html><head><meta charset="utf-8"><style>${styles}</style></head><body style="margin:0">${el.outerHTML}</body></html>`;
      }),
    );
  }
  const wait = () => page.waitForTimeout(1300);
  await page.goto("http://127.0.0.1:3221");
  await page.getByLabel("Имя в текущей сессии").waitFor();
  await capture("shinri-entry-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-entry-mobile");
  for (const width of [320, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(`shinri-entry-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  const config = JSON.parse(
    fs.readFileSync(path.join(ROOT, "server/data/case.json")),
  );
  const r = config.archiveRound;
  await page.getByLabel("Имя в текущей сессии").fill("Нагито / UI test");
  await page.getByLabel("Код ведущего").fill(config.accessCode);
  await page.getByRole("button", { name: "Открыть терминал" }).click();
  await page.getByLabel("Ключ из внешнего документа").waitFor();
  await capture("shinri-recovery");
  await page.getByLabel("Ключ из внешнего документа").fill(config.recoveryKey);
  await page.getByRole("button", { name: "Восстановить архив" }).click();
  await page.getByRole("button", { name: "Начать исследование" }).waitFor();
  await capture("shinri-case");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-case-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  for (const summary of await page.locator(".exhibits summary").all())
    await summary.click();
  await capture("shinri-case-expanded");
  for (const summary of await page.locator(".exhibits summary").all())
    await summary.click();
  await page.getByRole("button", { name: "Начать исследование" }).click();
  await page.getByLabel("Ток строки A, А").fill("3");
  await page.getByLabel("Ток строки B, А").fill("0");
  await page.getByLabel("Ток строки C, А").fill("1.5");
  await page.getByLabel("Ток строки D, А").fill("3");
  await page.getByLabel("Ток строки E, А").fill("0");
  await page.locator(".measurements input[type=checkbox]").nth(0).check();
  await wait();
  await page.getByRole("button", { name: "Проверить весь набор" }).click();
  await page.getByRole("alert").waitFor();
  await capture("shinri-circuit-error");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-circuit-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await wait();
  await page.locator(".measurements input[type=checkbox]").nth(3).check();
  await page.getByRole("button", { name: "Проверить весь набор" }).click();
  await page.getByText("✓ Заключение подтверждено").waitFor();
  await capture("shinri-circuit-success");
  await page.getByRole("button", { name: "Следующий анализ" }).click();
  const target = ["shock", "bind", "wake", "trap", "clean"];
  for (let i = 0; i < target.length; i++) {
    let idx = await page.locator(".timeline li > span").allTextContents();
    let current = idx.indexOf(r.events.find((x) => x.id === target[i]).text);
    while (current > i) {
      await page
        .getByRole("button", {
          name: `Выше: ${r.events.find((x) => x.id === target[i]).text}`,
          exact: true,
        })
        .click();
      current--;
    }
  }
  await capture("shinri-timeline");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-timeline-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await wait();
  await page.getByRole("button", { name: "Проверить причинную цепь" }).click();
  await page.getByText("✓ Заключение подтверждено").waitFor();
  await page.getByRole("button", { name: "Следующий анализ" }).click();
  for (let i = 0; i < 3; i++)
    await page
      .locator(".trace-list select")
      .nth(i)
      .selectOption(r.traces[i].value);
  await capture("shinri-traces");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-traces-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await wait();
  await page.getByRole("button", { name: "Подтвердить три вывода" }).click();
  await page.getByText("✓ Заключение подтверждено").waitFor();
  await page.getByRole("button", { name: "Перейти к доказательству" }).click();
  await capture("shinri-verdict");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-verdict-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByLabel("Кто совместим со всей цепью?").selectOption("P3");
  for (const box of await page.locator("fieldset input").all())
    await box.check();
  for (const [id, t] of [
    ["P1", "T2"],
    ["P2", "T1"],
    ["P4", "T3"],
  ])
    await page
      .getByLabel(
        `Почему исключён ${r.participants.find((x) => x.id === id).name}?`,
      )
      .selectOption(t);
  await wait();
  await capture("shinri-verdict-filled");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("shinri-verdict-filled-mobile");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: "Предъявить доказательство" }).click();
  await page
    .getByRole("heading", { name: "Надежда выдержала проверку." })
    .waitFor();
  await capture("shinri-solved");
  await page.reload();
  await page.getByRole("button", { name: "Классный суд" }).click();
  await page
    .getByRole("heading", { name: "Надежда выдержала проверку." })
    .waitFor();
  await page.goto("http://127.0.0.1:3221/admin/round");
  await page.getByLabel("Пароль ведущего").fill("preview-only");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page
    .getByRole("button", { name: "Проверить и опубликовать" })
    .waitFor();
  await capture("shinri-admin");
  const original = await page.locator("textarea").inputValue();
  await page.locator("textarea").fill("{bad-json");
  await page.getByRole("button", { name: "Проверить и опубликовать" }).click();
  await page.waitForTimeout(100);
  await capture("shinri-admin-error");
  await page.locator("textarea").fill(original);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "UI path PASS: entry → recovery → circuit/error → chronology → traces → reasoned verdict → reload; no JS errors or horizontal overflow",
  );
} finally {
  await browser.close();
  server.kill();
}
