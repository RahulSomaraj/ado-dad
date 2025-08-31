# === sync.ps1 ===
$source = "C:\personal\personal\ado-dad-repo\ado-dad\reports\e2e-test-report.html"
$dest   = "D:\personal\personal\ado-dad-repo\ado-dad-chat\second.html"

Write-Host "Watching $source ... syncing to $dest"

$fsw = New-Object IO.FileSystemWatcher (Split-Path $source), (Split-Path $source -Leaf)
$fsw.NotifyFilter = [IO.NotifyFilters]'LastWrite'
$fsw.EnableRaisingEvents = $true

Register-ObjectEvent $fsw Changed -Action {
    try {
        Copy-Item $source -Destination $dest -Force
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Synced $source -> $dest"
    } catch {
        Write-Host "Error syncing: $_"
    }
}

# keep the script alive
while ($true) { Start-Sleep 5 }
