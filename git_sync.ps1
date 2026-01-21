$ErrorActionPreference = "Continue"

function Run-Git-Flow {
    param($path, $msg)
    Write-Host "`n=== Processing $path ==="
    Set-Location $path
    
    # 1. Check for uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Host "Detected uncommitted changes."
        
        # Try switch to dev, create if not exists
        git checkout dev 2>$null
        if ($LASTEXITCODE -ne 0) { 
            Write-Host "Creating dev branch..."
            git checkout -b dev 
        }
        
        # Add and Commit
        git add .
        git commit -m $msg
        
        # Push dev
        Write-Host "Pushing dev..."
        git push origin dev
    }
    else {
        Write-Host "No uncommitted changes."
        # Ensure we are on dev to sync
        git checkout dev 2>$null
        if ($LASTEXITCODE -ne 0) { git checkout -b dev }
    }

    # 2. Merge to main
    Write-Host "Merging dev into main..."
    git checkout main
    git merge dev
    
    # 3. Push main
    Write-Host "Pushing main..."
    git push origin main
    
    Write-Host "Done with $path."
}

# Frontend
Run-Git-Flow "c:\Users\danmu\Desktop\Uniforge\UniForgeFrontend" "feat: Implement SimpleGame with custom S3 assets"

# Backend
Run-Git-Flow "c:\Users\danmu\Desktop\Uniforge\UniforgeBackend" "feat: Enhance AI generation with presets and translation"
