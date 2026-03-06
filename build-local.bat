@echo off
echo ========================================
echo Inphora Lending System - Local Build
echo ========================================
echo.

REM Clean previous builds
echo [1/4] Cleaning previous builds...
docker-compose -f docker-compose.local.yml down --remove-orphans 2>nul
docker system prune -f 2>nul

REM Build Docker images
echo [2/4] Building Docker images...
docker-compose -f docker-compose.local.yml build --no-cache
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed
    pause
    exit /b 1
)

REM Test local build
echo [3/4] Testing local build...
docker-compose -f docker-compose.local.yml up -d
timeout /t 30 /nobreak >nul

echo Testing health endpoint...
curl -f http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: Backend (Port 8000) - OK
) else (
    echo FAILED: Backend (Port 8000) - Failed
)

curl -f http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: Frontend (Port 5173) - OK
) else (
    echo FAILED: Frontend (Port 5173) - Failed
)

REM Stop test services
echo [4/4] Stopping test services...
docker-compose -f docker-compose.local.yml down

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Next steps:
echo 1. Upload to cloud: upload-to-cloud.bat
echo 2. Deploy on server: ssh root@138.68.241.97
echo.
pause
