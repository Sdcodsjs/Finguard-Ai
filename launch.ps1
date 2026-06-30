$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════
#  FinGuard AI — One-Click Launcher (PowerShell)
#  Starts Backend (FastAPI) + Frontend (Next.js) together
# ═══════════════════════════════════════════════════════════

$Host.UI.RawUI.WindowTitle = "FinGuard AI Launcher"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║" -NoNewline -ForegroundColor Cyan; Write-Host "   FinGuard AI  —  Financial Risk Intelligence Platform      " -NoNewline -ForegroundColor Blue; Write-Host "║" -ForegroundColor Cyan
Write-Host "║" -NoNewline -ForegroundColor Cyan; Write-Host "   Powered by Nebius AI Studio . Open Models                " -NoNewline -ForegroundColor DarkGray; Write-Host "║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

# ── Sanity checks ─────────────────────────────────────────────
Write-Host "[CHECK] " -NoNewline -ForegroundColor Yellow; Write-Host "Verifying project structure..."

if (-Not (Test-Path (Join-Path $Backend "main.py"))) {
    Write-Host "[ERROR] Cannot find backend\main.py" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-Not (Test-Path (Join-Path $Frontend "package.json"))) {
    Write-Host "[ERROR] Cannot find frontend\package.json" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-Not (Test-Path (Join-Path $Backend ".env"))) {
    Write-Host "[ERROR] Missing backend\.env file!" -ForegroundColor Red
    Write-Host "        Copy .env.example to .env and set your NEBIUS_API_KEY."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK]    Project structure verified.`n" -ForegroundColor Green

# ── Check Python ───────────────────────────────────────────────
Write-Host "[CHECK] " -NoNewline -ForegroundColor Yellow; Write-Host "Checking Python..."
$PyCmd = "py"
try {
    $null = Get-Command py -ErrorAction Stop
} catch {
    try {
        $null = Get-Command python -ErrorAction Stop
        $PyCmd = "python"
    } catch {
        Write-Host "[ERROR] Python not found. Please install Python 3.10+ from python.org" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
$PyVersion = & $PyCmd --version 2>&1
Write-Host "[OK]    $PyVersion found.`n" -ForegroundColor Green

# ── Check Node.js ──────────────────────────────────────────────
Write-Host "[CHECK] " -NoNewline -ForegroundColor Yellow; Write-Host "Checking Node.js..."
try {
    $null = Get-Command node -ErrorAction Stop
    $NodeVersion = & node --version 2>&1
    Write-Host "[OK]    Node.js $NodeVersion found.`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install from nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Install Python deps if needed ─────────────────────────────
Write-Host "[SETUP] " -NoNewline -ForegroundColor Yellow; Write-Host "Checking Python dependencies..."
$PyDepCheck = & $PyCmd -c "import fastapi, uvicorn" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[SETUP] Installing Python packages (first run)..." -ForegroundColor Yellow
    & $PyCmd -m pip install -r "$Backend\requirements.txt" --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Python dependencies." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK]    Python packages installed.`n" -ForegroundColor Green
} else {
    Write-Host "[OK]    Python dependencies already installed.`n" -ForegroundColor Green
}

# ── Install Node deps if needed ───────────────────────────────
Write-Host "[SETUP] " -NoNewline -ForegroundColor Yellow; Write-Host "Checking Node.js dependencies..."
if (-Not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Write-Host "[SETUP] Installing npm packages (first run, this may take 1-2 minutes)..." -ForegroundColor Yellow
    Push-Location $Frontend
    & npm install --silent
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install npm packages." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK]    Node packages installed.`n" -ForegroundColor Green
} else {
    Write-Host "[OK]    Node.js dependencies already installed.`n" -ForegroundColor Green
}

# ── Create required directories ───────────────────────────────
$Dirs = @("uploads", "exports", "chroma_db")
foreach ($d in $Dirs) {
    $DirPath = Join-Path $Backend $d
    if (-Not (Test-Path $DirPath)) {
        New-Item -ItemType Directory -Path $DirPath | Out-Null
    }
}

# ══════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host " Starting Services" -ForegroundColor White
Write-Host "──────────────────────────────────────────────────────────`n" -ForegroundColor Cyan

# ── Start Backend ─────────────────────────────────────────────
Write-Host "[BACKEND] " -NoNewline -ForegroundColor Blue; Write-Host "Starting FastAPI on http://localhost:8000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    `$Host.UI.RawUI.WindowTitle = 'FinGuard AI Backend';
    Set-Location '$Backend';
    Write-Host '`n FinGuard AI Backend — FastAPI + Uvicorn' -ForegroundColor Cyan;
    Write-Host ' Nebius AI Studio: DeepSeek V3 / Qwen3 / Llama3`n' -ForegroundColor DarkGray;
    & $PyCmd -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
"

Write-Host "         Waiting for backend to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 4

# ── Start Frontend ────────────────────────────────────────────
Write-Host "[FRONTEND] " -NoNewline -ForegroundColor Green; Write-Host "Starting Next.js on http://localhost:3000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    `$Host.UI.RawUI.WindowTitle = 'FinGuard AI Frontend';
    Set-Location '$Frontend';
    Write-Host '`n FinGuard AI Frontend — Next.js`n' -ForegroundColor Cyan;
    & npm run dev
"

Write-Host "         Waiting for Next.js to compile (first run may take 30s)..." -ForegroundColor DarkGray
Start-Sleep -Seconds 8

# ══════════════════════════════════════════════════════════════
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║" -NoNewline -ForegroundColor Cyan; Write-Host "  ✓ All services started!                                  " -NoNewline -ForegroundColor Green; Write-Host "║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║                                                          ║" -ForegroundColor Cyan
Write-Host "║   Frontend:   http://localhost:3000                      ║" -ForegroundColor Cyan
Write-Host "║   Backend:    http://localhost:8000                      ║" -ForegroundColor Cyan
Write-Host "║   API Docs:   http://localhost:8000/api/docs             ║" -ForegroundColor Cyan
Write-Host "║                                                          ║" -ForegroundColor Cyan
Write-Host "║   Nebius Models Active:                                  ║" -ForegroundColor Cyan
Write-Host "║   · DeepSeek-V3.2   → Fraud + Investment Analysis        ║" -ForegroundColor Cyan
Write-Host "║   · Qwen3-235B      → Annual Report Long-Context         ║" -ForegroundColor Cyan
Write-Host "║   · Llama-3.3-70B   → Extraction + Chat                  ║" -ForegroundColor Cyan
Write-Host "║   · Qwen3-Embedding → RAG Vector Search                  ║" -ForegroundColor Cyan
Write-Host "║                                                          ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Press any key to open the app in your browser...        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "http://localhost:3000"

Write-Host "`n[DONE] Browser opened. Both service windows are running separately." -ForegroundColor Green
Write-Host "       Close the backend and frontend windows to stop the services.`n"
Read-Host "Press Enter to exit"
