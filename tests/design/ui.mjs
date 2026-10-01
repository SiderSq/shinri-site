// UI-only fixture checks. They deliberately do not claim the legacy API works with archiveRound.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(ROOT, 'test-results/design'); fs.mkdirSync(OUT, { recursive: true });
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/case.json')));
const server = spawn('npm', ['run', 'dev', '--prefix', 'client', '--', '--host', '127.0.0.1', '--port', '3232', '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
let browser;
try {
  browser = await chromium.launch({ executablePath: [process.env.CHROMIUM_PATH, '/usr/local/bin/chromium', '/usr/bin/chromium'].find(p => p && fs.existsSync(p)), args: ['--no-sandbox'], headless: true });
  for (let i = 0; i < 80; i++) { try { if ((await fetch('http://127.0.0.1:3232')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const Audio = window.AudioContext;
    const sources = []; window.__testAudioSources = sources;
    if (Audio) window.AudioContext = class extends Audio {
      createOscillator() { const source = super.createOscillator(); const item = { stopped: false }; sources.push(item); const stop = source.stop.bind(source); source.stop = (...args) => { if (!args.length) item.stopped = true; return stop(...args); }; return source; }
      createBufferSource() { const source = super.createBufferSource(); const item = { stopped: false }; sources.push(item); const stop = source.stop.bind(source); source.stop = (...args) => { if (!args.length) item.stopped = true; return stop(...args); }; return source; }
    };
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let state = 'NEW';
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname.endsWith('/status')) body = { sessionState: state, ip: '127.0.0.1' };
    else if (url.pathname.endsWith('/data')) body = { success: true, data: { ...config, isSolved: false, documents: config.documents || [], suspects: config.suspects || [], media: config.media || [] } };
    else if (url.pathname.endsWith('/login')) body = { success: true, sessionId: 'ui-fixture' };
    else if (url.pathname.endsWith('/solve-minigame')) body = { success: true, letter: '?' };
    else if (url.pathname.endsWith('/round-time')) body = { roundActive: false };
    await route.fulfill({ json: body });
  });
  async function capture(name, width = 390) {
    await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.waitForTimeout(180);
    const overflow = await page.evaluate(() => {
      const bad = [...document.querySelectorAll('main *, header *')].filter(el => {
        const rect = el.getBoundingClientRect(); const style = getComputedStyle(el);
        return rect.width && rect.height && style.position !== 'absolute' && style.position !== 'fixed' && !el.classList.contains('sr-only') && (rect.right > innerWidth + 2 || rect.left < -2);
      }).map(el => `${el.tagName}.${el.className}`);
      return { page: document.documentElement.scrollWidth > innerWidth + 1, elements: bad.slice(0, 8) };
    });
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    assert.equal(overflow.page, false, `Page overflow: ${name} ${JSON.stringify(overflow)}`);
    assert.deepEqual(overflow.elements, [], `Element overflow: ${name}`);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  }
  await page.goto('http://127.0.0.1:3232');
  await page.getByLabel('Код доступа', { exact: true }).waitFor();
  for (const width of [320, 390, 768, 1440]) await capture(`entry-${width}`, width);
  await page.getByRole('button', { name: 'Указать имя участника' }).click();
  await page.getByLabel('Имя персонажа или игровой никнейм').fill('Участник проверки');
  await capture('name-dialog', 390);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(), 0);
  await page.getByLabel('Громкость').fill('35');
  await page.reload(); assert.equal(await page.getByLabel('Громкость').inputValue(), '35');
  state = 'RECOVERED'; await page.reload();
  await page.getByRole('button', { name: 'Меню', exact: false }).click();
  await capture('navigation', 390);
  await page.getByRole('button', { name: /Лаборатория/ }).click();
  const games = ['ЭЛЕКТРОЦЕПЬ', 'УФ-СКАНИРОВАНИЕ', 'ТАЙМЛАЙН', 'КАПКАН', 'ВЕРСТАК'];
  for (let i = 0; i < games.length; i++) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Анализ улики', { exact: true }).selectOption(['circuit','uv','timeline','trap','workbench'][i]);
    await capture(`game-${i + 1}-390`, 390); await capture(`game-${i + 1}-1440`, 1440); await capture(`game-${i + 1}-320`, 320);
    if (i === 0) {
      const node = page.getByRole('button', { name: /АККУМУЛЯТОР 12V, угол/ }); await node.focus(); await page.keyboard.press('Enter');
      assert.match(await node.getAttribute('aria-label'), /180/);
      await page.getByRole('button', { name: /ПРОВЕРИТЬ|ЗАПУСТИТЬ|ИМПУЛЬС/, exact: false }).last().click();
      await capture('circuit-feedback', 390);
    }
    if (i === 1) {
      await page.getByRole('button', { name: 'УФ-лампа', exact: true }).click();
      await page.getByRole('button', { name: /^СЕКТОР #01/ }).click();
      await capture('uv-active-390', 390);
    }
    if (i === 2) {
      assert.equal(await page.locator('.timeline-item').count(), 6);
      assert.equal(await page.locator('.timeline-item button').first().evaluate(el => el.getBoundingClientRect().width >= 44), true);
      assert.equal(await page.getByText('✓ ВЕРНО', { exact: true }).count(), 0);
      const move = page.getByRole('button', { name: /^Ниже:/ }).first(); const name = await move.getAttribute('aria-label');
      await move.focus(); await page.keyboard.press('Enter'); assert.equal(await page.getByRole('button', { name, exact: true }).evaluate(el => el === document.activeElement), true);
      assert.match(await page.locator('.sr-only[role=status]').textContent(), /позицию 2/);
    }
    if (i === 4) {
      await page.getByRole('button', { name: /Монтажные кусачки/ }).click();
      await page.getByRole('slider', { name: 'Наложение эталона', exact: true }).fill('50');
      await page.getByRole('spinbutton', { name: 'Угол среза', exact: true }).fill('45');
      assert.equal(await page.getByRole('slider', { name: 'Угол среза', exact: true }).inputValue(), '45');
      await capture('microscope-overlay', 390);
    }
  }
  await page.getByRole('button', { name: 'МЕНЮ', exact: true }).click();
  await page.getByRole('button', { name: /Обзор дела/ }).click();
  await capture('overview-390', 390); await capture('overview-1440', 1440);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'МЕНЮ', exact: true }).click();
  await page.getByRole('button', { name: /Фотоархив/ }).click();
  await capture('media-390', 390);
  await page.getByRole('button', { name: /^Открыть снимок:/ }).first().focus(); await page.keyboard.press('Enter');
  await capture('media-dialog-390', 390); await page.keyboard.press('Escape');
  assert.equal(await page.locator('.photo-dialog').count(), 0);
  await page.getByRole('button', { name: 'МЕНЮ', exact: true }).click();
  await page.getByRole('button', { name: /Реконструкция имени/ }).click();
  await capture('reconstruction-390', 390);
  await page.getByRole('button', { name: 'Выбрать букву А', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Ячейка 1: А. Очистить', exact: true }).waitFor();
  await page.getByRole('button', { name: 'МЕНЮ', exact: true }).click();
  await page.getByRole('button', { name: /Документы/ }).click();
  await capture('documents-390', 390); await capture('documents-1440', 1440);
  // Text enlargement via browser-equivalent root font size; components must reflow.
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' }); await capture('documents-text-200', 390);
  // Actual Web Audio offline render: audible, finite, bounded peaks for every palette entry.
  const audio = await page.evaluate(async () => {
    const { SOUND_NAMES, renderSound, SoundFX, createSoundBus } = await import('/src/components/SoundFX.js');
    const results = [];
    for (const name of SOUND_NAMES) {
      const offline = new OfflineAudioContext(1, 44100 * 2, 44100);
      renderSound(offline, createSoundBus(offline).input, name);
      const data = (await offline.startRendering()).getChannelData(0);
      let peak = 0, energy = 0;
      for (const value of data) { if (!Number.isFinite(value)) throw new Error(`Nonfinite ${name}`); peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      if (peak < .001 || peak > .4) throw new Error(`Unexpected peak ${name}: ${peak}`);
      results.push({ name, peak, rms: Math.sqrt(energy / data.length) });
    }
    SoundFX.stopMonokumaAlarm();
    const before = window.__testAudioSources.length;
    SoundFX.playMonokumaAlarm();
    const afterAlarm = window.__testAudioSources.length;
    if (afterAlarm - before !== 8) throw new Error('Alarm must schedule exactly one brief chime');
    SoundFX.setEnabled(false);
    if (!window.__testAudioSources.slice(before).every(s => s.stopped)) throw new Error('Mute failed to stop scheduled voices');
    SoundFX.playTruthBreak();
    if (window.__testAudioSources.length !== afterAlarm) throw new Error('Muted effect scheduled audio');
    SoundFX.setEnabled(true);
    await new Promise(r => setTimeout(r, 100));
    const beforeClicks = window.__testAudioSources.length;
    for (let i = 0; i < 40; i++) SoundFX.playClick();
    if (window.__testAudioSources.length - beforeClicks > 1) throw new Error('Click cooldown failed');
    SoundFX.setEnabled(false); SoundFX.setVolume(2);
    if (SoundFX.getVolume() !== 1) throw new Error('volume clamp');
    SoundFX.setVolume(.35); SoundFX.setEnabled(true);
    return results;
  });
  fs.writeFileSync(path.join(OUT, 'audio-metrics.json'), JSON.stringify(audio, null, 2));
  const preview = await page.evaluate(async () => {
    const { renderSound, createSoundBus } = await import('/src/components/SoundFX.js');
    const offline = new OfflineAudioContext(1, 44100 * 10, 44100);
    const bus = createSoundBus(offline);
    [['navigate', 0.2], ['rotate', 1], ['scan', 1.7], ['granted', 2.5], ['denied', 3.5], ['truth', 4.5], ['alarm', 7]].forEach(([name, start]) => renderSound(offline, bus.input, name, 0, start));
    const pcm = (await offline.startRendering()).getChannelData(0);
    const bytes = new Uint8Array(44 + pcm.length * 2); const view = new DataView(bytes.buffer);
    const text = (offset, s) => [...s].forEach((c, i) => bytes[offset + i] = c.charCodeAt(0));
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 44100, true); view.setUint32(28, 88200, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  });
  fs.writeFileSync(path.join(OUT, 'shinri-audio-preview.wav'), Buffer.from(preview, 'base64'));

  assert.deepEqual(errors, []);
  console.log('PASS: entry 320/390/768/1440; modal; persisted volume; five games; keyboard; precision/overlay; documents 200%; 15 offline audio renders. UI uses fixtures, not the live archive API.');
} finally { await browser?.close(); try { process.kill(-server.pid, 'SIGTERM'); } catch {} }
