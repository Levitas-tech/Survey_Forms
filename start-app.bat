@echo off
echo Starting SurveyFlow Application...
echo.

echo Starting Backend...
start "Backend" cmd /k "cd backend && npm run start:dev"

echo Waiting 5 seconds...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
