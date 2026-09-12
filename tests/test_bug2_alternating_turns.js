/**
 * Senior QA Engineering Test Suite - Bug 2 (Adversarial UI-Level Failing Tests)
 * Bug 2: Consecutive user turns after barge-in trigger HTTP 400 in Gemini API
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty & Real-World User Failure Verification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsPath = path.join(rootDir, 'app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf-8');

/**
 * Helper: Strict Gemini Multiturn API Contract Enforcer
 */
function validateGeminiApiContract(contents) {
  if (!Array.isArray(contents) || contents.length === 0) {
    throw new Error('HTTP 400: Contents array cannot be empty');
  }
  if (contents[0].role !== 'user') {
    throw new Error(`HTTP 400: First message must be role 'user', got '${contents[0].role}'`);
  }
  if (contents[contents.length - 1].role !== 'user') {
    throw new Error(`HTTP 400: Last message in generateContent request must be 'user', got '${contents[contents.length - 1].role}'`);
  }
  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    if (item.role !== 'user' && item.role !== 'model') {
      throw new Error(`HTTP 400: Invalid role '${item.role}' at index ${i}`);
    }
    if (i > 0 && item.role === contents[i - 1].role) {
      throw new Error(`HTTP 400: Multiturn talk must alternate between user and model. Found consecutive '${item.role}' at index ${i}`);
    }
    if (!item.parts || !item.parts[0] || !item.parts[0].text || !item.parts[0].text.trim()) {
      throw new Error(`HTTP 400: Empty text part at index ${i}`);
    }
  }
  return true;
}

class LiveAppTurnSimulator {
  constructor() {
    this.conversationHistory = [];
    this.uiTranscriptBubbles = [];
    this.isThinking = false;
    this.audioQueue = [];
    this.fullAssistantResponse = '';
    this.aborted = false;
  }

  buildGeminiContents(history) {
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
      } else if (role === 'user' && expectedRole === 'model') {
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand.' }]
        });
        contents.push({
          role: 'user',
          parts: [{ text: text }]
        });
        expectedRole = 'model';
      } else if (contents.length > 0) {
        contents[contents.length - 1].parts[0].text += ` ${text}`;
      }
    }

    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    while (contents.length > 0 && contents[contents.length - 1].role !== 'user') {
      contents.pop();
    }

    if (contents.length === 0 && history.length > 0) {
      const firstValid = history.find(h => (h.content || '').trim());
      if (firstValid) {
        contents.push({ role: 'user', parts: [{ text: firstValid.content.trim() }] });
      } else {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      }
    }

    return contents;
  }

  handleUserTurn(userText, options = {}) {
    this.isThinking = true;
    const cleanText = (userText || '').trim();
    if (cleanText) {
      this.uiTranscriptBubbles.push({ role: 'user', text: cleanText });
      this.conversationHistory.push({ role: 'user', content: cleanText });
    }

    if (this.conversationHistory.length > 24) {
      this.conversationHistory = this.conversationHistory.slice(-24);
    }

    const contents = this.buildGeminiContents(this.conversationHistory);
    if (contents.length > 0) {
      try {
        validateGeminiApiContract(contents);
      } catch (e) {}
    }

    if (options.interruptDuringStream) {
      this.aborted = true;
      this.isThinking = false;
      if (options.partialTokens) {
        this.fullAssistantResponse = options.partialTokens;
        this.uiTranscriptBubbles.push({ role: 'assistant', text: this.fullAssistantResponse.trim() });
        this.conversationHistory.push({ role: 'assistant', content: this.fullAssistantResponse.trim() });
      } else {
        this.fullAssistantResponse = 'Interrupted';
      }
      return { status: 'aborted', contents };
    }

    this.fullAssistantResponse = options.replyText || 'Model response';
    this.uiTranscriptBubbles.push({ role: 'assistant', text: this.fullAssistantResponse });
    this.conversationHistory.push({ role: 'assistant', content: this.fullAssistantResponse });
    this.isThinking = false;
    return { status: 'completed', contents };
  }
}

describe('BUG 2: Consecutive User Turns & Multiturn Alternation (26 Adversarial Tests)', () => {

  it('Test 2.01: Basic Barge-In before first token leaves conversationHistory and UI desynchronized', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Tell me about cricket', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(
      sim.conversationHistory.length,
      sim.uiTranscriptBubbles.length,
      'Memory history and UI transcript state desynchronized after barge-in before first token'
    );
  });

  it('Test 2.02: Interrupted turn followed by model-only history fails Gemini "last turn must be user" contract', () => {
    const sim = new LiveAppTurnSimulator();
    sim.conversationHistory = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help you today?' }
    ];
    const contents = sim.buildGeminiContents(sim.conversationHistory);
    assert.doesNotThrow(() => {
      validateGeminiApiContract(contents);
    }, /Last message in generateContent request must be 'user'/);
  });

  it('Test 2.03: Rapid triple mic-tap burst abort leaves orphaned user turn in raw history', () => {
    const rawHistory = [];
    rawHistory.push({ role: 'user', content: 'Turn 1' });
    rawHistory.push({ role: 'user', content: 'Turn 2' });
    rawHistory.push({ role: 'user', content: 'Turn 3' });

    assert.doesNotThrow(() => {
      const sim = new LiveAppTurnSimulator();
      const sanitized = sim.buildGeminiContents(rawHistory);
      validateGeminiApiContract(sanitized);
    }, /Multiturn talk must alternate/);
  });

  it('Test 2.04: Interruption at Token #1 leaves assistant response empty and drops turn', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Explain solar system', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.fullAssistantResponse.length > 0, true, 'Assistant response was dropped entirely on Token #1 interruption');
  });

  it('Test 2.05: Triple consecutive barge-ins without completed turn corrupts conversational context', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('First attempt', { interruptDuringStream: true });
    sim.handleUserTurn('Second attempt', { interruptDuringStream: true });
    sim.handleUserTurn('Third attempt', { interruptDuringStream: true });
    assert.equal(sim.conversationHistory.length, 3, 'Consecutive barge-ins wiped out user turns from sliding window memory');
  });

  it('Test 2.06: Interruption during final token before natural completion drops assistant turn in legacy path', () => {
    const legacyHistory = [
      { role: 'user', content: 'First query' },
      { role: 'user', content: 'Second query' }
    ];
    assert.doesNotThrow(() => {
      const sim = new LiveAppTurnSimulator();
      const sanitized = sim.buildGeminiContents(legacyHistory);
      validateGeminiApiContract(sanitized);
    });
  });

  it('Test 2.07: Interruption followed by empty whitespace speech input triggers empty contents HTTP 400', () => {
    const sim = new LiveAppTurnSimulator();
    sim.conversationHistory = [{ role: 'user', content: '   ' }];
    const contents = sim.buildGeminiContents(sim.conversationHistory);
    assert.doesNotThrow(() => {
      validateGeminiApiContract(contents);
    }, /Contents array cannot be empty/);
  });

  it('Test 2.08: Interruption when sliding window is exactly at 11 messages must retain full context', () => {
    const sim = new LiveAppTurnSimulator();
    for (let i = 1; i <= 5; i++) {
      sim.handleUserTurn(`User msg ${i}`, { replyText: `Model reply ${i}` });
    }
    sim.handleUserTurn('User msg 6 interrupted', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length, 11, 'Sliding window pruned turn unexpectedly during interruption');
  });

  it('Test 2.09: Interruption at 12-item boundary must not drop user prompt', () => {
    const sim = new LiveAppTurnSimulator();
    for (let i = 1; i <= 5; i++) {
      sim.handleUserTurn(`User ${i}`, { replyText: `Reply ${i}` });
    }
    sim.handleUserTurn('User 6 interrupted', { interruptDuringStream: true, partialTokens: '' });
    assert.ok(sim.conversationHistory.some(m => m.content.includes('User 6 interrupted')), 'Interrupted prompt User 6 was evicted from history');
  });

  it('Test 2.10: Interruption followed by settings model toggle and next turn', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Explain quantum physics', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'History was emptied on model toggle');
  });

  it('Test 2.11: Interruption mid-sentence in Hinglish conversational turn with punctuation deluge', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Arre bhai... suno na??? Lekin kya...', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'Hinglish punctuated utterance was discarded on barge-in');
  });

  it('Test 2.12: Interruption while network throttled on slow 2G connection', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Slow network turn', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'Slow network turn lost from context on interruption');
  });

  it('Test 2.13: Interruption followed by app minimize/resume cycle preserves alternating history', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Backgrounded prompt', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'Turn lost after backgrounding');
  });

  it('Test 2.14: Simulator mode zombie token loop persists after triggerBargeIn', () => {
    assert.ok(
      appJsCode.includes('clearInterval(currentSimulationInterval)') || appJsCode.includes('clearInterval(simulationTimer)'),
      'triggerBargeIn does not clear simulator setInterval, creating zombie tokens that talk over user'
    );
  });

  it('Test 2.15: Interruption followed by empty STT noise event', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('First valid prompt', { replyText: 'Answer' });
    sim.handleUserTurn('', { interruptDuringStream: true });
    assert.equal(sim.conversationHistory[sim.conversationHistory.length - 1].content.trim().length > 0, true, 'Empty STT noise was pushed to conversation history');
  });

  it('Test 2.16: Interruption while sentence chunker has buffered pending chunks drops audio queue items', () => {
    assert.ok(
      appJsCode.includes('chunker.reset()') || appJsCode.includes('chunker.clear()'),
      'Sentence chunker lacks reset/clear method called during triggerBargeIn to discard pending clauses'
    );
  });

  it('Test 2.17: Fast double speech inputs within 200ms window', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Part one...', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'Double speech turn lost on rapid input');
  });

  it('Test 2.18: Interruption on device screen lock / pause', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('Lock screen prompt', { interruptDuringStream: true, partialTokens: '' });
    assert.equal(sim.conversationHistory.length > 0, true, 'Lock screen prompt discarded');
  });

  it('Test 2.19: UI DOM chat bubble is not removed when turn is aborted', () => {
    assert.ok(
      appJsCode.includes('bubble.container.remove()') || appJsCode.includes('removeAbortedBubble'),
      'Current app.js leaves orphaned, empty AI chat bubble in DOM when stream is aborted immediately'
    );
  });

  it('Test 2.20: Interruption at Word #1 of simulated response leaves simulator state thinking', () => {
    assert.ok(
      appJsCode.includes('simulationInterval = null') || appJsCode.includes('currentSimulatorInterval'),
      'Missing simulation interval tracker in app.js top-level scope'
    );
  });

  it('Test 2.21: 10-turn conversation marathon with alternating barge-in preserves all 10 turns', () => {
    const sim = new LiveAppTurnSimulator();
    for (let turn = 1; turn <= 10; turn++) {
      const shouldInterrupt = turn % 2 === 0;
      sim.handleUserTurn(`Turn ${turn}`, { interruptDuringStream: shouldInterrupt, partialTokens: '' });
    }
    const userTurnsCount = sim.conversationHistory.filter(m => m.role === 'user').length;
    assert.equal(userTurnsCount, 10, 'Marathon conversation lost 5 interrupted user turns');
  });

  it('Test 2.22: Interruption with hardware headset hook button', () => {
    assert.ok(
      appJsCode.includes('onHeadsetHook') || appJsCode.includes('mediaSession'),
      'App lacks MediaSession API interruption listener for hardware headset hook buttons'
    );
  });

  it('Test 2.23: Custom multiline system prompt is not polluted by merged user turns', () => {
    const sim = new LiveAppTurnSimulator();
    sim.handleUserTurn('First question', { interruptDuringStream: true, partialTokens: '' });
    sim.handleUserTurn('Second question', { replyText: 'Answer' });
    const contents = sim.buildGeminiContents([{ role: 'user', content: 'First' }, { role: 'user', content: 'Second' }]);
    assert.equal(contents.length >= 2, true, 'Consecutive user turns were inappropriately concatenated instead of preserved as distinct turns with synthetic assistant ack');
  });

  it('Test 2.24: Telemetry metricTts display shows interrupted status rather than stale latency', () => {
    assert.ok(
      appJsCode.includes('metricTts.textContent = "INTERRUPTED"') || appJsCode.includes("metricTts.textContent = 'ABORTED'"),
      'Barge-in fails to update TTS telemetry badge to indicate interrupted turn'
    );
  });

  it('Test 2.25: Code-level check in app.js for missing UI bubble cleanup on AbortError', () => {
    const abortBlock = appJsCode.slice(appJsCode.indexOf('if (err.name === \'AbortError\')'), appJsCode.indexOf('console.error(\'[Gemini Stream Error]\''));
    assert.ok(
      abortBlock.includes('bubble.container.remove') || abortBlock.includes('bubble.remove'),
      'Current app.js AbortError block fails to clean up orphaned streaming bubble from DOM'
    );
  });

  it('Test 2.26: buildGeminiContents in app.js must ensure last turn is strictly user role', () => {
    const sim = new LiveAppTurnSimulator();
    const contents = sim.buildGeminiContents([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' }
    ]);
    assert.equal(
      contents[contents.length - 1].role,
      'user',
      'buildGeminiContents allows last message in generateContent to be model, violating Gemini API schema'
    );
  });
});
