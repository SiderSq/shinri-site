#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestServer, stopTestServer, isStrict } from './helpers/test-server.mjs';
import { ApiClient } from './helpers/api-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const ALL_TEST_FILES = [
  // Tier 1: Feature Coverage
  'tests/e2e/tier1-features/r1_map_skud.test.mjs',
  'tests/e2e/tier1-features/r2_debate_bullets.test.mjs',
  'tests/e2e/tier1-features/r3_round_verdict.test.mjs',
  'tests/e2e/tier1-features/zeroleak_security.test.mjs',

  // Tier 2: Boundary & Corner Cases
  'tests/e2e/tier2-boundaries/r1_map_boundaries.test.mjs',
  'tests/e2e/tier2-boundaries/r2_debate_boundaries.test.mjs',
  'tests/e2e/tier2-boundaries/r3_verdict_boundaries.test.mjs',
  'tests/e2e/tier2-boundaries/auth_lockout_boundaries.test.mjs',

  // Tier 3: Cross-Feature Combinations
  'tests/e2e/tier3-crossfeature/cross_features.test.mjs',

  // Tier 4: Real-World RP Application Scenarios
  'tests/e2e/tier4-scenarios/rp_scenarios.test.mjs'
];

async function main() {
  console.log('\n===============================================================');
  console.log('  SHINRI TRIAL // MONOPAD INVESTIGATION TERMINAL E2E RUNNER   ');
  console.log('             Curator Persona: Nagito Komaeda                   ');
  console.log('===============================================================\n');

  const args = process.argv.slice(2);
  const strictMode = isStrict();
  const filterArg = args.find(a => !a.startsWith('--'));

  let targetFiles = ALL_TEST_FILES;
  if (filterArg) {
    targetFiles = ALL_TEST_FILES.filter(f => f.toLowerCase().includes(filterArg.toLowerCase()));
    console.log(`[Filter active]: Running tests matching "${filterArg}" (${targetFiles.length} files)\n`);
  }

  // Pre-test setup: Reset locks and ensure test server is online
  ApiClient.resetLocks();
  console.log('➜ Initializing test environment and verifying server health...');
  const baseUrl = await getTestServer(3199);
  console.log(`➜ Test server online at: ${baseUrl}\n`);

  const nodeArgs = [
    '--test',
    '--test-concurrency=1',
    ...targetFiles
  ];

  const env = {
    ...process.env,
    BASE_URL: baseUrl,
    STRICT_E2E: strictMode ? '1' : '0'
  };

  const child = spawn('node', nodeArgs, {
    cwd: PROJECT_ROOT,
    env,
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    ApiClient.resetLocks();
    stopTestServer();

    console.log('\n---------------------------------------------------------------');
    if (code === 0) {
      console.log('✅ E2E SUITE EXECUTION COMPLETED SUCCESSFULLY');
      console.log('   All active implementation tests passed. Milestone pending tests documented.');
    } else {
      console.log(`⚠️  E2E SUITE EXECUTION FINISHED WITH CODE: ${code}`);
      if (strictMode) {
        console.log('   Strict mode active: Milestone-pending tests require 100% completion.');
      }
    }
    console.log('===============================================================\n');

    process.exit(code);
  });
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  stopTestServer();
  process.exit(1);
});
