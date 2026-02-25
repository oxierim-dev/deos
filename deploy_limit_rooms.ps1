$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Host "Adding Files..."
& $gitPath add .
Write-Host "Committing..."
& $gitPath commit -m "Limit to 2 static rooms (Room 1 and Room 2) and add overflow logic"
Write-Host "Pushing..."
& $gitPath push origin main
Write-Host "Done!"
