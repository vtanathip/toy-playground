# Download latest yt-dlp executable into this project directory
$outputPath = Join-Path $PSScriptRoot "yt-dlp.exe"

if (Test-Path $outputPath) {
    Write-Host "yt-dlp.exe already exists. Updating..."
}

$release = Invoke-RestMethod "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest"
$asset = $release.assets | Where-Object { $_.name -eq "yt-dlp.exe" }

if (-not $asset) {
    Write-Error "Could not find yt-dlp.exe in the latest release."
    exit 1
}

Write-Host "Downloading yt-dlp $($release.tag_name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $outputPath

Write-Host "Saved to $outputPath"
Write-Host "Version: $(& $outputPath --version)"
