@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [DZ-18] Node.js is not available in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [DZ-18] Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo.
echo [1/2] Running provider tests...
call npm test
if errorlevel 1 (
  echo [DZ-18] TESTS FAILED
  pause
  exit /b 1
)

echo.
echo [2/2] Running production build...
call npm run build
if errorlevel 1 (
  echo [DZ-18] BUILD FAILED
  pause
  exit /b 1
)

echo.
echo [DZ-18] ALL CHECKS PASSED
pause
