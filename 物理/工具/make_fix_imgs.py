# -*- coding: utf-8 -*-
"""把「错题专练」的题面渲染成图片（图片/pk-mid1-fix/qNN.png）。

做法：每题写一份 800px 宽的 HTML（题干用排版文字、示意图用内联 SVG），
用无头 Chrome 以 2 倍像素密度截图，再用 PIL 裁掉四周空白、缩到 1350 宽。
换题目时只改 QUESTIONS 里的 html 即可。

用法（工作目录 = 仓库根）：
    python 物理/工具/make_fix_imgs.py            # 生成全部
    python 物理/工具/make_fix_imgs.py q03 q05    # 只生成指定题
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))      # 物理/
REPO = os.path.dirname(ROOT)
OUT_DIR = os.path.join(ROOT, '图片', 'pk-mid1-fix')
TMP_DIR = os.path.join(REPO, '_recon', 'fixhtml')

CHROME_CANDS = [
    os.environ.get('CHROME_PATH', ''),
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
]

HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff}
  body{width:800px;padding:24px 28px 26px;color:#1b1b1b;
       font-family:"SimSun","Songti SC","Noto Serif SC",serif;font-size:17px;line-height:1.95}
  .no{font-weight:700}
  .fig{text-align:center;margin:8px 0 6px}
  .fig svg{vertical-align:middle}
  .cap{font-size:15px;color:#333;text-align:center;margin-top:2px}
  table{border-collapse:collapse;margin:8px auto;font-size:16px}
  td,th{border:1px solid #444;padding:3px 14px;text-align:center}
  .sub{margin-left:1.4em}
  .m{font-family:"Cambria Math","Times New Roman",serif}
</style></head><body>"""

# ---------------- 示意图（SVG） ----------------

# A1 / B2 共用：一动一定、n=2 的滑轮组（绳一端固定在横梁上，绕过动滑轮，再绕过定滑轮）
SW_SVG = """
<svg width="420" height="340" viewBox="0 0 420 340">
  <rect x="105" y="18" width="230" height="11" fill="#ececec" stroke="#333" stroke-width="2"/>
  <circle cx="240" cy="70" r="30" fill="#fff" stroke="#333" stroke-width="2"/>
  <circle cx="240" cy="70" r="3.5" fill="#333"/>
  <circle cx="170" cy="205" r="30" fill="#fff" stroke="#333" stroke-width="2"/>
  <circle cx="170" cy="205" r="3.5" fill="#333"/>
  <!-- 固定端下垂 → 绕过动滑轮底半圈 → 外公切线斜上到定滑轮右侧 → 绕过顶 → 自由端下垂 -->
  <path d="M143.4,29 V191.2 A30,30 0 0 1 196.6,218.8 L266.6,83.8 A30,30 0 0 0 213.4,56.2 A30,30 0 0 0 210,70 V{fy}"
        fill="none" stroke="#333" stroke-width="2"/>
  <rect x="140" y="242" width="60" height="44" fill="#f2f2f2" stroke="#333" stroke-width="2"/>
  <line x1="170" y1="235" x2="170" y2="242" stroke="#333" stroke-width="2"/>
  <polygon points="210,{fy} 204,{fy2} 216,{fy2}" fill="#333"/>
  <text x="218" y="{fy3}" font-size="15">F</text>
</svg>
"""


def sw_svg(fy=300):
    return (SW_SVG.replace('{fy2}', str(fy - 12)).replace('{fy3}', str(fy - 8))
            .replace('{fy}', str(fy)))


Q = {}

# ---------- A1 测力计读数 ----------
Q['q01'] = ('<p><span class="no">1．</span>（5 分）如图，滑轮组由一个定滑轮和一个动滑轮组成，'
            '物体重 G＝60 N，动滑轮重 6 N，不计绳重和摩擦。用该滑轮组把物体匀速提升。</p>'
            '<div class="fig">' + sw_svg(300) + '</div>'
            '<p>（1）绳自由端的拉力 F＝<b>________</b> N。</p>'
            '<p>（2）把弹簧测力计接在绳的自由端匀速拉动，测力计的示数为<b>________</b> N。</p>'
            '<p>（3）若换一个重 90 N 的物体（动滑轮重不变），拉力 F＝<b>________</b> N。</p>'
            '<p>（4）物体上升 0.3 m 时，绳的自由端移动<b>________</b> m。</p>')

# ---------- A2 电荷 ----------
Q['q02'] = ('<p><span class="no">2．</span>（5 分）两个带电小球用绝缘细线悬挂，原来相互吸引（图甲）。'
            '把它们接触后再分开，发现两球相互排斥，而且偏角比原来小（图乙）。</p>'
            '<div class="fig">'
            '<svg width="440" height="215" viewBox="0 0 440 215">'
            '<rect x="30" y="12" width="160" height="8" fill="#ececec" stroke="#333" stroke-width="2"/>'
            '<line x1="60" y1="20" x2="78" y2="126" stroke="#333" stroke-width="1.6"/>'
            '<line x1="160" y1="20" x2="142" y2="126" stroke="#333" stroke-width="1.6"/>'
            '<circle cx="78" cy="139" r="13" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<circle cx="142" cy="139" r="13" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<text x="100" y="196" font-size="16">甲</text>'
            '<rect x="250" y="12" width="160" height="8" fill="#ececec" stroke="#333" stroke-width="2"/>'
            '<line x1="280" y1="20" x2="268" y2="126" stroke="#333" stroke-width="1.6"/>'
            '<line x1="380" y1="20" x2="392" y2="126" stroke="#333" stroke-width="1.6"/>'
            '<circle cx="268" cy="139" r="13" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<circle cx="392" cy="139" r="13" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<text x="320" y="196" font-size="16">乙</text>'
            '</svg></div>'
            '<p>（1）原来两球带的是（　　）</p>'
            '<p class="sub">A．等量同种电荷　　B．不等量同种电荷　　C．等量异种电荷　　D．不等量异种电荷</p>'
            '<p>（2）接触后再分开，两球所带的电荷量<b>________</b>（选填“相等”或“不相等”）。</p>')

# ---------- A3 LED 极性 ----------
Q['q03'] = ('<p><span class="no">3．</span>（5 分）如图，电源、开关 S、发光二极管（LED）和小灯泡 L 串联。'
            '闭合开关后 LED 发光，LED 符号旁标出了它的“＋”极。</p>'
            '<div class="fig">'
            '<svg width="470" height="215" viewBox="0 0 470 215">'
            '<path d="M70,46 H400 V172 H70 V118 M70,96 V46" fill="none" stroke="#333" stroke-width="2"/>'
            '<line x1="54" y1="100" x2="86" y2="100" stroke="#333" stroke-width="2.4"/>'
            '<line x1="61" y1="112" x2="79" y2="112" stroke="#333" stroke-width="4"/>'
            '<text x="44" y="92" font-size="16">a</text>'
            '<text x="44" y="132" font-size="16">b</text>'
            '<circle cx="170" cy="46" r="3.2" fill="#333"/>'
            '<circle cx="196" cy="46" r="3.2" fill="#333"/>'
            '<line x1="173" y1="46" x2="196" y2="30" stroke="#333" stroke-width="2"/>'
            '<text x="168" y="24" font-size="16">S</text>'
            '<polygon points="276,30 276,62 306,46" fill="none" stroke="#333" stroke-width="2"/>'
            '<line x1="306" y1="30" x2="306" y2="62" stroke="#333" stroke-width="2"/>'
            '<text x="256" y="20" font-size="16">＋</text>'
            '<text x="272" y="86" font-size="15">LED</text>'
            '<circle cx="400" cy="109" r="20" fill="none" stroke="#333" stroke-width="2"/>'
            '<line x1="386" y1="95" x2="414" y2="123" stroke="#333" stroke-width="1.6"/>'
            '<line x1="414" y1="95" x2="386" y2="123" stroke="#333" stroke-width="1.6"/>'
            '<text x="424" y="114" font-size="16">L</text>'
            '</svg></div>'
            '<p>（1）电源的 a 端是<b>________</b>（选填“正极”或“负极”）。</p>'
            '<p>（2）LED 中的电流方向是<b>________</b>（选填“从左到右”或“从右到左”）。</p>'
            '<p>（3）若把电源的正负极对调，闭合开关后<b>________</b>（选填“LED 不发光”“L 不发光”或“都发光”）。</p>')


# ---------- A4 四冲程 ----------
def _stroke(idx, x, label, intake_open, exhaust_open, spark, piston_y, arrow):
    """画一个气缸：缸体 + 两个气门（开时阀盘下移）+ 火花 + 活塞与运动方向。"""
    g = ['<g transform="translate(%d,0)">' % x]
    g.append('<rect x="34" y="50" width="92" height="150" fill="none" stroke="#333" stroke-width="2"/>')
    # 缸盖：气门处留缺口
    g.append('<path d="M34,50 H50 M66,50 H94 M110,50 H126" fill="none" stroke="#333" stroke-width="2"/>')
    # 左气门（进气门在左）
    if intake_open:
        g.append('<path d="M58,20 V58" stroke="#333" stroke-width="2"/>')
        g.append('<rect x="50" y="56" width="16" height="5" fill="#333"/>')
        g.append('<path d="M44,18 V34" stroke="#333" stroke-width="2"/>'
                 '<polygon points="44,40 38,28 50,28" fill="#333"/>')
    else:
        g.append('<path d="M58,20 V48" stroke="#333" stroke-width="2"/>')
        g.append('<rect x="50" y="46" width="16" height="5" fill="#333"/>')
    # 右气门（排气门在右）
    if exhaust_open:
        g.append('<path d="M102,20 V58" stroke="#333" stroke-width="2"/>')
        g.append('<rect x="94" y="56" width="16" height="5" fill="#333"/>')
        g.append('<path d="M116,34 V18" stroke="#333" stroke-width="2"/>'
                 '<polygon points="116,12 110,24 122,24" fill="#333"/>')
    else:
        g.append('<path d="M102,20 V48" stroke="#333" stroke-width="2"/>')
        g.append('<rect x="94" y="46" width="16" height="5" fill="#333"/>')
    if spark:
        g.append('<path d="M80,30 l-6,10 h8 l-6,11" fill="none" stroke="#333" stroke-width="2.2"/>')
    # 活塞 + 连杆
    g.append('<rect x="38" y="%d" width="84" height="12" fill="#d8d8d8" stroke="#333" stroke-width="1.8"/>' % piston_y)
    g.append('<line x1="80" y1="%d" x2="80" y2="196" stroke="#333" stroke-width="3"/>' % (piston_y + 12))
    # 运动方向
    if arrow == 'up':
        g.append('<path d="M108,160 V126" stroke="#333" stroke-width="2"/>'
                 '<polygon points="108,118 101,132 115,132" fill="#333"/>')
    else:
        g.append('<path d="M108,120 V154" stroke="#333" stroke-width="2"/>'
                 '<polygon points="108,162 101,148 115,148" fill="#333"/>')
    g.append('<text x="70" y="224" font-size="16">%s</text>' % label)
    g.append('</g>')
    return ''.join(g)


Q['q04'] = ('<p><span class="no">4．</span>（5 分）下图是汽油机一个工作循环中四个冲程的示意图，顺序已被打乱。</p>'
            '<div class="fig">'
            '<svg width="680" height="238" viewBox="0 0 680 238">'
            + _stroke(1, 0, '①', False, False, False, 78, 'up')
            + _stroke(2, 160, '②', False, True, False, 78, 'up')
            + _stroke(3, 320, '③', False, False, True, 148, 'down')
            + _stroke(4, 480, '④', True, False, False, 148, 'down')
            + '</svg></div>'
            '<p>（1）图②表示的是<b>________</b>冲程。</p>'
            '<p>（2）这四个冲程的正确顺序是（　　）</p>'
            '<p class="sub">A．①→②→③→④　　B．④→①→③→②　　C．④→③→①→②　　D．③→①→②→④</p>')

# ---------- B1 炭炉烧水 ----------
Q['q05'] = ('<p><span class="no">5．</span>（5 分）在炭炉里装入木炭，炉子和木炭的总质量为 3 kg。'
            '烧水过程中木炭烧掉了一部分，剩下木炭与炉子的总质量为 2.6 kg。'
            '锅内水的质量为 4 kg，初温 20 ℃，加热到 80 ℃。'
            '水的比热容为 4.2×10³ J/(kg·℃)，木炭的热值为 3.4×10⁷ J/kg。</p>'
            '<div class="fig">'
            '<svg width="360" height="150" viewBox="0 0 360 150">'
            '<path d="M80,44 Q140,14 200,44" fill="none" stroke="#333" stroke-width="2"/>'
            '<path d="M80,44 H200 V88 H80 Z" fill="#f4f4f4" stroke="#333" stroke-width="2"/>'
            '<path d="M82,58 H198" stroke="#7ea6c8" stroke-width="2"/>'
            '<rect x="64" y="88" width="152" height="46" fill="#ececec" stroke="#333" stroke-width="2"/>'
            '<path d="M96,134 l10,-16 8,10 10,-14 8,20 Z" fill="#e0c98a" stroke="#333" stroke-width="1.4"/>'
            '<path d="M140,134 l10,-16 8,10 10,-14 8,20 Z" fill="#e0c98a" stroke="#333" stroke-width="1.4"/>'
            '<text x="226" y="64" font-size="15">水 4 kg</text>'
            '<text x="226" y="106" font-size="15">木炭＋炉 3 kg</text>'
            '</svg></div>'
            '<p>（1）水吸收的热量 Q<sub>吸</sub>＝<b>________</b> J。</p>'
            '<p>（2）烧掉的木炭质量是<b>________</b> kg。</p>'
            '<p>（3）这个炭炉烧水的效率 η＝<b>________</b> %。</p>')

# ---------- B2 滑轮组效率 ----------
Q['q06'] = ('<p><span class="no">6．</span>（5 分）用如图滑轮组把质量为 45 kg 的物体匀速提升 2 m，'
            '绳自由端的拉力 F＝250 N，不计绳重和摩擦。（g 取 10 N/kg）</p>'
            '<div class="fig">' + sw_svg(300) + '</div>'
            '<p>（1）绳的自由端移动的距离 s＝<b>________</b> m。</p>'
            '<p>（2）有用功 W<sub>有</sub>＝<b>________</b> J。</p>'
            '<p>（3）总功 W<sub>总</sub>＝<b>________</b> J。</p>'
            '<p>（4）滑轮组的机械效率 η＝<b>________</b> %。</p>')

# ---------- B3 电加热器 ----------
Q['q07'] = ('<p><span class="no">7．</span>（5 分）某一规格的电加热器每秒能放出 70 J 的热量。'
            '用它给 200 g 的某种液体加热 3 min，液体温度升高了 40 ℃，不计热量损失。</p>'
            '<div class="fig">'
            '<svg width="330" height="160" viewBox="0 0 330 160">'
            '<path d="M90,30 V130 H210 V30" fill="none" stroke="#333" stroke-width="2"/>'
            '<path d="M92,58 H208" stroke="#7ea6c8" stroke-width="2"/>'
            '<rect x="130" y="118" width="40" height="10" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<path d="M120,118 h8 M172,118 h8" stroke="#333" stroke-width="2"/>'
            '<path d="M150,118 V146" stroke="#333" stroke-width="2"/>'
            '<text x="222" y="80" font-size="15">液体 200 g</text>'
            '<text x="222" y="146" font-size="15">70 J/s</text>'
            '</svg></div>'
            '<p>（1）液体吸收的热量是<b>________</b> J。</p>'
            '<p>（2）该液体的比热容是<b>________</b> J/(kg·℃)。</p>'
            '<p>（3）用同一个加热器给 300 g 这种液体加热，使它升高 20 ℃，需要<b>________</b> s。</p>')

# ---------- B4 起重机 ----------
Q['q08'] = ('<p><span class="no">8．</span>（5 分）一台起重机在 10 s 内把质量为 200 kg 的货物匀速提升 3 m，'
            '电动机提供的总功率为 1 kW。（g 取 10 N/kg）</p>'
            '<div class="fig">'
            '<svg width="360" height="170" viewBox="0 0 360 170">'
            '<rect x="52" y="26" width="14" height="120" fill="#e6e6e6" stroke="#333" stroke-width="2"/>'
            '<rect x="30" y="146" width="58" height="10" fill="#e6e6e6" stroke="#333" stroke-width="2"/>'
            '<path d="M59,26 H250" stroke="#333" stroke-width="3"/>'
            '<path d="M59,26 L150,26" stroke="#333" stroke-width="3"/>'
            '<path d="M210,26 V86" stroke="#333" stroke-width="2"/>'
            '<rect x="196" y="86" width="28" height="7" fill="#dcdcdc" stroke="#333" stroke-width="1.6"/>'
            '<rect x="186" y="106" width="48" height="36" fill="#f2f2f2" stroke="#333" stroke-width="2"/>'
            '<text x="244" y="120" font-size="15">200 kg</text>'
            '<text x="252" y="40" font-size="15">P总=1 kW</text>'
            '</svg></div>'
            '<p>（1）有用功 W<sub>有</sub>＝<b>________</b> J。</p>'
            '<p>（2）有用功的功率 P<sub>有</sub>＝<b>________</b> W。</p>'
            '<p>（3）起重机的机械效率 η＝<b>________</b> %。</p>'
            '<p>（4）额外功 W<sub>额</sub>＝<b>________</b> J。</p>')

# ---------- C1 并联电路 ----------
Q['q09'] = ('<p><span class="no">9．</span>（5 分）如图，小灯泡 L₁ 和 L₂ 并联，电流表 A₁ 测 L₁ 支路的电流，'
            'A₂ 测干路电流。闭合开关 S 后，A₁ 的示数为 0.3 A，A₂ 的示数为 0.8 A。</p>'
            '<div class="fig">'
            '<svg width="470" height="215" viewBox="0 0 470 215">'
            '<path d="M60,50 H173 M207,50 H300 M300,50 H380" stroke="#333" stroke-width="2"/>'
            '<path d="M60,164 H380" stroke="#333" stroke-width="2"/>'
            '<line x1="46" y1="96" x2="74" y2="96" stroke="#333" stroke-width="2.4"/>'
            '<line x1="52" y1="108" x2="68" y2="108" stroke="#333" stroke-width="4"/>'
            '<path d="M60,50 V96 M60,108 V164" stroke="#333" stroke-width="2"/>'
            '<circle cx="120" cy="50" r="3" fill="#333"/><circle cx="146" cy="50" r="3" fill="#333"/>'
            '<line x1="123" y1="50" x2="146" y2="34" stroke="#333" stroke-width="2"/>'
            '<text x="118" y="28" font-size="15">S</text>'
            '<circle cx="190" cy="50" r="17" fill="#fff" stroke="#333" stroke-width="2"/>'
            '<text x="184" y="56" font-size="15">A₂</text>'
            '<circle cx="300" cy="77" r="17" fill="#fff" stroke="#333" stroke-width="2"/>'
            '<text x="294" y="83" font-size="15">A₁</text>'
            '<path d="M300,50 V60 M300,94 V113 M300,151 V164" stroke="#333" stroke-width="2"/>'
            '<circle cx="300" cy="132" r="19" fill="#fff" stroke="#333" stroke-width="2"/>'
            '<line x1="287" y1="119" x2="313" y2="145" stroke="#333" stroke-width="1.5"/>'
            '<line x1="313" y1="119" x2="287" y2="145" stroke="#333" stroke-width="1.5"/>'
            '<text x="326" y="136" font-size="15">L₁</text>'
            '<circle cx="300" cy="50" r="3" fill="#333"/><circle cx="300" cy="164" r="3" fill="#333"/>'
            '<path d="M380,50 V88 M380,126 V164" stroke="#333" stroke-width="2"/>'
            '<circle cx="380" cy="107" r="19" fill="#fff" stroke="#333" stroke-width="2"/>'
            '<line x1="367" y1="94" x2="393" y2="120" stroke="#333" stroke-width="1.5"/>'
            '<line x1="393" y1="94" x2="367" y2="120" stroke="#333" stroke-width="1.5"/>'
            '<text x="404" y="112" font-size="15">L₂</text>'
            '<circle cx="380" cy="50" r="3" fill="#333"/><circle cx="380" cy="164" r="3" fill="#333"/>'
            '</svg></div>'
            '<p>（1）通过 L₂ 的电流是<b>________</b> A。</p>'
            '<p>（2）若 L₁ 的灯丝烧断，L₂ 的亮度<b>________</b>（选填“不变”“变亮”“变暗”或“熄灭”）。</p>'
            '<p>（3）此时 A₂ 的示数是<b>________</b> A。</p>')

# ---------- C2 杠杆 ----------
Q['q10'] = ('<p><span class="no">10．</span>（5 分）一根质量不计的杠杆可以绕 O 点转动，OA＝0.2 m，OB＝1.0 m。'
            '在 B 点挂一个重 60 N 的物体，在 A 点用力使杠杆在水平位置平衡。</p>'
            '<div class="fig">'
            '<svg width="470" height="220" viewBox="0 0 470 220">'
            '<rect x="80" y="120" width="330" height="9" fill="#ececec" stroke="#333" stroke-width="2"/>'
            '<polygon points="80,129 66,158 94,158" fill="#dcdcdc" stroke="#333" stroke-width="2"/>'
            '<text x="58" y="176" font-size="15">O</text>'
            '<circle cx="150" cy="118" r="3.5" fill="#333"/>'
            '<text x="140" y="146" font-size="15">A</text>'
            '<circle cx="370" cy="118" r="3.5" fill="#333"/>'
            '<text x="364" y="110" font-size="15">B</text>'
            '<path d="M150,118 V72" stroke="#333" stroke-width="2"/>'
            '<polygon points="150,62 143,78 157,78" fill="#333"/>'
            '<text x="158" y="80" font-size="15">F</text>'
            '<path d="M370,129 V160" stroke="#333" stroke-width="2"/>'
            '<rect x="352" y="160" width="36" height="34" fill="#f2f2f2" stroke="#333" stroke-width="2"/>'
            '<text x="394" y="182" font-size="15">60 N</text>'
            '<path d="M96,196 H370" stroke="#888" stroke-width="1"/>'
            '<path d="M96,192 V200 M370,192 V200" stroke="#888" stroke-width="1"/>'
            '<text x="215" y="212" font-size="14">OB = 1.0 m</text>'
            '</svg></div>'
            '<p>（1）在 A 点施加垂直于杠杆的力时，F＝<b>________</b> N。</p>'
            '<p>（2）若把力的方向改成沿杠杆方向，杠杆<b>________</b>（选填“能”或“不能”）平衡。</p>'
            '<p>（3）若在 A 点斜着拉，使这个力的力臂变成 0.1 m，F＝<b>________</b> N。</p>')

# ---------- C3 汽油机效率 ----------
Q['q11'] = ('<p><span class="no">11．</span>（5 分）某汽油机的效率是 30%，它消耗了 200 g 汽油。'
            '（汽油的热值 q＝4.6×10⁷ J/kg）</p>'
            '<div class="fig">'
            '<svg width="340" height="150" viewBox="0 0 340 150">'
            '<rect x="60" y="34" width="90" height="86" fill="none" stroke="#333" stroke-width="2"/>'
            '<rect x="64" y="92" width="82" height="10" fill="#d8d8d8" stroke="#333" stroke-width="1.8"/>'
            '<line x1="105" y1="102" x2="105" y2="134" stroke="#333" stroke-width="3"/>'
            '<path d="M105,20 l-6,10 h8 l-6,11" fill="none" stroke="#333" stroke-width="2.2"/>'
            '<path d="M170,86 h44" stroke="#333" stroke-width="2"/>'
            '<polygon points="222,86 210,80 210,92" fill="#333"/>'
            '<text x="172" y="76" font-size="15">有用功 30%</text>'
            '<text x="150" y="140" font-size="15">汽油 200 g</text>'
            '</svg></div>'
            '<p>（1）汽油完全燃烧放出的热量是<b>________</b> J。</p>'
            '<p>（2）汽油机对外做的有用功是<b>________</b> J。</p>'
            '<p>（3）若这台汽油机的输出功率是 23 kW，这些汽油可供它工作<b>________</b> s。</p>')

# ---------- C4 温度-时间图像 ----------
Q['q12'] = ('<p><span class="no">12．</span>（5 分）用功率恒定的加热器给 0.5 kg 的某种液体加热（初温如图），'
            '它的温度随时间变化的关系如图。加热器每分钟放出 2100 J 的热量，不计热量损失。</p>'
            '<div class="fig">'
            '<svg width="430" height="250" viewBox="0 0 430 250">'
            '<path d="M60,30 V200 H390" fill="none" stroke="#333" stroke-width="2"/>'
            '<text x="34" y="34" font-size="13">℃</text><text x="362" y="222" font-size="13">t/min</text>'
            '<path d="M56,88 H60 M56,146 H60 M56,200 H60" stroke="#333" stroke-width="1.4"/>'
            '<text x="26" y="93" font-size="12">70</text>'
            '<text x="26" y="151" font-size="12">40</text>'
            '<text x="30" y="205" font-size="12">0</text>'
            '<path d="M150,200 V196 M240,200 V196 M330,200 V196" stroke="#333" stroke-width="1.4"/>'
            '<text x="145" y="216" font-size="12">5</text>'
            '<text x="235" y="216" font-size="12">8</text>'
            '<text x="325" y="216" font-size="12">11</text>'
            '<path d="M60,146 L150,88 L330,88" fill="none" stroke="#333" stroke-width="2.6"/>'
            '<text x="180" y="74" font-size="13">温度不变</text>'
            '</svg></div>'
            '<p>（1）前 5 min 内液体吸收的热量是<b>________</b> J。</p>'
            '<p>（2）该液体的比热容是<b>________</b> J/(kg·℃)。</p>'
            '<p>（3）5 min 后继续加热，温度不再升高，这是因为<b>________</b>。</p>'
            '<p class="sub">A．液体不再吸热　　B．液体沸腾时吸热但温度不变　　C．加热器停止放热</p>')


def find_chrome():
    for c in CHROME_CANDS:
        if c and os.path.exists(c):
            return c
    raise SystemExit('找不到 Chrome/Edge，请设置 CHROME_PATH')


def render(key, chrome):
    html = HEAD + Q[key] + '</body></html>'
    os.makedirs(TMP_DIR, exist_ok=True)
    hp = os.path.join(TMP_DIR, key + '.html')
    with open(hp, 'w', encoding='utf-8') as f:
        f.write(html)
    raw = os.path.join(TMP_DIR, key + '.png')
    profile = tempfile.mkdtemp(prefix='chrome-fix-')
    url = 'file:///' + hp.replace('\\', '/')
    H = 1500
    for attempt in range(3):
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--no-first-run', '--no-default-browser-check',
                        '--force-device-scale-factor=2',
                        '--user-data-dir=' + profile,
                        '--window-size=800,%d' % H,
                        '--virtual-time-budget=1500',
                        '--screenshot=' + raw, url],
                       check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        im = Image.open(raw).convert('RGB')
        g = im.convert('L')
        mask = g.point(lambda v: 255 if v < 246 else 0)
        bbox = mask.getbbox()
        if not bbox:
            raise SystemExit(key + '：截图全白')
        x0, y0, x1, y1 = bbox
        if y1 >= im.size[1] - 4 and attempt < 2:      # 可能被截断，加高重来
            H += 500
            continue
        pad = 16
        box = (max(0, x0 - pad), max(0, y0 - pad),
               min(im.size[0], x1 + pad), min(im.size[1], y1 + pad))
        crop = im.crop(box)
        w = 1350
        crop = crop.resize((w, int(crop.size[1] * w / crop.size[0])), Image.LANCZOS)
        os.makedirs(OUT_DIR, exist_ok=True)
        out = os.path.join(OUT_DIR, key + '.png')
        crop.save(out, optimize=True)
        return out, crop.size, os.path.getsize(out)


def main():
    keys = sys.argv[1:] or sorted(Q.keys())
    chrome = find_chrome()
    total = 0
    for k in keys:
        out, size, sz = render(k, chrome)
        total += sz
        print('%s  %s  %dx%d  %.0f KB' % (k, os.path.basename(out), size[0], size[1], sz / 1024))
    print('合计 %.2f MB' % (total / 1024 / 1024))


if __name__ == '__main__':
    main()
