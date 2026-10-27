# =====================================================================
#  物理题库 docx -> 逐题裁图 + raw 素材
#  需要：powershell.exe 5.1 -STA（Word COM + WPF 渲染）
#  本文件必须保存为 UTF-8 **带 BOM**（PowerShell 5.1 才能正确读中文）
#
#  用法（工作目录随意）：
#    powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File 物理\工具\extract.ps1
#    powershell.exe ... -File 物理\工具\extract.ps1 -Only pk-w1              # 只跑第1周
#    powershell.exe ... -File 物理\工具\extract.ps1 -RecropOnly -Only pk-w1   # 只重裁（不开 Word）
#    powershell.exe ... -File 物理\工具\extract.ps1 -Docx "C:\...\第10周.docx" -PackId pk-w10
#    powershell.exe ... -File 物理\工具\extract.ps1 -Stage raw                # 只重建 raw/ index
#
#  产物：
#    物理/_recon/xps/<packId>.xps
#    物理/_recon/pages/<packId>/pageNN.png          整页 2x 渲染（1588x2246）
#    物理/_recon/geom/<packId>.json                 每题边界/文本/图片清单（裁图只依赖它）
#    物理/图片/<packId>/qNN.png qNN_2.png qNN-a.png  裁图
#    物理/_recon/raw/<packId>.json/.md              逐题素材
#    物理/_recon/raw/index.json                     汇总 + anomalies
# =====================================================================
param(
    [string[]]$Docx = @(),
    [string]$PackId = '',
    [string]$Only = '',
    [string]$Root = '',
    [ValidateSet('all', 'text', 'crop', 'raw')]
    [string]$Stage = 'all',
    [switch]$RecropOnly,
    [switch]$SkipCrop,
    [switch]$SkipRender,
    [switch]$SkipXps,
    [double]$Scale = 2.0
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------- paths
if (-not $Root) {
    # 从脚本位置推导：<仓库>/物理/工具/extract.ps1 → <仓库>/物理（换电脑/换目录不用改）
    $cand = Split-Path -Parent $PSScriptRoot
    if (Test-Path (Join-Path $cand "题库")) { $Root = $cand }
    else { $Root = Split-Path -Parent $cand }
    if (-not (Test-Path (Join-Path $Root "题库"))) {
        throw "找不到 题库/ 目录（推导结果：$Root）。请用 -Root 指定 物理 目录。"
    }
}
$SrcDir = Join-Path $Root "题库"
$ImgRoot = Join-Path $Root "图片"
$ReconDir = Join-Path $Root "_recon"
$XpsDir = Join-Path $ReconDir "xps"
$PageDir = Join-Path $ReconDir "pages"
$GeomDir = Join-Path $ReconDir "geom"
$RawDir = Join-Path $ReconDir "raw"
foreach ($d in @($ImgRoot, $XpsDir, $PageDir, $GeomDir, $RawDir)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

$PackMap = @{
    '第1周'   = 'pk-w1'
    '第2周'   = 'pk-w2'
    '第4周'   = 'pk-w4'
    '第5周_1' = 'pk-w5a'
    '第5周_2' = 'pk-w5b'
    '第6周'   = 'pk-w6'
    '第8周'   = 'pk-w8'
    '第9周'   = 'pk-w9'
}

function Get-PackId([string]$file) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($file)
    if ($PackMap.ContainsKey($base)) { return $PackMap[$base] }
    if ($script:PackId) { return $script:PackId }
    $m = [regex]::Match($base, '(\d+)')
    $n = if ($m.Success) { $m.Groups[1].Value } else { '' }
    $suffix = ''
    $m2 = [regex]::Match($base, '_(\d+)$')
    if ($m2.Success) {
        $idx = [int]$m2.Groups[1].Value
        $suffix = [string][char]([int][char]'a' + $idx - 1)
    }
    if (-not $n) { return 'pk-' + ($base -replace '[^\w]', '') }
    return "pk-w$n$suffix"
}

# ---------------------------------------------------------------- io helpers
function Save-Utf8([string]$path, [string]$text) {
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $text, $enc)
}

function ConvertTo-JsonText($v, [int]$indent = 0) {
    $pad = ' ' * ($indent * 2)
    $pad2 = ' ' * (($indent + 1) * 2)
    if ($null -eq $v) { return 'null' }
    if ($v -is [bool]) { if ($v) { return 'true' } else { return 'false' } }
    if ($v -is [string]) {
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.Append('"')
        foreach ($ch in $v.ToCharArray()) {
            $i = [int]$ch
            if ($ch -eq '"') { [void]$sb.Append('\"') }
            elseif ($ch -eq '\') { [void]$sb.Append('\\') }
            elseif ($ch -eq "`n") { [void]$sb.Append('\n') }
            elseif ($ch -eq "`r") { [void]$sb.Append('\r') }
            elseif ($ch -eq "`t") { [void]$sb.Append('\t') }
            elseif ($i -lt 32) { [void]$sb.Append(('\u{0:x4}' -f $i)) }
            else { [void]$sb.Append($ch) }
        }
        [void]$sb.Append('"')
        return $sb.ToString()
    }
    if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal] -or $v -is [single]) {
        return ([System.Convert]::ToString($v, [System.Globalization.CultureInfo]::InvariantCulture))
    }
    if ($v -is [System.Collections.IDictionary]) {
        if ($v.Count -eq 0) { return '{}' }
        $parts = @()
        foreach ($k in $v.Keys) {
            $parts += ($pad2 + (ConvertTo-JsonText ([string]$k) 0) + ': ' + (ConvertTo-JsonText $v[$k] ($indent + 1)))
        }
        return "{`n" + ($parts -join ",`n") + "`n" + $pad + "}"
    }
    if ($v -is [System.Collections.IEnumerable]) {
        $arr = @($v)
        if ($arr.Count -eq 0) { return '[]' }
        $parts = @()
        foreach ($item in $arr) { $parts += ($pad2 + (ConvertTo-JsonText $item ($indent + 1))) }
        return "[`n" + ($parts -join ",`n") + "`n" + $pad + "]"
    }
    if ($v -is [psobject]) {
        $d = [ordered]@{}
        foreach ($p in $v.PSObject.Properties) { $d[$p.Name] = $p.Value }
        return (ConvertTo-JsonText $d $indent)
    }
    return (ConvertTo-JsonText ([string]$v) 0)
}

# ---------------------------------------------------------------- docx text
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-Docx {
    param([string]$Path)
    $W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    $M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
    $A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    $R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    $V = 'urn:schemas-microsoft-com:vml'
    $MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'

    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $rels = @{}
        $e = $zip.GetEntry('word/_rels/document.xml.rels')
        if ($e) {
            $sr = New-Object System.IO.StreamReader($e.Open())
            $txt = $sr.ReadToEnd(); $sr.Close()
            $xd = New-Object System.Xml.XmlDocument; $xd.LoadXml($txt)
            foreach ($rel in $xd.DocumentElement.ChildNodes) {
                if ($rel.NodeType -ne 'Element') { continue }
                $id = $rel.GetAttribute('Id'); $tg = $rel.GetAttribute('Target')
                if ($id) { $rels[$id] = $tg }
            }
        }
        $e2 = $zip.GetEntry('word/document.xml')
        $sr2 = New-Object System.IO.StreamReader($e2.Open())
        $docTxt = $sr2.ReadToEnd(); $sr2.Close()
        $x = New-Object System.Xml.XmlDocument
        $x.PreserveWhitespace = $true
        $x.LoadXml($docTxt)
    }
    finally { $zip.Dispose() }

    $body = $null
    foreach ($c in $x.DocumentElement.ChildNodes) {
        if ($c.NodeType -eq 'Element' -and $c.LocalName -eq 'body') { $body = $c; break }
    }
    $script:relMap = $rels
    function Walk($node, [bool]$inObj, $sb) {
        foreach ($c in $node.ChildNodes) {
            if ($c.NodeType -ne 'Element') { continue }
            $ln = $c.LocalName; $ns = $c.NamespaceURI
            if ($ns -eq $MC -and $ln -eq 'Fallback') { continue }
            if ($ns -eq $W -and $ln -eq 't') { [void]$sb.Append($c.InnerText); continue }
            if ($ns -eq $M -and $ln -eq 't') { [void]$sb.Append($c.InnerText); continue }
            if ($ns -eq $W -and $ln -eq 'tab') { [void]$sb.Append("`t"); continue }
            if ($ns -eq $W -and $ln -eq 'br') { [void]$sb.Append("`n"); continue }
            if ($ns -eq $A -and $ln -eq 'blip') {
                $rid = $c.GetAttribute('embed', $R)
                if ($rid -and $script:relMap[$rid]) {
                    [void]$sb.Append(('⟦{0}:{1}⟧' -f $(if ($inObj) { 'EQ' } else { 'IMG' }), $script:relMap[$rid]))
                }
                continue
            }
            if ($ns -eq $V -and $ln -eq 'imagedata') {
                $rid = $c.GetAttribute('id', $R)
                if ($rid -and $script:relMap[$rid]) {
                    [void]$sb.Append(('⟦{0}:{1}⟧' -f $(if ($inObj) { 'EQ' } else { 'IMG' }), $script:relMap[$rid]))
                }
                continue
            }
            Walk $c ($inObj -or ($ns -eq $W -and $ln -eq 'object')) $sb
        }
    }

    $paras = New-Object System.Collections.Generic.List[string]
    $tables = New-Object System.Collections.Generic.List[object]
    if ($body) {
        foreach ($c in $body.ChildNodes) {
            if ($c.NodeType -ne 'Element') { continue }
            if ($c.LocalName -eq 'p') {
                $sb = New-Object System.Text.StringBuilder
                Walk $c $false $sb
                $paras.Add($sb.ToString())
            }
            elseif ($c.LocalName -eq 'tbl') {
                $rows = New-Object System.Collections.Generic.List[object]
                foreach ($tr in $c.ChildNodes) {
                    if ($tr.NodeType -ne 'Element' -or $tr.LocalName -ne 'tr') { continue }
                    $cells = New-Object System.Collections.Generic.List[string]
                    foreach ($tc in $tr.ChildNodes) {
                        if ($tc.NodeType -ne 'Element' -or $tc.LocalName -ne 'tc') { continue }
                        $ct = New-Object System.Collections.Generic.List[string]
                        foreach ($cp in $tc.ChildNodes) {
                            if ($cp.NodeType -ne 'Element' -or $cp.LocalName -ne 'p') { continue }
                            $sb2 = New-Object System.Text.StringBuilder
                            Walk $cp $false $sb2
                            $ct.Add($sb2.ToString().Trim())
                        }
                        $cells.Add(($ct -join ' ').Trim())
                    }
                    $rows.Add($cells.ToArray())
                }
                $tables.Add($rows.ToArray())
            }
        }
    }
    return [pscustomobject]@{ paras = $paras.ToArray(); tables = $tables.ToArray() }
}

# ---------------------------------------------------------------- text utils
function Normalize-Text([string]$t) {
    if ($null -eq $t) { return '' }
    $t = $t -replace "`r", ''
    $t = $t -replace '[\x00-\x08\x0b\x0c\x0e-\x1f]', ''
    $t = $t -replace [char]0x00a0, ' '
    $t = $t -replace [char]0x3000, ' '
    return $t
}

function Clean-Markers([string]$t) {
    $t = [regex]::Replace($t, '⟦(?<k>[A-Z]+):[^⟧]*⟧', {
            param($m)
            if ($m.Groups['k'].Value -eq 'EQ') { return '[式]' } else { return '[图]' }
        })
    $t = $t -replace '\[图\]\s*\[图\]', '[图]'
    $t = $t -replace '\[式\]\s*\[式\]', '[式]'
    return $t
}

$ReQ = [regex]'(?m)^\s*(\d{1,2})\s*(?:．|\.(?!\d)|、)'
$ReHeading = [regex]'^\s*(?:[一二三四五六七八九十]+\s*[、．.]\s*\S|《.*》\s*参考答案|参考答案)'

function Get-QNumber([string]$t) {
    $n = Normalize-Text $t
    if ($n.Length -eq 0) { return 0 }
    $n = $n -replace '(?:⟦[^⟧]*⟧|[/\|]+)+', ''
    $n = $n -replace '^\s+', ''
    $m = $ReQ.Match($n)
    if ($m.Success -and $m.Index -eq 0) { return [int]$m.Groups[1].Value }
    return 0
}

function Is-Heading([string]$t) {
    $n = Normalize-Text $t
    if ($n.Length -eq 0) { return $false }
    $n = $n -replace '(?:⟦[^⟧]*⟧|[/\|]+)+', ''
    if ($n.Trim().Length -gt 20) { return $false }
    return $ReHeading.IsMatch($n)
}

function Get-SectionGroup([string]$text) {
    $t = Normalize-Text $text
    if ($t -match '单选题|选择题|单选') { return '选择' }
    if ($t -match '非选择题|填空题|实验题|计算题|作图题|简答题|解答题') { return '非选择' }
    return ''
}

function Get-OptLabelCount([string]$s) {
    return ([regex]::Matches($s, '(?<![A-Za-z0-9])([A-D])\s*[．.](?!\d)')).Count
}

function Get-StemAndOpts([string[]]$texts) {
    $stemParts = New-Object System.Collections.Generic.List[string]
    $optParts = New-Object System.Collections.Generic.List[string]
    $inOpts = $false
    $labelCount = 0
    foreach ($t in $texts) {
        $clean = Clean-Markers (Normalize-Text $t)
        if ($inOpts) {
            $lab = Get-OptLabelCount $clean
            if ($lab -eq 0 -and $labelCount -ge 4) { continue }   # 图行 / 图注，不属于选项
            if ($lab -eq 0 -and $clean.Trim().Length -eq 0) { continue }
            $optParts.Add($clean)
            $labelCount += $lab
            continue
        }
        $m = [regex]::Match($clean, '(?<![A-Za-z0-9\[/])A\s*[．.](?!\d)')
        if ($m.Success) {
            $pre = $clean.Substring(0, $m.Index)
            $post = $clean.Substring($m.Index)
            if ([regex]::IsMatch($post, '(?<![A-Za-z0-9])[B-D]\s*[．.](?!\d)')) {
                if ($pre.Trim().Length -gt 0) { $stemParts.Add($pre) }
                $optParts.Add($post)
                $labelCount = Get-OptLabelCount $post
                $inOpts = $true
                continue
            }
        }
        $stemParts.Add($clean)
    }
    $opts = @()
    if ($optParts.Count -gt 0) {
        $src = (($optParts -join "`n") -replace "`n", ' ') -replace '\s+', ' '
        $ms = [regex]::Matches($src, '(?<![A-Za-z0-9])([A-D])\s*[．.](?!\d)')
        $kept = @()
        $letters = @('A', 'B', 'C', 'D')
        $ei = 0
        foreach ($mm in $ms) {
            if ($mm.Groups[1].Value -ne $letters[$ei]) { continue }
            $kept += $mm
            $ei++
            if ($ei -ge 4) { break }
        }
        for ($k = 0; $k -lt $kept.Count; $k++) {
            $st = $kept[$k].Index + $kept[$k].Length
            $en = if ($k + 1 -lt $kept.Count) { $kept[$k + 1].Index } else { $src.Length }
            $v = $src.Substring($st, $en - $st).Trim()
            $v = ($v -replace '^[\s、,，;；:：]+', '').Trim()
            # 去掉尾部混进来的图行/图注（"…[图] 第1题 第2题"）
            $v = $v -replace '(\s*\[图\])*\s*(第\s*\d{1,2}\s*题\s*)+$', ''
            $v = ($v -replace '\s*\[图\]\s*$', '')
            $v = $v.Trim()
            if ($v -eq '') { $v = '[图]' }
            $opts += $v
        }
    }
    $stem = (($stemParts | Where-Object { $_.Trim().Length -gt 0 }) -join "`n")
    return [pscustomobject]@{ stem = $stem; opts = $opts }
}

function Get-Blocks {
    param($paras, [int]$fromIdx, [int]$toIdx)
    $blocks = New-Object System.Collections.Generic.List[object]
    $cur = $null
    $group = ''
    $section = ''
    for ($k = $fromIdx; $k -le $toIdx; $k++) {
        $p = $paras[$k - 1]
        $txt = Normalize-Text $p.text
        $no = Get-QNumber $txt
        if ($no -gt 0) {
            if ($cur) { $cur.endIdx = $k }
            $cur = [ordered]@{ no = $no; startIdx = $k; endIdx = $toIdx + 1; group = $group; section = $section }
            $blocks.Add($cur) | Out-Null
        }
        elseif (Is-Heading $txt) {
            if ($cur) { $cur.endIdx = $k; $cur = $null }
            $g = Get-SectionGroup $txt
            if ($g) { $group = $g; $section = ($txt -replace '⟦[^⟧]*⟧', '').Trim() }
        }
    }
    return $blocks
}

function Get-AnswerTable($tables) {
    $res = @{}
    $order = @()
    foreach ($tb in $tables) {
        $rows = $tb.rows
        if (-not $rows -or $rows.Count -lt 2) { continue }
        if (([string]$rows[0][0]).Trim() -ne '题号') { continue }
        $nums = $rows[0]
        $ans = $null
        for ($r = 1; $r -lt $rows.Count; $r++) {
            if (([string]$rows[$r][0]).Trim() -match '^答案?$') { $ans = $rows[$r]; break }
        }
        if (-not $ans) { continue }
        for ($c = 1; $c -lt $nums.Count; $c++) {
            $nv = ([string]$nums[$c]).Trim()
            $av = ([string]$ans[$c]).Trim()
            if ($nv -match '^\d+$' -and $av -match '^[A-Da-d]+$') {
                $n = [int]$nv
                if (-not $res.ContainsKey($n)) { $res[[int]$n] = $av.ToUpper(); $order += $n }
            }
        }
    }
    return [pscustomobject]@{ map = $res; order = $order }
}

function Get-GuessType([string]$askText, [string]$answerText, [bool]$isChoice) {
    if ($isChoice) { return 'choice' }
    if ($askText -match '画出|作图|画图|在图中画') { return 'selfcheck' }
    if ($answerText -match '解[:：]|解\s*（|解\(') { return 'solve' }
    if ($askText -match '求[：:的]|计算|多大|多少|效率') { return 'solve' }
    return 'fill'
}

# ---------------------------------------------------------------- Word COM
function Get-WordGeom {
    param([string]$Path, [string]$XpsPath, [switch]$NoXps)
    $w = New-Object -ComObject Word.Application
    $w.Visible = $false
    $w.DisplayAlerts = 0
    $doc = $null
    $out = $null
    try {
        $doc = $w.Documents.Open($Path, $false, $true)
        $ps = $doc.PageSetup
        $meta = [ordered]@{
            pageWidth      = [double]$ps.PageWidth
            pageHeight     = [double]$ps.PageHeight
            leftMargin     = [double]$ps.LeftMargin
            rightMargin    = [double]$ps.RightMargin
            topMargin      = [double]$ps.TopMargin
            bottomMargin   = [double]$ps.BottomMargin
            headerDistance = [double]$ps.HeaderDistance
            footerDistance = [double]$ps.FooterDistance
            pages          = [int]$doc.ComputeStatistics(2)
            paraCount      = [int]$doc.Paragraphs.Count
        }
        $paras = New-Object System.Collections.Generic.List[object]
        $i = 0
        foreach ($p in $doc.Paragraphs) {
            $i++
            $r = $p.Range
            $txt = ''
            try { $txt = [string]$r.Text } catch { $txt = '' }
            $st = [int]$r.Start
            $en = [int]$r.End
            $rr = $doc.Range($st, $st)
            $pg = 1; $xx = 0.0; $yy = 0.0
            try { $pg = [int]$rr.Information(3) } catch {}
            try { $xx = [double]$rr.Information(5) } catch {}
            try { $yy = [double]$rr.Information(6) } catch {}
            $lastPos = if ($en - 2 -gt $st) { $en - 2 } else { $st }
            $endY = $yy; $endPage = $pg
            try {
                $rr2 = $doc.Range($lastPos, $lastPos)
                $endPage = [int]$rr2.Information(3)
                $endY = [double]$rr2.Information(6)
            }
            catch {}
            $paras.Add([ordered]@{
                    i = $i; start = $st; end = $en; text = $txt
                    page = $pg; x = [math]::Round($xx, 2); y = [math]::Round($yy, 2)
                    endPage = $endPage; endY = [math]::Round($endY, 2)
                    blank = (($txt -replace '[\x00-\x1f\s\/]', '').Length -eq 0)
                })
        }

        function ParaOfPos([int]$pos) {
            $lo = 0; $hi = $paras.Count - 1; $best = -1
            while ($lo -le $hi) {
                $mid = [int](($lo + $hi) / 2)
                if ($paras[$mid].start -le $pos) { $best = $mid; $lo = $mid + 1 } else { $hi = $mid - 1 }
            }
            if ($best -lt 0) { return -1 }
            return ($paras[$best].i)
        }

        $shapeList = New-Object System.Collections.Generic.List[object]
        $sn = 0
        foreach ($s in $doc.Shapes) {
            $sn++
            $apos = -1
            try {
                $a = $s.Anchor
                $apos = ParaOfPos ([int]$a.Start)
            }
            catch {}
            $o = [ordered]@{ n = $sn; type = -1; para = $apos; page = -1; top = 0.0; left = 0.0; w = 0.0; h = 0.0; relV = -1; relH = -1; wrap = -1 }
            try { $o.type = [int]$s.Type } catch {}
            try { $o.top = [double]$s.Top } catch {}
            try { $o.left = [double]$s.Left } catch {}
            try { $o.w = [double]$s.Width } catch {}
            try { $o.h = [double]$s.Height } catch {}
            try { $o.relV = [int]$s.RelativeVerticalPosition } catch {}
            try { $o.relH = [int]$s.RelativeHorizontalPosition } catch {}
            try { $o.wrap = [int]$s.WrapFormat.Type } catch {}
            if ($apos -gt 0) { $o.page = [int]$paras[$apos - 1].page }
            $shapeList.Add($o)
        }

        $tables = New-Object System.Collections.Generic.List[object]
        $tn = 0
        foreach ($tb in $doc.Tables) {
            $tn++
            $rowCount = [int]$tb.Rows.Count
            $colCount = [int]$tb.Columns.Count
            $rows = New-Object System.Collections.Generic.List[object]
            for ($rI = 1; $rI -le [math]::Min($rowCount, 6); $rI++) {
                $cells = New-Object System.Collections.Generic.List[string]
                for ($cI = 1; $cI -le [math]::Min($colCount, 40); $cI++) {
                    $cv = ''
                    try {
                        $cell = $tb.Cell($rI, $cI)
                        $cv = ([string]$cell.Range.Text) -replace '[\x00-\x1f\x07]', ''
                        $cv = $cv.Trim()
                    }
                    catch { $cv = '' }
                    $cells.Add($cv)
                }
                $rows.Add($cells.ToArray())
            }
            $tables.Add([ordered]@{ n = $tn; rows = $rows.ToArray() })
        }

        if (-not $NoXps) {
            if (Test-Path $XpsPath) { Remove-Item $XpsPath -Force }
            $doc.SaveAs2($XpsPath, 18)
        }
        $out = [pscustomobject]@{ meta = $meta; paras = $paras.ToArray(); shapes = $shapeList.ToArray(); tables = $tables.ToArray() }
    }
    finally {
        if ($doc) { try { $doc.Close($false) } catch {} }
        try { $w.Quit() } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($w) | Out-Null } catch {}
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    }
    return $out
}

# ---------------------------------------------------------------- XPS -> PNG
function Convert-XpsToPng {
    param([string]$XpsPath, [string]$OutDir, [double]$Scale = 2.0)
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    Get-ChildItem $OutDir -Filter 'page*.png' -ErrorAction SilentlyContinue | Remove-Item -Force
    $xps = New-Object System.Windows.Xps.Packaging.XpsDocument($XpsPath, [System.IO.FileAccess]::Read)
    $list = New-Object System.Collections.Generic.List[object]
    try {
        $seq = $xps.GetFixedDocumentSequence()
        $n = $seq.DocumentPaginator.PageCount
        for ($i = 0; $i -lt $n; $i++) {
            $fp = $seq.DocumentPaginator.GetPage($i)
            $pw = [double]$fp.Size.Width * $Scale
            $ph = [double]$fp.Size.Height * $Scale
            $dpi = 96.0 * $Scale
            $rtb = New-Object System.Windows.Media.Imaging.RenderTargetBitmap([int]$pw, [int]$ph, $dpi, $dpi, [System.Windows.Media.PixelFormats]::Pbgra32)
            $rtb.Render($fp.Visual)
            $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
            $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb)) | Out-Null
            $outFile = Join-Path $OutDir ("page{0:d2}.png" -f ($i + 1))
            $fs = [System.IO.File]::Create($outFile)
            $enc.Save($fs)
            $fs.Close()
            $list.Add([ordered]@{ page = $i + 1; file = $outFile; w = [int]$pw; h = [int]$ph })
        }
    }
    finally { $xps.Close() }
    return $list.ToArray()
}

# ---------------------------------------------------------------- ink / crop
Add-Type -AssemblyName System.Drawing

function Get-PageProfile {
    param([string]$PngPath)
    $bmp = [System.Drawing.Bitmap]::FromFile($PngPath)
    $w = $bmp.Width; $h = $bmp.Height
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data)
    $bmp.Dispose()
    $rows = New-Object int[] $h
    $minX = New-Object int[] $h
    $maxX = New-Object int[] $h
    for ($y = 0; $y -lt $h; $y++) {
        $off = $y * $stride
        $c = 0; $mn = -1; $mx = -1
        for ($x = 0; $x -lt $w; $x++) {
            $p = $off + $x * 4
            if (([int]$bytes[$p] + [int]$bytes[$p + 1] + [int]$bytes[$p + 2]) -lt 700) {
                $c++; if ($mn -lt 0) { $mn = $x }; $mx = $x
            }
        }
        $rows[$y] = $c; $minX[$y] = $mn; $maxX[$y] = $mx
    }
    return [pscustomobject]@{ w = $w; h = $h; rows = $rows; minX = $minX; maxX = $maxX }
}

function Get-FooterEraseRects {
    # 页脚文字会在「页脚区」留下居中、窄的墨迹（有时图形溢出到页面底部，所以不能靠 y 直接截断）
    param([string]$PngPath, $profile, [double]$Scale, $meta)
    $rects = New-Object System.Collections.Generic.List[object]
    $h = $profile.h; $w = $profile.w
    $yStart = [int](($meta.pageHeight - $meta.bottomMargin) * $Scale)
    if ($yStart -ge $h) { return $rects }
    $bmp = [System.Drawing.Bitmap]::FromFile($PngPath)
    try {
        $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
        $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $stride = $data.Stride
        $bytes = New-Object byte[] ($stride * $h)
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
        $bmp.UnlockBits($data)
    }
    finally { $bmp.Dispose() }
    $x0min = $w; $x1max = 0; $y0min = $h; $y1max = 0; $hit = $false
    for ($y = $yStart; $y -lt $h; $y++) {
        $off = $y * $stride
        $inRun = $false; $st = 0
        for ($x = 0; $x -lt $w; $x++) {
            $p = $off + $x * 4
            $has = (([int]$bytes[$p] + [int]$bytes[$p + 1] + [int]$bytes[$p + 2]) -lt 700)
            if ($has -and -not $inRun) { $st = $x; $inRun = $true }
            elseif (-not $has -and $inRun) {
                $rw = $x - $st
                $rc = ($st + $x) / 2.0
                if ($rw -ge 20 -and $rw -lt 0.30 * $w -and $rc -gt 0.34 * $w -and $rc -lt 0.66 * $w) {
                    $hit = $true
                    if ($st -lt $x0min) { $x0min = $st }
                    if (($x - 1) -gt $x1max) { $x1max = $x - 1 }
                    if ($y -lt $y0min) { $y0min = $y }
                    if ($y -gt $y1max) { $y1max = $y }
                }
                $inRun = $false
            }
        }
        if ($inRun) {
            $rw = $w - $st
            $rc = ($st + $w) / 2.0
            if ($rw -ge 20 -and $rw -lt 0.30 * $w -and $rc -gt 0.34 * $w -and $rc -lt 0.66 * $w) {
                $hit = $true
                if ($st -lt $x0min) { $x0min = $st }
                if (($w - 1) -gt $x1max) { $x1max = $w - 1 }
                if ($y -lt $y0min) { $y0min = $y }
                if ($y -gt $y1max) { $y1max = $y }
            }
        }
    }
    if ($hit -and $x1max -gt $x0min) {
        $rects.Add([ordered]@{ x0 = [math]::Max(0, $x0min - 10); x1 = [math]::Min($w - 1, $x1max + 10); y0 = [math]::Max(0, $y0min - 6); y1 = [math]::Min($h - 1, $y1max + 6) }) | Out-Null
    }
    return $rects
}

function Get-PageLimits {
    param($profile, [double]$Scale, $meta)
    $h = $profile.h; $w = $profile.w
    $contentBottomPt = $meta.pageHeight - $meta.bottomMargin
    $scanFrom = [int]([math]::Max(0, ($meta.pageHeight - $meta.bottomMargin - 4) * $Scale))
    $footerTop = -1
    for ($y = $h - 1; $y -ge $scanFrom; $y--) {
        if ($profile.rows[$y] -gt 0) {
            $b0 = $y
            while ($y -ge 0 -and $profile.rows[$y] -gt 0) { $y-- }
            $b1 = $y + 1
            $bx0 = $w; $bx1 = 0
            for ($k = $b1; $k -le $b0; $k++) {
                if ($profile.maxX[$k] -gt $bx1) { $bx1 = $profile.maxX[$k] }
                if ($profile.minX[$k] -ge 0 -and $profile.minX[$k] -lt $bx0) { $bx0 = $profile.minX[$k] }
            }
            $bw = if ($bx1 -ge $bx0) { $bx1 - $bx0 } else { 0 }
            if ($bw -lt 0.55 * $w) { $footerTop = $b1 }
            break
        }
    }
    $bottomLimit = if ($footerTop -ge 0) { $footerTop - 2 } else { $h - 4 }
    $topLimit = [int]([math]::Max(0, ($meta.topMargin - 3) * $Scale))
    return [pscustomobject]@{
        topLimit = $topLimit; bottomLimit = $bottomLimit
        contentTop = [int]($meta.topMargin * $Scale); contentBottom = [int]($contentBottomPt * $Scale)
        footerTop = $footerTop
    }
}

function Save-Crop {
    param(
        [string]$PagePath, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [string]$OutPath,
        [int]$MaxBytes = 400000,
        $Erase = $null,
        $Keep = $null
    )
    $bmp = [System.Drawing.Bitmap]::FromFile($PagePath)
    try {
        $x0 = [math]::Max(0, $x0); $y0 = [math]::Max(0, $y0)
        $x1 = [math]::Min($bmp.Width - 1, $x1); $y1 = [math]::Min($bmp.Height - 1, $y1)
        if (($x1 - $x0) -le 8 -or ($y1 - $y0) -le 8) { return $null }
        if (($Erase -and @($Erase).Count -gt 0) -or ($Keep -and @($Keep).Count -gt 0)) {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $white = [System.Drawing.Brushes]::White
            if ($Erase) {
                foreach ($r in @($Erase)) {
                    $ex0 = [math]::Max($x0, [int]$r.x0); $ex1 = [math]::Min($x1, [int]$r.x1)
                    $ey0 = [math]::Max($y0, [int]$r.y0); $ey1 = [math]::Min($y1, [int]$r.y1)
                    if ($ex1 -gt $ex0 -and $ey1 -gt $ey0) {
                        $g.FillRectangle($white, $ex0, $ey0, ($ex1 - $ex0), ($ey1 - $ey0))
                    }
                }
            }
            if ($Keep) {
                foreach ($k in @($Keep)) {
                    $ky0 = [math]::Max($y0, [int]$k.y0); $ky1 = [math]::Min($y1, [int]$k.y1)
                    if ($ky1 -le $ky0) { continue }
                    if ([int]$k.x0 -gt $x0) { $g.FillRectangle($white, $x0, $ky0, ([int]$k.x0 - $x0), ($ky1 - $ky0)) }
                    if ([int]$k.x1 -lt $x1) { $g.FillRectangle($white, [int]$k.x1, $ky0, ($x1 - [int]$k.x1), ($ky1 - $ky0)) }
                }
            }
            $g.Dispose()
        }
        $rw = $x1 - $x0 + 1; $rh = $y1 - $y0 + 1
        $rect = New-Object System.Drawing.Rectangle($x0, $y0, $rw, $rh)
        $crop = $bmp.Clone($rect, $bmp.PixelFormat)
        try {
            if (Test-Path $OutPath) { Remove-Item $OutPath -Force }
            $crop.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
            if ((Get-Item $OutPath).Length -gt $MaxBytes) {
                $bytes = ConvertTo-IndexedPng $crop
                if ($bytes) { [System.IO.File]::WriteAllBytes($OutPath, $bytes) }
            }
            if ((Get-Item $OutPath).Length -gt $MaxBytes) {
                $nw = [int]($rw * 0.85); $nh = [int]($rh * 0.85)
                if ($nw -gt 8 -and $nh -gt 8) {
                    $small = New-Object System.Drawing.Bitmap($nw, $nh)
                    $sg = [System.Drawing.Graphics]::FromImage($small)
                    $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                    $sg.DrawImage($crop, 0, 0, $nw, $nh)
                    $sg.Dispose()
                    Remove-Item $OutPath -Force
                    $small.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
                    $small.Dispose()
                }
            }
        }
        finally { $crop.Dispose() }
        return (Get-Item $OutPath).Length
    }
    finally { $bmp.Dispose() }
}

function ConvertTo-IndexedPng {
    param([System.Drawing.Bitmap]$src)
    try {
        $w = $src.Width; $h = $src.Height
        $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format8bppIndexed)
        $p = $bmp.Palette
        for ($k = 0; $k -lt 256; $k++) { $p.Entries[$k] = [System.Drawing.Color]::FromArgb(255, $k, $k, $k) }
        $bmp.Palette = $p
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $attrs = New-Object System.Drawing.Imaging.ImageAttributes
        $gm = New-Object System.Drawing.Imaging.ColorMatrix
        $gm.Matrix00 = 0.299; $gm.Matrix01 = 0.299; $gm.Matrix02 = 0.299
        $gm.Matrix10 = 0.587; $gm.Matrix11 = 0.587; $gm.Matrix12 = 0.587
        $gm.Matrix20 = 0.114; $gm.Matrix21 = 0.114; $gm.Matrix22 = 0.114
        $gm.Matrix33 = 1; $gm.Matrix44 = 1
        $attrs.SetColorMatrix($gm)
        $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
        $g.Dispose()
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $ms.ToArray()
        $ms.Dispose(); $bmp.Dispose(); $attrs.Dispose()
        return $bytes
    }
    catch { return $null }
}

function Save-Stitch {
    param([string[]]$Paths, [string]$OutPath, [int]$MaxBytes = 400000)
    $imgs = @()
    foreach ($p in $Paths) { $imgs += [System.Drawing.Image]::FromFile($p) }
    try {
        $w = 0; $h = 0
        foreach ($im in $imgs) { if ($im.Width -gt $w) { $w = $im.Width }; $h += $im.Height }
        if ($w -le 0 -or $h -le 0) { return $null }
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.Clear([System.Drawing.Color]::White)
            $y = 0
            foreach ($im in $imgs) { $g.DrawImage($im, 0, $y, $im.Width, $im.Height); $y += $im.Height }
            $g.Dispose()
            if (Test-Path $OutPath) { Remove-Item $OutPath -Force }
            $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
            if ((Get-Item $OutPath).Length -gt $MaxBytes) {
                $bytes = ConvertTo-IndexedPng $bmp
                if ($bytes) { [System.IO.File]::WriteAllBytes($OutPath, $bytes) }
            }
        }
        finally { $bmp.Dispose() }
        return (Get-Item $OutPath).Length
    }
    finally { foreach ($im in $imgs) { $im.Dispose() } }
}

# ---------------------------------------------------------------- bands & shapes
function Get-RangeBands($range) {
    $bands = New-Object System.Collections.Generic.List[object]
    $sp = [int]$range.startPage
    $lp = [int]$range.lastContentPage
    if ($lp -lt $sp) { $lp = $sp }
    for ($p = $sp; $p -le $lp; $p++) {
        $y0 = if ($p -eq $sp) { [double]$range.startY } else { 0.0 }
        $y1 = 99999.0
        if ($p -eq $lp -and $null -ne $range.endPage -and [int]$range.endPage -eq $p -and $null -ne $range.endY) {
            $y1 = [double]$range.endY
        }
        $bands.Add([ordered]@{ page = $p; y0 = $y0; y1 = $y1; no = 0 }) | Out-Null
    }
    return $bands
}

function Get-ShapeBoxes {
    param($shapes, $paras, $meta, $qBands, $aBands)
    $out = New-Object System.Collections.Generic.List[object]
    foreach ($s in $shapes) {
        if ([int]$s.para -le 0) { continue }
        if ([double]$s.top -lt -1000) { continue }
        $ap = $paras[[int]$s.para - 1]
        if (-not $ap) { continue }
        $pg = [int]$s.page
        if ($pg -le 0) { continue }
        $y0 = [double]$ap.y + [double]$s.top
        if ([int]$s.relV -eq 1) { $y0 = [double]$s.top }
        $x0 = [double]$meta.leftMargin + [double]$s.left
        if ([int]$s.relH -eq 1) { $x0 = [double]$s.left }
        $box = [ordered]@{
            page = $pg; x0 = [math]::Round($x0, 1); y0 = [math]::Round($y0, 1)
            x1 = [math]::Round($x0 + [double]$s.w, 1); y1 = [math]::Round($y0 + [double]$s.h, 1)
            owner = ''; ownerName = ''
        }
        $bestOv = 0.0; $bestOwner = ''; $bestName = ''
        foreach ($bb in $qBands) {
            if ([int]$bb.page -ne $pg) { continue }
            $ov = [math]::Min($box.y1, $bb.y1) - [math]::Max($box.y0, $bb.y0)
            if ($ov -gt $bestOv) { $bestOv = $ov; $bestOwner = ('q' + $bb.no); $bestName = ('第{0}题' -f $bb.no) }
        }
        foreach ($bb in $aBands) {
            if ([int]$bb.page -ne $pg) { continue }
            $ov = [math]::Min($box.y1, $bb.y1) - [math]::Max($box.y0, $bb.y0)
            if ($ov -gt $bestOv) { $bestOv = $ov; $bestOwner = ('a' + $bb.no); $bestName = ('第{0}题答案' -f $bb.no) }
        }
        if ($bestOv -gt 4) { $box.owner = $bestOwner; $box.ownerName = $bestName }
        $out.Add($box) | Out-Null
    }
    return $out
}

# ---------------------------------------------------------------- crop engine
function Get-CropRectsForRange {
    param($range, $limits, $pageFiles, $pageW, $meta, $shapeBoxes, $ownerKey, [double]$padTop = 3.0, [double]$padBot = 2.0)
    $rects = New-Object System.Collections.Generic.List[object]
    $sp = [int]$range.startPage
    $lp = [int]$range.lastContentPage
    if ($lp -lt $sp) { $lp = $sp }
    $own = @($shapeBoxes | Where-Object { $_.owner -eq $ownerKey })
    for ($p = $sp; $p -le $lp; $p++) {
        if (-not $pageFiles.ContainsKey($p)) { continue }
        $lim = $limits[$p]
        $sc = [double]$pageW[$p] / [double]$meta.pageWidth
        $bandY0 = if ($p -eq $sp) { [double]$range.startY - $padTop } else { $lim.topLimit / $sc }
        $bandY1 = $lim.bottomLimit / $sc
        if ($p -eq $lp -and $null -ne $range.endPage -and [int]$range.endPage -eq $p -and $null -ne $range.endY) {
            $bandY1 = [double]$range.endY - $padBot
        }
        $extY0 = $bandY0; $extY1 = $bandY1
        $ownThis = @($own | Where-Object { [int]$_.page -eq $p })
        foreach ($b in $ownThis) {
            # 只有图形真的越出题块边界时才扩展（否则会把上一行文字的下缘带进来）
            if (($bandY0 - [double]$b.y0) -gt 2) {
                if (([double]$b.y0 - 30) -lt $extY0) { $extY0 = [double]$b.y0 - 30 }
            }
            if (([double]$b.y1 - $bandY1) -gt 2) {
                if (([double]$b.y1 + 10) -gt $extY1) { $extY1 = [double]$b.y1 + 10 }
            }
        }
        $y0 = [int]($extY0 * $sc)
        if ($p -ne $sp) { $y0 = [math]::Min($lim.topLimit, $y0) }
        $y1 = [math]::Min($lim.bottomLimit, [int]($extY1 * $sc))
        if ($y1 -le $y0) { continue }
        $rect = [ordered]@{ page = $p; x0 = 8; x1 = [int]($pageW[$p]) - 8; y0 = $y0; y1 = $y1; erase = @(); keep = @() }
        foreach ($b in $shapeBoxes) {
            if ([int]$b.page -ne $p -or $b.owner -eq $ownerKey -or $b.owner -eq '') { continue }
            $ex0 = [int](([double]$b.x0 - 30) * $sc); $ex1 = [int](([double]$b.x1 + 30) * $sc)
            $ey0 = [int](([double]$b.y0 - 8) * $sc); $ey1 = [int](([double]$b.y1 + 8) * $sc)
            if ($ex1 -le $rect.x0 -or $ex0 -ge $rect.x1 -or $ey1 -le $rect.y0 -or $ey0 -ge $rect.y1) { continue }
            $rect.erase += , ([ordered]@{ x0 = $ex0; y0 = $ey0; x1 = $ex1; y1 = $ey1 })
        }
        $bandTopPx = [int]($bandY0 * $sc)
        $bandBotPx = [int]($bandY1 * $sc)
        if ($rect.y0 -lt $bandTopPx - 2 -and $ownThis.Count -gt 0) {
            $kx0 = 99999.0; $kx1 = -1.0
            foreach ($b in $ownThis) { $kx0 = [math]::Min($kx0, [double]$b.x0 - 30); $kx1 = [math]::Max($kx1, [double]$b.x1 + 30) }
            $rect.keep += , ([ordered]@{ y0 = $rect.y0; y1 = $bandTopPx; x0 = [int]($kx0 * $sc); x1 = [int]($kx1 * $sc) })
        }
        if ($rect.y1 -gt $bandBotPx + 2 -and $ownThis.Count -gt 0) {
            $kx0 = 99999.0; $kx1 = -1.0
            foreach ($b in $ownThis) { $kx0 = [math]::Min($kx0, [double]$b.x0 - 30); $kx1 = [math]::Max($kx1, [double]$b.x1 + 30) }
            $rect.keep += , ([ordered]@{ y0 = $bandBotPx; y1 = $rect.y1; x0 = [int]($kx0 * $sc); x1 = [int]($kx1 * $sc) })
        }
        $rects.Add($rect) | Out-Null
    }
    return $rects
}

function Invoke-Crops {
    param([string]$packId, $questions, $pageFiles, $meta, [string]$imgOut, $shapeBoxes)
    $an = New-Object System.Collections.Generic.List[string]
    New-Item -ItemType Directory -Force -Path $imgOut | Out-Null
    $profiles = @{}; $limits = @{}; $pageW = @{}
    foreach ($k in $pageFiles.Keys) {
        $pr = Get-PageProfile ([string]$pageFiles[$k])
        $profiles[$k] = $pr
        $sc = [double]$pr.w / [double]$meta.pageWidth
        $limits[$k] = Get-PageLimits -profile $pr -Scale $sc -meta $meta
        $pageW[$k] = $pr.w
    }
    $footerErase = @{}
    foreach ($k in $pageFiles.Keys) {
        $footerErase[$k] = @(Get-FooterEraseRects -PngPath ([string]$pageFiles[$k]) -profile $profiles[$k] -Scale ([double]$pageW[$k] / [double]$meta.pageWidth) -meta $meta)
    }
    foreach ($rec in $questions) {
        $rn = [int]$rec.no
        $rects = @()
        if ($rec.extraRanges) { foreach ($er in @($rec.extraRanges)) { $rects += @(Get-CropRectsForRange -range $er -limits $limits -pageFiles $pageFiles -pageW $pageW -meta $meta -shapeBoxes $shapeBoxes -ownerKey ('q' + $rn)) } }
        $rects += @(Get-CropRectsForRange -range $rec.range -limits $limits -pageFiles $pageFiles -pageW $pageW -meta $meta -shapeBoxes $shapeBoxes -ownerKey ('q' + $rn))
        $names = @()
        if ($rects.Count -eq 1) { $names += ("q{0:d2}.png" -f $rn) }
        elseif ($rects.Count -gt 1) { for ($k = 0; $k -lt $rects.Count; $k++) { $names += ("q{0:d2}_{1}.png" -f $rn, ($k + 1)) } }
        $got = @()
        for ($k = 0; $k -lt $rects.Count; $k++) {
            $r = $rects[$k]
            $outPath = Join-Path $imgOut $names[$k]
            $er = @($r.erase)
            if ($footerErase[$r.page]) { $er += @($footerErase[$r.page]) }
            $sz = Save-Crop -PagePath $pageFiles[$r.page] -x0 $r.x0 -y0 $r.y0 -x1 $r.x1 -y1 $r.y1 -OutPath $outPath -Erase $er -Keep $r.keep
            if ($sz) { $got += ("图片/$packId/" + $names[$k]) }
        }
        $rec.askImg = $got
        if ($got.Count -eq 0) { $an.Add(("第{0}题原题裁图失败" -f $rn)) }
        if ($rects.Count -gt 1) {
            $stitchPath = Join-Path $imgOut ("q{0:d2}.png" -f $rn)
            $st = Save-Stitch -Paths @($got | ForEach-Object { Join-Path (Split-Path $imgOut -Parent) ($_ -replace '^图片/', '') }) -OutPath $stitchPath
            if ($st) {
                $rec.askImg = @("图片/$packId/" + ("q{0:d2}.png" -f $rn))
                $an.Add(("第{0}题跨页（共{1}页）：已出 q{0:d2}_1..q{0:d2}_{1}.png 并竖向合成 q{0:d2}.png 单图" -f $rn, $rects.Count))
            }
            else { $an.Add(("第{0}题跨页（跨{1}页），已拆成{1}张" -f $rn, $rects.Count)) }
        }
        if ($rec.ansRange) {
            $wantsAns = (-not $rec.isChoice) -or ($rec.answerText -match '详解') -or ([string]$rec.answerText).Length -gt 8
            if ($wantsAns) {
                $arects = @(Get-CropRectsForRange -range $rec.ansRange -limits $limits -pageFiles $pageFiles -pageW $pageW -meta $meta -shapeBoxes $shapeBoxes -ownerKey ('a' + $rn))
                $anames = @()
                if ($arects.Count -eq 1) { $anames += ("q{0:d2}-a.png" -f $rn) }
                elseif ($arects.Count -gt 1) { for ($k = 0; $k -lt $arects.Count; $k++) { $anames += ("q{0:d2}-a_{1}.png" -f $rn, ($k + 1)) } }
                $agot = @()
                for ($k = 0; $k -lt $arects.Count; $k++) {
                    $r = $arects[$k]
                    $outPath = Join-Path $imgOut $anames[$k]
                    $er2 = @($r.erase)
                    if ($footerErase[$r.page]) { $er2 += @($footerErase[$r.page]) }
                    $sz = Save-Crop -PagePath $pageFiles[$r.page] -x0 $r.x0 -y0 $r.y0 -x1 $r.x1 -y1 $r.y1 -OutPath $outPath -Erase $er2 -Keep $r.keep
                    if ($sz) { $agot += ("图片/$packId/" + $anames[$k]) }
                }
                $rec.ansImg = $agot
                if ($arects.Count -gt 1) {
                    $astitch = Join-Path $imgOut ("q{0:d2}-a.png" -f $rn)
                    $ast = Save-Stitch -Paths @($agot | ForEach-Object { Join-Path (Split-Path $imgOut -Parent) ($_ -replace '^图片/', '') }) -OutPath $astitch
                    if ($ast) {
                        $rec.ansImg = @("图片/$packId/" + ("q{0:d2}-a.png" -f $rn))
                        $an.Add(("第{0}题答案跨页（共{1}页）：已出 q{0:d2}-a_1..q{0:d2}-a_{1}.png 并竖向合成 q{0:d2}-a.png" -f $rn, $arects.Count))
                    }
                    else { $an.Add(("第{0}题答案跨页（跨{1}页），已拆成{1}张" -f $rn, $arects.Count)) }
                }
            }
        }
        if (-not $rec.isChoice -and -not $rec.ansRange -and -not $rec.ansInferred) { $an.Add(("第{0}题没有答案裁图" -f $rn)) }
    }
    return $an
}

function Invoke-TrimPack {
    # 去掉裁图四周多余白边（阈值 246 近纯白，保留 10px 白边）；答案图同样处理
    param([string]$Dir, [int]$Threshold = 246, [int]$Pad = 10)
    if (-not (Test-Path $Dir)) { return 0 }
    $n = 0
    foreach ($f in (Get-ChildItem -Path $Dir -Filter '*.png')) {
        $img = $null; $crop = $null
        try {
            $img = [System.Drawing.Bitmap]::new($f.FullName)
            $w = $img.Width; $h = $img.Height
            $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
            $data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $stride = $data.Stride
            $bytes = New-Object byte[] ($stride * $h)
            [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
            $img.UnlockBits($data)
            $minY = -1; $maxY = -1
            for ($y = 0; $y -lt $h; $y++) {
                $row = $y * $stride
                $has = $false
                for ($x = 0; $x -lt $w; $x++) {
                    $i = $row + $x * 4
                    if ($bytes[$i] -lt $Threshold -or $bytes[$i + 1] -lt $Threshold -or $bytes[$i + 2] -lt $Threshold) { $has = $true; break }
                }
                if ($has) { if ($minY -lt 0) { $minY = $y }; $maxY = $y }
            }
            if ($maxY -lt 0) { continue }
            $minX = $w; $maxX = -1
            for ($x = 0; $x -lt $w; $x++) {
                for ($y = $minY; $y -le $maxY; $y++) {
                    $i = $y * $stride + $x * 4
                    if ($bytes[$i] -lt $Threshold -or $bytes[$i + 1] -lt $Threshold -or $bytes[$i + 2] -lt $Threshold) {
                        if ($x -lt $minX) { $minX = $x }
                        if ($x -gt $maxX) { $maxX = $x }
                        break
                    }
                }
            }
            $x1 = [math]::Max(0, $minX - $Pad); $y1 = [math]::Max(0, $minY - $Pad)
            $x2 = [math]::Min($w - 1, $maxX + $Pad); $y2 = [math]::Min($h - 1, $maxY + $Pad)
            $nw = $x2 - $x1 + 1; $nh = $y2 - $y1 + 1
            if ($nw -lt 200 -or $nh -lt 40) { continue }
            if (($nw * $nh) -gt ($w * $h * 0.97)) { continue }
            $crop = $img.Clone((New-Object System.Drawing.Rectangle($x1, $y1, $nw, $nh)), $img.PixelFormat)
            $img.Dispose(); $img = $null
            $crop.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
            $n++
        }
        catch { }
        finally {
            if ($crop) { $crop.Dispose() }
            if ($img) { $img.Dispose() }
        }
    }
    return $n
}

Add-Type -AssemblyName ReachFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# =====================================================================
#  stage: crop only (from geom json, no Word)
# =====================================================================
if ($RecropOnly) {
    $geomFiles = @()
    if ($Only) { $geomFiles = @(Get-ChildItem $GeomDir -Filter '*.json' | Where-Object { $_.BaseName -eq $Only }) }
    elseif ($Docx -and $Docx.Count -gt 0) {
        $geomFiles = @($Docx | ForEach-Object { Join-Path $GeomDir ((Get-PackId $_) + '.json') } | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ })
    }
    else { $geomFiles = @(Get-ChildItem $GeomDir -Filter '*.json' | Where-Object { $_.Name -notlike '*.paras.json' } | Sort-Object Name) }
    foreach ($gf in $geomFiles) {
        $g = Get-Content $gf.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $packId = [string]$g.packId
        $pageDir2 = Join-Path $PageDir $packId
        $pageFiles = @{}
        Get-ChildItem $pageDir2 -Filter 'page*.png' | ForEach-Object { $pageFiles[[int]($_.BaseName -replace '\D', '')] = $_.FullName }
        if ($pageFiles.Count -eq 0) { Write-Host "!! $packId 没有页面 PNG，跳过"; continue }
        Write-Host "=== recrop $packId ($($g.questions.Count) 题, $($pageFiles.Count) 页)"
        $an = @(Invoke-Crops -packId $packId -questions $g.questions -pageFiles $pageFiles -meta $g.meta -imgOut (Join-Path $ImgRoot $packId) -shapeBoxes $g.shapeBoxes)
        $trimCount = Invoke-TrimPack -Dir (Join-Path $ImgRoot $packId)
        Write-Host ("    去白边 {0} 张" -f $trimCount)
        $g.anomalies = @(@($g.anomalies) | Where-Object { $_ -notmatch '裁图|跨页' }) + $an
        Save-Utf8 $gf.FullName (ConvertTo-JsonText $g)
        foreach ($a in $an) { Write-Host ("      ! " + $a) }
    }
    Write-Host "recrop done."
    return
}

# =====================================================================
#  stage: text/boundaries (+ render) per docx
# =====================================================================
if ($Stage -eq 'all' -or $Stage -eq 'text') {
    if (-not $Docx -or $Docx.Count -eq 0) {
        $Docx = @(Get-ChildItem -Path $SrcDir -Filter *.docx | Where-Object { $_.Name -notlike '~$*' } | Sort-Object Name | ForEach-Object { $_.FullName })
    }
    if ($Only) {
        $Docx = @($Docx | Where-Object { (Get-PackId $_) -eq $Only -or [System.IO.Path]::GetFileNameWithoutExtension($_) -like "*$Only*" })
    }
    $sum = New-Object System.Collections.Generic.List[object]

    foreach ($docxPath in $Docx) {
        $file = [System.IO.Path]::GetFileName($docxPath)
        $packId = Get-PackId $file
        if (-not $packId) { continue }
        Write-Host "=== $file -> $packId"
        $xpsPath = Join-Path $XpsDir ($packId + '.xps')
        $pageOut = Join-Path $PageDir $packId
        $imgOut = Join-Path $ImgRoot $packId
        New-Item -ItemType Directory -Force -Path $imgOut | Out-Null

        $xml = Read-Docx $docxPath
        $geom = Get-WordGeom -Path $docxPath -XpsPath $xpsPath -NoXps:$SkipXps
        $meta = $geom.meta
        $paras = $geom.paras

        $pages = @()
        if (-not $SkipRender -and -not $SkipXps) {
            $pages = Convert-XpsToPng -XpsPath $xpsPath -OutDir $pageOut -Scale $Scale
        }
        elseif (Test-Path $pageOut) {
            $pages = @(Get-ChildItem $pageOut -Filter 'page*.png' | Sort-Object Name | ForEach-Object {
                    [ordered]@{ page = [int]($_.BaseName -replace '\D', ''); file = $_.FullName; w = 0; h = 0 }
                })
        }
        $pageFiles = @{}
        foreach ($pg in $pages) { $pageFiles[[int]$pg.page] = [string]$pg.file }

        $ansStart = -1
        for ($k = 1; $k -le $paras.Count; $k++) {
            if ((Normalize-Text $paras[$k - 1].text) -match '参考答案') { $ansStart = $k; break }
        }
        $surveyEnd = if ($ansStart -gt 0) { $ansStart - 1 } else { $paras.Count }

        $qBlocks = @(Get-Blocks -paras $paras -fromIdx 1 -toIdx $surveyEnd)
        $aBlocks = @()
        if ($ansStart -gt 0) { $aBlocks = @(Get-Blocks -paras $paras -fromIdx $ansStart -toIdx $paras.Count) }
        $choiceTb = Get-AnswerTable $geom.tables
        $anomalies = New-Object System.Collections.Generic.List[string]

        $xmlP = New-Object System.Collections.Generic.List[object]
        for ($k = 1; $k -le $xml.paras.Count; $k++) { $xmlP.Add([ordered]@{ i = $k; text = $xml.paras[$k - 1] }) }
        $allXml = @(Get-Blocks -paras $xmlP -fromIdx 1 -toIdx $xmlP.Count)
        $xmlSurvey = @{}; $xmlAnswer = @{}
        $xmlAnsStart = 0
        for ($k = 1; $k -le $xml.paras.Count; $k++) {
            if ((Normalize-Text $xml.paras[$k - 1]) -match '参考答案') { $xmlAnsStart = $k; break }
        }
        foreach ($b in $allXml) {
            if ($xmlAnsStart -gt 0 -and $b.startIdx -ge $xmlAnsStart) { $xmlAnswer[[int]$b.no] = $b }
            else { $xmlSurvey[[int]$b.no] = $b }
        }

        function Get-BlockRange($block) {
            $sp = $paras[$block.startIdx - 1]
            $endIdx = $block.endIdx
            $ep = $null; $ey = $null
            if ($endIdx -le $paras.Count) {
                $ep = [int]$paras[$endIdx - 1].page
                $ey = [double]$paras[$endIdx - 1].y
            }
            $lastPage = [int]$sp.page
            for ($k = $block.startIdx; $k -lt $block.endIdx -and $k -le $paras.Count; $k++) {
                if (-not $paras[$k - 1].blank) { $lastPage = [int]$paras[$k - 1].page }
            }
            return [pscustomobject]@{ startPage = [int]$sp.page; startY = [double]$sp.y; endPage = $ep; endY = $ey; lastContentPage = $lastPage }
        }

        # 个别题的原图在上一块（与上一题共用图行），用段落号硬指定一段额外区域，出 qNN_1.png
        $AskExtra = @{}
        $qRecords = New-Object System.Collections.Generic.List[object]
        foreach ($b in $qBlocks) {
            $no = [int]$b.no
            $xb = $xmlSurvey[$no]
            $texts = @()
            if ($xb) {
                for ($k = $xb.startIdx; $k -lt $xb.endIdx -and $k -le $xmlP.Count; $k++) { $texts += $xmlP[$k - 1].text }
            }
            else {
                for ($k = $b.startIdx; $k -lt $b.endIdx -and $k -le $paras.Count; $k++) { $texts += $paras[$k - 1].text }
            }
            $so = Get-StemAndOpts $texts
            $isChoice = $choiceTb.map.ContainsKey($no)
            $group = if ($isChoice) { '选择' } elseif ($b.group) { $b.group } else { '非选择' }
            $key = if ($isChoice) { [string]$choiceTb.map[[int]$no] } else { '' }
            $ab = $null
            foreach ($cand in $aBlocks) { if ([int]$cand.no -eq $no) { $ab = $cand; break } }
            $ansTexts = @()
            if ($ab) {
                $xab = $xmlAnswer[$no]
                if ($xab) {
                    for ($k = $xab.startIdx; $k -lt $xab.endIdx -and $k -le $xmlP.Count; $k++) { $ansTexts += $xmlP[$k - 1].text }
                }
                else {
                    for ($k = $ab.startIdx; $k -lt $ab.endIdx -and $k -le $paras.Count; $k++) { $ansTexts += $paras[$k - 1].text }
                }
            }
            $ansText = ''
            if ($ansTexts.Count -gt 0) {
                $clean = @()
                foreach ($t in $ansTexts) { $c = Clean-Markers (Normalize-Text $t); if ($c.Trim().Length -gt 0) { $clean += $c.Trim() } }
                $ansText = ($clean -join "`n")
                $ansText = $ansText -replace ('^{0}\s*[．.]\s*' -f $no), ''
            }
            $rec = [ordered]@{
                no = $no; group = $group; isChoice = $isChoice
                guessType = (Get-GuessType -askText $so.stem -answerText $ansText -isChoice $isChoice)
                askText = $so.stem; opts = @($so.opts)
                answerKey = $key; answerText = $ansText
                section = $b.section
                askImg = @(); ansImg = @()
                range = (Get-BlockRange $b)
                extraRanges = @()
                ansRange = $null
                hasAnswerBlock = ($ab -ne $null)
                ansInferred = $false
            }
            if ($ab) { $rec.ansRange = (Get-BlockRange $ab) }
            if ($AskExtra.ContainsKey($packId) -and $AskExtra[$packId].ContainsKey($no)) {
                foreach ($ex in @($AskExtra[$packId][$no])) {
                    $pA = $paras[[int]$ex.from - 1]
                    $pB = $paras[[int]$ex.to - 1]
                    $rec.extraRanges += [pscustomobject]@{
                        startPage = [int]$pA.page; startY = [double]$pA.y
                        endPage = [int]$pB.page; endY = [double]$pB.y; lastContentPage = [int]$pA.page
                    }
                }
            }
            $qRecords.Add($rec)
        }

        # 图注「第N题」：原卷把图放在题号上方（图行 + 图注 + 题号），图实际属于第 N 题
        $figureRows = New-Object System.Collections.Generic.List[object]
        for ($k = 2; $k -le $surveyEnd; $k++) {
            $tt = Normalize-Text $paras[$k - 1].text
            if ($tt.Length -gt 60) { continue }
            $caps = [regex]::Matches($tt, '第\s*(\d{1,2})\s*题')
            if ($caps.Count -eq 0) { continue }
            $imgIdx = -1
            for ($j = $k - 1; $j -ge [math]::Max(1, $k - 3); $j--) {
                if ($paras[$j - 1].blank) { $imgIdx = $j; break }
            }
            if ($imgIdx -lt 0) { continue }
            $nos = @()
            foreach ($cm in $caps) { $nos += [int]$cm.Groups[1].Value }
            $figureRows.Add([ordered]@{ page = [int]$paras[$imgIdx - 1].page; y0 = [double]$paras[$imgIdx - 1].y; nos = $nos }) | Out-Null
        }
        foreach ($rec in $qRecords) {
            foreach ($fr in $figureRows) {
                if ($fr.nos -notcontains [int]$rec.no) { continue }
                if ([int]$fr.page -ne [int]$rec.range.startPage) { continue }
                if ([double]$fr.y0 -ge [double]$rec.range.startY) { continue }
                if (([double]$rec.range.startY - [double]$fr.y0) -gt 260) { continue }
                $rec.range = [pscustomobject]@{
                    startPage = [int]$fr.page; startY = [double]$fr.y0
                    endPage = $rec.range.endPage; endY = $rec.range.endY
                    lastContentPage = $rec.range.lastContentPage
                }
                $anomalies.Add(("第{0}题的图在题号上方（图注「第{0}题」），已把该图并入本题裁图" -f $rec.no))
                break
            }
        }

        $surveyNos = @{}
        foreach ($rec in $qRecords) { $surveyNos[[int]$rec.no] = $true }
        foreach ($o in $aBlocks) { if (-not $surveyNos.ContainsKey([int]$o.no)) { $anomalies.Add(("参考答案里出现题号 {0}，问卷里没有，已忽略" -f $o.no)) } }

        $prevRec = $null
        foreach ($rec in $qRecords) {
            if ($rec.hasAnswerBlock) { $prevRec = $rec; continue }
            if ($rec.isChoice) { continue }
            if ($prevRec -and $null -ne $prevRec.ansRange) {
                $srcBlk = $null
                foreach ($cand in $aBlocks) { if ([int]$cand.no -eq [int]$prevRec.no) { $srcBlk = $cand; break } }
                $splitIdx = 0
                if ($srcBlk -and ($srcBlk.endIdx - $srcBlk.startIdx) -ge 3) { $splitIdx = $srcBlk.startIdx + 1 }
                if ($splitIdx -gt 0) {
                    $p0 = $paras[$splitIdx - 1]
                    $oldEnd = $prevRec.ansRange
                    $rec.ansRange = [pscustomobject]@{
                        startPage = [int]$p0.page; startY = [double]$p0.y
                        endPage = $oldEnd.endPage; endY = $oldEnd.endY; lastContentPage = $oldEnd.lastContentPage
                    }
                    $prevRec.ansRange = [pscustomobject]@{
                        startPage = [int]$oldEnd.startPage; startY = [double]$oldEnd.startY
                        endPage = [int]$p0.page; endY = [double]$p0.y; lastContentPage = [int]$oldEnd.startPage
                    }
                    $txts = @()
                    for ($k = $splitIdx; $k -lt $srcBlk.endIdx -and $k -le $paras.Count; $k++) {
                        $cc = Clean-Markers (Normalize-Text $paras[$k - 1].text)
                        if ($cc.Trim().Length -gt 0) { $txts += $cc.Trim() }
                    }
                    $rec.answerText = ($txts -join "`n")
                    $firstTxt = Clean-Markers (Normalize-Text $paras[$srcBlk.startIdx - 1].text)
                    $firstTxt = ($firstTxt -replace ('^{0}\s*[．.]\s*' -f $prevRec.no), '').Trim()
                    if ($firstTxt) { $prevRec.answerText = $firstTxt }
                    $rec.ansInferred = $true
                    $anomalies.Add(("第{0}题答案段没有题号，已按行从第{1}题答案段切开（请人工核对）" -f $rec.no, $prevRec.no))
                }
                else {
                    $rec.ansRange = $prevRec.ansRange
                    $rec.answerText = $prevRec.answerText
                    $rec.ansInferred = $true
                    $anomalies.Add(("第{0}题答案段没有题号，已并入第{1}题的答案裁图（请人工核对）" -f $rec.no, $prevRec.no))
                }
            }
            else { $anomalies.Add(("第{0}题未找到答案段" -f $rec.no)) }
        }

        $qBands = New-Object System.Collections.Generic.List[object]
        foreach ($rec in $qRecords) { foreach ($bd in @(Get-RangeBands $rec.range)) { $bd.no = [int]$rec.no; $qBands.Add($bd) | Out-Null } }
        $aBands = New-Object System.Collections.Generic.List[object]
        foreach ($rec in $qRecords) {
            if ($rec.ansRange) { foreach ($bd in @(Get-RangeBands $rec.ansRange)) { $bd.no = [int]$rec.no; $aBands.Add($bd) | Out-Null } }
        }
        $shapeBoxes = @(Get-ShapeBoxes -shapes $geom.shapes -paras $paras -meta $meta -qBands $qBands -aBands $aBands)
        $unowned = @($shapeBoxes | Where-Object { $_.owner -eq '' })
        if ($unowned.Count -gt 0) { $anomalies.Add(("有 {0} 个浮动图形未能归到某题（未参与边界扩展）" -f $unowned.Count)) }

        $title = ''
        if ($ansStart -gt 0) {
            $h = Normalize-Text $paras[$ansStart - 1].text
            $m = [regex]::Match($h, '《[^》]*》')
            if ($m.Success) { $title = $m.Value.Trim('《', '》') }
            else { $title = (($h -replace '参考答案', '') -replace '⟦[^⟧]*⟧', '').Trim() }
        }
        if (-not $title) {
            for ($k = 1; $k -le [math]::Min(4, $paras.Count); $k++) {
                $t = ((Clean-Markers (Normalize-Text $paras[$k - 1].text)) -replace '⟦[^⟧]*⟧', '').Trim()
                if ($t.Length -ge 2 -and $t -notmatch '^姓名' -and $t -notmatch '单选题|选择题') { $title = $t; break }
            }
        }

        $outObj = [ordered]@{
            packId = $packId; file = $file; title = $title; pages = $pages.Count
            meta = $meta; anomalies = $anomalies.ToArray()
            questions = $qRecords.ToArray()
            shapeBoxes = $shapeBoxes
            answerBlocks = @($aBlocks | ForEach-Object { [ordered]@{ no = [int]$_.no; startIdx = $_.startIdx; endIdx = $_.endIdx } })
            answerTable = $choiceTb.map
        }
        Save-Utf8 (Join-Path $GeomDir ($packId + '.json')) (ConvertTo-JsonText $outObj)
        Save-Utf8 (Join-Path $GeomDir ($packId + '.paras.json')) (ConvertTo-JsonText ([ordered]@{ paras = $paras; shapes = $geom.shapes; tables = $geom.tables; xmlParas = $xml.paras; xmlTables = $xml.tables }))

        $nChoice = @($qRecords | Where-Object { $_.isChoice }).Count
        Write-Host ("    页数={0} 题数={1} 选择={2} 非选择={3} 异常={4}" -f $pages.Count, $qRecords.Count, $nChoice, ($qRecords.Count - $nChoice), $anomalies.Count)
        foreach ($a in $anomalies) { Write-Host ("      ! " + $a) }

        if (-not $SkipCrop) {
            $ca = @(Invoke-Crops -packId $packId -questions $qRecords -pageFiles $pageFiles -meta $meta -imgOut $imgOut -shapeBoxes $shapeBoxes)
            foreach ($a in $ca) { $anomalies.Add($a) }
            $trimCount = Invoke-TrimPack -Dir $imgOut
            Write-Host ("    去白边 {0} 张" -f $trimCount)
            $outObj.questions = $qRecords.ToArray()
            $outObj.anomalies = $anomalies.ToArray()
            Save-Utf8 (Join-Path $GeomDir ($packId + '.json')) (ConvertTo-JsonText $outObj)
            foreach ($a in $ca) { Write-Host ("      ! " + $a) }
        }
        $sum.Add([ordered]@{ packId = $packId; questions = $qRecords.Count; choice = $nChoice; anomalies = $anomalies.Count })
    }
    Write-Host ""
    foreach ($s in $sum) { Write-Host ("  {0,-8} 题={1} 选择={2} 异常={3}" -f $s.packId, $s.questions, $s.choice, $s.anomalies) }
}

# =====================================================================
#  stage: raw json / md / index  (from geom json)
# =====================================================================
if ($Stage -eq 'all' -or $Stage -eq 'raw') {
    $geomFiles = @(Get-ChildItem $GeomDir -Filter '*.json' | Where-Object { $_.Name -notlike '*.paras.json' } | Sort-Object Name)
    $indexPacks = @()
    $totalQ = 0; $totalImg = 0
    foreach ($gf in $geomFiles) {
        $g = Get-Content $gf.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $packId = [string]$g.packId
        $qs = @()
        foreach ($rec in $g.questions) {
            $qs += [ordered]@{
                no = [int]$rec.no
                group = [string]$rec.group
                guessType = [string]$rec.guessType
                askText = [string]$rec.askText
                opts = @($rec.opts)
                answerKey = [string]$rec.answerKey
                answerText = [string]$rec.answerText
                askImg = @($rec.askImg)
                ansImg = @($rec.ansImg)
            }
        }
        $nChoice = @($g.questions | Where-Object { $_.isChoice }).Count
        $week = 0
        $wm = [regex]::Match($packId, 'w(\d+)')
        if ($wm.Success) { $week = [int]$wm.Groups[1].Value }
        $choiceKey = [ordered]@{}
        foreach ($rec in $g.questions) { if ([string]$rec.answerKey) { $choiceKey[[string]$rec.no] = [string]$rec.answerKey } }
        $packObj = [ordered]@{
            packId = $packId; week = $week; file = [string]$g.file; title = [string]$g.title
            pages = [int]$g.pages; choiceKey = $choiceKey; questions = $qs
        }
        Save-Utf8 (Join-Path $RawDir ($packId + '.json')) (ConvertTo-JsonText $packObj)

        $md = New-Object System.Text.StringBuilder
        [void]$md.AppendLine("# $packId · $($g.title)")
        [void]$md.AppendLine("")
        [void]$md.AppendLine(("- 来源：题库/{0}　页数：{1}　题数：{2}（选择 {3} / 非选择 {4}）" -f $g.file, $g.pages, $g.questions.Count, $nChoice, ($g.questions.Count - $nChoice)))
        if (@($g.anomalies).Count -gt 0) {
            [void]$md.AppendLine("")
            [void]$md.AppendLine("## 异常 / 待人工核对")
            foreach ($a in $g.anomalies) { [void]$md.AppendLine("- $a") }
        }
        [void]$md.AppendLine("")
        $letters = @('A', 'B', 'C', 'D')
        foreach ($rec in $g.questions) {
            [void]$md.AppendLine(("## 第{0}题 · {1} · {2}" -f $rec.no, $rec.group, $rec.guessType))
            [void]$md.AppendLine("")
            [void]$md.AppendLine('```')
            [void]$md.AppendLine([string]$rec.askText)
            [void]$md.AppendLine('```')
            if (@($rec.opts).Count -gt 0) {
                [void]$md.AppendLine("")
                for ($oi = 0; $oi -lt @($rec.opts).Count; $oi++) {
                    $lt = if ($oi -lt $letters.Count) { $letters[$oi] } else { '?' }
                    [void]$md.AppendLine(("- {0}．{1}" -f $lt, $rec.opts[$oi]))
                }
            }
            [void]$md.AppendLine("")
            if ($rec.answerKey) { [void]$md.AppendLine(("- 答案：**{0}**" -f $rec.answerKey)) }
            if ($rec.answerText) {
                [void]$md.AppendLine("- 答案原文：")
                foreach ($ln in ([string]$rec.answerText -split "`n")) { [void]$md.AppendLine(("  > " + $ln)) }
            }
            if (@($rec.askImg).Count -gt 0) { [void]$md.AppendLine(("- 原题图：{0}" -f (@($rec.askImg) -join ', '))) }
            if (@($rec.ansImg).Count -gt 0) { [void]$md.AppendLine(("- 答案图：{0}" -f (@($rec.ansImg) -join ', '))) }
            [void]$md.AppendLine("")
        }
        Save-Utf8 (Join-Path $RawDir ($packId + '.md')) $md.ToString()

        $imgCount = 0
        foreach ($rec in $g.questions) { $imgCount += @($rec.askImg).Count + @($rec.ansImg).Count }
        $totalQ += $g.questions.Count; $totalImg += $imgCount
        $indexPacks += [ordered]@{
            packId = $packId; title = [string]$g.title; file = [string]$g.file
            pages = [int]$g.pages
            questions = [int]$g.questions.Count
            choiceCount = $nChoice
            nonChoiceCount = ([int]$g.questions.Count - $nChoice)
            questionNos = @($g.questions | ForEach-Object { [int]$_.no })
            imageCount = $imgCount
            anomalies = @($g.anomalies)
        }
    }
    $index = [ordered]@{ generated = (Get-Date).ToString('s'); totals = [ordered]@{ packs = $indexPacks.Count; questions = $totalQ; images = $totalImg }; packs = $indexPacks }
    Save-Utf8 (Join-Path $RawDir 'index.json') (ConvertTo-JsonText $index)
    Write-Host ""
    Write-Host ("raw/index done: {0} packs, {1} questions, {2} images" -f $indexPacks.Count, $totalQ, $totalImg)
}
