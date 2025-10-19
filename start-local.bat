@echo off
echo 🚀 Starting SurveyFlow in Local Development Mode...

echo.
echo 📝 Step 1: Setting up database...
echo Please make sure PostgreSQL is running on your system
echo Database: surveyflow
echo Username: postgres
echo Password: (your PostgreSQL password)

echo.
echo 📦 Step 2: Installing dependencies...

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo 🗄️ Step 3: Setting up database...
echo Please run the following SQL commands in your PostgreSQL:
echo.
echo CREATE DATABASE surveyflow;
echo \c surveyflow;
echo -- Then run the migration script from backend/src/database/migrations/001-initial-schema.sql
echo.

echo.
echo 🚀 Step 4: Starting applications...
echo Starting backend on http://localhost:3001...
start "Backend" cmd /k "cd backend && npm run start:dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend on http://localhost:3000...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ SurveyFlow is starting up!
echo.
echo 📱 Access points:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:3001
echo    API Docs: http://localhost:3001/api/docs
echo.
echo Press any key to continue...
pause >nul
