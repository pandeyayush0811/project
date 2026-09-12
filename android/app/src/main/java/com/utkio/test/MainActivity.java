package com.utkio.test;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSpeechRecognizerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

