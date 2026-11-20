#!/usr/bin/env node
// 一次性脚本：按题 id 定位其后第一行 fig:，整行替换成重算过坐标的图。
// 2026-11-20 审计 §4：6 张手绘图顶点不在圆上 / 角度差一倍 / 比例失真。
//
// 已执行完毕（结果已写进 数学/源/train.core.js）。保留本文件只为记录每张图的
// 坐标是怎么算出来的：**不要再跑一遍**，否则会把之后手改的图覆盖回去。
// 图形本身的回归由 数学/题库工具/smoke-ui.mjs 的 A05 一组断言守护。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FILE = join(ROOT, '数学', '源', 'train.core.js');

const T = (x, y, s, size = 14, color = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-family="serif"${color ? ` fill="${color}"` : ''}>${s}</text>`;
const L = (x1, y1, x2, y2, color = '#1b2430', w = 1.5, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const P = (d, color = '#1b2430', w = 1.5, fill = 'none') =>
  `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${w}"/>`;

const FIGS = {
  /* 正方形 90×90，P 由 BA 绕 B 逆时针转 60°：BP 方向 (cos120, sin120)·90 = (−45, +77.9) */
  'entry.24.1': { w: 320, h: 240, svg:
    `<rect x="110" y="48" width="90" height="90" fill="none" stroke="#1b2430" stroke-width="1.5"/>` +
    P('M 110 138 L 155 215.9 L 200 138 Z') +
    P('M 155 138 A 45 45 0 0 0 177.5 177', '#e37400', 1.2, 'none') +
    `<circle cx="200" cy="138" r="2.6" fill="#1b2430"/>` +
    T(96, 154, 'A') + T(206, 154, 'B') + T(206, 44, 'C') + T(96, 44, 'D') + T(146, 234, 'P') +
    T(140, 172, 'α', 12, '#a15c00') },

  /* AB 为直径，∠BOC=80°：C 在 −80°、D 在 −160°（AD ∥ OC，方向均为 −80°） */
  'entry.14.1': { w: 320, h: 220, svg:
    `<circle cx="160" cy="108" r="85" fill="none" stroke="#1b2430" stroke-width="1.5"/>` +
    L(75, 108, 245, 108) + L(160, 108, 174.8, 24.3) + L(75, 108, 80.1, 78.9) +
    `<circle cx="160" cy="108" r="2.6" fill="#1b2430"/>` +
    P('M 190 108 A 30 30 0 0 0 165.2 78.5', '#e37400', 1.2) +
    T(63, 124, 'A') + T(247, 124, 'B') + T(152, 124, 'O') + T(179, 20, 'C') + T(64, 74, 'D') +
    T(187, 78, '80', 11, '#a15c00') },

  /* BC ∥ OD：D 在 250°、C 在 2·250−180 = 320°，两段弧都在圆上 */
  'entry.t05': { w: 320, h: 220, svg:
    `<circle cx="160" cy="110" r="80" fill="none" stroke="#1b2430" stroke-width="1.5"/>` +
    L(80, 110, 240, 110) + L(240, 110, 221.3, 58.6) + L(160, 110, 132.6, 34.8) + L(240, 110, 132.6, 34.8) +
    `<circle cx="160" cy="110" r="2.6" fill="#1b2430"/>` +
    T(68, 126, 'A') + T(242, 126, 'B') + T(226, 54, 'C') + T(120, 30, 'D') + T(151, 126, 'O') +
    P('M 140.2 55.5 A 22 22 0 0 0 150.7 47.4', '#e37400', 1.5) +
    P('M 214 110 A 26 26 0 0 1 218.7 95.1', '#e37400', 1.5) },

  /* 灯罩轴截面：k=5.5px/单位，CD=12→66px、HF=31→170.5px（原图 142:145 ≈ 1:1） */
  'entry.t06': { w: 320, h: 220, svg:
    P('M 127 194.5 A 85.8 85.8 0 1 1 193 194.5') +
    L(120, 200, 200, 200) + L(127, 200, 127, 194.5) + L(193, 200, 193, 194.5) + L(160, 29.5, 160, 200) +
    `<circle cx="160" cy="115.3" r="2.6" fill="#1b2430"/>` +
    P('M 160 200 L 168 200 L 168 192', '#e37400', 1.2) +
    T(154, 24, 'H') + T(166, 111, 'O') + T(152, 216, 'F') +
    T(106, 191, 'A', 13) + T(198, 191, 'B', 13) + T(114, 215, 'C', 13) + T(198, 215, 'D', 13) },

  /* 圆内接四边形：∠A=½(340−200)=70°、∠B=½(360−170)=95°，四点全在 r=82 上 */
  'entry.t12': { w: 320, h: 220, svg:
    `<circle cx="160" cy="110" r="82" fill="none" stroke="#1b2430" stroke-width="1.5"/>` +
    P('M 160 192 L 82.9 82 L 145.8 29.2 L 237.1 82 Z') +
    `<circle cx="160" cy="110" r="2.6" fill="#1b2430"/>` +
    T(153, 208, 'A') + T(66, 86, 'B') + T(139, 21, 'C') + T(242, 86, 'D') + T(152, 126, 'O', 13) +
    T(150, 166, '70', 11, '#a15c00') + T(104, 92, '95', 11, '#a15c00') },

  /* 圆锥 + 展开扇形：扇形半径 75 = 母线，圆心角 216°（弧长 6π ÷ 5 = 1.2π rad） */
  'entry.t21': { w: 320, h: 220, svg:
    L(72, 108, 27, 168) + L(72, 108, 117, 168) +
    `<ellipse cx="72" cy="168" rx="45" ry="10" fill="none" stroke="#1b2430" stroke-width="1.2"/>` +
    P('M 232 166 L 160.7 189.2 A 75 75 0 1 1 303.3 189.2 Z') +
    `<circle cx="72" cy="108" r="2.6" fill="#1b2430"/><circle cx="232" cy="166" r="2.6" fill="#1b2430"/>` +
    T(62, 102, 'A', 13) + T(24, 132, 'l = 5', 12, '#a15c00') + T(74, 188, 'r = 3', 12, '#a15c00') +
    T(238, 162, 'O', 13) },
};

const lines = readFileSync(FILE, 'utf8').split('\n');
let done = 0;
for (const [id, fig] of Object.entries(FIGS)) {
  const i = lines.findIndex((l) => l.includes(`id: '${id}'`));
  if (i < 0) { console.error('找不到 ' + id); continue; }
  const j = lines.findIndex((l, k) => k > i && /^\s*fig: \{/.test(l));
  if (j < 0 || j > i + 12) { console.error(id + ' 后面没有 fig 行'); continue; }
  lines[j] = `      fig: { w: ${fig.w}, h: ${fig.h}, need: 1, svg: '${fig.svg}' },`;
  done++;
}
writeFileSync(FILE, lines.join('\n'));
console.log('替换 ' + done + ' 张图');
