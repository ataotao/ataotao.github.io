# -*- coding: utf-8 -*-
"""
答卷手写附图（题包里的 hand 字段）生成工具

背景：第 11 周周练卷的答案是一份**老师批改过的学生手写答卷**（扫描 PDF，没有文字层）。
光有题库里的「标准解析」不够——孩子要看的是老师到底怎么批、怎么写的，所以每题配一张
「原卷 + 手写」的截图，显示在解析下面（`hand` 字段）。

数据流：

    【答案】.pdf  --(本工具，按 CROPS 里的裁切框)-->  题库/<卷名>- 答卷附图/q<题号>.webp
                                                      |
                                   (本工具 --pack) --> 题包 JSON 的 hand = {w, h, svg:<image …>}
                                                      |
                                          qb.py build --> 函数思维脚手架.html（解析里显示）

用法：

    # 1) 从答卷 PDF 重新裁图（需要 PyMuPDF + Pillow；裁切框变了就重跑这一步）
    python 题库工具\\hand.py --pdf "C:\\path\\答案.pdf" --pack 题库\\pack-第11周周练-函数与圆.json

    # 2) 只把已经裁好的 webp 嵌回题包（换机器、没有 PDF 时也能用）
    python 题库工具\\hand.py --pack 题库\\pack-第11周周练-函数与圆.json --write

约定：
- 裁切框是**渲染后像素坐标**（dpi 见 CROPS 里的 dpi），不是 PDF 的 pt；
- 每张图缩到 maxw 宽、WebP 质量 quality，控制在几十 KB，避免把单文件 HTML 撑爆；
- hand 的 w/h 就是图的实际像素宽高（页面按 viewBox 等比显示，不放大）。
"""
import argparse
import base64
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TDIR = os.path.join(os.path.dirname(HERE), '题库')

# 每套卷的裁切表：题号 -> (页号, x0, y0, x1, y1)，坐标是 dpi 渲染后的像素
CROPS = {
    'pk-week11-1111': {
        'dir': '第11周周练- 答卷附图',
        'dpi': 150,
        'maxw': 900,
        'quality': 60,
        'boxes': [
            ('1', 1, 55, 235, 980, 332),
            ('2', 1, 55, 338, 720, 428),
            ('3', 1, 55, 430, 720, 536),
            ('4', 1, 55, 538, 780, 620),
            ('5', 1, 55, 620, 1275, 797),
            ('6', 1, 55, 798, 900, 908),
            ('7', 1, 55, 972, 1275, 1248),
            ('8', 1, 55, 1250, 1275, 1548),
            ('9', 2, 55, 168, 1100, 224),
            ('10', 2, 55, 236, 1100, 310),
            ('11', 2, 55, 310, 1150, 420),
            ('12', 2, 55, 410, 1275, 697),
            ('13', 2, 55, 722, 1275, 1568),
            ('14', 3, 55, 108, 1275, 460),
            ('15', 3, 55, 480, 1275, 1170),
            ('16', 4, 55, 86, 1275, 1568),
            ('附加', 5, 55, 136, 1275, 1602),
        ]
    }
}


def read_pack(path):
    with open(path, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def write_pack(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2).replace('\n', '\r\n')
    with open(path, 'wb') as f:
        f.write(text.encode('utf-8'))


def crop_pdf(pdf_path, spec):
    """按 boxes 把答卷 PDF 裁成 webp，返回 {题号: 文件路径}。"""
    import pymupdf
    from PIL import Image

    outdir = os.path.join(TDIR, spec['dir'])
    os.makedirs(outdir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    pages = {}
    out = {}
    for no, pno, x0, y0, x1, y1 in spec['boxes']:
        if pno not in pages:
            pix = doc[pno - 1].get_pixmap(dpi=spec['dpi'])
            pages[pno] = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        im = pages[pno].crop((x0, y0, x1, y1))
        if im.width > spec['maxw']:
            im = im.resize((spec['maxw'], round(im.height * spec['maxw'] / im.width)), Image.LANCZOS)
        p = os.path.join(outdir, 'q%s.webp' % no)
        im.save(p, 'WEBP', quality=spec['quality'], method=6)
        out[no] = p
        print('  q%-3s %4dx%-4d %5.1f KB' % (no, im.width, im.height, os.path.getsize(p) / 1024.0))
    return out


def find_files(spec):
    """没有 PDF 时，用已经裁好的 webp。"""
    outdir = os.path.join(TDIR, spec['dir'])
    out = {}
    for no, _, _, _, _, _ in spec['boxes']:
        p = os.path.join(outdir, 'q%s.webp' % no)
        if not os.path.exists(p):
            sys.exit('✗ 缺少答卷附图：%s（先用 --pdf 重新裁）' % p)
        out[no] = p
    return out


def svg_for(path):
    """webp -> 一段内层 SVG（<image> + base64），返回 (w, h, svg)。"""
    from PIL import Image
    im = Image.open(path)
    w, h = im.size
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    svg = ('<image x="0" y="0" width="%d" height="%d" preserveAspectRatio="xMidYMid meet" '
           'href="data:image/webp;base64,%s"/>' % (w, h, b64))
    return w, h, svg


def embed(pack_path, files):
    data = read_pack(pack_path)
    packs = data['packs'] if isinstance(data, dict) and 'packs' in data else data
    hit = 0
    for p in packs:
        spec = CROPS.get(p.get('id'))
        if not spec:
            continue
        for q in p.get('questions', []):
            no = str(q.get('no'))
            if no not in files:
                continue
            w, h, svg = svg_for(files[no])
            # hand 放在 solution 后面，和 fig 的位置约定一致（fig 在 ask 后）
            newq = {}
            for k, v in q.items():
                if k == 'hand':
                    continue
                newq[k] = v
                if k == 'solution':
                    newq['hand'] = {'w': w, 'h': h, 'svg': svg}
            if 'hand' not in newq:
                newq['hand'] = {'w': w, 'h': h, 'svg': svg}
            q.clear()
            q.update(newq)
            hit += 1
    write_pack(pack_path, data)
    print('已写入 %d 题的答卷手写附图：%s' % (hit, pack_path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', help='答卷 PDF（给了就重新裁图）')
    ap.add_argument('--pack', help='题包 JSON（把图嵌进去）')
    ap.add_argument('--write', action='store_true', help='真的写回题包（不加只打印会做什么）')
    a = ap.parse_args()
    if not a.pack:
        ap.print_help()
        return
    data = read_pack(a.pack)
    packs = data['packs'] if isinstance(data, dict) and 'packs' in data else data
    pid = packs[0].get('id')
    spec = CROPS.get(pid)
    if not spec:
        sys.exit('✗ 这个题包还没有裁切表（CROPS 里没有 %s）' % pid)
    if a.pdf:
        print('从 PDF 裁图：%s' % a.pdf)
        files = crop_pdf(a.pdf, spec)
    else:
        files = find_files(spec)
    if not a.write:
        print('（--write 才会写回题包）')
        return
    embed(a.pack, files)


if __name__ == '__main__':
    main()
