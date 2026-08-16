@echo off
REM Serves the project on http://localhost:8080 and opens it in the browser.
cd /d "%~dp0"
start "" http://localhost:8080
python -m http.server 8080
