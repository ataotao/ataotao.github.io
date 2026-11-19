#!/usr/bin/env node
/* 事件并集合并函数 · 单元测试（纯函数接缝，不碰 DOM / 网络）
 * 用法：node 工具/trainer/merge.test.mjs
 * 期望值全部为手写字面量，不从实现反推（TDD 独立真相源）。
 */
import assert from 'node:assert/strict';
import { mergeRecords, recSig, pickIdent } from './merge.mjs';

const ok = (msg) => console.log('  ✓ ' + msg);

/* ① 题目标识分族：内核族取 prompt 前 40 字，脚手架族取 kn */
assert.equal(pickIdent({ prompt: '氧气的性质与制法这道题很长很长很长很长很长很长' }), '氧气的性质与制法这道题很长很长很长很长很长很长'.slice(0, 40));
assert.equal(pickIdent({ kn: '杠杆平衡条件' }), '杠杆平衡条件');
assert.equal(pickIdent({ kn: '杠杆平衡条件', prompt: '用杠杆做题' }), '用杠杆做题');
assert.equal(pickIdent({}), '');
ok('分族题目标识：prompt[:40] 优先，回退 kn');

/* ② 去重键：四字段拼接，两族各自稳定 */
const rFlash = { ts: 100, mod: 'air', kind: 'o2', prompt: '氧气的性质' };
const rScaf = { ts: 200, mod: 'lever', kind: 'calc', kn: '杠杆平衡条件' };
assert.equal(recSig(rFlash), '100|air|o2|氧气的性质');
assert.equal(recSig(rScaf), '200|lever|calc|杠杆平衡条件');
assert.equal(recSig({ ...rFlash, ok: true, got: 4 }), recSig(rFlash));
ok('去重键 (ts,mod,kind,ident) 与作答结果无关');

/* ③ 幂等：同一份导入两次，条数不变 */
const once = { v: 1, recs: [rFlash, rScaf], wrong: {}, meta: {} };
const merged1 = mergeRecords(once, once);
const merged2 = mergeRecords(merged1, once);
assert.equal(merged1.recs.length, 2);
assert.equal(merged2.recs.length, 2);
ok('合并幂等：重复导入不翻倍');

/* ④ 事件并集：两设备各 3 条 → 6 条；再合并仍 6 条 */
const dev = (base, ident) => ({
  v: 1,
  recs: [0, 1, 2].map((i) => ({ ts: base + i, mod: 'air', kind: 'k', prompt: ident + i })),
  wrong: {}, meta: {}
});
const union = mergeRecords(dev(1000, '甲'), dev(2000, '乙'));
assert.equal(union.recs.length, 6);
assert.equal(mergeRecords(union, dev(1000, '甲')).recs.length, 6);
ok('事件并集：3+3=6，再同步仍 6');

/* ⑤ 不求和：累计计数取 max，不相加 */
const cntA = { v: 1, recs: [], wrong: {}, meta: { round: 7 } };
const cntB = { v: 1, recs: [], wrong: {}, meta: { round: 5 } };
assert.equal(mergeRecords(cntA, cntB).meta.round, 7);
ok('累计计数取 max，不求和（7 与 5 → 7）');

/* ⑥ wrong 合并：字段互补、ts/due 取 min、n 取 max */
const wA = { v: 1, recs: [], meta: {}, wrong: { k1: { key: 'k1', mod: 'air', kind: 'o2', due: 500, n: 2, ts: 100 } } };
const wB = { v: 1, recs: [], meta: {}, wrong: { k1: { key: 'k1', mod: 'air', tip: '看课本', due: 300, n: 5, ts: 90 }, k2: { key: 'k2', due: 999, n: 1 } } };
const wM = mergeRecords(wA, wB);
assert.deepStrictEqual(Object.keys(wM.wrong).sort(), ['k1', 'k2']);
assert.equal(wM.wrong.k1.due, 300);
assert.equal(wM.wrong.k1.n, 5);
assert.equal(wM.wrong.k1.ts, 90);
assert.equal(wM.wrong.k1.tip, '看课本');
assert.equal(wM.wrong.k1.mod, 'air');
ok('错题合并：互补字段、due/ts 取早、n 取大');

/* ⑦ 设备态不进载体：days / lastRound / dayPlan / sess 全部丢弃 */
const withDevState = {
  v: 1, recs: [rFlash], wrong: {},
  meta: { created: 100, lastRound: { air: ['a'] }, dayPlan: ['x'], lastKind: { air: 'o2' } },
  days: { '2026-11-15': { qs: [] } }, sess: { done: 3 }
};
const cleaned = mergeRecords(withDevState, withDevState);
assert.equal('days' in cleaned, false);
assert.equal('sess' in cleaned, false);
assert.equal('lastRound' in cleaned.meta, false);
assert.equal('dayPlan' in cleaned.meta, false);
assert.equal(cleaned.meta.created, 100);
assert.equal(cleaned.meta.round, 0);
ok('设备态丢弃：days/lastRound/dayPlan/sess 不进载体，created 取最早');

/* ⑧ meta.created 取两份中的最早值 */
const early = mergeRecords({ v: 1, recs: [], wrong: {}, meta: { created: 50 } }, { v: 1, recs: [], wrong: {}, meta: { created: 20 } });
assert.equal(early.meta.created, 20);
ok('meta.created 取两份最早');

/* ⑨ recs 不截断：整学期作答是期末复盘原始依据（原 2000→1500 截断已去掉） */
const big = { v: 1, wrong: {}, meta: {}, recs: Array.from({ length: 2200 }, (_, i) => ({ ts: i, mod: 'm', kind: 'k', prompt: 'p' + i })) };
const bigMerged = mergeRecords(big, { v: 1, recs: [], wrong: {}, meta: {} });
assert.equal(bigMerged.recs.length, 2200);
assert.equal(bigMerged.recs[0].ts, 0);   // 最老记录仍在
ok('recs 不截断：2200 条合并后全留，最老记录不丢');

console.log('✓ 合并函数单元测试全过（9 组断言）');
