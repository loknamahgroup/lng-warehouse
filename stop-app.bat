@echo off
setlocal enableextensions
set "RC=0"
echo [*] Shutting down BranchStock...

REM 1) packaged self-contained app (the double-clicked BranchStock.exe).
REM    taskkill returns 0 if a process was killed, 128 if none matched.
taskkill /f /im "BranchStock.exe" >nul 2>&1
if not errorlevel 1 set "RC=1"

REM 2) a plain "java -jar ...branchstock-api-1.0.0.jar" run from build-and-run.bat.
REM    Only kill java.exe processes whose command line mentions branchstock (avoid nuking other Java apps).
for /f "usebackq tokens=2" %%P in (`tasklist /fi "imagename eq java.exe" /fo:csv 2^>nul ^| findstr /i "branchstock"`) do (
    echo [*] Stopping java pid %%P
    taskkill /f /pid %%P >nul 2>&1
    set "RC=1"
)

echo.
if "%RC%"=="0" (
    echo [i] BranchStock is not running.
) else (
    echo [i] Done. Port 8080 should be free.
)
exit /b 0

