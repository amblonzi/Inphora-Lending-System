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
    "static/uploads",
    ".env",
    ".env.development"
)

$source = "."
$dbConfig = "deploy_package_v2.zip"

if (Test-Path $dbConfig) {
    Remove-Item $dbConfig
}

# Define items to include in root
$itemsToZip = @(
    "backend",
    "nginx",
    "frontend", # Include full folder, we will handle exclusions via temporary move or specific pick
    "docker-compose.yml",
    "env.example.production",
    ".env.production",
    "init_ssl.sh",
    "server_deploy.sh",
    "init_databases.sh",
    "cleanup_server.sh"
)

# Since Compress-Archive is basic, we will create a temporary directoty to organize the zip
$tempDir = "temp_deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir

foreach ($item in $itemsToZip) {
    if (Test-Path $item) {
        $dest = Join-Path $tempDir (Split-Path $item -Leaf)
        Copy-Item -Path $item -Destination $dest -Recurse -Exclude $exclude
    }
}

# Remove heavy/environment specific files from frontend inside temp
$frontendTemp = Join-Path $tempDir "frontend"
if (Test-Path $frontendTemp) {
    Get-ChildItem -Path $frontendTemp -Include "node_modules", "dist", ".env", ".env.development" -Recurse | Remove-Item -Recurse -Force
}

Write-Host "Creating archive: $dbConfig"
Compress-Archive -Path "$tempDir\*" -DestinationPath $dbConfig -Force

# Cleanup temp
Remove-Item -Recurse -Force $tempDir

Write-Host "Done! Package created: $dbConfig" -ForegroundColor Green
Write-Host "Upload command:"
Write-Host "scp $dbConfig root@138.68.241.97:/opt/inphora" -ForegroundColor Yellow
