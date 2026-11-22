#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""压缩 物理/图片/ 下的原卷裁图（PNG 调色板重编码，路径与文件名不变）。

为什么是 PNG 而不是 WebP：SPEC.md 第 6 节与 assemble-site.sh 都按
`图片/<packId>/qNN.png` 相对路径发布（copydir 只拷 .png），改扩展名要同时
动题包 JSON、构建产物和发布白名单，收益却只有约 0.3 MB，不划算。

用法（仓库根，需 Pillow）：
    python 物理/工具/compress-imgs.py 物理/图片/pk-w12a 物理/图片/pk-w12b
    python 物理/工具/compress-imgs.py 物理/图片 --dry-run
    python 物理/工具/compress-imgs.py 物理/图片 --force

规则：
- 只替换「明显变小」的文件（小于原大小的 90%）；
- 原图先备份到 物理/_recon/图片备份/<相对路径>（.gitignore 已忽略）；
- 重编码前后尺寸必须一致、平均像素误差 <= 4，否则放弃该张；
- 已经是调色板 PNG 的默认跳过（幂等），--force 可重压。
"""
import io
import os
import shutil
import sys

from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_ROOT = os.path.join(REPO, '物理', '图片')
BACKUP_ROOT = os.path.join(REPO, '物理', '_recon', '图片备份')
COLORS = 256
MIN_GAIN = 0.90          # 新文件必须 < 原文件 90% 才替换
MAX_MEAN_DIFF = 4.0      # 平均通道差上限（0-255）


def mean_abs_diff(a, b):
    try:
        import numpy as np
        x = np.asarray(a, dtype=np.int16)
        y = np.asarray(b, dtype=np.int16)
        return float(abs(x - y).mean())
    except ImportError:
        # 无 numpy 时退化为稀疏抽样估计
        total = 0
        n = 0
        for y in range(0, a.height, 7):
            for x in range(0, a.width, 7):
                pa, pb = a.getpixel((x, y)), b.getpixel((x, y))
                total += sum(abs(pa[i] - pb[i]) for i in range(3))
                n += 1
        return total / max(n, 1) / 3


def flatten(im):
    if im.mode == 'RGB':
        return im
    if im.mode in ('RGBA', 'LA', 'P'):
        rgba = im.convert('RGBA')
        alpha = rgba.getchannel('A')
        if alpha.getextrema() != (255, 255):
            return None, '含半透明像素'
        bg = Image.new('RGB', rgba.size, (255, 255, 255))
        bg.paste(rgba.convert('RGB'))
        return bg, ''
    return im.convert('RGB'), ''


def compress_one(path, force, dry):
    old_size = os.path.getsize(path)
    im = Image.open(path)
    im.load()
    if im.mode == 'P' and not force:
        return None
    rgb, why = flatten(im)
    if rgb is None:
        return ('skip', why)
    pal = rgb.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    pal.save(buf, format='PNG', optimize=True)
    data = buf.getvalue()
    new_size = len(data)
    if new_size >= old_size * MIN_GAIN:
        return ('keep', new_size)
    # 回读校验
    check = Image.open(io.BytesIO(data)).convert('RGB')
    if check.size != rgb.size:
        return ('skip', '尺寸不一致')
    diff = mean_abs_diff(rgb, check)
    if diff > MAX_MEAN_DIFF:
        return ('skip', '误差过大 %.2f' % diff)
    if dry:
        return ('would', new_size, diff)
    rel = os.path.relpath(path, IMG_ROOT)
    backup = os.path.join(BACKUP_ROOT, rel)
    if not os.path.exists(backup):
        os.makedirs(os.path.dirname(backup), exist_ok=True)
        shutil.copy2(path, backup)
    with open(path, 'wb') as f:
        f.write(data)
    return ('done', new_size, diff)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    force = '--force' in sys.argv
    if not args:
        print(__doc__)
        return 2
    before = after = 0
    n_done = n_skip = 0
    for root in args:
        root = root if os.path.isabs(root) else os.path.join(REPO, root)
        if os.path.isfile(root):
            files = [root]
        else:
            files = []
            for d, _, fs in os.walk(root):
                files += [os.path.join(d, f) for f in sorted(fs) if f.lower().endswith('.png')]
        if not files:
            print('没有 PNG：%s' % os.path.relpath(root, REPO))
            continue
        print('== %s（%d 张）' % (os.path.relpath(root, REPO), len(files)))
        for p in files:
            b = os.path.getsize(p)
            res = compress_one(p, force, dry)
            if res is None:
                print('  %-12s 已是调色板，跳过' % os.path.basename(p))
                n_skip += 1
                continue
            kind = res[0]
            if kind == 'skip':
                print('  %-12s 跳过：%s' % (os.path.basename(p), res[1]))
                n_skip += 1
                continue
            if kind == 'keep':
                print('  %-12s %5.0fKB → %5.0fKB 收益不足，保留原图' % (os.path.basename(p), b / 1024, res[1] / 1024))
                n_skip += 1
                continue
            a = res[1]
            tag = '（预览）' if kind == 'would' else ''
            print('  %-12s %5.0fKB → %5.0fKB  %3.0f%%  误差 %.2f%s'
                  % (os.path.basename(p), b / 1024, a / 1024, (1 - a / b) * 100, res[2], tag))
            before += b
            after += a
            n_done += 1
    if n_done:
        print('\n合计 %d 张：%.2f MB → %.2f MB（省 %.1f%%）%s'
              % (n_done, before / 1048576, after / 1048576, (1 - after / before) * 100,
                 '；预览模式未写盘' if dry else '；原图已备份到 物理/_recon/图片备份/'))
    print('跳过/保留 %d 张' % n_skip)
    return 0


if __name__ == '__main__':
    sys.exit(main())
