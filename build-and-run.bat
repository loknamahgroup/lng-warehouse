@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM  BranchStock - build the React (Vite) SPA + Spring Boot API and run as ONE app
REM  ----------------------------------------------------------------------------
REM  Usage:
REM    build-and-run.bat        build everything, then RUN via java -jar
REM    build-and-run.bat exe    build everything, package a native Windows .exe
REM                             with jpackage, then RUN that .exe
REM
REM  The Spring Boot jar serves the SPA at "/" (port 8080) and the REST API at
REM  "/api" - same origin, so no CORS headaches. SPA client-side routes survive
REM  refresh/deep-link thanks to SpaFallbackController.
REM
REM  Needs: Java 17+ on PATH (a JDK, not only a JRE, for "exe" mode) and
REM         Node.js + npm on PATH. Maven is bundled under .tools (no install).
REM ============================================================================
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "MAVEN_HOME=%ROOT%\.tools\apache-maven-3.9.9"
set "PATH=%MAVEN_HOME%\bin;%PATH%"
set "JAR=%BACKEND%\target\branchstock-api-1.0.0.jar"

echo.
echo *** BranchStock: building SPA + Spring Boot API ***

REM ---- 1. Build the React SPA ----
echo [1/3] Building frontend (npm)...
pushd "%FRONTEND%"
if not exist "node_modules" (
  echo Installing frontend dependencies (npm install)...
  call npm install
  if errorlevel 1 ( popd & echo ERROR: npm install failed & exit /b 1 )
)
call npm run build
if errorlevel 1 ( popd & echo ERROR: frontend build failed & exit /b 1 )
popd

REM ---- 2. Stage the SPA into backend static resources (the jar will serve it) ----
echo [2/3] Staging SPA into backend static resources...
set "STATIC=%BACKEND%\src\main\resources\static"
if exist "%STATIC%" rmdir /s /q "%STATIC%"
mkdir "%STATIC%"
xcopy "%FRONTEND%\dist" "%STATIC%\" /e /i /h /y >nul
if errorlevel 1 ( echo ERROR: staging SPA failed & exit /b 1 )

REM ---- 3. Build the executable jar with the bundled Maven ----
echo [3/3] Building backend jar (mvn package -DskipTests)...
pushd "%BACKEND%"
call "%MAVEN_HOME%\bin\mvn.cmd" package -DskipTests
if errorlevel 1 ( popd & echo ERROR: backend build failed & exit /b 1 )
popd
if not exist "%JAR%" ( echo ERROR: jar not built: %JAR% & exit /b 1 )

if /i "%~1"=="exe" goto :package_exe

echo.
echo *** Starting BranchStock (java -jar) ***
echo    UI  : http://localhost:8080
echo    API : http://localhost:8080/api   (seed: admin / Admin@123)
java -jar "%JAR%"
goto :eof

:package_exe
REM ---- Self-contained native .exe (no JDK / Node needed on the target machine) ----
REM jpackage --type app-image bundles a private JRE (via jlink) inside the app
REM image, so the resulting BranchStock.exe runs on ANY Windows box. (A true .exe
REM *installer* would need the WiX toolset, which is not installed here; app-image
REM produces a portable folder whose BranchStock.exe is fully standalone.)
if not defined JAVA_HOME ( echo ERROR: set JAVA_HOME to a JDK ^(e.g. C:\Program Files\Java\jdk-17^) for .exe packaging & exit /b 1 )
set "JPP=%JAVA_HOME%\bin\jpackage.exe"
if not exist "%JPP%" ( echo ERROR: jpackage not found at %JPP% ^(need a full JDK, not only a JRE^) & exit /b 1 )
set "RELEASE=%ROOT%\release"
if not exist "%RELEASE%" mkdir "%RELEASE%"
rmdir /s /q "%RELEASE%\BranchStock" 2>nul
echo.
echo *** Packaging self-contained Windows app with jpackage (private JRE bundled) ***
"%JPP%" ^
  --type app-image ^
  --name BranchStock ^
  --app-version 1.0.0 ^
  --vendor "Loknamah Group" ^
  --input "%BACKEND%\target" ^
    --main-jar branchstock-api-1.0.0.jar ^
  --main-class org.springframework.boot.loader.launch.JarLauncher ^
  --java-options -Xmx512m ^
  --dest "%RELEASE%"
if errorlevel 1 ( echo ERROR: jpackage packaging failed & exit /b 1 )

echo.
echo *** Self-contained app created: %RELEASE%\BranchStock\BranchStock.exe ***
echo    (includes a private JRE - runs on ANY Windows without Java/Node installed)
echo    Double-click to run:  %RELEASE%\BranchStock\BranchStock.exe
echo    UI  : http://localhost:8080   API : http://localhost:8080/api   (seed: admin / Admin@123)
echo Launching...
"%RELEASE%\BranchStock\BranchStock.exe"
