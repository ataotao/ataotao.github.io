param(
    [switch]$Quiet,
    [string]$StageDir
)
# 把 qb.py 暂存区（默认 %TEMP%\qb_stage\manifest.json）里的文件同步回仓库目录，并先做 .bak 备份。
# 用途：某些受限环境（如 DSH 沙箱里由脚本启动的 python 子进程）无权直接写仓库目录，
#       qb.py 会自动改成"暂存"，再运行本脚本一次性落盘。
$ErrorActionPreference = 'Stop'
if (-not $StageDir) { $StageDir = Join-Path $env:TEMP 'qb_stage' }
$manifest = Join-Path $StageDir 'manifest.json'
if (!(Test-Path -LiteralPath $manifest)) {
    if (-not $Quiet) { Write-Host "没有待同步文件（$manifest 不存在）" }
    exit 0
}
$items = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$nb = 0
foreach ($b in @($items.backups)) {
    if ($b -and (Test-Path -LiteralPath $b)) {
        Copy-Item -LiteralPath $b -Destination ($b + ".bak-$ts") -Force
        $nb++
    }
}
$nf = 0
foreach ($f in @($items.files)) {
    # 目标目录可能还不存在（第一次 build 时 题库/packs/ 是新目录）
    $dir = Split-Path -Parent $f.target
    if ($dir -and !(Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item -LiteralPath $f.staged -Destination $f.target -Force
    $nf++
}
Remove-Item -LiteralPath $manifest -Force
Remove-Item -LiteralPath $StageDir -Recurse -Force -ErrorAction SilentlyContinue
if (-not $Quiet) { Write-Host "✓ 同步完成：备份 $nb 个，写入 $nf 个文件" }
