@echo off
setlocal EnableDelayedExpansion

:: Setup ANSI Colors
set "ESC= "
set "Green=%ESC%[32m"
set "Cyan=%ESC%[36m"
set "Yellow=%ESC%[33m"
set "Red=%ESC%[31m"
set "Reset=%ESC%[0m"
set "Bold=%ESC%[1m"

title Opname Aset ICT - Server (Auto-Rebuild)

echo =======================================================
echo          %Bold%%Cyan%Opname Aset ICT - Server PC%Reset%
echo          Mode: Development (Auto-Rebuild)
echo =======================================================
echo.

cd /d "%~dp0"

echo %Cyan%[1/2] Mendeteksi IP Address...%Reset%

:: 1. Ekstrak IP Address dinamis dari mesin saat ini
set "MyIP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "IP_TEM=%%i"
    :: Clean up spaces
    set "MyIP=!IP_TEM: =!"
    goto :ip_found
)
:ip_found

if "%MyIP%"=="" (
    set "MyIP=localhost"
    echo %Yellow%[!] Gagal mendeteksi IP otomatis. Menggunakan localhost.%Reset%
)

echo.
echo =======================================================
echo %Bold%%Green%  SERVER DEVELOPMENT AKTIF!%Reset%
echo.
echo   Buka URL ini di browser (Chrome) perangkat lain:
echo   %Bold%%Cyan%http://%MyIP%:5181/%Reset%
echo.
echo   Jangan tutup window terminal ini selama dipakai.
echo   Server akan AUTO-REBUILD jika ada file yang diubah.
echo =======================================================
echo.

:: Membuka browser otomatis di PC yang menjalankan server
echo %Cyan%[2/2] Membuka browser secara otomatis...%Reset%
start "" "http://localhost:5181/"

:: Menjalankan dev server Vite untuk auto-rebuild
call npx vite --host

pause
