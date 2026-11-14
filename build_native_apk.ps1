# Build Script for Native Android APK - ARI-Control with Push Notifications
$ErrorActionPreference = "Stop"

$SDK_DIR = "C:\Android"
$BUILD_TOOLS = "$SDK_DIR\build-tools\35.0.0"
$PLATFORM_JAR = "$SDK_DIR\platforms\android-36\android.jar"
$PROJECT_DIR = "D:\Users\Arianny\Downloads\PROYECTOS\ARI"
$ANDROID_DIR = "$PROJECT_DIR\android_app"

Write-Host ">>> Preparando entorno de compilación nativa Android con Notificaciones Push..."

if (Test-Path $ANDROID_DIR) {
    Remove-Item -Recurse -Force $ANDROID_DIR
}

New-Item -ItemType Directory -Path "$ANDROID_DIR\src\com\aricontrol\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\values" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\mipmap-mdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\mipmap-hdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\mipmap-xhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\mipmap-xxhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\res\mipmap-xxxhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\assets" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\build\compiled_res" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\build\classes" -Force | Out-Null
New-Item -ItemType Directory -Path "$ANDROID_DIR\build\gen" -Force | Out-Null

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# 1. Manifest con compatibilidad completa Android (minSdk 24 - targetSdk 34), Notificaciones y Actualizador In-App
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aricontrol.app"
    android:versionCode="209"
    android:versionName="2.9.0">

    <uses-sdk
        android:minSdkVersion="24"
        android:targetSdkVersion="34" />

    <supports-screens
        android:anyDensity="true"
        android:smallScreens="true"
        android:normalScreens="true"
        android:largeScreens="true"
        android:xlargeScreens="true" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:allowBackup="true">

        <activity
            android:name="com.aricontrol.app.MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:windowSoftInputMode="adjustResize"
            android:launchMode="singleTop"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="com.aricontrol.app.GenericFileProvider"
            android:authorities="com.aricontrol.app.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true" />
    </application>
</manifest>
"@
[System.IO.File]::WriteAllText("$ANDROID_DIR\AndroidManifest.xml", $manifest, $utf8NoBom)

# 2. Strings.xml
$strings = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Ari-Control</string>
</resources>
"@
[System.IO.File]::WriteAllText("$ANDROID_DIR\res\values\strings.xml", $strings, $utf8NoBom)

# 3. Copy launcher icons
Copy-Item "$PROJECT_DIR\icons\icon-192.png" "$ANDROID_DIR\res\mipmap-mdpi\ic_launcher.png"
Copy-Item "$PROJECT_DIR\icons\icon-192.png" "$ANDROID_DIR\res\mipmap-hdpi\ic_launcher.png"
Copy-Item "$PROJECT_DIR\icons\icon-192.png" "$ANDROID_DIR\res\mipmap-xhdpi\ic_launcher.png"
Copy-Item "$PROJECT_DIR\icons\icon-512.png" "$ANDROID_DIR\res\mipmap-xxhdpi\ic_launcher.png"
Copy-Item "$PROJECT_DIR\icons\icon-512.png" "$ANDROID_DIR\res\mipmap-xxxhdpi\ic_launcher.png"

# 4. Copy web assets into APK assets/
Copy-Item "$PROJECT_DIR\index.html" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\prestamos.html" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\gastos.html" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\conversor.html" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\version.json" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\manifest.json" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\sw.js" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\css" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\js" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\icons" "$ANDROID_DIR\assets\"

# 4b. GenericFileProvider.java para compartir el APK descargado con el instalador del sistema
$providerCode = @"
package com.aricontrol.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public class GenericFileProvider extends ContentProvider {
    public static final String AUTHORITY = "com.aricontrol.app.fileprovider";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = getFileForUri(uri);
        if (file == null || !file.exists()) return null;

        String[] cols = projection != null ? projection : new String[]{
            OpenableColumns.DISPLAY_NAME,
            OpenableColumns.SIZE
        };

        MatrixCursor cursor = new MatrixCursor(cols, 1);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String col : cols) {
            if (OpenableColumns.DISPLAY_NAME.equals(col)) {
                row.add(file.getName());
            } else if (OpenableColumns.SIZE.equals(col)) {
                row.add(file.length());
            } else {
                row.add(null);
            }
        }
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        return "application/vnd.android.package-archive";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = getFileForUri(uri);
        if (file == null || !file.exists()) {
            throw new FileNotFoundException("File not found: " + uri);
        }
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        File file = getFileForUri(uri);
        if (file != null && file.exists()) {
            return file.delete() ? 1 : 0;
        }
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }

    private File getFileForUri(Uri uri) {
        if (uri == null) return null;
        String name = uri.getLastPathSegment();
        if (name == null) return null;
        File baseDir = getContext().getExternalFilesDir(null);
        if (baseDir == null) {
            baseDir = getContext().getFilesDir();
        }
        File updatesDir = new File(baseDir, "updates");
        File file = new File(updatesDir, name);
        if (file.exists()) return file;
        return new File(baseDir, name);
    }

    public static Uri getUriForFile(android.content.Context context, File file) {
        return Uri.parse("content://" + AUTHORITY + "/" + file.getName());
    }
}
"@
[System.IO.File]::WriteAllText("$ANDROID_DIR\src\com\aricontrol\app\GenericFileProvider.java", $providerCode, $utf8NoBom)

# 5. MainActivity.java con soporte completo de NotificationManager y JavascriptInterface
$javaCode = @"
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
                bridge.downloadAndInstallUpdate(url, "2.9.0");
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.endsWith(".apk") || url.contains(".apk?")) {
                    bridge.downloadAndInstallUpdate(url, "2.9.0");
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
                    webView.evaluateJavascript("if (window.onUpdateDownloadProgress) { window.onUpdateDownloadProgress(" + percent + ", '" + message.replace("'", "\\'") + "'); }", null);
                }
            }
        });
    }

    public void notifyDownloadError(final String error) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    webView.evaluateJavascript("if (window.onUpdateDownloadError) { window.onUpdateDownloadError('" + (error != null ? error.replace("'", "\\'") : "Error") + "'); }", null);
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
                return 209;
            }
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "2.9.0";
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
                        activity.notifyDownloadProgress(5, "Iniciando descarga segura...");
                        java.io.File updatesDir = new java.io.File(activity.getExternalFilesDir(null), "updates");
                        if (!updatesDir.exists()) updatesDir.mkdirs();
                        java.io.File apkFile = new java.io.File(updatesDir, "ARI-Control-v" + versionName + ".apk");
                        if (apkFile.exists()) apkFile.delete();

                        String currentUrl = downloadUrl;
                        java.net.URL url = new java.net.URL(currentUrl);
                        conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setInstanceFollowRedirects(true);
                        conn.setConnectTimeout(20000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)");
                        conn.connect();

                        int responseCode = conn.getResponseCode();
                        if (responseCode == java.net.HttpURLConnection.HTTP_MOVED_PERM || 
                            responseCode == java.net.HttpURLConnection.HTTP_MOVED_TEMP || 
                            responseCode == 307 || responseCode == 308) {
                            String redirectUrl = conn.getHeaderField("Location");
                            if (redirectUrl != null) {
                                conn.disconnect();
                                url = new java.net.URL(redirectUrl);
                                conn = (java.net.HttpURLConnection) url.openConnection();
                                conn.setConnectTimeout(20000);
                                conn.setReadTimeout(30000);
                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)");
                                conn.connect();
                            }
                        }

                        int fileLength = conn.getContentLength();
                        input = new java.io.BufferedInputStream(conn.getInputStream());
                        output = new java.io.FileOutputStream(apkFile);

                        byte[] data = new byte[8192];
                        long total = 0;
                        int count;
                        int lastProgress = 0;

                        while ((count = input.read(data)) != -1) {
                            total += count;
                            output.write(data, 0, count);
                            if (fileLength > 0) {
                                int progress = (int) (total * 100 / fileLength);
                                if (progress >= lastProgress + 5 || progress == 100) {
                                    lastProgress = progress;
                                    activity.notifyDownloadProgress(progress, "Descargando: " + progress + "% (" + Math.round(total / 1024.0 / 1024.0 * 10.0)/10.0 + " MB)");
                                }
                            } else {
                                activity.notifyDownloadProgress(50, "Descargando: " + Math.round(total / 1024.0 / 1024.0 * 10.0)/10.0 + " MB");
                            }
                        }

                        output.flush();
                        output.close();
                        output = null;
                        input.close();
                        input = null;

                        activity.notifyDownloadProgress(100, "Descarga completada. Abriendo instalador...");
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
"@
[System.IO.File]::WriteAllText("$ANDROID_DIR\src\com\aricontrol\app\MainActivity.java", $javaCode, $utf8NoBom)

Write-Host ">>> Compilando recursos con aapt2..."
& "$BUILD_TOOLS\aapt2.exe" compile --dir "$ANDROID_DIR\res" -o "$ANDROID_DIR\build\compiled_res\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host ">>> Enlazando recursos con aapt2 link (minSdk 24, targetSdk 34)..."
& "$BUILD_TOOLS\aapt2.exe" link `
    -o "$ANDROID_DIR\build\app_unaligned.apk" `
    -I "$PLATFORM_JAR" `
    --manifest "$ANDROID_DIR\AndroidManifest.xml" `
    --min-sdk-version 24 `
    --target-sdk-version 34 `
    --version-code 209 `
    --version-name "2.9.0" `
    --java "$ANDROID_DIR\build\gen" `
    --auto-add-overlay `
    "$ANDROID_DIR\build\compiled_res\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host ">>> Compilando código Java..."
$javaFiles = Get-ChildItem -Path "$ANDROID_DIR\src\*.java", "$ANDROID_DIR\build\gen\*.java" -Recurse | Select-Object -ExpandProperty FullName
& javac -cp "$PLATFORM_JAR" -d "$ANDROID_DIR\build\classes" $javaFiles
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

Write-Host ">>> Convirtiendo a DEX con d8..."
$classFiles = Get-ChildItem -Path "$ANDROID_DIR\build\classes\*.class" -Recurse | Select-Object -ExpandProperty FullName
& cmd /c "`"$BUILD_TOOLS\d8.bat`" --lib `"$PLATFORM_JAR`" --output `"$ANDROID_DIR\build`" $($classFiles -join ' ')"
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host ">>> Empaquetando classes.dex y assets dentro del APK..."
Set-Location "$ANDROID_DIR\build"
& jar uf "$ANDROID_DIR\build\app_unaligned.apk" classes.dex
if ($LASTEXITCODE -ne 0) { throw "jar uf classes.dex failed" }

Set-Location "$ANDROID_DIR"
& jar uf "$ANDROID_DIR\build\app_unaligned.apk" -C "$ANDROID_DIR" assets
if ($LASTEXITCODE -ne 0) { throw "jar uf assets failed" }

Set-Location "$PROJECT_DIR"

Write-Host ">>> Alineando APK con zipalign..."
$alignedApk = "$ANDROID_DIR\build\app_aligned.apk"
if (Test-Path $alignedApk) { Remove-Item -Force $alignedApk }
& "$BUILD_TOOLS\zipalign.exe" -v -p 4 "$ANDROID_DIR\build\app_unaligned.apk" $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host ">>> Generando clave de firma criptográfica para APK nativo..."
$keystore = "$ANDROID_DIR\release.keystore"
if (-not (Test-Path $keystore)) {
    & keytool -genkeypair -v -keystore $keystore -alias aricontrol -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass aricontrol2026 -keypass aricontrol2026 `
        -dname "CN=Ari-Control, OU=Finanzas, O=Ari, L=Lima, ST=Lima, C=PE"
}

Write-Host ">>> Firmando APK con apksigner..."
$finalApk = "$PROJECT_DIR\ARI-Control.apk"
if (Test-Path $finalApk) { Remove-Item -Force $finalApk }

& cmd /c "`"$BUILD_TOOLS\apksigner.bat`" sign --ks `"$keystore`" --ks-pass pass:aricontrol2026 --key-pass pass:aricontrol2026 --out `"$finalApk`" `"$alignedApk`""
if ($LASTEXITCODE -ne 0) { throw "apksigner sign failed" }

Write-Host ">>> Verificando firma del APK..."
& cmd /c "`"$BUILD_TOOLS\apksigner.bat`" verify `"$finalApk`""
if ($LASTEXITCODE -ne 0) { throw "apksigner verify failed" }

Write-Host "=========================================================="
Write-Host "¡APK NATIVO CON NOTIFICACIONES PUSH GENERADO EXITOSAMENTE!"
Write-Host "Archivo: $finalApk ($( [math]::Round((Get-Item $finalApk).Length / 1MB, 2) ) MB)"
Write-Host "=========================================================="
