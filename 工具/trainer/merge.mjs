/* 事件并集合并 · 两族共用（化学内核族 / 物理数学脚手架族）
 * ============================================================
 * 唯一合并实现：页面导入按钮与云同步都调它，不许另写一套（ADR-0007 决定 4）。
 *
 * 去重键 (ts, mod, kind, ident)，ident = prompt[:40] || kn：
 *   - 化学内核族 recs 写 prompt、无 kn（kernel.js:280）
 *   - 物理/数学脚手架族与历史导出 recs 写 kn、无 prompt（train.ui.js:790/683）
 *   取两者中有的那个，避免把脚手架族第 4 维压成空串。
 *
 * 合并不求和：并集 + 各自保留；设备态 days/lastRound/dayPlan/sess 不进载体。
 * 本文件既是 node 可 import 的 ESM，也是 build.mjs 内联进产物的源（去掉 export 行）。
 */

/** 题目标识：prompt 前 40 字优先，回退 kn，都没有则空串 */
export function pickIdent(r) {
  if (!r || typeof r !== 'object') return '';
  var p = String(r.prompt || '').slice(0, 40);
  if (p) return p;
  return String(r.kn || '');
}

/** 去重键：时间戳 + 模块 + 题型 + 题目标识 */
export function recSig(r) {
  if (!r || typeof r !== 'object') return '';
  return [r.ts, r.mod, r.kind, pickIdent(r)].join('|');
}

/** 合并两份 DB：recs 取并集，wrong 字段互补，meta 取 max/最早，丢弃设备态 */
export function mergeRecords(base, incoming) {
  var out = { v: 1, recs: [], wrong: {}, meta: {} };
  var seen = Object.create(null);
  function addRec(r) {
    if (!r || typeof r !== 'object') return;
    var k = recSig(r);
    if (seen[k]) return;
    seen[k] = 1;
    out.recs.push(r);
  }
  ((base && base.recs) || []).forEach(addRec);
  ((incoming && incoming.recs) || []).forEach(addRec);
  out.recs.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  /* 不截断 recs：整学期作答是期末复盘（everWrong）的原始依据，砍掉最老记录会丢历史。
     单条约 200 B，几千条在 localStorage 5 MB 配额内；与 kernel.js 的提交段口径一致。 */

  var bw = (base && base.wrong) || {}, iw = (incoming && incoming.wrong) || {};
  Object.keys(bw).forEach(function (k) { if (bw[k]) out.wrong[k] = Object.assign({}, bw[k]); });
  Object.keys(iw).forEach(function (k) {
    var b = iw[k];
    if (!b) return;
    var a = out.wrong[k];
    if (!a) { out.wrong[k] = Object.assign({}, b); return; }
    var merged = Object.assign({}, a);
    Object.keys(b).forEach(function (f) { if (merged[f] == null || merged[f] === '') merged[f] = b[f]; });
    merged.ts = Math.min(a.ts || Infinity, b.ts || Infinity);
    merged.due = Math.min(a.due || Infinity, b.due || Infinity);
    merged.n = Math.max(a.n || 1, b.n || 1);
    out.wrong[k] = merged;
  });

  var bm = (base && base.meta) || {}, im = (incoming && incoming.meta) || {};
  var bc = typeof bm.created === 'number' ? bm.created : Infinity;
  var ic = typeof im.created === 'number' ? im.created : Infinity;
  var created = Math.min(bc, ic);
  out.meta.round = Math.max(bm.round || 0, im.round || 0);
  out.meta.lastKind = Object.assign({}, bm.lastKind || {}, im.lastKind || {});
  if (created !== Infinity) out.meta.created = created;
  return out;
}
