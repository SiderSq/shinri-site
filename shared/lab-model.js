// Pure, public instrument models. No rewards, session secrets or hidden answers.
export const GAME_IDS = ['circuit', 'uv', 'timeline', 'trap', 'workbench'];
export function circuitReading(challenge, proof) {
  const { tiles, cols, resistance } = challenge;
  const rotations = proof.rotations || [];
  const ports = tiles.map((tile, i) => tile.ports.map(port => (port + (tile.fixed ? tile.rotation : rotations[i] ?? 0)) % 4));
  const seen = new Set([0]); const queue = [0]; const steps = [-cols, 1, cols, -1];
  while (queue.length) {
    const i = queue.shift();
    for (const port of ports[i]) {
      if ((port === 1 && i % cols === cols - 1) || (port === 3 && i % cols === 0)) continue;
      const j = i + steps[port];
      if (j < 0 || j >= tiles.length || !ports[j].includes((port + 2) % 4) || seen.has(j)) continue;
      seen.add(j); queue.push(j);
    }
  }
  const connected = seen.has(tiles.length - 1);
  const fault = [...seen].some(i => tiles[i].damaged);
  return { connected, fault, powered: [...seen], current: connected && !fault ? Number(proof.voltage) / resistance : 0 };
}
export function trapReading(challenge, proof) {
  return challenge.baseLoad - Number(proof.release) + Number(proof.opening) * challenge.leverage - Number(proof.damper) * challenge.damping;
}
export function comparisonScore(challenge, proof, windowId = 'A') {
  const tool = challenge.samples.find(s => s.id === proof.sampleId);
  if (!tool) return 0;
  const actual = tool.ridges[windowId], reference = challenge.reference.ridges[windowId];
  const error = reference.reduce((sum, point, i) => sum + Math.abs(point - actual[i]), 0) / reference.length;
  const alignment = Math.abs(Number(proof.rotation) - challenge.reference.rotation) * 2.5 + Math.abs(Number(proof.offset) - challenge.reference.offset) * 2;
  const focusPenalty = Math.max(0, 75 - Number(proof.focus)) * 0.5;
  return Math.max(0, Math.round(100 - error * 4 - alignment - focusPenalty));
}
export function correctSpectralIds(challenge, zeroOffset) {
  return challenge.samples.filter(s => {
    const peak = s.peak - zeroOffset;
    return s.reaction === 'positive' && peak >= challenge.band[0] && peak <= challenge.band[1] && s.ratio >= challenge.minRatio;
  }).map(s => s.id);
}
