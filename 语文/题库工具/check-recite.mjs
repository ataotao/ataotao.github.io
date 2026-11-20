/* 背诵训练卡自检：数据完整 + 课标60篇 + 学期标注 + 考点题库准确性 + 构建产物 + 各模式渲染/点击/判分
 * 用法：node 语文/题库工具/check-recite.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const dataDir = join(root, '语文', '数据');
let fail = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { console.error('✗ ' + m); fail++; };
const load = (n) => JSON.parse(readFileSync(join(dataDir, n), 'utf8'));
const norm = s => String(s || '').replace(/[\s，。！？；：、,'"“”‘’·—…（）()／\/]/g, '');

// 1. 课标清单
const catalog = load('课标必背60篇.json');
if (catalog.length !== 60) bad(`课标清单不是 60 篇：${catalog.length}`);
const cIds = new Set(catalog.map(x => x.id));
if (cIds.size !== 60) bad('课标清单有重复 id');

// 2. 全部数据文件
const FILES = ['背诵-文言文.json','背诵-诗词.json','背诵-现代文.json',
  '背诵-七上.json','背诵-七下八上.json','背诵-八下.json','背诵-九上补.json','背诵-九下.json'];
const all = [];
const ids = new Set();
for (const f of FILES) {
  let d;
  try { d = load(f); } catch (e) { bad(`读不到 ${f}: ${e.message}`); continue; }
  for (const p of d) {
    if (ids.has(p.id)) bad(`重复 id: ${p.id}（${f}）`);
    ids.add(p.id); all.push(p);
    for (let i = 0; i < p.paras.length; i++) {
      const t = p.paras[i].text;
      for (const x of p.paras[i].pinyin || []) if (t.indexOf(x.w) < 0) bad(`${p.id} 段${i + 1} 注音「${x.w}」不在原文`);
      for (const k of p.paras[i].keys || []) if (t.indexOf(k) < 0) bad(`${p.id} 段${i + 1} 挖空「${k}」不在原文`);
    }
  }
}
ok(`数据完整：${all.length} 篇（${FILES.length} 个文件）`);

// 3. 构建产物（level/学期/序号由 build 注入，须从产物内联数据读）
const html = readFileSync(join(root, '语文', '背诵训练卡.html'), 'utf8');
for (const ph of ['/*__WENYAN__*/','/*__POEM__*/','/*__MODERN__*/','/*__CATALOG__*/','/*__TERMS__*/','/*__EXAM__*/','/*__REVIEW_JS__*/']) {
  if (html.indexOf(ph) >= 0) bad(`产物含未替换占位符 ${ph}`);
}
function inlineData(id) {
  const m = html.match(new RegExp('<script id="' + id + '" type="application/json">([\\s\\S]*?)</script>'));
  if (!m) { bad(`产物缺 data-${id}`); return []; }
  try { return JSON.parse(m[1]); } catch (e) { bad(`产物 data-${id} 解析失败: ${e.message}`); return []; }
}
const outAll = [...inlineData('data-wenyan'), ...inlineData('data-poem'), ...inlineData('data-modern')];
const missing = catalog.filter(c => !outAll.some(p => p.id === c.id));
if (missing.length) bad(`课标缺 ${missing.length} 篇：` + missing.map(x => `${x.no}.${x.name}`).join('、'));
else ok(`课标必背 60 篇齐全（产物内联 ${outAll.length} 篇）`);
const outById = new Map(outAll.map(p => [p.id, p]));
for (const c of catalog) {
  const p = outById.get(c.id); if (!p) continue;
  if (p.level !== '中考必背') bad(`${c.name} 未标中考必背（实际 ${p.level}）`);
  if (p.term !== c.term) bad(`${c.name} 学期不符：清单 ${c.term} / 产物 ${p.term}`);
  if (p.no !== c.no) bad(`${c.name} 课标序号不符：清单 ${c.no} / 产物 ${p.no}`);
}
ok('课标篇目 level/学期/序号与清单一致');
if (html.indexOf('先帝创业未半而中道崩殂') < 0) bad('产物缺《出师表》原文');
if (html.indexOf('bēng cú') < 0) bad('产物缺注音');
if (html.indexOf('课标必背') < 0) bad('产物缺课标标注');
ok('产物已内联数据、拼音与标注');

// 4. 考点题库准确性：答案逐字来自原文、题型/考频/出处齐全、trap 在答案里
const examBooks = inlineData('data-exam');
if (!examBooks.length) bad('产物缺考点题库');
else {
  const errBefore = fail;
  let qCount = 0;
  for (const b of examBooks) {
    const piece = outById.get(b.id);
    if (!piece) { bad(`考点篇目 ${b.id} 不在课文数据里`); continue; }
    for (const it of b.items) {
      qCount++;
      const para = piece.paras[it.para];
      if (!para) { bad(`考点 ${b.id} 段号 ${it.para} 越界`); continue; }
      if (norm(para.text).indexOf(norm(it.ans)) < 0) bad(`考点 ${b.id} 答案「${it.ans}」不在第${it.para + 1}段原文`);
      if (!['理解性默写','直接默写'].includes(it.type)) bad(`考点 ${b.id} 未知题型 ${it.type}`);
      if (!['高频','中频'].includes(it.freq)) bad(`考点 ${b.id} 未知考频 ${it.freq}`);
      if (!it.q || !it.clue) bad(`考点 ${b.id} 缺题干/提示`);
      for (const t of it.trap || []) if (norm(it.ans).indexOf(norm(t)) < 0) bad(`考点 ${b.id} 易错字「${t}」不在答案`);
    }
  }
  // 只有本节确实没有报错时才打印通过（原 eq 变量恒为 0，导致错误答案也假通过）
  if (fail === errBefore) ok(`考点题库 ${examBooks.length} 篇 ${qCount} 题，答案逐字来自原文、字段齐全`);
}

// 5. 主脚本渲染 + 点击（DOM 桩）
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts[scripts.length - 1];
// 按 id 精确取 review 段（规范 §2.1），不靠位置猜测
const reviewMatch = html.match(/<script id="review"[^>]*>([\s\S]*?)<\/script>/);
const reviewScript = reviewMatch ? reviewMatch[1] : scripts[scripts.length - 2];
if (!reviewMatch) bad('产物 review 段缺 id="review"（规范 §2.1）');
const mergeMatch = html.match(/<script id="merge"[^>]*>([\s\S]*?)<\/script>/);
const syncMatch = html.match(/<script id="sync"[^>]*>([\s\S]*?)<\/script>/);
if (!mergeMatch) bad('产物缺 merge 段（导入/云同步合并器）');
if (!syncMatch) bad('产物缺 sync 段（云同步适配层）');
function mockEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false,
    classList: { toggle() {}, add() {}, remove() {} },
    getAttribute(k) { return (this._attr || {})[k] || ''; },
    setAttribute(k, v) { (this._attr = this._attr || {})[k] = v; },
    addEventListener(t, f) { (this._ev = this._ev || {})[t] = f; },
    querySelector() { return mockEl(); }, closest() { return null; },
    click() { if (this.onclick) this.onclick(); }, focus() {}
  };
}
const handlers = {}, els = {};
const getEl = (id) => (els[id] || (els[id] = mockEl()));
const evButtons = ['all', 'due', 'history'].map(v => {
  const e = mockEl(); e.setAttribute('data-ev', v); return e;
});
const revGoButton = mockEl(); revGoButton.setAttribute('data-rev-go', 'chushibiao#0');
const wenyan = outAll.filter(p => p.type === 'wenyan');
const poem = outAll.filter(p => p.type === 'poem');
const modern = outAll.filter(p => p.type === 'modern');
const TERMS = ['七上','七下','八上','八下','九上','九下','拓展'];
const winObj = { addEventListener: (t, f) => { handlers['win:' + t] = f; } };
const ctx = {
  console, JSON, Date, Math, RegExp, Array, Object, String, Number, Error, isNaN,
  document: {
    getElementById(id) {
      const DATA = { 'data-wenyan': wenyan, 'data-poem': poem, 'data-modern': modern,
        'data-catalog': catalog, 'data-terms': TERMS, 'data-exam': examBooks };
      if (DATA[id]) return { textContent: JSON.stringify(DATA[id]) };
      return getEl(id);
    },
    querySelectorAll(sel) {
      // 考点视图切换按钮需要真实可点，才能测「错题史」视图（缓存，保证绑定到同一批对象）
      if (sel === '[data-ev]') return evButtons;
      if (sel === '[data-rev-go]') return [revGoButton];
      return [];
    },
    createElement() { return mockEl(); },
    body: { appendChild() {}, removeChild() {} },
    addEventListener: (t, f) => { handlers['doc:' + t] = f; }
  },
  // 老记录缺 examOk 字段，用来回归「按钮显示 NaN%」的 bug
  localStorage: (() => {
    let raw = JSON.stringify({ v: 1, stat: { chushibiao: { att: 2, ok: 1, wrong: 1, exam: 3 } }, days: {}, examWrong: {},
      // 老流水没有 title：历史清单不能只显示 chushibiao#0
      examRecs: [{ qid: 'chushibiao#0', piece: 'chushibiao', ok: false, ts: Date.now() - 86400000, kind: '理解性默写' }] });
    return { getItem: () => raw, setItem(k, v) { raw = v; } };
  })(),
  location: { hash: '' },
  history: { replaceState() {} },
  window: winObj,
  setTimeout() {}, confirm() { return true; }, alert() {},
  Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
  FileReader: function () { this.readAsText = () => {}; },
  fetch: () => Promise.reject(new Error('offline test')),
  btoa: (s) => s, unescape: (s) => s
};
ctx.globalThis = ctx;
vm.createContext(ctx);
const paraLabel = () => {
  const m = getEl('stage').innerHTML.match(/第 (\d+) \/ (\d+) 段/);
  return m ? Number(m[1]) : -1;
};
try {
  // review / merge / sync 内核先挂到 window
  vm.runInContext(reviewScript, ctx, { timeout: 5000 });
  if (!winObj.__ltReview) bad('错题回炉内核未挂到 window.__ltReview');
  else ok('错题回炉内核已加载');
  vm.runInContext(mergeMatch[1], ctx, { timeout: 5000 });
  if (!winObj.__ltMerge || typeof winObj.__ltMerge.mergeRecords !== 'function') bad('合并内核未挂到 window.__ltMerge');
  else ok('导入/云同步共用合并内核已加载');
  vm.runInContext(syncMatch[1], ctx, { timeout: 5000 });
  if (!winObj.__ltSyncUI || !winObj.__ltSync) bad('云同步编排/适配层未加载');
  else ok('云同步编排与适配层已加载');

  vm.runInContext(main, ctx, { timeout: 5000 });
  for (const m of ['read','mask','exam','review','star']) {
    ctx.location.hash = '#p=chushibiao&m=' + m;
    handlers['win:hashchange']();
    if (!getEl('stage').innerHTML) bad(`模式 ${m} 渲染为空`);
  }
  // fill/chain 已移除：深链若仍带这两种模式，应回退到默认 read（不会白屏）
  ctx.location.hash = '#p=chushibiao&m=fill';
  handlers['win:hashchange']();
  if (!getEl('stage').innerHTML) bad('已移除的 fill 模式回退渲染为空');
  ok('五种模式渲染无异常，旧深链安全回退');

  // 截图 bug 回归：老记录缺 examOk 时进度不能显示 NaN%
  const chipsHtml = getEl('pieceGroups').innerHTML;
  if (chipsHtml.indexOf('NaN') >= 0) bad('篇目按钮出现 NaN%（旧统计字段未归一化）');
  else ok('旧记录缺字段时篇目按钮不显示 NaN%');
  if (html.indexOf('data-m="review"') < 0) bad('顶部缺「错题回炉」栏目入口');
  if (getEl('dueBadge').textContent === '') bad('错题回炉待办角标未初始化');
  for (const id of ['exportBtn','importBtn','importFile','syncBtn','patHelpBtn']) {
    const el = getEl(id);
    if (['exportBtn','importBtn','syncBtn','patHelpBtn'].includes(id) && typeof el.onclick !== 'function') bad(`${id} 未绑定`);
  }
  if (!winObj.__ywRecite || typeof winObj.__ywRecite.importText !== 'function') bad('导入合并接口未暴露');
  else ok('导出/导入/云同步按钮均已绑定');

  ctx.location.hash = '#p=chushibiao&m=read';
  handlers['win:hashchange']();
  const start = paraLabel();
  if (typeof getEl('nextPara').onclick !== 'function') bad('nextPara 未绑定');
  if (typeof getEl('prevPara').onclick !== 'function') bad('prevPara 未绑定');
  getEl('nextPara').onclick();
  const n2 = paraLabel();
  if (n2 !== start + 1) bad(`下一段未前进：${start}→${n2}`);
  getEl('prevPara').onclick();
  if (paraLabel() !== start) bad(`上一段未回退：${n2}→${paraLabel()}`);
  if (n2 === start + 1 && paraLabel() === start) ok('上一段/下一段点击有效');

  // 学期筛选
  const tf = getEl('termFilters');
  if (tf._ev && typeof tf._ev.click === 'function') {
    ctx.location.hash = '#p=chushibiao&m=read&t=八上&lv=中考必背';
    handlers['win:hashchange']();
    const grp = getEl('pieceGroups').innerHTML;
    if (grp.indexOf('八上') < 0) bad('学期筛选后未出现八上分组');
    if (grp.indexOf('七上') >= 0) bad('学期筛选后仍出现七上分组');
    if (!/课标|level|lvbadge|dot/.test(grp)) bad('筛选结果缺标注');
    ok('学期+级别筛选与深链生效');
  } else bad('termFilters 未绑定点击事件');

  // 新增课标篇目渲染
  ctx.location.hash = '#p=guanju&m=read';
  handlers['win:hashchange']();
  const gj = getEl('stage').innerHTML;
  if (gj.indexOf('关雎') < 0 || gj.indexOf('雎鸠') < 0) bad('新增篇目《关雎》渲染异常');
  else ok('新增课标篇目渲染正常');

  // 考点默写：渲染题干、题型徽章
  ctx.location.hash = '#p=chushibiao&m=exam';
  handlers['win:hashchange']();
  let ex = getEl('stage').innerHTML;
  if (ex.indexOf('考点默写') < 0 || ex.indexOf('eqInput') < 0) bad('考点默写未渲染输入区');
  if (ex.indexOf('理解性默写') < 0 && ex.indexOf('直接默写') < 0) bad('考点默写缺题型徽章');
  if (ex.indexOf('真题') < 0) bad('考点默写缺真题出处');
  else ok('考点默写渲染题干/题型/出处正常');

  // 答错 → 批改结果 + 收入回炉 + 逐字高亮
  const inp = getEl('eqInput');
  inp.value = '错误答案'; if (inp.oninput) inp.oninput();
  const check = getEl('eqCheck');
  if (typeof check.onclick !== 'function') bad('eqCheck 未绑定');
  else {
    check.onclick();
    ex = getEl('stage').innerHTML;
    if (ex.indexOf('eqres') < 0) bad('答错后未显示批改结果');
    if (ex.indexOf('c-bad') < 0) bad('批改结果缺错字高亮');
    if (ex.indexOf('回炉中') < 0) bad('答错后未收入回炉（缺回炉徽章）');
    if (typeof getEl('eqSkip').onclick !== 'function') bad('跳过本次未绑定');
    else ok('考点答错→逐字批改→收入回炉→跳过入口 正常');
  }

  // 历史错题清单（规范 §1.6/§2.5）：点「错题史」应渲染出刚答错的那道题
  const histBtn = evButtons.find(b => b.getAttribute('data-ev') === 'history');
  if (!histBtn || typeof histBtn.onclick !== 'function') bad('「错题史」按钮未绑定（规范 §2.5）');
  else {
    histBtn.onclick();
    const hh = getEl('stage').innerHTML;
    if (hh.indexOf('曾经错过的题') < 0) bad('错题史视图缺清单标题');
    if (hh.indexOf('histtable') < 0) bad('错题史视图未渲染清单表格');
    else if (hh.indexOf('chushibiao#0') >= 0) bad('历史清单仍显示题目 id 而非题干');
    else if (hh.indexOf('《出师表》开篇') < 0) bad('历史清单缺真实题干摘要');
    else ok('历史错题清单（everWrong+dayText）显示真实题干');
    // 切回全部题，避免污染后续用例
    const allBtn = evButtons.find(b => b.getAttribute('data-ev') === 'all');
    if (allBtn && allBtn.onclick) allBtn.onclick();
  }

  // 顶层错题回炉栏目：跨篇目看到到期题，并能跳回考点默写
  ctx.location.hash = '#p=yueyanglouji&m=review';
  handlers['win:hashchange']();
  const rv = getEl('stage').innerHTML;
  if (rv.indexOf('错题回炉') < 0 || rv.indexOf('待回炉') < 0) bad('错题回炉栏目缺待回炉区');
  else if (rv.indexOf('出师表') < 0) bad('跨篇目回炉清单未显示其他篇目的错题');
  else if (typeof revGoButton.onclick !== 'function') bad('回炉题「去默写」未绑定');
  else {
    revGoButton.onclick();
    if (getEl('stage').innerHTML.indexOf('eqInput') < 0) bad('「去默写」未跳回考点默写');
    else ok('顶层错题回炉栏目可见，跨篇目待办与跳转正常');
  }

  // 导入/云同步共用合并器：同份记录重复导入不翻倍
  const api = winObj.__ywRecite;
  const before = api.DB.examRecs.length;
  const after = api.importText(JSON.stringify(api.DB));
  if (after !== before) bad(`同份记录导入后翻倍：${before}→${after}`);
  else if (api.toShared(api.DB).recs.length !== before) bad('共享快照投影的流水条数不一致');
  else ok('导入合并去重：同份记录重复导入不翻倍');

  // 全部篇目都有考点：抽查一篇新增篇目（岳阳楼记）能进考点默写并出题
  ctx.location.hash = '#p=chushibiao&m=exam&t=all';
  handlers['win:hashchange']();
  ctx.location.hash = '#p=yueyanglouji&m=exam';
  handlers['win:hashchange']();
  const yl = getEl('stage').innerHTML;
  if (yl.indexOf('eqres') >= 0 && yl.indexOf('eqcard') < 0 && yl.indexOf('暂无考点题库') >= 0) {
    bad('新增篇目《岳阳楼记》仍显示暂无考点');
  } else if (yl.indexOf('eqcard') < 0) {
    bad('新增篇目《岳阳楼记》未渲染考点题卡');
  } else ok('新增篇目《岳阳楼记》考点默写正常出题');
} catch (e) {
  bad('主脚本运行异常: ' + e.stack);
}

if (fail) { console.error(`\n${fail} 项失败`); process.exit(1); }
console.log('\n全部通过');
