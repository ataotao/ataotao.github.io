/* 云同步编排 · 纯函数（网络 I/O 由页面薄适配层负责）
 * ============================================================
 * 真源仍是各设备浏览器（GLOSSARY 同步载体）；本模块只决定「拉全部后怎么合、写回什么」。
 * 网络适配（GitHub Contents API + PAT + sha 乐观锁）不在此处，本机测试覆盖不到，
 * 由页面侧 sync-adapter 把快照读写接到 fetch，编排保持可测。
 */
import { mergeRecords } from './merge.mjs';

/**
 * 由本机 DB 生成写进载体的快照：只带 recs/wrong/meta，打上 deviceId，丢弃设备态。
 */
export function carrierSnapshot(deviceId, db, subject) {
  var merged = mergeRecords(db, { v: 1, recs: [], wrong: {}, meta: {} });
  return {
    v: 1,
    deviceId: deviceId,
    subject: subject || subjectFromId(deviceId) || '',
    recs: merged.recs,
    wrong: merged.wrong,
    meta: merged.meta
    /* days / lastRound / dayPlan / sess 故意不带上 */
  };
}

/** 从 deviceId 前缀推断科目（形如「物理|legacy-2026-11-18」）。无前缀返回空串。 */
export function subjectFromId(deviceId) {
  var s = String(deviceId || '');
  var i = s.indexOf('|');
  return i > 0 ? s.slice(0, i) : '';
}

/** 判断快照是否属于本科：优先看 subject 字段，回退 deviceId 前缀；两者都无则视为本科（兼容最老的裸快照）。 */
function belongsToSubject(snapshot, deviceId, expected) {
  if (!expected) return true;                       // 未指定科目：不过滤（老调用方）
  var tag = snapshot.subject || subjectFromId(snapshot.deviceId || deviceId);
  return tag ? tag === expected : true;
}

/**
 * 同步编排：本机 DB + 全部设备快照 → 合并后的本机 DB + 要写回的快照。
 * @param local 本机 DB（浏览器里读出的完整结构）
 * @param allSnapshots { [deviceId]: snapshot } 从载体拉到的全部快照
 * @param deviceId 本机设备标识
 * @returns {{ db, snapshot, writeTargets }}
 */
export function syncPlan(local, allSnapshots, deviceId, subject) {
  var acc = { v: 1, recs: [], wrong: {}, meta: {} };
  // 本机先并入（保证本机最新作答不被远端旧快照盖掉）
  acc = mergeRecords(acc, local);
  // 再并入本科设备快照（包括自己旧的那份，取并集不会丢）；异科快照一律跳过，防串科
  var ids = Object.keys(allSnapshots || {}).sort();
  for (const id of ids) {
    var s = allSnapshots[id];
    if (s && typeof s === 'object' && belongsToSubject(s, id, subject)) acc = mergeRecords(acc, s);
  }
  // 写回：只覆盖自己那份
  var snapshot = carrierSnapshot(deviceId, acc, subject);
  var writeTargets = {};
  writeTargets[deviceId] = snapshot;
  return { db: acc, snapshot: snapshot, writeTargets: writeTargets };
}
