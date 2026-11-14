#!/usr/bin/env node
// 数学 · 题包结构自检（读的是 HTML 里**已经注入**的 PACKS，不是题库 JSON）
//
// 用法：node 数学/题库工具/check-pack.mjs [packId]
//   packId 省略 = 检查 HTML 里的全部题包。
// 期望：末尾打印「✓ 全部通过」，退出码 0。
//
// 它和 `python 数学/题库工具/qb.py verify` 的分工：
//   qb.py verify 读题库 JSON，查「源」的形状与一致性；
//   本脚本读 函数思维脚手架.html 里注入的 PACKS，查「产物」——能抓到「改了 JSON 忘了 build」
//   这类源/产物漂移（此时 HTML 里还是旧数据），以及选项越界、占位符与答案个数不符等
//   会让页面判分失效的问题。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, '数学', '函数思维脚手架.html');
const WANT = process.argv[2] || '';

const html = readFileSync(FILE, 'utf8');
const s = html.indexOf('var PACKS = [');
const e = html.indexOf('/* DRILLS:BEGIN */', s);
if (s < 0 || e < 0) {
  console.error('✗ HTML 里找不到 `var PACKS = [` 或 `/* DRILLS:BEGIN */`，结构被改坏了？');
  process.exit(1);
}
let PACKS;
try {
  PACKS = new Function(html.slice(s, e) + '; return PACKS;')();
} catch (err) {
  console.error('✗ PACKS 块无法求值：' + err.message);
  process.exit(1);
}

const bad = (tag, msg) => errs.push(tag + '：' + msg);
let errs = [];
let nQ = 0;

/* 选项有两种写法：字符串，或 {t, plot}（带图选项，t 是文字说明） */
function optText(o) {
  if (typeof o === 'string') return o;
  if (o && typeof o === 'object') {
    if (typeof o.t === 'string') return o.t;
    if (o.plot) return '[图]' + JSON.stringify(o.plot);
  }
  return null;
}

function checkChoice(tag, f) {
  if (!Array.isArray(f.options) || f.options.length < 2) return bad(tag, '选项少于 2 个');
  if (!Number.isInteger(f.ans) || f.ans < 0 || f.ans >= f.options.length) return bad(tag, 'ans 越界（' + f.ans + '）');
  const texts = f.options.map(optText);
  if (texts.some((t) => t == null || !String(t).trim())) bad(tag, '有无法识别的空白选项');
  if (new Set(texts).size !== texts.length) bad(tag, '选项有重复');
}

function checkField(tag, f, i) {
  const t = tag + '#' + i;
  if (!f || typeof f !== 'object') return bad(t, '字段不是对象');
  if (f.type === 'choice') return checkChoice(t, f);
  if (f.type === 'num') {
    if (typeof f.ans !== 'number' || !isFinite(f.ans)) bad(t, 'num 的 ans 不是有限数');
    return;
  }
  if (f.type === 'coef') {
    if (!Array.isArray(f.ans) || !f.ans.length) return bad(t, 'coef 的 ans 不是非空数组');
    if (f.ans.some((x) => typeof x !== 'number' || !isFinite(x))) bad(t, 'coef 的 ans 含非数字');
    if (!f.tpl || f.tpl.split('{').length - 1 !== f.ans.length) bad(t, 'coef 的 tpl 占位符个数与 ans 不符');
    return;
  }
  bad(t, '未知字段类型 ' + f.type);
}

const packs = PACKS.filter((p) => !WANT || p.id === WANT);
if (!packs.length) {
  console.error('✗ HTML 里没有题包 ' + (WANT || '（空）'));
  process.exit(1);
}

for (const p of packs) {
  const tag0 = p.id;
  if (!Array.isArray(p.questions) || !p.questions.length) { bad(tag0, '没有题目'); continue; }
  const ids = new Set();
  let total = 0, scored = 0;
  for (const q of p.questions) {
    nQ++;
    const tag = tag0 + ' 第 ' + (q.no || '?') + ' 题';
    if (!q.id || ids.has(q.id)) bad(tag, '题目 id 缺失或重复（' + q.id + '）');
    ids.add(q.id);
    if (!q.ask || !String(q.ask).trim()) bad(tag, '题干为空');
    for (const txt of [q.ask, q.tip, ...(q.solution || [])]) {
      if (typeof txt === 'string' && /undefined|NaN/.test(txt)) bad(tag, '文本里出现 undefined / NaN');
    }
    if (q.score != null) {
      if (typeof q.score !== 'number' || !(q.score > 0)) bad(tag, 'score 不是正数');
      else { scored++; total += q.score; }
    }
    if (!Array.isArray(q.kp) || !q.kp.length || q.kp.some((k) => typeof k !== 'string' || !k)) bad(tag, 'kp 缺失或不是非空字符串数组');
    if (!q.formula || !String(q.formula).trim()) bad(tag, 'formula（应用公式）为空');
    if (!Array.isArray(q.solution) || !q.solution.length) bad(tag, 'solution（解析）为空');

    if (q.selfCheck) {
      /* 自评题（作图/说理）本来就没有判分字段，只要求有参考答案 */
    } else if (q.type === 'choice') {
      checkChoice(tag, { options: q.opts, ans: q.ans });
    } else if (q.type === 'fill' || q.type === 'solve') {
      const fields = q.steps ? q.steps : (q.fields || []);
      if (!fields.length) bad(tag, '没有判分字段');
      fields.forEach((f, i) => checkField(tag, f, i));
      if (q.steps && q.score != null) {
        const pts = q.steps.reduce((a, x) => a + (x.pt || 0), 0);
        if (Math.abs(pts - q.score) > 1e-9) bad(tag, '分步 pt 合计 ' + pts + ' ≠ score ' + q.score);
      }
    } else {
      bad(tag, '未知题型 ' + q.type);
    }

    if (q.fig) {
      if (!(q.fig.w > 0 && q.fig.h > 0)) bad(tag, 'fig 的 w/h 不是正数');
      if (typeof q.fig.svg !== 'string' || !/^\s*</.test(q.fig.svg)) bad(tag, 'fig.svg 为空或不是 SVG 片段');
      else {
        /* 截图类 fig 的 base64 里可能碰巧出现 NaN / undefined，扫之前先把 href 数据摘掉 */
        const clean = q.fig.svg.replace(/href="[^"]*"/g, '');
        if (/NaN|undefined|<script/i.test(clean)) bad(tag, 'fig.svg 含 NaN / undefined / script');
      }
    }
    if (q.hand) {
      /* 答卷手写附图：{w, h, svg:'<image href="data:image/webp;base64,…"/>'} */
      if (!(q.hand.w > 0 && q.hand.h > 0)) bad(tag, 'hand 的 w/h 不是正数');
      if (typeof q.hand.svg !== 'string' || !/<image\b/i.test(q.hand.svg)) bad(tag, 'hand.svg 里没有 <image>');
      else if (!/href="data:image\//.test(q.hand.svg)) bad(tag, 'hand.svg 的 <image> 没有内联图片（href="data:image/…"）');
    }
  }
  console.log('  ' + tag0.padEnd(18) + ' ' + p.questions.length + ' 题' +
    (scored ? '，满分 ' + total + ' 分（' + scored + ' 题有分值）' : '，分值未录'));
}

console.log('题包 ' + packs.length + ' 套 / ' + nQ + ' 题');
if (errs.length) {
  console.error('✗ ' + errs.length + ' 处问题：');
  errs.slice(0, 40).forEach((x) => console.error('  - ' + x));
  process.exit(1);
}
console.log('✓ 全部通过');
