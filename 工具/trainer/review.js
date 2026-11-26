/* 共享错题回炉内核（ADR-0010）
 *
 * 职责边界：只管错题条目的「调度字段」与状态转移，不碰 DOM、不碰 localStorage、
 * 不认识任何科目。题目快照（prompt/fields/explain…）、错题键生成、最短用时阈值
 * 都由各科自己提供，通过参数传进来。
 *
 * 调度字段：
 *   ts        首次入库时间戳
 *   due       下次到期时间戳（绝对毫秒）
 *   n         累计答错次数（统计/合并用，不参与间隔计算）
 *   lvl       回炉档位 1..4 → PLAN[1,3,7,14] 天
 *   okStreak  到期后连续有效答对次数 0/1/2，到 2 才移出
 *   lastOkAt  最近一次有效答对时间戳
 *   lastAt    最近一次作答时间戳（无论对错）
 *
 * 规则（任务卡 docs/plans/错题回炉规则统一-2026-11-19.md）：
 *   答错       → n+1、lvl 回退一档、连对清零、due = now + gap(lvl)*DAY
 *   有效答对   → 连对 +1；满 2 返回 'mastered'（调用方移出）；否则 lvl 进一档并重排 due
 *   无效答对   → 连对清零、重排 due；不惩罚 n/lvl
 *   跳过本次   → due 推到一天后，其余不变
 *   补位题     → 跳过难题后顺补的「还没到期」的错题，practice()：答对只记 lastAt（不加连对、也不清零），答错照答错
 *   due 永远由「本次作答时间戳 + 新档位间隔」算出，不用日历天数、不累计欠账。
 *
 * 历史复盘：everWrong(recs, wrongMap) 只从作答流水聚合，不看调度状态；
 *   掌握后删的是 DB.wrong 条目，recs 永久留档，所以整学期「曾经错过的题」查得到。
 */
var LT_REVIEW = (function () {
  var DAY = 86400000;
  var PLAN = [1, 3, 7, 14];
  var KEEP = 2;

  function gap(lvl) { return PLAN[Math.min(PLAN.length, Math.max(1, lvl | 0)) - 1]; }

  /* 到期判断：只有due到了才允许计入连对（未到期答对不算，防同日连刷） */
  function isDue(w, now) {
    if (!w || typeof w.due !== 'number') return false;
    return w.due <= (now == null ? Date.now() : now);
  }

  /* 旧条目迁移：补齐新字段；due 原样保留，不打乱用户已有计划。
     返回 true 表示有字段被补，调用方据此决定是否保存。 */
  function migrate(w, now) {
    if (!w) return false;
    now = now == null ? Date.now() : now;
    var changed = false;
    if (typeof w.n !== 'number' || w.n < 1) { w.n = 1; changed = true; }
    if (typeof w.lvl !== 'number' || w.lvl < 1 || w.lvl > PLAN.length) {
      w.lvl = Math.min(PLAN.length, Math.max(1, w.n || 1));
      changed = true;
    }
    if (typeof w.okStreak !== 'number') { w.okStreak = 0; changed = true; }
    if (typeof w.lastOkAt !== 'number') { w.lastOkAt = 0; changed = true; }
    if (typeof w.ts !== 'number') { w.ts = now; changed = true; }
    if (typeof w.lastAt !== 'number') { w.lastAt = w.ts || now; changed = true; }
    if (typeof w.due !== 'number') { w.due = now + gap(w.lvl) * DAY; changed = true; }
    return changed;
  }

  /* 新错题条目的调度字段（各科把它和题目快照合并后存入 DB.wrong[k]） */
  function newEntry(now) {
    now = now == null ? Date.now() : now;
    return {
      ts: now, due: now + PLAN[0] * DAY, n: 1, lvl: 1,
      okStreak: 0, lastOkAt: 0, lastAt: now
    };
  }

  /* 答错：回退一档、连对清零、按当前时间戳重排到期。就地改 w 并返回它。
     首次入库的裸条目（各科 new 出的对象没有 n）按 n=1/lvl=1 处理——
     不能先 migrate 补 n=1 再 +1，否则首次答错就被记成错过 2 次。 */
  function onWrong(w, now) {
    now = now == null ? Date.now() : now;
    var fresh = typeof w.n !== 'number';
    migrate(w, now);
    if (fresh) {
      w.n = 1;
      w.lvl = 1;
    } else {
      w.n = (w.n || 1) + 1;
      w.lvl = Math.max(1, w.lvl - 1);
    }
    w.okStreak = 0;
    w.lastAt = now;
    w.due = now + gap(w.lvl) * DAY;
    return w;
  }

  /* 答对：由内核自己判定「有效」（不信任调用方的到期结论）。
     sig = { sec, minSec, hint, fixed }
       sec    本次作答用时（秒）
       minSec 本科/本题型的最短有效用时；调用方不传则 0（只看到期与提示）
       hint   是否看过提示/答案
       fixed  是否是订正提交
     返回：
       'mastered' 连对已满 2 次 → 调用方把该题从 DB.wrong 删除
       'streak'   有效但未满 2 次 → 连对 +1，已重排 due
       'invalid'  无效答对 → 连对清零，已重排 due
       'none'     错题库里没有该题
  */
  function onPass(w, sig, now) {
    if (!w) return 'none';
    now = now == null ? Date.now() : now;
    migrate(w, now);
    sig = sig || {};
    var sec = Number(sig.sec) || 0;
    var minSec = Number(sig.minSec) || 0;
    var valid = isDue(w, now) && sec >= minSec && !sig.hint && !sig.fixed;
    w.lastAt = now;
    if (!valid) {
      w.okStreak = 0;
      w.due = now + gap(w.lvl) * DAY;
      return 'invalid';
    }
    w.okStreak = (w.okStreak || 0) + 1;
    w.lastOkAt = now;
    if (w.okStreak >= KEEP) return 'mastered';
    w.lvl = Math.min(PLAN.length, w.lvl + 1);
    w.due = now + gap(w.lvl) * DAY;
    return 'streak';
  }

  /* 跳过本次（替代原「已掌握」手动删除）：只把到期推到一天后，其余不变（连对进度保留） */
  function skip(w, now) {
    if (!w) return false;
    now = now == null ? Date.now() : now;
    migrate(w, now);
    w.due = now + DAY;
    return true;
  }

  /* 补位题（跳过难题后顺补进来的、还没到期的错题）：按「练习」处理，不能伤已有连对进度。
     答对 → 只更新 lastAt：没到期本来就不算有效确认（1.5），但也不该把之前攒的连对清零——
            那不是「同日连刷蒙对」，是真在做题；
     答错 → 照答错处理（1.3「任何模式」），n+1、回退一档、due 重排，因为它确实还没掌握。
     返回 'early-ok' / 'early-wrong' / 'none' */
  function practice(w, ok, now) {
    if (!w) return 'none';
    now = now == null ? Date.now() : now;
    migrate(w, now);
    if (ok) {
      w.lastAt = now;
      return 'early-ok';
    }
    onWrong(w, now);
    return 'early-wrong';
  }

  /* 顺补一道：错题本里本轮还没排过的题，挑最近到期的一道（跳过难题后补位用）。
     usedKeys = 本轮队列里已有的错题键（对象或数组都可），这些不再补。
     坏条目（缺题目快照）跳过，免得补进来渲染就崩。
     返回 { key, w }；没有可补的返回 null。 */
  function pickExtra(wrongMap, usedKeys, now) {
    now = now == null ? Date.now() : now;
    var used = {};
    var list = Array.isArray(usedKeys) ? usedKeys : Object.keys(usedKeys || {});
    list.forEach(function (k) { used[k] = 1; });
    var best = null, bestKey = null;
    Object.keys(wrongMap || {}).forEach(function (k) {
      var w = wrongMap[k];
      if (!w || used[k]) return;
      if (!Array.isArray(w.fields) || !w.fields.length) return;
      migrate(w, now);
      if (!best || w.due < best.due || (w.due === best.due && (w.n || 0) > (best.n || 0))) {
        best = w; bestKey = k;
      }
    });
    return best ? { key: bestKey, w: best } : null;
  }

  /* 取到期题：按 due 升序（最早到期优先），cap 可选 */
  function dueList(wrongMap, now, cap) {
    now = now == null ? Date.now() : now;
    var all = Object.keys(wrongMap || {}).map(function (k) {
      var w = wrongMap[k];
      migrate(w, now);
      return w;
    }).filter(function (w) { return isDue(w, now); });
    all.sort(function (a, b) { return a.due - b.due; });
    return cap ? all.slice(0, cap) : all;
  }

  /* 历史错题清单（期末复盘用）：从作答流水 recs 聚合「曾经错过」的题。
     recs 里每笔作答都带 ok/qid/ts，答错事件是永久留档的——连对达标后只删 DB.wrong
     那一条待复习条目，recs 不动，所以这里能还原整学期的错题史。
     wrongMap 只用来判「现在还在不在错题本」：新规则下移出错题本的唯一途径是
     连对 2 次有效答对，所以不在本 = 已真掌握（跳过本次不删，不会误判）。
     返回按「错次降序、最近错的时间降序」排列，每项：
       key/label/mod/kind/wrong/firstWrongAt/lastWrongAt/lastOkAt/okCount/inBook */
  function everWrong(recs, wrongMap) {
    var book = {};
    Object.keys(wrongMap || {}).forEach(function (k) {
      var w = wrongMap[k];
      if (w && w.qid) book[w.qid] = true;
    });
    var map = {};
    (recs || []).forEach(function (r) {
      if (!r || (r.ok !== true && r.ok !== false)) return;
      var k = r.qid || [r.mod || '', r.kind || '', r.kn || r.title || r.prompt || ''].join('|').slice(0, 120);
      if (!k) return;
      var e = map[k];
      if (!e) {
        e = map[k] = {
          key: k, label: String(r.kn || r.title || r.prompt || r.kind || k),
          mod: r.mod || '', kind: r.kind || '',
          wrong: 0, okCount: 0, firstWrongAt: 0, lastWrongAt: 0, lastOkAt: 0, inBook: false
        };
      }
      var t = Number(r.ts) || 0;
      if (r.ok === false) {
        e.wrong++;
        if (!e.firstWrongAt || t < e.firstWrongAt) e.firstWrongAt = t;
        if (t > e.lastWrongAt) e.lastWrongAt = t;
      } else {
        e.okCount++;
        if (t > e.lastOkAt) e.lastOkAt = t;
      }
    });
    var out = Object.keys(map).map(function (k) {
      var e = map[k];
      e.inBook = !!book[e.key];
      return e;
    }).filter(function (e) { return e.wrong > 0; });
    out.sort(function (a, b) {
      return (b.wrong - a.wrong) || (b.lastWrongAt - a.lastWrongAt);
    });
    return out;
  }

  /* 统一日期文本 YYYY-MM-DD（本地时区），报告页列表共用 */
  function dayText(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* 文案：错题本/报告页统一显示到期状态与连对进度 */
  function statusText(w, now) {
    if (!w) return '';
    now = now == null ? Date.now() : now;
    if (isDue(w, now)) {
      return w.okStreak ? '已到期 · 待确认 ' + w.okStreak + '/' + KEEP : '已到期';
    }
    var days = Math.ceil((w.due - now) / DAY);
    return '还有 ' + days + ' 天';
  }

  var api = {
    DAY: DAY, PLAN: PLAN, KEEP: KEEP, gap: gap,
    isDue: isDue, migrate: migrate, newEntry: newEntry,
    onWrong: onWrong, onPass: onPass, skip: skip, practice: practice, pickExtra: pickExtra,
    dueList: dueList, statusText: statusText,
    everWrong: everWrong, dayText: dayText
  };
  if (typeof window !== 'undefined') window.__ltReview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();



