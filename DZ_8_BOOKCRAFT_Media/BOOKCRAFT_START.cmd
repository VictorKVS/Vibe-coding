@echo off
setlocal
cd /d "%~dp0"
title BOOK.CRAFT ONE CLICK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_BOOKCRAFT_ONE_CLICK.ps1"
if errorlevel 1 (
  echo.
  echo BOOK.CRAFT failed to start. See the message above.
  pause
)
