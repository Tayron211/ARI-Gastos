package com.aricontrol.app;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String CHANNEL_ID = "cobros_channel";
    private static final String CHANNEL_NAME = "Cobros y Deudores";
    private static final int REQ_POST_NOTIFICATIONS = 101;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences("ari_app_prefs", Context.MODE_PRIVATE);
        String savedColor = prefs.getString("status_bar_color", null);
        boolean isLight;
        String colorHex;

        if (savedColor != null) {
            colorHex = savedColor;
            isLight = prefs.getBoolean("is_light_bar", false);
        } else {
            colorHex = "#0b0e14";
            isLight = false;
        }

        int initColor = Color.parseColor(colorHex);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(initColor);
            window.setNavigationBarColor(initColor);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = getWindow().getDecorView();
            int flags = decor.getSystemUiVisibility();
            if (isLight) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (isLight) {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
            }
            decor.setSystemUiVisibility(flags);
        }

        createNotificationChannel();

        webView = new WebView(this);
        webView.setBackgroundColor(initColor);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setWebChromeClient(new WebChromeClient());

        // Puente nativo para Notificaciones Push de cobros y sincronización de barras del sistema
        final AndroidBridge bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidApp");
        webView.addJavascriptInterface(bridge, "AndroidBridge");

        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                bridge.downloadAndInstallUpdate(url, "2.9.2");
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.endsWith(".apk") || url.contains(".apk?")) {
                    bridge.downloadAndInstallUpdate(url, "2.9.2");
                    return true;
                }
                if (url.startsWith("https://ari-gastos.pages.dev") || 
                    url.startsWith("file:///android_asset/")) {
                    return false;
                }
                if (url.startsWith("tel:") || url.startsWith("mailto:") || 
                    url.startsWith("https://wa.me") || url.startsWith("whatsapp:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {}
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("document.documentElement.classList.add('is-native-apk'); if (document.body) { document.body.classList.add('is-native-apk'); }", null);
                view.evaluateJavascript(
                    "(function() { return document.documentElement.getAttribute('data-theme') || localStorage.getItem('finanflow_theme') || 'light'; })();",
                    new android.webkit.ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String value) {
                            boolean isDark = (value != null && value.toLowerCase().contains("dark"));
                            updateSystemBars(isDark ? "#0b0e14" : "#ffffff", !isDark);
                        }
                    }
                );
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith("https://ari-gastos.pages.dev")) {
                    view.loadUrl("file:///android_asset/index.html");
                }
            }
        });

        // Solicitar permisos de notificación si Android 13+
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQ_POST_NOTIFICATIONS);
            }
        }

        // Carga la app conectada en vivo a la nube con fallback offline
        webView.loadUrl("https://ari-gastos.pages.dev/");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Recordatorios de cobros a deudores, cuotas de hoy y moras");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#14b8a6"));
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    public void updateSystemBars(final String colorHex, final boolean isLight) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    SharedPreferences prefs = getSharedPreferences("ari_app_prefs", Context.MODE_PRIVATE);
                    prefs.edit()
                         .putString("status_bar_color", colorHex)
                         .putBoolean("is_light_bar", isLight)
                         .apply();

                    int color = Color.parseColor(colorHex);
                    if (webView != null) {
                        webView.setBackgroundColor(color);
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        Window window = getWindow();
                        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                        window.setStatusBarColor(color);
                        window.setNavigationBarColor(color);
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        View decor = getWindow().getDecorView();
                        int flags = decor.getSystemUiVisibility();
                        if (isLight) {
                            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        } else {
                            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            if (isLight) {
                                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            } else {
                                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            }
                        }
                        decor.setSystemUiVisibility(flags);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public void notifyDownloadProgress(final int percent, final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String cleanMsg = (message != null ? message.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " ") : "");
                    webView.evaluateJavascript("if (window.onUpdateDownloadProgress) { window.onUpdateDownloadProgress(" + percent + ", '" + cleanMsg + "'); }", null);
                }
            }
        });
    }

    public void notifyDownloadError(final String error) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String cleanErr = (error != null ? error.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " ") : "Error desconocido");
                    webView.evaluateJavascript("if (window.onUpdateDownloadError) { window.onUpdateDownloadError('" + cleanErr + "'); }", null);
                }
            }
        });
    }

    private java.io.File pendingInstallApkFile = null;

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingInstallApkFile != null && pendingInstallApkFile.exists()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                java.io.File fileToInstall = pendingInstallApkFile;
                pendingInstallApkFile = null;
                promptInstallApk(fileToInstall);
            }
        }
    }

    public void promptInstallApk(final java.io.File apkFile) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (!getPackageManager().canRequestPackageInstalls()) {
                            pendingInstallApkFile = apkFile;
                            Intent settingsIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                            settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                            startActivity(settingsIntent);
                            if (webView != null) {
                                webView.evaluateJavascript("if (window.onUpdatePermissionNeeded) { window.onUpdatePermissionNeeded(); }", null);
                            }
                            return;
                        }
                    }

                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    Uri apkUri = GenericFileProvider.getUriForFile(MainActivity.this, apkFile);
                    intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    java.util.List<android.content.pm.ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                    for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
                        grantUriPermission(resolveInfo.activityInfo.packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }

                    startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyDownloadError("No se pudo iniciar la instalación: " + e.getMessage());
                }
            }
        });
    }

    public static class AndroidBridge {
        private final MainActivity activity;

        public AndroidBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            try {
                return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionCode;
            } catch (Exception e) {
                return 211;
            }
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "2.9.2";
            }
        }

        @JavascriptInterface
        public boolean canRequestPackageInstalls() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return activity.getPackageManager().canRequestPackageInstalls();
            }
            return true;
        }

        @JavascriptInterface
        public void openInstallPermissionSettings() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    intent.setData(Uri.parse("package:" + activity.getPackageName()));
                    activity.startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        @JavascriptInterface
        public void downloadAndInstallUpdate(final String downloadUrl, final String versionName) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    java.net.HttpURLConnection conn = null;
                    java.io.InputStream input = null;
                    java.io.OutputStream output = null;
                    try {
                        activity.notifyDownloadProgress(10, "Iniciando descarga segura...");
                        java.io.File updatesDir = new java.io.File(activity.getCacheDir(), "updates");
                        if (!updatesDir.exists()) updatesDir.mkdirs();
                        java.io.File apkFile = new java.io.File(updatesDir, "ARI-Control.apk");
                        if (apkFile.exists()) apkFile.delete();

                        String currentUrl = downloadUrl;
                        java.net.URL url = new java.net.URL(currentUrl);
                        conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setInstanceFollowRedirects(true);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; AriControl/2.9)");
                        conn.setRequestProperty("Accept-Encoding", "identity");
                        conn.connect();

                        int responseCode = conn.getResponseCode();
                        if (responseCode == java.net.HttpURLConnection.HTTP_MOVED_PERM || 
                            responseCode == java.net.HttpURLConnection.HTTP_MOVED_TEMP || 
                            responseCode == 307 || responseCode == 308) {
                            String redirectUrl = conn.getHeaderField("Location");
                            if (redirectUrl != null) {
                                conn.disconnect();
                                url = new java.net.URL(url, redirectUrl);
                                conn = (java.net.HttpURLConnection) url.openConnection();
                                conn.setConnectTimeout(15000);
                                conn.setReadTimeout(30000);
                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; AriControl/2.9)");
                                conn.setRequestProperty("Accept-Encoding", "identity");
                                conn.connect();
                            }
                        }

                        long fileLength = conn.getContentLength();
                        if (fileLength <= 0) {
                            String lenHdr = conn.getHeaderField("Content-Length");
                            if (lenHdr != null) {
                                try { fileLength = Long.parseLong(lenHdr); } catch (Exception ignored) {}
                            }
                        }
                        if (fileLength <= 0) {
                            fileLength = 1350000L;
                        }

                        input = new java.io.BufferedInputStream(conn.getInputStream());
                        output = new java.io.FileOutputStream(apkFile);

                        byte[] data = new byte[8192];
                        long total = 0;
                        int count;
                        int lastProgress = 10;

                        while ((count = input.read(data)) != -1) {
                            output.write(data, 0, count);
                            total += count;
                            int progress = (int) Math.min(95, Math.max(10, (total * 95) / fileLength));
                            if (progress >= lastProgress + 5) {
                                lastProgress = progress;
                                String mb = String.format(java.util.Locale.US, "%.1f MB", total / (1024.0 * 1024.0));
                                activity.notifyDownloadProgress(progress, "Descargando: " + progress + "% (" + mb + ")");
                            }
                        }

                        output.flush();
                        output.close();
                        output = null;
                        input.close();
                        input = null;

                        activity.notifyDownloadProgress(100, "Descarga lista. Abriendo instalador...");
                        activity.promptInstallApk(apkFile);
                    } catch (final Exception e) {
                        activity.notifyDownloadError(e.getMessage());
                    } finally {
                        try { if (output != null) output.close(); } catch (Exception ignored) {}
                        try { if (input != null) input.close(); } catch (Exception ignored) {}
                        if (conn != null) conn.disconnect();
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void setStatusBarColor(final String colorHex, final boolean isLight) {
            activity.updateSystemBars(colorHex, isLight);
        }

        @JavascriptInterface
        public void setAppTheme(final String theme) {
            boolean isLight = "light".equalsIgnoreCase(theme);
            activity.updateSystemBars(isLight ? "#ffffff" : "#0b0e14", isLight);
        }

        @JavascriptInterface
        public boolean isNotificationEnabled() {
            try {
                NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager == null) return false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    if (!manager.areNotificationsEnabled()) return false;
                }
                if (Build.VERSION.SDK_INT >= 33) {
                    return activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= 33) {
                        activity.requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQ_POST_NOTIFICATIONS);
                    }
                }
            });
        }

        @JavascriptInterface
        public void showNotification(final String title, final String message, final String tag) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
                        if (manager == null) return;

                        Intent intent = new Intent(activity, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        intent.putExtra("from_notification", true);
                        intent.putExtra("tag", tag);

                        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            flags |= PendingIntent.FLAG_IMMUTABLE;
                        }
                        PendingIntent pendingIntent = PendingIntent.getActivity(
                            activity,
                            (int) System.currentTimeMillis(),
                            intent,
                            flags
                        );

                        Notification.Builder builder;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            builder = new Notification.Builder(activity, CHANNEL_ID);
                        } else {
                            builder = new Notification.Builder(activity);
                            builder.setPriority(Notification.PRIORITY_HIGH);
                        }

                        builder.setContentTitle(title)
                               .setContentText(message)
                               .setStyle(new Notification.BigTextStyle().bigText(message))
                               .setSmallIcon(R.mipmap.ic_launcher)
                               .setAutoCancel(true)
                               .setContentIntent(pendingIntent)
                               .setVibrate(new long[]{0, 250, 150, 250});

                        int notifId = (tag != null) ? Math.abs(tag.hashCode()) : (int) System.currentTimeMillis();
                        manager.notify(notifId, builder.build());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public String getPlatform() {
            return "ANDROID_NATIVE_APK";
        }
    }
}