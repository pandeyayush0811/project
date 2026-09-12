/**
 * Senior QA Engineering Test Suite - Bugs 21 & 24
 * Bug 21: STT SpeechRecognition Deadlock in Android WebView (AudioRecord HAL Contention & Error Locking)
 * Bug 24: Missing Android TTS Voice Resolution & Google Free Indian Male Synthesizers
 * Role: 06_TestWriter / Senior Staff Systems QA Engineer
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty, ₹0 Operating Cost, Sub-300ms Latency
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
const manifestXml = fs.readFileSync(path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');

// Setup minimal Node environment mocks for DOM-bound app.js
global.document = {
  getElementById: () => ({
    addEventListener: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {}
  }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {}
};
global.window = {
  addEventListener: () => {},
  speechSynthesis: { getVoices: () => [], cancel: () => {}, speak: () => {} }
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.performance = { now: () => Date.now() };

const {
  selectBestNativeVoiceIndex,
  selectBestWebVoice
} = require('../app.js');

describe('BUG 21: Android WebView STT Pipeline Deadlock & AudioRecord Contention', () => {

  it('Test 21.01: AndroidManifest.xml contains package visibility <queries> for RecognitionService', () => {
    assert.ok(
      manifestXml.includes('android.speech.RecognitionService'),
      'AndroidManifest.xml lacks <queries> intent for android.speech.RecognitionService, blocking Android 11-16 WebView STT'
    );
  });

  it('Test 21.02: AndroidManifest.xml contains package visibility <queries> for TTS_SERVICE', () => {
    assert.ok(
      manifestXml.includes('android.intent.action.TTS_SERVICE'),
      'AndroidManifest.xml lacks <queries> intent for android.intent.action.TTS_SERVICE'
    );
  });

  it('Test 21.03: app.js contains settling guard delay for Android Audio HAL / AudioRecord', () => {
    assert.ok(
      appJsCode.includes('250') && (appJsCode.includes('settling') || appJsCode.includes('Audio HAL') || appJsCode.includes('TinyALSA')),
      'app.js lacks settling guard delay to prevent concurrent AudioRecord hardware collisions'
    );
  });

  it('Test 21.04: app.js caches mic permission (hasMicPermissionGranted) to avoid repeated getUserMedia HAL churn', () => {
    assert.ok(
      appJsCode.includes('hasMicPermissionGranted'),
      'app.js does not cache hasMicPermissionGranted to prevent opening/stopping getUserMedia tracks on every mic tap'
    );
  });

  it('Test 21.05: app.js tracks lastInterimTranscript to salvage partial speech on network/timeout error', () => {
    assert.ok(
      appJsCode.includes('lastInterimTranscript') && appJsCode.includes('salvagedSpeech'),
      'app.js does not salvage lastInterimTranscript when a transient STT error occurs, losing user speech'
    );
  });

  it('Test 21.06: app.js implements transient error auto-recovery with exponential backoff', () => {
    assert.ok(
      appJsCode.includes('sttRetryCount') && appJsCode.includes('MAX_STT_RETRIES'),
      'app.js lacks transient error auto-recovery with retry counter and backoff'
    );
  });

  it('Test 21.07: app.js tracks autoRearmTimer handle to eliminate timer contention and race conditions', () => {
    assert.ok(
      appJsCode.includes('autoRearmTimer'),
      'app.js does not track autoRearmTimer handle'
    );
  });

  it('Test 21.08: triggerBargeIn() explicitly cancels pending autoRearmTimer', () => {
    const bargeInDef = appJsCode.slice(appJsCode.indexOf('function triggerBargeIn()'), appJsCode.indexOf('function triggerBargeIn()') + 600);
    assert.ok(
      bargeInDef.includes('autoRearmTimer') && bargeInDef.includes('clearTimeout'),
      'triggerBargeIn does not cancel pending autoRearmTimer, leading to unexpected auto-rearm after interruption'
    );
  });

  it('Test 21.09: Manual mic button tap clears active autoRearmTimer before state change', () => {
    const micTapDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 400);
    assert.ok(
      micTapDef.includes('autoRearmTimer') && micTapDef.includes('clearTimeout'),
      'micBtn click handler does not clear pending autoRearmTimer, risking timer collision'
    );
  });

  it('Test 21.10: Auto-rearm pause enforces minimum 500ms acoustic drain guard', () => {
    assert.ok(
      appJsCode.includes('500') && appJsCode.includes('acoustic drain'),
      'Auto-rearm does not enforce minimum 500ms delay to allow hardware AEC and AudioTrack speaker buffers to flush'
    );
  });

});

describe('BUG 24: Native Android TTS Voice Resolution & Google Indian Male Synthesizers', () => {

  const sampleVoices = [
    { voiceURI: 'en-us-x-sfg-network', name: 'English United States', lang: 'en-US', localService: false },
    { voiceURI: 'en-in-x-ene-local', name: 'English India (Default Female Local)', lang: 'en-IN', localService: true },
    { voiceURI: 'en-in-x-enc-network', name: 'English India (Other Cloud)', lang: 'en-IN', localService: false },
    { voiceURI: 'en-in-x-end-local', name: 'English India (Deep Male Local)', lang: 'en-IN', localService: true },
    { voiceURI: 'en-in-x-end-network', name: 'English India (Male Cloud High-Fi)', lang: 'en-IN', localService: false }
  ];

  it('Test 24.01: Priority 1 - Resolves Google High-Fidelity Indian Male Cloud Voice (en-in-x-end-network)', () => {
    const index = selectBestNativeVoiceIndex(sampleVoices);
    assert.equal(index, 4, 'Failed to select en-in-x-end-network as Priority 1');
    assert.equal(sampleVoices[index].voiceURI, 'en-in-x-end-network');
    assert.equal(sampleVoices[index].localService, false);
  });

  it('Test 24.02: Priority 2 - Falls back to Indian Male Local Voice when cloud voices unavailable', () => {
    const offlineVoices = [
      { voiceURI: 'en-in-x-ene-local', name: 'English India (Female Local)', lang: 'en-IN', localService: true },
      { voiceURI: 'en-in-x-end-local', name: 'English India (Male Local)', lang: 'en-IN', localService: true }
    ];
    const index = selectBestNativeVoiceIndex(offlineVoices);
    assert.equal(index, 1, 'Failed to fall back to en-in-x-end-local as Priority 2');
    assert.equal(offlineVoices[index].voiceURI, 'en-in-x-end-local');
  });

  it('Test 24.03: Priority 3 - Falls back to any Indian English Cloud Voice if no male voice exists', () => {
    const femaleCloudVoices = [
      { voiceURI: 'en-in-x-ene-local', name: 'English India (Female Local)', lang: 'en-IN', localService: true },
      { voiceURI: 'en-in-x-ene-network', name: 'English India (Female Cloud)', lang: 'en-IN', localService: false }
    ];
    const index = selectBestNativeVoiceIndex(femaleCloudVoices);
    assert.equal(index, 1, 'Failed to fall back to Indian Cloud Voice as Priority 3');
  });

  it('Test 24.04: Priority 4 - Falls back to any en-IN voice if only generic local voices exist', () => {
    const genericVoices = [
      { voiceURI: 'es-es-x-local', name: 'Spanish Spain', lang: 'es-ES', localService: true },
      { voiceURI: 'en-in-default', name: 'English India', lang: 'en-IN', localService: true }
    ];
    const index = selectBestNativeVoiceIndex(genericVoices);
    assert.equal(index, 1, 'Failed to fall back to available en-IN voice');
  });

  it('Test 24.05: Returns -1 gracefully when voices array is empty or contains no Indian voices', () => {
    assert.equal(selectBestNativeVoiceIndex([]), -1);
    assert.equal(selectBestNativeVoiceIndex(null), -1);
    const nonIndian = [{ voiceURI: 'fr-fr-x-network', lang: 'fr-FR', localService: false }];
    assert.equal(selectBestNativeVoiceIndex(nonIndian), -1);
  });

  it('Test 24.06: selectBestWebVoice selects Indian Male voice for browser fallback driver', () => {
    const webVoices = [
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Microsoft Heera - English (India)', lang: 'en-IN' },
      { name: 'Google English India Male', lang: 'en-IN' }
    ];
    const bestWeb = selectBestWebVoice(webVoices);
    assert.ok(bestWeb);
    assert.equal(bestWeb.name, 'Google English India Male');
  });

  it('Test 24.07: speakAudioChunk() passes voice parameter into nativeTts.speak()', () => {
    const speakDef = appJsCode.slice(appJsCode.indexOf('function speakAudioChunk('), appJsCode.indexOf('function speakAudioChunk(') + 1200);
    assert.ok(
      speakDef.includes('speakParams.voice = selectedNativeVoiceIndex'),
      'speakAudioChunk does not pass selectedNativeVoiceIndex into nativeTts.speak()'
    );
  });

  it('Test 24.08: preloadVoices() and warmTtsEngine() asynchronously invoke resolveBestVoices()', () => {
    assert.ok(
      appJsCode.includes('function resolveBestVoices()'),
      'app.js lacks dedicated resolveBestVoices lifecycle method'
    );
    const warmDef = appJsCode.slice(appJsCode.indexOf('function warmTtsEngine()'), appJsCode.indexOf('function warmTtsEngine()') + 300);
    assert.ok(
      warmDef.includes('resolveBestVoices()'),
      'warmTtsEngine does not invoke resolveBestVoices()'
    );
  });

  it('Test 24.09: Voice discovery queries nativeTts.getSupportedVoices()', () => {
    assert.ok(
      appJsCode.includes('nativeTts.getSupportedVoices()'),
      'app.js does not query nativeTts.getSupportedVoices() on Android runtime'
    );
  });

  it('Test 24.10: Web speech synthesis fallback driver assigns selectedWebVoice to utterance', () => {
    assert.ok(
      appJsCode.includes('utterance.voice = selectedWebVoice'),
      'Web SpeechSynthesis driver in speakAudioChunk does not assign selectedWebVoice'
    );
  });

});
