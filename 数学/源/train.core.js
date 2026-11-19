/* =====================================================================
   数学闪练卡 · 纯逻辑层（不碰 DOM，可在 node 里单测）
   题库全部参数化生成：没有固定答案可背，题量无限。
   ===================================================================== */
var MT = (function () {
  'use strict';

  var VERSION = 1;
  var DAY = 86400000;

  /* ---------- 随机数：可复现（同一 seed 同一题，方便排错） ---------- */
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

  /* ---------- 数字与字符串 ---------- */
  /* 手写/输入法常输出的分数字符（½ ⅓ …），直接认 */
  var VULGAR = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅐': 1 / 7, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅑': 1 / 9, '⅒': 0.1 };
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function d(n) { return String(n).replace('-', '−'); }
  function frac(x) {
    if (!isFinite(x)) return '?';
    if (Number.isInteger(x)) return d(x);
    for (var den = 2; den <= 12; den++) {
      var num = x * den;
      if (Math.abs(num - Math.round(num)) < 1e-9) {
        var n = Math.round(num), g = gcd(n, den);
        return d(n / g) + '/' + (den / g);
      }
    }
    return d(Math.round(x * 1000) / 1000);
  }
  function nice(x, unit) { return frac(x) + (unit || ''); }
  /* π 的系数：k = 1 时写「π」，不写「1π」 */
  function piText(k) { return k === 1 ? 'π' : frac(k) + 'π'; }
  function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol || 1e-6); }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim()
      .replace(/[−－—–]/g, '-').replace(/[／]/g, '/').replace(/[，,]/g, '')
      .replace(/\s+/g, '').replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    if (!s) return NaN;
    var negv = false, tv = s;
    if (tv.charAt(0) === '-') { negv = true; tv = tv.slice(1); }
    if (VULGAR[tv] != null) return negv ? -VULGAR[tv] : VULGAR[tv];
    var mv = s.match(/^(-?\d+)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])$/);
    if (mv) return parseFloat(mv[1]) + (mv[1].charAt(0) === '-' ? -VULGAR[mv[2]] : VULGAR[mv[2]]);
    if (/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return parseFloat(s);
    var m = s.match(/^([-+]?\d+)\/([-+]?\d+)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    m = s.match(/^([-+]?\d+)\/([-+]?\d+)\s*$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    return NaN;
  }
  function poly2(a, b, c) {
    var s = a === 1 ? 'x²' : (a === -1 ? '−x²' : d(a) + 'x²');
    if (b) s += (b > 0 ? ' + ' : ' − ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x';
    if (c) s += (c > 0 ? ' + ' : ' − ') + Math.abs(c);
    return s;
  }
  function binom(h) { return h === 0 ? 'x' : (h > 0 ? '(x − ' + h + ')' : '(x + ' + (-h) + ')'); }
  function kterm(k) { return k === 0 ? '' : (k > 0 ? ' + ' + k : ' − ' + (-k)); }
  function leadCoef(a) { return a === 1 ? '' : (a === -1 ? '−' : d(a)); }

  /* ---------- 题生成器 ---------- */
  function genVertex(r) {
    var h = ri(r, -4, 4), k = ri(r, -4, 4);
    var a = pick(r, [-2, -1, -0.5, 0.5, 1, 2]);
    var dx = pick(r, [-2, -1, 1, 2]);
    var x0 = h + dx, y0 = k + a * dx * dx;
    var x1 = h + pick(r, [-3, -1, 1, 3]);
    var y1 = k + a * (x1 - h) * (x1 - h);
    var base = 'y = a' + binom(h) + '²' + kterm(k);
    return {
      id: 'write.vertex', kind: 'vertex', title: '顶点式求 a',
      prompt: '抛物线顶点为 (' + d(h) + ', ' + d(k) + ')，且经过点 (' + d(x0) + ', ' + d(y0) + ')。<br>' +
        '求它的解析式（用顶点式写）。',
      fields: [
        { type: 'expr', form: 'vertex', tpl: 'y = {}(x − {})² + {}', label: '写出完整解析式', ans: [a, h, k] },
        { type: 'num', label: '当 x = ' + d(x1) + ' 时，y =', ans: y1 }
      ],
      tip: '顶点式 y = a(x − h)² + k：h、k 就是顶点的横、纵坐标（h 带符号，顶点横坐标是 −2 就填 −2）；a 由代一个点定。',
      explain: [
        '设 ' + base + '，把 (' + d(x0) + ', ' + d(y0) + ') 代进去：' + d(y0) + ' = a·' + (dx * dx) + kterm(k) + '，得 a = ' + frac(a) + '。',
        '所以解析式是 ' + exprText('vertex', [a, h, k]) + '。',
        '再代 x = ' + d(x1) + '：y = ' + frac(a) + '·' + ((x1 - h) * (x1 - h)) + kterm(k) + ' = ' + frac(y1) + '。'
      ],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[h, k, '顶点'], [x0, y0, '已知点'], [x1, y1, 'x=' + x1]] },
      kp: ['二次函数', '待定系数法']
    };
  }

  /* 交点式：给两个 x 轴交点 + 一点。先判断用哪种形式（选择题），再写全式 */
  function genIntercept(r) {
    var x1 = pick(r, [-4, -3, -2, -1, 1, 2, 3, 4]);
    var x2 = x1 + pick(r, [-3, -2, -1, 1, 2, 3]);
    if (x2 === x1) x2 = x1 + 2;
    var a = pick(r, [-2, -1, -0.5, 0.5, 1, 2]);
    var x0 = pick(r, [-3, -2, -1, 1, 2, 3]);
    while (x0 === x1 || x0 === x2) x0++;
    var y0 = a * (x0 - x1) * (x0 - x2);
    var h = (x1 + x2) / 2, k = -a * (x2 - x1) * (x2 - x1) / 4;
    return {
      id: 'write.intercept', kind: 'intercept', title: '交点式写解析式',
      prompt: '抛物线与 x 轴交于 (' + d(x1) + ', 0)、(' + d(x2) + ', 0)，且经过点 (' + d(x0) + ', ' + d(y0) + ')。<br>' +
        '先选最省事的形式，再写出它的解析式。',
      fields: [
        (function () {
          /* 选项顺序打乱，避免「永远选 B」被背下来 */
          var opts = ['顶点式 y = a(x − h)² + k', '交点式 y = a(x − x₁)(x − x₂)', '一般式 y = ax² + bx + c'];
          var right = opts[1];
          for (var oi = opts.length - 1; oi > 0; oi--) { var oj = Math.floor(r() * (oi + 1)), tt = opts[oi]; opts[oi] = opts[oj]; opts[oj] = tt; }
          return { type: 'choice', label: '先设哪种形式？', options: opts, ans: opts.indexOf(right) };
        })(),
        { type: 'expr', form: 'intercept', tpl: 'y = {}(x − {})(x − {})', label: '写出完整解析式', ans: [a, x1, x2], free: [1, 2] }
      ],
      tip: '给了两个 x 轴交点 → 直接设 y = a(x − x₁)(x − x₂)，再代一个点求 a。用一般式要解三元方程组，最慢。',
      explain: [
        '两个交点是 (' + d(x1) + ', 0)、(' + d(x2) + ', 0)，所以设 y = a(x − ' + d(x1) + ')(x − ' + d(x2) + ')。',
        '代 (' + d(x0) + ', ' + d(y0) + ')：' + d(y0) + ' = a·(' + d(x0 - x1) + ')·(' + d(x0 - x2) + ')，得 a = ' + frac(a) + '。',
        '所以解析式是 ' + exprText('intercept', [a, x1, x2]) + '。'
      ],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[x1, 0, '交点'], [x2, 0, '交点'], [x0, y0, '已知点']] },
      kp: ['二次函数', '交点式', '待定系数法']
    };
  }
  function genInverse(r) {
    var x0 = pick(r, [-4, -3, -2, -1, 1, 2, 3, 4]);
    var y0 = pick(r, [-3, -2, -1, 1, 2, 3]);
    var k = x0 * y0;
    var ds = [-6, -4, -3, -2, -1, 1, 2, 3, 4, 6].filter(function (v) { return k % v === 0; });
    var x1 = pick(r, ds);
    return {
      id: 'write.inverse', kind: 'inverse', title: '反比例求 k',
      prompt: '反比例函数 y = k/x 的图象经过点 (' + d(x0) + ', ' + d(y0) + ')。',
      fields: [
        { type: 'num', label: 'k =', ans: k },
        { type: 'num', label: '当 x = ' + d(x1) + ' 时，y =', ans: k / x1 }
      ],
      tip: 'k = x·y，代一个点就出来；k 的符号决定图象在哪两个象限。',
      explain: [
        'k = ' + d(x0) + ' × ' + d(y0) + ' = ' + d(k) + '。',
        'y = k/x = ' + d(k) + ' ÷ (' + d(x1) + ') = ' + frac(k / x1) + '。'
      ],
      fig: { type: 'hyperbola', k: k, xr: [-6, 6], dots: [[x0, y0, '已知点'], [x1, k / x1, 'x=' + x1]] },
      kp: ['反比例函数', '待定系数法']
    };
  }

  function genProfit(r) {
    var cost = ri(r, 20, 60);
    var price = cost + ri(r, 10, 40);
    var n = ri(r, 20, 60);
    var dd = pick(r, [2, 4, 5]);
    var m = ri(r, 1, 4);
    var b = m / dd;
    var a = price - cost;
    /* 两个方向都要练：涨价（销量减少、售价有上限）与降价（销量增加、不能亏本） */
    var up = r() < 0.5;
    var step = ri(r, 1, 4);
    var x0 = dd * step;
    if (up) {
      var cap = Math.floor((n - 5) / b);                  /* 销量别被减成 0 或负数 */
      if (x0 > dd * Math.floor(cap / dd)) x0 = dd * Math.max(1, Math.floor(cap / dd));
      var Wup = (a + x0) * (n - b * x0);
      return {
        id: 'write.profit', kind: 'profit', title: '利润建模',
        prompt: '某店每件商品进价 ' + cost + ' 元、售价 ' + price + ' 元，每天可卖 ' + n + ' 件。<br>' +
          '每涨价 ' + dd + ' 元，每天就少卖 ' + m + ' 件。设每件涨价 x 元。',
        fields: [
          { type: 'num', label: '每件盈利 = a + x，a =', ans: a },
          { type: 'num', label: '每天销量 = ' + n + ' − b·x，b =', ans: b },
          { type: 'num', label: '涨价 ' + x0 + ' 元时，日盈利 W =', ans: Wup, unit: '元' }
        ],
        tip: '涨价 x 元 → 每件多赚 x 元；"每涨 d 元少卖 m 件" → 少卖 (m/d)·x 件，所以销量是减。',
        explain: [
          '每件盈利 = 售价 − 进价 + 涨价 = ' + a + ' + x，所以 a = ' + a + '。',
          '每涨 ' + dd + ' 元少卖 ' + m + ' 件，涨 x 元就少卖 (' + m + '/' + dd + ')x = ' + frac(b) + 'x，所以 b = ' + frac(b) + '。',
          'W = (' + a + ' + ' + x0 + ')(' + n + ' − ' + frac(b) + '×' + x0 + ') = ' + (a + x0) + ' × ' + (n - b * x0) + ' = ' + frac(Wup) + '（元）。'
        ],
        kp: ['二次函数', '建模', '利润']
      };
    }
    if (x0 >= a) x0 = dd * Math.max(1, Math.floor((a - 1) / dd));
    var W = (a - x0) * (n + b * x0);
    return {
      id: 'write.profit', kind: 'profit', title: '利润建模',
      prompt: '某店每件商品进价 ' + cost + ' 元、售价 ' + price + ' 元，每天可卖 ' + n + ' 件。<br>' +
        '每降价 ' + dd + ' 元，每天就能多卖 ' + m + ' 件。设每件降价 x 元。',
      fields: [
        { type: 'num', label: '每件盈利 = a − x，a =', ans: a },
        { type: 'num', label: '每天销量 = ' + n + ' + b·x，b =', ans: b },
        { type: 'num', label: '降价 ' + x0 + ' 元时，日盈利 W =', ans: W, unit: '元' }
      ],
      tip: '降价 x 元 → 每件少赚 x 元；"每降 d 元多卖 m 件" → 多卖 (m/d)·x 件。',
      explain: [
        '每件盈利 = 售价 − 进价 − 降价 = ' + a + ' − x，所以 a = ' + a + '。',
        '每降 ' + dd + ' 元多卖 ' + m + ' 件，降价 x 元就多卖 (' + m + '/' + dd + ')x = ' + frac(b) + 'x，所以 b = ' + frac(b) + '。',
        'W = (' + a + ' − ' + x0 + ')(' + n + ' + ' + frac(b) + '×' + x0 + ') = ' + (a - x0) + ' × ' + (n + b * x0) + ' = ' + frac(W) + '（元）。'
      ],
      kp: ['二次函数', '建模', '利润']
    };
  }

  /* 拱桥/隧道建模：顶点在 y 轴上 → 设 y = ax² + k（第 11 周周练卷 15(1) 就是这一型） */
  function genArch(r) {
    var b = pick(r, [5, 10, 20]);                    /* 水面半宽 */
    var ks = b === 20 ? [8, 10] : (b === 5 ? [2] : [4, 5]);   /* 拱高约为半宽的 1/3–1/2，别画成扁平拱 */
    var k = pick(r, ks);                             /* 拱顶距水面 */
    var a = -k / (b * b);
    var x1 = pick(r, [-6, -4, -3, 2, 3, 4, 6]);
    if (Math.abs(x1) >= b) x1 = Math.round(b / 2);
    var y1 = a * x1 * x1 + k;
    var opts = ['y = ax² + k（顶点在 y 轴上）', 'y = a(x − h)² + k（顶点不在 y 轴上）', 'y = ax² + bx + c（一般式）'];
    var right = opts[0];
    for (var oi = opts.length - 1; oi > 0; oi--) { var oj = Math.floor(r() * (oi + 1)), tt = opts[oi]; opts[oi] = opts[oj]; opts[oj] = tt; }
    return {
      id: 'write.arch', kind: 'arch', title: '拱桥建模',
      prompt: '一座抛物线形拱桥，水面宽 ' + (2 * b) + ' m，拱顶距水面 ' + k + ' m。<br>' +
        '以水面为 x 轴、拱顶所在竖直线为 y 轴建系，求抛物线的解析式。',
      fields: [
        { type: 'choice', label: '先设哪种形式最省事？', options: opts, ans: opts.indexOf(right) },
        { type: 'num', label: '解析式 y = ax² + k 中，a =（可填分数）', ans: a },
        { type: 'num', label: '离桥中心 ' + d(Math.abs(x1)) + ' m 处的拱高 =', ans: y1, unit: 'm' }
      ],
      tip: '顶点在 y 轴上 → 设 y = ax² + k，k 就是拱高；再把 (±半宽, 0) 代进去求 a。',
      explain: [
        '顶点在 y 轴上，设 y = ax² + k，拱顶 (' + 0 + ', ' + k + ') 给出 k = ' + k + '。',
        '水面宽 ' + (2 * b) + ' m → 抛物线过 (' + d(-b) + ', 0) 和 (' + d(b) + ', 0)：0 = a×' + (b * b) + ' + ' + k + '，所以 a = ' + frac(a) + '。',
        '解析式：y = ' + frac(a) + 'x² + ' + k + '。',
        '再代 x = ' + d(x1) + '：y = ' + frac(a) + '×' + (x1 * x1) + ' + ' + k + ' = ' + frac(y1) + '（m）。'
      ],
      fig: { type: 'parabola', a: a, h: 0, k: k, xr: [-b - 0.6, b + 0.6], dots: [[0, k, '拱顶'], [-b, 0, '水面'], [b, 0, '水面'], [x1, y1, 'x=' + d(x1)]] },
      kp: ['二次函数', '建模', '待定系数法']
    };
  }

  /* 对称轴 + 一点求一般式：b 由对称轴定，c 由代点定（第 11 周周练卷附加题 (1)） */
  function genAxis(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var h = ri(r, -3, 3);
    var x0 = h + pick(r, [-3, -2, -1, 1, 2, 3]);
    if (x0 > 5) x0 = h + 2;
    if (x0 < -5) x0 = h - 2;
    var c = ri(r, -4, 4);
    var b = -2 * a * h;
    var y0 = a * x0 * x0 + b * x0 + c;
    var k = c - a * h * h;
    var atxt = (a === 1 ? '' : (a === -1 ? '−' : d(a)));
    return {
      id: 'write.axis', kind: 'axis', title: '对称轴求一般式',
      prompt: '已知抛物线 y = ' + atxt + 'x² + bx + c 的对称轴是直线 x = ' + d(h) + '，且经过点 A(' + d(x0) + ', ' + d(y0) + ')。<br>' +
        '求 b 和 c。',
      fields: [
        { type: 'num', label: 'b =', ans: b },
        { type: 'num', label: 'c =', ans: c }
      ],
      tip: '对称轴 x = −b/(2a)：a 已知、轴已知 → 先定 b；再把 A 代进去定 c。',
      explain: [
        '对称轴 −b/(2a) = ' + d(h) + '，a = ' + d(a) + '，所以 b = −2a·h = −2×(' + d(a) + ')×' + d(h) + ' = ' + d(b) + '。',
        '把 A(' + d(x0) + ', ' + d(y0) + ') 代入 y = ' + atxt + 'x² + ' + d(b) + 'x + c：' + d(y0) + ' = ' + d(a * x0 * x0) + (b * x0 >= 0 ? ' + ' + d(b * x0) : ' − ' + d(-b * x0)) + ' + c，得 c = ' + d(c) + '。',
        '所以 y = ' + poly2(a, b, c) + '，顶点 (' + d(h) + ', ' + d(k) + ')。'
      ],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[h, k, '顶点'], [x0, y0, 'A']] },
      kp: ['二次函数', '待定系数法']
    };
  }

  function genSegment(r) {
    var k = pick(r, [-3, -2, -1, 1, 2, 3]);
    var b = ri(r, -4, 4);
    var x1 = ri(r, -4, 2), x2 = x1 + ri(r, 2, 4);
    var y1 = k * x1 + b, y2 = k * x2 + b;
    var x3 = ri(r, x1 + 1, x2 - 1);
    return {
      id: 'write.segment', kind: 'segment', title: '线段解析式',
      prompt: '某段图象是一条线段，经过点 (' + d(x1) + ', ' + d(y1) + ') 和 (' + d(x2) + ', ' + d(y2) + ')。',
      fields: [
        { type: 'expr', form: 'line', tpl: 'y = {}x + {}', label: '写出完整解析式', ans: [k, b] },
        { type: 'num', label: '当 x = ' + d(x3) + ' 时，y =', ans: k * x3 + b }
      ],
      tip: '两点求一次函数：k = 纵坐标差 ÷ 横坐标差，再代一个点求 b（b 是负数就带负号填）。',
      explain: [
        'k = (' + d(y2) + ' − ' + d(y1) + ') ÷ (' + d(x2) + ' − ' + d(x1) + ') = ' + d(k) + '。',
        '把 (' + d(x1) + ', ' + d(y1) + ') 代进 y = kx + b：' + d(y1) + ' = ' + d(k) + '×(' + d(x1) + ') + b，得 b = ' + d(b) + '。',
        '当 x = ' + d(x3) + ' 时，y = ' + d(k) + '×(' + d(x3) + ') ' + (b >= 0 ? '+ ' + b : '− ' + (-b)) + ' = ' + d(k * x3 + b) + '。'
      ],
      fig: { type: 'segment', x1: x1, y1: y1, x2: x2, y2: y2, dots: [[x1, y1, ''], [x2, y2, ''], [x3, k * x3 + b, 'x=' + x3]] },
      kp: ['一次函数', '待定系数法']
    };
  }

  function genPiece(r) {
    var t1 = ri(r, 4, 10);
    var y0 = ri(r, 10, 30);
    var k1 = ri(r, 2, 6);
    var y1 = y0 + k1 * t1;
    var k2 = t1 * y1;
    var cands = [];
    for (var xv = Math.ceil(t1); xv <= Math.floor(3 * t1); xv++) { if (k2 % xv === 0) cands.push(xv); }
    var xc = cands.length ? pick(r, cands) : t1;
    var c0 = k2 / xc;
    return {
      id: 'write.piece', kind: 'piece', title: '分段函数',
      prompt: '上课后，学生的注意力指标 y 随时间 x（分钟）变化：<br>' +
        '先沿直线上升，过 (0, ' + y0 + ') 和 (' + t1 + ', ' + y1 + ')；之后沿反比例曲线下降，过 (' + t1 + ', ' + y1 + ')。',
      fields: [
        { type: 'num', label: '上升段 y = kx + b 中，k =', ans: k1 },
        { type: 'num', label: 'b =', ans: y0 },
        { type: 'num', label: '下降段 y = k/x 中，k =', ans: k2 },
        { type: 'num', label: '下降段上 y = ' + c0 + ' 时，x =', ans: xc, unit: '分钟' }
      ],
      tip: '分段函数：每段各求各的；反比例段的 k 用段上的一个点定。',
      explain: [
        '上升段：k = (' + y1 + ' − ' + y0 + ') ÷ ' + t1 + ' = ' + k1 + '，b = ' + y0 + '（x=0 时的 y）。',
        '下降段过 (' + t1 + ', ' + y1 + ')：k = ' + t1 + ' × ' + y1 + ' = ' + k2 + '。',
        'y = ' + c0 + ' 时，x = k/y = ' + k2 + ' ÷ ' + c0 + ' = ' + xc + '。'
      ],
      fig: { type: 'piece', k1: k1, b1: y0, t1: t1, y1: y1, k2: k2, dots: [[0, y0, ''], [t1, y1, '转折'], [xc, c0, 'y=' + c0]] },
      kp: ['分段函数', '反比例函数', '建模']
    };
  }

  function genEq(r) {
    var p = ri(r, -6, 6), q = ri(r, -6, 6);
    var b = -(p + q), c = p * q;
    return {
      id: 'drill.eq', kind: 'eq', title: '解一元二次方程',
      prompt: '解方程：' + poly2(1, b, c) + ' = 0（两个根都填，顺序不限）',
      fields: [{ type: 'set', n: 2, label: '两个根', ans: [p, q] }],
      tip: '先看能不能因式分解：找两个数，和是 −b、积是 c。',
      explain: ['因式分解：' + poly2(1, b, c) + ' = (x ' + (p >= 0 ? '− ' + p : '+ ' + (-p)) + ')(x ' + (q >= 0 ? '− ' + q : '+ ' + (-q)) + ') = 0，',
        '所以 x₁ = ' + d(p) + '，x₂ = ' + d(q) + '。'],
      fig: { type: 'parabola', a: 1, h: (p + q) / 2, k: -Math.pow(p - q, 2) / 4, dots: [[p, 0, 'x₁'], [q, 0, 'x₂']] },
      kp: ['一元二次方程']
    };
  }

  /* 因式分解（十字相乘）：x² + bx + c = (x + p)(x + q)，p、q 顺序不限 */
  function genFactor(r) {
    var p = pick(r, [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    var q = pick(r, [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    if (p === q) q = -q;
    var b = p + q, c = p * q;
    return {
      id: 'drill.factor', kind: 'factor', title: '因式分解（十字相乘）',
      prompt: '把 ' + poly2(1, b, c) + ' 分解成 (x + p)(x + q) 的形式。',
      fields: [{ type: 'set', n: 2, label: 'p、q（顺序不限）', ans: [p, q], names: ['p', 'q'] }],
      tip: '找两个数：和为 ' + d(b) + '、积为 ' + d(c) + '。',
      explain: [
        '要找 p、q，使 p + q = ' + d(b) + '，p × q = ' + d(c) + '。',
        '试出 p = ' + d(p) + '，q = ' + d(q) + '，所以 ' + poly2(1, b, c) + ' = ' + binom(-p) + binom(-q) + '。'
      ],
      kp: ['一元二次方程', '因式分解']
    };
  }
  function genDisc(r) {
    var a = ri(r, 1, 3), b = ri(r, -8, 8), c = ri(r, -6, 6);
    var delta = b * b - 4 * a * c;
    var cnt = delta > 0 ? 2 : (delta === 0 ? 1 : 0);
    return {
      id: 'drill.disc', kind: 'disc', title: '判别式',
      prompt: '方程 ' + poly2(a, b, c) + ' = 0。',
      fields: [
        { type: 'num', label: 'Δ = b² − 4ac =', ans: delta },
        { type: 'num', label: '实数根的个数 =', ans: cnt }
      ],
      tip: 'Δ>0 两个不等实根；Δ=0 两个相等实根（算 1 个不同根）；Δ<0 没有实根。',
      explain: ['Δ = (' + d(b) + ')² − 4×' + a + '×(' + d(c) + ') = ' + d(delta) + '。',
        delta > 0 ? 'Δ > 0，有两个不相等的实数根。' : (delta === 0 ? 'Δ = 0，有两个相等的实数根。' : 'Δ < 0，没有实数根。')],
      fig: (function () {
        var dd = b * b - 4 * a * c;
        var dots = dd >= 0 ? [[(-b + Math.sqrt(dd)) / (2 * a), 0, '根'], [(-b - Math.sqrt(dd)) / (2 * a), 0, '根']] : [];
        return { type: 'parabola', a: a, h: -b / (2 * a), k: c - b * b / (4 * a), dots: dots };
      })(),
      kp: ['一元二次方程', '判别式']
    };
  }

  function genVieta(r) {
    var p = ri(r, -6, 6), q = ri(r, -6, 6);
    var b = -(p + q), c = p * q;
    return {
      id: 'drill.vieta', kind: 'vieta', title: '韦达定理',
      prompt: '设 x₁、x₂ 是方程 ' + poly2(1, b, c) + ' = 0 的两个根。',
      fields: [
        { type: 'num', label: 'x₁ + x₂ =', ans: p + q },
        { type: 'num', label: 'x₁·x₂ =', ans: c }
      ],
      tip: 'x₁ + x₂ = −b/a，x₁·x₂ = c/a。',
      explain: ['a = 1，b = ' + d(b) + '，c = ' + d(c) + '。',
        'x₁ + x₂ = −b/a = ' + d(p + q) + '；x₁·x₂ = c/a = ' + d(c) + '。'],
      kp: ['一元二次方程', '韦达定理']
    };
  }

  /* 配方法 / 直接开平方（知识图谱 25.2 的 220–222）：现有「解一元二次方程」只练因式分解，
     这里补另外两条解法：形如 (x − p)² = q 直接开平方；一般式 x² + bx + c 配方成 (x + h)² = k。 */
  function genComplete(r) {
    if (r() < 0.4) {
      var p = ri(r, -5, 5);
      if (p === 0) p = pick(r, [-3, -2, 2, 3]);   /* (x − 0)² 读起来别扭，避开 p = 0 */
      var t = ri(r, 2, 7), q = t * t;
      var x1 = p + t, x2 = p - t;
      return {
        id: 'drill.complete', kind: 'complete', title: '配方法 / 直接开平方',
        prompt: '解方程：(' + (p >= 0 ? 'x − ' + p : 'x + ' + (-p)) + ')² = ' + q + '（两个根都填，顺序不限）',
        fields: [{ type: 'set', n: 2, label: '两个根', ans: [x1, x2], names: ['x₁', 'x₂'] }],
        tip: '直接开平方：两边同时开平方时别漏负号，(x − p) = ±√q，得到两个根。',
        explain: ['两边开平方：' + (p >= 0 ? 'x − ' + p : 'x + ' + (-p)) + ' = ±' + t + '。',
          '所以 x₁ = ' + d(x1) + '，x₂ = ' + d(x2) + '。',
          '坑：开平方只写正根，漏掉负根；一元二次方程应该有两个根（相等时算两个相同根）。'],
        kp: ['一元二次方程', '直接开平方法']
      };
    }
    var h = ri(r, 1, 6), m = ri(r, 0, 5);
    var c = h * h - m * m;
    if (c === 0) c = -(h * h);                 /* 避免 c = 0 让方程变成 x² + bx = 0 的特殊形 */
    var b = 2 * h, k = h * h - c;
    return {
      id: 'drill.complete', kind: 'complete', title: '配方法 / 直接开平方',
      prompt: '把方程 ' + poly2(1, b, c) + ' = 0 配方成 (x + h)² = k 的形式，求 h 和 k。',
      fields: [
        { type: 'num', label: 'h =', ans: h },
        { type: 'num', label: 'k =', ans: k }
      ],
      tip: '配方：x² + bx 配上 (b/2)²，凑成完全平方；右边 = (b/2)² − c。',
      explain: [poly2(1, b, c) + ' = 0 ⟹ x² + ' + b + 'x = ' + d(-c) + '。',
        '两边加 (b/2)² = ' + h + '² = ' + (h * h) + '：x² + ' + b + 'x + ' + (h * h) + ' = ' + d(-c) + ' + ' + (h * h) + ' = ' + d(k) + '。',
        '左边写成完全平方：(x + ' + h + ')² = ' + d(k) + '，所以 h = ' + h + '，k = ' + d(k) + '。'],
      kp: ['一元二次方程', '配方法']
    };
  }

  function genVertexProp(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var h = ri(r, -4, 4), k = ri(r, -6, 6);
    var b = -2 * a * h, c = k + a * h * h;
    return {
      id: 'drill.vertex', kind: 'vertexprop', title: '二次函数顶点',
      prompt: '二次函数 y = ' + poly2(a, b, c) + '。',
      fields: [
        { type: 'num', label: '顶点横坐标 =', ans: h },
        { type: 'num', label: '顶点纵坐标 =', ans: k }
      ],
      tip: '配方成 y = a(x − h)² + k，或直接用 h = −b/(2a)。',
      explain: ['h = −b/(2a) = −(' + d(b) + ')/(2×' + a + ') = ' + d(h) + '。',
        'k = 把 x = ' + d(h) + ' 代回：y = ' + d(k) + '。'],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[h, k, '顶点']] },
      kp: ['二次函数', '顶点']
    };
  }

  function genSym(r) {
    var x = ri(r, -5, 5), y = ri(r, -5, 5);
    return {
      id: 'drill.sym', kind: 'sym', title: '中心对称点',
      prompt: '点 P(' + d(x) + ', ' + d(y) + ') 关于原点中心对称的点是 P′。',
      fields: [
        { type: 'num', label: 'P′ 的横坐标 =', ans: -x },
        { type: 'num', label: 'P′ 的纵坐标 =', ans: -y }
      ],
      tip: '关于原点对称：横纵坐标都变号。关于 x 轴对称只变 y，关于 y 轴对称只变 x。',
      explain: ['关于原点对称：(x, y) → (−x, −y)，所以 P′(' + d(-x) + ', ' + d(-y) + ')。'],
      fig: { type: 'points', dots: [[x, y, 'P'], [-x, -y, 'P′']] },
      kp: ['图形的变换', '中心对称']
    };
  }

  function genInvProp(r) {
    var k = pick(r, [-12, -8, -6, -4, -3, -2, 2, 3, 4, 6, 8, 12]);
    var cand = [-4, -3, -2, -1, 1, 2, 3, 4].filter(function (x) { return k % x === 0; });
    var x0 = pick(r, cand), y0 = k / x0;
    var variant = ri(r, 0, 2);
    if (variant === 0) {
      var pos = k > 0;
      return {
        id: 'drill.invprop', kind: 'invprop', title: '反比例·象限',
        prompt: '反比例函数 y = k/x 的图象经过点 (' + d(x0) + ', ' + d(y0) + ')。它的图象在哪两个象限？',
        fields: [{ type: 'choice', label: '', ans: pos ? 0 : 1, options: ['第一、三象限', '第二、四象限'] }],
        tip: 'k > 0 在一、三象限；k < 0 在二、四象限。',
        explain: ['k = ' + d(x0) + ' × ' + d(y0) + ' = ' + d(k) + (pos ? ' > 0' : ' < 0') + '，', pos ? '所以图象在第一、三象限。' : '所以图象在第二、四象限。'],
        fig: { type: 'hyperbola', k: k, xr: [-6, 6], dots: [[x0, y0, '已知点']] },
        kp: ['反比例函数']
      };
    }
    if (variant === 1) {
      var neg = cand.filter(function (x) { return x < 0; }), pos2 = cand.filter(function (x) { return x > 0; });
      var br = (neg.length >= 2 && r() < 0.5) ? neg : (pos2.length >= 2 ? pos2 : neg);
      br.sort(function (a, b) { return a - b; });
      var x1 = br[0], x2 = br[br.length - 1];
      var y1 = k / x1, y2 = k / x2;
      return {
        id: 'drill.invprop', kind: 'invprop', title: '反比例·比大小',
        prompt: '点 A(' + d(x1) + ', y₁)、B(' + d(x2) + ', y₂) 都在反比例函数 y = k/x（k = ' + d(k) + '）的图象上，且在同一支上。比较 y₁ 和 y₂。',
        fields: [{ type: 'choice', label: '', ans: k > 0 ? 0 : 1, options: ['y₁ > y₂', 'y₁ < y₂', 'y₁ = y₂', '不能确定'] }],
        tip: '同一支上：k > 0 时 y 随 x 增大而减小；k < 0 时 y 随 x 增大而增大。',
        explain: ['x₁ = ' + d(x1) + ' < x₂ = ' + d(x2) + '，' + (k > 0 ? 'k > 0，同一支上 y 随 x 增大而减小，所以 y₁ > y₂。' : 'k < 0，同一支上 y 随 x 增大而增大，所以 y₁ < y₂。')],
        fig: { type: 'hyperbola', k: k, xr: [-6, 6], dots: [[x1, y1, 'A'], [x2, y2, 'B']] },
        kp: ['反比例函数', '增减性']
      };
    }
    var kn = -pick(r, [2, 3, 4, 6, 8]);
    return {
      id: 'drill.invprop', kind: 'invprop', title: '反比例·定符号',
      prompt: '若反比例函数 y = k/x 的图象在第二、四象限，则 k 的取值是？',
      fields: [{ type: 'choice', label: '', ans: 1, options: ['k > 0', 'k < 0', 'k = 0'] }],
      tip: '图象在二、四象限 ⟺ k < 0。',
      explain: ['图象在第二、四象限，说明 k < 0。'],
      fig: { type: 'hyperbola', k: kn, xr: [-6, 6], dots: [] },
      kp: ['反比例函数']
    };
  }

  function genInvArea(r) {
    var k = pick(r, [2, 4, 6, 8, 12, -2, -4, -6, -8, -12]);
    var xs = [1, 2, 3, 4, 6].filter(function (x) { return k % x === 0; });
    var x0 = pick(r, xs), y0 = k / x0;
    var tri = r() < 0.5;
    return {
      id: 'drill.invarea', kind: 'invarea', title: '反比例·面积',
      prompt: '点 P(' + d(x0) + ', ' + d(y0) + ') 在反比例函数 y = k/x 的图象上。' +
        (tri ? 'PA ⊥ x 轴于点 A，求 △OAP 的面积。' : '过 P 作两坐标轴的垂线，求与坐标轴围成的矩形面积。'),
      fields: [{ type: 'num', label: '面积 =', ans: tri ? Math.abs(k) / 2 : Math.abs(k) }],
      tip: '|k| 的几何意义：矩形面积 = |k|，△OAP 面积 = |k|/2。',
      explain: ['k = ' + d(x0) + ' × ' + d(y0) + ' = ' + d(k) + '，|k| = ' + Math.abs(k) + '。',
        tri ? '△OAP 的面积 = |k|/2 = ' + frac(Math.abs(k) / 2) + '。' : '矩形面积 = |k| = ' + Math.abs(k) + '。'],
      fig: { type: 'hyperbola', k: k, xr: [-6, 6], dots: [[x0, y0, 'P'], [x0, 0, 'A']], dashes: [[[x0, 0], [x0, y0]], [[0, y0], [x0, y0]]] },
      kp: ['反比例函数', 'k 的几何意义']
    };
  }

  function genRot(r) {
    var x = 0, y = 0;
    while (x === 0 && y === 0) { x = ri(r, -4, 4); y = ri(r, -4, 4); }
    var ang = pick(r, [90, 90, 180]);
    var ccw = r() < 0.5;
    var x2, y2, dir;
    if (ang === 180) { x2 = -x; y2 = -y; dir = '180°'; }
    else if (ccw) { x2 = -y; y2 = x; dir = '逆时针 90°'; }
    else { x2 = y; y2 = -x; dir = '顺时针 90°'; }
    return {
      id: 'drill.rot', kind: 'rot', title: '旋转后坐标',
      prompt: '点 P(' + d(x) + ', ' + d(y) + ') 绕原点 O ' + dir + ' 后得到 P′。求 P′ 的坐标。',
      fields: [{ type: 'num', label: 'P′ 的横坐标 =', ans: x2 }, { type: 'num', label: 'P′ 的纵坐标 =', ans: y2 }],
      tip: '逆时针 90°：(x, y) → (−y, x)；顺时针 90°：(x, y) → (y, −x)；180°：(x, y) → (−x, −y)。',
      explain: ['按旋转规律：' + dir + '，(' + d(x) + ', ' + d(y) + ') → (' + d(x2) + ', ' + d(y2) + ')。'],
      fig: { type: 'points', rays: true, dots: [[x, y, 'P'], [x2, y2, 'P′']] },
      kp: ['图形的变换', '旋转']
    };
  }

  var SHAPES = {
    both: ['圆', '正方形', '矩形', '菱形', '正六边形', '线段'],
    axis: ['等边三角形', '等腰三角形', '正五边形', '角'],
    center: ['平行四边形'],
    none: ['一般三角形', '直角三角形']
  };
  var SHAPE_FACT = {
    '圆': '任意一条直径所在直线都是对称轴；绕圆心旋转 180° 与自身重合。',
    '正方形': '4 条对称轴；绕对角线交点旋转 180° 重合。',
    '矩形': '2 条对称轴；绕对角线交点旋转 180° 重合。',
    '菱形': '2 条对称轴（两条对角线）；绕对角线交点旋转 180° 重合。',
    '正六边形': '6 条对称轴；绕中心旋转 180° 重合。',
    '线段': '中垂线和它本身所在直线是对称轴；绕中点旋转 180° 重合。',
    '等边三角形': '3 条对称轴；旋转 180° 不能与自身重合。',
    '等腰三角形': '1 条对称轴（底边中垂线）；旋转 180° 不能重合。',
    '正五边形': '5 条对称轴；旋转 180° 不能重合。',
    '角': '角平分线所在直线是对称轴；旋转 180° 不能重合。',
    '平行四边形': '没有对称轴；绕对角线交点旋转 180° 与自身重合。',
    '一般三角形': '既没有对称轴，也不能旋转 180° 重合。',
    '直角三角形': '既没有对称轴，也不能旋转 180° 重合。'
  };
  function genSymShape(r) {
    var v = ri(r, 0, 2);
    var ans, prompt, distract;
    if (v === 0) {
      ans = pick(r, SHAPES.both);
      prompt = '下列图形中，既是轴对称图形又是中心对称图形的是（　）';
      distract = SHAPES.axis.concat(SHAPES.center, SHAPES.none);
    } else if (v === 1) {
      ans = pick(r, SHAPES.axis);
      prompt = '下列图形中，是轴对称图形但不是中心对称图形的是（　）';
      distract = SHAPES.both.concat(SHAPES.center, SHAPES.none);
    } else {
      ans = pick(r, SHAPES.center);
      prompt = '下列图形中，是中心对称图形但不是轴对称图形的是（　）';
      distract = SHAPES.both.concat(SHAPES.axis, SHAPES.none);
    }
    var opts = [ans], guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      var c = pick(r, distract);
      if (opts.indexOf(c) < 0) opts.push(c);
    }
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    return {
      id: 'drill.symshape', kind: 'symshape', title: '对称图形判断',
      prompt: prompt,
      fields: [{ type: 'choice', label: '', ans: opts.indexOf(ans), options: opts }],
      tip: '轴对称：能沿一条直线对折重合；中心对称：绕一点旋转 180° 能重合。',
      explain: [ans + '：' + (SHAPE_FACT[ans] || '')],
      kp: ['图形的变换', '轴对称与中心对称']
    };
  }

  function genCoef(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var b = pick(r, [-3, -2, -1, 0, 1, 2, 3]);
    var c = pick(r, [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
    var h = -b / (2 * a);
    var k = c - b * b / (4 * a);
    var v = ri(r, 0, 2);
    var fields, prompt, explain;
    if (v === 0) {
      var side = b === 0 ? 2 : (h < 0 ? 0 : 1);
      prompt = '抛物线 y = ' + poly2(a, b, c) + ' 的对称轴在 y 轴的（　）';
      fields = [{ type: 'choice', label: '', ans: side, options: ['左侧', '右侧', '就是 y 轴'] }];
      explain = ['对称轴 x = −b/(2a) = ' + frac(h) + '，' + (side === 2 ? '所以对称轴就是 y 轴。' : side === 0 ? '是负数，所以在 y 轴左侧。' : '是正数，所以在 y 轴右侧。')];
    } else if (v === 1) {
      var pos = c > 0 ? 0 : (c < 0 ? 1 : 2);
      prompt = '抛物线 y = ' + poly2(a, b, c) + ' 与 y 轴的交点在（　）';
      fields = [{ type: 'choice', label: '', ans: pos, options: ['正半轴', '负半轴', '原点'] }];
      explain = ['令 x = 0，得 y = ' + d(c) + '，' + (pos === 0 ? '所以交点在 y 轴正半轴。' : pos === 1 ? '所以交点在 y 轴负半轴。' : '所以交点就是原点。')];
    } else {
      var up = a > 0;
      prompt = '抛物线 y = ' + poly2(a, b, c) + ' 的开口方向是（　）';
      fields = [{ type: 'choice', label: '', ans: up ? 0 : 1, options: ['向上', '向下'] }];
      explain = ['a = ' + d(a) + (up ? ' > 0，所以开口向上。' : ' < 0，所以开口向下。')];
    }
    return {
      id: 'drill.coef', kind: 'coef', title: '二次函数系数',
      prompt: prompt,
      fields: fields,
      tip: '开口看 a；与 y 轴交点看 c；对称轴 x = −b/(2a)（a、b 同号在左，异号在右）。',
      explain: explain,
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[0, c, 'y 轴交点'], [h, k, '顶点']] },
      kp: ['二次函数', '系数与图象']
    };
  }

  function genPlug(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var b = pick(r, [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
    var c = pick(r, [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
    var x0 = pick(r, [-3, -2, -1, 1, 2, 3]);
    var y0 = a * x0 * x0 + b * x0 + c;
    return {
      id: 'drill.plug', kind: 'plug', title: '二次函数代值',
      prompt: '二次函数 y = ' + poly2(a, b, c) + ' 的图象经过点 (' + d(x0) + ', t)，求 t。',
      fields: [{ type: 'num', label: 't =', ans: y0 }],
      tip: '点在图象上 → 把点的坐标代进解析式。',
      explain: ['把 x = ' + d(x0) + ' 代入 y = ' + poly2(a, b, c) + '：t = ' + d(y0) + '。'],
      fig: { type: 'parabola', a: a, h: -b / (2 * a), k: c - b * b / (4 * a), dots: [[x0, y0, '该点']] },
      kp: ['二次函数', '代入求值']
    };
  }

  function genEqDef(r) {
    var a = pick(r, [1, 2, 3]), b = ri(r, -5, 5), c = ri(r, -6, 6);
    var correct = poly2(a, b, c) + ' = 0';
    var pool = ['2x = 7', 'x² + 1 = 1/x', 'y = x² + x − 5', 'x³ + x = 0', 'x + 1/x = 3', '3x − 1 = 0'];
    var opts = [correct], guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      var p = pick(r, pool);
      if (opts.indexOf(p) < 0) opts.push(p);
    }
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    return {
      id: 'drill.eqdef', kind: 'eqdef', title: '一元二次方程识别',
      prompt: '下列方程中，是关于 x 的一元二次方程的是（　）',
      fields: [{ type: 'choice', label: '', ans: opts.indexOf(correct), options: opts }],
      tip: '一元二次方程：只含一个未知数、整式方程、未知数最高次是 2（a ≠ 0）。',
      explain: [correct + '：只含 x、是整式、最高次 2，符合定义。其他选项分别是一次、分式、三次或含两个未知数。'],
      kp: ['一元二次方程', '定义']
    };
  }

  function genPath(r) {
    var x1 = ri(r, -4, 1);
    var x2 = x1 + pick(r, [2, 3, 4]);
    var y1 = pick(r, [1, 2, 3]), y2 = pick(r, [1, 2, 3]);
    var px = (x1 * y2 + x2 * y1) / (y1 + y2);
    var guard = 0;
    while (!Number.isInteger(px) && guard++ < 60) {
      y1 = pick(r, [1, 2, 3]); y2 = pick(r, [1, 2, 3]);
      px = (x1 * y2 + x2 * y1) / (y1 + y2);
    }
    if (!Number.isInteger(px)) { y2 = y1; px = (x1 + x2) / 2; }
    return {
      id: 'drill.path', kind: 'path', title: '最短路径',
      prompt: '点 A(' + d(x1) + ', ' + d(y1) + ')、B(' + d(x2) + ', ' + d(y2) + ') 在 x 轴同侧，P 是 x 轴上的动点。当 AP + BP 最小时，P 的横坐标是多少？',
      fields: [{ type: 'num', label: 'P 的横坐标 =', ans: px }],
      tip: '作 A 关于 x 轴的对称点 A′，AP + BP 最小 ⟺ A′、P、B 三点共线。',
      explain: ['作 A 关于 x 轴的对称点 A′(' + d(x1) + ', ' + d(-y1) + ')。',
        'AP + BP 最小 ⟺ A′、P、B 共线，直线 A′B 与 x 轴的交点横坐标 = ' + frac(px) + '。'],
      fig: {
        type: 'points', dots: [[x1, y1, 'A'], [x2, y2, 'B'], [px, 0, 'P'], [x1, -y1, 'A′']],
        dashes: [[[x1, y1], [px, 0]], [[x2, y2], [px, 0]], [[x1, y1], [x1, -y1]]]
      },
      kp: ['图形的变换', '最短路径']
    };
  }

  /* ---------- 圆与二次函数的「基础考点」（取自第 11 周周练卷 11.11 的选择 1/3/6/10 与填空 9/12、解答 13） ----------
     这些题只考一条定义或一条公式，正好补「概念记混」这一档：点与圆的位置关系、
     弦/弧/直径、直角三角形外接圆、反证法第一步、顶点式最值、平移、闭区间最值。 */
  /* 每条判断都带一句「为什么对/为什么错」，解析里只讲这道题真正出现的四句话 */
  var CIRCLE_RIGHT = [
    { s: '直径是弦，弦不一定是直径', why: '直径过圆心，当然属于弦；弦不一定过圆心，所以不一定是直径' },
    { s: '圆中最长的弦是直径', why: '任何弦 ≤ 直径（2r），等号只在弦过圆心时成立' },
    { s: '过圆心的弦是直径', why: '这就是直径的定义（还要两端都在圆上，弦本身就满足）' },
    { s: '半圆是弧', why: '直径把圆分成两段弧，每段就叫半圆' },
    { s: '不在同一直线上的三点确定一个圆', why: '两边的中垂线交于唯一一点，那个点就是圆心' },
    { s: '同圆或等圆的半径相等', why: '同一个圆里所有半径都等于 r；等圆半径也相等' },
    { s: '弦的两端都在圆上', why: '弦的定义：圆上任意两点间的线段' },
    { s: '等弧的长度相等', why: '等弧能完全重合，长度自然相等（反过来不成立）' },
    { s: '直径所对的圆周角是直角', why: '直径的两端和圆上任一点构成直角三角形，斜边是直径' },
    { s: '半圆所对的圆周角是 90°', why: '就是「直径所对的圆周角是直角」，半圆的两端连起来就是直径' },
    { s: '圆内接四边形的对角互补', why: '一组对角所对的两段弧合起来是整个圆，两角和 = 360° ÷ 2 = 180°' }
  ];
  var CIRCLE_WRONG = [
    { s: '弧是半圆，半圆是弧', why: '半圆是弧，但弧不一定是半圆——还有优弧、劣弧' },
    { s: '长度相等的弧是等弧', why: '等弧要求「能完全重合」，只在同圆或等圆中才谈；长度相等不够' },
    { s: '圆的任意一条弦都等于直径的一半', why: '弦长最大才是直径，一般弦比直径短，不是等于半径' },
    { s: '过圆心的线段是直径', why: '直径要求两端都在圆上，光过圆心不够' },
    { s: '半圆是弧，所以弧都是半圆', why: '前半句对、后半句错，弧还有优弧和劣弧' },
    { s: '三点确定一个圆', why: '要「不在同一直线上」的三点才确定一个圆' },
    { s: '弦是直径', why: '弦不一定过圆心，所以不一定是直径' },
    { s: '直径是圆中最短的弦', why: '反了：直径是最长的弦' },
    { s: '同圆中，弦越长，它到圆心的距离越大', why: '反了：弦越长离圆心越近，直径（最长）到圆心距离为 0' },
    { s: '圆上任意两点间的线段叫弧', why: '两点间的线段叫弦，两点间的「部分」才叫弧' },
    { s: '圆内接四边形的邻角互补', why: '互补的是对角（∠A + ∠C、∠B + ∠D），邻角不一定；这是最常见的记混' },
    { s: '圆内接四边形的对角相等', why: '对角是互补（和 180°），不是相等；只有矩形这种特殊情况才相等' },
    { s: '同一条弦所对的圆周角都相等', why: '要「同弧」所对的圆周角才相等；弦的两侧所对的圆周角互补' },
    { s: '直径所对的圆周角是 180°', why: '是 90°：直径当斜边，直角在圆上那一点' }
  ];
  var ABSURD_CASES = [
    { concl: '一个三角形中不能有两个角是直角', ans: '三角形中有两个角是直角',
      bad: ['三角形中三个角都是直角', '三角形中没有直角', '三角形中只有一个直角'] },
    { concl: '在一个三角形中，至少有一个内角小于或等于 60°', ans: '三角形的三个内角都大于 60°',
      bad: ['三角形的三个内角都小于 60°', '三角形中有一个内角大于 60°', '三角形的三个内角都等于 60°'] },
    { concl: '若 a ≠ 0，则一元二次方程 ax² + bx + c = 0 至多有两个实数根', ans: '方程有三个或更多个实数根',
      bad: ['方程没有实数根', '方程恰好有两个实数根', '方程只有一个实数根'] },
    { concl: '两条直线被第三条直线所截，若同位角相等，则两直线平行', ans: '两直线不平行（相交）',
      bad: ['两直线平行', '同位角不相等', '两直线重合'] },
    { concl: '若 x² + y² = 0，则 x = y = 0', ans: 'x、y 不全为 0',
      bad: ['x = y = 0', 'x、y 都不为 0', 'x = 0 且 y ≠ 0'] },
    { concl: '一个数不是正数就是负数', ans: '一个数既不是正数也不是负数',
      bad: ['一个数是正数', '一个数是负数', '一个数既是正数又是负数'] }
  ];
  var RIGHT_TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17],
    [7, 24, 25], [12, 16, 20], [20, 21, 29], [9, 40, 41], [10, 24, 26]];

  function shuffle(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* 点与圆的位置关系：d 和 r 比大小 */
  function genPtCirc(r) {
    var rad = ri(r, 2, 9);
    var kind = ri(r, 0, 2);                 /* 0 圆内 / 1 圆上 / 2 圆外 */
    var dist = kind === 0 ? Math.max(1, rad - ri(r, 1, rad - 1))
      : (kind === 1 ? rad : rad + ri(r, 1, 5));
    var word = ['在 ⊙O 内', '在 ⊙O 上', '在 ⊙O 外'][kind];
    var cmp = kind === 0 ? 'd < r' : (kind === 1 ? 'd = r' : 'd > r');
    return {
      id: 'drill.ptcirc', kind: 'ptcirc', title: '点与圆的位置关系',
      prompt: '⊙O 的半径为 ' + rad + '，点 P 到圆心 O 的距离为 ' + dist + '，则点 P（　）',
      fields: [{ type: 'choice', label: '', ans: kind, options: ['在 ⊙O 内', '在 ⊙O 上', '在 ⊙O 外'] }],
      tip: '只比一个量：点到圆心的距离 d 与半径 r。d 小在内、d 大在外、相等在圆上。',
      explain: ['d = ' + dist + '，r = ' + rad + '，所以 ' + cmp + '，点 P ' + word + '。',
        '注意：比的是半径 r，不是直径 2r = ' + (2 * rad) + '。'],
      kp: ['圆的基本性质', '点与圆的位置关系']
    };
  }

  /* 圆的基本概念：一句话判断对错 */
  function genCircleDef(r) {
    var right = pick(r, CIRCLE_RIGHT);
    var picked = [right], guard = 0;
    while (picked.length < 4 && guard++ < 100) {
      var w = pick(r, CIRCLE_WRONG);
      if (picked.indexOf(w) < 0) picked.push(w);
    }
    var opts = shuffle(r, picked.map(function (o) { return o.s; }));
    return {
      id: 'drill.circledef', kind: 'circledef', title: '圆的基本概念',
      prompt: '下列说法中，正确的是（　）',
      fields: [{ type: 'choice', label: '', ans: opts.indexOf(right.s), options: opts }],
      tip: '逐条卡定义：弦要「两端在圆上」，直径要「再过圆心」，等弧要「能完全重合」，三点定圆要「不共线」。',
      explain: [right.s + '：对，' + right.why + '。'].concat(
        picked.slice(1).map(function (w) { return w.s + '：错，' + w.why + '。'; })),
      kp: ['圆的基本性质', '弦·弧·直径']
    };
  }

  /* 直角三角形外接圆：斜边就是直径 */
  function genCircum(r) {
    var t = pick(r, RIGHT_TRI);
    var swap = r() < 0.5;
    var a = swap ? t[1] : t[0], b = swap ? t[0] : t[1], c = t[2];
    return {
      id: 'drill.circum', kind: 'circum', title: '直角三角形外接圆',
      prompt: '直角三角形的两条直角边分别是 ' + a + ' 和 ' + b + '，它的斜边和外接圆半径分别是多少？',
      fields: [
        { type: 'num', label: '斜边 =', ans: c },
        { type: 'num', label: '外接圆半径 =', ans: c / 2 }
      ],
      tip: '直角三角形的外接圆以斜边为直径 ⟹ 半径 = 斜边 ÷ 2。',
      explain: ['斜边 = √(' + a + '² + ' + b + '²) = √' + (a * a + b * b) + ' = ' + c + '。',
        '90° 的圆周角对着直径，所以斜边就是外接圆的直径，半径 = ' + c + ' ÷ 2 = ' + frac(c / 2) + '。',
        '坑：把两条直角边的平均数当半径，或者把斜边直接当半径。'],
      kp: ['圆的基本性质', '三角形外接圆']
    };
  }

  /* ---------- 圆的「三条辅助线 + 两个易忘推论」专项（2026-11-14 老师反馈） ----------
     老师原话：①连半径得等腰 ②见弦作弦心距 + 连半径用垂径 ③见直径得 90° 圆周角；
     两个推论容易忘：直径得 90° 圆周角、圆内接四边形对角互补。
     这里的每一题都强制带一个「依据」选择：孩子漏结论，是因为下笔时不写依据——
     先选依据、再算值，把「漏写」变成「选错就判错」。 */
  var CIRCLE_BASIS = {
    radius: 'OA = OB（同圆半径相等），等边对等角',
    perp: '垂直于弦的直径平分这条弦（垂径定理）',
    diam: '直径所对的圆周角是直角',
    cyc: '圆内接四边形对角互补',
    arc: '同弧所对的圆周角等于圆心角的一半',
    tan: '圆的切线垂直于过切点的半径'
  };
  /* 每个考点的干扰项单独列：只放「明显不是这条依据」的，
     别放「能推出它的上位定理」（把「圆周角＝圆心角一半」当 90° 的错项，学生有理由争）。 */
  var CIRCLE_BASIS_BAD = {
    radius: ['同弧所对的圆周角等于圆心角的一半', '直径所对的圆周角是直角', '圆内接四边形对角互补', '垂直于弦的直径平分这条弦（垂径定理）'],
    perp: ['同弧所对的圆周角等于圆心角的一半', '直径所对的圆周角是直角', '圆内接四边形对角互补', '等腰三角形的两底角相等'],
    diam: ['圆内接四边形对角互补', '等腰三角形的两底角相等', '垂直于弦的直径平分这条弦（垂径定理）', '等弧所对的弦相等'],
    cyc: ['圆内接四边形邻角互补（∠A + ∠B = 180°）', '圆内接四边形的对角相等', '直径所对的圆周角是直角', '垂直于弦的直径平分这条弦（垂径定理）'],
    arc: ['同弧所对的圆周角是圆心角的两倍', '直径所对的圆周角是直角', '圆内接四边形对角互补', '同圆中半径相等，等边对等角'],
    tan: ['直径所对的圆周角是直角', '同弧所对的圆周角等于圆心角的一半', '圆内接四边形对角互补', '等腰三角形的两底角相等']
  };
  /* 依据选择：正确项 + 3 个干扰项，位置随机 */
  function basisField(r, key, label) {
    var right = CIRCLE_BASIS[key];
    var bad = CIRCLE_BASIS_BAD[key];
    var picked = [right], guard = 0;
    while (picked.length < 4 && guard++ < 60) {
      var w = pick(r, bad);
      if (picked.indexOf(w) < 0) picked.push(w);
    }
    var opts = shuffle(r, picked);
    return { type: 'choice', label: label || '依据', ans: opts.indexOf(right), options: opts };
  }

  /* ① 连半径得等腰：同圆的两条半径相等 ⟹ 等腰 ⟹ 两底角相等 */
  function genRadiusIso(r) {
    var theta = 2 * ri(r, 20, 60);        /* 圆心角取偶数，底角一定是整数 */
    var half = (180 - theta) / 2;
    var askTheta = r() < 0.4;             /* 四成的题反过来：给底角求圆心角 */
    return {
      id: 'drill.radiusiso', kind: 'radiusiso', title: '连半径得等腰',
      prompt: askTheta
        ? '⊙O 中，A、B 在圆上，∠OAB = ' + half + '°。<br><span class="muted small">先连半径，再求圆心角 ∠AOB。</span>'
        : '⊙O 中，A、B 在圆上，∠AOB = ' + theta + '°。<br><span class="muted small">连半径 OA、OB 后，∠OAB 是多少？</span>',
      fields: [
        basisField(r, 'radius', '依据'),
        { type: 'num', label: askTheta ? '∠AOB =' : '∠OAB =', ans: askTheta ? theta : half, unit: '°' }
      ],
      tip: '圆里见到两条半径，先写「OA = OB」：同圆半径相等 ⟹ △OAB 是等腰三角形 ⟹ 两个底角相等，再接三角形内角和。',
      explain: ['OA = OB（同圆半径相等）⟹ △OAB 是等腰三角形，∠OAB = ∠OBA。',
        askTheta
          ? '∠OAB = ∠OBA = ' + half + '°，所以 ∠AOB = 180° − 2×' + half + '° = ' + theta + '°。'
          : '∠OAB = (180° − ' + theta + '°) ÷ 2 = ' + half + '°。',
        '「连半径」这条辅助线唯一的作用：把「半径相等」变成「等腰三角形」，后面的角和线段才有地方接。'],
      kp: ['圆的基本性质', '连半径得等腰']
    };
  }

  /* ② 见弦作弦心距 + 连半径，用垂径定理：弦长、弦心距、半径三者知二求一 */
  var CHORD_TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]];
  function genPerpChord(r) {
    var t = pick(r, CHORD_TRI);           /* [半弦, 弦心距, 半径]，已经满足勾股 */
    var half = t[0], dist = t[1], rad = t[2];
    var ask = ri(r, 0, 2);                /* 0 求半径 / 1 求弦长 / 2 求弦心距 */
    var prompt, label, ans, chain;
    if (ask === 0) {
      prompt = '⊙O 的弦 AB = ' + (2 * half) + '，圆心 O 到 AB 的距离 OM = ' + dist + '。求 ⊙O 的半径。';
      label = '半径 OA ='; ans = rad;
      chain = 'OA = √(' + dist + '² + ' + half + '²) = √' + (rad * rad) + ' = ' + rad + '。';
    } else if (ask === 1) {
      prompt = '⊙O 的半径是 ' + rad + '，圆心 O 到弦 AB 的距离 OM = ' + dist + '。求弦 AB 的长。';
      label = 'AB ='; ans = 2 * half;
      chain = 'AM = √(' + rad + '² − ' + dist + '²) = √' + (half * half) + ' = ' + half + '，AB = 2AM = ' + (2 * half) + '。';
    } else {
      prompt = '⊙O 的半径是 ' + rad + '，弦 AB = ' + (2 * half) + '。求圆心 O 到 AB 的距离。';
      label = 'OM ='; ans = dist;
      chain = 'AM = ½AB = ' + half + '，OM = √(' + rad + '² − ' + half + '²) = √' + (dist * dist) + ' = ' + dist + '。';
    }
    return {
      id: 'drill.perpchord', kind: 'perpchord', title: '垂径定理',
      prompt: prompt,
      fields: [basisField(r, 'perp', '依据'), { type: 'num', label: label, ans: ans }],
      tip: '见弦 → 先作弦心距 OM ⊥ AB，再连 OA：垂径定理给 AM = ½AB，勾股给 OA² = OM² + AM²。',
      explain: ['OM ⊥ AB ⟹ AM = MB = ½AB（垂径定理），连 OA 得到 Rt△OAM。',
        chain,
        '套路：弦长、弦心距、半径三个量，知二求一；漏了「连半径」就没有直角三角形，漏了「弦心距」就没有直角。'],
      kp: ['圆的基本性质', '垂径定理']
    };
  }

  /* ③ 见直径得 90° 圆周角：AB 是直径 ⟹ ∠ACB = 90°，再算另一个锐角 */
  function genDiam90(r) {
    var a = ri(r, 25, 65);
    var b = 90 - a;
    return {
      id: 'drill.diam90', kind: 'diam90', title: '直径所对圆周角',
      prompt: 'AB 是 ⊙O 的直径，点 C 在 ⊙O 上，∠CAB = ' + a + '°。<br><span class="muted small">先由「AB 是直径」得 ∠ACB，再求 ∠ABC。</span>',
      fields: [
        basisField(r, 'diam', '∠ACB = 90° 的依据'),
        { type: 'num', label: '∠ACB =', ans: 90, unit: '°' },
        { type: 'num', label: '∠ABC =', ans: b, unit: '°' }
      ],
      tip: '见直径，先在图上标一个 90°：直径所对的圆周角是直角。再在直角三角形里用两锐角互余。',
      explain: ['AB 是直径，点 C 在圆上 ⟹ ∠ACB = 90°（直径所对的圆周角是直角）。',
        'Rt△ABC 中两锐角互余：∠ABC = 90° − ' + a + '° = ' + b + '°。',
        '坑：一看到圆就去算圆周角＝圆心角的一半，忘了直径这个 90° 是免费的。'],
      kp: ['圆的基本性质', '直径所对的圆周角']
    };
  }

  /* ④ 圆内接四边形对角互补：∠A + ∠C = 180°，∠B + ∠D = 180°（不是邻角互补） */
  function genCycQuad(r) {
    var A = ri(r, 45, 135), B = ri(r, 45, 135);
    return {
      id: 'drill.cycquad', kind: 'cycquad', title: '圆内接四边形',
      prompt: '四边形 ABCD 内接于 ⊙O，∠A = ' + A + '°，∠B = ' + B + '°。<br><span class="muted small">求 ∠C 和 ∠D。</span>',
      fields: [
        basisField(r, 'cyc', '依据'),
        { type: 'num', label: '∠C =', ans: 180 - A, unit: '°' },
        { type: 'num', label: '∠D =', ans: 180 - B, unit: '°' }
      ],
      tip: '圆内接四边形：对角互补（∠A + ∠C = 180°，∠B + ∠D = 180°），不是邻角互补。',
      explain: ['四边形 ABCD 内接于 ⊙O ⟹ 对角互补：∠A + ∠C = 180°，∠B + ∠D = 180°。',
        '∠C = 180° − ' + A + '° = ' + (180 - A) + '°；∠D = 180° − ' + B + '° = ' + (180 - B) + '°。',
        '坑：记成「邻角互补」就会拿 ∠A + ∠B 去凑 180°；对角是隔着一条对角线的那两个角。'],
      kp: ['圆的基本性质', '圆内接四边形']
    };
  }

  /* ---------- 25.3 / 26.3 / 29.2–30.3 的缺项（2026-11-19 按知识图谱补） ----------
     知识图谱（做题思维训练/知识图谱_诊断知识漏洞）九上第 25–30 章对照：
     原有题型只覆盖 29.1–29.2 的概念、垂径、直径所对圆周角、圆内接四边形。
     下面按「一条公式 / 一条判定」拆成题型，每个都带公式的来历和一条易错点。 */

  /* 弧长：l = n/360 × 2πr = nπr/180。答案问「kπ 里的 k」，先算占周角的几分之几。 */
  var ARC_PAIRS = [[30, 6], [30, 12], [45, 4], [45, 8], [45, 12], [60, 3], [60, 6], [60, 9], [60, 12],
    [90, 2], [90, 4], [90, 6], [90, 8], [90, 10], [90, 12], [120, 3], [120, 6], [120, 9], [120, 12],
    [135, 4], [135, 8], [135, 12], [150, 6], [150, 12], [180, 2], [180, 3], [180, 5], [180, 8], [180, 12],
    [270, 2], [270, 4], [270, 6], [270, 8], [270, 10]];
  function genArcLen(r) {
    var p = pick(r, ARC_PAIRS), n = p[0], rad = p[1];
    var k = n * rad / 180;
    var askN = r() < 0.4;                 /* 四成反过来：给弧长求圆心角 */
    return {
      id: 'drill.arclen', kind: 'arclen', title: '弧长',
      prompt: askN
        ? '一条弧的长为 ' + piText(k) + '，所在圆的半径为 ' + rad + '。这条弧所对的圆心角是多少度？'
        : '半径为 ' + rad + ' 的圆中，圆心角为 ' + n + '° 的弧长为 kπ。求 k。',
      fields: [{ type: 'num', label: askN ? '圆心角 =' : 'k =', ans: askN ? n : k, unit: askN ? '°' : '' }],
      tip: '弧长 = 圆心角占 360° 的几分之几 × 圆周长：l = n/360 × 2πr = nπr/180。分母是 180，不是 360。',
      explain: askN
        ? ['弧长公式：l = nπr/180，反过来 n = 180l/(πr)。',
          n + '° 由 ' + piText(k) + ' = nπ × ' + rad + '/180 解出：n = ' + frac(k) + ' × 180 ÷ ' + rad + ' = ' + n + '。',
          '核对：n = ' + n + '° 是周角的 ' + frac(n / 360) + '，圆周长 2πr = ' + 2 * rad + 'π，弧长 = ' + frac(n / 360) + ' × ' + 2 * rad + 'π = ' + piText(k) + '。']
        : ['弧长公式：l = n/360 × 2πr = nπr/180。',
          'l = ' + n + '/360 × 2π × ' + rad + ' = ' + piText(k) + '，所以 k = ' + frac(k) + '。',
          '核对：n = ' + n + '° 是周角的 ' + frac(n / 360) + '，圆周长 2πr = ' + 2 * rad + 'π，乘起来就是 ' + piText(k) + '。'],
      kp: ['圆的基本性质', '弧长']
    };
  }

  /* 扇形面积：S = n/360 × πr² = nπr²/360；已知弧长时 S = ½lr（两个公式互推）。 */
  var SECTOR_PAIRS = [[30, 6], [30, 12], [45, 4], [45, 8], [45, 12], [60, 6], [60, 12],
    [90, 2], [90, 4], [90, 6], [90, 8], [90, 10], [90, 12], [120, 3], [120, 6], [120, 9], [120, 12],
    [135, 4], [135, 8], [180, 2], [180, 4], [180, 6], [180, 8], [180, 10], [180, 12],
    [270, 2], [270, 4], [270, 6], [270, 8]];
  function genSector(r) {
    var p = pick(r, SECTOR_PAIRS), n = p[0], rad = p[1];
    var k = n * rad * rad / 360;
    var lk = n * rad / 180;               /* 弧长 = lk π；只有整除时才出「给弧长求面积」 */
    var variant = ri(r, 0, 2);
    if (variant === 2 && !Number.isInteger(lk)) variant = 0;
    var prompt, label, ans, unit, chain, check;
    if (variant === 0) {
      prompt = '半径为 ' + rad + '、圆心角为 ' + n + '° 的扇形面积为 kπ。求 k。';
      label = 'k ='; ans = k; unit = '';
      chain = 'S = ' + n + '/360 × π × ' + rad + '² = ' + frac(k) + 'π。';
      check = '对照：同样半径的整个圆面积是 ' + (rad * rad) + 'π，扇形占其中的 ' + frac(n / 360) + '。';
    } else if (variant === 1) {
      prompt = '一个扇形的面积为 ' + piText(k) + '，半径为 ' + rad + '。它的圆心角是多少度？';
      label = '圆心角 ='; ans = n; unit = '°';
      chain = piText(k) + ' = nπ × ' + rad + '²/360 ⟹ n = ' + frac(k) + ' × 360 ÷ ' + (rad * rad) + ' = ' + n + '。';
      check = '核对：n = ' + n + '° 是周角的 ' + frac(n / 360) + '，圆面积 ' + (rad * rad) + 'π，乘起来是 ' + piText(k) + '。';
    } else {
      prompt = '一个扇形的弧长为 ' + piText(lk) + '，半径为 ' + rad + '。它的面积为 kπ，求 k。';
      label = 'k ='; ans = k; unit = '';
      chain = 'S = ½ × 弧长 × 半径 = ½ × ' + piText(lk) + ' × ' + rad + ' = ' + piText(k) + '。';
      check = '也可以先求圆心角：n = ' + frac(lk) + ' × 180 ÷ ' + rad + ' = ' + n + '°，再代 S = nπr²/360，结果相同。';
    }
    return {
      id: 'drill.sector', kind: 'sector', title: '扇形面积',
      prompt: prompt,
      fields: [{ type: 'num', label: label, ans: ans, unit: unit }],
      tip: '扇形面积 = 圆心角占 360° 的几分之几 × 圆面积：S = nπr²/360；已知弧长时用 S = ½lr 更快。',
      explain: ['公式：S = n/360 × πr² = nπr²/360；由 l = nπr/180 可得 S = ½lr。', chain, check],
      kp: ['圆的基本性质', '扇形面积']
    };
  }

  /* 圆锥：侧面展开图是扇形——扇形半径 = 母线 l，扇形弧长 = 底面周长 2πr。
     S侧 = πrl，S全 = πr(l+r)，展开图圆心角 θ = 360r/l。 */
  var CONE_PAIRS = [[2, 6], [2, 8], [3, 4], [3, 5], [3, 6], [4, 6], [4, 8], [5, 6], [5, 10], [5, 12],
    [6, 8], [6, 10], [8, 10], [9, 12], [10, 12], [12, 15]];
  function genCone(r) {
    var p = pick(r, CONE_PAIRS), r0 = p[0], l0 = p[1];
    var variant = ri(r, 0, 2);
    if (variant === 2 && (360 * r0) % l0 !== 0) variant = r() < 0.5 ? 0 : 1;
    if (variant === 1) {
      var tri = pick(r, RIGHT_TRI);
      var rr = tri[0], hh = tri[1], ll = tri[2];
      return {
        id: 'drill.cone', kind: 'cone', title: '圆锥的侧面积',
        prompt: '圆锥的底面半径为 ' + rr + '，高为 ' + hh + '。求它的母线长，以及侧面积 kπ 里的 k。',
        fields: [
          { type: 'num', label: '母线 l =', ans: ll },
          { type: 'num', label: '侧面积 k =', ans: rr * ll }
        ],
        tip: '母线、底面半径、高构成直角三角形：l² = r² + h²；侧面积 S侧 = πrl（l 是母线，不是高）。',
        explain: ['在轴截面里，母线 l、底面半径 r、高 h 构成直角三角形：l = √(r² + h²)。',
          'l = √(' + rr + '² + ' + hh + '²) = ' + ll + '。',
          'S侧 = πrl = π × ' + rr + ' × ' + ll + ' = ' + (rr * ll) + 'π，所以 k = ' + (rr * ll) + '。'],
        kp: ['圆的基本性质', '圆锥的侧面积']
      };
    }
    if (variant === 2) {
      var theta = 360 * r0 / l0;
      return {
        id: 'drill.cone', kind: 'cone', title: '圆锥的侧面积',
        prompt: '把底面半径为 ' + r0 + '、母线长为 ' + l0 + ' 的圆锥侧面展开，得到一个扇形。求这个扇形的圆心角，以及它的弧长 kπ 里的 k。',
        fields: [
          { type: 'num', label: '圆心角 =', ans: theta, unit: '°' },
          { type: 'num', label: '弧长 k =', ans: 2 * r0 }
        ],
        tip: '侧面展开图的扇形：半径 = 母线 l，弧长 = 底面周长 2πr；圆心角 θ = 360r/l。',
        explain: ['展开后扇形的半径就是母线 l = ' + l0 + '，弧长就是底面圆的周长 2πr = ' + 2 * r0 + 'π，所以 k = ' + 2 * r0 + '。',
          '由弧长公式 ' + 2 * r0 + 'π = θπ × ' + l0 + '/180，得 θ = 360 × ' + r0 + ' ÷ ' + l0 + ' = ' + theta + '°。',
          '记住关系式：θ/360 = r/l（弧长占展开圆的比 = 底面半径占母线的比）。'],
        kp: ['圆的基本性质', '圆锥的侧面积']
      };
    }
    var sSide = r0 * l0, sAll = r0 * (l0 + r0);
    return {
      id: 'drill.cone', kind: 'cone', title: '圆锥的侧面积',
      prompt: '圆锥的底面半径为 ' + r0 + '，母线长为 ' + l0 + '。它的侧面积和全面积分别为 kπ、mπ，求 k 和 m。',
      fields: [
        { type: 'num', label: '侧面积 k =', ans: sSide },
        { type: 'num', label: '全面积 m =', ans: sAll }
      ],
      tip: 'S侧 = πrl（扇形面积），S全 = S侧 + 底面积 πr² = πr(l + r)。别把「全面积」漏掉底面。',
      explain: ['侧面积是展开扇形的面积：S侧 = πrl = π × ' + r0 + ' × ' + l0 + ' = ' + sSide + 'π。',
        '底面积 = πr² = ' + (r0 * r0) + 'π，所以 S全 = ' + sSide + 'π + ' + (r0 * r0) + 'π = ' + sAll + 'π。',
        '所以 k = ' + sSide + '，m = ' + sAll + '。'],
      kp: ['圆的基本性质', '圆锥的侧面积']
    };
  }

  /* 圆周角定理：同弧所对的圆周角 = 圆心角的一半；同弧的圆周角相等；
     同弦两侧的圆周角互补（它们所对的圆心角合起来 360°）。 */
  function genCircAngle(r) {
    var alpha = ri(r, 20, 80), theta = 2 * alpha;
    var variant = ri(r, 0, 3);
    var fields, prompt, explain, tip;
    if (variant === 0) {
      prompt = 'AB 是 ⊙O 的弦，点 C 在优弧 AB 上，圆心角 ∠AOB = ' + theta + '°。求圆周角 ∠ACB。';
      fields = [basisField(r, 'arc', '依据'), { type: 'num', label: '∠ACB =', ans: alpha, unit: '°' }];
      explain = ['∠AOB 与 ∠ACB 对着同一段弧 AB，同弧所对的圆周角 = 圆心角的一半。',
        '∠ACB = ½ × ' + theta + '° = ' + alpha + '°。',
        '坑：圆心角换成圆周角要除以 2，反过来才乘 2；题目问哪个角先圈出来。'];
      tip = '同弧：先找圆心角和圆周角是否对着同一段弧，再决定 ÷2 还是 ×2。';
    } else if (variant === 1) {
      prompt = '点 C 在 ⊙O 的优弧 AB 上，∠ACB = ' + alpha + '°。求圆心角 ∠AOB。';
      fields = [basisField(r, 'arc', '依据'), { type: 'num', label: '∠AOB =', ans: theta, unit: '°' }];
      explain = ['∠ACB 是圆周角，∠AOB 是它同弧所对的圆心角，圆周角 = 圆心角的一半。',
        '∠AOB = 2 × ' + alpha + '° = ' + theta + '°。',
        '坑：反过来求圆心角要乘 2，别也除以 2。'];
      tip = '已知圆周角求圆心角：×2；已知圆心角求圆周角：÷2。先写「同弧」再动笔。';
    } else if (variant === 2) {
      prompt = '点 C、D 都在 ⊙O 的优弧 AB 上，∠ACB = ' + alpha + '°。求 ∠ADB 和圆心角 ∠AOB。';
      fields = [basisField(r, 'arc', '依据'),
        { type: 'num', label: '∠ADB =', ans: alpha, unit: '°' },
        { type: 'num', label: '∠AOB =', ans: theta, unit: '°' }];
      explain = ['∠ACB 与 ∠ADB 对着同一段弧 AB，同弧所对的圆周角相等：∠ADB = ∠ACB = ' + alpha + '°。',
        '圆心角 = 圆周角 × 2：∠AOB = 2 × ' + alpha + '° = ' + theta + '°。',
        '这两个结论都要求「同弧」，而且点 C、D 要在同一侧的弧上（都在优弧）。'];
      tip = '同弧的两个圆周角相等；但它们对应的圆心角只有一个，别把 ∠AOB 也算成 ' + alpha + '°。';
    } else {
      prompt = '弦 AB 把 ⊙O 分成两段弧，点 C 在优弧 AB 上、点 D 在劣弧 AB 上，∠ACB = ' + alpha + '°。求 ∠ADB。';
      fields = [basisField(r, 'cyc', '依据'), { type: 'num', label: '∠ADB =', ans: 180 - alpha, unit: '°' }];
      explain = ['A、C、B、D 四点都在 ⊙O 上，顺次连成圆内接四边形 ACBD，对角互补。',
        '∠ACB + ∠ADB = 180°，所以 ∠ADB = 180° − ' + alpha + '° = ' + (180 - alpha) + '°。',
        '换个看法：C、D 在弦 AB 两侧，两个圆周角所对的圆心角合起来是 360°，各自一半加起来就是 180°。'];
      tip = '同弦两侧的圆周角互补（和 180°），不是相等；「同弧」才相等。';
    }
    return {
      id: 'drill.circangle', kind: 'circangle', title: '圆周角定理',
      prompt: prompt, fields: fields, tip: tip, explain: explain,
      kp: ['圆的基本性质', '圆周角定理']
    };
  }

  /* 弧、弦、圆心角：同圆或等圆中，圆心角相等 ⟺ 弧相等 ⟺ 弦相等（任一条成立，另两条也成立）。 */
  var ARC_CHORD_RIGHT = [
    { s: '在同圆或等圆中，相等的圆心角所对的弦相等', why: '圆心角相等 ⟹ 弧相等 ⟹ 弦相等，这是「三量相等」定理的一半' },
    { s: '在同圆中，等弧所对的圆心角相等', why: '等弧能完全重合，所对的圆心角自然相等' },
    { s: '在同圆中，相等的弦所对的劣弧相等', why: '圆心角、弦、劣弧三者一一对应，等弦可得等劣弧' }
  ];
  var ARC_CHORD_WRONG = [
    { s: '相等的圆心角所对的弧相等', why: '缺「在同圆或等圆中」这个前提；两个不同大小的圆里，相等的圆心角所对的弧长不一样' },
    { s: '相等的弦所对的弧相等', why: '一条弦对着两条弧（优弧、劣弧）；而且不同圆里的等弦也不保证弧相等' },
    { s: '长度相等的两条弧是等弧', why: '等弧要求能完全重合，半径不同时长度相等的弧并不重合' },
    { s: '圆心角越大，所对的弦一定越长', why: '离开「同圆或等圆」就不成立；缺前提的命题不能算对' }
  ];
  function genArcChord(r) {
    var variant = ri(r, 0, 2);
    if (variant === 0) {
      var n = pick(r, [40, 50, 60, 72, 80, 100]), ab = ri(r, 3, 12);
      return {
        id: 'drill.arcchord', kind: 'arcchord', title: '弧、弦、圆心角',
        prompt: '⊙O 中，∠AOB = ∠COD = ' + n + '°，弦 AB = ' + ab + '。求弦 CD。',
        fields: [{ type: 'num', label: 'CD =', ans: ab }],
        tip: '同圆中圆心角相等 ⟹ 所对的弦相等；看到「∠AOB = ∠COD」先写这条，再找弦。',
        explain: ['∠AOB = ∠COD，且在同一圆中，所以两段弧相等、两条弦相等。',
          'CD = AB = ' + ab + '。',
          '注意前提：必须「在同圆或等圆中」；不同圆里相等的圆心角所对的弦不一定相等。'],
        kp: ['圆的基本性质', '弧、弦、圆心角']
      };
    }
    if (variant === 1) {
      var m = pick(r, [2, 3, 4, 5, 7, 8, 11]);
      var minor = 360 / (m + 1), major = 360 - minor;
      return {
        id: 'drill.arcchord', kind: 'arcchord', title: '弧、弦、圆心角',
        prompt: '⊙O 的一条弦把圆周分成 1 : ' + m + ' 两段弧。求劣弧与优弧所对的圆心角。',
        fields: [
          { type: 'num', label: '劣弧圆心角 =', ans: minor, unit: '°' },
          { type: 'num', label: '优弧圆心角 =', ans: major, unit: '°' }
        ],
        tip: '两段弧的度数比 = 所对圆心角的比；两段弧合起来是整个圆 360°。',
        explain: ['两条弧一共 360°，比是 1 : ' + m + '，总份数 ' + (m + 1) + ' 份。',
          '劣弧圆心角 = 360° ÷ ' + (m + 1) + ' = ' + minor + '°，优弧圆心角 = ' + major + '°。',
          '核对：' + minor + '° + ' + major + '° = 360°。'],
        kp: ['圆的基本性质', '弧、弦、圆心角']
      };
    }
    var right = pick(r, ARC_CHORD_RIGHT);
    var picked = [right.s], guard = 0;
    while (picked.length < 4 && guard++ < 80) {
      var w = pick(r, ARC_CHORD_WRONG).s;
      if (picked.indexOf(w) < 0) picked.push(w);
    }
    var opts = shuffle(r, picked);
    return {
      id: 'drill.arcchord', kind: 'arcchord', title: '弧、弦、圆心角',
      prompt: '下列说法中，正确的是（　）',
      fields: [{ type: 'choice', label: '', ans: opts.indexOf(right.s), options: opts }],
      tip: '「圆心角、弧、弦三量相等」的共同前提是「在同圆或等圆中」；缺前提的命题一律当错。',
      explain: [right.s + '：对，' + right.why + '。'].concat(
        picked.slice(1).map(function (s) {
          var item = ARC_CHORD_WRONG.filter(function (x) { return x.s === s; })[0];
          return s + '：错，' + (item ? item.why : '缺少同圆或等圆的前提') + '。';
        })),
      kp: ['圆的基本性质', '弧、弦、圆心角']
    };
  }

  /* 直线与圆的位置关系：d < r 相交（2 个公共点）、d = r 相切（1 个）、d > r 相离（0 个）。 */
  function genLineCircle(r) {
    var rad = ri(r, 2, 10);
    var kind = ri(r, 0, 2);
    var dist = kind === 0 ? Math.max(1, rad - ri(r, 1, 4)) : (kind === 1 ? rad : rad + ri(r, 1, 4));
    var word = ['相交', '相切', '相离'][kind];
    var points = [2, 1, 0][kind];
    if (r() < 0.65) {
      return {
        id: 'drill.linecircle', kind: 'linecircle', title: '直线与圆的位置关系',
        prompt: '⊙O 的半径为 ' + rad + '，圆心 O 到直线 l 的距离 d = ' + dist + '。判断 l 与 ⊙O 的位置关系，并写出公共点个数。',
        fields: [
          { type: 'choice', label: '位置关系', ans: kind, options: ['相交', '相切', '相离'] },
          { type: 'num', label: '公共点个数 =', ans: points }
        ],
        tip: '只比 d 和 r：d < r 相交、d = r 相切、d > r 相离；公共点个数跟着是 2 / 1 / 0。',
        explain: ['d = ' + dist + '，r = ' + rad + '，所以 d ' + (kind === 0 ? '<' : kind === 1 ? '=' : '>') + ' r。',
          '直线与圆' + word + '，公共点有 ' + points + ' 个。',
          '坑：把 d 和直径 2r = ' + (2 * rad) + ' 比；要比半径 r。'],
        kp: ['直线与圆', '位置关系']
      };
    }
    return {
      id: 'drill.linecircle', kind: 'linecircle', title: '直线与圆的位置关系',
      prompt: '⊙O 的半径为 ' + rad + '，直线 l 与 ⊙O 相切。求圆心 O 到 l 的距离 d。',
      fields: [{ type: 'num', label: 'd =', ans: rad }],
      tip: '相切 ⟺ d = r：切线到圆心的距离等于半径。',
      explain: ['直线与圆相切 ⟺ 圆心到直线的距离 d = r。', '所以 d = ' + rad + '。',
        '这条等价关系也是「作垂直、证半径」判定切线的依据。'],
      kp: ['直线与圆', '位置关系']
    };
  }

  /* 切线的性质：切线垂直于过切点的半径；连 OA 得 Rt△，再用勾股/互余。 */
  function genTanProp(r) {
    var tri = pick(r, RIGHT_TRI);
    var rad = tri[0], pa = tri[1], op = tri[2];
    if (r() < 0.35) {
      var beta = ri(r, 20, 70);
      return {
        id: 'drill.tanprop', kind: 'tanprop', title: '切线的性质',
        prompt: 'PA 切 ⊙O 于点 A，∠AOP = ' + beta + '°。求 ∠P。',
        fields: [basisField(r, 'tan', '∠OAP = 90° 的依据'), { type: 'num', label: '∠P =', ans: 90 - beta, unit: '°' }],
        tip: '切线 ⟹ 半径 OA ⊥ PA，∠OAP = 90°；再在 Rt△OAP 里用两锐角互余。',
        explain: ['PA 是切线，A 是切点，所以 OA ⊥ PA，∠OAP = 90°。',
          'Rt△OAP 中两锐角互余：∠P = 90° − ' + beta + '° = ' + (90 - beta) + '°。',
          '坑：把 ∠AOP 当成 ∠P；∠AOP 是圆心处的角，∠P 在圆外。'],
        kp: ['直线与圆', '切线的性质']
      };
    }
    return {
      id: 'drill.tanprop', kind: 'tanprop', title: '切线的性质',
      prompt: 'PA 切 ⊙O 于点 A，OA = ' + rad + '，PA = ' + pa + '。求 OP。',
      fields: [basisField(r, 'tan', '∠OAP = 90° 的依据'), { type: 'num', label: 'OP =', ans: op }],
      tip: '切线 ⟹ OA ⊥ PA；把 OA、PA、OP 放进 Rt△OAP，用勾股定理。',
      explain: ['PA 切 ⊙O 于 A ⟹ OA ⊥ PA，∠OAP = 90°。',
        'OP = √(OA² + PA²) = √(' + rad + '² + ' + pa + '²) = √' + (op * op) + ' = ' + op + '。',
        '坑：把 OP 当直角边；直角在切点 A，OP 一定是斜边。'],
      kp: ['直线与圆', '切线的性质']
    };
  }

  /* 切线的判定：经过半径外端且垂直于这条半径的直线是切线。
     给三边满足勾股 ⟹ 角是 90° ⟹ 垂直 ⟹ 切线；没给公共点时用「作垂直、证 d = r」。 */
  function genTanJudge(r) {
    var tri = pick(r, RIGHT_TRI);
    var rad = tri[0], ab = tri[1], ob = tri[2];
    var rightOpt = 'OA² + AB² = OB² ⟹ ∠OAB = 90°，AB 过半径外端 A 且垂直于 OA';
    var opts = shuffle(r, [rightOpt, 'OB 是 ⊙O 的直径', 'AB = OA，△OAB 是等边三角形', '∠AOB = 90°']);
    var relOpts = shuffle(r, ['相交', '相切', '相离']);
    return {
      id: 'drill.tanjudge', kind: 'tanjudge', title: '切线的判定',
      prompt: 'OA 是 ⊙O 的半径，OA = ' + rad + '，AB = ' + ab + '，OB = ' + ob + '。判断直线 AB 与 ⊙O 的位置关系，并选出判定的依据。',
      fields: [
        { type: 'choice', label: '位置关系', ans: relOpts.indexOf('相切'), options: relOpts },
        { type: 'choice', label: '依据', ans: opts.indexOf(rightOpt), options: opts }
      ],
      tip: '判定切线两条路：已知公共点 → 连半径、证垂直；没有公共点 → 作垂直、证 d = r。这题 A 是公共点。',
      explain: ['OA² + AB² = ' + (rad * rad) + ' + ' + (ab * ab) + ' = ' + (ob * ob) + ' = OB²，所以 ∠OAB = 90°，AB ⊥ OA。',
        'AB 经过半径 OA 的外端 A，且垂直于 OA，所以 AB 是 ⊙O 的切线。',
        '坑：只看到「AB 过圆上一点」就说相切——还必须垂直；两个条件缺一不可。'],
      kp: ['直线与圆', '切线的判定']
    };
  }

  /* 切线长定理：从圆外一点引两条切线，切线长相等，OP 平分两切线的夹角。 */
  function genTanLen(r) {
    var variant = ri(r, 0, 2);
    var pa = ri(r, 4, 12);
    if (variant === 0) {
      return {
        id: 'drill.tanlen', kind: 'tanlen', title: '切线长定理',
        prompt: 'PA、PB 分别切 ⊙O 于 A、B，PA = ' + pa + '。求 PB。',
        fields: [{ type: 'num', label: 'PB =', ans: pa }],
        tip: '从圆外一点引两条切线，切线长相等：PA = PB。',
        explain: ['由切线长定理，PA = PB。', '所以 PB = ' + pa + '。',
          '坑：把切线与割线混了；从圆外一点引两条「切线」，切线长才相等。'],
        kp: ['直线与圆', '切线长定理']
      };
    }
    if (variant === 1) {
      var gamma = 2 * ri(r, 15, 35);
      return {
        id: 'drill.tanlen', kind: 'tanlen', title: '切线长定理',
        prompt: 'PA、PB 分别切 ⊙O 于 A、B，∠APB = ' + gamma + '°。求 ∠APO 和 ∠AOB。',
        fields: [
          { type: 'num', label: '∠APO =', ans: gamma / 2, unit: '°' },
          { type: 'num', label: '∠AOB =', ans: 180 - gamma, unit: '°' }
        ],
        tip: 'OP 平分 ∠APB；四边形 PAOB 中 ∠PAO = ∠PBO = 90°，所以 ∠AOB = 180° − ∠APB。',
        explain: ['PA = PB，OP = OP，OA = OB，所以 △OAP ≌ △OBP，OP 平分 ∠APB：∠APO = ' + gamma + '° ÷ 2 = ' + (gamma / 2) + '°。',
          '四边形 PAOB 中，∠PAO = ∠PBO = 90°，内角和 360°：∠AOB = 360° − 90° − 90° − ' + gamma + '° = ' + (180 - gamma) + '°。',
          '坑：把 ∠AOB 算成 180° − ' + (gamma / 2) + '°；两个直角已经占掉 180°。'],
        kp: ['直线与圆', '切线长定理']
      };
    }
    return {
      id: 'drill.tanlen', kind: 'tanlen', title: '切线长定理',
      prompt: 'PA、PB 分别切 ⊙O 于 A、B，∠APB = 60°，PA = ' + pa + '。求 AB。',
      fields: [{ type: 'num', label: 'AB =', ans: pa }],
      tip: 'PA = PB 且夹角 60° ⟹ △PAB 是等边三角形。',
      explain: ['PA = PB（切线长相等），又 ∠APB = 60°，所以 △PAB 是等边三角形。',
        'AB = PA = ' + pa + '。',
        '坑：只想到「等腰」就停；顶角 60° 的等腰三角形就是等边三角形。'],
      kp: ['直线与圆', '切线长定理']
    };
  }

  /* 三角形的内切圆：内心 = 三条角平分线交点；直角三角形 r = (a + b − c)/2；
     任意三角形 ∠AIB = 90° + ∠C/2。 */
  function genIncircle(r) {
    if (r() < 0.55) {
      var tri = pick(r, RIGHT_TRI);
      var a = tri[0], b = tri[1], c = tri[2];
      var rin = (a + b - c) / 2;
      return {
        id: 'drill.incircle', kind: 'incircle', title: '三角形的内切圆',
        prompt: '直角三角形的两条直角边分别为 ' + a + '、' + b + '，求它的内切圆半径。',
        fields: [{ type: 'num', label: 'r =', ans: rin }],
        tip: '直角三角形内切圆半径 r = (a + b − c)/2（c 是斜边）；也可以 r = 面积 ÷ 半周长。',
        explain: ['斜边 c = √(' + a + '² + ' + b + '²) = ' + c + '。',
          'r = (a + b − c)/2 = (' + a + ' + ' + b + ' − ' + c + ')/2 = ' + frac(rin) + '。',
          '记住：内切圆半径是「面积 = ½ × 周长 × r」里的 r，面积法对任意三角形都成立。'],
        kp: ['直线与圆', '三角形的内切圆']
      };
    }
    var capC = 2 * ri(r, 15, 45);            /* 取偶数，保证 ∠AIB 是整数 */
    var capA = ri(r, 40, 150 - capC), capB = 180 - capC - capA;
    var aib = 90 + capC / 2;
    return {
      id: 'drill.incircle', kind: 'incircle', title: '三角形的内切圆',
      prompt: '△ABC 的内切圆圆心为 I，∠A = ' + capA + '°，∠B = ' + capB + '°。求 ∠AIB。',
      fields: [{ type: 'num', label: '∠AIB =', ans: aib, unit: '°' }],
      tip: '内心在角平分线上：∠IAB = ½∠A，∠IBA = ½∠B，再在 △AIB 里用内角和。',
      explain: ['I 是内心，AI、BI 分别平分 ∠A、∠B。',
        '∠IAB + ∠IBA = ½ × (' + capA + '° + ' + capB + '°) = ' + ((capA + capB) / 2) + '°。',
        '∠AIB = 180° − ' + ((capA + capB) / 2) + '° = ' + aib + '°（也等于 90° + ½∠C，∠C = ' + capC + '°）。'],
      kp: ['直线与圆', '三角形的内切圆']
    };
  }

  /* 正多边形与圆：中心角 = 360/n；正 n 边形内角 = 180 − 360/n；正六边形半径 = 边长；
     正三角形边心距 = 外接圆半径的一半。 */
  var REGULAR_INNER = [[120, 6], [135, 8], [140, 9], [144, 10], [150, 12], [156, 15], [108, 5]];
  function genRegular(r) {
    var variant = ri(r, 0, 3);
    if (variant === 0) {
      var n = pick(r, [3, 4, 6, 8, 12]);
      return {
        id: 'drill.regular', kind: 'regular', title: '正多边形与圆',
        prompt: '正 ' + n + ' 边形的中心角是多少度？',
        fields: [{ type: 'num', label: '中心角 =', ans: 360 / n, unit: '°' }],
        tip: '中心角 = 360° ÷ 边数；它和每个内角加起来等于 180°。',
        explain: ['正 n 边形的 n 个中心角合起来是整个周角 360°。',
          '中心角 = 360° ÷ ' + n + ' = ' + (360 / n) + '°。',
          '别和「内角」混：内角 = 180° − 中心角 = ' + (180 - 360 / n) + '°。'],
        kp: ['直线与圆', '正多边形与圆']
      };
    }
    if (variant === 1) {
      var pair = pick(r, REGULAR_INNER), inner = pair[0], sides = pair[1];
      return {
        id: 'drill.regular', kind: 'regular', title: '正多边形与圆',
        prompt: '一个正 n 边形的每个内角都是 ' + inner + '°，求 n。',
        fields: [{ type: 'num', label: 'n =', ans: sides }],
        tip: '内角 = 180° − 360°/n；先求外角 360°/n = 180° − 内角，再求 n。',
        explain: ['外角 = 180° − ' + inner + '° = ' + (180 - inner) + '°。',
          '正多边形外角和是 360°：n = 360° ÷ ' + (180 - inner) + '° = ' + sides + '。',
          '核对：内角 = 180° − 360°/' + sides + ' = ' + inner + '°。'],
        kp: ['直线与圆', '正多边形与圆']
      };
    }
    if (variant === 2) {
      var side = ri(r, 2, 10);
      return {
        id: 'drill.regular', kind: 'regular', title: '正多边形与圆',
        prompt: '正六边形的边长为 ' + side + '，求它的外接圆半径。',
        fields: [{ type: 'num', label: '外接圆半径 =', ans: side }],
        tip: '正六边形的中心角 60°，中心与相邻两顶点构成等边三角形，所以外接圆半径 = 边长。',
        explain: ['正六边形的中心角 = 360° ÷ 6 = 60°；半径 OA = OB，△OAB 是等边三角形。',
          '所以外接圆半径 = 边长 = ' + side + '。',
          '这条「正六边形半径 = 边长」在求弧长、扇形、圆锥时经常用到。'],
        kp: ['直线与圆', '正多边形与圆']
      };
    }
    var R = pick(r, [4, 6, 8, 10]);
    return {
      id: 'drill.regular', kind: 'regular', title: '正多边形与圆',
      prompt: '正三角形的外接圆半径为 ' + R + '，求它的边心距。',
      fields: [{ type: 'num', label: '边心距 =', ans: R / 2 }],
      tip: '正三角形边心距 = 外接圆半径的一半；也可以用 30° 的直角三角形算。',
      explain: ['正三角形中心角 120°，半径、边心距、半边长构成含 30° 的直角三角形。',
        '边心距 = R · sin 30° = ' + R + ' × ½ = ' + frac(R / 2) + '。',
        '记住比例：正三角形 R : r : 边 = 2 : 1 : 2√3。'],
      kp: ['直线与圆', '正多边形与圆']
    };
  }

  /* 增长率与传播：a(1+x)² = b（连续两轮同一百分率）；传播问题 (1+x)² = 总人数。 */
  var GROWTH_CASES = [
    { a: 100, x: 10, up: true }, { a: 100, x: 20, up: true }, { a: 200, x: 10, up: true }, { a: 200, x: 20, up: true },
    { a: 500, x: 10, up: true }, { a: 500, x: 20, up: true }, { a: 1000, x: 10, up: true },
    { a: 100, x: 10, up: false }, { a: 200, x: 10, up: false }, { a: 500, x: 10, up: false }, { a: 1000, x: 20, up: false }
  ];
  function genGrowth(r) {
    if (r() < 0.55) {
      var c = pick(r, GROWTH_CASES);
      var rate = c.up ? 1 + c.x / 100 : 1 - c.x / 100;
      var b = Math.round(c.a * rate * rate);
      return {
        id: 'drill.growth', kind: 'growth', title: '增长率与传播',
        prompt: '某商品原价 ' + c.a + ' 元，连续两次' + (c.up ? '涨价' : '降价') + '，每次' + (c.up ? '涨价' : '降价') +
          '的百分率相同，现价为 ' + b + ' 元。求每次' + (c.up ? '涨价' : '降价') + '的百分率（填数字，如 10 表示 10%）。',
        fields: [{ type: 'num', label: '百分率 =', ans: c.x, unit: '%' }],
        tip: '连续两次同一百分率：a(1 ± x)² = b；先开方求 1 ± x，再解出 x。另一个根不合实际意义（百分率不能为负，降价率也不能 ≥ 100%），要舍去。',
        explain: ['设每次' + (c.up ? '涨价' : '降价') + '的百分率为 x，则 ' + c.a + '(1 ' + (c.up ? '+' : '−') + ' x)² = ' + b + '。',
          '(1 ' + (c.up ? '+' : '−') + ' x)² = ' + (b / c.a) + '，1 ' + (c.up ? '+' : '−') + ' x = ' + rate + '，x = ' + (c.x / 100) + ' = ' + c.x + '%。',
          '坑：把两轮当成「一共涨 2x」；两轮是乘法，不是加法。'],
        kp: ['一元二次方程', '实际问题（增长率）']
      };
    }
    var xx = pick(r, [4, 5, 6, 7, 8, 9]);
    var total = (1 + xx) * (1 + xx);
    return {
      id: 'drill.growth', kind: 'growth', title: '增长率与传播',
      prompt: '有 1 人患流感，经过两轮传染后共有 ' + total + ' 人患流感。每轮 1 人传染几人？',
      fields: [{ type: 'num', label: '每轮 1 人传染 =', ans: xx, unit: '人' }],
      tip: '传播问题：1 人第一轮传染 x 人，共 1 + x 人；第二轮这 1 + x 人每人再传染 x 人，总数 (1 + x)²。',
      explain: ['设每轮 1 人传染 x 人：第一轮后共 1 + x 人，第二轮后共 (1 + x) + (1 + x)x = (1 + x)² 人。',
        '(1 + x)² = ' + total + '，1 + x = ' + (1 + xx) + '，x = ' + xx + '（负数解舍去）。',
        '坑：第二轮只算新增的 x(1 + x) 人，忘了加上第一轮的 1 + x 人。'],
      kp: ['一元二次方程', '实际问题（传播）']
    };
  }

  /* 面积问题：设宽为 x，长用 x 表示，面积列方程；解出两个根后按「边长为正、长 ≥ 宽」取舍。 */
  var AREA_CASES = [{ w: 5, a: 3 }, { w: 6, a: 4 }, { w: 8, a: 5 }, { w: 4, a: 3 }, { w: 7, a: 2 }, { w: 6, a: 2 }];
  function genAreaEq(r) {
    if (r() < 0.55) {
      var c = pick(r, AREA_CASES), w = c.w, a = c.a, l = w + a, S = w * l;
      return {
        id: 'drill.areaeq', kind: 'areaeq', title: '面积问题',
        prompt: '一个长方形的长比宽多 ' + a + ' 米，面积是 ' + S + ' 平方米。求它的宽和长。',
        fields: [
          { type: 'num', label: '宽 =', ans: w, unit: '米' },
          { type: 'num', label: '长 =', ans: l, unit: '米' }
        ],
        tip: '设宽为 x 米，则长为 (x + ' + a + ') 米，面积列方程 x(x + ' + a + ') = ' + S + '；两根里舍去负根。',
        explain: ['设宽为 x 米，长为 (x + ' + a + ') 米：x(x + ' + a + ') = ' + S + '。',
          '整理得 x² + ' + a + 'x − ' + S + ' = 0，因式分解 (x − ' + w + ')(x + ' + l + ') = 0，x = ' + w + ' 或 x = −' + l + '。',
          '长度不能为负，舍去 −' + l + '，所以宽 ' + w + ' 米、长 ' + l + ' 米。'],
        kp: ['一元二次方程', '实际问题（面积）']
      };
    }
    var pair = pick(r, [[5, 8], [4, 6], [5, 12], [7, 10], [6, 9], [3, 8]]);
    var w2 = pair[0], l2 = pair[1];
    var C = 2 * (w2 + l2), S2 = w2 * l2;
    return {
      id: 'drill.areaeq', kind: 'areaeq', title: '面积问题',
      prompt: '一个长方形的周长是 ' + C + ' 米，面积是 ' + S2 + ' 平方米。求它的宽和长。',
      fields: [
        { type: 'num', label: '宽 =', ans: w2, unit: '米' },
        { type: 'num', label: '长 =', ans: l2, unit: '米' }
      ],
      tip: '周长给的是「长 + 宽」：设宽为 x，则长为 (' + (C / 2) + ' − x)，再列面积方程。',
      explain: ['长 + 宽 = ' + C + ' ÷ 2 = ' + (C / 2) + ' 米。设宽为 x，则长为 (' + (C / 2) + ' − x)。',
        'x(' + (C / 2) + ' − x) = ' + S2 + '，整理得 x² − ' + (C / 2) + 'x + ' + S2 + ' = 0，解得 x = ' + w2 + ' 或 ' + l2 + '。',
        '两个根分别对应宽和长（长 ≥ 宽），所以宽 ' + w2 + ' 米、长 ' + l2 + ' 米。'],
      kp: ['一元二次方程', '实际问题（面积）']
    };
  }

  /* 二次函数与一元二次方程：图象与 x 轴交点的横坐标就是方程的根；
     对称轴平分两根：x1 + x2 = 2h，b = −(x1 + x2)，c = x1x2（a = 1）。 */
  function genFxEq(r) {
    var x1 = pick(r, [-4, -3, -2, -1, 1, 2]);
    /* 避开两个退化样本：对称轴 x = 0（b = 0）和 B 落在原点（c = 0）——数学成立，但 0 容易被当成漏填 */
    var ks = [1, 2, 3, 4].filter(function (k) { return k !== -x1 && x1 + 2 * k !== 0; });
    var h = x1 + pick(r, ks);                /* 对称轴在两根之间，x2 = 2h − x1 */
    var x2 = 2 * h - x1;
    var b = -(x1 + x2), c = x1 * x2;
    return {
      id: 'drill.fxeq', kind: 'fxeq', title: '二次函数与一元二次方程',
      prompt: '二次函数 y = x² + bx + c 的图象与 x 轴交于点 A(' + d(x1) + ', 0)，对称轴是直线 x = ' + d(h) +
        '。求另一个交点 B 的横坐标，以及 b、c。',
      fields: [
        { type: 'num', label: 'B 的横坐标 =', ans: x2 },
        { type: 'num', label: 'b =', ans: b },
        { type: 'num', label: 'c =', ans: c }
      ],
      tip: '图象与 x 轴交点的横坐标 = 方程 x² + bx + c = 0 的根；对称轴在两根正中间，x1 + x2 = 2h。',
      explain: ['A(' + d(x1) + ', 0) 在 x 轴上，所以 x = ' + d(x1) + ' 是方程 x² + bx + c = 0 的一个根。',
        '对称轴 x = ' + d(h) + ' 在两根正中间：(x1 + x2)/2 = ' + d(h) + '，x2 = 2×' + d(h) + ' − (' + d(x1) + ') = ' + d(x2) + '，所以 B(' + d(x2) + ', 0)。',
        '由韦达定理：b = −(x1 + x2) = ' + d(b) + '，c = x1·x2 = ' + d(c) + '。'],
      kp: ['二次函数', '二次函数与一元二次方程']
    };
  }

  /* 反证法第一步：假设结论的反面 */
  function genAbsurd(r) {
    var it = pick(r, ABSURD_CASES);
    var opts = shuffle(r, [it.ans].concat(it.bad));
    return {
      id: 'drill.absurd', kind: 'absurd', title: '反证法第一步',
      prompt: '用反证法证明「' + it.concl + '」时，第一步应假设（　）',
      fields: [{ type: 'choice', label: '', ans: opts.indexOf(it.ans), options: opts }],
      tip: '反证法第一步 = 假设结论的反面成立：只否定结论本身，不加强、不减弱。',
      explain: ['结论「' + it.concl + '」的反面是「' + it.ans + '」，所以第一步假设它成立。',
        '坑：把「加强版」（更极端的说法）或「减弱版」当反面——反证法只认结论的精确否定。'],
      kp: ['推理与证明', '反证法']
    };
  }

  /* 顶点式最值：a 的符号定最大还是最小，最值是 k */
  function genVertexMax(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var h = ri(r, -4, 4), k = ri(r, -6, 6);
    var hasMin = a > 0;
    var coef = leadCoef(a);
    return {
      id: 'drill.vertexmax', kind: 'vertexmax', title: '顶点式最值',
      prompt: '二次函数 y = ' + coef + binom(h) + '²' + kterm(k) + ' 有最大值还是最小值？最值是多少？',
      fields: [
        { type: 'choice', label: '有', ans: hasMin ? 0 : 1, options: ['最小值', '最大值'] },
        { type: 'num', label: '最值 =', ans: k }
      ],
      tip: '顶点式 y = a(x − h)² + k：a > 0 开口向上有最小值，a < 0 开口向下有最大值，最值就是 k。',
      explain: ['a = ' + d(a) + (hasMin ? ' > 0，开口向上，所以有最小值' : ' < 0，开口向下，所以有最大值')
        + '，等于顶点的纵坐标 ' + d(k) + '。',
        '顶点是 (' + d(h) + ', ' + d(k) + ')：横坐标 ' + d(h) + ' 不是最值，别填错。'],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[h, k, '顶点']] },
      kp: ['二次函数', '最值']
    };
  }

  /* 平移：左加右减、上加下减 */
  function genShift(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var h = ri(r, -3, 3), k = ri(r, -3, 3);
    var dirX = r() < 0.5 ? -1 : 1, dx = ri(r, 1, 3);
    var dirY = r() < 0.5 ? -1 : 1, dy = ri(r, 1, 3);
    var h2 = h + dirX * dx, k2 = k + dirY * dy;
    var b = -2 * a * h, c = a * h * h + k;
    var b2 = -2 * a * h2, c2 = a * h2 * h2 + k2;
    return {
      id: 'drill.shift', kind: 'shift', title: '抛物线平移',
      prompt: '把抛物线 y = ' + poly2(a, b, c) + ' 先' + (dirY < 0 ? '向下' : '向上') + '平移 ' + dy +
        ' 个单位，再' + (dirX < 0 ? '向左' : '向右') + '平移 ' + dx + ' 个单位。平移后的解析式是？',
      fields: [{ type: 'expr', form: 'general', tpl: 'y = {}x² + {}x + {}', label: '平移后的解析式', ans: [a, b2, c2] }],
      tip: '平移只动顶点，a 不变：左加右减（动横坐标）、上加下减（动纵坐标）。',
      explain: ['先配方找原顶点：y = ' + poly2(a, b, c) + ' = ' + leadCoef(a) + binom(h) + '²' + kterm(k) + '，顶点 (' + d(h) + ', ' + d(k) + ')。',
        '顶点平移后是 (' + d(h2) + ', ' + d(k2) + ')，开口不变，所以新解析式 y = ' + leadCoef(a) + binom(h2) + '²' + kterm(k2) + '。',
        '展开成一般式：y = ' + poly2(a, b2, c2) + '。缺哪一项就填 0。'],
      fig: { type: 'parabola', a: a, h: h2, k: k2, dots: [[h, k, '原顶点'], [h2, k2, '新顶点']], ghost: [{ a: a, h: h, k: k }] },
      kp: ['二次函数', '平移']
    };
  }

  /* 闭区间最值：先看顶点在不在区间里 */
  function genRangeMax(r) {
    var a = pick(r, [-2, -1, 1, 2]);
    var h = ri(r, -2, 2), k = ri(r, -3, 3);
    var mode = ri(r, 0, 2);
    var p, q;
    if (mode === 0) { p = h - ri(r, 1, 4); q = h + ri(r, 1, 4); }
    else if (mode === 1) { p = h + ri(r, 1, 3); q = p + ri(r, 1, 3); }
    else { q = h - ri(r, 1, 3); p = q - ri(r, 1, 3); }
    function val(x) { return a * (x - h) * (x - h) + k; }
    var yp = val(p), yq = val(q);
    var cand = [yp, yq];
    if (mode === 0) cand.push(k);
    var lo = Math.min.apply(null, cand), hi = Math.max.apply(null, cand);
    var inside = mode === 0;
    return {
      id: 'drill.rangemax', kind: 'rangemax', title: '闭区间最值',
      prompt: '二次函数 y = ' + poly2(a, -2 * a * h, a * h * h + k) + '，当 ' + d(p) + ' ≤ x ≤ ' + d(q) +
        ' 时，它的最小值和最大值分别是多少？',
      fields: [
        { type: 'num', label: '最小值 =', ans: lo },
        { type: 'num', label: '最大值 =', ans: hi }
      ],
      tip: '先看顶点横坐标在不在区间里：在，就有一个最值在顶点取；不在，两个最值都在端点取。',
      explain: ['对称轴 x = ' + d(h) + (inside ? '，落在区间 [' + d(p) + ', ' + d(q) + '] 内，所以顶点是其中一个最值：y(' + d(h) + ') = ' + d(k) + '。'
        : '，不在区间 [' + d(p) + ', ' + d(q) + '] 内，所以这段图象是单调的，两个最值都在端点取。'),
        '两个端点：y(' + d(p) + ') = ' + d(yp) + '，y(' + d(q) + ') = ' + d(yq) + '。',
        '比一比得：最小值 ' + d(lo) + '，最大值 ' + d(hi) + '。',
        '坑：不看顶点在不在区间里，直接写「最小值 = 顶点纵坐标」。'],
      fig: { type: 'parabola', a: a, h: h, k: k, dots: [[p, yp, 'x=' + d(p)], [q, yq, 'x=' + d(q)], [h, k, '顶点']] },
      kp: ['二次函数', '区间最值']
    };
  }

  /* ---------- 大题前两步：固定题（来自 2026-11 期中卷 20–25 的得分点） ---------- */
  var ENTRY = [
    {
      id: 'entry.21.1', no: '21', title: '21(1) 求交点',
      prompt: '直线 y = −x − 2 与 x 轴交于点 A，与 y 轴交于点 B。<br><span class="muted small">先求这两个点——这是 21 题的第一个得分点。</span>',
      fields: [{ type: 'num', label: 'A 的横坐标 =', ans: -2 }, { type: 'num', label: 'B 的纵坐标 =', ans: -2 }],
      tip: 'x 轴上的点 y = 0；y 轴上的点 x = 0。',
      explain: ['令 y = 0：0 = −x − 2，x = −2，所以 A(−2, 0)。', '令 x = 0：y = −2，所以 B(0, −2)。'],
      kp: ['一次函数']
    },
    {
      id: 'entry.21.2', no: '21', title: '21(1) 顶点式求 a',
      prompt: '抛物线顶点为 A(−2, 0)，且经过 B(0, −2)。设 y₂ = a(x + 2)²。',
      fields: [{ type: 'num', label: 'a =', ans: -0.5 }],
      tip: '顶点已知 → 设顶点式，只剩 a；代另一个点。',
      explain: ['把 B(0, −2) 代入：−2 = a(0 + 2)² = 4a，所以 a = −1/2。', '即 y₂ = −1/2(x + 2)²。'],
      fig: { type: 'parabola', a: -0.5, h: -2, k: 0, dots: [[-2, 0, 'A 顶点'], [0, -2, 'B']] },
      kp: ['二次函数', '待定系数法']
    },
    {
      id: 'entry.21.3', no: '21', title: '21(2) 图象比较',
      prompt: '已知 y₁ = −x − 2，y₂ = −1/2(x + 2)²。当 y₁ > y₂ 时，x 的取值范围是？',
      fields: [{ type: 'choice', label: '', ans: 0, options: ['x < −2 或 x > 0', '−2 < x < 0', 'x < 0 或 x > 2', '−2 < x < 2'] }],
      tip: '两图象交点横坐标是 −2 和 0；在交点之间、之外各试一个数。',
      explain: ['−x − 2 > −1/2(x + 2)²，两边乘 2 整理得 x² + 2x > 0，即 x(x + 2) > 0。', '所以 x < −2 或 x > 0。'],
      kp: ['二次函数', '图象']
    },
    {
      id: 'entry.22.1', no: '22', title: '22(1) 求 k',
      prompt: '直线 y = −x + 6 与反比例函数 y = k/x 的图象在第一象限交于 A、B，B 的纵坐标为 2。',
      fields: [{ type: 'num', label: 'B 的横坐标 =', ans: 4 }, { type: 'num', label: 'k =', ans: 8 }],
      tip: 'B 同时在直线和反比例图象上：先代直线求坐标，再代反比例求 k。',
      explain: ['B 在 y = −x + 6 上且 y = 2：2 = −x + 6，x = 4，B(4, 2)。', 'k = x·y = 4 × 2 = 8。'],
      fig: { type: 'hyperbola', k: 8, xr: [-6, 6], dots: [[4, 2, 'B'], [2, 4, 'A']] },
      kp: ['反比例函数', '一次函数']
    },
    {
      id: 'entry.22.2', no: '22', title: '22(2) 求另一交点',
      prompt: '已知 k = 8，直线 y = −x + 6 与 y = 8/x 交于 A、B，其中 B(4, 2)。求另一个交点 A 的坐标。',
      fields: [{ type: 'num', label: 'A 的横坐标 =', ans: 2 }, { type: 'num', label: 'A 的纵坐标 =', ans: 4 }],
      tip: '联立 y = −x + 6 与 y = 8/x，解一元二次方程。',
      explain: ['−x + 6 = 8/x → x² − 6x + 8 = 0 → (x − 2)(x − 4) = 0。', 'x = 4 是 B，所以 A 的横坐标 2，纵坐标 4，A(2, 4)。'],
      kp: ['反比例函数', '一次函数']
    },
    {
      id: 'entry.23.1', no: '23', title: '23(1) 用 x 表示',
      prompt: '团扇每把盈利 60 元，每天卖 30 把；每降价 2 元，每天多卖 3 把。设每把降价 x 元。<br>每把盈利 = a − x，每天销量 = 30 + b·x。',
      fields: [{ type: 'num', label: 'a =', ans: 60 }, { type: 'num', label: 'b =', ans: 1.5 }],
      tip: '“每降 2 元多卖 3 把” → 降 1 元多卖 3/2 把。',
      explain: ['每把盈利 = 60 − x，所以 a = 60。', '每降 2 元多卖 3 把，降 x 元多卖 (x/2)×3 = 1.5x，所以 b = 1.5。'],
      kp: ['二次函数', '建模']
    },
    {
      id: 'entry.23.2', no: '23', title: '23(2) 解出并取舍',
      prompt: '团扇日盈利 W = (60 − x)(30 + 1.5x)，其中 x 是降价元数。要 W = 2250，解得 x₁ = 10，x₂ = 30。<br>要让顾客得实惠，应降价多少元？',
      fields: [{ type: 'choice', label: '', ans: 1, options: ['10 元', '30 元'] }],
      tip: '“让顾客实惠”= 降得更多。',
      explain: ['两个解都在 0 ≤ x ≤ 60 且为偶数，所以取降得多的 x = 30 元。'],
      kp: ['二次函数', '建模']
    },
    {
      id: 'entry.20.1', no: '20', title: '20(1) 上升段解析式',
      prompt: '注意力指标 y 随时间 x 变化：上升段是直线，过 (0, 20) 和 (10, 45)。',
      fields: [{ type: 'num', label: 'y = kx + b 中，k =', ans: 2.5 }, { type: 'num', label: 'b =', ans: 20 }],
      tip: 'b 就是 x = 0 时的 y；k 用两点差算。',
      explain: ['k = (45 − 20)/(10 − 0) = 2.5；b = 20。', '上升段：y = 2.5x + 20（0 ≤ x ≤ 10）。'],
      kp: ['一次函数', '建模']
    },
    {
      id: 'entry.20.2', no: '20', title: '20(1) 下降段反比例',
      prompt: '注意力指标的下降段是反比例函数 y = k/x，过点 (20, 45)。',
      fields: [{ type: 'num', label: 'k =', ans: 900 }],
      tip: '反比例段：k = x·y。',
      explain: ['k = 20 × 45 = 900，所以 y = 900/x（20 ≤ x ≤ 45）。'],
      kp: ['反比例函数', '分段函数']
    },
    {
      id: 'entry.24.1', no: '24', title: '24(1) 求角度',
      prompt: '正方形 ABCD 中，BP 由 BA 绕 B 逆时针旋转 α 得到。当 △ABP 是等边三角形时，求 ∠BPC。',
      fields: [{ type: 'num', label: '∠BPC =', ans: 15, unit: '°' }],
      tip: '等边三角形 → α = 60°；BP = BA = BC，△PBC 是等腰三角形。',
      explain: ['α = 60°，∠PBC = ∠PBA + ∠ABC = 60° + 90° = 150°。', 'BP = BC，所以 ∠BPC = (180° − 150°) ÷ 2 = 15°。'],
      kp: ['几何综合', '旋转']
    },
    {
      id: 'entry.25.1', no: '25', title: '25(1) 代值',
      prompt: '抛物线 y = x² + 2ax + 2a − 5。当 a = −1、x = 2 时，y = ?',
      fields: [{ type: 'num', label: 'y =', ans: -7 }],
      tip: '先把 a 代进去，再把 x 代进去。',
      explain: ['a = −1：y = x² − 2x − 7。', 'x = 2：y = 4 − 4 − 7 = −7。'],
      fig: { type: 'parabola', a: 1, h: 1, k: -8, dots: [[2, -7, 'x=2']] },
      kp: ['二次函数', '含参']
    },
    {
      id: 'entry.25.2', no: '25', title: '25(1) 判断点',
      prompt: '已知 a = −1 时抛物线为 y = x² − 2x − 7。点 (2, −6) 在图象上吗？',
      fields: [{ type: 'choice', label: '', ans: 1, options: ['在', '不在'] }],
      tip: '把 x = 2 代进去，看 y 等不等于 −6。',
      explain: ['x = 2 时 y = −7 ≠ −6，所以点 (2, −6) 不在图象上。'],
      kp: ['二次函数', '含参']
    },
    /* ---- 第 11 周周练卷（11.11）的解答题前两步 ---- */
    {
      id: 'entry.13.1', no: '13', title: '13(1) 对称轴与顶点',
      prompt: '已知二次函数 y₁ = −x² + 2x + 3。<br><span class="muted small">求对称轴和顶点——这是 13 题的第一个得分点（4 分里先拿 2 分）。</span>',
      fields: [
        { type: 'num', label: '对称轴 直线 x =', ans: 1 },
        { type: 'num', label: '顶点的纵坐标 =', ans: 4 }
      ],
      tip: '对称轴 x = −b/(2a)；顶点把横坐标代回去算 y。',
      explain: ['a = −1、b = 2：x = −b/(2a) = −2/(−2) = 1。', '代 x = 1：y = −1 + 2 + 3 = 4，顶点 (1, 4)。'],
      fig: { type: 'parabola', a: -1, h: 1, k: 4, dots: [[1, 4, '顶点']] },
      kp: ['二次函数', '顶点']
    },
    {
      id: 'entry.13.3', no: '13', title: '13(3) 平移后解析式',
      prompt: '把抛物线 y = −x² + 2x + 3 向下平移 3 个单位，再向左平移 2 个单位。<br>写出平移后的解析式（13(3) 的 3 分）。',
      fields: [{ type: 'expr', form: 'general', tpl: 'y = {}x² + {}x', label: '平移后的解析式', ans: [-1, -2] }],
      tip: '「上加下减」改常数项，「左加右减」把 x 换成 (x + 2)。',
      explain: ['先向下 3 个：y = −x² + 2x + 3 − 3 = −x² + 2x。', '再向左 2 个（x 换成 x + 2）：y = −(x + 2)² + 2(x + 2) = −x² − 2x。'],
      kp: ['二次函数', '平移']
    },
    {
      id: 'entry.13.5', no: '13', title: '13(5) 面积怎么设',
      prompt: 'A(0, 3)、B(3, 0)，P 在线段 AB 上方的抛物线上。设 P(t, −t² + 2t + 3)，过 P 作 PQ ∥ y 轴交 AB 于 Q。<br><span class="muted small">先写出 PQ 的长度——这是 13(5) 的关键一步。</span>',
      fields: [{
        type: 'choice', label: 'PQ =', ans: 0,
        options: ['−t² + 3t', 't² − 3t', '−t² + 3t + 6', '−t² + t']
      }],
      tip: 'Q 和 P 横坐标相同；Q 在直线 AB 上，而 AB 的解析式是 y = −x + 3。',
      explain: ['Q(t, −t + 3)，P(t, −t² + 2t + 3)。', 'PQ = y_P − y_Q = (−t² + 2t + 3) − (−t + 3) = −t² + 3t。'],
      kp: ['二次函数', '面积最值']
    },
    {
      id: 'entry.14.1', no: '14', title: '14 第一步：平行得角',
      prompt: 'AB 为 ⊙O 的直径，∠BOC = 80°，AD ∥ OC。<br><span class="muted small">第一步：∠DAB 是多少度？依据是哪条？</span>',
      fields: [
        { type: 'num', label: '∠DAB =', ans: 80, unit: '°' },
        {
          type: 'choice', label: '依据', ans: 0,
          options: ['AD ∥ OC，两直线平行、同位角相等', '同弧所对的圆周角等于圆心角的一半', 'OA = OD，等边对等角', '直径所对的圆周角是直角']
        }
      ],
      tip: 'AD ∥ OC，AB 是截线 → ∠DAB 与 ∠BOC 是同位角。',
      explain: ['AD ∥ OC，AB 截两条平行线，∠DAB 与 ∠BOC 是同位角，所以 ∠DAB = ∠BOC = 80°。', '接下来由 OA = OD 得 ∠D = ∠DAB = 80°。'],
      kp: ['圆的基本性质', '平行线与角']
    },
    {
      id: 'entry.15.1', no: '15', title: '15(1) 建系设式求 a',
      prompt: '三孔桥：以水面为 x 轴、大孔抛物线对称轴为 y 轴。大孔水面宽 20 m，顶点距水面 8 m。<br>设 y = ax² + k，求 k 和 a。',
      fields: [
        { type: 'num', label: 'k =', ans: 8 },
        { type: 'num', label: 'a =（可填分数）', ans: -0.08 }
      ],
      tip: '顶点在 y 轴上 → k 就是拱高；水面宽 20 m 意味着过 (±10, 0)。',
      explain: ['顶点 (0, 8)，所以 k = 8。', '过 (10, 0)：0 = a×100 + 8，a = −8/100 = −2/25。', '解析式 y = −2/25 x² + 8。'],
      fig: { type: 'parabola', a: -0.08, h: 0, k: 8, xr: [-10.6, 10.6], dots: [[0, 8, '拱顶'], [-10, 0, '水面'], [10, 0, '水面']] },
      kp: ['二次函数', '建模', '待定系数法']
    },
    {
      id: 'entry.16.1', no: '16', title: '16(1) 销量用 x 表示',
      prompt: '进价 40 元、售价 50 元，每月可卖 150 件；每涨价 2 元就少卖 5 件。设每件涨价 x 元。<br>每月可卖 = 150 − b·x。',
      fields: [
        { type: 'num', label: 'b =', ans: 2.5 },
        { type: 'num', label: '涨价 4 元时，每月可卖 =', ans: 140, unit: '件' }
      ],
      tip: '「每涨 2 元少卖 5 件」→ 涨 1 元少卖 5/2 件。',
      explain: ['每涨 2 元少卖 5 件，涨 x 元少卖 (5/2)x = 2.5x 件，所以 b = 2.5。', 'x = 4：150 − 2.5×4 = 140（件）。'],
      kp: ['二次函数', '建模']
    },
    {
      id: 'entry.16.2', no: '16', title: '16(2) 取值范围',
      prompt: '某商品售价 50 元，每件涨价 x 元（x 为偶数），售价不能超过 70 元。<br>自变量 x 的取值范围是？',
      fields: [{
        type: 'choice', label: '', ans: 0,
        options: ['0 ≤ x ≤ 20 且 x 为偶数', '0 ≤ x ≤ 20', '0 ≤ x ≤ 25 且 x 为偶数', '0 ≤ x ≤ 30 且 x 为偶数']
      }],
      tip: '两条约束：x ≥ 0（只能涨不能降，题目说"上涨"）、售价 50 + x ≤ 70；别忘了"x 为偶数"。',
      explain: ['售价 50 + x ≤ 70 ⟹ x ≤ 20。', '又 x ≥ 0 且 x 为偶数，所以 0 ≤ x ≤ 20 且 x 为偶数。', '坑：漏掉"偶数"（选 B），或把 70 当成涨价幅度（选 C/D）。'],
      kp: ['二次函数', '取值范围']
    },
    {
      id: 'entry.17.1', no: '附加', title: '附加(1) 对称轴求 b、c',
      prompt: '抛物线 y = −x² + bx + c 的对称轴是直线 x = 1，且经过点 A(−1, 0)。<br>求 b 和 c（附加题第一个得分点）。',
      fields: [
        { type: 'num', label: 'b =', ans: 2 },
        { type: 'num', label: 'c =', ans: 3 }
      ],
      tip: '对称轴 x = −b/(2a) 先定 b；再把 A 代进去定 c。',
      explain: ['−b/(2×(−1)) = 1 ⟹ b = 2。', '代 A(−1, 0)：−1 − 2 + c = 0 ⟹ c = 3。', '所以 y = −x² + 2x + 3。'],
      fig: { type: 'parabola', a: -1, h: 1, k: 4, dots: [[1, 4, '顶点'], [-1, 0, 'A']] },
      kp: ['二次函数', '待定系数法']
    },
    /* ---- 错题本（数学/错题本.html）里那批错题的「第一步」----
       只收「第一步就是下笔障碍」的：辅助线 / 等半径 / 垂径定理 / 建模 / 待定系数。
       纯概念选择（点与圆的位置关系、k 的几何意义、三次方程）已经有基础快练的题型覆盖，不在这里重复。 */
    {
      id: 'entry.t01', title: '错题本 p01 · 垂径定理第一步',
      prompt: 'CD 是 ⊙O 的直径，AB 是 ⊙O 的弦，AB⊥CD 于 M。若 AB=8，OM∶OC=3∶5。<br><span class="muted small">第一步：垂径定理得 AM，再设 k 求半径。</span>',
      fields: [
        { type: 'num', label: 'AM =', ans: 4 },
        { type: 'num', label: '设 OM=3k、OC=5k，则 k =', ans: 1 }
      ],
      tip: '直径垂直于弦 → 平分弦；半径 OA=OC=5k，在 Rt△AOM 里列勾股。',
      explain: ['CD 过圆心且 AB⊥CD ⟹ AM=BM=½AB=4。', 'OM=3k、OC=5k ⟹ OA=5k；Rt△AOM：25k²=9k²+16 ⟹ k=1（OM=3、半径 5）。'],
      kp: ['圆的基本性质', '垂径定理']
    },
    {
      id: 'entry.t02', title: '错题本 p02 · 半圆里的角度链',
      prompt: '以 △ABC 的边 AB 为直径作半圆 O，分别交 AC、BC 于 D、E。若 AC=BC，∠C=70°。<br><span class="muted small">第一步：先求 ∠A，再求 ∠CAE。</span>',
      fields: [
        { type: 'num', label: '∠A =', ans: 55, unit: '°' },
        { type: 'num', label: '∠CAE =', ans: 20, unit: '°' }
      ],
      tip: '等腰三角形先算 ∠A；AB 是直径 ⟹ ∠AEB=90°，再在 Rt△ACE 里算 ∠CAE。',
      explain: ['AC=BC、∠C=70° ⟹ ∠A=∠B=(180°−70°)/2=55°。', 'AB 为直径 ⟹ ∠AEB=90°；Rt△ACE 中 ∠CAE=90°−∠C=20°。', '再往下一步：∠DOE=2∠DAE=40°。'],
      kp: ['圆的基本性质', '直径所对的圆周角']
    },
    {
      id: 'entry.t03', title: '错题本 p03 · 扇形里的等腰直角',
      prompt: '扇形 AOB 中 ∠AOB=90°，P 为弧 AB 上一点，PC⊥OA 于 C，交 AB 于 D，PD=3，CD=2。求半径。<br><span class="muted small">第一步：先判断 △ACD 的形状。</span>',
      fields: [
        { type: 'choice', label: '△ACD 是', ans: 0, options: ['等腰直角三角形', '等边三角形', '含 30° 的直角三角形', '普通直角三角形'] },
        { type: 'num', label: 'AC =', ans: 2 }
      ],
      tip: 'OA=OB、∠AOB=90° ⟹ ∠OAB=45°；PC⊥OA ⟹ ∠ACD=90°，所以 △ACD 也是等腰直角。',
      explain: ['OA=OB、∠AOB=90° ⟹ ∠OAB=45°。', 'PC⊥OA ⟹ ∠ACD=90°，∠CAD=45° ⟹ △ACD 等腰直角，AC=CD=2。', '于是 PC=PD+DC=5、OC=R−2，在 Rt△OCP 列勾股：R²=(R−2)²+25 ⟹ R=29/4。'],
      kp: ['圆的基本性质', '等腰直角三角形']
    },
    {
      id: 'entry.t05', title: '错题本 p05 · 圆内证角平分线',
      prompt: 'AB 是 ⊙O 的直径，C、D 在 ⊙O 上，BC∥OD。求证：BD 平分 ∠ABC。<br><span class="muted small">第一步：两条依据先写出来。</span>',
      fields: [
        {
          type: 'choice', label: '∠ODB = ∠OBD 的依据', ans: 0,
          options: ['OD = OB，等边对等角', '同弧所对的圆周角相等', '直径所对的圆周角是直角', '平行线的同位角相等']
        },
        {
          type: 'choice', label: '∠ODB = ∠CBD 的依据', ans: 0,
          options: ['BC ∥ OD，内错角相等', 'BC ∥ OD，同位角相等', '同弧所对的圆周角相等', '等边对等角']
        }
      ],
      tip: '先抓半径相等（等腰），再用平行线的内错角把角接起来。',
      explain: ['OD=OB ⟹ ∠ODB=∠OBD。', 'BC∥OD ⟹ ∠ODB=∠CBD（内错角）。', '所以 ∠OBD=∠CBD；O 在 AB 上，∠OBD 就是 ∠ABD，所以 BD 平分 ∠ABC。'],
      kp: ['圆的基本性质', '平行线与角']
    },
    {
      id: 'entry.t06', title: '错题本 p06 · 灯罩轴截面建模',
      prompt: '球形灯罩的轴截面：HF 过圆心且垂直底座 CD 于 F，AC=BD=1，CD=12，HF=31。<br><span class="muted small">第一步：垂径定理求 CF，再写 R 与 OF 的关系。</span>',
      fields: [
        { type: 'num', label: 'CF =', ans: 6 },
        {
          type: 'choice', label: '设半径 R、OF=d，则', ans: 0,
          options: ['R + d = 31', 'R − d = 31', '2R + d = 31', 'R + 2d = 31']
        }
      ],
      tip: 'HF 过圆心且垂直 CD → 垂径定理平分 CD；注意 HF 不是直径，是 R + d。',
      explain: ['垂径定理：CF=FD=½×12=6。', 'H、O、F 共线，HF=HO+OF=R+d=31。', '下一步：以 F 为原点，A(−6, 1)、O(0, d)，6²+(d−1)²=R²，代 d=31−R 得 R=15.6。'],
      kp: ['圆的基本性质', '垂径定理', '建模']
    },
    {
      id: 'entry.t08', title: '错题本 p08 · 反比例 + 一次函数',
      prompt: '双曲线 y=k/x（x>0）上有一点 A(1, 5)，过 A 的直线 y=−mx+n 与该双曲线交于点 B，且 B 的纵坐标为 1。<br><span class="muted small">第一步：求 k 和 B 的坐标。</span>',
      fields: [
        { type: 'num', label: 'k =', ans: 5 },
        { type: 'num', label: 'B 的横坐标 =', ans: 5 }
      ],
      tip: '点在图象上就代入；先求 k，再用 y=1 反求 B 的横坐标。',
      explain: ['A(1, 5) 在 y=k/x 上 ⟹ k=5，即 y=5/x。', 'B 的纵坐标为 1：1=5/x ⟹ x=5，B(5, 1)。', '下一步：代 A、B 求 m、n，得 y=−x+6。'],
      kp: ['反比例函数', '待定系数法']
    },
    {
      id: 'entry.t11', title: '错题本 p11 · 旋转题的等腰直角',
      prompt: '平行四边形 ABCD 中 ∠DAB=45°，DE⊥AB 于 E，DE=2√2，AE=2EB。<br><span class="muted small">第一步：先看 △ADE 是什么三角形。</span>',
      fields: [
        { type: 'choice', label: 'AE =', ans: 0, options: ['2√2', '2', '4', '2√3'] },
        { type: 'num', label: 'AD =', ans: 4 }
      ],
      tip: '∠DAE=45° 且 DE⊥AB ⟹ △ADE 是等腰直角三角形，AE=DE。',
      explain: ['DE⊥AB、∠DAE=45° ⟹ △ADE 等腰直角，AE=DE=2√2。', 'AD=√2·AE=√2×2√2=4；由 AE=2EB 得 EB=√2。', '下一步才是旋转：AE′=AE、AF′=AF、∠F′AE′=45°。'],
      kp: ['几何综合', '等腰直角三角形']
    },
    /* ---- 2026-11-14 老师反馈补的两道「第一步」：圆内接四边形对角互补、弦心距 + 连半径 ---- */
    {
      id: 'entry.t12', title: '圆内接四边形 · 对角互补第一步',
      prompt: '四边形 ABCD 内接于 ⊙O，∠A = 70°，∠B = 95°。<br><span class="muted small">第一步：先写哪条结论，再算 ∠C。</span>',
      fields: [
        {
          type: 'choice', label: '依据', ans: 0,
          options: ['圆内接四边形对角互补：∠A + ∠C = 180°', '圆内接四边形邻角互补：∠A + ∠B = 180°', '同弧所对的圆周角相等', '直径所对的圆周角是直角']
        },
        { type: 'num', label: '∠C =', ans: 110, unit: '°' }
      ],
      tip: '圆内接四边形：对角互补（∠A + ∠C、∠B + ∠D），不是邻角互补——这是最容易记混的一条。',
      explain: ['四边形 ABCD 内接于 ⊙O ⟹ 对角互补：∠A + ∠C = 180°。', '∠C = 180° − 70° = 110°。', '下一步同理：∠D = 180° − ∠B = 85°。'],
      kp: ['圆的基本性质', '圆内接四边形']
    },
    {
      id: 'entry.t13', title: '弦心距 + 连半径 · 垂径第一步',
      prompt: 'AB 是 ⊙O 的弦，AB = 16，圆心 O 到 AB 的距离 OM = 6。<br><span class="muted small">第一步：作什么辅助线？先求哪条线段？</span>',
      fields: [
        {
          type: 'choice', label: '第一步辅助线', ans: 0,
          options: ['过 O 作 OM ⊥ AB 于 M（弦心距），再连 OA', '连 OA、OB 构造等边三角形', '过 A 作 AB 的垂线', '延长 OM 交圆于 C，得直径']
        },
        { type: 'num', label: 'AM =', ans: 8 },
        { type: 'num', label: '半径 OA =', ans: 10 }
      ],
      tip: '见弦 → 作弦心距 + 连半径，凑出直角三角形：OA² = OM² + AM²。',
      explain: ['OM ⊥ AB ⟹ AM = MB = ½AB = 8（垂径定理）。', '连 OA 得 Rt△OAM：OA = √(6² + 8²) = 10。', '套路：弦长、弦心距、半径三个量，知二求一。'],
      kp: ['圆的基本性质', '垂径定理']
    },
    /* ---- 2026-11-19 补：孩子反馈「扇形、弧、圆锥有点难」，把展开图和公式选择做成第一步 ---- */
    {
      id: 'entry.t21', title: '圆锥展开图 · 第一步',
      prompt: '圆锥的底面半径为 3，母线长为 5。<br><span class="muted small">第一步：侧面展开图是扇形——先写它的半径和弧长。</span>',
      fields: [
        { type: 'num', label: '扇形半径（母线）=', ans: 5 },
        { type: 'num', label: '扇形弧长 = kπ，k =', ans: 6 }
      ],
      tip: '圆锥侧面展开：扇形半径 = 母线 l，扇形弧长 = 底面周长 2πr。',
      explain: ['展开图是扇形：半径就是母线 5；弧长等于底面圆的周长 2πr = 6π。',
        '所以 k = 6；下一步用 θ = 360r/l 求圆心角：360×3÷5 = 216°。'],
      kp: ['圆的基本性质', '圆锥的侧面积']
    },
    {
      id: 'entry.t22', title: '扇形面积 · 用哪个公式',
      prompt: '扇形 AOB 中，∠AOB = 120°，半径 OA = 6。<br><span class="muted small">第一步：选面积公式，再算。</span>',
      fields: [
        { type: 'choice', label: '用哪个公式', ans: 0, options: ['S = nπr²/360', 'S = πrl', 'S = πr²', 'S = 2πr'] },
        { type: 'num', label: '面积 = kπ，k =', ans: 12 }
      ],
      tip: '给圆心角用 S = nπr²/360；给弧长用 S = ½lr；两个公式可以互相推。',
      explain: ['已知圆心角 120°、半径 6，用 S = nπr²/360。',
        'S = 120 × π × 36 ÷ 360 = 12π，所以 k = 12。',
        '同一题的弧长 l = 120π×6/180 = 4π，用 S = ½lr = ½×4π×6 = 12π，两个公式结果一致。'],
      kp: ['圆的基本性质', '扇形面积']
    }
  ];

  /* ---------- 模块注册表：加新训练 = 加一个模块 ----------
     数组顺序 = 每天的练习顺序 = 页签顺序 = 卡片顺序：基础快练（热身）→ 写解析式 → 大题前两步。
     改顺序只改这里；不要在别处硬编码顺序。
     题型上的 group 只影响模块页的分组标题（同 group 的卡片排在一起）；不写 group 就不分组。 */
  var MODULES = [
    {
      id: 'drill', name: '基础快练', icon: '⚡',
      desc: '七个板块、40 个题型，限时一次就对：方程与代数 / 二次函数 / 反比例函数 / 圆 / 直线与圆 / 图形与变换 / 推理与证明。',
      kinds: [
        /* group 只决定模块页怎么分组显示；数组顺序 = 「开始一轮」的混抽顺序 = 今日轮换顺序 */
        /* —— 方程与代数 —— */
        { id: 'factor', name: '因式分解（十字相乘）', group: '方程与代数', gen: genFactor },
        { id: 'eq', name: '解一元二次方程', group: '方程与代数', gen: genEq },
        { id: 'complete', name: '配方法 / 直接开平方', group: '方程与代数', gen: genComplete },
        { id: 'eqdef', name: '一元二次方程识别', group: '方程与代数', gen: genEqDef },
        { id: 'disc', name: '判别式', group: '方程与代数', gen: genDisc },
        { id: 'vieta', name: '韦达定理', group: '方程与代数', gen: genVieta },
        { id: 'growth', name: '增长率与传播', group: '方程与代数', gen: genGrowth },
        { id: 'areaeq', name: '面积问题', group: '方程与代数', gen: genAreaEq },
        /* —— 二次函数 —— */
        { id: 'vertexprop', name: '二次函数顶点', group: '二次函数', gen: genVertexProp },
        { id: 'vertexmax', name: '顶点式最值', group: '二次函数', gen: genVertexMax },
        { id: 'coef', name: '二次函数系数', group: '二次函数', gen: genCoef },
        { id: 'plug', name: '二次函数代值', group: '二次函数', gen: genPlug },
        { id: 'shift', name: '抛物线平移', group: '二次函数', gen: genShift },
        { id: 'rangemax', name: '闭区间最值', group: '二次函数', gen: genRangeMax },
        { id: 'fxeq', name: '二次函数与一元二次方程', group: '二次函数', gen: genFxEq },
        /* —— 反比例函数 —— */
        { id: 'invprop', name: '反比例·性质', group: '反比例函数', gen: genInvProp },
        { id: 'invarea', name: '反比例·面积', group: '反比例函数', gen: genInvArea },
        /* —— 圆：概念 → 三条辅助线 → 两个易忘推论 → 29.2–29.3 的弧与扇形 —— */
        { id: 'circledef', name: '圆的基本概念', group: '圆', gen: genCircleDef },
        { id: 'ptcirc', name: '点与圆的位置关系', group: '圆', gen: genPtCirc },
        { id: 'circum', name: '直角三角形外接圆', group: '圆', gen: genCircum },
        { id: 'radiusiso', name: '连半径得等腰', group: '圆', gen: genRadiusIso },
        { id: 'perpchord', name: '垂径定理', group: '圆', gen: genPerpChord },
        { id: 'diam90', name: '直径所对圆周角', group: '圆', gen: genDiam90 },
        { id: 'cycquad', name: '圆内接四边形', group: '圆', gen: genCycQuad },
        { id: 'circangle', name: '圆周角定理', group: '圆', gen: genCircAngle },
        { id: 'arcchord', name: '弧、弦、圆心角', group: '圆', gen: genArcChord },
        { id: 'arclen', name: '弧长', group: '圆', gen: genArcLen },
        { id: 'sector', name: '扇形面积', group: '圆', gen: genSector },
        { id: 'cone', name: '圆锥的侧面积', group: '圆', gen: genCone },
        /* —— 直线与圆（第 30 章） —— */
        { id: 'linecircle', name: '直线与圆的位置关系', group: '直线与圆', gen: genLineCircle },
        { id: 'tanprop', name: '切线的性质', group: '直线与圆', gen: genTanProp },
        { id: 'tanjudge', name: '切线的判定', group: '直线与圆', gen: genTanJudge },
        { id: 'tanlen', name: '切线长定理', group: '直线与圆', gen: genTanLen },
        { id: 'incircle', name: '三角形的内切圆', group: '直线与圆', gen: genIncircle },
        { id: 'regular', name: '正多边形与圆', group: '直线与圆', gen: genRegular },
        /* —— 图形与变换 —— */
        { id: 'rot', name: '旋转后坐标', group: '图形与变换', gen: genRot },
        { id: 'sym', name: '中心对称点', group: '图形与变换', gen: genSym },
        { id: 'symshape', name: '对称图形判断', group: '图形与变换', gen: genSymShape },
        { id: 'path', name: '最短路径', group: '图形与变换', gen: genPath },
        /* —— 推理与证明 —— */
        { id: 'absurd', name: '反证法第一步', group: '推理与证明', gen: genAbsurd }
      ]
    },
    {
      id: 'write', name: '写解析式', icon: '✍️',
      desc: '从条件写出解析式：设 → 代 → 求。补的是「会读图、不会写式」这一断点；含拱桥建模与「对称轴 + 一点」求一般式。',
      kinds: [
        { id: 'vertex', name: '顶点式求 a', gen: genVertex },
        { id: 'intercept', name: '交点式写解析式', gen: genIntercept },
        { id: 'inverse', name: '反比例求 k', gen: genInverse },
        { id: 'profit', name: '利润建模（涨/降价）', gen: genProfit },
        { id: 'segment', name: '线段解析式', gen: genSegment },
        { id: 'piece', name: '分段函数', gen: genPiece },
        { id: 'arch', name: '拱桥建模', gen: genArch },
        { id: 'axis', name: '对称轴求一般式', gen: genAxis }
      ]
    },
    {
      id: 'entry', name: '大题前两步', icon: '🚪',
      desc: '只写每道大题的前 1–2 个得分点，不求解。补的是「大题空白」这一断点；来源：期中卷 20–25、第 11 周卷 13–16/附加、错题本里的大题第一步。',
      items: ENTRY
    }
  ];

  function moduleById(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }

  /* ---------- 出题 ---------- */
  function gen(modId, kindId, seed) {
    var m = moduleById(modId);
    if (!m) throw new Error('未知模块 ' + modId);
    var r = mulberry32((seed >>> 0) || 1);
    if (m.items) {
      var it = m.items[Math.floor(r() * m.items.length)];
      var copy = JSON.parse(JSON.stringify(it));
      copy.mod = modId;
      return copy;
    }
    var k = null;
    if (kindId) for (var i = 0; i < m.kinds.length; i++) if (m.kinds[i].id === kindId) { k = m.kinds[i]; break; }
    if (!k) k = m.kinds[Math.floor(r() * m.kinds.length)];
    var q = k.gen(r);
    q.mod = modId;
    return q;
  }

  /* ---------- 判分 ---------- */
  /* 全排列：只用于 expr 的可互换空位（长度 <= 3），给 judge 用 */
  function permsOf(a) {
    if (a.length <= 1) return [a.slice()];
    var out = [];
    for (var i = 0; i < a.length; i++) {
      var rest = a.slice(0, i).concat(a.slice(i + 1));
      permsOf(rest).forEach(function (p) { out.push([a[i]].concat(p)); });
    }
    return out;
  }

  function judge(q, vals) {
    var res = q.fields.map(function (f, i) {
      var v = vals[i];
      if (f.type === 'choice') return { ok: v === f.ans };
      if (f.type === 'set') {
        /* 无序：因式分解 p、q / 方程的两个根，顺序不限 */
        if (!Array.isArray(v) || v.some(function (x) { return !isFinite(x); })) return { ok: false };
        var wantS = f.ans.slice().sort(function (a, b) { return a - b; });
        var gotS = v.slice().sort(function (a, b) { return a - b; });
        return { ok: wantS.length === gotS.length && wantS.every(function (w, j) { return near(gotS[j], w, f.tol || 1e-9); }) };
      }
      if (f.type === 'expr') {
        /* 有序：写全式按模板空位逐位比；f.free 列出的空位可互换（交点式的两个根） */
        if (!Array.isArray(v) || v.length !== f.ans.length || v.some(function (x) { return !isFinite(x); })) return { ok: false };
        var free = f.free || [], perms = permsOf(free), tol = f.tol || 1e-9;
        for (var pi = 0; pi < perms.length; pi++) {
          var exp = f.ans.slice();
          for (var fk = 0; fk < free.length; fk++) exp[free[fk]] = f.ans[perms[pi][fk]];
          if (exp.every(function (w, j) { return near(v[j], w, tol); })) return { ok: true };
        }
        return { ok: false };
      }
      return { ok: isFinite(v) && near(v, f.ans, f.tol || 1e-6) };
    });
    var got = res.filter(function (x) { return x.ok; }).length;
    return { ok: got === res.length, got: got, total: res.length, res: res };
  }

  function ansText(f) {
    if (f.type === 'choice') return f.options[f.ans];
    if (f.type === 'set') {
      var nm = f.names || ['x1', 'x2'];
      return f.ans.map(function (x, i) { return (nm[i] || ('x' + (i + 1))) + ' = ' + frac(x); }).join('，');
    }
    if (f.type === 'expr') return exprText(f.form, f.ans);
    return nice(f.ans, f.unit || '');
  }
  /* 把 expr 的若干个数拼回完整式子（反馈里显示用） */
  function exprText(form, v) {
    if (form === 'vertex') {
      var h = v[1], k = v[2];
      return 'y = ' + frac(v[0]) + '(x ' + (h >= 0 ? '− ' + frac(h) : '+ ' + frac(-h)) + ')² ' + (k >= 0 ? '+ ' + frac(k) : '− ' + frac(-k));
    }
    if (form === 'line') {
      var kk = v[0], bb = v[1];
      return 'y = ' + (kk === 1 ? '' : (kk === -1 ? '−' : frac(kk))) + 'x ' + (bb >= 0 ? '+ ' + frac(bb) : '− ' + frac(-bb));
    }
    if (form === 'intercept') {
      return 'y = ' + frac(v[0]) +
        '(x ' + (v[1] >= 0 ? '− ' + frac(v[1]) : '+ ' + frac(-v[1])) + ')' +
        '(x ' + (v[2] >= 0 ? '− ' + frac(v[2]) : '+ ' + frac(-v[2])) + ')';
    }
    if (form === 'general') {
      return 'y = ' + poly2(v[0], v[1], v[2]);
    }
    return 'y = ' + v.map(frac).join(' , ');
  }

  /* ---------- 图象：答完后画出来，做「式子 ↔ 图」的验证 ---------- */
  function niceStep(span) {
    var raw = span / 6, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / p;
    var s = n <= 1 ? 1 : (n <= 2 ? 2 : (n <= 5 ? 5 : 10));
    return s * p;
  }
  function num(v) { return Math.round(v * 1000) / 1000; }

  function svgFor(q) {
    var f = q.fig;
    if (!f) return '';
    var W = 360, H = 280, PAD = 30;
    var paths = [], dots = (f.dots || []).map(function (d) { return { x: d[0], y: d[1], label: d[2] || '' }; });
    var all = [];

    function addPath(arr) {
      if (!arr.length) return;
      paths.push(arr);
      arr.forEach(function (p) { all.push({ x: p[0], y: p[1] }); });
    }
    /* f.ghost：平移/变换题里「原来的那条抛物线」，画成浅灰虚线垫在下面 */
    var ghosts = [];
    function paraPts(g) {
      var sp = Math.min(4.2, Math.sqrt(9 / Math.abs(g.a)) || 3);
      var out = [];
      for (var i = 0; i <= 120; i++) {
        var x = g.h - sp + 2 * sp * i / 120;
        out.push([x, g.a * (x - g.h) * (x - g.h) + g.k]);
      }
      return out;
    }
    (f.ghost || []).forEach(function (g) {
      var arr = paraPts(g);
      ghosts.push(arr);
      arr.forEach(function (p) { all.push({ x: p[0], y: p[1] }); });
    });

    if (f.type === 'parabola') {
      var a = f.a, h = f.h, k = f.k;
      var span = Math.min(4.2, Math.sqrt(9 / Math.abs(a)) || 3);
      var lo = h - span, hi = h + span;
      /* 横坐标范围必须盖住要标的点（两根 / 顶点 / 已知点），否则曲线会在 x 轴上方断掉 */
      dots.forEach(function (d) {
        if (!isFinite(d.x)) return;
        lo = Math.min(lo, d.x - 0.5);
        hi = Math.max(hi, d.x + 0.5);
      });
      var xr = f.xr || [Math.max(h - 9, lo), Math.min(h + 9, hi)];
      var arr = [];
      for (var i = 0; i <= 120; i++) {
        var x = xr[0] + (xr[1] - xr[0]) * i / 120;
        arr.push([x, a * (x - h) * (x - h) + k]);
      }
      addPath(arr);
    } else if (f.type === 'hyperbola') {
      var m = f.xr ? Math.abs(f.xr[1]) : 6;
      [-1, 1].forEach(function (sg) {
        var arr2 = [];
        for (var j = 0; j <= 48; j++) {
          var x2 = sg * (0.3 + (m - 0.3) * j / 48);
          arr2.push([x2, f.k / x2]);
        }
        addPath(arr2);
      });
    } else if (f.type === 'segment') {
      addPath([[f.x1, f.y1], [f.x2, f.y2]]);
    } else if (f.type === 'piece') {
      var arr3 = [];
      for (var t = 0; t <= 30; t++) { var x3 = f.t1 * t / 30; arr3.push([x3, f.k1 * x3 + f.b1]); }
      addPath(arr3);
      var arr4 = [];
      for (var u = 0; u <= 40; u++) { var x4 = f.t1 + f.t1 * 2 * u / 40; arr4.push([x4, f.k2 / x4]); }
      addPath(arr4);
    }

    var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    all.concat(dots).forEach(function (p) {
      if (!isFinite(p.x) || !isFinite(p.y)) return;
      xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x);
      ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y);
    });
    if (!isFinite(xmin)) return '';
    if (f.type === 'points') { xmin = Math.min(xmin, 0); xmax = Math.max(xmax, 0); ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0); }

    var xspan = Math.max(1, xmax - xmin), yspan = Math.max(1, ymax - ymin);
    xmin -= xspan * 0.08; xmax += xspan * 0.08;
    ymin -= yspan * 0.08; ymax += yspan * 0.08;

    function sx(x) { return PAD + (x - xmin) / (xmax - xmin) * (W - 2 * PAD); }
    function sy(y) { return H - PAD - (y - ymin) / (ymax - ymin) * (H - 2 * PAD); }

    var s = [];
    s.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="题图">');
    s.push('<rect width="' + W + '" height="' + H + '" fill="#fbfcff" rx="10"/>');

    var step = niceStep(Math.max(xmax - xmin, ymax - ymin));
    var gx, gy;
    for (gx = Math.ceil(xmin / step) * step; gx <= xmax; gx += step) {
      s.push('<line x1="' + num(sx(gx)) + '" y1="' + PAD + '" x2="' + num(sx(gx)) + '" y2="' + (H - PAD) + '" stroke="#eef1f8"/>');
    }
    for (gy = Math.ceil(ymin / step) * step; gy <= ymax; gy += step) {
      s.push('<line x1="' + PAD + '" y1="' + num(sy(gy)) + '" x2="' + (W - PAD) + '" y2="' + num(sy(gy)) + '" stroke="#eef1f8"/>');
    }

    var x0 = (ymin < 0 && ymax > 0) ? sy(0) : (H - PAD);
    var y0 = (xmin < 0 && xmax > 0) ? sx(0) : PAD;
    s.push('<line x1="' + PAD + '" y1="' + num(x0) + '" x2="' + (W - PAD) + '" y2="' + num(x0) + '" stroke="#9aa3b5" stroke-width="1.2"/>');
    s.push('<line x1="' + num(y0) + '" y1="' + PAD + '" x2="' + num(y0) + '" y2="' + (H - PAD) + '" stroke="#9aa3b5" stroke-width="1.2"/>');
    s.push('<text x="' + (W - PAD + 2) + '" y="' + (num(x0) - 4) + '" font-size="11" fill="#6b7280">x</text>');
    s.push('<text x="' + (num(y0) + 5) + '" y="' + (PAD + 8) + '" font-size="11" fill="#6b7280">y</text>');
    s.push('<text x="' + (num(y0) - 10) + '" y="' + (num(x0) + 13) + '" font-size="10" fill="#9aa3b5">O</text>');

    for (gx = Math.ceil(xmin / step) * step; gx <= xmax; gx += step) {
      if (Math.abs(gx) < step / 2) continue;
      s.push('<text x="' + num(sx(gx)) + '" y="' + (num(x0) + 12) + '" font-size="9" fill="#9aa3b5" text-anchor="middle">' + num(gx) + '</text>');
    }
    for (gy = Math.ceil(ymin / step) * step; gy <= ymax; gy += step) {
      if (Math.abs(gy) < step / 2) continue;
      s.push('<text x="' + (num(y0) - 6) + '" y="' + (num(sy(gy)) + 3) + '" font-size="9" fill="#9aa3b5" text-anchor="end">' + num(gy) + '</text>');
    }

    ghosts.forEach(function (arr) {
      var d = arr.map(function (p, i) { return (i ? 'L' : 'M') + num(sx(p[0])) + ' ' + num(sy(p[1])); }).join(' ');
      s.push('<path d="' + d + '" fill="none" stroke="#b9c0cf" stroke-width="1.8" stroke-dasharray="6 4" stroke-linecap="round"/>');
    });
    paths.forEach(function (arr) {
      var d = arr.map(function (p, i) { return (i ? 'L' : 'M') + num(sx(p[0])) + ' ' + num(sy(p[1])); }).join(' ');
      s.push('<path d="' + d + '" fill="none" stroke="#3b6fe0" stroke-width="2.2" stroke-linecap="round"/>');
    });

    if (f.type === 'points') {
      if (f.rays) {
        dots.forEach(function (p) {
          s.push('<line x1="' + num(sx(0)) + '" y1="' + num(sy(0)) + '" x2="' + num(sx(p.x)) + '" y2="' + num(sy(p.y)) + '" stroke="#e37400" stroke-width="1.4" stroke-dasharray="4 4"/>');
        });
      } else if (!f.dashes) {
        var c = f.dots[0], c2 = f.dots[1];
        if (c && c2) {
          s.push('<line x1="' + num(sx(c[0])) + '" y1="' + num(sy(c[1])) + '" x2="' + num(sx(c2[0])) + '" y2="' + num(sy(c2[1])) + '" stroke="#e37400" stroke-width="1.4" stroke-dasharray="4 4"/>');
        }
      }
    }

    /* 虚线：|k| 面积题里从点向坐标轴作垂线 */
    (f.dashes || []).forEach(function (seg) {
      s.push('<line x1="' + num(sx(seg[0][0])) + '" y1="' + num(sy(seg[0][1])) + '" x2="' + num(sx(seg[1][0])) + '" y2="' + num(sy(seg[1][1])) + '" stroke="#e37400" stroke-width="1.4" stroke-dasharray="4 4"/>');
    });

    dots.forEach(function (p) {
      s.push('<circle cx="' + num(sx(p.x)) + '" cy="' + num(sy(p.y)) + '" r="3.6" fill="#e37400" stroke="#fff" stroke-width="1.2"/>');
      if (p.label) {
        s.push('<text x="' + num(sx(p.x) + 6) + '" y="' + num(sy(p.y) - 7) + '" font-size="10.5" fill="#a15c00" font-weight="600">' + p.label + '</text>');
      }
    });

    s.push('</svg>');
    return s.join('');
  }

  /* ---------- 自检：每个生成器跑 N 遍，正确解必须判对、错解必须判错 ---------- */
  function selfTest(n) {
    n = n || 120;
    var fails = [], count = 0;
    MODULES.forEach(function (m) {
      var cases = m.items ? m.items : m.kinds;
      cases.forEach(function (c) {
        for (var s = 1; s <= n; s++) {
          var q;
          try { q = m.items ? JSON.parse(JSON.stringify(c)) : c.gen(mulberry32(s * 7919 + 13)); }
          catch (e) { fails.push(c.id + ' 生成异常: ' + e.message); continue; }
          count++;
          var tag = (c.id || c.title) + '#' + s;
          if (!q.prompt || /undefined|NaN/.test(q.prompt)) fails.push(tag + ' 题干异常');
          if (q.fig) {
            var svg = svgFor(q);
            if (svg.indexOf('<svg') !== 0) fails.push(tag + ' 图象为空');
            else if (/NaN|undefined/.test(svg)) fails.push(tag + ' 图象含 NaN');
          }
          if (!q.fields || !q.fields.length) { fails.push(tag + ' 无字段'); continue; }
          q.fields.forEach(function (f) {
            if (f.type === 'num' && !isFinite(f.ans)) fails.push(tag + ' 答案非数字');
            if (f.type === 'choice' && !(f.ans >= 0 && f.ans < f.options.length)) fails.push(tag + ' 选项越界');
            if (f.type === 'set' && !Array.isArray(f.ans)) fails.push(tag + ' set 答案异常');
            if (f.type === 'expr') {
              if (!Array.isArray(f.ans)) fails.push(tag + ' expr 答案异常');
              else if (!f.tpl || f.tpl.split('{}').length - 1 !== f.ans.length) fails.push(tag + ' expr 模板与空数不一致');
            }
          });
          var right = q.fields.map(function (f) {
            return f.type === 'choice' ? f.ans : ((f.type === 'set' || f.type === 'expr') ? f.ans.slice() : f.ans);
          });
          if (!judge(q, right).ok) fails.push(tag + ' 正确解被判错');
          var wrong = q.fields.map(function (f) {
            if (f.type === 'choice') return (f.ans + 1) % f.options.length;
            if (f.type === 'set' || f.type === 'expr') return f.ans.map(function (x) { return x + 1; });
            return f.ans + 1;
          });
          if (judge(q, wrong).ok) fails.push(tag + ' 错误解被判对');
          /* expr 必须按空位顺序判分：前两个空互换后，只有「与所有允许排列数值上都不同」时才断言判错 */
          q.fields.forEach(function (f, fi) {
            if (f.type !== 'expr' || f.ans.length < 2) return;
            var free = f.free || [];
            if (free.indexOf(0) >= 0 && free.indexOf(1) >= 0) return;
            var perm = right.slice();
            perm[fi] = f.ans.slice();
            perm[fi][0] = f.ans[1]; perm[fi][1] = f.ans[0];
            var allowed = [f.ans.slice()];
            if (free.length) {
              allowed = permsOf(free).map(function (pp) {
                var arr = f.ans.slice();
                for (var z = 0; z < free.length; z++) arr[free[z]] = f.ans[pp[z]];
                return arr;
              });
            }
            var same = allowed.some(function (arr) { return arr.every(function (w, j) { return near(perm[fi][j], w, 1e-9); }); });
            if (!same && judge(q, perm).ok) fails.push(tag + ' expr 空位互换仍判对（应判错）');
          });
        }
      });
    });
    return { count: count, fails: fails };
  }

  /* =====================================================================
     今日任务：规则 + 当天固定题单（纯函数，可在 node 里单测）
     规则（页面「今日任务的规则」同步显示）：
     ① 一天一套：题由「日期种子」生成，同一天打开几次都是同一套，换天才换。
     ② 固定配比：基础快练 6 = 因式分解 2 + 解方程 2 + 轮换 2；
        写解析式 8 = 顶点式 2 + 主力 4 + 次主力 2；大题前两步 3；错题回炉按到期。
     ③ 主力轮换：6 类（顶点式→交点式→反比例→线段→分段→利润）按日期轮，6 天一轮全覆盖。
     ④ 弱项覆盖：最近 8 条写解析式记录里有错题，主力换成错题那一类。
     ⑤ 难度顺序：先易后难（因式分解 → 方程 → 轮换；顶点式 → 主力 → 次主力）。
     ⑥ 同一套内题干不重复。
     ===================================================================== */
  var WRITE_ROT = ['vertex', 'intercept', 'inverse', 'segment', 'piece', 'profit', 'arch', 'axis'];
  function daySeed(key) {
    var h = 2166136261, k = String(key);
    for (var i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function kindsOf(modId) {
    var m = moduleById(modId);
    return (m && m.kinds) ? m.kinds.map(function (x) { return x.id; }) : [];
  }
  function kindName(modId, id) {
    var m = moduleById(modId);
    if (m && m.kinds) for (var i = 0; i < m.kinds.length; i++) if (m.kinds[i].id === id) return m.kinds[i].name;
    return id;
  }
  function dayIndex(key) {
    var p = String(key).split('-');
    return Math.floor(Date.UTC(+p[0], (+p[1]) - 1, +p[2]) / 86400000);
  }
  /* 把 kinds 数组按「首次出现顺序」汇总成「因式分解 2 · 解方程 2 · 判别式 2」 */
  function mixText(modId, kinds) {
    var seen = [], cnt = {};
    kinds.forEach(function (id) { if (cnt[id] == null) { cnt[id] = 0; seen.push(id); } cnt[id]++; });
    return seen.map(function (id) { return kindName(modId, id) + ' ' + cnt[id]; }).join(' · ');
  }
  function planForDay(key, weakKind) {
    var seed = daySeed(key);
    /* 轮换顺序以 WRITE_ROT 为准（页面文案写的也是这个顺序），不是模块注册顺序 */
    var rot = WRITE_ROT.filter(function (id) { return kindsOf('write').indexOf(id) >= 0; });
    if (!rot.length) rot = kindsOf('write');
    var di = dayIndex(key);
    var main = (weakKind && rot.indexOf(weakKind) >= 0) ? weakKind : rot[((di % rot.length) + rot.length) % rot.length];
    var second = rot[(rot.indexOf(main) + 1) % rot.length];
    var dk = kindsOf('drill').filter(function (id) { return id !== 'factor' && id !== 'eq'; });
    var extra = dk.length ? dk[seed % dk.length] : 'eq';
    var drillKinds = ['factor', 'factor', 'eq', 'eq', extra, extra];
    var writeKinds = ['vertex', 'vertex', main, main, main, main, second, second];
    var drillNote = mixText('drill', drillKinds), writeNote = mixText('write', writeKinds);
    return {
      day: key, seed: seed, main: main, second: second, weak: !!(weakKind && rot.indexOf(weakKind) >= 0),
      drill: { n: 6, kinds: drillKinds, note: drillNote },
      write: { n: 8, kinds: writeKinds, note: writeNote },
      entry: { n: 3, kinds: [] },
      wrong: { n: 1 },
      note: '基础快练 6：' + drillNote + '；写解析式 8：' + writeNote + '；大题前两步 3；错题回炉按到期。'
    };
  }
  /* 同一套内的去重键：题干 + 选项（选择题题干固定，靠选项区分） */
  function qKey(q) {
    return q.prompt + '|' + JSON.stringify(q.fields);
  }
  /* 当天固定题单：同 key 同 plan 必然同一套；同一套内题干不重复 */
  function dailyQueue(modId, plan) {
    var p = plan[modId] || plan.write;
    var out = [];
    if (modId === 'entry') {
      var items = moduleById('entry').items.map(function (x) { return JSON.parse(JSON.stringify(x)); });
      var r = mulberry32(plan.seed ^ 0x5bf03635);
      items = items.map(function (x) { return { x: x, k: r() }; })
        .sort(function (a, b) { return a.k - b.k; })
        .map(function (o) { return o.x; });
      return items.slice(0, p.n);
    }
    var used = {};
    for (var i = 0; i < p.n; i++) {
      var kindId = p.kinds[i] || p.kinds[0];
      var q = null, guard = 0;
      do {
        q = gen(modId, kindId, (plan.seed + i * 7919 + guard * 104729) >>> 0);
        guard++;
      } while (used[qKey(q)] && guard < 12);
      used[qKey(q)] = 1;
      out.push(q);
    }
    return out;
  }

  return {
    VERSION: VERSION, DAY: DAY,
    modules: MODULES, moduleById: moduleById,
    planForDay: planForDay, dailyQueue: dailyQueue, daySeed: daySeed, kindName: kindName,
    gen: gen, judge: judge, ansText: ansText, svgFor: svgFor,
    parseNum: parseNum, near: near, frac: frac, nice: nice,
    selfTest: selfTest
  };
})();
