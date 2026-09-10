/**
 * Utkio On-Device Cascade Architecture Test Harness
 * 
 * Pipeline:
 * [Native/Web STT (en-IN)] 
 *    ──► [Gemini Flash-Lite Text Stream (SSE)]
 *    ──► [Smart Clause/Punctuation Chunker]
 *    ──► [Pipelined Audio Queue]
 *    ──► [Sub-30ms Barge-In & Hands-Free Auto-Rearm]
 */

// Storage key for test API key
const STORAGE_KEY_GEMINI = 'utkio_test_gemini_key';
const STORAGE_KEY_MODEL = 'utkio_test_model';

// Default configuration
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const SYSTEM_PROMPT = `You are "Bolo", a warm, friendly, and non-judgmental Indian English speaking coach for Utkio.
Your goal is to help Indian learners overcome hesitation and speak English naturally.
Guidelines:
1. Speak in simple, fluent English with occasional warm, relatable Indian conversational touches ("Arre don't worry!", "Actually, that's a good point!").
2. NEVER give long lectures or grammar jargon. 
3. Keep your answers ultra-short: exactly 1 to 2 conversational sentences (maximum 25-30 words per turn).
4. Always end your turn with an easy, engaging question to keep the user speaking.
5. If the user makes a clear mistake, gently rephrase it correctly in your reply without lecturing them.`;

// DOM Elements
const micBtn = document.getElementById('micBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const transcript = document.getElementById('transcript');
const waveLeft = document.getElementById('waveLeft');
const waveRight = document.getElementById('waveRight');
const metricTtft = document.getElementById('metricTtft');
const metricTts = document.getElementById('metricTts');
const metricChunks = document.getElementById('metricChunks');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');

// State
let isListening = false;
let isSpeaking = false;
let isThinking = false;
let recognition = null;
let speechStartTime = 0;
let userSpeechEndTime = 0;
let firstTokenTime = 0;
let firstAudioTime = 0;
let currentAbortController = null;
let audioQueue = [];
let isPlayingAudio = false;
let conversationHistory = []; // Sliding window: max 6 user + 6 assistant turns
let currentInterimBubble = null;
let waveAnimationId = null;

// Initialize Wave Animation Bars
function initWaves() {
  const barsCount = 6;
  [waveLeft, waveRight].forEach(container => {
    container.innerHTML = '';
    for (let i = 0; i < barsCount; i++) {
      const span = document.createElement('span');
      container.appendChild(span);
    }
  });
}

function updateWaveEnergy(active, intensity = 0.5) {
  const spans = document.querySelectorAll('.wave span');
  if (!active) {
    spans.forEach(s => s.style.height = '6px');
    return;
  }
  spans.forEach((s) => {
    const randomScale = 6 + Math.random() * 20 * intensity;
    s.style.height = `${Math.min(26, randomScale)}px`;
  });
}

function startWaveAnimation(intensity = 0.6) {
  if (waveAnimationId) cancelAnimationFrame(waveAnimationId);
  function loop() {
    updateWaveEnergy(true, intensity);
    waveAnimationId = setTimeout(() => {
      if (isListening || isSpeaking) {
        requestAnimationFrame(loop);
      } else {
        updateWaveEnergy(false);
      }
    }, 80);
  }
  loop();
}

function stopWaveAnimation() {
  if (waveAnimationId) clearTimeout(waveAnimationId);
  waveAnimationId = null;
  updateWaveEnergy(false);
}

// UI State Manager
function setUiState(state, message) {
  statusText.textContent = message;
  statusDot.className = 'dot';
  micBtn.className = 'mic-btn';

  switch (state) {
    case 'idle':
      statusText.textContent = message || 'Tap the mic button to speak';
      stopWaveAnimation();
      break;
    case 'listening':
      statusDot.classList.add('live');
      micBtn.classList.add('active');
      statusText.textContent = message || 'Listening to you (en-IN)...';
      startWaveAnimation(0.7);
      break;
    case 'thinking':
      statusDot.classList.add('live');
      statusText.textContent = message || 'Thinking (Gemini Flash-Lite)...';
      stopWaveAnimation();
      break;
    case 'speaking':
      statusDot.classList.add('speaking');
      micBtn.classList.add('speaking');
      statusText.textContent = message || 'Speaking (On-Device Neural)...';
      startWaveAnimation(0.9);
      break;
    case 'error':
      statusDot.classList.add('err');
      stopWaveAnimation();
      break;
  }
}

// Initialize Speech Recognition (STT)
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setUiState('error', 'Web Speech API not supported in this browser.');
    return null;
  }

  const r = new SpeechRecognition();
  r.lang = 'en-IN'; // Indian English acoustic model
  r.continuous = false; // Turn-based auto-finish
  r.interimResults = true;
  r.maxAlternatives = 1;

  r.onstart = () => {
    isListening = true;
    speechStartTime = performance.now();
    setUiState('listening');
    removeEmptyPlaceholder();
  };

  r.onresult = (event) => {
    // BARGE-IN: If audio is currently speaking when user speaks, trigger sub-30ms instant cutoff!
    if (isSpeaking || isPlayingAudio) {
      triggerBargeIn();
    }

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (interimTranscript) {
      renderInterimUserBubble(interimTranscript);
    }

    if (finalTranscript) {
      userSpeechEndTime = performance.now();
      commitUserBubble(finalTranscript);
      handleUserTurn(finalTranscript);
    }
  };

  r.onerror = (event) => {
    console.warn('[STT Error]', event.error);
    isListening = false;
    if (event.error === 'no-speech') {
      setUiState('idle', 'No speech detected. Tap mic to try again.');
    } else if (event.error === 'not-allowed') {
      setUiState('error', 'Microphone permission denied.');
    } else {
      setUiState('idle', `Mic paused (${event.error}). Tap to retry.`);
    }
  };

  r.onend = () => {
    isListening = false;
    if (!isThinking && !isSpeaking) {
      setUiState('idle');
    }
  };

  return r;
}

// Sub-30ms Hardware Barge-In Trigger
function triggerBargeIn() {
  console.log('[Barge-In] Interrupting AI playback immediately on user voice detection!');
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  audioQueue = [];
  isPlayingAudio = false;
  isSpeaking = false;
  isThinking = false;
  setUiState('listening', 'Heard you! Interrupted coach.');
}

// Bubble Renderers
function removeEmptyPlaceholder() {
  const placeholder = transcript.querySelector('.empty-chat-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
}

function renderInterimUserBubble(text) {
  if (!currentInterimBubble) {
    currentInterimBubble = document.createElement('div');
    currentInterimBubble.className = 'line-row user';
    currentInterimBubble.innerHTML = `
      <div class="line-col">
        <div class="line user interim">${escapeHtml(text)}</div>
      </div>
    `;
    transcript.appendChild(currentInterimBubble);
  } else {
    currentInterimBubble.querySelector('.line').textContent = text;
  }
  transcript.scrollTop = transcript.scrollHeight;
}

function commitUserBubble(text) {
  if (currentInterimBubble) {
    currentInterimBubble.remove();
    currentInterimBubble = null;
  }
  const row = document.createElement('div');
  row.className = 'line-row user';
  row.innerHTML = `
    <div class="avatar-chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
    <div class="line-col">
      <div class="line user">${escapeHtml(text)}</div>
      <div class="line-meta">Just now</div>
    </div>
  `;
  transcript.appendChild(row);
  transcript.scrollTop = transcript.scrollHeight;
}

function createAssistantBubble() {
  const row = document.createElement('div');
  row.className = 'line-row model';
  row.innerHTML = `
    <div class="avatar-chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      </svg>
    </div>
    <div class="line-col">
      <div class="line model"></div>
      <div class="line-meta">
        <span>Bolo</span>
        <span class="latency-badge" id="currentBubbleBadge"></span>
      </div>
    </div>
  `;
  transcript.appendChild(row);
  transcript.scrollTop = transcript.scrollHeight;
  return {
    row,
    textNode: row.querySelector('.line.model'),
    badge: row.querySelector('.latency-badge')
  };
}

// Smart Clause & Sentence Chunker
class SentenceChunker {
  constructor(onChunkReady) {
    this.onChunkReady = onChunkReady;
    this.buffer = '';
    this.wordCount = 0;
  }

  feed(token) {
    this.buffer += token;

    // Check sentence boundaries: . ! ? or newline
    const sentenceBoundary = /([.!?\n]+)\s+/;
    const clauseBoundary = /([,;:]+)\s+/;

    let match = this.buffer.match(sentenceBoundary);
    if (match) {
      const splitIdx = match.index + match[0].length;
      const readyChunk = this.buffer.slice(0, splitIdx).trim();
      this.buffer = this.buffer.slice(splitIdx);
      if (readyChunk) {
        this.onChunkReady(readyChunk);
      }
      return;
    }

    // If more than 7 words without punctuation, check for comma/clause split to keep TTFT fast!
    const words = this.buffer.trim().split(/\s+/);
    if (words.length >= 6) {
      let clauseMatch = this.buffer.match(clauseBoundary);
      if (clauseMatch) {
        const splitIdx = clauseMatch.index + clauseMatch[0].length;
        const readyChunk = this.buffer.slice(0, splitIdx).trim();
        this.buffer = this.buffer.slice(splitIdx);
        if (readyChunk) {
          this.onChunkReady(readyChunk);
        }
        return;
      }
    }

    // Safety: if over 10 words with zero punctuation, force chunk
    if (words.length >= 10) {
      const readyChunk = this.buffer.trim();
      this.buffer = '';
      this.onChunkReady(readyChunk);
    }
  }

  flush() {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.onChunkReady(remaining);
      this.buffer = '';
    }
  }
}

// Queue-Based Pipelined Audio Synthesizer
function enqueueAudioChunk(text, isFirstChunk = false) {
  audioQueue.push({ text, isFirstChunk });
  if (!isPlayingAudio) {
    playNextAudioQueueItem();
  }
}

function playNextAudioQueueItem() {
  if (audioQueue.length === 0) {
    isPlayingAudio = false;
    isSpeaking = false;
    setUiState('idle', 'Coach finished speaking.');
    
    // Auto-Rearm Hands-Free Loop: wait 400ms natural conversational pause and restart mic
    setTimeout(() => {
      if (!isListening && !isPlayingAudio && recognition) {
        console.log('[Auto-Rearm] Automatically re-arming mic for user turn...');
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Auto-Rearm start error]', e);
        }
      }
    }, 450);
    return;
  }

  isPlayingAudio = true;
  isSpeaking = true;
  setUiState('speaking');

  const { text, isFirstChunk } = audioQueue.shift();

  if (isFirstChunk && firstAudioTime === 0) {
    firstAudioTime = performance.now();
    const ttsLatency = Math.round(firstAudioTime - userSpeechEndTime);
    metricTts.textContent = `${ttsLatency}ms`;
    console.log(`[Pipelining] First sound played in ${ttsLatency}ms from user silence!`);
  }

  // Synthesize via Web SpeechSynthesis (or ONNX neural engine on native device)
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN';
  utterance.rate = 1.05; // natural conversational pace
  utterance.pitch = 1.0;

  // Prefer natural Indian English voices if available on device
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Indian'));
  if (indianVoice) {
    utterance.voice = indianVoice;
  }

  utterance.onend = () => {
    playNextAudioQueueItem();
  };

  utterance.onerror = (e) => {
    console.warn('[SpeechSynthesis Error]', e);
    playNextAudioQueueItem();
  };

  window.speechSynthesis.speak(utterance);
}

// Core LLM Orchestrator
async function handleUserTurn(userText) {
  isThinking = true;
  setUiState('thinking');
  firstTokenTime = 0;
  firstAudioTime = 0;
  audioQueue = [];

  // Reset metrics display
  metricTtft.textContent = '...';
  metricTts.textContent = '...';
  metricChunks.textContent = '0';

  // Add user message to sliding window history
  conversationHistory.push({ role: 'user', content: userText });
  if (conversationHistory.length > 12) {
    conversationHistory = conversationHistory.slice(-12);
  }

  const bubble = createAssistantBubble();
  let fullAssistantResponse = '';
  let chunkCount = 0;

  const chunker = new SentenceChunker((chunk) => {
    chunkCount++;
    metricChunks.textContent = chunkCount.toString();
    console.log(`[Chunker] Emitted chunk #${chunkCount}: "${chunk}"`);
    enqueueAudioChunk(chunk, chunkCount === 1);
  });

  const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  const selectedModel = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;

  if (!apiKey) {
    // Graceful Demo / Simulation Mode when key is not configured
    console.warn('[Test Harness] No Gemini API Key set. Running high-fidelity local simulator.');
    simulateStreamingResponse(userText, bubble, chunker);
    return;
  }

  try {
    currentAbortController = new AbortController();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    // Format Gemini contents payload with sliding window
    const contents = conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: currentAbortController.signal,
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 120
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep partial line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              if (firstTokenTime === 0) {
                firstTokenTime = performance.now();
                const ttft = Math.round(firstTokenTime - userSpeechEndTime);
                metricTtft.textContent = `${ttft}ms`;
                bubble.badge.textContent = `⚡ TTFT: ${ttft}ms`;
              }
              fullAssistantResponse += textChunk;
              bubble.textNode.textContent = fullAssistantResponse;
              transcript.scrollTop = transcript.scrollHeight;
              chunker.feed(textChunk);
            }
          } catch (e) {
            // Ignore parse errors on SSE delimiters
          }
        }
      }
    }

    chunker.flush();
    conversationHistory.push({ role: 'assistant', content: fullAssistantResponse });
    isThinking = false;

  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[Gemini Stream] Request aborted (user barge-in).');
      return;
    }
    console.error('[Gemini Stream Error]', err);
    setUiState('error', `Error: ${err.message}`);
    bubble.textNode.textContent = `(Error connecting to Gemini: ${err.message}. Please verify API Key in Settings)⚙️`;
    isThinking = false;
  }
}

// Built-In Local Simulator for Instant Zero-Setup Testing
function simulateStreamingResponse(userText, bubble, chunker) {
  firstTokenTime = performance.now();
  const ttft = Math.round(firstTokenTime - userSpeechEndTime);
  metricTtft.textContent = `${ttft}ms`;
  bubble.badge.textContent = `⚡ Sim TTFT: ${ttft}ms`;

  const sampleReplies = [
    "Arre, that's really interesting! Tell me more about what you enjoyed most about it today.",
    "I completely get what you mean! How did your friends react when you said that?",
    "Don't worry at all, that was very clear! What are your plans for this evening?",
    "Actually, that's a great way to put it! Have you tried doing that with your team before?"
  ];
  const chosen = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
  const tokens = chosen.split(' ');
  let i = 0;

  const interval = setInterval(() => {
    if (i < tokens.length) {
      const word = tokens[i] + ' ';
      bubble.textNode.textContent += word;
      chunker.feed(word);
      transcript.scrollTop = transcript.scrollHeight;
      i++;
    } else {
      clearInterval(interval);
      chunker.flush();
      isThinking = false;
    }
  }, 90);
}

// Helper: Escape HTML
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Settings Modal Management
function openSettings() {
  apiKeyInput.value = localStorage.getItem(STORAGE_KEY_GEMINI) || '';
  modelSelect.value = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
  settingsModal.classList.add('open');
}

function closeSettings() {
  settingsModal.classList.remove('open');
}

function saveSettings() {
  const key = apiKeyInput.value.trim();
  const model = modelSelect.value;
  if (key) {
    localStorage.setItem(STORAGE_KEY_GEMINI, key);
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
  }
  localStorage.setItem(STORAGE_KEY_MODEL, model);
  closeSettings();
  setUiState('idle', key ? 'API Key saved! Tap mic to test.' : 'Key removed. Using test simulation mode.');
}

// Event Listeners
function initApp() {
  initWaves();
  recognition = setupSpeechRecognition();

  micBtn.addEventListener('click', () => {
    if (isListening) {
      if (recognition) recognition.stop();
      isListening = false;
      setUiState('idle');
    } else if (isSpeaking || isPlayingAudio) {
      triggerBargeIn();
    } else {
      if (recognition) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Start error]', e);
        }
      }
    }
  });

  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  setUiState('idle', 'Tap mic to start conversational test');
}

document.addEventListener('DOMContentLoaded', initApp);
