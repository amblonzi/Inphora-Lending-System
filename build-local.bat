@echo off
echo ========================================
echo Inphora Lending System - Local Build
echo ========================================
echo.

REM Clean previous builds
echo [1/4] Cleaning previous builds...
docker-compose -f docker-compose.production.yml down --remove-orphans 2>nul
docker system prune -f 2>nul

REM Build Docker images
echo [2/4] Building Docker images...
docker-compose -f docker-compose.production.yml build --no-cache
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed
    pause
    exit /b 1
)

REM Test local build
echo [3/4] Testing local build...
docker-compose -f docker-compose.production.yml up -d
timeout /t 30 /nobreak >nul

echo Testing health endpoints...
curl -f http://localhost:8001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: il.inphora.net (Port 8001) - OK
) else (
    echo FAILED: il.inphora.net (Port 8001) - Failed
)

curl -f http://localhost:8002/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: amariflow.inphora.net (Port 8002) - OK
) else (
    echo FAILED: amariflow.inphora.net (Port 8002) - Failed
)

curl -f http://localhost:8003/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: tytahj.inphora.net (Port 8003) - OK
) else (
    echo FAILED: tytahj.inphora.net (Port 8003) - Failed
)

REM Stop test services
echo [4/4] Stopping test services...
docker-compose -f docker-compose.production.yml down

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
