$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Improve car model (Pixel Art), add parallax background, and show names in race"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
