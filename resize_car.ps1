Add-Type -AssemblyName System.Drawing
$source = Resolve-Path ".\client\Car1.png"
$target = ".\client\car_optimized.png"
if(Test-Path $source) {
    try {
        $img = [System.Drawing.Image]::FromFile($source)
        # Resizing to 150x80
        $newHeight = 80
        $ratio = $img.Width / $img.Height
        $newWidth = [math]::Round($newHeight * $ratio)
        if ($newWidth -gt 150) {
            $newWidth = 150
            $newHeight = [math]::Round($newWidth / $ratio)
        }
        $newImg = new-object System.Drawing.Bitmap($newWidth, $newHeight)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $newWidth, $newHeight)
        $newImg.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $newImg.Dispose()
        $img.Dispose()
        Write-Host "Image successfully resized to ${newWidth}x${newHeight} and saved to $target"
    } catch {
        Write-Host "Error resizing image: $_"
    }
} else {
    Write-Host "Source file not found at $source"
}
