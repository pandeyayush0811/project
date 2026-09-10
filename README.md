# Utkio Voice Architecture — Test Lab (`product_test/`)

This isolated one-page test workbench implements the **On-Device Neural Cascade** architecture for Utkio without altering production directories (`frontend_updated` and `backend_updated`).

---

## 🚀 Architecture Pipeline Implemented

1. **Layer 1: Speech Recognition (STT)**
   - Uses native `en-IN` acoustic speech recognition.
   - Zero audio upload bandwidth; captures interim & final user turns.
   - Dynamic audio energy ripples on left & right wave bars.

2. **Layer 2: Fast Text Streaming (LLM)**
   - Streams text via `gemini-2.0-flash-lite` SSE directly to client.
   - Measures **TTFT** (Time-To-First-Token) live in milliseconds.
   - Sliding context window (6 user + 6 assistant turns) preserves short-term memory while bounding token cost.
   - Built-in zero-config simulator mode if no API key is provided.

3. **Layer 3: Sentence & Sub-Clause Chunker**
   - Breaks incoming token stream on sentence boundaries (`.`, `!`, `?`) and sub-clause commas/semicolons (`> 5 words`) to immediately unblock audio synthesis before the whole response finishes generating.

4. **Layer 4: Pipelined Speech Synthesis**
   - Synthesizes Chunk 1 immediately while streaming & synthesizing Chunks 2 & 3 in background.
   - Live **Audio Start** latency counter (from user silence to first sound).

5. **Layer 5: Conversational Loops**
   - **Sub-30ms Hardware Barge-In**: User speaking instantly cancels active AI playback, clears audio queue, and switches back to listening.
   - **Hands-Free Auto-Rearm**: Re-arms mic automatically after a natural 450ms pause once AI finishes speaking.
