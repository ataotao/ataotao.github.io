#!/usr/bin/env bash
# 组装站点到 _site/。白名单来自退役的 tools/publish.ps1（$Jobs 表）。
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
rm -rf "$OUT"; mkdir -p "$OUT"

# ---------- 英语工程 → 站点根（vite base 写死 '/'，必须在根） ----------
cp -r apps/english/dist/. "$OUT"/

# ---------- 训练器 → 1/ ----------
mkdir -p "$OUT/1"
pub() {  # pub <源> <目标相对1/的路径>
  [ -f "$1" ] || { echo "缺失源文件：$1" >&2; exit 1; }
  mkdir -p "$OUT/1/$(dirname "$2")"
  cp "$1" "$OUT/1/$2"
}
pub 开始.html index.html          # 站点首页
pub 开始.html 开始.html           # 各科 ../开始.html 的落点
pub 道德与法治/核心考点训练.html 道德与法治/核心考点训练.html
pub 公式记背/公式记背.html       公式记背/公式记背.html
pub 化学/化学思维脚手架.html     化学/化学思维脚手架.html
pub 化学/化学闪练卡.html         化学/化学闪练卡.html
pub 历史/核心考点训练.html       历史/核心考点训练.html
pub 数学/函数思维脚手架.html     数学/函数思维脚手架.html
pub 数学/今晚急救包.html         数学/今晚急救包.html
pub 数学/坐标图象训练.html       数学/坐标图象训练.html
pub 数学/数学闪练卡.html         数学/数学闪练卡.html
pub 数学/错题本.html             数学/错题本.html
pub 物理/物理思维脚手架.html     物理/物理思维脚手架.html
pub 物理/物理闪练卡.html         物理/物理闪练卡.html
pub 英语/九上英语过关练习.html   英语/九上英语过关练习.html
pub 英语/语法闪练.html           英语/语法闪练.html
pub 语文/语文思维脚手架.html     语文/语文思维脚手架.html

# ---------- 目录型资源（按扩展名筛选） ----------
copydir() {  # copydir <源目录> <目标相对1/的路径> <扩展名>
  local src="$1" dst="$OUT/1/$2" ext="$3" n=0
  [ -d "$src" ] || { echo "缺失源目录：$src" >&2; exit 1; }
  while IFS= read -r -d '' f; do
    mkdir -p "$dst/$(dirname "${f#"$src"/}")"
    cp "$f" "$dst/${f#"$src"/}"
    n=$((n+1))
  done < <(find "$src" -type f -name "*$ext" -print0)
  echo "  $2: $n 个 $ext"
  [ "$n" -gt 0 ] || { echo "目录里没有 $ext：$src" >&2; exit 1; }
}
copydir 道德与法治/images        道德与法治/images        .webp
copydir 历史/images/试卷          历史/images/试卷          .webp
copydir 数学/题库/packs           数学/题库/packs           .js
copydir 物理/图片                 物理/图片                .png

echo "组装完成：$(find "$OUT" -type f | wc -l) 个文件"
