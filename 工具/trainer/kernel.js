/* ============================================================
   训练器内核（段二 · 化学先行）
   ------------------------------------------------------------
   这里放「壳 / 卡片 / 统计 / 记录 / 回炉 / 导入导出」——三科共用的那 85–90%。
   出题逻辑（gen / judge / MODULES）不在这里，它是科目配置指向的 core 源，
   由 build.mjs 原样内联成 <script id="core">，保证 check-flash.mjs 能抽出 CH。

   产物仍是单个 HTML，含两个约定脚本：
     <script id="core"> …… </script>   科目 core（纯逻辑，暴露全局 CFG.coreGlobal）
     <script id="ui">   …… </script>   本内核 + 科目配置注入的 CFG

   科目配置（对象字面量）需提供：
     key, sessionSuffix, global, coreGlobal, inputPrefix, coreFile, outFile,
     brand{ main, hover, soft }, head{...}, plan[], views[], texts{...},
     wrongKeyExpr（字符串表达式，引用 UI 内的 CH 别名）
   ============================================================ */

/* ---------- HTML 外壳 + 样式 ---------- */
export function shell(cfg) {
  const b = cfg.brand, h = cfg.head;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${h.title}</title>
<style>
:root{
  --bg:#f5f7fb; --card:#fff; --ink:#1b2333; --muted:#6b7280; --line:#e6e9f2;
  --brand:${b.main}; --brand-soft:${b.soft}; --ok:#0f9d58; --ok-soft:#e8f6ee;
  --bad:#d93025; --bad-soft:#fdecea; --warn:#c26a00; --warn-soft:#fff4e2;
  --r:14px; --shadow:0 1px 2px rgba(20,30,60,.05),0 8px 24px rgba(20,30,60,.05);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;-webkit-text-size-adjust:100%}
.wrap{max-width:900px;margin:0 auto;padding:0 16px 64px}
header.top{position:sticky;top:0;z-index:20;background:rgba(245,247,251,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top-in{max-width:900px;margin:0 auto;padding:10px 16px 0;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.brand{font-weight:800;font-size:17px;letter-spacing:.2px}
.ver{font-size:11px;color:var(--muted);font-weight:600;border:1px solid var(--line);border-radius:20px;padding:1px 7px}
.top-note{font-size:12px;color:var(--muted);margin-left:auto}
/* 科外页面入口（head.link：如「每日五写」），只有配置了的科目才出现 */
.extlink{flex:none;font-size:12px;font-weight:700;color:var(--brand);background:var(--brand-soft);border:1px solid transparent;border-radius:20px;padding:2px 10px;text-decoration:none;white-space:nowrap}
.extlink:hover{border-color:var(--brand)}
nav.tabs{max-width:900px;margin:0 auto;padding:8px 16px 0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
nav.tabs::-webkit-scrollbar{display:none}
nav.tabs button{flex:0 0 auto;border:0;background:transparent;color:var(--muted);font:inherit;font-size:14px;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer;border-bottom:2px solid transparent}
nav.tabs button:hover{color:var(--ink);background:#eef1f8}
nav.tabs button.active{color:var(--brand);font-weight:700;border-bottom-color:var(--brand)}
main{padding-top:18px}
h2{font-size:19px;margin:24px 0 10px}
h3{font-size:16px;margin:16px 0 8px}
p{margin:8px 0}
.muted{color:var(--muted)}.small{font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px;box-shadow:var(--shadow)}
.card+.card{margin-top:12px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.grow{flex:1}
.btn{appearance:none;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-size:14px;font-weight:600;padding:9px 16px;border-radius:11px;cursor:pointer;transition:transform .06s ease,background .12s ease}
.btn:active{transform:scale(.98)}
.btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.btn-primary:hover{background:${b.hover}}
.btn-ghost{background:transparent;border-color:transparent;color:var(--brand);padding:6px 8px}
.btn-sm{padding:5px 10px;font-size:13px;border-radius:9px}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.pill{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:20px;background:var(--brand-soft);color:var(--brand)}
.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.warn{background:var(--warn-soft);color:var(--warn)}
.progress{height:6px;background:#eef1f8;border-radius:6px;overflow:hidden}
.progress i{display:block;height:100%;background:var(--brand);border-radius:6px;transition:width .2s ease}
.qhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.qbody{font-size:16px;font-weight:600;margin:12px 0;line-height:1.8}
/* 化学方程式：条件写在箭头上下（⟦上|下⟧ 由 rich() 转成这个结构） */
.cheq{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;vertical-align:middle;margin:0 .35em;line-height:1.1;white-space:nowrap}
.cheq .cond{font-size:.62em;color:var(--muted);font-weight:600;padding:0 2px}
.cheq .cond.top{margin-bottom:1px}
.cheq .cond.bottom{margin-top:1px}
.cheq .arw{font-size:1.15em;color:var(--ink);letter-spacing:.08em}
.cheq-svg{display:inline-block;vertical-align:middle;margin:0 .12em;max-width:100%}
.cur-svg,.mic-svg{display:block;margin:8px 0;max-width:100%}
.op-svg,.dev-svg{max-width:100%}
.opt{display:block;width:100%;text-align:left;border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 14px;margin:7px 0;font:inherit;font-size:15px;cursor:pointer;transition:background .1s,border .1s}
.opt:hover{background:#f7fafc;border-color:#cbd5e1}
.opt.sel{border-color:var(--brand);background:var(--brand-soft)}
.opt.ok{border-color:var(--ok);background:var(--ok-soft);color:#0b6b3a;font-weight:700}
.opt.bad{border-color:var(--bad);background:var(--bad-soft);color:#a51f17}
.field{display:flex;gap:8px;align-items:center;margin:10px 0;flex-wrap:wrap}
.field .lbl{font-size:14px;color:var(--muted);min-width:70px}
.field .lbl.full{display:block;min-width:0;width:100%;font-weight:600;color:var(--ink)}
input.txt{font:inherit;font-size:15px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-width:170px;flex:1;background:#fff;color:var(--ink)}
input.txt:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
input.txt.ok{border-color:var(--ok);background:var(--ok-soft)}input.txt.bad{border-color:var(--bad);background:var(--bad-soft)}
.unit{color:var(--muted);font-size:14px}
.fb{border-radius:12px;padding:12px 14px;margin-top:14px;font-size:14px}
.fb.good{background:var(--ok-soft);border:1px solid #bfe6cd}
.fb.bad{background:var(--bad-soft);border:1px solid #f3c9c4}
.fb.ftitle{font-weight:800;font-size:15px;margin-bottom:6px}
.mk{display:inline-block;width:20px;font-weight:800}.mk.ok{color:var(--ok)}.mk.bad{color:var(--bad)}
.tipbox{background:var(--warn-soft);border:1px solid #f1d9a8;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14px;color:#8a4b00}
.kpline{margin-top:8px;font-size:12px;color:var(--muted)}
.modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:10px}
.modcard{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 14px;cursor:pointer;transition:transform .06s,border .1s}
.modcard:hover{border-color:var(--brand);transform:translateY(-1px)}
.modcard h4{margin:0 0 4px;font-size:15px}
.modcard .d{font-size:12px;color:var(--muted);line-height:1.5}
.modcard .m{margin-top:8px;font-size:11px;color:var(--brand);font-weight:700}
.kindchip{display:inline-block;border:1px solid var(--line);border-radius:20px;padding:5px 12px;margin:4px 5px 0 0;font-size:13px;cursor:pointer;background:#fff}
.kindchip:hover{border-color:var(--brand);background:var(--brand-soft);color:var(--brand)}
/* 题型 chip 右侧的「练未覆盖」小按钮（覆盖 a/b 由 core 的 POOLS 分母算） */
.kindrow{display:inline-flex;align-items:center;gap:5px;margin:4px 5px 0 0}
.kindrow .kindchip{margin:0}
.kindcov{font:inherit;font-size:12px;border:1px dashed var(--brand);color:var(--brand);background:#fff;border-radius:20px;padding:4px 10px;cursor:pointer;white-space:nowrap}
.kindcov:hover{background:var(--brand-soft)}
.kindcov.done{border-style:solid;border-color:var(--line);color:var(--muted);cursor:default;background:#f7f7f7}
.kindcov.done:hover{background:#f7f7f7}
/* 知识覆盖面：报告页单元行 */
.covrow{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px}
.covrow .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.covrow .bg{flex:0 0 46%;height:8px;background:var(--line);border-radius:5px;overflow:hidden}
.covrow .bg i{display:block;height:100%;background:var(--brand)}
.covrow .num{flex:0 0 74px;text-align:right;color:var(--muted);font-size:12px}
/* 化学特殊符号键盘：点击即插入到当前输入框 */
.symkeys{margin-top:10px;border-top:1px dashed var(--line);padding-top:8px}
.symkeys .sk-title{font-size:12px;color:var(--muted);margin-bottom:6px}
.symkeys .sk-row{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.symkeys .sk-label{font-size:11px;color:var(--muted);min-width:46px;align-self:center}
.symkeys button{font:inherit;font-size:15px;min-width:30px;height:30px;border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--ink);cursor:pointer;padding:0 5px;line-height:1}
.symkeys button:hover{border-color:var(--brand);background:var(--brand-soft)}
.symkeys button:active{transform:scale(.92)}
/* 配平方法细则卡（数据驱动：kind.guide） */
.guide-card{border:1px solid var(--line);border-left:3px solid var(--brand);border-radius:10px;padding:10px 12px;margin:10px 0;background:#fff}
.guide-card .gc-h{font-weight:700;color:var(--brand);font-size:14px;margin-bottom:6px}
.guide-card .gc-sec{font-size:12px;font-weight:700;color:var(--ink);margin:8px 0 3px}
.guide-card ol,.guide-card ul{margin:2px 0;padding-left:20px}
.guide-card li{font-size:13px;line-height:1.75}
.guide-card .gc-ex{border:1px dashed var(--line);border-radius:8px;padding:7px 10px;margin-top:6px;background:#fafbfc}
.guide-card .gc-ex .gc-q{font-size:13px;line-height:1.9;margin-bottom:4px}
.guide-card .gc-walk{margin:6px 0;border:1px solid var(--line);border-radius:8px;background:#fff;overflow:hidden}
.guide-card .gc-walk summary{cursor:pointer;font-size:13px;line-height:1.7;padding:7px 10px;color:var(--ink);list-style:none}
.guide-card .gc-walk summary::-webkit-details-marker{display:none}
.guide-card .gc-walk summary::before{content:'▸ ';color:var(--brand);font-weight:700}
.guide-card .gc-walk[open] summary::before{content:'▾ '}
.guide-card .gc-walk summary:hover{background:var(--brand-soft)}
.guide-card .gc-walk[open] summary{background:var(--brand-soft);border-bottom:1px solid var(--line)}
.guide-card .gc-walk .gc-re{font-size:13px;line-height:1.8;padding:8px 10px;color:var(--ink)}
.guide-card .gc-walk .gc-re b{color:var(--brand)}
.guide-card .gc-try{border:1px solid var(--brand);border-radius:8px;padding:8px 10px;margin-top:8px;background:var(--brand-soft)}
.guide-card .gc-try .gc-tq{font-size:13px;line-height:1.8;color:var(--ink);margin-bottom:2px}
.guide-card .gc-full{margin-top:8px;font-size:12px}
.guide-card .gc-full summary{cursor:pointer;color:var(--muted)}
.guide-card .gc-full summary:hover{color:var(--brand)}
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.statbox{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.statbox .k{font-size:12px;color:var(--muted)}.statbox .v{font-size:24px;font-weight:800;color:var(--brand)}
.wrongitem{border-left:3px solid var(--bad);padding-left:10px;margin:10px 0}
.due{font-size:11px;color:var(--warn);font-weight:700}
@media(max-width:560px){.qbody{font-size:15px}.statbox .v{font-size:20px}.top-note{display:none}}
@media print{nav.tabs,header.top,.btn{display:none!important}body{background:#fff}.card{box-shadow:none}}
</style>
</head>
<body>
<header class="top">
  <div class="top-in"><span class="brand">${h.icon} ${h.name}</span><span class="ver">${h.ver}</span>
    <span class="top-note">${h.note}</span>${h.link ? `<a class="extlink" href="${h.link.href}">${h.link.text}</a>` : ''}</div>
  <nav class="tabs" id="tabs"></nav>
</header>
<main class="wrap" id="app"></main>
`;
}

/* ---------- UI 脚本 ---------- */
export function uiScript(cfg) {
  const CFG_JSON = JSON.stringify(cfg.ui_cfg).replace(/</g, '\\u003c');
  return `<script id="ui">
(function () {
  'use strict';
  var CFG = ${CFG_JSON};
  var CH = window[CFG.coreGlobal];
  var KEY = CFG.key, SKEY = KEY + CFG.sessionSuffix, IP = CFG.inputPrefix;
  var T = CFG.texts, PLAN = CFG.plan, VIEWS = CFG.views;
  function fillTpl(s, map) {
    return String(s == null ? '' : s).replace(/\\{(\\w+)\\}/g, function (m, k) {
      return map[k] == null ? m : String(map[k]);
    });
  }
  /* 全内核统一一套统计 DOM（statgrid / statbox） */
  function statBoxes(pairs, style) {
    return '<div class="statgrid"' + (style ? ' style="' + style + '"' : '') + '>' + pairs.map(function (p) {
      return '<div class="statbox"><div class="k">' + p[0] + '</div><div class="v">' + p[1] + '</div></div>';
    }).join('') + '</div>';
  }
  var app = document.getElementById('app'), tabsBar = document.getElementById('tabs');
  var S = { view: 'today', mod: null, kind: null, sess: null, q: null, res: null, answered: false, hint: false, back: null };
  var DB = load();

  /* ---------- 记录层 ---------- */
  function devId() { return window.__ltSyncUI ? window.__ltSyncUI.deviceId() : undefined; }
  function emptyDB() { return { v: 1, deviceId: devId(), recs: [], wrong: {}, meta: { round: 0, lastKind: {} }, sess: null }; }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1 && Array.isArray(d.recs) && d.wrong && typeof d.wrong === 'object') {
        if (!d.deviceId && window.__ltSyncUI) d.deviceId = window.__ltSyncUI.deviceId();  // 旧记录补 deviceId
        return d;
      }
    } catch (e) {}
    return emptyDB();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* 化学方程式 → 内联 SVG（斜体元素符号 / 真下标 / 条件上下 / 矢量长箭头）。
     只在显示层转换：prompt、display、错题键、判分一律不动。 */
  var SUBC = { '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' };
  var SUPC = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9' };
  var CHEMCH = /[A-Za-z0-9_ \t＋+=↑↓△()\/]/;
  function isChem(c) { return CHEMCH.test(c) || !!SUBC[c] || !!SUPC[c] || c === '⟦' || c === '⟧'; }
  function chemSVG(seg) {
    var at = seg.indexOf('⟦'), stop = seg.indexOf('⟧');
    var left = seg.slice(0, at).trim(), right = seg.slice(stop + 1).trim();
    var parts = seg.slice(at + 1, stop).split('|'), top = parts[0] || '', bottom = parts[1] || '';
    var F = 26, H = 84, ay = 44, ly = 51, ty = 24, by = 78;
    function t(s) {
      var h = '';
      for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (SUBC[c]) h += '<tspan baseline-shift="sub" font-size="0.62em">' + SUBC[c] + '</tspan>';
        else if (SUPC[c]) h += '<tspan baseline-shift="super" font-size="0.62em">' + SUPC[c] + '</tspan>';
        else h += c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      return h;
    }
    function w(s) {
      var n = 0;
      for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (SUBC[c] || SUPC[c]) n += 0.44;
        else if (c === ' ') n += 0.34;
        else if (c === '_') n += 0.62;
        else if (/[A-Za-z0-9]/.test(c)) n += 0.60;
        else n += 0.92;
      }
      return n * F;
    }
    var lw = w(left), rw = w(right);
    var aw = Math.max(2.8 * F, Math.max(w(top), w(bottom)) + 0.9 * F);
    var W = lw + aw + rw + 14, rx = lw + 10 + aw + 4;
    return '<svg class="cheq-svg" viewBox="0 0 ' + W.toFixed(0) + ' ' + H + '" style="height:2.9em" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + left + ' ' + top + ' ' + bottom + ' ' + right + '">' +
      '<g font-family="Times New Roman,Georgia,serif" font-size="' + F + '" fill="currentColor">' +
      '<text x="4" y="' + ly + '" font-style="italic">' + t(left) + '</text>' +
      '<g transform="translate(' + (lw + 8).toFixed(0) + ',0)">' +
      (top ? '<text class="cond top" x="' + (aw / 2).toFixed(0) + '" y="' + ty + '" text-anchor="middle" font-size="0.74em">' + t(top) + '</text>' : '') +
      '<path d="M2,' + ay + ' H' + (aw - 10).toFixed(0) + ' M' + (aw - 10).toFixed(0) + ',' + (ay - 5) + ' L' + (aw - 2).toFixed(0) + ',' + ay + ' L' + (aw - 10).toFixed(0) + ',' + (ay + 5) + '" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      (bottom ? '<text class="cond bottom" x="' + (aw / 2).toFixed(0) + '" y="' + by + '" text-anchor="middle" font-size="0.74em">' + t(bottom) + '</text>' : '') +
      '</g>' +
      '<text x="' + rx.toFixed(0) + '" y="' + ly + '" font-style="italic">' + t(right) + '</text>' +
      '</g></svg>';
  }
  function chemRuns(s) {
    var out = '', i = 0, at, stop, a, b;
    while ((at = s.indexOf('⟦', i)) >= 0) {
      stop = s.indexOf('⟧', at + 1);
      if (stop < 0) { out += s.slice(i); return out; }
      a = at; b = stop + 1;
      /* 向左/右扩展，把整段化学式纳入同一个 SVG；
         注意纯文本只能输出到 a（扩展后的起点），不能输出到 at，
         否则 a..at 这段会被纯文本和 SVG 各渲染一次（重复化学式）。 */
      while (a > i && isChem(s.charAt(a - 1))) a--;
      while (b < s.length && isChem(s.charAt(b))) b++;
      out += s.slice(i, a) + chemSVG(s.slice(a, b));
      i = b;
    }
    return out + s.slice(i);
  }
  /* 微粒结构示意图 → 内联 SVG：标记 ⟦sd:17|2,8,7⟧（核电荷数 | 各层电子数）。
     画法与教材一致：圆圈内写核电荷数，右侧逐层半圆弧，弧的右端标该层电子数。
     与 chemSVG 同样只在显示层转换：prompt / display / 错题键 / 判分一律不动。 */
  function sdSVG(spec) {
    var sp = String(spec).split('|');
    var z = String(sp[0] || '').replace(/[^0-9]/g, '');
    var sh = String(sp[1] || '').split(/[,\s]+/).filter(function (x) { return x !== ''; });
    /* 1:1 像素渲染（viewBox 单位 = px）：若按 em 缩放，字号会被压到 3~4px 看不清。 */
    var r0 = 13, step = 11, R = r0 + sh.length * step;
    var W = 2 * R + 28, H = 2 * R + 12, cx = R + 9, cy = H / 2;
    var s = '<svg class="sd-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" ' +
      'style="vertical-align:middle;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="结构示意图：核电荷数 ' + z + '，各层电子 ' + sh.join('、') + '">' +
      '<g fill="none" stroke="currentColor" stroke-width="1">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r0 + '"/>';
    for (var i = 1; i <= sh.length; i++) {
      var r = r0 + i * step;
      s += '<path d="M' + cx + ',' + (cy - r) + ' A' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (cy + r) + '"/>';
    }
    s += '</g><g fill="currentColor" font-family="Times New Roman,Georgia,serif">' +
      '<text x="' + cx + '" y="' + (cy + 3) + '" text-anchor="middle" font-size="10.5">＋' + z + '</text>';
    for (var j = 1; j <= sh.length; j++) {
      s += '<text x="' + (cx + r0 + j * step + 3.5) + '" y="' + (cy + 3.4) + '" font-size="10">' + sh[j - 1] + '</text>';
    }
    return s + '</g></svg>';
  }
  /* ============================================================
     图形层：实验操作图 / 气体制取装置图 / 微观粒子图 / 溶解度曲线
     四者与结构示意图同一套机制——prompt 存纯文本，display 存 ⟦op:…⟧ 等标记，
     rich() 渲染成内联 SVG；错题键 / 判分 / 记录一律用 prompt，不受影响。
     全部 1:1 像素渲染（viewBox 单位 = px），避免 em 缩放把字号压到看不清。
     ============================================================ */
  var S_LINE = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"';
  var S_FILL = 'fill="currentColor" stroke="none"';
  var S_TXT = 'fill="currentColor" font-family="system-ui,Microsoft YaHei,sans-serif"';

  function svgWrap(cls, W, H, label, inner) {
    return '<svg class="' + cls + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"' +
      ' style="vertical-align:middle;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">' +
      inner + '</svg>';
  }

  /* ---------- ① 实验操作图：⟦op:read-ok⟧ / pour-bad / heat-ok / drop-bad / filter-ok ---------- */
  function opSVG(spec) {
    var a = String(spec).split('-'), op = a[0], ok = a[1] !== 'bad';
    var W = 104, H = 82, s = '';
    if (op === 'read') {
      s += '<g ' + S_LINE + '><path d="M36,14 L36,60 A9,5 0 0 0 54,60 L54,14"/>' +
        '<path d="M32,66 L58,66"/><path d="M36,14 L54,14"/></g>';
      s += '<path d="M36,44 L54,44 L54,64 A9,5 0 0 1 36,64 Z" fill="currentColor" opacity=".12" stroke="none"/>';
      for (var i = 0; i < 4; i++) s += '<path d="M36,' + (20 + i * 6) + ' L41,' + (20 + i * 6) + '" ' + S_LINE + '/>';
      var ey = ok ? 44 : 24;
      s += '<circle cx="86" cy="' + ey + '" r="4.5" ' + S_LINE + '/><circle cx="86" cy="' + ey + '" r="1.4" ' + S_FILL + '/>';
      s += '<path d="M81,' + ey + ' L55,44" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none"/>';
    } else if (op === 'pour') {
      /* 试管（左，口朝右上） */
      s += '<g transform="translate(30,72) rotate(22)" ' + S_LINE + '><path d="M-7,-40 L-7,0 A7,7 0 0 0 7,0 L7,-40"/></g>';
      s += '<path d="M23,38 L37,28 L39,50 Z" fill="currentColor" opacity=".12" stroke="none"/>';
      /* 试剂瓶（右，倒置倾倒，瓶口对准管口） */
      s += '<g transform="translate(78,30) rotate(118)">';
      s += '<rect x="-11" y="-13" width="22" height="26" rx="2" ' + S_LINE + '/>';
      s += '<rect x="-4" y="-19" width="8" height="6" ' + S_LINE + '/>';
      /* 标签：规范时朝上（手心），不规范时朝下 */
      if (ok) s += '<rect x="-9" y="-10" width="18" height="8" fill="currentColor" opacity=".55" stroke="none"/>';
      else s += '<rect x="-9" y="2" width="18" height="8" fill="currentColor" opacity=".55" stroke="none"/>';
      s += '</g>';
      /* 瓶塞：规范=倒放桌面，不规范=正放桌面 */
      if (ok) s += '<g transform="translate(88,74) rotate(90)"><rect x="-5" y="-7" width="10" height="14" rx="1.5" ' + S_LINE + '/></g>';
      else s += '<g transform="translate(88,70)"><rect x="-5" y="-7" width="10" height="14" rx="1.5" ' + S_LINE + '/><rect x="-5" y="-7" width="10" height="3" ' + S_FILL + '/></g>';
    } else if (op === 'heat') {
      /* 酒精灯 */
      s += '<g ' + S_LINE + '><path d="M40,70 L44,56 L60,56 L64,70 Z"/><path d="M50,56 L54,56"/>' +
        '<path d="M52,56 C46,48 48,40 52,36 C56,40 58,48 52,56 Z"/></g>';
      if (ok) {
        /* 规范：试管与桌面约 45°，外焰加热液体部位，液体不超过 1/3 */
        s += '<g transform="translate(52,44) rotate(-45)" ' + S_LINE + '>' +
          '<path d="M-7,-34 L-7,0 A7,7 0 0 0 7,0 L7,-34"/></g>';
        s += '<path d="M40,26 L44,22" ' + S_LINE + '/>';
        s += '<g transform="translate(52,34) rotate(-45)"><path d="M-9,-3 L9,-3 L9,3 L-9,3 Z" fill="currentColor" opacity=".25" stroke="none"/></g>';
      } else {
        /* 不规范：试管竖直，管底直接压在灯芯（内焰）上 */
        s += '<g ' + S_LINE + '><path d="M44,8 L44,38" /><path d="M60,8 L60,38"/><path d="M44,38 A8,6 0 0 0 60,38"/></g>';
        s += '<path d="M46,26 L58,26 L58,40 L46,40 Z" fill="currentColor" opacity=".18" stroke="none"/>';
      }
      s += '<path d="M8,76 L96,76" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" fill="none"/>';
    } else if (op === 'drop') {
      /* 试管：管口在 40，液面 50，底部 68 */
      s += '<g ' + S_LINE + '><path d="M38,40 L38,62 A9,6 0 0 0 56,62 L56,40"/><path d="M34,68 L60,68"/></g>';
      s += '<path d="M38,50 L56,50 L56,64 A9,6 0 0 1 38,64 Z" fill="currentColor" opacity=".12" stroke="none"/>';
      /* 规范：垂直悬空在管口上方；不规范：伸入管内、管口以下 */
      var g = ok ? '<g ' + S_LINE + '><ellipse cx="47" cy="8" rx="6" ry="5"/><rect x="44" y="12" width="6" height="16" rx="1"/>' +
        '<path d="M47,28 L47,34"/></g>'
        : '<g ' + S_LINE + '><ellipse cx="47" cy="8" rx="6" ry="5"/><rect x="44" y="12" width="6" height="42" rx="1"/>' +
        '<path d="M47,54 L47,60"/></g>';
      s += g;
    } else if (op === 'filter') {
      /* 漏斗 + 烧杯 + 玻璃棒 */
      s += '<g ' + S_LINE + '><path d="M30,16 L66,16 L52,38 L44,38 Z"/>' +
        '<path d="M' + (ok ? 62 : 48) + ',38 L' + (ok ? 62 : 48) + ',72"/></g>';
      s += '<g ' + S_LINE + '><path d="M30,44 L30,74 L74,74 L74,44"/><path d="M74,44 L80,42"/></g>';
      if (ok) s += '<path d="M84,14 L60,32" ' + S_LINE + '/>';
      s += '<path d="M30,58 L74,58 L74,74 L30,74 Z" fill="currentColor" opacity=".1" stroke="none"/>';
    }
    return svgWrap('op-svg', W, H, '实验操作示意图', s);
  }

  /* ---------- ② 气体制取 / 收集装置图：⟦dev:heat⟧ / room / room2 / up / down / water ---------- */
  function devSVG(spec) {
    var t = String(spec), W = 120, H = 96, s = '';
    if (t === 'heat') {
      /* 铁架台 + 试管（口向右，略向下倾斜）+ 单孔塞导管 + 酒精灯 */
      s += '<g ' + S_LINE + '><path d="M8,90 L54,90"/><path d="M14,90 L14,16"/><path d="M14,34 L32,34"/></g>';
      s += '<g ' + S_LINE + '><path d="M32,24 L84,24 L84,44 L40,44 A8,8 0 0 1 32,36 Z"/></g>';
      s += '<path d="M40,28 L78,28 L78,40 L40,40 Z" fill="currentColor" opacity=".1" stroke="none"/>';
      s += '<rect x="84" y="24" width="7" height="20" rx="1" ' + S_LINE + '/>';
      s += '<path d="M91,34 L112,34 L112,14" ' + S_LINE + '/>';
      s += '<g ' + S_LINE + '><path d="M46,88 L50,68 L70,68 L74,88 Z"/><path d="M58,68 L62,68"/>' +
        '<path d="M60,68 C54,60 56,52 60,48 C64,52 66,60 60,68 Z"/></g>';
    } else if (t === 'room' || t === 'room2') {
      if (t === 'room') {
        /* 锥形瓶 + 双孔塞 + 长颈漏斗 + 导管 */
        s += '<g ' + S_LINE + '><path d="M28,88 L36,56 L36,46 L50,46 L50,56 L58,88 Z"/></g>';
        s += '<path d="M30,74 L56,74 L58,88 L28,88 Z" fill="currentColor" opacity=".12" stroke="none"/>';
        s += '<rect x="32" y="38" width="22" height="8" rx="1" ' + S_LINE + '/>';
        s += '<g ' + S_LINE + '><path d="M30,8 L52,8 L45,24 L37,24 Z"/><path d="M41,24 L41,80"/></g>';
        s += '<path d="M46,38 L46,28 L86,28 L86,12" ' + S_LINE + '/>';
      } else {
        /* 试管 + 双孔塞 + 分液漏斗 + 导管 */
        s += '<g ' + S_LINE + '><path d="M30,40 L30,74 A7,6 0 0 0 44,74 L44,40"/><path d="M26,80 L48,80"/></g>';
        s += '<path d="M30,56 L44,56 L44,76 A7,6 0 0 1 30,76 Z" fill="currentColor" opacity=".12" stroke="none"/>';
        s += '<rect x="27" y="32" width="20" height="8" rx="1" ' + S_LINE + '/>';
        s += '<g ' + S_LINE + '><path d="M62,6 L86,6 L79,22 L69,22 Z"/><path d="M74,22 L74,26"/>' +
          '<circle cx="74" cy="28" r="2.5"/><path d="M74,30 L74,36 L46,36"/></g>';
        s += '<path d="M37,32 L37,18 L92,18" ' + S_LINE + '/>';
      }
    } else if (t === 'up') {
      s += '<g ' + S_LINE + '><path d="M46,24 L46,80 L82,80 L82,24"/><path d="M40,24 L88,24"/></g>';
      s += '<path d="M46,44 L82,44 L82,79 L46,79 Z" fill="currentColor" opacity=".07" stroke="none"/>';
      s += '<path d="M20,12 L20,72 L46,72" ' + S_LINE + '/>';
    } else if (t === 'down') {
      s += '<g ' + S_LINE + '><path d="M46,56 L46,20 L82,20 L82,56"/><path d="M40,56 L88,56"/></g>';
      s += '<path d="M46,21 L82,21 L82,44 L46,44 Z" fill="currentColor" opacity=".07" stroke="none"/>';
      s += '<path d="M20,84 L20,30 L46,30" ' + S_LINE + '/>';
    } else if (t === 'water') {
      s += '<g ' + S_LINE + '><path d="M24,52 L24,86 L96,86 L96,52"/></g>';
      s += '<path d="M24,58 L96,58 L96,86 L24,86 Z" fill="currentColor" opacity=".16" stroke="none"/>';
      s += '<g ' + S_LINE + '><path d="M44,26 L44,74"/><path d="M74,26 L74,74"/><path d="M44,26 L74,26"/></g>';
      s += '<g ' + S_LINE + '><circle cx="52" cy="66" r="2.2"/><circle cx="59" cy="58" r="1.6"/><circle cx="65" cy="50" r="1.2"/></g>';
      s += '<path d="M8,20 L8,44 Q8,50 16,50 L44,50" ' + S_LINE + '/>';
    }
    return svgWrap('dev-svg', W, H, '气体制取与收集装置图', s);
  }

  /* ---------- ③ 微观粒子示意图：⟦mic:H2~2,O2~1⟧ 或 ⟦mic:H2~2,O2~1>H2O~2⟧ ---------- */
  var MIC_ATOMS = {
    O2: [[0, 0, 'O', 8], [15, 0, 'O', 8]],
    N2: [[0, 0, 'N', 8], [15, 0, 'N', 8]],
    H2: [[0, 0, 'H', 6], [13, 0, 'H', 6]],
    CO: [[0, 0, 'C', 8], [15, 0, 'O', 8]],
    CO2: [[0, 0, 'C', 8], [-15, 0, 'O', 8], [15, 0, 'O', 8]],
    H2O: [[0, 0, 'O', 9], [-10, -10, 'H', 6], [10, -10, 'H', 6]],
    C: [[0, 0, 'C', 8]],
    O: [[0, 0, 'O', 8]],
    H: [[0, 0, 'H', 6]],
    CuO: [[0, 0, 'Cu', 9], [17, 0, 'O', 8]]
  };
  function micMol(type, x, y) {
    var at = MIC_ATOMS[type] || MIC_ATOMS.O;
    var s = '<g transform="translate(' + x + ',' + y + ')">';
    for (var i = 0; i < at.length; i++) {
      s += '<circle cx="' + at[i][0] + '" cy="' + at[i][1] + '" r="' + at[i][3] + '" fill="none" stroke="currentColor" stroke-width="1.1"/>' +
        '<text x="' + at[i][0] + '" y="' + (at[i][1] + 3.2) + '" ' + S_TXT + ' text-anchor="middle" font-size="' + (at[i][2].length > 1 ? 7.5 : 9) + '">' + at[i][2] + '</text>';
    }
    return s + '</g>';
  }
  function micExt(type) {
    var at = MIC_ATOMS[type] || MIC_ATOMS.O, mn = 1e9, mx = -1e9;
    for (var i = 0; i < at.length; i++) {
      var l = at[i][0] - at[i][3], r2 = at[i][0] + at[i][3];
      if (l < mn) mn = l;
      if (r2 > mx) mx = r2;
    }
    return { min: mn, w: mx - mn };
  }
  function micSVG(spec) {
    var groups = String(spec).split('>'), pad = 12, gapMol = 18, gapArrow = 30, cy = 28;
    var plan = [], W = pad, i, j;
    for (i = 0; i < groups.length; i++) {
      var items = groups[i].split(',').filter(function (z) { return z !== ''; }), list = [];
      for (j = 0; j < items.length; j++) {
        var p = items[j].split('~'), n = parseInt(p[1] || '1', 10);
        for (var k = 0; k < n; k++) list.push(p[0]);
      }
      plan.push(list);
      for (j = 0; j < list.length; j++) W += micExt(list[j]).w + (j ? gapMol : 0);
      if (i < groups.length - 1) W += gapArrow;
    }
    W += pad;
    var x = pad, s = '';
    for (i = 0; i < plan.length; i++) {
      for (j = 0; j < plan[i].length; j++) {
        var e = micExt(plan[i][j]);
        s += micMol(plan[i][j], x - e.min, cy);
        x += e.w + gapMol;
      }
      x -= gapMol;
      if (i < plan.length - 1) {
        s += '<path d="M' + (x + 8) + ',' + cy + ' L' + (x + 24) + ',' + cy + '" stroke="currentColor" stroke-width="1.3" fill="none"/>' +
          '<path d="M' + (x + 24) + ',' + cy + ' L' + (x + 19) + ',' + (cy - 3) + ' M' + (x + 24) + ',' + cy + ' L' + (x + 19) + ',' + (cy + 3) +
          '" stroke="currentColor" stroke-width="1.3" fill="none"/>';
        x += gapArrow;
      }
    }
    return svgWrap('mic-svg', W, cy * 2, '微观粒子示意图', s);
  }

  /* ---------- ④ 溶解度曲线：⟦cur:NH4Cl,NaCl⟧ ---------- */
  var CUR_DATA = {
    NH4Cl: [29.4, 37.2, 45.8, 55.2, 65.6, 77.3],
    NaCl: [35.7, 36.0, 36.6, 37.3, 38.4, 39.8],
    KNO3: [13.3, 31.6, 63.9, 110, 169, 246],
    CaOH2: [0.185, 0.165, 0.121, 0.116, 0.094, 0.074]
  };
  var CUR_NAME = { NH4Cl: 'NH₄Cl', NaCl: 'NaCl', KNO3: 'KNO₃', CaOH2: 'Ca(OH)₂' };
  function curSVG(spec) {
    var names = String(spec).split(',').filter(function (z) { return z !== ''; });
    var W = 200, H = 134, x0 = 34, y0 = 92, x1 = 128, y1 = 18;
    var tmax = 100, mx = 1;
    for (var i = 0; i < names.length; i++) {
      var d = CUR_DATA[names[i]] || CUR_DATA.NaCl;
      for (var j = 0; j < d.length; j++) if (d[j] > mx) mx = d[j];
    }
    /* 纵轴取"整刻度"：先按 5 等分估一个步长再取整（1/2/2.5/5/10 × 10^n），
       避免出现 73、218 这类不教材的刻度值。 */
    function niceStep(x) {
      var pw = Math.pow(10, Math.floor(Math.log(x) / Math.LN10)), n = x / pw;
      var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
      return m * pw;
    }
    var SEG = 5, stepY = niceStep(mx / SEG), ymax = stepY * SEG;
    var s = '<g ' + S_LINE + '><path d="M' + x0 + ',' + y1 + ' L' + x0 + ',' + y0 + ' L' + x1 + ',' + y0 + '"/></g>';
    s += '<text x="' + (x0 + 2) + '" y="' + (y1 - 7) + '" ' + S_TXT + ' font-size="9" text-anchor="start">溶解度/g</text>';
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y0 + 24) + '" ' + S_TXT + ' text-anchor="middle" font-size="9">温度/℃</text>';
    for (var ty = 0; ty <= SEG; ty++) {
      var yy = y0 - (y0 - y1) * ty / SEG, val = ymax * ty / SEG;
      s += '<path d="M' + x0 + ',' + yy + ' L' + (x0 - 3) + ',' + yy + '" ' + S_LINE + '/>';
      s += '<text x="' + (x0 - 5) + '" y="' + (yy + 3) + '" ' + S_TXT + ' font-size="8" text-anchor="end">' +
        (stepY < 0.1 ? String(Math.round(val * 1000) / 1000) : String(Math.round(val))) + '</text>';
      s += '<path d="M' + x0 + ',' + yy + ' L' + x1 + ',' + yy + '" stroke="currentColor" stroke-width="0.4" stroke-dasharray="2 3" fill="none" opacity=".45"/>';
    }
    for (var tx = 0; tx <= 4; tx++) {
      var xx = x0 + (x1 - x0) * tx / 4;
      s += '<text x="' + xx + '" y="' + (y0 + 11) + '" ' + S_TXT + ' text-anchor="middle" font-size="8">' + (tmax * tx / 4) + '</text>';
    }
    for (var n = 0; n < names.length; n++) {
      var dd = CUR_DATA[names[n]] || CUR_DATA.NaCl, pts = [];
      for (var q = 0; q < dd.length; q++) {
        pts.push((x0 + (x1 - x0) * (q * 20) / tmax).toFixed(1) + ',' + (y0 - (y0 - y1) * dd[q] / ymax).toFixed(1));
      }
      s += '<path d="M' + pts.join(' L') + '" fill="none" stroke="currentColor" stroke-width="' + (n === 0 ? 1.6 : 1.1) +
        '" ' + (n === 1 ? 'stroke-dasharray="5 3"' : '') + '/>';
      var ex = x1, ey = y0 - (y0 - y1) * dd[dd.length - 1] / ymax;
      s += '<text x="' + (ex + 7) + '" y="' + (ey + 4) + '" ' + S_TXT + ' font-size="9" text-anchor="start">' + CUR_NAME[names[n]] + '</text>';
    }
    return svgWrap('cur-svg', W, H, '溶解度曲线', s);
  }

  function rich(s) {
    var out = esc(s).replace(/Δ/g, '△');
    /* 结构示意图先换成占位符再拼回：chemRuns 会把化学字符连续段整体吞成化学式，
       示意图一旦留在原位就会被误吞；占位符用控制字符（不属化学字符），最后按序拼回。
       不用正则替换——源码里的转义在多层内联后容易失真。 */
    var SD_MK = String.fromCharCode(1), sds = [];
    out = out.replace(/⟦(sd|op|dev|mic|cur):([^⟧]+)⟧/g, function (m, kind, spec) {
      /* display 先被 esc() 转义过（> 变 &gt;），微观图的反应箭头会因此丢失，这里还原 */
      spec = spec.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
      var svg = kind === 'sd' ? sdSVG(spec) : kind === 'op' ? opSVG(spec) :
        kind === 'dev' ? devSVG(spec) : kind === 'mic' ? micSVG(spec) : curSVG(spec);
      sds.push(svg);
      return SD_MK + (sds.length - 1) + SD_MK;
    });
    out = out.replace(/—([^→]+)→/g, function (m, c) { return '⟦' + c.replace('/', '|') + '⟧'; });
    /* HEAD 时代的老错题只存了裸串 prompt（无 display 字段）：「2KClO₃ MnO₂/Δ 2KCl…」，
       条件夹在化学式之间。仅对配平题（含「配平：」）兜底：把「空格+条件词+空格」补成 ⟦⟧，
       让老错题回炉也走同一套 SVG 富排版。限定配平题前缀 + 完整 token，避免误伤
       其它科目题干里出现的 △（数学判别式）或「点燃」等普通字词。 */
    if (out.indexOf('配平：') >= 0) {
      out = out.replace(/ (点燃|高温|MnO₂[/]△|△|高温高压[/]催化剂|通电) /g, function (m, c) {
        var p = c.split('/');
        return ' ⟦' + p[0] + (p.length > 1 ? '|' + p[1] : '') + '⟧ ';
      });
    }
    var joined = chemRuns(out);
    for (var si = 0; si < sds.length; si++) joined = joined.split(SD_MK + si + SD_MK).join(sds[si]);
    return joined;
  }

  /* ---------- 化学特殊符号键盘 ----------
     点按钮把符号插入到当前聚焦的输入框光标处；若焦点不在输入框，插到本字段对应的 input。
     符号用真实 Unicode（上标 ²⁺⁻、下标 ₄ 等），normChem 会归一成 2+- / 4，判分不变。 */
  var SYMKEYS = [
    { label: '上标', keys: ['⁺', '⁻', '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'] },
    { label: '下标', keys: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] },
    { label: '符号', keys: ['↑', '↓', '△', '→', '＋', '－', '＝'] },
    { label: '常用离子', keys: ['S²⁻', 'O²⁻', 'Cl⁻', 'Mg²⁺', 'Ca²⁺', 'Al³⁺', 'Na⁺', 'NH₄⁺', 'OH⁻', 'SO₄²⁻', 'CO₃²⁻', 'NO₃⁻'] }
  ];
  function symkeysHtml(inputId) {
    var rows = SYMKEYS.map(function (grp) {
      var btns = grp.keys.map(function (k) {
        return '<button type="button" data-sym="' + esc(k) + '" data-sym-target="' + esc(inputId) + '" title="插入 ' + esc(k) + '">' + esc(k) + '</button>';
      }).join('');
      return '<div class="sk-row"><span class="sk-label">' + esc(grp.label) + '</span>' + btns + '</div>';
    }).join('');
    return '<div class="symkeys" data-symkeys><div class="sk-title">⌨ 特殊符号（点一下插入光标处）</div>' + rows + '</div>';
  }
  function insertSym(btn) {
    var sym = btn.getAttribute('data-sym');
    var el = document.activeElement;
    if (!el || el.tagName !== 'INPUT' || el.readOnly) el = document.getElementById(btn.getAttribute('data-sym-target'));
    if (!el || el.readOnly || sym == null) return;
    var v = el.value || '';
    var s = typeof el.selectionStart === 'number' ? el.selectionStart : v.length;
    var e = typeof el.selectionEnd === 'number' ? el.selectionEnd : v.length;
    el.value = v.slice(0, s) + sym + v.slice(e);
    try { el.focus(); el.setSelectionRange(s + sym.length, s + sym.length); } catch (x) {}
  }

  /* ---------- 合并函数：全局共用（merge.mjs 内联），导入 / 云同步共用同一份 ----------
     去重键 (ts,mod,kind,prompt[:40]||kn)；不求和；days/lastRound/dayPlan/sess 不进载体。
     本地薄封装仅为兼容 selfcheck 的 window[global].mergeRecords 钩子。 */
  function recSig(r) { return window.__ltMerge.recSig(r); }
  function mergeRecords(a, b) { return window.__ltMerge.mergeRecords(a, b); }
  function importText(txt) {
    var d;
    try { d = JSON.parse(txt); } catch (e) { alert('不是合法的 JSON 文件'); return false; }
    if (!d || !Array.isArray(d.recs) || !d.wrong || typeof d.wrong !== 'object') {
      alert('不是本训练器的记录文件（需要 recs / wrong 字段）'); return false;
    }
    DB = mergeRecords(DB, d); save(); render();
    alert('已导入并合并：累计 ' + DB.recs.length + ' 条做题记录 / ' + Object.keys(DB.wrong).length + ' 道错题');
    return true;
  }

  /* ---------- 种子 / 去重 / 题型轮换 ---------- */
  function newSeed() { return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0; }
  /* 同一道题的稳定键：与作答记录 qid 完全同源（mod.kind + 题干前 40 字）。
     改这里会让「已做过」判定与历史记录失配，别动格式。 */
  function sigOf(q) { return q.mod + '.' + q.kind + '.' + String(q.prompt).slice(0, 40); }
  function lastRoundOf(mod) {
    var recs = DB.recs.filter(function (x) { return !mod || x.mod === mod; });
    return recs.slice(-20);
  }
  function pickQuestion(mod, kind, seenSigs, forceSeed) {
    var seed = forceSeed == null ? newSeed() : forceSeed;
    var q, tries = 0;
    do { q = CH.gen(mod, kind, (seed + tries * 7919) >>> 0); tries++; }
    while (seenSigs.indexOf(sigOf(q)) >= 0 && tries < 40);
    return q;
  }
  /* ---------- 题库枚举（专练未覆盖用）----------
     题型是 seed 驱动的确定性生成器，扫 1..1200 个 seed 即可拿到该题型的完整题库
     （POOLS 里最大的固定池是 sol.config 64 道，1200 足够饱和）。
     pool = -1 的题型没有“覆盖完”的概念，不进这里。结果按题型缓存，题库随页面版本变。 */
  var POOL_CACHE = {};
  function enumerateKind(mod, kind) {
    var ck = mod + '.' + kind;
    if (POOL_CACHE[ck]) return POOL_CACHE[ck];
    var list = [], seen = {};
    for (var s = 1; s <= 1200; s++) {
      var q;
      try { q = CH.gen(mod, kind, s); } catch (e) { continue; }
      if (!q || !q.prompt) continue;
      var k = sigOf(q);
      if (!seen[k]) { seen[k] = 1; list.push({ key: k, q: q }); }
    }
    POOL_CACHE[ck] = list;
    return list;
  }
  /* 抽一道「本题型没做过」的题：从随机起点扫题库，跳过已做与本轮已出。
     返回 null = 这个题型的题都做过了（调用方换题型或收尾）。 */
  function pickUncovered(mod, kind, seenSigs) {
    var list = enumerateKind(mod, kind), d = doneMap(mod, kind), n = list.length;
    if (!n) return null;
    var start = n > 1 ? (newSeed() % n) : 0;
    for (var i = 0; i < n; i++) {
      var it = list[(start + i) % n];
      if (!d.map[it.key] && seenSigs.indexOf(it.key) < 0) return it.q;
    }
    return null;
  }
  /* 未覆盖题型的队列：只有登记了池量的题型才有“未覆盖”这回事 */
  function nocoverQueue(mod, kind) {
    var m = CH.moduleById(mod), out = [];
    if (!m) return out;
    m.kinds.forEach(function (k) {
      if (kind && k.id !== kind) return;
      var c = coverOf(m.id, k.id);
      if (c.pct == null || c.open <= 0) return;
      out.push(k.id);
    });
    return out;
  }
  function modOf(k) { return k.mod; }
  function kindQueue(mod, n) {
    var m = CH.moduleById(mod), out = [];
    var all = m ? m.kinds.map(function (k) { return k.id; }) : CH.allKinds.map(function (k) { return modOf(k) + '/' + k.id; });
    if (!all.length) all = CH.allKinds.map(function (k) { return k.mod + '/' + k.id; });
    var last = lastRoundOf(mod), lastKinds = last.map(function (x) { return x.kind; });
    var fresh = all.filter(function (id) { return lastKinds.indexOf(id.split('/').pop()) < 0; });
    var ordered = fresh.concat(all.filter(function (id) { return fresh.indexOf(id) < 0; }));
    for (var i = 0; i < n; i++) out.push(ordered[i % ordered.length]);
    return out;
  }

  /* ---------- 会话 ---------- */
  function startRound(mod, kind, total, mode) {
    total = total || 10;
    var queue = [];
    if (mode === 'wrong' || mode === 'wrongall') {
      var ws = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; })
        .sort(function (a, b) { return a.due - b.due; });
      if (mode === 'wrong') ws = window.__ltReview.dueList(DB.wrong);
      queue = ws.slice(0, total).map(function (w) { return { key: w.key, mod: w.mod, kind: w.kind }; });
      if (!queue.length) { S.view = 'wrong'; render(); return; }
      total = queue.length;
    } else if (!mode || mode === 'normal') {
      queue = kindQueue(mod, total);
    } else if (mode === 'nocover') {
      queue = nocoverQueue(mod, kind);
      if (!queue.length) { S.mod = mod; S.view = 'mod'; render(); return; }
    }
    S.sess = { mod: mod || null, kind: kind || null, total: total, done: 0, right: 0,
      mode: mode || 'normal', queue: queue, sigs: [], seed: newSeed() };
    S.view = 'quiz'; S.q = null; S.res = null; S.answered = false; S.hint = false;
    nextQuestion();
  }
  function nextQuestion() {
    var s = S.sess;
    if (!s) { go('today'); return; }
    if (s.done >= s.total) { S.view = 'summary'; render(); return; }
    if (s.mode === 'wrong' || s.mode === 'wrongall') {
      var entry = s.queue[s.done];
      if (!entry || !DB.wrong[entry.key]) { s.done++; return nextQuestion(); }
      var w = DB.wrong[entry.key];
      S.q = { mod: w.mod, kind: w.kind, kindName: w.kindName, modName: w.modName, title: w.title,
        prompt: w.prompt, display: w.display, fields: w.fields, tip: w.tip, explain: w.explain, kp: w.kp, _wrongKey: entry.key };
    } else if (s.mode === 'nocover') {
      /* 专练未覆盖：按队列里的题型逐个抽“没做过”的题；某题型抽空就换下一个，
         全空即提前收尾（summary 会说明“能做的都做过了”，不硬凑满 10 题）。 */
      var qc = null, left = (s.queue || []).slice();
      while (!qc && left.length) {
        qc = pickUncovered(s.mod, left[0], s.sigs);
        if (!qc) left.shift();
      }
      if (!qc) { s.coveredOut = true; S.view = 'summary'; render(); return; }
      S.q = qc;
      s.sigs.push(sigOf(qc));
    } else {
      var slot = s.queue && s.queue.length ? s.queue[s.done % s.queue.length] : null;
      var mod = s.mod, kind = s.kind;
      if (!kind && slot) {
        if (slot.indexOf('/') >= 0) { var p = slot.split('/'); mod = p[0]; kind = p[1]; }
        else kind = slot;
      }
      S.q = pickQuestion(mod, kind, s.sigs, (s.seed + s.done * 104729) >>> 0);
      s.sigs.push(sigOf(S.q));
    }
    S.res = null; S.answered = false; S.hint = false; S.qAt = Date.now();
    save(); render();
  }
  function submit() {
    if (S.answered || !S.q) return;
    var vals = readVals();
    var filled = vals.some(function (v, i) {
      var f = S.q.fields[i];
      if (f.type === 'choice') return v != null;
      return String(v == null ? '' : v).trim() !== '';
    });
    if (!filled) { alert('先作答再提交'); return; }
    var res = CH.judge(S.q, vals);
    S.res = res; S.answered = true;
    var s = S.sess, recMod = (s.mode === 'wrong' || s.mode === 'wrongall') ? (S.q.mod || 'all') : (s.mod || (S.q.mod || 'all'));
    var qid = recMod + '.' + (S.q.kind || '') + '.' + String(S.q.prompt || '').slice(0, 40);
    DB.recs.push({ ts: Date.now(), mod: recMod, kind: S.q.kind, kindName: S.q.kindName,
      title: S.q.title, ok: res.ok, got: res.got, total: res.total,
      prompt: S.q.prompt, kp: S.q.kp, mode: s.mode,
      qid: qid });
    /* 不再截断 recs：整学期作答（含每次答错）是期末复盘的原始依据，见 ADR-0010。
       单条记录约 200B，一学期几千条约 1MB，localStorage 5MB 配额内。 */
    if (res.ok) s.right++;
    reviewAnswer(S.q, res.ok, qid);   /* 统一错题回炉（ADR-0010）：连对2次+行为约束才算掌握 */
    if (S.q.kind) { DB.meta.lastKind = DB.meta.lastKind || {}; DB.meta.lastKind[recMod] = S.q.kind; }
    DB.meta.round = (DB.meta.round || 0) + 1;
    DB.sess = snapshot(); save(); render();
  }
  function readVals() {
    return S.q.fields.map(function (f, i) {
      if (f.type === 'choice') {
        var sel = document.querySelector('#app [data-choice="' + i + '"].sel');
        return sel ? parseInt(sel.getAttribute('data-choice-val'), 10) : null;
      }
      var el = document.getElementById(IP + i);
      return el ? el.value : '';
    });
  }
  function snapshot() { return { view: S.view, q: S.q, res: S.res, answered: S.answered, sess: S.sess, hint: S.hint, vals: S.vals }; }
  function restore() {
    try {
      var x = JSON.parse(localStorage.getItem(SKEY) || 'null');
      if (x && x.q && x.sess) {
        S.q = x.q; S.res = x.res; S.answered = !!x.answered; S.sess = x.sess;
        S.hint = !!x.hint; S.vals = x.vals || null; S.view = 'quiz';
        return true;
      }
    } catch (e) {}
    return false;
  }
  function saveSess() { try { localStorage.setItem(SKEY, JSON.stringify(snapshot())); } catch (e) {} }
  function clearSess() { try { localStorage.removeItem(SKEY); } catch (e) {} DB.sess = null; save(); }

  /* ---------- 错题库（plan 天回炉，默认 1/3/7/14） ---------- */
  function wrongKey(q) { return ${cfg.wrongKeyExpr}; }
  /* 共享回炉内核 ADR-0010：规则只在 工具/trainer/review.js，化学最短有效用时 3 秒 */
  function reviewAnswer(q, ok, qid) {
    var R = window.__ltReview, k = q._wrongKey || wrongKey(q), w = DB.wrong[k], now = Date.now();
    if (R.migrate(w, now)) save();
    var sec = Math.max(1, Math.round((now - (S.qAt || now)) / 1000));
    if (!ok) {
      if (!w) {
        w = { key: k, qid: qid, mod: q.mod, kind: q.kind, kindName: q.kindName, modName: q.modName,
          title: q.title, prompt: q.prompt, display: q.display, fields: q.fields, tip: q.tip, explain: q.explain, kp: q.kp };
        DB.wrong[k] = w;
      }
      if (qid && !w.qid) w.qid = qid;   /* 旧条目补 qid，供历史错题清单匹配 */
      R.onWrong(w, now);
      return;
    }
    var act = R.onPass(w, { sec: sec, minSec: 3, hint: !!S.hint, fixed: false }, now);
    if (act === 'mastered') delete DB.wrong[k];
  }
  function dueWrong() { return window.__ltReview.dueList(DB.wrong); }

  /* ---------- 路由 ---------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\\/?/, ''), p = {};
    h.split('&').forEach(function (kv) { if (!kv) return; var a = kv.split('='); p[a[0]] = decodeURIComponent(a[1] || ''); });
    return p;
  }
  function go(view, mod, kind) {
    S.view = view; S.mod = mod || null; S.kind = kind || null;
    if (view !== 'quiz') { S.q = null; S.res = null; S.answered = false; }
    var hash = '#view=' + view + (mod ? '&m=' + encodeURIComponent(mod) : '') + (kind ? '&k=' + encodeURIComponent(kind) : '');
    if (location.hash !== hash) history.replaceState(null, '', hash);
    render(); window.scrollTo(0, 0);
  }
  function boot() {
    var p = parseHash(), v = p.view || 'today', startKind = null;
    if (v === 'mod' && p.m) {
      S.view = 'mod'; S.mod = p.m; S.kind = p.k || null;
      if (p.k) startKind = p.k;
    } else if (v === 'wrong') S.view = 'wrong';
    else if (v === 'report') S.view = 'report';
    else S.view = 'today';
    render();
    if (startKind) startRound(S.mod, startKind, 10);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    renderTabs();
    var html = '';
    if (S.view === 'today') html = viewToday();
    else if (S.view === 'mod') html = viewMod();
    else if (S.view === 'quiz') html = viewQuiz();
    else if (S.view === 'summary') html = viewSummary();
    else if (S.view === 'wrong') html = viewWrong();
    else if (S.view === 'report') html = viewReport();
    app.innerHTML = html;
    bind();
  }
  function renderTabs() {
    tabsBar.innerHTML = VIEWS.map(function (t) {
      var act = (S.view === t.k || (t.k === 'wrong' && S.view === 'summary')) ? ' active' : '';
      return '<button data-go="' + t.k + '" class="' + act.trim() + '">' + t.n + '</button>';
    }).join('');
  }
  function stats() {
    var recs = DB.recs, done = recs.length, right = recs.filter(function (r) { return r.ok; }).length;
    return { done: done, right: right, rate: done ? Math.round(right / done * 100) : 0,
      wrong: Object.keys(DB.wrong).length, due: dueWrong().length };
  }
  /* 该单元已练到的题型数。只认登记过的 kind（老记录缺 kind 字段的不算），
     避免因为脏记录把「覆盖 3/7」虚报成 7/7。 */
  function kindSeen(recs, m) {
    var ids = {};
    recs.forEach(function (r) { if (r.kind) ids[r.kind] = 1; });
    return m.kinds.filter(function (k) { return ids[k.id]; }).length;
  }
  /* ---------- 知识覆盖面（分母 = core 的 POOLS 表）----------
     keyOf 与作答记录的 qid 同源（mod.kind + 题干前 40 字），所以「做过哪几道题」可去重。
     pool > 0 才有百分比；pool = -1（数字随机 / 排列组合 / 元素组合）只报练了几道。 */
  function keyOf(q) { return q.mod + '.' + q.kind + '.' + String(q.prompt || '').slice(0, 40); }
  function doneMap(mod, kind) {
    var seen = {}, n = 0;
    DB.recs.forEach(function (r) {
      if (r.mod !== mod || r.kind !== kind) return;
      var k = r.qid || (r.mod + '.' + r.kind + '.' + String(r.prompt || '').slice(0, 40));
      if (!seen[k]) { seen[k] = 1; n++; }
    });
    return { map: seen, n: n };
  }
  function coverOf(mod, kind) {
    var pool = CH.kindPool ? CH.kindPool(mod, kind) : 0, d = doneMap(mod, kind);
    if (pool > 0) {
      var got = Math.min(d.n, pool);
      return { pool: pool, done: got, pct: Math.min(100, Math.round(got / pool * 100)), open: Math.max(0, pool - d.n) };
    }
    return { pool: 0, done: d.n, pct: null, open: null };
  }
  /* 单元合计：只累计有分母的题型；全是不限时返回 pct=null */
  function coverOfMod(m) {
    var pool = 0, done = 0;
    m.kinds.forEach(function (k) {
      var c = coverOf(m.id, k.id);
      if (c.pool > 0) { pool += c.pool; done += c.done; }
    });
    return { pool: pool, done: done, pct: pool ? Math.min(100, Math.round(done / pool * 100)) : null };
  }
  function viewToday() {
    var st = stats(), resume = '';
    try {
      var x = JSON.parse(localStorage.getItem(SKEY) || 'null');
      if (x && x.sess && x.sess.done < x.sess.total) resume = '<button class="btn" data-act="resume">继续上次练习（第 ' + (x.sess.done + 1) + ' 题）</button>';
    } catch (e) {}
    var mods = CH.modules.map(function (m) {
      var recs = DB.recs.filter(function (r) { return r.mod === m.id; });
      var ok = recs.filter(function (r) { return r.ok; }).length;
      var seen = kindSeen(recs, m);
      var wr = Object.keys(DB.wrong).filter(function (k) { return DB.wrong[k].mod === m.id; }).length;
      /* 文案口径（2026-11-23）：括号里的百分号是「正确率」不是进度，故明写；
         另补「题型 a/b」= 该单元已练到的题型数 / 题型总数（真·覆盖率）。 */
      return '<div class="modcard" data-mod="' + m.id + '"><h4>' + m.icon + ' ' + esc(m.name) + '</h4>' +
        '<div class="d">' + esc(m.desc) + '</div><div class="m">' + m.kinds.length + ' 类题型' +
        (recs.length
          ? ' · 已练 ' + recs.length + ' 题 · 正确率 ' + Math.round(ok / recs.length * 100) + '%' +
            ' · 题型 ' + seen + '/' + m.kinds.length
          : ' · 未练') +
        (wr ? ' · 错题 ' + wr : '') + '</div></div>';
    }).join('');
    var scope = fillTpl(T.scopePill, { units: CH.modules.length, kinds: CH.allKinds.length });
    var intro = fillTpl(T.intro, { plan: PLAN.join(' / ') });
    return '<div class="card"><div class="row"><h2 style="margin:0">今日练习</h2><span class="grow"></span>' +
      '<span class="pill">' + scope + '</span></div>' +
      '<p class="muted small">' + esc(intro) + '</p>' +
      statBoxes([['累计做题', st.done], ['正确率', st.rate + '%'], ['错题库', st.wrong], ['今日到期', st.due]], 'margin:12px 0') +
      '<div class="row"><button class="btn btn-primary" data-act="all">全部考点 · 随机 10 题</button>' +
      '<button class="btn" data-act="all20">混合 20 题</button>' +
      (st.due ? '<button class="btn" data-act="wrongdue">复习到期错题（' + st.due + '）</button>' : '') +
      resume + '</div></div>' +
      '<h2>' + esc(T.unitTitle) + '</h2><div class="modgrid">' + mods + '</div>';
  }
  /* 配平方法细则卡：题型带 guide 字段时，在题型 chip 下方渲染可展开的「细则 + 例题」 */
  function guideCard(k) {
    return (k && k.guide) ? '<details class="gc-wrap"><summary style="cursor:pointer;font-size:13px;color:var(--brand);margin:6px 0 2px">📖 ' +
      esc(k.name) + ' · 看方法与例题</summary>' + guideInner(k) + '</details>' : '';
  }
  /* guide 在模块页是一张可展开卡；在答题页也内联一份当前题型的，
     这样从「按题型练 / 本单元随机 / 先看一道例题 / 深链」任一入口进来都能看到。
     例题内容纯展示：不判分、不写 DB.recs、不进错题库。 */
  function guideFor(q) {
    if (!q || !q.mod || !q.kind) return null;
    var m = CH.moduleById(q.mod);
    if (!m) return null;
    for (var i = 0; i < m.kinds.length; i++) if (m.kinds[i].id === q.kind) return m.kinds[i].guide || null;
    return null;
  }
  function guideInner(k) {
    var g = k.guide;
    var steps = (g.steps || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('');
    var ex = g.example, exHtml = '';
    if (ex) {
      var exSteps = (ex.steps || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('');
      var walk = ex.walk || [];
      if (walk.length) {
        /* 引导式例题：先给问题让孩子自己想，点开才看推理；完整步骤折叠作对照 */
        var walkHtml = walk.map(function (w) {
          return '<details class="gc-walk"><summary>' + rich(w.ask) + '</summary>' +
            '<div class="gc-re"><b>思路：</b>' + rich(w.reveal) + '</div></details>';
        }).join('');
        exHtml = '<div class="gc-ex"><div class="gc-q">📌 例题：' + rich(ex.q) +
          '<div class="small" style="color:var(--muted)">先自己想一想每步该怎么做，点开再看思路。</div></div>' +
          walkHtml +
          '<details class="gc-full"><summary>看完整步骤与结果</summary>' +
          (exSteps ? '<ol>' + exSteps + '</ol>' : '') +
          '<div><b>配平结果：</b>' + rich(ex.a) + '</div></details></div>';
        var tryIt = ex.try;
        if (tryIt) {
          var tSteps = (tryIt.steps || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('');
          exHtml += '<div class="gc-try"><div class="gc-tq">✏️ 自己试一道：' + rich(tryIt.q) + '</div>' +
            '<details class="gc-full"><summary>做完点开对答案</summary>' +
            (tSteps ? '<ol>' + tSteps + '</ol>' : '') +
            '<div><b>配平结果：</b>' + rich(tryIt.a) + '</div></details></div>';
        }
      } else {
        exHtml = '<div class="gc-ex"><div class="gc-q">📌 例题：' + rich(ex.q) + '</div>' +
          (exSteps ? '<ol>' + exSteps + '</ol>' : '') +
          '<div style="margin-top:6px"><b>配平结果：</b>' + rich(ex.a) + '</div></div>';
      }
    }
    return '<div class="guide-card">' +
      '<div class="gc-h">' + esc(k.name) + '</div>' +
      '<div class="gc-sec">操作细则</div><ol>' + steps + '</ol>' + exHtml +
      '</div>';
  }
  /* 答题页内联方法卡：默认收起，点开才看；gc-walk/gc-full 内部仍各自折叠防泄题 */
  function guideQuizHtml(q) {
    var g = guideFor(q);
    if (!g) return '';
    var k = { name: q.kindName || (CH.moduleById(q.mod) || {}).name || '本题型', guide: g };
    return '<details class="gc-wrap" style="margin-bottom:10px"><summary style="cursor:pointer;font-size:13px;color:var(--brand)">📖 ' +
      esc(k.name) + ' · 看方法与引导例题（不计分）</summary>' + guideInner(k) + '</details>';
  }
  function viewMod() {
    var m = CH.moduleById(S.mod);
    if (!m) return '<div class="card"><h2>未找到单元</h2><button class="btn" data-go="today">回今日</button></div>';
    var recs = DB.recs.filter(function (r) { return r.mod === m.id; });
    var ok = recs.filter(function (r) { return r.ok; }).length;
    var cm = coverOfMod(m);
    /* 题型 chip：左边点进去 = 随机练该题型；右边小按钮 = 只练这题型没做过的题（分母来自 POOLS）。
       pool = -1 的题型（数字随机/排列组合）没有“未覆盖”概念，只显示已练几道。 */
    var chips = m.kinds.map(function (k) {
      var wr = Object.keys(DB.wrong).filter(function (x) { return DB.wrong[x].mod === m.id && DB.wrong[x].kind === k.id; }).length;
      var c = coverOf(m.id, k.id);
      var tag = c.pct == null ? ' · 已练 ' + c.done : ' · 覆盖 ' + c.done + '/' + c.pool + '（' + c.pct + '%）';
      var cov = c.pct == null ? ''
        : c.open > 0
          ? '<button class="kindcov" data-kindcov="' + k.id + '">练未覆盖 ' + c.open + '</button>'
          : '<span class="kindcov done">✓ 已全覆盖</span>';
      return '<span class="kindrow"><span class="kindchip" data-kind="' + k.id + '">' + esc(k.name) + tag +
        (wr ? ' · 错题 ' + wr : '') + '</span>' + cov + '</span>' + guideCard(k);
    }).join('');
    var covLine = cm.pct == null ? ''
      : '，题目覆盖 ' + cm.done + '/' + cm.pool + '（' + cm.pct + '%）' + (cm.pct >= 100 ? '，全部做过' : '');
    var openTotal = 0;
    m.kinds.forEach(function (k) { var c = coverOf(m.id, k.id); if (c.open > 0) openTotal += c.open; });
    return '<div class="card"><div class="row"><button class="btn btn-ghost btn-sm" data-go="today">← 今日</button>' +
      '<h2 style="margin:0">' + m.icon + ' ' + esc(m.name) + '</h2></div>' +
      '<p class="muted small">' + esc(m.desc) + ' 已练 ' + recs.length + ' 题' +
      (recs.length ? '，正确率 ' + Math.round(ok / recs.length * 100) + '%，练过 ' + kindSeen(recs, m) + '/' + m.kinds.length + ' 类题型' + covLine : '，还没开始练') + '。</p>' +
      '<div class="row"><button class="btn btn-primary" data-act="modround">本单元随机 10 题</button>' +
      (openTotal ? '<button class="btn" data-act="modnocover">练未覆盖的题（' + openTotal + '）</button>' : '') +
      '<button class="btn" data-act="modexample">先看一道例题</button></div>' +
      '<h3>按题型练（点题型随机练，点右侧只练没做过的）</h3><div>' + chips + '</div></div>';
  }
  function viewQuiz() {
    var s = S.sess, q = S.q;
    if (!s || !q) return '<div class="card"><p>练习已结束。</p><button class="btn" data-go="today">回今日</button></div>';
    var pct = Math.round(s.done / s.total * 100);
    var head = '<div class="row"><span class="pill">' + ((s.mode === 'wrong' || s.mode === 'wrongall') ? '错题回炉' : esc(q.modName || T.allScope)) + '</span>' +
      '<span class="small muted">' + esc(q.title || '') + ' · ' + esc(q.kindName || '') + '</span>' +
      '<span class="grow"></span><span class="small muted">' + (s.done + 1) + ' / ' + s.total + '</span></div>' +
      '<div class="progress" style="margin:8px 0 14px"><i style="width:' + pct + '%"></i></div>';
    var body = '<div class="card">' + guideQuizHtml(q) + '<div class="qhead">' +
      (q.kp || []).map(function (k) { return '<span class="pill">' + esc(k) + '</span>'; }).join('') + '</div>' +
      '<div class="qbody">' + rich(q.display || q.prompt) + '</div>';
    q.fields.forEach(function (f, i) {
      if (f.type === 'choice') {
        if (f.label) body += '<div class="small muted" style="margin-top:8px;font-weight:600">' + esc(f.label) + '</div>';
        f.options.forEach(function (opt, oi) {
          var cls = 'opt';
          if (S.answered) { if (oi === f.ans) cls += ' ok'; else if (readChoiceState(i) === oi) cls += ' bad'; }
          else if (readChoiceState(i) === oi) cls += ' sel';
          body += '<button class="' + cls + '" data-choice="' + i + '" data-choice-val="' + oi + '">' +
            String.fromCharCode(65 + oi) + '. ' + rich(opt) + '</button>';
        });
      } else {
        var icls = 'txt' + (S.answered ? ' ' + ((S.res && S.res.res[i].ok) ? 'ok' : 'bad') : '');
        body += '<div class="field">' + (f.label ? '<span class="lbl">' + esc(f.label) + '</span>' : '') +
          '<input class="' + icls + '" id="' + IP + i + '" autocomplete="off" placeholder="' + esc(T.inputPlaceholder) + '"' +
          (S.answered ? ' value="' + esc((S.vals || [])[i] || '') + '" readonly' : '') + '>' +
          (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '') + '</div>';
        /* 化学特殊符号键盘：仅文本输入题显示（离子/元素符号书写），数字题不显示 */
        if (f.type === 'text' && !S.answered) body += symkeysHtml(IP + i);
      }
    });
    if (!S.answered) {
      body += '<div class="row" style="margin-top:14px">' +
        '<button class="btn btn-primary" data-act="submit">提交答案</button>' +
        (q.tip ? '<button class="btn btn-ghost" data-act="hint">' + (S.hint ? '提示已展开' : '看提示') + '</button>' : '') +
        '<button class="btn btn-ghost" data-act="skip">换一题</button>' +
        '<span class="grow"></span><span class="small muted">回车提交</span></div>';
      if (S.hint && q.tip) body += '<div class="tipbox">💡 ' + rich(q.tip) + '</div>';
    } else {
      body += feedbackHtml(q, S.res);
      body += '<div class="row" style="margin-top:14px"><button class="btn btn-primary" data-act="next">' +
        (s.done + 1 >= s.total ? '查看本轮报告' : '下一题') + '</button>' +
        '<button class="btn" data-act="again">重做本题</button>' +
        '<button class="btn btn-ghost" data-act="exit">退出练习</button></div>';
    }
    body += '</div>';
    return head + body;
  }
  function readChoiceState(i) {
    if (S.answered) return (S.vals || [])[i];
    var el = document.querySelector('#app [data-choice="' + i + '"].sel');
    return el ? parseInt(el.getAttribute('data-choice-val'), 10) : null;
  }
  function feedbackHtml(q, res) {
    var h = '<div class="fb ' + (res.ok ? 'good' : 'bad') + '">' +
      '<div class="ftitle">' + (res.ok ? '✓ 全部正确' : '✗ 答错 ' + (res.total - res.got) + ' 处') + '</div>';
    q.fields.forEach(function (f, i) {
      h += '<div class="small"><span class="mk ' + (res.res[i].ok ? 'ok' : 'bad') + '">' + (res.res[i].ok ? '✓' : '✗') + '</span>' +
        (f.label ? esc(f.label) + '：' : '') + '正确答案 <b>' + rich(CH.ansText(f)) + '</b>' +
        (res.res[i].ok ? '' : '（你答：' + esc((S.vals || [])[i] == null ? '未答' : (S.vals || [])[i]) + '）') + '</div>';
    });
    h += '<div class="tipbox" style="margin-top:10px"><b>考点难点：</b>' + rich(q.tip) + '</div>';
    h += '<div style="margin-top:8px"><b>解析：</b>' + (q.explain || []).map(function (line) {
      return '<div class="small">· ' + rich(line) + '</div>';
    }).join('') + '</div>';
    h += '<div class="kpline">考点标签：' + (q.kp || []).map(function (k) { return '<span class="pill">' + esc(k) + '</span>'; }).join(' ') + '</div>';
    return h + '</div>';
  }
  function viewSummary() {
    var s = S.sess, base = Math.max(1, s.done), rate = Math.round(s.right / base * 100);
    /* 专练未覆盖会提前结束（可做的题不够 10 道），正确率按实际做了几题算 */
    var outNote = s.coveredOut
      ? '<p class="muted small" style="margin-top:8px">本单元这类题能做的都做过了，已没有新题可出——接下来靠错题回炉和整卷复盘巩固。</p>'
      : '';
    return '<div class="card"><h2>本轮完成</h2>' +
      statBoxes([['做题', s.done], ['答对', s.right], ['正确率', rate + '%']]) +
      '<p class="muted small" style="margin-top:12px">' + esc(rate >= 80 ? fillTpl(T.summaryGood, { plan: PLAN.join(' / ') }) : T.summaryLow) + '</p>' +
      outNote +
      '<div class="row"><button class="btn btn-primary" data-act="again-round">再来一轮（新题）</button>' +
      '<button class="btn" data-go="wrong">去清错题</button><button class="btn btn-ghost" data-go="today">回今日</button></div></div>';
  }
  function viewWrong() {
    var R = window.__ltReview;
    var all = Object.keys(DB.wrong).map(function (k) { var w = DB.wrong[k]; R.migrate(w, Date.now()); return w; }).sort(function (a, b) { return a.due - b.due; });
    var due = R.dueList(DB.wrong);
    var list = all.map(function (w) {
      return '<div class="wrongitem"><div class="row"><span class="pill">' + esc(w.kindName || w.kind) + '</span>' +
        (R.isDue(w) ? '<span class="pill bad">待复习</span>' : '<span class="due">' + esc(R.statusText(w)) + '</span>') +
        '<span class="grow"></span><span class="small muted">' + T.wrongTimes + ' ' + (w.n || 1) + ' 次' +
        (w.okStreak ? ' · 已确认 ' + w.okStreak + '/' + R.KEEP : '') + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-del="' + esc(w.key) + '">跳过本次</button></div>' +
        '<div class="small">' + rich(w.display || w.prompt) + '</div></div>';
    }).join('');
    return '<div class="card"><div class="row"><h2 style="margin:0">错题回炉</h2><span class="pill">共 ' + all.length + ' 道</span></div>' +
      '<p class="muted small">' + esc(fillTpl(T.wrongIntro, { plan: PLAN.join(' / ') })) + '</p>' +
      '<div class="row">' + (due.length ? '<button class="btn btn-primary" data-act="wrongdue">复习到期题（' + due.length + '）</button>' : '<span class="small muted">今天没有到期错题，明天再来。</span>') +
      (all.length ? '<button class="btn" data-act="wrongall">全部错题练一遍</button>' : '') + '</div>' +
      (list || '<p class="muted">错题库是空的，先去做几题吧。</p>') + '</div>';
  }
  function viewReport() {
    var recs = DB.recs, st = stats();
    var byMod = {};
    CH.modules.forEach(function (m) { byMod[m.id] = { n: 0, ok: 0, name: m.name }; });
    recs.forEach(function (r) { var b = byMod[r.mod] || (byMod[r.mod] = { n: 0, ok: 0, name: r.mod }); b.n++; if (r.ok) b.ok++; });
    var mods = Object.keys(byMod).filter(function (k) { return byMod[k].n; }).map(function (k) {
      var b = byMod[k], rate = Math.round(b.ok / b.n * 100);
      return '<div style="margin:8px 0"><div class="row small"><b>' + esc(b.name) + '</b><span class="grow"></span>' +
        '<span class="muted">' + b.ok + '/' + b.n + ' · ' + rate + '%</span></div>' +
        '<div class="progress"><i style="width:' + rate + '%;background:' + (rate >= 80 ? 'var(--ok)' : (rate >= 60 ? 'var(--warn)' : 'var(--bad)')) + '"></i></div></div>';
    }).join('');
    var kps = {};
    recs.forEach(function (r) { (r.kp || []).forEach(function (k) { var x = kps[k] || (kps[k] = { n: 0, ok: 0 }); x.n++; if (r.ok) x.ok++; }); });
    var weak = Object.keys(kps).filter(function (k) { return kps[k].n >= 2; })
      .map(function (k) { return { k: k, rate: kps[k].ok / kps[k].n, n: kps[k].n }; })
      .sort(function (a, b) { return a.rate - b.rate; }).slice(0, 8);
    var weakHtml = weak.length ? weak.map(function (w) {
      return '<div class="row small"><span>' + esc(w.k) + '</span><span class="grow"></span>' +
        '<span class="pill ' + (w.rate >= .8 ? 'ok' : (w.rate >= .6 ? 'warn' : 'bad')) + '">' + Math.round(w.rate * 100) + '% (' + w.n + ')</span></div>';
    }).join('') : '<p class="muted small">做题满 2 次后，这里会显示最需要复习的考点。</p>';
    /* 历史错题清单：从 recs 聚合整学期曾错过的题（掌握后移出错题本仍留档） */
    var R = window.__ltReview;
    var hist = R.everWrong(DB.recs, DB.wrong);
    var histHtml = hist.length
      ? '<table class="tb"><tr><th>题目</th><th class="n">错/对</th><th>首错</th><th>末错</th><th>状态</th></tr>' +
        hist.map(function (e) {
          return '<tr><td>' + esc(String(e.label).slice(0, 40)) + '</td><td class="n">' + e.wrong + '/' + e.okCount +
            '</td><td>' + R.dayText(e.firstWrongAt) + '</td><td>' + R.dayText(e.lastWrongAt) +
            '</td><td>' + (e.inBook ? '在错题本' : '已掌握') + '</td></tr>';
        }).join('') + '</table>'
      : '<p class="muted small">还没有答错的记录。</p>';
    /* 知识覆盖面：分母 = 每个题型的不重复题干数（core 的 POOLS），按单元汇总。
       数字随机 / 排列组合类题型（-1）不计入分母，只算“做过几道”，避免永远到不了 100%。 */
    var covPool = 0, covDone = 0;
    var covRows = CH.modules.map(function (m) {
      var c = coverOfMod(m);
      if (!c.pool) return '';
      covPool += c.pool; covDone += c.done;
      return '<div class="covrow"><span class="nm">' + esc(m.icon + ' ' + m.name) + '</span>' +
        '<span class="bg"><i style="width:' + c.pct + '%"></i></span>' +
        '<span class="num">' + c.done + '/' + c.pool + ' · ' + c.pct + '%</span></div>';
    }).join('');
    var covPct = covPool ? Math.round(covDone / covPool * 100) : 0;
    var covHtml = covPool
      ? '<p class="muted small">全科 ' + covDone + ' / ' + covPool + ' 道（' + covPct + '%）。分母是每个题型实际能出的不重复题干数；' +
        '数字随机类（质量分数计算、溶液的稀释）和排列组合类（四图操作、结构示意图）不计入分母。</p>' + covRows
      : '<p class="muted small">还没有记录。</p>';
    return '<div class="card"><h2>训练报告</h2>' +
      statBoxes([['累计做题', st.done], ['累计答对', st.right], ['总正确率', st.rate + '%'], ['错题待清', st.wrong]]) +
      '<h3>知识覆盖面（做过多少道不同的题）</h3>' + covHtml +
      '<h3>各单元正确率</h3>' + (mods || '<p class="muted small">还没有记录。</p>') +
      '<h3>薄弱考点（正确率最低）</h3>' + weakHtml +
      '<h3>曾经错过的题（期末复盘 · ' + hist.length + ' 道）</h3>' +
      '<p class="muted small">按错次排序。移到「已掌握」的题仍留档；错题库已清的浏览器无历史，导出 JSON 可长期保存。</p>' + histHtml +
      '<div class="row" style="margin-top:16px"><button class="btn" data-act="export">导出记录 JSON</button>' +
      '<button class="btn" data-act="import">导入记录 JSON</button>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<button class="btn btn-ghost" data-act="reset">清空记录</button></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn btn-ghost" data-act="sync">云同步（跨设备）</button>' +
      '<button class="btn btn-ghost" data-act="pathelp" title="PAT 怎么生成">PAT 是什么？</button>' +
      '<input id="syncPat" type="password" placeholder="GitHub PAT（只填一次，存本机）" style="flex:1;min-width:180px;padding:8px;border:1px solid var(--line);border-radius:8px">' +
      '<span id="syncMsg" class="small muted"></span></div></div>';
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    Array.prototype.forEach.call(tabsBar.querySelectorAll('[data-go]'), function (b) {
      b.onclick = function () { clearSess(); go(b.getAttribute('data-go')); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-go]'), function (b) {
      b.onclick = function () { clearSess(); go(b.getAttribute('data-go')); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-mod]'), function (c) {
      c.onclick = function () { go('mod', c.getAttribute('data-mod')); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-kind]'), function (c) {
      c.onclick = function () { startRound(S.mod, c.getAttribute('data-kind'), 10); saveSess(); };
    });
    /* 「练未覆盖」：只出该题型没做过的题；队列空说明已全覆盖，给个明确反馈 */
    Array.prototype.forEach.call(app.querySelectorAll('[data-kindcov]'), function (c) {
      c.onclick = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        var kd = c.getAttribute('data-kindcov');
        var q = nocoverQueue(S.mod, kd);
        if (!q.length) { alert('这个题型的题已经全部做过了，可以先清错题或做本单元随机。'); return; }
        startRound(S.mod, kd, 10, 'nocover'); saveSess();
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-choice]'), function (b) {
      b.onclick = function () {
        if (S.answered) return;
        var i = parseInt(b.getAttribute('data-choice'), 10);
        Array.prototype.forEach.call(app.querySelectorAll('[data-choice="' + i + '"]'), function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        if (S.q) { S.vals = S.vals || []; S.vals[i] = parseInt(b.getAttribute('data-choice-val'), 10); }
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-sym]'), function (b) {
      b.onclick = function () { insertSym(b); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () {
        var w = DB.wrong[b.getAttribute('data-del')];
        if (w && confirm('跳过本次：把这道错题推迟到明天再练，仍要连对 2 次才算掌握。确定？')) {
          window.__ltReview.skip(w); save(); render();
        }
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-act]'), function (b) {
      b.onclick = function () { action(b.getAttribute('data-act')); };
    });
    var fileEl = document.getElementById('importFile');
    if (fileEl) fileEl.onchange = function () {
      var f = fileEl.files && fileEl.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { importText(String(rd.result)); };
      rd.readAsText(f, 'utf-8');
      fileEl.value = '';
    };
  }
  function action(a) {
    if (a === 'all') { startRound(null, null, 10); }
    else if (a === 'all20') { startRound(null, null, 20); }
    else if (a === 'modround') { startRound(S.mod, null, 10); }
    else if (a === 'modexample') {
      var m = CH.moduleById(S.mod);
      var guided = m && m.kinds.filter(function (k) { return k.guide; });
      if (guided && guided.length) {
        /* 有方法卡的模块（配平四法）：打开模块页并展开第一张方法卡，真正展示引导例题。
           旧实现走 startRound(...,'example')，但 example 模式无特殊处理，会照常判分/进错题库，是假例题。 */
        go('mod', S.mod);
        var gc = app.querySelector('.gc-wrap');
        if (gc) { gc.open = true; if (gc.scrollIntoView) gc.scrollIntoView({ block: 'start' }); }
        return;
      }
      var k = m && m.kinds[0];
      if (k) { S.back = { view: 'mod', mod: S.mod }; startRound(S.mod, k.id, 1, 'example'); }
    } else if (a === 'skip') {
      if (S.sess) { S.sess.total++; S.sess.done++; }
      nextQuestion(); saveSess(); return;
    } else if (a === 'submit') {
      S.vals = readVals(); submit(); saveSess(); return;
    } else if (a === 'hint') { S.hint = !S.hint; saveSess(); render(); return; }
    else if (a === 'next') { S.sess.done++; clearSess(); nextQuestion(); saveSess(); return; }
    else if (a === 'again') { S.answered = false; S.res = null; S.vals = null; saveSess(); render(); return; }
    else if (a === 'resume') { if (restore()) { render(); return; } }
    else if (a === 'wrongdue') { startRound(null, null, 20, 'wrong'); }
    else if (a === 'wrongall') { startRound(null, null, Object.keys(DB.wrong).length, 'wrongall'); }
    else if (a === 'again-round') {
      /* 保留本轮入口（单元 / 题型 / 模式）：未覆盖专练再来一轮仍是未覆盖专练 */
      var ss = S.sess || {}, mo = ss.mode;
      clearSess();
      startRound(ss.mod, ss.kind, 10, mo === 'nocover' ? 'nocover' : undefined);
    }
    else if (a === 'modnocover') {
      if (!nocoverQueue(S.mod, null).length) { alert('这个单元的题已经全部做过了，可以先清错题或整卷复盘。'); return; }
      startRound(S.mod, null, 10, 'nocover');
    }
    else if (a === 'exit') { clearSess(); go('today'); return; }
    else if (a === 'export') {
      var blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
      var u = URL.createObjectURL(blob), a2 = document.createElement('a');
      a2.href = u; a2.download = T.downloadName; a2.click(); URL.revokeObjectURL(u); return;
    } else if (a === 'import') {
      document.getElementById('importFile').click(); return;
    } else if (a === 'reset') {
      if (confirm(T.resetConfirm)) { DB = emptyDB(); clearSess(); save(); render(); return; }
    } else if (a === 'sync') {
      var patEl = document.getElementById('syncPat');
      if (patEl && patEl.value) window.__ltSyncUI.setPAT(patEl.value);
      window.__ltSyncUI.run(); return;   // 异步：内部 setDB → save/render，不在此重复
    } else if (a === 'pathelp') {
      alert(window.__ltSyncUI.patHelp); return;
    }
    save(); render();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && S.view === 'quiz') {
      e.preventDefault();
      if (S.answered) action('next'); else action('submit');
    }
    if (e.key === 'Escape' && S.view === 'quiz') action('exit');
  });
  window.addEventListener('hashchange', function () {
    var p = parseHash(), v = p.view;
    if (v === 'today') go('today'); else if (v === 'wrong') go('wrong');
    else if (v === 'report') go('report');
    else if (v === 'mod' && p.m) go('mod', p.m, p.k || null);
  });

  /* 段三：云同步适配层注入宿主接口（DB 读写/通知），按钮 data-act="sync" 触发 */
  if (window.__ltSyncUI) window.__ltSyncUI.init({
    getDB: function () { return DB; },
    setDB: function (d) { DB = d; save(); render(); },
    notify: function (msg) { var el = document.getElementById('syncMsg'); if (el) el.textContent = msg; }
  });

  /* 启动即读 hash；带 hash 进入不恢复上次位置（契约） */
  boot();
  window[CFG.global] = { S: S, DB: DB, CH: CH, go: go, startRound: startRound, action: action,
    save: save, load: load, render: render, mergeRecords: mergeRecords, importText: importText,
    symkeys: SYMKEYS, insertSym: insertSym };
})();
</script>
`;
}
