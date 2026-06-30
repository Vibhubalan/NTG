# PowerShell Git Push Helper Script
# Run this script to create a branch, commit changes, and push to remote upstream.

$ErrorActionPreference = "Stop"

try {
    # Check if we are in a Git repository
    if (-not (Test-Path .git)) {
        Write-Error "Not in a Git repository root. Please run this script from the project root."
    }

    # Show current git status
    Write-Host "`n--- Current Git Status ---" -ForegroundColor Cyan
    git status
    Write-Host "--------------------------`n" -ForegroundColor Cyan

    # Ask for branch name
    $defaultBranch = "feature/update-config"
    $branchName = Read-Host "Enter new branch name (default: '$defaultBranch')"
    if ([string]::IsNullOrWhiteSpace($branchName)) {
        $branchName = $defaultBranch
    }

    # Ask for commit message
    $defaultCommitMsg = "chore: save local updates"
    $commitMsg = Read-Host "Enter commit message (default: '$defaultCommitMsg')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = $defaultCommitMsg
    }

    # Create and checkout branch
    Write-Host "`nCreating and checking out branch '$branchName'..." -ForegroundColor Green
    git checkout -b $branchName

    # Stage all changes
    Write-Host "Staging changes..." -ForegroundColor Green
    git add -A

    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Green
    git commit -m $commitMsg

    # Push to origin
    Write-Host "Pushing branch '$branchName' to origin..." -ForegroundColor Green
    git push -u origin $branchName

    Write-Host "`nSuccessfully created branch, committed changes, and pushed to origin!" -ForegroundColor Green
}
catch {
    Write-Host "`nAn error occurred: $_" -ForegroundColor Red
}
