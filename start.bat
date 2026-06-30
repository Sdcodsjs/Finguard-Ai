@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ═══════════════════════════════════════════════════════════
::  FinGuard AI — One-Click Launcher
::  Starts Backend (FastAPI) + Frontend (Next.js) together
:: ═══════════════════════════════════════════════════════════

title FinGuard AI Launcher

:: Colors (ANSI)
set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BOLD=[1m"
set "DIM=[2m"
set "RESET=[0m"

echo.
echo %CYAN%╔══════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%   %BOLD%%BLUE%FinGuard AI%RESET%  —  Financial Risk Intelligence Platform      %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%Powered by Nebius AI Studio · Open Models                %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════╝%RESET%
echo.

:: ── Find project root (directory of this .bat file) ──────────
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

:: ── Sanity checks ─────────────────────────────────────────────
echo %YELLOW%[CHECK]%RESET% Verifying project structure...

if not exist "%BACKEND%\main.py" (
    echo %RED%[ERROR]%RESET% Cannot find backend\main.py
    echo        Make sure start.bat is in the project root folder.
    pause & exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    echo %RED%[ERROR]%RESET% Cannot find frontend\package.json
    echo        Make sure start.bat is in the project root folder.
    pause & exit /b 1
)

if not exist "%BACKEND%\.env" (
    echo %RED%[ERROR]%RESET% Missing backend\.env file!
    echo        Copy .env.example to .env and set your NEBIUS_API_KEY.
    pause & exit /b 1
)

echo %GREEN%[OK]%RESET%    Project structure verified.
echo.

:: ── Check Python (py launcher) ────────────────────────────────
echo %YELLOW%[CHECK]%RESET% Checking Python...
where py >nul 2>&1
if errorlevel 1 (
    where python >nul 2>&1
    if errorlevel 1 (
        echo %RED%[ERROR]%RESET% Python not found. Please install Python 3.10+ from python.org
        pause & exit /b 1
    ) else (
        set "PY=python"
    )
) else (
    set "PY=py"
)
for /f "tokens=*" %%v in ('!PY! --version 2^>^&1') do echo %GREEN%[OK]%RESET%    %%v found.
echo.

:: ── Check Node.js ─────────────────────────────────────────────
echo %YELLOW%[CHECK]%RESET% Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%RESET% Node.js not found. Please install from nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo %GREEN%[OK]%RESET%    Node.js %%v found.
echo.

:: ── Install Python deps if needed ─────────────────────────────
echo %YELLOW%[SETUP]%RESET% Checking Python dependencies...
!PY! -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[SETUP]%RESET% Installing Python packages (first run)...
    !PY! -m pip install -r "%BACKEND%\requirements.txt" --quiet
    if errorlevel 1 (
        echo %RED%[ERROR]%RESET% Failed to install Python dependencies.
        echo        Try running manually: py -m pip install -r backend\requirements.txt
        pause & exit /b 1
    )
    echo %GREEN%[OK]%RESET%    Python packages installed.
) else (
    echo %GREEN%[OK]%RESET%    Python dependencies already installed.
)
echo.

:: ── Install Node deps if needed ───────────────────────────────
echo %YELLOW%[SETUP]%RESET% Checking Node.js dependencies...
if not exist "%FRONTEND%\node_modules" (
    echo %YELLOW%[SETUP]%RESET% Installing npm packages (first run, this may take 1-2 minutes)...
    cd /d "%FRONTEND%"
    call npm install --silent
    if errorlevel 1 (
        echo %RED%[ERROR]%RESET% Failed to install npm packages.
        echo        Try running manually: cd frontend ^& npm install
        pause & exit /b 1
    )
    echo %GREEN%[OK]%RESET%    Node packages installed.
) else (
    echo %GREEN%[OK]%RESET%    Node.js dependencies already installed.
)
echo.

:: ── Create required directories ───────────────────────────────
if not exist "%BACKEND%\uploads" mkdir "%BACKEND%\uploads"
if not exist "%BACKEND%\exports" mkdir "%BACKEND%\exports"
if not exist "%BACKEND%\chroma_db" mkdir "%BACKEND%\chroma_db"

:: ══════════════════════════════════════════════════════════════
echo %CYAN%──────────────────────────────────────────────────────────%RESET%
echo %BOLD% Starting Services%RESET%
echo %CYAN%──────────────────────────────────────────────────────────%RESET%
echo.

:: ── Start Backend ─────────────────────────────────────────────
echo %BLUE%[BACKEND]%RESET% Starting FastAPI on http://localhost:8000 ...
start "FinGuard AI — Backend" cmd /k "title FinGuard AI Backend && cd /d "%BACKEND%" && echo. && echo  FinGuard AI Backend — FastAPI + Uvicorn && echo  Nebius AI Studio: DeepSeek V3 / Qwen3 / Llama3 && echo. && !PY! -m uvicorn main:app --reload --port 8000 --host 0.0.0.0"

:: Give the backend a moment to initialize
echo %DIM%         Waiting for backend to initialize...%RESET%
timeout /t 4 /nobreak >nul

:: ── Start Frontend ────────────────────────────────────────────
echo %GREEN%[FRONTEND]%RESET% Starting Next.js on http://localhost:3000 ...
start "FinGuard AI — Frontend" cmd /k "title FinGuard AI Frontend && cd /d "%FRONTEND%" && echo. && echo  FinGuard AI Frontend — Next.js && echo. && npm run dev"

:: Give Next.js time to compile
echo %DIM%         Waiting for Next.js to compile (first run may take 30s)...%RESET%
timeout /t 8 /nobreak >nul

:: ══════════════════════════════════════════════════════════════
echo.
echo %CYAN%╔══════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %GREEN%✓%RESET% All services started!                                   %CYAN%║%RESET%
echo %CYAN%╠══════════════════════════════════════════════════════════╣%RESET%
echo %CYAN%║%RESET%                                                          %CYAN%║%RESET%
echo %CYAN%║%RESET%   %BOLD%Frontend:%RESET%   %BLUE%http://localhost:3000%RESET%                     %CYAN%║%RESET%
echo %CYAN%║%RESET%   %BOLD%Backend:%RESET%    %BLUE%http://localhost:8000%RESET%                     %CYAN%║%RESET%
echo %CYAN%║%RESET%   %BOLD%API Docs:%RESET%   %BLUE%http://localhost:8000/api/docs%RESET%            %CYAN%║%RESET%
echo %CYAN%║%RESET%                                                          %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%Nebius Models Active:%RESET%                                %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%· DeepSeek-V3.2   → Fraud + Investment Analysis%RESET%    %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%· Qwen3-235B      → Annual Report Long-Context%RESET%     %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%· Llama-3.3-70B   → Extraction + Chat%RESET%              %CYAN%║%RESET%
echo %CYAN%║%RESET%   %DIM%· Qwen3-Embedding → RAG Vector Search%RESET%              %CYAN%║%RESET%
echo %CYAN%║%RESET%                                                          %CYAN%║%RESET%
echo %CYAN%╠══════════════════════════════════════════════════════════╣%RESET%
echo %CYAN%║%RESET%  Press any key to open the app in your browser...        %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════╝%RESET%
echo.
pause >nul

:: Open browser
start "" "http://localhost:3000"

echo.
echo %GREEN%[DONE]%RESET% Browser opened. Both service windows are running separately.
echo        Close the backend and frontend windows to stop the services.
echo.
pause
