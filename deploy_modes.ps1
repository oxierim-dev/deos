$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Add 2-player and 4-player game modes"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
