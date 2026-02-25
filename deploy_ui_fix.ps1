$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Restore original UI and integrate name input style"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
