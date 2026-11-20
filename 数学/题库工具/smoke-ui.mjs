#!/usr/bin/env node
// 数学闪练卡 · UI 层冒烟（node + DOM 桩，不开浏览器）
//
// 用法：node 数学/题库工具/smoke-ui.mjs
// 期望：末尾打印「✓ UI 冒烟通过」，退出码 0。
//
// DSH 沙箱里 Chrome headless 起不来，所以用最小 DOM 桩把 <script id="ui"> 跑起来，
// 断言这几条真实路径：
//   ① 「今日」渲染出任务卡 + 规则卡 + 今日配比；
//   ② 今日题单同一天两次一致、写解析式 8 题、第一题是顶点式；
//   ③ 顶点式第一空是 expr（y = a(x−h)²+k 三个空）+ 一个求值空，填对判对；
//   ④ 报告视图能渲染；
//   ⑤ 模块页有「专项 3 题」、板块随机按钮与混抽说明；板块随机的题量/覆盖/重来。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '数学', '数学闪练卡.html');
const html = readFileSync(FILE, 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ui = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
/* 段四–段三：review / merge / sync 段也在 <script> 里，UI 启动就调 __ltReview.dueList，
   不先跑这三段会直接 TypeError（2026-11-19 修：本冒烟停在四科回炉内核合入之前）。 */
const review = html.match(/<script id="review">([\s\S]*?)<\/script>/)[1];
const merge = html.match(/<script id="merge">([\s\S]*?)<\/script>/)[1];
const sync = html.match(/<script id="sync">([\s\S]*?)<\/script>/)[1];

/* ---------- 最小 DOM 桩 ---------- */
const byId = {};
function El(tag) {
  const e = {
    tagName: tag, children: [], style: {}, _cls: '', value: '', textContent: '', innerHTML: '', id: '',
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') { this.styleText = v; } else { this[k] = v; if (k === 'id') byId[v] = this; } },
    getAttribute(k) { return this[k]; },
    addEventListener() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  };
  Object.defineProperty(e, 'firstChild', { get() { return this.children[0] || null; } });
  Object.defineProperty(e, 'className', { get() { return this._cls; }, set(v) { this._cls = v; } });
  return e;
}
const app = El('main'), tabs = El('nav');
byId.app = app; byId.tabs = tabs;
const doc = {
  createElement: (t) => El(t),
  createTextNode: (t) => ({ nodeValue: String(t) }),
  getElementById: (id) => byId[id] || null,
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener: () => {},
};
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const ctx = {
  console, document: doc, localStorage, location: { hash: '' },
  setTimeout: () => 0, alert: () => {}, scrollTo: () => {},
  /* sync 段定义时就要用到这几个宿主接口；冒烟不测网络，只求能加载 */
  fetch: () => Promise.reject(new Error('offline smoke')),
  btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
  unescape, encodeURIComponent,
};
vm.createContext(ctx);
ctx.window = ctx;
vm.runInContext(core, ctx);
vm.runInContext(review, ctx);
vm.runInContext(merge, ctx);
vm.runInContext(sync, ctx);
vm.runInContext(ui, ctx);

/* ---------- 断言 ---------- */
function textOf(e) {
  if (!e) return '';
  if (e.nodeValue != null) return String(e.nodeValue);
  return (e.children || []).map(textOf).join(' ');
}
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const M = ctx.__mt;
ok(!!M, '没拿到 window.__mt 调试钩子');

const all = textOf(app);
ok(all.includes('今日任务'), '今日任务卡没渲染');
ok(all.includes('今日任务的规则'), '规则卡没渲染');
ok(all.includes('今天的配比'), '今日配比没渲染');
ok(all.includes('因式分解'), '配比里没有因式分解');
ok(all.includes('弱项覆盖') || all.includes('今天这一套'), '今天这一套标记没渲染');

const plan = M.plan();
const q1 = ctx.MT.dailyQueue('write', plan).map((q) => q.prompt);
const q2 = ctx.MT.dailyQueue('write', M.plan()).map((q) => q.prompt);
ok(q1.join('|') === q2.join('|'), '同一天两次题单不一致');

M.startDaily('write');
ok(M.S.sess.queue.length === 8, '今日写解析式不是 8 题，是 ' + M.S.sess.queue.length);
ok(M.S.q.kind === 'vertex', '第一题不是顶点式，是 ' + M.S.q.kind);

const q = M.S.q;
ok(q.fields[0].type === 'expr', '顶点式第一空不是 expr');
ok(q.fields[0].ans.length === 3, 'expr 不是三个空');
ok(q.fields.length === 2 && q.fields[1].type === 'num', '顶点式没有求值空');

const a = q.fields[0].ans, y1 = q.fields[1].ans;
const fill = (id, v) => { const el = byId[id]; if (!el) throw new Error('找不到输入框 ' + id); el.value = String(v); };
fill('in0_0_n', a[0]); fill('in0_1_n', a[1]); fill('in0_2_n', a[2]); fill('in1_n', y1);
M.submit();
ok(M.S.res && M.S.res.ok === true, 'expr 正确答案被判错');

/* 5. 当日题单快照：做完一题就落进 DB.days */
const db = M.db();
const dk = Object.keys(db.days || {}).sort().reverse()[0];
ok(!!dk, '当日题单快照没写入 DB.days');
ok(dk && (db.days[dk].qs || []).length >= 1, '快照里没有题');
ok(dk && /抛物线/.test(db.days[dk].qs[0].p), '快照题干不对');
ok(dk && typeof db.days[dk].qs[0].a === 'string' && db.days[dk].qs[0].a.length > 0, '快照没存答案');

/* 6. 交点式：先选形式（选错要判错），再写全式 */
M.startSession('write', 'intercept', 1);
const iq1 = M.S.q;
ok(iq1.kind === 'intercept', '专项交点式没出交点式');
ok(iq1.fields[0].type === 'choice', '交点式第一空不是形式选择');
ok(iq1.fields[1].type === 'expr' && iq1.fields[1].ans.length === 3, '交点式 expr 不是三个空');
M.S.choice[0] = (iq1.fields[0].ans + 1) % iq1.fields[0].options.length; // 故意选错形式
const e2 = iq1.fields[1].ans;
fill('in1_0_n', e2[0]); fill('in1_1_n', e2[1]); fill('in1_2_n', e2[2]);
M.submit();
ok(M.S.res.ok === false, '选错形式竟然判对');

M.startSession('write', 'intercept', 1);
const iq2 = M.S.q;
M.S.choice[0] = iq2.fields[0].ans; // 交点式（选项已打乱，不能写死 1）
const e3 = iq2.fields[1].ans;
fill('in1_0_n', e3[0]); fill('in1_1_n', e3[1]); fill('in1_2_n', e3[2]);
M.submit();
ok(M.S.res.ok === true, '交点式选对形式 + 写对式子被判错');

M.go('report');
ok(textOf(app).length > 0, '报告视图渲染为空');
ok(textOf(app).includes('题单快照'), '报告里没有题单快照卡');

M.go('write');
ok(textOf(app).includes('专项 3 题'), '模块页没有「专项 3 题」');
ok(textOf(app).includes('当前板块随机题练习'), '写解析式页没有板块随机按钮');
ok(textOf(app).includes('按题型混抽'), '模块页没有混抽说明');
M.go('drill');
ok((textOf(app).match(/当前板块随机题练习/g) || []).length >= 7, '基础快练不是每个分组都有随机按钮');

/* 6b. 板块随机：每种题型 1~2 次、全覆盖、题数由题型数决定，重来按同板块规则 */
{
  const wm = ctx.MT.moduleById('write');
  M.startGroupRandom('write', wm.kinds);
  let qs = M.S.sess.queue;
  const n = wm.kinds.length;
  const cnt = {};
  qs.forEach((x) => { cnt[x.kind] = (cnt[x.kind] || 0) + 1; });
  ok(qs.length >= n && qs.length <= 2 * n, '写解析式板块随机题数超范围：' + qs.length);
  ok(Object.keys(cnt).length === n, '写解析式板块随机没覆盖全部题型');
  ok(Object.values(cnt).every((c) => c === 1 || c === 2), '写解析式板块随机次数不是 1~2');
  ok(M.S.sess.daily !== true, '板块随机被误算成今日题单');
  const label = M.S.sess.groupLabel;
  M.S.sess.replay();
  qs = M.S.sess.queue;
  ok(M.S.sess.groupLabel === label && qs.length >= n && qs.length <= 2 * n, '「再来一轮」没重放板块随机规则');

  const dm = ctx.MT.moduleById('drill');
  const grp = dm.kinds.filter((k) => k.group === '圆');
  M.startGroupRandom('drill', grp);
  qs = M.S.sess.queue;
  const gc = {};
  qs.forEach((x) => { gc[x.kind] = (gc[x.kind] || 0) + 1; });
  ok(qs.length >= grp.length && qs.length <= 2 * grp.length, '圆板块随机题数超范围：' + qs.length);
  ok(Object.keys(gc).length === grp.length && Object.values(gc).every((c) => c === 1 || c === 2), '圆板块随机覆盖不全或次数超限');
}

/* ---------- 7. 审查后回归（B01/B03/B05/B06/B08） ---------- */
// B01：expr 必须按模板空位顺序判分 —— 把 a/h 互换应判错
{
  let checked = 0;
  for (let s = 1; s <= 60 && checked < 3; s++) {
    const q = ctx.MT.gen('write', 'vertex', s * 7919);
    const [a, h, k] = q.fields[0].ans;
    if (a === h) continue; // 数值相同，互换后本来就等价
    checked++;
    ok(ctx.MT.judge(q, [q.fields[0].ans.slice(), q.fields[1].ans]).ok === true, 'expr 正确答案被判错');
    ok(ctx.MT.judge(q, [[h, a, k], q.fields[1].ans]).ok === false, 'expr 空位互换仍判对（B01 回归）');
  }
  ok(checked > 0, '没取到可用于 expr 顺序断言的题');
}

// B03：例题页调 submit 不能写记录
{
  M.startExample('drill', 'factor');
  const n = M.db().recs.length;
  M.submit();
  ok(M.db().recs.length === n, '例题页提交写入了记录（B03 回归）');
}

// B05：空输入提交不写记录、不进错题本
{
  M.startSession('drill', 'factor', 1);
  const n = M.db().recs.length, w = Object.keys(M.db().wrong).length;
  M.submit();
  ok(M.db().recs.length === n, '空提交写入了记录（B05 回归）');
  ok(Object.keys(M.db().wrong).length === w, '空提交进了错题本（B05 回归）');
}

// B06：当天题单固化 —— 中途答错不换题
{
  const p1 = JSON.stringify(M.plan());
  M.db().recs.push({ ts: Date.now(), mod: 'write', kind: 'profit', ok: false, got: 0, total: 1, sec: 1 });
  ok(JSON.stringify(M.plan()) === p1, '当天题单因中途答错而变（B06 回归）');
}

// B08：配比文案里的题数 == 实际队列题数
{
  const plan = M.plan();
  const wq = ctx.MT.dailyQueue('write', plan);
  const cnt = {};
  wq.forEach((q) => { cnt[q.kind] = (cnt[q.kind] || 0) + 1; });
  const noteNums = (plan.write.note.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
  const realNums = Object.values(cnt).sort((a, b) => a - b);
  ok(JSON.stringify(noteNums) === JSON.stringify(realNums), '配比文案题数与实际队列不一致（B08 回归）：' + plan.write.note);
}

if (fails.length) {
  console.error('✗ UI 冒烟失败 ' + fails.length + ' 处：');
  fails.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log('✓ UI 冒烟通过（今日渲染 / 题单一致 / expr 判分 / 报告 / 专项 3 题 / 板块随机覆盖与重来 / 回归：expr 顺序、例题提交、空提交、当天题单、配比文案）');
