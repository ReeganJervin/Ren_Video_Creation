@echo off
cd /d "%~dp0"
echo  Making the Instagram profile pictures (instagram\profile-kit\)...
node tools\instagram-profile.js
echo.
pause
