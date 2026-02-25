$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Show Room ID in Lobby and add cache busting"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
