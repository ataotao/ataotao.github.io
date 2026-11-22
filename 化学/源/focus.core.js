/* ============================================================
   化学方程式专项 · 核心逻辑（纯数据 + 出题 + 判分，不碰 DOM）
   ------------------------------------------------------------
   三模块：① 化学用语地基（元素/离子/周期表）
           ② 配平四法（最小公倍数 / 奇数配偶 / 观察 / 定一 + 方法选择 + 自检）
           ③ 写方程式与计算（由反应物推生成物 + 相对质量比计算）
   由 build.mjs 内联为 core 脚本节点，check-focus.mjs 抽出跑自检。
   注意：normChem 保留大小写（元素符号 Na ≠ na ≠ NA），与 flash.core.js 不同。
   ============================================================ */
var CF = (function () {
  'use strict';
  var VERSION = 1, DAY = 86400000;

  /* ---------- 可复现随机 ---------- */
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
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pair(r, correct, wrongs) {
    var opts = [correct].concat(shuffled(r, wrongs).slice(0, 3));
    opts = shuffled(r, opts);
    return { type: 'choice', options: opts, ans: opts.indexOf(correct) };
  }

  /* ---------- 输入归一（保留大小写：元素符号大小写是答案的一部分） ---------- */
  function parseNum(input) {
    if (input === null || input === undefined) return NaN;
    if (typeof input === 'number') return isFinite(input) ? input : NaN;
    var s = String(input).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[．。]/g, '.').replace(/[−－—–]/g, '-').replace(/[，,\s]/g, '');
    if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return parseFloat(s);
    var s2 = s.replace(/[A-Za-z\u4e00-\u9fa5%°()（）\/·]+$/g, '');
    if (s2 && s2 !== s && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s2)) return parseFloat(s2);
    return NaN;
  }
  var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-' };
  var SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  function normChem(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, function (c) { return SUP[c] || c; });
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, function (c) { return SUB[c] || c; });
    s = s.replace(/[（）]/g, function (m) { return m === '（' ? '(' : ')'; });
    s = s.replace(/[＋]/g, '+').replace(/[－]/g, '-');
    s = s.replace(/\s+/g, '');
    return s;   // 不转小写：Na / na / NA 是三个不同答案
  }
  function fmtNum(x) {
    if (!isFinite(x)) return '?';
    return String(Math.round(x * 1000) / 1000).replace('-', '−');
  }

  /* ---------- 字段与判分 ---------- */
  function cf(r, correct, wrongs, label) { var f = pair(r, correct, wrongs); f.label = label || ''; return f; }
  function nf(ans, label, unit, tol) { return { type: 'num', ans: ans, label: label || '', unit: unit || '', tol: tol == null ? 0.01 : tol }; }
  function tf(ans, label, alts) { return { type: 'text', ans: ans, label: label || '', alts: alts || [] }; }
  function judge(q, vals) {
    var res = q.fields.map(function (f, i) {
      var v = vals[i];
      if (f.type === 'choice') return { ok: v === f.ans };
      if (f.type === 'text') {
        var s = normChem(v);
        return { ok: s === normChem(f.ans) || (f.alts || []).some(function (a) { return s === normChem(a); }) };
      }
      var x = (typeof v === 'number') ? v : parseNum(v);
      if (!isFinite(x)) return { ok: false };
      return { ok: Math.abs(x - f.ans) <= (f.tol == null ? 0.01 : f.tol) + 1e-9 };
    });
    var got = res.filter(function (x) { return x.ok; }).length;
    return { ok: got === res.length, got: got, total: res.length, res: res };
  }
  function ansText(f) {
    if (f.type === 'choice') return f.options[f.ans];
    if (f.type === 'text') return f.ans;
    return fmtNum(f.ans) + (f.unit || '');
  }
  function mk(title, prompt, fields, tip, explain, kp) {
    return { title: title, prompt: prompt, fields: fields, tip: tip, explain: explain, kp: kp };
  }

  /* ============================================================
     数据：前 20 号 + 初中常见元素（z 原子序数 / s 符号 / n 名称 / a 相对原子质量）
     ============================================================ */
  var ELEMENTS = [
    { z: 1, s: 'H', n: '氢', a: 1 }, { z: 2, s: 'He', n: '氦', a: 4 },
    { z: 3, s: 'Li', n: '锂', a: 7 }, { z: 4, s: 'Be', n: '铍', a: 9 },
    { z: 5, s: 'B', n: '硼', a: 11 }, { z: 6, s: 'C', n: '碳', a: 12 },
    { z: 7, s: 'N', n: '氮', a: 14 }, { z: 8, s: 'O', n: '氧', a: 16 },
    { z: 9, s: 'F', n: '氟', a: 19 }, { z: 10, s: 'Ne', n: '氖', a: 20 },
    { z: 11, s: 'Na', n: '钠', a: 23 }, { z: 12, s: 'Mg', n: '镁', a: 24 },
    { z: 13, s: 'Al', n: '铝', a: 27 }, { z: 14, s: 'Si', n: '硅', a: 28 },
    { z: 15, s: 'P', n: '磷', a: 31 }, { z: 16, s: 'S', n: '硫', a: 32 },
    { z: 17, s: 'Cl', n: '氯', a: 35.5 }, { z: 18, s: 'Ar', n: '氩', a: 40 },
    { z: 19, s: 'K', n: '钾', a: 39 }, { z: 20, s: 'Ca', n: '钙', a: 40 },
    { z: 25, s: 'Mn', n: '锰', a: 55 }, { z: 26, s: 'Fe', n: '铁', a: 56 },
    { z: 29, s: 'Cu', n: '铜', a: 64 }, { z: 30, s: 'Zn', n: '锌', a: 65 },
    { z: 35, s: 'Br', n: '溴', a: 80 }, { z: 47, s: 'Ag', n: '银', a: 108 },
    { z: 53, s: 'I', n: '碘', a: 127 }, { z: 56, s: 'Ba', n: '钡', a: 137 },
    { z: 78, s: 'Pt', n: '铂', a: 195 }, { z: 79, s: 'Au', n: '金', a: 197 },
    { z: 80, s: 'Hg', n: '汞', a: 201 }
  ];
  function elemBy(s) { for (var i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].s === s) return ELEMENTS[i]; return ELEMENTS[0]; }
  var CONFUSE = {
    Na: ['钾', '镁', '钙'], K: ['钠', '钙', '镁'], Mg: ['铝', '锰', '钠'],
    Al: ['镁', '银', '铁'], Fe: ['铜', '锌', '锰'], Cu: ['铁', '锌', '钙'],
    Zn: ['铁', '铜', '锰'], Mn: ['镁', '铁', '锌'], Ca: ['钾', '钠', '镁'],
    Cl: ['碳', '硫', '溴'], S: ['硅', '磷', '氯'], P: ['硅', '硫', '硼'],
    Si: ['硫', '磷', '铝'], O: ['氮', '碳', '氟'], N: ['氧', '碳', '氟'],
    C: ['氧', '氮', '硼'], Ag: ['铝', '金', '铜'], Au: ['银', '铜', '铁'],
    Hg: ['银', '铁', '铜'], Ba: ['钙', '镁', '钠'], H: ['氦', '氮', '氧'],
    Li: ['铝', '钠', '镁'], B: ['硼', '磷', '硅'], F: ['氟', '氯', '溴']
  };
  function wrongNames(r, el) {
    var pool = (CONFUSE[el.s] || []).filter(function (n) { return n !== el.n; });
    if (pool.length < 3) {
      ELEMENTS.forEach(function (e) { if (e.n !== el.n && pool.indexOf(e.n) < 0 && e.z <= 20) pool.push(e.n); });
    }
    var uniq = [];
    pool.forEach(function (x) { if (uniq.indexOf(x) < 0) uniq.push(x); });
    return shuffled(r, uniq).slice(0, 3);
  }

  /* 常见离子：名称 → 符号（右上角，数字在前、正负号在后，1 省略） */
  var IONS = [
    { n: '氢离子', s: 'H⁺', p: 'H+' }, { n: '钠离子', s: 'Na⁺', p: 'Na+' },
    { n: '钾离子', s: 'K⁺', p: 'K+' }, { n: '镁离子', s: 'Mg²⁺', p: 'Mg2+' },
    { n: '钙离子', s: 'Ca²⁺', p: 'Ca2+' }, { n: '铝离子', s: 'Al³⁺', p: 'Al3+' },
    { n: '锌离子', s: 'Zn²⁺', p: 'Zn2+' }, { n: '亚铁离子', s: 'Fe²⁺', p: 'Fe2+' },
    { n: '铁离子', s: 'Fe³⁺', p: 'Fe3+' }, { n: '铜离子', s: 'Cu²⁺', p: 'Cu2+' },
    { n: '银离子', s: 'Ag⁺', p: 'Ag+' }, { n: '钡离子', s: 'Ba²⁺', p: 'Ba2+' },
    { n: '氯离子', s: 'Cl⁻', p: 'Cl-' }, { n: '氧离子', s: 'O²⁻', p: 'O2-' },
    { n: '硫离子', s: 'S²⁻', p: 'S2-' }, { n: '铵根离子', s: 'NH₄⁺', p: 'NH4+' },
    { n: '氢氧根离子', s: 'OH⁻', p: 'OH-' }, { n: '硝酸根离子', s: 'NO₃⁻', p: 'NO3-' },
    { n: '硫酸根离子', s: 'SO₄²⁻', p: 'SO42-' }, { n: '碳酸根离子', s: 'CO₃²⁻', p: 'CO32-' }
  ];

  var TIP_SYM = '元素符号规则：第一个字母大写，第二个字母小写——钠是 Na（不是 NA、不是 na）。前 20 号顺序：氢氦锂铍硼，碳氮氧氟氖，钠镁铝硅磷，硫氯氩钾钙。';
  var TIP_ION = '离子符号写在元素符号右上角：数字在前、正负号在后，电荷数是 1 时省略不写。钠离子 Na⁺，铝离子 Al³⁺，硫酸根 SO₄²⁻。化合价则写在正上方、正负号在前数字在后——两者别混。';
  var TIP_LCM = '最小公倍数法：找左右各出现一次、原子个数不同的元素 → 求两边原子数的最小公倍数 → 公倍数÷各自原子数得系数 → 顺推其它元素 → 最后验算。';
  var TIP_ODD = '奇数配偶法：找某元素在一边奇数、另一边偶数的「单双矛盾」→ 先给含奇数个原子的物质前配 2，把奇数变偶数 → 顺配其它元素 → 最后回配该元素。';
  var TIP_OBS = '观察法：从最复杂的生成物入手，用它内部的原子个数比反推反应物系数（如 Fe₃O₄ 里 Fe:O=3:4，就配 3Fe 和 2O₂ 或 4CO）。';
  var TIP_ONE = '定一法：把最复杂的物质（多是含 C、H、O 的燃料）系数定为 1，依次配 C、H，最后配 O；出现分数时全体同乘分母化整。注意物质本身自带的氧也要算进去。';

  /* ============================================================
     ① 化学用语地基
     ============================================================ */
  function genSymbol(r) {
    var el = pick(r, ELEMENTS);
    var f = cf(r, el.n, wrongNames(r, el), '元素名称');
    return mk('元素符号 → 元素名称', '元素符号 `' + el.s + '` 对应的元素名称是（四选一）', [f],
      TIP_SYM,
      [el.s + ' 是' + el.n + '的元素符号，原子序数 ' + el.z + '，相对原子质量约 ' + fmtNum(el.a) + '。',
       '读符号时第一个字母大写、第二个小写：Na 是钠，Mg 是镁；NA、na 都不是规范写法。'],
      ['元素符号', '化学用语', '第一/三单元']);
  }
  function genName(r) {
    var el = pick(r, ELEMENTS);
    return mk('元素名称 → 元素符号', '写出「' + el.n + '」的元素符号（注意大小写）', [tf(el.s, '元素符号')],
      TIP_SYM,
      [el.n + '的元素符号是 ' + el.s + '（原子序数 ' + el.z + '）。',
       '大小写是判分的一部分：写成 ' + el.s.toLowerCase() + ' 或 ' + el.s.toUpperCase() + ' 都算错。'],
      ['元素符号书写', '化学用语', '大小写易错']);
  }
  function genIon(r) {
    var it = pick(r, IONS);
    return mk('离子符号书写', '写出「' + it.n + '」的离子符号', [tf(it.s, '离子符号', [it.p])],
      TIP_ION,
      [it.n + '写作 ' + it.s + '；右上角数字在前、正负号在后，电荷为 1 时数字省略。',
       '对比化合价：' + it.n.replace('离子', '元素') + '的化合价写在符号正上方，正负号在前、数字在后，1 不能省——写法方向正好相反。'],
      ['离子符号', '化学用语', '离子与化合价辨析']);
  }
  function genIonRule(r) {
    var bank = [
      { q: '铝离子的符号，书写正确的是？', o: ['Al³⁺', 'Al⁺³', 'AL3+', 'Al3'], a: 0,
        e: ['正确写法是 Al³⁺：数字在前、正负号在后，标在右上角。', 'Al⁺³ 是化合价的写法习惯（正上方、号在前），不能用在离子符号上。'] },
      { q: '钠离子的符号是？', o: ['Na⁺', 'Na¹⁺', 'NA⁺', 'Na'], a: 0,
        e: ['钠离子带 1 个单位正电荷，电荷数 1 省略不写，所以是 Na⁺。', 'Na¹⁺ 多写了 1；NA 的大写不对；Na 是钠原子。'] },
      { q: '硫酸根离子的符号是？', o: ['SO₄²⁻', 'SO4⁻²', 'SO₃²⁻', 'SO₄²⁺'], a: 0,
        e: ['硫酸根是 SO₄²⁻，带 2 个单位负电荷。', 'SO₃²⁻ 是亚硫酸根，原子团少一个氧、名称就变了。'] },
      { q: 'Fe²⁺ 的名称是？', o: ['亚铁离子', '铁离子', '氟离子', '镁离子'], a: 0,
        e: ['Fe²⁺ 是亚铁离子，Fe³⁺ 才是铁离子。', '铁有变价，读名称时「亚」字不能丢，写化学式时也要看清是 FeCl₂ 还是 FeCl₃。'] },
      { q: '「氢氧根离子」的符号是？', o: ['OH⁻', 'HO⁻', 'OH⁺', 'H⁻'], a: 0,
        e: ['氢氧根是 OH⁻，是常见的 -1 价原子团。', '顺序不能写成 HO；它和氢氧根 OH⁻ 不是同一个写法。'] }
    ];
    var it = pick(r, bank);
    var f = cf(r, it.o[it.a], it.o.filter(function (x, i) { return i !== it.a; }), '选择');
    return mk('离子与化合价写法辨析', it.q, [f], TIP_ION, it.e, ['离子符号', '书写规范', '高频易错']);
  }
  function genPeriod(r) {
    var bank = [
      { q: '某元素原子序数为 11、相对原子质量约 23，它是？', o: ['钠 Na', '镁 Mg', '钾 K', '氖 Ne'], a: 0,
        e: ['原子序数 11 是钠（Na），相对原子质量约 23。', '周期表一格中：左上数字是原子序数（=质子数），下方小数是相对原子质量；别把 23 当成原子序数。'] },
      { q: '元素周期表中，原子序数等于下列哪一项？', o: ['质子数', '中子数', '电子层数', '相对原子质量'], a: 0,
        e: ['原子序数 = 核电荷数 = 质子数 = 核外电子数（原子呈电中性时）。', '相对原子质量近似等于质子数 + 中子数，是另一回事。'] },
      { q: '相对原子质量约为 16 的元素是？', o: ['氧 O', '氮 N', '碳 C', '硫 S'], a: 0,
        e: ['氧的相对原子质量约 16，原子序数 8。', '氮 14、碳 12、硫 32——这几个是计算题常用的相对原子质量。'] },
      { q: '钠元素的原子序数是？', o: ['11', '23', '19', '12'], a: 0,
        e: ['钠是第 11 号元素，原子序数 11；23 是它的相对原子质量。', '计算题里这两个数各有用处：11 用来认元素，23 用来算质量。'] }
    ];
    var it = pick(r, bank);
    var f = cf(r, it.o[it.a], it.o.filter(function (x, i) { return i !== it.a; }), '选择');
    return mk('周期表小格判读', it.q, [f],
      '周期表一格：左上数字是原子序数（=质子数），中间是元素符号和名称，下面是相对原子质量。原子序数用来认元素，相对原子质量用来算质量。',
      it.e, ['元素周期表', '化学用语', '数形对应']);
  }

  /* ============================================================
     ② 配平四法
     ============================================================ */
  var LCM = [
    { eq: 'P ＋ ___O₂ —点燃→ P₂O₅', t: 'O₂', a: 5,
      s: ['氧：左边 O₂ 有 2 个，右边 P₂O₅ 有 5 个，最小公倍数 10。', 'O₂ 系数 = 10÷2 = 5；P₂O₅ 系数 = 10÷5 = 2。', '顺推磷：右边 2×2 = 4 个 P，左边 P 前配 4。'], f: '4P + 5O₂ —点燃→ 2P₂O₅' },
    { eq: 'Al ＋ ___O₂ —点燃→ Al₂O₃', t: 'O₂', a: 3,
      s: ['氧：左 2、右 3，最小公倍数 6。', 'O₂ 系数 = 6÷2 = 3；Al₂O₃ 系数 = 6÷3 = 2。', '顺推铝：右边 2×2 = 4 个 Al，左边 Al 前配 4。'], f: '4Al + 3O₂ —点燃→ 2Al₂O₃' },
    { eq: '2KClO₃ —MnO₂/Δ→ 2KCl ＋ ___O₂', t: 'O₂', a: 3,
      s: ['氧：左边 KClO₃ 中 3 个，右边 O₂ 中 2 个，最小公倍数 6。', 'KClO₃ 系数 = 6÷3 = 2；O₂ 系数 = 6÷2 = 3。', '再核对 K、Cl：左右各 2 个，已平。'], f: '2KClO₃ —MnO₂/Δ→ 2KCl + 3O₂↑' },
    { eq: '___H₂O —通电→ H₂ ＋ O₂', t: 'H₂O', a: 2,
      s: ['氧：左边 H₂O 中 1 个，右边 O₂ 中 2 个，最小公倍数 2。', 'H₂O 系数 = 2÷1 = 2；O₂ 系数 = 2÷2 = 1（省略不写）。', '顺推氢：左边 2×2 = 4 个 H，H₂ 前配 2。'], f: '2H₂O —通电→ 2H₂↑ + O₂↑' },
    { eq: 'Mg ＋ O₂ —点燃→ ___MgO', t: 'MgO', a: 2,
      s: ['氧：左边 2 个，右边 MgO 中 1 个，最小公倍数 2。', 'MgO 系数 = 2÷1 = 2；O₂ 系数 = 2÷2 = 1。', '顺推镁：右边 2 个 Mg，左边 Mg 前配 2。'], f: '2Mg + O₂ —点燃→ 2MgO' },
    { eq: 'N₂ ＋ ___H₂ —高温高压/催化剂→ NH₃', t: 'H₂', a: 3,
      s: ['氮：左边 N₂ 有 2 个，右边 NH₃ 有 1 个，最小公倍数 2 → NH₃ 前配 2。', '此时右边氢有 2×3 = 6 个，左边 H₂ 前配 6÷2 = 3。'], f: 'N₂ + 3H₂ —高温高压/催化剂→ 2NH₃' }
  ];
  var ODD = [
    { eq: 'C₂H₂ ＋ ___O₂ —点燃→ CO₂ ＋ H₂O', t: 'O₂', a: 5,
      s: ['先别碰氧：右边 H₂O 中氧是 1 个（奇数），CO₂ 中是 2 个（偶数），存在单双矛盾。', '给 H₂O 前配 2 变偶数；则 C₂H₂ 前配 2（氢守恒），CO₂ 前配 4（碳守恒）。', '此时右边氧 = 4×2 + 2×1 = 10 个，O₂ 前配 5。'], f: '2C₂H₂ + 5O₂ —点燃→ 4CO₂ + 2H₂O' },
    { eq: 'FeS₂ ＋ ___O₂ —高温→ Fe₂O₃ ＋ SO₂', t: 'O₂', a: 11,
      s: ['Fe₂O₃ 中氧是 3 个（奇数），先给它配 2。', '右边共 4 个 Fe，FeS₂ 前配 4；左边硫 4×2 = 8 个，SO₂ 前配 8。', '右边氧 = 2×3 + 8×2 = 22 个，O₂ 前配 11。'], f: '4FeS₂ + 11O₂ —高温→ 2Fe₂O₃ + 8SO₂' },
    { eq: '___H₂O₂ —MnO₂→ H₂O ＋ O₂', t: 'H₂O₂', a: 2,
      s: ['右边氧总数 = 1（H₂O）+ 2（O₂）= 3，是奇数；左边 H₂O₂ 中是 2 个，偶数。', '先把 H₂O 前配 2，右边氧变 2+2 = 4 个（偶数）。', '左边 H₂O₂ 前配 2，氢也守恒；O₂ 前配 1 省略。'], f: '2H₂O₂ —MnO₂→ 2H₂O + O₂↑' },
    { eq: 'Fe₂O₃ ＋ ___HCl → FeCl₃ ＋ H₂O', t: 'HCl', a: 6,
      s: ['HCl 中氢是 1 个（奇数），H₂O 中是 2 个（偶数），先给 HCl 配 2 的倍数。', '铁：右边 Fe₂O₃ 有 2 个 Fe，FeCl₃ 前配 2。', '此时氯 2×3 = 6 个，HCl 前配 6；氢 6 个，H₂O 前配 3。'], f: 'Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O' },
    { eq: 'Na ＋ H₂O → ___NaOH ＋ H₂', t: 'NaOH', a: 2,
      s: ['右边氧：NaOH 中 1 个，左边 H₂O 中 1 个；看氢：右 1+2 = 3（奇）、左 2（偶）。', '先给 NaOH 配 2（奇数变偶数），则 H₂O 前配 2，Na 前配 2。', '验算：Na 2=2；O 2=2；H 左 4 = 右 2+2。'], f: '2Na + 2H₂O → 2NaOH + H₂↑' }
  ];
  var OBSERVE = [
    { eq: 'Fe₂O₃ ＋ ___CO —高温→ Fe ＋ CO₂', t: 'CO', a: 3,
      s: ['盯住最复杂的 Fe₂O₃：它自带 Fe:O = 2:3 的比例。', '3 个氧要由 3 个 CO 各带走 1 个 → CO 前配 3，同时生成 3 个 CO₂。', '铁 2 个，Fe 前配 2。'], f: 'Fe₂O₃ + 3CO —高温→ 2Fe + 3CO₂' },
    { eq: 'Fe₃O₄ ＋ ___CO —高温→ 3Fe ＋ 4CO₂', t: 'CO', a: 4,
      s: ['Fe₃O₄ 中 Fe:O = 3:4，题目已写出 3Fe 和 4CO₂。', '每个 CO 只能夺走 1 个氧原子变成 1 个 CO₂；要夺 4 个氧，CO 前配 4。', '验算：Fe 3=3；C 4=4；O 左 4+4=8，右 4×2=8。'], f: 'Fe₃O₄ + 4CO —高温→ 3Fe + 4CO₂' },
    { eq: 'Cu₂(OH)₂CO₃ —Δ→ ___CuO ＋ CO₂ ＋ H₂O', t: 'CuO', a: 2,
      s: ['从最复杂的碱式碳酸铜看：它含 2 个 Cu，所以 CuO 前配 2。', '含 1 个 C → CO₂ 前配 1；含 2 个 H → H₂O 前配 1。', '验算氧：左边 OH 中 2 个 + CO₃ 中 3 个 = 5；右边 2+2+1 = 5。'], f: 'Cu₂(OH)₂CO₃ —Δ→ 2CuO + CO₂↑ + H₂O' },
    { eq: '___CuO ＋ C —高温→ Cu ＋ CO₂', t: 'CuO', a: 2,
      s: ['右边 CO₂ 有 2 个氧，左边只有 CuO 含氧，所以 CuO 前配 2。', '铜随之 2 个，Cu 前配 2；碳左右各 1 个。'], f: '2CuO + C —高温→ 2Cu + CO₂↑' }
  ];
  var SETONE = [
    { eq: 'C₂H₅OH ＋ ___O₂ —点燃→ CO₂ ＋ H₂O', t: 'O₂', a: 3,
      s: ['把最复杂的 C₂H₅OH 系数定为 1：碳 2 个 → CO₂ 前配 2；氢 6 个（5+1）→ H₂O 前配 3。', '右边氧 = 2×2 + 3×1 = 7 个；乙醇自带 1 个氧，还差 6 个由 O₂ 提供。', 'O₂ 前配 6÷2 = 3。漏掉「自带氧」会误配成 3.5。'], f: 'C₂H₅OH + 3O₂ —点燃→ 2CO₂ + 3H₂O' },
    { eq: 'CH₄ ＋ ___O₂ —点燃→ CO₂ ＋ H₂O', t: 'O₂', a: 2,
      s: ['定 CH₄ 系数为 1：碳 1 个 → CO₂ 前配 1；氢 4 个 → H₂O 前配 2。', '右边氧 = 1×2 + 2×1 = 4 个，O₂ 前配 2。'], f: 'CH₄ + 2O₂ —点燃→ CO₂ + 2H₂O' },
    { eq: '2CH₃OH ＋ ___O₂ —点燃→ 2CO₂ ＋ 4H₂O', t: 'O₂', a: 3,
      s: ['先定 CH₃OH 为 1：CO₂ 前配 1，H₂O 前配 2。', '右边氧 = 2 + 2 = 4 个；甲醇自带 1 个氧，还差 3 个 → 需要 3/2 个 O₂。', '出现分数别慌，全体乘 2 化整：2CH₃OH + 3O₂ = 2CO₂ + 4H₂O。'], f: '2CH₃OH + 3O₂ —点燃→ 2CO₂ + 4H₂O' },
    { eq: 'C₃H₈ ＋ ___O₂ —点燃→ CO₂ ＋ H₂O', t: 'O₂', a: 5,
      s: ['定 C₃H₈ 为 1：碳 3 个 → CO₂ 前配 3；氢 8 个 → H₂O 前配 4。', '右边氧 = 3×2 + 4×1 = 10 个，O₂ 前配 5。'], f: 'C₃H₈ + 5O₂ —点燃→ 3CO₂ + 4H₂O' }
  ];
  function genBalance(r, bank, method, tip, kp) {
    var it = pick(r, bank);
    var prompt = '配平（' + method + '）：' + it.eq + '，' + it.t + ' 前的系数是（填数字）';
    var ex = it.s.concat(['配平结果：' + it.f, '收尾自检：原子数左右相等、系数是最简整数比、条件与 ↑↓ 不漏。']);
    return mk(method + '配平', prompt, [nf(it.a, '系数')], tip, ex, ['化学方程式的配平', method, '第五单元']);
  }
  function genLcm(r) { return genBalance(r, LCM, '最小公倍数法', TIP_LCM, '配平'); }
  function genOdd(r) { return genBalance(r, ODD, '奇数配偶法', TIP_ODD, '配平'); }
  function genObserve(r) { return genBalance(r, OBSERVE, '观察法', TIP_OBS, '配平'); }
  function genSetone(r) { return genBalance(r, SETONE, '定一法', TIP_ONE, '配平'); }
  function genMethod(r) {
    var bank = [
      { q: 'Fe₃O₄ ＋ CO → Fe ＋ CO₂，最顺手的入手方法是？', o: ['观察法', '最小公倍数法', '奇数配偶法', '定一法'], a: 0,
        e: ['Fe₃O₄ 内部 Fe:O = 3:4 写得很清楚，从它反推 CO 与 CO₂ 的系数最快——观察法。', '用最小公倍数也能配，但绕远；观察法一步到位。'] },
      { q: '2KClO₃ → 2KCl ＋ O₂ 这类题，优先用哪种方法？', o: ['最小公倍数法', '奇数配偶法', '定一法', '观察法'], a: 0,
        e: ['氧在左右各出现一次、个数 3 与 2 不同，取最小公倍数 6 即得系数。', '这是初中配平最常见的情形，最小公倍数法优先。'] },
      { q: 'C₂H₅OH ＋ O₂ → CO₂ ＋ H₂O，最合适的方法是？', o: ['定一法', '观察法', '奇数配偶法', '最小公倍数法'], a: 0,
        e: ['复杂的有机物燃烧先把燃料系数定为 1，依次配 C、H，最后配 O。', '注意乙醇自带 1 个氧，最后 O₂ 系数是 3 而不是 3.5。'] },
      { q: 'FeS₂ ＋ O₂ → Fe₂O₃ ＋ SO₂，最合适的方法是？', o: ['奇数配偶法', '定一法', '观察法', '最小公倍数法'], a: 0,
        e: ['Fe₂O₃ 中氧是 3（奇），另一边 O₂ 是 2（偶），先给 Fe₂O₃ 配 2 把奇数变偶数。', '配完 Fe、S 再回头算氧，得 11 个 O₂。'] },
      { q: 'P ＋ O₂ → P₂O₅，最合适的方法是？', o: ['最小公倍数法', '定一法', '观察法', '奇数配偶法'], a: 0,
        e: ['氧左右各出现一次、2 与 5 不同，最小公倍数 10 → O₂ 前 5、P₂O₅ 前 2。', '口诀：找原子，求公倍，算系数，再检查。'] }
    ];
    var it = pick(r, bank);
    var f = cf(r, it.o[it.a], it.o.filter(function (x, i) { return i !== it.a; }), '配平方法');
    return mk('配平方法选择', it.q, [f],
      '决策顺序：复杂燃烧用定一法 → 一奇一偶用奇数配偶法 → 同一元素左右各出现一次且个数不同用最小公倍数法 → 简单反推用观察法。',
      it.e, ['化学方程式的配平', '方法选择', '第五单元']);
  }
  function genCheck(r) {
    var bank = [
      { q: '4P ＋ 10O₂ = 4P₂O₅ 原子数已经相等了，还差最后一步。差在哪？', o: ['系数没化成最简整数比', '漏写反应条件', '没标气体符号', '化学式写错了'], a: 0,
        e: ['4:10:4 可同时除以 2，应写成 4P + 5O₂ = 2P₂O₅（条件另说）。', '配平收尾三查：原子守恒、最简整数比、条件与符号。'] },
      { q: '2KClO₃ = 2KCl ＋ 3O₂ 中，右边氧原子总数是（填数字）', a: 6, n: true,
        e: ['3 个 O₂ 分子，每个含 2 个氧原子，共 3×2 = 6 个。', '别忘了括号/系数要乘开：2Al₂(SO₄)₃ 中氧是 2×4×3 = 24 个。'] },
      { q: '配平后 2KMnO₄ = K₂MnO₄ ＋ MnO₂ ＋ O₂↑，左边钾原子数是（填数字）', a: 2, n: true,
        e: ['2 个 KMnO₄，每个含 1 个 K，共 2 个；右边 K₂MnO₄ 也是 2 个。', '这条方程式正是「加热高锰酸钾制氧气」，计算题常考。'] },
      { q: '2H₂O₂ = 2H₂O ＋ O₂↑ 中，O₂ 前的系数 1 应该怎么处理？', o: ['省略不写', '写成 1O₂', '写成 O₁₂', '写成 2O₂'], a: 0,
        e: ['化学方程式中系数是 1 时省略不写，直接写 O₂。', '写成 1O₂ 不规范；写成 O₁₂ 则改变了化学式，是原则性错误。'] },
      { q: '配平 H₂O → H₂ ＋ O₂ 时，把 H₂O 改成 H₂O₂ 来凑原子数，对吗？', o: ['不对，只能改系数不能改下标', '对，这样更快配平', '不确定，看心情', '只对气体反应成立'], a: 0,
        e: ['H₂O 是水，H₂O₂ 是过氧化氢——改下标就换了一种物质，是配平第一大忌。', '铁律：只改化学式前面的系数，绝不动右下角的原子个数。'] }
    ];
    var it = pick(r, bank);
    var f = it.n ? nf(it.a, '数量') : cf(r, it.o[it.a], it.o.filter(function (x, i) { return i !== it.a; }), '选择');
    return mk('配平结果自检', it.q, [f],
      '配完必数，数完必查四样：每种原子个数、系数最简比、反应条件、气体/沉淀符号。系数是 1 时省略不写。',
      it.e, ['化学方程式的配平', '自检纠错', '高频扣分点']);
  }

  /* ============================================================
     ③ 写方程式与计算
     ============================================================ */
  function genWrite(r) {
    var bank = [
      { q: '加热分解高锰酸钾制氧气，生成物是？', o: ['K₂MnO₄ ＋ MnO₂ ＋ O₂', 'K₂MnO₄ ＋ O₂', 'KMnO₂ ＋ O₂', 'MnO₂ ＋ O₂'], a: 0,
        e: ['2KMnO₄ —Δ→ K₂MnO₄ + MnO₂ + O₂↑，三种生成物缺一不可。', '这就是截图里的题：先写对这三种生成物，才能往下算质量。'] },
      { q: '加热氯酸钾（二氧化锰催化）制氧气，生成物是？', o: ['KCl ＋ O₂', 'KCl ＋ MnO₂ ＋ O₂', 'KClO₂ ＋ O₂', 'K ＋ O₂'], a: 0,
        e: ['2KClO₃ —MnO₂/Δ→ 2KCl + 3O₂↑；MnO₂ 是催化剂，反应前后质量和化学性质不变，不写进生成物。', '催化剂写在等号上方，不能当反应物或生成物。'] },
      { q: '过氧化氢在二氧化锰催化下分解，生成物是？', o: ['H₂O ＋ O₂', 'H₂ ＋ O₂', 'H₂O₂ ＋ O₂', 'H₂O ＋ H₂'], a: 0,
        e: ['2H₂O₂ —MnO₂→ 2H₂O + O₂↑。', '写对本反应是做「68 g 过氧化氢能制多少氧气」计算题的前提。'] },
      { q: '碳在氧气中充分燃烧，生成物是？', o: ['CO₂', 'CO', 'C₂O', 'CO ＋ CO₂'], a: 0,
        e: ['氧气充足时 C + O₂ —点燃→ CO₂；氧气不足才生成 CO。', 'CO 有毒、能燃烧还还原性；CO₂ 一般不燃烧也不支持燃烧。'] },
      { q: '锌与稀硫酸反应，生成的气体是？', o: ['H₂', 'O₂', 'CO₂', 'SO₂'], a: 0,
        e: ['Zn + H₂SO₄ = ZnSO₄ + H₂↑，这是实验室制氢气的常用反应。', '金属 + 酸 → 盐 + 氢气（氢前金属），气体后标 ↑。'] }
    ];
    var it = pick(r, bank);
    var f = cf(r, it.o[it.a], it.o.filter(function (x, i) { return i !== it.a; }), '生成物');
    return mk('已知反应物求生成物', it.q, [f],
      '第一步先默写反应物和生成物的化学式（元素符号大小写、原子团、下标都要对），第二步配平，第三步补条件和 ↑↓，最后才算质量。',
      it.e, ['化学方程式的书写', '化学用语', '第五单元']);
  }
  function genWriteOut(r) {
    var bank = [
      { q: '加热高锰酸钾制氧气：写出生成物的化学式', a: 'K₂MnO₄＋MnO₂＋O₂',
        e: ['2KMnO₄ —Δ→ K₂MnO₄ + MnO₂ + O₂↑，三种生成物缺一不可。', '钾是 K、锰是 Mn、氧是 O——元素符号写不出来，后面配平和计算都无从下手。'] },
      { q: '加热氯酸钾（二氧化锰催化）制氧气：写出生成物的化学式', a: 'KCl＋O₂',
        e: ['2KClO₃ —MnO₂/Δ→ 2KCl + 3O₂↑。', 'MnO₂ 是催化剂，不写进生成物。'] },
      { q: '过氧化氢在二氧化锰催化下分解：写出生成物的化学式', a: 'H₂O＋O₂',
        e: ['2H₂O₂ —MnO₂→ 2H₂O + O₂↑。', '别把 H₂O 写成 HO 或 H₂O₃——下标错了就是另一种物质。'] },
      { q: '铁在氧气中点燃：写出生成物的化学式', a: 'Fe₃O₄',
        e: ['3Fe + 2O₂ —点燃→ Fe₃O₄。', '铁燃烧生成四氧化三铁（Fe₃O₄），不是氧化铁 Fe₂O₃。'] },
      { q: '锌与稀硫酸反应：写出生成物的化学式', a: 'ZnSO₄＋H₂',
        e: ['Zn + H₂SO₄ = ZnSO₄ + H₂↑。', '硫酸根是 SO₄（整体当 -2 价原子团），别漏掉右下角的 4。'] },
      { q: '高温煅烧碳酸钙：写出生成物的化学式', a: 'CaO＋CO₂',
        e: ['CaCO₃ —高温→ CaO + CO₂↑。', '碳是 C、钙是 Ca、氧是 O；CO₂ 不是 CO。'] },
      { q: '二氧化碳通入澄清石灰水：写出生成物的化学式', a: 'CaCO₃＋H₂O',
        e: ['CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O。', '这是检验二氧化碳的反应；氢氧化钙是 Ca(OH)₂，括号不能丢。'] }
    ];
    var it = pick(r, bank);
    var alts = [it.a.replace(/＋/g, '+'), it.a.replace(/＋/g, ' + '), it.a.split('＋').reverse().join('＋')];
    return mk('默写生成物化学式', it.q + '（用 ＋ 连接，不写系数和箭头）',
      [tf(it.a, '生成物', alts)],
      '先写元素符号（第一个字母大写、第二个小写），再标原子团与下标，最后才配平。钠 Na、钾 K、锰 Mn、钙 Ca、铁 Fe——这些符号必须能直接默写出来。',
      it.e, ['化学方程式的书写', '化学式默写', '第五单元']);
  }
  function genCalc(r) {
    var bank = [
      { q: '加热分解 7.9 g 高锰酸钾（2KMnO₄ → K₂MnO₄ ＋ MnO₂ ＋ O₂↑），可得氧气的质量是', a: 0.8, u: 'g',
        e: ['2KMnO₄ 的相对质量 = 2×(39+55+64) = 316；O₂ = 32。', '316 : 32 = 7.9 : x → x = 0.8 g。', '关键：7.9 g 对应的是 316 份的 KMnO₄，不是 K₂MnO₄ 或 MnO₂，位置不能错位。'] },
      { q: '加热分解 15.8 g 高锰酸钾（2KMnO₄ → K₂MnO₄ ＋ MnO₂ ＋ O₂↑），可得氧气的质量是', a: 1.6, u: 'g',
        e: ['相对质量比 316 : 32；15.8 : x = 316 : 32。', 'x = 15.8×32÷316 = 1.6 g。'] },
      { q: '完全分解 68 g 过氧化氢（2H₂O₂ → 2H₂O ＋ O₂↑），可得氧气的质量是', a: 32, u: 'g',
        e: ['2H₂O₂ 相对质量 = 2×34 = 68；O₂ = 32。', '68 : 32 = 68 g : x → x = 32 g。这道题今天错过，记住 68 对应的是 2H₂O₂。'] },
      { q: '完全分解 36 g 水（2H₂O → 2H₂ ＋ O₂↑），理论上可得氧气的质量是', a: 32, u: 'g',
        e: ['2H₂O 相对质量 = 2×18 = 36；O₂ = 32。', '36 : 32 = 36 g : x → x = 32 g。'] },
      { q: '高温煅烧 100 g 碳酸钙（CaCO₃ → CaO ＋ CO₂↑），可得二氧化碳的质量是', a: 44, u: 'g',
        e: ['CaCO₃ 相对质量 = 40+12+48 = 100；CO₂ = 44。', '100 : 44 = 100 g : x → x = 44 g。'] },
      { q: '6.5 g 锌与足量稀硫酸反应（Zn ＋ H₂SO₄ = ZnSO₄ ＋ H₂↑），可得氢气的质量是', a: 0.2, u: 'g',
        e: ['Zn 相对质量 65；H₂ = 2。', '65 : 2 = 6.5 g : x → x = 0.2 g。'] }
    ];
    var it = pick(r, bank);
    return mk('根据化学方程式的计算', it.q + '（填数字）', [nf(it.a, '质量', it.u, 0.01)],
      '六步：设未知 → 写对并配平方程式 → 算相关物质的相对质量 → 列比例（相对质量比 = 实际质量比）→ 求解 → 答。给溶液或不纯物时先乘质量分数/纯度。',
      it.e, ['根据化学方程式的计算', '相对质量比', '第五单元']);
  }
  function genMassrel(r) {
    var bank = [
      { q: '2KMnO₄ → K₂MnO₄ ＋ MnO₂ ＋ O₂↑ 中，316 份质量的 KMnO₄ 对应生成多少份质量的 O₂？', a: 32,
        e: ['2KMnO₄ 相对质量 = 2×158 = 316；O₂ = 32。', '列比例时 316 必须和 O₂ 的 32 对齐——截图强调的「实际质量也要对应好，不能错位」就是这一步。'] },
      { q: '2H₂O₂ → 2H₂O ＋ O₂↑ 中，68 份质量的 H₂O₂ 对应生成多少份质量的 O₂？', a: 32,
        e: ['2H₂O₂ = 2×34 = 68；O₂ = 32。', '68 g H₂O₂ 完全分解得 32 g O₂，这是今天错过的基础对应。'] },
      { q: '2H₂O → 2H₂ ＋ O₂↑ 中，36 份质量的水对应生成多少份质量的 O₂？', a: 32,
        e: ['2H₂O = 36；O₂ = 32。', '水通电：36 份水 → 4 份氢气 + 32 份氧气，质量守恒。'] },
      { q: 'CaCO₃ → CaO ＋ CO₂↑ 中，100 份质量的 CaCO₃ 对应生成多少份质量的 CO₂？', a: 44,
        e: ['CaCO₃ = 100；CO₂ = 44；CaO = 56。', '100 = 56 + 44，正好验证质量守恒。'] }
    ];
    var it = pick(r, bank);
    return mk('相对质量对应关系', it.q + '（填数字）', [nf(it.a, '份')],
      '相对质量 = 化学计量数 × 相对分子质量。它只用来「对位置」：题目给的实际质量必须和它对应的那种物质写在同一边。',
      it.e, ['根据化学方程式的计算', '相对质量', '防错位']);
  }

  /* ============================================================
     模块注册（顺序 = 页签顺序）
     ============================================================ */
  var MODULES = [
    { id: 'base', icon: '🔤', name: '① 化学用语地基', desc: '元素符号 / 离子符号 / 周期表信息——方程式第一步不再卡住',
      kinds: [
        { id: 'symbol', name: '符号→名称', gen: genSymbol },
        { id: 'name', name: '名称→符号', gen: genName },
        { id: 'ion', name: '离子符号书写', gen: genIon },
        { id: 'ionrule', name: '写法辨析', gen: genIonRule },
        { id: 'period', name: '周期表判读', gen: genPeriod }
      ] },
    { id: 'balance', icon: '⚖', name: '② 配平四法', desc: '最小公倍数 · 奇数配偶 · 观察 · 定一，配完还会自检',
      kinds: [
        { id: 'lcm', name: '最小公倍数法', gen: genLcm },
        { id: 'odd', name: '奇数配偶法', gen: genOdd },
        { id: 'observe', name: '观察法', gen: genObserve },
        { id: 'setone', name: '定一法', gen: genSetone },
        { id: 'method', name: '方法选择', gen: genMethod },
        { id: 'check', name: '配平自检', gen: genCheck }
      ] },
    { id: 'apply', icon: '🧮', name: '③ 写方程式与计算', desc: '由反应物推生成物，再按相对质量比算质量',
      kinds: [
        { id: 'write', name: '求生成物', gen: genWrite },
        { id: 'writeout', name: '默写生成物', gen: genWriteOut },
        { id: 'calc', name: '方程式计算', gen: genCalc },
        { id: 'massrel', name: '相对质量对应', gen: genMassrel }
      ] }
  ];
  var ALL_KINDS = (function () {
    var a = [];
    MODULES.forEach(function (m) { m.kinds.forEach(function (k) { a.push({ mod: m.id, kind: k.id, name: k.name, gen: k.gen }); }); });
    return a;
  })();
  function moduleById(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }
  function gen(modId, kindId, seed) {
    var r = mulberry32((seed >>> 0) || 1);
    var k = null;
    if (modId && kindId) {
      var m = moduleById(modId);
      if (m) for (var i = 0; i < m.kinds.length; i++) if (m.kinds[i].id === kindId) { k = m.kinds[i]; break; }
    }
    if (!k) k = pick(r, ALL_KINDS);
    var q = k.gen(r);
    q.mod = modId || k.mod;
    q.kind = kindId || k.id;
    q.kindName = k.name;
    q.modName = (moduleById(q.mod) || {}).name || '';
    return q;
  }

  /* ---------- 自检 ---------- */
  function selfTest(N) {
    var fails = [], count = 0;
    ALL_KINDS.forEach(function (k) {
      for (var i = 0; i < N; i++) {
        var seed = ((k.mod.length * 131 + k.kind.length * 17 + i * 2654435761) >>> 0) || 1;
        var q;
        try { q = gen(k.mod, k.kind, seed); }
        catch (e) { fails.push(k.mod + '.' + k.kind + ' 生成器异常: ' + e.message); continue; }
        count++;
        var tag = k.mod + '.' + k.kind + '#' + i;
        if (!q.prompt || /undefined|NaN|\[object/.test(q.prompt)) fails.push(tag + ' 题干异常: ' + q.prompt);
        /* 配平题的 ___ 必须紧挨所问物质，否则学生照空格填必然填错（审查发现的真实缺陷） */
        var pm = q.prompt.match(/，(.+?) 前的系数是（填数字）/);
        if (q.prompt.indexOf('___') >= 0 && pm && q.prompt.indexOf('___' + pm[1]) < 0) {
          fails.push(tag + ' 空格位置与所问系数不符: ' + q.prompt);
        }
        if (!q.fields || !q.fields.length) { fails.push(tag + ' 无字段'); continue; }
        if (!q.tip || !q.explain || !q.explain.length || !q.kp || !q.kp.length) fails.push(tag + ' 解析/考点缺失');
        q.fields.forEach(function (f, fi) {
          if (f.type === 'choice') {
            if (!f.options || f.options.length < 2) fails.push(tag + ' 选项不足');
            if (!(f.ans >= 0 && f.ans < f.options.length)) fails.push(tag + ' 正确项下标越界');
            if (new Set(f.options).size !== f.options.length) fails.push(tag + ' 选项重复: ' + f.options.join('/'));
          } else if (f.type === 'num') {
            if (!isFinite(f.ans)) fails.push(tag + ' 数值答案非有限数');
          } else if (f.type === 'text') {
            if (!f.ans || !String(f.ans).trim()) fails.push(tag + ' 文本答案为空');
          } else fails.push(tag + ' 非法字段类型 ' + f.type);
        });
        var right = q.fields.map(function (f) { return f.type === 'choice' ? f.ans : ansText(f); });
        if (!judge(q, right).ok) fails.push(tag + ' 正确解未判对 ' + JSON.stringify(right));
        var wrong = q.fields.map(function (f) {
          if (f.type === 'choice') return f.options[(f.ans + 1) % f.options.length];
          if (f.type === 'num') return '__bad__';
          return '__zzz_bad__';
        });
        if (judge(q, wrong).ok) fails.push(tag + ' 错误解被判对');
      }
    });
    return { count: count, fails: fails, kinds: ALL_KINDS.length, modules: MODULES.length };
  }

  return {
    VERSION: VERSION, DAY: DAY, modules: MODULES, allKinds: ALL_KINDS,
    gen: gen, judge: judge, ansText: ansText, parseNum: parseNum, normChem: normChem,
    moduleById: moduleById, selfTest: selfTest
  };
})();
