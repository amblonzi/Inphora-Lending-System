@echo off
echo ========================================
echo Inphora Lending System - Cloud Upload
echo ========================================
echo.

REM Create timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,8%_%dt:~8,6%"

REM Create production archive
echo [1/3] Creating production archive...
set "archive_name=inphora-production-%timestamp%.tar.gz"

REM Use tar if available (Git Bash/WSL)
tar --version >nul 2>&1
if %errorlevel% equ 0 (
    tar -czf %archive_name% docker-compose.production.yml env.production.example nginx/conf.d/production.conf deploy.sh backend/ frontend/ db_config/
    echo SUCCESS: Archive created using tar
) else (
    echo WARNING: tar not available, using PowerShell
    powershell -Command "Compress-Archive -Path @('docker-compose.production.yml','env.production.example','nginx/conf.d/production.conf','deploy.sh','backend/','frontend/','db_config/') -DestinationPath 'inphora-production-%timestamp%.zip' -Force"
    set "archive_name=inphora-production-%timestamp%.zip"
    echo SUCCESS: Archive created using PowerShell
)

REM Upload to server
echo [2/3] Uploading to server 138.68.241.97...
scp %archive_name% root@138.68.241.97:/opt/
if %errorlevel% neq 0 (
    echo ERROR: Upload failed
    pause
    exit /b 1
)
echo SUCCESS: Upload completed

REM Extract on server
echo [3/3] Extracting on server...
ssh root@138.68.241.97 "cd /opt && tar -xzf %archive_name% && chmod +x Inphora-Lending-System/deploy.sh"
if %errorlevel% neq 0 (
    echo ERROR: Extraction failed
    pause
    exit /b 1
)
echo SUCCESS: Archive extracted

echo.
echo ========================================
echo UPLOAD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Archive: %archive_name%
echo Server: 138.68.241.97
echo Location: /opt/Inphora-Lending-System/
echo.
echo Next steps:
echo 1. SSH to server: ssh root@138.68.241.97
echo 2. Deploy: cd /opt/Inphora-Lending-System && ./deploy.sh deploy
echo.
pause
