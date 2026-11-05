// 交互自检：用 CDP 驱动无头 Chrome，跑断言（不只是截图）
// 用法：node qa.mjs <url> [outDir]
// 退出码：0 全过；1 有失败（并打印失败项）
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3] || ".qa-flash";
const PORT = 9333;
const PROFILE = join(process.env.TEMP || ".", "chrome-qa-flash-profile");
if (!url) { console.error("用法：node qa.mjs <url> [outDir]"); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-crash-reporter",
  "--disable-breakpad", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
  "--window-size=1440,1200", "about:blank",
], { stdio: "ignore" });

async function waitFor(fn, tries = 120, gap = 200) {
  for (let i = 0; i < tries; i++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(gap); }
  throw new Error("timeout waiting for chrome");
}
await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok);
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
};
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return { value: r.result.value };
};
const $ = async (expr) => {
  const r = await evaluate(expr);
  return r.__error ? undefined : r.value;
};
const text = async (sel) => (await $(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent`)) || "";
async function key(k, code, vk, wait = 45) {
  for (const type of ["rawKeyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
  await sleep(wait);
}
const pressDigit = (i) => key(String(i + 1), "Digit" + (i + 1), 49 + i);
const pressEnter = () => key("Enter", "Enter", 13, 45);
const pressEsc = () => key("Escape", "Escape", 27, 60);
const click = async (sel) => $(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) { el.click(); return true; } return false; })()`);
const state = () => $("window.FLASH_APP ? window.FLASH_APP.state() : null");
const shot = async (name, w = 1440) => {
  const metrics = await send("Page.getLayoutMetrics");
  const css = metrics.cssContentSize || metrics.contentSize;
  const res = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: Math.min(css.height, 9000), scale: 1 },
  });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(res.data, "base64"));
};

await send("Runtime.enable");
await send("Page.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.navigate", { url });
await sleep(1000);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1400);

// 自动接受 confirm / alert，并记录弹窗文案
const dialogMessages = [];
let dlgCursor = 0;
setInterval(async () => {
  for (let i = dlgCursor; i < events.length; i++) {
    if (events[i].method === "Page.javascriptDialogOpening") {
      dlgCursor = i + 1;
      dialogMessages.push(events[i].params.message || "");
      try { await send("Page.handleJavaScriptDialog", { accept: true }); } catch {}
    }
  }
}, 150);

const checks = [];
function ok(name, cond, detail) {
  checks.push({ name, pass: !!cond, detail: detail === undefined ? "" : String(detail).slice(0, 220) });
}
function group(t) { checks.push({ group: t }); }
const reload = async (hash = "") => {
  await send("Page.navigate", { url: url + hash });
  await sleep(220);
  await send("Page.reload", { ignoreCache: false });
  await sleep(1000);
};
const hardReload = async () => { await send("Page.reload", { ignoreCache: false }); await sleep(1050); };
async function answerWith(correct) {
  const s = await state();
  if (!s || !s.round) return null;
  const ci = "ABCD".indexOf(s.round.answer);
  const idx = correct ? ci : (ci === 0 ? 1 : 0);
  await pressDigit(idx);
  await sleep(140);
  return s.round;
}

/* ── 1. 启动与开始屏 ─────────────────────────── */
group("启动与开始屏");
let S = await state();
ok("页面挂载 FLASH_APP", !!S);
ok("题库加载（blocks ≥ 1）", S && S.blocks.length >= 1, S && JSON.stringify(S.blocks));
const dataBlocks = S.blocks.map((b) => b.block);
const dataItemCount = S.items.length;
const maxBlock = Math.max(5, ...dataBlocks);
const cardCount = await $(`document.querySelectorAll('.bcard').length`);
ok("开始屏按数据渲染 block 卡片（含缺失占位）", cardCount === maxBlock, "cards=" + cardCount + " maxBlock=" + maxBlock);
const realCards = await $(`document.querySelectorAll('.bcard:not(.is-missing)').length`);
ok("有题库的 block 卡片数量 = 数据 block 数", realCards === dataBlocks.length, "real=" + realCards + " data=" + dataBlocks.length);
const missCards = await $(`(() => [...document.querySelectorAll('.bcard.is-missing')].map(c => ({ dis: c.disabled, t: c.textContent })) )()`);
ok("缺失 block 显示「题库待生成」且不可点", (missCards || []).every((c) => c.dis && /题库待生成/.test(c.t)),
  JSON.stringify(missCards));
ok("标题正确", /语法闪练\s*·\s*九上\s*U1[–-]U4/.test((await $(`document.querySelector('h1').textContent`)) || ""));
ok("副标题正确", /点一下就知道对不对/.test(await text(".hero .sub")) && /错的今晚必须做对/.test(await text(".hero .sub")));
ok("每个 block 卡片有题数/时长/考点", await $(`(() => [...document.querySelectorAll('.bcard:not(.is-missing)')]
  .every(c => /\\d+ 题/.test(c.textContent) && /预计 \\d+ 分钟/.test(c.textContent) && /考点：/.test(c.textContent)))()`));
ok("卡片显示 hint（数据里有就显示）", await $(`(() => {
  const b = window.FLASH_APP.state().blocks.find(x => x);
  const card = document.querySelector('.bcard[data-block="' + b.block + '"]');
  return !card.querySelector('.bhint') ? true : card.querySelector('.bhint').textContent.length > 0; })()`));
ok("开始今晚方案按钮可用", !(await $(`document.querySelector('#act-plan').disabled`)));
ok("清空记录后「只刷我错过的题」禁用并提示", (await $(`document.querySelector('#act-wrong').disabled`)) &&
  /还没有做错的题/.test(await text("#wrong-hint")));
ok("页脚有导出/导入/清空", await $(`(() => ['export','import','clear'].every(a => !!document.querySelector('[data-act="' + a + '"]')))()`));
ok("无进行中的本轮（current = null）", S.current === null, JSON.stringify(S.current));
ok("默认不自动跳题（settings.autoNext=false）", S.settings && S.settings.autoNext === false);

// 开始屏「明早考前看」文档入口
const homeDocs = await $(`(() => [...document.querySelectorAll('#scr-home [data-act="doc"]')].map(b => b.getAttribute('data-doc')))()`);
ok("开始屏有 3 个文档入口（口诀卡/方案/说明）", (homeDocs || []).join(",") === "card,plan,guide", JSON.stringify(homeDocs));
ok("FLASH_DOCS 注入三个 key", (S.docs || []).join(",") === "card,plan,guide", JSON.stringify(S.docs));

await click('#act-plan');
await sleep(250);
const planText = (await text("#modal-card")) || "";
ok("今晚方案弹窗显示总题数与预计时长", /共\s*\d+\s*题/.test(planText) && /预计\s*\d+\s*分钟/.test(planText), planText.slice(0, 120));
const planTotal = Number((planText.match(/共\s*(\d+)\s*题/) || [])[1]);
ok("方案总题数 = 题库总题数", planTotal === dataItemCount, "plan=" + planTotal + " data=" + dataItemCount);
await click('[data-act="modal-cancel"]');
await sleep(200);
ok("取消后弹窗关闭", !(await $(`document.querySelector('#modal').classList.contains('is-open')`)));
await shot("qa-00-home");

/* ── 2. 做题与即时判分 ───────────────────────── */
group("做题与即时判分");
const smallest = S.blocks.slice().sort((a, b) => a.n - b.n)[0];
ok("找到最小 block 用于测试", !!smallest, smallest && JSON.stringify(smallest));
await click(`.bcard[data-block="${smallest.block}"]`);
await sleep(420);
S = await state();
ok("点卡片进入做题屏", S.view === "drill" && !!S.round);
ok("单 block 模式", S.round && S.round.mode === "block", S.round && S.round.mode);
ok("顶栏有退出/进度条/正确率/用时/topic/自动开关", await $(`(() => {
  return !!document.querySelector('.quit') && !!document.querySelector('.pg') &&
    !!document.querySelector('#bar-progress') && !!document.querySelector('#bar-rate') &&
    !!document.querySelector('#bar-time') && !!document.querySelector('.topic-chip') &&
    !!document.querySelector('#act-auto'); })()`));
ok("进度显示 0/总", new RegExp("^0/" + S.round.listLen).test(await text("#bar-progress")), await text("#bar-progress"));
ok("用时格式 mm:ss", /^用时\s*\d{2}:\d{2}$/.test((await text(".tb-time")).trim()), await text(".tb-time"));
ok("页面没有提交按钮（点选项即判）", !(await $(`!!document.querySelector('[data-act="submit"]')`)));
const optInfo = await $(`(() => [...document.querySelectorAll('#qcard .opt')].map(o => ({
  k: o.dataset.k, h: Math.round(o.getBoundingClientRect().height), t: o.querySelector('.txt').textContent,
  badge: o.querySelector('.badge').textContent })))()`);
ok("四个选项各一整行、≥48px", optInfo.length === 4 && optInfo.every((o) => o.h >= 48), JSON.stringify(optInfo));
ok("选项字母徽章 A–D", optInfo.map((o) => o.badge).join("") === "ABCD", JSON.stringify(optInfo.map((o) => o.badge)));
ok("空格渲染成 .blank 占位而非原文下划线", (await $(`(() => {
  const stem = document.querySelector('#qcard .qstem');
  return stem.querySelectorAll('.blank').length === 1 && !/_{3,}/.test(stem.textContent); })()`)));
ok("选项没有禁用（未判前可点）", await $(`[...document.querySelectorAll('#qcard .opt')].every(o => !o.disabled)`));
ok("开关显示「自动:关」", (await text("#act-auto")) === "自动:关", await text("#act-auto"));
await shot("qa-01-drill");

// 2.1 答对：立即判分 + 反馈写考点/规则/出处 + 停下来等点击
const first = S.round;
const firstId = first.itemId;
await answerWith(true);
const fbOk = await $(`(() => { const fb = document.querySelector('#fb');
  if (!fb) return null;
  const btn = fb.querySelector('[data-act="ack"]');
  return { shown: getComputedStyle(fb).display !== 'none', cls: fb.className, text: fb.textContent.trim(),
    okOpt: !!document.querySelector('#qcard .opt.is-ok'),
    locked: [...document.querySelectorAll('#qcard .opt')].every(o => o.disabled),
    btn: btn ? btn.textContent.trim() : '', btnH: btn ? Math.round(btn.getBoundingClientRect().height) : 0 }; })()`);
ok("答对立即变绿并锁死选项", fbOk && fbOk.okOpt && fbOk.locked, JSON.stringify(fbOk && { ok: fbOk.okOpt, locked: fbOk.locked }));
ok("答对反馈有「考点：」+ 正确考点名", fbOk && /考点：/.test(fbOk.text) && fbOk.text.indexOf(first.topic) >= 0,
  fbOk && fbOk.text.slice(0, 80));
ok("答对反馈有「规则：」", fbOk && /规则：/.test(fbOk.text), fbOk && fbOk.text.slice(0, 120));
ok("答对反馈有出处（src 存在时）", fbOk && (/出处：/.test(fbOk.text) || !first.src), fbOk && fbOk.text.slice(-60));
ok("答对反馈不显示「易错点：」", fbOk && !/易错点：/.test(fbOk.text));
ok("答对后按钮是「下一题 →」且 ≥44px", fbOk && /下一题/.test(fbOk.btn) && fbOk.btnH >= 44, JSON.stringify({ b: fbOk && fbOk.btn, h: fbOk && fbOk.btnH }));
let s2 = await state();
ok("答对后记录 stat.ok=1", s2.store.stat[firstId] && s2.store.stat[firstId].ok === 1 && s2.store.stat[firstId].att === 1,
  JSON.stringify(s2.store.stat[firstId]));
ok("答对后进度 1/总", new RegExp("^1/" + first.listLen).test(await text("#bar-progress")));
await sleep(1500);
let stillSame = await state();
ok("默认不自动跳题：答对 1.5 秒后仍停在同一题", stillSame.round && stillSame.round.itemId === firstId,
  "now=" + (stillSame.round && stillSame.round.itemId));
ok("快照已落盘（current.idx=1）", stillSame.current && stillSame.current.idx === 1 && stillSame.current.done === 1,
  JSON.stringify(stillSame.current && { idx: stillSame.current.idx, done: stillSame.current.done }));
await click('[data-act="ack"]');
await sleep(200);
s2 = await state();
ok("点「下一题 →」才前进", s2.round && s2.round.itemId !== firstId, "now=" + (s2.round && s2.round.itemId));

// 2.2 答错：红 + 正确项描边 + 考点/规则/易错点 + 记住了
const second = s2.round;
const secondId = second.itemId;
await answerWith(false);
const fbBad = await $(`(() => { const fb = document.querySelector('#fb');
  if (!fb) return null;
  const btn = fb.querySelector('[data-act="ack"]');
  return { shown: getComputedStyle(fb).display !== 'none', cls: fb.className, text: fb.textContent.trim(),
    bad: !!document.querySelector('#qcard .opt.is-bad'), right: !!document.querySelector('#qcard .opt.is-right'),
    btn: btn ? btn.textContent.trim() : '', btnH: btn ? Math.round(btn.getBoundingClientRect().height) : 0 }; })()`);
ok("答错选项变红、正确项绿描边", fbBad && fbBad.bad && fbBad.right, JSON.stringify(fbBad && { bad: fbBad.bad, right: fbBad.right }));
ok("答错反馈写「考点：」", fbBad && /考点：/.test(fbBad.text) && fbBad.text.indexOf(second.topic) >= 0, fbBad && fbBad.text.slice(0, 90));
ok("答错展开「规则：」+「易错点：」", fbBad && /规则：/.test(fbBad.text) && /易错点：/.test(fbBad.text), fbBad && fbBad.text.slice(0, 140));
ok("答错同样显示出处", fbBad && (/出处：/.test(fbBad.text) || !second.src));
ok("答错按钮是「记住了 →」且 ≥44px", fbBad && /记住了/.test(fbBad.btn) && fbBad.btnH >= 44, JSON.stringify({ b: fbBad && fbBad.btn, h: fbBad && fbBad.btnH }));
s2 = await state();
ok("答错后 stat.wrong=1", s2.store.stat[secondId] && s2.store.stat[secondId].wrong === 1, JSON.stringify(s2.store.stat[secondId]));
ok("答错的题进入 redo 队列", s2.round && s2.round.pendingRedo === 1, s2.round && s2.round.pendingRedo);
await sleep(1500);
const badStill = await state();
ok("答错不自动翻页", badStill.round && badStill.round.itemId === secondId);
await shot("qa-02-wrong");
// 已判过的题再按键不会改判 / 不会重复计分
const judgedBefore = badStill.round.judged;
await pressDigit(2);
await sleep(120);
const afterDup = await state();
ok("判过的题不能二次判分（不重复计分）",
  afterDup.round.itemId === secondId && afterDup.round.judged === judgedBefore &&
  afterDup.round.pendingRedo === 1 && afterDup.store.stat[secondId].att === 1,
  JSON.stringify({ itemId: afterDup.round.itemId, judged: afterDup.round.judged, stat: afterDup.store.stat[secondId] }));
await pressEnter();
await sleep(200);
s2 = await state();
ok("Enter = 继续，进入下一题", s2.round && s2.round.itemId !== secondId);

// 2.3 刷新恢复：答对第 3 题后刷新，应回到做题屏、进度与正确率都对、当前是第 4 题
const third = s2.round;
await answerWith(true);
await sleep(150);
let pre = await state();
const curBefore = pre.current;
ok("第三题答完后快照：idx=3 / done=3 / ok=2",
  curBefore && curBefore.idx === 3 && curBefore.done === 3 && curBefore.ok === 2,
  JSON.stringify(curBefore && { idx: curBefore.idx, done: curBefore.done, ok: curBefore.ok }));
ok("快照里有 mainIds 与 perTopic", curBefore && curBefore.mainIds.length === third.listLen &&
  curBefore.perTopic && Object.keys(curBefore.perTopic).length > 0,
  JSON.stringify(curBefore && { main: curBefore.mainIds.length, topics: Object.keys(curBefore.perTopic).length }));
const expectFourth = curBefore && curBefore.ids[3];
await hardReload();
S = await state();
ok("刷新后仍在做题屏（不回开始屏）", S.view === "drill" && !!S.round, S.view);
ok("刷新后进度 = 3/N", new RegExp("^3/" + third.listLen).test(await text("#bar-progress")), await text("#bar-progress"));
ok("刷新后正确率 = 2/3 67%", /2\/3 67%/.test(await text("#bar-rate")), await text("#bar-rate"));
ok("刷新后当前题就是第 4 题", S.round && S.round.itemId === expectFourth, (S.round && S.round.itemId) + " expect " + expectFourth);
ok("刷新后提示「接着上次」", /接着上次/.test(await text("#toast")), await text("#toast"));
ok("刷新后 current 仍可继续（idx=3）", S.current && S.current.idx === 3);

// 2.4 自动跳题开关（默认关 → 开 → 秒翻 → 关 → 持久化）
await click("#act-auto");
await sleep(180);
S = await state();
const autoPersist = await $(`(() => { try { const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || 'null'); return !!(v && v.settings && v.settings.autoNext); } catch (e) { return false; } })()`);
ok("打开自动跳题：按钮「自动:开」并写入 settings", S.settings.autoNext === true &&
  (await text("#act-auto")) === "自动:开" && autoPersist === true,
  JSON.stringify({ on: S.settings.autoNext, btn: await text("#act-auto"), ls: autoPersist }));
const q4 = S.round;
await answerWith(true);
ok("自动跳题打开后：答对立即显示反馈", await $(`(() => { const fb = document.querySelector('#fb'); return !!fb && getComputedStyle(fb).display !== 'none'; })()`));
await sleep(1250);
S = await state();
ok("自动跳题打开后：答对约 1 秒自动翻页", S.round && S.round.itemId !== q4.itemId,
  "now=" + (S.round && S.round.itemId) + " was=" + q4.itemId);
await click("#act-auto");
await sleep(150);
S = await state();
ok("可再关掉自动跳题", S.settings.autoNext === false && (await text("#act-auto")) === "自动:关");
await hardReload();
S = await state();
ok("刷新后开关状态持久化（自动:关）", S.settings.autoNext === false && (await text("#act-auto")) === "自动:关" &&
  S.view === "drill", JSON.stringify({ on: S.settings.autoNext, view: S.view }));
ok("刷新后进度 = 4/N（自动跳的那题已计入）", new RegExp("^4/" + third.listLen).test(await text("#bar-progress")),
  await text("#bar-progress"));

/* 主轮剩下的题全做对（默认需点一下才走），直到进入重练轮 */
{
  let guard = 0;
  while (guard++ < 400) {
    const st = await state();
    if (!st.round || st.view !== "drill") break;
    if (st.round.phase !== "main") break;
    if (!st.round.locked) await answerWith(true);
    await pressEnter();
  }
}
S = await state();
ok("主轮结束自动进入错题重练轮", S.round && S.round.phase === "redo" && S.round.listLen === 1,
  S.round && JSON.stringify({ phase: S.round.phase, listLen: S.round.listLen }));
ok("重练轮进度单独算（0/1 重练）", /^0\/1/.test(await text("#bar-progress")), await text("#bar-progress"));
ok("重练轮题干的选项顺序不变", await $(`(() => {
  const it = window.FLASH_APP.state().items.find(i => i.id === window.FLASH_APP.state().round.itemId);
  return !!it && window.FLASH_APP.state().round.answer === it.answer; })()`));
await answerWith(false);
await sleep(150);
S = await state();
ok("重练再错仍留在重练轮，需再做对", S.round && S.round.phase === "redo" && S.round.pendingRedo === 1,
  S.round && JSON.stringify({ phase: S.round.phase, pending: S.round.pendingRedo }));
ok("重练再错同样显示「考点/易错点」", /考点：/.test(await text("#fb")) && /易错点：/.test(await text("#fb")));
await pressEnter();
await sleep(200);
S = await state();
ok("重练轮重新开始（又出现一道待重练题）", S.round && S.round.phase === "redo" && S.round.itemId !== null);
await answerWith(true);
await pressEnter();
await sleep(450);
S = await state();
ok("重练做对后进结算屏", S.view === "result", S.view);
ok("结算后 current 清空", S.current === null && (await $(`(() => { try { const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || 'null'); return !v || !v.current; } catch (e) { return false; } })()`)));

/* ── 3. 结算屏 ───────────────────────────────── */
group("结算屏");
const rt = await $(`(() => ({
  pct: document.querySelector('#rt-pct').textContent.trim(),
  sub: document.querySelector('#rt-sub').textContent.trim(),
  rows: [...document.querySelectorAll('#rt-body tr')].map(tr => ({
    weak: tr.classList.contains('weak'),
    cells: [...tr.querySelectorAll('td')].map(td => td.textContent.trim()) })),
  note: document.querySelector('#rt-note').textContent.trim(),
  redo: document.querySelector('#act-redo').textContent.trim(),
  redoDis: document.querySelector('#act-redo').disabled,
  againDis: document.querySelector('#act-again').disabled,
  docBtn: !!document.querySelector('#scr-result [data-act="doc"]') }))()`);
S = await state();
const last = S.store.last || { perTopic: [], wrongIds: [], total: 0, ok: 0, itemIds: [], costMs: 0 };
ok("本轮结算快照已写入 store.last", !!S.store.last && S.store.last.total > 0, JSON.stringify(S.store.last && S.store.last.total));
const expectRate = Math.round((last.ok / last.total) * 100) + "%";
ok("大号正确率与 ok/total 一致", rt.pct === expectRate, rt.pct + " vs " + expectRate);
ok("显示 对 x / y 与用时 mm:ss", /对\s*\d+\s*\/\s*\d+/.test(rt.sub) && /用时\s*\d{2}:\d{2}/.test(rt.sub), rt.sub);
const topicCount = new Set(last.perTopic.map((t) => t.topic)).size;
ok("考点表行数 = 本轮考点数", rt.rows.length === topicCount, "rows=" + rt.rows.length + " topics=" + topicCount);
ok("考点表四列齐全", rt.rows.every((r) => r.cells.length === 4 && /^\d+%$/.test(r.cells[3])), JSON.stringify(rt.rows));
{
  const firstNonWeak = rt.rows.findIndex((r) => !r.weak);
  const lastWeak = rt.rows.map((r) => r.weak).lastIndexOf(true);
  ok("低于 60% 的行置顶并标红", firstNonWeak < 0 || lastWeak < firstNonWeak,
    JSON.stringify(rt.rows.map((r) => [r.cells[0], r.cells[3], r.weak])));
  ok("弱项行正确率 <60%", rt.rows.filter((r) => r.weak).every((r) => Number(r.cells[3].replace("%", "")) < 60));
}
ok("重练错题按钮带数量", /重练错题（\d+）/.test(rt.redo) && /（1）/.test(rt.redo), rt.redo);
ok("重练错题按钮可用（N>0）", !rt.redoDis);
ok("鼓励语指向弱项考点", rt.note.length > 8 && (last.perTopic.some((t) => t.ok / t.total < 0.6) ? /再看一眼/.test(rt.note) : true), rt.note);
ok("结算页有「考前口诀卡」入口", rt.docBtn);
ok("本轮写入 rounds（1 条）", S.store.rounds.length === 1, JSON.stringify(S.store.rounds));
{
  const r = S.store.rounds[0];
  ok("rounds 字段完整", r.mode === "block" && r.total === last.total && r.ok === last.ok &&
    Array.isArray(r.wrongIds) && r.wrongIds.length === 1 && /^\d{4}-\d{2}-\d{2}T/.test(r.startAt) && r.costMs > 0,
    JSON.stringify(r));
}
ok("localStorage 键 eng9a-flash-v1 已写入（含 settings/current）", await $(`(() => { try {
  const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || 'null');
  return !!v && !!v.stat && Array.isArray(v.rounds) && !!v.settings && v.current === null; } catch (e) { return false; } })()`));
const summary = await $(`window.FLASH_APP.summary()`);
ok("今晚小结含正确率/用时/弱项/错题 id+topic", /正确率：\d+%/.test(summary) && /用时：\d{2}:\d{2}/.test(summary) &&
  /## 低于 60% 的考点/.test(summary) && /## 错题/.test(summary) && new RegExp(last.wrongIds[0]).test(summary),
  String(summary).slice(0, 200));
ok("今晚小结错题带出处 src", new RegExp("· 出处：").test(summary) || !(S.items.find((i) => i.id === last.wrongIds[0]) || {}).src);
await click('[data-act="copy"]');
await sleep(600);
ok("点「复制今晚小结」有反馈且不抛异常（剪贴板受限时降级）",
  /复制|小结/.test((await $(`document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toast').textContent : ''`)) || ""),
  await text("#toast"));
await shot("qa-03-result");

/* ── 4. 重练错题 / 再来一轮 / Esc ─────────────── */
group("重练错题与再来一轮");
await click('[data-act="redo-wrong"]');
await sleep(380);
S = await state();
ok("点重练错题进入 redo 轮（只含错题）", S.view === "drill" && S.round.mode === "redo" && S.round.listLen === 1,
  JSON.stringify(S.round));
{
  const ci = "ABCD".indexOf(S.round.answer);
  await pressDigit(ci); await sleep(140); await pressEnter(); await sleep(380);
}
S = await state();
ok("重练轮单独记一轮（rounds=2，mode=redo）", S.view === "result" && S.store.rounds.length === 2 && S.store.rounds[1].mode === "redo",
  JSON.stringify(S.store.rounds.map((r) => r.mode)));
await click('[data-act="again"]');
await sleep(380);
S = await state();
ok("再来一轮从同一批题重开", S.view === "drill" && S.round.listLen === 1, JSON.stringify(S.round));
const roundsBeforeEsc = S.store.rounds.length;
const curBeforeEsc = !!S.current;
await pressEsc();
await sleep(650);
S = await state();
ok("Esc 弹退出确认且文案带进度", dialogMessages.some((m) => /本轮\s*1\s*题/.test(m) && /确定退出/.test(m)),
  JSON.stringify(dialogMessages.slice(-3)));
ok("Esc 退出回开始屏", S.view === "home");
ok("中途退出不写 rounds", S.store.rounds.length === roundsBeforeEsc, S.store.rounds.length + " vs " + roundsBeforeEsc);
ok("退出后 current 被清掉", curBeforeEsc && S.current === null && (await $(`localStorage.getItem('eng9a-flash-v1')`)).indexOf('"current":null') >= 0);
ok("退出提示「本轮已放弃」", /已放弃/.test(await text("#toast")), await text("#toast"));

/* ── 5. 只刷我错过的题 ───────────────────────── */
group("只刷我错过的题");
ok("有错题后按钮启用并显示数量", !(await $(`document.querySelector('#act-wrong').disabled`)) &&
  /错过的题：\d+ 道/.test(await text("#wrong-hint")), await text("#wrong-hint"));
await click("#act-wrong");
await sleep(380);
S = await state();
const wrongSet = Object.keys(S.store.stat).filter((id) => S.store.stat[id].wrong > 0);
ok("只刷错题队列 mode=redo", S.view === "drill" && S.round.mode === "redo", JSON.stringify(S.round && S.round.mode));
ok("队列里每题都是做错过的", S.round && S.round.itemId && wrongSet.indexOf(S.round.itemId) >= 0,
  (S.round && S.round.itemId) + " in " + JSON.stringify(wrongSet));
await pressEsc();
await sleep(500);

/* ── 6. 深链 ─────────────────────────────────── */
group("深链");
const dlBlock = dataBlocks.indexOf(2) >= 0 ? 2 : dataBlocks[0];
await reload("#block=" + dlBlock);
S = await state();
ok("深链 #block=" + dlBlock + " 直进该 block",
  S.view === "drill" && S.round.mode === "block" && (S.items.find((i) => i.id === S.round.itemId) || {}).block === dlBlock,
  JSON.stringify({ view: S.view, mode: S.round && S.round.mode, item: S.round && S.round.itemId }));
await reload("#view=drill");
S = await state();
ok("深链 #view=drill 直接开做题", S.view === "drill" && !!S.round);
await reload("#view=result");
S = await state();
ok("深链 #view=result 打开上次结算", S.view === "result" && /%$/.test((await text("#rt-pct")) || ""));
await reload("#list=wrong");
S = await state();
ok("深链 #list=wrong 只刷错题", S.view === "drill" && S.round.mode === "redo", JSON.stringify(S.round && S.round.mode));
await pressEsc();
await sleep(500);
await reload("#block=9");
S = await state();
ok("非法深链值静默忽略（回开始屏）", S.view === "home", S.view);
await reload("#view=nope&list=nope");
S = await state();
ok("非法 view/list 忽略", S.view === "home", S.view);

/* ── 6.5 题库变更兜底：current 里的失效 id 丢弃、不崩 ── */
group("题库变更兜底");
{
  const validId = S.items[0].id;
  const seed = (cur) => $(`(() => { const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || 'null') || {};
    v.current = ${JSON.stringify(cur)}; localStorage.setItem('eng9a-flash-v1', JSON.stringify(v)); return true; })()`);
  const base = {
    mode: "block", title: "变更测试", mainIds: [validId], idx: 0, done: 0, ok: 0, phase: "main",
    wrongIds: [], pendingRedoIds: [], phaseOk: 0, phaseDone: 0, perTopic: {},
    startAt: new Date().toISOString(), autoNext: false
  };
  // 全部 id 都失效 → 丢掉 current，回开始屏，不崩
  await seed(Object.assign({}, base, { ids: ["nope-999", "nope-998"] }));
  await hardReload();
  S = await state();
  ok("current 全是失效 id：丢弃并回开始屏", S.view === "home" && S.current === null, JSON.stringify({ v: S.view, c: S.current }));
  // 部分失效 → 丢那条，剩下的照常恢复
  await seed(Object.assign({}, base, { ids: ["nope-999", validId], mainIds: [validId] }));
  await hardReload();
  S = await state();
  ok("current 部分失效：丢掉坏 id、恢复剩余", S.view === "drill" && S.round && S.round.itemId === validId &&
    S.current && S.current.ids.length === 1, JSON.stringify({ v: S.view, item: S.round && S.round.itemId }));
  ok("恢复后队列只剩有效题（1/1）", (await text("#bar-progress")) === "1/1" || /^0\/1/.test(await text("#bar-progress")),
    await text("#bar-progress"));
  await pressEsc();
  await sleep(500);
}

/* ── 7. 页内文档 ─────────────────────────────── */
group("页内文档");
await reload("");
await click('#scr-home [data-act="doc"][data-doc="card"]');
await sleep(320);
S = await state();
const cardInfo = await $(`(() => ({
  title: document.querySelector('#doc-title').textContent,
  h1: (document.querySelector('#doc-body h1') || {}).textContent || '',
  rows: document.querySelectorAll('#doc-body tr').length,
  tables: document.querySelectorAll('#doc-body table').length,
  wrapped: !!document.querySelector('#doc-body .tablewrap'),
  wrapOverflow: (() => { const w = document.querySelector('#doc-body .tablewrap');
    return w ? getComputedStyle(w).overflowX : 'none'; })() }))()`);
ok("开始屏「考前口诀卡」打开阅读层", S.view === "doc", S.view);
ok("文档标题用 FLASH_DOCS[k].title", cardInfo.title === "考前口诀卡", cardInfo.title);
ok("正文渲染出标题与表格（tr ≥ 10）", cardInfo.h1.length > 2 && cardInfo.tables >= 1 && cardInfo.rows >= 10,
  JSON.stringify({ h1: cardInfo.h1, tables: cardInfo.tables, rows: cardInfo.rows }));
ok("表格包在 overflow-x:auto 容器里", cardInfo.wrapped && cardInfo.wrapOverflow === "auto", JSON.stringify(cardInfo.wrapOverflow));
await click('[data-act="doc-back"]');
await sleep(300);
S = await state();
ok("阅读层「← 返回」回到开始屏", S.view === "home", S.view);
await click('#scr-home [data-act="doc"][data-doc="plan"]');
await sleep(320);
ok("「今晚复习方案」能打开且标题正确", (await state()).view === "doc" && (await text("#doc-title")) === "今晚复习方案",
  await text("#doc-title"));
ok("方案正文有表格与列表", (await $(`document.querySelectorAll('#doc-body table').length`)) >= 1 &&
  (await $(`document.querySelectorAll('#doc-body ul, #doc-body ol').length`)) >= 1);
await click('[data-act="doc-back"]');
await sleep(280);
await click('#scr-home [data-act="doc"][data-doc="guide"]');
await sleep(320);
ok("「使用说明」能打开且标题正确", (await state()).view === "doc" && (await text("#doc-title")) === "使用说明",
  await text("#doc-title"));
await click('[data-act="doc-back"]');
await sleep(280);
// 结算屏入口
await reload("#view=result");
await click('#scr-result [data-act="doc"][data-doc="card"]');
await sleep(320);
ok("结算屏「考前口诀卡」入口可打开", (await state()).view === "doc" && (await text("#doc-title")) === "考前口诀卡",
  await text("#doc-title"));
await click('[data-act="doc-back"]');
await sleep(320);
ok("从结算页进入，返回时回到结算页", (await state()).view === "result", (await state()).view);
// 深链
await reload("#view=doc&doc=card");
ok("深链 #view=doc&doc=card 打开口诀卡", (await state()).view === "doc" && (await text("#doc-title")) === "考前口诀卡",
  (await text("#doc-title")));
await reload("#view=doc&doc=nope");
ok("非法 doc 值静默忽略（回开始屏）", (await state()).view === "home", (await state()).view);
// FLASH_DOCS 缺失降级
await reload("");
await $(`window.__savedDocs = window.FLASH_DOCS; window.FLASH_DOCS = {};`);
await click('#scr-home [data-act="doc"][data-doc="card"]');
await sleep(320);
ok("FLASH_DOCS 缺失时点入口只提示、不崩", (await state()).view === "home" &&
  /文档还没打包/.test(await text("#toast")) && /build\.mjs/.test(await text("#toast")), await text("#toast"));
await $(`window.FLASH_DOCS = window.__savedDocs; true`);

/* ── 8. 题干中文提示（cn） ───────────────────── */
group("题干中文提示");
{
  const st2 = await state();
  const byBlock = {};
  st2.items.forEach((i) => { (byBlock[i.block] = byBlock[i.block] || []).push(i); });
  const cnBlock = Object.keys(byBlock).map(Number).find((b) => byBlock[b].every((i) => i.cn));
  if (!cnBlock) {
    ok("题库里没有中文提示题，跳过", true);
  } else {
    await reload("#block=" + cnBlock);
    const cnInfo = await $(`(() => { const el = document.querySelector('#qcard .qcn');
      return el ? { text: el.textContent.trim(), h: Math.round(el.getBoundingClientRect().height) } : null; })()`);
    ok("题干下有 cn 时渲染中文提示", cnInfo && cnInfo.text.length > 2 && cnInfo.h > 10, JSON.stringify(cnInfo));
    await pressEsc();
    await sleep(450);
  }
}

/* ── 9. 390px 手机视口 ───────────────────────── */
group("390px 手机视口");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await reload("#block=" + dlBlock);
await sleep(300);
const mob = await $(`(() => {
  const opts = [...document.querySelectorAll('#qcard .opt')].map(o => {
    const r = o.getBoundingClientRect();
    return { k: o.dataset.k, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  });
  const q = document.querySelector('.qwrap');
  return {
    iw: innerWidth, ih: innerHeight,
    docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth,
    docH: document.documentElement.scrollHeight,
    opts,
    qScroll: q ? { ch: q.clientHeight, sh: q.scrollHeight } : null,
    topicVisible: !!document.querySelector('.topic-chip').offsetParent,
    autoVisible: !!document.querySelector('#act-auto').offsetParent
  }; })()`);
ok("390 视口无横向溢出", mob && mob.docW <= mob.iw + 1 && mob.bodyW <= mob.iw + 1, JSON.stringify({ docW: mob.docW, iw: mob.iw }));
ok("390 视口四个选项全部在视口内可见", mob.opts.length === 4 && mob.opts.every((o) => o.top >= 0 && o.bottom <= mob.ih + 1),
  JSON.stringify(mob.opts) + " ih=" + mob.ih);
ok("390 视口选项高度 ≥48px", mob.opts.every((o) => o.h >= 48), JSON.stringify(mob.opts.map((o) => o.h)));
ok("390 视口无需整页滚动即可看题与选项", mob.docH <= mob.ih + 1 && (!mob.qScroll || mob.qScroll.sh <= mob.qScroll.ch + 1),
  JSON.stringify({ docH: mob.docH, ih: mob.ih, q: mob.qScroll }));
ok("390 视口顶栏 topic 与自动开关可见", mob.topicVisible && mob.autoVisible);
await answerWith(true);
await sleep(220);
const mobOk = await $(`(() => {
  const ack = document.querySelector('#fb [data-act="ack"]');
  const r = ack && ack.getBoundingClientRect();
  return { shown: getComputedStyle(document.querySelector('#fb')).display !== 'none',
    ackBottom: r ? Math.round(r.bottom) : -1, ih: innerHeight, ackH: r ? Math.round(r.height) : 0,
    docW: document.documentElement.scrollWidth, text: (document.querySelector('#fb') || {}).textContent || '' }; })()`);
ok("390 答对后「考点/下一题」都在屏内", mobOk.shown && /考点：/.test(mobOk.text) && mobOk.ackBottom > 0 &&
  mobOk.ackBottom <= mobOk.ih + 1 && mobOk.ackH >= 44 && mobOk.docW <= 391, JSON.stringify(mobOk));
await pressEnter();
await sleep(200);
await answerWith(false);
await sleep(220);
const mobBad = await $(`(() => {
  const ack = document.querySelector('#fb [data-act="ack"]');
  const r = ack && ack.getBoundingClientRect();
  return { shown: getComputedStyle(document.querySelector('#fb')).display !== 'none',
    ackBottom: r ? Math.round(r.bottom) : -1, ih: innerHeight, ackH: r ? Math.round(r.height) : 0,
    docW: document.documentElement.scrollWidth }; })()`);
ok("390 答错讲解条与「记住了」可见且不溢出", mobBad.shown && mobBad.ackBottom > 0 && mobBad.ackBottom <= mobBad.ih + 1 &&
  mobBad.ackH >= 44 && mobBad.docW <= 391, JSON.stringify(mobBad));
await pressEsc();
await sleep(450);
await send("Emulation.clearDeviceMetricsOverride");
await sleep(200);

/* ── 10. 记录导入导出 / 清空 ──────────────────── */
group("记录导入导出与清空");
await reload("");
const payload = await $(`window.FLASH_APP.exportPayload()`);
ok("导出外壳符合 lt.practice-records/1", payload && payload.schema === "lt.practice-records/1" &&
  payload.subject === "英语" && payload.tool === "语法闪练" &&
  /^\d{4}-\d{2}-\d{2}T/.test(payload.exportedAt) && payload.data && payload.data.stat && Array.isArray(payload.data.rounds),
  JSON.stringify(payload && { schema: payload.schema, subject: payload.subject, tool: payload.tool }));
ok("导出 data 里带 settings（新增字段）", payload && payload.data && payload.data.settings &&
  typeof payload.data.settings.autoNext === "boolean", JSON.stringify(payload && payload.data && payload.data.settings));
await $(`(() => { window.__origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { window.__dlName = this.download; };
  document.querySelector('[data-act="export"]').click(); return true; })()`);
await sleep(220);
const dlName = await $(`window.__dlName`);
ok("导出文件名 英语-语法闪练-YYYY-MM-DD.json", /^英语-语法闪练-\d{4}-\d{2}-\d{2}\.json$/.test(dlName || ""), dlName);
await $(`(() => { if (window.__origClick) HTMLAnchorElement.prototype.click = window.__origClick; return true; })()`);
// 旧格式（没有 current / settings）必须能导入
const legacy = JSON.stringify({
  schema: "lt.practice-records/1", subject: "英语", tool: "语法闪练",
  exportedAt: new Date().toISOString(),
  data: { stat: { "cl-001": { att: 5, ok: 3, wrong: 2, at: "2026-11-05T10:00:00.000Z" } },
    rounds: [{ mode: "plan", startAt: "2026-11-05T09:00:00.000Z", endAt: "2026-11-05T09:12:00.000Z",
      costMs: 720000, total: 100, ok: 60, wrongIds: ["vb-002"] }], last: null }
});
const imported = await $(`window.FLASH_APP.importText(${JSON.stringify(legacy)})`);
ok("旧记录（无 current/settings）导入整份覆盖并显示条数变化", imported === true &&
  dialogMessages.some((m) => /现在\s*\d+\s*条作答/.test(m) && /导入\s*1\s*条作答/.test(m)),
  JSON.stringify(dialogMessages.slice(-2)));
S = await state();
ok("导入后 stat/rounds 已替换", Object.keys(S.store.stat).length === 1 && S.store.stat["cl-001"] &&
  S.store.stat["cl-001"].att === 5 && S.store.rounds.length === 1, JSON.stringify(S.store.stat));
ok("导入旧文件后 current 为空、settings 有默认值", S.current === null && S.settings && S.settings.autoNext === false,
  JSON.stringify({ cur: S.current, settings: S.settings }));
const badImport = await $(`(() => { try { return window.FLASH_APP.importText("{not json"); } catch (e) { return 'threw:' + e.message; } })()`);
ok("坏文件导入提示「导入失败」且不动原记录", badImport === false &&
  dialogMessages.some((m) => /导入失败/.test(m)) && (await state()).store.stat["cl-001"],
  JSON.stringify(dialogMessages.slice(-1)));
// 清空：记录清掉，但「自动跳题」偏好保留
await $(`window.FLASH_APP.toggleAuto(); localStorage.getItem('eng9a-flash-v1')`);
ok("清空前先把自动跳题打开（用于验证偏好保留）", (await state()).settings.autoNext === true);
await click('[data-act="clear"]');
await sleep(550);
S = await state();
ok("清空后 stat/rounds/current 全空", Object.keys(S.store.stat).length === 0 && S.store.rounds.length === 0 &&
  S.current === null && /清空/.test(dialogMessages.slice(-1)[0] || ""), JSON.stringify(S.store));
ok("清空保留「自动跳题」偏好", S.settings.autoNext === true, JSON.stringify(S.settings));

/* ── 11. 无题库兜底 ──────────────────────────── */
group("无题库兜底");
// 单文件版（../语法闪练.html）把数据内联了，没有 src=bundle.js 可拦；这一组对它没有意义，跳过。
const usesExternalBundle = await $(`!!document.querySelector('script[src="data/bundle.js"]')`);
if (!usesExternalBundle) {
  ok("单文件版内联数据，跳过无题库兜底（可用源码版复测）", true);
  ok("单文件版内联数据，跳过无题库兜底（可用源码版复测）", true);
  ok("单文件版内联数据，跳过无题库兜底（可用源码版复测）", true);
} else {
  await send("Network.setBlockedURLs", { urls: ["*data/bundle.js*"] });
  await reload("");
  await sleep(400);
  const noData = await $(`(() => ({
    app: !!window.FLASH_APP,
    blocks: window.FLASH_DATA ? (window.FLASH_DATA.blocks || []).length : -1,
    banner: (document.querySelector('#home-banner') || {}).textContent || '',
    planDis: document.querySelector('#act-plan').disabled,
    allMissing: [...document.querySelectorAll('.bcard')].every(c => c.classList.contains('is-missing') && c.disabled),
    docLinks: document.querySelectorAll('#scr-home [data-act="doc"]').length,
    view: document.querySelector('#scr-home').classList.contains('is-active') }))()`);
  ok("无数据时不白屏、显示友好提示", noData.app && noData.view && /题库还没生成/.test(noData.banner) && /build\.mjs/.test(noData.banner),
    JSON.stringify(noData));
  ok("无数据时开始按钮禁用、卡片全灰、文档入口仍在", noData.planDis && noData.allMissing && noData.docLinks === 3,
    JSON.stringify(noData));
  {
    const exc = events.slice(-40).filter((e) => e.method === "Runtime.exceptionThrown");
    ok("无数据时没有未捕获异常", exc.length === 0, JSON.stringify(exc.slice(0, 2)));
  }
  await send("Network.setBlockedURLs", { urls: [] });
}

/* ── 12. 运行时报错（正常数据下） ────────────── */
group("运行时报错");
const errs = [];
for (const e of events) {
  if (e.method === "Runtime.exceptionThrown") errs.push("EXCEPTION " + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
  if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") errs.push("CONSOLE " + e.params.args.map((a) => a.value ?? a.description).join(" "));
  if (e.method === "Log.entryAdded" && e.params.entry.level === "error" &&
    !/bundle\.js|ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(e.params.entry.text)) {
    errs.push("LOG " + e.params.entry.text);
  }
}
ok("无 JS 报错", errs.length === 0, errs.slice(0, 3).join(" | "));

/* ── 汇总 ───────────────────────────────────── */
const fails = checks.filter((c) => c.group === undefined && !c.pass);
console.log("");
let n = 0;
for (const c of checks) {
  if (c.group) { console.log("\n── " + c.group + " ──"); continue; }
  n++;
  console.log(`${c.pass ? "  ✓" : "  ✗"} ${c.name}${c.pass ? "" : "   [" + c.detail + "]"}`);
}
console.log(`\n共 ${n} 条断言，失败 ${fails.length} 条`);
console.log("截图：" + outDir);

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(fails.length ? 1 : 0);
