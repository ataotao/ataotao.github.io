// 把 _transcribe/*.json 合并成 科目/考点数据.json，并做统一清洗
// 用法： node 工具/merge.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, '工具', '_transcribe');

const SUBJECTS = [
  { prefix: 'zz', dir: '道德与法治', subject: '道德与法治', imgPrefix: '政治_',
    title: '九年级上册《道德与法治》核心考点' },
  { prefix: 'ls', dir: '历史', subject: '历史', imgPrefix: '历史_',
    title: '九年级上册历史核心考点' },
];

// 明确丢弃的卡（截断占位、内容已被后续页覆盖）
const DROP = new Set(['ls-p8-23']);

const tidy = (s) => String(s)
  .replace(/（教材\s*P\d+\s*[—\-~]\s*P\d+）/g, '')   // 去掉"（教材P80—P85）"
  .replace(/（教材\s*P\d+）/g, '')
  .replace(/[，。、；]?\s*P\d{1,3}\s*$/g, '')        // 去掉行尾页码引用 P11
  .replace(/\s{2,}/g, ' ')
  .trim();

const UNIT_FIX = { '全书主线': '全册主线' };
const LESSON_FIX = { '九年级上册历史核心考点': '全书主线' };

for (const sub of SUBJECTS) {
  const files = readdirSync(SRC).filter(f => f.startsWith(sub.prefix + '-') && f.endsWith('.json')).sort();
  if (!files.length) { console.warn('跳过（没有转录文件）', sub.dir); continue; }

  const cards = [];
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
    d.cards.forEach((c, i) => {
      if (DROP.has(c.id)) return;
      c._ord = i;
      c._file = f;
      cards.push(c);
    });
  }

  // 清洗
  for (const c of cards) {
    c.a = (c.a || []).map(tidy).filter(Boolean);
    if (c.table) {
      c.table.head = (c.table.head || []).map(tidy);
      c.table.rows = (c.table.rows || []).map(r => r.map(tidy));
    }
    c.q = tidy(c.q);
    if (c.lesson) c.lesson = tidy(c.lesson);
    if (c.node) c.node = tidy(c.node);
    if (c.unit) c.unit = tidy(c.unit);
    // 题干里如果混进了【注意提法】这类批注，挪到 warn，题干保持干净
    const notes = [];
    c.q = String(c.q).replace(/【([^】]+)】/g, (m, t) => { notes.push(t); return ''; })
      .replace(/^[\s：:、，,。]+/, '').trim();
    if (notes.length) {
      const w = [c.warn, ...notes].filter(Boolean).join('；');
      c.warn = [...new Set(w.split('；').map(s => s.trim()).filter(Boolean))].join('；');
    }
    if (c.warn) c.warn = tidy(c.warn);
    if (c.unit && UNIT_FIX[c.unit]) c.unit = UNIT_FIX[c.unit];
    if (c.lesson && LESSON_FIX[c.lesson]) c.lesson = LESSON_FIX[c.lesson];
    if (!c.a.length && !c.table) c._empty = true;
    if (typeof c.star !== 'number') c.star = 1;
    delete c._file; delete c._ord;
  }

  // 把藏在 warn 里的「本课必背一句话」提拔成独立卡（整句背，不做挖空）
  const promoted = [];
  for (const c of cards) {
    if (!c.warn) continue;
    const keep = [];
    for (const seg of c.warn.split('；').map(s => s.trim()).filter(Boolean)) {
      const m = seg.match(/^本课必背(?:一句话)?[：:]?\s*(.+)$/);
      if (m) {
        promoted.push({
          id: c.id + 'b', page: c.page, unit: c.unit, lesson: c.lesson,
          node: '本课必背一句话', q: `${c.lesson}的「本课必背一句话」是什么？`,
          a: [m[1]], star: 2,
        });
      } else keep.push(seg);
    }
    c.warn = keep.join('；') || undefined;
    if (!c.warn) delete c.warn;
  }
  promoted.forEach(c => {
    const i = cards.findIndex(x => x.id === c.id.slice(0, -1));
    cards.splice(i + 1, 0, c);
  });
  if (promoted.length) console.log(`  提级「本课必背」独立卡 ${promoted.length} 张`);

  // 排序：按页码 → 文件中出现顺序（Array.sort 稳定）
  const sorted = cards.sort((a, b) => a.page - b.page);

  // id 去重
  const seen = new Set();
  sorted.forEach((c, i) => {
    let id = c.id || `${sub.prefix}-p${c.page}-${String(i + 1).padStart(2, '0')}`;
    let n = 2; const base = id;
    while (seen.has(id)) id = base + '-' + (n++);
    seen.add(id); c.id = id;
  });

  const out = {
    subject: sub.subject,
    title: sub.title,
    imgBase: 'images/',
    imgPrefix: sub.imgPrefix,
    cards: sorted,
  };
  writeFileSync(join(root, sub.dir, '考点数据.json'), JSON.stringify(out, null, 2), 'utf8');

  // 报告
  const pages = [...new Set(sorted.map(c => c.page))].sort((a, b) => a - b);
  const units = [...new Set(sorted.map(c => c.unit))];
  const lessons = [...new Set(sorted.map(c => c.lesson))];
  const blanks = sorted.filter(c => ((c.a || []).join('') + JSON.stringify(c.table || {})).includes('【')).length;
  const empty = sorted.filter(c => c._empty).length;
  const stars = sorted.filter(c => c.star >= 2).length;
  console.log(`\n== ${sub.dir} ==`);
  console.log(`  卡片 ${sorted.length} 张（可挖空 ${blanks}，★必背 ${stars}${empty ? `，⚠空答案 ${empty}` : ''}）`);
  console.log(`  页 ${pages.join(',')}`);
  console.log(`  单元 ${units.length} 个：${units.join(' | ')}`);
  console.log(`  课 ${lessons.length} 个：${lessons.slice(0, 30).join(' | ')}`);
  const perPage = {};
  sorted.forEach(c => { perPage[c.page] = (perPage[c.page] || 0) + 1; });
  console.log(`  每页卡数：${pages.map(p => `p${p}:${perPage[p]}`).join(' ')}`);
}
