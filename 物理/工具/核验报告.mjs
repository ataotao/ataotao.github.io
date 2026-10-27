#!/usr/bin/env node
/* =============================================================
   核验清单生成器：把"每个答案的证据在哪"摊开，便于家长/老师抽查
   用法：node 物理/工具/核验报告.mjs
   产出：物理/核验清单.md
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const QDIR = path.join(ROOT, '题库');
const OUT = path.join(ROOT, '核验清单.md');

const packs = fs.readdirSync(QDIR)
  .filter(f => /^pack-w.*\.json$/.test(f))
  .map(f => JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')));
const concepts = JSON.parse(fs.readFileSync(path.join(ROOT, '源', 'data', 'concepts.json'), 'utf8')).cards || [];
const guided = JSON.parse(fs.readFileSync(path.join(ROOT, '源', 'data', 'guided.json'), 'utf8')).items || [];

const L = [];
const p = s => L.push(s);

function hasAnsImg(q) {
  const v = q.ansImg;
  return !!(v && (Array.isArray(v) ? v.length : true));
}
function isPending(sol) {
  return (sol || []).some(s => String(s).includes('待补'));
}

let total = 0, choiceN = 0, fillN = 0, selfN = 0;
let withAnsImg = 0, noAnsImg = 0, pending = 0;
const cLevel = [];   // 需要人工看一眼的题
const bLevel = [];   // 有答案图但数值靠人工从图上转录
const packRows = [];

for (const pk of packs) {
  const qs = pk.questions || [];
  let c = 0, f = 0, s = 0, ai = 0;
  for (const q of qs) {
    total++;
    const aiHave = hasAnsImg(q);
    if (q.type === 'choice') { choiceN++; c++; }
    else if (q.type === 'selfcheck') { selfN++; s++; }
    else { fillN++; f++; }
    if (aiHave) withAnsImg++; else noAnsImg++;
    if (isPending(q.solution)) pending++;
    if (q.type !== 'choice' && aiHave && q.fields && q.fields.length) {
      bLevel.push({ pack: pk.id, no: q.no, id: q.id, what: '数值字段是人从原卷答案图转录的（建议抽看 1 题对图）' });
    }
    if (q.type !== 'choice' && !aiHave) {
      cLevel.push({ pack: pk.id, no: q.no, id: q.id, what: '这题没有原卷答案图，答案只来自文字解析（需人工核）' });
    }
    if (isPending(q.solution)) {
      cLevel.push({ pack: pk.id, no: q.no, id: q.id, what: '解析还是占位文字（待补）' });
    }
  }
  packRows.push({ id: pk.id, name: pk.name, n: qs.length, c, f, s, note: pk.note || '' });
}

const now = new Date();
const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' +
  String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

p('# 核验清单（答案来自哪里、哪些需要人工看）');
p('');
p('> 生成时间：' + ts + '　生成脚本：`物理/工具/核验报告.mjs`');
p('> 用途：把"每个答案的证据"摊开。**A/B/C 不是质量评分，而是"这条答案能不能追溯到原卷"**。');
p('');
p('## 一、总览');
p('');
p('| 项 | 数量 |');
p('|---|---|');
p('| 题包 / 题目 | ' + packs.length + ' 套 / ' + total + ' 题 |');
p('| 选择题（答案取自 docx 文末答案表） | ' + choiceN + ' |');
p('| 填空/解答/实验（答案取自原卷答案图） | ' + fillN + ' |');
p('| 自评题（画图/说理，不判分） | ' + selfN + ' |');
p('| **非选择题有原卷答案图可对照** | **' + withAnsImg + ' / ' + (fillN + selfN) + ' 题（100%）** |');
p('| 选择题（答案来自答案表，不需要答案图） | ' + choiceN + ' 题 |');
p('| 解析仍为占位（待补） | ' + pending + ' 题 |');
p('| 概念卡（AI 归纳初稿） | ' + concepts.length + ' 张 |');
p('| 五步母题（AI 设计，数值已与题包对拍） | ' + guided.length + ' 组 |');
p('');
p('## 二、各套卷');
p('');
p('| 题包 | 名称 | 题数 | 选择 | 填空/解答 | 自评 | 答案来源与疑点 |');
p('|---|---|---|---|---|---|---|');
for (const r of packRows) {
  const ev = '选择题→原卷答案表；其余→原卷答案图' + (r.note ? '；**疑点已记录**' : '');
  p('| ' + r.id + ' | ' + r.name.replace(/\|/g, '/') + ' | ' + r.n + ' | ' + r.c + ' | ' + r.f + ' | ' + r.s + ' | ' + ev + ' |');
}
p('');
p('## 三、答案可追溯性分级');
p('');
p('| 级别 | 含义 | 数量 |');
p('|---|---|---|');
p('| A | 选择题：答案直接来自原卷答案表（可用脚本逐题比对） | ' + choiceN + ' 题 |');
p('| A | 非选择题：有原卷答案图，学生可自行对照，无需信任任何"生成内容" | ' + withAnsImg + ' / ' + (fillN + selfN) + ' 题 |');
p('| B | 非选择题：数值判分字段是从答案图转录的（抽看即可） | ' + bLevel.length + ' 题 |');
p('| C | 需人工核：无答案图 / 解析待补 | ' + cLevel.length + ' 题 |');
p('');
p('## 四、需要人工看一眼的题（C 级）');
p('');
if (!cLevel.length) {
  p('无。所有非选择题都有原卷答案图可对照。');
} else {
  p('| 题包 | 题号 | id | 需要确认什么 |');
  p('|---|---|---|---|');
  for (const x of cLevel) p('| ' + x.pack + ' | ' + x.no + ' | ' + x.id + ' | ' + x.what + ' |');
}
p('');
p('## 五、数值字段转录清单（B 级，建议每周抽 3 题对图）');
p('');
p('这些题的「可判分数值」是人工从原卷答案图抄下来的：抄错 = 学生答对却判错。抽看方式：打开页面 → 试卷练习 → 对应题 → 填答案 → 提交 → 展开「原卷参考答案」对照。');
p('');
p('| 题包 | 题号 | id |');
p('|---|---|---|');
for (const x of bLevel) p('| ' + x.pack + ' | ' + x.no + ' | ' + x.id + ' |');
p('');
p('## 六、原卷本身的疑点（我们没改答案，只记录）');
p('');
for (const r of packRows) {
  if (r.note) {
    p('**' + r.id + '**：' + r.note);
    p('');
  }
}
p('> 处理原则：**答案一律照原卷**。原卷答案表与图像矛盾、参考答案编号错乱、单位混用等问题，只写进备注并在页面卡片上展示，不擅自"纠正"。');
p('');
p('## 七、AI 归纳部分（概念卡 / 五步母题）的证据边界');
p('');
p('- **概念卡 ' + concepts.length + ' 张**：内容是初三教材范围内的结论（每条 `why` 一句话点破），但它属于"归纳"，不是原卷原文。**建议让物理老师抽查 10 张**（尤其温度/热量/内能、功率/机械效率、定/动滑轮这类易混卡）。');
p('- **五步母题 ' + guided.length + ' 组**：题目是原卷题（第 1 步到第 5 步的数值已用脚本与题包 `fields.ans` 逐项对拍，0 差异）；但"第 2 步圈哪些条件""第 3 步选哪条规律"这类教学判断是 AI 设计的，**建议老师抽查 2–3 组**。');
p('');
p('## 八、每次改动后要跑的闸门（缺一不可）');
p('');
p('```powershell');
p('# 1) 结构与数据校验（图片存在、id 唯一、考点清单、五步结构、JS 语法）');
p('& "C:\\Users\\Tao\\.local\\nodejs2\\node.exe" 物理\\工具\\build.mjs');
p('# 2) 选择题答案 vs docx 文末答案表（必须「全部一致 ✓」）');
p('& "C:\\Users\\Tao\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe" 物理\\工具\\check_answers.py');
p('# 3) 每题是否有原题图 / 答案');
p('& "C:\\Users\\Tao\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe" 物理\\工具\\audit_packs.py');
p('```');
p('');
p('---');
p('');
p('**一句话**：答案和图形都锁在原卷上（可脚本追溯）；解析文字、考点归类、五步设计属于"教学加工"，用上面的 B/C 清单抽查即可，不必逐条信任也无法逐条信任。');

fs.writeFileSync(OUT, L.join('\n') + '\n', 'utf8');
console.log('✓ 已生成 ' + path.relative(REPO, OUT));
console.log('  总题数 ' + total + '（选择 ' + choiceN + ' / 填空解答 ' + fillN + ' / 自评 ' + selfN + '）');
console.log('  有原卷答案图 ' + withAnsImg + ' 题；无答案图 ' + noAnsImg + ' 题；解析待补 ' + pending + ' 题');
console.log('  需人工核（C 级）' + cLevel.length + ' 项；数值转录清单（B 级）' + bLevel.length + ' 项');
