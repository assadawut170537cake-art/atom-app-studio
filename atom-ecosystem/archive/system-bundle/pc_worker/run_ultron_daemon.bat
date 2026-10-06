@echo off
rem ============================================================
rem  ULTRON PC Worker Daemon launcher (ATOM Phase 6)
rem  Double-click to run, close window or Ctrl+C to stop.
rem ============================================================
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo [X] Python not found in PATH. Install Python 3.10+ first.
    pause
    exit /b 1
)

if not exist venv (
    echo [..] Creating venv ...
    python -m venv venv || (echo [X] venv failed & pause & exit /b 1)
)

echo [..] Installing/updating dependencies ...
venv\Scripts\python.exe -m pip install --no-cache-dir -r requirements.txt >nul
if errorlevel 1 (
    echo [X] pip install failed. Check internet connection.
    pause
    exit /b 1
)

echo [OK] Starting ULTRON daemon (Ctrl+C to stop) ...
venv\Scripts\python.exe ultron_daemon.py
pause
