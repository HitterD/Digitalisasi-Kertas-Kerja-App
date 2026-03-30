@echo off
call :check
echo errorlevel is %errorlevel%
pause
goto :eof
:check
findstr /R /C:"DOESNOTEXIST" app\.env >nul
echo [INFO] valid.
exit /b 0
