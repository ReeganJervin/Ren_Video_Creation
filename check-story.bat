@echo off
cd /d "%~dp0"
if "%~1"=="" ( echo  Usage: check-story.bat stories\your-story.txt & pause & exit /b 1 )
node tools\make-video.js "%~f1" --check
echo.
pause
