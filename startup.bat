@echo off
setlocal EnableDelayedExpansion

title Opname Aset ICT - [DEVELOPMENT MODE]
echo ============================================
echo   Opname Aset ICT - Kertas Kerja Digital
echo   [DEVELOPMENT MODE - HOST IP]
echo ============================================
echo   Untuk PRODUCTION di server, gunakan: deploy.bat
echo ============================================
echo.

cd /d "%~dp0app"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Menginstall dependencies...
    call npm install
    echo.
)

:: Auto-detect IP address komputer ini (IPv4 LAN)
set "MY_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4" ^| findstr /V "169.254 172."') do (
    for /f "tokens=*" %%j in ("%%i") do (
        if "!MY_IP!"=="" set "MY_IP=%%j"
    )
)

if defined MY_IP set "MY_IP=!MY_IP: =!"

if "!MY_IP!"=="" (
    set "MY_IP=localhost"
    echo [!] Gagal mendeteksi IP otomatis. Menggunakan localhost.
)

:: Baca PORT dari .env jika ada, default 5181
set "APP_PORT=5181"
if exist ".env" (
    for /f "tokens=1,* delims==" %%a in ('findstr /B "PORT=" ".env" 2^>nul') do (
        if not "%%b"=="" set "APP_PORT=%%b"
    )
)

echo [INFO] Menjalankan Backend & Frontend...
echo [INFO] IP Address Komputer : !MY_IP!
echo [INFO] URL Web Application  : http://!MY_IP!:!APP_PORT!/
echo [INFO] Aplikasi akan terbuka otomatis di browser.
echo [INFO] Tekan Ctrl+C untuk menghentikan server.
echo.

:: Buka browser secara otomatis ke IP Komputer setelah delay 2 detik
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://!MY_IP!:!APP_PORT!/"

:: Menjalankan Backend (Express port 3000) & Frontend (Vite port 5181)
call npm run dev

pause
