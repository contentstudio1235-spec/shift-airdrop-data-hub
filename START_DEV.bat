@echo off
REM ============================================================
REM SHIFT RWA Referral System - Development Startup Script
REM ============================================================

echo.
echo 🚀 SHIFT RWA Referral System - Development Mode
echo ============================================================
echo.

REM Check Node.js
node --version > nul 2>&1
if errorlevel 1 (
  echo ❌ Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

echo ✅ Node.js detected
echo.

REM Change to project root
cd /d "%~dp0"

echo ============================================================
echo 📦 DEPENDENCIES CHECK
echo ============================================================
echo.

REM Install root dependencies if needed
if not exist "node_modules" (
  echo 📥 Installing backend dependencies...
  call npm install
) else (
  echo ✅ Backend dependencies already installed
)

echo.

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
  echo 📥 Installing frontend dependencies...
  cd frontend
  call npm install --legacy-peer-deps
  cd ..
) else (
  echo ✅ Frontend dependencies already installed
)

echo.
echo ============================================================
echo 🔨 BUILD TEST
echo ============================================================
echo.

REM Build backend
call npm run build > nul 2>&1
if errorlevel 1 (
  echo ❌ Backend build failed
  call npm run build
  pause
  exit /b 1
) else (
  echo ✅ Backend build successful
)

echo.
echo ============================================================
echo 🎯 DEVELOPMENT SERVERS
echo ============================================================
echo.
echo Backend Dev Server:  http://localhost:3000 (runs on configured port)
echo Frontend Dev Server: http://localhost:3000 (Next.js)
echo.
echo Referral Dashboard:  http://localhost:3000/referral
echo Airdrop:           http://localhost:3000/airdrop
echo Leaderboard:       http://localhost:3000/leaderboard
echo.
echo ============================================================
echo.
echo Starting development servers...
echo.
echo To stop both servers, press Ctrl+C
echo.
pause

REM Start backend dev server in background
echo Starting backend development server...
start "SHIFT Backend Dev" cmd /k "npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak

REM Start frontend dev server
echo Starting frontend development server...
cd frontend
npm run dev

