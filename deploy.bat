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
echo   [6] deploy  - Build dan Up untuk Rebuild modul tertentu (tanpa downtime DB)
echo   [7] backup  - Backup data database dari container aktif
echo   [8] restore - Restore data database dari backup
echo   [9] merge   - Gabungkan dua folder backup (Lama ke Baru)
echo   [0] Keluar
echo.
set /p "choice=Masukkan angka pilihan Anda: "

if "%choice%"=="1" set "COMMAND=up"
if "%choice%"=="2" set "COMMAND=down"
if "%choice%"=="3" set "COMMAND=build"
if "%choice%"=="4" set "COMMAND=restart"
if "%choice%"=="5" set "COMMAND=logs"
if "%choice%"=="6" set "COMMAND=deploy"
if "%choice%"=="7" set "COMMAND=backup"
if "%choice%"=="8" set "COMMAND=restore"
if "%choice%"=="9" set "COMMAND=merge"
if "%choice%"=="0" exit /b 0

if "%COMMAND%"=="" (
    echo Pilihan tidak valid.
    echo.
    goto menu
)

if "%COMMAND%"=="backup" goto process_command
if "%COMMAND%"=="down" goto process_command

echo.
echo Masukkan nama service/modul (contoh: app, db, redis). 
echo Kosongkan jika ingin menerapkan ke SEMUA modul:
set /p "MODULE_NAME="
if "%MODULE_NAME%"=="" set "MODULE_NAME="

:process_command
if /I "%COMMAND%"=="up" goto up
if /I "%COMMAND%"=="down" goto down
if /I "%COMMAND%"=="build" goto build
if /I "%COMMAND%"=="restart" goto restart
if /I "%COMMAND%"=="logs" goto logs
if /I "%COMMAND%"=="deploy" goto deploy
if /I "%COMMAND%"=="backup" goto backup
if /I "%COMMAND%"=="restore" goto restore
if /I "%COMMAND%"=="merge" goto merge

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
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env up -d %MODULE_NAME%"
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
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env build --no-cache %MODULE_NAME%"
echo [SUCCESS] Image built successfully.
echo.
pause
goto :eof

:restart
call :check_env
if errorlevel 1 goto menu
echo [INFO] Restarting containers...
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env restart %MODULE_NAME%"
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
cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env logs -f %MODULE_NAME%"
pause
goto :eof

:backup
set "NOPAUSE=%~1"
echo [INFO] Membuat Backup Database...
set "TIMESTAMP="
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "TIMESTAMP=%%a"
set "BACKUP_DIR=backup\data_!TIMESTAMP!"

docker ps | findstr "kertas-kerja-app" >nul
if not errorlevel 1 (
    echo [INFO] Menyalin data dari container ke !BACKUP_DIR!...
    mkdir "!BACKUP_DIR!" 2>nul
    cmd /c "docker cp kertas-kerja-app:/app/data ""!BACKUP_DIR!"""
    if errorlevel 1 (
        echo [WARNING] Gagal melakukan backup.
    ) else (
        echo [SUCCESS] Backup berhasil disimpan di folder !BACKUP_DIR!.
    )
) else (
    echo [WARNING] Container kertas-kerja-app tidak berjalan! Tidak dapat mem-backup data.
)
echo.
if not "!NOPAUSE!"=="nopause" pause
goto :eof

:restore
echo [INFO] Daftar Backup yang Tersedia:
if not exist "backup" (
    echo [WARNING] Belum ada folder backup.
    pause
    goto menu
)
dir /ad /b backup\data_* 2>nul
echo.
set /p "BACKUP_NAME=Ketik nama folder backup yang ingin di-restore (cth: data_20260702_123456) atau Kosongkan untuk batal: "
if "%BACKUP_NAME%"=="" goto menu

if not exist "backup\!BACKUP_NAME!" (
    echo [ERROR] Folder backup "backup\!BACKUP_NAME!" tidak ditemukan.
    pause
    goto menu
)

echo [WARNING] Proses ini akan MENIMPA data saat ini dengan data dari backup!
set /p "CONFIRM=Ketik 'y' untuk melanjutkan: "
if /I not "%CONFIRM%"=="y" goto menu

docker ps | findstr "kertas-kerja-app" >nul
if not errorlevel 1 (
    echo [INFO] Mematikan container sementara untuk menghindari database corrupt...
    cmd /c "docker stop kertas-kerja-app"
    
    echo [INFO] Me-restore data ke container...
    cmd /c "docker cp ""backup\!BACKUP_NAME!\data"" kertas-kerja-app:/app/"
    if errorlevel 1 (
        echo [WARNING] Gagal melakukan restore.
        cmd /c "docker start kertas-kerja-app"
    ) else (
        echo [SUCCESS] Restore berhasil! Data dari !BACKUP_NAME! telah dikembalikan.
        echo [INFO] Menyalakan kembali container...
        cmd /c "docker start kertas-kerja-app"
    )
) else (
    echo [WARNING] Container kertas-kerja-app tidak berjalan! Tidak dapat me-restore data.
)
echo.
pause
goto menu

:merge
echo [INFO] Daftar Backup yang Tersedia:
if not exist "backup" (
    echo [WARNING] Belum ada folder backup.
    pause
    goto menu
)
dir /ad /b backup\data_* 2>nul
echo.
set /p "NEW_BACKUP=Ketik nama folder backup BARU (Target/Basis) (cth: data_20260702_092122) atau Kosongkan untuk batal: "
if "!NEW_BACKUP!"=="" goto menu
if not exist "backup\!NEW_BACKUP!" (
    echo [ERROR] Folder backup "backup\!NEW_BACKUP!" tidak ditemukan.
    pause
    goto menu
)

set /p "OLD_BACKUP=Ketik nama folder backup LAMA (Sumber) (cth: data_20260702_102428) atau Kosongkan untuk batal: "
if "!OLD_BACKUP!"=="" goto menu
if not exist "backup\!OLD_BACKUP!" (
    echo [ERROR] Folder backup "backup\!OLD_BACKUP!" tidak ditemukan.
    pause
    goto menu
)

echo [INFO] Memulai proses merge menggunakan script Node.js...
node merge_backup.js "!NEW_BACKUP!" "!OLD_BACKUP!"
if errorlevel 1 (
    echo [ERROR] Terjadi kesalahan saat menjalankan script merge.
) else (
    echo [SUCCESS] Merge selesai! Anda bisa melakukan restore menggunakan opsi [8] restore dan memilih folder: !NEW_BACKUP!_merged
)
echo.
pause
goto menu


:deploy
call :check_env
if errorlevel 1 goto menu

call :backup nopause

if "%MODULE_NAME%"=="" (
    echo [INFO] Menjalankan proses Rebuild Total Semua Modul...
    echo [1/3] Menghentikan container aktif...
    cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env down"
    echo [2/3] Build ulang container - No Cache...
    cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env build --no-cache"
    echo [3/3] Menjalankan container baru...
    cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env up -d"
) else (
    echo [INFO] Menjalankan proses Rebuild untuk modul: %MODULE_NAME%...
    echo [1/2] Build ulang modul - No Cache...
    cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env build --no-cache %MODULE_NAME%"
    echo [2/2] Menjalankan ulang modul %MODULE_NAME%...
    cmd /c "docker compose -f %COMPOSE_FILE% --env-file app\.env up -d --no-deps %MODULE_NAME%"
)

echo.
echo [SUCCESS] Rebuild Selesai.
echo ============================================
echo   Aplikasi dapat diakses di:
echo   http://%LOCAL_IP%:%APP_PORT%
echo ============================================
echo.
pause
goto :eof
