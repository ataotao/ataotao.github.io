// 由 考点数据.json + core-template.html 生成两个单文件训练器
// 用法： node 工具/build.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = readFileSync(join(root, '工具', 'core-template.html'), 'utf8');
const MARK = '/*DATA*/null';

const jobs = [
  { dir: '道德与法治', out: '核心考点训练.html' },
  { dir: '历史', out: '核心考点训练.html' },
];

for (const j of jobs) {
  const dataPath = join(root, j.dir, '考点数据.json');
  if (!existsSync(dataPath)) { console.warn('跳过（没有数据）', dataPath); continue; }
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const cards = data.cards || [];
  if (!cards.length) { console.warn('跳过（数据为空）', dataPath); continue; }

  // 校验
  const ids = new Set();
  const errs = [];
  cards.forEach((c, i) => {
    const where = `第${i + 1}张(${c.id || '无id'})`;
    if (!c.id) errs.push(where + ' 缺 id');
    if (!c.q) errs.push(where + ' 缺 q');
    if (ids.has(c.id)) errs.push(where + ' id 重复');
    ids.add(c.id);
    const all = (c.a || []).concat(c.table ? c.table.rows.flat() : []);
    all.forEach(t => {
      const l = (t.match(/【/g) || []).length, r = (t.match(/】/g) || []).length;
      if (l !== r) errs.push(where + ' 【】不成对：' + t.slice(0, 30));
    });
  });
  if (errs.length) { console.error('❌ ' + j.dir + ' 校验失败：\n' + errs.slice(0, 20).join('\n')); process.exitCode = 1; continue; }

  const payload = JSON.stringify({
    subject: data.subject,
    title: data.title,
    imgBase: data.imgBase ?? 'images/',
    imgPrefix: data.imgPrefix ?? '',
    cards,
  });
  if (!tpl.includes(MARK)) { console.error('模板缺少 DATA 标记'); process.exitCode = 1; break; }
  const html = tpl.replace(MARK, payload);
  const outPath = join(root, j.dir, j.out);
  writeFileSync(outPath, html, 'utf8');
  const cls = cards.filter(c => ((c.a || []).join('') + JSON.stringify(c.table || {})).includes('【')).length;
  console.log(`✅ ${j.dir}/${j.out}  ${cards.length} 张卡（可挖空 ${cls} 张，${cards.length - cls} 张只能翻卡）  ${(html.length / 1024).toFixed(0)} KB`);
}
