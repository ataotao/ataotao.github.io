#!/usr/bin/env node
/* =============================================================
   物理思维脚手架 · 构建脚本
   用法：node 物理/工具/build.mjs [--quiet] [--no-fail]
   读 源/ → 校验 题库/*.json → 内联 → 写 物理/物理思维脚手架.html
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');          // 物理/
const REPO = path.resolve(ROOT, '..');
const SRC = path.join(ROOT, '源');
const QDIR = path.join(ROOT, '题库');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const NOFAIL = args.includes('--no-fail');
/* --html=名字.html 可输出到 物理/ 下的另一个文件名（并行开发用，避免互相覆盖） */
const OUT_NAME = ((args.find(a => a.startsWith('--html=')) || '').replace('--html=', '')) || '物理思维脚手架.html';
const OUT_HTML = path.join(ROOT, OUT_NAME);
const IS_MAIN = OUT_NAME === '物理思维脚手架.html';

const TAGS = [
  '杠杆五要素', '杠杆平衡条件', '杠杆分类', '最小力', '杠杆动态平衡',
  '定滑轮与动滑轮', '滑轮组', '功', '功率', '机械效率', '测机械效率实验',
  '动能与势能', '机械能转化', '分子动理论', '扩散现象', '分子间作用力',
  '内能', '改变内能的方式', '温度热量内能辨析', '比热容', '热量计算', '热值', '热机效率', '能量守恒',
  '电荷与摩擦起电', '电流与电路', '串并联电路', '电学实验', '实验探究'
];
const TOPICS = ['杠杆', '滑轮', '功和功率', '机械效率', '机械能', '分子与内能', '比热容与热值', '热机与能量', '电学', '实验探究'];
const FOCUS = ['model', 'cond', 'rule', 'calc', 'check'];
const TYPES = ['choice', 'fill', 'solve', 'selfcheck'];

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

/* ---------------- 1. 读数据 ---------------- */
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { err('JSON 解析失败：' + path.relative(REPO, file) + ' → ' + e.message); return null; }
}

const packFiles = fs.existsSync(QDIR)
  ? fs.readdirSync(QDIR).filter(f => /^pack-.*\.json$/.test(f) && f !== 'pack-全部.json' && f.indexOf('模板') < 0).sort()
  : [];
const packs = [];
for (const f of packFiles) {
  const p = readJSON(path.join(QDIR, f));
  if (p) packs.push(p);
}
/* --packs=pk-w1,pk-w2 只构建指定题包（并行开发时用，避免别人的半成品挡住自己） */
const PACK_FILTER = ((args.find(a => a.startsWith('--packs=')) || '').replace('--packs=', ''))
  .split(',').map(s => s.trim()).filter(Boolean);
const usedPacks = PACK_FILTER.length ? packs.filter(p => PACK_FILTER.includes(p.id)) : packs;
if (PACK_FILTER.length) console.log('只构建题包：' + usedPacks.map(p => p.id).join(', ') + '（共 ' + packs.length + ' 套已加载）');
const conceptsFile = path.join(SRC, 'data', 'concepts.json');
const concepts = fs.existsSync(conceptsFile) ? (readJSON(conceptsFile) || { cards: [] }) : { cards: [] };
const guidedFile = path.join(SRC, 'data', 'guided.json');
const guided = fs.existsSync(guidedFile) ? (readJSON(guidedFile) || { items: [] }) : { items: [] };

const conceptCards = Array.isArray(concepts) ? concepts : (concepts.cards || []);
const guidedItems = Array.isArray(guided) ? guided : (guided.items || []);

/* ---------------- 2. 校验 ---------------- */
const packIds = new Set(), qIds = new Set();
const imgCache = new Map();
function imgExists(rel) {
  if (imgCache.has(rel)) return imgCache.get(rel);
  const abs = path.join(ROOT, rel);
  const ok = fs.existsSync(abs) && fs.statSync(abs).isFile();
  imgCache.set(rel, ok);
  return ok;
}
function checkImgOne(rel, where) {
  if (!rel) return;
  if (typeof rel !== 'string') { err(where + '：图片字段必须是字符串路径'); return; }
  if (/^data:/.test(rel)) return;
  if (!imgExists(rel)) err(where + '：图片不存在 → ' + rel);
}
/* 图片字段允许字符串或字符串数组（跨页多张） */
function checkImg(rel, where) {
  if (!rel) return;
  var arr = Array.isArray(rel) ? rel : [rel];
  if (!arr.length) { err(where + '：图片数组不能为空'); return; }
  arr.forEach(function (s) { checkImgOne(s, where); });
}

for (const p of usedPacks) {
  const tag = 'pack ' + (p.id || '(无 id)');
  if (!p.id) err(tag + '：缺少 id');
  else if (packIds.has(p.id)) err(tag + '：id 重复');
  else packIds.add(p.id);
  if (!p.name) err(tag + '：缺少 name');
  if (!Array.isArray(p.questions) || !p.questions.length) { err(tag + '：questions 不能为空'); continue; }
  for (const q of p.questions) {
    const wt = p.id + ' / ' + (q.id || '(无 id)') + '（第' + (q.no || '?') + '题）';
    if (!q.id) { err(wt + '：缺少 id'); continue; }
    if (qIds.has(q.id)) err(wt + '：题目 id 全局重复');
    qIds.add(q.id);
    if (!q.no) err(wt + '：缺少 no');
    if (!q.group) err(wt + '：缺少 group');
    if (!TYPES.includes(q.type)) err(wt + '：type 非法（' + q.type + '）');
    if (!FOCUS.includes(q.focus)) err(wt + '：focus 非法（' + q.focus + '）');
    if (!Array.isArray(q.tags) || !q.tags.length) err(wt + '：tags 不能为空');
    else q.tags.forEach(t => { if (!TAGS.includes(t)) err(wt + '：tag 不在规范清单 → ' + t); });
    if (q.score !== undefined && (typeof q.score !== 'number' || !isFinite(q.score) || q.score <= 0)) {
      err(wt + '：score（分值）必须是正数');
    }
    if (!q.askImg || (Array.isArray(q.askImg) && !q.askImg.length)) err(wt + '：缺少 askImg');
    else checkImg(q.askImg, wt + ' askImg');
    if (q.ansImg) checkImg(q.ansImg, wt + ' ansImg');
    if (q.type === 'choice') {
      if (!Array.isArray(q.opts) || q.opts.length < 2) err(wt + '：选择题需要 opts（≥2 项）');
      const ansOk = Array.isArray(q.ans)
        ? q.ans.every(i => Number.isInteger(i) && i >= 0 && i < (q.opts || []).length)
        : Number.isInteger(q.ans) && q.ans >= 0 && q.ans < (q.opts || []).length;
      if (!ansOk) err(wt + '：ans 必须是选项下标（多选给数组）');
    } else if (q.type === 'selfcheck') {
      if (!q.ansImg && !q.solution) warn(wt + '：selfcheck 题建议给 ansImg 或 solution');
    } else {
      if (!Array.isArray(q.fields) || !q.fields.length) err(wt + '：填空/解答题需要 fields');
      else q.fields.forEach((f, i) => {
        const ft = wt + ' 第' + (i + 1) + '个字段';
        if (!f.type) err(ft + '：缺少 type');
        if (!f.label) err(ft + '：缺少 label');
        if (f.type === 'num' && typeof f.ans !== 'number') err(ft + '：num.ans 必须是数字');
        if (f.type === 'coef') {
          if (!Array.isArray(f.ans)) err(ft + '：coef.ans 必须是数组');
          else if (!f.tpl) err(ft + '：coef 需要 tpl');
          else {
            const n = (f.tpl.match(/\{\d+\}/g) || []).length;
            if (n !== f.ans.length) err(ft + '：tpl 占位符 ' + n + ' 个，ans ' + f.ans.length + ' 个，不匹配');
          }
        }
        if (f.type === 'choice' && (!Array.isArray(f.options) || !Number.isInteger(f.ans))) err(ft + '：choice 需要 options 数组 + ans 下标');
      });
    }
    if (!q.solution && !q.ansImg) warn(wt + '：没有 solution 也没有 ansImg，学生看不到答案');
    if (!q.ask) warn(wt + '：缺少 ask 文本（搜索/复习列表会显示为空）');
    /* 考点 / 公式：解析区专门有一块，缺了不算错，但学生看到的内容会少一截 */
    if (!q.point) warn(wt + '：缺少 point（考点），解析区会少一块');
    else if (typeof q.point !== 'string') err(wt + '：point 必须是字符串');
    if (!Array.isArray(q.formulas)) warn(wt + '：缺少 formulas（应用公式），解析区只有考点没有式子');
    else q.formulas.forEach((f, i) => {
      const ft = wt + ' formulas 第' + (i + 1) + '条';
      if (!f || typeof f.f !== 'string' || !f.f.trim()) err(ft + '：缺 f（公式文本）');
      if (f && f.m !== undefined && typeof f.m !== 'string') err(ft + '：m（怎么用）必须是字符串');
    });
  }
}
function imgExistsCheck(v) { return !!v; }

const cIds = new Set();
for (const c of conceptCards) {
  const wt = 'concept ' + (c.id || '(无 id)');
  if (!c.id) err(wt + '：缺少 id');
  else if (cIds.has(c.id)) err(wt + '：id 重复');
  else cIds.add(c.id);
  if (!c.q) err(wt + '：缺少 q');
  if (!c.why) err(wt + '：缺少 why');
  if (!TOPICS.includes(c.topic)) err(wt + '：topic 非法 → ' + c.topic);
  if (!Array.isArray(c.tags) || !c.tags.length) err(wt + '：tags 不能为空');
  else c.tags.forEach(t => { if (!TAGS.includes(t)) err(wt + '：tag 非法 → ' + t); });
  if (c.type === 'choice') {
    if (!Array.isArray(c.opts) || !Number.isInteger(c.ans)) err(wt + '：choice 需要 opts + ans 下标');
  } else if (c.type === 'judge') {
    if (typeof c.ans !== 'boolean') err(wt + '：judge.ans 必须是 true/false');
  } else err(wt + '：type 只能是 judge/choice');
}

const gIds = new Set();
for (const g of guidedItems) {
  const wt = 'guided ' + (g.id || '(无 id)');
  if (!g.id) err(wt + '：缺少 id');
  else if (gIds.has(g.id)) err(wt + '：id 重复');
  else gIds.add(g.id);
  if (!g.questionId) err(wt + '：缺少 questionId');
  else if (!qIds.has(g.questionId) && !PACK_FILTER.length) err(wt + '：questionId 找不到对应题目 → ' + g.questionId);
  if (!Array.isArray(g.steps) || g.steps.length !== 5) { err(wt + '：steps 必须 5 条'); continue; }
  g.steps.forEach((s, i) => {
    if (s.focus !== FOCUS[i]) err(wt + '：第' + (i + 1) + '步 focus 应为 ' + FOCUS[i]);
    if (!s.q) err(wt + '：第' + (i + 1) + '步缺少 q');
    if (s.type === 'choice' && (!Array.isArray(s.opts) || !Number.isInteger(s.ans))) err(wt + '：第' + (i + 1) + '步 choice 需要 opts+ans');
    if (s.type === 'multi') {
      if (!Array.isArray(s.opts) || !Array.isArray(s.ans)) err(wt + '：第' + (i + 1) + '步 multi 需要 opts+ans 数组');
      else if (s.ans.some(i2 => !Number.isInteger(i2) || i2 < 0 || i2 >= s.opts.length)) err(wt + '：第' + (i + 1) + '步 multi.ans 下标越界');
    }
    if (s.type === 'fields' && !Array.isArray(s.fields)) err(wt + '：第' + (i + 1) + '步 fields 需要数组');
  });
  if (!Array.isArray(g.walk) || g.walk.length < 2) warn(wt + '：建议给 walk（看思路）');
}

/* ---------------- 3. 内联 ---------------- */
function readText(f) { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''); }

let shell = readText(path.join(SRC, 'shell.html'));
const css = readText(path.join(SRC, 'css', 'style.css'));
const jsDir = path.join(SRC, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
let js = jsFiles.map(f => '\n/* ===== ' + f + ' ===== */\n' + readText(path.join(jsDir, f))).join('\n');

const dataLiteral = 'window.PHYS_DATA = ' + JSON.stringify({
  packs: usedPacks,
  concepts: conceptCards,
  guided: guidedItems
}) + ';';
/* 10-data.js 只保留兜底，真正的数据放在它前面 */
js = js.replace(/window\.PHYS_DATA\s*=\s*window\.PHYS_DATA\s*\|\|\s*\{[^}]*\};?/, '/* 数据由 build 注入 */');

const html = shell
  .replace('/*__CSS__*/', () => css)
  .replace('/*__DATA__*/', () => dataLiteral)
  .replace('/*__JS__*/', () => js);

/* ---------------- 4. JS 语法检查 ---------------- */
const tmpJs = path.join(ROOT, '_recon', '_bundle.check.mjs');
try {
  fs.mkdirSync(path.dirname(tmpJs), { recursive: true });
  fs.writeFileSync(tmpJs, js, 'utf8');
  execFileSync(process.execPath, ['--check', tmpJs], { stdio: 'pipe' });
} catch (e) {
  err('JS 语法检查失败：' + (e.stderr ? e.stderr.toString().slice(0, 800) : e.message));
}
try { fs.unlinkSync(tmpJs); } catch (e) { }

/* ---------------- 5. 输出 ---------------- */
if (!QUIET) {
  console.log('题包：' + usedPacks.length + ' 套 / ' + usedPacks.reduce((a, p) => a + (p.questions || []).length, 0) + ' 题');
  console.log('概念卡：' + conceptCards.length + ' 张；五步母题：' + guidedItems.length + ' 组');
  console.log('JS 模块：' + jsFiles.join(', '));
}
const writeOut = () => {
  fs.writeFileSync(OUT_HTML, html, 'utf8');
  if (IS_MAIN) {
    const merged = { version: 2, generatedAt: new Date().toISOString(), packs: usedPacks };
    fs.writeFileSync(path.join(QDIR, 'pack-全部.json'), JSON.stringify(merged, null, 1), 'utf8');
  }
  console.log('\n✓ 已生成 ' + path.relative(REPO, OUT_HTML) + '（' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB）');
  if (IS_MAIN) console.log('✓ 已合并 题库/pack-全部.json');
};
if (warnings.length) {
  console.log('\n提醒（' + warnings.length + ' 条，不阻断）：');
  warnings.slice(0, 20).forEach(w => console.log('  · ' + w));
  if (warnings.length > 20) console.log('  …还有 ' + (warnings.length - 20) + ' 条');
}
if (errors.length) {
  console.error('\n✗ 校验未通过（' + errors.length + ' 条）：');
  errors.slice(0, 40).forEach(e => console.error('  - ' + e));
  if (errors.length > 40) console.error('  …还有 ' + (errors.length - 40) + ' 条');
  if (!NOFAIL) process.exit(1);
  console.error('（--no-fail：仍然写出 HTML，但数据有问题，不要交付这份产物）');
  writeOut();
} else {
  writeOut();
}
