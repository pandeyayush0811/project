# PROJECT_CONTEXT.md — Utkio Voice Test Architecture
Last updated: September 12, 2026

---

## 1. What This App Does

**Utkio Voice Test Lab (`product_test/`)** is an isolated, single-page conversational test workbench designed to validate and optimize Utkio's **On-Device Neural Cascade Voice Architecture**.

### The Core Problem It Solves (The Voice AI Impossible Trilemma)
Voice AI platforms historically face an impossible trade-off between **Realtime Latency (<350ms)**, **Human Audio Quality**, and **Low Operating Cost (< ₹0.05 / 15 min session)**:
* Bidirectional Cloud Speech APIs (e.g., Gemini Live WebSocket, GPT-4o Realtime) cost ₹20–₹25 per 15-minute call. At a ₹99/month user subscription, just 5 practice sessions result in a catastrophic -150% gross margin.
* Cloud TTS providers (ElevenLabs, Cartesia) charge per character/minute, introducing network jitter, buffering, and severe cost inflation.
* Standard Android built-in TTS engines produce robotic, mechanical audio that destroys learner immersion and confidence.

### The Solution: The 5-Layer On-Device Neural Cascade
This test harness proves that low-cost, ultra-low latency, human-like voice conversation can be achieved by decoupling the pipeline:
1. **Free Local Listening:** Android native `en-IN` acoustic speech recognition (0 upload bandwidth, ₹0 API cost).
2. **Ultra-Cheap Cloud Thinking:** Google Gemini 2.0 Flash Lite streaming Roman text tokens (Time-To-First-Token ~120ms, cost ~₹0.04 per 15-minute session).
3. **Aggressive Low-Latency Chunking:** Punctuation and sub-clause splitting to unblock speech synthesis after just 3–5 words.
4. **Pipelined Speech Synthesis:** Chunk 1 plays over the speaker while Chunks 2 & 3 synthesize concurrently in the background (Audio Start latency ~300ms–380ms).
5. **Conversational Loops:** Sub-30ms hardware barge-in (instant audio cancellation upon user speech) and hands-free 450ms auto-rearm loop.

The application runs both as a standalone web app and as a native Android hybrid app packaged via Capacitor (`com.utkio.test`).

---

## 2. Tech Stack & Environment

### Web & Hybrid Layer
* **Markup & Structure:** Semantic HTML5 (`index.html`) configured with mobile viewport settings (`viewport-fit=cover`).
* **Design & Styling:** Vanilla CSS3 (`style.css`) using CSS custom properties (tokens), responsive flexbox layouts, mobile-first container constraints (max 480px width), and Utkio's warm paper/cream brand aesthetic (`--bg: #FBF1E6`, `--card: #ffffff`, `--panel-2: #F5ECDF`, `--ink: #23263a`, `--accent: #6a63f1`, `--accent-orange: #d9694b`).
* **Logic & Runtime:** Pure Vanilla JavaScript ES6+ (`app.js`). **Zero heavy frameworks** (No React, Vue, Angular, or Tailwind runtime).
* **Native Hybrid Bridge:** Capacitor Core v8.5.0 (`@capacitor/core`), Capacitor Android v8.5.0 (`@capacitor/android`), Capacitor CLI v8.5.0 (`@capacitor/cli`), Capacitor App v8.1.1 (`@capacitor/app`).
* **Audio & Speech Plugins:**
  * Speech-to-Text: Web Speech API (`window.SpeechRecognition` / `window.webkitSpeechRecognition`).
  * Text-to-Speech (Native Android): `@capacitor-community/text-to-speech` v8.0.2 (`android.speech.tts.TextToSpeech` bridge).
  * Text-to-Speech (Browser Fallback): Web SpeechSynthesis API (`window.speechSynthesis`).
* **LLM Streaming Client:** Direct client-to-API HTTP POST with Server-Sent Events (SSE) streaming (`gemini-2.0-flash-lite:streamGenerateContent?alt=sse`) using native `fetch`, `ReadableStreamDefaultReader`, and `TextDecoder`.
* **Zero-Setup Simulation Mode:** Built-in local streaming simulator generating timed mock tokens when no Gemini API key is configured.

### Native Android Setup
* **Android SDK Location:** `C:\Users\pande\AppData\Local\Android\Sdk` (configured in `android/local.properties`).
* **SDK Version Targets:** (Configured in `android/variables.gradle`):
  * `compileSdkVersion`: **36**
  * `targetSdkVersion`: **36**
  * `minSdkVersion`: **24** (Android 7.0 Nougat+)
* **Dependencies & Support Libraries:**
  * `androidx.appcompat:appcompat:1.7.1`
  * `androidx.coordinatorlayout:coordinatorlayout:1.3.0`
  * `androidx.core:core-splashscreen:1.2.0`
  * `androidx.webkit:webkit:1.14.0`
* **Application Identifiers:**
  * App ID / Namespace: `com.utkio.test`
  * App Name: `Utkio Test`
  * Main Activity: `com.utkio.test.MainActivity` (extends `com.getcapacitor.BridgeActivity`)
* **Permissions (`android/app/src/main/AndroidManifest.xml`):**
  * `android.permission.RECORD_AUDIO`: Microphone access for local speech recognition.
  * `android.permission.INTERNET`: Direct Gemini API streaming.
  * `android.permission.MODIFY_AUDIO_SETTINGS`: Hardware audio routing and volume control.
  * `android.permission.ACCESS_NETWORK_STATE`: Network connectivity monitoring.
* **Build System:** Gradle wrapper (`gradlew.bat` / `gradlew`), with debug APK generation verified at `android/app/build/outputs/apk/debug/app-debug.apk` (~4.2 MB).

---

## 3. Folder Structure

```
product_test/
├── .gitignore
├── capacitor.config.json          # Capacitor configuration (appId: com.utkio.test, webDir: www, androidScheme: https)
├── package.json                   # Project manifest, Capacitor dependencies & scripts
├── package-lock.json
├── index.html                     # Primary UI markup (topbar, telemetry metrics pill, chat card, mic dock, settings modal)
├── app.js                         # Monolithic application logic: STT, LLM streaming, Chunker, TTS driver, Barge-in, Auto-rearm
├── style.css                      # Utkio design tokens, warm theme styling, wave animations, modal styling
├── README.md                      # Architecture summary & test lab overview
│
├── Goal/
│   └── ARCHITECTURAL_VISION.md    # Product manifesto, Impossible Trilemma, ground rules & Ridiculous Honesty mandate
│
├── Roles/                         # Agent instructions & execution playbooks
│   ├── 01_ProductUnderstanding.md # (This role: Senior Technical Product Analyst source instructions)
│   ├── 02_Auditor.md              # Code quality, security, and performance auditor
│   ├── 03_Validator.md            # Plan validator
│   ├── 04_Planner.md              # Technical implementation planner
│   ├── 05_Fixer.md                # Code modification and bug resolution
│   ├── 06_TestWriter.md           # Automated test suite developer
│   ├── 07_FunctionalSanityTester.md # End-to-end sanity tester
│   ├── 21_DeepRegressionInvestigator.md # Regression detection & root-cause analysis
│   ├── 22_ProductionReadinessPanel.md  # Production sign-off panel
│   ├── BugExplainer.md
│   ├── BugVerifier.md
│   ├── CodeStandards.md           # Project coding standards and architectural guardrails
│   └── UI/                        # UI/UX dedicated agent roles
│       ├── 01_UXConventionAuditor.md
│       ├── 02_DesignAuditor.md
│       ├── 03_UIPlanner.md
│       └── 04_UIFixer.md
│
├── www/                           # Capacitor Web Distribution folder (assets copied from root)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
└── android/                       # Native Android Studio project
    ├── build.gradle               # Root project Gradle script
    ├── settings.gradle
    ├── variables.gradle           # SDK and dependency versions (compileSdk 36, minSdk 24)
    ├── local.properties           # Android SDK path
    ├── gradlew / gradlew.bat      # Gradle wrappers
    ├── capacitor-cordova-android-plugins/
    └── app/
        ├── build.gradle           # Application Gradle config (namespace com.utkio.test, dependencies)
        ├── src/main/
        │   ├── AndroidManifest.xml # Permissions (RECORD_AUDIO, INTERNET, MODIFY_AUDIO_SETTINGS, ACCESS_NETWORK_STATE)
        │   ├── java/com/utkio/test/MainActivity.java # BridgeActivity entry point
        │   └── res/               # Android drawables, mipmaps, XML values
        └── build/outputs/apk/debug/app-debug.apk # Built debug APK artifact (~4.2MB)
```

> [!NOTE]
> **Build Scripts Observation:** `package.json` contains scripts `"build": "node scripts/build.js"` and `"start": "node scripts/server.js"`, but there is currently no `scripts/` directory on disk. Asset syncing between root files (`index.html`, `app.js`, `style.css`) and `www/` must be performed directly before running `npx cap sync android`.

---

## 4. The 5-Layer Voice Pipeline & Feature Flow

```
[User Speaks into Mic]
         │
         ▼
[Layer 1: Speech-To-Text (en-IN)] ──► Emits interim transcripts + audio energy ripples
         │ (on final transcript)
         ▼
[Layer 2: Fast Text Streaming] ──► Gemini 2.0 Flash Lite SSE (measures TTFT live)
         │ (streamed token chunks)
         ▼
[Layer 3: Sentence & Clause Chunker] ──► Splits on [.!?\n] or [,;:—] (>3 words first, >6 words next)
         │ (ready sentence/clause chunk)
         ▼
[Layer 4: Pipelined Audio Synthesizer] ──► Native Capacitor TTS / Web SpeechSynthesis (measures Audio Start)
         │ (audio playback finishes)
         ▼
[Layer 5: Conversational Loops]
    ├── Auto-Rearm Loop (Hands-Free): 450ms pause ──► Automatically restarts STT mic
    └── Hardware Barge-In: User speaks during playback ──► Sub-30ms abort of TTS & stream
```

### Layer 1: Speech Recognition (STT)
* Instantiates `window.SpeechRecognition` or `window.webkitSpeechRecognition`.
* Configured with `lang = 'en-IN'` (Indian English acoustic model to handle Indian accents and Hinglish loanwords).
* Set to `continuous = false` to enable natural turn-taking boundaries.
* `interimResults = true`: Interim text renders live in a ghosted bubble (`.line.user.interim`) as the user speaks.
* Once the user stops speaking, `event.results[i].isFinal` fires, sets `userSpeechEndTime = performance.now()`, commits the final user bubble, and triggers `handleUserTurn()`.
* Microphone priming: `navigator.mediaDevices.getUserMedia({ audio: true })` is called on first interaction to prime Android permission prompts before starting speech recognition.
* Wave bar animation simulates energy ripples across 6 responsive bars on either side of the mic button.

### Layer 2: Fast Text Streaming (LLM)
* Dispatches direct HTTP POST request to `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`.
* Default model: `gemini-2.0-flash-lite`.
* Parameters: `temperature: 0.6`, `maxOutputTokens: 90`, `thinkingConfig: { thinkingBudget: 0 }` (zero thinking delay for voice conversation).
* System Prompt ("Bolo"): Persona is a warm, friendly, non-judgmental Indian English peer coach. Limits responses to 1–2 sentences (max 25–30 words) and always concludes with an engaging conversation-continuation question.
* Sliding context window: History is maintained as an array of `{ role, content }` objects bounded to a maximum of 12 items (6 user turns + 6 assistant turns) to ensure response speed and predictable token cost.
* Live Telemetry: As soon as the first text token arrives via SSE, `firstTokenTime` is captured and TTFT is calculated:
  $$\text{TTFT} = \text{firstTokenTime} - \text{userSpeechEndTime}$$
  This is rendered immediately in the `#metricTtft` badge.

### Layer 3: Sentence & Sub-Clause Chunker (`SentenceChunker`)
* Accumulates incoming token chunks from the SSE stream into an internal buffer.
* **Ultra-Fast First Chunk Rule (Zero-Latency Audio Start):**
  * If a full sentence delimiter (`[.!?\n]`) is matched, it emits immediately.
  * If the word count reaches $\ge 3$ and contains a clause delimiter (`[,;:—–-]`), it splits and emits immediately.
  * If the buffer reaches $\ge 5$ words without punctuation, it forces an immediate chunk emission.
* **Subsequent Chunks:**
  * Splits on natural sentence delimiters (`[.!?\n]`).
  * If $\ge 6$ words accumulate without sentence boundary, splits on clause punctuation.
  * Safety fallback: Forces chunk emission if $\ge 9$ words accumulate without any delimiter.
* Flushes any remaining buffer text when SSE stream signals `[DONE]`.

### Layer 4: Pipelined Speech Synthesis
* Emitted chunks enter an execution FIFO queue (`audioQueue`).
* **Pipelined Concurrent Execution:** The audio player does not wait for the entire LLM response to complete. Chunk 1 immediately triggers audio playback while Chunks 2 and 3 are still streaming and parsing.
* **Audio Start Metric:** When Chunk 1 starts emitting sound, `firstAudioTime` is recorded:
  $$\text{Audio Start Latency} = \text{firstAudioTime} - \text{userSpeechEndTime}$$
  Rendered live in the `#metricTts` badge.
* **Unified Dual-Driver Architecture:**
  1. *Native Mobile Driver:* Calls `@capacitor-community/text-to-speech` (`window.Capacitor.Plugins.TextToSpeech.speak()`), binding directly to Android's `android.speech.tts.TextToSpeech` engine with `lang: 'en-IN'`, `rate: 1.10`, `pitch: 1.0`, `category: 'ambient'`.
  2. *Web Fallback Driver:* Calls `window.speechSynthesis.speak()` with `SpeechSynthesisUtterance`, preferring installed `en-IN` or "India" voices.
* **Cold-Start Elimination:** Audio engine preloads cached voices at launch (`preloadVoices()`) and triggers a zero-volume dummy utterance on the first user touch event (`warmTtsEngine()`).
* **Watchdog Protection:** Each synthesized chunk has a watchdog timeout (`Math.max(3000, text.length * 90)ms`) preventing queue lockups if an OEM TTS engine fails to fire completion callbacks.

### Layer 5: Conversational Loops & Barge-in
* **Sub-30ms Hardware Barge-In (`triggerBargeIn()`):**
  * Detected inside `SpeechRecognition.onresult`: If the user speaks while AI is actively speaking or audio is queued, barge-in triggers immediately.
  * Halts native playback via `nativeTts.stop()`.
  * Halts web synthesis via `window.speechSynthesis.cancel()`.
  * Aborts ongoing Gemini HTTP SSE stream via `currentAbortController.abort()`.
  * Clears `audioQueue = []`, resets `isSpeaking = false`, and transitions UI to active listening.
* **Hands-Free Auto-Rearm Loop:**
  * When `audioQueue` is completely drained and AI finishes speaking, the system waits a natural **450ms conversational pause**.
  * If the user has not interacted and mic is idle, `recognition.start()` is called automatically, creating a continuous hands-free phone-call experience.

---

## 5. State, Settings & Storage

### In-Memory Application State
| Variable | Type | Role |
| :--- | :--- | :--- |
| `isListening` | Boolean | True when `SpeechRecognition` is actively recording. |
| `isSpeaking` | Boolean | True when TTS audio output is actively playing. |
| `isThinking` | Boolean | True when awaiting or consuming Gemini streaming tokens. |
| `isPlayingAudio` | Boolean | Queue lock flag indicating audio pipeline is processing an item. |
| `audioQueue` | Array<{ text, isFirstChunk }> | FIFO buffer of text chunks waiting for TTS synthesis. |
| `conversationHistory` | Array<{ role, content }> | Bounded sliding window containing maximum 12 turns (6 user, 6 assistant). |
| `speechStartTime` | Number (ms) | `performance.now()` timestamp when user started speaking. |
| `userSpeechEndTime` | Number (ms) | `performance.now()` timestamp when final transcript was finalized. |
| `firstTokenTime` | Number (ms) | `performance.now()` timestamp when first SSE data token was received. |
| `firstAudioTime` | Number (ms) | `performance.now()` timestamp when first audio chunk began playback. |
| `currentAbortController` | AbortController | Active controller for cancelling pending Gemini fetch streams during barge-in. |

### LocalStorage Keys
* `utkio_test_gemini_key`: User-provided Google Gemini API key (persisted across sessions). If empty, simulator mode activates.
* `utkio_test_model`: Selected model identifier (defaults to `gemini-2.0-flash-lite`, configurable to `gemini-2.0-flash` or `gemini-1.5-flash`).

### Telemetry Performance Metrics
* **TTFT (Time-To-First-Token):** Elapsed time from user silence (`userSpeechEndTime`) to first token arrival. Typical target: **120ms–220ms**.
* **Audio Start:** Elapsed time from user silence (`userSpeechEndTime`) to physical audio playback of Chunk 1. Typical target: **300ms–450ms**.
* **Chunks Count:** Total number of sentence/clause chunks processed during the current conversational turn.

---

## 6. Known Constraints & Production Gotchas

> [!IMPORTANT]
> **Ground Reality vs Architectural Vision (Brutal Honesty Mandate):**
> 1. **System TTS vs On-Device Neural Engine:**
>    - `ARCHITECTURAL_VISION.md` mandates an On-Device Neural TTS engine (such as ONNX-quantized models like Supertonic 3 F2) to replace robotic native TTS with warm, human-like voice.
>    - The current `product_test/` codebase integrates Android's system TTS (`android.speech.tts.TextToSpeech` via `@capacitor-community/text-to-speech`) as its initial test driver.
>    - While this fulfills the **₹0 usage cost** and **zero audio download bandwidth** criteria, standard OEM system voices remain noticeably mechanical. Upgrading to a true embedded neural runtime (ONNX / WebAssembly) inside the app is the primary next milestone.
> 2. **Android WebView Speech Recognition (`webkitSpeechRecognition`):**
>    - In Capacitor Android WebView, `webkitSpeechRecognition` delegates to the device's Google Speech Services.
>    - If a user disables Google app speech recognition, or uses a stripped Chinese OEM ROM (some MIUI, ColorOS, or Vivo builds lacking pre-installed Google speech packages), `webkitSpeechRecognition` will throw a `not-allowed` or `service-not-allowed` error.
> 3. **Microphone Acoustic Echo on Auto-Rearm:**
>    - When the auto-rearm loop activates after 450ms, if the device speaker volume is high and the physical room has reverberation, the microphone can occasionally catch the echo tail of the AI's last spoken syllable, triggering a phantom user turn.
> 4. **Barge-In Latency in Web Speech:**
>    - `triggerBargeIn()` is currently hooked into `SpeechRecognition.onresult`. Because `SpeechRecognition` requires 100ms–250ms of audio before emitting the first interim transcript event, true "sub-30ms hardware barge-in" requires a native Android audio amplitude / VAD listener rather than waiting for speech recognition tokens.
> 5. **Build Asset Synchronization:**
>    - Editing `index.html`, `app.js`, or `style.css` at the project root does **not** automatically update the Android APK. Root assets must be copied to `www/` and synced via `npx cap sync android` before running Gradle builds.

---

## 7. Areas of Uncertainty (Requiring Real-Device Validation)

1. **Android Audio Focus Contention:**
   - How `android.speech.tts.TextToSpeech` and `SpeechRecognition` interact with background media players, incoming phone calls, and Bluetooth headsets (HFP vs A2DP profiles) needs real-hardware matrix testing.
2. **OEM Background Throttling & WebView Suspension:**
   - Behavior when the app is minimized or the screen turns off during an active practice conversation. Capacitor apps may pause JavaScript timers and SSE streams unless a foreground service with wake locks is declared.
3. **Packaging Strategy for Embedded Neural Weights:**
   - Bundling an on-device ONNX neural TTS engine requires packaging 40MB–100MB of quantized model weights. Strategy for APK size optimization (dynamic feature delivery vs in-app first-launch download to local app cache) remains to be finalized.
4. **Android WebView Microphone Permission Grants:**
   - Although `RECORD_AUDIO` is declared in `AndroidManifest.xml`, Capacitor WebView requires both the Android OS runtime permission dialog and WebKit's internal permission prompt (`android.webkit.PermissionRequest`).
