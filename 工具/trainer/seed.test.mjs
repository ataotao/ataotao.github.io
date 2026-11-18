#!/usr/bin/env node
/* 历史种子重算 · 单元测试
 * 用法：node 工具/trainer/seed.test.mjs
 * 期望值来自原始种子实测（2026-11-18），不从实现反推。
 * 口径说明：任务卡「50 条事件 / 57 条事件」= recs + wrong 条目合计，非 recs 单独数量。
 * 按科隔离（本次修复）：物理种子只产出物理快照、数学只产出数学，互不混合。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { rebuildLegacy, sniffAndNormalize, recordsRoot, subjectOf } from './seed.mjs';

const seedDir = path.join(recordsRoot(), 'raw');
const ok = (msg) => console.log('  ✓ ' + msg);

/* ① 内容嗅探：三科裸 DB 与带外壳两种形态都认 */
const physPath = path.join(seedDir, '物理训练记录-2026-11-18.json');
const mathPath = path.join(seedDir, '数学训练记录-2026-11-18.json');
const physRaw = JSON.parse(fs.readFileSync(physPath, 'utf8'));
const mathRaw = JSON.parse(fs.readFileSync(mathPath, 'utf8'));
assert.equal(sniffAndNormalize(physRaw).v, 1);
assert.equal(sniffAndNormalize({ schema: 'lt.practice-records/1', data: physRaw }).v, 1);
ok('内容嗅探：裸 DB 与带外壳两种导出形态都识别');

/* ② 科目识别：文件名前缀 → 科目代码（用于按科分目录） */
assert.equal(subjectOf('物理训练记录-2026-11-18.json'), '物理');
assert.equal(subjectOf('数学训练记录-2026-11-18.json'), '数学');
ok('科目识别：文件名前缀映射到科目');

/* ③ 按科重算：物理 43/7、数学 53/4，两科快照互不混入对方数据 */
const legacy = rebuildLegacy([physPath, mathPath]);
const phys = legacy.devices['物理|legacy-2026-11-18'];
const math = legacy.devices['数学|legacy-2026-11-18'];
assert.ok(phys, '缺物理科快照');
assert.ok(math, '缺数学科快照');
assert.equal(phys.recs.length, 43);
assert.equal(Object.keys(phys.wrong).length, 7);
assert.equal(math.recs.length, 53);
assert.equal(Object.keys(math.wrong).length, 4);
assert.equal(phys.deviceId, '物理|legacy-2026-11-18');
assert.equal(math.deviceId, '数学|legacy-2026-11-18');
assert.equal('days' in math, false);
ok('按科重算：物理 43+7 / 数学 53+4，各自独立快照');

/* ④ 按科隔离：物理快照里没有任何数学记录，反之亦然（去重键集合无交集） */
const sig = (r) => [r.ts, r.mod, r.kind, String(r.prompt || '').slice(0, 40) || String(r.kn || '')].join('|');
const physSigs = new Set(phys.recs.map(sig));
const mathSigs = new Set(math.recs.map(sig));
const overlap = [...physSigs].filter((k) => mathSigs.has(k));
assert.equal(overlap.length, 0, '两科快照出现相同记录，说明串科');
// 数学独有的 days.qs 不得进入任何快照
assert.equal(legacy.devices['数学|legacy-2026-11-18'].recs.length, 53);
ok('按科隔离：两科快照记录零交集，数学 days 未双计');

/* ⑤ 幂等：同一批种子重算两次结果逐字节一致 */
const again = rebuildLegacy([physPath, mathPath]);
assert.deepStrictEqual(again, legacy);
ok('重算幂等：同批种子两次结果一致');

/* ⑥ 单科输入：只给物理种子时不应凭空冒出数学设备 */
const onlyPhys = rebuildLegacy([physPath]);
assert.equal(Object.keys(onlyPhys.devices).length, 1);
assert.ok(onlyPhys.devices['物理|legacy-2026-11-18']);
assert.ok(!onlyPhys.devices['数学|legacy-2026-11-18']);
ok('单科输入：只产出该科快照，无凭空设备');

console.log('✓ 历史种子重算测试全过（6 组断言）');
