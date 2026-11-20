/* 背诵训练卡构建：JSON 真源 → 单文件 HTML（file:// 可直接打开）
 * 用法：node 语文/数据/build.mjs
 * 产物：语文/背诵训练卡.html —— 不手改，改 JSON 或模板后重建。
 * 数据真源：
 *   课标必背60篇.json          —— 课标清单 + 学期映射（校验基准）
 *   背诵-文言文.json / 背诵-诗词.json / 背诵-现代文.json —— 原有篇目
 *   背诵-七上.json / 七下八上.json / 八下.json / 九上补.json / 九下.json —— 补齐篇目
 *   背诵-考点.json             —— 按中考命题规则整理的考点默写题（样板：出师表）
 * 共享内核：
 *   工具/trainer/review.js     —— 统一错题回炉内核（ADR-0010），内联进产物
 *   工具/trainer/merge.mjs     —— 事件并集合并（导入/云同步共用，ADR-0007）
 *   工具/trainer/sync.mjs      —— 云同步编排（拉全部→合并→写回）
 *   工具/trainer/sync-adapter.mjs —— GitHub Contents API 网络薄适配层
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const tplPath = join(here, '背诵训练卡.template.html');
const outPath = join(root, '语文', '背诵训练卡.html');

const DATA_FILES = [
  '背诵-文言文.json', '背诵-诗词.json', '背诵-现代文.json',
  '背诵-七上.json', '背诵-七下八上.json', '背诵-八下.json',
  '背诵-九上补.json', '背诵-九下.json'
];

function loadJSON(name) {
  const p = join(here, name);
  if (!existsSync(p)) throw new Error(`缺数据文件 ${name}（后台任务可能还没写完）`);
  const data = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${name} 顶层必须是数组`);
  return data;
}

const catalog = loadJSON('课标必背60篇.json');
const byId = new Map(catalog.map(x => [x.id, x]));
const all = [];
const seen = new Set();
for (const f of DATA_FILES) {
  for (const p of loadJSON(f)) {
    if (seen.has(p.id)) throw new Error(`重复 id: ${p.id}（${f}）`);
    seen.add(p.id);
    // 课标篇目：注入权威的学期/序号/标注；非课标篇目：保留真源里的 level，补 term
    const c = byId.get(p.id);
    if (c) {
      p.level = '中考必背';
      p.term = c.term;
      p.no = c.no;
      p.unit = c.term + ' 课标必背';
    } else {
      p.level = p.level || '教材必背';
      p.term = p.term || (/九上/.test(p.unit || '') ? '九上' : '拓展');
      p.no = p.no || 0;
    }
    all.push(p);
  }
}

// 校验 1：课标 60 篇必须齐全
const missing = catalog.filter(c => !seen.has(c.id));
if (missing.length) {
  console.error(`✗ 课标必背缺 ${missing.length} 篇：`, missing.map(x => `${x.no}.${x.name}`).join('、'));
  process.exit(1);
}

// 校验 2：pinyin[].w 与 keys[] 必须能在 text 中原样找到；字段齐全
let issues = 0;
for (const p of all) {
  for (let i = 0; i < p.paras.length; i++) {
    const t = p.paras[i].text;
    for (const x of p.paras[i].pinyin || []) {
      if (t.indexOf(x.w) < 0) { console.error(`✗ ${p.id} 段${i + 1} 注音「${x.w}」不在原文`); issues++; }
    }
    for (const k of p.paras[i].keys || []) {
      if (t.indexOf(k) < 0) { console.error(`✗ ${p.id} 段${i + 1} 挖空「${k}」不在原文`); issues++; }
    }
  }
}
if (issues) { console.error(`共 ${issues} 处问题，构建中止`); process.exit(1); }

// 考点题：合并主文件 + 所有分片（背诵-考点-*.json），按 id 去重
const EXAM_MAIN = '背诵-考点.json';
const examShards = [EXAM_MAIN, ...readdirSync(here).filter(f => /^背诵-考点-.*\.json$/.test(f)).sort()];
const exam = [];
const examIds = new Set();
for (const f of examShards) {
  for (const book of loadJSON(f)) {
    if (examIds.has(book.id)) { console.error(`✗ 考点篇目重复：${book.id}（${f}）`); process.exit(1); }
    examIds.add(book.id);
    exam.push(book);
  }
}

// 校验 3：考点题——答案必须逐字来自对应篇目的对应段原文；trap 必须在答案里
const norm = s => String(s || '').replace(/[\s，。！？；：、,'"“”‘’·—…（）()／/]/g, '');
const byIdAll = new Map(all.map(p => [p.id, p]));
for (const book of exam) {
  const piece = byIdAll.get(book.id);
  if (!piece) { console.error(`✗ 考点题引用了不存在的篇目 ${book.id}`); process.exit(1); }
  book.items.forEach((it, i) => {
    const para = piece.paras[it.para];
    if (!para) { console.error(`✗ 考点 ${book.id} 题${i + 1} 段号 ${it.para} 越界`); issues++; return; }
    if (norm(para.text).indexOf(norm(it.ans)) < 0) {
      console.error(`✗ 考点 ${book.id} 题${i + 1} 答案「${it.ans}」不在第${it.para + 1}段原文`); issues++;
    }
    if (!it.q || !it.type || !it.freq) { console.error(`✗ 考点 ${book.id} 题${i + 1} 缺 q/type/freq`); issues++; }
    (it.trap || []).forEach(t => {
      if (norm(it.ans).indexOf(norm(t)) < 0) { console.error(`✗ 考点 ${book.id} 题${i + 1} 易错字「${t}」不在答案`); issues++; }
    });
  });
}
if (issues) { console.error(`考点数据共 ${issues} 处问题，构建中止`); process.exit(1); }

// 校验 3b：全部篇目都必须有考点题（用户要求 75 篇全覆盖）
const noExam = all.filter(p => !examIds.has(p.id));
if (noExam.length) { console.error(`✗ 还有 ${noExam.length} 篇没有考点题：`, noExam.map(p => p.id).join('、')); process.exit(1); }

// 分组顺序：按学期 → 文言文/古诗词/现代文
const TERMS = ['七上', '七下', '八上', '八下', '九上', '九下', '拓展'];
const wenyan = all.filter(p => p.type === 'wenyan');
const poem = all.filter(p => p.type === 'poem');
const modern = all.filter(p => p.type === 'modern');

const reviewJS = readFileSync(join(root, '工具', 'trainer', 'review.js'), 'utf8');
// 合并器与云同步：照训练器 build.mjs 的契约去 export/import 后内联，科目常量由本构建注入
const mergeJS = readFileSync(join(root, '工具', 'trainer', 'merge.mjs'), 'utf8')
  .replace(/^export\s+/gm, '') + '\n' +
  'window.__ltMerge = { pickIdent: pickIdent, recSig: recSig, mergeRecords: mergeRecords };\n';
const syncCore = readFileSync(join(root, '工具', 'trainer', 'sync.mjs'), 'utf8')
  .replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');
const syncAdapter = readFileSync(join(root, '工具', 'trainer', 'sync-adapter.mjs'), 'utf8');
const syncJS = 'var LT_SUBJECT = ' + JSON.stringify('语文背诵') + ';\n' + syncCore.trimEnd() + '\n' +
  'window.__ltSync = { carrierSnapshot: carrierSnapshot, syncPlan: syncPlan, subjectFromId: subjectFromId };\n' +
  syncAdapter.trimEnd();

let html = readFileSync(tplPath, 'utf8');
const j = (arr) => JSON.stringify(arr).replace(/<\//g, '<\\/');
html = html.replace('/*__WENYAN__*/', j(wenyan))
           .replace('/*__POEM__*/', j(poem))
           .replace('/*__MODERN__*/', j(modern))
           .replace('/*__CATALOG__*/', j(catalog))
           .replace('/*__TERMS__*/', j(TERMS))
           .replace('/*__EXAM__*/', j(exam))
           .replace('/*__MERGE_JS__*/', mergeJS)
           .replace('/*__SYNC_JS__*/', syncJS)
           .replace('/*__REVIEW_JS__*/', reviewJS);
for (const ph of ['/*__WENYAN__*/', '/*__POEM__*/', '/*__MODERN__*/', '/*__CATALOG__*/', '/*__TERMS__*/', '/*__EXAM__*/', '/*__MERGE_JS__*/', '/*__SYNC_JS__*/', '/*__REVIEW_JS__*/']) {
  if (html.indexOf(ph) >= 0) { console.error(`✗ 占位符 ${ph} 未被替换`); process.exit(1); }
}
writeFileSync(outPath, html, 'utf8');

const byLevel = all.reduce((m, p) => (m[p.level] = (m[p.level] || 0) + 1, m), {});
const byTerm = all.reduce((m, p) => (m[p.term] = (m[p.term] || 0) + 1, m), {});
const examCount = exam.reduce((n, b) => n + b.items.length, 0);
console.log(`✓ 背诵训练卡.html：${all.length} 篇（文言 ${wenyan.length} / 诗词 ${poem.length} / 现代文 ${modern.length}）`);
console.log(`  标注：${JSON.stringify(byLevel)}`);
console.log(`  学期：${JSON.stringify(byTerm)}`);
console.log(`  考点默写：${exam.length} 篇 ${examCount} 题（全部篇目覆盖，答案已校验逐字来自原文）`);
console.log(`  共享内核已内联：错题回炉 review.js + 合并 merge.mjs + 云同步 sync.mjs/sync-adapter.mjs（科目「语文背诵」）`);
console.log(`  课标 60 篇齐全；产物 ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
