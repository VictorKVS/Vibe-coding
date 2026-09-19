@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [DZ-18] Node.js is not available in PATH.
  echo Install Node.js, reopen the terminal, and run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo [DZ-18] Created .env from .env.example
  echo [DZ-18] Add HEYGEN_API_KEY to .env for real avatar/voice loading.
)

if not exist "node_modules" (
  echo [DZ-18] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [DZ-18] npm install failed.
    pause
    exit /b 1
  )
)

echo [DZ-18] Starting FATHER Content Generator...
echo [WEB] http://localhost:5188
echo [API] http://localhost:5190/api/health
call npm run dev
