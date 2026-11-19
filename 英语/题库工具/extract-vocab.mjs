#!/usr/bin/env node
/* 英语单词闪练卡 · 词库 + 例句提取
 * 从 apps/english/src/data/{沪教版,沪教牛津小学}/*.ts 提取词库，
 * 并从粤学词 full-data.js / primary-data.js 注入真实语料库例句，
 * → 英语/源/train.data.js
 *
 * apps/english 是词库的单一真相源；例句来自粤学词（同教材词表体系的词典例句，
 * 非课文原文——仓库无课文原文数据）。词条紧凑数组：
 *   [english, ipa, pos, chinese, example, exampleZh]，无例句时后两位为空串。
 * 用法：node 英语/题库工具/extract-vocab.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DATA_DIR = path.join(ROOT, 'apps', 'english', 'src', 'data');
const OUT = path.join(ROOT, '英语', '源', 'train.data.js');
const LEXICONS = [
  ['英语/yuexueci-web/full-data.js', 'FULL_LEXICON'],
  ['英语/yuexueci-web/primary-data.js', 'PRIMARY_LEXICON']
];

/* 词形归一化：小写 + 去首尾 + 折叠内部空格 */
function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

/* 目标词的可能形态（用于判断例句是否真的包含该词、能否高亮） */
function wordForms(w) {
  var s = norm(w);
  if (!s) return [];
  var f = [s];
  if (/[^aeiou]y$/.test(s)) f.push(s.slice(0, -1) + 'ies', s.slice(0, -1) + 'ied');
  else if (/(fe|f)$/.test(s)) f.push(s.replace(/(fe|f)$/, 'ves'));   // leaf→leaves
  else {
    f.push(s + 's', s + 'es');
    if (/e$/.test(s)) f.push(s + 'd', s + 'ing'); else f.push(s + 'ed', s + 'ing');
  }
  return f;
}
/* 例句是否包含目标词（按词边界，取短语的首个实词兜底） */
function exampleHasWord(ex, word) {
  var text = norm(ex);
  var candidates = [norm(word)];
  var firstContent = norm(word).split(/\s+/).filter(function (x) { return x && !/^(a|an|the|of|to|in|on|for|and|or)$/.test(x); })[0];
  if (firstContent && candidates.indexOf(firstContent) < 0) candidates.push(firstContent);
  for (var i = 0; i < candidates.length; i++) {
    var forms = wordForms(candidates[i]).map(function (f) { return f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    try {
      var re = new RegExp('\\b(?:' + forms.join('|') + ')\\b', 'i');
      if (re.test(text)) return true;
    } catch (e) { /* 含特殊字符的词形跳过 */ }
  }
  return false;
}

/* 例句表：词形 → [example, exampleZh]。full 在前优先（语料质量更高） */
function loadExamples() {
  const map = new Map();
  for (const [rel, globalName] of LEXICONS) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) { console.warn('⚠ 例句源缺失：' + rel); continue; }
    const sb = { window: {} };
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sb, { filename: path.basename(file) });
    const obj = sb.window[globalName];
    if (!obj || !Array.isArray(obj.entries)) continue;
    for (const e of obj.entries) {
      const w = norm(e.word || e.text);
      const ex = String(e.example || '').trim();
      if (!w || !ex || map.has(w)) continue;
      map.set(w, [ex, String(e.exampleZh || '').trim()]);
    }
  }
  return map;
}
const EXAMPLES = loadExamples();

/* 只取用户确认的两个来源，顺序即闪练卡里的年级顺序（低→高） */
const SOURCES = [
  { id: 'primary', name: '沪教牛津小学', dir: '沪教牛津小学',
    grades: [['三上', '三上'], ['三下', '三下'], ['四上', '四上'], ['四下', '四下'],
             ['五上', '五上'], ['五下', '五下'], ['六上', '六上'], ['六下', '六下']] },
  { id: 'hb', name: '沪教版', dir: '沪教版',
    grades: [['七上', '七上'], ['七下', '七下'], ['八上', '八上'], ['八下', '八下'],
             ['九上', '九上'], ['九下', '九下']] }
];

function parseCategory(file) {
  let src = fs.readFileSync(file, 'utf8');
  // .ts 字面量是合法 JS，只需去掉 import 行与 export/类型标注
  src = src.replace(/^\s*import[^\n]*\n/gm, '');
  src = src.replace(/export\s+const\s+[^\s:]+(?:\s*:\s*Category)?\s*=/, 'var __CAT__ =');
  const sb = {};
  vm.createContext(sb);
  vm.runInContext(src, sb, { filename: file });
  const cat = vm.runInContext('__CAT__', sb);
  if (!cat || !Array.isArray(cat.units)) throw new Error('解析不出 units：' + file);
  return cat;
}

const sources = [];
let gradeCount = 0, unitCount = 0, wordCount = 0, ipaCount = 0, skipped = 0, exCount = 0;
const seenEn = new Set();
for (const s of SOURCES) {
  const grades = [];
  for (const [fileBase, name] of s.grades) {
    const file = path.join(DATA_DIR, s.dir, fileBase + '.ts');
    if (!fs.existsSync(file)) throw new Error('缺词库文件：' + file);
    const cat = parseCategory(file);
    if (cat.source && cat.source !== s.name) {
      throw new Error('来源不符：' + file + ' 写的是 ' + cat.source);
    }
    const units = [];
    for (const u of cat.units) {
      const words = [];
      for (const w of u.words) {
        const en = String(w.english || '').trim();
        const zh = String(w.chinese || '').trim();
        if (!en || !zh) { skipped++; console.warn('⚠ 跳过脏词条：' + file + ' / ' + JSON.stringify(w)); continue; }
        const ipa = String(w.phonetic || '').trim();
        if (ipa) ipaCount++;
        const ex = EXAMPLES.get(norm(en));
        // 例句必须真的含有目标词（或可高亮的词形）才保留，避免给孩子看标不出词的例句
        const usable = ex && exampleHasWord(ex[0], en);
        if (usable) exCount++;
        words.push([en, ipa, String(w.pos || '').trim(), zh, usable ? ex[0] : '', usable ? ex[1] : '']);
        wordCount++;
        seenEn.add(en.toLowerCase());
      }
      if (!words.length) throw new Error('空单元：' + file + ' / ' + u.id);
      units.push({ id: String(u.id || ''), name: String(u.title || ''), words });
      unitCount++;
    }
    grades.push({ id: String(cat.id || fileBase), name, units });
    gradeCount++;
  }
  sources.push({ id: s.id, name: s.name, grades });
}

const payload = { v: 1, sources };
const banner = '/* 由 英语/题库工具/extract-vocab.mjs 从 apps/english 生成词库、粤学词注入例句；勿手改 */\n';
fs.writeFileSync(OUT, banner + 'var EW_VOCAB = ' + JSON.stringify(payload) + ';\n', 'utf8');
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log('✓ 词库 + 例句提取完成');
console.log(`  来源 ${sources.length} · 年级册 ${gradeCount} · 单元 ${unitCount} · 词 ${wordCount} · 有音标 ${ipaCount} · 有例句 ${exCount} (${(exCount / wordCount * 100).toFixed(1)}%) · 不同词 ${seenEn.size}${skipped ? ' · 跳过脏词 ' + skipped : ''}`);
console.log(`  → 英语/源/train.data.js (${kb} KB)`);
