# -*- coding: utf-8 -*-
"""
第二十九章《圆》单元测试卷（GD6）的原卷描图

用法：
    python 题库工具/figs29.py --pack 题库/pack-第二十九章-圆单元测试卷.json --write
    python 题库工具/figs29.py            # 只打印每张图的尺寸与体积

约定同 figs.py：SVG 坐标（y 向下）、墨色 #1b2430、轮廓 1.5、虚线 1.2（dash 5 4）。
这里额外用一层浅灰填充表示「阴影部分」（页面里原卷就是这样涂黑的）。
"""
import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from figs import Fig, _n, _esc, SERIF          # noqa: E402

INK = '#1b2430'
SHADE = '#dfe6ee'
R = 1.5          # 轮廓线宽
THIN = 1.1


def pt(cx, cy, r, deg):
    """极坐标 -> SVG 坐标（deg 按数学习惯逆时针，y 轴向下）。"""
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy - r * math.sin(a))


def arcpts(cx, cy, r, d0, d1, n=40):
    """弧上的采样点（从 d0 到 d1，逆时针）。"""
    return [pt(cx, cy, r, d0 + (d1 - d0) * i / n) for i in range(n + 1)]


def polyfmt(pts):
    return ' '.join('%s,%s' % (_n(x), _n(y)) for x, y in pts)


class F(Fig):
    """在 figs.Fig 上再加两个原卷常用的东西：弧、阴影填充。"""

    def __init__(self, w, h):
        Fig.__init__(self, w, h)
        self.pre = []

    def arc(self, cx, cy, r, d0, d1, w=R, dash=None, color=INK):
        pts = arcpts(cx, cy, r, d0, d1)
        self.poly(pts, w=w, dash=dash, color=color)

    def shade(self, pts, color=SHADE):
        """多边形填充（阴影部分），画在所有线之前。"""
        self.pre.append('<polygon points="%s" fill="%s" stroke="none"/>' % (polyfmt(pts), color))

    def shade_arc(self, cx, cy, r, d0, d1, close_pts, color=SHADE):
        """弧 + 若干点围成的区域：先把弧采样，再接 close_pts 里的点。"""
        self.shade(arcpts(cx, cy, r, d0, d1) + list(close_pts), color)

    def svg(self):
        return ''.join(self.pre) + Fig.svg(self)


def lab(f, x, y, s, dx=0, dy=0, size=15):
    f.text(x + dx, y + dy, s, size=size)


# =====================================================================
#  选择题 1–10
# =====================================================================
def fig_q1():
    f = F(220, 200)
    cx, cy, r = 105, 100, 78
    A = pt(cx, cy, r, 22)
    B = pt(cx, cy, r, 96)
    s = ''
    s += '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(A[0]), _n(A[1]), _n(B[0]), _n(B[1]), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(cx), _n(cy), _n(A[0]), _n(A[1]), INK, R)
    s += '<circle cx="%s" cy="%s" r="2.4" fill="#e37400"/>' % (_n(cx), _n(cy))
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" fill="%s">O</text>' % (_n(cx - 14), _n(cy + 16), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" fill="%s" font-style="italic">A</text>' % (_n(A[0] + 4), _n(A[1] + 14), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" fill="%s" font-style="italic">B</text>' % (_n(B[0] - 6), _n(B[1] - 6), SERIF, INK)
    f.pre.append(s)
    f.cmds = []
    return f


def fig_q2():
    cx, cy, r = 130, 105, 82
    return _circle_chord_fig(cx, cy, r, chordx=26)


def _circle_chord_fig(cx, cy, r, chordx=26):
    """直径水平、弦竖直（第 2 题 / 第 21 题共用画法）。"""
    half = math.sqrt(r * r - chordx * chordx)
    s = ''
    s += '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(cx - r), _n(cy), _n(cx + r), _n(cy), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(cx + chordx), _n(cy - half), _n(cx + chordx), _n(cy + half), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(cx), _n(cy), _n(cx + chordx), _n(cy - half), INK, R)
    s += '<circle cx="%s" cy="%s" r="2.4" fill="#e37400"/>' % (_n(cx), _n(cy))
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">A</text>' % (_n(cx - r - 12), _n(cy + 5), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">B</text>' % (_n(cx + r + 4), _n(cy + 5), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">C</text>' % (_n(cx + chordx - 4), _n(cy - half - 6), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">D</text>' % (_n(cx + chordx - 4), _n(cy + half + 16), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">E</text>' % (_n(cx + chordx + 6), _n(cy + 16), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" fill="%s">O</text>' % (_n(cx - 12), _n(cy + 18), SERIF, INK)
    f = F(300, 230)
    f.pre.append(s)
    f.cmds = []
    return f


def fig_q3():
    cx, cy, r = 140, 105, 82
    A = pt(cx, cy, r, 180)
    B = pt(cx, cy, r, 0)
    C = pt(cx, cy, r, 108)
    D = pt(cx, cy, r, 250)
    s = '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R)
    for p, q in [(A, B), (C, A), (C, B), (D, A), (D, B)]:
        s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(p[0]), _n(p[1]), _n(q[0]), _n(q[1]), INK, R)
    s += '<circle cx="%s" cy="%s" r="2.4" fill="#e37400"/>' % (_n(cx), _n(cy))
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" fill="%s">O</text>' % (_n(cx - 6), _n(cy + 18), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">A</text>' % (_n(A[0] - 14), _n(A[1] + 5), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">B</text>' % (_n(B[0] + 5), _n(B[1] + 5), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">C</text>' % (_n(C[0] - 12), _n(C[1] - 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="15" font-style="italic" fill="%s">D</text>' % (_n(D[0] - 2), _n(D[1] + 18), SERIF, INK)
    f = F(290, 220)
    f.pre.append(s)
    f.cmds = []
    return f


def fig_q7():
    """图 3：以 O 为圆心、半径 18 的弧，弦 AB = 18（瓦片横截面）。"""
    cx, cy, r = 150, 42, 108
    A = pt(cx, cy, r, 236)
    B = pt(cx, cy, r, 304)
    f = F(300, 200)
    f.arc(cx, cy, r, 236, 304, w=R)
    f.line(A[0], A[1], B[0], B[1], w=THIN, dash='5 4')
    f.line(cx, cy, A[0], A[1], w=THIN)
    f.line(cx, cy, B[0], B[1], w=THIN)
    f.dot(cx, cy, 2.4)
    f.text(cx + 8, cy + 6, 'O', size=15)
    f.text(A[0] - 14, A[1] + 4, 'A')
    f.text(B[0] + 8, B[1] + 4, 'B')
    return f


def fig_q8():
    """轮子吃水：水面截得弦 AB = 4，吃水深度 CD = 1。"""
    cx, cy, r = 150, 100, 80
    depth = 38
    half = math.sqrt(r * r - depth * depth)
    A = (cx - half, cy + depth)
    B = (cx + half, cy + depth)
    Cb = (cx, cy + r)
    f = F(300, 230)
    # 水面（带下方阴影线）
    f.line(16, cy + depth, 284, cy + depth, w=1.2, dash='6 4')
    for x in range(20, 282, 12):
        f.line(x, cy + depth, x - 7, cy + depth + 7, w=0.9)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=THIN)          # 水面截得的弦
    f.line(cx, cy, Cb[0], Cb[1], w=THIN)            # 过圆心的竖直线
    f.dot(cx, cy, 2.4)
    f.text(cx + 6, cy - 6, 'O', size=15)
    f.text(A[0] - 12, A[1] - 4, 'A')
    f.text(B[0] + 4, B[1] - 4, 'B')
    f.text(cx - 4, A[1] - 8, 'D')
    f.text(cx - 4, Cb[1] + 18, 'C')
    f.text(22, cy + depth - 8, [('水面', False)], size=12)
    return f


def fig_q9():
    cx, cy, r = 150, 112, 80
    A = pt(cx, cy, r, 100)
    B = pt(cx, cy, r, 4)
    C = pt(cx, cy, r, 202)
    D = pt(cx, cy, r, 300)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    for p, q in [(A, B), (A, C), (A, D), (B, C), (C, A)]:
        f.line(p[0], p[1], q[0], q[1], w=R)
    E = _isect(A, D, B, C)
    f.dot(cx, cy, 2.2)
    f.text(cx - 3, cy + 18, 'O', size=15)
    f.text(A[0] - 6, A[1] - 8, 'A')
    f.text(B[0] + 4, B[1] + 6, 'B')
    f.text(C[0] - 14, C[1] + 4, 'C')
    f.text(D[0] + 2, D[1] + 16, 'D')
    f.text(E[0] + 8, E[1] + 16, 'E', size=14)
    return f


def fig_q10():
    """圆形玉料中刻出的扇形（半圆）玉佩：A、B、C 在圆上，∠ABC = 90°。"""
    cx, cy, r = 150, 118, 82
    A = pt(cx, cy, r, 180)
    C = pt(cx, cy, r, 0)
    B = pt(cx, cy, r, 90)
    f = F(300, 230)
    f.shade([A] + arcpts(cx, cy, r, 180, 0, 60) + [C])
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(B[0], B[1], C[0], C[1], w=R)
    f.line(A[0], A[1], C[0], C[1], w=THIN, dash='5 4')
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] - 5, B[1] - 8, 'B')
    f.text(C[0] + 5, C[1] + 5, 'C')
    return f


def fig_q11():
    cx, cy, r = 150, 115, 82
    A = pt(cx, cy, r, 215)
    B = pt(cx, cy, r, 325)
    C = pt(cx, cy, r, 46)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(cx, cy, A[0], A[1], w=R)
    f.line(cx, cy, B[0], B[1], w=R)
    f.line(C[0], C[1], A[0], A[1], w=R)
    f.line(C[0], C[1], B[0], B[1], w=R)
    f.dot(cx, cy, 2.4)
    f.text(cx - 6, cy + 6, 'O', size=15)
    f.text(A[0] - 8, A[1] + 16, 'A')
    f.text(B[0] + 2, B[1] + 16, 'B')
    f.text(C[0] + 2, C[1] - 6, 'C')
    return f


def fig_q12():
    cx, cy, r = 150, 115, 82
    A = pt(cx, cy, r, 180)
    B = pt(cx, cy, r, 0)
    C = pt(cx, cy, r, 74)
    D = pt(cx, cy, r, 138)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(D[0], D[1], C[0], C[1], w=R)
    f.line(C[0], C[1], A[0], A[1], w=R)
    f.dot(cx, cy, 2.2)
    f.text(cx - 4, cy - 6, 'O', size=15)
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] + 5, B[1] + 5, 'B')
    f.text(C[0] + 4, C[1] - 6, 'C')
    f.text(D[0] - 14, D[1] - 2, 'D')
    return f


# =====================================================================
#  填空题 14、15
# =====================================================================
def fig_q14():
    """等边 △ABC（边长 4）与以 AB 为直径的半圆，阴影 = 弧 DE 与弦 DE 围成的弓形。"""
    A = (55, 195)
    B = (205, 195)
    C = (130, 65)
    cx, cy, r = 130, 195, 75
    D = (A[0] + (C[0] - A[0]) * 0.5, A[1] + (C[1] - A[1]) * 0.5)
    E = (B[0] + (C[0] - B[0]) * 0.5, B[1] + (C[1] - B[1]) * 0.5)
    d0 = math.degrees(math.atan2(cy - D[1], D[0] - cx))
    d1 = math.degrees(math.atan2(cy - E[1], E[0] - cx))
    f = F(280, 220)
    f.shade(arcpts(cx, cy, r, d0, d1, 50) + [E, D])
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(B[0], B[1], C[0], C[1], w=R)
    f.line(C[0], C[1], A[0], A[1], w=R)
    f.arc(cx, cy, r, 180, 0, w=R)
    f.line(D[0], D[1], E[0], E[1], w=THIN)
    f.dot(cx, cy, 2.2)
    f.text(cx - 4, cy + 17, 'O', size=15)
    f.text(C[0] - 4, C[1] - 8, 'C')
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] + 6, B[1] + 5, 'B')
    f.text(D[0] - 14, D[1] + 2, 'D')
    f.text(E[0] + 6, E[1] + 2, 'E')
    return f


def fig_q15():
    """月亮门：弦 AB、弦中点 D、圆心 O、弧顶 C，CD = 2.7，AB = 1.8。"""
    cx, cy, r = 150, 112, 88
    dy = 70                               # OD
    half = math.sqrt(r * r - dy * dy)
    A = (cx - half, cy + dy)
    B = (cx + half, cy + dy)
    D = (cx, cy + dy)
    C = (cx, cy - r)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(C[0], C[1], D[0], D[1], w=THIN, dash='5 4')
    f.dot(cx, cy, 2.4)
    f.text(cx + 6, cy - 4, 'O', size=15)
    f.text(cx - 4, C[1] - 8, 'C')
    f.text(cx - 4, D[1] + 18, 'D')
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] + 6, B[1] + 5, 'B')
    return f


# =====================================================================
#  解答题 16–23
# =====================================================================
def fig_q16():
    cx, cy = 150, 112
    r1, r2 = 88, 50
    y = cy + 42
    h1 = math.sqrt(r1 * r1 - 42 * 42)
    h2 = math.sqrt(r2 * r2 - 42 * 42)
    A = (cx - h1, y)
    B = (cx + h1, y)
    C = (cx - h2, y)
    D = (cx + h2, y)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r1), INK, R))
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r2), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.dot(cx, cy, 2.4)
    f.text(cx + 5, cy - 5, 'O', size=15)
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] + 6, B[1] + 5, 'B')
    f.text(C[0] - 6, C[1] + 18, 'C')
    f.text(D[0] - 4, D[1] + 18, 'D')
    return f


def fig_q17():
    cx, cy, r = 150, 112, 82
    A = pt(cx, cy, r, 100)
    B = pt(cx, cy, r, 195)
    C = pt(cx, cy, r, 288)
    D = pt(cx, cy, r, 12)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    for p, q in [(A, B), (B, C), (C, D), (D, A), (A, C), (B, D)]:
        f.line(p[0], p[1], q[0], q[1], w=R)
    f.dot(cx, cy, 2.2)
    f.text(cx - 4, cy + 18, 'O', size=15)
    f.text(A[0] - 6, A[1] - 8, 'A')
    f.text(B[0] - 16, B[1] + 2, 'B')
    f.text(C[0] + 2, C[1] + 16, 'C')
    f.text(D[0] + 6, D[1] - 2, 'D')
    return f


def _isect(p1, p2, p3, p4):
    (x1, y1), (x2, y2), (x3, y3), (x4, y4) = p1, p2, p3, p4
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(den) < 1e-9:
        return ((x1 + x3) / 2, (y1 + y3) / 2)
    a = x1 * y2 - y1 * x2
    b = x3 * y4 - y3 * x4
    return ((a * (x3 - x4) - (x1 - x2) * b) / den,
            (a * (y3 - y4) - (y1 - y2) * b) / den)


def fig_q19():
    cx, cy, r = 150, 170, 72
    A = pt(cx, cy, r, 112)
    B = pt(cx, cy, r, 212)
    Cc = pt(cx, cy, r, 308)
    D = pt(cx, cy, r, 76)
    E = _isect(B, A, Cc, D)
    f = F(300, 270)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    # BA、CD 的延长线先画到 E
    f.line(B[0], B[1], E[0], E[1], w=THIN, dash='5 4')
    f.line(Cc[0], Cc[1], E[0], E[1], w=THIN, dash='5 4')
    for p, q in [(A, B), (B, Cc), (Cc, D), (D, A), (A, Cc), (B, D)]:
        f.line(p[0], p[1], q[0], q[1], w=R)
    f.dot(cx, cy, 2.2)
    f.text(cx - 4, cy + 18, 'O', size=15)
    f.text(E[0] - 4, E[1] - 8, 'E')
    f.text(A[0] - 14, A[1] - 2, 'A')
    f.text(B[0] - 18, B[1] + 6, 'B')
    f.text(Cc[0] + 4, Cc[1] + 12, 'C')
    f.text(D[0] + 6, D[1] - 4, 'D')
    return f


def fig_q20():
    """图 1：△ABC 内接于 ⊙O，D 是弧 BC 的中点；图 2：△ABC。"""
    s = ''
    # ---- 图 1 ----
    cx, cy, r = 78, 100, 60
    A = pt(cx, cy, r, 96)
    B = pt(cx, cy, r, 212)
    C = pt(cx, cy, r, 328)
    D = pt(cx, cy, r, 270)
    s += '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R)
    for p, q in [(A, B), (B, C), (C, A), (A, D)]:
        s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (_n(p[0]), _n(p[1]), _n(q[0]), _n(q[1]), INK, R)
    s += '<circle cx="%s" cy="%s" r="2.2" fill="#e37400"/>' % (_n(cx), _n(cy))
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" fill="%s">O</text>' % (_n(cx + 5), _n(cy - 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">A</text>' % (_n(A[0] - 4), _n(A[1] - 8), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">B</text>' % (_n(B[0] - 14), _n(B[1] + 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">C</text>' % (_n(C[0] + 4), _n(C[1] + 8), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">D</text>' % (_n(D[0] - 4), _n(D[1] + 16), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="12" fill="#6b7684">图 1</text>' % (_n(cx - 12), _n(cy + 92), SERIF)
    # ---- 图 2 ----
    a = (185, 150)
    b = (285, 150)
    c = (245, 82)
    s += '<path d="M%s %sL%s %sL%s %sZ" stroke="%s" stroke-width="%g" fill="none"/>' % (
        _n(a[0]), _n(a[1]), _n(b[0]), _n(b[1]), _n(c[0]), _n(c[1]), INK, R)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">A</text>' % (_n(a[0] - 14), _n(a[1] + 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">B</text>' % (_n(b[0] + 4), _n(b[1] + 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="14" font-style="italic" fill="%s">C</text>' % (_n(c[0] + 2), _n(c[1] - 8), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="12" fill="#6b7684">图 2</text>' % (_n(222), _n(192), SERIF)
    f = F(320, 210)
    f.pre.append(s)
    f.cmds = []
    return f


def fig_q21():
    """AB 为直径，弦 CD ⊥ AB 于 E，连 AC、AD。"""
    cx, cy, r = 145, 110, 82
    dx = 34
    half = math.sqrt(r * r - dx * dx)
    A = (cx, cy - r)
    B = (cx, cy + r)
    C = (cx - half, cy + dx)
    D = (cx + half, cy + dx)
    E = (cx, cy + dx)
    f = F(300, 230)
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(C[0], C[1], D[0], D[1], w=R)
    f.line(A[0], A[1], C[0], C[1], w=R)
    f.line(A[0], A[1], D[0], D[1], w=R)
    f.dot(cx, cy, 2.4)
    f.text(cx + 5, cy - 5, 'O', size=15)
    f.text(A[0] - 4, A[1] - 6, 'A')
    f.text(B[0] - 4, B[1] + 16, 'B')
    f.text(C[0] - 14, C[1] + 5, 'C')
    f.text(D[0] + 6, D[1] + 5, 'D')
    f.text(E[0] + 6, E[1] + 16, 'E', size=14)
    return f


def fig_q22():
    """AB 为直径 = 8，OC∥BD，∠CBD = 30°，阴影 = 弧 BD 与弦 BD 围成的弓形。"""
    cx, cy, r = 150, 118, 84
    A = (cx - r, cy)
    B = (cx + r, cy)
    Cc = pt(cx, cy, r, 60)
    D = pt(cx, cy, r, 120)
    f = F(300, 240)
    f.shade(arcpts(cx, cy, r, 120, 180, 40) + [D, B])
    f.pre.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (_n(cx), _n(cy), _n(r), INK, R))
    f.line(A[0], A[1], B[0], B[1], w=R)
    f.line(B[0], B[1], Cc[0], Cc[1], w=R)
    f.line(A[0], A[1], D[0], D[1], w=R)
    f.line(cx, cy, Cc[0], Cc[1], w=R)
    f.line(B[0], B[1], D[0], D[1], w=R)
    E = _isect((cx, cy), Cc, A, D)
    f.dot(cx, cy, 2.4)
    f.text(cx - 6, cy + 18, 'O', size=15)
    f.text(A[0] - 14, A[1] + 5, 'A')
    f.text(B[0] + 6, B[1] + 5, 'B')
    f.text(Cc[0] - 4, Cc[1] - 8, 'C')
    f.text(D[0] + 4, D[1] - 6, 'D')
    f.text(E[0] - 14, E[1] - 2, 'E', size=14)
    return f


def fig_q23():
    """图 1 圆锥；图 2 侧面展开扇形（半径 l、圆心角 n°）；图 3 草帽 A→C→A。"""
    s = ''
    # ---- 图 1：圆锥 ----
    ap = (58, 34)
    bl = (20, 120)
    br = (96, 120)
    s += '<path d="M%s %sL%s %sM%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (
        _n(ap[0]), _n(ap[1]), _n(bl[0]), _n(bl[1]), _n(ap[0]), _n(ap[1]), _n(br[0]), _n(br[1]), INK, R)
    s += '<ellipse cx="58" cy="120" rx="38" ry="10" fill="none" stroke="%s" stroke-width="%g"/>' % (INK, R)
    s += '<text x="62" y="30" font-family="%s" font-size="13" fill="%s">P</text>' % (SERIF, INK)
    s += '<text x="64" y="126" font-family="%s" font-size="13" font-style="italic" fill="%s">r</text>' % (SERIF, INK)
    s += '<text x="30" y="164" font-family="%s" font-size="12" fill="#6b7684">图 1</text>' % SERIF
    # ---- 图 2：扇形 ----
    P = (185, 34)
    rad = 96
    a0, a1 = 250, 290          # 张开一个小角度示意
    d0, d1 = 250, 290
    arcp = arcpts(P[0], P[1], rad, d0, d1, 40)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (
        _n(P[0]), _n(P[1]), _n(arcp[0][0]), _n(arcp[0][1]), INK, R)
    s += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (
        _n(P[0]), _n(P[1]), _n(arcp[-1][0]), _n(arcp[-1][1]), INK, R)
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="%g"/>' % (polyfmt(arcp), INK, R)
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" fill="%s">P</text>' % (_n(P[0] - 4), _n(P[1] - 6), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" font-style="italic" fill="%s">l</text>' % (_n(P[0] - 40), _n(P[1] + 62), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="12" fill="%s">n°</text>' % (_n(P[0] + 14), _n(P[1] + 56), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="12" fill="#6b7684">图 2</text>' % (_n(P[0] - 12), _n(164), SERIF)
    # ---- 图 3：草帽 ----
    ap2 = (272, 34)
    b2 = (238, 118)
    c2 = (306, 118)
    mid = ((ap2[0] + c2[0]) / 2, (ap2[1] + c2[1]) / 2)      # C 是 PB 的中点
    s += '<path d="M%s %sL%s %sM%s %sL%s %s" stroke="%s" stroke-width="%g" fill="none"/>' % (
        _n(ap2[0]), _n(ap2[1]), _n(b2[0]), _n(b2[1]), _n(ap2[0]), _n(ap2[1]), _n(c2[0]), _n(c2[1]), INK, R)
    s += '<ellipse cx="272" cy="118" rx="34" ry="9" fill="none" stroke="%s" stroke-width="%g"/>' % (INK, R)
    s += '<path d="M%s %sL%s %sL%s %s" stroke="#c0392b" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>' % (
        _n(b2[0]), _n(b2[1]), _n(mid[0]), _n(mid[1]), _n(b2[0]), _n(b2[1]))
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" font-style="italic" fill="%s">A</text>' % (_n(b2[0] - 14), _n(b2[1] + 8), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" font-style="italic" fill="%s">B</text>' % (_n(c2[0] + 3), _n(c2[1] + 8), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" font-style="italic" fill="%s">C</text>' % (_n(mid[0] + 5), _n(mid[1] - 3), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="13" fill="%s">P</text>' % (_n(ap2[0] + 4), _n(ap2[1] - 4), SERIF, INK)
    s += '<text x="%s" y="%s" font-family="%s" font-size="12" fill="#6b7684">图 3</text>' % (_n(258), _n(164), SERIF)
    f = F(330, 180)
    f.pre.append(s)
    f.cmds = []
    return f


FIGS = {
    'c29q1': fig_q1, 'c29q2': fig_q2, 'c29q3': fig_q3, 'c29q7': fig_q7,
    'c29q8': fig_q8, 'c29q9': fig_q9, 'c29q10': fig_q10, 'c29q11': fig_q11,
    'c29q12': fig_q12, 'c29q14': fig_q14, 'c29q15': fig_q15, 'c29q16': fig_q16,
    'c29q17': fig_q17, 'c29q19': fig_q19, 'c29q20': fig_q20, 'c29q21': fig_q21,
    'c29q22': fig_q22, 'c29q23': fig_q23,
}


def build_figs():
    out = {}
    for qid, fn in FIGS.items():
        f = fn()
        out[qid] = {'w': f.w, 'h': f.h, 'need': 1 if qid in ('c29q1', 'c29q2', 'c29q3', 'c29q7', 'c29q8', 'c29q9', 'c29q10', 'c29q11', 'c29q12', 'c29q14', 'c29q15', 'c29q16', 'c29q17', 'c29q19', 'c29q20', 'c29q21', 'c29q22', 'c29q23') else 0,
                    'svg': f.svg()}
    return out


def write_pack(path):
    data = json.load(open(path, encoding='utf-8'))
    figs = build_figs()
    hit = 0
    for p in data['packs']:
        for q in p['questions']:
            if q.get('id') in figs:
                newq, done = {}, False
                for k, v in q.items():
                    if k == 'fig':
                        continue
                    newq[k] = v
                    if k == 'ask' and not done:
                        newq['fig'] = figs[q['id']]
                        done = True
                if not done:
                    newq['fig'] = figs[q['id']]
                q.clear()
                q.update(newq)
                hit += 1
    txt = json.dumps(data, ensure_ascii=False, indent=2).replace('\n', '\r\n')
    open(path, 'wb').write(txt.encode('utf-8'))
    print('已写入 %d 题的原卷插图：%s' % (hit, path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pack')
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    if a.pack and a.write:
        write_pack(a.pack)
    else:
        for qid, fig in sorted(build_figs().items()):
            print('%s  (%dx%d)  %d 字符' % (qid, fig['w'], fig['h'], len(fig['svg'])))


if __name__ == '__main__':
    main()
