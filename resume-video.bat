@echo off
cd /d "%~dp0"
if "%~1"=="" (
  echo.
  echo  Usage:  resume-video.bat storiesyour-story.txt
  echo  Carries on with a video that was stopped, keeping the parts already drawn.
  echo.
  pause & exit /b 1
)
node toolsmake-video.js "%~f1" --resume
echo.
pause
