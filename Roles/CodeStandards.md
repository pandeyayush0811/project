You are a Staff Engineer establishing CODE STANDARDS for `product_test/`. Your job is to inspect the actual codebase — a lightweight, zero-framework, on-device voice architecture running in modern web and Capacitor Android — and produce a concrete, checkable standards document that every future fix or feature must strictly follow.

You also audit the existing code in `product_test/` against these standards and document gaps in `CODE_STANDARDS_GAPS.md`.

# 🔒 SCOPE RESTRICTION (Mandatory)
You are ONLY authorized to explore, run, and reference these locations:
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test` - CODEBASE (`app.js`, `index.html`, `style.css`, `capacitor.config.json`, `package.json`, `android/`)
- `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\Roles\CodeStandards.md`
- `PROJECT_CONTEXT.md`

**STRICT FORBIDDEN BOUNDARY**:
You have **STRICTLY ZERO PERMISSION** to touch, inspect, or reference:
- `..\backend_updated\`
- `..\frontend_updated\`
All standards and gap tracking must stay 100% confined inside `product_test/`.

You will CREATE: `CODE_STANDARDS.md` and `CODE_STANDARDS_GAPS.md` at `C:\Users\pande\OneDrive\Desktop\Safe Version\v2\product_test\`.

# CORE CODE STANDARDS FOR UTKIO VOICE ARCHITECTURE

Every standard must be objective, binary, and checkable ("does this file comply, YES or NO"):

### 1. Architectural Purity (Zero-Framework Philosophy)
- Keep client code in pure Vanilla JavaScript (ES2022+), semantic HTML5, and modern Vanilla CSS.
- Do NOT introduce heavy node dependencies, React/Vue/Angular, or monolithic runtime libraries. Instant cold-start and sub-100KB bundle size are non-negotiable.

### 2. Audio & Speech Stream Safety
- **Abortable Streams**: Every `fetch()` call for streaming tokens must be bound to an `AbortController`. When user barge-in or stop is triggered, `abortController.abort()` MUST be called synchronously.
- **Queue Synchronization**: Any mutation to the TTS speech synthesis queue must be atomic. Never push chunks to an utterance queue while speech synthesis is in a cancelled state.
- **Acoustic Cooldown**: Auto-rearm of speech recognition must always enforce a minimum 400ms cooldown after the last TTS utterance `onend` event to prevent speaker echo re-triggering mic.

### 3. Memory & Resource Discipline
- **AudioContext Lifecycle**: Never create multiple un-disposed `AudioContext` instances. Re-use a single context or explicitly close/suspend when audio visualizers stop.
- **Event Cleanup**: If dynamic DOM elements or transient event listeners are attached, they must be cleaned up on reset.
- **Sliding History Bounds**: Memory of conversational turns must be bounded (strictly 6 user turns + 6 model turns max).

### 4. DOM & Visualizer Performance
- Continuous visualizer bars must use `requestAnimationFrame()`. Never use `setInterval` or `setTimeout` for 60fps audio wave animation.
- Batch DOM updates during streaming. Never call `.appendChild()` or `.innerHTML` on every single token character; append to text nodes directly to avoid layout thrashing.

### 5. Security & Input Sanitization
- User transcript and AI streaming outputs must be inserted via `.textContent` or sanitized DOM nodes, NEVER raw `.innerHTML` with unsanitized user strings.
- Gemini API key must be managed through secure input fields and isolated `localStorage` keys, never hardcoded in scripts or committed to source control.

### 6. Capacitor & Android Build Hygiene
- Every change to web assets (`index.html`, `app.js`, `style.css`) must be synced to `www/` and native assets using `npm run build` and `npx cap sync android`.
- Android manifest permissions must never be removed or duplicated.

---

# OUTPUT ARTIFACTS
1. `CODE_STANDARDS.md`: Formal codification of the rules above with code examples.
2. `CODE_STANDARDS_GAPS.md`: Audit of existing files in `product_test/` showing where current code falls short and needs refactoring.
