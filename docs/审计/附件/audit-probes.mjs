#!/usr/bin/env node
// 数学闪练卡 · 内容审计探针（2026-11-20 审计配套）
//
// 用法：node docs/审计/附件/audit-probes.mjs
// 作用：把「现有验收测不出来、但会误导孩子」的几类问题做成可复跑的探针。
//   P2 反比例第二问与已知点同 x（答案写在题干里）
//   P3 分段函数第 4 问落在转折点（答案写在题干里）
//   P4 选择题正确答案位置分布（位置固定 = 可以一路点 A）
//   P5 判别式 Δ=0 时「根的个数」与解析口径是否一致
//   P6 带分数输入（"2 1/2"）是否被静默算错
//
// P1（题干里的 < 被 innerHTML 吞字）已在 2026-11-20 修掉，并转为运行时断言
// （数学/题库工具/smoke-ui.mjs 的「题干转义」一组），不再在这里做静态扫描：
// 静态扫描看不出 fracify 的转义，修好之后只会一直误报。
//
// 退出码：0 = 全部探针无告警；1 = 有告警（不阻断构建，供人工判断）。

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const core = readFileSync(join(ROOT, '数学', '源', 'train.core.js'), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(core + '\n;this.MT=MT;', ctx);
const MT = ctx.MT;

const warn = [];
const say = (k, msg) => { warn.push(k + ' ' + msg); console.log('⚠ ' + k + ' ' + msg); };

/* P1 题干 HTML 安全 —— 已转为运行时断言，见文件头说明 */

/* P2 / P3 答案是否直接写在题干里 */
let invTriv = 0, invTot = 0, pieceTriv = 0, pieceTot = 0;
for (let s = 1; s <= 400; s++) {
  const q1 = MT.gen('write', 'inverse', s);
  const m1 = q1.prompt.match(/经过点 \(([^,]+), ([^)]+)\)/);
  const a1 = q1.fields[1].label.match(/当 x = ([^ ]+) 时/);
  if (m1 && a1) { invTot++; if (m1[1].replace('−', '-') === a1[1].replace('−', '-')) invTriv++; }

  const q2 = MT.gen('write', 'piece', s);
  const m2 = q2.prompt.match(/和 \((\d+), (\d+)\)；之后/);
  if (m2) { pieceTot++; if (q2.fields[3].ans === Number(m2[1])) pieceTriv++; }
}
if (invTriv) say('P2', '反比例第二问与已知点同 x：' + invTriv + '/' + invTot);
if (pieceTriv) say('P3', '分段函数第 4 问落在转折点：' + pieceTriv + '/' + pieceTot);

/* P4 选项位置分布 */
MT.modules.filter((m) => m.kinds).forEach((m) => m.kinds.forEach((k) => {
  const cnt = {};
  for (let s = 1; s <= 200; s++) {
    MT.gen(m.id, k.id, s).fields.forEach((f, i) => {
      if (f.type !== 'choice') return;
      cnt[i] = cnt[i] || {};
      cnt[i][f.ans] = (cnt[i][f.ans] || 0) + 1;
    });
  }
  Object.keys(cnt).forEach((i) => {
    const d = cnt[i], hit = Math.max.apply(null, Object.values(d));
    if (hit / 200 >= 0.8) say('P4', m.id + '.' + k.id + ' 字段' + i + ' 正确答案 ' + Math.round(hit / 2) + '% 落在同一位置');
  });
}));
/* ENTRY 的选项在 gen()/dailyQueue() 里按种子打散，直接读 items 看到的是洗牌前的写死位置，
   必须走 gen 采样才反映孩子真正看到的东西。 */
const entryCnt = {};
const entryItems = MT.moduleById('entry').items;
for (let s = 1; s <= 200; s++) {
  entryItems.forEach((it) => {
    MT.gen('entry', it.id, s).fields.forEach((f, i) => {
      if (f.type !== 'choice' || !f.options || f.options.length < 2) return;
      const key = it.id + '#' + i;
      entryCnt[key] = entryCnt[key] || {};
      entryCnt[key][f.ans] = (entryCnt[key][f.ans] || 0) + 1;
    });
  });
}
Object.keys(entryCnt).forEach((key) => {
  const d = entryCnt[key], hit = Math.max.apply(null, Object.values(d));
  if (hit / 200 >= 0.8) say('P4', 'ENTRY ' + key + ' 正确答案 ' + Math.round(hit / 2) + '% 落在同一位置');
});

/* P5 Δ=0 口径 */
let d0 = 0, d0bad = 0;
for (let s = 1; s <= 400; s++) {
  const q = MT.gen('drill', 'disc', s);
  if (q.fields[0].ans !== 0) continue;
  d0++;
  const label = q.fields[1].label || '';
  if (!/不同/.test(label) && q.fields[1].ans === 1) d0bad++;
}
if (d0bad) say('P5', 'Δ=0 的题里 ' + d0bad + '/' + d0 + ' 问「实数根的个数」答 1，解析说「两个相等」');

/* P6 带分数 */
const mixed = MT.parseNum('2 1/2');
if (mixed === 10.5) say('P6', '"2 1/2" 被解析成 10.5（应为 2.5 或拒绝）');

console.log(warn.length ? '\n共 ' + warn.length + ' 条告警' : '\n✓ 探针全部通过');
process.exit(warn.length ? 1 : 0);
