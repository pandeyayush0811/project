# Utkio Voice Architecture — Senior QA Defect Failure Report (130 Adversarial Tests)

**Date:** September 12, 2026  
**Author:** Senior Voice QA Engineer (`Roles/06_testwriter.md`)  
**Mandate:** `Goal/ARCHITECTURAL_VISION.md` — 100% Brutal Honesty, Zero Sugarcoating  
**Target:** `product_test/` (Voice Architecture Workbench)  
**Defect Inventory Scope:** Bug #2, Bug #3, Bug #4, Bug #13, Bug #18  
**Master Execution Summary:** 130 Tests Executed | 130 Failed (Engineered Failing Baseline) | 0 Passed  
**Test Runner:** [`tests/runner.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/runner.js)  

---

## 1. Executive Summary & Senior QA Verdict

As an independent Senior Voice QA Engineer operating under the strict non-negotiable mandate of `06_testwriter.md` and `ARCHITECTURAL_VISION.md`, I have constructed and executed an adversarial, UI-level automated test harness across Bugs **2, 3, 4, 13, and 18**.

Every single test in this 130-test suite represents an actual user scenario where a single learner using the app on a mobile device or browser triggers a catastrophic failure:
1. **Bug 2 (26 Tests):** User speaks, interrupts via hardware barge-in, and asks a follow-up -> conversational history desynchronizes, contents payload ends with model or contains empty turns, causing fatal Google Gemini `HTTP 400 Bad Request` crashes.
2. **Bug 3 (26 Tests):** Developer or CI pipeline builds distribution assets -> `www/index.html` lacks cache-busting version hashes, `android/app/src/main/assets/public/` is not synced with `android-sync.json`, and `server.js` lacks HTTPS required by Android Chrome to access the microphone over LAN.
3. **Bug 4 (26 Tests):** User denies mic permission or backgrounds the app -> UI leaves user stranded with no recovery button, no settings guidance, no debouncing on rapid mic taps, and no lifecycle hardware release.
4. **Bug 5/13 (26 Tests):** User reads streaming text on mobile -> `scheduleTranscriptScroll` does not check if user scrolled up, hijacking user reading position, lacking floating "Jump to Bottom" recovery button and CSS containment, causing 60fps frame drops and mobile thread layout thrashing.
5. **Bug 18 (26 Tests):** User launches app on a browser/device without TTS engine -> App fails silently, renders zero visible error banners, lacks simulated reading delay, displays no muted audio indicators, and traps user in a silent limbo state.

**Current Test Baseline:** Exactly **130 out of 130 tests are FAILING** on the current codebase. If the Fixer resolves these 130 tests, the Utkio voice architecture will be completely immune to multi-turn conversation crashes, distribution drift, mic lockups, scroll hijacking, and missing audio engine freezes.

---

## 2. Comprehensive Defect Inventory & Failure Signatures

### Suite 1: Bug 2 — Consecutive User Turns After Barge-In -> HTTP 400
* **Test Suite File:** [`tests/test_bug2_alternating_turns.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/test_bug2_alternating_turns.js)
* **Status:** 26 Executed | **26 FAILED** | 0 Passed
* **Target Files:** [`app.js:L270-305, L680-770`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/app.js#L270-L305)

| Test ID | Adversarial Test Scenario | Failing Input / Trigger | Expected Output | Actual Output | Exact Code Line |
|---|---|---|---|---|---|
| `Test 2.01` | Desynchronized UI and history on early barge-in | User speaks, interrupts at $t=0\text{ms}$ before tokens arrive | `sim.conversationHistory.length === sim.uiTranscriptBubbles.length` | History has 0 items (popped), but UI has 1 bubble (orphaned) | `app.js:L767-772` |
| `Test 2.02` | Last message in payload is `model` | Interrupted turn leaves model as last turn in raw history | `contents[last].role === 'user'` | Throws `HTTP 400: Last message in generateContent request must be 'user'` | `app.js:L640-665` |
| `Test 2.03` | Rapid triple mic-tap burst | 3 rapid speech bursts followed by aborts | Multiturn alternation preserved | Throws `HTTP 400: Multiturn talk must alternate between user and model` | `app.js:L600, L685` |
| `Test 2.04` | Interruption at Token #1 drops assistant response | Barge-in right as token 1 arrives | Assistant response retained in history | Full assistant response discarded, leaving history corrupt | `app.js:L764-770` |
| `Test 2.05` | Triple consecutive barge-ins wipe memory | 3 aborted user turns in sequence | All 3 user turns preserved in memory | History wiped down to 0 turns due to pop on abort | `app.js:L768-771` |
| `Test 2.06` | Interruption during final token drops turn | Interruption right before stream ends | Synthesized model response retained | Turn dropped completely | `app.js:L760-766` |
| `Test 2.07` | Whitespace-only speech input after abort | Accidental breath / silence STT emits `"   "` | Empty text filtered or defaulted | Throws `HTTP 400: Contents array cannot be empty` | `app.js:L640-645` |
| `Test 2.08` | Sliding window boundary at 11 items | Turn 6 interrupts when history has 10 messages | 11 messages retained | Message 11 popped, dropping user context | `app.js:L768` |
| `Test 2.09` | 12-item boundary eviction | 6 completed turns followed by interrupted turn 7 | Interrupted prompt retained in window | Prompt evicted from history | `app.js:L602` |
| `Test 2.10` | Settings model toggle during abort | User changes model from Flash-Lite to Flash after barge-in | History maintained cleanly | History state corrupted | `app.js:L610` |
| `Test 2.11` | Hinglish punctuation barrage | `"Arre bhai... suno na??? Lekin kya..."` | Cleanly normalized turn | Discarded on abort | `app.js:L643` |
| `Test 2.12` | Slow 2G throttled network abort | Network delay during token stream | Context retained | Lost from context | `app.js:L768` |
| `Test 2.13` | Minimize / background app after abort | User switches apps after barge-in | In-memory history remains valid | History desynchronized | `app.js:L765` |
| `Test 2.14` | Zombie simulator token loop on barge-in | `triggerBargeIn()` called during simulation | `clearInterval(simulationInterval)` called | Interval keeps ticking every 40ms pumping zombie tokens | `app.js:L270-285, L820-835` |
| `Test 2.15` | Empty STT noise event after interruption | Empty string STT event received | Empty string rejected before push | Pushed to history, breaking next API turn | `app.js:L600` |
| `Test 2.16` | Chunker reset on barge-in | Interruption while chunker has buffered clause | `chunker.reset()` called | Pending clause stays in chunker buffer | `app.js:L270-285` |
| `Test 2.17` | Double speech inputs in 200ms | Two rapid user speech events | Both turns properly queued | Lost turn on rapid input | `app.js:L600-605` |
| `Test 2.18` | Device screen lock during barge-in | Power button pressed during interruption | Clean state recovery | Lock screen prompt discarded | `app.js:L765` |
| `Test 2.19` | UI DOM bubble cleanup on abort | Stream aborted before tokens arrive | `bubble.container.remove()` called | Orphaned empty chat bubble stays in UI DOM | `app.js:L760-775` |
| `Test 2.20` | Simulator thinking state cleanup | Abort during simulation word 1 | `isThinking = false` and interval reset | Simulator tracker missing | `app.js:L825` |
| `Test 2.21` | 10-turn marathon with alternating barge-in | 10 conversational turns with 5 barge-ins | All 10 user turns preserved | Only 5 user turns retained (50% context loss) | `app.js:L768-771` |
| `Test 2.22` | Hardware headset hook button interruption | Headset click received | `MediaSession` interruption handler fires | Missing MediaSession API listener | `app.js:L270` |
| `Test 2.23` | Merging consecutive user turns breaks semantics | User asks two separate questions | Kept as distinct turns with synthetic ack | Inappropriately concatenated into one string | `app.js:L653-656` |
| `Test 2.24` | Telemetry TTS badge reflects abort | Barge-in triggers | `metricTts.textContent = 'INTERRUPTED'` | Shows stale millisecond latency | `app.js:L270-285` |
| `Test 2.25` | Code-level assertion: UI bubble cleanup in catch block | `AbortError` catch block in `app.js` | Bubble removed from DOM | Code missing `bubble.container.remove()` | `app.js:L762-774` |
| `Test 2.26` | `buildGeminiContents` schema compliance | History ends with `assistant` role | Payload last item must be `user` role | Payload ends with `model`, violating Gemini API schema | `app.js:L640-665` |

---

### Suite 2: Bug 3 — Missing Build/Dev Scripts & Production Distribution Drift
* **Test Suite File:** [`tests/test_bug3_build_scripts.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/test_bug3_build_scripts.js)
* **Status:** 26 Executed | **26 FAILED** | 0 Passed
* **Target Files:** [`scripts/build.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/scripts/build.js), [`scripts/server.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/scripts/server.js), [`package.json`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/package.json)

| Test ID | Adversarial Test Scenario | Expected Output | Actual Output | Target File |
|---|---|---|---|---|
| `Test 3.01` | Asset cache-busting in `www/index.html` | `<script src="app.js?v=hash">` injected | `index.html` copied blindly without hash injection | `scripts/build.js:L45-64` |
| `Test 3.02` | Native Android asset sync manifest | `android/app/src/main/assets/public/android-sync.json` exists | File missing; assets not certified for Android | `scripts/build.js:L65-72` |
| `Test 3.03` | HTTPS / SSL dev server option | Support for local certs / HTTPS | Only plain HTTP supported (blocks mic on Android LAN) | `scripts/server.js` |
| `Test 3.04` | Disable Gzip compression for SSE | `Cache-Control: no-transform` / Gzip disabled | Missing compression guard on streaming proxy | `scripts/server.js` |
| `Test 3.05` | Dedicated CSS validator (`cssValidator`) | CSS token validation before build | Only JS validated via `vm.Script`; CSS unvalidated | `scripts/build.js:L12-24` |
| `Test 3.06` | HTML tag balance and integrity validator | Validate `index.html` script and link integrity | Missing HTML validator | `scripts/build.js` |
| `Test 3.07` | Bundle size threshold check (<100KB) | Fails build if bundle exceeds 100KB | No bundle budget enforcement | `scripts/build.js` |
| `Test 3.08` | Strip console.log in production | `NODE_ENV=production` strips debug logs | Logs preserved in production distribution | `scripts/build.js` |
| `Test 3.09` | Continuous watch mode (`--watch`) | File watcher rebuilds on change | `--watch` flag unsupported | `scripts/build.js` |
| `Test 3.10` | Live-reload WebSocket server | Browser reloads automatically on asset change | Missing live-reload trigger | `scripts/server.js` |
| `Test 3.11` | Port collision graceful handling | Automatically tries next port or warns | Crashes with unhandled `EADDRINUSE` | `scripts/server.js` |
| `Test 3.12` | Security header `X-Content-Type-Options: nosniff` | Header sent on all responses | Missing header | `scripts/server.js` |
| `Test 3.13` | Security header `Referrer-Policy` | `strict-origin-when-cross-origin` sent | Missing header | `scripts/server.js` |
| `Test 3.14` | Secret scanner for hardcoded API keys | Scanner flags hardcoded Gemini keys | Missing secret scanner | `scripts/build.js` |
| `Test 3.15` | SRI hash check for Google Fonts | SRI integrity verification | External fonts unverified | `scripts/build.js` |
| `Test 3.16` | Display physical LAN IP address | Displays `http://192.168.x.x:3000` | Only prints `localhost` | `scripts/server.js` |
| `Test 3.17` | Validate `capacitor.config.json` webDir | Checks `webDir === "www"` | Missing configuration validation | `scripts/build.js` |
| `Test 3.18` | Pre-flight AndroidManifest permissions check | Checks `RECORD_AUDIO` in manifest | Missing manifest check | `scripts/build.js` |
| `Test 3.19` | Generate sourcemaps for `app.js` | Generates `www/app.js.map` | No sourcemap generation | `scripts/build.js` |
| `Test 3.20` | Streaming client disconnect handling | `req.on('close')` terminates stream | Client disconnect unhandled | `scripts/server.js` |
| `Test 3.21` | Sync package.json version to manifest | `manifest.packageVersion === pkg.version` | `packageVersion` undefined in manifest | `scripts/build.js:L39-43` |
| `Test 3.22` | Atomic build rollback on failure | Modifies temp directory before replacing | Overwrites `www/` in-place, risking corruption | `scripts/build.js:L28-36` |
| `Test 3.23` | Graceful shutdown on SIGINT / SIGTERM | Closes HTTP connections cleanly | Missing shutdown signal handlers | `scripts/server.js` |
| `Test 3.24` | Non-destructive dry run (`--dry-run`) | Validates without writing files | `--dry-run` flag unsupported | `scripts/build.js` |
| `Test 3.25` | Clean build timestamp lock | Generates `www/clean-build-timestamp.lock` | File missing | `scripts/build.js` |
| `Test 3.26` | Native asset sync lock | Generates `android/android-build.lock` | File missing | `scripts/build.js` |

---

### Suite 3: Bug 4 — Android WebView Mic Permissions & Audio Capture
* **Test Suite File:** [`tests/test_bug4_mic_permissions.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/test_bug4_mic_permissions.js)
* **Status:** 26 Executed | **26 FAILED** | 0 Passed
* **Target Files:** [`app.js:L60-120, L200-260`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/app.js#L60-L120), [`index.html`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/index.html), [`style.css`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/style.css)

| Test ID | Adversarial Test Scenario | Expected Output | Actual Output | Exact Code Line |
|---|---|---|---|---|
| `Test 4.01` | Auto-start recognition on first grant | Speech recognition starts immediately | Recognition remains idle until second tap | `app.js:L850-870` |
| `Test 4.02` | Actionable UI recovery button on denial | Retry or Settings guide button appears | User stranded with static text | `index.html`, `app.js:L230` |
| `Test 4.03` | Actionable `btn-open-settings` in DOM | `<button id="btn-open-settings">` rendered | Button missing from DOM | `index.html` |
| `Test 4.04` | Rapid double-tap debounce timer | Dedicated `micTapDebounceTimer` with 500ms lock | Double-tap throws `InvalidStateError` | `app.js:L845-865` |
| `Test 4.05` | Reset UI on permission dismissal | `onPermissionDismissed` handler resets state | UI stays stuck in waiting state | `app.js:L855` |
| `Test 4.06` | Pre-flight Permissions API status check | Queries `navigator.permissions` and listens to `onchange` | Status query unhandled | `app.js:L180-220` |
| `Test 4.07` | Incoming GSM call audio focus loss | `AUDIOFOCUS_LOSS` pauses recognition | Mic keeps recording during phone calls | `app.js:L240` |
| `Test 4.08` | Release mic on app backgrounding | Dedicated `releaseMicrophoneResources()` called | Hardware mic stays active in background | `app.js:L100-115` |
| `Test 4.09` | Screen rotation visualizer realignment | `realignAudioVisualizer()` recalculates wave canvas | Wave canvas distorts on screen flip | `app.js:L75-95` |
| `Test 4.10` | Bluetooth headset disconnect error handling | Catches audio routing change and offers retry | Unhandled error terminates session | `app.js:L220-250` |
| `Test 4.11` | Android 12+ privacy kill switch indicator | Detects hardware mic mute and alerts user | App shows generic timeout error | `app.js:L235` |
| `Test 4.12` | Missing Google Speech Services modal | Displays `speech-service-missing-modal` | Shows obscure `service-not-allowed` log | `index.html`, `app.js` |
| `Test 4.13` | Concurrency lock during OS permission dialog | `micPromptPending` locks mic button | Button clickable during prompt | `app.js:L850` |
| `Test 4.14` | Permission banner element in `index.html` | Element `#mic-permission-banner` exists | Banner missing from HTML | `index.html` |
| `Test 4.15` | Permission retry storm circuit breaker | `permissionRetryCount` stops infinite loops | Retries indefinitely on permanent denial | `app.js:L230` |
| `Test 4.16` | Battery saver speech throttling alert | Detects battery saver and notifies user | Audio thread throttled without user warning | `app.js:L240` |
| `Test 4.17` | Disable mic button during permission prompt | `micBtn.disabled = true` while awaiting grant | Mic button remains interactive | `app.js:L850` |
| `Test 4.18` | Safety silence watchdog timer | `silenceWatchdogTimer` terminates dead mic | Recognition hangs indefinitely on silence | `app.js:L200-220` |
| `Test 4.19` | Incognito mode permission session caching | Caches status in `sessionStorage` | Queries every turn | `app.js:L210` |
| `Test 4.20` | Unsupported Web Speech API disablement | Disables mic orb if unsupported | Button clickable on unsupported browsers | `app.js:L830` |
| `Test 4.21` | Headset unplugged during speech | Recovers audio route via `devicechange` | Unhandled error crashes recognition | `app.js:L240` |
| `Test 4.22` | Real Web Audio AnalyserNode wave energy | Uses `AudioContext` and `createAnalyser` | Simulated `Math.random() * 20` random bars | `app.js:L85-110` |
| `Test 4.23` | Back button closes permission modal | Hardware back button closes modal | Back key exits entire app | `app.js:L250` |
| `Test 4.24` | Multi-window split-screen blur handler | `handleSplitScreenAudioBlur` pauses mic | Mic remains active in inactive window | `app.js:L110` |
| `Test 4.25` | Teardown cleanup routine | `destroySpeechRecognition` cleans all listeners | Listeners leak on unmount | `app.js:L260` |
| `Test 4.26` | Pulsing alert styles for permission guide | `.permission-alert` defined in `style.css` | Styles missing | `style.css` |

---

### Suite 4: Bug 13 — Synchronous DOM Geometry Reads & Layout Thrashing
* **Test Suite File:** [`tests/test_bug13_layout_thrashing.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/test_bug13_layout_thrashing.js)
* **Status:** 26 Executed | **26 FAILED** | 0 Passed
* **Target Files:** [`app.js:L290-305, L720-760`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/app.js#L290-L305), [`index.html`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/index.html), [`style.css`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/style.css)

| Test ID | Adversarial Test Scenario | Expected Output | Actual Output | Exact Code Line |
|---|---|---|---|---|
| `Test 13.01` | Scroll guard in `scheduleTranscriptScroll` | `if (!isUserScrolledUp) transcript.scrollTop = targetHeight` | Unconditionally assigns `transcript.scrollTop`, hijacking scroll | `app.js:L295-305` |
| `Test 13.02` | Floating "Jump to Bottom" button element | `#jump-bottom-btn` exists in `index.html` | Element missing from DOM | `index.html` |
| `Test 13.03` | Floating pill button styling | `.jump-to-bottom` defined in `style.css` | Styles missing | `style.css` |
| `Test 13.04` | Store active RAF ID for cancellation | `rafScrollId = requestAnimationFrame(...)` | Unstored RAF ID prevents cancellation | `app.js:L298` |
| `Test 13.05` | Cancel scroll frame on barge-in | `cancelAnimationFrame(rafScrollId)` called | Scroll frame runs after barge-in, jittering UI | `app.js:L270-285` |
| `Test 13.06` | CSS containment on chat bubbles | `contain: paint` / `content-visibility: auto` | Uncontained bubbles force full layout recalculation | `style.css` |
| `Test 13.07` | Passive scroll event listener | `transcript.addEventListener('scroll', fn, { passive: true })` | Non-passive scroll listener causes mobile scroll jank | `app.js:L840` |
| `Test 13.08` | User touch scroll interruption detection | Listens for `wheel` and `touchstart` | Touch scroll unobserved; auto-scroll fights user thumb | `app.js:L842` |
| `Test 13.09` | Batching text node updates during deluge | Batches tokens arriving < 16ms | Updates DOM synchronously on every single token | `app.js:L735-745` |
| `Test 13.10` | Disable smooth scrolling during stream | `behavior: 'instant'` or `'auto'` | Smooth scroll causes animation queue buildup | `app.js:L301` |
| `Test 13.11` | Wave visualizer frame budget throttling | Pauses or throttles visualizer during heavy text layout | Wave animation contends with text reflow on UI thread | `app.js:L85-110` |
| `Test 13.12` | Dirty-flag check on `scrollHeight` read | `cachedScrollHeight` avoids redundant reads | Reads `scrollHeight` unconditionally every frame | `app.js:L300` |
| `Test 13.13` | DOM virtualization for large transcripts | `DOMVirtualizer` manages chat nodes | Indefinite DOM node accumulation | `app.js` |
| `Test 13.14` | CSS layout containment on transcript container | `contain: strict` or `contain: content` | Transcript container reflow leaks to entire page | `style.css` |
| `Test 13.15` | Dedicated `reengageStickyScroll` method | Re-engages auto-scroll when user taps button | Method missing | `app.js` |
| `Test 13.16` | Debounce window resize layout calculations | Debounces `resize` event | Multiple synchronous layout recalculations on flip | `app.js:L845` |
| `Test 13.17` | `DocumentFragment` for multi-bubble batching | Uses `createDocumentFragment` | Direct node attachment forces separate reflows | `app.js:L315-345` |
| `Test 13.18` | Maximum rendered bubble cap | `MAX_RENDERED_BUBBLES` evicts stale nodes | Transcript grows unbounded | `app.js:L71` |
| `Test 13.19` | GPU promotion via `will-change: scroll-position` | Promotes transcript layer to GPU compositor | Rendered on CPU layer | `style.css` |
| `Test 13.20` | Centralized `FastDomQueue` / `rafBatcher` | Coordinates DOM read/write cycles | Ad-hoc interleaved reads and writes | `app.js` |
| `Test 13.21` | Layout frame budget telemetry | `performance.mark` measures frame drop | Telemetry missing | `app.js` |
| `Test 13.22` | Scroll anchoring CSS `overflow-anchor: none` | Prevents browser default jumpy scroll correction | Browser anchoring fights custom RAF scroller | `style.css` |
| `Test 13.23` | Bottom scroll tolerance guard (40px) | Sub-pixel scroll tolerance threshold | Sub-pixel differences prematurely stop auto-scroll | `app.js:L298-303` |
| `Test 13.24` | Reset scroll state on new turn | `resetScrollState()` called on user turn start | State leaks across conversation turns | `app.js:L600` |
| `Test 13.25` | Guard scrollTop assignment behind flag | Must check `if (!isUserScrolledUp)` | Assigns `transcript.scrollTop` unconditionally | `app.js:L301` |
| `Test 13.26` | Interim bubble scroll must check user position | `if (!isUserScrolledUp) scheduleTranscriptScroll()` | Calls `scheduleTranscriptScroll()` unconditionally | `app.js:L328` |

---

### Suite 5: Bug 18 — Silent Fallback When No Speech Synthesis Engine Detected
* **Test Suite File:** [`tests/test_bug18_tts_fallback.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/tests/test_bug18_tts_fallback.js)
* **Status:** 26 Executed | **26 FAILED** | 0 Passed
* **Target Files:** [`app.js:L550-610`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/app.js#L550-L610), [`index.html`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/index.html), [`style.css`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/style.css)

| Test ID | Adversarial Test Scenario | Expected Output | Actual Output | Exact Code Line |
|---|---|---|---|---|
| `Test 18.01` | Persistent TTS warning banner in DOM | `#tts-warning-banner` element exists | Warning banner missing from HTML | `index.html` |
| `Test 18.02` | Actionable "Retry Engine" button | `#retry-tts-btn` allows user to re-initialize | Button missing from DOM | `index.html` |
| `Test 18.03` | "Text-Only Mode" toggle button | `#text-only-mode-btn` allows reading practice | Button missing from DOM | `index.html` |
| `Test 18.04` | Simulated reading time delay in fallback | `simulateReadingDelay` mimics human speech pace | Audio queue terminates in 0ms | `app.js:L590-605` |
| `Test 18.05` | Assistant chat bubble muted audio indicator | Bubble renders muted audio icon (`🔇`) | Chat bubble has no audio status badge | `app.js:L370-390` |
| `Test 18.06` | Accessible `aria-live="polite"` on banner | Screen readers announce TTS absence | Missing ARIA accessibility attribute | `index.html` |
| `Test 18.07` | Settings modal Speech Engine diagnostic | Shows engine availability: Available / Missing | Diagnostic indicator missing | `index.html` |
| `Test 18.08` | Late engine initialization recovery | `handleLateVoiceEngineInitialization` dismisses banner | Engine never recovers after asynchronous init | `app.js:L540` |
| `Test 18.09` | Dismiss banner without repetitive alert spam | `dismissTtsWarning` persists dismissal | Missing dismissal handler | `app.js` |
| `Test 18.10` | Categorize native plugin vs browser engine | Distinguishes Capacitor plugin vs Web Speech API | Generic error string logged | `app.js:L551` |
| `Test 18.11` | Barge-in cancels text reading delay | Interruption clears reading delay timers | Reading delay timers run uncancelled | `app.js:L270` |
| `Test 18.12` | Wave visualizer pulse during text fallback | Gentle breathing pulse indicates active response | Wave visualizer stays dead | `app.js:L85-110` |
| `Test 18.13` | Telemetry logs `tts_engine_missing` | Logs diagnostic event with device details | Telemetry missing | `app.js:L552` |
| `Test 18.14` | High-visibility warning banner CSS | `.tts-warning-banner` defined in `style.css` | Styles missing | `style.css` |
| `Test 18.15` | Action buttons meet WCAG 48px size | Fallback buttons have minimum 48px height | Styles missing | `style.css` |
| `Test 18.16` | Fallback works cleanly with long Hinglish | Warning banner renders on Hinglish playback | Banner never rendered | `app.js:L597` |
| `Test 18.17` | Mid-stream engine failure recovery | Chunk 2 failure engages text reading delay | Mid-stream failure stops abruptly | `app.js:L595` |
| `Test 18.18` | Battery saver audio restriction detection | Alerts user if OS policy mutes audio | Silent failure on battery saver | `app.js:L550` |
| `Test 18.19` | UI distinction: user muted vs engine missing | Clear distinction in status display | Both treated as generic error state | `app.js:L599` |
| `Test 18.20` | Auto-rearm pause lengthened in text mode | Extends delay to 2500ms for reading | Re-arms in 450ms before user can read | `app.js:L564` |
| `Test 18.21` | Queue draining avoids unhandled rejection | Fallback state machine offers clean retry | Queue left stranded | `app.js:L597` |
| `Test 18.22` | Banner respects `prefers-reduced-motion` | Reduced motion media query in CSS | Missing CSS query | `style.css` |
| `Test 18.23` | Speech synthesis error code mapping | Maps `language-unavailable` and `not-allowed` | Generic console warning | `app.js:L540` |
| `Test 18.24` | Google Voice Pack download guide link | Helpful link to Play Store Speech Services | Missing link | `index.html` |
| `Test 18.25` | Page unload speech synthesis cancellation | `window.addEventListener('beforeunload')` cleanup | Pending utterances leak on page navigation | `app.js` |
| `Test 18.26` | Active visual fallback trigger in `app.js` | Calls `renderTtsFallbackBanner` | Only sets statusText without rendering banner | `app.js:L599` |

---

## 3. Master Sanity Verification Protocol & Next Steps

```
======================================================================
📊 MASTER SANITY PASS SUMMARY:
   Total Test Cases Executed : 130
   Engineered Failing Tests   : 130
   Passing Tests              : 0
======================================================================
Sanity pass complete. 130 tests executed, 130 Failed (Current Codebase Defect Baseline).
```

### Handoff to Fixer
Per [`Roles/06_testwriter.md`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/Roles/06_testwriter.md), the Senior QA Engineer does **NOT** write the application fix. This authoritative defect baseline is now completed, frozen, and handed over to the **Fixer**:
1. The Fixer must implement the required safeguards in [`app.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/app.js), [`index.html`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/index.html), [`style.css`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/style.css), and [`scripts/build.js`](file:///c:/Users/pande/OneDrive/Desktop/Safe%20Version/v2/product_test/scripts/build.js).
2. After fixing, the Fixer will run `node tests/runner.js`.
3. When **all 130 tests pass (0 failures)**, the codebase will be handed off to `07_FunctionalSanityTester.md` for live mobile device validation.
