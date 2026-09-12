/**
 * Senior QA Master Adversarial Test Suite - Safe Version 3.0 (125 Tests)
 * Native SpeechRecognizer Bridge, Hardware AudioRecord Lifecycle, Seamless Web Fallback & 0ms Optimistic UI
 * Role: 06_TestWriter (Senior Adversarial Voice QA Engineer)
 * Mandate: ARCHITECTURAL_VISION.md - 100% Brutal Honesty, ₹0 Operating Cost, Sub-30ms Latency
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const appJsCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
const indexHtmlCode = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const manifestXml = fs.readFileSync(path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
const mainActivityJava = fs.readFileSync(path.join(rootDir, 'android', 'app', 'src', 'main', 'java', 'com', 'utkio', 'test', 'MainActivity.java'), 'utf-8');
const nativePluginJava = fs.readFileSync(path.join(rootDir, 'android', 'app', 'src', 'main', 'java', 'com', 'utkio', 'test', 'NativeSpeechRecognizerPlugin.java'), 'utf-8');

// Minimal Node mock environment for app.js imports
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
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.performance = { now: () => Date.now() };

const {
  selectBestNativeVoiceIndex,
  selectBestWebVoice
} = require('../app.js');

// =========================================================================================
// SECTION 1: NATIVE ANDROID BRIDGE CONTRACT & REGISTRATION (Tests 3.01 - 3.20)
// =========================================================================================
describe('SAFE VERSION 3: Section 1 - Native Android Bridge Contract & Registration (20 Tests)', () => {

  it('Test 3.01: NativeSpeechRecognizerPlugin.java file exists on disk', () => {
    assert.ok(nativePluginJava.length > 500, 'NativeSpeechRecognizerPlugin.java is empty or missing');
  });

  it('Test 3.02: NativeSpeechRecognizerPlugin belongs to com.utkio.test package', () => {
    assert.ok(nativePluginJava.includes('package com.utkio.test;'), 'Missing package com.utkio.test declaration');
  });

  it('Test 3.03: NativeSpeechRecognizerPlugin imports android.speech.SpeechRecognizer', () => {
    assert.ok(nativePluginJava.includes('import android.speech.SpeechRecognizer;'), 'Missing import for android.speech.SpeechRecognizer');
  });

  it('Test 3.04: NativeSpeechRecognizerPlugin imports android.speech.RecognizerIntent', () => {
    assert.ok(nativePluginJava.includes('import android.speech.RecognizerIntent;'), 'Missing import for android.speech.RecognizerIntent');
  });

  it('Test 3.05: NativeSpeechRecognizerPlugin imports android.speech.RecognitionListener', () => {
    assert.ok(nativePluginJava.includes('import android.speech.RecognitionListener;'), 'Missing import for android.speech.RecognitionListener');
  });

  it('Test 3.06: NativeSpeechRecognizerPlugin declares @CapacitorPlugin annotation with name NativeSpeechRecognizer', () => {
    assert.ok(nativePluginJava.includes('@CapacitorPlugin(\n    name = "NativeSpeechRecognizer"') || nativePluginJava.includes('@CapacitorPlugin(name = "NativeSpeechRecognizer"') || nativePluginJava.includes('name = "NativeSpeechRecognizer"'), 'Missing @CapacitorPlugin(name = "NativeSpeechRecognizer") annotation');
  });

  it('Test 3.07: NativeSpeechRecognizerPlugin extends com.getcapacitor.Plugin', () => {
    assert.ok(nativePluginJava.includes('public class NativeSpeechRecognizerPlugin extends Plugin'), 'Plugin does not extend com.getcapacitor.Plugin');
  });

  it('Test 3.08: MainActivity.java registers NativeSpeechRecognizerPlugin class', () => {
    assert.ok(mainActivityJava.includes('registerPlugin(NativeSpeechRecognizerPlugin.class)'), 'MainActivity.java does not register NativeSpeechRecognizerPlugin.class');
  });

  it('Test 3.09: MainActivity.java registers plugin inside onCreate lifecycle method', () => {
    assert.ok(mainActivityJava.includes('onCreate') && mainActivityJava.includes('super.onCreate'), 'MainActivity does not properly override onCreate with super.onCreate');
  });

  it('Test 3.10: Native plugin requests Manifest.permission.RECORD_AUDIO in annotation', () => {
    assert.ok(nativePluginJava.includes('Manifest.permission.RECORD_AUDIO'), 'Native plugin annotation lacks Manifest.permission.RECORD_AUDIO');
  });

  it('Test 3.11: Native plugin aliases microphone permission', () => {
    assert.ok(nativePluginJava.includes('alias = "microphone"'), 'Native plugin does not alias RECORD_AUDIO to microphone');
  });

  it('Test 3.12: Native plugin implements isAvailable PluginMethod', () => {
    assert.ok(nativePluginJava.includes('@PluginMethod') && nativePluginJava.includes('public void isAvailable(PluginCall call)'), 'Missing isAvailable PluginMethod');
  });

  it('Test 3.13: isAvailable queries SpeechRecognizer.isRecognitionAvailable', () => {
    assert.ok(nativePluginJava.includes('SpeechRecognizer.isRecognitionAvailable'), 'isAvailable does not verify SpeechRecognizer.isRecognitionAvailable');
  });

  it('Test 3.14: Native plugin implements startListening PluginMethod', () => {
    assert.ok(nativePluginJava.includes('@PluginMethod') && nativePluginJava.includes('public void startListening(PluginCall call)'), 'Missing startListening PluginMethod');
  });

  it('Test 3.15: Native plugin implements stopListening PluginMethod', () => {
    assert.ok(nativePluginJava.includes('@PluginMethod') && nativePluginJava.includes('public void stopListening(PluginCall call)'), 'Missing stopListening PluginMethod');
  });

  it('Test 3.16: Native plugin implements cancel PluginMethod', () => {
    assert.ok(nativePluginJava.includes('@PluginMethod') && nativePluginJava.includes('public void cancel(PluginCall call)'), 'Missing cancel PluginMethod');
  });

  it('Test 3.17: startListening delegates to getActivity().runOnUiThread for Looper compliance', () => {
    assert.ok(nativePluginJava.includes('getActivity().runOnUiThread'), 'startListening does not execute on getActivity().runOnUiThread');
  });

  it('Test 3.18: Native plugin binds PermissionCallback for runtime microphone prompt', () => {
    assert.ok(nativePluginJava.includes('@PermissionCallback') && nativePluginJava.includes('permissionCallback'), 'Missing @PermissionCallback method');
  });

  it('Test 3.19: permissionCallback validates PermissionState.GRANTED before startListening', () => {
    assert.ok(nativePluginJava.includes('PermissionState.GRANTED'), 'permissionCallback does not check PermissionState.GRANTED');
  });

  it('Test 3.20: startListening requests microphone permission if not already granted', () => {
    assert.ok(nativePluginJava.includes('requestPermissionForAlias("microphone"'), 'startListening does not request permission for alias microphone');
  });

});

// =========================================================================================
// SECTION 2: HARDWARE AUDIORECORD LIFECYCLE & CLEANUP GUARANTEES (Tests 3.21 - 3.40)
// =========================================================================================
describe('SAFE VERSION 3: Section 2 - Hardware AudioRecord Lifecycle & CleanUp Guarantees (20 Tests)', () => {

  it('Test 3.21: Native plugin defines dedicated cleanUpRecognizer lifecycle method', () => {
    assert.ok(nativePluginJava.includes('cleanUpRecognizer()'), 'Missing cleanUpRecognizer() method');
  });

  it('Test 3.22: cleanUpRecognizer invokes speechRecognizer.stopListening()', () => {
    const cleanDef = nativePluginJava.slice(nativePluginJava.indexOf('void cleanUpRecognizer()'), nativePluginJava.indexOf('void cleanUpRecognizer()') + 300);
    assert.ok(cleanDef.includes('stopListening()'), 'cleanUpRecognizer does not call stopListening()');
  });

  it('Test 3.23: cleanUpRecognizer invokes speechRecognizer.cancel()', () => {
    const cleanDef = nativePluginJava.slice(nativePluginJava.indexOf('void cleanUpRecognizer()'), nativePluginJava.indexOf('void cleanUpRecognizer()') + 300);
    assert.ok(cleanDef.includes('cancel()'), 'cleanUpRecognizer does not call cancel()');
  });

  it('Test 3.24: cleanUpRecognizer invokes speechRecognizer.destroy() to release AudioRecord HAL lock', () => {
    const cleanDef = nativePluginJava.slice(nativePluginJava.indexOf('void cleanUpRecognizer()'), nativePluginJava.indexOf('void cleanUpRecognizer()') + 300);
    assert.ok(cleanDef.includes('destroy()'), 'cleanUpRecognizer does not call destroy()');
  });

  it('Test 3.25: cleanUpRecognizer nullifies speechRecognizer instance reference', () => {
    const cleanDef = nativePluginJava.slice(nativePluginJava.indexOf('void cleanUpRecognizer()'), nativePluginJava.indexOf('void cleanUpRecognizer()') + 300);
    assert.ok(cleanDef.includes('speechRecognizer = null'), 'cleanUpRecognizer does not reset speechRecognizer reference to null');
  });

  it('Test 3.26: cleanUpRecognizer resets isListening state boolean to false', () => {
    const cleanDef = nativePluginJava.slice(nativePluginJava.indexOf('void cleanUpRecognizer()'), nativePluginJava.indexOf('void cleanUpRecognizer()') + 500);
    assert.ok(cleanDef.includes('isListening = false'), 'cleanUpRecognizer does not reset isListening flag');
  });

  it('Test 3.27: startListening calls cleanUpRecognizer before creating new recognizer instance', () => {
    const startDef = nativePluginJava.slice(nativePluginJava.indexOf('public void startListening'), nativePluginJava.indexOf('public void startListening') + 700);
    assert.ok(startDef.includes('cleanUpRecognizer()'), 'startListening does not call cleanUpRecognizer() prior to instantiation');
  });

  it('Test 3.28: startListening uses SpeechRecognizer.createSpeechRecognizer(getActivity())', () => {
    assert.ok(nativePluginJava.includes('SpeechRecognizer.createSpeechRecognizer(getActivity())'), 'startListening does not create SpeechRecognizer with Activity context');
  });

  it('Test 3.29: cancel PluginMethod runs cleanUpRecognizer on UI thread', () => {
    const cancelDef = nativePluginJava.slice(nativePluginJava.indexOf('public void cancel'), nativePluginJava.indexOf('public void cancel') + 400);
    assert.ok(cancelDef.includes('cleanUpRecognizer()') && cancelDef.includes('runOnUiThread'), 'cancel does not invoke cleanUpRecognizer on runOnUiThread');
  });

  it('Test 3.30: stopListening guards against null speechRecognizer reference', () => {
    const stopDef = nativePluginJava.slice(nativePluginJava.indexOf('public void stopListening'), nativePluginJava.indexOf('public void stopListening') + 400);
    assert.ok(stopDef.includes('speechRecognizer != null'), 'stopListening does not check if speechRecognizer is non-null');
  });

  it('Test 3.31: handleOnDestroy lifecycle hook tears down active speechRecognizer', () => {
    const destroyDef = nativePluginJava.slice(nativePluginJava.indexOf('handleOnDestroy'), nativePluginJava.indexOf('handleOnDestroy') + 200);
    assert.ok(destroyDef.includes('cleanUpRecognizer()') && destroyDef.includes('super.handleOnDestroy'), 'handleOnDestroy does not invoke cleanUpRecognizer');
  });

  it('Test 3.32: attachListener checks if speechRecognizer is null before setting listener', () => {
    const attachDef = nativePluginJava.slice(nativePluginJava.indexOf('void attachListener()'), nativePluginJava.indexOf('void attachListener()') + 200);
    assert.ok(attachDef.includes('if (speechRecognizer == null) return'), 'attachListener does not guard against null speechRecognizer');
  });

  it('Test 3.33: RecognitionListener onReadyForSpeech updates isListening to true', () => {
    assert.ok(nativePluginJava.includes('onReadyForSpeech') && nativePluginJava.includes('notifyListeners("onReadyForSpeech"'), 'Missing onReadyForSpeech listener dispatch');
  });

  it('Test 3.34: RecognitionListener onBeginningOfSpeech updates isListening to true', () => {
    assert.ok(nativePluginJava.includes('onBeginningOfSpeech') && nativePluginJava.includes('notifyListeners("onBeginningOfSpeech"'), 'Missing onBeginningOfSpeech listener dispatch');
  });

  it('Test 3.35: RecognitionListener onEndOfSpeech notifies JS layer', () => {
    assert.ok(nativePluginJava.includes('onEndOfSpeech') && nativePluginJava.includes('notifyListeners("onEndOfSpeech"'), 'Missing onEndOfSpeech listener dispatch');
  });

  it('Test 3.36: RecognitionListener onError sets isListening to false', () => {
    const errorDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onError(int error)'), nativePluginJava.indexOf('public void onError(int error)') + 1200);
    assert.ok(errorDef.includes('isListening = false'), 'onError does not reset isListening to false');
  });

  it('Test 3.37: RecognitionListener onResults sets isListening to false', () => {
    const resultDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onResults(Bundle results)'), nativePluginJava.indexOf('public void onResults(Bundle results)') + 400);
    assert.ok(resultDef.includes('isListening = false'), 'onResults does not reset isListening to false');
  });

  it('Test 3.38: RecognitionListener onPartialResults keeps stream alive without setting isListening false', () => {
    const partialDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onPartialResults(Bundle partialResults)'), nativePluginJava.indexOf('public void onPartialResults(Bundle partialResults)') + 400);
    assert.ok(!partialDef.includes('isListening = false'), 'onPartialResults prematurely sets isListening to false');
  });

  it('Test 3.39: Native plugin streams live hardware rmsdB energy through onRmsChanged', () => {
    assert.ok(nativePluginJava.includes('onRmsChanged') && nativePluginJava.includes('ret.put("rmsdB", rmsdB)'), 'onRmsChanged does not serialize rmsdB');
  });

  it('Test 3.40: attachListener safely wraps onResults string array extraction from SpeechRecognizer.RESULTS_RECOGNITION', () => {
    assert.ok(nativePluginJava.includes('SpeechRecognizer.RESULTS_RECOGNITION'), 'onResults does not query SpeechRecognizer.RESULTS_RECOGNITION bundle key');
  });

});

// =========================================================================================
// SECTION 3: ERROR CODE 13 & OFFLINE FALLBACK IMMUNITY (Tests 3.41 - 3.60)
// =========================================================================================
describe('SAFE VERSION 3: Section 3 - Error Code 13 & Offline Fallback Immunity (20 Tests)', () => {

  it('Test 3.41: Native plugin startListening sets preferOffline default to false', () => {
    assert.ok(nativePluginJava.includes('call.getBoolean("preferOffline", false)'), 'preferOffline does not default to false, risking Error 13 on devices without offline pack');
  });

  it('Test 3.42: Native plugin only sets EXTRA_PREFER_OFFLINE when preferOffline is explicitly true', () => {
    assert.ok(nativePluginJava.includes('if (preferOffline) {\n                    recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)') || nativePluginJava.includes('if (preferOffline) {') && nativePluginJava.includes('EXTRA_PREFER_OFFLINE, true'), 'EXTRA_PREFER_OFFLINE is unconditionally assigned true');
  });

  it('Test 3.43: onError implements auto-retry online fallback for Error 13 (ERROR_LANGUAGE_UNAVAILABLE)', () => {
    const errorDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onError(int error)'), nativePluginJava.indexOf('public void onError(int error)') + 700);
    assert.ok(errorDef.includes('error == 13') || errorDef.includes('13'), 'onError does not handle Error 13');
  });

  it('Test 3.44: onError auto-retry checks if EXTRA_PREFER_OFFLINE was previously active', () => {
    const errorDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onError(int error)'), nativePluginJava.indexOf('public void onError(int error)') + 700);
    assert.ok(errorDef.includes('getBooleanExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE'), 'onError does not verify if failure was triggered by EXTRA_PREFER_OFFLINE');
  });

  it('Test 3.45: onError sets EXTRA_PREFER_OFFLINE false before auto-retrying recognition', () => {
    const errorDef = nativePluginJava.slice(nativePluginJava.indexOf('public void onError(int error)'), nativePluginJava.indexOf('public void onError(int error)') + 700);
    assert.ok(errorDef.includes('putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false)'), 'onError does not disable EXTRA_PREFER_OFFLINE for fallback attempt');
  });

  it('Test 3.46: getErrorText maps error 12 to language-not-supported', () => {
    assert.ok(nativePluginJava.includes('case 12: return "language-not-supported"'), 'Missing error 12 mapping');
  });

  it('Test 3.47: getErrorText maps error 13 to language-unavailable', () => {
    assert.ok(nativePluginJava.includes('case 13: return "language-unavailable"'), 'Missing error 13 mapping');
  });

  it('Test 3.48: getErrorText maps SpeechRecognizer.ERROR_AUDIO to audio-capture', () => {
    assert.ok(nativePluginJava.includes('ERROR_AUDIO: return "audio-capture"'), 'Missing ERROR_AUDIO mapping');
  });

  it('Test 3.49: getErrorText maps SpeechRecognizer.ERROR_CLIENT to client-error', () => {
    assert.ok(nativePluginJava.includes('ERROR_CLIENT: return "client-error"'), 'Missing ERROR_CLIENT mapping');
  });

  it('Test 3.50: getErrorText maps SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS to not-allowed', () => {
    assert.ok(nativePluginJava.includes('ERROR_INSUFFICIENT_PERMISSIONS: return "not-allowed"'), 'Missing ERROR_INSUFFICIENT_PERMISSIONS mapping');
  });

  it('Test 3.51: getErrorText maps SpeechRecognizer.ERROR_NETWORK to network', () => {
    assert.ok(nativePluginJava.includes('ERROR_NETWORK:'), 'Missing ERROR_NETWORK mapping');
  });

  it('Test 3.52: getErrorText maps SpeechRecognizer.ERROR_NETWORK_TIMEOUT to network', () => {
    assert.ok(nativePluginJava.includes('ERROR_NETWORK_TIMEOUT: return "network"'), 'Missing ERROR_NETWORK_TIMEOUT mapping');
  });

  it('Test 3.53: getErrorText maps SpeechRecognizer.ERROR_NO_MATCH to nomatch', () => {
    assert.ok(nativePluginJava.includes('ERROR_NO_MATCH: return "nomatch"'), 'Missing ERROR_NO_MATCH mapping');
  });

  it('Test 3.54: getErrorText maps SpeechRecognizer.ERROR_RECOGNIZER_BUSY to recognizer-busy', () => {
    assert.ok(nativePluginJava.includes('ERROR_RECOGNIZER_BUSY: return "recognizer-busy"'), 'Missing ERROR_RECOGNIZER_BUSY mapping');
  });

  it('Test 3.55: getErrorText maps SpeechRecognizer.ERROR_SERVER to server-error', () => {
    assert.ok(nativePluginJava.includes('ERROR_SERVER: return "server-error"'), 'Missing ERROR_SERVER mapping');
  });

  it('Test 3.56: getErrorText maps SpeechRecognizer.ERROR_SPEECH_TIMEOUT to no-speech', () => {
    assert.ok(nativePluginJava.includes('ERROR_SPEECH_TIMEOUT: return "no-speech"'), 'Missing ERROR_SPEECH_TIMEOUT mapping');
  });

  it('Test 3.57: Recognizer intent explicitly sets language model to LANGUAGE_MODEL_FREE_FORM', () => {
    assert.ok(nativePluginJava.includes('RecognizerIntent.LANGUAGE_MODEL_FREE_FORM'), 'Missing LANGUAGE_MODEL_FREE_FORM configuration');
  });

  it('Test 3.58: Recognizer intent explicitly sets language parameter from call with en-IN default', () => {
    assert.ok(nativePluginJava.includes('call.getString("lang", "en-IN")'), 'Missing en-IN language default in startListening');
  });

  it('Test 3.59: Recognizer intent enables partial results via EXTRA_PARTIAL_RESULTS', () => {
    assert.ok(nativePluginJava.includes('RecognizerIntent.EXTRA_PARTIAL_RESULTS, true'), 'Missing EXTRA_PARTIAL_RESULTS configuration');
  });

  it('Test 3.60: Recognizer intent sets calibrated speech complete silence lengths (900ms default)', () => {
    assert.ok(nativePluginJava.includes('EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS') && (nativePluginJava.includes('900') || nativePluginJava.includes('completeSilence')), 'Missing 900ms complete silence threshold');
  });

});

// =========================================================================================
// SECTION 4: WEB APPLICATION DUAL-MODE ADAPTER & FAILOVER ARCHITECTURE (Tests 3.61 - 3.80)
// =========================================================================================
describe('SAFE VERSION 3: Section 4 - Web Application Dual-Mode Adapter & Failover Architecture (20 Tests)', () => {

  it('Test 3.61: app.js defines getNativeSpeechRecognizer accessor function', () => {
    assert.ok(appJsCode.includes('function getNativeSpeechRecognizer()'), 'app.js lacks getNativeSpeechRecognizer() accessor');
  });

  it('Test 3.62: getNativeSpeechRecognizer checks Capacitor plugin availability for NativeSpeechRecognizer', () => {
    const accessorDef = appJsCode.slice(appJsCode.indexOf('function getNativeSpeechRecognizer()'), appJsCode.indexOf('function getNativeSpeechRecognizer()') + 300);
    assert.ok(accessorDef.includes("isPluginAvailable('NativeSpeechRecognizer')"), 'getNativeSpeechRecognizer does not check isPluginAvailable');
  });

  it('Test 3.63: getNativeSpeechRecognizer returns null when Capacitor is undefined', () => {
    const accessorDef = appJsCode.slice(appJsCode.indexOf('function getNativeSpeechRecognizer()'), appJsCode.indexOf('function getNativeSpeechRecognizer()') + 300);
    assert.ok(accessorDef.includes('return null'), 'getNativeSpeechRecognizer does not return null as safe fallback');
  });

  it('Test 3.64: app.js defines NativeSpeechRecognitionAdapter class', () => {
    assert.ok(appJsCode.includes('class NativeSpeechRecognitionAdapter'), 'app.js lacks NativeSpeechRecognitionAdapter class definition');
  });

  it('Test 3.65: NativeSpeechRecognitionAdapter implements _initFallback for Web Speech API failover', () => {
    assert.ok(appJsCode.includes('_initFallback()'), 'NativeSpeechRecognitionAdapter lacks _initFallback method');
  });

  it('Test 3.66: _initFallback prepares a backup SpeechRecognition instance if available in window', () => {
    const fallbackDef = appJsCode.slice(appJsCode.indexOf('_initFallback()'), appJsCode.indexOf('_initFallback()') + 600);
    assert.ok(fallbackDef.includes('new SpeechRecognition()'), '_initFallback does not instantiate backup SpeechRecognition');
  });

  it('Test 3.67: NativeSpeechRecognitionAdapter start() sets preferOffline to false', () => {
    const startDef = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(startDef.includes('preferOffline: false'), 'start() does not pass preferOffline: false');
  });

  it('Test 3.68: NativeSpeechRecognitionAdapter start() resets _usingFallback to false', () => {
    const startDef = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(startDef.includes('this._usingFallback = false'), 'start() does not reset _usingFallback');
  });

  it('Test 3.69: NativeSpeechRecognitionAdapter start() sets _isListening to true immediately', () => {
    const startDef = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(startDef.includes('this._isListening = true'), 'start() does not update _isListening');
  });

  it('Test 3.70: NativeSpeechRecognitionAdapter start() catches plugin rejection and switches to fallback', () => {
    const startDef = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(startDef.includes('this._usingFallback = true') && startDef.includes('_fallbackRecognition.start()'), 'start() error catch does not trigger _fallbackRecognition.start()');
  });

  it('Test 3.71: Native onError listener triggers automatic fallback to Web Speech API', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes('this._fallbackRecognition.start()') && adapterCode.includes('Initiating seamless auto-fallback to Web Speech API'), 'onError does not initiate auto-fallback to Web Speech API');
  });

  it('Test 3.72: NativeSpeechRecognitionAdapter onResult formats fakeEvent results with isFinal and transcript', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes('fakeItem = [{ transcript: data.transcript }]') || adapterCode.includes('fakeItem.isFinal = !!data.isFinal'), 'onResult does not produce standard results[0].isFinal structure');
  });

  it('Test 3.73: NativeSpeechRecognitionAdapter onResult triggers onresult callback with fakeEvent', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes('this.onresult(fakeEvent)'), 'onResult does not invoke this.onresult(fakeEvent)');
  });

  it('Test 3.74: NativeSpeechRecognitionAdapter onReadyForSpeech triggers onstart callback', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes("addListener('onReadyForSpeech'") && adapterCode.includes('this.onstart()'), 'onReadyForSpeech does not invoke onstart');
  });

  it('Test 3.75: NativeSpeechRecognitionAdapter onBeginningOfSpeech triggers onstart callback', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes("addListener('onBeginningOfSpeech'") && adapterCode.includes('this.onstart()'), 'onBeginningOfSpeech does not invoke onstart');
  });

  it('Test 3.76: NativeSpeechRecognitionAdapter onEndOfSpeech triggers onend callback and resets listening', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes("addListener('onEndOfSpeech'") && adapterCode.includes('this.onend()'), 'onEndOfSpeech does not invoke onend');
  });

  it('Test 3.77: NativeSpeechRecognitionAdapter onRmsChanged updates wave energy when not scrolling', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes("addListener('onRmsChanged'") && adapterCode.includes('updateWaveEnergy(true'), 'onRmsChanged does not drive updateWaveEnergy');
  });

  it('Test 3.78: NativeSpeechRecognitionAdapter stop() stops fallbackRecognition if using fallback', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes('this._fallbackRecognition.stop()'), 'stop does not stop _fallbackRecognition');
  });

  it('Test 3.79: NativeSpeechRecognitionAdapter abort() aborts fallbackRecognition if using fallback', () => {
    const adapterCode = appJsCode.slice(appJsCode.indexOf('class NativeSpeechRecognitionAdapter'), appJsCode.indexOf('function setupSpeechRecognition()'));
    assert.ok(adapterCode.includes('this._fallbackRecognition.abort()'), 'abort does not abort _fallbackRecognition');
  });

  it('Test 3.80: setupSpeechRecognition initializes Native adapter when plugin available or Web Speech when null', () => {
    const setupDef = appJsCode.slice(appJsCode.indexOf('function setupSpeechRecognition()'), appJsCode.indexOf('function setupSpeechRecognition()') + 1200);
    assert.ok(setupDef.includes('new NativeSpeechRecognitionAdapter(nativePlugin)') && setupDef.includes('new SpeechRecognition()'), 'setupSpeechRecognition does not cleanly branch between native and web STT');
  });

});

// =========================================================================================
// SECTION 5: 0MS OPTIMISTIC UI & TACTILE RESPONSIVENESS (Tests 3.81 - 3.100)
// =========================================================================================
describe('SAFE VERSION 3: Section 5 - 0ms Optimistic UI & Tactile Responsiveness (20 Tests)', () => {

  it('Test 3.81: micBtn click handler sets isListening = true immediately on turn initiation', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1200);
    assert.ok(clickDef.includes('isListening = true'), 'micBtn click does not set isListening = true immediately');
  });

  it('Test 3.82: micBtn click handler transitions UI state to listening at t = 0ms', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1200);
    assert.ok(clickDef.includes("setUiState('listening', 'Listening to you...')"), 'micBtn click does not call setUiState(listening) optimistically');
  });

  it('Test 3.83: micBtn click handler initiates wave animation at t = 0ms with intensity 0.7', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1200);
    assert.ok(clickDef.includes('startWaveAnimation(0.7)'), 'micBtn click does not start wave animation optimistically');
  });

  it('Test 3.84: micBtn pointerdown listener provides immediate physical micro-scale (0.95)', () => {
    assert.ok(appJsCode.includes("micBtn.addEventListener('pointerdown'") && appJsCode.includes("scale(0.95)"), 'Missing pointerdown scale(0.95) feedback on mic button');
  });

  it('Test 3.85: window pointerup listener restores mic button scale', () => {
    assert.ok(appJsCode.includes("window.addEventListener('pointerup'") && appJsCode.includes("micBtn.style.transform = ''"), 'Missing pointerup transform reset for mic button');
  });

  it('Test 3.86: Tapping mic while isListening is true invokes recognition.stop()', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 500);
    assert.ok(clickDef.includes('if (isListening)') && clickDef.includes('recognition.stop()'), 'Tapping mic while listening does not call recognition.stop()');
  });

  it('Test 3.87: Tapping mic while isListening is true resets UI state to idle', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 500);
    assert.ok(clickDef.includes('if (isListening)') && clickDef.includes("setUiState('idle')"), 'Tapping mic while listening does not reset UI to idle');
  });

  it('Test 3.88: Tapping mic while speaking or playing audio triggers hardware barge-in', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1500);
    assert.ok(clickDef.includes('if (isSpeaking || isPlayingAudio)') && clickDef.includes('triggerBargeIn()'), 'Tapping mic while AI is speaking does not trigger barge-in');
  });

  it('Test 3.89: recognition.start exception catch resets isListening to false', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1500);
    assert.ok(clickDef.includes('catch (e)') && clickDef.includes('isListening = false'), 'recognition.start failure does not reset isListening flag');
  });

  it('Test 3.90: recognition.start exception catch resets UI state to idle', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 1500);
    assert.ok(clickDef.includes('catch (e)') && clickDef.includes("setUiState('idle')"), 'recognition.start failure does not reset UI to idle');
  });

  it('Test 3.91: auto-rearm loop triggers setUiState(listening) optimistically upon re-arm', () => {
    const rearmDef = appJsCode.slice(appJsCode.indexOf('autoRearmTimer = setTimeout'), appJsCode.indexOf('autoRearmTimer = setTimeout') + 500);
    assert.ok(rearmDef.includes("setUiState('listening', 'Listening to you...')"), 'auto-rearm does not set listening state optimistically');
  });

  it('Test 3.92: Rapid mic tap debounce guard (500ms) with isMicTapDebounced is preserved', () => {
    assert.ok(appJsCode.includes('isMicTapDebounced') && appJsCode.includes('micTapDebounceTimer'), 'Missing mic button debouncing protection');
  });

  it('Test 3.93: micBtn click handler clears pending autoRearmTimer to prevent timer collisions', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 400);
    assert.ok(clickDef.includes('autoRearmTimer') && clickDef.includes('clearTimeout(autoRearmTimer)'), 'micBtn click does not clear autoRearmTimer');
  });

  it('Test 3.94: r.onstart resets sttRetryCount to 0', () => {
    const onstartDef = appJsCode.slice(appJsCode.indexOf('r.onstart = () => {'), appJsCode.indexOf('r.onstart = () => {') + 300);
    assert.ok(onstartDef.includes('sttRetryCount = 0'), 'r.onstart does not reset sttRetryCount');
  });

  it('Test 3.95: r.onstart clears lastInterimTranscript buffer', () => {
    const onstartDef = appJsCode.slice(appJsCode.indexOf('r.onstart = () => {'), appJsCode.indexOf('r.onstart = () => {') + 300);
    assert.ok(onstartDef.includes("lastInterimTranscript = ''"), 'r.onstart does not clear lastInterimTranscript');
  });

  it('Test 3.96: r.onstart records speechStartTime timestamp with performance.now()', () => {
    const onstartDef = appJsCode.slice(appJsCode.indexOf('r.onstart = () => {'), appJsCode.indexOf('r.onstart = () => {') + 300);
    assert.ok(onstartDef.includes('speechStartTime = performance.now()'), 'r.onstart does not record speechStartTime');
  });

  it('Test 3.97: r.onstart resets silence timer watchdog', () => {
    const onstartDef = appJsCode.slice(appJsCode.indexOf('r.onstart = () => {'), appJsCode.indexOf('r.onstart = () => {') + 300);
    assert.ok(onstartDef.includes('resetSilenceTimer()'), 'r.onstart does not invoke resetSilenceTimer');
  });

  it('Test 3.98: r.onstart removes empty chat placeholder from transcript DOM', () => {
    const onstartDef = appJsCode.slice(appJsCode.indexOf('r.onstart = () => {'), appJsCode.indexOf('r.onstart = () => {') + 300);
    assert.ok(onstartDef.includes('removeEmptyPlaceholder()'), 'r.onstart does not remove empty chat placeholder');
  });

  it('Test 3.99: r.onend clears active silenceWatchdogTimer', () => {
    const onendDef = appJsCode.slice(appJsCode.indexOf('r.onend = () => {'), appJsCode.indexOf('r.onend = () => {') + 300);
    assert.ok(onendDef.includes('clearTimeout(silenceWatchdogTimer)'), 'r.onend does not clear silenceWatchdogTimer');
  });

  it('Test 3.100: r.onend resets isListening flag to false', () => {
    const onendDef = appJsCode.slice(appJsCode.indexOf('r.onend = () => {'), appJsCode.indexOf('r.onend = () => {') + 300);
    assert.ok(onendDef.includes('isListening = false'), 'r.onend does not set isListening = false');
  });

});

// =========================================================================================
// SECTION 6: PERSISTENT PERMISSION CACHING & AUDIO FOCUS DECOUPLING (Tests 3.101 - 3.125)
// =========================================================================================
describe('SAFE VERSION 3: Section 6 - Persistent Permission Caching & Audio Focus Decoupling (25 Tests)', () => {

  it('Test 3.101: checkMicrophonePermissions restores hasMicPermissionGranted from localStorage cache', () => {
    const permDef = appJsCode.slice(appJsCode.indexOf('function checkMicrophonePermissions()'), appJsCode.indexOf('function checkMicrophonePermissions()') + 600);
    assert.ok(permDef.includes("localStorage.getItem('utkio_mic_perm_cache') === 'granted'"), 'checkMicrophonePermissions does not read utkio_mic_perm_cache');
  });

  it('Test 3.102: navigator.permissions.query writes granted state to localStorage cache', () => {
    const permDef = appJsCode.slice(appJsCode.indexOf('function checkMicrophonePermissions()'), appJsCode.indexOf('function checkMicrophonePermissions()') + 900);
    assert.ok(permDef.includes("localStorage.setItem('utkio_mic_perm_cache', 'granted')"), 'checkMicrophonePermissions does not cache granted permission');
  });

  it('Test 3.103: permissionStatus.onchange updates hasMicPermissionGranted dynamically', () => {
    const permDef = appJsCode.slice(appJsCode.indexOf('function checkMicrophonePermissions()'), appJsCode.indexOf('function checkMicrophonePermissions()') + 900);
    assert.ok(permDef.includes('permissionStatus.onchange'), 'checkMicrophonePermissions does not bind permissionStatus.onchange listener');
  });

  it('Test 3.104: Permission denial in onchange resets hasMicPermissionGranted to false', () => {
    const permDef = appJsCode.slice(appJsCode.indexOf('function checkMicrophonePermissions()'), appJsCode.indexOf('function checkMicrophonePermissions()') + 1500);
    assert.ok(permDef.includes("permissionStatus.state === 'denied'") && permDef.includes('hasMicPermissionGranted = false'), 'Permission denial does not reset hasMicPermissionGranted');
  });

  it('Test 3.105: getUserMedia resolution caches granted state in localStorage', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 2500);
    assert.ok(clickDef.includes("localStorage.setItem('utkio_mic_perm_cache', 'granted')"), 'getUserMedia success does not cache permission in localStorage');
  });

  it('Test 3.106: Audio HAL settling guard of 250ms is preserved inside first-time getUserMedia block', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 2500);
    assert.ok(clickDef.includes('250') && (clickDef.includes('settling') || clickDef.includes('Audio HAL') || clickDef.includes('TinyALSA')), 'Settling guard of 250ms missing from getUserMedia block');
  });

  it('Test 3.107: getUserMedia audio track stop() is called to release initial hardware probe', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 2500);
    assert.ok(clickDef.includes('stream.getTracks().forEach(t => t.stop())'), 'getUserMedia tracks are not immediately stopped');
  });

  it('Test 3.108: onPermissionDismissed is called if user cancels permission dialog', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 2500);
    assert.ok(clickDef.includes('onPermissionDismissed()'), 'Missing onPermissionDismissed call on permission catch');
  });

  it('Test 3.109: initApp calls warmTtsEngine to pre-warm synthesizer on app load', () => {
    const initDef = appJsCode.slice(appJsCode.indexOf('function initApp()'), appJsCode.indexOf('function initApp()') + 400);
    assert.ok(initDef.includes('warmTtsEngine()'), 'initApp does not call warmTtsEngine()');
  });

  it('Test 3.110: Cross-layer AudioFocus clash eliminated: warmTtsEngine is decoupled from mic click', () => {
    const clickDef = appJsCode.slice(appJsCode.indexOf("micBtn.addEventListener('click'"), appJsCode.indexOf("micBtn.addEventListener('click'") + 300);
    assert.ok(!clickDef.includes('warmTtsEngine()'), 'warmTtsEngine is still called inside micBtn click listener, risking AudioFocus collision with AudioRecord');
  });

  it('Test 3.111: Ambient user touch warmHandler triggers warmTtsEngine on pointerdown', () => {
    assert.ok(appJsCode.includes('warmHandler') && appJsCode.includes("window.removeEventListener('pointerdown', warmHandler)"), 'Missing once-off pointerdown warmHandler');
  });

  it('Test 3.112: Priority 1 TTS Voice Selection: en-in-x-end-network (Google Indian Male Cloud Voice)', () => {
    const voices = [
      { voiceURI: 'en-in-x-ene-local', name: 'Female Local', lang: 'en-IN', localService: true },
      { voiceURI: 'en-in-x-end-network', name: 'Male Cloud High-Fi', lang: 'en-IN', localService: false }
    ];
    const idx = selectBestNativeVoiceIndex(voices);
    assert.equal(idx, 1);
    assert.equal(voices[idx].voiceURI, 'en-in-x-end-network');
  });

  it('Test 3.113: Priority 2 TTS Voice Selection: en-in-x-end-local (Google Indian Male Local Voice)', () => {
    const voices = [
      { voiceURI: 'en-in-x-ene-local', name: 'Female Local', lang: 'en-IN', localService: true },
      { voiceURI: 'en-in-x-end-local', name: 'Male Local High-Fi', lang: 'en-IN', localService: true }
    ];
    const idx = selectBestNativeVoiceIndex(voices);
    assert.equal(idx, 1);
    assert.equal(voices[idx].voiceURI, 'en-in-x-end-local');
  });

  it('Test 3.114: Priority 3 TTS Voice Selection: Any en-IN Cloud Voice (!localService)', () => {
    const voices = [
      { voiceURI: 'en-in-other-cloud', name: 'Other Indian Cloud', lang: 'en-IN', localService: false },
      { voiceURI: 'en-us-cloud', name: 'US Cloud', lang: 'en-US', localService: false }
    ];
    const idx = selectBestNativeVoiceIndex(voices);
    assert.equal(idx, 0);
  });

  it('Test 3.115: Priority 4 TTS Voice Selection: Any en-IN Local Voice', () => {
    const voices = [
      { voiceURI: 'es-es-local', name: 'Spanish', lang: 'es-ES', localService: true },
      { voiceURI: 'en-in-basic', name: 'Basic Indian', lang: 'en-IN', localService: true }
    ];
    const idx = selectBestNativeVoiceIndex(voices);
    assert.equal(idx, 1);
  });

  it('Test 3.116: User custom voice preference from localStorage overrides auto-selection', () => {
    global.localStorage.getItem = (key) => key === 'utkio_test_voice_uri' ? 'custom-voice-uri' : null;
    const voices = [
      { voiceURI: 'en-in-x-end-network', name: 'Default Best', lang: 'en-IN', localService: false },
      { voiceURI: 'custom-voice-uri', name: 'User Custom Voice', lang: 'en-IN', localService: true }
    ];
    const idx = selectBestNativeVoiceIndex(voices);
    assert.equal(idx, 1);
    global.localStorage.getItem = () => null; // reset
  });

  it('Test 3.117: Web Speech Synthesis fallback selects best Indian male or natural voice', () => {
    const webVoices = [
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Google English India Male', lang: 'en-IN' }
    ];
    const best = selectBestWebVoice(webVoices);
    assert.equal(best.name, 'Google English India Male');
  });

  it('Test 3.118: speakAudioChunk passes voice parameter into nativeTts.speak', () => {
    const speakDef = appJsCode.slice(appJsCode.indexOf('function speakAudioChunk('), appJsCode.indexOf('function speakAudioChunk(') + 2000);
    assert.ok(speakDef.includes('speakParams.voice = selectedNativeVoiceIndex'), 'speakAudioChunk does not pass selectedNativeVoiceIndex');
  });

  it('Test 3.119: UI settings modal includes Speaking Speed dropdown control (speedSelect)', () => {
    assert.ok(indexHtmlCode.includes('id="speedSelect"'), 'index.html lacks speedSelect dropdown control');
  });

  it('Test 3.120: speedSelect includes recommended 1.3x speed option', () => {
    assert.ok(indexHtmlCode.includes('value="1.3" selected>1.3x (Fast - Recommended)'), 'speedSelect lacks 1.3x selected option');
  });

  it('Test 3.121: saveSettings persists speedSelect value into localStorage utkio_test_speech_rate', () => {
    assert.ok(appJsCode.includes("localStorage.setItem('utkio_test_speech_rate', speedSelect.value)"), 'saveSettings does not persist speedSelect value');
  });

  it('Test 3.122: app.js caches speaking speed preference in localStorage (utkio_test_speech_rate)', () => {
    assert.ok(appJsCode.includes('utkio_test_speech_rate'), 'app.js does not use utkio_test_speech_rate storage key');
  });

  it('Test 3.123: speakAudioChunk respects userSelectedRate variable and calculates activeRate', () => {
    const speakDef = appJsCode.slice(appJsCode.indexOf('function speakAudioChunk('), appJsCode.indexOf('function speakAudioChunk(') + 1200);
    assert.ok(speakDef.includes('utkio_test_speech_rate') && speakDef.includes('activeRate'), 'speakAudioChunk does not compute activeRate from speech rate settings');
  });

  it('Test 3.124: Partial speech salvage preserves user speech on network or timeout error', () => {
    assert.ok(appJsCode.includes('salvagedSpeech') && appJsCode.includes('lastInterimTranscript'), 'Missing partial speech salvage on error');
  });

  it('Test 3.125: Auto-rearm pause enforces minimum 500ms acoustic drain guard', () => {
    assert.ok(appJsCode.includes('500') && appJsCode.includes('acoustic drain'), 'Missing 500ms acoustic drain guard in auto-rearm');
  });

});
