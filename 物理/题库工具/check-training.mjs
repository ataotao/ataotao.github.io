#!/usr/bin/env node
// 物理训练脚手架 · 出题 / 判分 / DOM 桩自检
//
// 用法：
//   node 物理/题库工具/check-training.mjs           每类 200 题，跑 PT.selfTest
//   node 物理/题库工具/check-training.mjs 500       每类 500 题
//   node 物理/题库工具/check-training.mjs --ui      最小 DOM 桩驱动 window.__pt（6 项冒烟）
//
// 默认模式从 HTML 里抽出 <script id="core">（纯逻辑层，不碰 DOM），在 node vm 里跑
// PT.selfTest：每个生成器各出 N 题，断言
//   ① 题干里没有 undefined/NaN；② 数值答案是有限数、选项下标不越界、SVG 非空无 NaN；
//   ③ 正确解必须判对；④ 明显错误解必须判错；
// 另加科学计数法 / 百分比 / 绝对·相对容差的边界用例。
// 所以它同时守两件事：生成器不产生坏题、判分器不把对判错。
//
// --ui 模式另抽 <script id="ui">，用最小 DOM 桩跑：今日渲染 / 一轮练习 / 答错订正 /
// 错题本 / 报告 / 导出 JSON。浏览器交互（点击、真 localStorage）不在这里测。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '物理', '物理训练脚手架.html');
const args = process.argv.slice(2);
const UI_MODE = args.includes('--ui');
const N = Number(args.find((a) => /^\d+$/.test(a))) || 200;

const html = readFileSync(FILE, 'utf8');
const coreM = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const uiM = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM) {
  console.error('✗ 找不到 <script id="core">，文件结构被改坏了？');
  process.exit(1);
}
if (!uiM) {
  console.error('✗ 找不到 <script id="ui">，文件结构被改坏了？');
  process.exit(1);
}

/* ---------- 语法检查：vm.Script 编译等价于 node --check（不执行） ---------- */
try {
  new vm.Script(coreM[1], { filename: '物理训练脚手架.core.js' });
  new vm.Script(uiM[1], { filename: '物理训练脚手架.ui.js' });
} catch (e) {
  console.error('✗ core / ui 脚本语法错误：' + e.message);
  process.exit(1);
}

/* ============================================================
   默认模式：core 自检
   ============================================================ */
function runCore() {
  const ctx = { console };
  vm.createContext(ctx);
  try {
    vm.runInContext(coreM[1], ctx, { filename: '物理训练脚手架.core.js' });
  } catch (e) {
    console.error('✗ 核心脚本运行错误：' + e.message);
    process.exit(1);
  }
  const PT = ctx.PT;
  if (!PT || typeof PT.selfTest !== 'function') {
    console.error('✗ 没有拿到 PT.selfTest');
    process.exit(1);
  }

  /* 模块注册表：顺序 = model/amount/calc/draw/read，类数 6/4/6/3/3 */
  const want = [['model', 6], ['amount', 4], ['calc', 6], ['draw', 3], ['read', 3]];
  const got = PT.modules.map((m) => [m.id, (m.kinds || []).length]);
  const bad = want.filter((w, i) => !got[i] || got[i][0] !== w[0] || got[i][1] !== w[1]);
  if (got.length !== want.length || bad.length) {
    console.error('✗ 模块注册表不对：期望 ' + want.map((w) => w[0] + '(' + w[1] + ' 类)').join(' / ') +
      '，实际 ' + got.map((g) => g[0] + '(' + g[1] + ' 类)').join(' / '));
    process.exit(1);
  }
  const mods = PT.modules.map((m) => m.id + '(' + (m.kinds || []).length + ' 类)').join(' / ');
  console.log('模块：' + mods);

  const t0 = Date.now();
  const r = PT.selfTest(N);
  console.log('题量：' + r.count + ' 题（每类 ' + N + '），边界用例 ' + r.cases + ' 项，用时 ' + (Date.now() - t0) + ' ms');
  if (r.fails.length) {
    console.error('✗ ' + r.fails.length + ' 处失败：');
    r.fails.slice(0, 25).forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  if (r.count < 4200) {
    console.error('✗ 题量太少：' + r.count + '（应 ≥ 4200）');
    process.exit(1);
  }
  const reg = runRegression(PT);
  console.log('回归用例：' + reg.n + ' 项' + (reg.fails.length ? '，' + reg.fails.length + ' 处失败' : '，全部通过'));
  if (reg.fails.length) {
    console.error('✗ 回归失败：');
    reg.fails.slice(0, 20).forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('✓ 全部通过');
}

/* ---------- 图形 / 题干回归用例：把验收发现的 P1/P2 固化成闸门 ---------- */
function runRegression(PT) {
  const fails = [];
  let n = 0;
  const ok = (desc, cond) => { n++; if (!cond) fails.push(desc); };
  const gen = (mod, kind, seed) => PT.gen(mod, kind, seed);

  /* 1) 温度计两端刻度必须有标签：否则「量程上限」无法从图读出 */
  for (let s = 1; s <= 5; s++) {
    const svg = PT.svgFor(gen('read', 'thermometer', s * 7919));
    ok('温度计最高刻度 110 有标签', /<text[^>]*>110<\/text>/.test(svg));
    ok('温度计最低刻度 -10 有标签', /<text[^>]*>-10<\/text>/.test(svg));
  }
  /* 2) 滑轮组 n=3：动滑轮绳弧从底部绕过（sweep=1），并有「系」绳标记 */
  let n3 = 0;
  for (let s = 1; s <= 200 && n3 < 3; s++) {
    const q = gen('model', 'pulley', s * 7919);
    if (!/n 段/.test(q.prompt)) continue;
    if (q.fields[0].options[q.fields[0].ans] !== '3') continue;
    n3++;
    const svg = PT.svgFor(q);
    ok('n=3 动滑轮绳弧从底部绕过', svg.indexOf('A22 22 0 0 1 118 190') >= 0);
    ok('n=3 没有顶部绕绳弧', svg.indexOf('A22 22 0 0 0 118 190') < 0);
    ok('n=3 有「系」绳标记', svg.indexOf('>系</text>') >= 0);
  }
  ok('能抽到 n=3 滑轮题', n3 >= 1);

  /* 3) 杠杆 F₁ 最多 2 位小数，且有绝对容差 0.05（学生四舍五入到 1~2 位不判错） */
  for (let s = 1; s <= 60; s++) {
    const q = gen('calc', 'lever', s * 7919);
    const fld = q.fields[3];
    const a = fld.ans;
    ok('杠杆 F₁ 最多 2 位小数', Math.abs(a * 100 - Math.round(a * 100)) < 1e-9);
    ok('杠杆 F₁ 有绝对容差 0.05', fld.tol === 0.05);
    ok('杠杆 F₁ 四舍五入到 2 位判对', PT.judge({ fields: [fld] }, [Math.round(a * 100) / 100]).ok);
  }

  /* 4) 热值题燃料只用固体（木炭/焦炭），不再出现「酒精 + 吹去灰烬」 */
  for (let s = 1; s <= 20; s++) {
    const q = gen('amount', 'fuelmass', s * 7919);
    ok('热值题燃料为固体', /木炭|焦炭/.test(q.prompt) && !/酒精/.test(q.prompt));
  }

  /* 5) 烧水题题干写清「不计水壶吸热，求水吸收的热量」 */
  for (let s = 1; s <= 10; s++) {
    const q = gen('amount', 'heatmass', s * 7919);
    ok('烧水题题干完整', /不计水壶吸热/.test(q.prompt) && /求水吸收的热量/.test(q.prompt));
  }

  /* 6) model.led 极性题：图只画 LED 符号、不画电池极性（不剧透） */
  let ledSym = 0;
  for (let s = 1; s <= 40; s++) {
    const q = gen('model', 'led', s * 7919);
    if (!/正极应接/.test(q.prompt)) continue;
    ledSym++;
    ok('LED 极性题图不画电池正极', !!(q.fig && q.fig.kind === 'led-symbol'));
  }
  ok('能抽到 LED 极性题', ledSym >= 1);

  /* 7) model.circuit：不再用「A₁ 与 L₁ 串联」同义反复提示 */
  for (let s = 1; s <= 20; s++) {
    const q = gen('model', 'circuit', s * 7919);
    ok('电路题不同义反复', !/A₁ 与 L₁ 串联/.test(q.prompt));
  }

  /* 8) draw.wire.2 不再要求「+ 接线柱流入」（图上没有 +/− 标记） */
  const wire2 = PT.drawItems.filter((x) => x.id === 'draw.wire.2')[0];
  ok('draw.wire.2 不要求 + 接线柱', !!wire2 && wire2.prompt.indexOf('+') < 0);

  /* 9) 定滑轮测力计图：绳无水平折角（物体侧绳竖直切于滑轮） */
  for (let s = 1; s <= 20; s++) {
    const q = gen('model', 'tension', s * 7919);
    if (!/定滑轮/.test(q.prompt)) continue;
    const svg = PT.svgFor(q);
    const horiz = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#1b2333" stroke-width="2\.2"/g)]
      .some((m) => m[2] === m[4]);
    ok('定滑轮绳无水平折角', !horiz);
  }
  /* 10) draw 固定题按 kind 过滤（「按题型练」不再随机抽到别的题型） */
  for (const k of ['lever', 'rope', 'wire']) {
    for (let s = 0; s < 5; s++) {
      const q = PT.gen('draw', k, 1000 + s * 7919);
      ok('draw 按 kind 过滤（' + k + '）', q.kind === k);
    }
  }
  return { n, fails };
}

/* ============================================================
   --ui 模式：最小 DOM 桩
   ============================================================ */
function makeDom() {
  const byId = {};
  const created = [];

  class TextNode {
    constructor(t) { this.nodeType = 3; this.text = String(t); this.parentNode = null; }
  }
  class El {
    constructor(tag) {
      this.nodeType = 1;
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.style = {};
      this._cls = '';
      this._html = '';
      this.value = '';
      this.listeners = {};
      this.parentNode = null;
      this.firstChild = null;
      this.id = '';
      created.push(this);
    }
    set className(v) { this._cls = String(v); }
    get className() { return this._cls; }
    set innerHTML(v) { this._html = String(v); }
    get innerHTML() { return this._html; }
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'id') { this.id = String(v); byId[this.id] = this; }
      if (k === 'class') this._cls = String(v);
      if (k === 'style') this.style.cssText = String(v);
    }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    appendChild(c) {
      if (!c) throw new Error('appendChild(null)');
      c.parentNode = this;
      this.children.push(c);
      this.firstChild = this.children[0];
      return c;
    }
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
      this.firstChild = this.children[0] || null;
      return c;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    click() { (this.listeners.click || []).forEach((fn) => fn({ preventDefault() { } })); }
    focus() { }
    getContext() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 420 }; }
    get classList() {
      const self = this;
      return {
        toggle(n, on) {
          const set = new Set(self._cls.split(/\s+/).filter(Boolean));
          const want = (on === undefined) ? !set.has(n) : !!on;
          if (want) set.add(n); else set.delete(n);
          self._cls = Array.from(set).join(' ');
        },
        add(n) { this.toggle(n, true); },
        remove(n) { this.toggle(n, false); },
        contains(n) { return self._cls.split(/\s+/).includes(n); }
      };
    }
  }

  const doc = {
    getElementById(id) { return byId[id] || null; },
    createElement(tag) { return new El(tag); },
    createTextNode(t) { return new TextNode(t); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(ev, fn) { (this._listeners = this._listeners || {})[ev] = fn; },
    body: null
  };
  doc.body = new El('body');
  const app = new El('main');
  app.setAttribute('id', 'app');
  const tabs = new El('nav');
  tabs.setAttribute('id', 'tabs');
  ['today', 'model', 'amount', 'calc', 'draw', 'read', 'wrong', 'report'].forEach((v) => {
    const b = new El('button');
    b.setAttribute('data-go', v);
    tabs.appendChild(b);
  });

  const store = {};
  const alerts = [];
  const blobs = [];

  const ctx = {
    console,
    document: doc,
    location: { hash: '#view=today' },
    scrollTo() { },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    alert(msg) { alerts.push(String(msg)); },
    confirm() { return true; },
    setTimeout() { return 0; },
    clearTimeout() { },
    Blob: class Blob {
      constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; }
    },
    URL: {
      createObjectURL(b) { blobs.push(b); return 'blob:mock-' + blobs.length; },
      revokeObjectURL() { }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  return { ctx, doc, app, tabs, store, alerts, blobs, created };
}

function textOf(n) {
  if (!n) return '';
  if (n.nodeType === 3) return n.text;
  let s = '';
  if (n._html) s += ' ' + String(n._html).replace(/<[^>]*>/g, ' ');
  for (const c of n.children) s += ' ' + textOf(c);
  if (n.value) s += ' ' + n.value;
  return s;
}

function fillCorrect(pt, doc, q) {
  q.fields.forEach((f, i) => {
    if (f.type === 'choice') { pt.S.choice[i] = f.ans; return; }
    const el = doc.getElementById('in' + i + '_n');
    if (!el) throw new Error('找不到输入框 in' + i + '_n');
    el.value = String(f.ans);
  });
}

/* 跑完一整轮（每题都填正确答案），返回本轮每题的 kind 与题面签名 */
function runRound(pt, dom, mod, n) {
  pt.startSession(mod, null, n);
  const kinds = [], sigs = [];
  let guard = 0;
  while (pt.S.view === 'practice' && guard++ < n + 6) {
    const q = pt.S.q;
    kinds.push(q.kind);
    sigs.push(q.id + '|' + q.prompt);
    fillCorrect(pt, dom.doc, q);
    pt.submit();
    if (!pt.S.res || !pt.S.res.ok) throw new Error('正确解被判错：' + (q.id || '?'));
    pt.next();
  }
  if (pt.S.view !== 'summary') throw new Error('一轮没有走到总结（view=' + pt.S.view + '）');
  return { kinds, sigs };
}

function runUI() {
  const dom = makeDom();
  vm.createContext(dom.ctx);
  try {
    vm.runInContext(coreM[1], dom.ctx, { filename: '物理训练脚手架.core.js' });
    vm.runInContext(uiM[1], dom.ctx, { filename: '物理训练脚手架.ui.js' });
  } catch (e) {
    console.error('✗ UI 脚本在 DOM 桩里运行失败：' + e.message + '\n' + (e.stack || ''));
    process.exit(1);
  }
  const pt = dom.ctx.__pt;
  if (!pt) { console.error('✗ 没有拿到 window.__pt 测试钩子'); process.exit(1); }

  const steps = [];
  function step(name, fn) {
    try { fn(); console.log('ok  ' + name); steps.push(true); }
    catch (e) { console.error('✗   ' + name + '：' + e.message); steps.push(false); }
  }

  /* ① 今日渲染 */
  step('今日渲染', () => {
    pt.go('today');
    const txt = textOf(dom.app);
    if (!dom.app.children.length) throw new Error('app 没有内容');
    if (!/今日任务/.test(txt)) throw new Error('没渲染出「今日任务」');
    if (!/认模型/.test(txt) || !/算到底/.test(txt)) throw new Error('没渲染出模块卡');
  });

  /* ② 一轮练习：正确解全部判对，直到本轮总结 */
  step('一轮练习', () => {
    pt.startSession('calc', null, 2);
    let guard = 0;
    while (pt.S.view === 'practice' && guard++ < 12) {
      const q = pt.S.q;
      fillCorrect(pt, dom.doc, q);
      pt.submit();
      if (!pt.S.res || !pt.S.res.ok) throw new Error('正确解被判错：' + (q.id || '?'));
      pt.next();
    }
    if (pt.S.view !== 'summary') throw new Error('一轮练习没走到本轮总结（view=' + pt.S.view + '）');
    if (pt.db().recs.length < 2) throw new Error('记录没写进 recs');
  });

  /* ③ 答错订正：错解判错 → 进订正 → 订正对了才能下一题 */
  step('答错订正', () => {
    pt.startSession('calc', 'qheat', 1);
    const q = pt.S.q;
    q.fields.forEach((f, i) => {
      if (f.type === 'choice') { pt.S.choice[i] = (f.ans + 1) % f.options.length; return; }
      const el = dom.doc.getElementById('in' + i + '_n');
      if (!el) throw new Error('找不到输入框 in' + i + '_n');
      el.value = String(f.ans * 2 + 1);
    });
    pt.submit();
    if (pt.S.res.ok) throw new Error('错解被判对');
    if (!pt.S.fix || !pt.S.fix.fields.length) throw new Error('答错后没有进入订正');
    pt.S.fix.fields.forEach((i) => {
      const el = dom.doc.getElementById('fx' + i);
      if (!el) throw new Error('找不到订正输入框 fx' + i);
      el.value = String(q.fields[i].ans);
    });
    pt.submitFix();
    if (!pt.S.fix.ok) throw new Error('订正正确答案后仍未通过');
    const rec = pt.db().recs[pt.db().recs.length - 1];
    if (!rec.fixed) throw new Error('订正记录未标 fixed');
    if (!Object.keys(pt.db().wrong).length) throw new Error('答错没有进错题本');
  });

  /* ④ 错题本 */
  step('错题本', () => {
    pt.go('wrong');
    const txt = textOf(dom.app);
    if (!/错题本/.test(txt)) throw new Error('没渲染出错题本');
    const n = Object.keys(pt.db().wrong).length;
    if (!n) throw new Error('错题本是空的（上一步应写入 1 条）');
    if (!txt.includes('错过')) throw new Error('错题条目没显示错误次数');
  });

  /* ⑤ 报告：5 类断点命中率 + 导出按钮 */
  step('报告', () => {
    pt.go('report');
    const txt = textOf(dom.app);
    if (!/断点命中率/.test(txt)) throw new Error('报告没有「5 类断点命中率」');
    if (!/按题型/.test(txt)) throw new Error('报告没有按题型表');
    if (!/导出 JSON/.test(txt)) throw new Error('报告没有导出按钮');
  });

  /* ⑥ 导出 JSON：文件名 + 内容结构 */
  step('导出 JSON', () => {
    pt.exportJSON();
    const anchors = dom.created.filter((e) => e.tagName === 'A' && e.download);
    if (!anchors.length) throw new Error('没有生成导出链接');
    const a = anchors[anchors.length - 1];
    if (!/^物理训练记录-\d{4}-\d{2}-\d{2}\.json$/.test(a.download)) throw new Error('导出文件名不对：' + a.download);
    const blob = dom.blobs[dom.blobs.length - 1];
    if (!blob) throw new Error('没有生成 Blob');
    const obj = JSON.parse(String(blob.parts.join('')));
    if (obj.v !== 1) throw new Error('导出数据 v 不是 1');
    if (!Array.isArray(obj.recs) || !obj.wrong || !obj.meta) throw new Error('导出数据结构不对');
  });

  /* ⑦ 出题去重 + 题型轮换（家长反馈：下次练习要是上次没做过的题） */
  let calcR1 = null, calcR2 = null, modelR1 = null, modelR2 = null;
  step('出题去重（calc 两轮题面不重复）', () => {
    calcR1 = runRound(pt, dom, 'calc', 6);
    calcR2 = runRound(pt, dom, 'calc', 6);
    const dup = calcR2.sigs.filter((s) => calcR1.sigs.indexOf(s) >= 0);
    if (dup.length) throw new Error('两轮有 ' + dup.length + ' 道重复题面');
  });
  step('题型轮换（calc 单轮 kind 不重复）', () => {
    for (const [i, r] of [calcR1, calcR2].entries()) {
      if (!r) throw new Error('上一项未完成');
      if (new Set(r.kinds).size !== r.kinds.length) throw new Error('第 ' + (i + 1) + ' 轮 kind 重复：' + r.kinds.join(','));
    }
  });
  step('题型轮换（model 两轮 kind 集合不同）', () => {
    modelR1 = runRound(pt, dom, 'model', 3);
    modelR2 = runRound(pt, dom, 'model', 3);
    if (new Set(modelR2.kinds).size !== modelR2.kinds.length) throw new Error('model 单轮 kind 重复');
    const same = modelR2.kinds.filter((k) => modelR1.kinds.indexOf(k) >= 0);
    if (same.length) throw new Error('两轮 kind 有交集：' + same.join(','));
  });
  step('lastRound 持久化', () => {
    const raw = dom.store['physTrain_v1'];
    if (!raw) throw new Error('localStorage 里没有 physTrain_v1');
    const db = JSON.parse(raw);
    const lr = db.meta && db.meta.lastRound;
    if (!lr) throw new Error('meta.lastRound 缺失');
    for (const mod of ['calc', 'model']) {
      const r = lr[mod];
      if (!r || !Array.isArray(r.sigs) || !r.sigs.length) throw new Error(mod + ' 的 lastRound 没有 sigs');
      if (!Array.isArray(r.kinds) || !r.kinds.length) throw new Error(mod + ' 的 lastRound 没有 kinds');
      if (!(r.at > 0)) throw new Error(mod + ' 的 lastRound 没有 at');
    }
  });
  step('draw 按 kind 过滤', () => {
    for (const k of ['lever', 'rope', 'wire']) {
      for (let i = 0; i < 5; i++) {
        const q = pt.PT.gen('draw', k, 1000 + i * 7919);
        if (q.kind !== k) throw new Error('gen(draw,' + k + ') 返回了 ' + q.kind);
      }
    }
    pt.startSession('draw', 'rope', 2);
    for (let i = 0; i < 2; i++) {
      if (pt.S.q.kind !== 'rope') throw new Error('startSession(draw,rope) 抽到 ' + pt.S.q.kind);
      if (i === 0) pt.next();
    }
    pt.go('today');
  });

  /* 审查后回归（2026-11-13）：例题/回炉/空提交/题池 */
  step('审查后回归', () => {
    // 例题页 submit 不能写记录
    pt.startExample('calc', 'qheat');
    const n0 = pt.db().recs.length;
    pt.submit();
    if (pt.db().recs.length !== n0) throw new Error('例题页提交写入了记录');
    if (pt.S.example !== true) throw new Error('例题标记被清掉');

    // 回炉里用错模块开例题不抛错、不留脏状态
    pt.db().wrong['test|1'] = {
      id: 'test', mod: 'calc', kind: 'qheat', title: '测试', prompt: '测试题',
      fields: [{ type: 'num', ans: 1, label: 'x' }], ts: Date.now(), due: Date.now() - 1000, n: 1,
    };
    pt.startWrong();
    if (pt.S.mode !== 'wrong') throw new Error('回炉没进入 wrong 模式');
    pt.startExample('wrong', null); // 兜底应直接 return
    if (pt.S.example !== false) throw new Error('未知模块开例题留下了脏 example 标记');

    // 空提交不写记录、不进错题本
    pt.startSession('calc', null, 1);
    const n1 = pt.db().recs.length, w1 = Object.keys(pt.db().wrong).length;
    pt.submit();
    if (pt.db().recs.length !== n1) throw new Error('空提交写入了记录');
    if (Object.keys(pt.db().wrong).length !== w1) throw new Error('空提交进了错题本');

    // draw 按题型练题量受题池限制（每 kind 只有 2 道固定题）
    pt.startSession('draw', 'lever', 4);
    if (pt.S.sess.total !== 2) throw new Error('draw 按题型练题量应为 2，实际 ' + pt.S.sess.total);
    pt.go('today');
  });

  const okN = steps.filter(Boolean).length;
  if (okN !== steps.length || steps.length !== 12) {
    console.error('✗ --ui ' + okN + '/' + steps.length + ' 项通过');
    process.exit(1);
  }
  console.log('✓ --ui 12 项全部通过');
}

if (UI_MODE) runUI(); else runCore();
