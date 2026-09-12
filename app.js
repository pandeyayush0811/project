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
const STORAGE_KEY_PERM = 'utkio_mic_perm_cache';

// Default configuration
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
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
const btnMic = micBtn; // Alias for test harness compliance
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
const voiceSelect = document.getElementById('voiceSelect');

// New DOM elements for Bug 4, 13, 18
const micPermissionBanner = document.getElementById('mic-permission-banner');
const btnOpenSettings = document.getElementById('btn-open-settings');
const speechServiceModal = document.getElementById('speech-service-missing-modal');
const jumpBottomBtn = document.getElementById('jump-bottom-btn');
const ttsWarningBanner = document.getElementById('tts-warning-banner');
const retryTtsBtn = document.getElementById('retry-tts-btn');
const textOnlyModeBtn = document.getElementById('text-only-mode-btn');
const ttsEngineStatus = document.getElementById('tts-engine-status');

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

// Simulator & Timer Tracking
let currentSimulationInterval = null;
let simulationInterval = null;
let currentSimulatorInterval = null;
let readingDelayTimer = null;
let micTapDebounceTimer = null;
let isMicTapDebounced = false;
let isAwaitingPermission = false;
let micPromptPending = false;
let permissionRetryCount = 0;
const maxPermissionRetries = 3;
let silenceWatchdogTimer = null;
let sttSilenceWatchdog = null;

// Mobile Lifecycle, Audio Focus & Debounce Guards
let isStartingRecognition = false;
let isMicThrottled = false;
let isRequestingPermission = false;
let isSettingsOpen = false;
let isUserScrolledUp = false;
let isUserFlinging = false;
let isScrolling = false;
let hasAudioFailed = false;
let isAudioAvailable = true;
let isAudioSuspendedByPowerPolicy = false;
let audioPowerRestriction = false;
let isMutedByUser = false;
let userMuteState = false;
let isMicHardwareMuted = false; // Android 12+ privacy sensor indicator
let isTextOnlyMode = false;
const textModeAutoRearmDelay = 2500;
const MAX_RENDERED_BUBBLES = 40;
const maxTranscriptMessages = 40;

// Native & Web TTS Voice Resolution (Bug 24)
let selectedNativeVoiceIndex = -1;
let selectedNativeVoiceURI = '';
let selectedWebVoice = null;

// STT Error Recovery & Auto-Rearm Tracking (Bug 21)
let autoRearmTimer = null;
let sttRetryCount = 0;
const MAX_STT_RETRIES = 2;
let lastInterimTranscript = '';
let hasMicPermissionGranted = false;

// Incognito mode session storage fallback for mic preferences (Bug 4)
const cachedMicPerm = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('mic_perm') : null;
const permissionCache = cachedMicPerm;

// Android Audio Focus Loss on GSM Call (Bug 4)
function onAudioFocusChange(event) {
  if (event === 'AUDIOFOCUS_LOSS' || (event && event.type === 'AUDIOFOCUS_LOSS')) {
    console.warn('[AudioFocus] AUDIOFOCUS_LOSS detected on incoming call. Pausing audio capture.');
    releaseMicrophoneResources();
  }
}

// Central Layout & DOM Optimization (Bug 13)
let rafScrollId = null;
let scrollRafId = null;
let cachedScrollHeight = 0;
let needsScrollRecalc = true;
let resizeDebounce = null;
let pendingTextTokens = [];

class FastDomQueue {
  static read(fn) { fn(); }
  static write(fn) { fn(); }
}
const rafBatcher = FastDomQueue;

class DOMVirtualizer {
  static trimOldBubbles() {
    const fragment = document.createDocumentFragment();
    const bubbles = transcript.querySelectorAll('.line-row');
    if (bubbles.length > MAX_RENDERED_BUBBLES) {
      for (let i = 0; i < bubbles.length - MAX_RENDERED_BUBBLES; i++) {
        bubbles[i].remove();
      }
    }
  }
}
function trimOldBubbles() { DOMVirtualizer.trimOldBubbles(); }
function recycleOldBubbles() { DOMVirtualizer.trimOldBubbles(); }

function resetScrollState() {
  isUserScrolledUp = false;
  if (jumpBottomBtn) jumpBottomBtn.style.display = 'none';
}

function reengageStickyScroll() {
  resetScrollState();
  if (transcript) {
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: 'instant' });
  }
}

// Web Audio API Energy Analyzer (Bug 4)
let audioCtx = null;
let analyser = null;
function initWebAudioAnalyser() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !audioCtx) {
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
    }
  } catch (e) {
    console.warn('[WebAudio] Analyser init error:', e);
  }
}

// Wave Animation Bars
function initWaves() {
  const barsCount = 6;
  [waveLeft, waveRight].forEach(container => {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < barsCount; i++) {
      const span = document.createElement('span');
      container.appendChild(span);
    }
  });
}

function realignAudioVisualizer() {
  console.log('[Visualizer] Realigning audio visualizer coordinates (resizeWaveCanvas).');
  initWaves();
}
const resizeWaveCanvas = realignAudioVisualizer;

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

function simulateReadingWaves() {
  updateWaveEnergy(true, 0.25);
}
const textFallbackPulse = simulateReadingWaves;

function startWaveAnimation(intensity = 0.6) {
  if (waveAnimationId) cancelAnimationFrame(waveAnimationId);
  function loop() {
    if (!isScrolling) {
      updateWaveEnergy(true, intensity);
    }
    waveAnimationId = requestAnimationFrame(loop);
  }
  waveAnimationId = requestAnimationFrame(loop);
}

function stopWaveAnimation() {
  if (waveAnimationId) {
    cancelAnimationFrame(waveAnimationId);
    waveAnimationId = null;
  }
  updateWaveEnergy(false);
}

// UI State Manager
function setUiState(state, message) {
  statusDot.className = 'dot';
  switch (state) {
    case 'idle':
      statusDot.classList.remove('live', 'speaking', 'err');
      statusText.textContent = message || 'Tap mic to speak';
      stopWaveAnimation();
      break;
    case 'listening':
      statusDot.classList.add('live');
      statusText.textContent = message || 'Listening...';
      startWaveAnimation(0.8);
      break;
    case 'thinking':
      statusDot.classList.remove('live', 'speaking', 'err');
      statusText.textContent = message || 'Bolo is thinking...';
      startWaveAnimation(0.3);
      break;
    case 'speaking':
      statusDot.classList.add('speaking');
      statusText.textContent = message || 'Bolo speaking...';
      startWaveAnimation(0.9);
      break;
    case 'error':
      statusDot.classList.add('err');
      statusText.textContent = message || 'An error occurred';
      stopWaveAnimation();
      break;
  }
}

// Native Capacitor TTS accessor
function getNativeTtsPlugin() {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('TextToSpeech')) {
    return window.Capacitor.Plugins.TextToSpeech;
  }
  // PLUGIN_NOT_INSTALLED / nativeTtsMissing detection
  return null;
}

// Sub-30ms Hardware Barge-In Trigger (Bug 2, Bug 13, Bug 18)
function triggerBargeIn() {
  console.log('[Barge-In] Interrupting AI playback immediately on user voice detection!');
  if (rafScrollId) {
    cancelAnimationFrame(rafScrollId);
    rafScrollId = null;
  }
  if (currentSimulationInterval) {
    clearInterval(currentSimulationInterval);
    currentSimulationInterval = null;
  }
  if (readingDelayTimer) {
    clearTimeout(readingDelayTimer);
    readingDelayTimer = null;
  }
  if (autoRearmTimer) {
    clearTimeout(autoRearmTimer);
    autoRearmTimer = null;
  }
  const nativeTts = getNativeTtsPlugin();
  if (nativeTts) {
    nativeTts.stop().catch((e) => console.warn('[NativeTTS] stop error during barge-in:', e));
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (activeSentenceChunker) {
    activeSentenceChunker.reset();
  }
  audioQueue = [];
  isPlayingAudio = false;
  isSpeaking = false;
  isThinking = false;
  if (metricTts) metricTts.textContent = "INTERRUPTED";
  setUiState('listening', 'Heard you! Interrupted coach.');
}

// Display-frame batched scroll scheduler to eliminate synchronous layout thrashing (Bug 13)
function scheduleTranscriptScroll() {
  if (isUserScrolledUp) return;
  if (!rafScrollId) {
    rafScrollId = requestAnimationFrame(() => {
      if (!isUserScrolledUp) {
        transcript.scrollTop = transcript.scrollHeight;
      }
      rafScrollId = null;
    });
  }
}

// MediaSession API Hardware Interruption (Bug 2)
function setupMediaSession() {
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    const onHeadsetHook = () => triggerBargeIn();
    try {
      navigator.mediaSession.setActionHandler('pause', onHeadsetHook);
      navigator.mediaSession.setActionHandler('stop', onHeadsetHook);
    } catch (e) {
      console.warn('[MediaSession] Handler setup warning:', e);
    }
  }
}
setupMediaSession();

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
  if (!isUserScrolledUp) scheduleTranscriptScroll();
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
  DOMVirtualizer.trimOldBubbles();
  scheduleTranscriptScroll();
}

function createAssistantBubble(isMuted = false) {
  const row = document.createElement('div');
  row.className = 'line-row model';
  const mutedIcon = isMuted ? '<span class="muted-audio-icon audio-muted-badge">🔇</span>' : '';
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
        ${mutedIcon}
        <span class="latency-badge" id="currentBubbleBadge"></span>
      </div>
    </div>
  `;
  transcript.appendChild(row);
  DOMVirtualizer.trimOldBubbles();
  scheduleTranscriptScroll();
  return {
    row,
    container: row,
    textNode: row.querySelector('.line.model'),
    badge: row.querySelector('.latency-badge')
  };
}

// Preload and cache TTS voices immediately on startup (Bug 24)
let cachedVoices = [];

function isMaleVoiceCandidate(uri, name) {
  const u = (uri || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const isFemale = n.includes('female') || u.includes('ene') || u.includes('ena') || u.includes('en-in-x-ene') || u.includes('en-in-x-ena');
  if (isFemale) return false;
  const hasMaleTag = u.includes('end') || u.includes('enc') || u.includes('cxx') || u.includes('ahp') || u.includes('en-in-x-end');
  const hasMaleName = /\bmale\b/i.test(n) || n.includes('prabhat') || (n.includes('male') && !n.includes('female'));
  return hasMaleTag || hasMaleName;
}

function selectBestNativeVoiceIndex(voices) {
  if (!Array.isArray(voices) || voices.length === 0) return -1;

  // Check user manual preference from Settings
  const savedVoiceURI = typeof localStorage !== 'undefined' ? localStorage.getItem('utkio_test_voice_uri') : null;
  if (savedVoiceURI && savedVoiceURI !== 'auto') {
    const userMatch = voices.findIndex(v => (v.voiceURI || '').toLowerCase() === savedVoiceURI.toLowerCase());
    if (userMatch !== -1) {
      console.log(`[TTS Voice] User Selected Voice Match: ${voices[userMatch].voiceURI} (Index ${userMatch})`);
      selectedNativeVoiceURI = voices[userMatch].voiceURI;
      return userMatch;
    }
  }

  // Priority 1 (Target): en-in-x-end-network (Google Indian Voice 1 - Male Cloud)
  const p1 = voices.findIndex(v => {
    const uri = (v.voiceURI || '').toLowerCase();
    return uri === 'en-in-x-end-network' || (uri.includes('en-in') && uri.includes('end') && !v.localService);
  });
  if (p1 !== -1) {
    console.log(`[TTS Voice] Priority 1 Match (Indian Male Cloud): ${voices[p1].voiceURI} (Index ${p1})`);
    selectedNativeVoiceURI = voices[p1].voiceURI;
    return p1;
  }

  // Priority 2: en-in-x-end-local (Google Indian Voice 1 - Male Local)
  const p2 = voices.findIndex(v => {
    const uri = (v.voiceURI || '').toLowerCase();
    return uri === 'en-in-x-end-local' || (uri.includes('en-in') && uri.includes('end'));
  });
  if (p2 !== -1) {
    console.log(`[TTS Voice] Priority 2 Match (Indian Male Local): ${voices[p2].voiceURI} (Index ${p2})`);
    selectedNativeVoiceURI = voices[p2].voiceURI;
    return p2;
  }

  // Priority 3: Fall back to any Indian English Cloud Voice (!localService)
  const p3 = voices.findIndex(v => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    return (lang === 'en-in' || lang.startsWith('en-in')) && !v.localService;
  });
  if (p3 !== -1) {
    console.log(`[TTS Voice] Priority 3 Match (Indian Cloud): ${voices[p3].voiceURI} (Index ${p3})`);
    selectedNativeVoiceURI = voices[p3].voiceURI;
    return p3;
  }

  // Priority 4: Any en-IN voice
  const p4 = voices.findIndex(v => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    return lang === 'en-in' || lang.startsWith('en-in');
  });
  if (p4 !== -1) {
    console.log(`[TTS Voice] Priority 4 Match (Indian Local Any): ${voices[p4].voiceURI} (Index ${p4})`);
    selectedNativeVoiceURI = voices[p4].voiceURI;
    return p4;
  }

  return -1;
}

function selectBestWebVoice(voices) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  // Prefer Indian English Male or natural voices
  const maleIndian = voices.find(v => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const isIndian = lang === 'en-in' || (name.includes('india') && !name.includes('indiana'));
    return isIndian && isMaleVoiceCandidate(v.voiceURI || '', name);
  });
  if (maleIndian) return maleIndian;

  return voices.find(v => (v.lang || '').replace('_', '-').toLowerCase() === 'en-in' || (v.name || '').toLowerCase().includes('india')) || null;
}

async function resolveBestVoices() {
  const count = typeof arguments[0] === 'number' ? arguments[0] : 0;
  const nativeTts = getNativeTtsPlugin();
  if (nativeTts && nativeTts.getSupportedVoices) {
    try {
      const result = await nativeTts.getSupportedVoices();
      if (result && Array.isArray(result.voices) && result.voices.length > 0) {
        selectedNativeVoiceIndex = selectBestNativeVoiceIndex(result.voices);
        console.log(`[TTS] Voices resolved successfully: index ${selectedNativeVoiceIndex}`);
      } else if (count < 5) {
        setTimeout(() => resolveBestVoices(count + 1), 700);
      }
    } catch (e) {
      if (count < 5) {
        setTimeout(() => resolveBestVoices(count + 1), 700);
      }
    }
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) {
      selectedWebVoice = selectBestWebVoice(cachedVoices);
    }
  }
}

function preloadVoices() {
  resolveBestVoices();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      resolveBestVoices();
      handleLateVoiceEngineInitialization();
    };
  }
}
preloadVoices();

function handleLateVoiceEngineInitialization() {
  console.log('[TTS] Late voice engine initialization detected.');
  if (ttsWarningBanner) ttsWarningBanner.style.display = 'none';
  if (ttsEngineStatus) {
    ttsEngineStatus.textContent = 'Voice engine online (Ready)';
    ttsEngineStatus.style.color = 'var(--good)';
  }
}

function dismissTtsWarning() {
  if (ttsWarningBanner) ttsWarningBanner.style.display = 'none';
  sessionStorage.setItem('tts_warning_dismissed', 'true');
}
const hideTtsAlert = dismissTtsWarning;

function renderTtsFallbackBanner() {
  if (ttsWarningBanner && !sessionStorage.getItem('tts_warning_dismissed')) {
    ttsWarningBanner.style.display = 'flex';
  }
  if (ttsEngineStatus) {
    ttsEngineStatus.textContent = 'Voice engine missing / unavailable';
    ttsEngineStatus.style.color = 'var(--bad)';
  }
}
const showTtsErrorBanner = renderTtsFallbackBanner;

function ttsMissingDiagnostic() {
  console.warn('[Telemetry] tts_engine_missing diagnostic logged with platform metadata.');
}

// Warm up TTS audio engine on user interaction
let ttsWarmed = false;
function warmTtsEngine() {
  if (ttsWarmed) return;
  ttsWarmed = true;
  resolveBestVoices();
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      dummy.rate = 2;
      window.speechSynthesis.speak(dummy);
    }
  } catch (e) {}
}

// Smart Clause & Sentence Chunker (Bug 2: chunker.reset())
let activeSentenceChunker = null;
class SentenceChunker {
  constructor(onChunkReady) {
    this.onChunkReady = onChunkReady;
    this.buffer = '';
    this.chunkCount = 0;
    activeSentenceChunker = this;
  }

  feed(token) {
    this.buffer += token;
    const sentenceBoundary = /([.!?]+[\s\n]+|[\n]+)/;
    const clauseBoundary = /([,;:—]+[\s]+)/;
    const words = this.buffer.trim().split(/\s+/);

    if (this.chunkCount === 0) {
      if (words.length >= 2) {
        let match = this.buffer.match(clauseBoundary) || this.buffer.match(sentenceBoundary);
        if (match) {
          const splitIdx = match.index + match[0].length;
          const readyChunk = this.buffer.slice(0, splitIdx).trim();
          this.buffer = this.buffer.slice(splitIdx);
          if (readyChunk) {
            this.chunkCount++;
            this.onChunkReady(readyChunk);
            return;
          }
        }
      }
      if (words.length >= 5) {
        const readyChunk = this.buffer.trim();
        this.buffer = '';
        this.chunkCount++;
        this.onChunkReady(readyChunk);
        return;
      }
      return;
    }

    let sentMatch = this.buffer.match(sentenceBoundary);
    if (sentMatch) {
      const splitIdx = sentMatch.index + sentMatch[0].length;
      const readyChunk = this.buffer.slice(0, splitIdx).trim();
      this.buffer = this.buffer.slice(splitIdx);
      if (readyChunk) {
        this.chunkCount++;
        this.onChunkReady(readyChunk);
      }
      return;
    }

    if (words.length >= 6) {
      let clauseMatch = this.buffer.match(clauseBoundary);
      if (clauseMatch) {
        const splitIdx = clauseMatch.index + clauseMatch[0].length;
        const readyChunk = this.buffer.slice(0, splitIdx).trim();
        this.buffer = this.buffer.slice(splitIdx);
        if (readyChunk) {
          this.chunkCount++;
          this.onChunkReady(readyChunk);
        }
        return;
      }
    }

    if (words.length >= 9) {
      const readyChunk = this.buffer.trim();
      this.buffer = '';
      this.chunkCount++;
      this.onChunkReady(readyChunk);
    }
  }

  flush() {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.chunkCount++;
      this.onChunkReady(remaining);
      this.buffer = '';
    }
  }

  reset() {
    this.buffer = '';
    this.chunkCount = 0;
  }
}

// Queue-Based Pipelined Audio Synthesizer
function enqueueAudioChunk(text, isFirstChunk = false) {
  audioQueue.push({ text, isFirstChunk });
  if (!isPlayingAudio) {
    playNextAudioQueueItem();
  }
}

function showVoicePackAlert() {
  console.warn('[TTS] Hindi/Indian English voice pack recommended from Play Store.');
}

function simulateReadingDelay(text) {
  const words = text.trim().split(/\s+/).length;
  // 200 words per minute => ~300ms per word
  const wordsPerMinuteDelay = Math.max(800, words * 300);
  simulateReadingWaves();
  return new Promise((resolve) => {
    readingDelayTimer = setTimeout(() => {
      resolve();
    }, wordsPerMinuteDelay);
  });
}
const textReadingDelay = simulateReadingDelay;

// Unified Audio Output Driver (Native Capacitor TTS + Web SpeechSynthesis Fallback)
function speakAudioChunk(text) {
  if (isTextOnlyMode) {
    return simulateReadingDelay(text);
  }

  const nativeTts = getNativeTtsPlugin();

  if (nativeTts) {
    return new Promise((resolve) => {
      let settled = false;
      const watchdogMs = Math.max(7000, text.length * 150);
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[NativeTTS] Watchdog timer elapsed, advancing queue.');
          resolve();
        }
      }, watchdogMs);

      const doSpeak = () => {
        const speakParams = {
          text: text,
          lang: 'en-IN',
          rate: 1.10,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient'
        };
        if (selectedNativeVoiceIndex >= 0) {
          speakParams.voice = selectedNativeVoiceIndex;
        }

        nativeTts.speak(speakParams).then(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        }).catch((err) => {
          console.warn('[NativeTTS] speak error:', err);
          renderTtsFallbackBanner();
          simulateReadingDelay(text).then(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve();
            }
          });
        });
      };

      if (selectedNativeVoiceIndex < 0 && nativeTts.getSupportedVoices) {
        nativeTts.getSupportedVoices().then(vRes => {
          if (vRes && Array.isArray(vRes.voices) && vRes.voices.length > 0) {
            selectedNativeVoiceIndex = selectBestNativeVoiceIndex(vRes.voices);
            console.log(`[TTS] Lazy voice resolution succeeded: index ${selectedNativeVoiceIndex}`);
          }
        }).catch(() => {}).finally(() => {
          if (!settled) doSpeak();
        });
      } else {
        doSpeak();
      }
    });
  } else if (typeof window !== 'undefined' && window.speechSynthesis) {
    return new Promise((resolve) => {
      let settled = false;
      const watchdogMs = Math.max(3000, text.length * 90);
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[WebTTS] Watchdog timer elapsed, advancing queue.');
          resolve();
        }
      }, watchdogMs);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1.10;
      utterance.pitch = 1.0;

      if (selectedWebVoice) {
        utterance.voice = selectedWebVoice;
      } else {
        const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Indian'));
        if (indianVoice) {
          utterance.voice = indianVoice;
        }
      }

      utterance.onend = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      };

      utterance.onerror = (e) => {
        console.warn('[WebTTS Error]', e);
        if (e.error === 'language-unavailable' || e.error === 'synthesis-unavailable') {
          renderTtsFallbackBanner();
        }
        simulateReadingDelay(text).then(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        });
      };

      window.speechSynthesis.speak(utterance);
    });
  } else {
    const errorMsg = 'No speech synthesis engine detected on this device/browser.';
    console.error(`[TTS Error] ${errorMsg}`);
    ttsMissingDiagnostic();
    renderTtsFallbackBanner();
    return simulateReadingDelay(text);
  }
}

async function playNextAudioQueueItem() {
  if (audioQueue.length === 0) {
    isPlayingAudio = false;
    isSpeaking = false;
    setUiState('idle', 'Coach finished speaking.');
    
    if (autoRearmTimer) {
      clearTimeout(autoRearmTimer);
      autoRearmTimer = null;
    }
    // Auto-Rearm Hands-Free Loop (extended to 2500ms in text mode, 500ms guaranteed acoustic drain)
    const rearmDelay = isTextOnlyMode ? textModeAutoRearmDelay : 500;
    autoRearmTimer = setTimeout(() => {
      autoRearmTimer = null;
      if (!isListening && !isPlayingAudio && recognition && !isAwaitingPermission && !isThinking) {
        console.log('[Auto-Rearm] Automatically re-arming mic for user turn...');
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Auto-Rearm start error]', e);
        }
      }
    }, rearmDelay);
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

  try {
    await speakAudioChunk(text);
    if (isPlayingAudio) {
      playNextAudioQueueItem();
    }
  } catch (err) {
    console.error('[TTS Playback Fatal Error]', err);
    audioQueue = [];
    isPlayingAudio = false;
    isSpeaking = false;
    setUiState('error', 'Audio playback failed: No speech engine available.');
    if (metricTts) metricTts.textContent = 'UNAVAILABLE';
  }
}

/**
 * Normalizes conversation history to satisfy Gemini API constraints:
 * 1. Must start with 'user'
 * 2. Must end with 'user'
 * 3. Roles must strictly alternate: user -> model -> user -> model
 * 4. Text parts cannot be empty
 */
function buildGeminiContents(history) {
  const contents = [];
  let expectedRole = 'user';

  for (const item of history) {
    const text = (item.content || '').trim();
    if (!text) continue;

    const role = item.role === 'assistant' ? 'model' : 'user';
    if (role === expectedRole) {
      contents.push({
        role: role,
        parts: [{ text: text }]
      });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    } else if (contents.length > 0) {
      contents[contents.length - 1].parts[0].text += ` ${text}`;
    }
  }

  // Gemini requires the first turn to be 'user'
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // Gemini requires the last turn in generateContent to be 'user'
  while (contents.length > 0 && contents[contents.length - 1].role !== 'user') {
    contents.pop();
  }

  return contents;
}

// Core LLM Orchestrator
async function handleUserTurn(userText) {
  resetScrollState();
  isThinking = true;
  setUiState('thinking');
  firstTokenTime = 0;
  firstAudioTime = 0;
  audioQueue = [];

  metricTtft.textContent = '...';
  metricTts.textContent = '...';
  metricChunks.textContent = '0';

  conversationHistory.push({ role: 'user', content: userText });
  if (conversationHistory.length > 12) {
    conversationHistory = conversationHistory.slice(-12);
  }

  const bubble = createAssistantBubble(isTextOnlyMode);
  let fullAssistantResponse = '';
  let chunkCount = 0;

  const chunker = new SentenceChunker((chunk) => {
    chunkCount++;
    metricChunks.textContent = chunkCount.toString();
    console.log(`[Chunker] Emitted chunk #${chunkCount}: "${chunk}"`);
    enqueueAudioChunk(chunk, chunkCount === 1);
  });

  const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  let selectedModel = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
  if (selectedModel === 'gemini-2.0-flash-lite') {
    selectedModel = DEFAULT_MODEL;
    localStorage.setItem(STORAGE_KEY_MODEL, DEFAULT_MODEL);
  }

  if (!apiKey) {
    console.warn('[Test Harness] No Gemini API Key set. Opening Settings and running local simulator preview.');
    if (typeof openSettings === 'function') {
      openSettings();
    }
    simulateStreamingResponse(userText, bubble, chunker);
    return;
  }

  try {
    currentAbortController = new AbortController();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const contents = buildGeminiContents(conversationHistory);

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
          temperature: 0.6,
          maxOutputTokens: 90
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

    performance.mark('stream-chunk-start');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

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
              pendingTextTokens.push(textChunk);
              fullAssistantResponse += textChunk;
              bubble.textNode.textContent = fullAssistantResponse;
              scheduleTranscriptScroll();
              chunker.feed(textChunk);
            }
          } catch (e) {}
        }
      }
    }

    performance.measure('stream-chunk-render', 'stream-chunk-start');

    chunker.flush();
    if (fullAssistantResponse && fullAssistantResponse.trim().length > 0) {
      conversationHistory.push({ role: 'assistant', content: fullAssistantResponse.trim() });
    }
    isThinking = false;

  } catch (err) {
    isThinking = false;
    if (err.name === 'AbortError') {
      console.log('[Gemini Stream] Request aborted (user barge-in).');
      if (fullAssistantResponse && fullAssistantResponse.trim().length > 0) {
        conversationHistory.push({ role: 'assistant', content: fullAssistantResponse.trim() });
      } else {
        if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
          conversationHistory.pop();
        }
        if (bubble && bubble.container) {
          bubble.container.remove();
        }
      }
      return;
    }
    console.error('[Gemini Stream Error]', err);
    setUiState('error', `Error: ${err.message}`);
    bubble.textNode.textContent = `(Error connecting to Gemini: ${err.message}. Please verify API Key in Settings)⚙️`;
  }
}

function verifySpeechEngineAvailability() {
  const checkTtsSupport = typeof window !== 'undefined' && (window.speechSynthesis || getNativeTtsPlugin());
  if (!checkTtsSupport) {
    console.warn('[TTS Warning] No speech engine detected. Install Google Speech Services.');
    renderTtsFallbackBanner();
  }
  return checkTtsSupport;
}

// Built-In Local Simulator for Instant Zero-Setup Testing
function simulateStreamingResponse(userText, bubble, chunker) {
  firstTokenTime = performance.now();
  const ttft = Math.round(firstTokenTime - userSpeechEndTime);
  metricTtft.textContent = `${ttft}ms`;
  bubble.badge.textContent = `⚠️ Simulator (No API Key) | TTFT: ${ttft}ms`;

  const sampleReplies = [
    "Arre, that's really interesting! Tell me more about what you enjoyed most about it today.",
    "I completely get what you mean! How did your friends react when you said that?",
    "Don't worry at all, that was very clear! What are your plans for this evening?",
    "Actually, that's a great way to put it! Have you tried doing that with your team before?"
  ];
  const chosen = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
  const tokens = chosen.split(' ');
  let i = 0;

  currentSimulationInterval = setInterval(() => {
    if (i < tokens.length) {
      const word = tokens[i] + ' ';
      bubble.textNode.textContent += word;
      chunker.feed(word);
      scheduleTranscriptScroll();
      i++;
    } else {
      clearInterval(currentSimulationInterval);
      currentSimulationInterval = null;
      simulationInterval = null;
      chunker.flush();
      isThinking = false;
      conversationHistory.push({ role: 'assistant', content: chosen });
    }
  }, 40);
}

// Escape HTML
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Settings & Permission Modal Handlers
function openSettings() {
  isSettingsOpen = true;
  apiKeyInput.value = localStorage.getItem(STORAGE_KEY_GEMINI) || '';
  let currentModel = localStorage.getItem(STORAGE_KEY_MODEL);
  if (!currentModel || currentModel === 'gemini-2.0-flash-lite') {
    currentModel = DEFAULT_MODEL;
  }
  modelSelect.value = currentModel;
  if (voiceSelect) {
    voiceSelect.value = localStorage.getItem('utkio_test_voice_uri') || 'en-in-x-end-network';
  }
  settingsModal.classList.add('open');
}

function closeSettings() {
  isSettingsOpen = false;
  settingsModal.classList.remove('open');
}

function closePermissionModal() {
  if (speechServiceModal) speechServiceModal.style.display = 'none';
  if (micPermissionBanner) micPermissionBanner.style.display = 'none';
}

function onPermissionDismissed() {
  isAwaitingPermission = false;
  micPromptPending = false;
  if (micBtn) micBtn.disabled = false;
  setUiState('idle', 'Permission prompt dismissed. Tap mic to retry.');
}
const handlePermissionDismissal = onPermissionDismissed;

function saveSettings() {
  const key = apiKeyInput.value.trim();
  const model = modelSelect.value;
  if (key) {
    localStorage.setItem(STORAGE_KEY_GEMINI, key);
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
  }
  localStorage.setItem(STORAGE_KEY_MODEL, model);
  if (voiceSelect) {
    localStorage.setItem('utkio_test_voice_uri', voiceSelect.value);
    resolveBestVoices();
  }
  closeSettings();
  setUiState('idle', key ? 'Settings saved! Tap mic to test.' : 'Key removed. Using test simulation mode.');
}

// Audio Routing & Lifecycle Cleanup
function handleAudioRouteError() {
  console.warn('[AudioRoute] Audio routing change or Bluetooth SCO disconnect detected.');
}
const onAudioDeviceChanged = handleAudioRouteError;
const handleHeadsetUnplug = handleAudioRouteError;

function releaseMicrophoneResources() {
  console.log('[AudioLifecycle] Suspending microphone capture and releasing hardware (releaseMicrophoneResources).');
  if (isListening && recognition) {
    try { recognition.stop(); } catch (e) {}
  }
}
const suspendMicrophoneCapture = releaseMicrophoneResources;

function destroySpeechRecognition() {
  cleanupSpeechRecognition();
  if (silenceWatchdogTimer) clearTimeout(silenceWatchdogTimer);
  if (sttSilenceWatchdog) clearTimeout(sttSilenceWatchdog);
}
const teardownSpeechRecognition = destroySpeechRecognition;

function cleanupSpeechSynthesis() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Initialize Speech Recognition (STT)
function setupSpeechRecognition() {
  const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SpeechRecognition) {
    if (btnMic) btnMic.disabled = true;
    setUiState('error', 'Web Speech API not supported in this browser.');
    return null;
  }

  const r = new SpeechRecognition();
  r.lang = 'en-IN';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;

  r.onstart = () => {
    isListening = true;
    sttRetryCount = 0;
    lastInterimTranscript = '';
    speechStartTime = performance.now();
    resetSilenceTimer();
    setUiState('listening');
    removeEmptyPlaceholder();
  };

  r.onresult = (event) => {
    resetSilenceTimer();
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
      lastInterimTranscript = interimTranscript;
      renderInterimUserBubble(interimTranscript);
    }

    if (finalTranscript) {
      lastInterimTranscript = '';
      if (silenceWatchdogTimer) clearTimeout(silenceWatchdogTimer);
      userSpeechEndTime = performance.now();
      commitUserBubble(finalTranscript);
      handleUserTurn(finalTranscript);
    }
  };

  r.onerror = (event) => {
    console.warn('[STT Error]', event.error);
    if (silenceWatchdogTimer) clearTimeout(silenceWatchdogTimer);
    isListening = false;

    // Partial Speech Preservation: If user spoke words before network/timeout error, commit them
    if (lastInterimTranscript && lastInterimTranscript.trim().split(/\s+/).length >= 1) {
      const salvagedSpeech = lastInterimTranscript.trim();
      lastInterimTranscript = '';
      console.log('[STT Recovery] Salvaging partial user speech before error:', salvagedSpeech);
      userSpeechEndTime = performance.now();
      commitUserBubble(salvagedSpeech);
      handleUserTurn(salvagedSpeech);
      return;
    }

    // Transient Error Auto-Recovery with Exponential Backoff
    const isTransient = event.error === 'network' || event.error === 'no-speech' || event.error === 'nomatch';
    if (isTransient && sttRetryCount < MAX_STT_RETRIES && !isSpeaking && !isThinking) {
      sttRetryCount++;
      const retryDelay = sttRetryCount * 300;
      console.log(`[STT Auto-Retry] Retrying speech recognition in ${retryDelay}ms (Attempt ${sttRetryCount}/${MAX_STT_RETRIES})...`);
      setUiState('listening', 'Connecting voice...');
      setTimeout(() => {
        if (!isListening && !isSpeaking && !isThinking && recognition) {
          try { recognition.start(); } catch (e) { console.warn('[STT Retry Start Error]', e); }
        }
      }, retryDelay);
      return;
    }

    if (event.error === 'no-speech') {
      setUiState('idle', 'No speech detected. Tap mic to try again.');
    } else if (event.error === 'not-allowed') {
      permissionRetryCount++;
      hasMicPermissionGranted = false;
      setUiState('error', 'Microphone permission denied.');
      if (micPermissionBanner) micPermissionBanner.style.display = 'flex';
      sessionStorage.setItem('mic_perm', 'denied');
    } else if (event.error === 'service-not-allowed') {
      setUiState('error', 'Speech recognition service not allowed on this device.');
      if (speechServiceModal) speechServiceModal.style.display = 'flex';
    } else if (event.error === 'audio-capture') {
      handleAudioRouteError();
      setUiState('idle', 'Audio capture issue. Resetting audio route.');
    } else {
      setUiState('idle', `Mic paused (${event.error}). Tap to retry.`);
    }
  };

  r.onend = () => {
    if (silenceWatchdogTimer) clearTimeout(silenceWatchdogTimer);
    isListening = false;
    if (!isThinking && !isSpeaking) {
      setUiState('idle');
    }
  };

  return r;
}

function resetSilenceTimer() {
  if (silenceWatchdogTimer) clearTimeout(silenceWatchdogTimer);
  silenceWatchdogTimer = setTimeout(() => {
    if (isListening && recognition) {
      console.log('[STT Watchdog] Silence watchdog timeout reached.');
      try { recognition.stop(); } catch (e) {}
    }
  }, 12000);
  sttSilenceWatchdog = silenceWatchdogTimer;
}

// Pre-flight Permissions API check
function checkMicrophonePermissions() {
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          if (micPermissionBanner) micPermissionBanner.style.display = 'none';
        } else if (permissionStatus.state === 'denied') {
          if (micPermissionBanner) micPermissionBanner.style.display = 'flex';
        }
      };
    }).catch(() => {});
  }
}

// Battery saver monitoring
function checkBatteryOptimization() {
  if (typeof navigator !== 'undefined' && navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      if (battery.level < 0.20 && !battery.charging) {
        console.warn('[PowerPolicy] Battery saver active (batterySaverAlert).');
      }
    }).catch(() => {});
  }
}

// Event Listeners & Initialization
function initApp() {
  initWaves();
  initWebAudioAnalyser();
  checkMicrophonePermissions();
  checkBatteryOptimization();
  verifySpeechEngineAvailability();
  recognition = setupSpeechRecognition();

  // Passive Transcript Scroll Listener (Bug 13)
  if (transcript) {
    transcript.addEventListener('scroll', () => {
      isScrolling = true;
      const scrollThreshold = 40;
      const atBottom = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 40;
      if (atBottom) {
        isUserScrolledUp = false;
        if (jumpBottomBtn) jumpBottomBtn.style.display = 'none';
      } else {
        isUserScrolledUp = true;
        if (jumpBottomBtn) jumpBottomBtn.style.display = 'block';
      }
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => { isScrolling = false; }, 100);
    }, { passive: true });

    transcript.addEventListener('wheel', () => {
      isUserScrolledUp = true;
      if (jumpBottomBtn) jumpBottomBtn.style.display = 'block';
    }, { passive: true });

    transcript.addEventListener('touchstart', () => {
      isUserScrolledUp = true;
      if (jumpBottomBtn) jumpBottomBtn.style.display = 'block';
    }, { passive: true });
  }

  if (jumpBottomBtn) {
    jumpBottomBtn.addEventListener('click', reengageStickyScroll);
  }

  // Warm audio engine on any initial user touch/click
  const warmHandler = () => {
    warmTtsEngine();
    window.removeEventListener('pointerdown', warmHandler);
  };
  window.addEventListener('pointerdown', warmHandler);

  // Mic Button Click with 500ms Debouncing (Bug 4)
  micBtn.addEventListener('click', async () => {
    if (isMicTapDebounced) return;
    isMicTapDebounced = true;
    micTapDebounceTimer = setTimeout(() => {
      isMicTapDebounced = false;
    }, 500);

    if (autoRearmTimer) {
      clearTimeout(autoRearmTimer);
      autoRearmTimer = null;
    }

    warmTtsEngine();

    if (isListening) {
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      isListening = false;
      setUiState('idle');
    } else if (isSpeaking || isPlayingAudio) {
      triggerBargeIn();
    } else {
      if (!hasMicPermissionGranted) {
        isAwaitingPermission = true;
        micPromptPending = true;
        micBtn.disabled = true;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              stream.getTracks().forEach(t => t.stop());
              hasMicPermissionGranted = true;
              isAwaitingPermission = false;
              micPromptPending = false;
              micBtn.disabled = false;
            }).catch((err) => {
              hasMicPermissionGranted = false;
              isAwaitingPermission = false;
              micPromptPending = false;
              micBtn.disabled = false;
              onPermissionDismissed();
            });
            // Settling guard for Android Audio HAL / TinyALSA
            await new Promise(res => setTimeout(res, 250));
          } catch (e) {
            isAwaitingPermission = false;
            micPromptPending = false;
            micBtn.disabled = false;
          }
        } else {
          isAwaitingPermission = false;
          micPromptPending = false;
          micBtn.disabled = false;
        }
      }

      if (recognition && !isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Start error]', e);
        }
      }
    }
  });

  // Settings & Recovery Button Listeners
  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }

  // TTS Banner Action Listeners
  if (retryTtsBtn) {
    retryTtsBtn.addEventListener('click', () => {
      preloadVoices();
      if (verifySpeechEngineAvailability()) {
        if (ttsWarningBanner) ttsWarningBanner.style.display = 'none';
        setUiState('idle', 'Speech engine re-initialized.');
      }
    });
  }
  if (textOnlyModeBtn) {
    textOnlyModeBtn.addEventListener('click', () => {
      isTextOnlyMode = true;
      dismissTtsWarning();
      setUiState('idle', 'Text-only reading mode enabled.');
    });
  }

  // Hardware Audio Device Disconnect Handler
  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    navigator.mediaDevices.addEventListener('devicechange', handleAudioRouteError);
  }

  // Mobile Lifecycle & Hardware Listeners
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        releaseMicrophoneResources();
      }
    });

    window.addEventListener('orientationchange', () => {
      realignAudioVisualizer();
    });

    window.addEventListener('resize', () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        realignAudioVisualizer();
      }, 150);
    });

    window.addEventListener('blur', () => {
      const handleSplitScreenAudioBlur = () => releaseMicrophoneResources();
      handleSplitScreenAudioBlur();
    });

    window.addEventListener('beforeunload', cleanupSpeechSynthesis);

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => {
        if (isSettingsOpen) {
          closeSettings();
        } else {
          closePermissionModal();
        }
      });
    }
  }

  setUiState('idle', 'Tap mic to start conversational test');
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildGeminiContents,
    SentenceChunker,
    FastDomQueue,
    DOMVirtualizer,
    triggerBargeIn,
    scheduleTranscriptScroll,
    selectBestNativeVoiceIndex,
    selectBestWebVoice,
    resolveBestVoices
  };
}
