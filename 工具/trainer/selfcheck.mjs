#!/usr/bin/env node
/* 训练器内核自检：在轻量 DOM 桩里真正执行产物，覆盖 check-flash 不测的 UI 运行层。
 * 用法：node 工具/trainer/selfcheck.mjs [科目名]
 * 验收点（段二）：① 启动无异常 ② 各视图渲染 ③ 单套统计 DOM
 *                ④ 导入幂等 ⑤ chemflash_v1 旧记录可读 ⑥ 产物是单文件双脚本
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const name = process.argv[2] || '化学';
const { default: SUB } = await import('file://' + path.join(ROOT, '工具/trainer/subjects', name + '.mjs').replace(/\\/g, '/'));
const html = fs.readFileSync(path.join(ROOT, SUB.outFile), 'utf8');

const fail = (m) => { console.error('✗ ' + m); process.exit(1); };
const coreM = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const uiM = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM || !uiM) fail('产物缺少 core / ui 脚本节点');
if ((html.match(/<script id="core">/g) || []).length !== 1) fail('core 脚本节点不唯一');

/* ===== 脚手架族（物理 / 数学）：三源逐字节内联，只校验「产物=源」契约 =====
   渲染引擎用 h() + canvas，DOM 桩覆盖不了；运行时另由 check-training.mjs --ui 守。 */
if (SUB.family === 'scaffold') {
  const n = (s) => String(s).replace(/\r\n/g, '\n').trim();
  const seg = [
    ['css', html.match(/<style>([\s\S]*?)<\/style>/)?.[1], SUB.cssFile],
    ['core', coreM[1], SUB.coreFile],
    ['ui', uiM[1], SUB.uiFile]
  ];
  for (const [label, inHtml, srcFile] of seg) {
    if (inHtml == null) fail(`产物缺少 ${label} 段`);
    const src = fs.readFileSync(path.join(ROOT, srcFile), 'utf8');
    if (n(inHtml) !== n(src)) fail(`${label} 段与真源 ${srcFile} 不一致（改了源忘重建？）`);
  }
  // core 暴露的全局名与配置一致
  if (!new RegExp('var\\s+' + SUB.coreGlobal + '\\s*=\\s*\\(function').test(coreM[1])) {
    fail(`core 没有暴露 ${SUB.coreGlobal}`);
  }
  // 记录键在 UI 里
  if (uiM[1].indexOf("'" + SUB.key + "'") < 0) fail(`UI 里找不到记录键 ${SUB.key}`);
  // 单文件：无外部依赖
  if (/<script[^>]+src=|<link[^>]+href=|fetch\(/.test(html)) fail('产物有外部依赖，不是单文件');
  console.log(`✓ ${name} 脚手架族内核自检通过`);
  console.log('  css/core/ui 三源与产物逐字节一致 · core 暴露 ' + SUB.coreGlobal + ' · 记录键 ' + SUB.key + ' · 单文件');
  process.exit(0);
}

/* ---------- 轻量 DOM 桩 ---------- */
function El() {
  return {
    _html: '', get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    onclick: null, onchange: null, files: null, value: '',
    classList: { add() {}, remove() {} },
    getAttribute() { return null; },
    querySelectorAll() { return []; }, querySelector() { return null; },
    click() {}, addEventListener() {}
  };
}
const store = Object.create(null);
const app = El(), tabs = El();
const byId = { app, tabs };
const sandbox = {
  console, Set, Math, JSON, Date, Object, Array, String, Number, isFinite, parseInt, parseFloat,
  setTimeout, clearTimeout, alert() {}, confirm() { return true; },
  location: { hash: '' },
  history: { replaceState() {} },
  localStorage: {
    getItem(k) { return k in store ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  },
  document: {
    getElementById(id) { return byId[id] || (byId[id] = El()); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, createElement() { return El(); }
  },
  Blob: function () {}, FileReader: function () {},
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} }
};
sandbox.window = sandbox;
sandbox.window.scrollTo = function () {};
sandbox.window.addEventListener = function () {};
vm.createContext(sandbox);

try {
  vm.runInContext(coreM[1], sandbox, { filename: name + '.core.js' });
  vm.runInContext(uiM[1], sandbox, { filename: name + '.ui.js' });
} catch (e) {
  fail('产物运行时异常：' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
}

const T = sandbox[SUB.global];
if (!T || !T.CH || typeof T.mergeRecords !== 'function') fail('没有拿到训练器测试钩子 / mergeRecords');

/* ① 启动渲染：今日视图有单元卡片、有统计区 */
if (app.innerHTML.indexOf('modcard') < 0) fail('今日视图没有单元卡片');
if (app.innerHTML.indexOf('statgrid') < 0) fail('今日视图没有统计区');
if ((app.innerHTML.match(/statgrid/g) || []).length !== (app.innerHTML.match(/class="statgrid"/g) || []).length) {
  fail('统计区出现嵌套 statgrid');
}
/* tabs 数据驱动 */
if (!/data-go="today"/.test(tabs.innerHTML) || !/data-go="report"/.test(tabs.innerHTML)) fail('tabs 未从 VIEWS 生成');

/* ② 各视图渲染 */
for (const [view, needle] of [['wrong', '错题回炉'], ['report', '导入记录 JSON']]) {
  T.go(view);
  if (app.innerHTML.indexOf(needle) < 0) fail(view + ' 视图渲染异常（缺 ' + needle + '）');
}
T.go('today');

/* ③ 旧记录可读：写一个没有 deviceId / qid 的旧版 DB，重新 load */
const legacy = {
  v: 1,
  recs: [{ ts: 1794732887984, mod: 'air', kind: 'o2', ok: true, got: 1, total: 1, prompt: '氧气的性质', kp: ['氧气'], mode: 'normal' }],
  wrong: { 'air.o2|氧气的性质': { key: 'air.o2|氧气的性质', mod: 'air', kind: 'o2', prompt: '氧气的性质', due: Date.now() + 86400000, n: 1 } },
  meta: { round: 3, lastKind: { air: 'o2' } }
};
store[SUB.key] = JSON.stringify(legacy);
const reloaded = T.load();
if (reloaded.recs.length !== 1 || Object.keys(reloaded.wrong).length !== 1) fail('chemflash_v1 旧记录读不出');

/* ④ 合并幂等：同一份记录导入两次，条数不变 */
const m1 = T.mergeRecords(legacy, legacy);
const m2 = T.mergeRecords(m1, legacy);
if (m1.recs.length !== m2.recs.length || Object.keys(m1.wrong).length !== Object.keys(m2.wrong).length) {
  fail('合并非幂等：二次导入后条数变化');
}
if (m1.recs.length !== 1 || Object.keys(m1.wrong).length !== 1) fail('合并不去重：重复记录翻倍');
/* 两个不同设备各 3 条 → 并集 6 条 */
const mk = (n) => ({ v: 1, recs: [0, 1, 2].map((i) => ({ ts: 1000 + i, mod: 'air', kind: 'k', prompt: '题' + (n + i) })), wrong: {}, meta: {} });
const union = T.mergeRecords(mk(0), mk(10));
if (union.recs.length !== 6) fail('事件并集错误：期望 6 得到 ' + union.recs.length);

console.log(`✓ ${name} 训练器内核自检通过`);
console.log('  启动/各视图渲染 · 单套统计 DOM · tabs 数据驱动 · 导入幂等 · 旧记录可读 · 事件并集');
