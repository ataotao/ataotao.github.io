param(
  [string]$Dir = "",
  [int]$Threshold = 246,
  [int]$Pad = 10,
  [switch]$DryRun
)
# 裁图后处理：去掉四周多余的白边（上/下空白特别多时最有用）。
# 只裁"整行/整列都是接近纯白"的部分，不会切到内容；裁完仍保留 Pad 像素白边。
# 用法：pwsh -File 物理/工具/trim.ps1 [-DryRun] [-Dir <图片目录>]
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not $Dir) {
  # 默认 <仓库>/物理/图片，从脚本位置推导，换电脑不用改
  $Dir = Join-Path (Split-Path -Parent $PSScriptRoot) '图片'
}
if (-not (Test-Path $Dir)) { Write-Host "图片目录不存在：$Dir"; exit 1 }

function Get-ContentBox($bmp, $thr) {
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)

  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    $rowHas = $false
    for ($x = 0; $x -lt $w; $x++) {
      $i = $row + $x * 4
      $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
      if ($r -lt $thr -or $g -lt $thr -or $b -lt $thr) { $rowHas = $true; break }
    }
    if ($rowHas) {
      if ($y -lt $minY) { $minY = $y }
      $maxY = $y
    }
  }
  if ($maxY -lt 0) { return $null }
  for ($x = 0; $x -lt $w; $x++) {
    for ($y = $minY; $y -le $maxY; $y++) {
      $i = $y * $stride + $x * 4
      $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
      if ($r -lt $thr -or $g -lt $thr -or $b -lt $thr) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        break
      }
    }
  }
  return @{ x = $minX; y = $minY; r = $maxX; b = $maxY; w = $w; h = $h }
}

$files = Get-ChildItem -Path $Dir -Recurse -Filter *.png
$total = 0; $saved = 0; $skipped = 0
foreach ($f in $files) {
  $img = [System.Drawing.Bitmap]::new($f.FullName)
  $box = Get-ContentBox $img $Threshold
  if ($null -eq $box) { $img.Dispose(); $skipped++; continue }
  $x1 = [Math]::Max(0, $box.x - $Pad)
  $y1 = [Math]::Max(0, $box.y - $Pad)
  $x2 = [Math]::Min($box.w - 1, $box.r + $Pad)
  $y2 = [Math]::Min($box.h - 1, $box.b + $Pad)
  $nw = $x2 - $x1 + 1; $nh = $y2 - $y1 + 1
  $oldArea = $box.w * $box.h
  $newArea = $nw * $nh
  if ($nw -lt 200 -or $nh -lt 40 -or $newArea -gt $oldArea * 0.97) { $skipped++; $img.Dispose(); continue }
  $total++
  if (-not $DryRun) {
    $crop = $img.Clone((New-Object System.Drawing.Rectangle($x1, $y1, $nw, $nh)), $img.PixelFormat)
    $img.Dispose()
    $crop.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    $saved += ((Get-Item $f.FullName).Length)
  } else { $img.Dispose() }
  if ($total -le 5) { Write-Host ("  {0}: {1}x{2} -> {3}x{4}" -f $f.Name, $box.w, $box.h, $nw, $nh) }
}
Write-Host ("裁剪 {0} 张（跳过 {1} 张）；DryRun={2}" -f $total, $skipped, $DryRun)
