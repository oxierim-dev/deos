$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Fix race start bug: Auto-start race after countdown"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
