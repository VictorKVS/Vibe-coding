@echo off
chcp 65001 >nul
title BOOK CRAFT Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-book-studio.ps1"
if errorlevel 1 (
  echo.
  echo Запуск завершился ошибкой. Сообщите текст ошибки.
  pause
)
