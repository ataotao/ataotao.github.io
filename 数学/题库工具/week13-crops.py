"""数学闪练卡「小测错题」· 11.25 圆2 周三练习卷的原题裁切图 → 数学/源/week13-img.js

用途：给「小测错题」里本周（11.25）的每道错题配一张**卷面原题裁切图**（干净卷面，不带学生笔迹），
      点「不会」时连图带解析一起看。
产物：`数学/源/week13-img.js`（`var W13_IMG = { q3: {w,h,uri}, ... }`，data URI）。
      构建 `node 工具/trainer/build.mjs 数学` 会内联成 `<script id="data">`。

用法（仓库根执行，需要 PyMuPDF + Pillow）：

    python 数学/题库工具/week13-crops.py
    python 数学/题库工具/week13-crops.py --preview    # 同时把预览 PNG 写到 .scratch/

切法（不写死坐标，卷子换版式也能重跑）：
  ① 纵向：从「本题题号 token」到「下一道题号 / 下一节标题」为止（文字带）；
  ② 题图常比文字带高或低（Q10 的网格在图上方、Q12 的圆压到下一题那一行）：
     取与文字带相交、高 > 40pt 的大图，单独渲染后按原坐标贴到白底上；
     行内公式小图（√2 之类）不参与，否则会一路把下一题也吃进来；
  ③ 文字带与题图分别渲染再拼，避免把下一题的题干也裁进来。
"""
import argparse
import base64
import io
import os
import re

import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_JS = os.path.join(ROOT, '数学', '源', 'week13-img.js')
PREVIEW = os.path.join(ROOT, '.scratch', 'math1125', 'cropcheck')

DEFAULT_PDF = r'C:\Users\tzvuf\OneDrive\陶宸欣\学习资料\题库\仓库内副本\数学\数学圆2周三练习卷（11.25）.pdf'

# (输出键, 页码 1-based, 本题题号, 下一题题号或 None)
JOBS = [
    ('q3', 1, 3, 4),
    ('q5', 1, 5, 6),
    ('q8', 1, 8, None),    # p1 最后一题：下边界自动停在「二、填空题」
    ('q10', 1, 10, None),
    ('q11', 2, 11, 12),
    ('q12', 2, 12, 13),
    ('q15', 2, 15, 16),
    ('q16', 2, 16, None),
    ('q17', 3, 17, None),
    ('q18', 4, 18, None),
]
WIDTH = 1000
QUALITY = 80
DPI = 200
X0, X1 = 40.0, 594.0


def words(page):
    return page.get_text('words')


def find_q(page, no):
    pat = re.compile(r'^%d[.．、]' % no)
    for w in words(page):
        if pat.match(w[4]):
            return w[1]
    raise SystemExit('第 %d 题的题号 token 没找到：PDF 换版式了？' % no)


def next_boundary(page, y_start):
    """本题下边界：下一道题号 / 下一节标题，谁先到用谁；都没有就用页底。
    必须跳过本题题号所在那一行（y_start+14 以内），否则第一个 token 就是自己。"""
    cands = [page.rect.height - 24]
    for w in words(page):
        y = w[1]
        if y <= y_start + 14:
            continue
        t = w[4]
        if re.match(r'^\d+[.．、]', t) or re.match(r'^[一二三四五][、，]', t):
            cands.append(y - 5)
    return min(cands)


def big_figures(page, y0, y1, next_y, text_bottom):
    """归本题的题图（行内公式小图、上一题/下一题的图都排除）：
    ① 与文字带相交（高 > 40pt，重叠 > 12pt）——Q10 网格在图上方、Q16 扇形压在题干上；
    ② 或者整张落在「本题文字之下、下一题题号之上」——Q15 的圆就画在两行文字下面。"""
    out = []
    for im in page.get_image_info():
        b = im['bbox']
        if (b[3] - b[1]) <= 40:
            continue
        overlap = min(b[3], y1) - max(b[1], y0)
        if overlap > 12 or (b[1] >= text_bottom - 2 and b[3] <= next_y + 8):
            out.append(b)
    return out


def text_bottom(page, y0, y1):
    ys = []
    for w in words(page):
        if w[1] >= y0 - 2 and w[3] <= y1 + 2:
            if re.match(r'^\d{1,2}$', w[4]) and w[1] > page.rect.height - 70:
                continue   # 页码不是题目内容
            ys.append(w[3])
    return max(ys) if ys else y1


def render(page, rect):
    pix = page.get_pixmap(dpi=DPI, clip=rect)
    return Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')


def compose(page, no):
    y_start = find_q(page, no)
    y0 = y_start - 6
    next_y = next_boundary(page, y_start)
    text_bottom_y = text_bottom(page, y0, next_y)
    y_text1 = min(max(text_bottom_y + 6, y0 + 10), next_y)
    figs = [b for b in big_figures(page, y0, y_text1, next_y, text_bottom_y) if b[1] - y0 <= 300]
    y_end = y_text1
    for b in figs:
        y_end = max(y_end, b[3] + 6)
    y_end = min(y_end, page.rect.height - 20)

    # 像素换算：同一 DPI 下 1pt = DPI/72 px
    k = DPI / 72.0
    W = int(round((X1 - X0) * k))
    H = int(round((y_end - y0) * k))
    canvas = Image.new('RGB', (W, H), 'white')

    # ① 文字带（整幅宽，避开右侧题图区域也行——题图会盖上去）
    band = render(page, pymupdf.Rect(X0, y0, X1, y_text1))
    canvas.paste(band, (0, 0))
    # ② 题图：按原坐标贴回，右侧题图不会被文字带截断
    for b in figs:
        fig_rect = pymupdf.Rect(max(b[0] - 4, X0), max(b[1] - 3, y0), min(b[2] + 6, X1), b[3] + 4)
        if fig_rect.width < 4 or fig_rect.height < 4:
            continue
        img = render(page, fig_rect)
        canvas.paste(img, (int(round((fig_rect.x0 - X0) * k)), int(round((fig_rect.y0 - y0) * k))))
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', default=DEFAULT_PDF)
    ap.add_argument('--preview', action='store_true', help='把预览 PNG 写到 .scratch/math1125/cropcheck')
    ap.add_argument('--debug', action='store_true', help='只打印每题的切框与题图 bbox，不写产物')
    args = ap.parse_args()
    doc = pymupdf.open(args.pdf)
    if args.debug:
        for key, pno, no, nxt in JOBS:
            page = doc[pno - 1]
            ys = find_q(page, no)
            y0 = ys - 6
            y1 = next_boundary(page, ys)
            tb = text_bottom(page, y0, y1)
            figs = big_figures(page, y0, tb + 6)
            print('%-5s p%d y0=%.1f next=%.1f text_bottom=%.1f figs=%s' % (
                key, pno, y0, y1, tb, [[round(x, 1) for x in b] for b in figs]))
        return
    out = ['/* 11.25 数学周三练习卷（圆2）· 原题裁切图（2026-11-27）',
           ' * 用途：只给「小测错题」里的本周错题用——点「不会」时连原题截图一起看。',
           ' * 来源：本机 OneDrive「仓库内副本」的 数学圆2周三练习卷（11.25）.pdf。',
           ' * 做法：PyMuPDF 按题号定位文字带，题图单独渲染后按原坐标拼白底 → %ddpi → 宽 %d → WebP(q%d) → base64。' % (DPI, WIDTH, QUALITY),
           ' * 生成脚本：数学/题库工具/week13-crops.py（改卷子就重跑它，别手改 base64）。',
           ' */',
           'var W13_IMG = {']
    rows = []
    if args.preview:
        os.makedirs(PREVIEW, exist_ok=True)
    for key, pno, no, nxt in JOBS:
        page = doc[pno - 1]
        im = compose(page, no)
        im = im.resize((WIDTH, max(1, int(round(im.height * WIDTH / float(im.width))))), Image.LANCZOS)
        if args.preview:
            im.save(os.path.join(PREVIEW, key + '.png'))
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        b64 = base64.b64encode(buf.getvalue()).decode('ascii')
        out.append("  %s: {w: %d, h: %d, uri: 'data:image/webp;base64,%s'}," % (key, im.width, im.height, b64))
        rows.append((key, pno, im.width, im.height, len(buf.getvalue())))
    out.append('};')
    out.append('')
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print('->', OUT_JS, '%.1f KB' % (os.path.getsize(OUT_JS) / 1024))
    for r in rows:
        print('  %-5s p%d  %dx%d  %d bytes' % r)


if __name__ == '__main__':
    main()
