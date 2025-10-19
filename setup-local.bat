@echo off
echo 🚀 Setting up SurveyFlow locally (Fixed Version)...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo 📝 Creating environment files...

REM Backend .env
if not exist "backend\.env" (
    echo # Database > backend\.env
    echo DB_HOST=postgres >> backend\.env
    echo DB_PORT=5432 >> backend\.env
    echo DB_USERNAME=surveyflow >> backend\.env
    echo DB_PASSWORD=password >> backend\.env
    echo DB_DATABASE=surveyflow >> backend\.env
    echo. >> backend\.env
    echo # Redis >> backend\.env
    echo REDIS_HOST=redis >> backend\.env
    echo REDIS_PORT=6379 >> backend\.env
    echo REDIS_PASSWORD= >> backend\.env
    echo. >> backend\.env
    echo # JWT >> backend\.env
    echo JWT_SECRET=dev-jwt-secret-key-123456789 >> backend\.env
    echo JWT_EXPIRES_IN=15m >> backend\.env
    echo JWT_REFRESH_SECRET=dev-refresh-secret-key-987654321 >> backend\.env
    echo JWT_REFRESH_EXPIRES_IN=7d >> backend\.env
    echo. >> backend\.env
    echo # File Storage >> backend\.env
    echo AWS_ACCESS_KEY_ID= >> backend\.env
    echo AWS_SECRET_ACCESS_KEY= >> backend\.env
    echo AWS_REGION=us-east-1 >> backend\.env
    echo AWS_S3_BUCKET=surveyflow-uploads >> backend\.env
    echo. >> backend\.env
    echo # Email >> backend\.env
    echo SMTP_HOST=smtp.gmail.com >> backend\.env
    echo SMTP_PORT=587 >> backend\.env
    echo SMTP_USER= >> backend\.env
    echo SMTP_PASS= >> backend\.env
    echo FROM_EMAIL=noreply@surveyflow.local >> backend\.env
    echo. >> backend\.env
    echo # App >> backend\.env
    echo PORT=3001 >> backend\.env
    echo NODE_ENV=development >> backend\.env
    echo FRONTEND_URL=http://localhost:3000 >> backend\.env
    echo. >> backend\.env
    echo # Rate Limiting >> backend\.env
    echo THROTTLE_TTL=60 >> backend\.env
    echo THROTTLE_LIMIT=100 >> backend\.env
    echo ✅ Created backend\.env
)

REM Frontend .env.local
if not exist "frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 > frontend\.env.local
    echo NEXT_PUBLIC_APP_NAME=SurveyFlow >> frontend\.env.local
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000 >> frontend\.env.local
    echo ✅ Created frontend\.env.local
)

echo 📦 Installing dependencies with fixed versions...

REM Clear npm cache first
echo Clearing npm cache...
npm cache clean --force

REM Install root dependencies
if not exist "node_modules" (
    echo Installing root dependencies...
    npm install --legacy-peer-deps
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    npm install --legacy-peer-deps
    cd ..
)

REM Install frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install --legacy-peer-deps
    cd ..
)

echo 🐳 Starting services with Docker Compose...

REM Start the services
docker-compose -f docker-compose.dev.yml up -d

echo ⏳ Waiting for services to start...
timeout /t 45 /nobreak >nul

echo 🔍 Checking service status...
docker-compose -f docker-compose.dev.yml ps

echo.
echo 🎉 SurveyFlow is now running locally!
echo.
echo 📱 Access points:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:3001
echo    API Docs: http://localhost:3001/api/docs
echo    Health Check: http://localhost:3001/health
echo.
echo 🔧 Management commands:
echo    View logs: docker-compose -f docker-compose.dev.yml logs -f
echo    Stop services: docker-compose -f docker-compose.dev.yml down
echo    Restart: docker-compose -f docker-compose.dev.yml restart
echo.
pause
