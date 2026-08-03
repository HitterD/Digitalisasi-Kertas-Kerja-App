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
call npm.cmd run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Syncing web assets to Android project...
call npx.cmd cap sync android
if %ERRORLEVEL% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo Copying android project to a temp directory to avoid Synology Drive issues...
set "TEMP_DIR=C:\temp\app1_android_build"
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
mkdir "%TEMP_DIR%\android"

echo Mirroring project files to %TEMP_DIR%\android...
robocopy android "%TEMP_DIR%\android" /MIR /XD build .gradle /NFL /NDL /NJH /NJS

echo Creating junction for node_modules...
powershell -Command "New-Item -ItemType Junction -Path '%TEMP_DIR%\node_modules' -Value '%~dp0node_modules' -Force | Out-Null"

echo.
echo [3/3] Building APK...
cd /d "%TEMP_DIR%\android"
call .\gradlew.bat clean
call .\gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo ERROR: APK build failed!
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo Copying APK back to project...
cd /d "%~dp0"
copy "%TEMP_DIR%\android\app\build\outputs\apk\debug\app-debug.apk" ".\app-debug.apk" /Y
echo APK built successfully at app\app-debug.apk!

echo Cleaning up temp directory...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ============================================
echo   BUILD SUKSES!
echo.
echo   APK lokasi:
echo   app-debug.apk
echo.
echo   Transfer APK ke tablet lalu install.
echo ============================================
echo.

REM Copy APK to project root for easy access  
copy "app-debug.apk" "OpnameAsetICT.apk" /Y
echo.
echo   APK juga di-copy ke: OpnameAsetICT.apk
echo.

echo ============================================
echo   MENGINSTALL KE PERANGKAT (ADB)...
echo ============================================
set "ADB_PATH=C:\Users\IT18\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if exist "%ADB_PATH%" (
    "%ADB_PATH%" devices
    "%ADB_PATH%" install -r "OpnameAsetICT.apk"
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [WARNING] Gagal menginstall via ADB. Pastikan perangkat terhubung dan developer mode aktif.
    ) else (
        echo.
        echo [SUCCESS] APK berhasil diinstall ke perangkat!
    )
) else (
    echo [WARNING] ADB tidak ditemukan di %ADB_PATH%. Silakan install manual.
)
echo.

pause
