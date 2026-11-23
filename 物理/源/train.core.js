/* =====================================================================
   物理闪练卡 · 纯逻辑层（不碰 DOM，可在 node 里单测）
   题全部参数化生成；图全部内联 SVG，零图片依赖。
   ===================================================================== */
var PT = (function () {
  'use strict';

  var VERSION = 1;
  var DAY = 86400000;

  /* ---------- 随机：可复现（同一 seed 同一题） ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffled(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- 数字解析：科学计数法 / 百分比 / 带单位 / 全角 / 负号变体 ---------- */
  var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  function parseNum(input) {
    if (input === null || input === undefined) return NaN;
    if (typeof input === 'number') return isFinite(input) ? input : NaN;
    var s = String(input).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[．。]/g, '.')
      .replace(/[％]/g, '%')
      .replace(/[−－—–]/g, '-')
      .replace(/[×✕✖]/g, '×')
      .replace(/[，,\s]/g, '');
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, function (m) {
      var out = '';
      for (var i = 0; i < m.length; i++) out += (SUP[m.charAt(i)] || '');
      return '^' + out;
    });
    s = s.replace(/[×xX*]\s*10\s*\^\s*/g, 'e');
    s = s.replace(/%/g, '');
    if (!s) return NaN;
    var mf = s.match(/^([-+]?(?:\d+(?:\.\d*)?|\.\d+))\/([-+]?(?:\d+(?:\.\d*)?|\.\d+))$/);
    if (mf) { var dv = parseFloat(mf[2]); return dv === 0 ? NaN : parseFloat(mf[1]) / dv; }
    if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(s)) return parseFloat(s);
    /* 允许把单位一起打进来：30N / 0.4m / 4.2e3J/(kg·℃) */
    var s2 = s.replace(/[A-Za-z\u4e00-\u9fa5℃°Ω()（）\/·、]+$/g, '');
    if (s2 && s2 !== s && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(s2)) return parseFloat(s2);
    return NaN;
  }
  function supStr(n) {
    var SUPS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    var str = String(Math.abs(n)), out = '';
    for (var i = 0; i < str.length; i++) out += SUPS[+str.charAt(i)];
    return (n < 0 ? '⁻' : '') + out;
  }
  /* 物理版数字显示：小数 + 科学计数法（不用上下分数） */
  function fmtNum(x) {
    if (!isFinite(x)) return '?';
    if (x === 0) return '0';
    var ax = Math.abs(x);
    if (ax < 1e-3 || ax >= 1e5) {
      var e = Math.floor(Math.log(ax) / Math.LN10);
      var m = x / Math.pow(10, e);
      m = Math.round(m * 1000) / 1000;
      if (Math.abs(m) >= 10) { m = m / 10; e += 1; }
      return String(m).replace('-', '−') + '×10' + supStr(e);
    }
    return String(Math.round(x * 1000) / 1000).replace('-', '−');
  }
  function relTol(ans, tol) {
    return (tol === undefined || tol === null) ? Math.max(Math.abs(ans) * 1e-3, 1e-9) : Math.abs(tol);
  }
  function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol || 1e-9) + 1e-12; }

  /* ---------- 判分：逐字段判，字段顺序 = 解题步骤 ---------- */
  function judge(q, vals) {
    var res = q.fields.map(function (f, i) {
      var v = vals[i];
      if (f.type === 'choice') return { ok: v === f.ans };
      if (f.type === 'drawline') {
        var g = armGeom(f.rodDeg, f.fDeg);
        return judgeDrawArm(v, g, f.tol);
      }
      var x = (typeof v === 'number') ? v : parseNum(v);
      if (!isFinite(x)) return { ok: false };
      var ans = f.ans;
      /* 百分比：答案存百分数（如 21），输入 21 / 21% / 0.21 都算对 */
      if (f.unit === '%' && Math.abs(ans) > 1.5 && x !== 0 && Math.abs(x) <= 1.5) x = x * 100;
      return { ok: Math.abs(x - ans) <= relTol(ans, f.tol) + 1e-9 };
    });
    var got = res.filter(function (x) { return x.ok; }).length;
    return { ok: got === res.length, got: got, total: res.length, res: res };
  }
  function ansText(f) {
    if (f.type === 'choice') return f.options[f.ans];
    if (f.type === 'drawline') return '从支点 O 向 F 的作用线作垂线，垂足处标直角（见正确画法图）';
    return fmtNum(f.ans) + (f.unit ? ' ' + f.unit : '');
  }
  function makeChoice(r, correct, distractors) {
    var pool = [correct].concat(distractors), opts = [];
    for (var i = 0; i < pool.length; i++) if (opts.indexOf(pool[i]) < 0) opts.push(pool[i]);
    for (var j = opts.length - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)), t = opts[j]; opts[j] = opts[k]; opts[k] = t; }
    return { type: 'choice', label: '', options: opts, ans: opts.indexOf(correct) };
  }
  function choiceField(r, correct, distractors, label) {
    var f = makeChoice(r, correct, distractors);
    f.label = label || '';
    return f;
  }

  /* ================= 内联 SVG 图元（零图片） ================= */
  function r1(x) { return isFinite(x) ? String(Math.round(x * 10) / 10) : '0'; }
  function svgHead(W, H, label) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (label || '题图') + '" font-family="-apple-system,PingFang SC,Microsoft YaHei,sans-serif">' +
      '<rect width="' + W + '" height="' + H + '" fill="#fbfcff" rx="10"/>';
  }
  function svgTail() { return '</svg>'; }
  function txt(x, y, s, size, fill, anchor, weight) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" font-size="' + (size || 12) + '" fill="' + (fill || '#1b2333') + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + (weight ? ' font-weight="' + weight + '"' : '') + '>' + s + '</text>';
  }
  function ln(x1, y1, x2, y2, color, w, dash) {
    return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + (color || '#1b2333') +
      '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="round"/>';
  }
  function circle(x, y, rad, fill, stroke, w) {
    return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(rad) + '" fill="' + (fill || 'none') + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2) + '"' : '') + '/>';
  }
  function arrow(x1, y1, x2, y2, color, w) {
    var ang = Math.atan2(y2 - y1, x2 - x1), L = 9;
    var ax = x2 - L * Math.cos(ang - 0.4), ay = y2 - L * Math.sin(ang - 0.4);
    var bx = x2 - L * Math.cos(ang + 0.4), by = y2 - L * Math.sin(ang + 0.4);
    return ln(x1, y1, x2, y2, color, w || 2) +
      '<path d="M' + r1(x2) + ' ' + r1(y2) + ' L' + r1(ax) + ' ' + r1(ay) + ' L' + r1(bx) + ' ' + r1(by) + ' Z" fill="' + (color || '#1b2333') + '"/>';
  }
  function hatch(x1, x2, y) {
    var out = ln(x1, y, x2, y, '#6b7280', 3);
    for (var i = x1 + 14; i < x2; i += 22) out += ln(i, y, i - 9, y + 11, '#c9d4ee', 1.6);
    return out;
  }

  function svgTension(f) {
    var mode = f.mode || 'two';
    var W = 340, H = (mode === 'string') ? 250 : 210, s = [svgHead(W, H, '测力计示意图')];
    if (mode === 'two') {
      var F = f.F || 4;
      s.push('<rect x="110" y="66" width="120" height="68" rx="10" fill="#fff" stroke="#0f9b8e" stroke-width="2.4"/>');
      s.push(txt(170, 106, '弹簧测力计', 12, '#0f9b8e', 'middle', 600));
      s.push(ln(110, 100, 88, 100, '#6b7280', 3));
      s.push(circle(84, 100, 5, '#fff', '#6b7280', 2));
      s.push(ln(230, 100, 252, 100, '#6b7280', 3));
      s.push(circle(257, 100, 5, '#fff', '#6b7280', 2));
      s.push(arrow(30, 100, 78, 100, '#d93025', 2.6));
      s.push(txt(50, 88, F + ' N', 13, '#d93025', 'middle', 700));
      s.push(arrow(310, 100, 262, 100, '#d93025', 2.6));
      s.push(txt(290, 88, F + ' N', 13, '#d93025', 'middle', 700));
      s.push(txt(170, 168, '两端各用 ' + F + ' N 的力沿相反方向拉，测力计静止', 11, '#6b7280', 'middle'));
    } else if (mode === 'pulley') {
      var G = f.G || 4;
      s.push(hatch(40, 300, 26));
      s.push(ln(210, 26, 210, 40, '#6b7280', 2.4));
      s.push(circle(210, 64, 24, '#fff', '#6b7280', 2.6));
      s.push(circle(210, 64, 4, '#6b7280'));
      s.push('<rect x="161" y="150" width="50" height="46" rx="6" fill="#e6f6f4" stroke="#0f9b8e" stroke-width="2.2"/>');
      s.push(txt(186, 179, 'G = ' + G + ' N', 12, '#0f9b8e', 'middle', 600));
      /* 物体挂在定滑轮左侧切点的正下方，绳竖直上去正好与滑轮相切（无折角） */
      s.push(ln(186, 150, 186, 64, '#1b2333', 2.2));
      s.push('<path d="M186 64 A24 24 0 0 1 234 64" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(ln(234, 64, 234, 110, '#1b2333', 2.2));
      s.push('<rect x="214" y="110" width="40" height="66" rx="8" fill="#fff" stroke="#0f9b8e" stroke-width="2.2"/>');
      s.push(txt(234, 148, '测力计', 10, '#0f9b8e', 'middle', 600));
      s.push(arrow(234, 176, 234, 204, '#d93025', 2.6));
    } else {
      var G2 = f.G || 4;
      s.push(hatch(60, 240, 24));
      s.push(ln(150, 24, 150, 62, '#1b2333', 2.2));
      s.push('<rect x="126" y="62" width="48" height="86" rx="9" fill="#fff" stroke="#0f9b8e" stroke-width="2.2"/>');
      s.push(txt(150, 110, '测力计', 10, '#0f9b8e', 'middle', 600));
      s.push(ln(150, 148, 150, 186, '#1b2333', 2.2));
      s.push('<rect x="118" y="186" width="64" height="46" rx="6" fill="#e6f6f4" stroke="#0f9b8e" stroke-width="2.2"/>');
      s.push(txt(150, 215, 'G = ' + G2 + ' N', 12, '#0f9b8e', 'middle', 600));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgCharge(f) {
    var W = 320, H = 220, s = [svgHead(W, H, '带电小球示意图')];
    var mode = f.mode || 'touch';
    if (mode === 'touch') {
      s.push(hatch(40, 280, 26));
      s.push(ln(220, 26, 220, 104, '#9aa3b5', 1.6, '4 4'));
      s.push(circle(220, 120, 16, '#c9d4ee', '#6b7280', 2));
      s.push(txt(220, 124, '球', 11, '#1b2333', 'middle', 600));
      s.push('<rect x="40" y="102" width="96" height="16" rx="8" fill="#b58b3a"/>');
      s.push(txt(88, 94, '橡胶棒（带负电）', 11, '#8a6420', 'middle'));
      s.push(arrow(240, 120, 292, 120, '#d93025', 2.4));
      s.push(txt(266, 108, '被弹开', 11, '#d93025', 'middle', 600));
    } else {
      s.push(hatch(40, 300, 26));
      s.push(ln(110, 26, 110, 104, '#9aa3b5', 1.6, '4 4'));
      s.push(ln(210, 26, 210, 104, '#9aa3b5', 1.6, '4 4'));
      s.push(circle(110, 120, 16, '#c9d4ee', '#6b7280', 2));
      s.push(circle(210, 120, 16, '#c9d4ee', '#6b7280', 2));
      s.push(txt(110, 124, 'A', 12, '#1b2333', 'middle', 700));
      s.push(txt(210, 124, 'B', 12, '#1b2333', 'middle', 700));
      s.push(arrow(128, 120, 168, 120, '#d93025', 2.4));
      s.push(arrow(192, 120, 152, 120, '#d93025', 2.4));
      s.push(txt(160, 100, '相互吸引', 11, '#d93025', 'middle', 600));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgStroke(f) {
    var W = 300, H = 270, s = [svgHead(W, H, '汽油机冲程示意图')];
    var stroke = f.stroke || 'compress';
    var pistonY = (stroke === 'intake' || stroke === 'power') ? 150 : 104;
    s.push(ln(100, 40, 100, 200, '#6b7280', 3));
    s.push(ln(200, 40, 200, 200, '#6b7280', 3));
    s.push(ln(100, 40, 200, 40, '#6b7280', 3));
    s.push(ln(100, 200, 200, 200, '#6b7280', 3));
    s.push('<rect x="104" y="' + pistonY + '" width="92" height="16" rx="3" fill="#c9d4ee" stroke="#6b7280" stroke-width="2"/>');
    s.push(ln(150, pistonY + 16, 172, 226, '#6b7280', 4));
    s.push(circle(150, 226, 24, 'none', '#6b7280', 2.4));
    s.push(circle(172, 226, 4, '#6b7280'));
    s.push(circle(150, 226, 4, '#6b7280'));
    var intakeOpen = (stroke === 'intake'), exhaustOpen = (stroke === 'exhaust');
    function valve(x, open, label) {
      var headY = open ? 58 : 42;
      var out = ln(x, 16, x, headY, '#1b2333', 3) + ln(x - 11, headY, x + 11, headY, '#1b2333', 3.6) + txt(x, 12, label, 10, '#6b7280', 'middle');
      return out;
    }
    s.push(valve(126, intakeOpen, '进气门'));
    s.push(valve(174, exhaustOpen, '排气门'));
    if (stroke === 'intake') s.push(arrow(126, 70, 126, 96, '#0f9d58', 2));
    if (stroke === 'exhaust') s.push(arrow(174, 96, 174, 68, '#d93025', 2));
    if (stroke === 'power') {
      s.push('<path d="M150 46 l-7 12 l14 0 l-7 12" fill="none" stroke="#e37400" stroke-width="2.4"/>');
      s.push(txt(150, 88, '点火', 10, '#e37400', 'middle', 600));
    }
    if (stroke === 'compress' || stroke === 'exhaust') {
      s.push(arrow(120, pistonY + 34, 120, pistonY + 10, '#d93025', 2));
      s.push(arrow(180, pistonY + 34, 180, pistonY + 10, '#d93025', 2));
    } else {
      s.push(arrow(120, pistonY - 12, 120, pistonY + 12, '#d93025', 2));
      s.push(arrow(180, pistonY - 12, 180, pistonY + 12, '#d93025', 2));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgPulley(f) {
    var W = 340, H = 300, s = [svgHead(W, H, '滑轮组示意图')];
    var variant = f.variant || ('n' + (f.n || 2));
    s.push(hatch(30, 310, 24));
    var MX = 140, MY = 190, FR = 22, FXc = 200, FYc = 64;
    function movingPulley() {
      s.push(circle(MX, MY, FR, '#fff', '#6b7280', 2.6));
      s.push(circle(MX, MY, 4, '#6b7280'));
    }
    function fixedPulley() {
      s.push(ln(FXc, 24, FXc, FYc - FR, '#6b7280', 2.4));
      s.push(circle(FXc, FYc, FR, '#fff', '#6b7280', 2.6));
      s.push(circle(FXc, FYc, 4, '#6b7280'));
    }
    function box(x, y) {
      s.push(ln(x, y - 12, x, y, '#1b2333', 2.2));
      s.push('<rect x="' + (x - 30) + '" y="' + y + '" width="60" height="44" rx="6" fill="#e6f6f4" stroke="#0f9b8e" stroke-width="2.2"/>');
      s.push(txt(x, y + 27, 'G', 13, '#0f9b8e', 'middle', 700));
    }
    if (variant === 'n2') {
      movingPulley(); fixedPulley(); box(MX, 224);
      s.push(ln(MX - FR, 24, MX - FR, MY, '#1b2333', 2.2));
      s.push('<path d="M' + (MX - FR) + ' ' + MY + ' A' + FR + ' ' + FR + ' 0 0 0 ' + (MX + FR) + ' ' + MY + '" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(ln(MX + FR, MY, FXc - FR, FYc, '#1b2333', 2.2));
      s.push('<path d="M' + (FXc - FR) + ' ' + FYc + ' A' + FR + ' ' + FR + ' 0 0 1 ' + (FXc + FR) + ' ' + FYc + '" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(arrow(FXc + FR, FYc, FXc + FR, 150, '#1b2333', 2.2));
    } else if (variant === 'n3') {
      movingPulley(); fixedPulley(); box(MX, 224);
      /* 第三条绳的绳端系在动滑轮框架上：从圆顶点引一小段到「系绳环」，再从系绳环引到定滑轮；
         绕过动滑轮的弧必须从底部过（sweep=1：右切点→底部→左切点）。 */
      s.push(ln(MX - 12, MY - FR - 8, MX + 12, MY - FR - 8, '#6b7280', 2));
      s.push(ln(MX, MY - FR, MX, MY - FR - 8, '#1b2333', 2.2));
      s.push(circle(MX, MY - FR - 8, 3.5, '#fff', '#6b7280', 2));
      s.push(txt(MX + 8, MY - FR - 3, '系', 9, '#6b7280', 'start'));
      s.push(ln(MX, MY - FR - 8, FXc - FR, FYc, '#1b2333', 2.2));
      s.push('<path d="M' + (FXc - FR) + ' ' + FYc + ' A' + FR + ' ' + FR + ' 0 0 1 ' + (FXc + FR) + ' ' + FYc + '" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(ln(FXc + FR, FYc, MX + FR, MY, '#1b2333', 2.2));
      s.push('<path d="M' + (MX + FR) + ' ' + MY + ' A' + FR + ' ' + FR + ' 0 0 1 ' + (MX - FR) + ' ' + MY + '" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(arrow(MX - FR, MY, MX - FR, 40, '#1b2333', 2.2));
    } else if (variant === 'n1a') {
      movingPulley(); box(MX, 224);
      s.push(ln(MX, MY - FR, MX, 24, '#1b2333', 2.2));
    } else {
      fixedPulley(); box(MX, 224);
      s.push(ln(MX, 212, MX, 120, '#1b2333', 2.2));
      s.push(ln(MX, 120, FXc - FR, FYc, '#1b2333', 2.2));
      s.push('<path d="M' + (FXc - FR) + ' ' + FYc + ' A' + FR + ' ' + FR + ' 0 0 1 ' + (FXc + FR) + ' ' + FYc + '" fill="none" stroke="#1b2333" stroke-width="2.2"/>');
      s.push(arrow(FXc + FR, FYc, FXc + FR, 150, '#1b2333', 2.2));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgLever(f) {
    var W = 340, H = 280, s = [svgHead(W, H, '杠杆示意图')];
    var rodDeg = (f.rodDeg == null ? 20 : f.rodDeg) * Math.PI / 180;
    var fDeg = (f.fDeg == null ? 115 : f.fDeg) * Math.PI / 180;
    var O = { x: 62, y: 210 }, L = 232;
    var B = { x: O.x + L * Math.cos(rodDeg), y: O.y - L * Math.sin(rodDeg) };
    var A = { x: O.x + L * 0.55 * Math.cos(rodDeg), y: O.y - L * 0.55 * Math.sin(rodDeg) };
    var dir = { x: Math.cos(fDeg), y: Math.sin(fDeg) };
    s.push(ln(O.x, O.y, B.x, B.y, '#1b2333', 6));
    s.push(circle(O.x, O.y, 7, '#fff', '#1b2333', 2.6));
    s.push(txt(O.x - 14, O.y + 24, 'O', 13, '#1b2333', 'middle', 700));
    s.push(txt(B.x + 12, B.y - 10, 'B', 12, '#1b2333', 'middle', 700));
    s.push(txt(A.x - 14, A.y - 10, 'A', 12, '#1b2333', 'middle', 700));
    s.push(arrow(A.x, A.y, A.x, A.y + 46, '#0f9b8e', 2.6));
    s.push('<rect x="' + r1(A.x - 20) + '" y="' + r1(A.y + 46) + '" width="40" height="26" rx="4" fill="#e6f6f4" stroke="#0f9b8e" stroke-width="2"/>');
    s.push(txt(A.x, A.y + 64, 'G', 12, '#0f9b8e', 'middle', 700));
    var Fe = { x: B.x + dir.x * 56, y: B.y + dir.y * 56 };
    s.push(arrow(B.x, B.y, Fe.x, Fe.y, '#d93025', 2.8));
    s.push(txt(Fe.x + 10, Fe.y + 5, 'F', 13, '#d93025', 'middle', 700));
    var lt = f.ltype || 'none';
    if (lt !== 'none') {
      var col = (lt === 'perp') ? '#0f9d58' : '#d93025';
      if (lt === 'perp' || lt === 'wrongperp') {
        var base = (lt === 'perp') ? B : A;
        var d2 = (lt === 'perp') ? dir : { x: 0, y: 1 };
        var L2 = 300;
        s.push(ln(base.x - d2.x * L2, base.y - d2.y * L2, base.x + d2.x * L2, base.y + d2.y * L2, '#9aa3b5', 1.6, '6 5'));
        var tt = (O.x - base.x) * d2.x + (O.y - base.y) * d2.y;
        var P = { x: base.x + d2.x * tt, y: base.y + d2.y * tt };
        s.push(ln(O.x, O.y, P.x, P.y, col, 2.8));
        s.push(circle(P.x, P.y, 3.5, col));
        var ux = (P.x - O.x), uy = (P.y - O.y), ul = Math.hypot(ux, uy) || 1;
        ux /= ul; uy /= ul;
        var m = 9;
        s.push('<path d="M' + r1(P.x - ux * m) + ' ' + r1(P.y - uy * m) + ' L' + r1(P.x - ux * m + d2.x * m) + ' ' + r1(P.y - uy * m + d2.y * m) + ' L' + r1(P.x + d2.x * m) + ' ' + r1(P.y + d2.y * m) + '" fill="none" stroke="' + col + '" stroke-width="1.6"/>');
        s.push(txt((O.x + P.x) / 2 - 6, (O.y + P.y) / 2 + 18, 'l', 14, col, 'middle', 700));
      } else if (lt === 'point') {
        s.push(ln(O.x, O.y, B.x, B.y, col, 2.8));
        s.push(txt((O.x + B.x) / 2 + 6, (O.y + B.y) / 2 + 20, 'l', 14, col, 'middle', 700));
      } else {
        s.push(ln(O.x, O.y, A.x, A.y, col, 2.8));
        s.push(txt((O.x + A.x) / 2 - 12, (O.y + A.y) / 2 + 18, 'l', 14, col, 'middle', 700));
      }
    }
    s.push(svgTail());
    return s.join('');
  }

  /* ---- 手绘力臂：几何计算 / 判定 / 待作图底图（老师反馈：从支点向作用线作垂线、标直角、把力臂画清楚） ---- */
  /* 与 svgLever 完全同一套几何，保证「题目给的作用线」和「判分用的垂足」是同一条线 */
  function armGeom(rodDeg, fDeg) {
    var rd = (rodDeg == null ? 20 : rodDeg) * Math.PI / 180;
    var fd = (fDeg == null ? 115 : fDeg) * Math.PI / 180;
    var O = { x: 62, y: 210 }, L = 232;
    var B = { x: O.x + L * Math.cos(rd), y: O.y - L * Math.sin(rd) };
    var dir = { x: Math.cos(fd), y: Math.sin(fd) };
    var t = (O.x - B.x) * dir.x + (O.y - B.y) * dir.y;
    var P = { x: B.x + dir.x * t, y: B.y + dir.y * t };   /* 垂足 */
    return { O: O, B: B, dir: dir, P: P, W: 340, H: 280 };
  }
  /* 距离点 (p) 到过 B、方向 dir（单位向量）的作用线 */
  function distToLine(p, B, dir) {
    var vx = p.x - B.x, vy = p.y - B.y;
    return Math.abs(vx * dir.y - vy * dir.x);
  }
  /* 手绘判定：起点离 O 近 + 终点落在作用线上 + 连线垂直于作用线（直角）。
     g 为armGeom，v={x1,y1,x2,y2}（SVG 坐标，起点/终点可互换） */
  function judgeDrawArm(v, g, tol) {
    tol = tol || {};
    var tolO = tol.o || 15, tolLine = tol.line || 13, tolDot = tol.dot || 0.07;
    if (!v || !isFinite(v.x1) || !isFinite(v.y1) || !isFinite(v.x2) || !isFinite(v.y2)) return { ok: false };
    var S = { x: v.x1, y: v.y1 }, E = { x: v.x2, y: v.y2 };
    var dS = Math.hypot(S.x - g.O.x, S.y - g.O.y), dE = Math.hypot(E.x - g.O.x, E.y - g.O.y);
    var start = dS <= dE ? S : E, end = dS <= dE ? E : S;    /* 允许从任一端起笔 */
    if (Math.hypot(start.x - g.O.x, start.y - g.O.y) > tolO) return { ok: false };
    if (distToLine(end, g.B, g.dir) > tolLine) return { ok: false };
    var sx = end.x - start.x, sy = end.y - start.y, sl = Math.hypot(sx, sy);
    if (sl < 8) return { ok: false };
    var dot = Math.abs((sx * g.dir.x + sy * g.dir.y) / sl);  /* 0 = 垂直 */
    if (dot > tolDot) return { ok: false };
    return { ok: true };
  }
  /* 待作图底图：画杠杆 + 支点 + 力 F + 作用线延长虚线，但不画力臂（留给学生画） */
  function svgArmBase(f) {
    var g = armGeom(f.rodDeg, f.fDeg), W = g.W, H = g.H, s = [svgHead(W, H, '画力臂·从支点向作用线作垂线')];
    var O = g.O, B = g.B, dir = g.dir;
    var A = { x: O.x + (B.x - O.x) * 0.55, y: O.y + (B.y - O.y) * 0.55 };
    s.push(ln(O.x, O.y, B.x, B.y, '#1b2333', 6));
    s.push(circle(O.x, O.y, 7, '#fff', '#1b2333', 2.6));
    s.push(txt(O.x - 14, O.y + 24, 'O', 13, '#1b2333', 'middle', 700));
    s.push(txt(B.x + 12, B.y - 10, 'B', 12, '#1b2333', 'middle', 700));
    s.push(txt(A.x - 14, A.y - 10, 'A', 12, '#1b2333', 'middle', 700));
    s.push(arrow(A.x, A.y, A.x, A.y + 46, '#0f9b8e', 2.6));
    s.push('<rect x="' + r1(A.x - 20) + '" y="' + r1(A.y + 46) + '" width="40" height="26" rx="4" fill="#e6f6f4" stroke="#0f9b8e" stroke-width="2"/>');
    s.push(txt(A.x, A.y + 64, 'G', 12, '#0f9b8e', 'middle', 700));
    var L2 = 320;
    s.push(ln(B.x - dir.x * L2, B.y - dir.y * L2, B.x + dir.x * L2, B.y + dir.y * L2, '#93a0b5', 1.8, '7 6'));
    var Fe = { x: B.x + dir.x * 56, y: B.y + dir.y * 56 };
    s.push(arrow(B.x, B.y, Fe.x, Fe.y, '#d93025', 2.8));
    s.push(txt(Fe.x + 10, Fe.y + 5, 'F', 13, '#d93025', 'middle', 700));
    s.push(txt(B.x - dir.x * 70, B.y - dir.y * 70 + 16, 'F 的作用线', 11, '#7a879d', 'middle', 500));
    s.push(svgTail());
    return s.join('');
  }
  /* 正确画法示范图：绿线 O→垂足 + 直角符号 + l 标注（复用已验证的 perp 画法） */
  function svgArmAnswer(f) {
    return svgLever({ type: 'lever', mode: 'draw', ltype: 'perp', rodDeg: f.rodDeg, fDeg: f.fDeg });
  }
  /* 生成一道手绘力臂固定题（放进 DRAW，按 kind=armdraw 过滤） */
  function mkArmItem(id, title, rodDeg, fDeg, prompt, tip, explain) {
    var g = armGeom(rodDeg, fDeg);
    return {
      id: id, kind: 'armdraw', title: title,
      prompt: prompt,
      fields: [{
        type: 'drawline', label: '', rodDeg: rodDeg, fDeg: fDeg,
        ans: { x1: g.O.x, y1: g.O.y, x2: g.P.x, y2: g.P.y }
      }],
      tip: tip,
      explain: explain,
      fig: { type: 'lever', mode: 'model', rodDeg: rodDeg, fDeg: fDeg }, figBefore: false,
      drawFig: { type: 'armbase', rodDeg: rodDeg, fDeg: fDeg },
      answerFig: { type: 'armanswer', rodDeg: rodDeg, fDeg: fDeg },
      kp: ['杠杆', '力臂', '作垂线']
    };
  }

  function svgCircuit(f) {
    var W = 340, H = 240, s = [svgHead(W, H, '电路图')];
    var kind = f.kind || 'parallel';
    function wire(x1, y1, x2, y2) { s.push(ln(x1, y1, x2, y2, '#1b2333', 2.4)); }
    function gapRect(x, y, w, h) { s.push('<rect x="' + r1(x - w / 2) + '" y="' + r1(y - h / 2) + '" width="' + w + '" height="' + h + '" fill="#fbfcff"/>'); }
    function lamp(x, y, label) {
      s.push(circle(x, y, 13, '#fff', '#1b2333', 2.4));
      s.push(ln(x - 9, y - 9, x + 9, y + 9, '#1b2333', 2.2));
      s.push(ln(x - 9, y + 9, x + 9, y - 9, '#1b2333', 2.2));
      s.push(txt(x, y - 19, label, 12, '#1b2333', 'middle', 600));
    }
    function ammeter(x, y, label) {
      s.push(circle(x, y, 14, '#fff', '#1b2333', 2.4));
      s.push(txt(x, y + 5, 'A', 14, '#1b2333', 'middle', 700));
      s.push(txt(x, y - 21, label, 11, '#6b7280', 'middle', 600));
    }
    function voltmeter(x, y) {
      s.push(circle(x, y, 14, '#fff', '#1b2333', 2.4));
      s.push(txt(x, y + 5, 'V', 14, '#1b2333', 'middle', 700));
    }
    function battery(x, y) {
      gapRect(x, y, 44, 28);
      s.push(ln(x - 26, y, x - 14, y, '#1b2333', 2.4));
      s.push(ln(x - 14, y - 12, x - 14, y + 12, '#1b2333', 3));
      s.push(ln(x + 4, y - 6, x + 4, y + 6, '#1b2333', 6));
      s.push(ln(x + 4, y, x + 18, y, '#1b2333', 2.4));
      s.push(txt(x - 18, y - 16, '+', 12, '#d93025', 'middle', 700));
    }
    function sw(x, y) {
      gapRect(x, y, 46, 28);
      s.push(ln(x - 26, y, x - 16, y, '#1b2333', 2.4));
      s.push(circle(x - 16, y, 3, '#1b2333'));
      s.push(circle(x + 16, y, 3, '#1b2333'));
      s.push(ln(x - 16, y, x + 10, y - 12, '#1b2333', 2.4));
      s.push(ln(x + 16, y, x + 26, y, '#1b2333', 2.4));
      s.push(txt(x, y - 20, 'S', 11, '#6b7280', 'middle', 600));
    }
    function led(x, y) {
      gapRect(x, y, 60, 34);
      s.push(ln(x - 30, y, x - 10, y, '#1b2333', 2.4));
      s.push('<path d="M' + r1(x - 10) + ' ' + r1(y - 9) + ' L' + r1(x - 10) + ' ' + r1(y + 9) + ' L' + r1(x + 8) + ' ' + r1(y) + ' Z" fill="#1b2333"/>');
      s.push(ln(x + 8, y - 10, x + 8, y + 10, '#1b2333', 3));
      s.push(ln(x + 8, y, x + 30, y, '#1b2333', 2.4));
      s.push(arrow(x + 12, y - 12, x + 22, y - 22, '#e37400', 1.8));
      s.push(arrow(x + 18, y - 8, x + 28, y - 18, '#e37400', 1.8));
      s.push(txt(x - 16, y - 20, 'A', 12, '#d93025', 'middle', 700));
      s.push(txt(x + 16, y - 20, 'B', 12, '#d93025', 'middle', 700));
    }
    if (kind === 'led-symbol') {
      /* 只画 LED 符号本身、不画电池极性：避免「A 端接正极」被图直接剧透 */
      led(170, 110);
      s.push(txt(170, 172, '发光二极管（LED）符号：A 长脚（阳极），B 短脚（阴极）', 10, '#6b7280', 'middle'));
    } else if (kind === 'led') {
      wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
      led(170, 70); battery(110, 190); sw(220, 190);
    } else if (kind === 'series' || kind === 'connect-series') {
      wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
      lamp(140, 70, 'L₁'); lamp(230, 70, 'L₂'); battery(110, 190); sw(215, 190);
    } else if (kind === 'clip-gap') {
      /* 金属夹 A、B 之间留缺口：接导体灯亮，接绝缘体灯不亮 */
      wire(60, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 60, 190);
      lamp(170, 70, 'L');
      battery(170, 190);
      wire(60, 70, 60, 110); wire(60, 150, 60, 190);
      s.push(circle(60, 110, 4, '#1b2333'));
      s.push(circle(60, 150, 4, '#1b2333'));
      s.push(txt(46, 106, 'A', 12, '#d93025', 'end', 700));
      s.push(txt(46, 158, 'B', 12, '#d93025', 'end', 700));
      s.push('<line x1="60" y1="116" x2="60" y2="144" stroke="#8aa2bd" stroke-width="2" stroke-dasharray="5 5"/>');
      s.push(txt(86, 137, '接入物品', 11, '#6b7280', 'start'));
    } else {
      wire(50, 70, 290, 70); wire(50, 120, 290, 120); wire(50, 190, 290, 190);
      wire(50, 70, 50, 190); wire(290, 70, 290, 190);
      lamp(130, 70, 'L₁'); lamp(180, 120, 'L₂');
      if (kind === 'parallel') {
        ammeter(225, 70, 'A₁'); battery(110, 190); sw(196, 190); ammeter(258, 190, 'A₂');
      } else if (kind === 'parallel-plain') {
        battery(110, 190); sw(196, 190);
      } else if (kind === 'connect-parallel') {
        battery(110, 190); sw(215, 190);
      } else if (kind === 'connect-switchbranch') {
        battery(110, 190); sw(225, 70);
      } else if (kind === 'connect-short') {
        battery(110, 190); sw(215, 190); wire(50, 155, 290, 155);
      } else if (kind === 'connect-ammeterL1') {
        battery(110, 190); sw(215, 190); ammeter(225, 70, 'A');
      } else if (kind === 'connect-ammeterMain') {
        battery(110, 190); sw(215, 190); ammeter(258, 190, 'A');
      } else if (kind === 'connect-ammeterL2') {
        battery(110, 190); sw(215, 190); ammeter(240, 120, 'A');
      } else if (kind === 'connect-ammeterShort') {
        battery(110, 190); sw(215, 190); wire(50, 155, 290, 155); ammeter(170, 155, 'A');
      } else if (kind === 'connect-voltmeterSL1') {
        /* 串联电路：电压表并联在 L₁ 两端（正确接法） */
        wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
        lamp(140, 70, 'L₁'); lamp(230, 70, 'L₂'); battery(110, 190); sw(215, 190);
        wire(115, 70, 115, 95); wire(115, 95, 165, 95); wire(165, 95, 165, 70); voltmeter(140, 95);
      } else if (kind === 'connect-voltmeterSloop') {
        /* 串联电路：电压表串进电路（错误） */
        wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
        lamp(140, 70, 'L₁'); lamp(230, 70, 'L₂'); battery(110, 190); sw(215, 190); voltmeter(185, 70);
      } else if (kind === 'connect-voltmeterSbattery') {
        /* 串联电路：电压表并在电源两端（测的是总电压，不是 L₁） */
        wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
        lamp(140, 70, 'L₁'); lamp(230, 70, 'L₂'); battery(110, 190); sw(215, 190);
        wire(75, 190, 75, 215); wire(75, 215, 145, 215); wire(145, 215, 145, 190); voltmeter(110, 215);
      } else if (kind === 'connect-voltmeterSL2') {
        /* 串联电路：电压表并在 L₂ 两端（测错对象） */
        wire(50, 70, 290, 70); wire(290, 70, 290, 190); wire(290, 190, 50, 190); wire(50, 190, 50, 70);
        lamp(140, 70, 'L₁'); lamp(230, 70, 'L₂'); battery(110, 190); sw(215, 190);
        wire(205, 70, 205, 95); wire(205, 95, 255, 95); wire(255, 95, 255, 70); voltmeter(230, 95);
      }
    }
    s.push(svgTail());
    return s.join('');
  }

  /* 干电池组：n 节串联，左端 +、右端 − */
  function svgBattery(f) {
    var n = (f && f.n) || 2;
    var W = 380, H = 200, s = [svgHead(W, H, '干电池组')];
    var cellW = 58, gap = 10, total = n * cellW + (n - 1) * gap;
    var x0 = (W - total) / 2, top = 46, bot = 138;
    s.push('<rect x="' + r1(x0 - 16) + '" y="' + bot + '" width="' + r1(total + 32) + '" height="18" rx="4" fill="#c9d8ea" stroke="#8aa2bd" stroke-width="1.5"/>');
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (cellW + gap);
      s.push('<rect x="' + r1(x) + '" y="' + top + '" width="' + cellW + '" height="' + (bot - top) + '" rx="7" fill="#2f4f73" stroke="#1b2333" stroke-width="1.4"/>');
      s.push('<rect x="' + r1(x + 8) + '" y="' + (top + 8) + '" width="' + (cellW - 16) + '" height="12" fill="#d9b26a" opacity="0.9"/>');
      s.push('<rect x="' + r1(x + cellW / 2 - 7) + '" y="' + (top - 6) + '" width="14" height="7" rx="2" fill="#8aa2bd" stroke="#1b2333" stroke-width="1"/>');
      if (i < n - 1) {
        var xn = x0 + (i + 1) * (cellW + gap);
        s.push('<path d="M' + r1(x + cellW) + ' ' + (top + 18) + ' Q' + r1((x + cellW + xn) / 2) + ' ' + (top - 8) + ' ' + r1(xn) + ' ' + (top + 18) + '" fill="none" stroke="#1b2333" stroke-width="1.8"/>');
      }
    }
    s.push(txt(x0 - 28, top + 18, '+', 20, '#d93025', 'middle', 700));
    s.push(txt(x0 + total + 28, top + 18, '−', 20, '#1b2333', 'middle', 700));
    s.push(txt(W / 2, 180, n + ' 节干电池串联', 12, '#6b7280', 'middle'));
    s.push(svgTail());
    return s.join('');
  }

  /* 金属丝规格表（控制变量题） */
  function svgWireTable(f) {
    var rows = (f && f.rows) || [];
    var W = 400, H = 32 + (rows.length + 1) * 32 + 14;
    var s = [svgHead(W, H, '金属丝规格表')];
    var x0 = 10, y0 = 12, cols = [58, 126, 78, 118];
    var head = ['编号', '材料', '长度/m', '横截面积/mm²'];
    function cell(x, y, w, t, bold) {
      s.push('<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="32" fill="#fff" stroke="#8aa2bd" stroke-width="1"/>');
      s.push(txt(x + w / 2, y + 21, t, 11, '#1b2333', 'middle', bold ? 700 : 400));
    }
    var x = x0, y = y0;
    for (var c = 0; c < 4; c++) { cell(x, y, cols[c], head[c], true); x += cols[c]; }
    y += 32;
    for (var i = 0; i < rows.length; i++) {
      x = x0;
      var vals = [rows[i].no, rows[i].mat, Number(rows[i].len).toFixed(1), Number(rows[i].area).toFixed(1)];
      for (var j = 0; j < 4; j++) { cell(x, y, cols[j], vals[j], false); x += cols[j]; }
      y += 32;
    }
    s.push(svgTail());
    return s.join('');
  }

  /* 表盘通用：外圈绿色刻度（0~outerMax）、内圈灰色刻度（0~innerMax），各 6 大格；unit 标在圆心下方 */
  function svgMeterDial(f, unit, title, outerMax, innerMax) {
    var W = 320, H = 285, s = [svgHead(W, H, title)];
    var C = { x: 160, y: 205 }, R = 118, a0 = 210, a1 = -30;
    function pt(frac, rad) {
      var a = (a0 + (a1 - a0) * frac) * Math.PI / 180;
      return { x: C.x + rad * Math.cos(a), y: C.y - rad * Math.sin(a) };
    }
    var d = [];
    for (var i = 0; i <= 60; i++) { var p = pt(i / 60, R); d.push((i ? 'L' : 'M') + r1(p.x) + ' ' + r1(p.y)); }
    s.push('<path d="' + d.join(' ') + '" fill="none" stroke="#1b2333" stroke-width="2.6"/>');
    var div = 30;
    for (var k = 0; k <= div; k++) {
      var fr = k / div, major = (k % 5 === 0);
      var p1 = pt(fr, R), p2 = pt(fr, R - (major ? 15 : 8));
      s.push(ln(p1.x, p1.y, p2.x, p2.y, '#1b2333', major ? 2 : 1.2));
    }
    for (var j = 0; j <= 6; j++) { var pp = pt(j / 6, R - 30); s.push(txt(pp.x, pp.y + 4, fmtNum(j * outerMax / 6), 10, '#0f9b8e', 'middle')); }
    for (var j2 = 0; j2 <= 6; j2++) { var pp2 = pt(j2 / 6, R - 52); s.push(txt(pp2.x, pp2.y + 4, fmtNum(j2 * innerMax / 6), 10, '#6b7280', 'middle')); }
    var frac = f.range ? Math.max(0, Math.min(1, f.reading / f.range)) : 0;
    var np = pt(frac, R - 22);
    s.push(ln(C.x, C.y, np.x, np.y, '#d93025', 3));
    s.push(circle(np.x, np.y, 4.5, '#d93025'));
    s.push(circle(C.x, C.y, 7, '#1b2333'));
    s.push(txt(C.x, C.y + 36, unit, 16, '#1b2333', 'middle', 700));
    s.push(svgTail());
    return s.join('');
  }

  /* 电流表表盘：0~0.6 A 与 0~3 A 两个量程，共 30 小格 */
  function svgAmmeter(f) { return svgMeterDial(f, 'A', '电流表表盘', 0.6, 3); }

  /* 电压表表盘：0~3 V 与 0~15 V 两个量程，共 30 小格 */
  function svgVoltmeter(f) { return svgMeterDial(f, 'V', '电压表表盘', 3, 15); }

  function svgThermometer(f) {
    var W = 280, H = 330, s = [svgHead(W, H, '温度计')];
    var lo = (f.lo == null ? -10 : f.lo), hi = (f.hi == null ? 110 : f.hi);
    var y0 = 268, y1 = 40;
    function yy(t) { return y0 - (t - lo) * (y0 - y1) / (hi - lo); }
    s.push('<rect x="78" y="34" width="26" height="240" rx="10" fill="#fff" stroke="#6b7280" stroke-width="2"/>');
    s.push(circle(91, 288, 20, '#fff', '#6b7280', 2));
    var yr = yy(f.reading);
    s.push('<rect x="84" y="' + r1(yr) + '" width="14" height="' + r1(288 - yr) + '" fill="#d93025"/>');
    s.push(circle(91, 288, 15, '#d93025'));
    for (var t = lo; t <= hi; t++) {
      var major = (t % 10 === 0);
      s.push(ln(104, yy(t), 104 + (major ? 14 : 7), yy(t), '#1b2333', major ? 1.8 : 1));
      if (t % 20 === 0 || t === lo || t === hi) s.push(txt(126, yy(t) + 4, String(t), 10, '#1b2333', 'start'));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgSpring(f) {
    var W = 250, H = 330, s = [svgHead(W, H, '弹簧测力计')];
    var max = f.max || 5, div = f.div || 0.2, reading = f.reading || 1;
    var yTop = 70, yBot = 250;
    function yy(v) { return yTop + (v / max) * (yBot - yTop); }
    s.push(circle(120, 30, 11, 'none', '#6b7280', 2.6));
    s.push(ln(120, 41, 120, 52, '#6b7280', 2.4));
    s.push('<rect x="80" y="52" width="80" height="212" rx="9" fill="#fff" stroke="#6b7280" stroke-width="2.4"/>');
    var steps = Math.round(max / div);
    for (var k = 0; k <= steps; k++) {
      var v = k * div, major = (k % 5 === 0);
      s.push(ln(98, yy(v), 98 + (major ? 15 : 8), yy(v), '#1b2333', major ? 1.8 : 1));
      if (major) s.push(txt(94, yy(v) + 4, String(Math.round(v * 10) / 10), 10, '#1b2333', 'end'));
    }
    var yp = yy(reading);
    s.push(ln(96, yp, 154, yp, '#d93025', 2.6));
    s.push('<path d="M96 ' + r1(yp) + ' l-8 -5 l0 10 z" fill="#d93025"/>');
    s.push(ln(120, 264, 120, 286, '#6b7280', 2.6));
    s.push('<path d="M120 286 q0 16 16 16 q12 0 12 -10" fill="none" stroke="#6b7280" stroke-width="2.6"/>');
    s.push(svgTail());
    return s.join('');
  }

  /* ===== 第12周补图：分子、熔化曲线、导线对折（都走内联 SVG，零图片） ===== */
  function svgParticle(f) {
    var W = 360, H = 190, mode = (f && f.mode) || 'diffuse';
    var s = [svgHead(W, H, '分子示意图')];
    s.push('<rect x="16" y="24" width="' + (W - 32) + '" height="' + (H - 58) + '" rx="8" fill="#fff" stroke="#8aa2bd" stroke-width="1.5"/>');
    if (mode === 'diffuse') {
      var hot = !!f.hot, i, x, y;
      if (hot) {
        /* 题干是「冷水、热水各一杯」：图必须画两杯，否则图文对不上 */
        var cups = [
          { x0: 24, x1: 172, label: '冷水', color: '#6b7280', n: 10 },
          { x0: 188, x1: 336, label: '热水', color: '#0f9b8e', n: 16 }
        ];
        for (var ci = 0; ci < cups.length; ci++) {
          var cup = cups[ci];
          s.push('<rect x="' + cup.x0 + '" y="44" width="' + (cup.x1 - cup.x0) + '" height="102" rx="7" fill="#f8fbfd" stroke="#8aa2bd" stroke-width="1.2"/>');
          s.push(txt((cup.x0 + cup.x1) / 2, 36, cup.label, 12, '#1b2333', 'middle', 700));
          for (i = 0; i < cup.n; i++) {
            x = cup.x0 + 14 + (i % 5) * 24;
            y = 66 + Math.floor(i / 5) * 22;
            s.push(circle(x, y, 3.2, cup.color));
          }
        }
        s.push(txt(180, 172, '热水中红墨水扩散更快', 11, '#0f9b8e', 'middle'));
      } else {
        for (i = 0; i < 26; i++) {
          x = 34 + (i % 6) * 17 + (i % 3) * 3;
          y = 96 + Math.floor(i / 6) * 14;
          s.push(circle(x, y, 3.2, '#0f9b8e'));
        }
        for (i = 0; i < 14; i++) {
          x = 190 + (i % 7) * 20;
          y = 100 + Math.floor(i / 7) * 18;
          s.push(circle(x, y, 3.2, '#6b7280'));
        }
        s.push('<path d="M150 112 L214 112 M206 105 L214 112 L206 119" fill="none" stroke="#d93025" stroke-width="2.4"/>');
        s.push(txt(180, 40, '滴入红墨水后', 13, '#1b2333', 'middle', 700));
      }
    } else {
      var attract = mode === 'attract';
      s.push(circle(112, 105, 30, '#dbeafe', '#1b2333', 2));
      s.push(circle(248, 105, 30, '#dbeafe', '#1b2333', 2));
      if (attract) {
        s.push('<path d="M150 105 L210 105 M204 98 L210 105 L204 112" fill="none" stroke="#0f9b8e" stroke-width="2.6"/>');
        s.push(txt(180, 52, '分子间引力', 14, '#0f9b8e', 'middle', 700));
      } else {
        s.push('<path d="M152 105 L100 105 M108 98 L100 105 L108 112 M208 105 L260 105 M252 98 L260 105 L252 112" fill="none" stroke="#d93025" stroke-width="2.6"/>');
        s.push(txt(180, 52, '分子间斥力', 14, '#d93025', 'middle', 700));
      }
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgPhaseGraph(f) {
    var W = 380, H = 250, s = [svgHead(W, H, '温度—时间图像')];
    var x0 = 46, y0 = 205, x1 = 360, y1 = 24;
    s.push('<path d="M' + x0 + ' ' + y0 + ' L' + x1 + ' ' + y0 + ' M' + x0 + ' ' + y0 + ' L' + x0 + ' ' + y1 + '" fill="none" stroke="#1b2333" stroke-width="2"/>');
    s.push(txt(x1 - 4, y0 + 18, '时间', 11, '#1b2333', 'end'));
    s.push(txt(x0 - 8, y1 - 4, 'T', 12, '#1b2333', 'end'));
    var flat = f && f.flat === false ? false : true;
    if (flat) {
      s.push('<path d="M52 190 L120 96 L204 96 L272 52 L340 52" fill="none" stroke="#0f9b8e" stroke-width="3"/>');
      s.push(txt(120, 86, 'B', 12, '#1b2333', 'middle', 700));
      s.push(txt(204, 86, 'C', 12, '#1b2333', 'middle', 700));
      s.push(txt(272, 42, 'D', 12, '#1b2333', 'middle', 700));
    } else {
      s.push('<path d="M52 190 L150 140 L250 84 L340 44" fill="none" stroke="#d93025" stroke-width="3"/>');
      s.push(txt(196, 74, '温度持续升高', 11, '#d93025', 'middle'));
    }
    s.push(svgTail());
    return s.join('');
  }

  function svgWireFold() {
    var W = 380, H = 200, s = [svgHead(W, H, '合金导线对折')];
    s.push('<rect x="30" y="72" width="240" height="22" rx="5" fill="#d9b26a" stroke="#1b2333" stroke-width="1.6"/>');
    s.push(txt(150, 62, '原长 L、横截面积 S → R₁', 12, '#1b2333', 'middle'));
    s.push('<path d="M282 83 L318 83 M310 76 L318 83 L310 90" fill="none" stroke="#d93025" stroke-width="2.4"/>');
    s.push(txt(300, 66, '对折', 11, '#d93025', 'middle'));
    s.push('<rect x="330" y="72" width="28" height="22" rx="4" fill="#d9b26a" stroke="#1b2333" stroke-width="1.6"/>');
    s.push('<rect x="330" y="94" width="28" height="22" rx="4" fill="#d9b26a" stroke="#1b2333" stroke-width="1.6"/>');
    s.push(svgTail());
    return s.join('');
  }

  function svgFor(q) {
    var f = q && q.fig;
    if (!f) return '';
    var body = '';
    if (f.type === 'particle') body = svgParticle(f);
    else if (f.type === 'phasegraph') body = svgPhaseGraph(f);
    else if (f.type === 'wirefold') body = svgWireFold();
    else if (f.type === 'tension') body = svgTension(f);
    else if (f.type === 'circuit') body = svgCircuit(f);
    else if (f.type === 'battery') body = svgBattery(f);
    else if (f.type === 'wiretable') body = svgWireTable(f);
    else if (f.type === 'stroke') body = svgStroke(f);
    else if (f.type === 'pulley') body = svgPulley(f);
    else if (f.type === 'lever') body = svgLever(f);
    else if (f.type === 'armbase') body = svgArmBase(f);
    else if (f.type === 'armanswer') body = svgArmAnswer(f);
    else if (f.type === 'charge') body = svgCharge(f);
    else if (f.type === 'ammeter') body = svgAmmeter(f);
    else if (f.type === 'voltmeter') body = svgVoltmeter(f);
    else if (f.type === 'thermometer') body = svgThermometer(f);
    else if (f.type === 'spring') body = svgSpring(f);
    return body;
  }

  /* ================= 认模型（11 类，全部 choice；含电压表使用） ================= */
  function genModelTension(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      var F = ri(r, 2, 6);
      return {
        id: 'model.tension', kind: 'tension', title: '测力计示数（两端拉）',
        prompt: '弹簧测力计的两端各用 ' + F + ' N 的力沿相反方向拉，测力计静止。它的示数是（　）',
        fields: [choiceField(r, F + ' N', [(F * 2) + ' N', '0 N', (F / 2) + ' N'])],
        tip: '测力计示数 = 作用在挂钩上的拉力，不是两端拉力之和。',
        explain: ['测力计显示的是作用在挂钩上的拉力 ' + F + ' N，另一端只是把它拉住。', '所以示数是 ' + F + ' N，不是 ' + (F * 2) + ' N。'],
        fig: { type: 'tension', mode: 'two', F: F }, figBefore: true,
        kp: ['弹簧测力计', '力的测量']
      };
    }
    if (v === 1) {
      var G = ri(r, 2, 8);
      return {
        id: 'model.tension', kind: 'tension', title: '定滑轮上测力计示数',
        prompt: '如图，物体重 ' + G + ' N，跨过定滑轮的绳一端与它相连，另一端接弹簧测力计竖直向下拉，物体静止。测力计的示数是（　）',
        fields: [choiceField(r, G + ' N', [(G * 2) + ' N', '0 N', Math.round(G / 2 * 10) / 10 + ' N'])],
        tip: '定滑轮只改变力的方向，不省力；同一根绳上张力处处相等。',
        explain: ['物体静止，绳的拉力等于物体重力 ' + G + ' N。', '同一根绳上张力处处相等，所以测力计示数也是 ' + G + ' N。'],
        fig: { type: 'tension', mode: 'pulley', G: G }, figBefore: true,
        kp: ['弹簧测力计', '定滑轮']
      };
    }
    var G2 = ri(r, 2, 8);
    return {
      id: 'model.tension', kind: 'tension', title: '绳中测力计示数',
      prompt: '如图，弹簧测力计串在一根绳中，绳的一端挂着 ' + G2 + ' N 的物体，另一端固定在天花板上，整个装置静止。测力计的示数是（　）',
      fields: [choiceField(r, G2 + ' N', ['0 N', (G2 * 2) + ' N', Math.round(G2 / 2 * 10) / 10 + ' N'])],
      tip: '同一根绳、静止：绳上各处张力都等于物体重力。',
      explain: ['物体静止，绳对物体的拉力等于重力 ' + G2 + ' N。', '同一根绳上张力处处相等，所以测力计示数 = ' + G2 + ' N。'],
      fig: { type: 'tension', mode: 'string', G: G2 }, figBefore: true,
      kp: ['弹簧测力计', '绳的张力']
    };
  }

  function genModelLed(r) {
    var v = ri(r, 0, 1);
    if (v === 0) {
      return {
        id: 'model.led', kind: 'led', title: 'LED 极性',
        prompt: 'LED（发光二极管）的符号如图，A 端是长脚（阳极），B 端是短脚（阴极）。要使 LED 发光，电源的正极应接（　）',
        fields: [choiceField(r, 'A 端（长脚）', ['B 端（短脚）', 'A 端或 B 端都可以', '接哪一端都不发光'])],
        tip: '二极管单向导电：电流只能从长脚（阳极）流入、短脚流出。',
        explain: ['LED 具有单向导电性，电流从长脚（阳极）流入、短脚（阴极）流出时才能发光。', '所以电源正极接 A 端（长脚），负极经开关接 B 端。'],
        fig: { type: 'circuit', kind: 'led-symbol' }, figBefore: true,
        kp: ['二极管', '电流方向']
      };
    }
    return {
      id: 'model.led', kind: 'led', title: 'LED 是否发光',
      prompt: '如图，LED 的 A 端（长脚）接电源正极，B 端（短脚）经开关接电源负极。闭合开关后，LED（　）',
      fields: [choiceField(r, '发光', ['不发光', '先亮后灭', '可能发光，也可能不发光'])],
      tip: '长脚接正极 → 正向导通 → 发光。',
      explain: ['电流从电源正极出发，经 LED 的 A 端（长脚、阳极）流入、B 端流出，是正向连接。', '二极管正向导通，所以 LED 发光。'],
      fig: { type: 'circuit', kind: 'led' }, figBefore: true,
      kp: ['二极管', '电流方向']
    };
  }

  function genModelCharge(r) {
    var v = ri(r, 0, 1);
    if (v === 0) {
      return {
        id: 'model.charge', kind: 'charge', title: '接触后带电',
        prompt: '用毛皮摩擦过的橡胶棒（带负电）去接触悬挂的轻质小球，小球被弹开。小球被弹开的原因是（　）',
        fields: [choiceField(r, '接触后小球带上了与橡胶棒同种的负电荷，同种电荷相互排斥', ['异种电荷相互吸引', '小球本来带正电', '橡胶棒把小球推开了'])],
        tip: '带电体接触不带电的轻小物体 → 电荷转移 → 两者带同种电荷 → 排斥。',
        explain: ['橡胶棒带负电，接触小球时把部分负电荷转移给小球。', '小球与橡胶棒带同种电荷，同种电荷相互排斥，所以小球被弹开。'],
        fig: { type: 'charge', mode: 'touch' }, figBefore: true,
        kp: ['电荷', '接触带电']
      };
    }
    return {
      id: 'model.charge', kind: 'charge', title: '吸引的两种情况',
      prompt: '两个用细线悬挂的轻质小球靠近时相互吸引。下列判断正确的是（　）',
      fields: [choiceField(r, '两球可能带异种电荷，也可能只有一个带电', ['两球一定带同种电荷', '两球一定带异种电荷', '两球一定都不带电'])],
      tip: '「吸引」有两种可能：带异种电荷，或一个带电一个不带电；「排斥」才一定带同种电荷。',
      explain: ['同种电荷相互排斥，异种电荷相互吸引；带电体还能吸引不带电的轻小物体。', '所以相互吸引可能带异种电荷，也可能只有一个球带电。'],
      fig: { type: 'charge', mode: 'attract' }, figBefore: true,
      kp: ['电荷', '相互作用']
    };
  }

  function genModelStroke(r) {
    var S = pick(r, [
      { key: 'intake', name: '吸气冲程', fact: '进气门打开、排气门关闭，活塞向下运动，吸入空气和汽油的混合气体。', energy: 2 },
      { key: 'compress', name: '压缩冲程', fact: '两个气门都关闭，活塞向上运动，压缩气体做功，机械能转化为内能。', energy: 0 },
      { key: 'power', name: '做功冲程', fact: '两个气门都关闭，火花塞点火，高温高压燃气推动活塞向下运动，内能转化为机械能。', energy: 1 },
      { key: 'exhaust', name: '排气冲程', fact: '进气门关闭、排气门打开，活塞向上运动，把废气排出气缸。', energy: 2 }
    ]);
    var v = ri(r, 0, 1);
    if (v === 0) {
      return {
        id: 'model.stroke', kind: 'stroke', title: '认冲程',
        prompt: '如图是四冲程汽油机的某一个冲程，它是（　）',
        fields: [choiceField(r, S.name, ['吸气冲程', '压缩冲程', '做功冲程', '排气冲程'])],
        tip: '看两个气门的开闭和活塞运动方向：进气门开=吸气，排气门开=排气，都关闭看活塞向上（压缩）还是向下（做功）。',
        explain: [S.fact],
        fig: { type: 'stroke', stroke: S.key }, figBefore: true,
        kp: ['四冲程', '内燃机']
      };
    }
    var en = ['机械能转化为内能', '内能转化为机械能', '没有明显的能量转化', '化学能转化为内能'][S.energy];
    return {
      id: 'model.stroke', kind: 'stroke', title: '冲程的能量转化',
      prompt: '如图是四冲程汽油机的「' + S.name + '」。这个冲程中主要的能量转化是（　）',
      fields: [choiceField(r, en, ['机械能转化为内能', '内能转化为机械能', '没有明显的能量转化', '化学能转化为内能'])],
      tip: '压缩冲程：机械能 → 内能；做功冲程：内能 → 机械能。',
      explain: [S.fact],
      fig: { type: 'stroke', stroke: S.key }, figBefore: true,
      kp: ['四冲程', '能量转化']
    };
  }

  function genModelCircuit(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      return {
        id: 'model.circuit', kind: 'circuit', title: '串并联判断',
        prompt: '如图电路，闭合开关 S 后两灯都发光。它们的连接方式是（　）',
        fields: [choiceField(r, '并联', ['串联', '无法判断'])],
        tip: '并联：电流从正极出发后分成几条支路；串联：只有一条路径。',
        explain: ['电流从电源正极出发后，在左侧分成两条支路，分别经过 L₁、L₂，再在右侧汇合回到负极。', '所以两灯是并联。'],
        fig: { type: 'circuit', kind: 'parallel' }, figBefore: true,
        kp: ['电路', '串并联']
      };
    }
    if (v === 1) {
      return {
        id: 'model.circuit', kind: 'circuit', title: '电流表测哪条支路',
        prompt: '如图电路，闭合开关后，电流表 A₁ 测的是（　）',
        fields: [choiceField(r, '通过 L₁ 的电流', ['通过 L₂ 的电流', '干路电流', '电源两端的电压'])],
        tip: '电流表与被测用电器串联：串在支路里就测该支路电流，串在干路就测总电流。',
        explain: ['A₁ 在 L₁ 所在的支路里，与 L₁ 串联，所以测通过 L₁ 的电流。', 'A₂ 在干路上，测的是干路总电流。'],
        fig: { type: 'circuit', kind: 'parallel' }, figBefore: true,
        kp: ['电路', '电流表']
      };
    }
    return {
      id: 'model.circuit', kind: 'circuit', title: '并联支路故障',
      prompt: '如图电路，两灯并联，A₂ 接在干路上。闭合开关后两灯都发光。若 L₁ 的灯丝烧断，则（　）',
      fields: [choiceField(r, 'L₂ 仍发光，A₂ 示数变小', ['L₂ 也熄灭，A₂ 示数为 0', 'L₂ 变得更亮，A₂ 示数变大', 'L₂ 仍发光，A₂ 示数不变'])],
      tip: '并联各支路互不影响；干路电流等于各支路电流之和。',
      explain: ['并联电路中各支路互不影响，L₁ 断路后 L₂ 仍能发光。', '少了一条支路，干路电流变小，所以 A₂ 示数变小。'],
      fig: { type: 'circuit', kind: 'parallel' }, figBefore: true,
      kp: ['电路', '并联', '故障']
    };
  }


  /* ---------- 电压表 / 电流表的使用（第11周：电压、电阻与电路连接） ---------- */
  function genModelMeter(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      return {
        id: 'model.meter', kind: 'meter', title: '电压表测的是哪段电压',
        prompt: '如图电路，两灯串联，电压表 V 并联在 L₁ 两端。闭合开关后，电压表测的是（　）',
        fields: [choiceField(r, 'L₁ 两端的电压', ['L₂ 两端的电压', '电源两端的电压', '通过 L₁ 的电流'])],
        tip: '电压表并联在谁两端，就测谁的电压。',
        explain: ['电压表的两个接线柱分别接在 L₁ 的两端，所以测的是 L₁ 两端的电压。', '串联时总电压等于各部分电压之和，要测总电压就得并联在电源两端；测 L₂ 就并联在 L₂ 两端。'],
        fig: { type: 'circuit', kind: 'connect-voltmeterSL1' }, figBefore: true,
        kp: ['电压表', '电压']
      };
    }
    if (v === 1) {
      return {
        id: 'model.meter', kind: 'meter', title: '电压表的使用规则',
        prompt: '关于电压表的使用，下列说法正确的是（　）',
        fields: [choiceField(r, '电压表要并联在被测用电器两端，电流从「+」接线柱流入', ['电压表要串联在被测电路中', '电压表不用看量程，接上就行', '电压表的「−」接线柱要接靠近电源正极的一端'])],
        tip: '电压表并联、电流表串联；都要「+」进「−」出，先看量程。',
        explain: ['电压表要并联在被测用电器两端。', '接线时电流从「+」接线柱流入、从「−」接线柱流出；量程要按被测电压选，指针偏转太小读数不准。'],
        kp: ['电压表', '使用规则']
      };
    }
    return {
      id: 'model.meter', kind: 'meter', title: '电压表量程选择',
      prompt: '用电压表测一节干电池的电压（约 1.5 V），应选用的量程是（　）',
      fields: [choiceField(r, '0~3 V 量程', ['0~15 V 量程', '两个量程都行，读数一样准', '必须用 0~15 V 量程，否则会烧表'])],
      tip: '量程要选得比被测值大、又尽量接近：1.5 V 用 0~3 V。',
      explain: ['被测电压约 1.5 V，选 0~3 V 量程指针能偏转到一半左右，读数更准。', '选 0~15 V 时指针只偏一小格，误差大。'],
      kp: ['电压表', '量程']
    };
  }

  /* ---------- 电学基础（第11周周练考点：电压 / 电阻 / 导体绝缘体 / 串并联） ---------- */
  function genModelVoltage(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      var n = ri(r, 2, 4), U = 1.5 * n;
      return {
        id: 'model.voltage', kind: 'voltage', title: '干电池组电压',
        prompt: '如图，由 ' + n + ' 节干电池串联组成的电源，电压是（　）',
        fields: [choiceField(r, fmtNum(U) + ' V', ['1.5 V', (2 * n) + ' V', (3 * n) + ' V'])],
        tip: '一节干电池 1.5 V，n 节串联就是 1.5n V；并联不升压。',
        explain: ['一节干电池的电压是 1.5 V。', n + ' 节串联，电压相加：1.5 × ' + n + ' = ' + fmtNum(U) + ' V。'],
        fig: { type: 'battery', n: n }, figBefore: true,
        kp: ['电压', '电池组']
      };
    }
    if (v === 1) {
      return {
        id: 'model.voltage', kind: 'voltage', title: '电压与电流的条件',
        prompt: '关于电压，下列说法正确的是（　）',
        fields: [choiceField(r, '电压是形成电流的条件之一，还要电路闭合', ['有电压就一定有电流', '电压就是电的压力', '有电源就一定有电流'])],
        tip: '有电压不一定有电流；电路闭合才有电流。',
        explain: ['电压是使自由电荷定向移动、形成电流的原因。', '形成持续电流要两个条件：有电压 + 电路闭合。'],
        kp: ['电压', '电流条件']
      };
    }
    return {
      id: 'model.voltage', kind: 'voltage', title: '常见电压值',
      prompt: '一节铅蓄电池的电压是（　）',
      fields: [choiceField(r, '2 V', ['1.5 V', '3 V', '36 V'])],
      tip: '干电池 1.5 V、铅蓄电池 2 V、家庭电路 220 V、人体安全电压不高于 36 V。',
      explain: ['一节铅蓄电池的电压是 2 V。', '别和干电池的 1.5 V 混。'],
      kp: ['电压', '常见电压']
    };
  }

  function genModelResistance(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      var mats = ['锰铜丝', '镍铬合金丝', '铜丝'];
      var mA = pick(r, mats);
      var mB = pick(r, mats.filter(function (x) { return x !== mA; }));
      var lens = [0.5, 1.0, 1.5];
      var lA = pick(r, lens);
      var lC = pick(r, lens.filter(function (x) { return x !== lA; }));
      var areas = [0.2, 0.4, 0.6];
      var sA = pick(r, areas);
      var sD = pick(r, areas.filter(function (x) { return x !== sA; }));
      var wires = shuffled(r, [
        { role: 'A', mat: mA, len: lA, area: sA },
        { role: 'B', mat: mB, len: lA, area: sA },
        { role: 'C', mat: mA, len: lC, area: sA },
        { role: 'D', mat: mA, len: lA, area: sD }
      ]);
      var lab = {};
      for (var i = 0; i < wires.length; i++) { wires[i].no = '①②③④'.charAt(i); lab[wires[i].role] = wires[i].no; }
      var right = lab.A + '和' + lab.B;
      return {
        id: 'model.resistance', kind: 'resistance', title: '控制变量选金属丝',
        prompt: '四根金属丝的规格如下表。要探究电阻的大小是否跟导体的材料有关，应选择（　）',
        fields: [choiceField(r, right, [lab.A + '和' + lab.C, lab.A + '和' + lab.D, lab.B + '和' + lab.C])],
        tip: '只让材料不同：长度、横截面积都必须相同。',
        explain: [
          '要探究材料的影响，只能让材料不同，长度和横截面积都要相同。',
          right + ' 的长度和横截面积都相同，只有材料不同，所以选它。',
          lab.A + '和' + lab.C + ' 只差长度，研究的是长度；' + lab.A + '和' + lab.D + ' 只差横截面积，研究的是横截面积；' + lab.B + '和' + lab.C + ' 有两个因素不同，不能确定是哪个因素。'
        ],
        fig: {
          type: 'wiretable', rows: wires.map(function (w) {
            return { no: w.no, mat: w.mat, len: w.len, area: w.area };
          })
        },
        figBefore: true,
        kp: ['电阻', '控制变量']
      };
    }
    if (v === 1) {
      return {
        id: 'model.resistance', kind: 'resistance', title: '电阻与哪个因素无关',
        prompt: '导体的电阻大小与下列哪个因素无关？（　）',
        fields: [choiceField(r, '导体两端的电压', ['导体的材料', '导体的长度', '导体的横截面积'])],
        tip: '电阻由导体本身决定：材料、长度、横截面积、温度；与 U、I 无关。',
        explain: ['电阻是导体本身的性质。', '它由材料、长度、横截面积和温度决定，与两端电压、通过的电流无关。'],
        kp: ['电阻', '决定因素']
      };
    }
    return {
      id: 'model.resistance', kind: 'resistance', title: 'R = U/I 的含义',
      prompt: '关于公式 R = U/I，下列说法正确的是（　）',
      fields: [choiceField(r, '电阻由导体本身决定，与 U、I 无关', ['电阻跟导体两端电压成正比', '电阻跟通过导体的电流成反比', '导体两端电压为零时，电阻也为零'])],
      tip: 'R = U/I 是测量式；电阻不随 U、I 变。',
      explain: ['R = U/I 只说明可以用电压和电流的比值算电阻。', '电阻是导体本身的性质，U = 0 时电阻仍然存在。'],
      kp: ['电阻', 'R=U/I']
    };
  }

  function genModelConductor(r) {
    var v = ri(r, 0, 2);
    var conds = ['铅笔芯', '铜丝', '钢尺', '铁钉', '盐水'];
    var ins = ['橡皮', '塑料尺', '油', '玻璃', '陶瓷', '干木棒'];
    if (v === 0) {
      var c0 = pick(r, conds);
      var bad0 = shuffled(r, ins).slice(0, 3);
      return {
        id: 'model.conductor', kind: 'conductor', title: '接什么灯会亮',
        prompt: '如图，在金属夹 A、B 间接入下列物品，能使小灯泡发光的是（　）',
        fields: [choiceField(r, c0, bad0)],
        tip: '接导体灯亮，接绝缘体灯不亮。',
        explain: [c0 + ' 是导体，接进电路后电路闭合，小灯泡发光。', bad0.join('、') + ' 都是绝缘体，接进去电路断开，灯不亮。'],
        fig: { type: 'circuit', kind: 'clip-gap' }, figBefore: true,
        kp: ['导体', '绝缘体']
      };
    }
    if (v === 1) {
      return {
        id: 'model.conductor', kind: 'conductor', title: '绝缘体为什么不导电',
        prompt: '绝缘体不容易导电，原因是（　）',
        fields: [choiceField(r, '绝缘体内部的电荷不能自由移动', ['绝缘体内部没有电荷', '绝缘体内部没有电子', '绝缘体两端没有电压'])],
        tip: '绝缘体里也有电荷，只是不能自由移动。',
        explain: ['导体容易导电，是因为内部有大量可以自由移动的电荷。', '绝缘体内部电荷被束缚，不能自由移动，所以不容易导电。'],
        kp: ['导体', '绝缘体']
      };
    }
    var c1 = pick(r, ins);
    var bad1 = shuffled(r, conds).slice(0, 3);
    return {
      id: 'model.conductor', kind: 'conductor', title: '哪个是绝缘体',
      prompt: '下列物品中，属于绝缘体的是（　）',
      fields: [choiceField(r, c1, bad1)],
      tip: '导体：铅笔芯、金属、人体、大地、盐水；绝缘体：橡皮、塑料、油、玻璃、陶瓷。',
      explain: [c1 + ' 不容易导电，是绝缘体。', bad1.join('、') + ' 都是导体。'],
      kp: ['导体', '绝缘体']
    };
  }

  function genModelConnection(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      var isSeries = r() < 0.5;
      var right = isSeries ? '串联' : '并联';
      return {
        id: 'model.connection', kind: 'connection', title: '串并联识别',
        prompt: '如图电路，闭合开关 S 后两灯都发光。它们的连接方式是（　）',
        fields: [choiceField(r, right, [isSeries ? '并联' : '串联', '短路', '无法判断'])],
        tip: '一条路 = 串联；有分支、有汇合 = 并联。',
        explain: [isSeries ? '电流从电源正极出发只有一条路，依次经过 L₁、L₂，所以是串联。' : '电流从电源正极出发后分成两条支路，分别经过 L₁、L₂，再汇合回负极，所以是并联。'],
        fig: { type: 'circuit', kind: isSeries ? 'series' : 'parallel-plain' }, figBefore: true,
        kp: ['电路', '串并联']
      };
    }
    if (v === 1) {
      return {
        id: 'model.connection', kind: 'connection', title: '并联支路互不影响',
        prompt: '如图，两灯并联。若 L₁ 的灯丝烧断，则（　）',
        fields: [choiceField(r, 'L₂ 仍发光', ['L₂ 也熄灭', 'L₂ 变得更亮', '电源被短路'])],
        tip: '并联各支路互不影响，一条支路断了，另一条照常工作。',
        explain: ['并联电路中，L₁、L₂ 各在一条支路，互不影响。', 'L₁ 断路后，L₂ 所在支路仍是通路，所以 L₂ 仍发光。'],
        fig: { type: 'circuit', kind: 'parallel-plain' }, figBefore: true,
        kp: ['电路', '并联', '故障']
      };
    }
    return {
      id: 'model.connection', kind: 'connection', title: '串联一断全断',
      prompt: '如图，两灯串联。若 L₁ 的灯丝烧断，则（　）',
      fields: [choiceField(r, 'L₂ 也熄灭', ['L₂ 仍发光', 'L₂ 变得更亮', 'L₂ 亮度不变'])],
      tip: '串联只有一条路，任何一处断开，整个电路都没有电流。',
      explain: ['串联电路只有一条电流路径。', 'L₁ 灯丝烧断后电路断开，L₂ 也没有电流，所以两灯都熄灭。'],
      fig: { type: 'circuit', kind: 'series' }, figBefore: true,
      kp: ['电路', '串联', '故障']
    };
  }

  function genModelPulley(r) {
    var v = ri(r, 0, 1);
    if (v === 0) {
      var n = pick(r, [2, 3]);
      return {
        id: 'model.pulley', kind: 'pulley', title: '数绳子的段数',
        prompt: '如图，用滑轮组匀速提升重物 G（不计摩擦、绳重和动滑轮重）。承担物重的绳子有 n 段，则 n =（　）',
        fields: [choiceField(r, String(n), ['1', '2', '3', '4'])],
        tip: '数 n：与动滑轮相连、向上拉着动滑轮的绳子有几段，n 就是几。',
        explain: ['与动滑轮相连、向上拉它的绳子共有 ' + n + ' 段，所以 n = ' + n + '。', '此时拉力 F = G/n，绳端移动距离 s = nh。'],
        fig: { type: 'pulley', n: n }, figBefore: true,
        kp: ['滑轮组', 'n 段绳']
      };
    }
    return {
      id: 'model.pulley', kind: 'pulley', title: '力臂是哪个',
      prompt: '如图，杠杆在力 F 的作用下绕支点 O 转动。F 的力臂是（　）',
      fields: [choiceField(r, '从支点 O 到 F 作用线的垂线段', ['从支点 O 到 F 作用点的线段', '沿力 F 方向画的一段线段', '从支点 O 到杠杆另一端的线段'])],
      tip: '力臂 = 支点到力的作用线的垂线段，不是支点到作用点的连线。',
      explain: ['把 F 的作用线延长，从 O 向这条作用线作垂线，垂足到 O 的距离才是力臂。', 'O 到作用点 B 的连线只是作用点到支点的距离，不是力臂。'],
      fig: { type: 'lever', mode: 'model', rodDeg: 22, fDeg: 118 }, figBefore: true,
      kp: ['杠杆', '力臂']
    };
  }

  /* ================= 认量（10 类：选公式 → 指认量 → 结果；含串联电流/并联电压） ================= */
  function genAmountHeat(r) {
    var mWater = pick(r, [2, 3, 4, 5]);
    var mPot = pick(r, [1, 2, 3]);
    var t0 = 20, t1 = pick(r, [60, 70, 80, 88]);
    var dt = t1 - t0, Q = 4200 * mWater * dt;
    return {
      id: 'amount.heatmass', kind: 'heatmass', title: '烧水题：m 取哪个',
      prompt: '用不锈钢水壶装 ' + mWater + ' kg、' + t0 + '℃ 的水放在炉上加热，水温升到 ' + t1 + '℃。水壶的质量是 ' + mPot + ' kg。已知 c水 = 4.2×10³ J/(kg·℃)。不计水壶吸热，求水吸收的热量。',
      fields: [
        choiceField(r, 'Q = cmΔt', ['Q = mq', 'W = Fs', 'P = W/t'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：公式里的 m =', ans: mWater, unit: 'kg' },
        { type: 'num', label: 'Δt =', ans: dt, unit: '℃' },
        { type: 'num', label: '第 3 步 代入：Q吸 =', ans: Q, unit: 'J' }
      ],
      tip: '烧水题的 m 一定取「被加热的水」的质量，不是水壶的、也不是总质量。',
      explain: [
        'Q吸 = cmΔt，m 取水的质量 ' + mWater + ' kg（水壶的 ' + mPot + ' kg 是干扰，水壶吸的热通常忽略）。',
        'Δt = 末温 − 初温 = ' + t1 + ' − ' + t0 + ' = ' + dt + '℃。',
        'Q吸 = 4.2×10³ × ' + mWater + ' × ' + dt + ' = ' + fmtNum(Q) + ' J。'
      ],
      kp: ['热量', '比热容', '认量']
    };
  }

  function genAmountFuel(r) {
    var mTotal = pick(r, [3, 3.5, 4, 5]);
    var mBurn = pick(r, [0.2, 0.3, 0.4, 0.5]);
    var mLeft = Math.round((mTotal - mBurn) * 10) / 10;
    var fuel = pick(r, [{ n: '木炭', q: 3.4e7 }, { n: '焦炭', q: 3.0e7 }]);
    var Q = mBurn * fuel.q;
    return {
      id: 'amount.fuelmass', kind: 'fuelmass', title: '热值题：总 − 剩',
      prompt: '在炭炉中加入' + fuel.n + '，炉和' + fuel.n + '的总质量是 ' + mTotal + ' kg。燃烧一段时间后，吹去灰烬，测得炉和剩余的' + fuel.n + '总质量是 ' + mLeft + ' kg。已知' + fuel.n + '的热值 q = ' + fmtNum(fuel.q) + ' J/kg。',
      fields: [
        choiceField(r, 'Q放 = mq', ['Q吸 = cmΔt', 'W = Fs', 'η = W有/W总'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：已燃烧的燃料质量 m =', ans: mBurn, unit: 'kg' },
        { type: 'num', label: '第 3 步 代入：Q放 =', ans: Q, unit: 'J' }
      ],
      tip: '燃料质量要用「总 − 剩」，不是总质量，也不是剩下的质量。',
      explain: [
        '烧掉的燃料质量 m = ' + mTotal + ' − ' + mLeft + ' = ' + mBurn + ' kg。',
        'Q放 = mq = ' + mBurn + ' × ' + fmtNum(fuel.q) + ' = ' + fmtNum(Q) + ' J。'
      ],
      kp: ['热值', '认量']
    };
  }

  function genAmountPulley(r) {
    var n = pick(r, [2, 3]);
    var h = pick(r, [3, 4, 5, 6]);
    var s = n * h;
    return {
      id: 'amount.pulleyamount', kind: 'pulleyamount', title: '滑轮组：n、h、s',
      prompt: '用滑轮组提升井底的土石：承担物重的绳子有 n = ' + n + ' 段，土石上升的高度 h = ' + h + ' m。',
      fields: [
        choiceField(r, 's = nh', ['s = h/n', 's = n/h', 'W = Fs'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：n =', ans: n },
        { type: 'num', label: 'h =', ans: h, unit: 'm' },
        { type: 'num', label: '第 3 步 代入：绳端移动距离 s =', ans: s, unit: 'm' }
      ],
      tip: 's 是绳端移动的距离，h 是物体上升的高度；s = nh。',
      explain: [
        '承担物重的绳子有 ' + n + ' 段，所以绳端移动距离是物体上升高度的 ' + n + ' 倍。',
        's = nh = ' + n + ' × ' + h + ' = ' + s + ' m。'
      ],
      kp: ['滑轮组', '认量']
    };
  }

  function genAmountEff(r) {
    var G = pick(r, [300, 400, 500]);
    var h = pick(r, [2, 3, 4]);
    var n = pick(r, [2, 3]);
    var s = n * h;
    var extra = pick(r, [120, 240, 360, 480]);
    var F = Math.ceil((G * h + extra) / s);
    var Wyou = G * h, Wtotal = F * s;
    var eta = Math.round(Wyou / Wtotal * 1000) / 10;
    return {
      id: 'amount.effamount', kind: 'effamount', title: '效率题：W有 / W总',
      prompt: '用滑轮组把重 ' + G + ' N 的物体匀速提升 ' + h + ' m，绳端移动 ' + s + ' m，拉力 F = ' + F + ' N。',
      fields: [
        choiceField(r, 'η = W有/W总', ['η = W总/W有', 'η = Q吸/Q放', 'η = P有/P总'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：有用功 W有 =', ans: Wyou, unit: 'J' },
        { type: 'num', label: '第 3 步 指认量：总功 W总 =', ans: Wtotal, unit: 'J' },
        { type: 'num', label: '第 4 步 代入：机械效率 η =', ans: eta, unit: '%', tol: 0.5 }
      ],
      tip: '有用功 W有 = Gh（把物体提上去）；总功 W总 = Fs（拉力做的功）；η = W有/W总。',
      explain: [
        'W有 = Gh = ' + G + ' × ' + h + ' = ' + Wyou + ' J。',
        'W总 = Fs = ' + F + ' × ' + s + ' = ' + Wtotal + ' J。',
        'η = W有/W总 = ' + Wyou + ' ÷ ' + Wtotal + ' ≈ ' + fmtNum(eta) + '%。'
      ],
      kp: ['机械效率', '认量']
    };
  }

  /* ---------- 认量·反用与陷阱（2026-11-17 扩池：4 → 8 类，现共 10 类；两轮 kind 才能不重） ---------- */
  function genAmountHeatRise(r) {
    var m = pick(r, [1, 2, 3, 4]);
    var t0 = pick(r, [10, 20, 25]);
    var dt = pick(r, [20, 30, 40, 50]);
    var t1 = t0 + dt;
    var toMode = pick(r, [true, false]);
    var Q = 4200 * m * dt;
    return {
      id: 'amount.heatrise', kind: 'heatrise', title: '「升高了」还是「升高到」',
      prompt: toMode
        ? '把 ' + m + ' kg、' + t0 + '℃ 的水加热到 ' + t1 + '℃。已知 c水 = 4.2×10³ J/(kg·℃)。求水吸收的热量。'
        : '把 ' + m + ' kg、' + t0 + '℃ 的水加热，水温升高了 ' + dt + '℃。已知 c水 = 4.2×10³ J/(kg·℃)。求水吸收的热量。',
      fields: [
        choiceField(r, 'Q = cmΔt', ['Q = cmt', 'Q = mq', 'W = Fs'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Δt =', ans: dt, unit: '℃' },
        { type: 'num', label: '第 3 步 代入：Q吸 =', ans: Q, unit: 'J' }
      ],
      tip: toMode ? '「升高到」给的是末温，Δt = 末温 − 初温。' : '「升高了」就是 Δt，不用再减初温。',
      explain: toMode
        ? ['Δt = 末温 − 初温 = ' + t1 + ' − ' + t0 + ' = ' + dt + '℃。', 'Q吸 = cmΔt = 4.2×10³ × ' + m + ' × ' + dt + ' = ' + fmtNum(Q) + ' J。']
        : ['题目直接给了「升高了 ' + dt + '℃」，Δt 就是 ' + dt + '℃（不要再减初温 ' + t0 + '℃）。', 'Q吸 = cmΔt = 4.2×10³ × ' + m + ' × ' + dt + ' = ' + fmtNum(Q) + ' J。'],
      kp: ['热量', '比热容', '认量']
    };
  }

  function genAmountFuelQ(r) {
    var m = pick(r, [0.2, 0.3, 0.4, 0.5]);
    var fuel = pick(r, [{ n: '木炭', q: 3.4e7 }, { n: '焦炭', q: 3.0e7 }, { n: '酒精', q: 3.0e7 }]);
    var Q = m * fuel.q;
    return {
      id: 'amount.fuelq', kind: 'fuelq', title: '反求热值：q = Q放/m',
      prompt: '完全燃烧 ' + m + ' kg ' + fuel.n + '，放出的热量是 ' + fmtNum(Q) + ' J。求' + fuel.n + '的热值 q。',
      fields: [
        choiceField(r, 'q = Q放/m', ['q = mQ放', 'q = m/Q放', 'q = Q吸/(cm)'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Q放 =', ans: Q, unit: 'J' },
        { type: 'num', label: 'm =', ans: m, unit: 'kg' },
        { type: 'num', label: '第 3 步 代入：q =', ans: fuel.q, unit: 'J/kg' }
      ],
      tip: '热值 q = Q放 ÷ m；别把放出的热量当成热值。',
      explain: [
        'Q放 = mq，所以 q = Q放/m。',
        'q = ' + fmtNum(Q) + ' ÷ ' + m + ' = ' + fmtNum(fuel.q) + ' J/kg。'
      ],
      kp: ['热值', '认量']
    };
  }

  function genAmountPulleyH(r) {
    var n = pick(r, [2, 3]);
    var h = pick(r, [2, 3, 4, 5]);
    var s = n * h;
    return {
      id: 'amount.pulleyh', kind: 'pulleyh', title: '反求高度：h = s/n',
      prompt: '用滑轮组提升物体，承担物重的绳子有 n = ' + n + ' 段，绳端移动了 ' + s + ' m。求物体上升的高度 h。',
      fields: [
        choiceField(r, 'h = s/n', ['h = ns', 'h = n/s', 'h = s'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：s =', ans: s, unit: 'm' },
        { type: 'num', label: 'n =', ans: n },
        { type: 'num', label: '第 3 步 代入：h =', ans: h, unit: 'm' }
      ],
      tip: '已知绳端距离求高度：h = s/n，别把 s 直接当 h。',
      explain: [
        's = nh，所以 h = s/n。',
        'h = ' + s + ' ÷ ' + n + ' = ' + h + ' m。'
      ],
      kp: ['滑轮组', '认量']
    };
  }

  function genAmountHeatM(r) {
    var m = pick(r, [1, 2, 3, 4]);
    var dt = pick(r, [20, 30, 40, 50]);
    var Q = 4200 * m * dt;
    return {
      id: 'amount.heatm', kind: 'heatm', title: '反求质量：m = Q吸/(cΔt)',
      prompt: '某同学给水加热，水吸收了 ' + fmtNum(Q) + ' J 的热量，水温升高了 ' + dt + '℃。已知 c水 = 4.2×10³ J/(kg·℃)。求水的质量。',
      fields: [
        choiceField(r, 'm = Q吸/(cΔt)', ['m = Q吸/(c+Δt)', 'm = cΔt/Q吸', 'm = Q吸·cΔt'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Q吸 =', ans: Q, unit: 'J' },
        { type: 'num', label: 'Δt =', ans: dt, unit: '℃' },
        { type: 'num', label: '第 3 步 代入：m =', ans: m, unit: 'kg' }
      ],
      tip: '反求质量：m = Q吸 ÷ (cΔt)。',
      explain: [
        'Q吸 = cmΔt，所以 m = Q吸/(cΔt)。',
        'm = ' + fmtNum(Q) + ' ÷ (4.2×10³ × ' + dt + ') = ' + m + ' kg。'
      ],
      kp: ['热量', '比热容', '认量']
    };
  }

  /* ---------- 电学认量（第11周：串联电流处处相等 / 并联电压相等） ---------- */
  function genAmountSeriesI(r) {
    var I = pick(r, [0.1, 0.2, 0.3, 0.5]);
    return {
      id: 'amount.seriesI', kind: 'seriesI', title: '串联：电流处处相等',
      prompt: '两个灯泡 L₁、L₂ 串联在电路中，通过 L₁ 的电流是 ' + I + ' A。通过 L₂ 的电流是多少？',
      fields: [
        choiceField(r, '串联电路各处电流相等', ['串联电路电流逐段减小', '串联电路电流跟电阻成反比', '串联电路电流等于各支路电流之和'], '第 1 步 选规律：'),
        { type: 'num', label: '第 2 步 指认量：I₁ =', ans: I, unit: 'A' },
        { type: 'num', label: '第 3 步 结论：I₂ =', ans: I, unit: 'A' }
      ],
      tip: '串联电路只有一条路径，电流处处相等：I₁ = I₂ = I。',
      explain: ['串联电路电流只有一条路径，各处电流相等。', '所以 I₂ = I₁ = ' + I + ' A。'],
      kp: ['串联', '电流', '认量']
    };
  }

  function genAmountParallelU(r) {
    var U = pick(r, [1.5, 3, 4.5, 6]);
    return {
      id: 'amount.parallelU', kind: 'parallelU', title: '并联：各支路电压相等',
      prompt: '两盏灯并联接在电压为 ' + U + ' V 的电源上。L₁ 两端的电压是 ' + U + ' V，L₂ 两端的电压是多少？',
      fields: [
        choiceField(r, '并联各支路两端电压相等，都等于电源电压', ['并联各支路电压之和等于电源电压', '并联的支路越多，每条支路电压越小', '并联各支路电压跟电阻成正比'], '第 1 步 选规律：'),
        { type: 'num', label: '第 2 步 指认量：U电源 =', ans: U, unit: 'V' },
        { type: 'num', label: '第 3 步 结论：U₂ =', ans: U, unit: 'V' }
      ],
      tip: '并联各支路两端电压相等，都等于电源电压。',
      explain: ['并联电路中各支路两端电压相等，等于电源电压。', '所以 U₂ = U电源 = ' + U + ' V。'],
      kp: ['并联', '电压', '认量']
    };
  }

  /* ================= 算到底（11 类：选公式 → 指认量 → 结果；含反用、欧姆定律、串并联） ================= */
  function genCalcHeat(r) {
    var sub = pick(r, [{ n: '水', c: 4200 }, { n: '煤油', c: 2100 }, { n: '铝', c: 880 }]);
    var m = pick(r, [0.5, 1, 2, 3, 4, 5]);
    var t0 = pick(r, [10, 20, 30]);
    var dt = pick(r, [20, 30, 40, 50, 60]);
    var t1 = t0 + dt;
    var Q = sub.c * m * dt;
    return {
      id: 'calc.qheat', kind: 'qheat', title: 'Q = cmΔt',
      prompt: '把质量为 ' + m + ' kg、初温 ' + t0 + '℃ 的' + sub.n + '加热到 ' + t1 + '℃。已知 c' + sub.n + ' = ' + fmtNum(sub.c) + ' J/(kg·℃)。求' + sub.n + '吸收的热量。',
      fields: [
        choiceField(r, 'Q = cmΔt', ['Q = mq', 'W = Fs', 'P = W/t'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：m =', ans: m, unit: 'kg' },
        { type: 'num', label: 'Δt =', ans: dt, unit: '℃' },
        { type: 'num', label: '第 3 步 代入：Q =', ans: Q, unit: 'J' }
      ],
      tip: 'Q = cmΔt：c 用题目给的比热容，m 用被加热物体的质量，Δt = 末温 − 初温。',
      explain: [
        'Q吸 = cmΔt。',
        'm = ' + m + ' kg，Δt = ' + t1 + ' − ' + t0 + ' = ' + dt + '℃。',
        'Q = ' + fmtNum(sub.c) + ' × ' + m + ' × ' + dt + ' = ' + fmtNum(Q) + ' J。'
      ],
      kp: ['热量', '比热容']
    };
  }

  function genCalcFuel(r) {
    var fuel = pick(r, [{ n: '木炭', q: 3.4e7 }, { n: '汽油', q: 4.6e7 }, { n: '焦炭', q: 3.0e7 }]);
    var m = pick(r, [0.2, 0.3, 0.4, 0.5, 1, 1.2, 2]);
    var Q = m * fuel.q;
    return {
      id: 'calc.qfuel', kind: 'qfuel', title: 'Q = mq',
      prompt: '完全燃烧 ' + m + ' kg 的' + fuel.n + '，已知' + fuel.n + '的热值 q = ' + fmtNum(fuel.q) + ' J/kg。求放出的热量。',
      fields: [
        choiceField(r, 'Q放 = mq', ['Q吸 = cmΔt', 'W = Fs', 'P = W/t'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：m =', ans: m, unit: 'kg' },
        { type: 'num', label: 'q =', ans: fuel.q, unit: 'J/kg' },
        { type: 'num', label: '第 3 步 代入：Q放 =', ans: Q, unit: 'J' }
      ],
      tip: 'Q放 = mq：m 是完全燃烧的燃料质量，q 是热值。',
      explain: [
        'Q放 = mq。',
        'm = ' + m + ' kg，q = ' + fmtNum(fuel.q) + ' J/kg。',
        'Q放 = ' + m + ' × ' + fmtNum(fuel.q) + ' = ' + fmtNum(Q) + ' J。'
      ],
      kp: ['热值', '热量']
    };
  }

  function genCalcEff(r) {
    var mWater = pick(r, [2, 3, 5]);
    var t1 = pick(r, [60, 70, 80, 88]);
    var dt = t1 - 20;
    var Qabs = 4200 * mWater * dt;
    var mFuel = pick(r, [0.1, 0.2, 0.3]);
    var Qrel = mFuel * 3.4e7;
    var eta = Math.round(Qabs / Qrel * 1000) / 10;
    return {
      id: 'calc.qeff', kind: 'qeff', title: 'η = Q吸 / Q放',
      prompt: '用炭炉把 ' + mWater + ' kg、20℃ 的水加热到 ' + t1 + '℃，共完全燃烧 ' + mFuel + ' kg 木炭。已知 c水 = 4.2×10³ J/(kg·℃)，木炭热值 q = 3.4×10⁷ J/kg。求加热效率。',
      fields: [
        choiceField(r, 'η = Q吸/Q放', ['η = Q放/Q吸', 'η = Q吸/(Q吸+Q放)', 'η = Q放/(Q吸+Q放)'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Q吸 =', ans: Qabs, unit: 'J' },
        { type: 'num', label: 'Q放 =', ans: Qrel, unit: 'J' },
        { type: 'num', label: '第 3 步 代入：η =', ans: eta, unit: '%', tol: 0.5 }
      ],
      tip: '加热效率 = 水吸收的热量 ÷ 燃料完全燃烧放出的热量。',
      explain: [
        'Q吸 = cmΔt = 4.2×10³ × ' + mWater + ' × ' + dt + ' = ' + fmtNum(Qabs) + ' J。',
        'Q放 = mq = ' + mFuel + ' × 3.4×10⁷ = ' + fmtNum(Qrel) + ' J。',
        'η = Q吸/Q放 = ' + fmtNum(Qabs) + ' ÷ ' + fmtNum(Qrel) + ' ≈ ' + fmtNum(eta) + '%。'
      ],
      kp: ['加热效率', '热量']
    };
  }

  function genCalcWorkPower(r) {
    var v = ri(r, 0, 1);
    var F = pick(r, [50, 100, 150, 200]);
    var s = pick(r, [2, 3, 4, 5]);
    var W = F * s;
    if (v === 0) {
      return {
        id: 'calc.workpower', kind: 'workpower', title: 'W = Fs',
        prompt: '用 ' + F + ' N 的水平推力把箱子沿力的方向推动 ' + s + ' m。求推力做的功。',
        fields: [
          choiceField(r, 'W = Fs', ['W = F/s', 'W = mgh', 'P = W/t'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：F =', ans: F, unit: 'N' },
          { type: 'num', label: 's =', ans: s, unit: 'm' },
          { type: 'num', label: '第 3 步 代入：W =', ans: W, unit: 'J' }
        ],
        tip: 'W = Fs：F 是沿力的方向上的力，s 是沿力的方向移动的距离。',
        explain: ['W = Fs = ' + F + ' × ' + s + ' = ' + W + ' J。'],
        kp: ['功', '计算']
      };
    }
    var t = pick(r, [10, 20, 25, 50]);
    var P = Math.round(W / t * 100) / 100;
    return {
      id: 'calc.workpower', kind: 'workpower', title: 'P = W/t',
      prompt: '某机器在 ' + t + ' s 内做了 ' + W + ' J 的功。求它的功率。',
      fields: [
        choiceField(r, 'P = W/t', ['P = Wt', 'P = F/t', 'P = Wt²'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：W =', ans: W, unit: 'J' },
        { type: 'num', label: 't =', ans: t, unit: 's' },
        { type: 'num', label: '第 3 步 代入：P =', ans: P, unit: 'W' }
      ],
      tip: 'P = W/t：功率是做功的快慢。',
      explain: ['P = W/t = ' + W + ' ÷ ' + t + ' = ' + fmtNum(P) + ' W。'],
      kp: ['功率', '计算']
    };
  }

  function genCalcPulley(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      var n = pick(r, [2, 3]);
      var h = pick(r, [3, 4, 5, 6]);
      var s = n * h;
      return {
        id: 'calc.pulleycalc', kind: 'pulleycalc', title: '滑轮组 s = nh',
        prompt: '用滑轮组匀速提升物体，承担物重的绳子有 n = ' + n + ' 段，物体上升 h = ' + h + ' m。求绳端移动的距离。',
        fields: [
          choiceField(r, 's = nh', ['s = h/n', 's = n/h', 'h = ns'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：n =', ans: n },
          { type: 'num', label: 'h =', ans: h, unit: 'm' },
          { type: 'num', label: '第 3 步 代入：s =', ans: s, unit: 'm' }
        ],
        tip: '绳端移动距离是物体上升高度的 n 倍：s = nh。',
        explain: ['s = nh = ' + n + ' × ' + h + ' = ' + s + ' m。'],
        kp: ['滑轮组', '计算']
      };
    }
    if (v === 1) {
      var m = pick(r, [20, 30, 40, 50]);
      var G = m * 10;
      var h2 = pick(r, [2, 3, 4, 5]);
      var Wy = G * h2;
      return {
        id: 'calc.pulleycalc', kind: 'pulleycalc', title: '滑轮组 W有 = Gh',
        prompt: '用滑轮组把质量 ' + m + ' kg 的土石匀速提升 ' + h2 + ' m（g 取 10 N/kg）。求有用功。',
        fields: [
          choiceField(r, 'W有 = Gh', ['W有 = Fs', 'W总 = Gh', 'W有 = mh'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：G = mg =', ans: G, unit: 'N' },
          { type: 'num', label: 'h =', ans: h2, unit: 'm' },
          { type: 'num', label: '第 3 步 代入：W有 =', ans: Wy, unit: 'J' }
        ],
        tip: '有用功是克服物重做的功：W有 = Gh = mgh。',
        explain: ['G = mg = ' + m + ' × 10 = ' + G + ' N。', 'W有 = Gh = ' + G + ' × ' + h2 + ' = ' + Wy + ' J。'],
        kp: ['滑轮组', '有用功']
      };
    }
    var Wy2 = pick(r, [1200, 1500, 1800, 2000]);
    var Wt = Wy2 + pick(r, [200, 300, 400, 540]);
    var eta = Math.round(Wy2 / Wt * 1000) / 10;
    return {
      id: 'calc.pulleycalc', kind: 'pulleycalc', title: '滑轮组 η = W有/W总',
      prompt: '用滑轮组提升重物时，有用功 W有 = ' + Wy2 + ' J，总功 W总 = ' + Wt + ' J。求机械效率。',
      fields: [
        choiceField(r, 'η = W有/W总', ['η = W总/W有', 'η = W有×W总', 'η = W总/W有×100%'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：W有 =', ans: Wy2, unit: 'J' },
        { type: 'num', label: 'W总 =', ans: Wt, unit: 'J' },
        { type: 'num', label: '第 3 步 代入：η =', ans: eta, unit: '%', tol: 0.5 }
      ],
      tip: '机械效率 = 有用功 ÷ 总功，一定小于 1。',
      explain: ['η = W有/W总 = ' + Wy2 + ' ÷ ' + Wt + ' ≈ ' + fmtNum(eta) + '%。'],
      kp: ['机械效率', '计算']
    };
  }

  function genCalcLever(r) {
    var l1 = pick(r, [0.2, 0.4, 0.5, 0.8]);
    /* 避开 F₁ 出现 3 位小数的组合（如 l₁=0.8、l₂=0.25 → 0.3125 倍），
       学生按 2 位/1 位有效数字写 3.13/15.6 时不应被判错。 */
    var l2 = pick(r, [0.1, 0.2, 0.25, 0.4].filter(function (x) {
      return x !== l1 && !(l1 === 0.8 && x === 0.25);
    }));
    var F2 = pick(r, [10, 20, 30, 40, 50, 60]);
    var F1 = F2 * l2 / l1;
    return {
      id: 'calc.lever', kind: 'lever', title: '杠杆 F₁l₁ = F₂l₂',
      prompt: '杠杆平衡时，动力臂 l₁ = ' + l1 + ' m，阻力臂 l₂ = ' + l2 + ' m，阻力 F₂ = ' + F2 + ' N。求动力 F₁。',
      fields: [
        choiceField(r, 'F₁l₁ = F₂l₂', ['F₁l₁ = F₂/l₂', 'F₁ = F₂', 'F₁/l₁ = F₂l₂'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：l₁ =', ans: l1, unit: 'm' },
        { type: 'num', label: 'l₂ =', ans: l2, unit: 'm' },
        { type: 'num', label: '第 3 步 代入：F₁ =', ans: F1, unit: 'N', tol: 0.05 }
      ],
      tip: '杠杆平衡条件：动力 × 动力臂 = 阻力 × 阻力臂。',
      explain: ['F₁l₁ = F₂l₂ → F₁ = F₂l₂/l₁。', 'F₁ = ' + F2 + ' × ' + l2 + ' ÷ ' + l1 + ' = ' + fmtNum(F1) + ' N。'],
      kp: ['杠杆', '平衡条件']
    };
  }

  /* ---------- 算到底·反用与电学（2026-11-18 扩池：6 → 10 类，现共 11 类；两轮 kind 才能不重） ---------- */
  /* 比热容按课本写法显示：4200 → 4.2×10³ */
  function fmtC(c) { return c === 4200 ? '4.2×10³' : (c === 2100 ? '2.1×10³' : String(c)); }

  function genCalcHeatDt(r) {
    var sub = pick(r, [{ n: '水', c: 4200 }, { n: '煤油', c: 2100 }, { n: '铝', c: 880 }]);
    var m = pick(r, [0.5, 1, 2, 3]);
    var dt = pick(r, [20, 30, 40, 50]);
    var Q = sub.c * m * dt;
    return {
      id: 'calc.heatdt', kind: 'heatdt', title: 'Q = cmΔt 反求 Δt',
      prompt: '把质量为 ' + m + ' kg 的' + sub.n + '加热，' + sub.n + '吸收了 ' + fmtNum(Q) + ' J 的热量。已知 c' + sub.n + ' = ' + fmtC(sub.c) + ' J/(kg·℃)。求' + sub.n + '升高的温度。',
      fields: [
        choiceField(r, 'Δt = Q吸/(cm)', ['Δt = Q吸/(c+m)', 'Δt = Q吸·cm', 'Δt = cm/Q吸'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Q吸 =', ans: Q, unit: 'J' },
        { type: 'num', label: 'm =', ans: m, unit: 'kg' },
        { type: 'num', label: '第 3 步 代入：Δt =', ans: dt, unit: '℃' }
      ],
      tip: '反求温度变化：Δt = Q吸 ÷ (cm)。',
      explain: ['Q吸 = cmΔt → Δt = Q吸/(cm)。', 'Δt = ' + fmtNum(Q) + ' ÷ (' + fmtC(sub.c) + ' × ' + m + ') = ' + dt + '℃。'],
      kp: ['热量', '比热容', '计算']
    };
  }

  /* 效率反求拉力：先枚举能整除的整数组合，避免出现 266.67 N 这种答案 */
  var CALC_EFF_FORCE_CASES = (function () {
    var out = [], Gs = [200, 300, 400, 500], hs = [2, 3, 4, 5], ns = [2, 3], etas = [50, 60, 75, 80];
    Gs.forEach(function (G) {
      hs.forEach(function (h) {
        ns.forEach(function (n) {
          etas.forEach(function (eta) {
            var s = n * h, Wy = G * h, Wt = Wy * 100 / eta, F = Wt / s;
            if (Math.abs(F - Math.round(F)) > 1e-9) return;
            if (F < 100 || F > 500) return;
            out.push({ G: G, h: h, n: n, s: s, eta: eta, F: F, Wy: Wy, Wt: Wt });
          });
        });
      });
    });
    return out;
  })();

  function genCalcEffForce(r) {
    var c = pick(r, CALC_EFF_FORCE_CASES);
    return {
      id: 'calc.effforce', kind: 'effforce', title: 'η 反求拉力 F',
      prompt: '用滑轮组把重 ' + c.G + ' N 的物体匀速提升 ' + c.h + ' m，机械效率 η = ' + c.eta + '%，绳端移动 ' + c.s + ' m。求拉力 F。',
      fields: [
        choiceField(r, 'η = W有/W总', ['η = W总/W有', 'F = W有/s', 'η = W有/(W有+W总)'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：W有 = Gh =', ans: c.Wy, unit: 'J' },
        { type: 'num', label: 'W总 = W有/η =', ans: c.Wt, unit: 'J' },
        { type: 'num', label: '第 3 步 代入：F =', ans: c.F, unit: 'N' }
      ],
      tip: '由 η = W有/W总 先求总功 W总 = W有/η，再除以绳端距离得 F。',
      explain: [
        'W有 = Gh = ' + c.G + ' × ' + c.h + ' = ' + c.Wy + ' J。',
        'W总 = W有/η = ' + c.Wy + ' ÷ ' + (c.eta / 100) + ' = ' + c.Wt + ' J。',
        'F = W总/s = ' + c.Wt + ' ÷ ' + c.s + ' = ' + c.F + ' N。'
      ],
      kp: ['机械效率', '计算']
    };
  }

  /* 反求 l₁：先枚举能整除的组合，保证答案是两位小数以内的「整」值（不靠容差兜底） */
  var CALC_LEVER_CASES = (function () {
    var out = [];
    [10, 20, 25, 40, 50].forEach(function (F1) {
      [20, 30, 40, 50, 60].forEach(function (F2) {
        [0.2, 0.25, 0.3, 0.4, 0.5].forEach(function (l2) {
          var l1 = F2 * l2 / F1;
          if (Math.abs(l1 * 100 - Math.round(l1 * 100)) > 1e-9) return;
          if (l1 < 0.1 || l1 > 1.2) return;
          if (Math.abs(l1 - l2) < 1e-9) return;
          out.push({ F1: F1, F2: F2, l1: l1, l2: l2 });
        });
      });
    });
    return out;
  })();

  function genCalcLeverSolve(r) {
    var c = pick(r, CALC_LEVER_CASES);
    return {
      id: 'calc.leversolve', kind: 'leversolve', title: '杠杆 反求动力臂 l₁',
      prompt: '杠杆平衡时，阻力 F₂ = ' + c.F2 + ' N，阻力臂 l₂ = ' + c.l2 + ' m，动力 F₁ = ' + c.F1 + ' N。求动力臂 l₁。',
      fields: [
        choiceField(r, 'l₁ = F₂l₂/F₁', ['l₁ = F₁l₂/F₂', 'l₁ = F₂/(F₁l₂)', 'l₁ = F₁F₂/l₂'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：F₂ =', ans: c.F2, unit: 'N' },
        { type: 'num', label: 'l₂ =', ans: c.l2, unit: 'm' },
        { type: 'num', label: '第 3 步 代入：l₁ =', ans: c.l1, unit: 'm', tol: 0.05 }
      ],
      tip: 'F₁l₁ = F₂l₂ → l₁ = F₂l₂/F₁。',
      explain: ['l₁ = F₂l₂/F₁。', 'l₁ = ' + c.F2 + ' × ' + c.l2 + ' ÷ ' + c.F1 + ' = ' + fmtNum(c.l1) + ' m。'],
      kp: ['杠杆', '平衡条件', '计算']
    };
  }

  /* 欧姆定律：由 R、I 反推 U，保证三个量都是两位小数以内的「整」值 */
  var CALC_OHM_CASES = (function () {
    var out = [];
    [5, 10, 15, 20, 30].forEach(function (R) {
      [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 1, 1.5].forEach(function (I) {
        var U = Math.round(I * R * 100) / 100;
        if (U < 0.5 || U > 15) return;
        out.push({ R: R, I: I, U: U });
      });
    });
    return out;
  })();

  function genCalcOhm(r) {
    var v = ri(r, 0, 2);
    var kase = pick(r, CALC_OHM_CASES);
    var U = kase.U, R = kase.R, I = kase.I;
    if (v === 0) {
      return {
        id: 'calc.ohm', kind: 'ohm', title: '欧姆定律 I = U/R',
        prompt: '某导体两端电压 U = ' + U + ' V，导体的电阻 R = ' + R + ' Ω。求通过导体的电流 I。',
        fields: [
          choiceField(r, 'I = U/R', ['I = UR', 'I = R/U', 'I = U + R'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：U =', ans: U, unit: 'V' },
          { type: 'num', label: 'R =', ans: R, unit: 'Ω' },
          { type: 'num', label: '第 3 步 代入：I =', ans: I, unit: 'A' }
        ],
        tip: '欧姆定律 I = U/R：电流跟电压成正比、跟电阻成反比。',
        explain: ['I = U/R = ' + U + ' ÷ ' + R + ' = ' + fmtNum(I) + ' A。'],
        kp: ['欧姆定律', '电学', '计算']
      };
    }
    if (v === 1) {
      var I2 = kase.I, U2 = kase.U, R2 = kase.R;
      return {
        id: 'calc.ohm', kind: 'ohm', title: '欧姆定律 反求 R',
        prompt: '某导体两端电压 U = ' + U2 + ' V，通过它的电流 I = ' + I2 + ' A。求导体的电阻 R。',
        fields: [
          choiceField(r, 'R = U/I', ['R = UI', 'R = I/U', 'R = U + I'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：U =', ans: U2, unit: 'V' },
          { type: 'num', label: 'I =', ans: I2, unit: 'A' },
          { type: 'num', label: '第 3 步 代入：R =', ans: R2, unit: 'Ω' }
        ],
        tip: 'R = U/I 是测量式：用电压和电流的比值算电阻。',
        explain: ['R = U/I = ' + U2 + ' ÷ ' + I2 + ' = ' + fmtNum(R2) + ' Ω。'],
        kp: ['欧姆定律', '电学', '计算']
      };
    }
    var I3 = kase.I, R3 = kase.R, U3 = kase.U;
    return {
      id: 'calc.ohm', kind: 'ohm', title: '欧姆定律 反求 U',
      prompt: '通过某导体的电流 I = ' + I3 + ' A，导体的电阻 R = ' + R3 + ' Ω。求导体两端的电压 U。',
      fields: [
        choiceField(r, 'U = IR', ['U = I/R', 'U = R/I', 'U = I + R'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：I =', ans: I3, unit: 'A' },
        { type: 'num', label: 'R =', ans: R3, unit: 'Ω' },
        { type: 'num', label: '第 3 步 代入：U =', ans: U3, unit: 'V' }
      ],
      tip: 'U = IR：已知电流和电阻求电压。',
      explain: ['U = IR = ' + I3 + ' × ' + R3 + ' = ' + fmtNum(U3) + ' V。'],
      kp: ['欧姆定律', '电学', '计算']
    };
  }

  /* ---------- 串并联电路的 U、I 关系（第11周） ---------- */
  function genCalcSeriesU(r) {
    {
      var U1 = pick(r, [1, 1.5, 2, 2.5]);
      var U2 = pick(r, [1, 1.5, 2, 3]);
      var U = Math.round((U1 + U2) * 100) / 100;
      return {
        id: 'calc.seriesU', kind: 'seriesU', title: '串联：U总 = U₁ + U₂',
        prompt: '两个灯泡串联接在电压为 ' + fmtNum(U) + ' V 的电源上，L₁ 两端的电压是 ' + fmtNum(U1) + ' V。求 L₂ 两端的电压。',
        fields: [
          choiceField(r, 'U总 = U₁ + U₂', ['U总 = U₁ = U₂', 'U总 = U₁ − U₂', 'U总 = U₁ × U₂'], '第 1 步 选公式：'),
          { type: 'num', label: '第 2 步 指认量：U总 =', ans: U, unit: 'V' },
          { type: 'num', label: 'U₁ =', ans: U1, unit: 'V' },
          { type: 'num', label: '第 3 步 代入：U₂ =', ans: U2, unit: 'V' }
        ],
        tip: '串联电路两端总电压等于各部分电压之和：U = U₁ + U₂。',
        explain: ['串联分压：U = U₁ + U₂。', 'U₂ = U − U₁ = ' + fmtNum(U) + ' − ' + fmtNum(U1) + ' = ' + fmtNum(U2) + ' V。'],
        kp: ['串联', '电压', '计算']
      };
    }
  }

  function genCalcParallelI(r) {
    var I1 = pick(r, [0.1, 0.2, 0.3, 0.4]);
    var I2 = pick(r, [0.1, 0.2, 0.3, 0.5]);
    var I = Math.round((I1 + I2) * 100) / 100;
    return {
      id: 'calc.parallelI', kind: 'parallelI', title: '并联：I总 = I₁ + I₂',
      prompt: '两盏灯并联在电路中，通过 L₁ 的电流是 ' + fmtNum(I1) + ' A，通过 L₂ 的电流是 ' + fmtNum(I2) + ' A。求干路电流。',
      fields: [
        choiceField(r, 'I总 = I₁ + I₂', ['I总 = I₁ = I₂', 'I总 = I₁ − I₂', 'I总 = I₁ × I₂'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：I₁ =', ans: I1, unit: 'A' },
        { type: 'num', label: 'I₂ =', ans: I2, unit: 'A' },
        { type: 'num', label: '第 3 步 代入：I总 =', ans: I, unit: 'A' }
      ],
      tip: '并联干路电流等于各支路电流之和：I = I₁ + I₂。',
      explain: ['并联分流：I = I₁ + I₂。', 'I总 = ' + fmtNum(I1) + ' + ' + fmtNum(I2) + ' = ' + fmtNum(I) + ' A。'],
      kp: ['并联', '电流', '计算']
    };
  }

  /* ================= 作图判断（固定 7 组图，四选一，轮换；含电压表接法） ================= */
  var DRAW = [
    {
      id: 'draw.lever.1', kind: 'lever', title: '力臂作垂线（斜向力）',
      prompt: '杠杆 OA 可绕支点 O 转动，A 端挂重物 G，在 B 点施加力 F 使杠杆平衡。图中 l 表示 F 的力臂，画法正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 1,
        figs: [
          { type: 'lever', mode: 'draw', ltype: 'point', rodDeg: 25, fDeg: 105 },
          { type: 'lever', mode: 'draw', ltype: 'perp', rodDeg: 25, fDeg: 105 },
          { type: 'lever', mode: 'draw', ltype: 'along', rodDeg: 25, fDeg: 105 },
          { type: 'lever', mode: 'draw', ltype: 'wrongperp', rodDeg: 25, fDeg: 105 }
        ]
      }],
      tip: '力臂是「支点到力的作用线的垂线段」，不是支点到作用点的连线。',
      explain: ['甲：把 O 与 F 的作用点 B 直接连起来，这不是力臂。', '乙：从 O 向 F 的作用线作垂线，垂足到 O 的线段才是力臂 ✓。', '丙：画在杠杆上；丁：对错了力（画的是到 G 作用线的垂线）。'],
      fig: { type: 'lever', mode: 'model', rodDeg: 25, fDeg: 105 }, figBefore: true,
      kp: ['杠杆', '力臂']
    },
    {
      id: 'draw.lever.2', kind: 'lever', title: '力臂作垂线（竖直力）',
      prompt: '杠杆 OA 可绕支点 O 转动，A 端挂重物 G，在 B 点施加竖直向下的力 F。图中 l 表示 F 的力臂，画法正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 3,
        figs: [
          { type: 'lever', mode: 'draw', ltype: 'along', rodDeg: 30, fDeg: 90 },
          { type: 'lever', mode: 'draw', ltype: 'point', rodDeg: 30, fDeg: 90 },
          { type: 'lever', mode: 'draw', ltype: 'wrongperp', rodDeg: 30, fDeg: 90 },
          { type: 'lever', mode: 'draw', ltype: 'perp', rodDeg: 30, fDeg: 90 }
        ]
      }],
      tip: '力臂不一定是杆上的一段：F 竖直向下时，力臂是 O 到竖直作用线的水平距离。',
      explain: ['甲：把 O 到 A 的杆画成力臂；乙：把 O 到 B 的连线画成力臂；丙：对错了力。', '丁：从 O 向 F 的竖直作用线作垂线，垂线段才是力臂 ✓。'],
      fig: { type: 'lever', mode: 'model', rodDeg: 30, fDeg: 90 }, figBefore: true,
      kp: ['杠杆', '力臂']
    },
    {
      id: 'draw.rope.1', kind: 'rope', title: '滑轮组绕绳 n = 2',
      prompt: '用滑轮组提升重物 G，要求绳端向下拉、承担物重的绳子有 2 段（n = 2）。下列绕法中正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 0,
        figs: [
          { type: 'pulley', variant: 'n2' },
          { type: 'pulley', variant: 'n3' },
          { type: 'pulley', variant: 'n1a' },
          { type: 'pulley', variant: 'n1b' }
        ]
      }],
      tip: '数 n：与动滑轮相连、向上拉着动滑轮的绳子有几段，n 就是几。',
      explain: ['甲：绳一端固定在天花板，向下绕过动滑轮，再向上绕过定滑轮后向下拉——有 2 段绳承担物重 ✓。', '乙：n = 3；丙、丁：只有 1 段绳承担物重，不省力。'],
      kp: ['滑轮组', '绕绳']
    },
    {
      id: 'draw.rope.2', kind: 'rope', title: '滑轮组绕绳 n = 3',
      prompt: '用滑轮组提升重物 G，要求绳端向上拉、承担物重的绳子有 3 段（n = 3）。下列绕法中正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 1,
        figs: [
          { type: 'pulley', variant: 'n2' },
          { type: 'pulley', variant: 'n3' },
          { type: 'pulley', variant: 'n1b' },
          { type: 'pulley', variant: 'n1a' }
        ]
      }],
      tip: 'n = 3 时，绳的一端要系在动滑轮的挂钩上，最后自由端向上拉。',
      explain: ['甲：n = 2；乙：绳端系在动滑轮上，绕过定滑轮、动滑轮后向上拉，n = 3 ✓。', '丙、丁：只有 1 段绳承担物重。'],
      kp: ['滑轮组', '绕绳']
    },
    {
      id: 'draw.wire.1', kind: 'wire', title: '并联电路连线',
      prompt: '要求两灯并联，开关 S 接在干路上、能同时控制两盏灯。下列电路中正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 0,
        figs: [
          { type: 'circuit', kind: 'connect-parallel' },
          { type: 'circuit', kind: 'connect-series' },
          { type: 'circuit', kind: 'connect-switchbranch' },
          { type: 'circuit', kind: 'connect-short' }
        ]
      }],
      tip: '并联：两灯各在一条支路；开关要接在干路上，才能同时控制两灯。',
      explain: ['甲：两灯并联，开关在干路 ✓。', '乙：两灯串联；丙：开关只在 L₁ 支路，控制不了 L₂；丁：电源被导线直接短接，会短路。'],
      kp: ['电路', '并联']
    },
    {
      id: 'draw.wire.2', kind: 'wire', title: '电流表接法',
      prompt: '要求电流表测通过 L₁ 的电流。下列接法中正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 2,
        figs: [
          { type: 'circuit', kind: 'connect-ammeterMain' },
          { type: 'circuit', kind: 'connect-ammeterShort' },
          { type: 'circuit', kind: 'connect-ammeterL1' },
          { type: 'circuit', kind: 'connect-ammeterL2' }
        ]
      }],
      tip: '电流表要与被测用电器串联，不能直接接到电源两端。',
      explain: ['甲：电流表在干路，测总电流；乙：电流表直接接在电源两端，会短路烧表；丙：电流表串在 L₁ 支路，测 L₁ 的电流 ✓；丁：接在 L₂ 支路，测的是 L₂ 的电流。'],
      kp: ['电路', '电流表']
    },
    {
      id: 'draw.wire.3', kind: 'wire', title: '电压表接法',
      prompt: '两灯串联，要求用电压表测 L₁ 两端的电压。下列接法中正确的是（　）',
      fields: [{
        type: 'choice', label: '', options: ['甲', '乙', '丙', '丁'], ans: 0,
        figs: [
          { type: 'circuit', kind: 'connect-voltmeterSL1' },
          { type: 'circuit', kind: 'connect-voltmeterSloop' },
          { type: 'circuit', kind: 'connect-voltmeterSbattery' },
          { type: 'circuit', kind: 'connect-voltmeterSL2' }
        ]
      }],
      tip: '电压表要并联在被测用电器两端，不能串进电路。',
      explain: ['甲：电压表并联在 L₁ 两端，测的就是 L₁ 的电压 ✓。', '乙：电压表串进了电路，L₁ 不亮；丙：并在电源两端，测的是总电压；丁：并在 L₂ 两端，测的是 L₂ 的电压。'],
      kp: ['电路', '电压表']
    },
    mkArmItem(
      'draw.arm.1', '画清力臂（斜向力）', 25, 105,
      '杠杆可绕支点 O 转动，在 B 点斜向下施力 F（图中虚线是 F 的作用线）。<b>请从支点 O 出发，向 F 的作用线作垂线，垂足处成直角——这条垂线段就是力臂 l。</b>用鼠标或手指从 O 拖到垂足；画好再提交。',
      '力臂 = 支点到力的作用线的垂线段。先沿 F 把作用线延长，再从 O 作垂线落到延长线上，垂足处标直角。',
      ['① 找到 F 的作用线（斜向的那条虚线），必要时沿 F 方向延长。', '② 从支点 O 出发，作一条与作用线垂直的线，落到作用线上。', '③ 垂足处成直角，O 到垂足这段就是力臂 l——不是 O 到作用点 B 的连线。']
    ),
    mkArmItem(
      'draw.arm.2', '画清力臂（竖直力）', 30, 90,
      '杠杆可绕支点 O 转动，在 B 点施加竖直向下的力 F（图中虚线是 F 的竖直作用线）。<b>请从支点 O 出发向作用线作垂线并标出直角，把力臂 l 这段距离画清楚。</b>用鼠标或手指从 O 拖到垂足；画好再提交。',
      '竖直力的力臂是 O 到竖直作用线的水平距离；力臂不一定在杠杆上。',
      ['① F 竖直向下，作用线是过 B 的竖直线。', '② 从 O 作水平垂线，垂直落到这条竖直作用线上，垂足处成直角。', '③ O 到垂足的水平距离就是力臂 l——不要把整段杠杆 OA 当成力臂。']
    )
  ];

  /* ================= 读数（4 类：量程 / 分度值 / 读数；含电压表） ================= */
  function genReadAmmeter(r) {
    var range = pick(r, [0.6, 3]);
    var div = range === 0.6 ? 0.02 : 0.1;
    var k = ri(r, 3, 28);
    var reading = Math.round(k * div * 100) / 100;
    var fmt = range === 0.6 ? '0~0.6 A' : '0~3 A';
    return {
      id: 'read.ammeter', kind: 'ammeter', title: '电流表读数',
      prompt: '如图是电流表的表盘（表盘上有 0~0.6 A 和 0~3 A 两个量程的刻度）。现在使用的是 ' + fmt + ' 量程，指针位置如图。',
      fields: [
        { type: 'num', label: '量程 =', ans: range, unit: 'A' },
        { type: 'num', label: '分度值 =', ans: div, unit: 'A' },
        { type: 'num', label: '读数 =', ans: reading, unit: 'A' }
      ],
      tip: '分度值 = 量程 ÷ 大格数；读数 = 小格数 × 分度值。',
      explain: ['使用的量程是 ' + fmt + '。', '0~' + range + ' A 一共 30 个小格，分度值 = ' + range + ' ÷ 30 = ' + fmtNum(div) + ' A。', '指针偏转 ' + k + ' 个小格，读数 = ' + k + ' × ' + fmtNum(div) + ' = ' + fmtNum(reading) + ' A。'],
      fig: { type: 'ammeter', range: range, reading: reading }, figBefore: true,
      kp: ['电流表', '读数']
    };
  }

  /* 电压表读数：0~3 V / 0~15 V，共 30 小格，分度值 0.1 / 0.5 V */
  function genReadVoltmeter(r) {
    var range = pick(r, [3, 15]);
    var div = range === 3 ? 0.1 : 0.5;
    var k = ri(r, 3, 28);
    var reading = Math.round(k * div * 100) / 100;
    var fmt = range === 3 ? '0~3 V' : '0~15 V';
    return {
      id: 'read.voltmeter', kind: 'voltmeter', title: '电压表读数',
      prompt: '如图是电压表的表盘（表盘上有 0~3 V 和 0~15 V 两个量程的刻度）。现在使用的是 ' + fmt + ' 量程，指针位置如图。',
      fields: [
        { type: 'num', label: '量程 =', ans: range, unit: 'V' },
        { type: 'num', label: '分度值 =', ans: div, unit: 'V' },
        { type: 'num', label: '读数 =', ans: reading, unit: 'V' }
      ],
      tip: '分度值 = 量程 ÷ 大格数；读数 = 小格数 × 分度值。',
      explain: ['使用的量程是 ' + fmt + '。', '0~' + range + ' V 一共 30 个小格，分度值 = ' + range + ' ÷ 30 = ' + fmtNum(div) + ' V。', '指针偏转 ' + k + ' 个小格，读数 = ' + k + ' × ' + fmtNum(div) + ' = ' + fmtNum(reading) + ' V。'],
      fig: { type: 'voltmeter', range: range, reading: reading }, figBefore: true,
      kp: ['电压表', '读数']
    };
  }

  function genReadThermometer(r) {
    var lo = -10, hi = 110, div = 1;
    var reading = ri(r, -8, 108);
    return {
      id: 'read.thermometer', kind: 'thermometer', title: '温度计读数',
      prompt: '如图是温度计的刻度（单位 ℃）。把它放在被测液体中，液面位置如图。',
      fields: [
        { type: 'num', label: '量程上限 =', ans: hi, unit: '℃' },
        { type: 'num', label: '分度值 =', ans: div, unit: '℃' },
        { type: 'num', label: '读数 =', ans: reading, unit: '℃' }
      ],
      tip: '先看 0℃ 在哪，再往上看正数、往下看负数；分度值是最小一格代表的值。',
      explain: ['这支温度计的最低刻度是 ' + lo + '℃，最高刻度是 ' + hi + '℃，量程上限是 ' + hi + '℃。', '每一小格代表 ' + div + '℃，分度值 = ' + div + '℃。', '液面在第 ' + (reading - lo) + ' 小格处，读数 = ' + reading + '℃。'],
      fig: { type: 'thermometer', lo: lo, hi: hi, reading: reading }, figBefore: true,
      kp: ['温度计', '读数']
    };
  }

  function genReadSpring(r) {
    var max = 5, div = 0.2;
    var k = ri(r, 2, 24);
    var reading = Math.round(k * div * 10) / 10;
    return {
      id: 'read.spring', kind: 'spring', title: '弹簧测力计读数',
      prompt: '如图是弹簧测力计的刻度盘，指针位置如图。',
      fields: [
        { type: 'num', label: '量程 =', ans: max, unit: 'N' },
        { type: 'num', label: '分度值 =', ans: div, unit: 'N' },
        { type: 'num', label: '读数 =', ans: reading, unit: 'N' }
      ],
      tip: '量程看最大刻度，分度值看最小一格；读数 = 小格数 × 分度值。',
      explain: ['最大刻度是 ' + max + ' N，所以量程是 0~' + max + ' N。', '0~' + max + ' N 共 ' + Math.round(max / div) + ' 个小格，分度值 = ' + max + ' ÷ ' + Math.round(max / div) + ' = ' + fmtNum(div) + ' N。', '指针指在第 ' + k + ' 小格，读数 = ' + k + ' × ' + fmtNum(div) + ' = ' + fmtNum(reading) + ' N。'],
      fig: { type: 'spring', max: max, div: div, reading: reading }, figBefore: true,
      kp: ['弹簧测力计', '读数']
    };
  }

  /* ================= 第12周补题：作业卷暴露的断点 =================
     分子动理论 / 图像 / 能量转化 / 电路角色 / 验电器 / 滑动变阻器 /
     比热容比较 / 导线对折 / 热机效率 / 熔化热 / 功率 / 双量程读数    */
  function genModelDiffusion(r) {
    var hot = ri(r, 0, 1) === 1;
    if (hot) {
      return {
        id: 'model.diffusion', kind: 'diffusion', title: '温度越高扩散越快',
        prompt: '同时向等质量的冷水和热水中各滴一滴红墨水，热水中更快整杯变红。这一现象说明（　）',
        fields: [choiceField(r, '温度越高，分子无规则运动越剧烈',
          ['热水分子之间存在斥力', '热水分子的间距比冷水大', '分子只有在热水中才会运动'])],
        tip: '扩散快慢反映分子运动的剧烈程度；温度越高，分子无规则运动越剧烈。',
        explain: ['两杯水只有温度不同，是控制变量实验。', '热水扩散更快 → 温度越高，分子无规则运动越剧烈。'],
        fig: { type: 'particle', mode: 'diffuse', hot: true }, figBefore: true,
        kp: ['分子动理论', '扩散现象']
      };
    }
    return {
      id: 'model.diffusion', kind: 'diffusion', title: '扩散说明什么',
      prompt: '打开榴莲包装后，香味很快充满整个房间。这一现象主要说明（　）',
      fields: [choiceField(r, '分子在不停地做无规则运动',
        ['物质只能由分子构成', '分子之间存在引力', '分子之间没有间隙'])],
      tip: '闻到气味=扩散现象；扩散只说明分子在运动，不能直接说明引力或间隙。',
      explain: ['香味分子从浓度高处运动到浓度低处，扩散到整个房间。', '这是扩散现象，说明分子在永不停息地做无规则运动。'],
      fig: { type: 'particle', mode: 'diffuse', hot: false }, figBefore: true,
      kp: ['分子动理论', '扩散现象']
    };
  }

  function genModelInterforce(r) {
    var repel = ri(r, 0, 1) === 1;
    if (repel) {
      return {
        id: 'model.interforce', kind: 'interforce', title: '液体难压缩',
        prompt: '注射器里封一定量水，用手推活塞很难把水压缩。这主要是因为（　）',
        fields: [choiceField(r, '分子间距离变小时表现为斥力',
          ['分子间有空隙', '分子在不停地运动', '分子间表现为引力'])],
        tip: '「很难压缩」想斥力；「拉不断、粘得住」想引力。',
        explain: ['水分子已经靠得很近，再压近时分子间的斥力急剧增大。', '所以液体很难被压缩，而不是因为分子静止或没有空隙。'],
        fig: { type: 'particle', mode: 'repel' }, figBefore: true,
        kp: ['分子动理论', '分子间作用力']
      };
    }
    return {
      id: 'model.interforce', kind: 'interforce', title: '露珠与铅块',
      prompt: '清晨叶子下方的露珠不易掉落；两个表面磨平的铅块压紧后能吊起重物。这些现象说明（　）',
      fields: [choiceField(r, '分子间存在引力',
        ['分子间只有斥力', '分子停止了运动', '分子之间没有空隙'])],
      tip: '分子间同时存在引力和斥力；距离略大表现为引力，距离很小时表现为斥力。',
      explain: ['水分子与叶面分子、铅块接触面分子相互吸引。', '所以表现为引力，能把物体「拉住」。'],
      fig: { type: 'particle', mode: 'attract' }, figBefore: true,
      kp: ['分子动理论', '分子间作用力']
    };
  }

  function genModelPhaseGraph(r) {
    var crystal = ri(r, 0, 1) === 1;
    if (crystal) {
      return {
        id: 'model.phasegraph', kind: 'phasegraph', title: '晶体熔化曲线',
        prompt: '如图是某物质加热时温度随时间变化的图像。BC 段温度不变，关于这段过程说法正确的是（　）',
        fields: [choiceField(r, '物质继续吸热，内能增大',
          ['物质不吸热，内能不变', '物质已经全部变成气态', '该物质一定是非晶体'])],
        tip: '晶体熔化：持续吸热、温度不变、内能增大；有固定熔点。',
        explain: ['BC 段是熔化过程，加热器一直在供热。', '温度不变但内能增大——吸收的热量用来改变分子势能。', '有平台说明有固定熔点，是晶体。'],
        fig: { type: 'phasegraph', flat: true }, figBefore: true,
        kp: ['内能', '物态变化']
      };
    }
    return {
      id: 'model.phasegraph', kind: 'phasegraph', title: '非晶体曲线',
      prompt: '如图是某物质加热时温度随时间变化的图像：全程没有温度不变的平台。据此可判断（　）',
        fields: [choiceField(r, '该物质可能是非晶体',
          ['该物质一定是晶体', '熔化过程中温度保持不变', '该物质一定没有熔化'])],
        tip: '非晶体没有固定熔点，加热时温度持续升高。',
        explain: ['图像没有水平段，说明没有固定熔点。', '玻璃、松香、沥青是非晶体；冰、海波、金属是晶体。'],
        fig: { type: 'phasegraph', flat: false }, figBefore: true,
        kp: ['内能', '物态变化']
      };
  }

  function genModelEnergy(r) {
    var v = ri(r, 0, 2);
    if (v === 0) {
      return {
        id: 'model.energy', kind: 'energy', title: '充电与供电',
        prompt: '太阳能电池板给蓄电池充电，蓄电池再给小风扇供电。关于能量转化，正确的是（　）',
        fields: [choiceField(r, '充电：电能→化学能；供电：化学能→电能',
          ['充电：化学能→电能；供电：电能→化学能', '充电和供电都是化学能→电能', '太阳能电池板把电能转化为太阳能'])],
        tip: '蓄电池充电是「存进去」：电能变化学能；放电是「取出来」：反过来。',
        explain: ['太阳能电池板先把太阳能转化为电能。', '充电时电能转化为化学能储存；供电时化学能转化为电能，风扇再把电能转化为机械能。'],
        fig: { type: 'battery', n: 2 }, figBefore: true,
        kp: ['能量守恒', '能量转化']
      };
    }
    if (v === 1) {
      return {
        id: 'model.energy', kind: 'energy', title: '热机效率看哪一块',
        prompt: '燃料完全燃烧释放的能量中，一部分变成有用机械能，其余随废气、散热和摩擦损失。热机效率是（　）',
        fields: [choiceField(r, '有用机械能 / 燃料完全燃烧放出的总能量',
          ['废气带走的能量 / 总能量', '总能量 / 有用机械能', '摩擦损失 / 有用机械能'])],
        tip: 'η = W有用 / Q放，分子是有用的那一份，分母是燃料放出的总能量。',
        explain: ['效率永远小于 1：损失不可避免。', '废气、散热、摩擦都属于损失，不能放进分子。'],
        kp: ['热机效率', '能量守恒']
      };
    }
    return {
      id: 'model.energy', kind: 'energy', title: '元件角色判断',
      prompt: '室外监控侧方的太阳能电池板为监控系统供电。在电路中，太阳能电池板相当于（　）',
      fields: [choiceField(r, '电源', ['用电器', '开关', '导线'])],
      tip: '对外供电的是电源，消耗电能的是用电器；充电中的蓄电池是用电器，放电中的蓄电池是电源。',
      explain: ['太阳能电池板把太阳能转化为电能并向外供电。', '提供电能的元件就是电源。'],
      fig: { type: 'battery', n: 1 }, figBefore: true,
      kp: ['电路', '电源']
    };
  }

  function genModelElectroscope(r) {
    var flow = ri(r, 0, 1) === 1;
    if (flow) {
      return {
        id: 'model.electroscope', kind: 'electroscope', title: '接触瞬间的电子与电流',
        prompt: '用丝绸摩擦过的玻璃棒（带正电）接触不带电的验电器金属球，金属箔张开。接触瞬间（　）',
        fields: [choiceField(r, '自由电子向上定向移动，电流方向向下',
          ['自由电子向下定向移动，电流方向向上', '摩擦过程创造出了新的电荷', '两片金属箔带异种电荷'])],
        tip: '金属中定向移动的是自由电子；规定电流方向与电子移动方向相反。',
        explain: ['玻璃棒带正电，接触时验电器中的自由电子向上转移到玻璃棒。',
                  '自由电子向上，所以电流方向向下；两片金属箔都带正电，同种电荷相斥而张开。'],
        fig: { type: 'charge', mode: 'touch' }, figBefore: true,
        kp: ['电荷', '电流方向']
      };
    }
    return {
      id: 'model.electroscope', kind: 'electroscope', title: '验电器为什么张开',
      prompt: '验电器的金属箔带电后张开，原因是（　）',
      fields: [choiceField(r, '两片金属箔带同种电荷，相互排斥',
        ['两片金属箔带异种电荷，相互排斥', '两片金属箔带异种电荷，相互吸引', '金属箔不带电，被空气吹开'])],
      tip: '验电器只能检验是否带电；张开说明带电，不能判断带正电还是负电。',
      explain: ['电荷从金属球经金属杆传到两片金属箔。', '两片金属箔带同种电荷，相互排斥而张开。'],
      fig: { type: 'charge', mode: 'touch' }, figBefore: true,
      kp: ['电荷', '相互作用']
    };
  }

  function genModelRheostat(r) {
    return {
      id: 'model.rheostat', kind: 'rheostat', title: '滑片移动与灯泡亮暗',
      prompt: '串联电路中，滑动变阻器接入的是「左下接线柱 + 滑片」这一段。滑片向右移动时（　）',
      fields: [choiceField(r, '接入电阻变大，灯泡变暗',
          ['接入电阻变小，灯泡变亮', '接入电阻不变，灯泡亮度不变', '灯泡被短路，立即熄灭'])],
      tip: '滑动变阻器看「下面接了哪个接线柱」：离它越远，接入电阻越大。',
      explain: ['接左下接线柱时，真正接入电路的是左端到滑片之间的电阻丝。',
                '滑片向右移动，这段电阻丝变长，接入电阻变大。',
                '总电阻变大 → 电流变小 → 灯泡变暗。'],
      kp: ['滑动变阻器', '动态电路']
    };
  }

  function genAmountCompare(r) {
    var dtA = pick(r, [40, 50, 60]), dtB = pick(r, [10, 15, 20, 25, 30]);
    if (dtA <= dtB) dtA = dtB * 2;
    var frac = dtA / dtB;
    var ratio = Math.round(frac * 100) / 100;
    return {
      id: 'amount.ccompare', kind: 'ccompare', title: '比热容比较（Q、m 相同）',
      prompt: '质量相同的 a、b 两种液体吸收相同热量，a 升温 ' + dtA + '℃，b 升温 ' + dtB + '℃。由 Q = cmΔt 可知（　）',
      fields: [
        choiceField(r, 'cₐ < cᵦ', ['cₐ > cᵦ', 'cₐ = cᵦ', '无法比较']),
        { type: 'num', label: 'cᵦ 是 cₐ 的几倍（填数字）', ans: ratio, tol: 0.01 }
      ],
      tip: 'Q、m 相同时 c 与 Δt 成反比：升温多的比热容小。',
      explain: ['c = Q/(mΔt)，Q、m 相同，所以比热容与升温成反比。',
                'Δtₐ=' + dtA + '℃ > Δtᵦ=' + dtB + '℃，所以 cₐ < cᵦ，cᵦ/cₐ = ' + fmtNum(ratio) + '。'],
      kp: ['比热容', '控制变量']
    };
  }

  function genAmountWireFold(r) {
    return {
      id: 'amount.resfold', kind: 'resfold', title: '导线对折后 R 怎么变',
      prompt: '粗细均匀的合金导线电阻为 R₁；把它对折后接入电路，电阻为 R₂。对折同时改变了哪两个量？',
      fields: [
        choiceField(r, '长度减半、横截面积加倍', ['长度加倍、横截面积减半', '长度和横截面积都减半', '长度和横截面积都不变']),
        choiceField(r, 'R₂ = R₁ / 4', ['R₂ = R₁ / 2', 'R₂ = 2R₁', 'R₂ = R₁'])
      ],
      tip: 'R = ρL/S：对折让 L 减半、S 加倍，两个因素都让电阻变小，结果是 1/4。',
      explain: ['设原导线长 L、横截面积 S，R₁ = ρL/S。', '对折后长度 L/2，两段并联相当于横截面积 2S。',
                'R₂ = ρ(L/2)/(2S) = R₁/4。'],
      fig: { type: 'wirefold' }, figBefore: true,
      kp: ['电阻', '决定因素']
    };
  }

  function genCalcHeatEngine(r) {
    var Q = pick(r, [2e7, 4e7, 5e7, 8e7]);
    var eta = pick(r, [20, 25, 30, 40]);
    var W = Q * eta / 100;
    return {
      id: 'calc.heatengineeff', kind: 'heatengineeff', title: '热机效率 η = W有用/Q放',
      prompt: '某热机完全燃烧燃料放出 ' + fmtNum(Q) + ' J 热量，效率为 ' + eta + '%。求对外做的有用功 W。',
      fields: [
        choiceField(r, 'η = W有用 / Q放', ['η = Q放 / W有用', 'η = W有用 × Q放', 'η = Q放 − W有用'], '第 1 步 选公式：'),
        { type: 'num', label: '第 2 步 指认量：Q放 =', ans: Q, tol: 1 },
        { type: 'num', label: '第 3 步 代入：W有用 =', ans: W, tol: 1 }
      ],
      tip: '效率乘总量得有用量：W有用 = ηQ放；算百分数时 η 要除以 100。',
      explain: ['η = ' + eta + '% = ' + fmtNum(eta / 100) + '。',
                'W有用 = ηQ放 = ' + fmtNum(eta / 100) + ' × ' + fmtNum(Q) + ' = ' + fmtNum(W) + ' J。'],
      kp: ['热机效率', '计算']
    };
  }

  function genCalcFusion(r) {
    /* 参数要让 λ 落在中学教材量级（冰 3.34×10⁵、本卷第13题 7.2×10⁴ J/kg）：
       300~600 W × 60~120 s × 0.2~0.5 kg → λ = 3.6×10⁴~3.6×10⁵ J/kg */
    var P = pick(r, [300, 400, 500, 600]);
    var t = pick(r, [60, 90, 120]);
    var m = pick(r, [0.2, 0.3, 0.4, 0.5]);
    var Q = P * t, lam = Q / m;
    return {
      id: 'calc.fusionheat', kind: 'fusionheat', title: '熔化热 λ = Q/m',
      prompt: '加热器功率 ' + P + ' W，晶体熔化持续 ' + t + ' s，质量 ' + fmtNum(m) + ' kg。求熔化过程吸收的热量和熔化热 λ。',
      fields: [
        { type: 'num', label: '第 1 步 熔化吸热 Q = Pt（J）', ans: Q, tol: 1 },
        { type: 'num', label: '第 2 步 熔化热 λ = Q/m（J/kg）', ans: lam, tol: 1 }
      ],
      tip: '加热器稳定工作时 Q = Pt；熔化热是「同温度固→液吸收的热量 / 质量」。',
      explain: ['Q = Pt = ' + P + '×' + t + ' = ' + fmtNum(Q) + ' J。',
                'λ = Q/m = ' + fmtNum(Q) + ' ÷ ' + fmtNum(m) + ' = ' + fmtNum(lam) + ' J/kg。'],
      kp: ['内能', '物态变化', '计算']
    };
  }

  function genCalcPowerDrive(r) {
    var mTon = pick(r, [1.5, 2, 2.5, 3]);
    var v = pick(r, [20, 25, 30, 36]);
    var fN = mTon * 1000 * 10 * 0.1;
    var P = fN * v;
    return {
      id: 'calc.powerdrive', kind: 'powerdrive', title: '匀速行驶 P = Fv',
      prompt: '质量 ' + fmtNum(mTon) + ' t 的电动汽车以 ' + v + ' m/s 匀速行驶，阻力是车重的 0.1 倍（g 取 10 N/kg）。求行驶功率。',
      fields: [
        { type: 'num', label: '第 1 步 阻力 f =', ans: fN, unit: 'N', tol: 1 },
        { type: 'num', label: '第 2 步 匀速牵引力 F =', ans: fN, unit: 'N', tol: 1 },
        { type: 'num', label: '第 3 步 功率 P = Fv（W）', ans: P, tol: 1 }
      ],
      tip: '匀速时牵引力等于阻力；P = W/t = Fs/t = Fv，速度必须用 m/s。',
      explain: ['G = mg = ' + fmtNum(mTon * 1000) + '×10 = ' + fmtNum(mTon * 10000) + ' N。',
                'f = 0.1G = ' + fmtNum(fN) + ' N；匀速 → F = f。',
                'P = Fv = ' + fmtNum(fN) + '×' + v + ' = ' + fmtNum(P) + ' W。'],
      kp: ['功率', '计算']
    };
  }

  function genReadDualRange(r) {
    /* 读数必须落在表盘分度上：0~3 V 每格 0.1 V、0~15 V 每格 0.5 V；
       0~0.6 A 每格 0.02 A、0~3 A 每格 0.1 A（svgMeterDial 共 30 格） */
    var volt = ri(r, 0, 1) === 1;
    var small = volt ? pick(r, [0.6, 0.9, 1.2, 1.5]) : pick(r, [0.12, 0.24, 0.36, 0.48]);
    var big = Math.round(small * 5 * 100) / 100;
    return {
      id: 'read.dualrange', kind: 'dualrange', title: '同一指针，两个量程',
      prompt: (volt ? '电压表' : '电流表') + '指针位置如图。若按 ' + (volt ? '0~3 V' : '0~0.6 A') + ' 量程读数是 ' + fmtNum(small) + '，那么按 ' + (volt ? '0~15 V' : '0~3 A') + ' 量程读数是多少？',
      fields: [
        { type: 'num', label: '大量程读数', ans: big, unit: volt ? 'V' : 'A', tol: 0.01 },
        { type: 'num', label: '两个量程读数之比（大 / 小，填数字）', ans: 5, tol: 0.01 }
      ],
      tip: '表盘同一指针位置：0~15 V 是 0~3 V 的 5 倍；0~3 A 是 0~0.6 A 的 5 倍。',
      explain: ['先看接的是哪个量程，再按对应刻度读数。',
                '大小量程满偏值之比为 5，所以同一指针位置读数也相差 5 倍。'],
      fig: volt ? { type: 'voltmeter', range: 15, reading: big } : { type: 'ammeter', range: 3, reading: big },
      figBefore: true,
      kp: ['电表', '读数']
    };
  }

  /* ================= 模块注册表：顺序 = 每日顺序 = 页签顺序 ================= */
  var MODULES = [
    {
      id: 'model', name: '认模型', icon: '🧭',
      desc: '看图认模型：电压与电池组 / 电阻与材料 / 导体绝缘体 / 串并联 / 表位置 / 电压表测哪段 / 测力计张力 / LED / 电荷 / 四冲程 / 滑轮组；第12周补：扩散、分子力、熔化曲线、能量转化、验电器与电流方向、滑动变阻器。',
      kinds: [
        { id: 'voltage', name: '电压与电池组', gen: genModelVoltage },
        { id: 'resistance', name: '电阻与材料', gen: genModelResistance },
        { id: 'conductor', name: '导体与绝缘体', gen: genModelConductor },
        { id: 'connection', name: '串并联识别', gen: genModelConnection },
        { id: 'tension', name: '测力计串绳张力', gen: genModelTension },
        { id: 'led', name: 'LED 定电源极性', gen: genModelLed },
        { id: 'charge', name: '接触后带电', gen: genModelCharge },
        { id: 'stroke', name: '四冲程识别', gen: genModelStroke },
        { id: 'circuit', name: '串并联与表位置', gen: genModelCircuit },
        { id: 'meter', name: '电压表测哪段/使用', gen: genModelMeter },
        { id: 'pulley', name: '滑轮组 n 与力臂', gen: genModelPulley },
        { id: 'diffusion', name: '扩散与温度', gen: genModelDiffusion },
        { id: 'interforce', name: '分子引力与斥力', gen: genModelInterforce },
        { id: 'phasegraph', name: '熔化/沸腾图像', gen: genModelPhaseGraph },
        { id: 'energy', name: '能量转化与元件角色', gen: genModelEnergy },
        { id: 'electroscope', name: '验电器与电流方向', gen: genModelElectroscope },
        { id: 'rheostat', name: '滑动变阻器动态判断', gen: genModelRheostat }
      ]
    },
    {
      id: 'amount', name: '认量', icon: '🎯',
      desc: '先认量再动笔：热量题 m/Δt 与「升高了/升高到」、热值题「总−剩」与反求 q、滑轮组 s/h/n 与反求 h、效率题 W有/W总、反求质量 m、串联电流处处相等、并联电压相等；第12周补：比热容比较、导线对折后 L/S。',
      kinds: [
        { id: 'heatmass', name: '热量题 m/Δt', gen: genAmountHeat },
        { id: 'heatrise', name: '升高了 / 升高到', gen: genAmountHeatRise },
        { id: 'fuelmass', name: '热值题总−剩', gen: genAmountFuel },
        { id: 'fuelq', name: '反求热值 q', gen: genAmountFuelQ },
        { id: 'pulleyamount', name: '滑轮组 s/h/n', gen: genAmountPulley },
        { id: 'pulleyh', name: '反求高度 h', gen: genAmountPulleyH },
        { id: 'effamount', name: '效率题 W有/W总', gen: genAmountEff },
        { id: 'heatm', name: '反求质量 m', gen: genAmountHeatM },
        { id: 'seriesI', name: '串联电流处处相等', gen: genAmountSeriesI },
        { id: 'parallelU', name: '并联各支路电压相等', gen: genAmountParallelU },
        { id: 'ccompare', name: '比热容比较（Q、m 相同）', gen: genAmountCompare },
        { id: 'resfold', name: '导线对折 L/S 变化', gen: genAmountWireFold }
      ]
    },
    {
      id: 'calc', name: '算到底', icon: '🧮',
      desc: '选公式 → 指认量 → 代入算到底，每步单独判分，专治「写了公式就停」；热学、功与功率、滑轮组、杠杆、欧姆定律、串并联 U/I 关系；第12周补：热机效率、熔化热、匀速行驶功率。',
      kinds: [
        { id: 'qheat', name: 'Q = cmΔt', gen: genCalcHeat },
        { id: 'heatdt', name: '反求 Δt', gen: genCalcHeatDt },
        { id: 'qfuel', name: 'Q = mq', gen: genCalcFuel },
        { id: 'qeff', name: 'η = Q吸/Q放', gen: genCalcEff },
        { id: 'workpower', name: 'W = Fs、P = W/t', gen: genCalcWorkPower },
        { id: 'pulleycalc', name: '滑轮组 s=nh / W有 / η', gen: genCalcPulley },
        { id: 'effforce', name: 'η 反求 F', gen: genCalcEffForce },
        { id: 'lever', name: '杠杆 F₁l₁ = F₂l₂', gen: genCalcLever },
        { id: 'leversolve', name: '杠杆 反求 l₁', gen: genCalcLeverSolve },
        { id: 'ohm', name: '欧姆定律 I=U/R', gen: genCalcOhm },
        { id: 'seriesU', name: '串联分压 U₁+U₂', gen: genCalcSeriesU },
        { id: 'parallelI', name: '并联分流 I₁+I₂', gen: genCalcParallelI },
        { id: 'heatengineeff', name: '热机效率 W=ηQ放', gen: genCalcHeatEngine },
        { id: 'fusionheat', name: '熔化热 λ=Q/m', gen: genCalcFusion },
        { id: 'powerdrive', name: '匀速功率 P=Fv', gen: genCalcPowerDrive }
      ]
    },
    {
      id: 'draw', name: '作图判断', icon: '✏️',
      desc: '四选一选正确画法，再动手画：画清力臂 / 滑轮组绕绳 n=2、n=3 / 并联电路连线。',
      kinds: [
        { id: 'lever', name: '力臂作垂线（四选一）' },
        { id: 'armdraw', name: '画清力臂（手绘垂线）' },
        { id: 'rope', name: '滑轮组绕绳' },
        { id: 'wire', name: '并联电路连线' }
      ],
      items: DRAW
    },
    {
      id: 'read', name: '读数', icon: '📏',
      desc: '量程 / 分度值 / 读数三连：电流表、电压表、温度计、弹簧测力计表盘；第12周补：同一指针的双量程读数。',
      kinds: [
        { id: 'ammeter', name: '电流表读数', gen: genReadAmmeter },
        { id: 'voltmeter', name: '电压表读数', gen: genReadVoltmeter },
        { id: 'thermometer', name: '温度计读数', gen: genReadThermometer },
        { id: 'spring', name: '弹簧测力计读数', gen: genReadSpring },
        { id: 'dualrange', name: '同一指针双量程', gen: genReadDualRange }
      ]
    }
  ];

  /* ---------- 题库容量（2026-11-23）----------
     每个题型的「不重复题干数」，口径 = sigOf（mod.kind + 题干与题图的哈希），
     由 seed 扫描 1..3000 饱和得出；页面据此算「做过 a / 总 b」的覆盖比例。
     -1 = 不设上限（纯数字随机，如电阻与材料），只统计练了几道，不给百分比，
          否则永远到不了 100%。改题 / 加题后这张表会漂移：
          `node 物理/题库工具/check-training.mjs pools` 会重扫并逐项比对，
          不一致时按打印出的新数字改这里，不要手估。 */
  var POOLS = {
    'model.voltage': 5, 'model.resistance': -1, 'model.conductor': 3, 'model.connection': 4,
    'model.tension': 19, 'model.led': 2, 'model.charge': 2, 'model.stroke': 8,
    'model.circuit': 3, 'model.meter': 3, 'model.pulley': 3, 'model.diffusion': 2,
    'model.interforce': 2, 'model.phasegraph': 2, 'model.energy': 3, 'model.electroscope': 2,
    'model.rheostat': 1,
    'amount.heatmass': 48, 'amount.heatrise': 96, 'amount.fuelmass': 32, 'amount.fuelq': 12,
    'amount.pulleyamount': 8, 'amount.pulleyh': 8, 'amount.effamount': 72, 'amount.heatm': 16,
    'amount.seriesI': 4, 'amount.parallelU': 4, 'amount.ccompare': 15, 'amount.resfold': 1,
    'calc.qheat': 270, 'calc.heatdt': 48, 'calc.qfuel': 21, 'calc.qeff': 36, 'calc.workpower': 64,
    'calc.pulleycalc': 40, 'calc.effforce': 40, 'calc.lever': 78, 'calc.leversolve': 86,
    'calc.ohm': 117, 'calc.seriesU': 16, 'calc.parallelI': 16, 'calc.heatengineeff': 16,
    'calc.fusionheat': 48, 'calc.powerdrive': 16,
    'draw.lever': 2, 'draw.armdraw': 2, 'draw.rope': 2, 'draw.wire': 3,
    'read.ammeter': 52, 'read.voltmeter': 52, 'read.thermometer': 117, 'read.spring': 23,
    'read.dualrange': 8
  };

  /* ---------- 题目情境数（2026-11-23）----------
     覆盖率的正确分母：把题干里的数字抹平后去重。物理/数学的题库里同一个情境会换
     十几次数值（热量计算 270 条题干只有 3 个情境），拿题干数当分母，覆盖率永远
     涨不动，也看不出真实薄弱点。SKELS = 每个题型的「不同情境数」，由 seed 扫描
     按同一把尺子得出；-1 = 不设上限，页面只报练过几个情境，不给百分比。
     改题后跑 `check-*.mjs pools` 会重扫并逐项比对。 */
  var SKELS = {
    /* 认模型 */
    'model.voltage': 3, 'model.resistance': -1, 'model.conductor': 3, 'model.connection': 3, 'model.tension': 3, 'model.led': 2, 'model.charge': 2, 'model.stroke': 5, 'model.circuit': 3, 'model.meter': 3, 'model.pulley': 2, 'model.diffusion': 2, 'model.interforce': 2, 'model.phasegraph': 2, 'model.energy': 3, 'model.electroscope': 2, 'model.rheostat': 1,
    /* 认量 */
    'amount.heatmass': 1, 'amount.heatrise': 2, 'amount.fuelmass': 2, 'amount.fuelq': 6, 'amount.pulleyamount': 1, 'amount.pulleyh': 1, 'amount.effamount': 1, 'amount.heatm': 2, 'amount.seriesI': 1, 'amount.parallelU': 1, 'amount.ccompare': 1, 'amount.resfold': 1,
    /* 算到底 */
    'calc.qheat': 3, 'calc.heatdt': 6, 'calc.qfuel': 3, 'calc.qeff': 1, 'calc.workpower': 2, 'calc.pulleycalc': 3, 'calc.effforce': 1, 'calc.lever': 1, 'calc.leversolve': 1, 'calc.ohm': 3, 'calc.seriesU': 1, 'calc.parallelI': 1, 'calc.heatengineeff': 1, 'calc.fusionheat': 1, 'calc.powerdrive': 1,
    /* 作图判断 */
    'draw.lever': 2, 'draw.armdraw': 2, 'draw.rope': 2, 'draw.wire': 3,
    /* 读数 */
    'read.ammeter': 1, 'read.voltmeter': 1, 'read.thermometer': 1, 'read.spring': 1, 'read.dualrange': 2
  };
  MODULES.forEach(function (m) {
    m.kinds.forEach(function (k) {
      var p = POOLS[m.id + '.' + k.id];
      k.pool = (p == null ? 0 : p);   /* 0 = 未登记，页面按「不限」处理，别静默当 0 题 */
    });
  });
  function kindPool(modId, kindId) {
    var p = POOLS[modId + '.' + kindId];
    return p == null ? 0 : p;
  }

  function kindSkel(modId, kindId) {
    var s = SKELS[modId + '.' + kindId];
    return s == null ? 0 : s;
  }

  /* ---------- 题目指纹：覆盖率与「专练没做过的题」都靠它 ----------
     同一道题在不同 seed 下抽到，题干与题图一样 → 指纹一样，所以「做过哪几道」可去重。
     题图一起进哈希：作图判断题的题干相同、选项图不同，只看题干会被合成一条。
     第 12 周裁切图（数学）只哈希 cropKey，别把几十 KB 的 base64 拖进来。 */
  function sigOf(q) {
    var s = String(q.prompt == null ? '' : q.prompt);
    if (q.cropKey) s += '#' + q.cropKey;
    else if (q.fig) s += '#' + JSON.stringify(q.fig);
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return (q.mod || '') + '.' + (q.kind || '') + '.' + h.toString(36);
  }

  /* 情境指纹：题干抹平数字后的哈希（不含题图）。同一句话换数值 = 同一情境，
     覆盖率与「练未覆盖」都按它算 —— 做第 2 个数值版本不该让百分比上涨。 */
  function skelOf(q) {
    var s = String(q.prompt == null ? '' : q.prompt)
      .replace(/[0-9]+(\.[0-9]+)?/g, '#').replace(/[０-９]+/g, '#').replace(/\s+/g, '');
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return (q.mod || '') + '.' + (q.kind || '') + '.' + h.toString(36);
  }

  /* ---------- 题库枚举：「专练没做过的题」靠它，不做概率猜测 ----------
     题型是 seed 驱动的确定性生成器，扫一串 seed 就拿到该题型的完整题库，按 sigOf 去重。
     口径必须与 POOLS 表同源：POOLS 是用同样的 3000 个 seed 扫出来的（check-training.mjs pools
     会断言「枚举条数 == POOLS」），所以「覆盖 a/b」的分母和「还剩几道」的分子是同一把尺子。
     结果按题型缓存，最慢的题型（calc.qheat 270 道）扫一遍约 30 ms。 */
  var POOL_SEEDS = 3000;
  var POOL_LIST = {};
  function enumerateKind(modId, kindId) {
    var ck = modId + '.' + kindId;
    if (POOL_LIST[ck]) return POOL_LIST[ck];
    var list = [], seen = {};
    for (var s = 1; s <= POOL_SEEDS; s++) {
      var q;
      try { q = gen(modId, kindId, s); } catch (e) { continue; }
      if (!q || !q.prompt) continue;
      var k = sigOf(q);
      if (!seen[k]) { seen[k] = 1; list.push({ key: k, skel: skelOf(q), q: q }); }
    }
    POOL_LIST[ck] = list;
    return list;
  }

  function moduleById(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i];
    return null;
  }

  /* ================= 出题 ================= */
  function gen(modId, kindId, seed) {
    var m = moduleById(modId);
    if (!m) throw new Error('未知模块 ' + modId);
    var r = mulberry32((seed >>> 0) || 1);
    if (m.items) {
      /* 固定题（draw）：按 kind 过滤后再按 seed 取，保证「按题型练」不会抽到别的题型 */
      var pool = kindId ? m.items.filter(function (it) { return it.kind === kindId; }) : m.items;
      if (!pool.length) pool = m.items;
      var it = pool[Math.floor(r() * pool.length)];
      var copy = JSON.parse(JSON.stringify(it));
      copy.mod = modId;
      if (!copy.kind) copy.kind = kindId || 'item';
      return copy;
    }
    var k = null;
    for (var i = 0; i < m.kinds.length; i++) if (!kindId || m.kinds[i].id === kindId) { k = m.kinds[i]; break; }
    if (!k) k = m.kinds[Math.floor(r() * m.kinds.length)];
    var q = k.gen(r);
    q.mod = modId;
    if (!q.kind) q.kind = k.id;
    return q;
  }

  /* 画清力臂专项队列（老师反馈 3 道已覆盖练习 + 2 道新手绘）：
     先认概念 → 两道四选一判断 → 两道手绘。独立于模块注册表，不参与计数。 */
  function armFocusQueue() {
    var pick = null;
    for (var s = 1; s <= 30 && !pick; s++) {
      var q = gen('model', 'pulley', s * 7919);
      if (q.title === '力臂是哪个') pick = q;
    }
    var byId = {};
    DRAW.forEach(function (it) { byId[it.id] = it; });
    var ids = ['draw.lever.1', 'draw.lever.2', 'draw.arm.1', 'draw.arm.2'];
    var list = [];
    if (pick) list.push(pick);
    ids.forEach(function (id) {
      if (!byId[id]) return;
      var c = JSON.parse(JSON.stringify(byId[id]));
      c.mod = 'draw';
      list.push(c);
    });
    return list;
  }

  /* ================= 自检：生成器 / 判分 / 图 / 边界 ================= */
  function checkQuestion(q, tag, fails) {
    if (!q || !q.prompt || /undefined|NaN/.test(q.prompt)) fails.push(tag + ' 题干异常');
    if (!q.fields || !q.fields.length) { fails.push(tag + ' 无字段'); return; }
    q.fields.forEach(function (f, i) {
      if (f.type === 'num' && !isFinite(f.ans)) fails.push(tag + ' 第 ' + (i + 1) + ' 空答案非数字');
      if (f.type === 'choice') {
        if (!(f.ans >= 0 && f.ans < f.options.length)) fails.push(tag + ' 第 ' + (i + 1) + ' 空选项越界');
        if (f.options.some(function (o) { return o == null || /undefined|NaN/.test(String(o)); })) fails.push(tag + ' 选项异常');
      }
      if (f.figs) {
        if (f.figs.length !== f.options.length) fails.push(tag + ' 选项图数量不对');
        f.figs.forEach(function (d, j) {
          var sv = svgFor({ fig: d });
          if (sv.indexOf('<svg') !== 0) fails.push(tag + ' 选项图 ' + (j + 1) + ' 为空');
          else if (/NaN|undefined/.test(sv)) fails.push(tag + ' 选项图 ' + (j + 1) + ' 含 NaN');
        });
      }
      if (f.type === 'drawline') {
        ['drawFig', 'answerFig'].forEach(function (key) {
          var sv = svgFor({ fig: q[key] });
          if (sv.indexOf('<svg') !== 0 || /NaN|undefined/.test(sv)) fails.push(tag + ' ' + key + ' 作图异常');
        });
      }
    });
    if (q.fig) {
      var svg = svgFor(q);
      if (svg.indexOf('<svg') !== 0) fails.push(tag + ' 题图为空');
      else if (/NaN|undefined/.test(svg)) fails.push(tag + ' 题图含 NaN');
    }
    /* 正确解必须判对 */
    var right = q.fields.map(function (f) { return f.type === 'choice' ? f.ans : f.ans; });
    if (!judge(q, right).ok) fails.push(tag + ' 正确解被判错');
    /* 错误解必须判错 */
    var wrong = q.fields.map(function (f) {
      if (f.type === 'choice') return (f.ans + 1) % f.options.length;
      if (f.type === 'drawline') {
        var g = armGeom(f.rodDeg, f.fDeg);
        return { x1: g.O.x, y1: g.O.y, x2: g.B.x, y2: g.B.y };   /* 连到作用点而非垂足：典型错误 */
      }
      if (f.tol != null) return f.ans + Math.abs(f.tol) * 2 + 1;
      var rel = Math.max(Math.abs(f.ans) * 1e-3, 1e-9);
      return f.ans + Math.max(1, rel * 2);
    });
    if (judge(q, wrong).ok) fails.push(tag + ' 错误解被判对');
    /* 科学计数法输入（答案较大时）必须判对 */
    q.fields.forEach(function (f, i) {
      if (f.type !== 'num' || Math.abs(f.ans) < 1e4) return;
      var v = [f.ans];
      var sci = f.ans.toExponential();
      var alt = q.fields.map(function (ff, j) { return j === i ? sci : (ff.type === 'choice' ? ff.ans : ff.ans); });
      if (!judge(q, alt).ok) fails.push(tag + ' 第 ' + (i + 1) + ' 空科学计数法被判错');
    });
  }

  function boundaryTests() {
    var fails = [], n = 0;
    function eq(desc, got, want) { n++; if (!(Math.abs(got - want) <= 1e-9)) fails.push(desc + '（得到 ' + got + '，应为 ' + want + '）'); }
    function nan(desc, v) { n++; if (!isNaN(v)) fails.push(desc + ' 应解析失败，却得到 ' + v); }
    eq('1428000', parseNum('1428000'), 1428000);
    eq('1.428e6', parseNum('1.428e6'), 1428000);
    eq('1.428E6', parseNum('1.428E6'), 1428000);
    eq('1.428×10^6', parseNum('1.428×10^6'), 1428000);
    eq('1.428x10^6', parseNum('1.428x10^6'), 1428000);
    eq('1.428*10^6', parseNum('1.428*10^6'), 1428000);
    eq('1.428×10⁶', parseNum('1.428×10⁶'), 1428000);
    eq('全角 1.428×10⁶', parseNum('１.４２８×１０⁶'), 1428000);
    eq('1 428 000', parseNum('1 428 000'), 1428000);
    eq('−1.428e6', parseNum('−1.428e6'), -1428000);
    eq('5×10⁻⁵', parseNum('5×10⁻⁵'), 5e-5);
    eq('21%', parseNum('21%'), 21);
    eq('30N', parseNum('30N'), 30);
    eq('0.4m', parseNum('0.4m'), 0.4);
    eq('1/2', parseNum('1/2'), 0.5);
    nan('abc', parseNum('abc'));
    nan('空', parseNum(''));
    var pf = { type: 'num', ans: 21, unit: '%', tol: 0.8 };
    n++; if (!judge({ fields: [pf] }, ['21']).ok) fails.push('百分比：21 应判对');
    n++; if (!judge({ fields: [pf] }, ['21%']).ok) fails.push('百分比：21% 应判对');
    n++; if (!judge({ fields: [pf] }, ['0.21']).ok) fails.push('百分比：0.21 应判对');
    n++; if (judge({ fields: [pf] }, ['23.6']).ok) fails.push('百分比：23.6 不应判对');
    var af = { type: 'num', ans: 100, tol: 1 };
    n++; if (!judge({ fields: [af] }, ['100.9']).ok) fails.push('绝对容差：100.9 应判对');
    n++; if (judge({ fields: [af] }, ['101.1']).ok) fails.push('绝对容差：101.1 不应判对');
    var rf = { type: 'num', ans: 1428000 };
    n++; if (!judge({ fields: [rf] }, ['1429000']).ok) fails.push('相对容差：1429000 应判对');
    n++; if (judge({ fields: [rf] }, ['1430000']).ok) fails.push('相对容差：1430000 不应判对');
    n++; if (fmtNum(1428000) !== '1.428×10⁶') fails.push('科学计数法显示：' + fmtNum(1428000));
    n++; if (fmtNum(5e-5) !== '5×10⁻⁵') fails.push('科学计数法显示：' + fmtNum(5e-5));
    return { n: n, fails: fails };
  }

  function selfTest(n) {
    n = n || 200;
    var fails = [], count = 0;
    MODULES.forEach(function (m) {
      var list;
      if (m.items) {
        list = m.items.map(function (it) { return { id: it.kind + ':' + it.id, fixed: it }; });
      } else {
        list = m.kinds.map(function (k) { return { id: k.id, gen: k.gen }; });
      }
      list.forEach(function (c) {
        for (var s = 1; s <= n; s++) {
          var q;
          try {
            q = c.fixed ? JSON.parse(JSON.stringify(c.fixed)) : c.gen(mulberry32(s * 7919 + 13));
          } catch (e) { fails.push(c.id + ' 生成异常: ' + e.message); continue; }
          count++;
          checkQuestion(q, m.id + '.' + c.id + '#' + s, fails);
        }
      });
    });
    var b = boundaryTests();
    b.fails.forEach(function (f) { fails.push('边界: ' + f); });
    return { count: count, fails: fails, cases: b.n };
  }

  return {
    VERSION: VERSION, DAY: DAY,
    modules: MODULES, moduleById: moduleById,
    gen: gen, judge: judge, ansText: ansText, svgFor: svgFor,
    kindPool: kindPool, kindSkel: kindSkel, sigOf: sigOf, skelOf: skelOf, enumerateKind: enumerateKind,
    parseNum: parseNum, fmtNum: fmtNum, near: near, relTol: relTol,
    selfTest: selfTest, drawItems: DRAW,
    armFocusQueue: armFocusQueue,
    armProbe: {
      geom: armGeom,
      rot: function (seg, O, rad) {
        var c = Math.cos(rad), s = Math.sin(rad);
        var dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
        return { x1: seg.x1, y1: seg.y1, x2: O.x + dx * c - dy * s, y2: O.y + dx * s + dy * c };
      }
    }
  };
})();
