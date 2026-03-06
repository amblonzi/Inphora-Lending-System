# Inphora Deployment Packager
# Produces deploy_package_v2.zip for upload to the server

$packageName = "deploy_package_v2.zip"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  INPHORA DEPLOYMENT PACKAGER" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Remove old package if it exists
if (Test-Path $packageName) {
    Remove-Item $packageName -Force
    Write-Host "Removed old package." -ForegroundColor Yellow
}

# Files and folders to include
$includes = @(
    "backend",
    "frontend",
    "nginx",
    "db_config",
    "docker-compose.production.yml",
    "docker-compose.simple.yml",
    "deploy.sh",
    "deploy-simple.sh",
    "env.production.example",
    "DEPLOYMENT_GUIDE.md",
    "QUICK_COMMANDS.md",
    "QUICK_START_GUIDE.md"
)

Write-Host "Packaging the following:" -ForegroundColor Green
$includes | ForEach-Object { Write-Host "  -> $_" -ForegroundColor White }
Write-Host ""

try {
    Compress-Archive -Path $includes -DestinationPath $packageName -Force
    $size = [math]::Round((Get-Item $packageName).Length / 1MB, 2)
    Write-Host ""
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host "  PACKAGE READY: $packageName" -ForegroundColor Green
    Write-Host "  Size: $size MB" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Upload to server:" -ForegroundColor White
    Write-Host "   scp deploy_package_v2.zip root@138.68.241.97:/opt/inphora/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. SSH into server:" -ForegroundColor White
    Write-Host "   ssh root@138.68.241.97" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Deploy on server:" -ForegroundColor White
    Write-Host "   cd /opt/inphora" -ForegroundColor Cyan
    Write-Host "   unzip -o deploy_package_v2.zip" -ForegroundColor Cyan
    Write-Host "   cp .env.production .env" -ForegroundColor Cyan
    Write-Host "   docker compose up -d --build" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "ERROR packaging: $_" -ForegroundColor Red
    exit 1
}
