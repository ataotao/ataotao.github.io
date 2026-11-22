#!/usr/bin/env node
// 化学方程式专项 · 出题 / 判分 / 覆盖自检
//
// 用法（仓库根执行）：
//   node 化学/题库工具/check-focus.mjs            每类 200 题
//   node 化学/题库工具/check-focus.mjs 500        每类 500 题
//
// 从产物抽出 <script id="core">，在 node vm 里跑：
//   ① 每类批量出题、题干/字段/解析合法；② 正确解判对、错误解判错；
//   ③ 3 模块 14 题型齐全；④ 大小写敏感（Na ≠ na）与上下标归一化；
//   ⑤ 今日错题库里的已知答案仍在（Fe₃O₄+CO=4、KClO₃=3、7.9g KMnO₄→0.8g）。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '化学', '化学方程式专项.html');
const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a))) || 200;

const html = readFileSync(FILE, 'utf8');
const coreM = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const uiM = html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if (!coreM || !uiM) {
  console.error('✗ 找不到 <script id="core"> / <script id="ui">');
  process.exit(1);
}
try {
  new vm.Script(coreM[1], { filename: '化学方程式专项.core.js' });
  new vm.Script(uiM[1], { filename: '化学方程式专项.ui.js' });
} catch (e) {
  console.error('✗ core / ui 语法错误：' + e.message);
  process.exit(1);
}
const ctx = { console, Set, Math, JSON, Date };
vm.createContext(ctx);
try { vm.runInContext(coreM[1], ctx, { filename: '化学方程式专项.core.js' }); }
catch (e) { console.error('✗ core 运行错误：' + e.message); process.exit(1); }
const CF = ctx.CF;
if (!CF || typeof CF.selfTest !== 'function') { console.error('✗ 没有拿到 CF.selfTest'); process.exit(1); }

const MODULES = ['base', 'balance', 'apply'];
const got = CF.modules.map((m) => m.id);
if (got.join(',') !== MODULES.join(',')) {
  console.error('✗ 模块注册表不对：期望 ' + MODULES.join('/') + '，实际 ' + got.join('/'));
  process.exit(1);
}
const KINDS = {
  base: ['symbol', 'name', 'ion', 'ionrule', 'period'],
  balance: ['lcm', 'odd', 'observe', 'setone', 'method', 'check'],
  apply: ['write', 'writeout', 'calc', 'massrel']
};
CF.modules.forEach((m) => {
  const want = KINDS[m.id];
  const actual = m.kinds.map((k) => k.id);
  if (actual.join(',') !== want.join(',')) {
    console.error(`✗ ${m.id} 题型不对：期望 ${want.join('/')}，实际 ${actual.join('/')}`);
    process.exit(1);
  }
});

const r = CF.selfTest(N);
if (r.fails.length) {
  console.error(`✗ ${r.fails.length} 个问题（共生成 ${r.count} 题）：`);
  r.fails.slice(0, 25).forEach((f) => console.error('  · ' + f));
  if (r.fails.length > 25) console.error(`  … 另 ${r.fails.length - 25} 条`);
  process.exit(1);
}

/* 归一化：离子上下标要能打通，元素符号大小写必须敏感 */
const cases = [
  ['Mg²⁺', 'Mg2+', true], ['Mg²⁺', 'Ｍｇ２＋', true],
  ['SO₄²⁻', 'so42-', false], ['Na₂CO₃', 'Na₂CＯ₃', true],
  ['Na', 'na', false], ['Na', 'NA', false], ['Na', 'Na', true]
];
for (const [ans, input, want] of cases) {
  const ok = CF.normChem(input) === CF.normChem(ans);
  if (ok !== want) { console.error(`✗ 归一化 ${ans} vs ${input} 期望 ${want} 得到 ${ok}`); process.exit(1); }
}
const qsym = { fields: [{ type: 'text', ans: 'Na' }] };
if (!CF.judge(qsym, ['Na']).ok || CF.judge(qsym, ['na']).ok || CF.judge(qsym, ['NA']).ok) {
  console.error('✗ 元素符号大小写判分异常'); process.exit(1);
}
const qion = { fields: [{ type: 'text', ans: 'Al³⁺', alts: ['Al3+'] }] };
if (!CF.judge(qion, ['Al3+']).ok || !CF.judge(qion, ['Al³⁺']).ok || CF.judge(qion, ['Al²⁺']).ok) {
  console.error('✗ 离子符号判分异常'); process.exit(1);
}
for (const [v, want] of [['7', true], [7, true], ['７', true], ['8', false], ['abc', false]]) {
  if (CF.judge({ fields: [{ type: 'num', ans: 7, tol: 0.01 }] }, [v]).ok !== want) {
    console.error(`✗ 数值判分 ${v} 期望 ${want}`); process.exit(1);
  }
}

/* 今日错题里的已知答案必须在题库里（回归护栏）。按 prompt 前缀精确取，不依赖 allKinds 顺序 */
const bankAnswers = [];
CF.allKinds.forEach((k) => {
  for (let i = 0; i < 600; i++) {
    const q = CF.gen(k.mod, k.kind, i + 1);
    bankAnswers.push(q.prompt + '|' + q.fields.map((f) => CF.ansText(f)).join(','));
  }
});
function anchor(prefix, answer, label) {
  const hits = bankAnswers.filter((s) => s.indexOf(prefix) === 0);
  if (!hits.length) { console.error('✗ 题库缺少今日弱项锚点：' + label); process.exit(1); }
  if (!hits.every((s) => s.indexOf('|' + answer) >= 0)) {
    console.error(`✗ ${label} 答案应为 ${answer}，实际 ` + hits[0]); process.exit(1);
  }
}
anchor('配平（观察法）：Fe₃O₄', '4', 'Fe₃O₄+CO 系数');
anchor('配平（最小公倍数法）：2KClO₃', '3', 'KClO₃ 的 O₂ 系数');
anchor('加热分解 7.9 g 高锰酸钾', '0.8g', '7.9g KMnO₄ → O₂');
anchor('完全分解 68 g 过氧化氢', '32g', '68g H₂O₂ → O₂');
anchor('完全分解 36 g 水', '32g', '36g 水 → O₂');
anchor('加热高锰酸钾制氧气：写出生成物的化学式', 'K₂MnO₄＋MnO₂＋O₂', '默写高锰酸钾分解生成物');

console.log(`✓ 化学专项自检通过：${r.modules} 个模块 / ${r.kinds} 类题型，每类 ${N} 题共 ${r.count} 题`);
console.log('  出题 / 题干 / 答案 / 判分 / 解析 / 大小写敏感 / 今日错题锚点全部通过');
