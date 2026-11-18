/* 历史种子重算 · 由 学习记录/原始/*.json 生成 legacy 设备快照
 * ============================================================
 * 种子只增不改；合并结果一律由它重算，用来证明「没丢数据」（ADR-0007 原始种子）。
 * 只搬 recs + wrong；days / lastRound / dayPlan 是设备态，丢弃（决定 7）。
 * legacy 是独立历史设备，用自己的 deviceId，不冒充本机（决定 8）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeRecords } from './merge.mjs';

const LEGACY_ID = 'legacy-2026-11-18';

/** 私有数据仓根目录：真实作答数据只在这里（ADR-0007 决定 9），绝不进公开站点仓。
 *  可用环境变量 LT_RECORDS_DIR 覆盖；默认本机 clone 路径。 */
export function recordsRoot() {
  return process.env.LT_RECORDS_DIR || 'C:/learn/ataotao.github.io_learning-records';
}

/** 内容嗅探：裸 DB {v,recs,wrong} 与带外壳 {schema:'lt.practice-records/1',data} 都认（ADR-0001） */
export function sniffAndNormalize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('种子不是对象');
  var d = raw;
  if (raw.schema === 'lt.practice-records/1' && raw.data && typeof raw.data === 'object') d = raw.data;
  if (!Array.isArray(d.recs) || !d.wrong || typeof d.wrong !== 'object') {
    throw new Error('种子缺少 recs / wrong 字段');
  }
  return {
    v: 1,
    recs: d.recs.slice(),
    wrong: Object.assign({}, d.wrong),
    meta: Object.assign({}, d.meta || {})
    /* days / lastRound / dayPlan 故意不拷贝：设备态不进载体 */
  };
}

/**
 * 由原始种子路径列表重算 legacy 快照。
 * @returns {{ devices: {[id]: object}, merged: object }}
 */
export function rebuildLegacy(filePaths) {
  var acc = { v: 1, recs: [], wrong: {}, meta: {} };
  var created = Infinity;
  for (const p of filePaths) {
    var raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    var norm = sniffAndNormalize(raw);
    if (typeof norm.meta.created === 'number') created = Math.min(created, norm.meta.created);
    acc = mergeRecords(acc, norm);
  }
  if (created !== Infinity) acc.meta.created = created;
  var device = Object.assign({}, acc, { v: 1, deviceId: LEGACY_ID });
  // merged 是不带 deviceId 的合并视图，供训练台读；不含设备态
  var merged = { v: 1, recs: acc.recs, wrong: acc.wrong, meta: acc.meta };
  return {
    devices: { [LEGACY_ID]: device },
    merged: merged
  };
}

/** CLI：node 工具/trainer/seed.mjs [输出目录]
 *  种子从私有仓 raw/ 读，快照写私有仓 devices/（默认），可用 LT_RECORDS_DIR 覆盖根。 */
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = recordsRoot();
  const seedDir = path.join(root, 'raw');
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'devices');
  const files = fs.readdirSync(seedDir).filter((f) => /\.json$/i.test(f)).map((f) => path.join(seedDir, f)).sort();
  if (!files.length) { console.error('没有找到原始种子：' + seedDir); process.exit(1); }
  var result = rebuildLegacy(files);
  fs.mkdirSync(outDir, { recursive: true });
  var dest = path.join(outDir, LEGACY_ID + '.json');
  fs.writeFileSync(dest, JSON.stringify(result.devices[LEGACY_ID], null, 2) + '\n', 'utf8');
  var d = result.devices[LEGACY_ID];
  console.log('✓ 写入 ' + dest);
  console.log('  ' + d.recs.length + ' 条 recs · ' + Object.keys(d.wrong).length + ' 道错题 · deviceId=' + d.deviceId);
}
