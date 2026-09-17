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
  echo [1/4] Installing npm dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/4] npm dependencies already installed.
)

echo [2/4] Checking Ollama...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Ollama API is not responding on 127.0.0.1:11434.
  echo Start Ollama and run this file again.
  pause
  exit /b 1
)

if "%SONYA_VISION_MODEL%"=="" set SONYA_VISION_MODEL=llava:7b
if "%SONYA_REASONING_MODEL%"=="" set SONYA_REASONING_MODEL=qwen2.5:7b
if "%SONYA_AGENT_PROFILE%"=="" set SONYA_AGENT_PROFILE=BALANCED

echo [3/4] Cleaning stale local SONYA processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP_SONYA.ps1"
if errorlevel 1 goto :fail

echo [4/4] Starting SONYA agent...
echo Profile: %SONYA_AGENT_PROFILE%
echo Vision model: %SONYA_VISION_MODEL%
echo Analyst model: %SONYA_REASONING_MODEL%
echo Browser: http://localhost:5173
echo Local API: http://127.0.0.1:8787
start "SONYA Local" cmd /k "cd /d ""%~dp0"" && set ""SONYA_AGENT_PROFILE=%SONYA_AGENT_PROFILE%"" && set ""SONYA_VISION_MODEL=%SONYA_VISION_MODEL%"" && set ""SONYA_REASONING_MODEL=%SONYA_REASONING_MODEL%"" && npm run dev"
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
exit /b 0

:fail
echo.
echo [ERROR] SONYA failed to start.
pause
exit /b 1
