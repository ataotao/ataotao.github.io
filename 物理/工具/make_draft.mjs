#!/usr/bin/env node
/* =============================================================
   草稿题包生成器：raw 素材 → 题库/pack-<id>.json（草稿）
   目标：新卷当天就能在「试卷练习」里做（选择题自动判分，其余对答案）
   用法：node 物理/工具/make_draft.mjs <packId> [--force]
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QDIR = path.join(ROOT, '题库');
const RAWDIR = path.join(ROOT, '_recon', 'raw');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const packId = args.find(a => !a.startsWith('--'));
if (!packId) { console.error('用法：node 物理/工具/make_draft.mjs <packId> [--force]'); process.exit(1); }
const shortId = packId.replace(/^pk-/, '');

const rawPath = path.join(RAWDIR, packId + '.json');
if (!fs.existsSync(rawPath)) { console.error('找不到 raw：' + rawPath + '（先跑 extract.ps1）'); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

/* ---------------- 关键词 → 考点（每行：考点, 关键词, 权重） ---------------- */
const TAG_RULES = [
  ['杠杆平衡条件', ['杠杆平衡', '平衡条件', 'F1L1', 'F₁L₁', 'F1l1'], 4],
  ['最小力', ['最小力', '最省力', '最长力臂', '力臂最长'], 4],
  ['杠杆五要素', ['力臂', '动力臂', '阻力臂', '支点'], 3],
  ['杠杆分类', ['省力杠杆', '费力杠杆', '等臂杠杆', '省力', '费力', '等臂'], 2],
  ['杠杆动态平衡', ['动态', '向下倾斜'], 2],
  ['滑轮组', ['滑轮组', '绕绳', '自由端'], 3],
  ['定滑轮与动滑轮', ['动滑轮', '定滑轮'], 3],
  ['测机械效率实验', ['测机械效率', '机械效率实验', '测量滑轮'], 4],
  ['机械效率', ['机械效率', '效率', 'η'], 2],
  ['功率', ['功率', 'P='], 2],
  ['功', ['做功', 'W='], 1],
  ['动能与势能', ['动能', '重力势能', '弹性势能', '势能'], 3],
  ['机械能转化', ['机械能', '转化', '守恒'], 2],
  ['扩散现象', ['扩散'], 3],
  ['分子间作用力', ['分子间', '斥力', '引力'], 3],
  ['分子动理论', ['分子', '热运动'], 2],
  ['改变内能的方式', ['热传递', '做功改变', '搓手', '摩擦生热'], 2],
  ['温度热量内能辨析', ['温度', '热量', '内能'], 1],
  ['比热容', ['比热容', 'c='], 3],
  ['热量计算', ['Q=', '吸收', '放出', '升温', '降温', '加热时间'], 2],
  ['热值', ['热值', 'q='], 3],
  ['热机效率', ['热机', '汽油机', '柴油机', '冲程'], 2],
  ['能量守恒', ['能量守恒', '能量转化'], 2],
  ['电荷与摩擦起电', ['电荷', '起电', '验电器', '带电'], 3],
  ['串并联电路', ['串联', '并联'], 3],
  ['电学实验', ['电路图', '实物图', '连接电路'], 3],
  ['电流与电路', ['电路', '电流表', '电压表', '电流'], 2],
  ['实验探究', ['实验', '探究', '测量'], 1]
];

function guessTags(text) {
  const score = {};
  for (const [tag, kws, weight] of TAG_RULES) {
    for (const k of kws) if (text.includes(k)) score[tag] = (score[tag] || 0) + weight;
  }
  const sorted = Object.keys(score).sort((a, b) => score[b] - score[a]);
  const out = sorted.slice(0, 2);
  /* 同类里保留更具体的那个，避免「实验探究」压过具体考点 */
  if (out.length === 2 && out[1] === '实验探究') out.pop();
  return out.length ? out : ['实验探究'];
}

/* ---------------- 文本清洗 ---------------- */
function cleanText(s) {
  return String(s || '')
    .replace(/\[图\]|\[式\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
function cleanOpt(o) {
  let s = String(o || '');
  const cut = s.indexOf('[图]');
  if (cut >= 0) s = s.slice(0, cut);
  s = cleanText(s).replace(/\s*第\s*\d+\s*题.*$/, '').trim();
  return s || '（见图）';
}
function guessGroup(q) {
  if (q.group === '选择') return '选择';
  const t = cleanText(q.askText);
  if (/实验|探究|测量|记录|步骤/.test(t)) return '实验';
  if (/求|计算|解[:：]/.test(t)) return '解答';
  return '填空';
}
function guessFocus(q, group) {
  const t = cleanText(q.askText) + ' ' + (q.opts || []).join(' ');
  if (group === '选择' && /说法|正确|错误|下列/.test(t)) return /计算|多少/.test(t) ? 'calc' : 'model';
  if (/求|计算|多少|效率|功率/.test(t)) return 'calc';
  if (/如图|图\s*\d|如图所示/.test(t)) return 'cond';
  if (/实验|探究|测量/.test(t)) return 'rule';
  return 'model';
}
function guessDiff(q, group) {
  const t = cleanText(q.askText);
  const sub = (t.match(/（\s*\d\s*）/g) || []).length;
  if (group === '解答' || group === '实验') return sub >= 3 ? 3 : 2;
  return group === '填空' ? 2 : 1;
}
function guessTopic(tags) {
  const map = [
    [/杠杆/, '杠杆'], [/滑轮/, '滑轮'], [/效率/, '机械效率'], [/功率|^功$/, '功和功率'],
    [/动能|势能|机械能/, '机械能'], [/分子|内能|温度热量/, '分子与内能'],
    [/比热容|热量|热值/, '比热容与热值'], [/热机|能量/, '热机与能量'],
    [/电荷|电路|串并联/, '电学']
  ];
  const out = [];
  for (const t of tags) for (const [re, topic] of map) if (re.test(t) && !out.includes(topic)) out.push(topic);
  return out.length ? out.slice(0, 3) : ['实验探究'];
}

/* ---------------- 生成 ---------------- */
const outFile = path.join(QDIR, 'pack-' + shortId + '.json');
if (fs.existsSync(outFile) && !FORCE) {
  console.error('已存在 ' + path.relative(ROOT, outFile) + '；要覆盖请加 --force');
  process.exit(1);
}
const LETTERS = 'ABCD';
const questions = [];
const todo = [];
let no = 0;
for (const q of raw.questions || []) {
  no++;
  const group = guessGroup(q);
  const ask = cleanText(q.askText).replace(/^\s*\d{1,2}\s*[．.]\s*/, '');
  const askImg = q.askImg && q.askImg.length ? q.askImg : null;
  const ansImg = q.ansImg && q.ansImg.length ? q.ansImg : null;
  const qid = shortId + 'q' + String(no).padStart(2, '0');
  const base = {
    id: qid,
    no: String(q.no != null ? q.no : no),
    group: group,
    askImg: askImg,
    ask: ask,
    tags: guessTags(ask + ' ' + (q.opts || []).join(' ')),
    focus: guessFocus(q, group),
    diff: guessDiff(q, group),
    draft: true
  };
  const key = String(q.answerKey || '').replace(/[^A-D]/g, '');
  if (key && group === '选择') {
    /* 选择题：答案键来自原卷答案表，直接可判分 */
    const opts = (q.opts || []).map(cleanOpt);
    while (opts.length < 4) opts.push('（见原题图）');
    base.type = 'choice';
    base.opts = opts;
    const idx = key.split('').map(ch => LETTERS.indexOf(ch)).filter(i => i >= 0);
    base.ans = idx.length > 1 ? idx.sort() : idx[0];
    base.ansText = key;
    base.solution = ['（解析待补：先自己判断，再点「看答案」对照原卷答案图。）'];
    base.tip = '';
    if (ansImg) base.ansImg = ansImg;
  } else {
    /* 非选择题：草稿先不判分，给原卷答案图对照 */
    base.type = 'selfcheck';
    base.selfCheck = true;
    if (ansImg) base.ansImg = ansImg;
    base.ansText = cleanText(q.answerText) || '见原卷答案图';
    base.solution = ['（解析待补：先在纸上完整写一遍，再展开原卷答案对照。）'];
    base.tip = '';
  }
  if (!askImg) todo.push('第 ' + base.no + ' 题：缺原题图，需人工补 askImg');
  if (base.type === 'selfcheck') todo.push('第 ' + base.no + ' 题：需人工补 fields（可判分）+ 解析');
  questions.push(base);
}
if (!questions.length) { console.error('raw 里没有题目'); process.exit(1); }

const allTags = Array.from(new Set(questions.flatMap(q => q.tags)));
const pack = {
  id: packId,
  name: (raw.title || shortId) + '（草稿）',
  source: '题库/' + (raw.file || ''),
  exam: raw.title || '',
  topics: guessTopic(allTags),
  note: '【草稿】由 工具/make_draft.mjs 从 raw 自动生成：选择题答案取自原卷答案表（可直接判分）；非选择题先按「对答案不判分」处理。待补：解析(solution)、评分字段(fields)、tags/focus/难度 微调。补完后删掉 draft 字段。',
  draft: true,
  questions
};

fs.writeFileSync(outFile, JSON.stringify(pack, null, 1), 'utf8');
const choiceN = questions.filter(q => q.type === 'choice').length;
console.log('✓ 草稿题包：' + path.relative(ROOT, outFile));
console.log('  共 ' + questions.length + ' 题（选择 ' + choiceN + ' 可判分 / 非选择 ' + (questions.length - choiceN) + ' 对答案）');
console.log('  自动识别考点：' + allTags.join('、'));
if (todo.length) {
  console.log('  待人工补充（' + todo.length + ' 条）：');
  todo.slice(0, 20).forEach(t => console.log('   · ' + t));
  if (todo.length > 20) console.log('   · …还有 ' + (todo.length - 20) + ' 条');
}
console.log('\n下一步：node 物理/工具/build.mjs  然后刷新页面看「试卷练习」');
