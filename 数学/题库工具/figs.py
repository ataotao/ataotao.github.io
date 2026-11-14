# -*- coding: utf-8 -*-
"""
原卷插图（题包里的 fig 字段）生成工具

背景：试卷里有些图不是函数图象（比如墙角花园、隧道、制冷曲线），用 plotSVG 那套
"坐标网格 + 刻度" 的画法会和原卷差很多。这里改用「按原卷描图」的方式：直接生成
一段 SVG 片段，存进题包的 fig 字段（fig = {w, h, svg}），页面里用 figSVG() 按
viewBox 原样显示，所以和卷面截图一致，而且放大不虚。

用法：
    python figs.py --pack 题库/pack-九上数学期中模拟练习.json --write
    python figs.py --preview out.png      # 只画本地 PNG 预览（需要 Pillow），不写题库

约定：
- 坐标就是 SVG 坐标（单位 px，y 轴向下），viewBox = "0 0 w h"；
- 字号 13 左右，字体 Times New Roman 斜体（数学字母），数字/单位用正体；
- 线宽：轮廓 1.5、函数曲线 1.8、墙体 2.0、虚线 1.2（dash 5 4）；
- 颜色统一墨色 #1b2430（和页面 --ink 一致）。
"""
import argparse
import json
import math
import os
import sys

INK = '#1b2430'
SERIF = "'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif"


class Fig(object):
    """一个插图：收集绘图命令，输出 SVG 片段。"""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.cmds = []

    # ---- 图元 -------------------------------------------------------
    def line(self, x1, y1, x2, y2, w=1.5, dash=None, arrow=False, color=INK):
        self.cmds.append({'k': 'line', 'p': (x1, y1, x2, y2), 'w': w,
                          'dash': dash, 'arrow': arrow, 'c': color})

    def poly(self, pts, w=1.8, dash=None, color=INK):
        self.cmds.append({'k': 'poly', 'pts': list(pts), 'w': w, 'dash': dash, 'c': color})

    def quad(self, p0, c, p1, w=1.8, color=INK, n=48):
        """二次贝塞尔（抛物线正好可以精确表示）。"""
        self.cmds.append({'k': 'quad', 'p0': p0, 'cp': c, 'p1': p1, 'w': w, 'n': n, 'c': color})

    def dot(self, x, y, r=3.0, color=INK):
        self.cmds.append({'k': 'dot', 'p': (x, y), 'r': r, 'c': color})

    def text(self, x, y, runs, size=16, anchor='middle', color=INK):
        """runs: 'A' 或 [('y', True), ('/℃', False)]，第二项 = 是否斜体。"""
        if isinstance(runs, str):
            runs = [(runs, True)]
        self.cmds.append({'k': 'text', 'p': (x, y), 'runs': runs, 'size': size,
                          'anchor': anchor, 'c': color})

    def hatch(self, x1, y1, x2, y2, side, step=8, ln=7, w=1.1, color=INK):
        """墙体阴影线：沿 (x1,y1)->(x2,y2) 每隔 step 画一根 45° 短线。

        side='left'  竖墙：短线落在墙的左侧（向下偏，形如 /）
        side='bottom' 横墙：短线落在墙的下方（向左偏，形如 /）
        """
        if side == 'left':
            n = int((y1 + y2) // 2)
            y = min(y1, y2) + 2
            while y < max(y1, y2) - 1:
                self.cmds.append({'k': 'line', 'p': (x1, y, x1 - ln, y + ln), 'w': w,
                                  'dash': None, 'arrow': False, 'c': color})
                y += step
        else:
            x = min(x1, x2) + 5
            while x < max(x1, x2) - 2:
                self.cmds.append({'k': 'line', 'p': (x, y1, x - ln, y1 + ln), 'w': w,
                                  'dash': None, 'arrow': False, 'c': color})
                x += step

    # ---- 输出 -------------------------------------------------------
    def svg(self):
        out = []
        cmds = self.cmds
        i, n = 0, len(cmds)
        while i < n:
            c = cmds[i]
            k = c['k']
            # 连续、同样式的直线并成一条 path（墙体的阴影线因此只占一条 path，体积小很多）
            if k == 'line' and not c['arrow']:
                style = (c['w'], c['c'], c['dash'])
                d = []
                j = i
                while j < n and cmds[j]['k'] == 'line' and not cmds[j]['arrow'] \
                        and (cmds[j]['w'], cmds[j]['c'], cmds[j]['dash']) == style:
                    x1, y1, x2, y2 = cmds[j]['p']
                    d.append('M%s %sL%s %s' % (_n(x1), _n(y1), _n(x2), _n(y2)))
                    j += 1
                a = ['d="%s"' % ''.join(d), 'fill="none"', 'stroke="%s"' % c['c'],
                     'stroke-width="%g"' % c['w'], 'stroke-linecap="round"']
                if c['dash']:
                    a.append('stroke-dasharray="%s"' % c['dash'])
                out.append('<path %s/>' % ' '.join(a))
                i = j
                continue
            if k == 'line':                                  # 带箭头的坐标轴
                x1, y1, x2, y2 = c['p']
                out.append('<path d="M%s %sL%s %s" fill="none" stroke="%s" stroke-width="%g" '
                           'stroke-linecap="round"/>'
                           % (_n(x1), _n(y1), _n(x2), _n(y2), c['c'], c['w']))
                out.append(_arrow_svg((x1, y1), (x2, y2), c['c']))
            elif k == 'poly':
                pts = ' '.join('%s,%s' % (_n(x), _n(y)) for x, y in c['pts'])
                a = ['points="%s"' % pts, 'fill="none" stroke="%s" stroke-width="%g"' % (c['c'], c['w'])]
                a.append('stroke-linejoin="round" stroke-linecap="round"')
                if c['dash']:
                    a.append('stroke-dasharray="%s"' % c['dash'])
                out.append('<polyline %s/>' % ' '.join(a))
            elif k == 'quad':
                (x0, y0), (cx, cy), (x1, y1) = c['p0'], c['cp'], c['p1']
                out.append('<path d="M%s %sQ%s %s %s %s" fill="none" stroke="%s" '
                           'stroke-width="%g" stroke-linecap="round"/>'
                           % (_n(x0), _n(y0), _n(cx), _n(cy), _n(x1), _n(y1), c['c'], c['w']))
            elif k == 'dot':
                x, y = c['p']
                out.append('<circle cx="%s" cy="%s" r="%g" fill="%s"/>'
                           % (_n(x), _n(y), c['r'], c['c']))
            elif k == 'text':
                x, y = c['p']
                span = []
                for s, it in c['runs']:
                    span.append('<tspan%s>%s</tspan>' % (' font-style="italic"' if it else '', _esc(s)))
                out.append('<text x="%s" y="%s" font-family="%s" font-size="%g" fill="%s" '
                           'text-anchor="%s">%s</text>'
                           % (_n(x), _n(y), SERIF.replace('"', "'"), c['size'], c['c'],
                              c['anchor'], ''.join(span)))
            i += 1
        return ''.join(out)


def _n(v):
    """坐标写成 0.1 精度的短字符串（38 而不是 38.000000）。"""
    r = round(float(v), 1)
    if abs(r - int(r)) < 1e-9:
        return str(int(r))
    return ('%.1f' % r).rstrip('0').rstrip('.')


def _esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def _arrow_svg(p0, p1, color, ln=7, hw=3.4):
    x0, y0 = p0
    x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    d = (dx * dx + dy * dy) ** 0.5 or 1.0
    ux, uy = dx / d, dy / d
    bx, by = x1 - ux * ln, y1 - uy * ln
    px, py = -uy * hw, ux * hw
    return ('<polygon points="%g,%g %g,%g %g,%g" fill="%s"/>'
            % (x1, y1, bx + px, by + py, bx - px, by - py, color))


# =====================================================================
#  三张原卷插图
# =====================================================================
def fig_q20():
    """第 20 题：直角墙角（左竖墙 + 下横墙）围矩形花园 ABCD，点 P 在园内。

    原卷比例：竖墙 x=27.5，横墙 y=129，矩形右边 x=161，矩形上边 y=38；
    墙体两头都比矩形长出一截，阴影线在墙的外侧。
    """
    W, H = 300, 215
    s = 1.42

    def X(x):
        return (x - 27.5) * s + 38

    def Y(y):
        return (y - 5) * s + 11.5

    f = Fig(W, H)
    xw = X(27.5)                       # 竖墙
    yw = Y(129)                        # 横墙
    xr = X(161)                        # 矩形右边
    yt = Y(38)                         # 矩形上边
    # 墙（外侧带阴影线）+ 篱笆围成的 BC、AB 两边
    f.line(xw, Y(5), xw, yw, w=2.0)
    f.hatch(xw, Y(5), xw, yw, 'left', step=10, ln=7)
    f.line(xw, yw, X(185), yw, w=2.0)
    f.hatch(xw, yw, X(185), yw, 'bottom', step=10, ln=7)
    f.line(xw, yt, xr, yt, w=1.5)      # BC
    f.line(xr, yt, xr, yw, w=1.5)      # AB
    # 点 P（树）
    f.dot(X(146), Y(85))
    f.text(X(142.5) - 3, Y(75) + 4, 'P')
    # 顶点标注
    f.text(X(15) + 5, Y(36) + 5, 'C')
    f.text(X(168) + 3, Y(29) + 5, 'B')
    f.text(X(20) - 2, Y(140) + 6, 'D')
    f.text(X(166) + 5, Y(140) + 6, 'A')
    return f


def fig_q21():
    """第 21 题：抛物线形隧道横截面，底部宽 AB，拱高 5。

    原卷：x 轴过 A、B，y 轴过拱顶 C；A(-5,0)、B(5,0)、C(0,5)，
    图上没有刻度也没有网格，只有 O 和 x、y 的字母。
    """
    W, H = 300, 240
    ox, oy, u = 150.0, 196.0, 17.0

    def P(x, y):                        # 数学坐标 -> 屏幕坐标
        return (ox + x * u, oy - y * u)

    f = Fig(W, H)
    ax, ay = P(-5, 0)
    bx, by = P(5, 0)
    cx, cy = P(0, 5)
    f.line(45, oy, 272, oy, w=1.3, arrow=True)      # x 轴
    f.line(ox, 232, ox, 76, w=1.3, arrow=True)      # y 轴
    f.quad((ax, ay), (ox, oy - 10 * u), (bx, by))   # 抛物线：控制点 (0,10)
    f.text(ax + 1, ay + 19, 'A')
    f.text(bx - 3, by + 19, 'B')
    f.text(ox - 13, oy + 14, 'O')
    f.text(ox - 10, cy - 5, 'C')
    f.text(ox + 9, 92, 'y')
    f.text(266, oy + 18, 'x')
    return f


def fig_q22():
    """第 22 题：冷柜循环制冷温度示意图（0<=x<4 一次函数，4<=x<t 反比例）。

    原卷示意图里纵轴被压扁过（0→-4 那段比 -4→-20 那段长），这里按原卷的
    取点位置做分段线性映射，画出来和卷面一致；虚线是 4、t、-4、-20 的对齐线。
    """
    W, H = 340, 250
    s = 1.45

    def X(x):
        return (x - 16) * s + 26

    def Y(y):
        return (y - 40) * s + 10

    ox = X(53.6)                        # y 轴
    oy = Y(89.6)                        # x 轴
    x4 = X(71)                          # x = 4
    xt = X(149)                         # x = t
    y4 = Y(111)                         # y = -4
    y20 = Y(163)                        # y = -20

    def px(x):                          # 横轴：0~4 与 4~t 段比例不同（照原卷）
        return ox + x * (x4 - ox) / 4.0 if x <= 4 else x4 + (x - 4) * (xt - x4) / 16.0

    def py(y):                          # 纵轴：0~-4 与 -4~-20 段比例不同（照原卷）
        return oy + (-y) * (y4 - oy) / 4.0 if y >= -4 else y4 + (-y - 4) * (y20 - y4) / 16.0

    f = Fig(W, H)
    # 坐标轴
    f.line(36, oy, 291, oy, w=1.3, arrow=True)
    f.line(ox, Y(181), ox, 19, w=1.3, arrow=True)
    # 对齐虚线
    f.line(ox, y4, xt, y4, w=1.2, dash='5 4')
    f.line(x4, oy, x4, y20, w=1.2, dash='5 4')
    f.line(xt, oy, xt, y4, w=1.2, dash='5 4')
    f.line(ox, y20, x4, y20, w=1.2, dash='5 4')
    # 曲线：直线下降 (0,-4)->(4,-20)，再沿 y=-80/x 回升到 (t,-4)
    pts = [(px(0), py(-4))]
    for i in range(1, 7):
        x = 4.0 * i / 6
        pts.append((px(x), py(-4 - 16 * x / 4.0)))
    for i in range(0, 61):
        x = 4.0 + 16.0 * i / 60
        pts.append((px(x), py(-80.0 / x)))
    f.poly(pts, w=1.8)
    # 文字
    f.text(67, 79, 'O', size=15)
    f.text(106, 79, [('4', False)], size=15)
    f.text(219, 79, 't', size=15)
    f.text(75, 117, [('\u22124', False)], size=15, anchor='end')
    f.text(76, 192, [('\u221220', False)], size=15, anchor='end')
    f.text(89, 29, [('y', True), ('/\u2103', False)], size=15, anchor='start')
    f.text(284, 113, [('x', True), ('/min', False)], size=15)
    return f


def fig_m4():
    """第 4 题：Rt△ABC（∠C=90°，∠ABC=40°），绕 B 逆时针转 40° 得 △A′BC′，
    C′ 恰好落在 AB 上，求 ∠CAA′。

    自建坐标：BC 水平 110 px，A 由 tan40° 定；A′ 是 A 绕 B 转 40° 后的位置。
    """
    W, H = 250, 240
    B = (58.0, 206.0)
    C = (168.0, 206.0)
    a = C[0] - B[0]
    A = (C[0], C[1] - a * math.tan(math.radians(40)))

    d = math.radians(40)
    Cc = (B[0] + a * math.cos(d), B[1] - a * math.sin(d))          # C′ 在 BA 上
    ba = math.hypot(A[0] - B[0], A[1] - B[1])
    ang = math.atan2(B[1] - A[1], A[0] - B[0]) + d                  # 屏幕上逆时针 = 角度增大
    Aa = (B[0] + ba * math.cos(ang), B[1] - ba * math.sin(ang))

    f = Fig(W, H)
    f.poly([B, C, A, B], w=1.6)          # △ABC
    f.poly([B, Aa, Cc], w=1.6)           # △A′BC′（BC′ 与 BA 重合，不再重画）
    # 直角记号（C 处）
    f.poly([(C[0] - 14, C[1]), (C[0] - 14, C[1] - 14), (C[0], C[1] - 14)], w=1.1)
    f.dot(A[0], A[1], r=2.6)
    f.dot(B[0], B[1], r=2.6)
    f.dot(C[0], C[1], r=2.6)
    f.dot(Aa[0], Aa[1], r=2.6)
    f.dot(Cc[0], Cc[1], r=2.6)
    f.text(A[0] + 10, A[1] + 5, 'A')
    f.text(B[0] - 12, B[1] + 6, 'B')
    f.text(C[0] - 3, C[1] + 19, 'C')
    f.text(Aa[0] - 3, Aa[1] - 9, [('A', True), ('′', False)])
    f.text(Cc[0] + 4, Cc[1] - 7, [('C', True), ('′', False)])
    return f


def fig_m13():
    """第 13 题：方格纸中线段 AB 绕某点旋转得到 CD，找旋转中心。

    自建格点（旋转中心取 H，转 90°）：
        H(4,4)，A(6,5) → C(3,6)，B(7,7) → D(1,7)
    三条候选点 E、F、G 另置；图上不标答案。
    """
    W, Hh = 300, 262
    u = 25.0
    ox, oy = 28.0, 20.0

    def P(i, j):
        return (ox + i * u, oy + j * u)

    f = Fig(W, Hh)
    for i in range(9):
        f.line(P(i, 0)[0], P(i, 0)[1], P(i, 8)[0], P(i, 8)[1], w=0.9, color='#c9c3b6')
        f.line(P(0, i)[0], P(0, i)[1], P(8, i)[0], P(8, i)[1], w=0.9, color='#c9c3b6')

    A, B = P(6, 5), P(7, 7)
    C, D = P(3, 6), P(1, 7)
    f.line(A[0], A[1], B[0], B[1], w=2.0)
    f.line(C[0], C[1], D[0], D[1], w=2.0)
    f.dot(A[0], A[1], r=2.8); f.dot(B[0], B[1], r=2.8)
    f.dot(C[0], C[1], r=2.8); f.dot(D[0], D[1], r=2.8)
    f.text(A[0] + 9, A[1] - 4, 'A')
    f.text(B[0] + 9, B[1] + 2, 'B')
    f.text(C[0] - 10, C[1] - 4, 'C')
    f.text(D[0] - 10, D[1] + 2, 'D')

    for name, (i, j) in [('E', (1, 1)), ('F', (7, 1)), ('G', (2, 3)), ('H', (4, 4))]:
        x, y = P(i, j)
        f.dot(x, y, r=2.4)
        f.text(x + 8, y + 4, name)

    return f


def fig_a11():
    """第 11 题：边长 2 的正方形 ABCD 内接正方形 EFGH，AE = x（图上取 x = 0.7，不是答案）。"""
    W, H = 260, 240
    u = 90.0
    ox, oy = 40.0, 25.0
    x = 0.7

    def P(a, b):
        return (ox + a * u, oy + b * u)

    A, B, C, D = P(0, 0), P(2, 0), P(2, 2), P(0, 2)
    E, F, G, Hh = P(x, 0), P(2, x), P(2 - x, 2), P(0, 2 - x)

    f = Fig(W, H)
    f.poly([A, B, C, D, A], w=1.8)          # 外正方形
    f.poly([E, F, G, Hh, E], w=1.8)         # 内正方形
    for p in (A, B, C, D, E, F, G, Hh):
        f.dot(p[0], p[1], r=2.6)
    f.text(A[0] - 11, A[1] + 3, 'A')
    f.text(B[0] + 10, B[1] + 3, 'B')
    f.text(C[0] + 10, C[1] + 6, 'C')
    f.text(D[0] - 11, D[1] + 6, 'D')
    f.text(E[0], E[1] - 8, 'E')
    f.text(F[0] + 12, F[1] + 4, 'F')
    f.text(G[0], G[1] + 18, 'G')
    f.text(Hh[0] - 12, Hh[1] + 4, 'H')
    f.text((A[0] + E[0]) / 2, A[1] - 8, [('x', True)], size=15)
    return f


def fig_a14():
    """第 14 题：一面靠墙（墙长 8 m）的矩形场地，另三边用篱笆（共 20 m），AD 垂直于墙。

    图上按"宽 6、高 3"画一个非最值的情形，墙比矩形长出一截。
    """
    W, H = 236, 138
    u = 21.0
    ox, oy = 40.0, 34.0

    def P(a, b):
        return (ox + a * u, oy + b * u)

    A, B = P(0, 0), P(6, 0)
    C, D = P(6, 3), P(0, 3)

    f = Fig(W, H)
    # 墙：比矩形左右各长一截，阴影线在上方
    f.line(ox - 16, oy, B[0] + 40, oy, w=2.0)
    f.hatch(ox - 16, oy, B[0] + 40, oy, 'top', step=10, ln=7)
    f.line(A[0], A[1], D[0], D[1], w=1.5)     # AD（篱笆）
    f.line(D[0], D[1], C[0], C[1], w=1.5)     # DC（篱笆）
    f.line(C[0], C[1], B[0], B[1], w=1.5)     # CB（篱笆）
    for p in (A, B, C, D):
        f.dot(p[0], p[1], r=2.6)
    f.text(A[0] - 10, A[1] + 17, 'A')
    f.text(B[0] + 9, B[1] + 17, 'B')
    f.text(C[0] + 9, C[1] + 16, 'C')
    f.text(D[0] - 11, D[1] + 16, 'D')
    f.text(A[0] - 15, (A[1] + D[1]) / 2 + 6, [('x', True)], size=15)
    return f


# =====================================================================
#  第 11 周周练（函数 + 圆，11.11）的原卷插图
#  坐标统一用「数学坐标 -> 屏幕坐标」的 P(x, y) 小函数，y 轴向上为正。
# =====================================================================
def _para_pts(P, a, h, k, x0, x1, n=64):
    """抛物线 y = a(x-h)² + k 在 [x0, x1] 上的屏幕坐标点列。"""
    pts = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        pts.append(P(x, a * (x - h) * (x - h) + k))
    return pts


def _axes(f, P, x0, x1, y0, y1, lab_x=True, lab_y=True, lab_o=True):
    """画带箭头的 x、y 轴（范围用数学坐标给）。"""
    f.line(P(x0, 0)[0], P(x0, 0)[1], P(x1, 0)[0], P(x1, 0)[1], w=1.3, arrow=True)
    f.line(P(0, y0)[0], P(0, y0)[1], P(0, y1)[0], P(0, y1)[1], w=1.3, arrow=True)
    if lab_x:
        f.text(P(x1, 0)[0] - 2, P(x1, 0)[1] + 17, [('x', True)], size=15)
    if lab_y:
        f.text(P(0, y1)[0] + 12, P(0, y1)[1] + 6, [('y', True)], size=15)
    if lab_o:
        f.text(P(0, 0)[0] - 12, P(0, 0)[1] + 14, 'O')


def fig_w5():
    """第 5 题：开口向下的抛物线与一条下降的直线，两交点横坐标 −4 与 1。

    按原卷描图：抛物线顶点在 y 轴左侧，左侧交点在 x 轴上方（x = −4），
    右侧交点在 x 轴下方（x = 1）；直线过 x 轴于 O 左侧一点。
    取抛物线 y = −(x+2)² + 7.5、直线 y = −x − 0.5（交点恰好 x = −4、1）。
    """
    W, H = 320, 230
    u, v = 27.0, 11.1
    ox, oy = 213.6, 131.5

    def P(x, y):
        return (ox + x * u, oy - y * v)

    f = Fig(W, H)
    _axes(f, P, -6.8, 2.6, -6.5, 9.5)
    f.poly(_para_pts(P, -1.0, -2.0, 7.5, -5.4, 1.4), w=1.8)

    def L(x):                                   # 直线 y = −x − 0.5
        return P(x, -x - 0.5)

    f.line(L(-6.8)[0], L(-6.8)[1], L(2.6)[0], L(2.6)[1], w=1.6)
    # 两条竖直虚线：标出两个交点的横坐标
    f.line(P(-4, 0)[0], P(-4, 0)[1], P(-4, 3.5)[0], P(-4, 3.5)[1], w=1.2, dash='5 4')
    f.line(P(1, 0)[0], P(1, 0)[1], P(1, -1.5)[0], P(1, -1.5)[1], w=1.2, dash='5 4')
    f.text(P(-4, 0)[0] + 4, P(-4, 0)[1] + 17, '−4', size=15)
    f.text(P(1, 0)[0] + 13, P(1, 0)[1] + 17, '1', size=15)
    return f


def fig_w7():
    """第 7 题：一面靠墙的矩形场地，墙对面留 1 m 宽的门。

    原卷只有图形没有字母：上面两道粗线是墙（比矩形长一截），
    左右两条竖线是宽，下面那条边中间断开一截（= 1 m 的门）。
    """
    W, H = 320, 190
    f = Fig(W, H)
    f.line(28, 44, 292, 44, w=2.0)            # 墙上沿
    f.line(38, 52, 282, 52, w=2.0)            # 墙下沿（= 矩形上边）
    f.line(62, 52, 62, 158, w=1.5)            # 左边（宽）
    f.line(254, 52, 254, 158, w=1.5)          # 右边（宽）
    f.line(62, 158, 147, 158, w=1.5)          # 下边左段
    f.line(169, 158, 254, 158, w=1.5)         # 下边右段（中间 22 px 是 1 m 的门）
    return f


def fig_w12():
    """第 12 题：y = ax² + bx + c 的图象，对称轴 x = 1，虚线标出。

    按原卷：开口向下，左交点在 O 左侧一点、右交点在 x = 1 右侧；
    取 y = −(x − 1)² + 2.25（两根 −0.5、2.5，y 轴截距 1.25）。
    """
    W, H = 300, 200
    u, v = 32.0, 20.0
    ox, oy = 121.0, 105.0

    def P(x, y):
        return (ox + x * u, oy - y * v)

    f = Fig(W, H)
    _axes(f, P, -3.2, 4.4, -2.6, 3.9)
    f.poly(_para_pts(P, -1.0, 1.0, 2.25, -1.15, 3.15), w=1.8)
    # 对称轴（虚线）：只画到 x 轴下方一点，标签写在它下面，避免压线
    f.line(P(1, -0.35)[0], P(1, -0.35)[1], P(1, 2.7)[0], P(1, 2.7)[1], w=1.2, dash='5 4')
    f.text(P(1, 0)[0], P(1, -1.15)[1], [('x', True), ('=1', False)], size=14)
    return f


def fig_w14():
    """第 14 题：⊙O 中 AB 为直径，C、D 在圆上，∠BOC = 80°，AD ∥ OC。

    A 在 180°、B 在 0°、C 在 80°；由 AD ∥ OC 得 D 在 160°
    （弦 AD 的方向角 = 80°），此时 ∠COD = 80°。
    """
    W, H = 260, 210
    cx, cy, r = 130.0, 100.0, 85.0

    def P(deg, rr=r):
        t = math.radians(deg)
        return (cx + rr * math.cos(t), cy - rr * math.sin(t))

    f = Fig(W, H)
    # 圆
    f.poly([P(360.0 * i / 96) for i in range(97)], w=1.5)
    A, B, C, D = P(180), P(0), P(80), P(160)
    f.line(A[0], A[1], B[0], B[1], w=1.5)          # 直径 AB
    f.line(cx, cy, C[0], C[1], w=1.5)              # 半径 OC
    f.line(cx, cy, D[0], D[1], w=1.5)              # 半径 OD
    f.line(A[0], A[1], D[0], D[1], w=1.5)          # 弦 AD
    # ∠BOC 的弧与度数
    f.poly([P(80.0 * i / 16, 26) for i in range(17)], w=1.1)
    f.text(P(40, 40)[0], P(40, 40)[1] + 5, '80°', size=13)
    f.text(A[0] - 11, A[1] + 5, 'A')
    f.text(B[0] + 11, B[1] + 5, 'B')
    f.text(C[0] + 2, C[1] - 9, 'C')
    f.text(D[0] - 4, D[1] - 9, 'D')
    f.text(cx + 3, cy + 17, 'O')
    return f


def fig_w15():
    """第 15 题：三孔桥横截面（中间大孔 + 两侧小孔，都是抛物线形）。

    原卷是砖墙 + 水面：墙底就是水面，三个孔从水面向上拱起。
    大孔高 8 m、小孔高 5 m（图上按 80 px / 50 px 画），大孔水面宽 20 m（100 px）。
    砖缝必须绕开三个孔（孔是「挖掉」的，不是画在墙上），所以按抛物线算出
    每个高度上的孔宽，再把砖缝切成若干段画。
    """
    W, H = 320, 180
    x0, x1, ytop, ywater = 20, 300, 28, 142
    arches = [(160, 50, 62), (80, 20, 92), (240, 20, 92)]   # (中心 x, 半宽, 顶点 y)

    def holes(y):
        """高度 y 处三个孔的 x 区间（抛物线 x = 中心 ± 半宽·√((y−顶点)/(水面−顶点))）。"""
        out = []
        for xc, b, ya in arches:
            if y >= ywater or y <= ya:
                continue
            w = b * math.sqrt((y - ya) / float(ywater - ya))
            out.append((xc - w, xc + w))
        return sorted(out)

    def cut(a, b, hs):
        """把线段 [a, b] 去掉若干孔区间，返回剩下的段。"""
        segs = [(a, b)]
        for h0, h1 in hs:
            nxt = []
            for s0, s1 in segs:
                if h1 <= s0 or h0 >= s1:
                    nxt.append((s0, s1))
                else:
                    if s0 < h0:
                        nxt.append((s0, h0))
                    if h1 < s1:
                        nxt.append((h1, s1))
            segs = nxt
        return segs

    f = Fig(W, H)
    # 水面：整幅宽的一条实线（就是题目里 x 轴所在的位置）+ 两道虚线示意水体
    f.line(0, ywater, W, ywater, w=1.4)
    for wy in (ywater + 10, ywater + 20):
        f.line(6, wy, W - 6, wy, w=0.8, dash='6 5')
    # 墙体轮廓
    f.line(x0, ytop, x1, ytop, w=1.8)
    f.line(x0, ytop, x0, ywater, w=1.8)
    f.line(x1, ytop, x1, ywater, w=1.8)
    # 砖缝：横缝按孔切开，竖缝落在孔里就跳过
    y = ytop + 9
    row = 0
    while y < ywater - 2:
        for a, b in cut(x0 + 2, x1 - 2, holes(y)):
            f.line(a, y, b, y, w=0.7)
        xs = x0 + (10 if row % 2 == 0 else 24)
        while xs < x1 - 4:
            if not any(h0 - 1 <= xs <= h1 + 1 for h0, h1 in holes(y - 4.5)):
                f.line(xs, y - 9, xs, y, w=0.7)
            xs += 28
        y += 9
        row += 1
    # 三个抛物线孔：大孔 110–210（宽 100 px = 20 m）、高 80 px（8 m）；
    # 小孔各宽 40 px、高 50 px（5 m）；quad 的控制点 = 2×顶点 − 端点平均
    f.quad((110, ywater), (160, 2 * 62 - ywater), (210, ywater))
    f.quad((60, ywater), (80, 2 * 92 - ywater), (100, ywater))
    f.quad((220, ywater), (240, 2 * 92 - ywater), (260, ywater))
    return f


def fig_w17():
    """附加题：y = −x² + 2x + 3（对称轴 x = 1，过 A(−1, 0)）。

    原卷两幅小图：A 在 x 轴左、B 是 y 轴截距、C 是顶点、D 在 x 轴右、P 在右支上。
    """
    W, H = 300, 210
    u, v = 33.0, 17.0
    ox, oy = 112.5, 110.0

    def P(x, y):
        return (ox + x * u, oy - y * v)

    f = Fig(W, H)
    _axes(f, P, -2.6, 4.6, -3.6, 5.3)
    f.poly(_para_pts(P, -1.0, 1.0, 4.0, -1.7, 3.7), w=1.8)
    pts = [(-1.0, 0.0, 'A'), (0.0, 3.0, 'B'), (1.0, 4.0, 'C'), (3.0, 0.0, 'D'), (2.5, 1.75, 'P')]
    for x, y, lab in pts:
        sx, sy = P(x, y)
        f.dot(sx, sy, r=2.8)
        dx, dy = {'A': (-13, 4), 'B': (-13, -6), 'C': (1, -10), 'D': (10, 4), 'P': (10, 4)}[lab]
        f.text(sx + dx, sy + dy, lab)
    return f


FIGS = {'m20': fig_q20, 'm21': fig_q21, 'm22': fig_q22,
        'm4': fig_m4, 'm13': fig_m13, 'a11': fig_a11, 'a14': fig_a14,
        'w11q5': fig_w5, 'w11q7': fig_w7, 'w11q12': fig_w12,
        'w11q14': fig_w14, 'w11q15': fig_w15, 'w11q17': fig_w17}


def build_figs():
    """返回 {题号: {w, h, svg}}。"""
    out = {}
    for qid, fn in FIGS.items():
        f = fn()
        out[qid] = {'w': f.w, 'h': f.h, 'svg': f.svg()}
    return out


# =====================================================================
#  预览（Pillow；只为肉眼核对，不参与页面）
# =====================================================================
def preview(png_path, scale=2):
    from PIL import Image, ImageDraw, ImageFont
    figs = FIGS
    pad = 12
    W = int(max(fn().w for fn in figs.values()) * scale) + pad * 2
    H = int(sum(fn().h for fn in figs.values()) * scale) + pad * (len(figs) + 1)
    im = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    fr = _fonts()
    y0 = pad
    for qid, fn in figs.items():
        f = fn()
        ox, oy = pad, y0
        for c in f.cmds:
            _draw_cmd(d, fr, c, ox, oy, scale)
        d.rectangle([ox - 4, oy - 4, ox + f.w * scale + 4, oy + f.h * scale + 4],
                    outline=(210, 210, 210))
        y0 += f.h * scale + pad * 2
    im.save(png_path)
    print('预览已写出：%s' % png_path)


def _fonts():
    import os
    from PIL import ImageFont
    win = os.environ.get('WINDIR', r'C:\Windows')
    fx = {}

    def get(name):
        if name in fx:
            return fx[name]
        path = os.path.join(win, 'Fonts', name)
        fx[name] = ImageFont.truetype(path, 13)
        return fx[name]
    out = {}
    for name in ('times.ttf', 'timesi.ttf', 'timesbd.ttf', 'msyh.ttc'):
        try:
            out[name] = get(name)
        except Exception:
            out[name] = None
    return out


def _font_for(fr, italic, size):
    from PIL import ImageFont
    key = 'timesi.ttf' if italic else 'times.ttf'
    base = fr.get(key) or fr.get('times.ttf')
    return ImageFont.truetype(base.path, size) if base else ImageFont.load_default()


def _draw_cmd(d, fr, c, ox, oy, sc):
    X = lambda v: ox + v * sc
    Y = lambda v: oy + v * sc
    col = (27, 36, 48, 255)
    k = c['k']
    if k == 'line':
        x1, y1, x2, y2 = c['p']
        _dline(d, X(x1), Y(y1), X(x2), Y(y2), c['w'] * sc, col, c['dash'], sc)
        if c['arrow']:
            _darrow(d, X(x1), Y(y1), X(x2), Y(y2), sc, col)
    elif k == 'poly':
        pts = [(X(x), Y(y)) for x, y in c['pts']]
        d.line(pts, fill=col, width=max(1, int(c['w'] * sc)), joint='curve')
    elif k == 'quad':
        (x0, y0), (cx, cy), (x1, y1) = c['p0'], c['cp'], c['p1']
        pts = []
        for i in range(c['n'] + 1):
            t = i / float(c['n'])
            x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
            y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
            pts.append((X(x), Y(y)))
        d.line(pts, fill=col, width=max(1, int(c['w'] * sc)), joint='curve')
    elif k == 'dot':
        x, y = c['p']
        r = c['r'] * sc
        d.ellipse([X(x) - r, Y(y) - r, X(x) + r, Y(y) + r], fill=col)
    elif k == 'text':
        x, y = c['p']
        size = max(6, int(round(c['size'] * sc)))
        runs = []
        total = 0.0
        for s, it in c['runs']:
            fnt = _font_for(fr, it, size, )
            w = d.textlength(s, font=fnt) if hasattr(d, 'textlength') else 8 * len(s)
            runs.append((s, fnt, w))
            total += w
        if c['anchor'] == 'middle':
            start = X(x) - total / 2
        elif c['anchor'] == 'end':
            start = X(x) - total
        else:
            start = X(x)
        for s, fnt, w in runs:
            d.text((start, Y(y)), s, font=fnt, fill=col, anchor='ls')
            start += w


def _dline(d, x1, y1, x2, y2, w, col, dash, sc):
    if not dash:
        d.line([x1, y1, x2, y2], fill=col, width=max(1, int(round(w))))
        return
    parts = dash.split()
    on = float(parts[0]) * sc
    off = float(parts[1]) * sc
    L = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    if L == 0:
        return
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    t = 0.0
    while t < L:
        e = min(L, t + on)
        d.line([x1 + ux * t, y1 + uy * t, x1 + ux * e, y1 + uy * e],
               fill=col, width=max(1, int(round(w))))
        t = e + off


def _darrow(d, x0, y0, x1, y1, sc, col):
    ln, hw = 7 * sc, 3.4 * sc
    L = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5 or 1
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    bx, by = x1 - ux * ln, y1 - uy * ln
    px, py = -uy * hw, ux * hw
    d.polygon([(x1, y1), (bx + px, by + py), (bx - px, by - py)], fill=col)


# =====================================================================
#  写回题包
# =====================================================================
def write_pack(pack_path):
    figs = build_figs()
    with open(pack_path, 'rb') as f:
        data = json.loads(f.read().decode('utf-8'))
    packs = data['packs'] if isinstance(data, dict) and 'packs' in data else data
    hit = 0
    for p in packs:
        for q in p.get('questions', []):
            fig = figs.get(q.get('id'))
            if not fig:
                continue
            q.pop('plot', None)          # 旧版是 plot 画的示意图，改成原卷插图
            q.pop('fig', None)           # 重跑时先去掉旧图，免得旧图把新图盖回去
            newq = {}
            for k, v in q.items():
                newq[k] = v
                if k == 'ask':
                    newq['fig'] = fig
            if 'fig' not in newq:
                newq['fig'] = fig
            q.clear()
            q.update(newq)
            hit += 1
        if hit:
            p['note'] = _fix_note(p.get('note', ''))
    text = json.dumps(data, ensure_ascii=False, indent=2).replace('\n', '\r\n')
    with open(pack_path, 'wb') as f:
        f.write(text.encode('utf-8'))
    print('已写入 %d 题的原卷插图：%s' % (hit, pack_path))


def _fix_note(note):
    old = '第 4/10/13/18/20/25 题的图形无法自动绘制，均请对照原卷；第 8/15/16/21/22/23/24 题配的是示意图象。'
    new = ('第 4/10/13/18/25 题的图形无法自动绘制，均请对照原卷；'
           '第 20、21、22 题已按原卷截图重画（题包里的 fig 字段，SVG 描图）；'
           '第 8/15/16/23/24 题配的是示意图象。')
    if note and old in note:
        return note.replace(old, new)
    return note


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pack', help='题包 JSON（会写入 fig 字段）')
    ap.add_argument('--write', action='store_true', help='真的写回题包')
    ap.add_argument('--preview', help='输出 PNG 预览路径')
    a = ap.parse_args()
    if a.preview:
        preview(a.preview)
    if a.pack:
        if a.write:
            write_pack(a.pack)
        else:
            for qid, fig in sorted(build_figs().items()):
                print('%s  (%dx%d)  %d 字符' % (qid, fig['w'], fig['h'], len(fig['svg'])))
    if not (a.preview or a.pack):
        ap.print_help()


if __name__ == '__main__':
    main()
