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

# 1. Manifest con compatibilidad completa Android (minSdk 24 - targetSdk 34) y Notificaciones Push
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aricontrol.app"
    android:versionCode="206"
    android:versionName="2.6.0">

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
Copy-Item "$PROJECT_DIR\manifest.json" "$ANDROID_DIR\assets\"
Copy-Item "$PROJECT_DIR\sw.js" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\css" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\js" "$ANDROID_DIR\assets\"
Copy-Item -Recurse "$PROJECT_DIR\icons" "$ANDROID_DIR\assets\"

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.WHITE);
            window.setNavigationBarColor(Color.WHITE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        createNotificationChannel();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setWebChromeClient(new WebChromeClient());

        // Puente nativo para Notificaciones Push de cobros y sincronización de barras del sistema
        AndroidBridge bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidApp");
        webView.addJavascriptInterface(bridge, "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
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
                    int color = Color.parseColor(colorHex);
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

    public static class AndroidBridge {
        private final MainActivity activity;

        public AndroidBridge(MainActivity activity) {
            this.activity = activity;
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
    --version-code 206 `
    --version-name "2.6.0" `
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
