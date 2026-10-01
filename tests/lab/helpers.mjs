import { correctSpectralIds } from '../../shared/lab-model.js';
export function validProof(ch) {
  if (ch.gameId === 'circuit') return { rotations: ch.tiles.map(() => 0), voltage: ch.resistance * 3 };
  if (ch.gameId === 'uv') { const zeroOffset = ch.calibration.observed - ch.calibration.expected; return { zeroOffset, sampleIds: correctSpectralIds(ch, zeroOffset) }; }
  if (ch.gameId === 'timeline') { const clockCorrection = ch.sync ? ch.sync.reference - ch.sync.observed : 0; return { clockCorrection, order: [...ch.events].sort((a,b) => a.observedMinute + (a.source === 'Терминал' ? clockCorrection : 0) - b.observedMinute - (b.source === 'Терминал' ? clockCorrection : 0)).map(e => e.id) }; }
  if (ch.gameId === 'trap') return ch.stage === 0 ? { release:75, opening:0, damper:0 } : ch.stage === 1 ? { release:90, opening:30, damper:0, primingRelease:75, pinReleased:true } : { release:85, opening:30, damper:12, primingRelease:85, pinReleased:true };
  const tool = ch.samples.find(s => JSON.stringify(s.ridges) === JSON.stringify(ch.reference.ridges));
  return { sampleId:tool.id, rotation:ch.reference.rotation, offset:ch.reference.offset, focus:100, checkedWindows:ch.windows };
}
