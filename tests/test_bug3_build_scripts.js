/**
 * Senior QA Engineering Test Suite - Bug 3 (Adversarial Build & Dev Server Failing Tests)
 * Bug 3: Missing Build/Dev Scripts, Distribution Drift & Production Pipeline Vulnerabilities
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty & Real-World Build Pipeline Failure Verification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const scriptsDir = path.join(rootDir, 'scripts');
const buildScriptPath = path.join(scriptsDir, 'build.js');
const serverScriptPath = path.join(scriptsDir, 'server.js');
const wwwDir = path.join(rootDir, 'www');
const androidAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

const buildCode = fs.existsSync(buildScriptPath) ? fs.readFileSync(buildScriptPath, 'utf-8') : '';
const serverCode = fs.existsSync(serverScriptPath) ? fs.readFileSync(serverScriptPath, 'utf-8') : '';
const wwwIndexHtml = fs.existsSync(path.join(wwwDir, 'index.html')) ? fs.readFileSync(path.join(wwwDir, 'index.html'), 'utf-8') : '';

describe('BUG 3: Missing Build/Dev Scripts & Production Distribution Drift (26 Adversarial Tests)', () => {

  it('Test 3.01: scripts/build.js must inject asset cache-busting version query (?v=hash) into www/index.html', () => {
    assert.ok(
      wwwIndexHtml.includes('app.js?v=') || wwwIndexHtml.includes('app.js?h='),
      'www/index.html lacks cache-busting version hash on app.js; mobile WebView will serve stale cached scripts'
    );
  });

  it('Test 3.02: scripts/build.js must generate android-sync.json in android/app/src/main/assets/public/', () => {
    const syncReport = path.join(androidAssetsDir, 'android-sync.json');
    assert.ok(
      fs.existsSync(syncReport),
      'scripts/build.js does not generate android-sync.json verification manifest in Android assets'
    );
  });

  it('Test 3.03: scripts/server.js must provide HTTPS / SSL option for LAN Android device microphone testing', () => {
    assert.ok(
      serverCode.includes('https') || serverCode.includes('cert') || serverCode.includes('--ssl'),
      'scripts/server.js does not support HTTPS; Android Chrome will block microphone on mobile LAN testing'
    );
  });

  it('Test 3.04: scripts/server.js must explicitly disable Gzip / Deflate compression for SSE streaming endpoints', () => {
    assert.ok(
      serverCode.includes('no-transform') || serverCode.includes('compress: false') || serverCode.includes('Content-Encoding'),
      'scripts/server.js lacks compression buffering guards; proxying SSE tokens will suffer high latency'
    );
  });

  it('Test 3.05: scripts/build.js must integrate dedicated CSS validator (cssValidator) for style.css syntax checking', () => {
    assert.ok(
      buildCode.includes('cssValidator') || buildCode.includes('validateCssTokens'),
      'scripts/build.js performs JS syntax check but omits dedicated CSS token and syntax validator'
    );
  });

  it('Test 3.06: scripts/build.js must validate HTML structure and script references in index.html', () => {
    assert.ok(
      buildCode.includes('validateHtml') || buildCode.includes('index.html') && buildCode.includes('integrity'),
      'scripts/build.js fails to validate index.html asset tags before packaging'
    );
  });

  it('Test 3.07: scripts/build.js must enforce bundle size threshold (<100KB) for ultra-low latency mobile loading', () => {
    assert.ok(
      buildCode.includes('MAX_BUNDLE_SIZE') || buildCode.includes('102400') || buildCode.includes('sizeLimit'),
      'scripts/build.js lacks bundle size budget enforcement for mobile low-memory constraints'
    );
  });

  it('Test 3.08: scripts/build.js must strip debug console.log statements when NODE_ENV=production', () => {
    assert.ok(
      buildCode.includes('stripConsole') || buildCode.includes('NODE_ENV') && buildCode.includes('production'),
      'scripts/build.js does not strip sensitive production console logging'
    );
  });

  it('Test 3.09: scripts/build.js must support --watch flag for continuous asset rebuild during active development', () => {
    assert.ok(
      buildCode.includes('--watch') || buildCode.includes('watchMode'),
      'scripts/build.js does not support --watch flag for continuous asset compilation'
    );
  });

  it('Test 3.10: scripts/server.js must implement WebSocket or SSE live-reload trigger on source file changes', () => {
    assert.ok(
      serverCode.includes('ws') || serverCode.includes('WebSocket') || serverCode.includes('livereload'),
      'scripts/server.js lacks live-reload capability for mobile workbench testing'
    );
  });

  it('Test 3.11: scripts/server.js must gracefully handle port conflict (EADDRINUSE) with automatic fallback', () => {
    assert.ok(
      serverCode.includes('EADDRINUSE') || serverCode.includes('findAvailablePort') || serverCode.includes('port + 1'),
      'scripts/server.js crashes with unhandled EADDRINUSE if port 3000 is occupied'
    );
  });

  it('Test 3.12: scripts/server.js must set security header X-Content-Type-Options: nosniff', () => {
    assert.ok(
      serverCode.includes('X-Content-Type-Options') || serverCode.includes('nosniff'),
      'scripts/server.js does not send X-Content-Type-Options: nosniff header'
    );
  });

  it('Test 3.13: scripts/server.js must set security header Referrer-Policy: strict-origin-when-cross-origin', () => {
    assert.ok(
      serverCode.includes('Referrer-Policy'),
      'scripts/server.js does not configure Referrer-Policy security header'
    );
  });

  it('Test 3.14: scripts/build.js must scan for hardcoded Gemini API keys in app.js before bundle export', () => {
    assert.ok(
      buildCode.includes('AIzaSy') || buildCode.includes('detectSecret') || buildCode.includes('apiKeyCheck'),
      'scripts/build.js lacks pre-flight scanner for hardcoded API keys'
    );
  });

  it('Test 3.15: scripts/build.js must verify Subresource Integrity (SRI) for external font links', () => {
    assert.ok(
      buildCode.includes('sri') || buildCode.includes('integrity') || buildCode.includes('fonts.googleapis.com'),
      'scripts/build.js does not verify SRI for remote Google Fonts'
    );
  });

  it('Test 3.16: scripts/server.js must log local network IP address (LAN 192.168.x.x) for phone testing', () => {
    assert.ok(
      serverCode.includes('networkInterfaces') || serverCode.includes('LAN IP') || serverCode.includes('wifi'),
      'scripts/server.js only prints localhost; does not display LAN IP for physical device connection'
    );
  });

  it('Test 3.17: scripts/build.js must verify Capacitor capacitor.config.json webDir matches www', () => {
    assert.ok(
      buildCode.includes('capacitor.config.json') || buildCode.includes('webDir'),
      'scripts/build.js does not validate Capacitor configuration alignment'
    );
  });

  it('Test 3.18: scripts/build.js must verify AndroidManifest.xml permissions before executing sync', () => {
    assert.ok(
      buildCode.includes('AndroidManifest.xml') || buildCode.includes('RECORD_AUDIO'),
      'scripts/build.js does not verify critical AndroidManifest permissions before packaging'
    );
  });

  it('Test 3.19: scripts/build.js must generate sourcemap files for app.js in distribution directory', () => {
    assert.ok(
      fs.existsSync(path.join(wwwDir, 'app.js.map')) || buildCode.includes('sourceMap'),
      'scripts/build.js does not generate sourcemaps for remote Android WebView debugging'
    );
  });

  it('Test 3.20: scripts/server.js must handle client disconnect during SSE stream without process crash', () => {
    assert.ok(
      serverCode.includes("req.on('close'") || serverCode.includes("res.on('close'") || serverCode.includes('handleClientAbort'),
      'scripts/server.js lacks client disconnect event handling on streaming endpoints'
    );
  });

  it('Test 3.21: scripts/build.js must verify package.json version matches build-manifest.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const manifest = fs.existsSync(path.join(wwwDir, 'build-manifest.json')) ? JSON.parse(fs.readFileSync(path.join(wwwDir, 'build-manifest.json'), 'utf-8')) : {};
    assert.equal(
      manifest.packageVersion,
      pkg.version,
      'build-manifest.json does not track package.json semantic version'
    );
  });

  it('Test 3.22: scripts/build.js must implement automated atomic rollback of www/ on build failure', () => {
    assert.ok(
      buildCode.includes('tempDir') || buildCode.includes('rollback') || buildCode.includes('backup'),
      'scripts/build.js modifies www/ in-place; build failure leaves distribution directory corrupted'
    );
  });

  it('Test 3.23: scripts/server.js must support graceful shutdown on SIGTERM / SIGINT', () => {
    assert.ok(
      serverCode.includes('SIGINT') && serverCode.includes('SIGTERM'),
      'scripts/server.js lacks graceful shutdown signal handlers'
    );
  });

  it('Test 3.24: scripts/build.js must execute pre-commit dry-run verification mode via --dry-run', () => {
    assert.ok(
      buildCode.includes('--dry-run') || buildCode.includes('dryRun'),
      'scripts/build.js does not support non-destructive --dry-run validation'
    );
  });

  it('Test 3.25: scripts/build.js must generate www/clean-build-timestamp.lock file', () => {
    const lockFile = path.join(wwwDir, 'clean-build-timestamp.lock');
    assert.ok(
      fs.existsSync(lockFile),
      'scripts/build.js does not write clean-build-timestamp.lock to certify atomic rebuild'
    );
  });

  it('Test 3.26: scripts/build.js must generate android-build.lock in android/ root', () => {
    const androidLock = path.join(rootDir, 'android', 'android-build.lock');
    assert.ok(
      fs.existsSync(androidLock),
      'scripts/build.js does not generate android-build.lock to certify native asset synchronization'
    );
  });
});
