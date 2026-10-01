import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validProof } from './helpers.mjs';
const ROOT=fileURLToPath(new URL('../..',import.meta.url)), BASE='http://127.0.0.1:3242';
test('real API: auth → 15 proofs → five rewards → reload → verdict; retired ID bypass blocked', { timeout:60000 }, async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shinri-lab-api-'));
  const config=JSON.parse(fs.readFileSync(path.join(ROOT,'server/data/case.json'))); delete config.archiveRound; config.accessCode='lab-test-code'; config.recoveryKey='LAB-QA';
  fs.writeFileSync(path.join(dir,'case.json'),JSON.stringify(config));
  const server=spawn(process.execPath,['server/server.js'],{ cwd:ROOT, env:{...process.env,PORT:'3242',SHINRI_DATA_DIR:dir,ADMIN_PASSWORD:'qa-only'},stdio:'ignore' });
  try {
    for(let i=0;i<80;i++) { try { await fetch(BASE+'/api/investigation/status'); break; } catch {} await new Promise(r=>setTimeout(r,100)); }
    assert.equal((await fetch(BASE+'/api/investigation/lab/workstation')).status,403);
    const login=await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:config.accessCode,playerName:'QA fixture'})}); assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0], headers={'Content-Type':'application/json',cookie};
    const post=(url,body)=>fetch(BASE+url,{method:'POST',headers,body:JSON.stringify(body)});
    assert.equal((await post('/api/investigation/recover',{key:config.recoveryKey})).status,200);
    assert.equal((await post('/api/investigation/verify-killer',{answer:config.killer})).status,403);
    assert.equal((await post('/api/investigation/lab/solve-minigame',{minigameId:'circuit'})).status,410);
    let data=await (await fetch(BASE+'/api/investigation/lab/workstation',{headers})).json(); assert.deepEqual(data.letters,{});
    const wrong=await post('/api/investigation/lab/submit-analysis',{gameId:'circuit',stage:0,version:data.version,proof:{}});assert.equal(wrong.status,422);
    const rapid=await post('/api/investigation/lab/submit-analysis',{gameId:'circuit',stage:0,version:data.version,proof:{}});assert.equal(rapid.status,429);
    assert.equal((await post('/api/investigation/lab/submit-analysis',{gameId:'circuit',stage:1,version:data.version,proof:{}})).status,409);
    for(const id of ['circuit','uv','timeline','trap','workbench']) for(let stage=0;stage<3;stage++) {
      await new Promise(r=>setTimeout(r,820)); const ch=data.games.find(g=>g.gameId===id);
      const response=await post('/api/investigation/lab/submit-analysis',{gameId:id,stage,version:data.version,proof:validProof(ch)});assert.equal(response.status,200,`${id} ${stage}`);data=await response.json();
      assert.equal(data.progress[id],stage+1); if(stage<2) assert.equal(data.letters[id],undefined); else assert.ok(data.letters[id]);
    }
    const reload=await (await fetch(BASE+'/api/investigation/lab/workstation',{headers})).json();assert.deepEqual(reload.progress,data.progress);assert.equal(Object.keys(reload.letters).length,5);
    const verdict=await post('/api/investigation/verify-killer',{answer:config.killer}); assert.equal(verdict.status,200);assert.equal((await verdict.json()).success,true);
  } finally {server.kill();fs.rmSync(dir,{recursive:true,force:true});}
});
