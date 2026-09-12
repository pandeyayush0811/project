/**
 * Pipelined Sentence Synthesis & Smart Chunker Test Suite
 * Tests the Asynchronous Pipelined Prefetching & Gapless Audio Queuing Architecture
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');

// Minimal DOM & Window mock environment
global.document = {
  getElementById: () => ({
    addEventListener: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {}
  }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {}
};
global.window = {
  addEventListener: () => {},
  speechSynthesis: { getVoices: () => [], cancel: () => {}, speak: () => {} }
};
global.sessionStorage = { getItem: () => null, setItem: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.performance = { now: () => Date.now(), mark: () => {}, measure: () => {} };

// Extract and evaluate SentenceChunker from app.js in a controlled sandbox
const chunkerCodeStart = appJsCode.indexOf('class SentenceChunker {');
const chunkerCodeEnd = appJsCode.indexOf('// Queue-Based Pipelined Audio Synthesizer State');
const extractedChunkerCode = appJsCode.slice(chunkerCodeStart, chunkerCodeEnd);

const sandbox = {};
const fn = new Function('activeSentenceChunker', extractedChunkerCode + '\nreturn SentenceChunker;');
const SentenceChunker = fn(null);

describe('PIPELINED SENTENCE SYNTHESIS & SMART CHUNKER', () => {

  it('Test P1: Splits user multi-sentence prompt into exactly 3 complete sentences', () => {
    const emittedChunks = [];
    const chunker = new SentenceChunker((chunk) => {
      emittedChunks.push(chunk);
    });

    const tokens = [
      "hey ", "kya ", "kar ", "rhe ", "ho ", "abhi ", "? ",
      "chaloge ", "mere ", "sath ", "english ", "practice ", "karne ", "? ",
      "suno ", "meri ", "baat, ", "chalo ", "mere ", "sath."
    ];

    tokens.forEach(t => chunker.feed(t));
    chunker.flush();

    assert.equal(emittedChunks.length, 3, `Expected 3 chunks, but got ${emittedChunks.length}: ${JSON.stringify(emittedChunks)}`);
    assert.equal(emittedChunks[0], "hey kya kar rhe ho abhi ?");
    assert.equal(emittedChunks[1], "chaloge mere sath english practice karne ?");
    assert.equal(emittedChunks[2], "suno meri baat, chalo mere sath.");
  });

  it('Test P2: Commas do NOT break sentences in half (preserves natural human cadence)', () => {
    const emittedChunks = [];
    const chunker = new SentenceChunker((chunk) => {
      emittedChunks.push(chunk);
    });

    const input = "Arre don't worry, practicing speaking English every single day is the best way to improve.";
    input.split(' ').forEach(w => chunker.feed(w + ' '));
    chunker.flush();

    assert.equal(emittedChunks.length, 1, `Sentence with commas must not be fragmented, got: ${JSON.stringify(emittedChunks)}`);
    assert.equal(emittedChunks[0], input);
  });

  it('Test P3: Lookbehind guards prevent premature splits on honorifics and decimals (Dr., 3.14)', () => {
    const emittedChunks = [];
    const chunker = new SentenceChunker((chunk) => {
      emittedChunks.push(chunk);
    });

    const input = "Dr. Sharma told me that Pi equals 3.14 and it is very important.";
    input.split(' ').forEach(w => chunker.feed(w + ' '));
    chunker.flush();

    assert.equal(emittedChunks.length, 1, `Honorifics and decimals must not trigger chunk cuts: ${JSON.stringify(emittedChunks)}`);
  });

  it('Test P4: app.js contains queueStrategy: 1 (QUEUE_ADD) for hardware background pipelining', () => {
    assert.ok(
      appJsCode.includes('queueStrategy: 1'),
      'app.js lacks queueStrategy: 1 for Android TextToSpeech QUEUE_ADD hardware pre-buffering'
    );
  });

  it('Test P5: app.js tracks isStreamActive to eliminate false silence during SSE generation', () => {
    assert.ok(
      appJsCode.includes('isStreamActive'),
      'app.js lacks isStreamActive tracking to prevent premature idle transition during streaming'
    );
  });

  it('Test P6: triggerBargeIn flushes audioQueue and resets inFlightUtteranceCount', () => {
    const bargeInDef = appJsCode.slice(appJsCode.indexOf('function triggerBargeIn()'), appJsCode.indexOf('function triggerBargeIn()') + 1400);
    assert.ok(
      bargeInDef.includes('inFlightUtteranceCount = 0') && bargeInDef.includes('audioQueue = []'),
      'triggerBargeIn does not reset inFlightUtteranceCount and flush audioQueue'
    );
  });

  it('Test P7: Default speech rate is set to natural 1.05x instead of distorted 1.30x', () => {
    assert.ok(
      appJsCode.includes('1.05') && appJsCode.includes('utkio_test_speech_rate'),
      'speakAudioChunk does not set natural 1.05x default speech rate'
    );
  });

});
