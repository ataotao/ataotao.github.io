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
