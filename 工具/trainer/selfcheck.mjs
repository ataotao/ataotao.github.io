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
/* 化学两页：条件上/下箭头的富排版必须在产物里（题干 prompt 仍保持稳定键） */
if (name === '化学' || name === '化学专项') {
  if (uiM[1].indexOf('function rich(') < 0 || uiM[1].indexOf('⟦') < 0) fail('产物缺少化学方程式富排版 rich()');
  if (html.indexOf('.cheq{') < 0) fail('产物缺少箭头上下条件样式 .cheq');
  if (coreM[1].indexOf('display') < 0) fail('core 未生成 display 字段（题干稳定键可能被改坏）');
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

/* 化学方程式富排版：display 标记必须在真实渲染层变成「上条件 / 箭头 / 下条件」 */
if (name === '化学' || name === '化学专项') {
  const keep = { q: T.S.q, view: T.S.view, sess: T.S.sess, answered: T.S.answered, res: T.S.res };
  T.S.view = 'quiz'; T.S.sess = { mode: 'normal', done: 0, total: 1 }; T.S.answered = false; T.S.res = null;
  T.S.q = {
    mod: 'eq', kind: 'balance', title: '排版冒烟', prompt: '配平：2KClO₃ —MnO₂/Δ→ 2KCl ＋ ___O₂↑',
    display: '配平：2KClO₃ ⟦MnO₂|Δ⟧ 2KCl ＋ ___O₂↑',
    fields: [{ type: 'num', ans: 3, label: '系数', tol: 0.01 }], tip: '', explain: [], kp: []
  };
  T.render();
  if (!/class="cheq-svg"/.test(app.innerHTML)) fail('化学方程式未渲染成内联 SVG');
  if (!/class="cond top"[^>]*>MnO/.test(app.innerHTML) ||
      !/class="cond bottom"[^>]*>△/.test(app.innerHTML)) fail('SVG 箭头上下条件未在 UI 中渲染');
  if (!/baseline-shift="sub"/.test(app.innerHTML)) fail('SVG 下标未生效');
  /* 化学式只能进一次 SVG：修复前 chemRuns() 先把 2KClO₃ 作为纯文本输出，
     又把它扫进 SVG 左侧再画一遍，造成「2KClO₃ 2KClO₃」重复。 */
  const kclo3Count = (app.innerHTML.match(/2KClO₃/g) || []).length;
  if (kclo3Count > 1) fail('化学方程式重复渲染：2KClO₃ 出现 ' + kclo3Count + ' 次');
  if (/配平：2KClO₃/.test(app.innerHTML)) fail('化学式未被 SVG 完整吸收，前方残留重复的纯文本');
  if (app.innerHTML.indexOf('⟦') >= 0 || app.innerHTML.indexOf('Δ') >= 0) fail('页面残留 ⟦⟧ 标记或希腊字母 Δ');

  /* 老错题回炉：HEAD 时代的错题只有裸串 prompt、无 display 字段。
     rich() 会把 —条件→ 兜底转成 SVG，且化学式不得重复。 */
  T.S.q = {
    mod: 'eq', kind: 'balance', title: '老错题冒烟',
    prompt: '配平：2KClO₃ MnO₂/Δ 2KCl ＋ ___O₂，O₂ 前的系数是（填数字）',
    fields: [{ type: 'num', ans: 3, label: '系数', tol: 0.01 }], tip: '', explain: [], kp: []
  };
  T.render();
  if (!/class="cheq-svg"/.test(app.innerHTML)) fail('老错题回炉未兜底渲染 SVG');
  if ((app.innerHTML.match(/2KClO₃/g) || []).length > 1) fail('老错题回炉化学式重复');
  if (app.innerHTML.indexOf('⟦') >= 0 || app.innerHTML.indexOf('Δ') >= 0) fail('老错题回炉残留标记或 Δ');
  Object.assign(T.S, keep); T.render();

  /* 特殊符号键盘：文本题（离子/元素符号书写）应渲染键盘，且含上标/下标/常用离子；
     数字题（配平系数）不应挂键盘——否则插入上标会破坏数值判分。 */
  T.S.view = 'quiz'; T.S.sess = { mode: 'normal', done: 0, total: 1 }; T.S.answered = false; T.S.res = null;
  T.S.q = {
    mod: 'struct', kind: 'ion', title: '符号键盘冒烟', prompt: '写出「硫离子」的离子符号：',
    fields: [{ type: 'text', ans: 'S²⁻', label: '离子符号', alts: ['S2-'] }], tip: '', explain: [], kp: []
  };
  T.render();
  if (/data-symkeys/.test(app.innerHTML) === false) fail('文本题未渲染特殊符号键盘');
  ['data-sym="²"', 'data-sym="⁻"', 'data-sym="₄"', 'data-sym="S²⁻"', 'data-sym="SO₄²⁻"'].forEach(function (needle) {
    if (app.innerHTML.indexOf(needle) < 0) fail('符号键盘缺少：' + needle);
  });
  T.S.q = {
    mod: 'eq', kind: 'balance', title: '无键盘冒烟', prompt: '配平：___H₂ ＋ O₂ 点燃 2H₂O',
    fields: [{ type: 'num', ans: 2, label: '系数', tol: 0.01 }], tip: '', explain: [], kp: []
  };
  T.render();
  if (/data-symkeys/.test(app.innerHTML)) fail('数字题不应挂特殊符号键盘（插入上标会破坏数值判分）');

  /* 真·插入行为：模拟聚焦输入框，点「⁻」「²」，验证光标处插入且判分仍走 normChem */
  const fakeInput = { value: 'S', readOnly: false, selectionStart: 1, selectionEnd: 1, tagName: 'INPUT',
    focus() {}, setSelectionRange(a, b) { this.selectionStart = this.selectionEnd = b; } };
  sandbox.document.activeElement = fakeInput;
  const mkSymBtn = (s) => ({ getAttribute(k) { return k === 'data-sym' ? s : 'chemIn0'; } });
  T.insertSym(mkSymBtn('²')); T.insertSym(mkSymBtn('⁻'));
  if (fakeInput.value !== 'S²⁻') fail('符号键盘插入异常：期望 S²⁻，实际 ' + fakeInput.value);
  if (!T.CH.judge({ fields: [{ type: 'text', ans: 'S²⁻' }] }, [fakeInput.value]).ok) fail('键盘插入的符号无法被判分识别');
  sandbox.document.activeElement = null;
  Object.assign(T.S, keep); T.render();

  /* 配平四法细则卡：仅专项页有 guide。balance 模块页四种方法各渲染一张可展开卡，
     卡内含操作细则与例题，例题的化学方程式走同一套富排版。 */
  if (name === '化学专项') {
    var m = T.CH.moduleById('balance');
    var guided = m.kinds.filter(function (k) { return k.guide; });
    if (guided.length !== 4) fail('配平四法方法细则数据缺失：期望 4，实际 ' + guided.length);
    T.go('mod', 'balance');
    var gcCount = (app.innerHTML.match(/class="guide-card"/g) || []).length;
    if (gcCount !== 4) fail('配平四法模块页方法细则卡数异常：期望 4，实际 ' + gcCount);
    if (app.innerHTML.indexOf('操作细则') < 0 || app.innerHTML.indexOf('例题：') < 0) fail('方法细则卡缺操作细则或例题');
    if (app.innerHTML.indexOf('⟦') >= 0) fail('方法细则卡例题残留 ⟦⟧ 标记');
    /* 引导式例题：最小公倍数法的 5 步须「问题在 summary、思路在折叠区」，
       另有 1 张即时练手卡；完整步骤默认折叠，不直接泄题。 */
    var walkHtml = (app.innerHTML.match(/class="gc-walk"/g) || []).length;
    if (walkHtml !== 5) fail('引导式例题步数渲染异常：期望 5，实际 ' + walkHtml);
    if (app.innerHTML.indexOf('先自己想一想每步该怎么做') < 0) fail('引导例题缺「先想再看」提示');
    if (app.innerHTML.indexOf('class="gc-re"') < 0 || app.innerHTML.indexOf('<b>思路：</b>') < 0) fail('引导例题的思路区未渲染');
    if (app.innerHTML.indexOf('class="gc-try"') < 0 || app.innerHTML.indexOf('自己试一道') < 0) fail('即时练手卡未渲染');
    if (app.innerHTML.indexOf('看完整步骤与结果') < 0) fail('完整答案未折叠（会直接泄题）');

    /* 入口可达性：孩子进入配平题（任何途径）都应在答题页看到内联方法卡，
       否则像用户那样只看到题干+输入框，会以为功能不存在。 */
    var recsBeforeGuide = T.DB.recs.length;
    T.go('mod', 'balance');
    T.action('modexample');
    if (T.S.view !== 'mod') fail('「先看一道例题」应打开模块页方法卡，而不是进入假答题（mode=example 会判分/进错题库）');
    if (app.innerHTML.indexOf('guide-card') < 0) fail('「先看一道例题」未展示方法卡内容');
    /* 答题页内联：直接进入 lcm 题型，页内应含引导例题的 5 个问题、练手卡与折叠答案 */
    T.startRound('balance', 'lcm', 1);
    var qh = app.innerHTML;
    if (qh.indexOf('看方法与引导例题') < 0) fail('配平答题页缺内联方法卡入口');
    if ((qh.match(/class="gc-walk"/g) || []).length !== 5) fail('答题页内联引导例题步数异常');
    if (qh.indexOf('class="gc-try"') < 0 || qh.indexOf('看完整步骤与结果') < 0) fail('答题页内联练手卡/折叠答案缺失');
    /* 内联卡只展示不计分：进入答题不应产生任何作答记录 */
    if (T.DB.recs.length !== recsBeforeGuide) fail('仅查看引导例题不应写入作答记录');
    Object.assign(T.S, keep); T.render();
  }
}

/* ①b 知识覆盖面 + 专练未覆盖（2026-11-23；当晚改为按「情境」算）
   覆盖率分母 = 情境数（题干抹平数字后去重），不是题干数。核心行为：
   同一句话换个数字再做一遍，百分比不该上涨 —— 否则分母被数值变体灌水，
   孩子做 30 道还显示「覆盖 3%」，既失真也挫败。 */
{
  const mk = name === '化学' ? { mod: 'air', kind: 'comp' } : { mod: 'base', kind: 'period' };
  const pool = T.CH.kindPool(mk.mod, mk.kind);
  const nSkel = T.CH.kindSkel(mk.mod, mk.kind);
  if (!(pool > 1) || !(nSkel > 0)) fail(`${mk.mod}.${mk.kind} 的池量/情境数异常：${pool}/${nSkel}`);
  const recOf = (q) => ({ ts: Date.now(), mod: mk.mod, kind: mk.kind, kindName: q.kindName, ok: true,
    got: 1, total: 1, prompt: q.prompt, kp: q.kp, mode: 'normal',
    qid: mk.mod + '.' + mk.kind + '.' + String(q.prompt).slice(0, 40), skel: T.skelOf(q) });

  const q0 = T.CH.gen(mk.mod, mk.kind, 1);
  T.importText(JSON.stringify({ v: 1, recs: [recOf(q0)], wrong: {}, meta: {} }));
  T.go('mod', mk.mod);
  if (app.innerHTML.indexOf('情境 1/' + nSkel) < 0) fail(`模块页未显示情境覆盖（期望「情境 1/${nSkel}」）`);
  if (app.innerHTML.indexOf('练未覆盖 ' + (nSkel - 1)) < 0) fail('模块页缺「练未覆盖」入口或剩余情境数不对');

  T.startRound(mk.mod, mk.kind, 10, 'nocover');
  if (T.S.view !== 'quiz' || !T.S.q) fail('未覆盖专练没有进入答题页');
  if (T.skelOf(T.S.q) === T.skelOf(q0)) fail('未覆盖专练又抽了刚做过的情境');

  /* 同一情境的第二个数值版本 → 覆盖率必须还是 1 */
  let q1 = null;
  for (let i = 2; i <= 3000; i++) {
    const q = T.CH.gen(mk.mod, mk.kind, i);
    if (T.skelOf(q) === T.skelOf(q0) && q.prompt !== q0.prompt) { q1 = q; break; }
  }
  if (q1) {
    T.importText(JSON.stringify({ v: 1, recs: [recOf(q0), recOf(q1)], wrong: {}, meta: {} }));
    T.go('mod', mk.mod);
    if (app.innerHTML.indexOf('情境 2/' + nSkel) >= 0) fail('同一情境的第二个数值版本被算成了新覆盖');
    if (app.innerHTML.indexOf('情境 1/' + nSkel) < 0) fail('同情境两题后情境数不是 1');
  }

  T.action('reset');
  /* 全覆盖：灌满全部情境（每个情境一条），入口要消失 */
  const seenSkel = new Set(), all = [];
  for (let i = 1; i <= 3000 && seenSkel.size < nSkel; i++) {
    const q = T.CH.gen(mk.mod, mk.kind, i);
    const sk = T.skelOf(q);
    if (seenSkel.has(sk)) continue;
    seenSkel.add(sk);
    all.push(recOf(q));
  }
  if (seenSkel.size !== nSkel) fail(`枚举 ${mk.mod}.${mk.kind} 只拿到 ${seenSkel.size}/${nSkel} 个情境，与容量表不一致`);
  T.importText(JSON.stringify({ v: 1, recs: all, wrong: {}, meta: {} }));
  T.go('mod', mk.mod);
  const chipRe = new RegExp('data-kind="' + mk.kind + '"[\\s\\S]{0,260}?已全覆盖');
  if (!chipRe.test(app.innerHTML)) fail(`题型 ${mk.kind} 全覆盖后未显示「✓ 已全覆盖」`);
  if (app.innerHTML.indexOf('情境 ' + nSkel + '/' + nSkel) < 0) fail('全覆盖后未显示满额情境数');
  T.go('report');
  if (app.innerHTML.indexOf('知识覆盖面') < 0) fail('报告页缺「知识覆盖面」区块');
  T.action('reset');
}

/* ⑤ 回炉「跳过本题」顺补（2026-11-26）：难题不硬扛——跳过这道（due 推到明天、
   连对进度保留），顺补一道本轮还没排过的错题，做题量不缩水；补位题答对不清连对。 */
{
  T.action('reset');
  const now = Date.now();
  const entry = (key, due, n) => ({
    key, due, n, lvl: 1, okStreak: n === 2 ? 1 : 0, lastOkAt: 0, lastAt: now, ts: now,
    mod: 'air', kind: 'comp', kindName: '空气', modName: '空气', title: key, prompt: key,
    fields: [{ type: 'num', ans: 1, label: '答案' }]
  });
  const dueKeys = ['w-due-1', 'w-due-2', 'w-due-3'];
  const laterKey = 'w-later-1';       /* 还没到期 → 跳过时的补位来源 */
  const wrong = {};
  dueKeys.forEach((k, i) => { wrong[k] = entry(k, now - (i + 1) * 3600e3, 1); });
  wrong[laterKey] = entry(laterKey, now + 3 * 86400e3, 2);
  T.importText(JSON.stringify({ v: 1, recs: [], wrong, meta: {} }));
  /* importText 会把 DB 换成合并后的新对象，T.DB 是旧引用 —— 一律走 T.db() 取当前库 */
  const dbNow = () => T.db();

  T.startRound(null, null, 20, 'wrong');
  const s = T.S.sess;
  if (s.queue.length !== 3 || s.total !== 3) fail('回炉轮应只取 3 道到期题，实际 ' + s.queue.length);

  const skippedKey = s.queue[0].key;
  const skippedEntry = dbNow().wrong[skippedKey];
  if (!skippedEntry) fail('导入的错题不见了：' + skippedKey);
  T.action('skip');   /* 跳过第一道 */
  if (!dbNow().wrong[skippedKey]) fail('跳过本次把错题删了（只能推迟，不能删除）');
  if (dbNow().wrong[skippedKey].due <= now) fail('跳过本次没把 due 推到明天');
  if (T.S.sess.queue.length !== 4 || T.S.sess.total !== 4) {
    fail('跳过后没有顺补：queue ' + T.S.sess.queue.length + ' / total ' + T.S.sess.total + '（应各 +1）');
  }
  const filler = T.S.sess.queue[3];
  if (filler.key !== laterKey || !filler.fill) fail('顺补的不是那道还没回炉的错题：' + filler.key);
  if (T.S.sess.skipped !== 1) fail('跳过计数不对：' + T.S.sess.skipped);

  /* 抽到补位题时 earlyQ 必须置位（reviewAnswer 靠它走 practice） */
  T.S.sess.done = T.S.sess.queue.length - 2;
  T.action('next');   /* 走到最后一道（补位题） */
  if (!T.S.q || T.S.q._wrongKey !== laterKey) fail('最后一道不是补位题：' + (T.S.q && T.S.q._wrongKey));
  if (!T.S.sess.earlyQ) fail('补位题没标 earlyQ（答对会误把连对清零）');

  /* 答对补位题：连对/档位/due 都不能动 */
  const before = Object.assign({}, dbNow().wrong[laterKey]);
  sandbox.document.getElementById(SUB.inputPrefix + '0').value = '1';
  T.submit();
  const after = dbNow().wrong[laterKey];
  if (!after) fail('答对补位题把错题删了（未到期不能算有效确认）');
  if (after.okStreak !== before.okStreak || after.lvl !== before.lvl || after.due !== before.due) {
    fail('答对补位题动了连对/档位/due：' + JSON.stringify({ was: before.okStreak, now: after.okStreak }));
  }
  if (!dbNow().recs.length) fail('补位题作答没有写作答流水（recs 必须留档）');

  /* 补位题答错仍按答错处理：n+1、回退一档 */
  T.startRound(null, null, 20, 'wrong');
  T.action('skip');
  T.S.sess.done = T.S.sess.queue.length - 2;
  T.action('next');
  const fillKey2 = T.S.q && T.S.q._wrongKey;
  if (!fillKey2 || !T.S.sess.earlyQ) fail('第二轮没抽到补位题');
  const before2 = Object.assign({}, dbNow().wrong[fillKey2]);
  sandbox.document.getElementById(SUB.inputPrefix + '0').value = '999';
  T.submit();
  const after2 = dbNow().wrong[fillKey2];
  if (!after2 || after2.n !== before2.n + 1) fail('补位题答错没有记错次：' + before2.n + ' → ' + (after2 && after2.n));
  T.action('reset');
}

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
console.log('  启动/各视图渲染 · 单套统计 DOM · tabs 数据驱动 · 导入幂等 · 旧记录可读 · 事件并集 · 覆盖面/未覆盖专练 · 回炉跳过顺补（补位题答对不清连对）');


