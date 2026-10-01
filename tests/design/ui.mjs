// Actual built React + isolated Express. No mocked game rewards or completion flags.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeChallenge } from '../../server/lab/engine.js';
import { validProof } from '../lab/helpers.mjs';
const ROOT=fileURLToPath(new URL('../..',import.meta.url)), BASE='http://127.0.0.1:3243', OUT=path.join(ROOT,'test-results/design-v2');fs.mkdirSync(OUT,{recursive:true});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shinri-lab-ui-'));
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'server/data/case.json')));delete config.archiveRound;config.accessCode='ui-test-code';config.recoveryKey='UI-QA';fs.writeFileSync(path.join(dir,'case.json'),JSON.stringify(config));
const server=spawn(process.execPath,['server/server.js'],{cwd:ROOT,env:{...process.env,PORT:'3243',SHINRI_DATA_DIR:dir,ADMIN_PASSWORD:'ui-only'},stdio:'ignore'});
const vite=spawn('npm',['run','dev','--prefix','client','--','--host','127.0.0.1','--port','3244','--strictPort'],{cwd:ROOT,stdio:'ignore',detached:true});
let browser;
try {
  for(let i=0;i<80;i++) {try {await fetch(BASE+'/api/investigation/status');await fetch('http://127.0.0.1:3244');break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:[process.env.CHROMIUM_PATH,'/usr/local/bin/chromium','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p)),args:['--no-sandbox'],headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const Native=window.AudioContext;window.__audioCalls=[];if(Native) window.AudioContext=class extends Native {createOscillator(){const s=super.createOscillator(),record={stop:false};window.__audioCalls.push(record);const stop=s.stop.bind(s);s.stop=(...args)=>{if(!args.length) record.stop=true;return stop(...args);};return s;}createBufferSource(){const s=super.createBufferSource(),record={stop:false};window.__audioCalls.push(record);const stop=s.stop.bind(s);s.stop=(...args)=>{if(!args.length) record.stop=true;return stop(...args);};return s;}};});
  async function capture(name,width=390) {
    await page.setViewportSize({width,height:width>1000?1000:844});await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.waitForTimeout(100);
    const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,elements:[...document.querySelectorAll('.lab-v2 *,.audio-preview-page *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width&&r.height&&!el.classList.contains('sr-only')&&s.position!=='absolute'&&r.right>innerWidth+2;}).map(el=>el.tagName+'.'+el.className).slice(0,8)}));
    await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});assert.equal(overflow.page,false,`${name}: ${JSON.stringify(overflow)}`);assert.deepEqual(overflow.elements,[],`${name}: ${JSON.stringify(overflow)}`);
  }
  await page.goto(BASE);await page.getByRole('textbox',{name:'Имя участника',exact:true}).waitFor();await capture('entry',390);
  const login=await context.request.post(BASE+'/api/auth/login',{data:{code:config.accessCode,playerName:'UI test'}});assert.equal(login.status(),200);
  await context.request.post(BASE+'/api/investigation/recover',{data:{key:config.recoveryKey}});await page.reload();
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Лаборатория/}).click();await page.getByRole('heading',{name:'Лаборатория следствия'}).waitFor();
  let data=await (await context.request.get(BASE+'/api/investigation/lab/workstation')).json();
  async function selectGame(id) {await page.setViewportSize({width:390,height:844});await page.getByLabel('Прибор',{exact:true}).selectOption(id);}
  for(const id of ['circuit','uv','timeline','trap','workbench']) {
    for(let stage=0;stage<3;stage++) {
      await selectGame(id);
      await capture(`${id}-${stage+1}-390`,390);await capture(`${id}-${stage+1}-1440`,1440);await capture(`${id}-${stage+1}-320`,320);
      const ch=data.games.find(g=>g.gameId===id),proof=validProof(ch);
      if(id==='circuit'&&stage===0) {
        const node=page.getByRole('button',{name:/Узел 2, угол/});await node.focus();const previous=await node.getAttribute('aria-label');await page.keyboard.press('Enter');assert.notEqual(await node.getAttribute('aria-label'),previous);
        for(let i=0;i<ch.tiles.length;i++) if(!ch.tiles[i].fixed) {const label=new RegExp(`Узел ${i+1}, угол`);const button=page.getByRole('button',{name:label});while(!(await button.getAttribute('aria-label')).includes('угол 0°')) await button.click();}
        await page.getByRole('spinbutton',{name:'Напряжение источника',exact:true}).fill(String(proof.voltage));
        await page.getByRole('button',{name:'Проверить заключение',exact:true}).click();await page.getByText('Этап 2 из 3',{exact:true}).waitFor();
        data=await (await context.request.get(BASE+'/api/investigation/lab/workstation')).json();continue;
      }
      if(id==='uv'&&stage===0) {
        await page.getByRole('button',{name:'Нанести реагент',exact:true}).click();await page.getByRole('button',{name:'Включить УФ-лампу',exact:true}).click();await page.getByRole('button',{name:'Сканировать образец',exact:true}).click();await page.waitForTimeout(650);await capture('uv-measured',390);
      }
      if(id==='timeline'&&stage===0) {
        const button=page.getByRole('button',{name:/^Ниже:/}).first(),name=await button.getAttribute('aria-label');await button.focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('button',{name,exact:true}).evaluate(el=>el===document.activeElement),true);
      }
      if(id==='trap'&&stage===1) {
        assert.equal(await page.getByRole('button',{name:'Извлечь штифт',exact:true}).isDisabled(),true);
        await page.getByRole('spinbutton',{name:'Разгрузка пружины',exact:true}).fill('75');await page.getByRole('button',{name:'Извлечь штифт',exact:true}).click();await page.getByRole('spinbutton',{name:'Раскрытие механизма',exact:true}).fill('30');await capture('trap-opening',390);
      }
      if(id==='workbench'&&stage===2) {
        await page.getByRole('button',{name:ch.samples.find(s=>s.id===proof.sampleId).label,exact:true}).click();
        await page.getByRole('spinbutton',{name:'Совмещение угла',exact:true}).fill(String(proof.rotation));await page.getByRole('spinbutton',{name:'Смещение образца',exact:true}).fill(String(proof.offset));await page.getByRole('spinbutton',{name:'Фокус',exact:true}).fill('100');await page.getByLabel('Наложить эталон').check();
        await page.getByRole('button',{name:'Сравнить участок A',exact:true}).click();await page.getByRole('button',{name:/Участок B/}).click();await page.getByRole('button',{name:'Сравнить участок B',exact:true}).click();await capture('microscope-compared',390);
      }
      await page.waitForTimeout(820);
      const response=await context.request.post(BASE+'/api/investigation/lab/submit-analysis',{data:{gameId:id,stage,version:data.version,proof}});assert.equal(response.status(),200,`${id}/${stage}`);data=await response.json();await page.reload();await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Лаборатория/}).click();await page.getByLabel('Прибор',{exact:true}).count();
    }
    await selectGame(id);await page.getByRole('heading',{name:'Заключение подтверждено',exact:true}).waitFor();await capture(`${id}-certificate`,390);
  }
  await capture('all-conclusions',1440);
  // Deliberately inject no lab success: verify actual server-backed reload and failure feedback in a fresh session.
  const second=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),failure=await second.newPage();
  await second.request.post(BASE+'/api/auth/login',{data:{code:config.accessCode,playerName:'Failure test'}});await second.request.post(BASE+'/api/investigation/recover',{data:{key:config.recoveryKey}});await failure.goto(BASE);await failure.getByRole('button',{name:'МЕНЮ',exact:true}).click();await failure.getByRole('button',{name:/Лаборатория/}).click();await failure.getByRole('button',{name:'Проверить заключение',exact:true}).click();await failure.getByRole('alert').waitFor();await failure.screenshot({path:path.join(OUT,'circuit-failure.png'),fullPage:true});await second.close();
  await page.goto(BASE+'/audio-preview');await capture('audio-ab-390',390);await capture('audio-ab-1440',1440);
  await page.getByRole('button',{name:'Новая версия',exact:true}).click();await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Предыдущая версия',exact:true}).click();await page.waitForTimeout(400);
  // Offline rendering uses the same modules as the served production source.
  await page.goto('http://127.0.0.1:3244');
  await page.locator('body').click({position:{x:4,y:4}});
  const runtime=await page.evaluate(async()=>{
    const {SoundFX}=await import('/src/components/SoundFX.js');SoundFX.setEnabled(true);SoundFX.setVolume(.6);
    const first=window.__audioCalls.length;SoundFX.playTruthBreak();const voices=window.__audioCalls.slice(first);SoundFX.setEnabled(false);
    const stopped=voices.length>0&&voices.every(s=>s.stop);const mutedStart=window.__audioCalls.length;SoundFX.playNavigate();const muted=window.__audioCalls.length===mutedStart;
    SoundFX.setEnabled(true);SoundFX.playAnalysisComplete();const next=window.__audioCalls.slice(mutedStart);
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const hiddenStops=next.length>0&&next.every(s=>s.stop);delete document.hidden;
    await new Promise(r=>setTimeout(r,80));const rapidStart=window.__audioCalls.length;for(let i=0;i<100;i++)SoundFX.playRotate();const rapid=window.__audioCalls.length-rapidStart;SoundFX.setEnabled(false);
    return {stopped,muted,hiddenStops,rapid};
  });
  assert.equal(runtime.stopped,true);assert.equal(runtime.muted,true);assert.equal(runtime.hiddenStops,true);assert.ok(runtime.rapid>0&&runtime.rapid<=5);
  const audio=await page.evaluate(async()=>{
    const latest=await import('/src/components/SoundFX.js'),previous=await import('/src/components/audio/PreviousPalette.js');const metrics=[];
    for(const name of latest.SOUND_NAMES) for(let variant=0;variant<3;variant++) {
      const ctx=new OfflineAudioContext(1,44100*3,44100),bus=latest.createSoundBus(ctx,.6);latest.renderSound(ctx,bus.input,name,variant);const samples=(await ctx.startRendering()).getChannelData(0);let sum=0,peak=0,crossings=0;
      for(let i=0;i<samples.length;i++){const x=samples[i];if(!Number.isFinite(x))throw new Error('Nonfinite '+name);sum+=x*x;peak=Math.max(peak,Math.abs(x));if(i&&samples[i]*samples[i-1]<0)crossings++;}
      if(peak<.005||peak>.85)throw new Error('Unbounded/silent '+name+':'+peak);metrics.push({name,variant,peak,rms:Math.sqrt(sum/samples.length),crossings});
    }
    const wav=pcm=>{const bytes=new Uint8Array(44+pcm.length*2),view=new DataView(bytes.buffer),text=(offset,s)=>[...s].forEach((c,i)=>bytes[offset+i]=c.charCodeAt(0));text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,44100,true);view.setUint32(28,88200,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,pcm.length*2,true);pcm.forEach((x,i)=>view.setInt16(44+i*2,Math.max(-1,Math.min(1,x))*32767,true));let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
    const list=['navigate','rotate','scan','denied','granted','truth'];const files={};
    for(const profile of ['previous','new']) {const mod=profile==='new'?latest:previous,ctx=new OfflineAudioContext(1,44100*15,44100),bus=mod.createSoundBus(ctx,.6);list.forEach((name,i)=>mod.renderSound(ctx,bus.input,name,0,.2+i*2.2));const pcm=(await ctx.startRendering()).getChannelData(0);files[profile]=wav(pcm);}
    return {metrics,files};
  });
  fs.writeFileSync(path.join(OUT,'audio-metrics.json'),JSON.stringify(audio.metrics,null,2));for(const [name,data] of Object.entries(audio.files))fs.writeFileSync(path.join(OUT,`audio-${name}.wav`),Buffer.from(data,'base64'));
  assert.deepEqual(errors,[]);console.log('PASS: actual Express/React path; 15 stages at 320/390/1440, five server rewards, controls/keyboard/pin/microscope, errors, A/B preview, 60 finite bounded audio renders. No mocked rewards.');
} finally {await browser?.close();server.kill();try{process.kill(-vite.pid,'SIGTERM');}catch{}fs.rmSync(dir,{recursive:true,force:true});}
