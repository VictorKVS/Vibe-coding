@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH_LATEST_TRACE.ps1"
echo.
echo Press any key to close...
pause >nul
