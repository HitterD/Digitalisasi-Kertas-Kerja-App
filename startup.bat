@echo off
title Opname Aset ICT - [DEVELOPMENT MODE]
echo ============================================
echo   Opname Aset ICT - Kertas Kerja Digital
echo   [DEVELOPMENT MODE]
echo ============================================
echo   Untuk PRODUCTION di server, gunakan: deploy.bat
echo ============================================
echo.
echo Memulai aplikasi...
echo.

cd /d "%~dp0app"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Menginstall dependencies...
    call npm install
    echo.
)

echo [INFO] Menjalankan server di port 5181...
echo [INFO] Aplikasi akan terbuka otomatis di browser.
echo [INFO] Tekan Ctrl+C untuk menghentikan server.
echo.

start "" http://localhost:5181
npm run dev
