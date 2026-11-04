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

    # 三个源分别用两个参数指定（原来的 -SourceRoot 已失效：那台机器的目录结构变了）。
    [string]$VocabRoot = 'C:\learn\learn-english\word_table\vocab-app\dist',

    [string]$TrainingRoot = 'C:\work\my-work\learning-training',

    # 兼容旧用法：给 -SourceRoot 时按老结构推导（<root>\learn-english\...、<root>\做题思维训练）
    [string]$SourceRoot,

    [switch]$DryRun,
    [switch]$Prune,
    [switch]$Commit,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- 路径

$repoRoot = Split-Path -Parent $PSScriptRoot

if ($SourceRoot) {
    if (-not (Test-Path -LiteralPath $SourceRoot -PathType Container)) {
        throw "找不到源根目录：$SourceRoot"
    }
    $SourceRoot  = (Resolve-Path -LiteralPath $SourceRoot).ProviderPath
    $VocabRoot   = Join-Path $SourceRoot 'learn-english\word_table\vocab-app\dist'
    $TrainingRoot = Join-Path $SourceRoot '做题思维训练'
}

$roots = [ordered]@{
    '英语单词记背（vocab-app\dist）' = $VocabRoot
    '做题思维训练'                   = $TrainingRoot
}
foreach ($k in $roots.Keys) {
    if (-not (Test-Path -LiteralPath $roots[$k] -PathType Container)) {
        Write-Host "源目录不存在：$($roots[$k])  （$k）" -ForegroundColor Red
    }
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
        Name      = '做题思维训练（五个训练器 + 开始页）'
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
            '物理/物理思维脚手架.html'
            @{ Path = '物理/图片';          Filter = '*.png' }
            '英语/九上英语过关练习.html'
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
