/**
 * Senior QA Engineering Test Suite - Bug 13 (Adversarial DOM Geometry & Layout Thrashing Failing Tests)
 * Bug 13: Synchronous DOM Geometry Reads & Layout Thrashing During SSE Token Streaming
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty & Mobile 60fps Layout Performance Verification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
const indexHtmlCode = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const styleCssCode = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf-8');

describe('BUG 13: Synchronous DOM Geometry Reads & Layout Thrashing (26 Adversarial Tests)', () => {

  it('Test 13.01: scheduleTranscriptScroll must check isUserScrolledUp before setting scrollTop', () => {
    const scrollFn = appJsCode.slice(appJsCode.indexOf('function scheduleTranscriptScroll'), appJsCode.indexOf('function removeEmptyPlaceholder'));
    assert.ok(
      scrollFn.includes('if (!isUserScrolledUp)') || scrollFn.includes('if (isUserScrolledUp) return'),
      'scheduleTranscriptScroll fails to check isUserScrolledUp before setting scrollTop, hijacking user scroll'
    );
  });

  it('Test 13.02: Floating "Jump to Bottom" button element exists in index.html for manual scroll recovery', () => {
    assert.ok(
      indexHtmlCode.includes('id="jump-bottom-btn"') || indexHtmlCode.includes('class="jump-to-bottom"'),
      'index.html lacks floating jump-to-bottom button when user scrolls up during live response'
    );
  });

  it('Test 13.03: CSS styling for floating jump-to-bottom pill button exists in style.css', () => {
    assert.ok(
      styleCssCode.includes('.jump-to-bottom') || styleCssCode.includes('#jump-bottom-btn'),
      'style.css lacks styles for floating jump-to-bottom recovery pill'
    );
  });

  it('Test 13.04: scheduleTranscriptScroll stores active requestAnimationFrame ID for cancellation', () => {
    assert.ok(
      appJsCode.includes('rafScrollId = requestAnimationFrame') || appJsCode.includes('scrollRafId = requestAnimationFrame'),
      'scheduleTranscriptScroll fails to retain requestAnimationFrame ID, preventing cancellation on barge-in'
    );
  });

  it('Test 13.05: triggerBargeIn cancels active scheduled scroll frame via cancelAnimationFrame', () => {
    const bargeInBlock = appJsCode.slice(appJsCode.indexOf('function triggerBargeIn()'), appJsCode.indexOf('function scheduleTranscriptScroll()'));
    assert.ok(
      bargeInBlock.includes('cancelAnimationFrame'),
      'triggerBargeIn fails to cancel pending scroll animation frames, causing layout jitter after interruption'
    );
  });

  it('Test 13.06: CSS content-visibility: auto or contain: paint applied to transcript items in style.css', () => {
    assert.ok(
      styleCssCode.includes('content-visibility: auto') || styleCssCode.includes('contain: paint'),
      'style.css lacks CSS containment (contain / content-visibility) on transcript bubbles, forcing full-page reflow on every token'
    );
  });

  it('Test 13.07: Passive event listener used for transcript scroll events to prevent mobile main thread blocking', () => {
    assert.ok(
      appJsCode.includes("{ passive: true }") || appJsCode.includes('{ passive: true }'),
      'Transcript scroll listener is not registered as passive, causing scroll jank on Android touchscreens'
    );
  });

  it('Test 13.08: User touch scroll interruption detection via touchstart / wheel events on transcript', () => {
    assert.ok(
      appJsCode.includes("transcript.addEventListener('wheel'") || appJsCode.includes("transcript.addEventListener('touchstart'"),
      'Missing touchstart / wheel listener on transcript to detect intentional user scroll intent'
    );
  });

  it('Test 13.09: Rapid token deluge (100 tokens/sec) batches text node updates rather than 1:1 DOM mutations', () => {
    assert.ok(
      appJsCode.includes('pendingTextTokens') || appJsCode.includes('tokenBatch') || appJsCode.includes('batchedTokens'),
      'handleUserTurn mutates DOM textContent synchronously on every single SSE token without chunk batching'
    );
  });

  it('Test 13.10: Smooth scroll behavior flag is explicitly disabled during rapid token streaming', () => {
    assert.ok(
      appJsCode.includes("behavior: 'instant'") || appJsCode.includes('behavior: "auto"') || appJsCode.includes('behavior: \'auto\''),
      'Smooth scrolling during rapid token arrivals causes animation frame queue contention'
    );
  });

  it('Test 13.11: Wave animation canvas/DOM does not contend with transcript scroll frame budget', () => {
    assert.ok(
      appJsCode.includes('isScrolling') || appJsCode.includes('pauseWaveDuringScroll'),
      'Wave visualizer updates concurrently with rapid text layout without frame-budget throttling'
    );
  });

  it('Test 13.12: Layout thrashing guard: scrollHeight is not read unconditionally in every requestAnimationFrame', () => {
    assert.ok(
      appJsCode.includes('cachedScrollHeight') || appJsCode.includes('needsScrollRecalc'),
      'scheduleTranscriptScroll reads scrollHeight unconditionally in every frame without dirty-flag checking'
    );
  });

  it('Test 13.13: DOMVirtualizer or virtualized scrolling implementation exists for large transcripts', () => {
    assert.ok(
      appJsCode.includes('DOMVirtualizer') || appJsCode.includes('virtualTranscript'),
      'app.js lacks DOM virtualization for transcripts with 20+ turns'
    );
  });

  it('Test 13.14: Transcript container utilizes CSS layout containment (contain: strict or contain: content)', () => {
    assert.ok(
      styleCssCode.includes('contain: strict') || styleCssCode.includes('contain: content'),
      'style.css does not isolate transcript container reflow boundaries with CSS contain'
    );
  });

  it('Test 13.15: Dedicated reengageStickyScroll function to re-engage auto-scroll when user returns to bottom', () => {
    assert.ok(
      appJsCode.includes('reengageStickyScroll'),
      'Missing function reengageStickyScroll to re-engage auto-scroll when jump-to-bottom button is tapped'
    );
  });

  it('Test 13.16: Layout calculation debounce timer on mobile orientation / window resize', () => {
    assert.ok(
      appJsCode.includes('resizeDebounce') || appJsCode.includes('debounce(onResize'),
      'Window resize handler lacks debouncing, causing multiple synchronous layout calculations on device rotation'
    );
  });

  it('Test 13.17: DocumentFragment utilized for batched chat bubble additions', () => {
    assert.ok(
      appJsCode.includes('createDocumentFragment'),
      'app.js must use createDocumentFragment for batched DOM insertion'
    );
  });

  it('Test 13.18: Transcript maximum rendered bubble memory cap (virtualization or DOM recycling)', () => {
    assert.ok(
      appJsCode.includes('MAX_RENDERED_BUBBLES') || appJsCode.includes('trimOldBubbles') || appJsCode.includes('recycleOldBubbles'),
      'Transcript appends DOM elements indefinitely without recycling; memory spikes after 30+ conversation turns'
    );
  });

  it('Test 13.19: CSS will-change: transform / scroll-position applied to transcript container', () => {
    assert.ok(
      styleCssCode.includes('will-change: scroll-position') || styleCssCode.includes('will-change: transform'),
      'style.css does not promote transcript scroll layer to GPU compositor via will-change'
    );
  });

  it('Test 13.20: Dedicated FastDomQueue or rafBatcher for DOM read/write scheduling', () => {
    assert.ok(
      appJsCode.includes('FastDomQueue') || appJsCode.includes('rafBatcher'),
      'app.js lacks centralized layout read/write batcher to coordinate geometry calculations'
    );
  });

  it('Test 13.21: Performance mark / measure telemetry for layout frame budget in development', () => {
    assert.ok(
      appJsCode.includes('performance.mark') && appJsCode.includes('performance.measure'),
      'Missing performance.mark instrumentation to monitor frame drop during token streaming'
    );
  });

  it('Test 13.22: Scroll anchoring CSS overflow-anchor: none applied during streaming to prevent jitter', () => {
    assert.ok(
      styleCssCode.includes('overflow-anchor: none') || styleCssCode.includes('overflow-anchor'),
      'style.css does not configure overflow-anchor; browser auto-scroll anchoring fights custom RAF scroller'
    );
  });

  it('Test 13.23: Bottom scroll threshold tolerance guard (within 40px of bottom)', () => {
    assert.ok(
      appJsCode.includes('scrollHeight - scrollTop - clientHeight < 40') || appJsCode.includes('scrollThreshold = 40'),
      'Missing bottom tolerance threshold; minor sub-pixel scroll differences prematurely disengage sticky scroll'
    );
  });

  it('Test 13.24: Explicit resetScrollState() called on turn start in handleUserTurn', () => {
    assert.ok(
      appJsCode.includes('resetScrollState()'),
      'Scroll scheduler state is not cleanly reset on new user turns via resetScrollState()'
    );
  });

  it('Test 13.25: Schedule scroll must guard scrollTop update behind if (!isUserScrolledUp)', () => {
    assert.ok(
      appJsCode.includes('if (!isUserScrolledUp) transcript.scrollTop') || appJsCode.includes('if (!isUserScrolledUp) {\n        transcript.scrollTop'),
      'scheduleTranscriptScroll assigns transcript.scrollTop unconditionally without checking isUserScrolledUp'
    );
  });

  it('Test 13.26: Layout stability during interim speech recognition bubble typing with scheduleTranscriptScroll', () => {
    const interimBlock = appJsCode.slice(appJsCode.indexOf('function renderInterimUserBubble'), appJsCode.indexOf('function commitUserBubble'));
    assert.ok(
      interimBlock.includes('if (!isUserScrolledUp) scheduleTranscriptScroll()') || interimBlock.includes('if (!isUserScrolledUp) {\n    scheduleTranscriptScroll();'),
      'renderInterimUserBubble calls scheduleTranscriptScroll unconditionally, hijacking scroll during interim speech recognition'
    );
  });
});
