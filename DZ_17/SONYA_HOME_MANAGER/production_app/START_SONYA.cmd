@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   SONYA Home Manager - Flagship Local
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  pause
  exit /b 1
)

where ollama >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Ollama not found in PATH.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/3] Installing npm dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/3] npm dependencies already installed.
)

echo [2/3] Checking Ollama...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Ollama API is not responding on 127.0.0.1:11434.
  echo Start Ollama and run this file again.
  pause
  exit /b 1
)

if "%SONYA_VISION_MODEL%"=="" set SONYA_VISION_MODEL=llava:7b

echo [3/3] Starting SONYA with model %SONYA_VISION_MODEL% ...
echo Browser: http://localhost:5173
echo Local API: http://127.0.0.1:8787
start "" http://localhost:5173
call npm run dev
goto :eof

:fail
echo.
echo [ERROR] SONYA failed to start.
pause
exit /b 1
