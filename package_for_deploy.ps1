# Inphora Deployment Packager
# Produces deploy_package_v2.zip for upload to the server

# Load the required .NET assembly for zip operations at the top level
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$PackageName   = "deploy_package_v2.zip"
$TempDeployDir = "temp_deploy_inphora"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  INPHORA DEPLOYMENT PACKAGER"          -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Clean up potential file locks
Write-Host "Cleaning up background processes to release file locks..." -ForegroundColor Yellow
$ProcessesToKill = @("node", "npm", "python")
foreach ($ProcessName in $ProcessesToKill)
{
    if (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)
    {
        Stop-Process -Name $ProcessName -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# 2. Remove old package if it exists
if (Test-Path -Path $PackageName)
{
    Remove-Item -Path $PackageName -Force -ErrorAction Stop
    Write-Host "Removed old package." -ForegroundColor Yellow
}

# 3. Files and folders to include
$Includes = @(
    "backend",
    "frontend",
    "nginx",
    "db_config",
    "docker-compose.yml",
    "docker-compose.production.yml",
    "docker-compose.simple.yml",
    "deploy.sh",
    "deploy-simple.sh",
    "init_databases.sh",
    "env.production.example",
    ".env.production",
    "DEPLOYMENT_GUIDE.md",
    "DEPLOY_INSTRUCTIONS.md",
    "QUICK_COMMANDS.md",
    "QUICK_START_GUIDE.md"
)

Write-Host "Gathering files for packaging (excluding node_modules and venv)..." -ForegroundColor Yellow

# Reset temp directory
if (Test-Path -Path $TempDeployDir)
{
    Remove-Item -Path $TempDeployDir -Recurse -Force -ErrorAction Stop
}
New-Item -ItemType Directory -Path $TempDeployDir -Force | Out-Null

$ItemsCopied = 0

# FIX 1: All braces in this foreach are fully matched on their own lines.
# This resolves the "Missing closing '}' in statement block" error (line 72).
foreach ($Item in $Includes)
{
    if (Test-Path -Path $Item)
    {
        $DestinationPath = Join-Path -Path $TempDeployDir -ChildPath $Item

        if (Test-Path -Path $Item -PathType Container)
        {
            Write-Host "Gathering $Item..." -ForegroundColor White
            & robocopy "$Item" "$DestinationPath" /E /XD node_modules venv .git __pycache__ .next .vite /XF .DS_Store *.log /R:0 /W:0 /NJH /NJS | Out-Null

            # robocopy exits 1-7 on success; reset so PowerShell does not treat it as a failure
            if ($LASTEXITCODE -le 7)
            {
                $LASTEXITCODE = 0
            }
        }
        else
        {
            # Ensure parent directory exists before copying a flat file
            $ParentDir = Split-Path -Path $DestinationPath -Parent
            if (-not (Test-Path -Path $ParentDir))
            {
                New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
            }
            Copy-Item -Path $Item -Destination $DestinationPath -Force
        }

        $ItemsCopied++
    }
    else
    {
        Write-Host "WARNING: '$Item' not found - skipping." -ForegroundColor DarkYellow
    }
}

# Guard against packaging an empty directory
if ($ItemsCopied -eq 0)
{
    Write-Host "ERROR: No source files were found to package. Aborting." -ForegroundColor Red
    Remove-Item -Path $TempDeployDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# 4. Compression logic
# FIX 2: The try block now always has its matching catch block present.
# The original was missing the catch, causing "Try statement is missing its Catch or Finally block" (line 89).
# FIX 3: Removed the unused $size variable (PSUseDeclaredVarsMoreThanAssignments warning, line 89).
# Size is now computed inline directly into $PackageFinalSize, which is actually used.
try
{
    Write-Host "Compressing archive..." -ForegroundColor Green

    $FullZipPath = [System.IO.Path]::GetFullPath((Join-Path -Path (Get-Location) -ChildPath $PackageName))
    $FullSrcPath = [System.IO.Path]::GetFullPath((Join-Path -Path (Get-Location) -ChildPath $TempDeployDir))

    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $FullSrcPath,
        $FullZipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    # Cleanup temp directory after successful zip
    if (Test-Path -Path $TempDeployDir)
    {
        Remove-Item -Path $TempDeployDir -Recurse -Force -ErrorAction Stop
    }

    # Compute size inline - no intermediate unused variable
    $PackageFinalSize = [math]::Round((Get-Item -Path $PackageName).Length / 1MB, 2)

    Write-Host ""
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host "PACKAGE READY: $PackageName"            -ForegroundColor Green
    Write-Host "Size: $PackageFinalSize MB"             -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host ""
}
catch
{
    Write-Host "ERROR packaging: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path -Path $TempDeployDir)
    {
        Remove-Item -Path $TempDeployDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload to server: scp `"$PackageName`" root@138.68.241.97:/opt/inphora/"
Write-Host "2. SSH into server:  ssh root@138.68.241.97"
Write-Host "3. Deploy on server: ./deploy.sh deploy"
# End of Packager Script
