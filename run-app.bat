@echo off
setlocal
REM Launch the already-built BranchStock app (UI + API on one jar).
REM Requires backend\target\branchstock-api-1.0.0.jar (run build-and-run.bat first).
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "JAR=%ROOT%\backend\target\branchstock-api-1.0.0.jar"
if not exist "%JAR%" (
  echo ERROR: %JAR% not found. Run build-and-run.bat first to build it.
  exit /b 1
)
echo Starting BranchStock ...
echo    UI  : http://localhost:8080
echo    API : http://localhost:8080/api   (seed: admin / Admin@123)
java -jar "%JAR%"
