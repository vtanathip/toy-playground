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

# Download ffmpeg into this project directory
$ffmpegPath = Join-Path $PSScriptRoot "ffmpeg.exe"
$ffprobePath = Join-Path $PSScriptRoot "ffprobe.exe"

if ((Test-Path $ffmpegPath) -and (Test-Path $ffprobePath)) {
    Write-Host "`nffmpeg.exe and ffprobe.exe already exist. Skipping download."
} else {
    Write-Host "`nDownloading ffmpeg..."
    $ffmpegZip = Join-Path $PSScriptRoot "ffmpeg.zip"
    $ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $ffmpegZip

    Write-Host "Extracting ffmpeg..."
    $extractDir = Join-Path $PSScriptRoot "ffmpeg-extract"
    Expand-Archive -Path $ffmpegZip -DestinationPath $extractDir -Force

    $binDir = Get-ChildItem -Path $extractDir -Recurse -Directory -Filter "bin" | Select-Object -First 1
    Copy-Item (Join-Path $binDir.FullName "ffmpeg.exe") $ffmpegPath
    Copy-Item (Join-Path $binDir.FullName "ffprobe.exe") $ffprobePath

    Remove-Item $ffmpegZip -Force
    Remove-Item $extractDir -Recurse -Force

    Write-Host "Saved ffmpeg.exe and ffprobe.exe to $PSScriptRoot"
    Write-Host "ffmpeg version: $(& $ffmpegPath -version | Select-Object -First 1)"
}
