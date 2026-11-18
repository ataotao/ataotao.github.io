param(
  [string]$Hash = "",
  [int]$W = 1280,
  [int]$H = 900,
  [string]$Out = "",
  [string]$Html = "物理思维脚手架.html"
)
# 截图工具：无头浏览器截本工具的页面，用于开发自检（换电脑不用改路径）。
# 用法（-Out 建议给绝对路径）：
#   pwsh -File 物理/工具/shot.ps1 -Hash "exam" -W 1280 -H 900 -Out C:\tmp\shot.png
#   pwsh -File 物理/工具/shot.ps1 -Html _dev.html -Hash "concept" -Out C:\tmp\c.png
# 注意：无头 Chrome 窗口最小约 500px 宽，-W 390 不是真移动端（会按 500 排版再裁）。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)   # 物理/
$page = Join-Path $root $Html
if (-not (Test-Path $page)) { Write-Host "HTML 不存在: $page"; exit 1 }

# 浏览器探测：环境变量 CHROME_PATH > PATH 里的 chrome/msedge > 常见安装位置
$browser = $null
$cands = @(
  $env:CHROME_PATH,
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
foreach ($c in $cands) { if ($c -and (Test-Path $c)) { $browser = $c; break } }
if (-not $browser) {
  foreach ($n in @('chrome', 'msedge')) {
    $cmd = Get-Command $n -ErrorAction SilentlyContinue
    if ($cmd) { $browser = $cmd.Source; break }
  }
}
if (-not $browser) {
  Write-Host '找不到 Chrome/Edge。请安装其一，或设置环境变量 CHROME_PATH 指向浏览器 exe。'
  exit 1
}

if (-not $Out) { $Out = Join-Path $root ("_recon\shot-" + ($Hash -replace '[^\w]', '_') + ".png") }
if (-not [System.IO.Path]::IsPathRooted($Out)) { $Out = Join-Path (Get-Location) $Out }
$profile = Join-Path $env:TEMP ("chrome-shot-" + [guid]::NewGuid().ToString('N'))
$uri = ([System.Uri]$page).AbsoluteUri
if ($Hash) { $uri = $uri + "#/" + $Hash }
$winW = [Math]::Max(500, $W)
& $browser --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check `
  "--user-data-dir=$profile" --window-size="$winW,$H" --screenshot="$Out" --virtual-time-budget=2500 "$uri" 2>&1 | Out-Null
if (Test-Path $Out) {
  Write-Host ("OK {0} ({1} bytes, {2}x{3}) -> {4}" -f $Out, (Get-Item $Out).Length, $winW, $H, $uri)
} else {
  Write-Host "FAILED $uri"
}
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
