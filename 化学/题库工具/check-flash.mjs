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
//   ⑤ 11 个单元、全部题型都被覆盖（2024 新版教材：原⑩酸和碱+⑪盐化肥已合并）；⑥ 归一化边界。
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

/* 期望的 11 单元（人教版 2024 新版：上册 7 + 下册 4） */
const UNITS = ['intro', 'air', 'struct', 'water', 'eq', 'carbon', 'fuel', 'metal', 'sol', 'ab', 'life'];
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

/* 配平题：prompt 是与 HEAD 历史错题键一致的稳定基线（裸串条件、无 —→/↑/⟦⟧），
   display 承担富排版（⟦上|下⟧ + ↑）。wrongKey 用 normChem(prompt)[:90]、qid 用 prompt[:40]，
   prompt 改一个字就会让老错题失配，故把 6 条原始 prompt 冻结在这里防漂移。 */
const FROZEN_PROMPTS = [
  '配平：___H₂ ＋ O₂ 点燃 2H₂O，H₂ 前的系数是（填数字）',
  '配平：2KClO₃ MnO₂/Δ 2KCl ＋ ___O₂，O₂ 前的系数是（填数字）',
  '配平：Fe₃O₄ ＋ ___CO 高温 3Fe ＋ 4CO₂，CO 前的系数是（填数字）',
  '配平：2KMnO₄ Δ K₂MnO₄ ＋ MnO₂ ＋ ___O₂，O₂ 前的系数是（填数字）',
  '配平：C₂H₅OH ＋ ___O₂ 点燃 2CO₂ ＋ 3H₂O，O₂ 前的系数是（填数字）',
  '配平：___Al ＋ 3CuSO₄ Al₂(SO₄)₃ ＋ 3Cu，Al 前的系数是（填数字）'
];
const balanceQs = new Map();
for (let i = 1; i <= 600; i++) {
  const q = CH.gen('eq', 'balance', i);
  if (q && q.id === 'eq.balance') balanceQs.set(q.prompt, q.display);
}
if (balanceQs.size !== FROZEN_PROMPTS.length) {
  console.error(`✗ 配平题模板数异常：期望 ${FROZEN_PROMPTS.length}，实际 ${balanceQs.size}`);
  process.exit(1);
}
for (const p of FROZEN_PROMPTS) {
  if (!balanceQs.has(p)) {
    console.error('✗ 配平题稳定键漂移（老错题会失配）：' + p);
    process.exit(1);
  }
}
let marked = 0;
for (const [p, d] of balanceQs) {
  if (/—[^→]+→|⟦|⟧/.test(p)) { console.error('✗ prompt 混入了显示标记：' + p); process.exit(1); }
  if (p.indexOf('↑') >= 0) { console.error('✗ prompt 混入了显示用 ↑：' + p); process.exit(1); }
  if (d && d.indexOf('⟦') >= 0) marked++;
}
const kclo3Display = balanceQs.get(FROZEN_PROMPTS[1]) || '';
if (marked !== 5 || kclo3Display.indexOf('⟦MnO₂|△⟧') < 0 || kclo3Display.indexOf('O₂↑') < 0) {
  console.error('✗ 配平题富排版 display 异常：期望 5 道带标记、KClO₃ 上 MnO₂ 下 △ 且标 ↑');
  process.exit(1);
}
/* KMnO₄ 题答案为 1：配平填空「系数是几」答 1 是人教 P122 T6 配套习题口径，不是出题错误；
   display 已按书写规范省略系数 1（写 O₂↑ 而非 1O₂↑）。冻结此断言防将来误改。 */
{
  let found = false;
  for (let i = 1; i <= 600; i++) {
    const q = CH.gen('eq', 'balance', i);
    if (q && q.prompt === FROZEN_PROMPTS[3]) {
      const a = q.fields[0].ans;
      if (a !== 1) { console.error('✗ KMnO₄ 题系数应为 1，实际 ' + a); process.exit(1); }
      if (q.display.indexOf('1O₂') >= 0) { console.error('✗ display 不应出现 1O₂'); process.exit(1); }
      found = true; break;
    }
  }
  if (!found) { console.error('✗ 未找到 KMnO₄ 配平题'); process.exit(1); }
}

/* 微粒结构示意图（struct.diagram，2026-11-23 补）：
   prompt 必须保持纯文本（错题键 = normChem(prompt)[:90]，混入 ⟦⟧ 会让老错题失配且题干难读），
   display 必须带 ⟦sd:z|e,e⟧ 标记交给 rich() 画 SVG，且不能残留纯文本示意图。 */
{
  const seen = new Set();
  for (let i = 1; i <= 800; i++) {
    const q = CH.gen('struct', 'diagram', i * 7919);
    if (!q || q.id !== 'struct.diagram') { console.error('✗ struct.diagram 没有出题'); process.exit(1); }
    if (/⟦|⟧/.test(q.prompt)) { console.error('✗ 结构示意图 prompt 混入显示标记：' + q.prompt); process.exit(1); }
    if (!q.display || q.display.indexOf('⟦sd:') < 0) {
      console.error('✗ 结构示意图 display 缺 ⟦sd:z|e,e⟧ 标记：' + q.prompt);
      process.exit(1);
    }
    if (/（＋\d+）/.test(q.display)) { console.error('✗ display 仍残留纯文本示意图：' + q.prompt); process.exit(1); }
    seen.add(q.prompt.slice(0, 12));
  }
  if (seen.size < 5) {
    console.error(`✗ 结构示意图问法只有 ${seen.size} 种，期望 5 种（元素种类/粒子种类/周期/得失电子/写符号）`);
    process.exit(1);
  }
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
