package core.admitra.io;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        WebSettings settings = webView.getSettings();
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
    }
}
