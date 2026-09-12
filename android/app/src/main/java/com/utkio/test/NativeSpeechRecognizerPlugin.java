package com.utkio.test;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeSpeechRecognizer",
    permissions = {
        @Permission(
            strings = { Manifest.permission.RECORD_AUDIO },
            alias = "microphone"
        )
    }
)
public class NativeSpeechRecognizerPlugin extends Plugin {

    private SpeechRecognizer speechRecognizer;
    private Intent recognizerIntent;
    private boolean isListening = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            startListening(call);
        } else {
            call.reject("Microphone permission denied.");
        }
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                    call.reject("Speech recognition is not available on this device.");
                    return;
                }

                // Always cleanly destroy previous session to prevent Android HAL & Binder lockups
                cleanUpRecognizer();

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getActivity());
                attachListener();

                String lang = call.getString("lang", "en-IN");
                boolean preferOffline = call.getBoolean("preferOffline", false);

                recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                if (preferOffline) {
                    recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
                }
                int completeSilence = call.getInt("completeSilenceMs", 900);
                int possiblyCompleteSilence = call.getInt("possiblyCompleteSilenceMs", 800);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, (long) completeSilence);
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, (long) possiblyCompleteSilence);

                speechRecognizer.startListening(recognizerIntent);
                isListening = true;
                call.resolve();
            } catch (Exception e) {
                cleanUpRecognizer();
                call.reject("Failed to start speech recognition: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (speechRecognizer != null && isListening) {
                    speechRecognizer.stopListening();
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to stop speech recognition: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                cleanUpRecognizer();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to cancel speech recognition: " + e.getMessage());
            }
        });
    }

    private void cleanUpRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.stopListening();
                speechRecognizer.cancel();
                speechRecognizer.destroy();
            } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        isListening = false;
    }

    private void attachListener() {
        if (speechRecognizer == null) return;

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                isListening = true;
                notifyListeners("onReadyForSpeech", new JSObject());
            }

            @Override
            public void onBeginningOfSpeech() {
                isListening = true;
                notifyListeners("onBeginningOfSpeech", new JSObject());
            }

            @Override
            public void onRmsChanged(float rmsdB) {
                JSObject ret = new JSObject();
                ret.put("rmsdB", rmsdB);
                notifyListeners("onRmsChanged", ret);
            }

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {
                notifyListeners("onEndOfSpeech", new JSObject());
            }

            @Override
            public void onError(int error) {
                // If offline model was requested but unavailable (error 13), auto-retry with online speech services
                if ((error == 13 || error == SpeechRecognizer.ERROR_SERVER) && recognizerIntent != null && recognizerIntent.getBooleanExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false)) {
                    android.util.Log.w("NativeSTT", "Offline model unavailable (error " + error + "). Auto-retrying online...");
                    recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false);
                    try {
                        speechRecognizer.startListening(recognizerIntent);
                        return;
                    } catch (Exception ignored) {}
                }

                isListening = false;
                JSObject ret = new JSObject();
                ret.put("error", error);
                String errorMessage = getErrorText(error);
                ret.put("message", errorMessage);
                notifyListeners("onError", ret);
            }

            @Override
            public void onResults(Bundle results) {
                isListening = false;
                ArrayList<String> matches = results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                JSObject ret = new JSObject();
                ret.put("isFinal", true);
                ret.put("transcript", (matches != null && !matches.isEmpty()) ? matches.get(0) : "");
                notifyListeners("onResult", ret);
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults != null ? partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                JSObject ret = new JSObject();
                ret.put("isFinal", false);
                ret.put("transcript", (matches != null && !matches.isEmpty()) ? matches.get(0) : "");
                notifyListeners("onResult", ret);
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });
    }

    private String getErrorText(int errorCode) {
        switch (errorCode) {
            case SpeechRecognizer.ERROR_AUDIO: return "audio-capture";
            case SpeechRecognizer.ERROR_CLIENT: return "client-error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "not-allowed";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network";
            case SpeechRecognizer.ERROR_NO_MATCH: return "nomatch";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "recognizer-busy";
            case SpeechRecognizer.ERROR_SERVER: return "server-error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "no-speech";
            case 12: return "language-not-supported";
            case 13: return "language-unavailable";
            default: return "unknown-error (" + errorCode + ")";
        }
    }

    @Override
    protected void handleOnDestroy() {
        cleanUpRecognizer();
        super.handleOnDestroy();
    }
}
