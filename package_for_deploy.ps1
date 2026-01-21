# deploy_packager.ps1

Write-Host "Packaging project for deployment..." -ForegroundColor Green

$exclude = @(
    "node_modules",
    ".venv",
    ".git",
    "__pycache__",
    "dist",
    "build",
    "*.zip",
    "static/uploads"
)

$source = "."
$dbConfig = "deploy_package.zip"

if (Test-Path $dbConfig) {
    Remove-Item $dbConfig
}

# Get-ChildItem with excludes to filter commonly ignored directories
# PowerShell's Compress-Archive doesn't have a robust exclude for deep folders,
# so we will use git archive if available, or just tell user to be careful.
# Ideally, we just pick the folders we WANT.

$foldersToZip = @(
    "backend",
    "frontend",
    "nginx"
)
$filesToZip = @(
    "docker-compose.yml",
    "env.example.production",
    "init_ssl.sh"
)

Write-Host "Creating archive: $dbConfig"
Compress-Archive -Path $foldersToZip, $filesToZip -DestinationPath $dbConfig -Force

Write-Host "Done! You can now upload specific file:"
Write-Host "scp $dbConfig root@138.68.241.97:/opt/inphora" -ForegroundColor Yellow
