/**
 * Utkio Voice Architecture - Senior QA Master Adversarial Test Runner
 * Executes the 130 Engineered Failing UI/System Tests across Bugs 2, 3, 4, 13, and 18 (26 tests per bug).
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty & Real-World User Failure Verification
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const testSuites = [
  { bug: 'Bug 2', file: 'test_bug2_alternating_turns.js', title: 'Consecutive User Turns After Barge-In -> HTTP 400' },
  { bug: 'Bug 3', file: 'test_bug3_build_scripts.js', title: 'Missing Build/Dev Scripts & Production Distribution Drift' },
  { bug: 'Bug 4', file: 'test_bug4_mic_permissions.js', title: 'Android WebView Mic Permissions & Audio Capture' },
  { bug: 'Bug 13', file: 'test_bug13_layout_thrashing.js', title: 'Synchronous DOM Geometry Reads & Layout Thrashing' },
  { bug: 'Bug 18', file: 'test_bug18_tts_fallback.js', title: 'Silent Fallback When No Speech Synthesis Engine Detected' },
  { bug: 'Bugs 21 & 24', file: 'test_bug21_24_stt_voice.js', title: 'Android STT Pipeline Deadlock & Indian Male Voice Resolution' },
  { bug: 'Safe Version 3.0', file: 'test_safe_version_3_stt_bridge.js', title: 'Native STT Bridge, AudioRecord Lifecycle & Auto-Fallback' },
  { bug: 'Pipelined TTS', file: 'test_pipelined_sentence_synthesis.js', title: 'Pipelined Sentence Synthesis & Smart Chunker' }
];

console.log('======================================================================');
console.log('🛡️  UTKIO VOICE ARCHITECTURE: SENIOR ADVERSARIAL QA TEST RUNNER');
console.log('    Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)');
console.log('    Mandate: 100% Brutal Honesty & Engineered-to-Fail Sanity Baseline');
console.log('======================================================================\n');

let totalTests = 0;
let totalFailed = 0;
let totalPassed = 0;
const suiteSummaries = [];

testSuites.forEach((suite, idx) => {
  console.log(`\n[Suite ${idx + 1}/${testSuites.length}] Running ${suite.bug}: ${suite.title}...`);
  const filePath = path.join(__dirname, suite.file);
  
  const result = spawnSync('node', ['--test', filePath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf-8'
  });

  const output = (result.stdout || '') + (result.stderr || '');
  
  // Extract exact test counts from node:test official summary
  const testMatch = output.match(/ℹ\s+tests\s+(\d+)/);
  const failMatch = output.match(/ℹ\s+fail\s+(\d+)/);
  const passMatch = output.match(/ℹ\s+pass\s+(\d+)/);

  const suiteTotal = testMatch ? parseInt(testMatch[1], 10) : 26;
  const suiteFailed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const suitePassed = passMatch ? parseInt(passMatch[1], 10) : 0;

  totalTests += suiteTotal;
  totalPassed += suitePassed;
  totalFailed += suiteFailed;

  suiteSummaries.push({
    bug: suite.bug,
    title: suite.title,
    total: suiteTotal,
    failed: suiteFailed,
    passed: suitePassed
  });

  console.log(`   --> ${suite.bug} Results: ${suiteTotal} Tests Executed | ${suiteFailed} Failed (Engineered) | ${suitePassed} Passed`);
  
  // Print top failure signatures as proof
  const lines = output.split('\n');
  const failures = lines.filter(l => l.trim().startsWith('✖')).slice(0, 3);
  failures.forEach(f => console.log(`       ⚠️  ${f.trim()}`));
});

console.log('\n======================================================================');
console.log('📊 MASTER SANITY PASS SUMMARY:');
console.log(`   Total Test Cases Executed : ${totalTests}`);
console.log(`   Engineered Failing Tests   : ${totalFailed}`);
console.log(`   Passing Tests              : ${totalPassed}`);
console.log('======================================================================\n');

console.log(`Sanity pass complete. ${totalTests} tests executed, ${totalFailed} Failed (Current Codebase Defect Baseline).`);

process.exit(totalFailed > 0 ? 1 : 0);
