# SurveyFlow Local Development Setup
Write-Host "🚀 Starting SurveyFlow in Local Development Mode..." -ForegroundColor Green

Write-Host ""
Write-Host "📝 Step 1: Setting up database..." -ForegroundColor Yellow
Write-Host "Please make sure PostgreSQL is running on your system" -ForegroundColor Cyan
Write-Host "Database: surveyflow" -ForegroundColor Cyan
Write-Host "Username: postgres" -ForegroundColor Cyan
Write-Host "Password: (your PostgreSQL password)" -ForegroundColor Cyan

Write-Host ""
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Yellow

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ..\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🗄️ Step 3: Setting up database..." -ForegroundColor Yellow
Write-Host "Please run the following SQL commands in your PostgreSQL:" -ForegroundColor Cyan
Write-Host ""
Write-Host "CREATE DATABASE surveyflow;" -ForegroundColor White
Write-Host "\c surveyflow;" -ForegroundColor White
Write-Host "-- Then run the migration script from backend/src/database/migrations/001-initial-schema.sql" -ForegroundColor White
Write-Host ""

Write-Host ""
Write-Host "🚀 Step 4: Starting applications..." -ForegroundColor Yellow
Write-Host "Starting backend on http://localhost:3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start:dev"

Write-Host "Waiting 5 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Starting frontend on http://localhost:3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "✅ SurveyFlow is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "   API Docs: http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
