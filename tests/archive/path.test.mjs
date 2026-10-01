import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { circuitAnswer, chronology } from "../../server/archive/engine.js";
const config = JSON.parse(
  fs.readFileSync(new URL("../../server/data/case.json", import.meta.url)),
);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  "real API path, anti-bypass, progress, round adaptation and logout",
  { timeout: 40000 },
  async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shinri-archive-"));
    fs.writeFileSync(path.join(dir, "case.json"), JSON.stringify(config));
    const server = spawn(process.execPath, ["server/server.js"], {
      cwd: new URL("../..", import.meta.url),
      env: {
        ...process.env,
        PORT: "3217",
        SHINRI_DATA_DIR: dir,
        ADMIN_PASSWORD: "test-only-admin",
      },
      stdio: "ignore",
    });
    t.after(() => {
      server.kill();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const base = "http://127.0.0.1:3217";
    let session = "",
      admin = "";
    async function request(
      route,
      body,
      method = body === undefined ? "GET" : "POST",
      auth = true,
    ) {
      const res = await fetch(base + route, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(auth && session ? { "x-session-id": session } : {}),
          ...(admin ? { "x-admin-token": admin } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, data: await res.json() };
    }
    for (let i = 0; i < 80; i++) {
      try {
        await request("/api/archive/gateway");
        break;
      } catch {
        await wait(100);
      }
    }
    assert.equal((await request("/api/archive/round")).status, 403);
    assert.equal(
      (await request("/api/archive/recover", { key: config.recoveryKey }))
        .status,
      403,
    );
    assert.equal(
      (
        await request("/api/investigation/lab/solve-minigame", {
          minigameId: "circuit",
        })
      ).status,
      410,
    );
    assert.equal(
      (
        await request("/api/investigation/verify-killer", {
          answer: config.killer,
        })
      ).status,
      410,
    );
    assert.equal(
      (await request("/api/investigation/verdict-certificate", {})).status,
      410,
    );
    assert.equal((await request("/api/archive/verdict", {})).status, 403);
    assert.equal(
      (await request("/api/auth/login", { code: "wrong", playerName: "Тест" }))
        .status,
      401,
    );
    const login = await request("/api/auth/login", {
      code: config.accessCode,
      playerName: "Тест",
    });
    assert.equal(login.status, 200);
    session = login.data.sessionId;
    assert.equal(
      (await request("/api/archive/recover", { key: "wrong" })).status,
      400,
    );
    await wait(1250);
    assert.equal(
      (await request("/api/archive/recover", { key: config.recoveryKey }))
        .status,
      200,
    );
    let round = await request("/api/archive/round");
    assert.equal(round.status, 200);
    assert.ok(round.data.round.traces.every((t) => !Object.hasOwn(t, "value")));
    const r = config.archiveRound;
    assert.equal(
      (
        await request("/api/archive/solve", {
          puzzleId: "traces",
          answer: r.traces.map((t) => t.value),
        })
      ).status,
      409,
    );
    assert.equal(
      (await request("/api/archive/verdict", { suspectId: "P3" })).status,
      409,
    );
    await wait(1250);
    assert.equal(
      (
        await request("/api/archive/solve", {
          puzzleId: "circuit",
          answer: { selected: circuitAnswer(r) },
        })
      ).status,
      422,
    );
    assert.equal(
      (await request("/api/archive/solve", { puzzleId: "circuit", answer: {} }))
        .status,
      429,
    );
    await wait(1250);
    const answer = {
      selected: circuitAnswer(r),
      currents: Object.fromEntries(
        r.circuit.rows.map((x) => [
          x.id,
          x.closed && x.fuse ? x.voltage / x.resistance : 0,
        ]),
      ),
    };
    assert.equal(
      (await request("/api/archive/solve", { puzzleId: "circuit", answer }))
        .status,
      200,
    );
    assert.deepEqual((await request("/api/archive/round")).data.progress, [
      "circuit",
    ]);
    assert.ok(
      (await request("/api/archive/round")).data.findings.circuit.includes(
        "A, D",
      ),
    );
    assert.equal(
      (await request("/api/archive/round")).data.findings.traces,
      undefined,
    );
    await wait(1250);
    assert.equal(
      (
        await request("/api/archive/solve", {
          puzzleId: "timeline",
          answer: chronology(r),
        })
      ).status,
      200,
    );
    await wait(1250);
    assert.equal(
      (
        await request("/api/archive/solve", {
          puzzleId: "traces",
          answer: r.traces.map((t) => t.value),
        })
      ).status,
      200,
    );
    await wait(1250);
    const proof = {
      suspectId: "P3",
      evidenceIds: r.traces.map((t) => t.id),
      exclusions: { P1: "T2", P2: "T1", P4: "T3" },
    };
    assert.equal(
      (await request("/api/archive/verdict", { ...proof, exclusions: {} }))
        .status,
      422,
    );
    await wait(1250);
    const verdict = await request("/api/archive/verdict", proof);
    assert.equal(verdict.status, 200);
    assert.equal(verdict.data.verdict.name, "Архивный профиль 03");
    assert.equal((await request("/api/archive/gateway")).data.state, "SOLVED");
    assert.ok(
      (await request("/api/archive/round")).data.verdict.report.includes(
        "Лезвие A",
      ),
    );
    admin = (await request("/api/admin/login", { password: "test-only-admin" }))
      .data.token;
    const invalid = structuredClone(r);
    invalid.participants[0].profile = { ...invalid.participants[2].profile };
    assert.equal(
      (await request("/api/admin/archive-round", invalid, "PUT")).status,
      400,
    );
    const next = structuredClone(r);
    next.id = "live-next";
    next.mode = "live";
    next.confirmed = true;
    next.driveUrl = "https://drive.google.com/drive/folders/test-fixture";
    next.participants.forEach((p, i) => (p.name = `Раунд 2 / ${i + 1}`));
    assert.equal(
      (await request("/api/admin/archive-round", next, "PUT")).status,
      200,
    );
    assert.equal((await request("/api/archive/gateway")).data.state, "NEW");
    assert.equal((await request("/api/archive/round")).status, 403);
    const again = await request("/api/auth/login", {
      code: config.accessCode,
      playerName: "Тест",
    });
    session = again.data.sessionId;
    assert.equal(
      (await request("/api/archive/gateway")).data.state,
      "AUTHENTICATED",
    );
    await wait(1250);
    assert.equal(
      (await request("/api/archive/recover", { key: config.recoveryKey }))
        .status,
      200,
    );
    assert.deepEqual((await request("/api/archive/round")).data.progress, []);
    assert.equal((await request("/api/auth/logout", {})).status, 200);
    assert.equal((await request("/api/archive/round")).status, 403);
  },
);
