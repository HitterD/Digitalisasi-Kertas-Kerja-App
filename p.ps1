# Script untuk menyimpan screenshot dari clipboard ke file PNG dengan timestamp
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$img = [System.Windows.Forms.Clipboard]::GetImage()

if ($img -eq $null) {
    Write-Host "Gagal: Tidak ada gambar di clipboard!" -ForegroundColor Red
} else {
    $dir = ".screenshots"
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "ss_$timestamp.png"
    $filepath = Join-Path $dir $filename
    $abspath = Resolve-Path $dir

    $img.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()

    Write-Host "Berhasil! Screenshot disimpan ke: " -NoNewline
    Write-Host "$filepath" -ForegroundColor Green
    Write-Host "Lokasi folder: $abspath"
}
