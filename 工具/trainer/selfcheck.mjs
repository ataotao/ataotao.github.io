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

/** 段三修复：在给定 sandbox 里跑 sync 段，验证产物内 syncPlan 真按科过滤（防串科回退）。 */
function verifySyncIsolation(syncCode, label) {
  if (label !== '物理' && label !== '数学') return;   // 化学暂无历史种子，跳过
  const sb = { console, Set, Math, JSON, Date, Object, Array, String, Number, isFinite, parseInt, parseFloat,
    localStorage: { getItem() { return null; }, setItem() {} }, fetch() {}, btoa() {}, unescape, encodeURIComponent };
  sb.window = sb; vm.createContext(sb);
  try {
    // syncPlan 依赖 merge.mjs 的全局 mergeRecords，先跑 merge 段再跑 sync 段
    vm.runInContext(mergeM[1], sb, { filename: label + '.merge.js' });
    vm.runInContext(syncCode, sb, { filename: label + '.sync.js' });
  }
  catch (e) { fail(label + ' sync 段无法执行：' + e.message); }
  if (!sb.__ltSync || typeof sb.__ltSync.syncPlan !== 'function') fail(label + ' sync 段未挂出 __ltSync.syncPlan');
  const r = (ts, prompt) => ({ ts, mod: 'm', kind: 'k', prompt });
  const carriers = {
    '物理|legacy': { v: 1, deviceId: '物理|legacy', subject: '物理', recs: [r(1, '仅物理')], wrong: { pw: { key: 'pw', due: 9 } }, meta: {} },
    '数学|legacy': { v: 1, deviceId: '数学|legacy', subject: '数学', recs: [r(2, '仅数学')], wrong: { mw: { key: 'mw', due: 9 } }, meta: {} }
  };
  const mine = sb.__ltSync.syncPlan({ v: 1, recs: [], wrong: {}, meta: {} }, carriers, label + '|dev-x', label);
  if (mine.db.recs.length !== 1 || mine.db.recs[0].prompt !== '仅' + label) {
    fail(label + ' 产物内 syncPlan 未按科过滤：' + JSON.stringify(mine.db.recs.map((x) => x.prompt)));
  }
  const wantWrong = label === '物理' ? 'pw' : 'mw';
  if (Object.keys(mine.db.wrong).join(',') !== wantWrong) {
    fail(label + ' 产物内 syncPlan 串科错题：' + Object.keys(mine.db.wrong).join(','));
  }
}
const coreM = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const dataM = html.match(/<script id="data">([\s\S]*?)<\/script>/);
const reviewM = html.match(/<script id="review">([\s\S]*?)<\/script>/);
const mergeM = html.match(/<script id="merge">([\s\S]*?)<\/script>/);
const syncM = html.match(/<script id="sync">([\s\S]*?)<\/script>/);
const uiM = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM || !uiM) fail('产物缺少 core / ui 脚本节点');
if (!reviewM) fail('产物缺少 review 脚本节点（段四：共享错题回炉内核 ADR-0010）');
if (!mergeM) fail('产物缺少 merge 脚本节点（段三：两族共用的事件并集合并函数）');
if (!syncM) fail('产物缺少 sync 脚本节点（段三：云同步编排 + 网络适配）');
if ((html.match(/<script id="core">/g) || []).length !== 1) fail('core 脚本节点不唯一');
if ((html.match(/<script id="merge">/g) || []).length !== 1) fail('merge 脚本节点不唯一');
if ((html.match(/<script id="sync">/g) || []).length !== 1) fail('sync 脚本节点不唯一');
// 段三修复：每科产物必须注入自己的科目常量，否则同步会串科
if (syncM[1].indexOf('var LT_SUBJECT = ' + JSON.stringify(name)) < 0) {
  fail('sync 段注入的 LT_SUBJECT 不是本科（' + name + '），按科隔离失效');
}

/* ===== 脚手架族（物理 / 数学）：三源逐字节内联，只校验「产物=源」契约 =====
   渲染引擎用 h() + canvas，DOM 桩覆盖不了；运行时另由 check-training.mjs --ui 守。 */
if (SUB.family === 'scaffold') {
  const n = (s) => String(s).replace(/\r\n/g, '\n').trim();
  const seg = [
    ['css', html.match(/<style>([\s\S]*?)<\/style>/)?.[1], SUB.cssFile],
    ['core', coreM[1], SUB.coreFile],
    ['ui', uiM[1], SUB.uiFile]
  ];
  if (SUB.dataFile) {
    if (SUB.dataOutFile) {
      // ADR-0009：数据外置成同目录 JS，HTML 只留 <script src>；产物与真源逐字节一致
      const ref = SUB.dataRef || path.basename(SUB.dataOutFile);
      const tag = '<script src="' + ref + '"></script>';
      if (html.indexOf(tag) < 0) fail(`科目配置了 dataOutFile，但产物缺少 ${tag}`);
      if (dataM) fail('数据已外置，产物不应再内联 <script id="data">');
      const outPath = path.join(ROOT, SUB.dataOutFile);
      if (!fs.existsSync(outPath)) fail(`外置词库产物不存在：${SUB.dataOutFile}`);
      seg.push(['data(外置)', fs.readFileSync(outPath, 'utf8'), SUB.dataFile]);
    } else if (dataM) {
      seg.push(['data', dataM[1], SUB.dataFile]);
    } else {
      fail(`科目配置了 dataFile=${SUB.dataFile}，但产物缺少 <script id="data"> 段`);
    }
  } else if (dataM) {
    fail('产物有 data 段但科目配置没有 dataFile');
  }
  for (const [label, inHtml, srcFile] of seg) {
    if (inHtml == null) fail(`产物缺少 ${label} 段`);
    const src = fs.readFileSync(path.join(ROOT, srcFile), 'utf8');
    if (n(inHtml) !== n(src)) fail(`${label} 段与真源 ${srcFile} 不一致（改了源忘重建？）`);
  }
  // core 暴露的全局名与配置一致
  if (!new RegExp('var\\s+' + SUB.coreGlobal + '\\s*=\\s*\\(function').test(coreM[1])) {
    fail(`core 没有暴露 ${SUB.coreGlobal}`);
  }
  // merge 段与真源一致（去 export 后比对），且导入调用共用函数
  const mergeSrc = fs.readFileSync(path.join(ROOT, '工具/trainer/merge.mjs'), 'utf8').replace(/^export\s+/gm, '').trim();
  if (n(mergeM[1].replace(/window\.__ltMerge[^\n]*\n?/, '')) !== n(mergeSrc)) {
    fail('merge 段与真源 工具/trainer/merge.mjs 不一致（改了源忘重建？）');
  }
  if (uiM[1].indexOf('__ltMerge.mergeRecords') < 0) fail('UI 导入未调用共用合并函数');
  // 段三：sync 段存在、UI 有云同步按钮、注入了宿主接口
  if (!/id="sync"/.test(html)) fail('产物缺少 sync 脚本节点');
  if (uiM[1].indexOf('__ltSyncUI') < 0 || uiM[1].indexOf('云同步') < 0) fail('UI 未接云同步');
  verifySyncIsolation(syncM[1], name);   // 产物内真实 syncPlan 按科过滤验证
  // 记录键在 UI 里
  if (uiM[1].indexOf("'" + SUB.key + "'") < 0) fail(`UI 里找不到记录键 ${SUB.key}`);
  // 单文件（或「HTML + 同目录词库」）：无外部脚本/样式引用。
  // ADR-0009：外置词库的那一个 <script src> 是允许的，其它外链一律拒绝。
  const dataRef = SUB.dataOutFile ? (SUB.dataRef || path.basename(SUB.dataOutFile)) : null;
  const refs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g), ...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  if (refs.some((x) => x !== dataRef)) fail('产物有非词库的外部依赖：' + refs.filter((x) => x !== dataRef).join(', '));
  if (dataRef && refs.filter((x) => x === dataRef).length !== 1) fail('外置词库 <script src> 应恰好一次');
  console.log(`✓ ${name} 脚手架族内核自检通过`);
  console.log('  css/core/ui 三源逐字节一致 · merge 段同源 · core 暴露 ' + SUB.coreGlobal + ' · 记录键 ' + SUB.key + (dataRef ? ` · 外置词库 ${dataRef}` : ' · 单文件'));
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
  vm.runInContext(reviewM[1], sandbox, { filename: name + '.review.js' });
  if (!sandbox.__ltReview || typeof sandbox.__ltReview.onPass !== 'function') fail('review 段未挂出 __ltReview');
  vm.runInContext(mergeM[1], sandbox, { filename: name + '.merge.js' });
  if (!sandbox.__ltMerge || typeof sandbox.__ltMerge.mergeRecords !== 'function') fail('merge 脚本未挂出 __ltMerge');
  vm.runInContext(syncM[1], sandbox, { filename: name + '.sync.js' });
  if (!sandbox.__ltSync || typeof sandbox.__ltSync.syncPlan !== 'function') fail('sync 脚本未挂出 __ltSync');
  vm.runInContext(uiM[1], sandbox, { filename: name + '.ui.js' });
} catch (e) {
  fail('产物运行时异常：' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
}

/* 段三修复：产物内真实 syncPlan 按科过滤验证（物理/数学；化学无历史种子跳过） */
verifySyncIsolation(syncM[1], name);

const T = sandbox[SUB.global];
if (!T || !T.CH || typeof T.mergeRecords !== 'function') fail('没有拿到训练器测试钩子 / mergeRecords');
/* 段三：云同步静态契约（sync 段存在、UI 接了按钮；网络运行层本机不测） */
if (!/id="sync"/.test(html)) fail('产物缺少 sync 脚本节点');
if (uiM[1].indexOf('__ltSyncUI') < 0 || uiM[1].indexOf('云同步') < 0) fail('UI 未接云同步');

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
if (reloaded.recs.length !== 1 || Object.keys(reloaded.wrong).length !== 1) fail('旧格式记录读不出（缺 deviceId / qid 的兼容路径）');

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
