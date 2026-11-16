#!/usr/bin/env node
// 化学闪练卡 · 出题 / 判分 / 覆盖自检
//
// 用法：
//   node 化学/题库工具/check-flash.mjs            每类 200 题，跑 CH.selfTest
//   node 化学/题库工具/check-flash.mjs 500        每类 500 题
//
// 从 化学/化学闪练卡.html 抽出 <script id="core">（纯逻辑层，不碰 DOM），在 node vm 里跑：
//   ① 每个生成器各出 N 题，题干无 undefined/NaN；② 字段合法、选项不重复；
//   ③ 解析 / 考点齐全；④ 正确解判对、错误解判错；
//   ⑤ 12 个单元、全部题型都被覆盖；⑥ 归一化边界（全角 / 下标 / 正负号）。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '化学', '化学闪练卡.html');
const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a))) || 200;

const html = readFileSync(FILE, 'utf8');
const coreM = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const uiM = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM || !uiM) {
  console.error('✗ 找不到 <script id="core"> / <script id="ui">，文件结构被改坏了？');
  process.exit(1);
}
try {
  new vm.Script(coreM[1], { filename: '化学闪练卡.core.js' });
  new vm.Script(uiM[1], { filename: '化学闪练卡.ui.js' });
} catch (e) {
  console.error('✗ core / ui 脚本语法错误：' + e.message);
  process.exit(1);
}

const ctx = { console, Set, Math, JSON, Date };
vm.createContext(ctx);
try {
  vm.runInContext(coreM[1], ctx, { filename: '化学闪练卡.core.js' });
} catch (e) {
  console.error('✗ 核心脚本运行错误：' + e.message);
  process.exit(1);
}
const CH = ctx.CH;
if (!CH || typeof CH.selfTest !== 'function') {
  console.error('✗ 没有拿到 CH.selfTest');
  process.exit(1);
}

/* 期望的 12 单元（人教版初三全考点） */
const UNITS = ['intro', 'air', 'struct', 'water', 'eq', 'carbon', 'fuel', 'metal', 'sol', 'ab', 'salt', 'life'];
const got = CH.modules.map((m) => m.id);
if (got.length !== UNITS.length || UNITS.some((u, i) => got[i] !== u)) {
  console.error('✗ 单元注册表不对：期望 ' + UNITS.join('/') + '，实际 ' + got.join('/'));
  process.exit(1);
}

const r = CH.selfTest(N);
if (r.fails.length) {
  console.error(`✗ ${r.fails.length} 个问题（共生成 ${r.count} 题）：`);
  r.fails.slice(0, 25).forEach((f) => console.error('  · ' + f));
  if (r.fails.length > 25) console.error(`  … 另 ${r.fails.length - 25} 条`);
  process.exit(1);
}

/* 归一化边界用例 */
const cases = [
  ['Mg²⁺', 'Mg2+', true], ['Mg²⁺', 'Ｍｇ２＋', true],
  ['Al³⁺', 'al3+', true], ['Fe₃O₄', 'Fe3O4', true],
  ['Ca(OH)₂', 'ca(oh)2', true], ['CO₂', 'CO₂', true],
  ['SO₄²⁻', 'so42-', true], ['Na₂CO₃', 'Na₂CＯ₃', true],
  ['Mg²⁺', 'Mg⁺', false], ['Fe₃O₄', 'Fe₂O₃', false]
];
for (const [ans, input, want] of cases) {
  const ok = CH.normChem(input) === CH.normChem(ans);
  if (ok !== want) {
    console.error(`✗ 归一化用例 ${ans} vs ${input} 期望 ${want} 得到 ${ok}`);
    process.exit(1);
  }
}

/* 判分边界：数值 / 文本 / 选择 */
const qnum = { fields: [{ type: 'num', ans: 7, tol: 0.01 }] };
for (const [v, want] of [['7', true], [7, true], ['７', true], ['8', false], ['abc', false]]) {
  const got = CH.judge(qnum, [v]).ok;
  if (got !== want) { console.error(`✗ 数值判分 ${v} 期望 ${want} 得到 ${got}`); process.exit(1); }
}
const qtext = { fields: [{ type: 'text', ans: 'Al³⁺', alts: ['Al3+'] }] };
if (!CH.judge(qtext, ['Al3+']).ok || CH.judge(qtext, ['Al²⁺']).ok) {
  console.error('✗ 文本判分（符号）异常'); process.exit(1);
}

console.log(`✓ 化学闪练卡自检通过：${r.modules} 个单元 / ${r.kinds} 类题型，每类 ${N} 题共 ${r.count} 题`);
console.log('  生成器 / 题干 / 答案 / 判分 / 考点解析 / 归一化边界全部通过');
