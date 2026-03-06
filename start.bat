@echo off
title EduHub - Starting...

:: Use Windows Terminal split panes (1 window, 2 panels)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Starting EduHub with Windows Terminal...
    wt -d "%~dp0backend" cmd /k "title EduHub Backend && call venv\Scripts\activate && uvicorn app.main:app --reload" ; split-pane -H -d "%~dp0frontend" cmd /k "title EduHub Frontend && npm run dev"
) else (
    echo Windows Terminal not found, using separate windows...
    start "EduHub Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn app.main:app --reload"
    start "EduHub Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
)

:: Wait for servers to start, then open browser
timeout /t 5 /nobreak >nul
start http://localhost:5173
