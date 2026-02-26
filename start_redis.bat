@echo off
echo Starting Redis for Inphora Lending System...
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% == 0 (
    echo Docker found. Starting Redis container...
    
    REM Check if Redis container already exists
    docker ps -a -f name=inphora-redis | find "inphora-redis" >nul
    if %errorlevel% == 0 (
        echo Redis container exists. Starting it...
        docker start inphora-redis
    ) else (
        echo Creating new Redis container...
        docker run --name inphora-redis -p 6379:6379 -v redis-data:/data -d redis:latest redis-server --appendonly yes
    )
    
    REM Wait for Redis to start
    echo Waiting for Redis to start...
    timeout /t 5 /nobreak >nul
    
    REM Test connection
    docker exec -it inphora-redis redis-cli ping
    if %errorlevel% == 0 (
        echo Redis started successfully!
        echo Redis is running on localhost:6379
    ) else (
        echo Failed to start Redis. Please check Docker.
    )
) else (
    echo Docker not found. Please install Docker Desktop or use native Redis.
    echo.
    echo Alternative options:
    echo 1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo 2. Install Redis for Windows from https://github.com/microsoftarchive/redis/releases
    echo 3. Use WSL2 with Redis (recommended for development)
    echo.
    pause
)

echo.
echo To test Redis connection, run:
echo docker exec -it inphora-redis redis-cli ping
echo.
echo To stop Redis, run:
echo docker stop inphora-redis
echo.
pause
