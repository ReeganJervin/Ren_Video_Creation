@echo off
cd /d "%~dp0"
if "%~1"=="" (
  echo.
  echo  Usage:  make-video.bat stories\your-story.txt
  echo  Tip:    you can also drag a story file onto make-video.bat
  echo.
  pause & exit /b 1
)
node tools\make-video.js "%~f1"
echo.
pause
