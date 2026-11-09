// 化学思维脚手架 · 构建
// 用法：在本目录的上一级（化学/）执行  node 工具/build.mjs
// 作用：把 题库/2026-2027期中卷.json + 源/data/drill.json 注入 源/shell.html，
//       生成 化学/化学思维脚手架.html。产物不手改，改源后重跑本脚本。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const shell = read('源/shell.html');
const exam = JSON.parse(read('题库/2026-2027期中卷.json'));
const drill = JSON.parse(read('源/data/drill.json'));

if (!shell.includes('/*__DATA__*/')) {
  console.error('✗ 源/shell.html 缺少 /*__DATA__*/ 占位符');
  process.exit(1);
}

// 基本体检：题目结构是否齐全
const problems = [];
(exam.questions || []).forEach((q) => {
  if (q.type === 'choice') {
    if (!q.ans || !q.options || q.options.length !== 4) problems.push(`第${q.no}题选项/答案不完整`);
  } else if (q.type === 'fill') {
    if (!Array.isArray(q.blanks) || !q.blanks.length) problems.push(`第${q.no}题没有空`);
  } else {
    problems.push(`第${q.no}题 type 非法`);
  }
});
(drill.items || []).forEach((it) => {
  if (!Array.isArray(it.o) || it.o.length !== 4) problems.push(`闪练 ${it.id} 选项数不是 4`);
  if (typeof it.a !== 'number' || it.a < 0 || it.a > 3) problems.push(`闪练 ${it.id} 答案下标非法`);
});
if (problems.length) {
  console.error('✗ 数据体检未通过：\n  ' + problems.join('\n  '));
  process.exit(1);
}

const payload = JSON.stringify({ exam, drill }).replace(/<\/script/gi, '<\\/script');
const out = shell.replace('/*__DATA__*/', 'window.__DATA__=' + payload + ';');
const dest = path.join(root, '化学思维脚手架.html');
fs.writeFileSync(dest, out, 'utf8');

const kb = (fs.statSync(dest).size / 1024).toFixed(1);
const blanks = exam.questions.reduce((n, q) => n + (q.blanks ? q.blanks.length : 0), 0);
console.log(`✓ 化学思维脚手架.html  ${kb} KB`);
console.log(`  题目 ${exam.questions.length} 道（选择 ${exam.questions.filter(q => q.type === 'choice').length} / 填空 ${exam.questions.filter(q => q.type === 'fill').length}，共 ${blanks} 空）`);
console.log(`  闪练 ${drill.items.length} 题`);
