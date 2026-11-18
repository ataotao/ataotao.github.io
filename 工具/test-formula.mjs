// 公式记背 · 自检（不需要联网、不需要 jsdom）
// 用法： node 工具/test-formula.mjs
// 干两件事：① 把模板里的排版器抠出来跑一遍，检查每条公式都能画出来、没有漏掉的命令
//          ② 检查数据一致性（槽位数、选项、步骤、tex 与挖空填回去是否一致）
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = readFileSync(join(root, '工具', 'formula-template.html'), 'utf8');
const data = JSON.parse(readFileSync(join(root, '公式记背', '公式数据.json'), 'utf8'));

/* ---- 抠出排版器 ---- */
const a = tpl.indexOf('const SYM={');
const b = tpl.indexOf('/* 把 \\slot');
if (a < 0 || b < 0) { console.error('没找到排版器标记'); process.exit(1); }
const src = tpl.slice(a, b);
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const tex = new Function('esc', src + '\nreturn tex;')(esc);

let fail = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error('  ✗ ' + msg); } };

const flat = s => String(s).replace(/\s+/g, '').replace(/[{}]/g, '');
function fullTex(c) {
  if (c.tex) return c.tex;
  if (!c.cloze) return '';
  let s = c.cloze.tex;
  c.cloze.blanks.forEach((x, k) => { s = s.split(`\\slot{${k}}`).join(`{${x.ok}}`); });
  return s;
}

console.log(`数据：${data.title} · ${data.cards.length} 条\n`);

const HTML_TAG = /<\/?(span|sup|sub|i|div|em|b)\b/g;

for (const c of data.cards) {
  const tags = [];
  const check = (s, label) => {
    if (!s) return;
    const html = tex(s);
    tags.push([label, html]);
    ok(!/\\[a-zA-Z]/.test(html), `${c.id} ${label}：还有没被识别的命令 → ${html.slice(0, 80)}`);
    ok(!html.includes('undefined'), `${c.id} ${label}：渲染出 undefined`);
    ok(!html.includes('null'), `${c.id} ${label}：渲染出 null`);
    const open = (html.match(/<(span|sup|sub|i|div|em|b)\b/g) || []).length;
    const close = (html.match(/<\/(span|sup|sub|i|div|em|b)>/g) || []).length;
    ok(open === close, `${c.id} ${label}：标签不配对（${open}/${close}）`);
    // 未配对的花括号会当成字面量输出，这里顺带查一下有没有裸露的 { }
    ok(!/[{}]/.test(html), `${c.id} ${label}：渲染结果里有裸花括号 → ${html.slice(0, 80)}`);
  };

  // 完整公式
  check(fullTex(c), '公式');

  // 挖空
  if (c.cloze) {
    const slots = (c.cloze.tex.match(/\\slot\{/g) || []).length;
    ok(slots === c.cloze.blanks.length, `${c.id}：槽位 ${slots} ≠ blanks ${c.cloze.blanks.length}`);
    ok(tex(c.cloze.tex).includes('class="slot"'), `${c.id}：挖空公式里没有画出空位`);
    if (c.tex) ok(flat(fullTex(c)) === flat(c.tex), `${c.id}：tex 与挖空填回去不一致`);
    c.cloze.blanks.forEach((b, k) => {
      ok(!!b.ok, `${c.id} 第${k + 1}空缺 ok`);
      ok((b.wrong || []).length >= 3, `${c.id} 第${k + 1}空干扰项不足 3 个`);
      const seen = new Set([flat(b.ok)]);
      (b.wrong || []).forEach(w => {
        ok(!seen.has(flat(w)), `${c.id} 第${k + 1}空选项重复：${w}`);
        seen.add(flat(w));
        check(w, `第${k + 1}空选项`);
      });
      check(b.ok, `第${k + 1}空答案`);
    });
  }

  (c.steps || []).forEach((s, k) => check(s.t, `步骤${k + 1}`));

  ok(!!c.name, `${c.id} 缺 name`);
  ok(!!c.unit, `${c.id} 缺 unit`);
  ok(!!(c.tip || c.trap), `${c.id} 口诀和易错都没有，孩子记不住`);
}

/* 名称唯一（认一认模式的选项靠它判对错） */
const names = data.cards.map(c => c.name);
const dup = names.filter((x, i) => names.indexOf(x) !== i);
ok(dup.length === 0, '有重名：' + dup.join('、'));

/* 每单元至少 3 条，否则认一认凑不出 4 个选项 */
const byUnit = {};
data.cards.forEach(c => { byUnit[c.unit] = (byUnit[c.unit] || 0) + 1; });
Object.entries(byUnit).forEach(([u, k]) => ok(k >= 4, `${u} 只有 ${k} 条，认一认凑不满选项`));

/* 打印一条样例，肉眼确认排版 */
const demo = data.cards.find(c => c.id === 'qe-02');
console.log('样例渲染（求根公式）：');
console.log(tex(fullTex(demo)).replace(/></g, '>\n<'));
console.log('');

console.log(fail ? `❌ ${fail} 项不通过（共 ${n} 项断言）` : `✅ 全部通过（${n} 项断言）`);
process.exit(fail ? 1 : 0);
