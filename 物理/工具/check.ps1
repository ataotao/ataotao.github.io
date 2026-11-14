<#
  一键闸门：改完数据/加完新卷后跑这一条，任何一项不过都会返回非 0。
  用法（仓库根目录，pwsh 7 或 Windows PowerShell 5.1 都可）：
    pwsh -File 物理\工具\check.ps1
    pwsh -File 物理\工具\check.ps1 -NoPython    # 没装 python 时只看构建与结构
  自动探测 node / python，不写死任何机器路径（换电脑、多人协作用）。
  检查项：
    ① build.mjs       结构与数据校验 + 生成页面（必须过）
    ② check_answers.py 选择题答案 vs 原卷文末答案表（docx / PDF，必须「全部一致」）
    ③ audit_packs.py  每题是否有原题图/答案（必须无 problem）
    ④ 核验报告.mjs     重新生成 物理/核验清单.md
#>
param(
  [switch]$NoPython,
  [string]$NodeExe = '',
  [string]$PythonExe = ''
)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)   # 物理/
$TOOLS = Join-Path $ROOT '工具'

function Find-Exe([string]$Name, [string]$Override, [string[]]$Candidates) {
  if ($Override -and (Test-Path $Override)) { return $Override }
  $envVal = [Environment]::GetEnvironmentVariable($Name.ToUpper())
  if ($envVal -and (Test-Path $envVal)) { return $envVal }
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in $Candidates) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}
$NODE = Find-Exe 'node' $NodeExe @(
  "$env:ProgramFiles\nodejs\node.exe",
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
  "$env:USERPROFILE\.local\nodejs2\node.exe"
)
$PY = Find-Exe 'python' $PythonExe @(
  "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
  "$env:ProgramFiles\Python313\python.exe",
  "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
)
$PY_CANDIDATES = @(
  "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
  "$env:ProgramFiles\Python313\python.exe",
  "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
)
# Windows 自带的 WindowsApps\python.exe 常是「应用商店占位符」：一跑就失败，会被误判成数据有问题。
# 先换一个非 WindowsApps 的 python；换不到就实测一次，跑不起来就当没装（跳过 python 检查）。
if ($PY -and $PY -like '*WindowsApps*') {
  $alt = @(Get-Command python.exe -All -ErrorAction SilentlyContinue |
    ForEach-Object { $_.Source } | Where-Object { $_ -and $_ -notlike '*WindowsApps*' })
  if ($alt.Count) { $PY = $alt[0] }
}
if ($PY) {
  & $PY -c "import sys" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { $PY = $null }
}
# PDF 原卷的答案体检需要 pymupdf：当前 python 缺它时，优先换一个 docx + pymupdf 都齐的。
# 显式传了 -PythonExe 就尊重用户选择，不自动换。
if ($PY -and -not $PythonExe) {
  & $PY -c "import docx, pymupdf" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    foreach ($c in $PY_CANDIDATES) {
      if ($c -and (Test-Path $c)) {
        & $c -c "import docx, pymupdf" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $PY = $c; break }
      }
    }
  }
}

$fail = 0
Write-Host "=== 物理脚手架 · 一键闸门 ===" -ForegroundColor Cyan
Write-Host ("  node  : " + $(if ($NODE) { $NODE } else { '（没找到！）' }))
Write-Host ("  python: " + $(if ($PY) { $PY } else { '（没找到，python 检查会跳过）' }))
Write-Host ""

if (-not $NODE) {
  Write-Host "✗ 找不到 node：请安装 Node.js（https://nodejs.org），或用 -NodeExe 指定。" -ForegroundColor Red
  exit 1
}

# ① 构建 + 结构校验
Write-Host "[1/4] 构建与数据校验（build.mjs）…" -ForegroundColor Yellow
& $NODE (Join-Path $TOOLS 'build.mjs')
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ build 失败（看上面报错）" -ForegroundColor Red; $fail++ }
else { Write-Host "  ✓ 通过" -ForegroundColor Green }

# ② 选择题答案体检
$pyOk = $PY -and -not $NoPython
if ($pyOk) {
  Write-Host "[2/4] 选择题答案 vs 原卷答案表（check_answers.py）…" -ForegroundColor Yellow
  & $PY (Join-Path $TOOLS 'check_answers.py')
  if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ 有答案不一致（见上表 MISMATCH）" -ForegroundColor Red; $fail++ }
  else { Write-Host "  ✓ 全部一致" -ForegroundColor Green }
  Write-Host "[3/4] 每题原题图/答案完整性（audit_packs.py）…" -ForegroundColor Yellow
  & $PY (Join-Path $TOOLS 'audit_packs.py')
  if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ 有题目缺图或缺答案" -ForegroundColor Red; $fail++ }
  else { Write-Host "  ✓ 通过" -ForegroundColor Green }
} else {
  Write-Host "[2/4][3/4] 跳过 python 检查（没装 python 或加了 -NoPython）。" -ForegroundColor DarkYellow
  Write-Host "  要跑答案体检：安装 Python 3 + python-docx（python -m pip install python-docx）" -ForegroundColor DarkYellow
}

# ④ 核验清单
Write-Host "[4/4] 重新生成 核验清单.md（核验报告.mjs）…" -ForegroundColor Yellow
& $NODE (Join-Path $TOOLS '核验报告.mjs')
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ 生成失败" -ForegroundColor Red; $fail++ }
else { Write-Host "  ✓ 已更新 物理/核验清单.md" -ForegroundColor Green }

Write-Host ""
if ($fail -eq 0) {
  Write-Host "=== 全部通过 ✓ ===" -ForegroundColor Green
  exit 0
} else {
  Write-Host "=== 有 $fail 项没通过 ✗（先修再交付）===" -ForegroundColor Red
  exit 1
}
