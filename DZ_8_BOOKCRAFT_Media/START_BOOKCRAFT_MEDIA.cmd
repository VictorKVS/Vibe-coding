@echo off
setlocal
cd /d "%~dp0"
title BOOK.CRAFT MEDIA - DZ-8
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_BOOKCRAFT_MEDIA.ps1"
if errorlevel 1 (
  echo.
  echo BOOK.CRAFT MEDIA could not start.
  pause
)
