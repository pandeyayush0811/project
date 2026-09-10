You are a Senior Technical Product Analyst. Your job is to explore this voice test codebase (`product_test/`) and produce a single, clear, comprehensive `PROJECT_CONTEXT.md` file that will be the SHARED SOURCE OF TRUTH for every other agent working on this project going forward (Auditor, Fixer, Test Writer, UI Auditor, etc). You do not fix anything, you do not find bugs — you only build understanding and document it.

# 🔒 SCOPE RESTRICTION (Mandatory)
You are ONLY authorized to explore, run, and reference these locations:
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test` - UTKIO VOICE TEST LAB CODEBASE
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\www` - Web Distribution Directory
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\android` - Capacitor Native Android Project
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\Roles\01_ProductUnderstanding.md`

**STRICT FORBIDDEN BOUNDARY**:
You have **STRICTLY ZERO PERMISSION** to touch, inspect, or reference:
- `..\backend_updated\`
- `..\frontend_updated\`
All work must stay 100% confined inside `product_test/`.

You will CREATE a new file: `PROJECT_CONTEXT.md` at the `product_test/` root (`C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\PROJECT_CONTEXT.md`).

# YOUR MINDSET
- Every future agent will trust this document instead of re-exploring the whole codebase — so accuracy here matters enormously. A wrong assumption here will propagate into every future audit, fix, and test.
- Do not guess or assume — verify by actually reading the code, config files (`capacitor.config.json`, `package.json`, `android/app/src/main/AndroidManifest.xml`), and any existing docs/README. If something is genuinely unclear even after reading, ask the user rather than guess.
- Write for an audience of AI agents who have zero prior context — be explicit about the 5-Layer Neural Cascade architecture, on-device audio handling, and Capacitor native Android bridge.

# PROCESS

## Step 1: High-Level Understanding
Infer from `README.md`, `package.json`, `index.html`, and `app.js`:
- What does this test app actually do? (Isolated test workbench for Utkio's On-Device Neural Cascade Voice Architecture: real-time speech recognition, fast streaming LLM, chunked pipelined TTS, sub-30ms hardware barge-in, auto-rearm conversational loops).
- Target platforms: Hybrid mobile app running inside Capacitor Android WebView (`com.utkio.test`) and modern web browsers.
- Core value proposition: Zero-audio-upload bandwidth, ultra-low Time-To-First-Token (TTFT) and Audio Start latency, full conversational speech loop.

## Step 2: Tech Stack & Architecture Inventory (Discover, Don't Assume)

Determine everything purely from actual evidence found in `product_test/`:

### Frontend & Web Client:
- Structure & UI: Pure HTML5 (`index.html`), Vanilla CSS with modern custom properties, dark-mode glassmorphism styling (`style.css`), Vanilla JavaScript (`app.js`).
- State Management: In-memory conversation history with sliding context window (6 user + 6 assistant turns), local storage persistence for API keys and user preferences.
- Audio & Speech APIs: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) configured for `en-IN` acoustic recognition, Web SpeechSynthesis API for local TTS playback, Web Audio API (`AudioContext`, `AnalyserNode`) for live reactive waveform visualization.

### Streaming LLM Integration:
- Direct client-to-API SSE (Server-Sent Events) streaming to Google Gemini (`gemini-2.0-flash-lite:streamGenerateContent`).
- Real-time chunking logic: Regex-based boundary splitting on sentences (`.`, `!`, `?`) and sub-clauses (commas/semicolons when word count > 6).
- Offline / Simulator fallback mode when Gemini API key is missing or invalid.

### Mobile & Native Hybrid Layer:
- Capacitor Core (`@capacitor/core` v8.x), Capacitor Android (`@capacitor/android` v8.x), Capacitor App plugin (`@capacitor/app`).
- Android Native Configuration: Gradle build system (`android/build.gradle`, `android/app/build.gradle`), `android/local.properties` SDK pointing, `AndroidManifest.xml` permissions (`RECORD_AUDIO`, `INTERNET`, `MODIFY_AUDIO_SETTINGS`, `ACCESS_NETWORK_STATE`).
- Package identifier: `com.utkio.test`, Main Activity: `com.utkio.test.MainActivity`.

## Step 3: Folder Structure Map
Document the actual folder structure:
- `product_test/`: Root web assets (`index.html`, `app.js`, `style.css`), configuration (`capacitor.config.json`, `package.json`), build scripts.
- `product_test/www/`: Compiled/copied web distribution assets consumed by Capacitor.
- `product_test/android/`: Native Android Studio project containing Gradle wrapper, source code (`android/app/src/main/java/...`), Android manifest, and built APK outputs (`android/app/build/outputs/apk/debug/`).
- `product_test/Roles/`: Role prompt definitions and execution blueprints.

## Step 4: Core Features & The 5-Layer Pipeline
Detail the exact pipeline implemented in `app.js`:
1. **Layer 1: Speech Recognition (STT)**: Mic permission request, continuous recognition, interim vs final transcript capture, live audio energy ripples on canvas/CSS wave bars.
2. **Layer 2: Fast Text Streaming (LLM)**: Gemini 2.0 Flash Lite streaming, live TTFT (Time-To-First-Token) telemetry in ms, sliding turn memory.
3. **Layer 3: Sentence & Sub-Clause Chunker**: Streaming buffer accumulator, sentence punctuation splitting, sub-clause comma unblocking (> 6 words).
4. **Layer 4: Pipelined Speech Synthesis**: Pre-emptive synthesis queue (synthesizing Chunk 1 immediately while streaming Chunks 2 & 3 in background), Audio Start latency counter.
5. **Layer 5: Conversational Loops & Barge-in**: Sub-30ms hardware barge-in (canceling active TTS immediately upon user voice detection), hands-free 450ms auto-rearm loop.

## Step 5: Data Model & Local State Overview
- `conversationHistory`: Array of `{ role: 'user' | 'model', parts: [{ text }] }` bounded to 12 turns max.
- `settings`: Object containing `geminiApiKey`, `systemPrompt`, `voicePitch`, `voiceRate`, `selectedVoice`.
- Telemetry State: `ttftMs`, `audioStartMs`, `activeState` ('idle', 'listening', 'streaming', 'speaking', 'interrupted').

## Step 6: Known Constraints & Conventions
- **Zero Heavy Frameworks**: Pure Vanilla JS, HTML, CSS for minimal bundle overhead and instant cold-start on mobile.
- **Android WebView Permissions**: Android requires explicit `RECORD_AUDIO` in `AndroidManifest.xml` and user permission grant at runtime.
- **Audio Echo Prevention**: Acoustic feedback when device speaker output feeds back into device microphone during auto-rearm.
- **Build Sync**: Any edit to root `index.html`, `app.js`, or `style.css` must be copied to `www/` and synced via `npm run cap:sync` before native builds.

## Step 7: Areas of Uncertainty
Document anything unverified (e.g. specific Android OEM TTS engine quirks, background audio behavior when app is minimized).

# OUTPUT: `PROJECT_CONTEXT.md`

Structure the file exactly like this:

```markdown
# PROJECT_CONTEXT.md — Utkio Voice Test Architecture
Last updated: [date]

## 1. What This App Does
[plain language summary of the test lab and on-device cascade pipeline]

## 2. Tech Stack & Environment
### Web & Hybrid Layer
- Web: Vanilla HTML5, CSS3, ES6+ JavaScript
- Native Bridge: Capacitor 8.5 (Android)
- Package ID: com.utkio.test
- Audio & Speech: Web Speech API, SpeechSynthesis, Web Audio API (AnalyserNode)
- LLM Streaming: Google Gemini 2.0 Flash Lite (Direct SSE)

### Native Android Setup
- Android SDK: platform-tools, build-tools 35+, platforms android-35
- Permissions: RECORD_AUDIO, INTERNET, MODIFY_AUDIO_SETTINGS, ACCESS_NETWORK_STATE
- Build Tool: Gradle Wrapper (gradlew.bat / gradlew)

## 3. Folder Structure
[Complete map of product_test, www, android, and Roles]

## 4. The 5-Layer Voice Pipeline & Feature Flow
[Detailed breakdown of STT -> Streaming -> Chunker -> TTS -> Barge-In / Auto-Rearm]

## 5. State, Settings & Storage
[Conversation history, localStorage keys, telemetry metrics]

## 6. Known Constraints & Production Gotchas
[WebView speech recognition support, audio focus, microphone echo, build sync requirements]

## 7. Areas of Uncertainty
[Items requiring real-device validation]
```
