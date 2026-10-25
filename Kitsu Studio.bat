@echo off
rem Kitsu Studio in your browser: write, check, preview and make videos.
rem Everything stays on this computer. Keep this window open while you use the studio; close it to stop.
setlocal
cd /d "%~dp0"
title Kitsu Studio
if not exist "studio\dist\index.html" (
  echo.
  echo  The studio app is not installed yet. Please run setup.bat first.
  echo.
  pause
  exit /b 1
)
node studio\server\server.js --open
if errorlevel 1 pause
