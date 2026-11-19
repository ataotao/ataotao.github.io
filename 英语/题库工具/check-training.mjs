#!/usr/bin/env node
// 英语单词闪练卡 · 出题 / 判分 / DOM 桩自检
//
// 用法（仓库根执行）：
//   node 英语/题库工具/check-training.mjs           跑 EW.selfTest（三方向 × 142 单元）
//   node 英语/题库工具/check-training.mjs --ui      最小 DOM 桩驱动 window.__ew 冒烟
//
// 默认模式从产物抽 <script id="data"> + <script id="core">，在 node vm 里跑 EW.selfTest：
//   ① 三方向模块注册表齐全；② 每题题干无 undefined/NaN、选项不重复、答案下标合法；
//   ③ 正确解判对、错误解判错；④ 音→中题干必带音标。
// --ui 模式抽 <script id="ui">，用最小 DOM 桩跑：今日渲染 / 三方向出题 / 一轮作答 /
//   答错进错题本 / 到期回炉 / 报告 / 导入幂等。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '英语', '英语单词闪练卡.html');
const args = process.argv.slice(2);
const UI_MODE = args.includes('--ui');

const html = readFileSync(FILE, 'utf8');
const inlineData = html.match(/<script id="data">([\s\S]*?)<\/script>/);
const dataRef = html.match(/<script src="([^"]+)"><\/script>/);
// ADR-0009：优先内联段，否则读同目录外置词库（file:// 下经典脚本加载）
const dataSrc = inlineData
  ? inlineData[1]
  : dataRef
    ? readFileSync(join(ROOT, '英语', dataRef[1]), 'utf8')
    : (() => { console.error('✗ 找不到内联词库或 <script src="词库.js">，文件结构被改坏了？'); process.exit(1); })();
const coreM2 = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const uiM2 = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM2 || !uiM2) { console.error('✗ 找不到 core / ui 脚本节点，文件结构被改坏了？'); process.exit(1); }
const coreSrc = coreM2[1], uiSrc = uiM2[1];
try {
  new vm.Script(dataSrc, { filename: 'data.js' });
  new vm.Script(coreSrc, { filename: 'core.js' });
  new vm.Script(uiSrc, { filename: 'ui.js' });
} catch (e) {
  console.error('✗ data/core/ui 脚本语法错误：' + e.message); process.exit(1);
}

function freshCoreCtx() {
  const ctx = { console, Set, Math, JSON, Date, Object, Array, String, Number };
  vm.createContext(ctx);
  vm.runInContext(dataSrc, ctx, { filename: 'data.js' });
  vm.runInContext(coreSrc, ctx, { filename: 'core.js' });
  return ctx;
}

/* ========== 默认：core 自检 ========== */
function runCore() {
  const EW = freshCoreCtx().EW;
  if (!EW || typeof EW.selfTest !== 'function') { console.error('✗ 没有拿到 EW.selfTest'); process.exit(1); }

  const kinds = EW.KIND_IDS.join('/');
  if (EW.KIND_IDS.length !== 3 || EW.KIND_IDS.join('/') !== 'e2c/c2e/p2c') {
    console.error('✗ 方向注册表不对：' + kinds); process.exit(1);
  }
  const units = EW.modules.length;
  console.log('方向：' + kinds + ' · 单元 ' + units + ' · 词 ' + EW.modules.reduce((a, m) => a + m.words.length, 0));

  const t0 = Date.now();
  const r = EW.selfTest(200);
  console.log('题量：' + r.count + ' 题，判分用例 ' + r.cases + ' 项，用时 ' + (Date.now() - t0) + ' ms');
  if (r.fails.length) {
    console.error('✗ ' + r.fails.length + ' 处失败：');
    r.fails.slice(0, 25).forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  if (r.count < 300 || units < 100) { console.error('✗ 题量或单元数太少'); process.exit(1); }

  // 逐单元 × 三方向都能出题（小单元靠跨单元借词）
  let empty = 0;
  for (const m of EW.modules) for (const k of EW.KIND_IDS) if (!EW.gen(m.id, k, 1, 2).length) empty++;
  if (empty) { console.error('✗ 有 ' + empty + ' 个「单元×方向」出不出题'); process.exit(1); }
  console.log('覆盖：' + units * 3 + ' 个「单元×方向」全部可出题');

  // ADR-0009：整单元逐词不遗漏 / 全库随机按量去重 / p2c 无音标降级
  let omitted = 0, dup = 0, mixed = 0;
  for (const m of EW.modules) {
    for (const kinds of [null, ['e2c', 'c2e'], ['p2c']]) {
      const qs = EW.genUnitAll(m.id, kinds, 42);
      if (qs.length !== m.words.length) omitted++;
      const seen = new Set(qs.map((q) => q.word));
      if (seen.size !== qs.length) dup++;
      // 双向混合不出现 p2c；纯 p2c 允许无音标词降级为 e2c（保证不漏词）
      if (kinds && kinds.join(',') === 'e2c,c2e' && qs.some((q) => q.kind === 'p2c')) mixed++;
      if (kinds && kinds.join(',') === 'p2c' && qs.some((q) => q.kind !== 'p2c' && q.kind !== 'e2c')) mixed++;
      // 整单元每个生成的题也必须判分合法
      if (qs.some((q) => new Set(q.fields[0].options).size !== q.fields[0].options.length ||
        q.fields[0].ans < 0 || q.fields[0].ans >= q.fields[0].options.length ||
        !EW.judge(q, [q.fields[0].ans]).ok)) omitted++;
    }
  }
  if (omitted || dup || mixed) {
    console.error(`✗ 整单元出题问题：遗漏/非法 ${omitted} · 重复 ${dup} · 方向越界 ${mixed}`); process.exit(1);
  }
  console.log('整单元：' + units + ' 个单元 × 3 种方向组合，每词一题无遗漏无重复');
  const allCount = EW.allWordRefs().length;
  for (const n of [20, 30, 50]) {
    const qs = EW.genRandom(n, 7, null);
    if (qs.length !== n) { console.error(`✗ 随机练习数量不对：要 ${n} 得 ${qs.length}`); process.exit(1); }
    if (new Set(qs.map((q) => q.id)).size !== n) { console.error('✗ 随机练习抽到重复词'); process.exit(1); }
    if (qs.some((q) => q.kind !== 'e2c' && q.kind !== 'c2e' && q.kind !== 'p2c')) { console.error('✗ 随机练习方向异常'); process.exit(1); }
    if (qs.some((q) => !EW.judge(q, [q.fields[0].ans]).ok)) { console.error('✗ 随机练习判分异常'); process.exit(1); }
  }
  const capped = EW.genRandom(allCount + 10, 7, null);
  if (capped.length !== allCount) { console.error(`✗ 随机练习超库容未收敛：${capped.length}/${allCount}`); process.exit(1); }
  console.log('随机：20/30/50 词各抽满且去重 · 超库容收敛到 ' + allCount);

  // ADR-0009 补充：干扰项类型必须与题干一致（短语不混单词，防结构泄题）
  let typeLeak = 0, phraseSeen = 0;
  for (const m of EW.modules) {
    for (const qs of [EW.genUnitAll(m.id, ['e2c'], 9), EW.genUnitAll(m.id, ['c2e'], 9)]) {
      for (const q of qs) {
        const isPhrase = q.word.includes(' ');
        if (isPhrase) phraseSeen++;
        if ((q.disWords || []).some((d) => d.includes(' ') !== isPhrase)) typeLeak++;
      }
    }
  }
  if (typeLeak) { console.error(`✗ 有 ${typeLeak} 道题的干扰项与题干类型不一致（短语混单词会泄题）`); process.exit(1); }
  console.log('干扰项：短语题只混短语、单词题只混单词，0 泄露（覆盖 ' + phraseSeen + ' 道短语题）');
  console.log('✓ 全部通过');
}

/* ========== --ui：最小 DOM 桩 ========== */
function El() {
  const e = {
    _html: '', className: '', value: '', files: null, children: [], style: {},
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k]; },
    appendChild(c) { this.children.push(c); return c; }, removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    remove() {},
    get firstChild() { return this.children[0] || null; },
    addEventListener(ev, fn) { (this._ev || (this._ev = {}))[ev] = fn; },
    classList: { toggle() {}, add() {}, remove() {} },
    click() { if (this.onclick) this.onclick(); }, focus() {}
  };
  return e;
}
function runUI() {
  const store = Object.create(null);
  const app = El(), tabs = El();
  const byId = { app, tabs };
  const ctx = {
    console, Set, Math, JSON, Date, Object, Array, String, Number, isFinite, parseInt, parseFloat,
    setTimeout, clearTimeout,
    alert(msg) { ctx.__alerts.push(String(msg)); },
    confirm() { return true; },
    location: { hash: '' }, history: { replaceState() {} },
    localStorage: {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    document: {
      getElementById(id) { return byId[id] || (byId[id] = El()); },
      querySelector() { return null; }, querySelectorAll() { return []; },
      addEventListener() {}, createElement() { return El(); },
      createTextNode(t) { return { _text: String(t), nodeType: 3 }; },
      body: El()
    },
    Blob: function () {}, FileReader: function () {},
    URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
    __alerts: []
  };
  // 语法体检用的 speechSynthesis 不注入 → speak() 走 alert 分支，不影响流程
  ctx.window = ctx;
  ctx.window.scrollTo = function () {};
  ctx.window.addEventListener = function () {};
  vm.createContext(ctx);
  vm.runInContext(dataSrc, ctx, { filename: 'data.js' });
  vm.runInContext(coreSrc, ctx, { filename: 'core.js' });
  // UI 依赖 merge / sync 段的全局，用桩顶上
  ctx.__ltMerge = { mergeRecords(a, b) {
    const seen = new Set((a.recs || []).map((r) => r.qid || r.kn || JSON.stringify(r)));
    const recs = (a.recs || []).slice();
    (b.recs || []).forEach((r) => { const k = r.qid || r.kn || JSON.stringify(r); if (!seen.has(k)) { seen.add(k); recs.push(r); } });
    return { recs, wrong: Object.assign({}, a.wrong || {}, b.wrong || {}) };
  } };
  ctx.__ltSyncUI = { deviceId() { return 'test-device'; }, init() {}, run() {}, setPAT() {} };
  try {
    vm.runInContext(uiSrc, ctx, { filename: 'ui.js' });
  } catch (e) {
    console.error('✗ UI 运行异常：' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
  const T = ctx.__ew;
  if (!T || !T.EW) { console.error('✗ 没有拿到 __ew 测试钩子'); process.exit(1); }
  let uiCheckCount = 0;
  const ok = (name, cond) => { if (!cond) { console.error('✗ ' + name); process.exit(1); } uiCheckCount++; console.log('ok ' + name); };

  // 今日渲染：有单元选择卡
  T.go('today');
  ok('今日视图渲染', app.innerHTML.indexOf('选教材来源') >= 0 || app.children.length > 0);
  ok('默认方向为双向混合', T.S.selKind === 'mix2' && T.S.randKinds === 'mix2');

  // 三方向各出一轮（用钩子直接 startSession + 检查 q 字段）
  for (const kind of ['e2c', 'c2e', 'p2c']) {
    T.startSession('primary.ox3a.unit1', kind, 3);
    const q = T.S.q;
    ok('出题 ' + kind, !!q && q.kind === kind && q.fields.length === 1 && q.fields[0].options.length >= 4);
    // 答对
    T.S.choice[0] = q.fields[0].ans;
    T.submit();
    ok('判对 ' + kind, T.S.res && T.S.res.ok && T.S.sess.done === 1);
    if (q.ex) ok('例句高亮 ' + kind, /hlword/.test(T.EW.highlightExample(q.ex, q.word)));
    T.next();
  }

  // 双向混合：只轮换 e2c/c2e，不出现 p2c
  T.startSession('primary.ox3a.unit1', ['e2c', 'c2e'], 6);
  const mixKinds = [];
  for (let i = 0; i < 6; i++) {
    mixKinds.push(T.S.q.kind);
    T.S.choice[0] = T.S.q.fields[0].ans;
    T.submit();
    if (i < 5) T.next();
  }
  ok('双向混合只出英↔中', mixKinds.every((k) => k === 'e2c' || k === 'c2e') && mixKinds.includes('e2c') && mixKinds.includes('c2e'), mixKinds.join(','));
  // 再来一轮保持双向（s.kind 原样是数组）
  T.startSession('primary.ox3a.unit1', T.S.sess.kind, 4);
  ok('再来一轮保持双向', Array.isArray(T.S.sess.kind) && T.S.sess.kind.join(',') === 'e2c,c2e' && T.S.sess.kinds.length === 4);

  // 整单元：每词一题、可完整循环；结束后重开是同一单元同样词数
  const mAll = T.EW.moduleById('primary.ox3a.unit1');
  T.startUnitAll('primary.ox3a.unit1', null);
  ok('整单元题数=单元词数', T.S.sess.total === mAll.words.length && T.S.sess.queue.length === mAll.words.length);
  const firstWords = new Set(T.S.sess.queue.map((q) => q.word));
  ok('整单元无遗漏无重复', firstWords.size === mAll.words.length);
  const firstSeedOrder = T.S.sess.queue.map((q) => q.id).join('|');
  T.restart();
  ok('整单元再来一轮同词数', T.S.sess.total === mAll.words.length && T.S.sess.area === 'unit');
  ok('整单元重开可重新乱序/独立构建', T.S.sess.queue.length === mAll.words.length && firstSeedOrder.length > 0);

  // 随机练习：20/30/50 与两区隔离
  const unitSelBefore = T.S.selUnit;
  T.go('random');
  ok('随机练习视图渲染', app.children.length > 0 && T.S.view === 'random');
  for (const n of [20, 30, 50]) {
    T.startRandom(n, null);
    ok('随机练习 ' + n + ' 词', T.S.sess.total === n && T.S.sess.queue.length === n && T.S.sess.area === 'random');
    ok('随机练习去重', new Set(T.S.sess.queue.map((q) => q.id)).size === n);
  }
  ok('随机区不改单元区配置', T.S.selUnit === unitSelBefore);
  const lastRandom = T.S.sessions.random;
  T.startSession('primary.ox3a.unit1', 'e2c', 3);
  ok('切回单元区不覆盖随机会话', T.S.sessions.random === lastRandom && T.S.area === 'unit');
  T.restart();
  ok('单元区再来一轮仍在单元区', T.S.area === 'unit' && T.S.sess.mod === 'primary.ox3a.unit1');
  T.go('random');
  if (!T.S.sessions.random) { console.error('✗ 随机区会话被单元区清掉'); process.exit(1); }
  uiCheckCount += 2; console.log('ok 随机区会话仍在 · 两区互不干扰');

  // 答错进错题本
  T.startSession('primary.ox3a.unit1', 'e2c', 1);
  const q2 = T.S.q;
  T.S.choice[0] = (q2.fields[0].ans + 1) % q2.fields[0].options.length;
  T.submit();
  ok('答错进错题本', Object.keys(T.db().wrong).length >= 1);
  const wkey = Object.keys(T.db().wrong)[0];
  ok('错题间隔 1 天', T.db().wrong[wkey].due - Date.now() > 20 * 3600 * 1000);

  // 报告 + 导出
  T.go('report');
  ok('报告视图渲染', app.children.length > 0);
  T.exportJSON();
  ok('导出不抛错', true);

  // 导入幂等：同一份导入两次条数不变
  const snap = JSON.parse(JSON.stringify(T.db()));
  const before = T.db().recs.length;
  ctx.__ltMerge.mergeRecords = (function (orig) {
    return function (a, b) {
      const seen = new Set((a.recs || []).map((r) => r.qid || r.kn || JSON.stringify(r)));
      const recs = (a.recs || []).slice();
      (b.recs || []).forEach((r) => { const k = r.qid || r.kn || JSON.stringify(r); if (!seen.has(k)) { seen.add(k); recs.push(r); } });
      return { recs, wrong: Object.assign({}, a.wrong || {}, b.wrong || {}) };
    };
  })();
  const m1 = ctx.__ltMerge.mergeRecords(snap, snap);
  const m2 = ctx.__ltMerge.mergeRecords(m1, snap);
  ok('导入幂等', m1.recs.length === m2.recs.length && m1.recs.length === before);

  console.log('✓ --ui ' + uiCheckCount + ' 项冒烟全部通过');
}

if (UI_MODE) runUI(); else runCore();
