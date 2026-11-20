"""数学闪练卡「本周错题」的原题裁切图 → 数学/源/week12-img.js

用途：给「本周错题」临时项目的每个练习点配一张**卷面原题裁切图**，孩子一眼知道对应卷子第几题。
产物：`数学/源/week12-img.js`（`var W12_IMG = { q10: {w,h,uri}, ... }`，data URI）。
      构建 `node 工具/trainer/build.mjs 数学` 会把它内联成 `<script id="data">`，产物仍是单文件。

用法（仓库根执行，需要 PyMuPDF：`pip install pymupdf`）：

    python 数学/题库工具/week-crops.py
    python 数学/题库工具/week-crops.py --pdf "D:/某处/第12周问卷.pdf"

卷子 PDF 在站外（本机 OneDrive「仓库内副本」），默认路径见 DEFAULT_PDF，也可用环境变量 WEEK12_PDF。

切框怎么来的：不写死坐标，按题号定位——取「题号 token 的 y0」到「下一题题号 token 的 y0」之间
所有文字 token 与内嵌图片 bbox 的并集，再留 10pt 边距；所以题图（image）不会漏。
改了卷子/换了题号，重跑本脚本即可，控制台会打印每张图的页码与切框（记进任务卡备查）。
"""
import argparse
import base64
import os
import re
import sys

try:
    import pymupdf
except ImportError:  # 兼容旧名
    try:
        import fitz as pymupdf
    except ImportError:
        raise SystemExit('需要 PyMuPDF：先 `python -m pip install pymupdf`（本机没装就临时装到某个目录再用 PYTHONPATH 指过来也行）')
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_JS = os.path.join(ROOT, '数学', '源', 'week12-img.js')
TMP = os.path.join(os.environ.get('TEMP', '/tmp'), 'w12_crops')

DEFAULT_PDF = r'C:\Users\tzvuf\OneDrive\陶宸欣\学习资料\题库\仓库内副本\数学\20261118初三数学周三限时练习问卷（第12周）.pdf'

# (输出键, 页码, 起始题号, 下一题题号或 None, 页内硬边界或 None)
# 第 17 题是附加题，卷面上就是 17；它下面的 (2)(3) 两问共用同一张裁切图。
# 第 13 题只练 (1)（缺常数项那种形式），裁一张整题图即可。
JOBS = [
    ('q10', 2, 10, 11, None),
    ('q11', 2, 11, 12, None),
    ('q12', 2, 12, None, None),
    ('q13', 2, 13, None, None),
    ('q16', 4, 16, None, 420),
    ('q17', 5, 17, None, 300),
]


def items(page):
    """文字 token + 内嵌图片的 bbox（题图是图片，get_text 看不到，必须一起取并集）"""
    out = [(w[0], w[1], w[2], w[3]) for w in page.get_text('words')]
    for im in page.get_image_info():
        b = im['bbox']
        out.append((b[0], b[1], b[2], b[3]))
    return out


def find_q(page, no):
    pat = re.compile(r'^%d[.．]' % no)
    for w in page.get_text('words'):
        if pat.match(w[4]):
            return w[1]
    raise SystemExit('第 %d 题的题号 token 没找到：PDF 换版式了？' % no)


def clip(page, no, next_no=None, hard_end=None):
    y0 = find_q(page, no)
    y1 = find_q(page, next_no) if next_no else (hard_end or page.rect.height - 60)
    sel = [r for r in items(page) if r[1] >= y0 - 3 and r[3] <= y1 + 2]
    if not sel:
        raise SystemExit('第 %d 题没取到内容' % no)
    x0 = max(20, min(r[0] for r in sel) - 10)
    x1 = min(page.rect.width - 20, max(r[2] for r in sel) + 10)
    top = min(r[1] for r in sel) - 4      # 上边距只留 4pt：留 10pt 会把上一行（如「三、解答题」标题）的下缘带进来
    bot = max(r[3] for r in sel) + 8
    return pymupdf.Rect(x0, top, x1, bot)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', default=os.environ.get('WEEK12_PDF', DEFAULT_PDF))
    ap.add_argument('--width', type=int, default=1080, help='输出宽度（默认 1080，手机上够看）')
    ap.add_argument('--dpi', type=int, default=220)
    ap.add_argument('--quality', type=int, default=78)
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit('找不到卷子 PDF：' + args.pdf)

    os.makedirs(TMP, exist_ok=True)
    doc = pymupdf.open(args.pdf)
    meta = {}
    for name, pno, no, nxt, hard in JOBS:
        page = doc[pno - 1]
        # 第 12 题要排在「三、解答题」标题之前，否则会切到板块标题
        end = hard if nxt is None else None
        if name == 'q12':
            end = find_q(page, 13) - 18
        r = clip(page, no, nxt, end)
        pix = page.get_pixmap(dpi=args.dpi, clip=r)
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        if im.width > args.width:
            im = im.resize((args.width, round(im.height * args.width / im.width)), Image.LANCZOS)
        webp = os.path.join(TMP, name + '.webp')
        im.save(webp, 'WEBP', quality=args.quality, method=6)
        meta[name] = {'page': pno, 'rect': [round(v, 1) for v in r],
                      'w': im.width, 'h': im.height, 'kb': round(os.path.getsize(webp) / 1024, 1)}
        print('%-4s p%d rect=%s %dx%d %.1f KB' % (name, pno, meta[name]['rect'], im.width, im.height, meta[name]['kb']))
    doc.close()

    lines = [
        '/* 第 12 周限时练习（11.18）· 原题裁切图（2026-11-20）',
        ' * 用途：只给「本周错题」临时项目用——每个练习点旁边显示卷面上的原题，一眼知道对应第几题。',
        ' * 来源：本机 OneDrive「仓库内副本」的 20261118初三数学周三限时练习问卷（第12周）.pdf（5 页）。',
        ' * 做法：PyMuPDF 按题号定位（文字 token + 内嵌图片 bbox 取并集）→ %d dpi 切图 → 宽 %d → WebP(q%d) → base64。' % (args.dpi, args.width, args.quality),
        ' * 生成脚本：数学/题库工具/week-crops.py（改卷子就重跑它，别手改 base64）。切框：',
    ]
    for k, v in meta.items():
        lines.append(' *   %s  p%d  %s' % (k, v['page'], v['rect']))
    lines.append(' * 本文件由构建内联成 <script id="data">，页面运行时读它 → 入库。 */')
    lines.append('var W12_IMG = {')
    keys = list(meta)
    for i, k in enumerate(keys):
        v = meta[k]
        b64 = base64.b64encode(open(os.path.join(TMP, k + '.webp'), 'rb').read()).decode('ascii')
        lines.append("  %s: { w: %d, h: %d, uri: 'data:image/webp;base64,%s' }%s" % (
            k, v['w'], v['h'], b64, ',' if i < len(keys) - 1 else ''))
    lines.append('};')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print('wrote %s  %.1f KB' % (OUT_JS, os.path.getsize(OUT_JS) / 1024))
    print('下一步：node 工具/trainer/build.mjs 数学')


if __name__ == '__main__':
    main()
