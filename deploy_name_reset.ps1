$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Add player name input and room reset logic"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
