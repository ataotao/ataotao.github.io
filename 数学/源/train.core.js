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

  /* ---------- 原题裁切图（第 12 周 11.18 卷 + 11.25 圆2 卷，2026-11-27） ----------
     图放在 数学/源/week12-img.js 与 数学/源/week13-img.js（构建各内联成一段 <script id="data">），
     只给「小测错题」用：每道练习点旁边显示卷面原题，点「不会」时连图带解析一起看。
     没有这些全局（如 check-training 只抽 core）就返回 null——不画图，其余照跑。 */
  var WEEK_IMG = {};
  (function () {
    var src = [
      [typeof W12_IMG !== 'undefined' ? W12_IMG : null, ''],
      [typeof W13_IMG !== 'undefined' ? W13_IMG : null, 'w13-']
    ];
    for (var i = 0; i < src.length; i++) {
      var obj = src[i][0], pre = src[i][1];
      if (!obj) continue;
      for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) WEEK_IMG[pre + k] = obj[k];
    }
  })();
  function cropFig(c) {
    var im = (c && c.key) ? WEEK_IMG[c.key] : null;
    if (!im) return null;
    return {
      w: im.w, h: im.h, need: 1, cap: c.cap,
      /* 同时写 href 与 xlink:href：老一点的安卓 WebView（微信 X5 等）只认 xlink 版本 */
      svg: '<image href="' + im.uri + '" xlink:href="' + im.uri + '" x="0" y="0" width="' + im.w + '" height="' + im.h + '" preserveAspectRatio="xMidYMid meet"/>'
    };
  }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim()
      .replace(/[−－—–]/g, '-').replace(/[／]/g, '/').replace(/[，,]/g, '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    if (!s) return NaN;
    /* 带分数必须在删空格之前认：否则「2 1/2」会被拼成「21/2」= 10.5，静默判错 */
    var mixed = s.match(/^([-+]?)(\d+)\s+(\d+)\s*\/\s*([-+]?\d+)$/);
    if (mixed) {
      var mden = parseFloat(mixed[4]);
      if (!mden) return NaN;
      var mval = parseFloat(mixed[2]) + parseFloat(mixed[3]) / mden;
      return mixed[1] === '-' ? -mval : mval;
    }
    s = s.replace(/\s+/g, '');
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
  /* 系数位只写一个「−」= −1：模板里这个空紧挨着 x / x² / (x（如 y = {}(x − {})² + {}），
     所以 y = −(x − 3)² 和 y = −1(x − 3)² 是同一个式子，孩子照课本那样敲一个负号不能判错。
     其它空位（h、k、常数项）不享受这条：那里省掉数字，「−」就没有系数可代表，该判错。
     判定不靠题型白名单，靠模板里紧跟这个空的那个字符——以后新加 expr 题型自动适用。 */
  function isCoefSlot(f, j) {
    if (!f || f.type !== 'expr' || !f.tpl) return false;
    var after = String(f.tpl).split('{}')[j + 1];
    return !!after && /^[x(]/.test(after.replace(/^\s+/, ''));
  }
  /* 一个空的原始输入 → 判分用的数。提交、订正、自检都走这里，不许各自 parseNum。 */
  function slotVal(f, j, raw) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, '');
    if (/^[-−－—–﹣]$/.test(s) && isCoefSlot(f, j)) return -1;
    return parseNum(s);
  }
  function fieldVals(f, raw) {
    if (f.type === 'expr') return (raw || []).map(function (o, j) { return slotVal(f, j, o); });
    if (f.type === 'set') return (raw || []).map(parseNum);
    return parseNum(raw);
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
    var ds = [-6, -4, -3, -2, -1, 1, 2, 3, 4, 6].filter(function (v) { return k % v === 0 && v !== x0; });
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
    /* 从 t1+1 起找：xc 若等于转折点 t1，第 4 问的答案就是题干里的 (t1, y1)，等于白送 */
    for (var xv = t1 + 1; xv <= Math.floor(3 * t1); xv++) { if (k2 % xv === 0) cands.push(xv); }
    var xc = cands.length ? pick(r, cands) : 2 * t1;
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
    /* b = p+q = 0 时题干是 x²−k，考的是平方差，不是标题写的十字相乘 */
    if (p + q === 0) q = q > 0 ? q + 1 : q - 1;
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
        { type: 'num', label: '不同实数根的个数 =', ans: cnt }
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

  /* 缺常数项（形如 x² − 2021x = 0）：先提公因式，别两边同除以 x。
     第 12 周卷第 13 题 (1) 就是这一类——第 (2) 题她会配方，第 (1) 题换了形式就卡住。
     现有题型都绕开了它：genFactor 的两根都不为 0，genComplete 还特意把 c = 0 排除，
     genEq 虽然偶尔抽出 0 根，但题干不带「缺常数项」的提示，孩子认不出这是一个题型。 */
  var MISSING_CONST = [
    { a: 1, b: 2021 }, { a: 1, b: 7 }, { a: 1, b: 15 }, { a: 1, b: 3 },
    { a: 2, b: 5 }, { a: 3, b: 6 }, { a: 5, b: 2 }, { a: 4, b: 3 }
  ];
  function genMissingConst(r) {
    var v = ri(r, 0, 2);
    if (v === 2) {
      /* 整体提公因式：(x − m)² = k(x − m) */
      var m = ri(r, 2, 6), kk = pick(r, [2, 3, 4, 5]);
      var right = '把 (x − ' + m + ') 看成一个整体，移项后提公因式';
      var opts = shuffle(r, [right, '两边同除以 (x − ' + m + ')', '直接开平方', '用求根公式硬算']);
      return {
        id: 'drill.missingconst', kind: 'missingconst', title: '缺常数项：提公因式',
        prompt: '解方程：' + binom(m) + '² = ' + kk + binom(m) + '（两个根都填，顺序不限）。' +
          '<br><span class="muted small">这一类先把公因式提出来，两边不能直接除。</span>',
        fields: [
          { type: 'choice', label: '第一步做什么', options: opts, ans: opts.indexOf(right) },
          { type: 'set', n: 2, label: '两个根', ans: [m, m + kk], names: ['x₁', 'x₂'] }
        ],
        tip: '把 (x − m) 看成一个整体 a：a² = k·a ⟹ a(a − k) = 0 ⟹ a = 0 或 a = k。别两边除以 a，会把它等于 0 的那个根除掉。',
        explain: ['移项：' + binom(m) + '² − ' + kk + ' ' + binom(m) + ' = 0。',
          '提公因式 ' + binom(m) + '：' + binom(m) + '[' + binom(m) + ' − ' + kk + '] = 0。',
          '所以 ' + binom(m) + ' = 0 或 ' + binom(m) + ' = ' + kk + '，即 x₁ = ' + m + '，x₂ = ' + (m + kk) + '。',
          '坑：两边同除以 ' + binom(m) + '，就只剩 x₂ = ' + (m + kk) + '，把 x₁ = ' + m + ' 弄丢了。'],
        kp: ['一元二次方程', '因式分解法', '整体思想']
      };
    }
    var t = pick(r, MISSING_CONST), a = t.a, b = t.b, x2 = b / a;
    var right2 = '提出公因式 x';
    var opts2 = shuffle(r, [right2, '两边同除以 x', '配方', '用求根公式']);
    return {
      id: 'drill.missingconst', kind: 'missingconst', title: '缺常数项：提公因式',
      prompt: '解方程：' + poly2(a, -b, 0) + ' = 0（两个根都填，顺序不限）。' +
        '<br><span class="muted small">来源：第 12 周限时练习（11.18）第 13 题 (1) 的形式——缺常数项。</span>',
      fields: [
        { type: 'choice', label: '第一步做什么', options: opts2, ans: opts2.indexOf(right2) },
        { type: 'set', n: 2, label: '两个根', ans: [0, x2], names: ['x₁', 'x₂'] }
      ],
      tip: '缺常数项（c = 0）就提公因式 x：x(ax − b) = 0 ⟹ x = 0 或 ax − b = 0。千万别两边同除以 x。',
      explain: [poly2(a, -b, 0) + ' = 0 ⟹ 提公因式 x：x(' + leadCoef(a) + 'x − ' + b + ') = 0。',
        '所以 x = 0 或 ' + leadCoef(a) + 'x − ' + b + ' = 0，得 x = ' + frac(x2) + '。',
        '两个根：x₁ = 0，x₂ = ' + frac(x2) + '。',
        '坑：两边同除以 x 只剩 x = ' + frac(x2) + '，把 x = 0 这个根丢掉了——这是第 13 题 (1) 最容易丢的分。'],
      kp: ['一元二次方程', '因式分解法', '缺常数项']
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

  /* 对称点坐标：三种对称各列一张表（名称/答案/规则/知识点同一行），避免平行数组错位。
     关于 y 轴横坐标要变号（反射轴是 y，x 反号）——这一项最容易写漏。 */
  var SYM_CASES = [
    { name: '关于原点中心对称', px: function (x) { return -x; }, py: function (y) { return -y; },
      rule: '(x, y) → (−x, −y)：横纵坐标都变号', kp: '中心对称' },
    { name: '关于 x 轴对称', px: function (x) { return x; }, py: function (y) { return -y; },
      rule: '(x, y) → (x, −y)：只把 y 变号，横坐标不变', kp: '轴对称' },
    { name: '关于 y 轴对称', px: function (x) { return -x; }, py: function (y) { return y; },
      rule: '(x, y) → (−x, y)：只把 x 变号，纵坐标不变', kp: '轴对称' }
  ];
  function genSym(r) {
    var x = ri(r, -5, 5), y = ri(r, -5, 5);
    var t = pick(r, SYM_CASES);
    var px = t.px(x), py = t.py(y);
    return {
      id: 'drill.sym', kind: 'sym', title: '对称点坐标',
      prompt: '点 P(' + d(x) + ', ' + d(y) + ') ' + t.name + '的点是 P′。',
      fields: [
        { type: 'num', label: 'P′ 的横坐标 =', ans: px },
        { type: 'num', label: 'P′ 的纵坐标 =', ans: py }
      ],
      tip: '关于原点对称：横纵坐标都变号；关于 x 轴对称：x 不变、y 变号；关于 y 轴对称：y 不变、x 变号。',
      explain: [t.name + '：' + t.rule + '，所以 P′(' + d(px) + ', ' + d(py) + ')。'],
      fig: { type: 'points', dots: [[x, y, 'P'], [px, py, 'P′']] },
      kp: ['图形的变换', t.kp]
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
    none: ['一般三角形', '不等腰的直角三角形']
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
    '不等腰的直角三角形': '既没有对称轴，也不能旋转 180° 重合（等腰直角三角形才有一条对称轴）。'
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
    { s: '圆内接四边形的对角互补', why: '一组对角所对的两段弧合起来是整个圆，两角和 = 360° ÷ 2 = 180°' },
    { s: '在同心圆中，同一圆心角所对的两条弧的度数相等', why: '弧的度数只由圆心角决定，与半径无关；半径不同只影响弧长' },
    { s: '平分弦（不是直径）的直径垂直于这条弦', why: '垂径定理的推论；被平分的弦若是直径则结论不成立' }
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
    { s: '直径所对的圆周角是 180°', why: '是 90°：直径当斜边，直角在圆上那一点' },
    { s: '相等的弦所对的弧相等', why: '缺少「在同圆或等圆中」的前提；同圆内一条弦还对着优弧、劣弧两条弧' },
    { s: '平分弦的直径平分弦所对的两条弧', why: '被平分的弦若是直径则不一定成立；要注明弦不是直径' }
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
  /* 静态题（ENTRY）的选项位置也要打散：写死 ans:0 时「依据」类选择题一路点 A 就能拿 90% */
  function shuffleChoices(q, r) {
    (q.fields || []).forEach(function (f) {
      if (f.type !== 'choice' || !f.options || f.options.length < 2) return;
      var right = f.options[f.ans];
      var opts = shuffle(r, f.options);
      f.options = opts;
      f.ans = opts.indexOf(right);
    });
    return q;
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
  /* ---------- 第 12 周限时练习（11.18）补的四个考点缺口 ---------- */

  /* 扇形周长 = 弧长 + 两条半径：l = nπr/180，C = l + 2r。答案问 kπ + c 里的 k、c。 */
  var SECPERIM_PAIRS = [[60, 3], [90, 4], [120, 6], [150, 3], [150, 6],
    [180, 4], [135, 4], [90, 6], [120, 3], [180, 6], [45, 8], [90, 12]];
  function genSecPerim(r) {
    var p = pick(r, SECPERIM_PAIRS), n = p[0], rad = p[1];
    var k = n * rad / 180, c = 2 * rad;
    var formula = '弧长 + 2×半径';
    var fopts = shuffle(r, ['弧长 + 2×半径', '弧长 + 半径', '圆周长 − 弧长', '弧长 × 半径']);
    return {
      id: 'drill.secperim', kind: 'secperim', title: '扇形周长',
      prompt: '扇形的圆心角是 ' + n + '°，半径是 ' + rad + '。它的周长写成 kπ + c 的形式，求 k 和 c。',
      fields: [
        { type: 'choice', label: '周长公式', options: fopts, ans: fopts.indexOf(formula) },
        { type: 'num', label: 'k =（可填分数）', ans: k },
        { type: 'num', label: 'c =', ans: c }
      ],
      tip: '扇形周长 = 弧长 + 两条半径：l = nπr/180，C = l + 2r。别只算弧长。',
      explain: ['弧长 l = ' + n + '/360 × 2π × ' + rad + ' = ' + piText(k) + '。',
        '扇形周长还要加两条半径：C = ' + piText(k) + ' + 2 × ' + rad + ' = ' + piText(k) + ' + ' + c + '。',
        '坑：把周长当弧长（漏加 2r），或只加一条半径。'],
      kp: ['圆的基本性质', '弧长', '扇形周长']
    };
  }

  /* 平行弦之间的距离：两弦可能在圆心同侧或异侧，答案有两个（弦心距之差 或 之和）。 */
  var PARALLEL_PAIRS = [
    { R: 10, a: 12, b: 16, d1: 8, d2: 6 },
    { R: 13, a: 10, b: 24, d1: 12, d2: 5 },
    { R: 15, a: 18, b: 24, d1: 12, d2: 9 },
    { R: 17, a: 16, b: 30, d1: 15, d2: 8 },
    { R: 25, a: 14, b: 48, d1: 24, d2: 7 },
    { R: 25, a: 30, b: 40, d1: 20, d2: 15 }
  ];
  function genParallelDist(r) {
    var t = pick(r, PARALLEL_PAIRS);
    var small = Math.abs(t.d1 - t.d2), big = t.d1 + t.d2;
    return {
      id: 'drill.paralleldist', kind: 'paralleldist', title: '平行弦之间的距离',
      prompt: '在半径为 ' + t.R + ' 的 ⊙O 中，弦 AB = ' + t.a + '，弦 CD = ' + t.b + '，且 AB ∥ CD。<br><span class="muted small">两条平行弦可能在圆心同侧，也可能在异侧——答案有两个。</span>',
      fields: [
        (function () {
          var right = '同侧、异侧两种';
          var opts = shuffle(r, [right, '只有同侧一种', '只有异侧一种', '三种']);
          return { type: 'choice', label: '分几种情况', options: opts, ans: opts.indexOf(right) };
        })(),
        { type: 'num', label: '同侧时距离（较小值）=', ans: small },
        { type: 'num', label: '异侧时距离（较大值）=', ans: big }
      ],
      tip: '先分别求两条弦的弦心距 d₁、d₂；同侧相距 |d₁−d₂|，异侧相距 d₁+d₂。漏一种就少一个答案。',
      explain: ['d₁ = √(' + t.R + '² − ' + (t.a / 2) + '²) = ' + t.d1 + '，d₂ = √(' + t.R + '² − ' + (t.b / 2) + '²) = ' + t.d2 + '。',
        '两弦在圆心同侧：距离 = |' + t.d1 + ' − ' + t.d2 + '| = ' + small + '。',
        '两弦在圆心异侧：距离 = ' + t.d1 + ' + ' + t.d2 + ' = ' + big + '。',
        '坑：只算一种情况；或把弦长的一半当弦心距。'],
      kp: ['圆的基本性质', '垂径定理', '弦心距', '平行弦']
    };
  }

  /* 三角形外心：三边垂直平分线的交点（到三顶点距离相等）；锐角在内、直角斜边中点、钝角在外。 */
  function genCircumCenter(r) {
    var t = pick(r, [
      { A: 50, B: 60, pos: 0, why: '锐角三角形，三条垂直平分线交于三角形内部' },
      { A: 90, B: 30, pos: 1, why: '直角三角形，外心是斜边中点' },
      { A: 110, B: 30, pos: 2, why: '钝角三角形，外心在三角形外部' },
      { A: 70, B: 70, pos: 0, why: '三个角都是锐角，外心在内部' },
      { A: 120, B: 25, pos: 2, why: '∠A 是钝角，外心在外部' }
    ]);
    return {
      id: 'drill.circumcenter', kind: 'circumcenter', title: '三角形外心',
      prompt: '△ABC 中 ∠A = ' + t.A + '°，∠B = ' + t.B + '°。它的外心位置在（　）',
      fields: [
        (function () {
          var right = '三边的垂直平分线';
          var opts = shuffle(r, [right, '三个角的角平分线', '三条中线', '三条高']);
          return { type: 'choice', label: '外心是哪三条线的交点', options: opts, ans: opts.indexOf(right) };
        })(),
        { type: 'choice', label: '外心位置', ans: t.pos,
          options: ['三角形内部', '斜边（最长边）中点', '三角形外部', '顶点上'] }
      ],
      tip: '外心 = 三边垂直平分线的交点，到三个顶点距离相等（OA=OB=OC）。锐角在内、直角在斜边中点、钝角在外。',
      explain: ['外心是三边垂直平分线的交点，它到三个顶点的距离相等：OA = OB = OC。',
        '∠C = 180° − ' + t.A + '° − ' + t.B + '° = ' + (180 - t.A - t.B) + '°；' + t.why + '。',
        '坑：把「角平分线交点（内心）」「中线交点（重心）」和外心混起来。'],
      kp: ['圆的基本性质', '三角形外接圆', '外心']
    };
  }

  /* 等边三角形的外接圆：三个顶点三等分圆周，中心角 120°，弧长 = 2πR/3。 */
  function genEquiArc(r) {
    var R = pick(r, [3, 6, 9, 12, 15, 18]);
    return {
      id: 'drill.equiarc', kind: 'equiarc', title: '等边三角形外接圆的弧长',
      prompt: '等边三角形 ABC 的外接圆半径为 ' + R + '，O 为外心。求弧 AB 的长（写成 kπ 的形式）。',
      fields: [
        { type: 'num', label: '圆心角 ∠AOB =', ans: 120, unit: '°' },
        { type: 'num', label: '弧 AB = kπ，k =', ans: 2 * R / 3 }
      ],
      tip: '等边三角形把外接圆三等分：每段弧所对圆心角 120°；弧长 = 120πR/180 = 2πR/3。',
      explain: ['等边三角形三个顶点把圆周三等分，每段弧所对的圆心角 = 360° ÷ 3 = 120°。',
        '弧 AB = 120 × π × ' + R + ' ÷ 180 = ' + frac(2 * R / 3) + 'π。',
        '顺带记住：等边三角形边长 a = √3 R，所以 R = 6 时边长 6√3——这是常见搭配。'],
      kp: ['圆的基本性质', '三角形外接圆', '弧长']
    };
  }

  /* ---------- 第 12 周限时练习（11.18）错题补的四个知识点（2026-11-20） ----------
     第 12 题「关联圆」、第 16 题圆弧拱桥、第 17 题等腰三角形存在性 / 开区间取值范围。
     本卷第 10、11 题的缺口（扇形周长、平行弦距离）11.18 已补，见上一段；这一段只补
     「本轮错题里还没有任何题型覆盖」的四块。题面把位置关系写全，不需要题设图。 */

  /* 关联圆：线段上所有点都在 ⊙E 内或圆上 ⟺ 半径 ≥ 两端点到 E 的距离的较大者。
     取 E 在 CD 的垂直平分线上（EC = ED），于是最小半径 = √(半长² + 到中点距离²)。 */
  var RELATE_TRIOS = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];
  function genRelateCircle(r) {
    var t = pick(r, RELATE_TRIOS), a = t[0], b = t[1], c = t[2];
    var why = '线段上离 E 最远的点必是端点';
    var whyOpts = shuffle(r, [why, '线段的中点离 E 最远', '圆心到中点的距离就等于半径', '只要中点在圆内，整条线段就在圆内']);
    return {
      id: 'drill.relatecircle', kind: 'relatecircle', title: '关联圆（线段与圆）',
      prompt: '在平面直角坐标系中，线段 CD 的两个端点为 C(−' + a + ', 0)、D(' + a + ', 0)，点 E 为 (0, ' + b + ')。' +
        '若线段 CD 上所有的点都在 ⊙E 内或圆上，就称 ⊙E 是线段 CD 的「关联圆」。<br>' +
        '<span class="muted small">来源：第 12 周限时练习（11.18）第 12 题的「关联圆」新定义。</span>',
      fields: [
        { type: 'choice', label: '线段 CD 上哪个点离 E 最远', options: whyOpts, ans: whyOpts.indexOf(why) },
        { type: 'num', label: '⊙E 半径的最小值 =', ans: c },
        { type: 'num', label: '半径取这个最小值时，E 到 CD 中点（原点）的距离 =', ans: b }
      ],
      tip: '新定义题先翻译成式子：线段上所有点在圆内或圆上 ⟺ 半径 ≥ 两端点到圆心的距离中较大的那个。找最远点只看端点。',
      explain: [
        '⊙E 是 CD 的关联圆 ⟺ 线段 CD 上每一点到 E 的距离都 ≤ 半径，即 半径 ≥ max(EC, ED)。',
        'C(−' + a + ', 0)、D(' + a + ', 0) 关于 y 轴对称，EC = ED = √(' + a + '² + ' + b + '²) = ' + c + '。所以半径的最小值就是 ' + c + '。',
        '反过来校验：半径取 ' + c + ' 时，E 到 CD 中点的距离 = √(' + c + '² − ' + a + '²) = ' + b + '，正好是给定高度。',
        '坑：只拿「E 到中点的距离」' + b + ' 当半径，线段两端就落在圆外了——这是第 12 题最容易错的一步。'
      ],
      kp: ['圆的基本性质', '点与圆的位置关系', '新定义', '勾股定理']
    };
  }

  /* 圆弧形拱桥：半径用垂径定理 + 勾股；水位上升后水面宽 = 2√(R² − OE²)，OE = R − 拱高 + 上升高度。 */
  var ARCH_CIRCLE = [
    { a: 8, h: 2, R: 5, rise: 1, OE: 4, EF: 3 },
    { a: 16, h: 4, R: 10, rise: 2, OE: 8, EF: 6 },
    { a: 24, h: 8, R: 13, rise: 7, OE: 12, EF: 5 },
    { a: 30, h: 9, R: 17, rise: 7, OE: 15, EF: 8 },
    { a: 40, h: 10, R: 25, rise: 5, OE: 20, EF: 15 }
  ];
  function genArchCircle(r) {
    var t = pick(r, ARCH_CIRCLE), half = t.a / 2;
    var right = 'R² = (跨度/2)² + (R − 拱高)²';
    var opts = shuffle(r, [right, 'R = 拱高 + 跨度/2', 'R² = 跨度² − 拱高²', 'R = 跨度/2']);
    return {
      id: 'drill.archcircle', kind: 'archcircle', title: '圆弧形拱桥：半径与水面宽',
      prompt: '某桥的主桥拱是圆弧形，跨度 AC = ' + t.a + ' m，拱高 BD = ' + t.h + ' m。' +
        '<br><span class="muted small">来源：第 12 周限时练习（11.18）第 16 题的圆弧桥 A。</span>',
      fields: [
        { type: 'choice', label: '求半径用哪个关系', options: opts, ans: opts.indexOf(right) },
        { type: 'num', label: '半径 R =', ans: t.R, unit: ' m' },
        { type: 'num', label: '水位上升 ' + t.rise + ' m 后，水面宽 =', ans: 2 * t.EF, unit: ' m' }
      ],
      tip: '设半径 R，圆心在拱高的延长线上：R² = (跨度/2)² + (R − 拱高)²。水位上升后水面宽 = 2√(R² − OE²)，其中 OE = R − 拱高 + 上升高度。',
      explain: [
        '设圆心 O 在 BD 的延长线上，半径 R = OA = OB，则 OD = R − ' + t.h + '，AD = ' + t.a + '/2 = ' + half + '。',
        'Rt△ODA：R² = ' + half + '² + (R − ' + t.h + ')²，化简得 ' + (2 * t.h) + 'R = ' + (half * half + t.h * t.h) + '，所以 R = ' + t.R + '（m）。',
        '水位上升 ' + t.rise + ' m 后 OE = ' + t.R + ' − ' + t.h + ' + ' + t.rise + ' = ' + t.OE + '，EF = √(' + t.R + '² − ' + t.OE + '²) = ' + t.EF + '，水面宽 = 2EF = ' + (2 * t.EF) + '（m）。',
        '坑：把拱高当半径；或水位上升时忘了 OE 是在 R − 拱高 的基础上再往上加。'
      ],
      kp: ['圆的基本性质', '垂径定理', '勾股定理', '拱桥建模']
    };
  }

  /* 对称轴上的点构成等腰三角形：三种分类（CP = DP / CP = CD / DP = CD），漏一种就少解。
     抛物线 y = (x − h)² + k：顶点 D(h, k)、与 y 轴交点 C(0, h² + k)、P(h, p)。 */
  var ISO_CASES = [
    { h: 3, k: 0 },    /* 原卷附加题数据：C(0,9)、D(3,0) → p = 5 / 18 */
    { h: 2, k: 0 },    /* C(0,4)、D(2,0) → p = 5/2 / 8 */
    { h: 4, k: 0 },    /* C(0,16)、D(4,0) → p = 17/2 / 32 */
    { h: 2, k: -1 }    /* C(0,3)、D(2,−1) → p = 3/2 / 7 */
  ];
  function genIsoPoint(r) {
    var t = pick(r, ISO_CASES), h = t.h, k = t.k;
    var c = h * h + k;                       /* C(0, c) */
    var p1 = (h * h + 1) / 2 + k;            /* CP = DP */
    var p2 = 2 * c - k;                      /* CP = CD（P 与 D 不重合） */
    var cdTxt = h + '√' + (h * h + 1);       /* CD = h√(h²+1) */
    var cnt = '4 个';
    var cntOpts = shuffle(r, [cnt, '2 个', '3 个', '6 个']);
    var polyTxt = 'y = (x − ' + h + ')²' + (k === 0 ? '' : (k > 0 ? ' + ' + k : ' − ' + (-k)));
    return {
      id: 'drill.isopoint', kind: 'isopoint', title: '对称轴上的点构等腰三角形',
      prompt: '抛物线 ' + polyTxt + ' 的顶点为 D，与 y 轴交于点 C，点 P 是抛物线对称轴上的一点。当 △CDP 是等腰三角形时——' +
        '<br><span class="muted small">来源：第 12 周限时练习（11.18）附加题第 (2) 问。</span>',
      fields: [
        { type: 'choice', label: '满足条件的 P 有几个', options: cntOpts, ans: cntOpts.indexOf(cnt) },
        { type: 'num', label: '当 CP = DP 时，P 的纵坐标 p =', ans: p1 },
        { type: 'num', label: '当 CP = CD 时（P 与 D 不重合），p =', ans: p2 }
      ],
      tip: '等腰三角形要分三种：CP = DP、CP = CD、DP = CD。P 在对称轴上，先设坐标再两点距离平方列方程，别只算一种。',
      explain: [
        polyTxt + '：顶点 D(' + h + ', ' + k + ')，令 x = 0 得 C(0, ' + c + ')。P 在对称轴 x = ' + h + ' 上，设 P(' + h + ', p)。',
        '① CP = DP：' + h + '² + (p − ' + c + ')² = (p − ' + k + ')²，解得 p = ' + frac(p1) + '。',
        '② CP = CD：' + h + '² + (p − ' + c + ')² = ' + h + '² + ' + (h * h) + '²，即 (p − ' + c + ')² = ' + (h * h * h * h) + '，所以 p = ' + c + ' ± ' + (h * h) + '，取 ' + frac(p2) + '（另一个 p = ' + k + ' 就是点 D，舍去）。',
        '③ DP = CD：|p − ' + k + '| = ' + cdTxt + '，得 p = ' + k + ' ± ' + cdTxt + '，两个点（含根号也算两个）。',
        '所以共 1 + 1 + 2 = 4 个点。坑：只写 CP = DP 一种；或把 p = ' + k + '（即点 D）也当作解。'
      ],
      kp: ['二次函数', '对称轴', '等腰三角形存在性', '分类讨论']
    };
  }

  /* 开区间取值范围：顶点在区间内 → 最小值取得到；最大值在较远端点，而端点不在开区间内 → 只能「<」。 */
  var OPEN_CASES = [
    { a: 1, h: 3, k: 2, p: 0, q: 5 },
    { a: 1, h: 1, k: -1, p: 0, q: 4 },
    { a: 2, h: 2, k: 1, p: 0, q: 5 },
    { a: 1, h: 4, k: 1, p: 0, q: 6 },
    { a: 0.5, h: 2, k: 3, p: 0, q: 6 }
  ];
  function genRangeOpen(r) {
    var t = pick(r, OPEN_CASES), a = t.a, h = t.h, k = t.k, p = t.p, q = t.q;
    var yp = a * (p - h) * (p - h) + k, yq = a * (q - h) * (q - h) + k;
    var hi = Math.max(yp, yq), farIsP = yp > yq;
    var polyTxt = 'y = ' + (a === 1 ? '' : (a === 0.5 ? '½' : a)) + '(x − ' + h + ')²' + (k >= 0 ? ' + ' + k : ' − ' + (-k));
    var canTxt = '取不到：x = ' + p + '、' + q + ' 都不在开区间内';
    var canOpts = shuffle(r, [canTxt, '取得到（顶点处）', '取得到（端点处）', '要看 a 的正负']);
    return {
      id: 'drill.rangeopen', kind: 'rangeopen', title: '开区间取值范围',
      prompt: '二次函数 ' + polyTxt + '，当 ' + p + ' < x < ' + q + ' 时，求 y 的取值范围。' +
        '<br><span class="muted small">来源：第 12 周限时练习（11.18）附加题第 (3) 问（原题含参数 a，这里先练不含参数的版本）。</span>',
      fields: [
        { type: 'num', label: '最小值 =', ans: k },
        { type: 'num', label: '最大值（边界值）=', ans: hi },
        { type: 'choice', label: '这个最大值能不能取到', options: canOpts, ans: canOpts.indexOf(canTxt) },
        { type: 'choice', label: '离对称轴更远的是哪个端点', options: ['x = ' + p, 'x = ' + q], ans: farIsP ? 0 : 1 }
      ],
      tip: '先看顶点横坐标在不在 (p, q) 内：在，最小值就是顶点纵坐标；最大值落在离对称轴较远的那个端点上，但端点取不到，所以写成「<」。',
      explain: [
        '对称轴 x = ' + h + '。因为 ' + p + ' < ' + h + ' < ' + q + '，顶点在区间内，所以最小值 = ' + k + '（在 x = ' + h + ' 处取到）。',
        '再把两个端点代进去：y(' + p + ') = ' + yp + '，y(' + q + ') = ' + yq + '，所以最大值只能趋近 ' + hi + '。',
        '但 x = ' + p + ' 和 x = ' + q + ' 都不在开区间 ' + p + ' < x < ' + q + ' 里，' + hi + ' 取不到。',
        '所以取值范围是 ' + k + ' ≤ y < ' + hi + '。坑：右端写成 ≤；或没比较两个端点，直接把顶点当最大值。'
      ],
      kp: ['二次函数', '区间最值', '开区间', '取值范围']
    };
  }

  /* ---------- 第二十九章《圆》单元测试卷（2026-11-21）补的六个考点 ----------
     对照《第二十九章《圆》单元测试卷》（23 题 / 120 分）逐题过了一遍，闪练卡缺这六块：
     ① 弦 = 半径 ⟹ 等边三角形（卷 1、7 题）；② 圆内接四边形外角 = 内对角（19 题）；
     ③ 同心圆被一条弦截出四条线段（16 题）；④ 弓形面积 = 扇形 − 三角形（14、22 题）；
     ⑤ 已知两点和半径，确定圆的个数（6 题）；⑥ 尺规作图找圆心 = 两条轨迹的交点（20 题）。
     每一块都写成「先算哪一步 + 一条易错点」，和前面几批补缺口的写法一致。 */

  /* ① 弦长等于半径：△OAB 三边都是半径 ⟹ 等边 ⟹ 圆心角 60°，圆周角 30°。 */
  function genChordRadius(r) {
    var rad = pick(r, [4, 5, 6, 8, 9, 10, 12, 15, 18]);
    return {
      id: 'drill.chordradius', kind: 'chordradius', title: '弦等于半径（等边三角形）',
      prompt: '⊙O 的半径为 ' + rad + '，弦 AB = ' + rad + '。<br><span class="muted small">先连 OA、OB，判断 △OAB 是什么三角形。</span>',
      fields: [
        { type: 'num', label: '圆心角 ∠AOB =', ans: 60, unit: '°' },
        { type: 'num', label: '圆周角 ∠ACB =', ans: 30, unit: '°' }
      ],
      tip: '连 OA、OB：三条边都等于半径 ⟹ 等边三角形 ⟹ 圆心角 60°；同弧的圆周角再除以 2。',
      explain: ['OA = OB = ' + rad + '（半径），又弦 AB = ' + rad + '，所以 OA = OB = AB，△OAB 是等边三角形。',
        '圆心角 ∠AOB = 60°。',
        '点 C 在优弧上时，∠ACB 与 ∠AOB 对着同一段弧 AB，∠ACB = ½ × 60° = 30°。',
        '记结论：弦 = 半径 ⟺ 圆心角 60°；这条比套弧长公式还省事（卷面第 7 题就是这么出的）。'],
      kp: ['圆的基本性质', '连半径得等腰', '圆周角定理']
    };
  }

  /* ② 圆内接四边形的外角等于内对角：∠EAD + ∠DAB = 180°，∠DAB + ∠BCD = 180° ⟹ ∠EAD = ∠BCD。 */
  var CYCQ_EXT = [95, 100, 105, 110, 115, 120, 130, 85];
  function genCycQuadExt(r) {
    var D = pick(r, CYCQ_EXT);
    return {
      id: 'drill.cycqext', kind: 'cycqext', title: '圆内接四边形·外角',
      prompt: '四边形 ABCD 内接于 ⊙O，E 在 BA 的延长线上，∠BCD = ' + D + '°。<br><span class="muted small">求外角 ∠EAD，以及 ∠BAD。</span>',
      fields: [
        basisField(r, 'cyc', '依据'),
        { type: 'num', label: '外角 ∠EAD =', ans: D, unit: '°' },
        { type: 'num', label: '∠BAD =', ans: 180 - D, unit: '°' }
      ],
      tip: '外角 = 内对角：∠EAD = ∠BCD。∠BAD 与它邻补，所以是 180° − ∠BCD。',
      explain: ['因为 E 在 BA 的延长线上，∠EAD 与 ∠DAB 邻补：∠EAD + ∠DAB = 180°。',
        '四边形 ABCD 内接于 ⊙O，对角互补：∠DAB + ∠BCD = 180°。',
        '两式相减得 ∠EAD = ∠BCD = ' + D + '°（这就是「圆内接四边形外角等于内对角」）。',
        '∠BAD = 180° − ' + D + '° = ' + (180 - D) + '°。坑：把外角算成 ∠BAD 的补角反过来，或者把 ∠EAD 和内角 ∠DAB 搞混。'],
      kp: ['圆的基本性质', '圆内接四边形', '外角等于内对角']
    };
  }

  /* ③ 同心圆：大圆的一条弦交小圆于 C、D，垂径定理对大圆、小圆各用一次 ⟹ AC = BD。 */
  var CONCENTRIC = [[20, 12], [16, 8], [24, 16], [30, 18], [14, 6], [18, 10], [22, 14], [26, 10]];
  function genConcentric(r) {
    var p = pick(r, CONCENTRIC), AB = p[0], CD = p[1];
    var ac = (AB - CD) / 2;
    return {
      id: 'drill.concentric', kind: 'concentric', title: '同心圆·一条弦截两圆',
      prompt: '两个圆的圆心都是 O，大圆的弦 AB 交小圆于 C、D 两点（顺序 A、C、D、B）。AB = ' + AB + '，CD = ' + CD + '。<br><span class="muted small">求 AC 和 BD。</span>',
      fields: [
        { type: 'num', label: 'AC =', ans: ac },
        { type: 'num', label: 'BD =', ans: ac }
      ],
      tip: '过 O 作 AB 的垂线，交 AB 于 M：M 同时是大圆中点和 CD 中点，两次垂径定理一减就出结果。',
      explain: ['作 OM ⊥ AB 于 M。在大圆中，OM 过圆心且垂直于弦，所以 AM = MB = ½ × ' + AB + ' = ' + (AB / 2) + '。',
        '在小圆中，C、D 在小圆上，OM ⊥ CD，所以 CM = MD = ½ × ' + CD + ' = ' + (CD / 2) + '。',
        'AC = AM − CM = ' + (AB / 2) + ' − ' + (CD / 2) + ' = ' + ac + '；BD = MB − MD 同样等于 ' + ac + '。',
        '结论可以直接记：同心圆被一条直线截出 A、C、D、B，必有 AC = BD。坑：把 AC 当成 (AB − CD)，忘了要除 2。'],
      kp: ['圆的基本性质', '垂径定理', '同心圆']
    };
  }

  /* ④ 弓形面积 = 扇形 − 三角形（90° 的情形，数字好算）：S弓 = ¼πr² − ½r²。 */
  var BOW_R = [4, 6, 8, 10, 12, 16, 20];
  function genBowArea(r) {
    var rad = pick(r, BOW_R);
    var kS = rad * rad / 4, tri = rad * rad / 2;
    var right = frac(kS) + 'π − ' + tri;
    var opts = shuffle(r, [right, frac(kS) + 'π + ' + tri, frac(kS) + 'π', frac(kS) + 'π − ' + (2 * tri)]);
    return {
      id: 'drill.bowarea', kind: 'bowarea', title: '弓形面积（扇形 − 三角形）',
      prompt: '在半径为 ' + rad + ' 的 ⊙O 中，圆心角 ∠AOB = 90°，弦 AB 与弧 AB 围成弓形。<br><span class="muted small">先算扇形，再算 △OAB，最后相减。</span>',
      fields: [
        { type: 'num', label: '扇形面积 = kπ，k =', ans: kS },
        { type: 'num', label: '△OAB 面积 =', ans: tri },
        { type: 'choice', label: '弓形面积 =', options: opts, ans: opts.indexOf(right) }
      ],
      tip: '弓形 = 扇形 − 三角形。扇形用 nπr²/360，三角形用 ½r²sin∠AOB（90° 时就是 ½r²）。',
      explain: ['扇形面积 = 90/360 × π × ' + rad + '² = ' + frac(kS) + 'π。',
        '△OAB 中 OA = OB = ' + rad + '，∠AOB = 90°，面积 = ½ × ' + rad + ' × ' + rad + ' = ' + tri + '。',
        '弓形面积 = ' + frac(kS) + 'π − ' + tri + '。',
        '坑：把弓形当成扇形（漏减三角形）；或者用三角形的斜边 AB 去算面积。'],
      kp: ['圆的基本性质', '扇形面积', '弓形面积']
    };
  }

  /* ⑤ 已知两点和半径：圆心在 AB 的垂直平分线上，到中点距离 h = √(r² − (d/2)²)。
     h > 0 两个圆、h = 0 一个、无实数解 0 个 —— 等价于比较 2r 与 AB。 */
  var CIRC_NUM = [[7, 5], [6, 5], [10, 5], [12, 5], [14, 8], [8, 4], [16, 6], [9, 5], [5, 3], [18, 10]];
  function genCircNum(r) {
    var p = pick(r, CIRC_NUM), d0 = p[0], rad = p[1];
    var cnt = 2 * rad > d0 ? 2 : (2 * rad === d0 ? 1 : 0);
    var opts = ['0 个', '1 个', '2 个', '无数个'];
    var why = cnt === 2 ? '2r = ' + (2 * rad) + ' > AB = ' + d0 + '，圆心到 AB 中点有两个对称位置'
      : (cnt === 1 ? '2r = ' + (2 * rad) + ' = AB，圆心正好离 AB 中点 0，只有一个位置'
        : '2r = ' + (2 * rad) + ' < AB = ' + d0 + '，到 A、B 都是 ' + rad + ' 的点不存在');
    return {
      id: 'drill.circnum', kind: 'circnum', title: '确定圆的个数',
      prompt: '已知线段 AB = ' + d0 + '，经过 A、B 两点且半径为 ' + rad + ' 的圆有几个？',
      fields: [{ type: 'choice', label: '', options: opts, ans: cnt }],
      tip: '先看 2r 与 AB：2r > AB 有 2 个，2r = AB 有 1 个，2r < AB 一个也没有。',
      explain: ['圆心到 A、B 的距离都是 ' + rad + '，所以圆心在 AB 的垂直平分线上。',
        '设 AB 中点为 M，则圆心到 M 的距离 h 满足 h² = ' + rad + '² − (' + d0 + '/2)² = ' + (rad * rad - d0 * d0 / 4) + '。',
        why + '，所以有 ' + cnt + ' 个。',
        '坑：以为「过两点」就能确定一个圆——过两点能作无数个圆，半径给定才有限。'],
      kp: ['圆的基本概念', '确定圆的条件']
    };
  }

  /* ⑥ 尺规作图找圆心：两个条件各对应一条轨迹（角平分线 / 垂直平分线），交点就是圆心。 */
  var CONSTR_CASES = [
    { ask: '⊙P 经过 A、B 两点，且圆心 P 到 AB、AC 两边的距离相等',
      right: '∠BAC 的平分线与 AB 的垂直平分线的交点',
      why: '到两边距离相等 ⟹ 在角平分线上；到 A、B 距离相等 ⟹ 在 AB 的垂直平分线上。' },
    { ask: '⊙P 经过 △ABC 的三个顶点',
      right: 'AB 与 AC 两条边的垂直平分线的交点',
      why: '到三个顶点距离相等 ⟹ 三边垂直平分线交于一点（外心）。' },
    { ask: '⊙P 经过 A、B 两点，且圆心 P 在直线 BC 上',
      right: 'AB 的垂直平分线与直线 BC 的交点',
      why: '到 A、B 距离相等 ⟹ 在 AB 的垂直平分线上；再落到 BC 上就唯一确定。' },
    { ask: '⊙P 与 ∠BAC 的两边都相切，且 ⊙P 经过点 A 以外的 BC 边上一点 D',
      right: '∠BAC 的平分线与 AD 的垂直平分线的交点',
      why: '与两边相切 ⟹ 圆心在角平分线上；过 D 且半径等于 PA ⟹ 还要 PA = PD，即 P 在 AD 的垂直平分线上。' }
  ];
  var CONSTR_BAD = [
    '∠BAC 的平分线与 BC 的交点',
    'AB 与 AC 两条边的中线的交点',
    '过 A 作 BC 的垂线与 BC 的交点',
    '∠ABC 的平分线与 AB 的垂直平分线的交点',
    'AB 的中点',
    '三条高的交点'
  ];
  function genConstrCenter(r) {
    var t = pick(r, CONSTR_CASES);
    var picked = [t.right], guard = 0;
    while (picked.length < 4 && guard++ < 80) {
      var w = pick(r, CONSTR_BAD);
      if (picked.indexOf(w) < 0) picked.push(w);
    }
    var opts = shuffle(r, picked);
    return {
      id: 'drill.constrcenter', kind: 'constrcenter', title: '尺规作图·找圆心',
      prompt: t.ask + '。圆心 P 应该这样作（　）',
      fields: [{ type: 'choice', label: '', options: opts, ans: opts.indexOf(t.right) }],
      tip: '每个条件翻成一条轨迹：距离相等→垂直平分线，到两边距离相等→角平分线；两条轨迹的交点就是圆心。',
      explain: [t.why,
        '所以圆心 P 是「' + t.right + '」，再以 P 到已知点的距离为半径画圆即可。',
        '坑：把「到两边距离相等」画成垂直平分线（那是到两点距离相等）；作图题要把两条轨迹都留下痕迹。'],
      kp: ['圆的基本概念', '尺规作图', '外心']
    };
  }

  var ENTRY = [
    {
      id: 'entry.21.1', group: '函数与图象', no: '21', title: '21(1) 求交点',
      prompt: '直线 y = −x − 2 与 x 轴交于点 A，与 y 轴交于点 B。<br><span class="muted small">先求这两个点——这是 21 题的第一个得分点。</span>',
      fields: [{ type: 'num', label: 'A 的横坐标 =', ans: -2 }, { type: 'num', label: 'B 的纵坐标 =', ans: -2 }],
      tip: 'x 轴上的点 y = 0；y 轴上的点 x = 0。',
      explain: ['令 y = 0：0 = −x − 2，x = −2，所以 A(−2, 0)。', '令 x = 0：y = −2，所以 B(0, −2)。'],
      kp: ['一次函数']
    },
    {
      id: 'entry.21.2', group: '函数与解析式', no: '21', title: '21(1) 顶点式求 a',
      prompt: '抛物线顶点为 A(−2, 0)，且经过 B(0, −2)。设 y₂ = a(x + 2)²。',
      fields: [{ type: 'num', label: 'a =', ans: -0.5 }],
      tip: '顶点已知 → 设顶点式，只剩 a；代另一个点。',
      explain: ['把 B(0, −2) 代入：−2 = a(0 + 2)² = 4a，所以 a = −1/2。', '即 y₂ = −1/2(x + 2)²。'],
      fig: { type: 'parabola', a: -0.5, h: -2, k: 0, dots: [[-2, 0, 'A 顶点'], [0, -2, 'B']] },
      kp: ['二次函数', '待定系数法']
    },
    {
      id: 'entry.21.3', group: '函数与解析式', no: '21', title: '21(2) 图象比较',
      prompt: '已知 y₁ = −x − 2，y₂ = −1/2(x + 2)²。当 y₁ > y₂ 时，x 的取值范围是？',
      fields: [{ type: 'choice', label: '', ans: 0, options: ['x < −2 或 x > 0', '−2 < x < 0', 'x < 0 或 x > 2', '−2 < x < 2'] }],
      tip: '两图象交点横坐标是 −2 和 0；在交点之间、之外各试一个数。',
      explain: ['−x − 2 > −1/2(x + 2)²，两边乘 2 整理得 x² + 2x > 0，即 x(x + 2) > 0。', '所以 x < −2 或 x > 0。'],
      kp: ['二次函数', '图象']
    },
    {
      id: 'entry.22.1', group: '函数与图象', no: '22', title: '22(1) 求 k',
      prompt: '直线 y = −x + 6 与反比例函数 y = k/x 的图象在第一象限交于 A、B，B 的纵坐标为 2。',
      fields: [{ type: 'num', label: 'B 的横坐标 =', ans: 4 }, { type: 'num', label: 'k =', ans: 8 }],
      tip: 'B 同时在直线和反比例图象上：先代直线求坐标，再代反比例求 k。',
      explain: ['B 在 y = −x + 6 上且 y = 2：2 = −x + 6，x = 4，B(4, 2)。', 'k = x·y = 4 × 2 = 8。'],
      fig: { type: 'hyperbola', k: 8, xr: [-6, 6], dots: [[4, 2, 'B'], [2, 4, 'A']] },
      kp: ['反比例函数', '一次函数']
    },
    {
      id: 'entry.22.2', group: '函数与图象', no: '22', title: '22(2) 求另一交点',
      prompt: '已知 k = 8，直线 y = −x + 6 与 y = 8/x 交于 A、B，其中 B(4, 2)。求另一个交点 A 的坐标。',
      fields: [{ type: 'num', label: 'A 的横坐标 =', ans: 2 }, { type: 'num', label: 'A 的纵坐标 =', ans: 4 }],
      tip: '联立 y = −x + 6 与 y = 8/x，解一元二次方程。',
      explain: ['−x + 6 = 8/x → x² − 6x + 8 = 0 → (x − 2)(x − 4) = 0。', 'x = 4 是 B，所以 A 的横坐标 2，纵坐标 4，A(2, 4)。'],
      kp: ['反比例函数', '一次函数']
    },
    {
      id: 'entry.23.1', group: '建模与应用', no: '23', title: '23(1) 用 x 表示',
      prompt: '团扇每把盈利 60 元，每天卖 30 把；每降价 2 元，每天多卖 3 把。设每把降价 x 元。<br>每把盈利 = a − x，每天销量 = 30 + b·x。',
      fields: [{ type: 'num', label: 'a =', ans: 60 }, { type: 'num', label: 'b =', ans: 1.5 }],
      tip: '“每降 2 元多卖 3 把” → 降 1 元多卖 3/2 把。',
      explain: ['每把盈利 = 60 − x，所以 a = 60。', '每降 2 元多卖 3 把，降 x 元多卖 (x/2)×3 = 1.5x，所以 b = 1.5。'],
      kp: ['二次函数', '建模']
    },
    {
      id: 'entry.23.2', group: '建模与应用', no: '23', title: '23(2) 解出并取舍',
      prompt: '团扇日盈利 W = (60 − x)(30 + 1.5x)，其中 x 是降价元数。要 W = 2250，解得 x₁ = 10，x₂ = 30。<br>要让顾客得实惠，应降价多少元？',
      fields: [{ type: 'choice', label: '', ans: 1, options: ['10 元', '30 元'] }],
      tip: '“让顾客实惠”= 降得更多。',
      explain: ['两个解都在 0 ≤ x ≤ 60 且为偶数，所以取降得多的 x = 30 元。'],
      kp: ['二次函数', '建模']
    },
    {
      id: 'entry.20.1', group: '建模与应用', no: '20', title: '20(1) 上升段解析式',
      prompt: '注意力指标 y 随时间 x 变化：上升段是直线，过 (0, 20) 和 (10, 45)。',
      fields: [{ type: 'num', label: 'y = kx + b 中，k =', ans: 2.5 }, { type: 'num', label: 'b =', ans: 20 }],
      tip: 'b 就是 x = 0 时的 y；k 用两点差算。',
      explain: ['k = (45 − 20)/(10 − 0) = 2.5；b = 20。', '上升段：y = 2.5x + 20（0 ≤ x ≤ 10）。'],
      kp: ['一次函数', '建模']
    },
    {
      id: 'entry.20.2', group: '函数与图象', no: '20', title: '20(1) 下降段反比例',
      prompt: '注意力指标的下降段是反比例函数 y = k/x，过点 (20, 45)。',
      fields: [{ type: 'num', label: 'k =', ans: 900 }],
      tip: '反比例段：k = x·y。',
      explain: ['k = 20 × 45 = 900，所以 y = 900/x（20 ≤ x ≤ 45）。'],
      kp: ['反比例函数', '分段函数']
    },
    {
      id: 'entry.24.1', group: '图形与变换', no: '24', title: '24(1) 求角度',
      prompt: '正方形 ABCD 中，BP 由 BA 绕 B 逆时针旋转 α 得到。当 △ABP 是等边三角形时，求 ∠BPC。',
      fields: [{ type: 'num', label: '∠BPC =', ans: 15, unit: '°' }],
      fig: { w: 320, h: 240, need: 1, svg: '<rect x="110" y="48" width="90" height="90" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 110 138 L 155 215.9 L 200 138 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 155 138 A 45 45 0 0 0 177.5 177" fill="none" stroke="#e37400" stroke-width="1.2"/><circle cx="200" cy="138" r="2.6" fill="#1b2430"/><text x="96" y="154" font-size="14" font-family="serif">A</text><text x="206" y="154" font-size="14" font-family="serif">B</text><text x="206" y="44" font-size="14" font-family="serif">C</text><text x="96" y="44" font-size="14" font-family="serif">D</text><text x="146" y="234" font-size="14" font-family="serif">P</text><text x="140" y="172" font-size="12" font-family="serif" fill="#a15c00">α</text>' },
      tip: '等边三角形 → α = 60°；BP = BA = BC，△PBC 是等腰三角形。',
      explain: ['α = 60°，∠PBC = ∠PBA + ∠ABC = 60° + 90° = 150°。', 'BP = BC，所以 ∠BPC = (180° − 150°) ÷ 2 = 15°。'],
      kp: ['几何综合', '旋转']
    },
    {
      id: 'entry.25.1', group: '函数与解析式', no: '25', title: '25(1) 代值',
      prompt: '抛物线 y = x² + 2ax + 2a − 5。当 a = −1、x = 2 时，y = ?',
      fields: [{ type: 'num', label: 'y =', ans: -7 }],
      tip: '先把 a 代进去，再把 x 代进去。',
      explain: ['a = −1：y = x² − 2x − 7。', 'x = 2：y = 4 − 4 − 7 = −7。'],
      fig: { type: 'parabola', a: 1, h: 1, k: -8, dots: [[2, -7, 'x=2']] },
      kp: ['二次函数', '含参']
    },
    {
      id: 'entry.25.2', group: '函数与解析式', no: '25', title: '25(1) 判断点',
      prompt: '已知 a = −1 时抛物线为 y = x² − 2x − 7。点 (2, −6) 在图象上吗？',
      fields: [{ type: 'choice', label: '', ans: 1, options: ['在', '不在'] }],
      tip: '把 x = 2 代进去，看 y 等不等于 −6。',
      explain: ['x = 2 时 y = −7 ≠ −6，所以点 (2, −6) 不在图象上。'],
      kp: ['二次函数', '含参']
    },
    /* ---- 第 11 周周练卷（11.11）的解答题前两步 ---- */
    {
      id: 'entry.13.1', group: '函数与解析式', no: '13', title: '13(1) 对称轴与顶点',
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
      id: 'entry.13.3', group: '函数与解析式', no: '13', title: '13(3) 平移后解析式',
      prompt: '把抛物线 y = −x² + 2x + 3 向下平移 3 个单位，再向左平移 2 个单位。<br>写出平移后的解析式（13(3) 的 3 分）。',
      fields: [{ type: 'expr', form: 'general', tpl: 'y = {}x² + {}x', label: '平移后的解析式', ans: [-1, -2] }],
      tip: '「上加下减」改常数项，「左加右减」把 x 换成 (x + 2)。',
      explain: ['先向下 3 个：y = −x² + 2x + 3 − 3 = −x² + 2x。', '再向左 2 个（x 换成 x + 2）：y = −(x + 2)² + 2(x + 2) = −x² − 2x。'],
      kp: ['二次函数', '平移']
    },
    {
      id: 'entry.13.5', group: '函数与解析式', no: '13', title: '13(5) 面积怎么设',
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
      id: 'entry.14.1', group: '圆与扇形', no: '14', title: '14 第一步：平行得角',
      prompt: 'AB 为 ⊙O 的直径，∠BOC = 80°，AD ∥ OC。<br><span class="muted small">第一步：∠DAB 是多少度？依据是哪条？</span>',
      fields: [
        { type: 'num', label: '∠DAB =', ans: 80, unit: '°' },
        {
          type: 'choice', label: '依据', ans: 0,
          options: ['AD ∥ OC，两直线平行、同位角相等', '同弧所对的圆周角等于圆心角的一半', 'OA = OD，等边对等角', '直径所对的圆周角是直角']
        }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="108" r="85" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="75" y1="108" x2="245" y2="108" stroke="#1b2430" stroke-width="1.5"/><line x1="160" y1="108" x2="174.8" y2="24.3" stroke="#1b2430" stroke-width="1.5"/><line x1="75" y1="108" x2="80.1" y2="78.9" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="108" r="2.6" fill="#1b2430"/><path d="M 190 108 A 30 30 0 0 0 165.2 78.5" fill="none" stroke="#e37400" stroke-width="1.2"/><text x="63" y="124" font-size="14" font-family="serif">A</text><text x="247" y="124" font-size="14" font-family="serif">B</text><text x="152" y="124" font-size="14" font-family="serif">O</text><text x="179" y="20" font-size="14" font-family="serif">C</text><text x="64" y="74" font-size="14" font-family="serif">D</text><text x="187" y="78" font-size="11" font-family="serif" fill="#a15c00">80</text>' },
      tip: 'AD ∥ OC，AB 是截线 → ∠DAB 与 ∠BOC 是同位角。',
      explain: ['AD ∥ OC，AB 截两条平行线，∠DAB 与 ∠BOC 是同位角，所以 ∠DAB = ∠BOC = 80°。', '接下来由 OA = OD 得 ∠D = ∠DAB = 80°。'],
      kp: ['圆的基本性质', '平行线与角']
    },
    {
      id: 'entry.15.1', group: '建模与应用', no: '15', title: '15(1) 建系设式求 a',
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
      id: 'entry.16.1', group: '建模与应用', no: '16', title: '16(1) 销量用 x 表示',
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
      id: 'entry.16.2', group: '函数与解析式', no: '16', title: '16(2) 取值范围',
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
      id: 'entry.17.1', group: '函数与解析式', no: '附加', title: '附加(1) 对称轴求 b、c',
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
      id: 'entry.t01', group: '圆与扇形', title: '错题本 p01 · 垂径定理第一步',
      prompt: 'CD 是 ⊙O 的直径，AB 是 ⊙O 的弦，AB⊥CD 于 M。若 AB=8，OM∶OC=3∶5。<br><span class="muted small">第一步：垂径定理得 AM，再设 k 求半径。</span>',
      fields: [
        { type: 'num', label: 'AM =', ans: 4 },
        { type: 'num', label: '设 OM=3k、OC=5k，则 k =', ans: 1 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="110" r="80" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="80" y1="110" x2="240" y2="110" stroke="#1b2430" stroke-width="1.5"/><line x1="208" y1="46" x2="208" y2="174" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="110" r="2.6" fill="#1b2430"/><circle cx="208" cy="110" r="2.6" fill="#1b2430"/><path d="M 208 110 L 218 110 L 218 100" fill="none" stroke="#e37400" stroke-width="1.2"/><text x="68" y="126" font-size="13" font-family="serif">C</text><text x="243" y="126" font-size="13" font-family="serif">D</text><text x="212" y="42" font-size="13" font-family="serif">A</text><text x="212" y="184" font-size="13" font-family="serif">B</text><text x="214" y="106" font-size="13" font-family="serif">M</text><text x="150" y="126" font-size="13" font-family="serif">O</text>' },
      tip: '直径垂直于弦 → 平分弦；半径 OA=OC=5k，在 Rt△AOM 里列勾股。',
      explain: ['CD 过圆心且 AB⊥CD ⟹ AM=BM=½AB=4。', 'OM=3k、OC=5k ⟹ OA=5k；Rt△AOM：25k²=9k²+16 ⟹ k=1（OM=3、半径 5）。'],
      kp: ['圆的基本性质', '垂径定理']
    },
    {
      id: 'entry.t02', group: '圆与扇形', title: '错题本 p02 · 半圆里的角度链',
      prompt: '以 △ABC 的边 AB 为直径作半圆 O，分别交 AC、BC 于 D、E。若 AC=BC，∠C=70°。<br><span class="muted small">第一步：先求 ∠A，再求 ∠CAE。</span>',
      fields: [
        { type: 'num', label: '∠A =', ans: 55, unit: '°' },
        { type: 'num', label: '∠CAE =', ans: 20, unit: '°' }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<path d="M 70 170 A 90 90 0 0 1 250 170" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="70" y1="170" x2="250" y2="170" stroke="#1b2430" stroke-width="1.5"/><path d="M 70 170 L 160 35 L 250 170" fill="none" stroke="#1b2430" stroke-width="1.5"/><circle cx="125" cy="87" r="2.6" fill="#e37400"/><circle cx="195" cy="87" r="2.6" fill="#e37400"/><text x="58" y="186" font-size="14" font-family="serif">A</text><text x="252" y="186" font-size="14" font-family="serif">B</text><text x="153" y="29" font-size="14" font-family="serif">C</text><text x="112" y="82" font-size="13" font-family="serif">D</text><text x="199" y="82" font-size="13" font-family="serif">E</text><text x="146" y="60" font-size="11" fill="#a15c00">70</text>' },
      tip: '等腰三角形先算 ∠A；AB 是直径 ⟹ ∠AEB=90°，再在 Rt△ACE 里算 ∠CAE。',
      explain: ['AC=BC、∠C=70° ⟹ ∠A=∠B=(180°−70°)/2=55°。', 'AB 为直径 ⟹ ∠AEB=90°；Rt△ACE 中 ∠CAE=90°−∠C=20°。', '再往下一步：∠DOE=2∠DAE=40°。'],
      kp: ['圆的基本性质', '直径所对的圆周角']
    },
    {
      id: 'entry.t03', group: '圆与扇形', title: '错题本 p03 · 扇形里的等腰直角',
      prompt: '扇形 AOB 中 ∠AOB=90°，P 为弧 AB 上一点，PC⊥OA 于 C，交 AB 于 D，PD=3，CD=2。求半径。<br><span class="muted small">第一步：先判断 △ACD 的形状。</span>',
      fields: [
        { type: 'choice', label: '△ACD 是', ans: 0, options: ['等腰直角三角形', '等边三角形', '含 30° 的直角三角形', '普通直角三角形'] },
        { type: 'num', label: 'AC =', ans: 2 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="90" cy="180" r="90" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 90 180 L 90 90 A 90 90 0 0 1 180 180 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="180" y1="180" x2="90" y2="90" stroke="#e37400" stroke-width="1.2" stroke-dasharray="4 4"/><line x1="154" y1="116" x2="154" y2="180" stroke="#1b2430" stroke-width="1.5"/><path d="M 154 180 L 164 180 L 164 170" fill="none" stroke="#e37400" stroke-width="1.2"/><text x="80" y="193" font-size="14" font-family="serif">O</text><text x="184" y="186" font-size="14" font-family="serif">A</text><text x="80" y="84" font-size="14" font-family="serif">B</text><text x="158" y="110" font-size="14" font-family="serif">P</text><text x="158" y="178" font-size="13" font-family="serif">C</text><text x="158" y="158" font-size="13" font-family="serif">D</text>' },
      tip: 'OA=OB、∠AOB=90° ⟹ ∠OAB=45°；PC⊥OA ⟹ ∠ACD=90°，所以 △ACD 也是等腰直角。',
      explain: ['OA=OB、∠AOB=90° ⟹ ∠OAB=45°。', 'PC⊥OA ⟹ ∠ACD=90°，∠CAD=45° ⟹ △ACD 等腰直角，AC=CD=2。', '于是 PC=PD+DC=5、OC=R−2，在 Rt△OCP 列勾股：R²=(R−2)²+25 ⟹ R=29/4。'],
      kp: ['圆的基本性质', '等腰直角三角形']
    },
    {
      id: 'entry.t05', group: '圆与扇形', title: '错题本 p05 · 圆内证角平分线',
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
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="110" r="80" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="80" y1="110" x2="240" y2="110" stroke="#1b2430" stroke-width="1.5"/><line x1="240" y1="110" x2="221.3" y2="58.6" stroke="#1b2430" stroke-width="1.5"/><line x1="160" y1="110" x2="132.6" y2="34.8" stroke="#1b2430" stroke-width="1.5"/><line x1="240" y1="110" x2="132.6" y2="34.8" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="110" r="2.6" fill="#1b2430"/><text x="68" y="126" font-size="14" font-family="serif">A</text><text x="242" y="126" font-size="14" font-family="serif">B</text><text x="226" y="54" font-size="14" font-family="serif">C</text><text x="120" y="30" font-size="14" font-family="serif">D</text><text x="151" y="126" font-size="14" font-family="serif">O</text><path d="M 140.2 55.5 A 22 22 0 0 0 150.7 47.4" fill="none" stroke="#e37400" stroke-width="1.5"/><path d="M 214 110 A 26 26 0 0 1 218.7 95.1" fill="none" stroke="#e37400" stroke-width="1.5"/>' },
      tip: '先抓半径相等（等腰），再用平行线的内错角把角接起来。',
      explain: ['OD=OB ⟹ ∠ODB=∠OBD。', 'BC∥OD ⟹ ∠ODB=∠CBD（内错角）。', '所以 ∠OBD=∠CBD；O 在 AB 上，∠OBD 就是 ∠ABD，所以 BD 平分 ∠ABC。'],
      kp: ['圆的基本性质', '平行线与角']
    },
    {
      id: 'entry.t06', group: '圆与扇形', title: '错题本 p06 · 灯罩轴截面建模',
      prompt: '球形灯罩的轴截面：HF 过圆心且垂直底座 CD 于 F，AC=BD=1，CD=12，HF=31。<br><span class="muted small">第一步：垂径定理求 CF，再写 R 与 OF 的关系。</span>',
      fields: [
        { type: 'num', label: 'CF =', ans: 6 },
        {
          type: 'choice', label: '设半径 R、OF=d，则', ans: 0,
          options: ['R + d = 31', 'R − d = 31', '2R + d = 31', 'R + 2d = 31']
        }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<path d="M 127 194.5 A 85.8 85.8 0 1 1 193 194.5" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="127" y1="200" x2="193" y2="200" stroke="#1b2430" stroke-width="1.5"/><line x1="127" y1="200" x2="127" y2="194.5" stroke="#1b2430" stroke-width="1.5"/><line x1="193" y1="200" x2="193" y2="194.5" stroke="#1b2430" stroke-width="1.5"/><line x1="160" y1="29.5" x2="160" y2="200" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="115.3" r="2.6" fill="#1b2430"/><path d="M 160 200 L 168 200 L 168 192" fill="none" stroke="#e37400" stroke-width="1.2"/><text x="154" y="24" font-size="14" font-family="serif">H</text><text x="166" y="111" font-size="14" font-family="serif">O</text><text x="152" y="216" font-size="14" font-family="serif">F</text><text x="106" y="191" font-size="13" font-family="serif">A</text><text x="198" y="191" font-size="13" font-family="serif">B</text><text x="114" y="215" font-size="13" font-family="serif">C</text><text x="198" y="215" font-size="13" font-family="serif">D</text>' },
      tip: 'HF 过圆心且垂直 CD → 垂径定理平分 CD；注意 HF 不是直径，是 R + d。',
      explain: ['垂径定理：CF=FD=½×12=6。', 'H、O、F 共线，HF=HO+OF=R+d=31。', '下一步：以 F 为原点，A(−6, 1)、O(0, d)，6²+(d−1)²=R²，代 d=31−R 得 R=15.6。'],
      kp: ['圆的基本性质', '垂径定理', '建模']
    },
    {
      id: 'entry.t08', group: '函数与图象', title: '错题本 p08 · 反比例 + 一次函数',
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
      id: 'entry.t11', group: '图形与变换', title: '错题本 p11 · 旋转题的等腰直角',
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
      id: 'entry.t12', group: '圆与扇形', title: '圆内接四边形 · 对角互补第一步',
      prompt: '四边形 ABCD 内接于 ⊙O，∠A = 70°，∠B = 95°。<br><span class="muted small">第一步：先写哪条结论，再算 ∠C。</span>',
      fields: [
        {
          type: 'choice', label: '依据', ans: 0,
          options: ['圆内接四边形对角互补：∠A + ∠C = 180°', '圆内接四边形邻角互补：∠A + ∠B = 180°', '同弧所对的圆周角相等', '直径所对的圆周角是直角']
        },
        { type: 'num', label: '∠C =', ans: 110, unit: '°' }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="110" r="82" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 160 192 L 82.9 82 L 145.8 29.2 L 237.1 82 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="110" r="2.6" fill="#1b2430"/><text x="153" y="208" font-size="14" font-family="serif">A</text><text x="66" y="86" font-size="14" font-family="serif">B</text><text x="139" y="21" font-size="14" font-family="serif">C</text><text x="242" y="86" font-size="14" font-family="serif">D</text><text x="152" y="126" font-size="13" font-family="serif">O</text><text x="150" y="166" font-size="11" font-family="serif" fill="#a15c00">70</text><text x="104" y="92" font-size="11" font-family="serif" fill="#a15c00">95</text>' },
      tip: '圆内接四边形：对角互补（∠A + ∠C、∠B + ∠D），不是邻角互补——这是最容易记混的一条。',
      explain: ['四边形 ABCD 内接于 ⊙O ⟹ 对角互补：∠A + ∠C = 180°。', '∠C = 180° − 70° = 110°。', '下一步同理：∠D = 180° − ∠B = 85°。'],
      kp: ['圆的基本性质', '圆内接四边形']
    },
    {
      id: 'entry.t13', group: '圆与扇形', title: '弦心距 + 连半径 · 垂径第一步',
      prompt: 'AB 是 ⊙O 的弦，AB = 16，圆心 O 到 AB 的距离 OM = 6。<br><span class="muted small">第一步：作什么辅助线？先求哪条线段？</span>',
      fields: [
        {
          type: 'choice', label: '第一步辅助线', ans: 0,
          options: ['过 O 作 OM ⊥ AB 于 M（弦心距），再连 OA', '连 OA、OB 构造等边三角形', '过 A 作 AB 的垂线', '延长 OM 交圆于 C，得直径']
        },
        { type: 'num', label: 'AM =', ans: 8 },
        { type: 'num', label: '半径 OA =', ans: 10 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="110" r="80" fill="none" stroke="#1b2430" stroke-width="1.5"/><line x1="91" y1="150" x2="229" y2="150" stroke="#1b2430" stroke-width="1.5"/><line x1="160" y1="110" x2="160" y2="150" stroke="#1b2430" stroke-width="1.5"/><line x1="160" y1="110" x2="91" y2="150" stroke="#e37400" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M 160 150 L 170 150 L 170 140" fill="none" stroke="#e37400" stroke-width="1.2"/><circle cx="160" cy="110" r="2.6" fill="#1b2430"/><text x="80" y="166" font-size="14" font-family="serif">A</text><text x="232" y="166" font-size="14" font-family="serif">B</text><text x="152" y="103" font-size="14" font-family="serif">O</text><text x="153" y="166" font-size="13" font-family="serif">M</text>' },
      tip: '见弦 → 作弦心距 + 连半径，凑出直角三角形：OA² = OM² + AM²。',
      explain: ['OM ⊥ AB ⟹ AM = MB = ½AB = 8（垂径定理）。', '连 OA 得 Rt△OAM：OA = √(6² + 8²) = 10。', '套路：弦长、弦心距、半径三个量，知二求一。'],
      kp: ['圆的基本性质', '垂径定理']
    },
    /* ---- 2026-11-19 补：孩子反馈「扇形、弧、圆锥有点难」，把展开图和公式选择做成第一步 ---- */
    {
      id: 'entry.t21', group: '圆与扇形', title: '圆锥展开图 · 第一步',
      prompt: '圆锥的底面半径为 3，母线长为 5。<br><span class="muted small">第一步：侧面展开图是扇形——先写它的半径和弧长。</span>',
      fields: [
        { type: 'num', label: '扇形半径（母线）=', ans: 5 },
        { type: 'num', label: '扇形弧长 = kπ，k =', ans: 6 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<line x1="72" y1="108" x2="27" y2="168" stroke="#1b2430" stroke-width="1.5"/><line x1="72" y1="108" x2="117" y2="168" stroke="#1b2430" stroke-width="1.5"/><ellipse cx="72" cy="168" rx="45" ry="10" fill="none" stroke="#1b2430" stroke-width="1.2"/><path d="M 232 166 L 160.7 189.2 A 75 75 0 1 1 303.3 189.2 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><circle cx="72" cy="108" r="2.6" fill="#1b2430"/><circle cx="232" cy="166" r="2.6" fill="#1b2430"/><text x="62" y="102" font-size="13" font-family="serif">A</text><text x="24" y="132" font-size="12" font-family="serif" fill="#a15c00">l = 5</text><text x="74" y="188" font-size="12" font-family="serif" fill="#a15c00">r = 3</text><text x="238" y="162" font-size="13" font-family="serif">O</text>' },
      tip: '圆锥侧面展开：扇形半径 = 母线 l，扇形弧长 = 底面周长 2πr。',
      explain: ['展开图是扇形：半径就是母线 5；弧长等于底面圆的周长 2πr = 6π。',
        '所以 k = 6；下一步用 θ = 360r/l 求圆心角：360×3÷5 = 216°。'],
      kp: ['圆的基本性质', '圆锥的侧面积']
    },
    {
      id: 'entry.t22', group: '圆与扇形', title: '扇形面积 · 用哪个公式',
      prompt: '扇形 AOB 中，∠AOB = 120°，半径 OA = 6。<br><span class="muted small">第一步：选面积公式，再算。</span>',
      fields: [
        { type: 'choice', label: '用哪个公式', ans: 0, options: ['S = nπr²/360', 'S = πrl', 'S = πr²', 'S = 2πr'] },
        { type: 'num', label: '面积 = kπ，k =', ans: 12 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="170" r="95" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 160 170 L 78 122 A 95 95 0 0 1 242 122 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="170" r="2.6" fill="#1b2430"/><path d="M 160 170 L 190 140 A 38 38 0 0 1 205 150" fill="none" stroke="#e37400" stroke-width="1.2"/><text x="152" y="186" font-size="13" font-family="serif">O</text><text x="66" y="118" font-size="14" font-family="serif">A</text><text x="246" y="118" font-size="14" font-family="serif">B</text><text x="190" y="152" font-size="11" fill="#a15c00">120</text><text x="118" y="150" font-size="12" fill="#a15c00">6</text>' },
      tip: '给圆心角用 S = nπr²/360；给弧长用 S = ½lr；两个公式可以互相推。',
      explain: ['已知圆心角 120°、半径 6，用 S = nπr²/360。',
        'S = 120 × π × 36 ÷ 360 = 12π，所以 k = 12。',
        '同一题的弧长 l = 120π×6/180 = 4π，用 S = ½lr = ½×4π×6 = 12π，两个公式结果一致。'],
      kp: ['圆的基本性质', '扇形面积']
    },
    {
      id: 'entry.w12q7', group: '圆与扇形', no: '7', title: '7 网格弧长 · 第一步',
      prompt: '5×4 网格中每格边长 1，经过格点 A、B、E 的圆弧与线段 BC 交于 D，AB² = 1²+4²，AC² = 1²+4²，BC² = 5²+3²。<br><span class="muted small">第一步：判断 △ABC 的形状，再看弧所对的圆周角。</span>',
      fields: [
        { type: 'num', label: 'AB² =', ans: 17 },
        { type: 'choice', label: '△ABC 是', ans: 0, options: ['等腰直角三角形', '等边三角形', '直角但非等腰', '钝角三角形'] }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<g stroke="#c9d2dd" stroke-width="0.9"><line x1="50" y1="20" x2="50" y2="180"/><line x1="90" y1="20" x2="90" y2="180"/><line x1="130" y1="20" x2="130" y2="180"/><line x1="170" y1="20" x2="170" y2="180"/><line x1="210" y1="20" x2="210" y2="180"/><line x1="250" y1="20" x2="250" y2="180"/><line x1="50" y1="20" x2="250" y2="20"/><line x1="50" y1="60" x2="250" y2="60"/><line x1="50" y1="100" x2="250" y2="100"/><line x1="50" y1="140" x2="250" y2="140"/><line x1="50" y1="180" x2="250" y2="180"/></g><path d="M 90 20 A 82.46 82.46 0 0 0 250 60" fill="none" stroke="#1b2430" stroke-width="1.7"/><line x1="50" y1="180" x2="250" y2="60" stroke="#1b2430" stroke-width="1.4"/><circle cx="90" cy="20" r="3" fill="#e37400"/><circle cx="250" cy="60" r="3" fill="#e37400"/><circle cx="50" cy="180" r="3" fill="#e37400"/><circle cx="90" cy="60" r="3" fill="#e37400"/><circle cx="150" cy="120" r="3" fill="#e37400"/><text x="80" y="14" font-size="14" font-family="serif">A</text><text x="254" y="56" font-size="14" font-family="serif">B</text><text x="32" y="196" font-size="14" font-family="serif">C</text><text x="76" y="56" font-size="14" font-family="serif">E</text><text x="142" y="138" font-size="14" font-family="serif">D</text>' },
      tip: '勾股定理算出三边平方，看 AB²+AC² 与 BC² 的关系；等腰 + 直角 ⟹ 底角 45°。',
      explain: ['AB² = 1 + 16 = 17，AC² = 1 + 16 = 17，BC² = 25 + 9 = 34。',
        'AB² + AC² = 34 = BC² 且 AB = AC ⟹ △ABC 是等腰直角三角形，∠ABC = 45°。',
        '弧 AD 所对圆周角 45° ⟹ 圆心角 90°；由网格 AE 竖直、EB 水平得 ∠AEB = 90°，所以 AB 是直径，R = √17/2，弧长 = √17π/4。'],
      kp: ['圆的基本性质', '弧长', '勾股定理']
    },
    {
      id: 'entry.w12q12', group: '图形与变换', no: '12', title: '12 关联圆 · 建系第一步',
      prompt: '若一条线段上所有的点都在某个圆的圆内或圆上，就称这个圆是这条线段的「关联圆」。如图，∠MON = 45°，OP = 3，OA = AB = 2√2，以点 P 为旋转中心把线段 AB 逆时针旋转 90° 得到线段 CD。<br><span class="muted small">第一步：以 O 为原点、ON 为 x 轴建系，写出 A、P 的坐标；第二步：旋转后定出 C 的位置。</span>',
      fields: [
        { type: 'num', label: 'A 的横坐标 = k√2，k =', ans: 2 },
        { type: 'choice', label: 'P 的坐标是', ans: 0,
          options: ['(3√2/2, 3√2/2)', '(3, 3)', '(3√2, 3√2)', '(3/2, 3/2)'] },
        { type: 'choice', label: '旋转后 C 的坐标是', ans: 0,
          options: ['(3√2, 2√2)', '(3√2, 4√2)', '(2√2, 3√2)', '(4√2, 3√2)'] }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<line x1="30" y1="200" x2="300" y2="200" stroke="#1b2430" stroke-width="1.3"/><line x1="30" y1="200" x2="210" y2="20" stroke="#1b2430" stroke-width="1.3"/><polygon points="190,200 184,204 188,196" fill="#1b2430"/><polygon points="218,28 212,38 210,28" fill="#1b2430"/><line x1="90" y1="200" x2="100" y2="200" stroke="#1b2430" stroke-width="4"/><line x1="100" y1="200" x2="110" y2="200" stroke="#1b2430" stroke-width="4"/><circle cx="165" cy="165" r="60" fill="none" stroke="#1b2430" stroke-width="1.3"/><circle cx="128" cy="128" r="3" fill="#1b2430"/><circle cx="106" cy="182" r="3" fill="#1b2430"/><circle cx="145" cy="106" r="3" fill="#1b2430"/><circle cx="193" cy="146" r="3" fill="#1b2430"/><text x="20" y="216" font-size="15" font-family="serif">O</text><text x="90" y="218" font-size="15" font-family="serif">A</text><text x="106" y="218" font-size="15" font-family="serif">B</text><text x="118" y="132" font-size="15" font-family="serif">P</text><text x="196" y="110" font-size="15" font-family="serif">D</text><text x="140" y="102" font-size="15" font-family="serif">C</text><text x="150" y="172" font-size="15" font-family="serif">E</text><text x="214" y="32" font-size="15" font-family="serif">M</text><text x="292" y="218" font-size="15" font-family="serif">N</text>' },
      tip: 'ON 当 x 轴、OM 当 45° 线：A 在 x 轴上所以纵坐标 0；P 在 45° 线上所以横纵坐标相等，2t² = 3²。',
      explain: ['以 O 为原点、ON 为 x 轴建系：A(2√2, 0)，B(4√2, 0)，中点 T(3√2, 0)。',
        'P 在射线 OM 上（∠PON = 45°）⟹ 横纵坐标相等，设 P(t, t)，2t² = 3² ⟹ P(3√2/2, 3√2/2)。',
        '绕 P 逆时针旋转 90°：T(3√2, 0) → Q(3√2, 3√2)；又 AT = TB = √2，故 QC = QD = √2，得 C(3√2, 2√2)、D(3√2, 4√2)。',
        '下一步：E 在射线 OM 上设 E(m, m)，令 ED = 2、EC = 2 求两个临界点，即得 7−√3 ≤ OE ≤ 5+√3。'],
      kp: ['图形的变换', '旋转', '新定义']
    },
    {
      id: 'entry.w12q16', group: '圆与扇形', no: '16', title: '16(1) 圆弧拱桥 · 求半径第一步',
      prompt: '圆弧形桥拱跨度 AC = 40 m，拱高 BD = 10 m。设所在圆半径为 R。<br><span class="muted small">第一步：由垂径定理写出半跨度与圆心到弦的距离，再列勾股。</span>',
      fields: [
        { type: 'num', label: '半跨度 AD =', ans: 20, unit: 'm' },
        { type: 'choice', label: '圆心到弦的距离 OD =', ans: 0, options: ['R − 10', 'R + 10', '10 − R', '20'] },
        { type: 'num', label: '由 R² = 20² + (R−10)² 解得 R =', ans: 25 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<path d="M 40 170 A 150 150 0 0 1 280 170" fill="none" stroke="#1b2430" stroke-width="1.8"/><line x1="40" y1="170" x2="280" y2="170" stroke="#1b2430" stroke-width="1.2"/><line x1="160" y1="110" x2="160" y2="170" stroke="#e37400" stroke-width="1.3" stroke-dasharray="4 4"/><circle cx="160" cy="260" r="2.6" fill="#1b2430"/><text x="32" y="188" font-size="13" font-family="serif">A</text><text x="282" y="188" font-size="13" font-family="serif">C</text><text x="153" y="104" font-size="13" font-family="serif">B</text><text x="153" y="186" font-size="13" font-family="serif">D</text><text x="151" y="278" font-size="13" font-family="serif">O</text><text x="92" y="186" font-size="11" fill="#a15c00">40</text><text x="168" y="145" font-size="11" fill="#a15c00">10</text>' },
      tip: '跨度的一半是 20；圆心在拱顶下方，弦心距 = R − 拱高 = R − 10。',
      explain: ['垂径定理：D 是 AC 中点，AD = 40/2 = 20。',
        '圆心 O 在 BD 所在直线上，OD = OB − BD = R − 10。',
        'Rt△ODA：OA² = OD² + AD² ⟹ R² = (R−10)² + 20² ⟹ 20R = 500 ⟹ R = 25。'],
      kp: ['圆的基本性质', '垂径定理', '拱桥建模']
    },
    {
      id: 'entry.w12q17a', group: '函数与解析式', no: '附加', title: '附加(2) 等腰三角形 · 分类第一步',
      prompt: 'a=1、c=9 时抛物线为 y=(x−3)²，顶点 D(3,0)，与 y 轴交于 C(0,9)。点 P 在对称轴 x=3 上，设 P(3,p)。<br><span class="muted small">第一步：写出 CD²，并判断要分几种情况。</span>',
      fields: [
        { type: 'num', label: 'CD² =', ans: 90 },
        { type: 'choice', label: '△CDP 等腰要分几种情况', ans: 0,
          options: ['3 种：CP=DP、CP=CD、DP=CD', '2 种', '1 种', '4 种'] }
      ],
      tip: '等腰三角形任意两边都可能相等，三条边两两组合共 3 种；别漏掉「CD 作腰」的情况。',
      explain: ['C(0,9)、D(3,0) ⟹ CD² = 3² + 9² = 90。',
        '设 P(3,p)：CP² = 3² + (p−9)² = p²−18p+90，DP² = p²。',
        '① CP=DP ⟹ p=5；② CP=CD ⟹ p=18（p=0 舍）；③ DP=CD ⟹ p=±3√10。'],
      kp: ['二次函数', '等腰三角形存在性']
    },
    {
      id: 'entry.w12q17b', group: '函数与解析式', no: '附加', title: '附加(3) 含参取值范围 · 第一步',
      prompt: '由对称轴 x=3 得 b=−6a；由交点条件得 c=9a+6，于是 y = ax²−6ax+9a+6 = a(x−3)²+6（a>0）。<br><span class="muted small">第一步：写出顶点纵坐标，判断 0<x<5 上离对称轴最远的是哪一端。</span>',
      fields: [
        { type: 'num', label: '顶点纵坐标（最小值）=', ans: 6 },
        { type: 'choice', label: '0<x<5 上 y 最大出现在', ans: 0,
          options: ['x→0（离对称轴 3 个单位，取不到）', 'x=5', 'x=3', 'x→5（取不到）'] }
      ],
      tip: '开口向上，顶点取最小值；离对称轴越远函数值越大。x=0 距 3、x=5 距 2，所以 x→0 最大但取不到。',
      explain: ['y = a(x−3)²+6，顶点 (3,6)，最小值 6（x=3 在区间内）。',
        'x∈(0,5) 时 x=0 离对称轴 3 个单位、x=5 离 2 个单位，故 x→0 时 y→9a+6 但取不到。',
        '所以 6 ≤ y < 9a+6：左端闭（顶点取得到）、右端开（x=0 取不到）。'],
      kp: ['二次函数', '取值范围']
    },
    {
      id: 'entry.w12q15', group: '圆与扇形', no: '15', title: '15(2) 等边三角形外接圆 · 半径第一步',
      prompt: '△ABC 为等边三角形，边长 AB = 6√3，⊙O 是它的外接圆。<br><span class="muted small">第一步：先定圆心角，再求半径 R——这是 15(2) 的前两个得分点。</span>',
      fields: [
        {
          type: 'choice', label: '圆心角 ∠AOB =', ans: 0,
          options: ['120°', '60°', '90°', '180°']
        },
        { type: 'num', label: '外接圆半径 R =', ans: 6 }
      ],
      fig: { w: 320, h: 220, need: 1, svg: '<circle cx="160" cy="131" r="98" fill="none" stroke="#1b2430" stroke-width="1.5"/><path d="M 160 35 L 75 180 L 245 180 Z" fill="none" stroke="#1b2430" stroke-width="1.5"/><circle cx="160" cy="131" r="2.6" fill="#e37400"/><text x="153" y="28" font-size="14" font-family="serif">A</text><text x="60" y="197" font-size="14" font-family="serif">B</text><text x="249" y="197" font-size="14" font-family="serif">C</text><text x="166" y="128" font-size="13" font-family="serif">O</text><text x="100" y="118" font-size="12" fill="#a15c00">6sqrt(3)</text>' },
      tip: '外心是两条边垂直平分线的交点；等边三角形把圆周三等分，所以 ∠AOB = 360°/3 = 120°。',
      explain: ['作 OD ⊥ AB 于 D：垂径定理得 BD = ½AB = 3√3；外心角 ∠AOB = 2∠C = 120°，所以 ∠BOD = 60°。',
        '在 Rt△BOD 中，OB = BD/sin60° = 3√3 ÷ (√3/2) = 6，即外接圆半径 R = 6。',
        '下一步：弧 AB = 120π×6/180 = 4π；别把圆心角写成 60°（那是圆周角 ∠C）。'],
      kp: ['圆的基本性质', '三角形外接圆', '弧长']
    }
  ];

  /* =====================================================================
     小测错题（2026-11-27）：两周错题合并 + 「不会」详解
     来源：第 12 周限时练习（11.18，7 题）+ 11.25 圆2 周三练习卷（10 题）。
     每题除题干/判分外，还挂一份 learn = {kp, why, steps, traps, model}：
       kp    具体考点（一句话说清考什么）
       why   这次为什么错（对着卷面判卷写的，不是通用套话）
       steps 正确解法的分步思路（点「不会」先看这个）
       traps 易错步骤（哪一步最容易翻车）
       model 涉及的公式/模型 + 使用条件
     UI 在练习页给「不会」按钮，展开就是这份 learn + 原题裁切图；
     注意：「不会」等同「看提示」，计入 hint，不算有效答对（回炉规范）。
     ===================================================================== */
  var QZ = {};

  /* 依据/结论类选择题：正确项 + 干扰项，位置随机（静态题也要打散，否则一路点 A） */
  function qzPick(r, label, right, bad) {
    var opts = shuffle(r, [right].concat(bad));
    return { type: 'choice', label: label, options: opts, ans: opts.indexOf(right) };
  }

  /* ---- 基础 1：垂径定理（弦垂直平分半径）11.25 第 3 题 ---- */
  function genQuizPerpChord(r) {
    var R = pick(r, [2, 3, 4, 6, 8, 9, 10, 12]);
    return {
      id: 'quiz.b3', kind: 'b3', title: '垂径定理：弦垂直平分半径',
      prompt: '⊙O 的半径为 ' + R + '，一条弦垂直平分这条半径。这条弦的长为 k√3，求 k。',
      fields: [
        basisField(r, 'perp', '依据'),
        { type: 'num', label: 'k =', ans: R }
      ],
      tip: '弦「垂直平分半径」⟹ 弦心距 = 半径的一半；半弦、弦心距、半径凑成直角三角形。',
      explain: ['弦垂直平分半径 ⟹ 圆心到弦的距离 OM = ' + R + '/2。',
        '连半径 OA：Rt△OAM 中 AM = √(' + R + '² − (' + R + '/2)²) = (√3/2) × ' + R + '。',
        '弦长 AB = 2AM = √3 × ' + R + '，所以 k = ' + R + '。'],
      kp: ['垂径定理', '勾股定理']
    };
  }
  QZ.b3 = {
    tryIt: '「基础快练」→ 垂径定理（专项 3 题，弦长/弦心距/半径知二求一）',
    kp: '垂径定理 + 勾股：弦长、弦心距、半径三个量知二求一',
    why: '把「弦垂直平分半径」当成「弦心距 = 半径」，算出 2R 一档的答案；或只算了半弦，忘了乘 2。',
    steps: ['先把条件翻成距离：弦过半径的中点且垂直于它 ⟹ 弦心距 d = r/2。',
      '连半径 OA，在 Rt△OAM 里用勾股：半弦 = √(r² − d²) = √3r/2。',
      '弦长 = 2 × 半弦 = √3 r；题问「k√3」，所以 k = r。'],
    traps: ['半弦算完一定要乘 2——原卷错项 √3R/2 就是「忘了乘 2」的那个半弦。',
      '半径是题目给的 r；原卷写的是 2R，别把 r 再翻倍。'],
    model: '垂径定理：垂直于弦的直径平分弦，并且平分弦所对的两条弧。常用勾股式 r² = d² + (弦长/2)²，条件：d 是圆心到弦的距离（弦心距）。'
  };

  /* ---- 基础 2：圆的概念辨析 11.25 第 5 题 ---- */
  function genQuizConcept(r) {
    var right = '三角形的外心到三角形三个顶点的距离相等';
    var opts = shuffle(r, [right,
      '平分弦的直径垂直于弦，并且平分弦所对的两条弧',
      '长度相等的弧是等弧',
      '三个点确定一个圆']);
    return {
      id: 'quiz.b5', kind: 'b5', title: '圆的概念辨析',
      prompt: '下列说法正确的是（　）',
      fields: [{ type: 'choice', label: '', options: opts, ans: opts.indexOf(right) }],
      tip: '逐条补条件：平分弦的直径要「弦不是直径」；等弧要「同圆或等圆」；三点定圆要「不共线」。',
      explain: ['「平分弦的直径垂直于弦」错：当这条弦本身是直径时，两条直径互相平分但不垂直。',
        '「长度相等的弧是等弧」错：弧相等要「在同圆或等圆中能完全重合」，长度相等但弯曲程度不同不是等弧。',
        '「三个点确定一个圆」错：必须是不共线的三点；三点共线时没有圆过这三点。',
        '「三角形的外心到三个顶点距离相等」对：外心是三边垂直平分线的交点，OA = OB = OC。'],
      kp: ['圆的基本概念', '确定圆的条件', '外心']
    };
  }
  QZ.b5 = {
    tryIt: '「基础快练」→ 圆的基本概念（一句话判断对错，练条件）',
    kp: '圆的概念辨析：垂径定理的条件、等弧的定义、三点定圆、外心的性质',
    why: '四条都「好像对」时凭印象选，没有回到定义去补条件——原卷选了「三个点确定一个圆」，漏了「不共线」。',
    steps: ['逐条把结论还原成定义，看条件缺不缺。',
      '垂径定理：垂直于弦的直径平分弦 → 反过来「平分弦的直径垂直于弦」在弦是直径时不成立。',
      '等弧：在同圆或等圆中能完全重合的弧；只有长度相等不够。',
      '三点定圆：不共线的三点确定一个圆（共线时无解）。',
      '外心：三边垂直平分线交点，到三个顶点距离相等（内心是角平分线交点、到三边距离相等，别混）。'],
    traps: ['「平分弦」漏写「弦不是直径」是这类题的标准错项。',
      '「长度相等的弧」≠「等弧」，等弧必须同圆或等圆。'],
    model: '垂径定理（条件：直径垂直于弦）；等弧定义（条件：同圆或等圆、能重合）；确定圆的条件（不共线三点）；外心 = 三边垂直平分线交点。'
  };

  /* ---- 基础 3：弦对圆周角的两解 11.25 第 11 题 ---- */
  var QUIZ_TWO_SOL = [
    { f: 1, txt: '', a: 30, b: 150, why: 'BC = R，半个圆心角 30°' },
    { f: Math.SQRT2, txt: '√2', a: 45, b: 135, why: 'BC = √2R，半个圆心角 45°' },
    { f: Math.sqrt(3), txt: '√3', a: 60, b: 120, why: 'BC = √3R，半个圆心角 60°' }
  ];
  function genQuizTwoAns(r) {
    var t = pick(r, QUIZ_TWO_SOL), R = pick(r, [2, 3, 4, 5, 6, 8]);
    /* 写成「R√2」而不是「√2R」：数字在前不会被读成 √(2R)，也方便 skelOf 抹平 */
    var bcTxt = t.txt ? R + t.txt : String(R);
    return {
      id: 'quiz.b11', kind: 'b11', title: '已知弦和半径求圆周角（两解）',
      prompt: '已知 △ABC 的边 BC = ' + bcTxt + '，且 △ABC 内接于半径为 ' + R + ' 的 ⊙O，则 ∠A 的度数为多少？' +
        '<br><span class="muted small">点 A 可能在优弧上，也可能在劣弧上——两个答案都要写。</span>',
      fields: [
        { type: 'set', n: 2, label: '∠A =', names: ['∠A₁', '∠A₂'], ans: [t.a, t.b], unit: '°' },
        qzPick(r, '漏解的原因', '点 A 在优弧、劣弧上各有一种情况',
          ['圆心可能在三角形外', '弦 BC 可能不是直径', '∠A 可能是钝角，所以无解'])
      ],
      tip: '先由弦长求圆心角：sin(∠BOC/2) = BC/(2R)；圆周角是它的一半，但 A 在两段弧上，另一个答案是 180° 减它。',
      explain: ['连 OB、OC，作 OD ⊥ BC：BD = BC/2，sin∠BOD = BD/OB。',
        t.why + '，所以 ∠BOC = ' + (2 * t.a) + '°。',
        'A 在优弧 BC 上：∠A = ½∠BOC = ' + t.a + '°；A 在劣弧 BC 上：∠A = 180° − ' + t.a + '° = ' + t.b + '°。',
        '两解都来自「A 在哪段弧上」，图上只画一种就会漏。'],
      kp: ['圆周角定理', '分类讨论', '圆内接四边形对角互补']
    };
  }
  QZ.b11 = {
    tryIt: '「基础快练」→ 圆周角定理（专项 3 题；再自己画一次 A 在劣弧的图）',
    kp: '圆周角定理 + 两解讨论（点在优弧/劣弧）',
    why: '只画了 A 在优弧上的一种图，答案只写 45°；红笔补的 135° 就是漏掉的第二种情况。',
    steps: ['连 OB、OC，作弦心距 OD：Rt△OBD 中 sin∠BOD = (BC/2)/R。',
      '算出圆心角 ∠BOC = 2∠BOD。',
      'A 在优弧上：∠A = ½∠BOC（圆周角定理）。',
      'A 在劣弧上：∠A = 180° − ½∠BOC（圆内接四边形对角互补，或同弧的圆周角与它对顶的角互补）。',
      '两个答案一起写，缺一不给分。'],
    traps: ['「弦对两个圆周角」是这类题唯一的坑：题目没给图时，先问「A 在哪段弧上」。',
      '别把 180° − ∠A 写成 90° − ∠A。'],
    model: '圆周角定理：同弧所对的圆周角等于圆心角的一半；圆内接四边形对角互补。使用条件：角和弧必须对应「同一条弧」。'
  };

  /* ---- 基础 4：直径 + 角平分线求弦 11.25 第 12 题 ---- */
  var QUIZ_DIAM_TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]];
  function genQuizDiamBisector(r) {
    var t = pick(r, QUIZ_DIAM_TRI), a = t[0], b = t[1], c = t[2];
    return {
      id: 'quiz.b12', kind: 'b12', title: '直径 + 角平分线求弦长',
      prompt: 'AB 是 ⊙O 的直径，弦 AC = ' + a + '，弦 BC = ' + b + '，∠ACB 的平分线 CD 交 ⊙O 于点 D。' +
        '<br><span class="muted small">求 ∠DCB，以及 BD、CD 的长（都写成 k√2 的形式）。</span>',
      fields: [
        basisField(r, 'diam', '∠ACB = 90° 的依据'),
        { type: 'num', label: '∠DCB =', ans: 45, unit: '°' },
        { type: 'num', label: 'BD = k√2，k =', ans: c / 2 },
        { type: 'num', label: 'CD = m√2，m =', ans: (a + b) / 2 }
      ],
      tip: '见直径先标 90°；角平分线给 45°；同弧 BD 的圆周角相等 ⟹ ∠DAB = 45° ⟹ △ADB 是等腰直角三角形。',
      explain: ['AB 是直径 ⟹ ∠ACB = 90°，∠ADB = 90°。',
        'CD 平分 ∠ACB ⟹ ∠DCB = 45°。',
        '同弧 BD：∠DAB = ∠DCB = 45°；Rt△ADB 中 ∠ADB = 90°、∠DAB = 45° ⟹ AD = DB = AB/√2 = ' + frac(c / 2) + '√2。',
        'CD：由「AC + BC = √2 CD」（第 18(2) 的结论，可用延长 CB 构造全等证明）得 CD = (' + a + ' + ' + b + ')/√2 = ' + frac((a + b) / 2) + '√2。'],
      kp: ['直径所对的圆周角', '同弧所对的圆周角', '等腰直角三角形']
    };
  }
  QZ.b12 = {
    tryIt: '「基础快练」→ 直径所对圆周角 + 弦、弧、圆心角（各 3 题）',
    kp: '直径所对圆周角 90° + 角平分线 + 同弧圆周角相等 + 等腰直角三角形',
    why: '两条弦只算出勾股数（5）就停手，没把「45°」接到 △ADB 上；BD 写成 AB/2 而不是 AB/√2。',
    steps: ['AB 是直径 ⟹ ∠ACB = 90°、∠ADB = 90°（两个直角先标上）。',
      'CD 平分 ∠ACB ⟹ ∠DCB = 45°。',
      '同弧 BD 所对的两个圆周角相等：∠DAB = ∠DCB = 45°。',
      'Rt△ADB 中两锐角都是 45° ⟹ AD = DB = AB/√2 = (AB/2)√2。',
      'CD 用结论 AC + BC = √2 CD ⟹ CD = (AC + BC)/√2。'],
    traps: ['BD = AB/√2，不是 AB/2：斜边是直角边的 √2 倍，反过来要除 √2。',
      '∠DAB = ∠DCB 的依据是「同弧 BD」，不是「角平分线」。'],
    model: '直径所对的圆周角是直角；同弧所对的圆周角相等；等腰直角三角形斜边 = 直角边 × √2；结论 BC + AC = √2 CD（第 18(2) 可证）。'
  };

  /* ---- 基础 5：网格里三点定圆 11.25 第 10 题 ---- */
  function genQuizGrid(r) {
    return {
      id: 'quiz.b10', kind: 'b10', title: '网格中三点定圆求半径',
      prompt: '网格中每个小正方形的边长都是 1，一条圆弧经过 A、B、C 三点（见截图）。' +
        '<br><span class="muted small">这条圆弧所在圆的半径长为 √k，求 k。</span>',
      fields: [{ type: 'num', label: 'k =', ans: 5 }],
      tip: '三点定圆：圆心在 AB、BC 的中垂线交点上。把网格当坐标系，算出圆心到 A 的横、纵差。',
      explain: ['以网格线为坐标轴写出 A、B、C 的坐标（格点）。',
        '圆心 O 到 A、B 距离相等 ⟹ O 在 AB 的中垂线上；同理在 BC 的中垂线上。两条中垂线的交点就是圆心。',
        '从图上看 OA 的「横差 1、纵差 2」，所以 r² = 1² + 2² = 5，r = √5，k = 5。',
        '校验：OB² = 2² + 1² = 5，OC² 也是 5 —— 三点到 O 距离相等才算对。'],
      kp: ['三点定圆', '垂径定理', '勾股定理']
    };
  }
  QZ.b10 = {
    tryIt: '「基础快练」→ 垂径定理（弦心距与半弦的勾股）',
    kp: '三点定圆（圆心 = 两条弦中垂线交点）+ 网格坐标 + 勾股',
    why: '凭感觉量半径，答了 13；没有把「圆弧」补成整圆、也没有找圆心。',
    steps: ['把网格当坐标系，读出 A、B、C 三个格点坐标。',
      '作 AB、BC 的中垂线，交点就是圆心 O（三点定圆）。',
      '数出 O 到 A 的横向、纵向格数（1 和 2），用勾股：r² = 1² + 2² = 5。',
      'r = √5，所以 k = 5。'],
    traps: ['半径是 √5 不是 5：k 是根号里的数，答 13 是「量了另一个三角形」。',
      '别用「AB 的一半」当半径：AB 是弦不是直径。'],
    model: '不共线三点确定一个圆，圆心是任意两条弦的垂直平分线交点；网格题把长度换成坐标差再用勾股。'
  };

  /* ---- 进阶 1：射门角度最大 11.25 第 8 题 ---- */
  function genQuizGoal(r) {
    return {
      id: 'quiz.a8', kind: 'a8', title: '射门角度最大（圆周角比较）',
      prompt: '足球比赛中，从 A、B、C、D 四个位置向球门 PQ 射门，其中 P、Q、B、C 在 ⊙O 上，点 A 在 ⊙O 外，点 D 在 ⊙O 内。' +
        '射门角度是射门位置与 P、Q 连线的夹角，则射门角度最大的位置是（　）',
      fields: [{
        type: 'choice', label: '', ans: 3,
        options: ['点 A 处', '点 B 处', '点 C 处', '点 D 处']
      }],
      tip: '同弧上的圆周角都相等（B、C 一样大）；圆内点张角更大、圆外点更小——用外角定理证。',
      explain: ['B、C 都在 ⊙O 上，对着同一段弧 PQ，所以 ∠PBQ = ∠PCQ（同弧所对的圆周角相等）。',
        '延长 PD 交 ⊙O 于 M，连 QM：△DMQ 中 ∠PDQ 是顶点 D 处的外角，∠PDQ = ∠PMQ + ∠MQD > ∠PMQ；而 M、B 都在圆上，∠PMQ = ∠PBQ。',
        '设 QA 交 ⊙O 于 N，连 PN：A 在圆外，从 A 看 PQ 的张角比从圆上的 N 看更小（把 A 沿 QA 推到圆上，张角变大），所以 ∠PAQ < ∠PNQ = ∠PBQ。',
        '所以 ∠PAQ < ∠PBQ = ∠PCQ < ∠PDQ，射门角度最大的是点 D。'],
      kp: ['圆周角定理', '三角形外角', '点与圆的位置关系']
    };
  }
  QZ.a8 = {
    tryIt: '「基础快练」→ 圆周角定理（把「圆内 > 圆上 > 圆外」的图自己画一遍）',
    kp: '圆周角定理 + 三角形外角（比较不同位置的张角）',
    why: '选了 C，凭「站在圆上角度最大」的直觉；没有把「圆内、圆上、圆外」和张角大小联系起来。',
    steps: ['先认出 B、C 在同一段弧上 ⟹ 两点张角相等（同弧圆周角相等）。',
      '圆内的点 D：延长 PD 交圆于 M，∠PDQ 是 △DMQ 的外角 ⟹ 比 ∠PMQ（= ∠PBQ）大。',
      '圆外的点 A：QA 交圆于 N，∠PAQ 比圆上 N 处的 ∠PNQ 小 ⟹ 比 ∠PBQ 小。',
      '结论：圆内 > 圆上（相等）> 圆外。'],
    traps: ['同弧上的点张角一样大，不是「离球门近就大」。',
      '比较角的大小要用外角定理，不能只靠看图。'],
    model: '圆周角定理：同弧所对的圆周角相等；三角形外角等于不相邻两内角之和。'
  };

  /* ---- 进阶 2：等弦 → 等弧 → 等弦 11.25 第 15 题 ---- */
  function genQuizEqArc(r) {
    return {
      id: 'quiz.a15', kind: 'a15', title: '等弦→等弧→等弦（证明思路）',
      prompt: 'AD、BC 是 ⊙O 上的两条弦，AD = BC。判断 AB 和 CD 的长是否相等，并说明证明思路。' +
        '<br><span class="muted small">不需要写完整过程，但要选对每一步的依据。</span>',
      fields: [
        qzPick(r, '第一步：由 AD = BC 得到', '弧AD = 弧BC',
          ['∠A = ∠C', 'AD ∥ BC', 'AB = CD']),
        qzPick(r, '最后一步：由「弧CD = 弧AB」得 AB = CD，依据是', '等弧所对的弦相等',
          ['全等三角形对应边相等', '垂径定理', '同弧所对的圆周角相等'])
      ],
      tip: '在同圆中，等弦 ⟹ 等弧；弧是「可加的」——两边同加弧 AC，就得到弧 CD = 弧 AB，再推 AB = CD。',
      explain: ['AD = BC（同圆中的两条弦）⟹ 弧AD = 弧BC。',
        '两边同时加上弧 AC：弧AD + 弧AC = 弧BC + 弧AC。',
        '即弧CD = 弧AB（图中 D、A、C、B 依次排列，弧 CD 由弧 AD + 弧 AC 组成）。',
        '在同圆中，等弧所对的弦相等 ⟹ AB = CD。'],
      kp: ['弦、弧、圆心角的关系', '弧的和差']
    };
  }
  QZ.a15 = {
    tryIt: '「基础快练」→ 弧、弦、圆心角（专项 3 题）',
    kp: '在同圆中「等弦 ⟺ 等弧 ⟺ 等圆心角」，以及弧的加减',
    why: '卷面直接写「AD = BC ⟹ AB = CD」，跳过了弧的推理；全等的三个条件里对应角写错，被判「证明过程有误」。',
    steps: ['先翻译：在同圆中 AD = BC ⟹ 弧AD = 弧BC（等弦对等弧）。',
      '把弧看成长度可加的线段：两边同加弧 AC ⟹ 弧CD = 弧AB。',
      '再翻回去：等弧所对的弦相等 ⟹ AB = CD。',
      '要写完整过程，就把这三句按「因为…所以…」写清，别跳步。'],
    traps: ['「等弦推等弧」必须写明「在同圆（或等圆）中」，否则不成立。',
      '弧相加要看清字母顺序（弧 CD = 弧 AD + 弧 AC），画图标清楚再写。'],
    model: '在同圆或等圆中：圆心角相等 ⟺ 弧相等 ⟺ 弦相等（三组量可互相推出）；弧可以像线段一样相加。'
  };

  /* ---- 进阶 3：平行四边形的圆与阴影面积 11.25 第 16 题 ---- */
  function genQuizParaCircle(r) {
    return {
      id: 'quiz.a16', kind: 'a16', title: '平行四边形 + 圆：等弧与阴影面积',
      prompt: '以平行四边形 ABCD 的顶点 A 为圆心、AB 为半径作圆，分别交 AD、BC 于点 E、F，延长 BA 交 ⊙A 于点 G。' +
        '<br>(1) 求证：弧GE = 弧EF；(2) 连接 EF，若四边形 ABFE 是菱形，BG = 8，求阴影部分（扇形与三角形之间那块）的面积。' +
        '<br><span class="muted small">先选对第 (1) 问的关键一步，再算第 (2) 问的面积。</span>',
      fields: [
        qzPick(r, '第(1)问：要证 弧GE = 弧EF，关键是证', '∠GAE = ∠EAF',
          ['GA = AF', '∠AGE = ∠AFE', 'AE ⊥ BF']),
        qzPick(r, '第(2)问：阴影部分的面积是', '扇形 BAF 的面积 − △ABF 的面积',
          ['扇形 BAF 的面积 + △ABF 的面积', '半圆的面积 − △ABF 的面积', '⊙A 的面积 − 菱形 ABFE 的面积']),
        { type: 'num', label: '扇形 BAF 的圆心角 =', ans: 60, unit: '°' },
        { type: 'num', label: '阴影面积 S = kπ − m√3，k =', ans: 8 / 3 },
        { type: 'num', label: 'm =', ans: 4 }
      ],
      tip: '弧等要靠圆心角等：AB = AF ⟹ 等腰；AD ∥ BC ⟹ 内错角/同位角，两步接起来。面积算「扇形减三角形」，先由菱形把半径定出来。',
      explain: ['(1) 连 AF。AB = AF（同圆半径）⟹ ∠ABF = ∠AFB。',
        'AD ∥ BC ⟹ ∠GAE = ∠ABF（同位角）、∠EAF = ∠AFB（内错角），所以 ∠GAE = ∠EAF。',
        '同圆中圆心角相等 ⟹ 弧GE = 弧EF。',
        '(2) 菱形 ABFE ⟹ AB = AF = BF，又 G、A、B 共线且 AG = AB，BG = 2AB = 8 ⟹ AB = 4。',
        '△ABF 三边相等 ⟹ 等边三角形 ⟹ ∠BAF = 60°。',
        'S阴影 = S扇形BAF − S△ABF = 60/360 × π × 4² − (√3/4) × 4² = 8π/3 − 4√3，即 k = 8/3、m = 4。'],
      kp: ['弧、弦、圆心角的关系', '平行四边形与菱形', '扇形面积', '等边三角形面积']
    };
  }
  QZ.a16 = {
    tryIt: '「基础快练」→ 弓形面积 + 扇形面积（各 3 题；都是「扇形减三角形」）',
    kp: '弧等 ⟸ 圆心角等；扇形面积减三角形面积；菱形的性质定半径',
    why: '(1) 角的关系没接上：知道 AB=AF 却没写 AD∥BC 给出的同位角/内错角，过程被判乱；(2) 没有先用菱形 + BG=8 定出半径，扇形和三角形都用错数。',
    steps: ['第(1)问：连 AF，先由 AB = AF 得 ∠ABF = ∠AFB。',
      '再用 AD ∥ BC：∠GAE = ∠ABF（同位角），∠EAF = ∠AFB（内错角）⟹ ∠GAE = ∠EAF。',
      '圆心角相等 ⟹ 弧GE = 弧EF。',
      '第(2)问：菱形 ABFE ⟹ AB = AF = BF；G、A、B 共线，BG = 2AB = 8 ⟹ 半径 R = 4。',
      '△ABF 等边 ⟹ ∠BAF = 60°，扇形面积 = 60πR²/360 = πR²/6。',
      '△ABF 面积 = (√3/4)R²；阴影 = 两者相减 = 8π/3 − 4√3。'],
    traps: ['第(1)问的角必须写清「哪两条平行线、哪条截线」，否则依据不成立。',
      'BG = BA + AG = 2R，别把 BG 直接当半径。',
      '扇形圆心角是 ∠BAF = 60°，不是 90° 或 120°。'],
    model: 'S扇形 = nπR²/360；正三角形面积 = (√3/4)a²；在同圆中圆心角相等 ⟺ 弧相等。'
  };

  /* ---- 进阶 4：BC 为直径 + 等边三角形 11.25 第 17 题 ---- */
  function genQuizDiamEqui(r) {
    return {
      id: 'quiz.a17', kind: 'a17', title: 'BC 为直径：判断三角形形状 + 求长',
      prompt: '在 △ABC 中，∠A = 60°，以 BC 为直径的 ⊙O 交 △ABC 的边 AB、AC 于 D、E 两点。' +
        '<br>(1) 判断 △ODE 的形状；(2) 若 BD = √2·AD，DE = √5/2，求 AD 的长。',
      fields: [
        qzPick(r, '(1) △ODE 是', '等边三角形',
          ['等腰直角三角形', '等腰三角形（不一定是等边）', '直角三角形']),
        { type: 'num', label: '(2) AD =', ans: 1 }
      ],
      tip: '见直径先连出 90°：∠BDC = 90° ⟹ ∠ADC = 90°；∠A = 60° 给出 30°；圆心角是圆周角的两倍。',
      explain: ['(1) 连 CD。BC 是直径 ⟹ ∠BDC = 90°，所以 ∠ADC = 90°；又 ∠A = 60° ⟹ ∠ACD = 30°。',
        '同弧 DE：圆心角 ∠DOE = 2∠DCE = 2∠ACD = 60°；OD = OE（半径）⟹ △ODE 是等边三角形。',
        '(2) 设 AD = x，则 BD = √2x。Rt△ADC 中 ∠ACD = 30° ⟹ AC = 2x，DC = √3x。',
        '△ODE 等边且 OD = DE ⟹ 半径 OD = √5/2，直径 BC = 2OD = √5。',
        'Rt△BDC：BD² + DC² = BC² ⟹ 2x² + 3x² = 5 ⟹ x = 1（负值舍去），AD = 1。'],
      kp: ['直径所对的圆周角', '三角形内角和', '圆心角与圆周角', '勾股定理']
    };
  }
  QZ.a17 = {
    tryIt: '「基础快练」→ 弦等于半径（等边三角形）+ 直径所对圆周角',
    kp: '直径所对圆周角 90° + 圆心角是圆周角两倍 + 30° 直角三角形 + 勾股',
    why: '第(1)问几乎没写；第(2)问没设元，也没把「DE 就是半径」这一步用上，勾股列不出来。',
    steps: ['第(1)问先连 CD：BC 是直径 ⟹ ∠BDC = 90°，于是 ∠ADC = 90°。',
      '∠A = 60° ⟹ ∠ACD = 30°；同弧 DE ⟹ ∠DOE = 2∠ACD = 60°。',
      'OD = OE 且夹角 60° ⟹ 等边三角形。',
      '第(2)问设 AD = x：BD = √2x；30° 直角三角形里 AC = 2x、DC = √3x。',
      '等边 △ODE ⟹ 半径 = DE = √5/2 ⟹ BC = √5。',
      'Rt△BDC 勾股：2x² + 3x² = 5 ⟹ x = 1。'],
    traps: ['∠DOE = 2∠DCE 才是圆心角与圆周角的关系，别写成 ∠DOE = ∠A = 60°（碰巧相等，理由不同）。',
      'BC = 2OD = 2DE，别把 DE 当直径。',
      '设元后要把 BD、DC、BC 三条边都用 x 表示，再勾股。'],
    model: '直径所对的圆周角是直角；同弧所对的圆心角 = 2 倍圆周角；含 30° 的直角三角形三边比 1 : √3 : 2；勾股定理。'
  };

  /* ---- 进阶 5：附加题 18 综合 ---- */
  function genQuizBonus(r) {
    return {
      id: 'quiz.a18', kind: 'a18', title: '附加题：直径 + 角平分线的探究',
      prompt: 'AB 是 ⊙O 的直径，点 C 是 ⊙O 上一点（不与 A、B 重合），连接 CA、CB，∠ACB 的平分线 CD 与 ⊙O 交于点 D。' +
        '<br>(1) 求 ∠ACD 的度数；(2) 探究 CA、CB、CD 三者的等量关系；(3) E 为 ⊙O 外一点，满足 ED = BD，AB = 3√2，AE = 2，' +
        '若点 P 为 AE 中点，求 PO² 的长（写成 a + b√2 的形式）。',
      fields: [
        { type: 'num', label: '(1) ∠ACD =', ans: 45, unit: '°' },
        qzPick(r, '(2) CA、CB、CD 的关系是', 'CB + CA = √2·CD',
          ['CB + CA = CD', 'CB + CA = 2CD', 'CB² + CA² = CD²']),
        { type: 'num', label: '(3) PO² = a + b√2，a =', ans: 4.5 },
        { type: 'num', label: 'b =', ans: 2 }
      ],
      tip: '附加题先抢第一问：直径 ⟹ ∠ACB = 90°，角平分线 ⟹ 45°。第二问构造全等（延长 CB 到 E 使 BE = AC）。第三问用中位线 PO = ½BE。',
      explain: ['(1) AB 是直径 ⟹ ∠ACB = 90°；CD 平分 ∠ACB ⟹ ∠ACD = ∠BCD = 45°。',
        '(2) 延长 CB 到 E，使 BE = AC，连 DE。圆内接四边形 ADBC ⟹ ∠DAC + ∠DBC = 180°；又 ∠DBE + ∠DBC = 180° ⟹ ∠DBE = ∠DAC。',
        'AD = BD（同弧 CD 上的圆周角 ∠ACD = ∠BCD = 45° 所对的弦相等），于是 △DAC ≌ △DBE（SAS）⟹ CD = DE，∠ADC = ∠BDE。',
        '∠CDE = ∠BDE + ∠CDB = ∠ADC + ∠CDB = 90°，所以 CE = √2 CD，即 CB + AC = √2 CD。',
        '(3) ∠ADB = 90° 且 ∠ABD = ∠ACD = 45° ⟹ △ADB 等腰直角 ⟹ DA = DB = AB/√2 = 3。ED = BD = 3，AE = 2。',
        '作 AM ⊥ DE 于 M、BN ⊥ DE 于 N，可证 △AMD ≌ △DNB，得 AM = DN、MD = BN；设 EM = t 解出 t = 2/3，进而 BE² = 18 + 8√2。',
        'O 是 AB 中点、P 是 AE 中点 ⟹ PO 是 △ABE 的中位线，PO = ½BE，所以 PO² = ¼BE² = 9/2 + 2√2。'],
      kp: ['直径所对的圆周角', '角平分线', '全等三角形构造', '中位线定理', '勾股定理']
    };
  }
  QZ.a18 = {
    tryIt: '「基础快练」→ 圆内接四边形·外角 + 直径所对圆周角（构造全等的两块底子）',
    kp: '直径 ⟹ 90°；角平分线 ⟹ 45°；构造全等证 BC + AC = √2CD；中位线求 PO',
    why: '整题空白（0 分）——不是算不出来，是没写第一步：没有把「AB 是直径」翻译成 ∠ACB = 90°。',
    steps: ['第(1)问：直径 ⟹ ∠ACB = 90°；角平分线 ⟹ 45°。',
      '第(2)问：延长 CB 到 E 使 BE = AC，用圆内接四边形外角证 ∠DBE = ∠DAC，再 SAS 全等。',
      '由全等得 CD = DE 且 ∠CDE = 90° ⟹ CE = √2CD，即 CB + AC = √2CD。',
      '第(3)问：△ADB 是等腰直角三角形 ⟹ DA = DB = 3；再在 DE 两侧作垂线构造全等，求出 BE² = 18 + 8√2。',
      'P、O 都是中点 ⟹ PO 是 △ABE 的中位线 ⟹ PO² = ¼BE²。'],
    traps: ['附加题也要写第一问：45° 是白送的分。',
      '第(2)问不能硬算，必须构造（延长 CB）或旋转；不构造就只能猜。',
      '第(3)问的 PO 是中位线，别去解 △AOP。'],
    model: '直径所对的圆周角是直角；圆内接四边形对角互补（外角 = 内对角）；SAS 全等；三角形中位线平行且等于第三边的一半。'
  };

  /* ---- 上周（11.18）七题的「不会」详解，与已有生成器配套 ---- */
  QZ.bsec = {
    tryIt: '「基础快练」→ 扇形周长（专项 3 题，别只算弧长）',
    kp: '弧长公式 + 扇形周长的组成（弧长 + 两条半径）',
    why: '把「周长」当成「弧长」，只算了 nπr/180，漏掉两条半径。',
    steps: ['先算弧长 l = nπr/180。', '扇形周长 = 弧长 + 2 × 半径。', '把结果拆成 kπ + c，k、c 分别填。'],
    traps: ['公式分母是 180，不是 360。', '要加两条半径，不是一条。'],
    model: 'l = nπr/180；C扇形 = l + 2r。条件：n 是圆心角的度数。'
  };
  QZ.bmiss = {
    tryIt: '「基础快练」→ 缺常数项：提公因式（专项 3 题）',
    kp: '提公因式法解缺常数项的一元二次方程',
    why: '习惯性两边同除 x，把 x = 0 这个根除没了；或者直接开平方，形式对不上。',
    steps: ['移项让右边为 0。', '左边提公因式 x。', '由 ab = 0 ⟹ a = 0 或 b = 0，得两个根（其中一个必为 0）。'],
    traps: ['两边同除 x 会丢根：方程有两个根时不能随便除。'],
    model: 'ab = 0 ⟺ a = 0 或 b = 0；缺常数项 ax² + bx = 0 必有一根为 0。'
  };
  QZ.apar = {
    tryIt: '「基础快练」→ 垂径定理（先练熟弦心距，再回来看两解）',
    kp: '垂径定理求弦心距 + 分类讨论（平行弦在圆心同侧/异侧）',
    why: '只画了两条弦在圆心同侧的一种图，答案少一个；或者把弦长的一半当弦心距。',
    steps: ['分别求两条弦的弦心距 d₁、d₂（勾股：d = √(r² − (弦长/2)²)）。', '同侧：距离 = |d₁ − d₂|。', '异侧：距离 = d₁ + d₂。', '两个答案都写。'],
    traps: ['「两弦平行」没给位置关系，必须分同侧、异侧。', '弦心距对应的是「弦长的一半」，不是整条弦。'],
    model: 'r² = d² + (a/2)²；平行弦距离 = |d₁ ± d₂|，取「+」是异侧、取「−」是同侧。'
  };
  QZ.arel = {
    tryIt: '「基础快练」→ 点与圆的位置关系（把「最远点是端点」练成条件反射）',
    kp: '新定义翻译 + 点与圆的位置关系（线段上最远的点必是端点）',
    why: '把「E 到线段中点的距离」当半径，端点就跑到圆外了——新定义题没翻译成「半径 ≥ max(EC, ED)」。',
    steps: ['先把新定义翻成式子：线段上所有点在圆内或圆上 ⟺ 半径 ≥ 线段上最远点到圆心的距离。', '线段上离圆心最远的点一定是端点（端点比内部点更远）。', '算出 EC、ED，取较大者当最小半径。'],
    traps: ['中点在圆内不代表整条线段在圆内。', '新定义题先逐字翻译，再算。'],
    model: '点与圆：d < r 在圆内、d = r 在圆上、d > r 在圆外；线段上到定点距离的最大值在端点取到。'
  };
  QZ.aarch = {
    tryIt: '「基础快练」→ 垂径定理（拱桥就是「连半径 + 弦心距」的建模）',
    kp: '垂径定理建模 + 勾股（拱桥半径、水位上升后的水面宽）',
    why: '把拱高当半径；水位上升时忘了 OE 要在「R − 拱高」的基础上再加。',
    steps: ['设半径 R，圆心在拱高延长线上：R² = (跨度/2)² + (R − 拱高)²。', '解出 R。', '水位上升 h 后 OE = R − 拱高 + h，水面宽 = 2√(R² − OE²)。'],
    traps: ['拱高不是半径；R − 拱高 才是弦心距。', '上升是「加在弦心距上」，不是加在半径上。'],
    model: 'r² = d² + (a/2)²；弦长 = 2√(r² − d²)。'
  };
  QZ.aiso = {
    tryIt: '「基础快练」→ 对称轴上的点构等腰三角形（专项 3 题，三种情况都要写）',
    kp: '等腰三角形存在性：三种分类 + 两点间距离公式',
    why: '只写了 CP = DP 一种情况，漏掉「以 CD 为腰」的两种，答案少一半。',
    steps: ['等腰三角形按「哪两条边相等」分三种：CP = DP、CP = CD、DP = CD。', '设 P 的坐标，用两点距离平方列方程。', '每种解完检查是否与已知点重合（重合要舍去）。'],
    traps: ['三种情况缺一不可；解出的点若正好是 D 要舍去。', '含根号的两个点也算两个解。'],
    model: '两点距离公式；分类讨论要「不重不漏」，最后回代检验。'
  };
  QZ.arange = {
    tryIt: '「基础快练」→ 闭区间最值（先把「顶点 / 端点谁大」练稳，再回开区间）',
    kp: '二次函数在开区间上的取值范围（顶点最值 + 端点比较）',
    why: '右端写成「≤」；或者没比较两个端点，直接把顶点当最大值。',
    steps: ['先看对称轴在不在区间内：在，顶点处取最小值。', '比较两个端点离对称轴的远近，远的那个更大。', '端点不在开区间内 ⟹ 最大值只能「<」，不能取等。'],
    traps: ['开区间两端都取不到，所以最值符号是「≤ y <」不是「≤ y ≤」。', '开口向上的抛物线，最大值在离对称轴较远的端点。'],
    model: 'y = a(x − h)² + k（a > 0）：最小值 k；区间最值看「顶点在不在区间内」和「端点离对称轴远近」。'
  };

  /* ---------- 模块注册表：加新训练 = 加一个模块 ----------
     数组顺序 = 每天的练习顺序 = 页签顺序 = 卡片顺序：基础快练（热身）→ 写解析式 → 大题前两步。
     改顺序只改这里；不要在别处硬编码顺序。
     题型上的 group 只影响模块页的分组标题（同 group 的卡片排在一起）；不写 group 就不分组。 */
  var MODULES = [
    {
      id: 'drill', name: '基础快练', icon: '⚡',
      desc: '九个板块、47 个题型，限时一次就对：方程与代数 / 二次函数 / 反比例函数 / 圆·概念与角 / 圆·弦与垂径 / 圆·弧长面积与应用 / 直线与圆 / 图形与变换 / 推理与证明。大题得分点（关联圆、拱桥、等腰存在性、开区间、等边外接圆弧长、平行弦、尺规找圆心、最短路径）归「大题前两步」。',
      kinds: [
        /* group 只决定模块页怎么分组显示；数组顺序 = 「开始一轮」的混抽顺序 = 今日轮换顺序 */
        /* —— 方程与代数 —— */
        { id: 'factor', name: '因式分解（十字相乘）', group: '方程与代数', gen: genFactor },
        { id: 'eq', name: '解一元二次方程', group: '方程与代数', gen: genEq },
        { id: 'complete', name: '配方法 / 直接开平方', group: '方程与代数', gen: genComplete },
        { id: 'missingconst', name: '缺常数项：提公因式', group: '方程与代数', gen: genMissingConst },
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
        { id: 'circledef', name: '圆的基本概念', group: '圆·概念与角', gen: genCircleDef },
        { id: 'ptcirc', name: '点与圆的位置关系', group: '圆·概念与角', gen: genPtCirc },
        { id: 'circum', name: '直角三角形外接圆', group: '圆·概念与角', gen: genCircum },
        { id: 'radiusiso', name: '连半径得等腰', group: '圆·弦与垂径', gen: genRadiusIso },
        { id: 'perpchord', name: '垂径定理', group: '圆·弦与垂径', gen: genPerpChord },
        { id: 'diam90', name: '直径所对圆周角', group: '圆·概念与角', gen: genDiam90 },
        { id: 'cycquad', name: '圆内接四边形', group: '圆·概念与角', gen: genCycQuad },
        { id: 'circangle', name: '圆周角定理', group: '圆·概念与角', gen: genCircAngle },
        { id: 'arcchord', name: '弧、弦、圆心角', group: '圆·弦与垂径', gen: genArcChord },
        { id: 'arclen', name: '弧长', group: '圆·弧长面积与应用', gen: genArcLen },
        { id: 'sector', name: '扇形面积', group: '圆·弧长面积与应用', gen: genSector },
        { id: 'cone', name: '圆锥的侧面积', group: '圆·弧长面积与应用', gen: genCone },
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
        /* —— 推理与证明 —— */
        { id: 'absurd', name: '反证法第一步', group: '推理与证明', gen: genAbsurd },
        /* —— 保留的一点圆计算基础（其余圆考点归大题前两步） —— */
        { id: 'secperim', name: '扇形周长', group: '圆·弧长面积与应用', gen: genSecPerim },
        { id: 'circumcenter', name: '三角形外心', group: '圆·弦与垂径', gen: genCircumCenter },
        /* —— 第二十九章《圆》单元测试卷补的五个基础考点（2026-11-21） —— */
        { id: 'chordradius', name: '弦等于半径（等边三角形）', group: '圆·弦与垂径', gen: genChordRadius },
        { id: 'cycqext', name: '圆内接四边形·外角', group: '圆·概念与角', gen: genCycQuadExt },
        { id: 'concentric', name: '同心圆·一条弦截两圆', group: '圆·弦与垂径', gen: genConcentric },
        { id: 'bowarea', name: '弓形面积（扇形 − 三角形）', group: '圆·弧长面积与应用', gen: genBowArea },
        { id: 'circnum', name: '确定圆的个数', group: '圆·概念与角', gen: genCircNum }
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
      desc: '只写每道大题的前 1–2 个得分点，不求解。补的是「大题空白」这一断点；来源：期中卷 20–25、第 11/12 周卷、错题本。按 5 个板块分组，可单题专项，也可板块随机。',
      items: ENTRY
    },
    /* ---------- 小测错题：两周错题合并（2026-11-27 起，取代临时项目「本周错题」） ----------
       来源：① 第 12 周限时练习（11.18）的错题与不会题——第 10、11、12、16 题 + 附加题（卷面第 17 题）；
             ② 11.25 圆2 周三练习卷（46/100：选择错 3、5、8；填空错 10、11、12；解答 15 判错、16(2) 错、17、18 空白）。
       分组：基础题（先把该拿的分拿住）/ 进阶题（大题与分类讨论，给更详细解析）。
       每题 kinds 里的 learn = 考点 / 错因 / 分步解法 / 易错步骤 / 公式模型，练习页「不会」按钮展开；
       裁切图 key：q* = 11.18 卷（week12-img.js），w13-q* = 11.25 卷（week13-img.js）。
       下线方式：删本模块 + 科目配置 tabs 里那一行，其余不动。 */
    {
      id: 'quiz', name: '小测错题', icon: '🎯', daily: false,
      desc: '两周小测错题合并（11.18 限时练习 + 11.25 圆2 周三练习卷）。本周卷 46/100：选择错第 3、5、8 题，填空第 10、11、12 题失分，解答第 15 题判错、第 16(2) 错、第 17、18 题空白。' +
        '按「基础题 / 进阶题」分组：基础题是把该拿的分拿住（垂径、概念、两解、角平分线、三点定圆、扇形周长、提公因式）；' +
        '进阶题给更详细解析（易错步骤、思路、公式模型与使用条件）。每题都能点「不会」看原题截图 + 分步解法 + 考点。',
      diag: [
        '成绩：46/100（选择 20/32 · 填空 10/16 · 解答 16/52）。选择错第 3、5、8 题；填空第 10、11、12 题失分；解答第 15 题判错、第 16(2) 错、第 17、18 题空白；第 13、14 题满分。',
        '概念与条件缺失（第 5 题）：平分弦的直径要「弦不是直径」、等弧要「同圆或等圆」、三点定圆要「不共线」——结论记住了，条件没记住。',
        '分类讨论漏解（第 11 题、上周第 11/17 题）：只画了一种图（A 在优弧上 / 两弦同侧 / 只算 CP=DP），答案少一半。',
        '审题与读图（第 10 题、第 8 题）：网格题没把圆弧补成整圆找圆心；射门题凭「离得近角度大」选，没接上圆周角比较。',
        '方法与建模（第 15、16、17、18 题）：证明跳步、没有第一句依据；大题不写第一步，于是整题空白——这是 36 分里最大的一块。',
        '计算与根号处理（第 12 题）：直径得 90°、角平分线得 45° 都想到了，但 BD/CD 的 √2 关系写错（BD = AB/√2 不是 AB/2）。'
      ],
      kinds: [
        /* —— 基础题 —— */
        { id: 'b3', name: '第 3 题 · 垂径定理求弦长（11.25）', group: '基础题 · 该拿的分',
          ref: '3', refLabel: '11.25 第 3 题', learn: QZ.b3,
          crop: { key: 'w13-q3', cap: '卷面原题：11.25 圆2 周三练习卷 第 3 题（变式：数字会换，做法同一套）' }, gen: genQuizPerpChord },
        { id: 'b5', name: '第 5 题 · 圆的概念辨析（11.25）', group: '基础题 · 该拿的分',
          ref: '5', refLabel: '11.25 第 5 题', learn: QZ.b5,
          crop: { key: 'w13-q5', cap: '卷面原题：11.25 圆2 周三练习卷 第 5 题' }, gen: genQuizConcept },
        { id: 'b11', name: '第 11 题 · 弦与半径求圆周角（两解）（11.25）', group: '基础题 · 该拿的分',
          ref: '11', refLabel: '11.25 第 11 题', learn: QZ.b11,
          crop: { key: 'w13-q11', cap: '卷面原题：11.25 圆2 周三练习卷 第 11 题（变式：数字会换，做法同一套）' }, gen: genQuizTwoAns },
        { id: 'b12', name: '第 12 题 · 直径 + 角平分线求弦（11.25）', group: '基础题 · 该拿的分',
          ref: '12', refLabel: '11.25 第 12 题', learn: QZ.b12,
          crop: { key: 'w13-q12', cap: '卷面原题：11.25 圆2 周三练习卷 第 12 题（变式：数字会换，做法同一套）' }, gen: genQuizDiamBisector },
        { id: 'b10', name: '第 10 题 · 网格里三点定圆（11.25）', group: '基础题 · 该拿的分',
          ref: '10', refLabel: '11.25 第 10 题', learn: QZ.b10,
          crop: { key: 'w13-q10', cap: '卷面原题：11.25 圆2 周三练习卷 第 10 题' }, gen: genQuizGrid },
        { id: 'bsec', name: '第 10 题 · 扇形周长（11.18）', group: '基础题 · 该拿的分',
          ref: '10', refLabel: '11.18 第 10 题', learn: QZ.bsec,
          crop: { key: 'q10', cap: '卷面原题：第 12 周限时练习（11.18）第 10 题（变式：数字会换，做法同一套）' }, gen: genSecPerim },
        { id: 'bmiss', name: '第 13 题(1) · 缺常数项提公因式（11.18）', group: '基础题 · 该拿的分',
          ref: '13', refLabel: '11.18 第 13 题 (1)', learn: QZ.bmiss,
          crop: { key: 'q13', cap: '卷面原题：第 12 周限时练习（11.18）第 13 题（第 2 小题已会，不重复；变式：数字会换，做法同一套）' }, gen: genMissingConst },

        /* —— 进阶题 —— */
        { id: 'a8', name: '第 8 题 · 射门角最大（圆周角比较）（11.25）', group: '进阶题 · 拉分',
          ref: '8', refLabel: '11.25 第 8 题', learn: QZ.a8,
          crop: { key: 'w13-q8', cap: '卷面原题：11.25 圆2 周三练习卷 第 8 题' }, gen: genQuizGoal },
        { id: 'a15', name: '第 15 题 · 等弦→等弧→等弦（11.25）', group: '进阶题 · 拉分',
          ref: '15', refLabel: '11.25 第 15 题', learn: QZ.a15,
          crop: { key: 'w13-q15', cap: '卷面原题：11.25 圆2 周三练习卷 第 15 题' }, gen: genQuizEqArc },
        { id: 'a16', name: '第 16 题 · 平行四边形 + 圆（11.25）', group: '进阶题 · 拉分',
          ref: '16', refLabel: '11.25 第 16 题', learn: QZ.a16,
          crop: { key: 'w13-q16', cap: '卷面原题：11.25 圆2 周三练习卷 第 16 题' }, gen: genQuizParaCircle },
        { id: 'a17', name: '第 17 题 · BC 为直径：形状与 AD（11.25）', group: '进阶题 · 拉分',
          ref: '17', refLabel: '11.25 第 17 题', learn: QZ.a17,
          crop: { key: 'w13-q17', cap: '卷面原题：11.25 圆2 周三练习卷 第 17 题' }, gen: genQuizDiamEqui },
        { id: 'a18', name: '第 18 题 · 附加题综合（11.25）', group: '进阶题 · 拉分',
          ref: '18', refLabel: '11.25 第 18 题（附加）', learn: QZ.a18,
          crop: { key: 'w13-q18', cap: '卷面原题：11.25 圆2 周三练习卷 第 18 题' }, gen: genQuizBonus },
        { id: 'apar', name: '第 11 题 · 平行弦之间的距离（11.18）', group: '进阶题 · 拉分',
          ref: '11', refLabel: '11.18 第 11 题', learn: QZ.apar,
          crop: { key: 'q11', cap: '卷面原题：第 12 周限时练习（11.18）第 11 题（变式：数字会换，做法同一套）' }, gen: genParallelDist },
        { id: 'arel', name: '第 12 题 · 关联圆（11.18）', group: '进阶题 · 拉分',
          ref: '12', refLabel: '11.18 第 12 题', learn: QZ.arel,
          crop: { key: 'q12', cap: '卷面原题：第 12 周限时练习（11.18）第 12 题（变式：数字会换，做法同一套）' }, gen: genRelateCircle },
        { id: 'aarch', name: '第 16 题 · 圆弧形拱桥（11.18）', group: '进阶题 · 拉分',
          ref: '16', refLabel: '11.18 第 16 题', learn: QZ.aarch,
          crop: { key: 'q16', cap: '卷面原题：第 12 周限时练习（11.18）第 16 题（变式：数字会换，做法同一套）' }, gen: genArchCircle },
        { id: 'aiso', name: '第 17 题(2) · 等腰三角形存在性（11.18）', group: '进阶题 · 拉分',
          ref: '17', refLabel: '11.18 第 17 题 (2)', learn: QZ.aiso,
          crop: { key: 'q17', cap: '卷面原题：第 12 周限时练习（11.18）第 17 题（附加题）（变式：数字会换，做法同一套）' }, gen: genIsoPoint },
        { id: 'arange', name: '第 17 题(3) · 开区间取值范围（11.18）', group: '进阶题 · 拉分',
          ref: '17', refLabel: '11.18 第 17 题 (3)', learn: QZ.arange,
          crop: { key: 'q17', cap: '卷面原题：第 12 周限时练习（11.18）第 17 题（附加题）（变式：数字会换，做法同一套）' }, gen: genRangeOpen }
      ]
    }
  ];

  /* ---------- 题库容量（2026-11-23）----------
     每个题型的「不重复题干数」，口径 = sigOf（mod.kind + 题干与题图的哈希），
     由 seed 扫描 1..3000 饱和得出；页面据此算「做过 a / 总 b」的覆盖比例。
     -1 = 不设上限（纯数字随机，如判别式 / 写解析式各题型），只统计练了几道，
          不给百分比，否则永远到不了 100%。
     「大题前两步」是固定得分点，一个得分点 1 道题，所以分母都是 1 —— 做过就 100%。
     改题 / 加题后这张表会漂移：`node 数学/题库工具/check-training.mjs pools`
     会重扫并逐项比对，不一致时按打印出的新数字改这里，不要手估。 */
  var POOLS = {
    'drill.factor': 62, 'drill.eq': 169, 'drill.complete': 96, 'drill.missingconst': 28,
    'drill.eqdef': 1, 'drill.disc': -1, 'drill.vieta': 91, 'drill.growth': 17, 'drill.areaeq': 12,
    'drill.vertexprop': -1, 'drill.vertexmax': -1, 'drill.coef': -1, 'drill.plug': -1,
    'drill.shift': -1, 'drill.rangemax': -1, 'drill.fxeq': 18, 'drill.invprop': 97,
    'drill.invarea': 68, 'drill.circledef': 1, 'drill.ptcirc': 84, 'drill.circum': 20,
    'drill.radiusiso': 82, 'drill.perpchord': 18, 'drill.diam90': 41, 'drill.cycquad': -1,
    'drill.circangle': 244, 'drill.arcchord': 68, 'drill.arclen': 68, 'drill.sector': 87,
    'drill.cone': 42, 'drill.linecircle': 84, 'drill.tanprop': 61, 'drill.tanjudge': 10,
    'drill.tanlen': 39, 'drill.incircle': -1, 'drill.regular': 25, 'drill.rot': 240,
    'drill.sym': -1, 'drill.symshape': 3, 'drill.absurd': 6, 'drill.secperim': 12,
    'drill.circumcenter': 5, 'drill.chordradius': 9, 'drill.cycqext': 8, 'drill.concentric': 8,
    'drill.bowarea': 7, 'drill.circnum': 10,
    'write.vertex': -1, 'write.intercept': -1, 'write.inverse': -1, 'write.profit': -1,
    'write.segment': -1, 'write.piece': -1, 'write.arch': 33, 'write.axis': -1,
    /* 大题前两步：固定得分点，一个得分点一道题 */
    'entry.entry.21.1': 1, 'entry.entry.21.2': 1, 'entry.entry.21.3': 1, 'entry.entry.22.1': 1,
    'entry.entry.22.2': 1, 'entry.entry.23.1': 1, 'entry.entry.23.2': 1, 'entry.entry.20.1': 1,
    'entry.entry.20.2': 1, 'entry.entry.24.1': 1, 'entry.entry.25.1': 1, 'entry.entry.25.2': 1,
    'entry.entry.13.1': 1, 'entry.entry.13.3': 1, 'entry.entry.13.5': 1, 'entry.entry.14.1': 1,
    'entry.entry.15.1': 1, 'entry.entry.16.1': 1, 'entry.entry.16.2': 1, 'entry.entry.17.1': 1,
    'entry.entry.t01': 1, 'entry.entry.t02': 1, 'entry.entry.t03': 1, 'entry.entry.t05': 1,
    'entry.entry.t06': 1, 'entry.entry.t08': 1, 'entry.entry.t11': 1, 'entry.entry.t12': 1,
    'entry.entry.t13': 1, 'entry.entry.t21': 1, 'entry.entry.t22': 1, 'entry.entry.w12q7': 1,
    'entry.entry.w12q12': 1, 'entry.entry.w12q16': 1, 'entry.entry.w12q17a': 1,
    'entry.entry.w12q17b': 1, 'entry.entry.w12q15': 1,
    /* 小测错题（两周合并，2026-11-27）：静态题 1 道，参数化题型按实测 */
    'quiz.b3': 8, 'quiz.b5': 1, 'quiz.b11': 18, 'quiz.b12': 6, 'quiz.b10': 1,
    'quiz.a8': 1, 'quiz.a15': 1, 'quiz.a16': 1, 'quiz.a17': 1, 'quiz.a18': 1,
    'quiz.bsec': 12, 'quiz.bmiss': 28, 'quiz.apar': 6, 'quiz.arel': 5, 'quiz.aarch': 5,
    'quiz.aiso': 4, 'quiz.arange': 5
  };

  /* ---------- 题目情境数（2026-11-23）----------
     覆盖率的正确分母：把题干里的数字抹平后去重。物理/数学的题库里同一个情境会换
     十几次数值（热量计算 270 条题干只有 3 个情境），拿题干数当分母，覆盖率永远
     涨不动，也看不出真实薄弱点。SKELS = 每个题型的「不同情境数」，由 seed 扫描
     按同一把尺子得出；-1 = 不设上限，页面只报练过几个情境，不给百分比。
     改题后跑 `check-*.mjs pools` 会重扫并逐项比对。 */
  var SKELS = {
    /* 基础快练 */
    'drill.factor': 6, 'drill.eq': 12, 'drill.complete': 4, 'drill.missingconst': 3, 'drill.eqdef': 1, 'drill.disc': -1, 'drill.vieta': 12, 'drill.growth': 3, 'drill.areaeq': 2, 'drill.vertexprop': -1, 'drill.vertexmax': -1, 'drill.coef': -1, 'drill.plug': -1, 'drill.shift': -1, 'drill.rangemax': -1, 'drill.fxeq': 3, 'drill.invprop': 9, 'drill.invarea': 4, 'drill.circledef': 1, 'drill.ptcirc': 1, 'drill.circum': 1, 'drill.radiusiso': 2, 'drill.perpchord': 3, 'drill.diam90': 1, 'drill.cycquad': -1, 'drill.circangle': 4, 'drill.arcchord': 3, 'drill.arclen': 3, 'drill.sector': 5, 'drill.cone': 3, 'drill.linecircle': 2, 'drill.tanprop': 2, 'drill.tanjudge': 1, 'drill.tanlen': 3, 'drill.incircle': -1, 'drill.regular': 4, 'drill.rot': 12, 'drill.sym': -1, 'drill.symshape': 3, 'drill.absurd': 6, 'drill.secperim': 1, 'drill.circumcenter': 1, 'drill.chordradius': 1, 'drill.cycqext': 1, 'drill.concentric': 1, 'drill.bowarea': 1, 'drill.circnum': 1,
    /* 写解析式 */
    'write.vertex': -1, 'write.intercept': -1, 'write.inverse': -1, 'write.profit': -1, 'write.segment': -1, 'write.piece': -1, 'write.arch': 1, 'write.axis': -1,
    /* 大题前两步 */
    'entry.entry.21.1': 1, 'entry.entry.21.2': 1, 'entry.entry.21.3': 1, 'entry.entry.22.1': 1, 'entry.entry.22.2': 1, 'entry.entry.23.1': 1, 'entry.entry.23.2': 1, 'entry.entry.20.1': 1, 'entry.entry.20.2': 1, 'entry.entry.24.1': 1, 'entry.entry.25.1': 1, 'entry.entry.25.2': 1, 'entry.entry.13.1': 1, 'entry.entry.13.3': 1, 'entry.entry.13.5': 1, 'entry.entry.14.1': 1, 'entry.entry.15.1': 1, 'entry.entry.16.1': 1, 'entry.entry.16.2': 1, 'entry.entry.17.1': 1, 'entry.entry.t01': 1, 'entry.entry.t02': 1, 'entry.entry.t03': 1, 'entry.entry.t05': 1, 'entry.entry.t06': 1, 'entry.entry.t08': 1, 'entry.entry.t11': 1, 'entry.entry.t12': 1, 'entry.entry.t13': 1, 'entry.entry.t21': 1, 'entry.entry.t22': 1, 'entry.entry.w12q7': 1, 'entry.entry.w12q12': 1, 'entry.entry.w12q16': 1, 'entry.entry.w12q17a': 1, 'entry.entry.w12q17b': 1, 'entry.entry.w12q15': 1,
    /* 小测错题 */
    /* 小测错题（两周合并，2026-11-27） */
    'quiz.b3': 1, 'quiz.b5': 1, 'quiz.b11': 2, 'quiz.b12': 1, 'quiz.b10': 1,
    'quiz.a8': 1, 'quiz.a15': 1, 'quiz.a16': 1, 'quiz.a17': 1, 'quiz.a18': 1,
    'quiz.bsec': 1, 'quiz.bmiss': 3, 'quiz.apar': 1, 'quiz.arel': 1, 'quiz.aarch': 1,
    'quiz.aiso': 2, 'quiz.arange': 4
  };
  MODULES.forEach(function (m) {
    (m.kinds || []).forEach(function (k) {
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
     题图一起进哈希：题干相同、只有图不同的题不能合并成一条。
     小测错题的裁切图只哈希 cropKey，别把几十 KB 的 base64 拖进来。 */
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
     结果按题型缓存，最慢的题型（drill.circangle 244 道）扫一遍约 30 ms。 */
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

  function moduleById(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }

  /* ---------- 出题 ---------- */
  function gen(modId, kindId, seed) {
    var m = moduleById(modId);
    if (!m) throw new Error('未知模块 ' + modId);
    var r = mulberry32((seed >>> 0) || 1);
    if (m.items) {
      /* 大题前两步：传 kindId 就练指定得分点，不传才全场混抽。
         kind 必须写回题目：模块页统计、板块随机覆盖、记录里的题型都靠它。 */
      var it = null;
      if (kindId) for (var j = 0; j < m.items.length; j++) if (m.items[j].id === kindId) { it = m.items[j]; break; }
      if (!it) it = m.items[Math.floor(r() * m.items.length)];
      var copy = JSON.parse(JSON.stringify(it));
      copy.mod = modId;
      copy.kind = it.id;
      return shuffleChoices(copy, r);
    }
    var k = null;
    if (kindId) for (var i = 0; i < m.kinds.length; i++) if (m.kinds[i].id === kindId) { k = m.kinds[i]; break; }
    if (!k) k = m.kinds[Math.floor(r() * m.kinds.length)];
    var q = k.gen(r);
    q.mod = modId;
    /* 题型 id 以「本次注册的 kind」为准：同一个生成器可能被两个模块复用
       （如 genSecPerim 既在基础快练的 secperim，也在小测错题的 bsec），
       统计、错题归集、覆盖表都按注册 id 走，不能被生成器自带的 kind 覆盖。 */
    q.kind = k.id;
    /* 小测错题：题型带 ref/crop/learn 时，把「卷面第几题」、原题裁切图与「不会」详解挂到题目上；
       基础快练里同名题型不带，避免每道变式都贴一张原卷图。 */
    if (k.ref) { q.no = k.ref; if (k.refLabel) q.noLabel = k.refLabel; }
    if (k.crop) {
      /* cropKey/cropCap 写进题目：错题本只存这两个短字段，渲染时再按 key 重建大图（base64 不进 localStorage） */
      q.cropKey = k.crop.key; q.cropCap = k.crop.cap;
      var cf = cropFig(k.crop); if (cf) q.fig = cf;
    }
    if (k.learn) q.learn = k.learn;
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
    /* 圆/几何题用内联 SVG：与题包 fig.svg 同格式（f.svg 是 <svg> 内部片段），
       不走坐标系变换，免得把圆、扇形压扁。只画题设，不标答案。 */
    if (f.svg) {
      var rw = f.w || 360, rh = f.h || 280;
      return '<svg viewBox="0 0 ' + rw + ' ' + rh + '" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="题图">' +
        '<rect width="' + rw + '" height="' + rh + '" fill="#fbfcff" rx="10"/>' + f.svg + '</svg>';
    }
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
      var r2 = mulberry32(plan.seed ^ 0x1f2e3d4c);
      items = items.map(function (x) { return { x: shuffleChoices(x, r2), k: r() }; })
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
    gen: gen, judge: judge, ansText: ansText, svgFor: svgFor, cropFig: cropFig,
    kindPool: kindPool, kindSkel: kindSkel, sigOf: sigOf, skelOf: skelOf, enumerateKind: enumerateKind,
    parseNum: parseNum, near: near, frac: frac, nice: nice,
    fieldVals: fieldVals, slotVal: slotVal, isCoefSlot: isCoefSlot,
    selfTest: selfTest
  };
})();
