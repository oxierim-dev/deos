$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Initializing Git..."
& $gitPath init
Write-Host "Configuring User..."
& $gitPath config user.name "oxierim-dev"
& $gitPath config user.email "oxierim-dev@users.noreply.github.com"
Write-Host "Setting Remote..."
try {
    & $gitPath remote remove origin 2>$null
} catch {}
& $gitPath remote add origin https://github.com/oxierim-dev/deos.git
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Initial commit for Render deployment"
Write-Host "Renaming Branch..."
& $gitPath branch -M main
Write-Host "Done!"
