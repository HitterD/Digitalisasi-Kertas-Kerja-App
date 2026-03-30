@echo off
setlocal EnableDelayedExpansion

set "COMPOSE_FILE=docker-compose.prod.yml"

:: ============================================
:: Auto-detect IP address komputer ini
:: Mengabaikan IP 169.254.x.x (APIPA) dan 172.x.x.x (WSL/Docker)
:: ============================================
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4" ^| findstr /V "169.254 172."') do (
    for /f "tokens=*" %%j in ("%%i") do (
        if "!LOCAL_IP!"=="localhost" set "LOCAL_IP=%%j"
    )
)

:: Baca PORT dari .env atau gunakan default 5181
set "APP_PORT=5181"
if exist "app\.env" (
    for /f "tokens=1,* delims==" %%a in ('findstr /B "PORT=" "app\.env" 2^>nul') do (
        if not "%%b"=="" set "APP_PORT=%%b"
    )
)

echo ============================================
echo   Opname Aset - Production Deployment Script
echo   Versi Windows Server
echo ============================================
echo   IP Address : %LOCAL_IP%
echo   Port       : %APP_PORT%
echo ============================================
echo.

set "COMMAND=%~1"
if not "%COMMAND%"=="" goto process_command

:menu
echo Pilihan Perintah Docker:
echo   [1] up      - Menjalankan container (di background)
echo   [2] down    - Menghentikan dan menghapus container
echo   [3] build   - Build ulang image tanpa cache
echo   [4] restart - Restart container
echo   [5] logs    - Menampilkan log berjalan (live)
echo   [0] Keluar
echo.
set /p "choice=Masukkan angka pilihan Anda: "

if "%choice%"=="1" set "COMMAND=up"
if "%choice%"=="2" set "COMMAND=down"
if "%choice%"=="3" set "COMMAND=build"
if "%choice%"=="4" set "COMMAND=restart"
if "%choice%"=="5" set "COMMAND=logs"
if "%choice%"=="0" exit /b 0

if "%COMMAND%"=="" (
    echo Pilihan tidak valid.
    echo.
    goto menu
)

:process_command
if /I "%COMMAND%"=="up" goto up
if /I "%COMMAND%"=="down" goto down
if /I "%COMMAND%"=="build" goto build
if /I "%COMMAND%"=="restart" goto restart
if /I "%COMMAND%"=="logs" goto logs

echo Perintah "%COMMAND%" tidak dikenali.
pause
goto menu

:check_env
if not exist "app\.env" (
    echo [ERROR] file app\.env tidak ditemukan!
    echo Silakan copy app\.env.example ke app\.env dan isi konfigurasi yang dibutuhkan.
    pause
    exit /b 1
)

:: Cek JWT_SECRET
findstr /R "^JWT_SECRET=." "app\.env" >nul
if errorlevel 1 (
    echo [ERROR] JWT_SECRET di app\.env tidak ditemukan atau kosong!
    pause
    exit /b 1
)

:: Cek PASSWORD_SALT
findstr /R "^PASSWORD_SALT=." "app\.env" >nul
if errorlevel 1 (
    echo [ERROR] PASSWORD_SALT di app\.env tidak ditemukan atau kosong!
    pause
    exit /b 1
)

echo [INFO] File .env valid.
ver > nul
exit /b 0

:up
call :check_env
if errorlevel 1 goto menu
echo [INFO] Starting containers in detached mode...
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env up -d"
echo.
echo [SUCCESS] Containers started successfully.
echo ============================================
echo   Aplikasi dapat diakses di:
echo   http://%LOCAL_IP%:%APP_PORT%
echo ============================================
echo.
pause
goto :eof

:down
echo [INFO] Stopping and removing containers...
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env down"
echo [SUCCESS] Containers stopped.
echo.
pause
goto :eof

:build
call :check_env
if errorlevel 1 goto menu
echo [INFO] Rebuilding image with no-cache...
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env build --no-cache"
echo [SUCCESS] Image built successfully.
echo.
pause
goto :eof

:restart
call :check_env
if errorlevel 1 goto menu
echo [INFO] Restarting containers...
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env restart"
echo.
echo [SUCCESS] Containers restarted.
echo ============================================
echo   Aplikasi dapat diakses di:
echo   http://%LOCAL_IP%:%APP_PORT%
echo ============================================
echo.
pause
goto :eof

:logs
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env logs -f"
pause
goto :eof
