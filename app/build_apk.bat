@echo off
title Build APK - Opname Aset ICT
echo ============================================
echo   Opname Aset ICT - Build APK Android
echo ============================================
echo.

REM Set JAVA_HOME to Android Studio bundled JDK
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

cd /d "%~dp0"

echo [1/3] Building web app (production)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Syncing web assets to Android project...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Building APK...
cd android
call .\gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo ERROR: APK build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo   BUILD SUKSES!
echo.
echo   APK lokasi:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo   Transfer APK ke tablet lalu install.
echo ============================================
echo.

REM Copy APK to project root for easy access  
copy "android\app\build\outputs\apk\debug\app-debug.apk" "OpnameAsetICT.apk" /Y
echo.
echo   APK juga di-copy ke: OpnameAsetICT.apk
echo.

pause
