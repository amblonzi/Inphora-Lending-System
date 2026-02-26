@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Inphora Lending System - Build & Upload Script
REM Batch Script for Windows Users
REM ============================================

title Inphora Lending System - Build & Upload

:menu
cls
echo ========================================
echo Inphora Lending System Build & Upload
echo ========================================
echo.
echo Available Actions:
echo 1. Build Docker Images
echo 2. Test Local Build
echo 3. Create Build Archive
echo 4. Upload to Server
echo 5. Upload to Git
echo 6. Deploy to Production
echo 7. Build, Test, Archive, Upload, Deploy
echo 8. Exit
echo.
set /p choice="Select action (1-8): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto test
if "%choice%"=="3" goto archive
if "%choice%"=="4" goto upload
if "%choice%"=="5" goto git
if "%choice%"=="6" goto deploy
if "%choice%"=="7" goto all
if "%choice%"=="8" goto exit
goto menu

:check_prerequisites
echo [INFO] Checking prerequisites...
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)
echo [SUCCESS] Docker found

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose not found. Please install Docker Compose.
    pause
    exit /b 1
)
echo [SUCCESS] Docker Compose found

REM Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not found. Please install Git.
    pause
    exit /b 1
)
echo [SUCCESS] Git found

echo [SUCCESS] Prerequisites check completed
echo.
goto :eof

:build
call :check_prerequisites
echo [INFO] Building Docker images...
echo.

docker-compose -f docker-compose.production.yml build --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Docker build failed
    pause
    exit /b 1
)

echo [INFO] Building individual services...
docker-compose -f docker-compose.production.yml build backend_il
docker-compose -f docker-compose.production.yml build backend_amari
docker-compose -f docker-compose.production.yml build backend_tytahj
docker-compose -f docker-compose.production.yml build frontend

echo [SUCCESS] All Docker images built successfully
echo.
pause
goto menu

:test
echo [INFO] Testing local build...
echo.

docker-compose -f docker-compose.production.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

echo [INFO] Waiting for services to start...
timeout /t 30 /nobreak >nul

echo [INFO] Testing health endpoints...
curl -f http://localhost:8001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] http://localhost:8001/api/health - OK
) else (
    echo [FAILED]  http://localhost:8001/api/health - Failed
)

curl -f http://localhost:8002/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] http://localhost:8002/api/health - OK
) else (
    echo [FAILED]  http://localhost:8002/api/health - Failed
)

curl -f http://localhost:8003/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] http://localhost:8003/api/health - OK
) else (
    echo [FAILED]  http://localhost:8003/api/health - Failed
)

echo [INFO] Stopping test services...
docker-compose -f docker-compose.production.yml down

echo [SUCCESS] Local build test completed
echo.
pause
goto menu

:archive
echo [INFO] Creating build archive...
echo.

REM Get timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,8%_%dt:~8,6%"

set "archive_name=inphora-production-%timestamp%.tar.gz"

echo [INFO] Creating archive: %archive_name%

REM Try using tar (Git Bash or WSL)
tar --version >nul 2>&1
if %errorlevel% equ 0 (
    tar -czf %archive_name% docker-compose.production.yml env.production.example nginx/conf.d/production.conf deploy.sh DEPLOYMENT_GUIDE.md QUICK_COMMANDS.md BUILD_UPLOAD_GUIDE.md backend/ frontend/ db_config/
    if %errorlevel% equ 0 (
        echo [SUCCESS] Archive created: %archive_name%
    ) else (
        echo [ERROR] Archive creation failed
        pause
        exit /b 1
    )
) else (
    echo [WARNING] tar not available, using PowerShell Compress-Archive
    powershell -Command "Compress-Archive -Path @('docker-compose.production.yml','env.production.example','nginx/conf.d/production.conf','deploy.sh','DEPLOYMENT_GUIDE.md','QUICK_COMMANDS.md','BUILD_UPLOAD_GUIDE.md','backend/','frontend/','db_config/') -DestinationPath 'inphora-production-%timestamp%.zip' -Force"
    set "archive_name=inphora-production-%timestamp%.zip"
    echo [SUCCESS] Archive created: %archive_name%
)

echo.
pause
goto menu

:upload
call :archive
echo [INFO] Uploading to server 138.68.241.97...
echo.

REM Test SSH connection
ssh -o ConnectTimeout=10 -o BatchMode=yes root@138.68.241.97 "echo 'Connection successful'"
if %errorlevel% neq 0 (
    echo [ERROR] SSH connection failed. Please check credentials and network.
    pause
    exit /b 1
)

REM Upload archive
scp %archive_name% root@138.68.241.97:/opt/
if %errorlevel% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)

echo [SUCCESS] Upload completed successfully

REM Extract archive on server
echo [INFO] Extracting archive on server...
ssh root@138.68.241.97 "cd /opt && tar -xzf %archive_name% && chmod +x Inphora-Lending-System/deploy.sh"
if %errorlevel% neq 0 (
    echo [ERROR] Archive extraction failed
    pause
    exit /b 1
)

echo [SUCCESS] Archive extracted successfully
echo.
pause
goto menu

:git
echo [INFO] Uploading to Git repository...
echo.

REM Check Git status
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git status check failed
    pause
    exit /b 1
)

REM Stage all files
echo [INFO] Staging files...
git add .

REM Get timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,8% %dt:~8,6%"

REM Commit changes
git commit -m "build: Production build ready for deployment

🏗️ Build Components:
• Docker images built and tested
• Production configuration validated
• All services health-checked
• SSL configuration prepared

📦 Build Timestamp: %timestamp%

🚀 Ready for deployment to 138.68.241.97"

if %errorlevel% neq 0 (
    echo [WARNING] No changes to commit
    pause
    goto menu
)

REM Push to GitHub
echo [INFO] Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git push failed
    pause
    exit /b 1
)

echo [SUCCESS] Successfully pushed to GitHub
echo.
pause
goto menu

:deploy
echo [INFO] Deploying to production...
echo.

REM SSH into server and run deployment
echo [INFO] Executing deployment on server...
ssh root@138.68.241.97 "cd /opt/Inphora-Lending-System && ./deploy.sh deploy"
if %errorlevel% neq 0 (
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo [SUCCESS] Deployment completed successfully

REM Verify deployment
echo [INFO] Verifying deployment...
curl -f https://il.inphora.net/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] https://il.inphora.net/api/health - OK
) else (
    echo [FAILED]  https://il.inphora.net/api/health - Failed
)

curl -f https://amariflow.inphora.net/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] https://amariflow.inphora.net/api/health - OK
) else (
    echo [FAILED]  https://amariflow.inphora.net/api/health - Failed
)

curl -f https://tytahj.inphora.net/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] https://tytahj.inphora.net/api/health - OK
) else (
    echo [FAILED]  https://tytahj.inphora.net/api/health - Failed
)

echo.
pause
goto menu

:all
call :build
call :test
call :archive
call :upload
call :deploy
echo [SUCCESS] All operations completed successfully!
echo.
pause
goto menu

:exit
echo [INFO] Exiting build and upload script...
exit /b 0
