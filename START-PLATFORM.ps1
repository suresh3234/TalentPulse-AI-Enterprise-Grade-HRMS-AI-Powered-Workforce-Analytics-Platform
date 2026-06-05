# ============================================================
#  HRMS Platform - Master Startup Script
#  Run this from the project root: .\START-PLATFORM.ps1
# ============================================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$AiServiceDir = Join-Path $ProjectRoot "ai-service"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   HRMS Platform - Starting All Services   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# -- 1. MongoDB -----------------------------------------------
Write-Host "[1/4] Starting MongoDB..." -ForegroundColor Yellow

$mongoDataDir = "C:\data\db"
if (-not (Test-Path $mongoDataDir)) {
    New-Item -ItemType Directory -Path $mongoDataDir -Force | Out-Null
    Write-Host "      Created MongoDB data directory: $mongoDataDir" -ForegroundColor Gray
}

$mongoPaths = @(
    "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe",
    "C:\mongodb\bin\mongod.exe"
)

$mongodExe = $null
foreach ($p in $mongoPaths) {
    if (Test-Path $p) { $mongodExe = $p; break }
}

if ($mongodExe) {
    Start-Process -FilePath "cmd" -ArgumentList ('/c "' + $mongodExe + '" --dbpath "' + $mongoDataDir + '"') -WindowStyle Minimized
    Write-Host "      MongoDB started (data: $mongoDataDir)" -ForegroundColor Green
} else {
    Write-Host "      [SKIP] MongoDB not found locally." -ForegroundColor DarkYellow
    Write-Host "      Using MONGO_URI from backend/.env - ensure your MongoDB is reachable." -ForegroundColor DarkYellow
}

Start-Sleep -Seconds 2

# -- 2. AI Service (FastAPI / Python) -------------------------
Write-Host ""
Write-Host "[2/4] Starting AI Service on port 8001..." -ForegroundColor Yellow

$aiScript = "cd /d `"$AiServiceDir`"`r`npip install -r requirements.txt -q`r`npython -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

Start-Process -FilePath "cmd" -ArgumentList "/k $aiScript" -WorkingDirectory $AiServiceDir
Write-Host "      AI Service starting at http://localhost:8001" -ForegroundColor Green
Start-Sleep -Seconds 3

# -- 3. Backend (Node.js / Express) ---------------------------
Write-Host ""
Write-Host "[3/4] Starting Backend on port 5000..." -ForegroundColor Yellow

Start-Process -FilePath "cmd" -ArgumentList "/k npm run dev" -WorkingDirectory $BackendDir
Write-Host "      Backend starting at http://localhost:5000" -ForegroundColor Green
Start-Sleep -Seconds 2

# -- 4. Frontend (Vite / React) -------------------------------
Write-Host ""
Write-Host "[4/4] Starting Frontend..." -ForegroundColor Yellow

Start-Process -FilePath "cmd" -ArgumentList "/k npm run dev" -WorkingDirectory $FrontendDir
Write-Host "      Frontend starting at http://localhost:5173" -ForegroundColor Green

# -- Summary ------------------------------------------------──
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   All services are starting up!           " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service          URL" -ForegroundColor White
Write-Host "  -------------   -----------------------------"
Write-Host "  Frontend         http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend API      http://localhost:5000" -ForegroundColor Green
Write-Host "  AI Service       http://localhost:8001" -ForegroundColor Green
Write-Host "  API Docs         http://localhost:5000/api-docs" -ForegroundColor Green
Write-Host "  Health Check     http://localhost:5000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "  Default Login Credentials:" -ForegroundColor White
Write-Host "  ---------------------------------------------"
Write-Host "  Admin Email:     admin@hrms.com" -ForegroundColor Yellow
Write-Host "  Admin Password:  Admin@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Wait ~10 seconds for all services to be ready." -ForegroundColor DarkGray
Write-Host ""
