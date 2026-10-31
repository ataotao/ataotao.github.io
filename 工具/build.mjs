// 由 考点数据.json / 公式数据.json + 模板 生成单文件训练器
// 用法： node 工具/build.mjs            （全部）
//        node 工具/build.mjs 公式记背   （只生成某一科）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARK = '/*DATA*/null';
const only = process.argv[2] || '';

const jobs = [
  { dir: '道德与法治', out: '核心考点训练.html', tpl: 'core-template.html', kind: 'kss' },
  { dir: '历史', out: '核心考点训练.html', tpl: 'core-template.html', kind: 'kss' },
  { dir: '公式记背', out: '公式记背.html', tpl: 'formula-template.html', kind: 'formula' },
];

/* 归一化：去空白、去结构花括号，用来比对「挖空填回去」和「完整公式」是否一致 */
const flat = s => String(s).replace(/\s+/g, '').replace(/[{}]/g, '');

/* ---------- 考点卡（文字版）校验 ---------- */
function checkKss(cards) {
  const ids = new Set(); const errs = [];
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
  return { errs, warns: [] };
}

/* ---------- 公式卡校验 ---------- */
function checkFormula(cards) {
  const ids = new Set(); const errs = []; const warns = [];
  cards.forEach((c, i) => {
    const where = `第${i + 1}条(${c.id || '无id'})`;
    if (!c.id) errs.push(where + ' 缺 id');
    if (!c.name) errs.push(where + ' 缺 name');
    if (ids.has(c.id)) errs.push(where + ' id 重复');
    ids.add(c.id);
    if (!c.tex && !c.cloze && !c.table && !(c.steps && c.steps.length)) {
      errs.push(where + ' 既没有 tex，也没有 cloze / table / steps');
    }

    if (c.cloze) {
      const ct = c.cloze.tex, blanks = c.cloze.blanks || [];
      if (!ct) errs.push(where + ' cloze 缺 tex');
      if (!blanks.length) errs.push(where + ' cloze 缺 blanks');
      const slotN = (String(ct).match(/\\slot\{/g) || []).length;
      if (slotN !== blanks.length) errs.push(where + ` 槽位 ${slotN} 个，但 blanks ${blanks.length} 条`);

      let filled = String(ct);
      blanks.forEach((b, k) => {
        if (!b.ok) errs.push(where + ` 第${k + 1}空缺 ok`);
        const ws = b.wrong || [];
        if (ws.length < 3) errs.push(where + ` 第${k + 1}空只有 ${ws.length} 个干扰项（至少要 3 个）`);
        const seen = new Set([flat(b.ok)]);
        ws.forEach(w => {
          if (seen.has(flat(w))) errs.push(where + ` 第${k + 1}空有重复/与正确答案相同的选项：${w}`);
          seen.add(flat(w));
        });
        filled = filled.split(`\\slot{${k}}`).join(`{${b.ok}}`);
      });
      if (filled.includes('\\slot{')) errs.push(where + ' 还有没被替换的槽位（编号对不上）');
      if (c.tex && flat(filled) !== flat(c.tex)) {
        warns.push(where + ' tex 与「挖空填回去」不一致\n     tex   = ' + c.tex + '\n     filled= ' + filled);
      }
    }

    (c.steps || []).forEach((s, k) => {
      if (!s.t) errs.push(where + ` 第${k + 1}步缺 t`);
    });

    const texts = [c.tex, c.cloze && c.cloze.tex].concat((c.steps || []).map(s => s.t)).filter(Boolean);
    texts.forEach(t => {
      const l = (t.match(/\{/g) || []).length, r = (t.match(/\}/g) || []).length;
      if (l !== r) errs.push(where + ' 花括号不成对：' + t.slice(0, 40));
    });
  });
  return { errs, warns };
}

/* ---------- 套卷（可选）校验 ---------- */
function checkPaper(paper, dirName) {
  const errs = [], warns = [];
  const qs = paper.questions || [];
  if (!qs.length) errs.push('套卷里没有 questions');
  const ids = new Set();
  qs.forEach((q, i) => {
    const where = `第${i + 1}题(${q.id || '无id'})`;
    if (!q.id) errs.push(where + ' 缺 id');
    if (ids.has(q.id)) errs.push(where + ' id 重复');
    ids.add(q.id);
    if (!q.no) errs.push(where + ' 缺题号 no');
    if (!Array.isArray(q.opts) || q.opts.length !== 4) errs.push(where + ' 选项不是 4 个');
    if (!(q.ans >= 0 && q.ans <= 3)) errs.push(where + ' ans 不是 0–3');
    if (!q.why && !q.sol) errs.push(where + ' 既没有 why 也没有 sol');
    (q.blocks || []).forEach((b, k) => {
      if (b.t === 'p') { if (!b.v) errs.push(where + ` 第${k + 1}块是空段落`); }
      else if (b.t === 'img') {
        if (!b.src) errs.push(where + ` 第${k + 1}块图片缺 src`);
        else if (!existsSync(join(root, dirName, b.src))) errs.push(where + ' 图片找不到：' + b.src);
      } else if (b.t === 'tbl') {
        if (!b.rows || !b.rows.length) errs.push(where + ` 第${k + 1}块表格为空`);
        (b.rows || []).forEach((r, ri) => (r || []).forEach(c => (c.imgs || []).forEach(s => {
          if (!existsSync(join(root, dirName, s))) errs.push(where + ` 表格第${ri + 1}行图片找不到：` + s);
        })));
      } else errs.push(where + ` 第${k + 1}块类型未知：` + b.t);
    });
    if (q.why && Object.keys(q.why).length && Object.keys(q.why).length !== 4) {
      warns.push(where + ' 逐项解析不是 4 条');
    }
  });
  return { errs, warns };
}

for (const j of jobs) {
  if (only && j.dir !== only) continue;
  const p = join(root, j.dir, j.kind === 'formula' ? '公式数据.json' : '考点数据.json');
  if (!existsSync(p)) { console.warn('跳过（没有数据）', p); continue; }

  const data = JSON.parse(readFileSync(p, 'utf8'));
  const cards = data.cards || [];
  if (!cards.length) { console.warn('跳过（数据为空）', p); continue; }

  const res = j.kind === 'formula' ? checkFormula(cards) : checkKss(cards);
  res.warns.forEach(w => console.warn('⚠️  ' + j.dir + ' ' + w));
  if (res.errs.length) {
    console.error('❌ ' + j.dir + ' 校验失败：\n' + res.errs.slice(0, 20).join('\n'));
    process.exitCode = 1; continue;
  }

  const tpl = readFileSync(join(root, '工具', j.tpl), 'utf8');
  if (!tpl.includes(MARK)) { console.error('模板缺少 DATA 标记：' + j.tpl); process.exitCode = 1; continue; }

  /* 套卷是可选的：科目目录下有 试卷数据.json 就一起注入 ⑥ 套卷 */
  const paperPath = join(root, j.dir, '试卷数据.json');
  let paper = null;
  if (j.kind !== 'formula' && existsSync(paperPath)) {
    try {
      paper = JSON.parse(readFileSync(paperPath, 'utf8'));
      const pr = checkPaper(paper, j.dir);
      pr.warns.forEach(w => console.warn('⚠️  ' + j.dir + ' 套卷 ' + w));
      if (pr.errs.length) {
        console.error('❌ ' + j.dir + ' 套卷校验失败：\n' + pr.errs.slice(0, 20).join('\n'));
        process.exitCode = 1; continue;
      }
    } catch (e) {
      console.error('❌ ' + j.dir + ' 试卷数据.json 解析失败：' + e.message);
      process.exitCode = 1; continue;
    }
  }

  const core = {
    subject: data.subject, title: data.title,
    imgBase: data.imgBase ?? 'images/', imgPrefix: data.imgPrefix ?? '', imgExt: data.imgExt ?? 'jpg',
    cards,
  };
  if (paper) core.paper = { id: paper.id, name: paper.name, exam: paper.exam, source: paper.source, questions: paper.questions };
  const payload = j.kind === 'formula'
    ? JSON.stringify({ subject: data.subject, title: data.title, cards })
    : JSON.stringify(core);

  const html = tpl.replace(MARK, payload);
  writeFileSync(join(root, j.dir, j.out), html, 'utf8');

  if (j.kind === 'formula') {
    const nf = cards.filter(c => c.cloze).length;
    const ns = cards.reduce((n, c) => n + (c.cloze ? c.cloze.blanks.length : 0), 0);
    console.log(`✅ ${j.dir}/${j.out}  ${cards.length} 条（可填 ${nf} 条 / ${ns} 个空）  ${(html.length / 1024).toFixed(0)} KB`);
  } else {
    const cls = cards.filter(c => ((c.a || []).join('') + JSON.stringify(c.table || {})).includes('【')).length;
    const extra = paper ? `  ＋ 套卷 ${paper.questions.length} 题` : '';
    console.log(`✅ ${j.dir}/${j.out}  ${cards.length} 张卡（可挖空 ${cls} 张，${cards.length - cls} 张只能翻卡）${extra}  ${(html.length / 1024).toFixed(0)} KB`);
  }
}
