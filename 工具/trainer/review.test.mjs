#!/usr/bin/env node
/* 共享错题回炉内核单测：状态转移 + 旧数据迁移 + 防蒙对 + 动态间隔 */
import R from './review.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error('✗ ' + name); }
}
const DAY = R.DAY;
const T = 1700000000000; // 固定基准时间

// 1. 新条目：1 天后到期，连对为 0
{
  const e = R.newEntry(T);
  ok(e.due === T + DAY && e.lvl === 1 && e.n === 1 && e.okStreak === 0,
    'newEntry 初始字段');
  ok(!R.isDue(e, T) && R.isDue(e, T + DAY), '到期判断边界');
}

// 2. 答错：n+1、回退一档、重排 due、连对清零
{
  const w = R.newEntry(T);
  w.lvl = 3; w.due = T + 7 * DAY; w.okStreak = 1;
  R.onWrong(w, T + 1000);
  ok(w.n === 2 && w.lvl === 2 && w.okStreak === 0, '答错：n+1/回退/清零');
  ok(w.due === (T + 1000) + 3 * DAY, '答错：due 按当前时间戳重算');
}

// 3. 有效答对两次才移出；每次基于实际时间戳重排
{
  const w = R.newEntry(T);
  const a = R.onPass(w, { sec: 5, minSec: 2 }, T + DAY);
  ok(a === 'streak' && w.okStreak === 1 && w.lvl === 2, '第一次有效答对：连对 1，进档');
  ok(w.due === (T + DAY) + 3 * DAY, '第一次答对：due 按实际时间 + 3 天');
  const b = R.onPass(w, { sec: 6, minSec: 2 }, T + DAY + 3 * DAY + 500);
  ok(b === 'mastered' && w.okStreak === 2, '第二次有效答对：mastered');
}

// 4. 防蒙对：秒答、看提示、订正、未到期答对都算无效，连对清零
{
  const w = R.newEntry(T);
  w.okStreak = 1; w.lvl = 2; w.due = T + 3 * DAY;
  let a = R.onPass(w, { sec: 1, minSec: 3 }, T + 3 * DAY);
  ok(a === 'invalid' && w.okStreak === 0, '秒答无效');
  w.okStreak = 1;
  a = R.onPass(w, { sec: 9, minSec: 3, hint: true }, T + 3 * DAY);
  ok(a === 'invalid' && w.okStreak === 0, '看提示无效');
  w.okStreak = 1;
  a = R.onPass(w, { sec: 9, minSec: 3, fixed: true }, T + 3 * DAY);
  ok(a === 'invalid' && w.okStreak === 0, '订正无效');
  w.okStreak = 1;
  a = R.onPass(w, { sec: 9, minSec: 3 }, T + DAY); // 还没到期
  ok(a === 'invalid' && w.okStreak === 0, '未到期答对无效');
}

// 5. 动态间隔：跳过几天后，due 从实际作答时间起算，不累计欠账
{
  const w = R.newEntry(T);
  w.lvl = 3; w.due = T + 7 * DAY; // 本该 7 天后
  const late = T + 40 * DAY;      // 用户 40 天后才来
  const a = R.onPass(w, { sec: 5, minSec: 2 }, late);
  ok(a === 'streak' && w.due === late + 14 * DAY, '跳过多天后 due 从实际时间重算');
}

// 6. 旧数据迁移：只有 ts/due/n 的旧条目补齐字段，due 不动
{
  const w = { id: 'x', prompt: '旧题', ts: T, due: T + 2 * DAY, n: 3 };
  const changed = R.migrate(w, T + 1000);
  ok(changed === true, '迁移返回有改动');
  ok(w.lvl === 3 && w.okStreak === 0 && w.lastOkAt === 0, '迁移：lvl 从 n 推导');
  ok(w.due === T + 2 * DAY, '迁移：due 原样保留');
  ok(R.migrate(w, T + 2000) === false, '重复迁移幂等');
}

// 7. 跳过本次：只推 due，不删除、不清错次、不清连对（任务卡「其余字段不变」）
{
  const w = R.newEntry(T);
  w.okStreak = 1; w.n = 2;
  R.skip(w, T + DAY);
  ok(w.due === (T + DAY) + DAY && w.n === 2 && w.okStreak === 1, 'skip：推 due、保留连对与 n');
}

// 7b. 首次答错入库：各科 new 出的裸条目（无 n）经 onWrong 后 n=1，不能记成 2
{
  const bare = { id: 'new', prompt: '首次错的题' };
  R.onWrong(bare, T);
  ok(bare.n === 1 && bare.lvl === 1 && bare.due === T + DAY, '首次入库：n=1/lvl=1/due=1天');
  R.onWrong(bare, T + DAY * 2);   // 再错一次才 +1
  ok(bare.n === 2, '第二次答错：n=2');
}

// 8. dueList：按 due 升序、只取到期、cap 截断
{
  const a = { id: 'a', due: T + DAY, ts: T, n: 1 };
  const b = { id: 'b', due: T - DAY, ts: T, n: 1 };
  const c = { id: 'c', due: T + 2 * DAY, ts: T, n: 1 };
  const list = R.dueList({ a, b, c }, T, 1);
  ok(list.length === 1 && list[0].id === 'b', 'dueList：到期升序 + cap');
}

// 9. statusText 统一文案
{
  const w = R.newEntry(T);
  ok(R.statusText(w, T) === '还有 1 天', 'statusText 未到期');
  w.okStreak = 1;
  ok(R.statusText(w, T + DAY) === '已到期 · 待确认 1/2', 'statusText 已到期带进度');
}

// 10. everWrong：答错事件永久留档，掌握后从错题库删除仍可复盘
{
  const recs = [
    { qid: 'm.圆.p01', mod: '圆', kind: 'choice', kn: '垂径定理', ok: false, ts: T },
    { qid: 'm.圆.p01', mod: '圆', kind: 'choice', kn: '垂径定理', ok: false, ts: T + DAY },
    { qid: 'm.圆.p02', mod: '圆', kind: 'choice', kn: '扇形', ok: false, ts: T + 2 * DAY },
    { qid: 'm.圆.p01', mod: '圆', kind: 'choice', kn: '垂径定理', ok: true, ts: T + 3 * DAY },
    { qid: 'm.圆.p01', mod: '圆', kind: 'choice', kn: '垂径定理', ok: true, ts: T + 4 * DAY },
    { qid: 'm.函数.f01', mod: '函数', kind: 'write', kn: '反比例', ok: true, ts: T + 5 * DAY }
  ];
  // p01 已从错题库移出（掌握），p02 仍在错题本
  const wrongMap = { k2: { qid: 'm.圆.p02', mod: '圆', kind: 'choice', due: T + 9 * DAY } };
  const list = R.everWrong(recs, wrongMap);
  ok(list.length === 2, 'everWrong：只聚合曾经答错的题（2 道）');
  ok(list[0].key === 'm.圆.p01' && list[0].wrong === 2 && list[0].okCount === 2,
    'everWrong：错次降序排首位 + 累计错/对次数');
  ok(list[0].firstWrongAt === T && list[0].lastWrongAt === T + DAY && list[0].lastOkAt === T + 4 * DAY,
    'everWrong：首错/末错/末对时间戳');
  ok(list[0].inBook === false, 'everWrong：掌握后移出错题本 → inBook=false，历史仍在');
  ok(list[1].key === 'm.圆.p02' && list[1].inBook === true, 'everWrong：仍在错题本 → inBook=true');
  ok(!list.some(x => x.key === 'm.函数.f01'), 'everWrong：从未答错的题不进清单');
  // 空流水 / 无 qid 的旧事件（回退到 mod|kind|kn 拼 key）
  ok(R.everWrong([], {}).length === 0, 'everWrong：空流水');
  const legacy = R.everWrong([{ mod: '力', kind: 'calc', kn: '浮力', ok: false, ts: T }], {});
  ok(legacy.length === 1 && legacy[0].key === '力|calc|浮力', 'everWrong：旧事件无 qid 时回退拼 key');
  // 没有 qid 的旧错题条目不会误匹配（旧条目边界，文档已标注）
  const noqid = { k: { mod: '圆', kind: 'choice', title: '垂径定理' } };
  const l2 = R.everWrong(recs, noqid);
  ok(l2.every(x => x.inBook === false), 'everWrong：无 qid 的旧条目不误匹配');
}

// 11. dayText 统一日期文本
{
  ok(/^\d{4}-\d{2}-\d{2}$/.test(R.dayText(T)), 'dayText：YYYY-MM-DD 格式');
  ok(R.dayText(0) === '—', 'dayText：无时间戳显示破折号');
}

console.log(`错题回炉内核：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
