@echo off
setlocal
cd /d "%~dp0"
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP_BOOKCRAFT_MEDIA.ps1"
pause
