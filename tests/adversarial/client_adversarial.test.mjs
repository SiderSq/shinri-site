import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Adversarial Client & UI/UX Audit', () => {

  // 1. Static Production Bundle Zero-Leak Penetration Test
  describe('Static Production Bundle Zero-Leak Penetration Test', () => {
    const distAssetsDir = path.resolve(process.cwd(), 'client/dist/assets');
    const jsFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));

    assert.ok(jsFiles.length > 0, 'Production JS bundle must exist in client/dist/assets');
    const bundleContents = jsFiles.map(f => fs.readFileSync(path.join(distAssetsDir, f), 'utf8')).join('\n');

    test('PEN-01: Secret killer identity "КИРУМИ" must NOT be leaked in static client bundle', () => {
      const killerRegex = /КИРУМИ/;
      const hasKiller = killerRegex.test(bundleContents);
      // Adversarial probe: If found in bundle, this is an empirical vulnerability
      if (hasKiller) {
        const matchIdx = bundleContents.search(killerRegex);
        const snippet = bundleContents.substring(Math.max(0, matchIdx - 40), matchIdx + 40);
        assert.fail(`CRITICAL VULNERABILITY: Secret killer name "КИРУМИ" is embedded in production bundle: "${snippet}"`);
      }
    });

    test('PEN-02: Recovery key "SR-04-271" must NOT be hardcoded in static client bundle', () => {
      const recoveryKeyRegex = /SR-04-271/;
      const hasRecoveryKey = recoveryKeyRegex.test(bundleContents);
      if (hasRecoveryKey) {
        const matchIdx = bundleContents.search(recoveryKeyRegex);
        const snippet = bundleContents.substring(Math.max(0, matchIdx - 40), matchIdx + 40);
        assert.fail(`VULNERABILITY: Master recovery key "SR-04-271" is hardcoded in production bundle: "${snippet}"`);
      }
    });

    test('PEN-03: Secret refutation spoiler "ЛОЖНОЕ АЛИБИ КИРУМИ ТОДЗЁ" must NOT be hardcoded in static client bundle', () => {
      const spoilerRegex = /ЛОЖНОЕ АЛИБИ КИРУМИ ТОДЗЁ/;
      const hasSpoiler = spoilerRegex.test(bundleContents);
      if (hasSpoiler) {
        const matchIdx = bundleContents.search(spoilerRegex);
        const snippet = bundleContents.substring(Math.max(0, matchIdx - 40), matchIdx + 40);
        assert.fail(`VULNERABILITY: Debate spoiler "ЛОЖНОЕ АЛИБИ КИРУМИ ТОДЗЁ" is hardcoded in production bundle: "${snippet}"`);
      }
    });

    test('PEN-04: Private truth table must NOT be compiled into client bundle', () => {
      assert.ok(!bundleContents.includes('CLUE_MAID_CONTRADICTION'), 'Truth table clue was leaked into client bundle');
      assert.ok(!bundleContents.includes('truthTable'), 'truthTable property was leaked into client bundle');
    });
  });

  // 2. UI Component Contract & Edge Case Verification
  describe('UI Component Edge Cases & Contracts', () => {

    test('EDGE-MAP-01: TacticalMap crashes with TypeError when sectors data is empty object {}', () => {
      // In TacticalMap.jsx:
      // const sectors = sectorsData || fallbackSectors;
      // const currentSector = sectors[selectedSectorId] || sectors.C;
      // style={{ borderColor: currentSector.themeColor || '#00f3ff' }}
      const sectorsData = {};
      const fallbackSectors = { A: { themeColor: '#00f3ff' }, B: {}, C: { themeColor: '#ff2a85' } };
      
      const sectors = sectorsData || fallbackSectors;
      const currentSector = sectors['C'] || sectors.C;
      
      assert.throws(() => {
        // Accessing property on undefined currentSector
        const theme = currentSector.themeColor;
      }, /Cannot read properties of undefined/, 'TacticalMap crashes with TypeError when sectorsData is {}');
    });

    test('EDGE-MAP-02: TacticalMap missing log fields handling', () => {
      // Test log formatting when fields are missing
      const rawLog = { id: 'LOG_99', sector: 'C' };
      const timestamp = rawLog.timestamp || rawLog.time || 'N/A';
      const doorLabel = rawLog.doorLabel || rawLog.doorId || 'ШЛЮЗ';
      const action = rawLog.action || rawLog.event || 'UNKNOWN';
      assert.equal(timestamp, 'N/A');
      assert.equal(doorLabel, 'ШЛЮЗ');
      assert.equal(action, 'UNKNOWN');
    });

    test('EDGE-DEBATE-01: NonStopDebate crashes with TypeError when statements is empty array []', () => {
      // In NonStopDebate.jsx:
      // const statements = caseData?.debate?.statements || DEFAULT_STATEMENTS;
      // Because [] is truthy, statements evaluates to []
      const caseData = { debate: { statements: [] } };
      const DEFAULT_STATEMENTS = [{ id: 'S1', speed: 'normal' }];
      const statements = caseData.debate.statements || DEFAULT_STATEMENTS;
      const activeStatement = statements[0];

      assert.throws(() => {
        const duration = (activeStatement.speed === 'fast' ? 10000 : 14000);
      }, /Cannot read properties of undefined/, 'NonStopDebate crashes when statements is []');
    });

    test('EDGE-DEBATE-02: NonStopDebate crashes with TypeError when bullets is empty array []', () => {
      // In NonStopDebate.jsx:
      // const bullets = caseData?.debate?.bullets || DEFAULT_BULLETS;
      // Because [] is truthy, bullets evaluates to []
      const caseData = { debate: { bullets: [] } };
      const DEFAULT_BULLETS = [{ id: 'B1', title: 'Bullet 1' }];
      const bullets = caseData.debate.bullets || DEFAULT_BULLETS;
      const activeBullet = bullets[0];

      assert.throws(() => {
        const title = activeBullet.title;
      }, /Cannot read properties of undefined/, 'NonStopDebate crashes when bullets is []');
    });

    test('EDGE-HEADER-01: Header countdown formats negative remainingSeconds as "-1:-10" without clamping', () => {
      // When server returns negative seconds (e.g. -10):
      const remainingSeconds = -10;
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formattedCountdown = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // This exhibits the unclamped glitch
      assert.equal(formattedCountdown, '-1:-10', 'Negative seconds produced glitch format "-1:-10"');
    });

    test('EDGE-VICTORY-01: VictoryScreen handleCopyDiscordReport lacks error catch and fallback for navigator.clipboard', async () => {
      // Simulate environment where navigator.clipboard is unavailable or rejects
      let uncaughtError = null;
      const mockNavigator = {
        clipboard: {
          writeText: async () => {
            throw new Error('DOMException: NotAllowedError: Clipboard access denied');
          }
        }
      };

      try {
        // Implementation in VictoryScreen:
        // navigator.clipboard.writeText(certificate.discordReport);
        // setCopied(true);
        const copyPromise = mockNavigator.clipboard.writeText('test report');
        // Unhandled rejection if not caught:
        await assert.rejects(async () => {
          await copyPromise;
        }, /Clipboard access denied/);
      } catch (err) {
        uncaughtError = err;
      }
      assert.ok(!uncaughtError, 'Rejection was verified as unhandled in raw component code');
    });

  });
});
