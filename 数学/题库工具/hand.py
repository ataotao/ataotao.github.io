# -*- coding: utf-8 -*-
"""
答卷手写附图（题包里的 hand 字段）生成工具

背景：答案卷是**老师批改过的学生手写答卷**——第 11 周周练是一份扫描 PDF（没有文字层），
10 月 14 日练习卷是一张 4 页竖排的长图 PNG。光有题库里的「标准解析」不够——孩子要看的是
老师到底怎么批、怎么写的，所以每题配一张「原卷 + 手写」的截图，显示在解析下面（`hand` 字段）。

数据流：

    【答案】.pdf  --(本工具，按 CROPS 里的裁切框)-->  题库/<卷名>- 答卷附图/q<题号>.webp
                                                      |
                                   (本工具 --pack) --> 题包 JSON 的 hand = {w, h, svg:<image …>}
                                                      |
                                          qb.py build --> 函数思维脚手架.html（解析里显示）

    答卷长图.png  --(本工具，按 CROPS 里的坐标)-->  内存里的 webp --(同一个 --pack)--> 题包 JSON 的 hand

用法：

    # 1) 从答卷 PDF 重新裁图（需要 PyMuPDF + Pillow；裁切框变了就重跑这一步）
    python 题库工具\\hand.py --pdf "C:\\path\\答案.pdf" --pack 题库\\pack-第11周周练-函数与圆.json

    # 2) 答卷是长图（CROPS 里写了 image）时不用 --pdf，直接按坐标裁（不落盘，直接内联进题包）
    python 题库工具\\hand.py --pack 题库\\pack-数学练习卷-1014.json --write

    # 3) 只把已经裁好的 webp 嵌回题包（换机器、没有原图时也能用）
    python 题库工具\\hand.py --pack 题库\\pack-第11周周练-函数与圆.json --write

约定：
- PDF 的裁切框是**渲染后像素坐标**（dpi 见 CROPS 里的 dpi），不是 PDF 的 pt；
- 长图（image）的裁切框是原图像素坐标，五元组 (题号, x0, y0, x1, y1)；长图本身已入库，
  裁切结果只内联进题包、不落盘（页面不读那些 webp）；
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

# 每套卷的裁切表
#   PDF 答卷：boxes = (题号, 页号, x0, y0, x1, y1)，坐标是 dpi 渲染后的像素
#   长图答卷：spec 里写 'image'（题库/ 下的文件名），boxes = (题号, x0, y0, x1, y1)，原图像素
CROPS = {
    'pk-hanshu-1014': {
        'image': '数学函数练习卷【答卷】.png',   # 815x4272，4 页竖排（第 1-8 / 9-13 / 14-15 / 16 题）
        'maxw': 815,
        'quality': 62,
        'boxes': [
            ('1', 0, 100, 815, 160),
            ('2', 0, 162, 815, 218),
            ('3', 0, 219, 815, 296),
            ('4', 0, 296, 815, 386),
            ('5', 0, 389, 815, 510),
            ('6', 0, 510, 815, 595),
            ('7', 0, 595, 815, 748),
            ('8', 0, 748, 815, 1054),
            ('9', 0, 1172, 815, 1210),
            ('10', 0, 1210, 815, 1278),
            ('11', 0, 1278, 815, 1468),
            ('12', 0, 1468, 815, 1714),
            ('13', 0, 1728, 815, 2086),
            ('14', 0, 2139, 815, 2585),
            ('15', 0, 2585, 815, 3162),
            ('16', 0, 3285, 815, 4272),
        ]
    },
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


def crop_image(img_path, spec):
    """按 boxes 把一张答卷长图（PNG）裁成 webp，返回 {题号: (w, h, webp 字节)}。

    不落盘：长图本身已入库（题库/数学函数练习卷【答卷】.png），裁切结果只是内联进题包，
    页面运行时并不读这些 webp，按「读就入库、不读就留档」的规矩没必要再存一份。
    """
    from PIL import Image
    import io

    src = Image.open(img_path).convert('RGB')
    out = {}
    for no, x0, y0, x1, y1 in spec['boxes']:
        im = src.crop((x0, y0, x1, y1))
        if im.width > spec['maxw']:
            im = im.resize((spec['maxw'], round(im.height * spec['maxw'] / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=spec['quality'], method=6)
        raw = buf.getvalue()
        out[no] = (im.width, im.height, raw)
        print('  q%-3s %4dx%-4d %5.1f KB' % (no, im.width, im.height, len(raw) / 1024.0))
    return out


def find_files(spec):
    """没有原图时，用已经裁好的 webp。"""
    outdir = os.path.join(TDIR, spec['dir'])
    out = {}
    for box in spec['boxes']:
        no = box[0]
        p = os.path.join(outdir, 'q%s.webp' % no)
        if not os.path.exists(p):
            sys.exit('✗ 缺少答卷附图：%s（先用 --pdf 重新裁）' % p)
        out[no] = p
    return out


def svg_for(src):
    """webp（文件路径，或 (w, h, 字节)）-> 一段内层 SVG，返回 (w, h, svg)。"""
    if isinstance(src, (tuple, list)):
        w, h, raw = src
    else:
        from PIL import Image
        im = Image.open(src)
        w, h = im.size
        with open(src, 'rb') as f:
            raw = f.read()
    b64 = base64.b64encode(raw).decode('ascii')
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
    elif spec.get('image'):
        img = os.path.join(TDIR, spec['image'])
        if not os.path.exists(img):
            sys.exit('✗ 找不到答卷长图：%s' % img)
        print('从答卷长图裁图：%s' % img)
        files = crop_image(img, spec)
    else:
        files = find_files(spec)
    if not a.write:
        print('（--write 才会写回题包）')
        return
    embed(a.pack, files)


if __name__ == '__main__':
    main()
