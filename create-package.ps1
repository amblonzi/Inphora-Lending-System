# Create deployment package
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveName = "inphora-production-$timestamp.tar.gz"

Write-Host "Creating deployment package: $archiveName" -ForegroundColor Green

$files = @(
    "docker-compose.production.yml",
    "env.production.example", 
    "nginx/conf.d/production.conf",
    "deploy.sh",
    "deploy-simple.sh",
    "DEPLOYMENT_GUIDE.md",
    "QUICK_COMMANDS.md",
    "docker-compose.simple.yml",
    "backend/",
    "frontend/",
    "db_config/"
)

# Use tar if available (Git Bash)
try {
    $tarCommand = "tar -czf $archiveName " + ($files -join " ")
    Invoke-Expression $tarCommand
    Write-Host "✓ Package created: $archiveName" -ForegroundColor Green
} catch {
    # Fallback to PowerShell Compress-Archive
    Write-Host "tar not available, using PowerShell Compress-Archive..." -ForegroundColor Yellow
    $zipName = "inphora-production-$timestamp.zip"
    Compress-Archive -Path $files -DestinationPath $zipName -Force
    Write-Host "✓ Package created: $zipName" -ForegroundColor Green
    $archiveName = $zipName
} finally {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "DEPLOYMENT PACKAGE READY" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Package: $archiveName" -ForegroundColor White
    $item = Get-Item $archiveName -ErrorAction SilentlyContinue
    if ($item) {
        $size = [math]::Round($item.Length / 1MB, 2)
        Write-Host "Size: $size MB" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Upload to server: upload-to-cloud.bat" -ForegroundColor White
    Write-Host "2. Deploy on server: ssh root@138.68.241.97" -ForegroundColor White
    Write-Host "3. Run deployment: ./deploy-simple.sh" -ForegroundColor White
    Write-Host ""
}
