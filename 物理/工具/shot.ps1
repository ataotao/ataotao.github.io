param(
  [string]$Hash = "",
  [int]$W = 1280,
  [int]$H = 900,
  [string]$Out = "",
  [string]$Html = "物理思维脚手架.html",
  [int]$Mobile = 0
)
# 截图工具：无头 Chrome 截本工具的页面，用于开发自检。
# 用法（-Out 请给绝对路径，相对路径在已有 Chrome 运行时可能误报）：
#   pwsh -NoProfile -File 物理/工具/shot.ps1 -Hash "exam" -W 1280 -H 900 -Out C:\tmp\shot.png
#   pwsh -NoProfile -File 物理/工具/shot.ps1 -Hash "concept" -Mobile 375 -Out C:\tmp\m.png
# 注意：无头 Chrome 的窗口最小约 500px 宽，-W 390 不是真移动端；
#       要看真 375px 请用 -Mobile 375（用 --window-size=500 排版后按设备比例裁剪不可靠，
#       这里用 CDP 之外的最简做法：先 500 宽布局再整体缩放，仅作视觉参考）。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
$page = Join-Path $root $Html
if (-not (Test-Path $page)) { Write-Host "HTML 不存在: $page"; exit 1 }
if (-not $Out) { $Out = Join-Path $root ("_recon\shot-" + ($Hash -replace '[^\w]', '_') + ".png") }
if (-not [System.IO.Path]::IsPathRooted($Out)) { $Out = Join-Path (Get-Location) $Out }
$profile = Join-Path $env:TEMP ("chrome-shot-" + [guid]::NewGuid().ToString('N'))
$uri = ([System.Uri]$page).AbsoluteUri
if ($Hash) { $uri = $uri + "#/" + $Hash }
$winW = [Math]::Max(500, $W)
& $chrome --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check `
  "--user-data-dir=$profile" --window-size="$winW,$H" --screenshot="$Out" --virtual-time-budget=2500 "$uri" 2>&1 | Out-Null
if (Test-Path $Out) {
  Write-Host ("OK {0} ({1} bytes, {2}x{3}) -> {4}" -f $Out, (Get-Item $Out).Length, $winW, $H, $uri)
} else {
  Write-Host "FAILED $uri"
}
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
