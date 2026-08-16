@echo off
cd /d "%~dp0"
echo Starting Open Roads at http://127.0.0.1:8765
echo Close this window to stop the server.
start "" "http://127.0.0.1:8765/"
python -m http.server 8765
if errorlevel 1 (
  echo Python not found. Opening index.html directly instead...
  start "" "%~dp0index.html"
  pause
)
