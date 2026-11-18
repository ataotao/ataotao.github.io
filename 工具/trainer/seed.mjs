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

/** 从种子文件名识别科目（如「物理训练记录-2026-11-18.json」→ 物理）。
 *  按科隔离是硬约束：物理种子绝不能混进数学快照，否则两科同步会互相污染。 */
export function subjectOf(fileName) {
  var base = String(fileName || '');
  var m = base.match(/(物理|数学|化学|英语|语文|历史|道法)/);
  if (!m) throw new Error('无法从文件名识别科目：' + base);
  return m[1];
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
 * 由原始种子路径列表重算 legacy 快照 —— 按科目分别产出，互不混合。
 * 设备 id 形如「物理|legacy-2026-11-18」，竖线前半即科目（同步层据此分目录）。
 * @returns {{ devices: {[id]: object}, merged: object }}
 */
export function rebuildLegacy(filePaths) {
  var bySubject = Object.create(null);   // 科目 → 归一化后的 DB
  for (const p of filePaths) {
    var subject = subjectOf(path.basename(p));
    var raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    var norm = sniffAndNormalize(raw);
    var acc = bySubject[subject] || { v: 1, recs: [], wrong: {}, meta: {} };
    bySubject[subject] = mergeRecords(acc, norm);   // 同科多份种子仍取并集
  }
  var devices = Object.create(null);
  var merged = { v: 1, recs: [], wrong: {}, meta: {} };
  for (const subject of Object.keys(bySubject).sort()) {
    var db = bySubject[subject];
    var id = subject + '|' + LEGACY_ID;
    devices[id] = Object.assign({}, db, { v: 1, deviceId: id, subject: subject });
    merged = mergeRecords(merged, db);   // merged 仅供训练台读，不用于同步
  }
  return { devices: devices, merged: { v: 1, recs: merged.recs, wrong: merged.wrong, meta: merged.meta } };
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
  // 清理旧版单文件混合快照（早期段三产物，物理+数学混在 devices/legacy-*.json）
  var stale = path.join(outDir, LEGACY_ID + '.json');
  if (fs.existsSync(stale)) { fs.unlinkSync(stale); console.log('· 移除旧的混合快照 ' + stale); }
  for (const id of Object.keys(result.devices).sort()) {
    var d = result.devices[id];
    var dest = path.join(outDir, d.subject, LEGACY_ID + '.json');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(d, null, 2) + '\n', 'utf8');
    console.log('✓ 写入 ' + dest);
    console.log('  ' + d.recs.length + ' 条 recs · ' + Object.keys(d.wrong).length + ' 道错题 · deviceId=' + d.deviceId);
  }
}
