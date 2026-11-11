#Requires -Version 5.1
<#
.SYNOPSIS
    把三个源项目的产物发布到本站（ataotao.github.io）。

.DESCRIPTION
    本站的内容来自三个文件夹，没有一个是"站点仓库自己慢慢长出来的"：

      learn-english\word_table\vocab-app  →  Vite 构建出 dist\
                                            dist\index.html + favicon.png + assets\  ⇢  站点根目录
      做题思维训练                          →  各训练器 HTML + 图片            ⇢  站点 1\
      ataotao.github.io（本仓库）           →  索引页、验证文件             ⇢  原地保留，脚本不碰

    这个脚本负责前两条链路：读源、按内容哈希比对、只复制变了的文件。
    第三个文件夹本来就是本站，不需要同步。

    索引页 1\index.html 是手写的，不在任何清单里，同步永远不会覆盖它。

.PARAMETER Only
    all（默认）发布全部；vocab 只发英语单词记背；training 只发做题思维训练。

.PARAMETER SourceRoot
    三个源文件夹所在的父目录，默认 C:\陶宸欣。源项目搬家时改这里。

.PARAMETER DryRun
    只报告会做什么，不写文件、不提交。

.PARAMETER Prune
    删除目标里源已经没有的文件（仅在清单涉及的子目录内，不碰站点根目录）。

.PARAMETER Commit
    发布完成后在站点仓库 git commit（只提交本次涉及的路径）。

.PARAMETER Push
    提交后 git push。需与 -Commit 一起用。

.EXAMPLE
    .\tools\publish.ps1 -DryRun
    先看三个来源各自会改什么。

.EXAMPLE
    .\tools\publish.ps1 -Only vocab
    只发布英语单词记背（改完 vocab-app 并构建之后）。

.EXAMPLE
    .\tools\publish.ps1 -Prune -Commit -Push
    全量发布：同步、清掉源里已删的文件、提交推送。

.NOTES
    用例：改完任何一侧 → 需要时先构建（vocab-app: npm run build；做题思维训练: 各自构建）→ 跑本脚本。
    文件名 + SHA256 比对，重复运行幂等。
#>
[CmdletBinding()]
param(
    [ValidateSet('all', 'vocab', 'training')]
    [string]$Only = 'all',

    # 源路径：不传时按「配置文件 → 环境变量 → 自动探测」解析。
    # 同一个脚本要在家里/公司两台机器上用，绝对路径不能写死在脚本里。
    [string]$VocabRoot,

    [string]$TrainingRoot,

    # 本机配置（不入库）：默认 tools\publish.local.json
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'publish.local.json'),

    # 把当前解析到的路径写进本机配置，下次直接跑就不用带参数
    [switch]$WriteConfig,

    # 兼容很旧的用法：给 -SourceRoot 时按老结构推导
    [string]$SourceRoot,

    [switch]$DryRun,
    [switch]$Prune,
    [switch]$Commit,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- 路径解析
#
# 优先级：命令行参数 > 配置文件（按 COMPUTERNAME 分机器）> 环境变量 > 自动探测
# 自动探测只在常见位置往下找两层，不会扫全盘。

$repoRoot = Split-Path -Parent $PSScriptRoot
$machine  = $env:COMPUTERNAME
$tried    = [System.Collections.Generic.List[string]]::new()

function Read-LocalConfig {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
        throw "配置文件不是合法 JSON：$Path`n$($_.Exception.Message)"
    }
}

function Test-TrainingRepo {
    param([string]$Dir)
    if (-not $Dir) { return $false }
    if (-not (Test-Path -LiteralPath $Dir -PathType Container)) { return $false }
    return ((Test-Path -LiteralPath (Join-Path $Dir 'AGENTS.md')) -and
            (Test-Path -LiteralPath (Join-Path $Dir '工具')) -and
            (Test-Path -LiteralPath (Join-Path $Dir '物理')))
}

function Test-VocabDist {
    param([string]$Dir)
    if (-not $Dir) { return $false }
    return (Test-Path -LiteralPath (Join-Path $Dir 'index.html') -PathType Leaf)
}

function Get-ProbeBases {
    $bases = @(
        (Split-Path $repoRoot -Parent)
        $repoRoot
        $env:USERPROFILE
        (Join-Path $env:USERPROFILE 'Documents')
        (Join-Path $env:USERPROFILE 'Desktop')
        'C:\learn', 'C:\work', 'C:\code', 'C:\src'
        'D:\learn', 'D:\work', 'D:\code'
        'E:\learn', 'E:\work'
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) } | Select-Object -Unique
    return $bases
}

function Find-TrainingRoot {
    $names = @('learning-training', '做题思维训练', 'learning_training')
    foreach ($base in Get-ProbeBases) {
        foreach ($name in $names) {
            $candidate = Join-Path $base $name
            $tried.Add($candidate)
            if (Test-TrainingRepo $candidate) { return $candidate }
        }
        # 再往下一层（如 C:\work\my-work\learning-training）
        $children = try { Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue } catch { @() }
        foreach ($child in $children) {
            if (Test-TrainingRepo $child.FullName) { return $child.FullName }
            foreach ($name in $names) {
                $candidate = Join-Path $child.FullName $name
                $tried.Add($candidate)
                if (Test-TrainingRepo $candidate) { return $candidate }
            }
        }
    }
    return $null
}

function Find-VocabDist {
    $relatives = @(
        'learn-english\word_table\vocab-app\dist'
        'word_table\vocab-app\dist'
        'learn-english\vocab-app\dist'
        'vocab-app\dist'
    )
    foreach ($base in Get-ProbeBases) {
        foreach ($rel in $relatives) {
            $candidate = Join-Path $base $rel
            $tried.Add($candidate)
            if (Test-VocabDist $candidate) { return $candidate }
        }
        $children = try { Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue } catch { @() }
        foreach ($child in $children) {
            foreach ($rel in @('word_table\vocab-app\dist', 'vocab-app\dist')) {
                $candidate = Join-Path $child.FullName $rel
                $tried.Add($candidate)
                if (Test-VocabDist $candidate) { return $candidate }
            }
        }
    }
    return $null
}

$config = Read-LocalConfig $ConfigPath

function Resolve-One {
    param(
        [string]$Label,
        [string]$CliValue,
        [string]$ConfigKey,
        [string[]]$EnvNames,
        [scriptblock]$Detect
    )
    if ($CliValue) { return [pscustomobject]@{ Path = $CliValue; Source = '命令行参数' } }

    # 旧 -SourceRoot 也是命令行参数，优先级高于配置文件
    if ($SourceRoot) {
        if ($ConfigKey -eq 'training') {
            return [pscustomobject]@{ Path = (Join-Path $SourceRoot '做题思维训练'); Source = '旧 -SourceRoot' }
        }
        return [pscustomobject]@{ Path = (Join-Path $SourceRoot 'learn-english\word_table\vocab-app\dist'); Source = '旧 -SourceRoot' }
    }

    if ($config) {
        $byMachine = $null
        if ($config.machines -and $machine) {
            $prop = $config.machines.PSObject.Properties[$machine]
            if ($prop) { $byMachine = $prop.Value }
        }
        if ($byMachine) {
            $entry = $byMachine.PSObject.Properties[$ConfigKey]
            if ($entry -and $entry.Value) {
                return [pscustomobject]@{ Path = $entry.Value; Source = "配置文件（$machine）" }
            }
        }
        $flat = $config.PSObject.Properties[$ConfigKey]
        if ($flat -and $flat.Value) {
            return [pscustomobject]@{ Path = $flat.Value; Source = '配置文件' }
        }
    }

    foreach ($name in $EnvNames) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { return [pscustomobject]@{ Path = $value; Source = "环境变量 $name" } }
    }

    $found = & $Detect
    if ($found) { return [pscustomobject]@{ Path = $found; Source = '自动探测' } }
    return [pscustomobject]@{ Path = $null; Source = '未找到' }
}

if ($SourceRoot) {
    if (-not (Test-Path -LiteralPath $SourceRoot -PathType Container)) {
        throw "找不到源根目录：$SourceRoot"
    }
    $SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).ProviderPath
}

$training = Resolve-One -Label 'training' -CliValue $TrainingRoot -ConfigKey 'training' `
    -EnvNames @('LEARNING_TRAINING_ROOT') -Detect { Find-TrainingRoot }
$vocab = Resolve-One -Label 'vocab' -CliValue $VocabRoot -ConfigKey 'vocab' `
    -EnvNames @('LEARN_ENGLISH_DIST', 'VOCAB_DIST') -Detect { Find-VocabDist }

$VocabRoot = $vocab.Path
$TrainingRoot = $training.Path

Write-Host ''
Write-Host "本机：$machine" -ForegroundColor DarkGray
Write-Host ("  做题思维训练 : {0}  [{1}]" -f $(if ($TrainingRoot) { $TrainingRoot } else { '(未找到)' }), $training.Source) -ForegroundColor DarkGray
Write-Host ("  英语单词 dist: {0}  [{1}]" -f $(if ($VocabRoot) { $VocabRoot } else { '(未找到)' }), $vocab.Source) -ForegroundColor DarkGray

if ($WriteConfig) {
    if (-not $TrainingRoot -or -not $VocabRoot) {
        Write-Host '有源目录没找到，先补齐或传参再写配置。' -ForegroundColor Red
        exit 1
    }
    $payload = [ordered]@{
        _comment = '本机专用路径配置（不入库）。换机器时用 -WriteConfig 重新生成，或用 machines 给每台机器各写一份。'
        machine  = $machine
        machines = [ordered]@{
            $machine = [ordered]@{ training = $TrainingRoot; vocab = $VocabRoot }
        }
    } | ConvertTo-Json -Depth 5
    Set-Content -LiteralPath $ConfigPath -Value $payload -Encoding UTF8
    Write-Host ''
    Write-Host "已写入本机配置：$ConfigPath" -ForegroundColor Green
    if (-not ($DryRun -or $Prune -or $Commit -or $Push)) { exit 0 }
}

$needed = @()
if ($Only -ne 'vocab')    { $needed += [pscustomobject]@{ Name = '做题思维训练'; Path = $TrainingRoot; Key = 'training'; Source = $training.Source } }
if ($Only -ne 'training') { $needed += [pscustomobject]@{ Name = '英语单词 dist'; Path = $VocabRoot; Key = 'vocab'; Source = $vocab.Source } }

$bad = @($needed | Where-Object { -not $_.Path -or -not (Test-Path -LiteralPath $_.Path -PathType Container) })
if ($bad.Count -gt 0) {
    Write-Host ''
    Write-Host '找不到源目录（本机路径与别的机器不一样时，用下面任一方式指定）：' -ForegroundColor Red
    foreach ($item in $bad) {
        Write-Host ("  {0,-14} -> {1}" -f $item.Name, $(if ($item.Path) { $item.Path } else { '(未找到)' })) -ForegroundColor Red
        Write-Host ("                    {0}" -f $item.Source) -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host '  1) 生成本机配置（推荐，只需一次）：' -ForegroundColor Yellow
    Write-Host '       .\tools\publish.ps1 -TrainingRoot <训练仓库> -VocabRoot <vocab-app\dist> -WriteConfig'
    Write-Host '     之后直接 .\tools\publish.ps1 -DryRun -Prune 即可。' -ForegroundColor Yellow
    Write-Host '  2) 临时指定：.\tools\publish.ps1 -TrainingRoot <路径> -VocabRoot <路径>'
    Write-Host '  3) 环境变量：$env:LEARNING_TRAINING_ROOT / $env:LEARN_ENGLISH_DIST'
    Write-Host ''
    Write-Host "  配置文件：$ConfigPath（不存在就算了，已 gitignore）" -ForegroundColor DarkGray
    if ($tried.Count -gt 0) {
        Write-Host ''
        Write-Host '  自动探测尝试过：' -ForegroundColor DarkGray
        $tried | Select-Object -First 12 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    exit 1
}

# ---------------------------------------------------------------- 发布清单
#
# Items 里写源相对路径：字符串 = 单个文件，哈希表 = 目录（可带 Filter），
# 哈希表带 As = 复制到目标时改名（用于把仓库根的 开始.html 发成 1/index.html）。
# 目录会保留子目录结构；Prune 只在目录项范围内生效。

$Jobs = @(
    @{
        Key       = 'vocab'
        Name      = '英语单词记背（vocab-app 构建产物）'
        Root      = $VocabRoot
        Target    = $repoRoot
        Items     = @(
            'index.html'
            'favicon.png'
            @{ Path = 'assets'; Filter = '*.*' }
        )
        GitPaths  = @('index.html', 'favicon.png', 'assets')
        BuildHint = 'cd learn-english\word_table\vocab-app; npm run build'
        ReachableAssets = 'assets'
    }
    @{
        Key       = 'training'
        Name      = '做题思维训练（各科训练器 + 开始页）'
        Root      = $TrainingRoot
        Target    = Join-Path $repoRoot '1'
        Items     = @(
            # 入口页：仓库根 开始.html → 站点 1/index.html（覆盖旧的手写索引）
            @{ Path = '开始.html'; As = 'index.html' }
            '道德与法治/核心考点训练.html'
            @{ Path = '道德与法治/images'; Filter = '*.webp' }
            '公式记背/公式记背.html'
            '历史/核心考点训练.html'
            @{ Path = '历史/images/试卷';   Filter = '*.webp' }
            '数学/函数思维脚手架.html'
            '数学/今晚急救包.html'
            '数学/坐标图象训练.html'
            '物理/物理思维脚手架.html'
            @{ Path = '物理/图片';          Filter = '*.png' }
            '英语/九上英语过关练习.html'
            # 语法闪练：单文件（题库 + 说明文档都已内联），双击即用，不需要原卷图
            '英语/语法闪练.html'
        )
        GitPaths  = @('1')
        BuildHint = '在各自训练器目录里重新构建出 HTML；开始.html 是手写的静态页'
    }
)

if ($Only -ne 'all') {
    $Jobs = @($Jobs | Where-Object { $_.Key -eq $Only })
}

# ---------------------------------------------------------------- 工具函数

function Get-Spec {
    param($Item)
    if ($Item -is [string]) {
        return [pscustomobject]@{ Rel = $Item; Filter = $null; As = $null }
    }
    return [pscustomobject]@{ Rel = $Item.Path; Filter = $Item.Filter; As = $Item.As }
}

# 从入口 HTML 出发，找出 assets/ 下真正被引用到的文件（含 JS 之间的相互引用）。
# 用途：Vite 8 实测不会清空 dist，历史构建产物会一直累积；只按 dist 内容镜像的话，
# 这些死文件会一直被搬到站点上。按可达性判断可以把它们挡在发布之外。
function Get-ReachableAssets {
    param([string]$IndexPath, [string]$AssetsDir)

    $seen  = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $queue = [System.Collections.Generic.Queue[string]]::new()

    if (-not (Test-Path -LiteralPath $IndexPath)) { return $seen }

    $namePattern = 'assets/([A-Za-z0-9._\-]+)'
    $html = Get-Content -LiteralPath $IndexPath -Raw
    foreach ($m in [regex]::Matches($html, $namePattern)) { $queue.Enqueue($m.Groups[1].Value) }

    # JS 里可能以 "assets/x.js" 或 "./x.js" 的形式引用其他 chunk
    $relPattern = '[""'']\./([A-Za-z0-9._\-]+\.(?:js|css))["'''']'

    while ($queue.Count -gt 0) {
        $name = $queue.Dequeue()
        if (-not $seen.Add($name)) { continue }

        $p = Join-Path $AssetsDir $name
        if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { continue }
        if ($name -notmatch '\.js$') { continue }

        $js = Get-Content -LiteralPath $p -Raw
        foreach ($m in [regex]::Matches($js, $namePattern)) { $queue.Enqueue($m.Groups[1].Value) }
        foreach ($m in [regex]::Matches($js, $relPattern)) { $queue.Enqueue($m.Groups[1].Value) }
    }

    return $seen
}

# 生成 (源文件, 目标文件, 相对路径) 计划；清单项缺失时记入 Missing
function Get-Plan {
    param($Job)

    $plan    = [System.Collections.Generic.List[object]]::new()
    $missing = [System.Collections.Generic.List[string]]::new()

    foreach ($item in $Job.Items) {
        $spec    = Get-Spec $item
        $srcPath = Join-Path $Job.Root $spec.Rel

        if (-not (Test-Path -LiteralPath $srcPath)) {
            $missing.Add($spec.Rel)
            continue
        }

        if (Test-Path -LiteralPath $srcPath -PathType Leaf) {
            $dstRel = if ($spec.As) { $spec.As } else { $spec.Rel }
            $plan.Add([pscustomobject]@{
                Src = $srcPath
                Dst = Join-Path $Job.Target $dstRel
                Rel = $dstRel
            })
            continue
        }

        $gciArgs = @{ LiteralPath = $srcPath; Recurse = $true; File = $true }
        if ($spec.Filter) { $gciArgs['Filter'] = $spec.Filter }

        foreach ($f in Get-ChildItem @gciArgs) {
            $sub = $f.FullName.Substring($srcPath.Length).TrimStart('\', '/')
            $rel = if ($sub) { Join-Path $spec.Rel $sub } else { $spec.Rel }
            $plan.Add([pscustomobject]@{
                Src = $f.FullName
                Dst = Join-Path $Job.Target $rel
                Rel = $rel
            })
        }
    }

    return [pscustomobject]@{ Plan = $plan; Missing = $missing }
}

# ---------------------------------------------------------------- 执行

$results   = [System.Collections.Generic.List[object]]::new()
$addPaths  = [System.Collections.Generic.List[string]]::new()
$anyMissing = $false

foreach ($job in $Jobs) {
    Write-Host ''
    Write-Host "── $($job.Name)" -ForegroundColor Magenta

    if (-not (Test-Path -LiteralPath $job.Root -PathType Container)) {
        Write-Host "   源目录不存在：$($job.Root)" -ForegroundColor Red
        Write-Host "   需要先构建：$($job.BuildHint)" -ForegroundColor DarkGray
        $anyMissing = $true
        continue
    }

    $built = Get-Plan $job
    $plan  = $built.Plan

    # 英语侧：宁可少发也不发历史残留，先把清单里不可达的产物剔掉
    if ($job.ReachableAssets) {
        $reachable = Get-ReachableAssets `
            -IndexPath (Join-Path $job.Root 'index.html') `
            -AssetsDir (Join-Path $job.Root $job.ReachableAssets)

        $prefix = $job.ReachableAssets + '/'
        $plan = @($plan | Where-Object {
            $norm = $_.Rel -replace '\\', '/'
            if (-not $norm.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { return $true }
            return $reachable.Contains([System.IO.Path]::GetFileName($_.Rel))
        })
    }

    $added   = [System.Collections.Generic.List[object]]::new()
    $updated = [System.Collections.Generic.List[object]]::new()
    $same    = 0

    foreach ($p in $plan) {
        if (-not (Test-Path -LiteralPath $p.Dst)) { $added.Add($p); continue }
        $a = (Get-FileHash -LiteralPath $p.Src -Algorithm SHA256).Hash
        $b = (Get-FileHash -LiteralPath $p.Dst -Algorithm SHA256).Hash
        if ($a -ne $b) { $updated.Add($p) } else { $same++ }
    }

    $removed = [System.Collections.Generic.List[object]]::new()
    if ($Prune) {
        $expected = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($p in $plan) { [void]$expected.Add([System.IO.Path]::GetFullPath($p.Dst)) }

        foreach ($item in $job.Items) {
            $spec   = Get-Spec $item
            $dstDir = Join-Path $job.Target $spec.Rel
            if (-not (Test-Path -LiteralPath $dstDir -PathType Container)) { continue }

            foreach ($f in Get-ChildItem -LiteralPath $dstDir -Recurse -File) {
                if (-not $expected.Contains([System.IO.Path]::GetFullPath($f.FullName))) {
                    $removed.Add($f)
                }
            }
        }
    }

    if (-not $DryRun) {
        foreach ($p in @($added) + @($updated)) {
            $dir = Split-Path $p.Dst -Parent
            if (-not (Test-Path -LiteralPath $dir)) {
                New-Item -ItemType Directory -Force -Path $dir | Out-Null
            }
            Copy-Item -LiteralPath $p.Src -Destination $p.Dst -Force
        }
        foreach ($f in $removed) { Remove-Item -LiteralPath $f.FullName -Force }
    }

    foreach ($p in $added)   { Write-Host "   + $($p.Rel)" -ForegroundColor Green }
    foreach ($p in $updated) { Write-Host "   ~ $($p.Rel)" -ForegroundColor Yellow }
    foreach ($f in $removed) {
        $rel = $f.FullName.Substring($job.Target.Length).TrimStart('\', '/')
        Write-Host "   - $rel" -ForegroundColor DarkYellow
    }
    foreach ($m in $built.Missing) {
        Write-Host "   ! 源中缺少：$m" -ForegroundColor Red
        $anyMissing = $true
    }

    Write-Host ("   新增 {0} · 更新 {1} · 删除 {2} · 未变 {3}" -f `
        $added.Count, $updated.Count, $removed.Count, $same) -ForegroundColor DarkGray

    $results.Add([pscustomobject]@{
        Name    = $job.Name
        Added   = $added.Count
        Updated = $updated.Count
        Removed = $removed.Count
        Same    = $same
    })

    foreach ($gp in $job.GitPaths) { [void]$addPaths.Add($gp) }
}

# ---------------------------------------------------------------- 汇总

$tAdd = if ($results.Count) { [int]($results | Measure-Object Added   -Sum).Sum } else { 0 }
$tUpd = if ($results.Count) { [int]($results | Measure-Object Updated -Sum).Sum } else { 0 }
$tRem = if ($results.Count) { [int]($results | Measure-Object Removed -Sum).Sum } else { 0 }

$tag = if ($DryRun) { '[预演] ' } else { '' }
Write-Host ''
Write-Host ("{0}合计：新增 {1} · 更新 {2} · 删除 {3}{4}" -f `
    $tag, $tAdd, $tUpd, $tRem, $(if ($DryRun) { '（未写文件）' } else { '' })) -ForegroundColor Cyan

# ---------------------------------------------------------------- 提交推送

$changed = ($tAdd + $tUpd + $tRem) -gt 0

if (($Commit -or $Push) -and $DryRun) {
    Write-Host '-Commit / -Push 在 -DryRun 下被忽略。' -ForegroundColor DarkGray
}
elseif ($Commit) {
    if (-not $changed) {
        Write-Host '没有变化，不需要提交。' -ForegroundColor DarkGray
    }
    else {
        $msg = "发布：新增 $tAdd / 更新 $tUpd / 删除 $tRem"
        git -C $repoRoot add -- $addPaths
        git -C $repoRoot commit -m $msg | Out-Null
        Write-Host "已提交：$msg" -ForegroundColor Cyan

        if ($Push) {
            git -C $repoRoot push
            Write-Host '已推送。' -ForegroundColor Cyan
        }
    }
}

if ($anyMissing) {
    Write-Host ''
    Write-Host '有源目录或清单项缺失，请确认是否改名、移动或还没构建。' -ForegroundColor Red
    exit 1
}

exit 0
