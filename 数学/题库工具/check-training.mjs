#!/usr/bin/env node
// 数学闪练卡 · 题生成器 + 今日题单自检
//
// 用法：node 数学/题库工具/check-training.mjs [每类题数]
// 期望：末尾打印「✓ 全部通过」，退出码 0。
//
// 它从 数学/数学闪练卡.html 里抽出 <script id="core">（纯逻辑层，不碰 DOM），
// 在 node 里跑：
//   A. MT.selfTest：每个生成器各出 N 题，断言
//      ① 题干里没有 undefined/NaN；② 答案都是有限数、选项下标不越界；
//      ③ 正确解必须判对；④ 把答案 +1 之后必须判错。
//   B. 今日任务规则（planForDay / dailyQueue）：断言
//      ① 同一天两次：seed 相同、题单逐字相同（一天一套、可复现）；
//      ② 7 天 seed 互不相同；③ 题量 6/8/3；④ 同一套题干不重复；
//      ⑤ 题型与 plan 一致；⑥ 连续 6 天主力 6 类全覆盖；
//      ⑦ 弱项覆盖：传 weakKind 后主力换成该类且占 4 题。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '数学', '数学闪练卡.html');
const N = Number(process.argv[2]) || 200;

const html = readFileSync(FILE, 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) {
  console.error('✗ 找不到 <script id="core">，文件结构被改坏了？');
  process.exit(1);
}

const ctx = { console };
vm.createContext(ctx);
try {
  new vm.Script(m[1], { filename: '数学闪练卡.core.js' });
  vm.runInContext(m[1], ctx);
} catch (e) {
  console.error('✗ 核心脚本语法/运行错误：' + e.message);
  process.exit(1);
}

const MT = ctx.MT;
if (!MT || typeof MT.selfTest !== 'function') {
  console.error('✗ 没有拿到 MT.selfTest');
  process.exit(1);
}
if (typeof MT.planForDay !== 'function' || typeof MT.dailyQueue !== 'function') {
  console.error('✗ 没有拿到 MT.planForDay / MT.dailyQueue');
  process.exit(1);
}

/* ---------- pools 模式：重扫题库容量，和 core 里 POOLS 表逐项比对 ---------- */
function runPools() {
  const SCAN = 3000;
  const fails = [];
  let fixedKinds = 0, fixedTotal = 0, openKinds = 0;
  MT.modules.forEach((m) => {
    const kinds = m.kinds
      ? m.kinds.map((k) => ({ id: k.id, name: k.name }))
      : Array.from(new Set(m.items.map((it) => it.kind || it.id))).map((id) => ({ id, name: id }));
    kinds.forEach((k) => {
      const seen = new Set();
      for (let s = 1; s <= SCAN; s++) {
        let q;
        try { q = MT.gen(m.id, k.id, s * 7919 + 13); } catch (e) { continue; }
        if (q && q.prompt) seen.add(MT.sigOf(q));
      }
      const want = MT.kindPool(m.id, k.id), got = seen.size;
      if (want === -1) {
        if (got < 100) fails.push(`${m.id}.${k.id} 表里标 ∞，实测只 ${got} 道（应改成固定数）`);
        openKinds++;
        return;
      }
      if (!want) { fails.push(`${m.id}.${k.id} 没有登记容量（实测 ${got}）`); return; }
      if (want !== got) fails.push(`${m.id}.${k.id} 表里 ${want}，实测 ${got}`);
      /* 页面「练未覆盖」走的是 core 的 enumerateKind，它枚举出的条数必须与 POOLS 相等：
         少了 → 覆盖 a/b 永远到不了 100%，且未覆盖题抽完一遍就提前收尾；多了 → 会出「没登记的题」。 */
      const enumN = MT.enumerateKind(m.id, k.id).length;
      if (enumN !== want) fails.push(`${m.id}.${k.id} 运行时只枚举到 ${enumN} 道，POOLS 是 ${want}`);
      fixedKinds++; fixedTotal += got;
    });
  });
  console.log(`扫描：${MT.modules.length} 模块 · ${fixedKinds + openKinds} 类题型 · 每类 ${SCAN} 个 seed`);
  console.log(`固定池 ${fixedKinds} 类 / ${fixedTotal} 道；不设上限 ${openKinds} 类`);
  if (fails.length) {
    console.error('✗ 容量表漂移 ' + fails.length + ' 处（按实测数字改 core 里的 POOLS）：');
    fails.slice(0, 40).forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('✓ 容量表与实测一致');
}

if (process.argv.includes('pools')) { runPools(); process.exit(0); }

/* ---------- A. 生成器 / 判分 ---------- */
const t0 = Date.now();
const r = MT.selfTest(N);
const mods = MT.modules.map((x) => x.id + '(' + (x.kinds ? x.kinds.length + ' 类' : x.items.length + ' 题') + ')').join(' / ');

console.log('模块：' + mods);
console.log('题量：' + r.count + ' 题，用时 ' + (Date.now() - t0) + ' ms');
if (r.fails.length) {
  console.error('✗ ' + r.fails.length + ' 处失败：');
  r.fails.slice(0, 20).forEach((f) => console.error('  - ' + f));
  process.exit(1);
}

/* ---------- B. 今日任务规则 ---------- */
function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
const days = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(2026, 10, 13 + i); // 2026-11-13 起连续 7 天
  days.push(dayKey(d));
}
const pf = [];
const plans = days.map((k) => MT.planForDay(k, null));

// ① 同一天可复现
const p1 = MT.planForDay(days[0], null);
const p2 = MT.planForDay(days[0], null);
if (p1.seed !== p2.seed) pf.push('同一天 seed 不一致');
['drill', 'write', 'entry'].forEach((mod) => {
  const a = MT.dailyQueue(mod, p1).map((q) => q.prompt).join('|');
  const b = MT.dailyQueue(mod, p2).map((q) => q.prompt).join('|');
  if (a !== b) pf.push('同一天 ' + mod + ' 题单不一致');
});

// ② 7 天 seed 互不相同
if (new Set(plans.map((p) => p.seed)).size !== 7) pf.push('7 天 seed 有重复');

// ③④⑤ 题量 / 去重 / 题型
let qTotal = 0;
for (let i = 0; i < days.length; i++) {
  const k = days[i], p = plans[i];
  const want = { drill: 6, write: 8, entry: 3 };
  Object.keys(want).forEach((mod) => {
    const qs = MT.dailyQueue(mod, p);
    qTotal += qs.length;
    if (qs.length !== want[mod]) pf.push(k + ' ' + mod + ' 题量 ' + qs.length + '≠' + want[mod]);
    if (new Set(qs.map((q) => q.prompt + '|' + JSON.stringify(q.fields))).size !== qs.length) pf.push(k + ' ' + mod + ' 题干重复');
    qs.forEach((q, j) => {
      if (!q.prompt || /undefined|NaN/.test(q.prompt)) pf.push(k + ' ' + mod + '#' + j + ' 题干异常');
      if (mod !== 'entry' && q.kind !== p[mod].kinds[j]) pf.push(k + ' ' + mod + '#' + j + ' 题型不符（' + q.kind + '≠' + p[mod].kinds[j] + '）');
    });
  });
  // 基础快练必须含因式分解与解方程
  const dk = p.drill.kinds;
  if (dk.filter((x) => x === 'factor').length !== 2) pf.push(k + ' 因式分解不是 2 题');
  if (dk.filter((x) => x === 'eq').length !== 2) pf.push(k + ' 解方程不是 2 题');
  // 写解析式必须含顶点式 2 题
  if (p.write.kinds.filter((x) => x === 'vertex').length < 2) pf.push(k + ' 顶点式少于 2 题');
}

// ⑥ 主力轮换：连续「轮换池长度」天要覆盖全部主力题型（池子有 8 类就查 8 天）
//    轮换池以 MT 的 WRITE_ROT 为准（planForDay 里过滤掉不存在的题型），这里按 kinds 数量推天数
const ROT = MT.moduleById('write').kinds.map((k) => k.id);
const rotDays = [];
for (let i = 0; i < ROT.length; i++) rotDays.push(dayKey(new Date(2026, 10, 13 + i)));
const rotPlans = rotDays.map((k) => MT.planForDay(k, null));
const mains = rotPlans.map((p) => p.main);
if (new Set(mains).size !== ROT.length) pf.push('连续 ' + ROT.length + ' 天主力未覆盖全部题型：' + mains.join(','));
if (!MT.moduleById('write').kinds.some((k) => k.id === 'intercept')) pf.push('写解析式没有交点式题型');
if (mains.indexOf('intercept') < 0) pf.push(ROT.length + ' 天轮换里没有轮到交点式');

// ⑦ 弱项覆盖
const pw = MT.planForDay(days[0], 'profit');
if (pw.main !== 'profit') pf.push('弱项覆盖：主力没换成 profit');
if (pw.write.kinds.filter((x) => x === 'profit').length !== 4) pf.push('弱项覆盖：profit 不是 4 题');
if (!pw.weak) pf.push('弱项覆盖：weak 标记没置位');
const noWeak = MT.planForDay(days[0], null);
if (noWeak.weak) pf.push('无错题时 weak 标记不该置位');

console.log('今日题单：' + days.length + ' 天 × ' + (qTotal / days.length) + ' 题（主力：' + mains.join(' → ') + '）');
if (pf.length) {
  console.error('✗ 今日题单 ' + pf.length + ' 处失败：');
  pf.slice(0, 20).forEach((f) => console.error('  - ' + f));
  process.exit(1);
}

console.log('✓ 全部通过');
