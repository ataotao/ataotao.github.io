#!/usr/bin/env node
/* 历史种子重算 · 单元测试
 * 用法：node 工具/trainer/seed.test.mjs
 * 期望值来自原始种子实测（2026-11-18），不从实现反推。
 * 口径说明：任务卡「50 条事件 / 57 条事件」= recs + wrong 条目合计，非 recs 单独数量。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { rebuildLegacy, sniffAndNormalize, recordsRoot } from './seed.mjs';

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

/* ② 重算条数：物理 43 recs + 7 wrong = 50；数学 53 recs + 4 wrong = 57 */
const legacy = rebuildLegacy([physPath, mathPath]);
assert.equal(legacy.devices['legacy-2026-11-18'].recs.length, 43 + 53);
assert.equal(Object.keys(legacy.devices['legacy-2026-11-18'].wrong).length, 7 + 4);
ok('历史种子重算：物理 43+7 / 数学 53+4 → 合并 96 recs + 11 wrong');

/* ③ days 不双计：数学种子里 days.qs 有 40 条，不得进入并集 recs */
assert.equal(legacy.devices['legacy-2026-11-18'].recs.length, 96);
assert.equal('days' in legacy.devices['legacy-2026-11-18'], false);
ok('days 不双计：数学 40 条 days.qs 未进入 recs');

/* ④ 幂等：同一批种子重算两次结果逐字节一致 */
const again = rebuildLegacy([physPath, mathPath]);
assert.deepStrictEqual(again, legacy);
ok('重算幂等：同批种子两次结果一致');

/* ⑤ 历史设备独立：legacy 设备标识不等于任何本机，且不冒充 */
assert.equal(legacy.devices['legacy-2026-11-18'].deviceId, 'legacy-2026-11-18');
assert.equal(legacy.merged.deviceId, undefined);
ok('历史设备独立：legacy 用自己的 deviceId，merged 不冒充');

console.log('✓ 历史种子重算测试全过（5 组断言）');
