#!/usr/bin/env node
// 数学训练脚手架 · 题生成器自检
//
// 用法：node 数学/题库工具/check-training.mjs [每类题数]
// 期望：末尾打印「✓ 全部通过」，退出码 0。
//
// 它从 数学/数学训练脚手架.html 里抽出 <script id="core">（纯逻辑层，不碰 DOM），
// 在 node 里跑 MT.selfTest：每个生成器各出 N 题，断言
//   ① 题干里没有 undefined/NaN；② 答案都是有限数、选项下标不越界；
//   ③ 正确解必须判对；④ 把答案 +1 之后必须判错。
// 所以它同时守两件事：生成器不产生坏题、判分器不把对判错。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '数学', '数学训练脚手架.html');
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
  new vm.Script(m[1], { filename: '数学训练脚手架.core.js' });
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
console.log('✓ 全部通过');
