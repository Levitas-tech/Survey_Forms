# SurveyFlow Local Setup Script - Fixed for Windows
Write-Host "🚀 Setting up SurveyFlow locally (Fixed Version)..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "📝 Creating environment files..." -ForegroundColor Yellow

# Backend .env
if (-not (Test-Path "backend\.env")) {
    $backendEnv = @"
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=surveyflow
DB_PASSWORD=password
DB_DATABASE=surveyflow

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=dev-jwt-secret-key-123456789
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-key-987654321
JWT_REFRESH_EXPIRES_IN=7d

# File Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=surveyflow-uploads

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@surveyflow.local

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
"@
    $backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "✅ Created backend\.env" -ForegroundColor Green
}

# Frontend .env.local
if (-not (Test-Path "frontend\.env.local")) {
    $frontendEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=SurveyFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@
    $frontendEnv | Out-File -FilePath "frontend\.env.local" -Encoding UTF8
    Write-Host "✅ Created frontend\.env.local" -ForegroundColor Green
}

Write-Host "📦 Installing dependencies with fixed versions..." -ForegroundColor Yellow

# Clear npm cache first
Write-Host "Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# Install root dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
}

# Install backend dependencies with legacy peer deps
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location backend
    npm install --legacy-peer-deps
    Set-Location ..
}

# Install frontend dependencies with legacy peer deps
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location frontend
    npm install --legacy-peer-deps
    Set-Location ..
}

Write-Host "🐳 Starting services with Docker Compose..." -ForegroundColor Yellow

# Start the services
docker-compose -f docker-compose.dev.yml up -d

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "🎉 SurveyFlow is now running locally!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "   API Docs: http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "   Health Check: http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "   Stop services: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host "   Restart: docker-compose -f docker-compose.dev.yml restart" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
