@echo off
rem Kitsu Flow: make a Ren & Yuki video in Google Flow from a story file (no Claude needed).
rem   flow\flow-video.bat login 1
rem   flow\flow-video.bat credits
rem   flow\flow-video.bat check flow\stories\my-flow-story.txt
rem   flow\flow-video.bat make flow\stories\my-flow-story.txt
node "%~dp0flow-video.js" %*
if errorlevel 1 pause
