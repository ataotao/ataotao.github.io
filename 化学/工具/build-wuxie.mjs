#!/usr/bin/env node
// 化学每日五写 · 构建
// 用法：仓库根执行  node 化学/工具/build-wuxie.mjs
// 作用：把 化学/源/data/wuxie.json 注入 化学/源/wuxie.html，生成 化学/化学每日五写.html
//       产物不手改，改源后重跑本脚本（parity 会检查有没有漏跑）。
//
// 数据体检在这里做：出题池不够 14 天轮转、某类问法缺失、题干不带真题问法、答案漏写，
// 全部在构建期拦住 —— 宁可构建失败，也不让一张「不像真题」的纸发到孩子手上。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');          // 化学/
const repo = path.resolve(root, '..');

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('源/wuxie.html');
const data = JSON.parse(read('源/data/wuxie.json'));

const err = [], warn = [];

if (!src.includes('/*__DATA__*/')) {
  console.error('✗ 源/wuxie.html 缺少 /*__DATA__*/ 占位符');
  process.exit(1);
}

/* ---------- 体检 ---------- */
const need = (cond, msg) => { if (!cond) err.push(msg); };

// 1. 化学式：必须有 5 类问法，每类够 12 天轮转
const types = [...new Set((data.chem || []).map((x) => x.t))];
need(types.length === 5, `化学式问法应为 5 类，实际 ${types.length} 类：${types.join(' / ')}`);
for (const t of types) {
  const n = data.chem.filter((x) => x.t === t).length;
  if (n < 12) warn.push(`化学式「${t}」只有 ${n} 条，轮转周期 ${n} 天（建议 ≥12）`);
}

// 2. 每天要 2 道方程式 → 至少 14 天不重复
need((data.eq || []).length >= 28, `化学方程式只有 ${(data.eq || []).length} 条，够不上 14 天轮转（需 ≥28）`);

// 3. 现象句：三种状态齐备，各够 12 天
for (const k of ['固体', '气体', '溶液']) {
  const n = (data.phen || []).filter((x) => x.kind === k).length;
  need(n > 0, `现象句缺「${k}」类`);
  if (n < 12) warn.push(`现象句「${k}」只有 ${n} 条（建议 ≥12）`);
}

// 4. 原因句：每天 2 道
need((data.reason || []).length >= 28, `原因句只有 ${(data.reason || []).length} 条（需 ≥28）`);

// 5. 逐条：题干像真题问法、答案和易错不能空
const has = (s, arr) => arr.some((k) => String(s).includes(k));
(data.chem || []).forEach((x, i) => {
  need(x.q && x.a, `chem[${i}] 缺 q 或 a`);
  need(has(x.q, ['写出', '改正', '求']), `chem[${i}] 题干不是真题问法（应以「写出/改正/求」起）：${x.q}`);
  need(x.bad, `chem[${i}] 缺易错说明：${x.q}`);
});
(data.eq || []).forEach((x, i) => {
  need(x.q && x.a, `eq[${i}] 缺 q 或 a`);
  need(has(x.q, ['化学方程式']), `eq[${i}] 题干没写「化学方程式」：${x.q}`);
  need(Array.isArray(x.pts) && x.pts.length >= 3, `eq[${i}] 采分点少于 3 条：${x.q}`);
  need(x.bad, `eq[${i}] 缺易错说明：${x.q}`);
  need(!/undefined|NaN/.test(String(x.a)), `eq[${i}] 答案含 undefined/NaN`);
});
(data.phen || []).forEach((x, i) => {
  need(x.q && x.a, `phen[${i}] 缺 q 或 a`);
  need(has(x.q, ['现象', '观察']), `phen[${i}] 题干没问「现象」：${x.q}`);
  need(Array.isArray(x.pts) && x.pts.length >= 1, `phen[${i}] 缺采分点：${x.q}`);
  need(x.bad, `phen[${i}] 缺易错说明：${x.q}`);
});
(data.reason || []).forEach((x, i) => {
  need(x.q && x.a, `reason[${i}] 缺 q 或 a`);
  need(has(x.q, ['原因', '作用', '目的', '理由', '依据', '说明']), `reason[${i}] 题干不是原因/作用/目的类问法：${x.q}`);
  need(Array.isArray(x.pts) && x.pts.length >= 2, `reason[${i}] 采分点少于 2 条：${x.q}`);
  need(x.bad, `reason[${i}] 缺易错说明：${x.q}`);
});

// 6. 去重：同一题干不能出现两次（不同问法池里重了会一天做两遍）
const seen = new Map();
[...(data.chem || []), ...(data.eq || []), ...(data.phen || []), ...(data.reason || [])].forEach((x) => {
  const k = x.q.replace(/\s/g, '');
  if (seen.has(k)) err.push(`题干重复：${x.q}`);
  seen.set(k, 1);
});

// 7. 单元归属：每条落在 1..11；学到的每个进度档都要能凑出该有的题量
const UNITS = data.units || [];
need(UNITS.length === 11, `单元表应为 11 条（人教版 2024 新版），实际 ${UNITS.length} 条`);
UNITS.forEach((u, i) => {
  need(u.i === i + 1, `单元表第 ${i + 1} 条序号应为 ${i + 1}，实际 ${u.i}`);
  need(u.book === '上' || u.book === '下', `单元 ${u.i} 的册别应为「上」或「下」，实际 ${u.book}`);
  need(u.n && u.id, `单元 ${u.i} 缺名称或 id`);
});
const UMAX = UNITS.length;

const POOLS = [
  ['化学式', data.chem || []],
  ['化学方程式', data.eq || []],
  ['现象句', data.phen || []],
  ['原因句', data.reason || []],
];
for (const [name, arr] of POOLS) {
  arr.forEach((x, i) => {
    need(Number.isInteger(x.u) && x.u >= 1 && x.u <= UMAX, `${name}[${i}] 的单元 u=${x.u} 不在 1..${UMAX}`);
  });
}

const PLAN = { chem: 5, eq: 2, phen: 3, reason: 2 };
const rows = [];
for (let lv = 1; lv <= UMAX; lv++) {
  rows.push({ lv, c: POOLS.map(([, arr]) => arr.filter((x) => x.u <= lv).length) });
}
const at = (lv) => rows.find((r) => r.lv === lv).c;
const defLv = UNITS.filter((u) => u.book === '上').reduce((a, u) => Math.max(a, u.i), 1);
const up = at(defLv);
const title = ['化学式', '化学方程式', '现象句', '原因句'];
const short = ['化式', '方程', '现象', '原因'];
const need4 = [PLAN.chem, PLAN.eq, PLAN.phen, PLAN.reason];
need4.forEach((n, i) => {
  need(up[i] >= n, `默认范围（学到九上第 ${defLv} 单元）${title[i]}只有 ${up[i]} 条，凑不够 ${n} 条`);
});

// 学到「自然界的水」（化学式起始单元）时，5 类问法必须都抽得到
const water = UNITS.find((u) => u.id === 'water') || { i: 4, n: '自然界的水' };
const wTypes = [...new Set((data.chem || []).filter((x) => x.u <= water.i).map((x) => x.t))];
need(wTypes.length === types.length,
  `学到第 ${water.i} 单元「${water.n}」时化学式只有 ${wTypes.length} 类问法（${wTypes.join('/')}），应为 ${types.length} 类`);

if (err.length) {
  console.error('✗ 数据体检未通过：\n  ' + err.join('\n  '));
  process.exit(1);
}

/* ---------- 注入 ---------- */
const payload = JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
const out = src.replace('/*__DATA__*/', payload);
const outPath = path.join(root, '化学每日五写.html');
fs.writeFileSync(outPath, out, 'utf8');

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
const n = (a) => (a || []).length;
console.log(`✓ 化学每日五写.html  ${kb} KB`);
console.log(`  化学式 ${n(data.chem)} 条（${types.length} 类）· 方程式 ${n(data.eq)} · 现象 ${n(data.phen)} · 原因 ${n(data.reason)}`);
console.log(`  九上全时每天 5+2+3+2=12 项，轮转周期 ≈ ${Math.min(28, Math.floor(n(data.chem) / 5))} 天；范围按「学到第 N 单元」筛，低进度项数自动变少`);
console.log('  按进度可用（累计到该单元）：');
for (const u of UNITS) {
  const c = at(u.i);
  const tot = c.reduce((a, b) => a + b, 0);
  console.log(
    `    ${u.book} ${String(u.i).padStart(2)} ${u.n.padEnd(10, '　')} ` +
    c.map((x, i) => `${short[i]}${String(x).padStart(3)}`).join(' ') +
    `   共 ${String(tot).padStart(3)} 条${u.i === defLv ? '  ← 默认' : ''}`
  );
}
if (warn.length) console.log('  ⚠ ' + warn.join('\n  ⚠ '));
console.log(`  产物：${path.relative(repo, outPath)}`);
