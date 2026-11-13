# Build Script for Native Android APK - ARI-Control
$ErrorActionPreference = "Stop"

$SDK_DIR = "C:\Android"
$BUILD_TOOLS = "$SDK_DIR\build-tools\35.0.0"
$PLATFORM_JAR = "$SDK_DIR\platforms\android-36\android.jar"
$PROJECT_DIR = "D:\Users\Arianny\Downloads\PROYECTOS\ARI"
$ANDROID_DIR = "$PROJECT_DIR\android_app"

Write-Host ">>> Preparando entorno de compilación nativa Android..."

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

# 1. Manifest
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aricontrol.app"
    android:versionCode="204"
    android:versionName="2.4.2">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">

        <activity
            android:name="com.aricontrol.app.MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:windowSoftInputMode="adjustResize"
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

# 5. MainActivity.java
$javaCode = @"
package com.aricontrol.app;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.content.Intent;
import android.net.Uri;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0b0e14"));
            window.setNavigationBarColor(Color.parseColor("#0b0e14"));
        }

        webView = new WebView(this);
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
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith("https://ari-gastos.pages.dev")) {
                    view.loadUrl("file:///android_asset/index.html");
                }
            }
        });

        // Carga la app conectada en vivo a la nube con fallback offline
        webView.loadUrl("https://ari-gastos.pages.dev/");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
"@
[System.IO.File]::WriteAllText("$ANDROID_DIR\src\com\aricontrol\app\MainActivity.java", $javaCode, $utf8NoBom)

Write-Host ">>> Compilando recursos con aapt2..."
& "$BUILD_TOOLS\aapt2.exe" compile --dir "$ANDROID_DIR\res" -o "$ANDROID_DIR\build\compiled_res\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host ">>> Enlazando recursos con aapt2 link..."
& "$BUILD_TOOLS\aapt2.exe" link `
    -o "$ANDROID_DIR\build\app_unaligned.apk" `
    -I "$PLATFORM_JAR" `
    --manifest "$ANDROID_DIR\AndroidManifest.xml" `
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
Write-Host "¡APK NATIVO GENERADO EXITOSAMENTE!"
Write-Host "Archivo: $finalApk ($( [math]::Round((Get-Item $finalApk).Length / 1MB, 2) ) MB)"
Write-Host "=========================================================="
