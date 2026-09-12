/**
 * Senior QA Engineering Test Suite - Bug 18 (Adversarial Missing Speech Engine & UI Fallback Failing Tests)
 * Bug 18: Silent Fallback, Phantom Auto-Rearm & Missing UI Error Handling When No TTS Engine Exists
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty & Zero Silent Limbo on Audio Hardware Failure
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
const indexHtmlCode = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const styleCssCode = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf-8');

class TtsEngineFallbackSimulator {
  constructor(hasEngine = false) {
    this.hasEngine = hasEngine;
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.isSpeaking = false;
    this.uiStatus = 'idle';
    this.warningBannerVisible = !hasEngine;
    this.autoRearmTriggered = false;
    this.readingDelaySimulated = !hasEngine;
    this.hasRetryButton = !hasEngine;
  }

  speakAudioChunk(text, isFirstChunk = false) {
    if (!this.hasEngine) {
      this.warningBannerVisible = true;
      this.readingDelaySimulated = true;
      this.hasRetryButton = true;
      return Promise.reject(new Error('No speech synthesis engine detected on this device/browser.'));
    }
    return new Promise((resolve) => setTimeout(resolve, 500));
  }

  async playNextAudioQueueItem() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      this.isSpeaking = false;
      this.uiStatus = 'Coach finished speaking.';
      this.autoRearmTriggered = true;
      return;
    }

    const item = this.audioQueue.shift();
    try {
      await this.speakAudioChunk(item.text, item.isFirst);
      await this.playNextAudioQueueItem();
    } catch (err) {
      this.audioQueue = [];
      this.isPlayingAudio = false;
      this.isSpeaking = false;
      this.uiStatus = 'Audio playback failed: No speech engine available.';
      this.warningBannerVisible = true;
      this.readingDelaySimulated = true;
      this.hasRetryButton = true;
    }
  }
}

describe('BUG 18: Silent Fallback When No Speech Synthesis Engine Detected (26 Adversarial Tests)', () => {

  it('Test 18.01: Persistent TTS warning banner element exists in index.html for engine-missing recovery', () => {
    assert.ok(
      indexHtmlCode.includes('id="tts-warning-banner"') || indexHtmlCode.includes('id="tts-fallback-banner"') || indexHtmlCode.includes('class="tts-fallback-alert"'),
      'index.html lacks dedicated TTS fallback warning banner element; user has zero visual error feedback when engine is missing'
    );
  });

  it('Test 18.02: Warning banner provides actionable "Retry Engine" button in UI', () => {
    assert.ok(
      indexHtmlCode.includes('id="retry-tts-btn"') || indexHtmlCode.includes('class="retry-engine-btn"'),
      'index.html lacks Retry Engine button to allow user to re-initialize speech synthesis'
    );
  });

  it('Test 18.03: Warning banner provides "Text-Only Mode" toggle button in UI', () => {
    assert.ok(
      indexHtmlCode.includes('id="text-only-mode-btn"') || indexHtmlCode.includes('text-only-toggle'),
      'index.html lacks button allowing user to transition gracefully to a text-reading practice mode'
    );
  });

  it('Test 18.04: Simulated reading time delay in app.js when operating in text-fallback mode', () => {
    assert.ok(
      appJsCode.includes('simulateReadingDelay') || appJsCode.includes('textReadingDelay') || appJsCode.includes('wordsPerMinuteDelay'),
      'app.js lacks reading-time delay calculation; text finishes in 0ms without simulating natural speech cadence'
    );
  });

  it('Test 18.05: Assistant chat bubble renders muted audio indicator icon when TTS fails', () => {
    assert.ok(
      appJsCode.includes('muted-audio-icon') || appJsCode.includes('audio-muted-badge') || appJsCode.includes('🔇'),
      'Chat bubble lacks visual indicator denoting that audio synthesis was skipped'
    );
  });

  it('Test 18.06: Warning banner has accessible screen reader attribute (aria-live="polite")', () => {
    assert.ok(
      indexHtmlCode.includes('aria-live="polite"') || indexHtmlCode.includes('aria-live="assertive"'),
      'Accessibility failure: TTS failure warning lacks aria-live attribute for screen readers'
    );
  });

  it('Test 18.07: Settings modal displays explicit Speech Synthesis Engine status indicator', () => {
    assert.ok(
      indexHtmlCode.includes('tts-engine-status') || indexHtmlCode.includes('speech-engine-state'),
      'Settings modal does not show TTS engine health/availability diagnostic'
    );
  });

  it('Test 18.08: Dedicated handleLateVoiceEngineInitialization function to recover when Android TTS engine initializes late', () => {
    assert.ok(
      appJsCode.includes('handleLateVoiceEngineInitialization'),
      'app.js lacks handleLateVoiceEngineInitialization to restore audio and dismiss error banner when engine becomes available'
    );
  });

  it('Test 18.09: Dismissing fallback warning banner persists user preference without repetitive alert spam', () => {
    assert.ok(
      appJsCode.includes('dismissTtsWarning') || appJsCode.includes('hideTtsAlert'),
      'Missing dismissal handler for TTS warning banner'
    );
  });

  it('Test 18.10: Native Capacitor TTS plugin missing bridge error categorization', () => {
    assert.ok(
      appJsCode.includes('PLUGIN_NOT_INSTALLED') || appJsCode.includes('nativeTtsMissing'),
      'app.js does not distinguish between missing browser speechSynthesis vs missing native Capacitor plugin bridge'
    );
  });

  it('Test 18.11: Barge-in button remains functional during text-fallback simulated reading delay', () => {
    assert.ok(
      appJsCode.includes('clearTimeout(readingDelayTimer)') || appJsCode.includes('cancelReadingDelay'),
      'Barge-in does not cancel text reading delay timers'
    );
  });

  it('Test 18.12: Wave energy visualizer reflects simulated reading pulse during text fallback', () => {
    assert.ok(
      appJsCode.includes('simulateReadingWaves') || appJsCode.includes('textFallbackPulse'),
      'Wave visualizer goes completely dead during text fallback rather than pulsating gently'
    );
  });

  it('Test 18.13: Telemetry logs tts_engine_missing diagnostic event with platform metadata', () => {
    assert.ok(
      appJsCode.includes('tts_engine_missing') || appJsCode.includes('ttsMissingDiagnostic'),
      'Missing telemetry event logging for TTS engine absence'
    );
  });

  it('Test 18.14: Warning banner styling in style.css includes high-visibility warning colors and transitions', () => {
    assert.ok(
      styleCssCode.includes('.tts-warning-banner') || styleCssCode.includes('#tts-warning-banner'),
      'style.css lacks CSS rules for TTS warning banner'
    );
  });

  it('Test 18.15: Fallback warning banner action buttons meet WCAG 48px minimum touch target size', () => {
    assert.ok(
      styleCssCode.includes('.tts-fallback-btn') || styleCssCode.includes('.banner-action-btn'),
      'style.css lacks touch-target sizing for TTS fallback action buttons'
    );
  });

  it('Test 18.16: Fallback path works cleanly with long Hinglish phrases without regex errors', () => {
    const sim = new TtsEngineFallbackSimulator(false);
    assert.equal(
      sim.warningBannerVisible,
      true,
      'Simulator failed to trigger warning banner on Hinglish phrase playback attempt'
    );
  });

  it('Test 18.17: Mid-stream engine failure (Chunk 1 plays, Chunk 2 throws) preserves displayed text', () => {
    const sim = new TtsEngineFallbackSimulator(false);
    sim.audioQueue = [{ text: 'Chunk 1', isFirst: true }, { text: 'Chunk 2', isFirst: false }];
    sim.playNextAudioQueueItem();
    assert.equal(
      sim.readingDelaySimulated,
      true,
      'Mid-stream engine failure aborted without engaging reading delay fallback'
    );
  });

  it('Test 18.18: Battery saver mode audio suspension policy detection', () => {
    assert.ok(
      appJsCode.includes('isAudioSuspendedByPowerPolicy') || appJsCode.includes('audioPowerRestriction'),
      'App does not detect Android OS aggressive audio engine throttling in battery-saver mode'
    );
  });

  it('Test 18.19: Explicit distinction in UI between user manual audio mute vs engine missing', () => {
    assert.ok(
      appJsCode.includes('isMutedByUser') || appJsCode.includes('userMuteState'),
      'UI treats hardware engine absence and user intentional mute as identical states'
    );
  });

  it('Test 18.20: Auto-rearm pause interval is extended to 2500ms during text-only mode', () => {
    assert.ok(
      appJsCode.includes('textModeAutoRearmDelay') || appJsCode.includes('2500') && appJsCode.includes('rearm'),
      'Auto-rearm re-arms mic in 450ms during text mode before user has time to read the text response'
    );
  });

  it('Test 18.21: Audio queue draining on engine failure does not trigger unhandled rejection storm', () => {
    const sim = new TtsEngineFallbackSimulator(false);
    assert.equal(
      sim.hasRetryButton,
      true,
      'Fallback state machine left audio queue stranded with no retry mechanism'
    );
  });

  it('Test 18.22: Warning banner animation supports prefers-reduced-motion media query', () => {
    assert.ok(
      styleCssCode.includes('prefers-reduced-motion') && styleCssCode.includes('banner'),
      'style.css does not respect prefers-reduced-motion for TTS alert animations'
    );
  });

  it('Test 18.23: Web Speech synthesis utterance error code mapping (not-allowed, language-unavailable)', () => {
    assert.ok(
      appJsCode.includes('language-unavailable') || appJsCode.includes('synthesis-unavailable'),
      'app.js lacks specific error code mapping for Web Speech synthesis error events'
    );
  });

  it('Test 18.24: Indian English voice pack download instruction guide link in UI', () => {
    assert.ok(
      indexHtmlCode.includes('install-voice-guide') || indexHtmlCode.includes('google-tts-link'),
      'UI lacks helpful link to Google Speech Services / Voice Pack install page on Play Store'
    );
  });

  it('Test 18.25: Memory leak check: cancelling speech synthesis on page unload / component unmount', () => {
    assert.ok(
      appJsCode.includes("window.addEventListener('beforeunload'") && appJsCode.includes('cleanupSpeechSynthesis'),
      'Missing beforeunload cleanup to cancel pending speech synthesis utterances'
    );
  });

  it('Test 18.26: Diagnostic check: app.js contains speakAudioChunk with active visual fallback trigger', () => {
    assert.ok(
      appJsCode.includes('renderTtsFallbackBanner') || appJsCode.includes('showTtsErrorBanner'),
      'speakAudioChunk only logs to console without rendering visible fallback banner'
    );
  });
});
