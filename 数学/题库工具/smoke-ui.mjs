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
/* 数据段（第 12 周原题裁切图）：core 启动时读 W12_IMG，不先跑这一段就拿不到裁切图 */
const dataSeg = (html.match(/<script id="data">([\s\S]*?)<\/script>/) || [])[1];
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
    _ls: {},
    addEventListener(t, fn) { (this._ls[t] || (this._ls[t] = [])).push(fn); }, focus() {},
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
const docListeners = {};
const doc = {
  createElement: (t) => El(t),
  createTextNode: (t) => ({ nodeValue: String(t) }),
  getElementById: (id) => byId[id] || null,
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener: (t, fn) => { (docListeners[t] || (docListeners[t] = [])).push(fn); },
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
if (dataSeg) vm.runInContext(dataSeg, ctx);
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
/* 按文字找按钮：DOM 桩没有选择器，自己递归（「不会，看详解」这类按钮要用） */
function findBtn(frag) {
  const walk = (e) => {
    if (!e) return null;
    if (e.tagName === 'button' && textOf(e).indexOf(frag) >= 0) return e;
    for (const c of e.children || []) { const r = walk(c); if (r) return r; }
    return null;
  };
  return walk(app);
}

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

/* 4b. 系数位只写一个「−」= −1（2026-11-26 截图：y = −(x − 3)² + 0 被判错）
   —— 走真实提交路径，防止 core 判对了、UI 还在别处解析（漏改 submit 就会红） */
{
  let vq = null;
  for (let s = 1; s <= 600 && !vq; s++) {
    const t = ctx.MT.gen('write', 'vertex', s);
    if (t && t.fields[0].type === 'expr' && t.fields[0].ans[0] === -1) vq = t;
  }
  ok(!!vq, '600 个 seed 里没有 a = −1 的顶点式题');
  M.startSession('write', 'vertex', 1);
  M.S.q = vq; M.S.answered = false; M.S.res = null; M.S.fix = null;
  M.S.draft = null; M.S.choice = {}; M.S.lastVals = null; M.S.hint = false; M.S.t0 = Date.now();
  M.render();
  const va = vq.fields[0].ans;
  fill('in0_0_n', '−'); fill('in0_1_n', va[1]); fill('in0_2_n', va[2]); fill('in1_n', vq.fields[1].ans);
  M.submit();
  ok(M.S.res && M.S.res.ok === true, '系数位只填一个「−」被判错（应等于 −1）');

  /* 订正那一排输入框走的是另一段代码（submitFix），同一把尺子：订正时写「−」也要算对，
     否则孩子照着解析订正反而被卡住、出不了「下一题」 */
  M.startSession('write', 'vertex', 1);
  M.S.q = vq; M.S.answered = false; M.S.res = null; M.S.fix = null;
  M.S.draft = null; M.S.choice = {}; M.S.lastVals = null; M.S.hint = false; M.S.t0 = Date.now();
  M.render();
  fill('in0_0_n', '2'); fill('in0_1_n', va[1]); fill('in0_2_n', va[2]); fill('in1_n', vq.fields[1].ans);
  M.submit();
  ok(M.S.res.ok === false && M.S.fix && M.S.fix.fields.join(',') === '0', '系数填错后没进订正流程');
  fill('fx0_0', '−'); fill('fx0_1', va[1]); fill('fx0_2', va[2]);
  M.submitFix();
  ok(M.S.fix.ok === true, '订正时系数位只写「−」被判错');
}

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

/* 6a. 大题前两步：按板块显示全部得分点，每个可单独练，板块可随机 */
{
  M.go('entry');
  const et = textOf(app);
  const em = ctx.MT.moduleById('entry');
  const groups = [...new Set(em.items.map((x) => x.group))].filter(Boolean);
  ok(groups.length === 5, '大题前两步板块数不是 5，是 ' + groups.length);
  groups.forEach((g) => ok(et.includes(g), '大题前两步板块标题缺失：' + g));
  ok((et.match(/当前板块随机题练习/g) || []).length >= groups.length, '大题前两步不是每个板块都有随机按钮');
  ok((et.match(/练这个得分点/g) || []).length === em.items.length, '大题前两步没有逐个显示可练的得分点');
  ok(!et.includes('全部得分点混排'), '大题前两步还在用旧的「全部得分点混排」卡片');
  ok(et.includes('15(2) 等边三角形外接圆'), '第 15(2) 得分点没进模块页');
  const figItems = em.items.filter((x) => x.fig);
  ok(figItems.length >= 21, '圆与几何得分点的配图不足，只有 ' + figItems.length + ' 张');
  ok(figItems.every((x) => { const svg = ctx.MT.svgFor(x); return svg.indexOf('<svg') === 0 && !/undefined|NaN/.test(svg); }),
    '有配图的得分点渲染出空图或含 NaN/undefined');
  ok(ctx.MT.svgFor(em.items.find((x) => x.id === 'entry.w12q15')).includes('<circle'), '第 15(2) 外接圆图没画出圆');

  /* 指定得分点出题：必须就是那道题，而不是全场随机 */
  M.startSession('entry', 'entry.w12q15', 1);
  ok(M.S.sess.queue.length === 1, '单个得分点专项不是 1 题');
  ok(M.S.q.id === 'entry.w12q15' && M.S.q.kind === 'entry.w12q15', '专项练的不是指定的第 15(2) 得分点');
  ok(textOf(app).includes('题图（答题时看这张）'), '几何题答题前没显示题图（图被拖到答后才出现）');
  /* 选项位置是打散的（防「一路点 A」），所以不能写死下标：
     只断言「正确项的文字是 120°」和「按 ans 判对、换一个就判错」。 */
  const angOpts = M.S.q.fields[0].options, angAns = M.S.q.fields[0].ans;
  ok(angOpts[angAns] === '120°', '第 15(2) 圆心角的正确项不是 120°：' + angOpts[angAns]);
  ok(ctx.MT.judge(M.S.q, [angAns, 6]).ok === true, '第 15(2) 正确答案被判错');
  ok(ctx.MT.judge(M.S.q, [(angAns + 1) % angOpts.length, 6]).ok === false, '第 15(2) 圆心角选错仍判对');
  M.S.choice[0] = angAns; fill('in1_n', 6); M.submit();
  ok(!textOf(app).includes('图象验证'), '题前图又在答后重复出现了一次');
  const lastRec = M.db().recs[M.db().recs.length - 1];
  ok(lastRec.qid === 'entry..15(2) 等边三角形外接圆 · 半径第一步', 'entry 的 qid 格式变了，历史错题会被拆成两条：' + lastRec.qid);

  /* 板块随机：固定得分点每种恰好 1 题、覆盖全部、可按规则重来 */
  M.startGroupRandom('entry', em.items);
  let qs = M.S.sess.queue;
  const ids = qs.map((x) => x.kind);
  ok(qs.length === em.items.length, '大题前两步板块随机题量不对：' + qs.length);
  ok(new Set(ids).size === em.items.length, '大题前两步板块随机没覆盖全部得分点');
  ok(em.items.every((x) => ids.includes(x.id)), '大题前两步板块随机漏了某些得分点');
  ok(M.S.sess.groupLabel.includes('得分点'), '板块随机标签没说明是得分点');
  ok(M.S.sess.daily !== true, '大题前两步板块随机被误算成今日题单');
  const label = M.S.sess.groupLabel;
  M.S.sess.replay();
  ok(M.S.sess.groupLabel === label && M.S.sess.queue.length === em.items.length, '「再来一轮」没重放得分点板块规则');
}

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
  /* 圆拆成四个板块（概念与角 / 圆周角与张角 / 弦与垂径 / 弧长面积与应用），每组 ≤ 9 题：
     板块随机一次能覆盖全组，避免单组题太多导致练不到。
     2026-11-27 按 11.25 小测补了 5 类（两解、直径+角平分线、网格定圆、射门角、等弦等弧），
     圆周角相关的 5 类从「概念与角」拆出成「圆周角与张角」。 */
  const circleGroups = [...new Set(dm.kinds.map((k) => k.group))].filter((g) => g.indexOf('圆·') === 0);
  ok(circleGroups.length === 4, '圆板块数不是 4，是 ' + circleGroups.length);
  let circleTotal = 0;
  circleGroups.forEach((g) => {
    const grp = dm.kinds.filter((k) => k.group === g);
    circleTotal += grp.length;
    ok(grp.length <= 9, '圆板块「' + g + '」题型 ' + grp.length + ' 个，超过 9 会覆盖不到');
    M.startGroupRandom('drill', grp);
    const qs2 = M.S.sess.queue;
    const gc = {};
    qs2.forEach((x) => { gc[x.kind] = (gc[x.kind] || 0) + 1; });
    ok(qs2.length >= grp.length && qs2.length <= 2 * grp.length, g + ' 板块随机题数超范围：' + qs2.length);
    ok(Object.keys(gc).length === grp.length && Object.values(gc).every((c) => c === 1 || c === 2), g + ' 板块随机覆盖不全或次数超限');
  });
  ok(circleTotal === 24, '圆四个板块题型总数不是 24，是 ' + circleTotal);
  /* 11.25 小测补的 5 类必须在基础快练里（换数字也练得会），不能只留在「小测错题」 */
  ['twoans', 'diam45', 'gridcircle', 'shoot', 'eqarc'].forEach((id) => {
    ok(dm.kinds.some((k) => k.id === id), '11.25 的考点没补进基础快练：' + id);
  });
  const em = ctx.MT.moduleById('entry');
  ['entry.w13q16', 'entry.w13q17', 'entry.w13q18'].forEach((id) => {
    ok(em.items.some((it) => it.id === id), '11.25 的大题第一步没进「大题前两步」：' + id);
  });
}

/* ---------- 7. 审查后回归（B01/B03/B05/B06/B08） ---------- */
// 2026-11-22 回归：对称点坐标三种变式的答案必须与规则一致。
// 重点防「关于 y 轴只改纵坐标」这类坐标变换错位（答案与规则/图自相矛盾）。
{
  const seen = {};
  for (let s = 1; s <= 300 && Object.keys(seen).length < 3; s++) {
    const q = ctx.MT.gen('drill', 'sym', s * 7919);
    const m = q.prompt.match(/点 P\(([−-]?\d+), ([−-]?\d+)\) (.+?)的点是/);
    if (!m) { ok(false, '对称点题干解析失败：' + q.prompt); break; }
    const x = +m[1].replace('−', '-'), y = +m[2].replace('−', '-'), axis = m[3];
    const a = q.fields.map((f) => f.ans);
    const want = axis.indexOf('原点') >= 0 ? [-x, -y]
      : axis.indexOf('x 轴') >= 0 ? [x, -y] : [-x, y];
    ok(a[0] === want[0] && a[1] === want[1],
      '对称点坐标错：' + axis + ' P(' + x + ',' + y + ') → (' + a + ') 应为 (' + want + ')');
    ok(q.explain[0].indexOf('→') >= 0 && q.kp.length === 2, '对称点解析/知识点缺失');
    seen[axis] = true;
  }
  ok(Object.keys(seen).length === 3, '对称点没覆盖三种对称，只见到：' + Object.keys(seen).join('/'));
}
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

// B11（2026-11-26）：依据选择题漏选时不误判、不进错题本；选项状态并入草稿，重渲染不丢
{
  const db = M.db();
  const q = ctx.MT.gen('drill', 'diam90', 12345);
  const k = q.id + '|' + String(q.prompt).slice(0, 60);
  const now = Date.now();
  db.wrong[k] = { id: q.id, qid: 'drill.diam90.x', mod: q.mod, kind: q.kind, title: q.title, prompt: q.prompt,
    fields: q.fields, explain: q.explain, tip: q.tip, ts: now - 9e8, due: now - 1000,
    n: 1, lvl: 1, okStreak: 0, lastOkAt: 0, lastAt: now - 9e8 };
  M.startWrong();
  ok(M.S.q && M.S.q.kind === 'diam90', '错题回炉没取到 diam90（B11 回归）');

  // 只填数字、不点依据：必须拦住，不能报「2/3 个空对」塞错题本
  const nRec = db.recs.length;
  byId.in1_n.value = String(M.S.q.fields[1].ans);
  byId.in2_n.value = String(M.S.q.fields[2].ans);
  M.submit();
  ok(db.recs.length === nRec && !M.S.answered, '漏选依据仍被判分/写入记录（B11 回归）');

  // 点真正的选项按钮（走 UI 的 click 链路），再触发一次重渲染，选择必须还在
  const ansIdx = M.S.q.fields[0].ans;
  const letter = String.fromCharCode(65 + ansIdx);
  const buttons = [];
  (function walk(e) { if (!e || !e.children) return; if (e.tagName === 'button') buttons.push(e); e.children.forEach(walk); })(app);
  const opt = buttons.find((b) => textOf(b).trim().startsWith(letter + '.'));
  ok(!!opt, '没找到依据选项按钮（B11 回归）');
  if (opt) (opt._ls.click || []).forEach((fn) => fn.call(opt, { currentTarget: opt }));
  ok(M.S.choice[0] === ansIdx, '点击选项没记进 S.choice（B11 回归）');
  M.render();
  ok(M.S.choice[0] === ansIdx, '重渲染后选择丢了（B11 回归）');
  byId.in1_n.value = String(M.S.q.fields[1].ans);
  byId.in2_n.value = String(M.S.q.fields[2].ans);
  M.submit();
  ok(M.S.res && M.S.res.ok, '依据选对 + 填空对仍被判错（B11 回归）');
  delete db.wrong[k];
}

// B12（2026-11-26）：焦点在选项按钮上按回车 —— 选中选项，不能抢先提交（回炉三字段题实测 bug）
{
  const db = M.db();
  const q = ctx.MT.gen('drill', 'diam90', 54321);
  const k = q.id + '|' + String(q.prompt).slice(0, 60);
  const now = Date.now();
  db.wrong[k] = { id: q.id, qid: 'drill.diam90.enter', mod: q.mod, kind: q.kind, title: q.title, prompt: q.prompt,
    fields: q.fields, explain: q.explain, tip: q.tip, ts: now - 9e8, due: now - 1000,
    n: 1, lvl: 1, okStreak: 0, lastOkAt: 0, lastAt: now - 9e8 };
  M.startWrong();
  const ansIdx = M.S.q.fields[0].ans;
  const letter = String.fromCharCode(65 + ansIdx);
  const buttons = [];
  (function walk(e) { if (!e || !e.children) return; if (e.tagName === 'button') buttons.push(e); e.children.forEach(walk); })(app);
  const opt = buttons.find((b) => textOf(b).trim().startsWith(letter + '.'));
  ok(!!opt, '没找到依据选项按钮（B12 回归）');
  let prevented = false, selected = false;
  if (opt) (opt._ls.click || []).forEach((fn) => fn.call(opt, { currentTarget: opt, preventDefault() { prevented = true; } }));
  selected = M.S.choice[0] === ansIdx;
  // 模拟浏览器：焦点在按钮上时，回车先到 document 的 keydown 处理器
  const keydowns = docListeners.keydown || [];
  const nRec = db.recs.length;
  keydowns.forEach((fn) => fn.call(doc, { key: 'Enter', target: opt, preventDefault() { prevented = true; } }));
  ok(!prevented, '焦点在选项按钮上按回车被 preventDefault，选项 click 会被吃掉（B12 回归）');
  ok(selected && M.S.choice[0] === ansIdx, '回车后选项状态丢了（B12 回归）');
  ok(db.recs.length === nRec && !M.S.answered, '焦点在选项上按回车被当成提交（B12 回归）');
  // 焦点不在按钮上（如填空输入框）时，回车仍要提交
  byId.in1_n.value = String(M.S.q.fields[1].ans);
  byId.in2_n.value = String(M.S.q.fields[2].ans);
  keydowns.forEach((fn) => fn.call(doc, { key: 'Enter', target: { tagName: 'INPUT' }, preventDefault() { } }));
  ok(M.S.answered, '焦点在输入框按回车没提交（B12 回归）');
  delete db.wrong[k];
}

// B13（2026-11-26）：回炉遇到难题可以跳过 —— 顺补一道还没回炉的错题，做题量不缩水；
// 补位题是「还没到期」的那种，答对不能把已有连对清零（review.js practice）
{
  const db = M.db();
  const saved = db.wrong;
  db.wrong = {};
  const now = Date.now();
  const put = (q, due, streak, lvl, tag) => {
    const k = q.id + '|' + String(q.prompt).slice(0, 60);
    db.wrong[k] = { id: q.id, qid: 'B13.' + tag, mod: q.mod, kind: q.kind, title: q.title, prompt: q.prompt,
      fields: q.fields, explain: q.explain, tip: q.tip, ts: now - 9e8, due: due, n: 1,
      lvl: lvl || 1, okStreak: streak || 0, lastOkAt: 0, lastAt: now - 9e8 };
    return k;
  };
  const hard = [put(ctx.MT.gen('write', 'vertex', 11), now - 3000), put(ctx.MT.gen('write', 'vertex', 12), now - 2000),
    put(ctx.MT.gen('write', 'vertex', 13), now - 1000)];
  /* 还没到期、已经连对 1 次的那道：跳过时从它补位，答对也不能把连对清零 */
  const laterQ = ctx.MT.gen('write', 'vertex', 14);
  const laterKey = put(laterQ, now + 3 * 86400e3, 1, 2, 'later');

  M.startWrong();
  ok(M.S.sess.total === 3 && M.S.sess.queue.length === 3, '回炉轮应只取 3 道到期题');
  const skippedKey = M.S.sess.queue[0] && (M.S.sess.queue[0].id + '|' + String(M.S.sess.queue[0].prompt).slice(0, 60));
  const laterBefore = Object.assign({}, db.wrong[laterKey]);
  M.skipWrong();
  ok(db.wrong[skippedKey], '跳过本题把错题删了（只能把 due 推到明天）');
  ok(db.wrong[skippedKey] && db.wrong[skippedKey].due > now, '跳过本题没把 due 推到明天');
  ok(M.S.sess.total === 4 && M.S.sess.queue.length === 4, '跳过后没有顺补（total/queue 应各 +1）');
  ok(M.S.sess.skipped === 1 && M.S.sess.supplemented === 1, '跳过/顺补计数不对');
  const fillerKey = M.S.sess.queue[3] && (M.S.sess.queue[3].id + '|' + String(M.S.sess.queue[3].prompt).slice(0, 60));
  ok(fillerKey === laterKey, '顺补的不是那道还没到期的错题：' + fillerKey);
  ok(db.wrong[laterKey].due === laterBefore.due && db.wrong[laterKey].okStreak === 1,
    '顺补把补位题的 due/连对动了（只该补进队列，不该改题）');

  /* 走到补位题：答对 → 只记流水，连对/档位/due 都不动 */
  M.S.sess.done = 3;
  M.next();
  ok(M.S.q && M.S.early === true, '补位题没被标成 early（答对会把连对清零）');
  const recs0 = db.recs.length;
  const f0 = M.S.q.fields;
  f0[0].ans.forEach((v, j) => { byId['in0_' + j + '_n'].value = String(v); });
  byId.in1_n.value = String(f0[1].ans);
  M.submit();
  ok(db.recs.length === recs0 + 1, '补位题作答没写作答流水');
  const laterAfter = db.wrong[laterKey];
  ok(laterAfter, '答对补位题把错题删了（还没到期，不能算掌握）');
  ok(laterAfter && laterAfter.okStreak === 1 && laterAfter.lvl === 2 && laterAfter.due === laterBefore.due,
    '答对补位题动了连对/档位/due');
  db.wrong = saved;
}


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

/* ---------- 8. 2026-11-20 功能审计回归 ---------- */
// A01：题干走 innerHTML，`0<x<5` 这类必须转义 —— 否则浏览器把 `<x` 当标签，一路吞到下一个 >
{
  const f = M.fracify;
  ok(f('0<x<5').includes('0&lt;x&lt;5'), 'fracify 没转义 0<x<5，题干会被吞掉半句');
  ok(f('a<b').includes('a&lt;b'), 'fracify 没转义 a<b（<b 会被当成加粗标签）');
  ok(f('x < 3').includes('&lt; 3'), 'fracify 没转义孤立的 <');
  ok(f('<br>换行').includes('<br>'), 'fracify 把合法的 <br> 也转义了');
  ok(f('<span class="muted small">小字</span>').includes('<span class="muted small">'), 'fracify 把合法的 span 也转义了');
  ok(!f('<img src=x onerror=alert(1)>').includes('<img'), 'fracify 没拦住注入标签');
  ok(f('1/2').includes('class="frac"'), 'fracify 的分数排版被转义弄坏了');

  /* 真题干：附加(3) 的 0<x<5 必须原样出现在卡片里 */
  const qbody = (e) => {
    if (!e || !e.children) return null;
    if (e.className === 'qbody') return e;
    for (const c of e.children) { const r = qbody(c); if (r) return r; }
    return null;
  };
  M.startSession('entry', 'entry.w12q17b', 1);
  const box = qbody(app);
  ok(box && String(box.innerHTML).includes('0&lt;x&lt;5'), '附加(3) 题干的 0<x<5 没转义，孩子只能看到半截话');

  /* 反馈里的「正确答案 / 你填的是」也是拼 HTML，字段标签同样不能漏 */
  const htmlOf = (e) => (e && e.children ? String(e.innerHTML || '') + e.children.map(htmlOf).join('') : '');
  M.S.choice[1] = 0;
  M.submit();
  ok(htmlOf(app).includes('0&lt;x&lt;5'), '附加(3) 反馈里没有转义后的 0<x<5');
  ok(!htmlOf(app).includes('0<x<5'), '附加(3) 反馈里还有未转义的 0<x<5（会被吞掉）');
}

// A02：坏记录不能白屏 —— normalizeDB 丢弃坏条目、保住能用的
{
  const n = M.normalizeDB({
    v: ctx.MT.VERSION, recs: 'oops', wrong: [1, 2], days: { '2026-11-20': { qs: 'x' } }, meta: 'x',
  });
  ok(Array.isArray(n.recs) && n.recs.length === 0, 'normalizeDB 没把字符串 recs 修成数组');
  ok(n.wrong && typeof n.wrong === 'object' && !Array.isArray(n.wrong), 'normalizeDB 没把数组 wrong 修成对象');
  ok(Array.isArray(n.days['2026-11-20'].qs), 'normalizeDB 没把坏 qs 修成数组');
  ok(n.meta && typeof n.meta === 'object', 'normalizeDB 没把字符串 meta 修成对象');
  const n2 = M.normalizeDB({ v: ctx.MT.VERSION, recs: [{ ts: 1, mod: 'drill' }, null, { mod: 'x' }], wrong: { a: { due: 1 }, b: 'bad' } });
  ok(n2.recs.length === 1, 'normalizeDB 没丢掉没有 ts 的记录');
  ok(Object.keys(n2.wrong).length === 1, 'normalizeDB 没丢掉非对象的错题条目');
}

// A03：错题条目缺 fields 时，回炉要清掉它而不是崩
{
  const d = M.db();
  const before = Object.keys(d.wrong).length;
  d.wrong['broken|bad'] = { id: 'broken', due: Date.now() - 1000, ts: Date.now() - 5000 };
  M.startWrong();
  ok(!('broken|bad' in M.db().wrong), '缺 fields 的坏错题条目没被清理');
  ok(Object.keys(M.db().wrong).length >= before - 1, '清理坏条目时误删了正常错题');
}

// A04：选项位置打散 —— 同一道固定题在不同种子下正确答案不总在 A
{
  const it = ctx.MT.moduleById('entry').items.find((x) => x.id === 'entry.w12q15');
  const pos = new Set();
  for (let s = 1; s <= 40; s++) {
    const q = ctx.MT.gen('entry', it.id, s * 7919 + 13);
    const f = q.fields.find((x) => x.type === 'choice');
    ok(f.options[f.ans] === '120°', '打散选项后正确项变了：' + f.options[f.ans]);
    pos.add(f.ans);
  }
  ok(pos.size >= 2, '固定题的选项位置没打散（一路点 A 就能蒙对）');
}

// A05：手绘题图的几何自洽（审计 §4：顶点要在圆上、标注角度要等于实际夹角、比例要对）
{
  const fig = (id) => ctx.MT.svgFor(ctx.MT.moduleById('entry').items.find((x) => x.id === id));
  const num = (s) => (s == null ? NaN : Number(s));
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const deg = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;

  /* t12：四边形四个顶点都必须落在圆上（原图只有 A 在） */
  {
    const s = fig('entry.t12');
    const c = s.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/);
    const O = [num(c[1]), num(c[2])], r = num(c[3]);
    const m = s.match(/<path d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) Z"/);
    ok(!!m, '圆内接四边形没画成闭合四边形');
    if (m) for (let i = 0; i < 4; i++) {
      const p = [num(m[1 + i * 2]), num(m[2 + i * 2])];
      ok(near(dist(p, O), r), '圆内接四边形第 ' + (i + 1) + ' 个顶点不在圆上（距圆心 ' + dist(p, O).toFixed(1) + '，r=' + r + '）');
    }
  }

  /* t05：C、D 都在圆上，且 BC ∥ OD（平行是这个题的题设，画错就无从下手） */
  {
    const s = fig('entry.t05');
    const O = [160, 110], r = 80;
    const segs = [...s.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
      .map((m) => [[num(m[1]), num(m[2])], [num(m[3]), num(m[4])]]);
    const B = [240, 110];
    const onCircle = segs.flat().filter((p) => near(dist(p, O), r, 2));
    ok(onCircle.length >= 4, '圆内证角平分线：A/B/C/D 没有全落在圆上');
    /* BC：一端是 B、长度明显小于直径（AB 也以 B 为端点，但它就是直径，先排除） */
    const bc = segs.filter((g) => near(dist(g[0], B), 0, 0.5) || near(dist(g[1], B), 0, 0.5))
      .find((g) => dist(g[0], g[1]) < 1.5 * r);
    /* OD：一端是圆心 O、另一端正好在圆上（长度 = r）；AB 也过 O 但两端都在圆上 */
    const od = segs.find((g) => near(dist(g[0], O), 0, 0.5) && near(dist(g[1], O), r, 2));
    if (bc && od) {
      const u = [bc[1][0] - bc[0][0], bc[1][1] - bc[0][1]];
      const v = [od[1][0] - od[0][0], od[1][1] - od[0][1]];
      const cross = Math.abs(u[0] * v[1] - u[1] * v[0]) / (Math.hypot(...u) * Math.hypot(...v));
      ok(cross < 0.02, '圆内证角平分线：图上 BC 与 OD 不平行（sin=' + cross.toFixed(3) + '）');
    } else ok(false, '圆内证角平分线：没找到 BC / OD 两条线');
  }

  /* 14.1：标注 80°，图上 ∠BOC 就必须是 80°（原图只有 43.5°） */
  {
    const s = fig('entry.14.1');
    const O = [160, 108];
    const arc = s.match(/<path d="M ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ 0 0 0 ([\d.]+) ([\d.]+)"/);
    ok(!!arc, '平行得角：找不到 80° 的角标注弧');
    if (arc) {
      const a = deg([num(arc[1]) - O[0], num(arc[2]) - O[1]]);
      const b = deg([num(arc[3]) - O[0], num(arc[4]) - O[1]]);
      const d = Math.abs(((a - b) % 360 + 360) % 360);
      const ang = d > 180 ? 360 - d : d;
      ok(near(ang, 80, 1.5), '平行得角：图上 ∠BOC 实际是 ' + ang.toFixed(1) + '°，标注写的是 80°');
    }
  }

  /* t06：CD 与 HF 的像素比必须等于 12:31（原图 142:145 ≈ 1:1） */
  {
    const s = fig('entry.t06');
    const m = s.match(/<line x1="([\d.]+)" y1="200" x2="([\d.]+)" y2="200"/);
    const h = s.match(/<line x1="160" y1="([\d.]+)" x2="160" y2="([\d.]+)"/);
    ok(!!m && !!h, '灯罩轴截面：找不到底座线或轴线');
    if (m && h) {
      const cd = Math.abs(num(m[2]) - num(m[1]));
      const hf = Math.abs(num(h[2]) - num(h[1]));
      ok(near(cd / hf, 12 / 31, 0.02), '灯罩轴截面：CD:HF 画成 ' + cd.toFixed(0) + ':' + hf.toFixed(0) + '，题设是 12:31');
    }
  }

  /* t21：扇形两条腰必须等长，且等于弧半径（原图 101 vs 95） */
  {
    const s = fig('entry.t21');
    const m = s.match(/<path d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A ([\d.]+) [\d.]+ 0 1 1 ([\d.]+) ([\d.]+) Z"/);
    ok(!!m, '圆锥展开图：扇形不是「圆心 + 两条腰 + 弧」');
    if (m) {
      const O = [num(m[1]), num(m[2])], r = num(m[5]);
      const d1 = dist([num(m[3]), num(m[4])], O), d2 = dist([num(m[6]), num(m[7])], O);
      ok(near(d1, d2, 1.5), '圆锥展开图：扇形两条腰不等长（' + d1.toFixed(1) + ' vs ' + d2.toFixed(1) + '）');
      ok(near(d1, r, 1.5) && near(d2, r, 1.5), '圆锥展开图：扇形腰长与弧半径不一致');
    }
  }

  /* 24.1：正方形必须是正方形，且 BP = BA（旋转保长） */
  {
    const s = fig('entry.24.1');
    const m = s.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    ok(!!m, '求角度：没画正方形');
    if (m) ok(near(num(m[3]), num(m[4]), 1), '求角度：正方形画成了 ' + num(m[3]) + '×' + num(m[4]));
    const t = s.match(/<path d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) Z"/);
    ok(!!t, '求角度：没画 △ABP');
    if (t) {
      const A = [num(t[1]), num(t[2])], Pp = [num(t[3]), num(t[4])], B = [num(t[5]), num(t[6])];
      ok(near(dist(A, B), dist(Pp, B), 1), '求角度：图上 BP ≠ BA，看不出是旋转来的');
    }
  }
}

/* 7. 小测错题（quiz，2026-11-27 起两周合并）：注册表、基础/进阶分组、learn 详解、
      11.25 原题裁切图、练习页「不会」按钮、错题本只存 cropKey */
{
  const wm = ctx.MT.moduleById('quiz');
  ok(!!wm, '没有「小测错题」模块');
  ok(!ctx.MT.moduleById('week12'), '旧的「本周错题」week12 模块还在（应改名为 quiz）');
  if (wm) {
    ok(wm.name === '小测错题', '模块名不是「小测错题」，是 ' + wm.name);
    ok(wm.daily === false, '小测错题被算进今日任务（应 daily:false）');
    ok(wm.kinds && wm.kinds.length === 17, '小测错题题型数不是 17，是 ' + (wm.kinds ? wm.kinds.length : 0));
    const basic = wm.kinds.filter((k) => String(k.group || '').indexOf('基础') === 0);
    const adv = wm.kinds.filter((k) => String(k.group || '').indexOf('进阶') === 0);
    ok(basic.length === 7, '基础题不是 7 个，是 ' + basic.length);
    ok(adv.length === 10, '进阶题不是 10 个，是 ' + adv.length);
    ok(wm.kinds.every((k) => typeof k.gen === 'function'), '小测错题有题型没有生成器');
    /* 每题必须有完整 learn：考点 / 错因 / 分步解法 / 易错步骤 / 公式模型 —— 这是「不会」按钮的内容源 */
    const badLearn = wm.kinds.filter((k) => !k.learn || !k.learn.kp || !k.learn.why ||
      !Array.isArray(k.learn.steps) || !k.learn.steps.length ||
      !Array.isArray(k.learn.traps) || !k.learn.traps.length || !k.learn.model).map((k) => k.id);
    ok(badLearn.length === 0, '这些题型缺 learn 详解字段：' + badLearn.join('、'));

    /* 今日页：模块卡在（可点进去），但今日任务的结构与文案不变 */
    M.go('today');
    const tt = textOf(app);
    ok(tt.includes('小测错题'), '今日页没显示小测错题模块卡');
    ok(tt.includes('顺序：热身 → 写式 → 入口 → 错题'), '今日任务的顺序文案被改动了');

    /* 模块页：17 个题型、两个分组标题、每个都有「专项 3 题」 */
    M.go('quiz');
    const wt = textOf(app);
    ok(wt.includes('基础题'), '模块页没有「基础题」分组标题');
    ok(wt.includes('进阶题'), '模块页没有「进阶题」分组标题');
    wm.kinds.forEach((k) => ok(wt.includes(k.name), '小测错题模块页缺题型：' + k.name));
    /* 小测错题卡分两种：有变式的给「专项 3 题」，只有一道原题的给「原题重做 1 题」
       （否则同一道题连做三遍，孩子背答案）。当前 10 + 7。 */
    const n3 = (wt.match(/专项 3 题/g) || []).length;
    const nRedo = (wt.match(/原题重做 1 题/g) || []).length;
    ok(n3 + nRedo === 17, '小测错题模块页题型按钮总数不是 17：专项 ' + n3 + ' + 重做 ' + nRedo);
    const staticQuiz = wm.kinds.filter((k) => ctx.MT.kindPool('quiz', k.id) === 1).length;
    ok(nRedo === staticQuiz, '静态原题卡应全部显示「原题重做 1 题」：' + nRedo + ' ≠ ' + staticQuiz);
    ok(n3 === 17 - staticQuiz, '有变式的卡才给「专项 3 题」：' + n3 + ' ≠ ' + (17 - staticQuiz));

    /* 出题 + 判分：mod/kind 必须对得上（否则专项统计与错题归集会串） */
    wm.kinds.forEach((k) => {
      const kq = ctx.MT.gen('quiz', k.id, 12345);
      ok(kq.mod === 'quiz' && kq.kind === k.id, '小测错题出题 mod/kind 不对：' + k.id + ' → ' + kq.mod + '/' + kq.kind);
      ok(ctx.MT.judge(kq, kq.fields.map((f) => f.ans)).ok, '小测错题正确答案被判错：' + k.id);
      ok(!!kq.learn && kq.learn.kp === k.learn.kp, '小测错题出题没带 learn：' + k.id);
    });

    /* 基础快练不许再混进大题第一步（保持「一条定义一次就对」的定位） */
    const dm = ctx.MT.moduleById('drill');
    ['relatecircle', 'archcircle', 'isopoint', 'rangeopen', 'equiarc', 'paralleldist', 'constrcenter', 'path'].forEach((id) => {
      ok(!dm.kinds.some((k) => k.id === id), '大题得分点还没从基础快练移出：' + id);
    });
    ok(dm.kinds.some((k) => k.id === 'missingconst'), '基础快练漏了缺常数项（提公因式）');

    /* 每题都要有「卷面第几题」+ 原题裁切图（data URI，离线可用）；11.25 的图走 w13- 前缀，别串到 11.18 的图 */
    ok(!!dataSeg, '产物没有 <script id="data"> 段（两周原题裁切图）');
    wm.kinds.forEach((k) => {
      const kq = ctx.MT.gen('quiz', k.id, 2026);
      ok(kq.no && kq.noLabel, '小测错题没标卷面题号：' + k.id);
      ok(kq.fig && kq.fig.need && kq.fig.cap && kq.fig.cap.indexOf('题') >= 0, '小测错题缺原题裁切图或图注：' + k.id);
      ok(/^w13-|^q\d+$/.test(kq.cropKey || ''), '裁切图 key 前缀不对：' + k.id + ' → ' + kq.cropKey);
      const svg = ctx.MT.svgFor(kq);
      ok(svg.indexOf('data:image/webp;base64,') > 0, '裁切图没内联成 data URI：' + k.id);
      /* 只查 base64 之外的部分：base64 里出现 "NaN" 这类子串是正常的，不能整体扫 */
      const shell = svg.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, 'IMG');
      ok(!/NaN|undefined/.test(shell), '裁切图 SVG 骨架含 NaN/undefined：' + k.id);
    });
    /* 11.25 的题读 w13 命名空间；11.18 的题还读旧的 q* 命名空间 */
    const q25 = ctx.MT.gen('quiz', 'b11', 2026);
    ok(q25.cropKey === 'w13-q11', '11.25 第 11 题的裁切图 key 不是 w13-q11：' + q25.cropKey);
    const q18 = ctx.MT.gen('quiz', 'bsec', 2026);
    ok(q18.cropKey === 'q10', '11.18 第 10 题的裁切图 key 不是 q10：' + q18.cropKey);
    ok(ctx.MT.cropFig({ key: 'w13-q3' }).svg.indexOf('data:image/webp') > 0,
      'cropFig 不能按 w13- 前缀重建 11.25 的裁切图（回炉时会没图）');

    /* 练习页：「不会」按钮要点得开，展开的是考点 + 分步解法 + 公式模型，并记为看过详解 */
    M.startSession('quiz', 'b3', 1);
    const bq = M.S.q;
    ok(!!bq.learn, '小测错题出题没带 learn（不会面板会空）');
    ok(textOf(app).includes('不会，看详解'), '练习页没有「不会，看详解」按钮');
    const dkBtn = findBtn('不会，看详解');
    ok(!!dkBtn, '练习页找不到「不会，看详解」按钮');
    if (dkBtn) (dkBtn._ls.click || []).forEach((fn) => fn.call(dkBtn, { currentTarget: dkBtn }));
    const dt = textOf(app);
    ok(dt.includes('考点：'), '点「不会」后没显示考点');
    ok(dt.includes('这次错在哪'), '点「不会」后没显示错因');
    ok(dt.includes('正确解法'), '点「不会」后没显示分步解法');
    ok(dt.includes('最容易翻车的地方'), '点「不会」后没显示易错步骤');
    ok(dt.includes('公式 / 模型与使用条件'), '点「不会」后没显示公式模型');
    ok(M.S.hint === true, '点「不会」没记为看过详解（回炉会误算有效答对）');
    /* 看懂后照样能提交：按钮不锁答题 */
    ok(!!byId['in1_n'] || !!byId['in0_0_n'], '点「不会」后输入框消失了（应还能自己写一遍）');

    /* 错题本不存裁切图（base64 会撑大 localStorage）：只存 cropKey/noLabel，回炉时按 key 重建 */
    M.startSession('quiz', 'b12', 1);
    const wq = M.S.q;
    ok(wq.cropKey === 'w13-q12', '小测错题出题没带 cropKey：' + wq.cropKey);
    if (wq.fields[0].type === 'choice') M.S.choice[0] = (wq.fields[0].ans + 1) % wq.fields[0].options.length;
    fill('in1_n', 999); fill('in2_n', 999); fill('in3_n', 999);
    M.submit();
    const wRec = Object.keys(M.db().wrong).map((k) => M.db().wrong[k]).filter((w) => w.cropKey === 'w13-q12').pop();
    ok(!!wRec, '小测错题答错后没进错题本');
    ok(!!wRec && !wRec.fig, '错题本存了整张裁切图（base64 会撑大 localStorage）');
    ok(!!wRec && wRec.noLabel === '11.25 第 12 题', '错题条目丢了卷面题号：' + (wRec && wRec.noLabel));
  }
}

/* 7b. 题设图与详解在「回炉」时不能丢（2026-11-28 code-review 修复）
   - 原题截图 = cropKey 重建；变式网格图 fig2 是题设图，随快照存（小 SVG，不含 base64）
   - learn 不进快照，回炉时按 MT.learnOf(mod, kind) 反查，否则「不会」面板只剩 tip */
{
  ok(typeof ctx.MT.learnOf === 'function', 'core 没导出 MT.learnOf（回炉详解会退化成只有 tip）');
  ok(!!ctx.MT.learnOf('quiz', 'b10'), 'MT.learnOf 取不到 quiz.b10 的详解');
  ok(!ctx.MT.learnOf('quiz', 'no-such-kind'), 'MT.learnOf 对未知题型应返回 null');

  M.startSession('quiz', 'b10', 1);
  const gq = M.S.q;
  ok(!!(gq.fig && gq.fig.need === 1), 'b10 的卷面原题不是题设图（need 应为 1）');
  ok(!!(gq.fig2 && gq.fig2.svg && gq.fig2.need === 1), 'b10 没有变式网格题设图（fig2）');
  const beforeTxt = textOf(app);
  ok(beforeTxt.includes('卷面原题'), '答题前没显示卷面原题截图');
  ok(beforeTxt.includes('变式网格'), '答题前没显示变式网格图');

  /* 答错 → 进错题本：大图只存 key，变式图存 SVG */
  fill('in0_n', 999);
  M.submit();
  const gRec = Object.keys(M.db().wrong).map((k) => M.db().wrong[k]).filter((w) => w.kind === 'b10').pop();
  ok(!!gRec, 'b10 答错后没进错题本');
  ok(!!gRec && !!(gRec.fig2 && gRec.fig2.svg), '回炉快照丢了变式图 fig2（回炉时题设图会消失）');
  ok(!!gRec && !gRec.fig, '回炉快照又存了大图（应只存 cropKey）');

  /* 把快照当题渲染（模拟回炉）：详解靠 learnOf 反查，变式图仍在 */
  M.S.q = gRec;
  M.S.sess = { mod: 'quiz', kind: 'b10', total: 1, done: 0, right: 0, t0: Date.now() };
  M.S.answered = false; M.S.choice = {}; M.S.dontKnow = true; M.S.hint = true;
  M.S.view = 'practice';
  M.render();
  const redoTxt = textOf(app);
  ok(redoTxt.includes('不会就先看这一页'), '回炉点「不会」没有详解面板（learn 丢了）');
  ok(redoTxt.includes('公式 / 模型与使用条件'), '回炉详解里没有公式/模型段（learn 丢了）');
  ok(redoTxt.includes('变式网格'), '回炉练习页没显示变式网格图');
  M.S.dontKnow = false; M.S.hint = false;
}

/* ---------- 知识覆盖面 + 专练没做过的题（2026-11-23） ---------- */
{
  M.db().recs.length = 0;
  M.startSession('drill', 'symshape', 1);   /* 对称图形判断：固定 3 道、单选 */
  const q1 = M.S.q;
  ok(q1.fields[0].type === 'choice', '对称图形判断第一空不是单选');
  M.S.choice[0] = q1.fields[0].ans;
  M.submit();
  ok(M.S.res && M.S.res.ok, '对称图形判断正确解被判错');
  const rec = M.db().recs[M.db().recs.length - 1];
  ok(!!rec.sig, '记录里没有题目指纹 sig');
  ok(rec.sig === ctx.MT.sigOf(q1), '记录里的 sig 与 MT.sigOf 不一致');
  ok(!!rec.skel && rec.skel === ctx.MT.skelOf(q1), '记录里的 skel（情境指纹）与 MT.skelOf 不一致');

  /* 覆盖率分母是「情境数」，不是题干数：同一句话换数字做第 2 遍不该涨 */
  const c1 = M.cover('drill', 'symshape');
  ok(c1.pool === ctx.MT.kindSkel('drill', 'symshape'), 'drill.symshape 情境数应为 kindSkel，实际 ' + c1.pool);
  ok(c1.done === 1 && c1.open === c1.pool - 1, '做完 1 道应 1/' + c1.pool + '，实际 ' + c1.done + '/' + c1.pool);

  /* 模块页：题型卡与模块头都要有情境覆盖 */
  M.go('drill');
  const pageTxt = textOf(app);
  ok(/情境 1\/\d+/.test(pageTxt), '题型卡没显示「情境 1/b」');
  ok(/情境覆盖 1\/\d+/.test(pageTxt), '模块头没显示「情境覆盖 a/b」');
  ok(/练没见过的情境 /.test(pageTxt), '题型卡没显示「练没见过的情境 N」');

  /* 专练未覆盖：出的必须是没见过情境 */
  M.startNocover('drill', 'symshape');
  ok(M.S.view === 'practice', '专练未覆盖没进入练习（view=' + M.S.view + '）');
  const q2 = M.S.q;
  ok(q2 && ctx.MT.skelOf(q2) !== ctx.MT.skelOf(q1), '专练未覆盖又出了刚见过的情境');
  M.S.choice[0] = q2.fields[0].ans;
  M.submit();
  ok(M.cover('drill', 'symshape').done === 2, '见过两个情境后覆盖数应为 2');

  /* 大池：只剩 1 个情境时，30 次「练未覆盖」必须每次都抽到它。
     旧实现按题干随机试 400 个 seed 去撞，circangle（244 条题干 / 4 个情境）
     剩 1 个情境时约 1/5 撞空 → 被判成「做完了」。 */
  const bigAll = ctx.MT.enumerateKind('drill', 'circangle');
  ok(bigAll.length >= 100, 'drill.circangle 只枚举到 ' + bigAll.length + ' 道，测试前提不成立');
  const bySkel = new Map();
  bigAll.forEach((it) => { if (!bySkel.has(it.skel)) bySkel.set(it.skel, it); });
  const groups = Array.from(bySkel.values());
  ok(groups.length >= 2, 'drill.circangle 只有 ' + groups.length + ' 个情境，测试前提不成立');
  const bigLast = groups[groups.length - 1];
  groups.slice(0, groups.length - 1).forEach((it) => {
    M.db().recs.push({ ts: Date.now(), mod: 'drill', kind: 'circangle', kn: '圆周角', ok: true, got: 1, total: 1,
      sec: 20, hint: false, mode: 'new', qid: 'drill.circangle', sig: it.key, skel: it.skel });
  });
  const cBig = M.cover('drill', 'circangle');
  ok(cBig.pool === groups.length, '覆盖率分母 ' + cBig.pool + ' ≠ 实际情境数 ' + groups.length);
  ok(cBig.done === groups.length - 1 && cBig.open === 1,
    '预置 ' + (groups.length - 1) + ' 个情境后应只剩 1 个，实际 ' + cBig.done + '/' + cBig.pool);
  for (let i = 0; i < 30; i++) {
    M.startNocover('drill', 'circangle');
    ok(M.S.view === 'practice', '第 ' + (i + 1) + ' 次「练未覆盖」被判成做完了（其实还剩 1 个情境）');
    ok(ctx.MT.skelOf(M.S.q) === bigLast.skel, '只剩 1 个情境却抽到了别的');
  }

  /* 今日任务第 1 题让给未覆盖（2026-11-23）：同题型换情境，题量与配比不动；
     同一天两次必须还是同一道（起点用日期种子，「一天一套」不破）。
     写解析式的顶点式标的是「数字随机、无固定情境」（SKELS -1），按口径不参与。 */
  const fAll = ctx.MT.enumerateKind('drill', 'factor');
  const fSkel = new Map();
  fAll.forEach((it) => { if (!fSkel.has(it.skel)) fSkel.set(it.skel, it); });
  const fGroups = Array.from(fSkel.values());
  ok(fGroups.length >= 2, 'drill.factor 只有 ' + fGroups.length + ' 个情境，测试前提不成立');
  const recN = M.db().recs.length;
  /* 退回旧实现时，今日热身首题是 dailyQueue 按 seed 固定的那道。要让「首题让给未覆盖」可测，
     剩下的那个未覆盖情境必须 ≠ 今日 q0 的情境；但 q0 随日期种子变（跨零点会换），
     所以不写死「最后一个情境」，而是挑一个不是 q0 的情境当唯一未覆盖项。 */
  const q0 = ctx.MT.dailyQueue('drill', M.plan())[0];
  const q0skel = ctx.MT.skelOf(q0);
  const fLast = fGroups.filter((it) => it.skel !== q0skel).pop();
  ok(!!fLast, 'drill.factor 除今日首题情境外没有别的未覆盖情境，测试前提不成立');
  fGroups.forEach((it) => {
    if (it.skel === fLast.skel) return;
    M.db().recs.push({ ts: Date.now(), mod: 'drill', kind: 'factor', ok: true, mode: 'new',
      qid: 'drill.factor', sig: it.key, skel: it.skel });
  });
  /* 第一次「开始」选定并冻结；记下这道题的 sig 与题面，后面 9 次 + 答题后再开都必须逐字一致 */
  M.startDaily('drill');
  const firstSig = ctx.MT.sigOf(M.S.q);
  const firstPrompt = M.S.q.prompt;
  const firstSkel = ctx.MT.skelOf(M.S.q);
  for (let i = 0; i < 9; i++) {
    M.startDaily('drill');
    ok(M.S.q.kind === 'factor', '第 ' + (i + 1) + ' 次今日热身首题题型被换掉了：' + M.S.q.kind);
    ok(ctx.MT.skelOf(M.S.q) === fLast.skel, '第 ' + (i + 1) + ' 次今日热身首题没用上剩下的那个未覆盖情境');
    ok(ctx.MT.sigOf(M.S.q) === firstSig, '第 ' + (i + 1) + ' 次今日热身首题换成了同情境的另一个数值版本（冻结必须记到具体题目）');
    ok(M.S.sess.queue.length === 6, '首题替换后今日热身题量不是 6 了');
  }
  /* 答完这道首题（该情境变成已覆盖）后再点「开始」：同一天必须还是同一道题、同一段题面。
     只比「没答题连点两次」测不出这条 —— 那时覆盖集没变，怎么实现都一样；
     只比 skel 也测不出 —— 那只能证明情境没变，证明不了数字没变。 */
  M.db().recs.push({ ts: Date.now(), mod: 'drill', kind: 'factor', ok: true, mode: 'new',
    qid: 'drill.factor', sig: 'answered', skel: firstSkel });
  M.startDaily('drill');
  ok(M.S.q.prompt === firstPrompt, '答完首题后再开，同一天的首题换了题面（「一天一套」被破坏）');
  /* 白盒：冻结记录必须存到具体题目（sig）。行为断言被当天的种子掩护 —— 只有当
     环扫先命中的变体恰好不是 list 第一条时，只记 skel 的实现才会换题面，平时测不出；
     记 sig 是确定性正确的，这里直接查。 */
  const fsMemo = M.db().meta.firstSeen || {};
  const fsKey = Object.keys(fsMemo)[0];
  ok(fsKey && fsMemo[fsKey] && fsMemo[fsKey].sig === firstSig,
    '冻结记录里没有存题目指纹 sig（只记情境的话，同一天可能换成同情境的另一个数值版本）');
  M.db().recs.length = recN;
  delete M.db().meta.firstSeen;

  /* 报告页有知识覆盖面 */
  M.go('report');
  const repTxt = textOf(app);
  ok(repTxt.includes('知识覆盖面'), '报告页没有「知识覆盖面」');
  ok(/全科 \d+ \/ \d+/.test(repTxt), '报告页没有全科合计');

  /* 模块头「练没练过的题型」按题型口径（2026-11-23）：
     复现截图场景——写解析式只有顶点式 8 条无 skel 老记录，应报 7 个未练题型；
     情境口径的题型卡按钮仍只在拱桥建模出现，顶点式卡要把 legacy 显示出来。 */
  const wrecs = M.db().recs;
  for (let i = wrecs.length - 1; i >= 0; i--) if (wrecs[i].mod === 'write') wrecs.splice(i, 1);
  for (let i = 0; i < 8; i++) wrecs.push({ ts: Date.now() + i, mod: 'write', kind: 'vertex', kn: '顶点式求 a',
    ok: true, got: 1, total: 1, sec: 10, hint: false, mode: 'new' });
  M.go('write');
  const wTxt = textOf(app);
  ok(/练没练过的题型（7）/.test(wTxt), '模块头未练题型数应为 7，实际 ' + ((wTxt.match(/练没练过的题型（\d+）/) || ['无'])[0]));
  ok(!/练未覆盖的题/.test(wTxt), '模块头还留着旧的「练未覆盖的题」文案');
  ok(!/练未覆盖 /.test(wTxt), '题型卡还留着旧的「练未覆盖 N」文案');
  ok(/练过 8 题/.test(wTxt), '顶点式卡没显示练过 8 题');
  ok(/暂无情境记录/.test(wTxt) && /老记录无情境指纹未计/.test(wTxt), '顶点式卡没显示老记录未计入的提示');
  ok(/练没见过的情境 1/.test(wTxt), '拱桥建模应有且只有 1 个未见过情境');
  M.startFreshKinds('write');
  ok(M.S.view === 'practice' && M.S.sess.queue.length === 7, '未练题型按钮应出 7 题');
  ok(M.S.sess.queue.every((q) => q.kind !== 'vertex'), '未练题型按钮混进了练过的 vertex');
  ok(new Set(M.S.sess.queue.map((q) => q.kind)).size === 7, '未练题型应每个题型各 1 题');
}

if (fails.length) {
  console.error('✗ UI 冒烟失败 ' + fails.length + ' 处：');
  fails.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log('✓ UI 冒烟通过（今日渲染 / 题单一致 / expr 判分 / 系数位「−」= −1 / 回炉跳过顺补 / 报告 / 专项 3 题 / 大题前两步分组、配图与专项 / 板块随机覆盖与重来 / 小测错题（两周合并、基础/进阶分组、17 题型、learn 详解、11.25 与 11.18 两套裁切图、「不会」按钮展开考点与解法、错题本只存 cropKey）/ 回归：expr 顺序、例题提交、空提交、依据漏选拦截、选择草稿不丢、当天题单、配比文案、题干转义、坏记录自愈、选项打散、手绘题图几何自洽）');


