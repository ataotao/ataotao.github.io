<#
  每周加一卷：一条命令把新 docx 变成「当周就能做」的题包。
  用法（在仓库根目录运行，pwsh 7）：
    pwsh -File 物理\工具\weekly.ps1 -Docx "C:\path\第10周.docx"
    pwsh -File 物理\工具\weekly.ps1 -Docx "C:\path\第10周.docx" -PackId pk-w10 -Name "第10周"
    pwsh -File 物理\工具\weekly.ps1 -Docx "..." -SkipExtract      # 图已经裁过，只重生成草稿+构建
    pwsh -File 物理\工具\weekly.ps1 -Docx "..." -Force            # 覆盖已有题包
  做四件事：① docx 复制进 题库/ ② 裁图+raw（extract.ps1）③ 生成草稿题包 ④ 构建页面
  产出：物理/图片/pk-wN/、物理/_recon/raw/pk-wN.json、物理/题库/pack-wN.json（draft）、物理/物理思维脚手架.html
#>
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [string]$PackId = '',
  [string]$Name = '',
  [switch]$Force,
  [switch]$SkipExtract
)
$ErrorActionPreference = 'Stop'

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)   # 物理/
$REPO = Split-Path -Parent $ROOT
$TOOLS = Join-Path $ROOT '工具'
$QDIR = Join-Path $ROOT '题库'
# 工具探测：不写死任何机器路径（换电脑 / 多人协作用）
function Find-Exe([string]$Name, [string[]]$Candidates) {
  $envVal = [Environment]::GetEnvironmentVariable($Name.ToUpper())
  if ($envVal -and (Test-Path $envVal)) { return $envVal }
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in $Candidates) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}
$NODE = Find-Exe 'node' @(
  "$env:ProgramFiles\nodejs\node.exe",
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
  "$env:USERPROFILE\.local\nodejs2\node.exe"
)
if (-not $NODE) { throw '找不到 node。请安装 Node.js（https://nodejs.org）或把 node 加进 PATH，然后用 -NodeExe 指定路径。' }
$PYTHON = Find-Exe 'python' @(
  "$env:USERPROFILE\AppData\Local\Programs\Python\Python313\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
  "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
)

# ---------- 1. 定 packId ----------
if (-not (Test-Path $Docx)) { throw "docx 不存在：$Docx" }
$base = [System.IO.Path]::GetFileNameWithoutExtension($Docx)
if (-not $PackId) {
  if ($base -match '第\s*(\d+)\s*周[_-]?(\d+)') { $PackId = 'pk-w' + $Matches[1] + ([char](96 + [int]$Matches[2])) }
  elseif ($base -match '第\s*(\d+)\s*周') { $PackId = 'pk-w' + $Matches[1] }
  else { $PackId = 'pk-' + ($base -replace '[^\w]', '') }
}
$short = $PackId -replace '^pk-', ''
$packFile = Join-Path $QDIR ("pack-" + $short + ".json")
if ((Test-Path $packFile) -and -not $Force) {
  Write-Host "题包已存在：题库/pack-$short.json" -ForegroundColor Yellow
  Write-Host "  · 要覆盖重做：加 -Force"
  Write-Host "  · 只想重裁图：加 -SkipExtract 会跳过 Word，但草稿会被覆盖（需配合 -Force）"
  Write-Host "  · 只是重建页面：直接 & '$NODE' 物理\工具\build.mjs"
  exit 1
}
Write-Host "=== 新卷进场：$base -> $PackId ===" -ForegroundColor Cyan

# ---------- 2. docx 进题库 ----------
$dstDocx = Join-Path $QDIR ([System.IO.Path]::GetFileName($Docx))
if (-not (Test-Path $dstDocx)) { Copy-Item $Docx $dstDocx; Write-Host "  ① docx 已复制到 题库/$([System.IO.Path]::GetFileName($Docx))" }
else { Write-Host "  ① docx 已在 题库/，跳过复制" }

# ---------- 3. 裁图 + raw（Word COM + WPF，必须 powershell.exe 5.1 -STA） ----------
if (-not $SkipExtract) {
  Write-Host "  ② 裁图 + raw（约 40~60 秒/套，Word 会短暂启动）…" -ForegroundColor Yellow
  $extract = Join-Path $TOOLS 'extract.ps1'
  & powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File $extract -Docx $dstDocx -PackId $PackId
  if ($LASTEXITCODE -ne 0) { throw "extract.ps1 失败（exit $LASTEXITCODE），看上面输出" }
} else {
  Write-Host "  ② 跳过裁图（-SkipExtract）"
}
$rawFile = Join-Path $ROOT ("_recon\raw\" + $PackId + ".json")
if (-not (Test-Path $rawFile)) { throw "没找到 raw：$rawFile" }

# ---------- 4. 草稿题包 ----------
Write-Host "  ③ 生成草稿题包…" -ForegroundColor Yellow
& $NODE (Join-Path $TOOLS 'make_draft.mjs') $PackId --force
if ($LASTEXITCODE -ne 0) { throw "make_draft.mjs 失败" }
if ($Name) {
  $pack = Get-Content $packFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $pack.name = $Name
  $pack | ConvertTo-Json -Depth 20 | Set-Content $packFile -Encoding utf8
  Write-Host "  ③ 题包名改为：$Name"
}

# ---------- 5. 构建 ----------
Write-Host "  ④ 构建页面…" -ForegroundColor Yellow
& $NODE (Join-Path $TOOLS 'build.mjs')
if ($LASTEXITCODE -ne 0) { throw "build 校验失败：按上面提示改 题库/pack-$short.json 后重跑 build" }

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
Write-Host "现在打开/刷新 物理思维脚手架.html，「试卷练习」里就能看到这一周（带「草稿」标记）。"
Write-Host "草稿状态下：选择题已能自动判分；填空/解答只能对答案（点开原卷答案图）。"
Write-Host ""
Write-Host "想升级成精修版（解答题可判分 + 解析）："
Write-Host "  1) 打开 题库/pack-$short.json，给 selfcheck 题加 fields（见 源/内容作者必读.md 第 3 节）并补 solution"
Write-Host "  2) 删掉题包和题目上的 draft 字段"
Write-Host "  3) node 物理/工具/build.mjs"
Write-Host "  4) 一键闸门：pwsh -File 物理/工具/check.ps1   （自动找 node/python，跑 build+答案体检+完整性+核验清单）"
