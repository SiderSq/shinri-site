import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  validateRound,
  chronology,
  circuitAnswer,
  contenders,
  interpret,
  publicRound,
  checkPuzzle,
  checkVerdict,
  fingerprint,
} from "../../server/archive/engine.js";
const config = JSON.parse(
  fs.readFileSync(new URL("../../server/data/case.json", import.meta.url)),
);
const fresh = () => structuredClone(config.archiveRound);
const circuit = (r) => ({
  selected: circuitAnswer(r),
  currents: Object.fromEntries(
    r.circuit.rows.map((x) => [
      x.id,
      x.closed && x.fuse ? x.voltage / x.resistance : 0,
    ]),
  ),
});
test("default archive has exactly one logical winner and unique chronology", () => {
  const r = fresh();
  validateRound(r);
  assert.equal(contenders(r)[0].id, "P3");
  assert.deepEqual(chronology(r), ["shock", "bind", "wake", "trap", "clean"]);
});
test("all three traces necessary: removing any restores an alternative", () => {
  const r = fresh();
  for (const t of r.traces) {
    const reduced = { ...r, traces: r.traces.filter((x) => x.id !== t.id) };
    assert.ok(contenders(reduced).length > 1);
  }
});
test("no single trace identifies a suspect", () => {
  const r = fresh();
  for (const t of r.traces)
    assert.ok(contenders({ ...r, traces: [t] }).length > 1);
});
test("circuit requires exact set and numerical work, not only a guessed choice", () => {
  const r = fresh(),
    a = circuit(r);
  assert.equal(checkPuzzle(r, "circuit", a), true);
  assert.equal(checkPuzzle(r, "circuit", { selected: a.selected }), false);
  a.currents.B = 4;
  assert.equal(checkPuzzle(r, "circuit", a), false);
});
test("duplicate circuit IDs and duplicate submission cannot succeed", () => {
  const r = fresh(),
    a = circuit(r);
  a.selected = ["A", "A"];
  assert.equal(checkPuzzle(r, "circuit", a), false);
  r.circuit.rows[1].id = "A";
  assert.throws(() => validateRound(r));
});
test("reversed chronology and incomplete chain fail", () => {
  const r = fresh();
  assert.equal(checkPuzzle(r, "timeline", chronology(r).reverse()), false);
  assert.equal(checkPuzzle(r, "timeline", ["shock"]), false);
});
test("cycle and ambiguous partial order rejected", () => {
  const r = fresh();
  r.edges.pop();
  assert.throws(() => validateRound(r));
  const cycle = fresh();
  cycle.edges.push(["clean", "shock"]);
  assert.throws(() => validateRound(cycle));
});
test("trace results derived from measurements and mismatch is rejected", () => {
  const r = fresh();
  assert.deepEqual(r.traces.map(interpret), [
    "Медь",
    "Лезвие A",
    "21:42–21:44",
  ]);
  r.traces[0].value = "Сталь";
  assert.throws(() => validateRound(r));
});
test("clock sign and spectrum boundaries work", () => {
  const r = fresh();
  r.traces[0].measurement.sample = 570;
  assert.equal(interpret(r.traces[0]), "Медь");
  r.traces[2].measurement.fastByMinutes = -3;
  assert.equal(interpret(r.traces[2]), "21:48–21:50");
});
test("overlapping bands and invalid measurement rejected", () => {
  const r = fresh();
  r.traces[0].measurement.bands[1].min = 570;
  r.traces[0].measurement.bands[1].max = 590;
  assert.throws(() => validateRound(r));
});
test("public payload has observations but no private trace values or killer key", () => {
  const p = publicRound(fresh());
  assert.ok(p.traces.every((t) => t.observation && !Object.hasOwn(t, "value")));
  assert.ok(!Object.hasOwn(p, "killer"));
});
test("verdict requires all evidence and contradiction for every alternative", () => {
  const r = fresh();
  const proof = {
    suspectId: "P3",
    evidenceIds: ["T1", "T2", "T3"],
    exclusions: { P1: "T2", P2: "T1", P4: "T3" },
  };
  assert.equal(checkVerdict(r, proof), true);
  assert.equal(checkVerdict(r, { ...proof, suspectId: "P1" }), false);
  assert.equal(
    checkVerdict(r, { ...proof, exclusions: { P1: "T1", P2: "T1", P4: "T3" } }),
    false,
  );
  assert.equal(checkVerdict(r, { ...proof, evidenceIds: ["T1"] }), false);
});
test("round renaming, shuffling, additional suspects do not change mechanics", () => {
  const r = fresh();
  r.id = "next-round";
  r.participants.reverse();
  r.participants.forEach((p, i) => (p.name = `Новое имя ${i}`));
  r.participants.push({
    id: "P5",
    name: "Новый участник",
    profile: { contact: "Алюминий", tool: "Лезвие C", window: "21:40–21:42" },
  });
  validateRound(r);
  assert.equal(contenders(r)[0].id, "P3");
  assert.notEqual(
    fingerprint({ ...config, archiveRound: r }),
    fingerprint(config),
  );
});
test("live requires confirmation and Google Drive must be HTTPS on correct host", () => {
  const r = fresh();
  r.mode = "live";
  assert.throws(() => validateRound(r));
  r.confirmed = true;
  r.driveUrl = "https://drive.google.com/drive/folders/fixture";
  validateRound(r);
  r.driveUrl = "https://example.com";
  assert.throws(() => validateRound(r));
});
test("non-unique or impossible case refused before publication", () => {
  const r = fresh();
  r.participants[0].profile = { ...r.participants[2].profile };
  assert.throws(() => validateRound(r));
});

test("different measurements, arbitrary IDs and a different winner need no code changes", () => {
  const r = fresh();
  r.id = "live-randomized";
  r.mode = "live";
  r.confirmed = true;
  r.driveUrl = "https://drive.google.com/drive/folders/fixture";
  r.traces[0].measurement.sample = 440;
  r.traces[0].value = "Сталь";
  r.traces[1].measurement.marks = [0.6, 1.2, 1.8];
  r.traces[1].value = "Лезвие B";
  r.traces[2].measurement.fastByMinutes = 5;
  r.traces[2].value = "21:40–21:42";
  for (const p of r.participants) {
    p.id = "ROUND_" + p.id;
    p.profile.contact = p.profile.contact === "Медь" ? "Сталь" : "Медь";
    p.profile.tool = p.profile.tool === "Лезвие A" ? "Лезвие B" : "Лезвие A";
    p.profile.window =
      p.profile.window === "21:42–21:44" ? "21:40–21:42" : "21:42–21:44";
  }
  [r.participants[0].profile, r.participants[2].profile] = [
    r.participants[2].profile,
    r.participants[0].profile,
  ];
  validateRound(r);
  assert.equal(contenders(r)[0].id, "ROUND_P1");
  assert.equal(checkPuzzle(r, "traces", r.traces.map(interpret)), true);
  const exclusions = Object.fromEntries(
    r.participants
      .filter((p) => p.id !== "ROUND_P1")
      .map((p) => [
        p.id,
        r.traces.find((t) => p.profile[t.key] !== t.value).id,
      ]),
  );
  assert.equal(
    checkVerdict(r, {
      suspectId: "ROUND_P1",
      evidenceIds: r.traces.map((t) => t.id),
      exclusions,
    }),
    true,
  );
});
