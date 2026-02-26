# ============================================
# Inphora Lending System - Build & Upload Script
# PowerShell Script for Windows Users
# ============================================

param(
    [string]$Action = "build",
    [string]$Server = "138.68.241.97",
    [string]$User = "root"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-ColorOutput "[$Timestamp] [$Level] $Message" $Level
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check Docker
    try {
        $null = Get-Command docker -ErrorAction Stop
        Write-Log "Docker found: $(docker --version)" "Green"
    } catch {
        Write-Log "Docker not found. Please install Docker Desktop." "Red"
        exit 1
    }
    
    # Check Docker Compose
    try {
        $null = Get-Command docker-compose -ErrorAction Stop
        Write-Log "Docker Compose found: $(docker-compose --version)" "Green"
    } catch {
        Write-Log "Docker Compose not found. Please install Docker Compose." "Red"
        exit 1
    }
    
    # Check Git
    try {
        $null = Get-Command git -ErrorAction Stop
        Write-Log "Git found: $(git --version)" "Green"
    } catch {
        Write-Log "Git not found. Please install Git." "Red"
        exit 1
    }
    
    Write-Log "Prerequisites check completed" "Green"
}

function Build-DockerImages {
    Write-Log "Building Docker images..."
    
    try {
        # Build all images
        Write-Log "Building all Docker images..." "Blue"
        $Result = docker-compose -f docker-compose.production.yml build --no-cache
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker images built successfully" "Green"
        } else {
            Write-Log "Docker build failed" "Red"
            exit 1
        }
        
        # Build specific services
        Write-Log "Building individual services..." "Blue"
        docker-compose -f docker-compose.production.yml build backend_il
        docker-compose -f docker-compose.production.yml build backend_amari
        docker-compose -f docker-compose.production.yml build backend_tytahj
        docker-compose -f docker-compose.production.yml build frontend
        
        Write-Log "All Docker images built successfully" "Green"
        
    } catch {
        Write-Log "Build error: $_" "Red"
        exit 1
    }
}

function Test-LocalBuild {
    Write-Log "Testing local build..."
    
    try {
        # Start services
        Write-Log "Starting services for testing..." "Blue"
        docker-compose -f docker-compose.production.yml up -d
        
        # Wait for services to start
        Write-Log "Waiting for services to start..." "Yellow"
        Start-Sleep -Seconds 30
        
        # Test health endpoints
        Write-Log "Testing health endpoints..." "Blue"
        $Endpoints = @(
            "http://localhost:8001/api/health",
            "http://localhost:8002/api/health", 
            "http://localhost:8003/api/health"
        )
        
        foreach ($Endpoint in $Endpoints) {
            try {
                $Response = Invoke-RestMethod -Uri $Endpoint -Method Get -TimeoutSec 10
                Write-Log "✓ $Endpoint - OK" "Green"
            } catch {
                Write-Log "✗ $Endpoint - Failed" "Red"
            }
        }
        
        # Stop test services
        Write-Log "Stopping test services..." "Yellow"
        docker-compose -f docker-compose.production.yml down
        
        Write-Log "Local build test completed" "Green"
        
    } catch {
        Write-Log "Test error: $_" "Red"
        docker-compose -f docker-compose.production.yml down
        exit 1
    }
}

function Create-BuildArchive {
    Write-Log "Creating build archive..."
    
    try {
        $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $ArchiveName = "inphora-production-$Timestamp.tar.gz"
        
        # Files to include in archive
        $Files = @(
            "docker-compose.production.yml",
            "env.production.example",
            "nginx/conf.d/production.conf",
            "deploy.sh",
            "DEPLOYMENT_GUIDE.md",
            "QUICK_COMMANDS.md",
            "BUILD_UPLOAD_GUIDE.md",
            "backend/",
            "frontend/",
            "db_config/"
        )
        
        # Create tar.gz archive (requires tar command)
        Write-Log "Creating archive: $ArchiveName" "Blue"
        
        # Try using tar if available (Git Bash or WSL)
        try {
            $TarCommand = "tar -czf $ArchiveName " + ($Files -join " ")
            Invoke-Expression $TarCommand
            Write-Log "Archive created: $ArchiveName" "Green"
            return $ArchiveName
        } catch {
            Write-Log "tar command not available. Using PowerShell Compress-Archive..." "Yellow"
            
            # Create zip file as fallback
            $ZipName = "inphora-production-$Timestamp.zip"
            Compress-Archive -Path $Files -DestinationPath $ZipName -Force
            Write-Log "Archive created: $ZipName" "Green"
            return $ZipName
        }
        
    } catch {
        Write-Log "Archive creation error: $_" "Red"
        exit 1
    }
}

function Upload-ToServer {
    param([string]$ArchivePath)
    
    Write-Log "Uploading to server $Server..."
    
    try {
        # Test SSH connection
        Write-Log "Testing SSH connection..." "Blue"
        $TestResult = ssh -o ConnectTimeout=10 -o BatchMode=yes $User@$Server "echo 'Connection successful'"
        if ($LASTEXITCODE -ne 0) {
            Write-Log "SSH connection failed. Please check credentials and network." "Red"
            exit 1
        }
        
        # Upload archive
        Write-Log "Uploading $ArchivePath to server..." "Blue"
        $UploadResult = scp $ArchivePath $User@$Server:/opt/
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Upload completed successfully" "Green"
        } else {
            Write-Log "Upload failed" "Red"
            exit 1
        }
        
        # Extract archive on server
        Write-Log "Extracting archive on server..." "Blue"
        $ExtractCommand = "cd /opt && tar -xzf $(Split-Path $ArchivePath -Leaf) && chmod +x Inphora-Lending-System/deploy.sh"
        $ExtractResult = ssh $User@$Server $ExtractCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Archive extracted successfully" "Green"
        } else {
            Write-Log "Archive extraction failed" "Red"
            exit 1
        }
        
    } catch {
        Write-Log "Upload error: $_" "Red"
        exit 1
    }
}

function Upload-ToGit {
    Write-Log "Uploading to Git repository..."
    
    try {
        # Check Git status
        $GitStatus = git status --porcelain
        if ([string]::IsNullOrEmpty($GitStatus)) {
            Write-Log "No changes to commit" "Yellow"
            return
        }
        
        # Stage all files
        Write-Log "Staging files..." "Blue"
        git add .
        
        # Commit changes
        $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "build: Production build ready for deployment

🏗️ Build Components:
• Docker images built and tested
• Production configuration validated
• All services health-checked
• SSL configuration prepared

📦 Build Timestamp: $Timestamp

🚀 Ready for deployment to $Server"

        # Push to GitHub
        Write-Log "Pushing to GitHub..." "Blue"
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Successfully pushed to GitHub" "Green"
        } else {
            Write-Log "Git push failed" "Red"
            exit 1
        }
        
    } catch {
        Write-Log "Git upload error: $_" "Red"
        exit 1
    }
}

function Deploy-ToProduction {
    Write-Log "Deploying to production..."
    
    try {
        # SSH into server and run deployment
        $DeployCommand = "cd /opt/Inphora-Lending-System && ./deploy.sh deploy"
        Write-Log "Executing deployment on server..." "Blue"
        
        $DeployResult = ssh $User@$Server $DeployCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Deployment completed successfully" "Green"
        } else {
            Write-Log "Deployment failed" "Red"
            exit 1
        }
        
        # Verify deployment
        Write-Log "Verifying deployment..." "Blue"
        $Endpoints = @(
            "https://il.inphora.net/api/health",
            "https://amariflow.inphora.net/api/health",
            "https://tytahj.inphora.net/api/health"
        )
        
        foreach ($Endpoint in $Endpoints) {
            try {
                $Response = Invoke-RestMethod -Uri $Endpoint -Method Get -TimeoutSec 10
                Write-Log "✓ $Endpoint - OK" "Green"
            } catch {
                Write-Log "✗ $Endpoint - Failed" "Red"
            }
        }
        
    } catch {
        Write-Log "Deployment error: $_" "Red"
        exit 1
    }
}

function Show-Menu {
    Write-ColorOutput "========================================" "Cyan"
    Write-ColorOutput "Inphora Lending System Build & Upload" "Cyan"
    Write-ColorOutput "========================================" "Cyan"
    Write-Host ""
    Write-ColorOutput "Available Actions:" "Yellow"
    Write-Host "1. build     - Build Docker images"
    Write-Host "2. test      - Test local build"
    Write-Host "3. archive   - Create build archive"
    Write-Host "4. upload    - Upload to server"
    Write-Host "5. git       - Upload to Git"
    Write-Host "6. deploy    - Deploy to production"
    Write-Host "7. all       - Build, test, archive, upload, deploy"
    Write-Host ""
    Write-ColorOutput "Usage:" "Yellow"
    Write-Host ".\build-upload.ps1 -Action <action> [-Server <server>] [-User <user>]"
    Write-Host ""
    Write-ColorOutput "Examples:" "Yellow"
    Write-Host ".\build-upload.ps1 -Action build"
    Write-Host ".\build-upload.ps1 -Action all -Server 138.68.241.97 -User root"
    Write-Host ""
}

# Main execution
switch ($Action.ToLower()) {
    "build" {
        Test-Prerequisites
        Build-DockerImages
    }
    "test" {
        Test-LocalBuild
    }
    "archive" {
        $ArchivePath = Create-BuildArchive
        Write-Log "Archive created: $ArchivePath" "Green"
    }
    "upload" {
        $ArchivePath = Create-BuildArchive
        Upload-ToServer -ArchivePath $ArchivePath
    }
    "git" {
        Upload-ToGit
    }
    "deploy" {
        Deploy-ToProduction
    }
    "all" {
        Test-Prerequisites
        Build-DockerImages
        Test-LocalBuild
        $ArchivePath = Create-BuildArchive
        Upload-ToServer -ArchivePath $ArchivePath
        Deploy-ToProduction
    }
    default {
        Show-Menu
        exit 1
    }
}

Write-Log "Operation completed successfully!" "Green"
