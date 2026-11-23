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
  base: ['symbol', 'name', 'period', 'ion', 'ionrule'],
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

/* pools 模式：重扫题库，校验 core 的 POOLS 容量表没漂移（页面「覆盖 a/b」的分母）
     node 化学/题库工具/check-focus.mjs pools
   口径 = 题干前 40 字去重，与内核 sigOf 同一把尺子；另按内核 enumerateKind 的 seed
   范围（1..1200）再算一遍，确保「练未覆盖」能把整池枚举出来。 */
if (args.includes('pools')) {
  const bad = [];
  let fixedSum = 0;
  for (const k of CF.allKinds) {
    if (typeof CF.kindPool !== 'function') { console.error('✗ core 没导出 kindPool'); process.exit(1); }
    const declared = CF.kindPool(k.mod, k.kind);
    const set = new Set(), kernelSet = new Set();
    for (let i = 1; i <= 6000; i++) {
      const q = CF.gen(k.mod, k.kind, i);
      if (!q || !q.prompt) continue;
      const key = String(q.prompt).slice(0, 40);
      set.add(key);
      if (i <= 1200) kernelSet.add(key);
    }
    if (declared === -1) { if (set.size < 200) bad.push(`${k.mod}.${k.kind} 标为不限但只有 ${set.size} 道`); }
    else if (set.size !== declared) bad.push(`${k.mod}.${k.kind} 表里 ${declared}，实测 ${set.size}`);
    else if (kernelSet.size !== declared) bad.push(`${k.mod}.${k.kind} 内核只枚举到 ${kernelSet.size} 道，表里 ${declared}`);
    else fixedSum += set.size;
  }
  if (bad.length) {
    console.error(`✗ POOLS 容量表漂移 ${bad.length} 处：`);
    bad.forEach((b) => console.error('  · ' + b));
    process.exit(1);
  }
  console.log(`✓ 题库容量表一致：${CF.allKinds.length} 类题型共 ${fixedSum} 道`);
  process.exit(0);
}

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

/* 配平题：prompt 保持稳定；有 —条件→ 的题，display 用 ⟦上|下⟧ 把条件排到箭头上下 */
let focusDisplayMissing = 0, focusShouldMark = 0, focusMarked = 0;
for (const kind of ['lcm', 'odd', 'observe', 'setone']) {
  for (let i = 1; i <= 200; i++) {
    const q = CF.gen('balance', kind, i);
    const hasCond = !!q && q.prompt.indexOf('—') >= 0;
    if (hasCond) focusShouldMark++;
    if (!q || q.prompt.indexOf('⟦') >= 0 || !q.display) { focusDisplayMissing++; continue; }
    if (hasCond !== (q.display.indexOf('⟦') >= 0)) focusDisplayMissing++;
    if (q.display.indexOf('⟦') >= 0) focusMarked++;
  }
}
if (focusDisplayMissing || focusMarked !== focusShouldMark) {
  console.error(`✗ 配平题富排版 display 异常：缺 ${focusDisplayMissing}，标记 ${focusMarked}/${focusShouldMark}`);
  process.exit(1);
}

/* 配平四法·方法细则卡：四种方法都要有操作步骤与例题，例题的配平结果必须原子守恒
   （给孩子看的方法示范，学科错误比出题错误更误导，故做逐元素验算护栏）。
   只核对已展示的 4 道固定例题原文，避免引入通用化学式解析器。 */
const balanceMod = CF.modules.find((m) => m.id === 'balance');
const guidedKinds = balanceMod.kinds.filter((k) => k.guide);
if (guidedKinds.length !== 4) {
  console.error(`✗ 配平四法方法细则缺失：期望 4 种，实际 ${guidedKinds.length}`);
  process.exit(1);
}
/* 四道示范例题的配平结果原文已逐元素人工验算（见下方 atoms 注释），
   这里把结果原文冻结成护栏：一旦被改动就必须重新验算，防止错误示范误导孩子。
     P+5O₂→2P₂O₅：P 4=4、O 10=10
     2C₂H₂+5O₂→4CO₂+2H₂O：C 4=4、H 4=4、O 10=8+2
     Fe₂O₃+3CO→2Fe+3CO₂：Fe 2=2、C 3=3、O 6=6
     C₂H₅OH+3O₂→2CO₂+3H₂O：C 2=2、H 6=6、O 7=4+3                         */
const guideExamples = {
  '最小公倍数法': '4P + 5O₂ —点燃→ 2P₂O₅',
  '奇数配偶法': '2C₂H₂ + 5O₂ —点燃→ 4CO₂ + 2H₂O',
  '观察法': 'Fe₂O₃ + 3CO —高温→ 2Fe + 3CO₂',
  '定一法': 'C₂H₅OH + 3O₂ —点燃→ 2CO₂ + 3H₂O'
};
let guideSeen = 0;
for (const k of guidedKinds) {
  const g = k.guide;
  if (!g.steps || g.steps.length < 3 || !g.example || !g.example.q || !g.example.steps || !g.example.steps.length || !g.example.a) {
    console.error(`✗ ${k.name} 方法细则不完整（步骤/例题缺失）`);
    process.exit(1);
  }
  const want = guideExamples[k.name];
  if (!want || g.example.a !== want) {
    console.error(`✗ ${k.name} 示范例题配平结果变更，需重新逐元素验算：${g.example.a}`);
    process.exit(1);
  }
  guideSeen++;
}
if (guideSeen !== 4) { console.error('✗ 示范例题覆盖不全'); process.exit(1); }

/* 最小公倍数法·引导式例题：每步先问后答、题数合理；即时练手题配平结果冻结验算
   （4Al+3O₂→2Al₂O₃：Al 4=4、O 6=6）。这是给孩子照着走的示范，错一步就带偏。 */
const lcmGuide = guidedKinds.find((k) => k.id === 'lcm').guide;
const walk = lcmGuide.example.walk || [];
if (walk.length !== 5) {
  console.error(`✗ 引导式例题步数异常：期望 5，实际 ${walk.length}`);
  process.exit(1);
}
for (const [i, w] of walk.entries()) {
  if (!w.ask || !w.reveal || !/[？?]$/.test(w.ask)) {
    console.error(`✗ 引导式例题第 ${i + 1} 步缺少问题或思路（问题须以问号结尾）`);
    process.exit(1);
  }
}
const tryIt = lcmGuide.example.try;
if (!tryIt || !tryIt.q || !tryIt.steps || !tryIt.steps.length || tryIt.a !== '4Al + 3O₂ —点燃→ 2Al₂O₃') {
  console.error(`✗ 即时练手题缺失或配平结果变更：${tryIt && tryIt.a}`);
  process.exit(1);
}

console.log(`✓ 化学专项自检通过：${r.modules} 个模块 / ${r.kinds} 类题型，每类 ${N} 题共 ${r.count} 题`);
console.log('  配平四法方法细则 4 种齐全，示范例题配平结果已冻结验算');
console.log('  引导式例题 5 步先问后答 + 1 道即时练手，配平结果已冻结验算');
console.log('  出题 / 题干 / 答案 / 判分 / 解析 / 大小写敏感 / 今日错题锚点全部通过');
