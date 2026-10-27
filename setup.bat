@echo off
setlocal
cd /d "%~dp0"
echo.
echo  ===== Kitsu Studio setup (run once) =====
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org and run setup.bat again.
  pause & exit /b 1
)

set "PY="
for %%V in (3.12 3.13 3.11 3.10) do (
  if not defined PY (
    py -%%V -c "print()" >nul 2>nul && set "PY=py -%%V"
  )
)
if not defined PY (
  python -c "import sys; sys.exit(0 if (3,10) <= sys.version_info[:2] <= (3,13) else 1)" >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo  Python 3.10 - 3.13 is not installed.
  echo  Install Python 3.12 from https://www.python.org/downloads/
  echo  ^(tick "Add python.exe to PATH" during install^) and run setup.bat again.
  pause & exit /b 1
)
echo  Using Python: %PY%

echo.
echo  [1/5] Installing video tools (Node packages)...
call npm install --no-audit --no-fund || goto :failed

echo.
echo  [2/5] Installing the browser used for drawing frames...
call npx playwright install chromium || goto :failed
rem the screen recorder, only used by the studio app's tests (small; setup carries on without it)
call npx playwright install ffmpeg >nul 2>nul

echo.
echo  [3/5] Installing the voice tool (Python)...
if not exist ".venv\Scripts\python.exe" (
  %PY% -m venv .venv || goto :failed
)
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :failed

echo.
echo  [4/5] Downloading the voice model (about 120 MB, once)...
node tools\download-models.js || goto :failed

echo.
echo  [5/5] Installing the studio app...
pushd studio
call npm install --no-audit --no-fund || (popd & goto :failed)
call npm run build || (popd & goto :failed)
popd

echo.
echo  ===== All set! =====
echo  Try it:  make-video.bat stories\early-stories\the-fallen-star.txt
echo  Or double-click "Kitsu Studio.bat" to write and make videos in your browser.
echo.
pause
exit /b 0

:failed
echo.
echo  Setup stopped because of the error above.
pause
exit /b 1
