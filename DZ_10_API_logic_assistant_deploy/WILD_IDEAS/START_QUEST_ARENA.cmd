@echo off
setlocal
cd /d "%~dp0"
powershell -NoLogo -ExecutionPolicy Bypass -File "%~dp0START_QUEST_ARENA.ps1" %*
if errorlevel 1 (
  echo.
  echo Quest Arena failed. See the error above.
  pause
  exit /b 1
)
endlocal
