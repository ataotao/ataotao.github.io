#!/usr/bin/env node
/* 云同步编排 · 单元测试（纯函数，网络调用由页面薄适配层负责）
 * 用法：node 工具/trainer/sync.test.mjs
 */
import assert from 'node:assert/strict';
import { syncPlan, carrierSnapshot } from './sync.mjs';

const ok = (m) => console.log('  ✓ ' + m);

const mkDB = (recs, wrong, meta) => ({ v: 1, recs, wrong: wrong || {}, meta: meta || {} });
const rec = (ts, id) => ({ ts, mod: 'air', kind: 'o2', prompt: '题' + id });

/* ① 两设备各 3 题 → 本机拿到 6 条；再同步仍 6 条（验收 12） */
const local = mkDB([rec(1000, 'A'), rec(1001, 'A'), rec(1002, 'A')]);
const remote = {
  'dev-b': carrierSnapshot('dev-b', mkDB([rec(2000, 'B'), rec(2001, 'B'), rec(2002, 'B')])),
  'legacy-2026-11-18': carrierSnapshot('legacy-2026-11-18', mkDB([rec(500, 'L')]))
};
const plan1 = syncPlan(local, remote, 'dev-a');
assert.equal(plan1.db.recs.length, 7);   // A3 + B3 + legacy1
assert.equal(plan1.snapshot.deviceId, 'dev-a');
assert.equal(plan1.snapshot.recs.length, 7);
const plan2 = syncPlan(plan1.db, remote, 'dev-a');
assert.equal(plan2.db.recs.length, 7);
ok('云同步：3+3+1=7 条，再同步仍 7 条（幂等）');

/* ② 清空本机 localStorage 后从载体恢复（验收 13） */
const empty = mkDB([]);
const restored = syncPlan(empty, { ...remote, 'dev-a': plan1.snapshot }, 'dev-a');
assert.equal(restored.db.recs.length, 7);
ok('清缓存后从载体恢复：本机空 → 7 条历史不丢');

/* ③ 只搬 recs + wrong，设备态不进载体（验收 16 / ADR-0007 决定 7） */
const dirty = mkDB([rec(1, 'X')], { k: { key: 'k', due: 9 } }, { created: 5, lastRound: { air: ['x'] }, dayPlan: ['y'] });
dirty.days = { '2026-11-15': { qs: [rec(1, 'X')] } };
dirty.sess = { done: 2 };
const snap = carrierSnapshot('dev-z', dirty);
assert.equal('days' in snap, false);
assert.equal('sess' in snap, false);
assert.equal('lastRound' in snap.meta, false);
assert.equal('dayPlan' in snap.meta, false);
assert.equal(snap.meta.created, 5);
ok('载体只含 recs/wrong，days/sess/lastRound/dayPlan 全丢弃');

/* ④ 自己的旧快照被整份覆盖；别人快照不动（决定 2） */
const writeSet = syncPlan(local, remote, 'dev-a').writeTargets;
assert.deepStrictEqual(Object.keys(writeSet).sort(), ['dev-a']);
ok('写回只覆盖自己那份：writeTargets 仅 dev-a');

/* ⑤ deviceId/qid：同步后保留题目标识字段 */
const withQid = mkDB([{ ts: 3, mod: 'air', kind: 'o2', prompt: '题Q', qid: 'air.o2.题Q' }]);
const qplan = syncPlan(withQid, {}, 'dev-a');
assert.equal(qplan.db.recs[0].qid, 'air.o2.题Q');
ok('qid 字段在同步往返中保留');

console.log('✓ 云同步编排测试全过（5 组断言）');
