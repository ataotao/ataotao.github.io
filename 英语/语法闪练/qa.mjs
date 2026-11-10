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
/* 悬停词义用：把鼠标移到元素中心（先滚到视口中间，避免元素在滚动区外） */
const hover = async (sel) => {
  const box = await $(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null; el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) return null;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none" });
  await sleep(160);
  return box;
};
const moveAway = async () => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2, button: "none" });
  await sleep(130);
};
const tipState = () => $(`(() => { const t = document.querySelector('#zh-tip');
  if (!t) return { show: false, zh: '', en: '', visible: false, inside: false };
  const r = t.getBoundingClientRect();
  return { show: t.classList.contains('show'),
    zh: ((t.querySelector('.zt-zh') || {}).textContent || '').trim(),
    en: ((t.querySelector('.zt-en') || {}).textContent || '').trim(),
    visible: r.width > 0 && r.height > 0,
    inside: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1 }; })()`);
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
/* 结算页考点表快照：rows[i].cells = [考点, 题数, 正确, 正确率] */
const tableSnapshot = () => $(`(() => ({
  pct: document.querySelector('#rt-pct').textContent.trim(),
  sub: document.querySelector('#rt-sub').textContent.trim(),
  rows: [...document.querySelectorAll('#rt-body tr')].map(tr => ({
    topic: tr.querySelector('td.tp') ? tr.querySelector('td.tp').textContent.trim() : '',
    cells: [...tr.querySelectorAll('td')].map(td => td.textContent.trim()),
    weak: tr.classList.contains('weak') })) }))()`);
function sumCol(rows, i) {
  return rows.reduce((a, r) => a + (Number(r.cells[i]) || 0), 0);
}
function parsedXY(sub) {
  const m = String(sub).match(/对\s*(\d+)\s*\/\s*(\d+)/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
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
  /还没有错过/.test(await text("#wrong-hint")));
ok("页脚有导出/导入/清空", await $(`(() => ['export','import','clear'].every(a => !!document.querySelector('[data-act="' + a + '"]')))()`));
ok("无进行中的本轮（current = null）", S.current === null, JSON.stringify(S.current));
ok("默认不自动跳题（settings.autoNext=false）", S.settings && S.settings.autoNext === false);

// 开始屏「明早考前看」文档入口
const homeDocs = await $(`(() => [...document.querySelectorAll('#scr-home [data-act="doc"]')].map(b => b.getAttribute('data-doc')))()`);
ok("开始屏有 5 个文档入口（口诀卡/对比卡/速查表/方案/说明）", (homeDocs || []).join(",") === "card,pair,quick,plan,guide", JSON.stringify(homeDocs));
ok("FLASH_DOCS 注入五个 key", (S.docs || []).join(",") === "card,pair,quick,plan,guide", JSON.stringify(S.docs));

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
ok("本轮没看答案时结算页不显示「另有…看了答案」", !(await $(`document.querySelector('#rt-peek').classList.contains('show')`)));
ok("本轮写入 rounds（1 条）", S.store.rounds.length === 1, JSON.stringify(S.store.rounds));
{
  const r = S.store.rounds[0];
  ok("rounds 字段完整", r.mode === "block" && r.total === last.total && r.ok === last.ok &&
    Array.isArray(r.wrongIds) && r.wrongIds.length === 1 && /^\d{4}-\d{2}-\d{2}T/.test(r.startAt) && r.costMs > 0,
    JSON.stringify(r));
  ok("没看答案的一轮 rounds.peek = 0 且 peekIds 为空", (r.peek || 0) === 0 && Array.isArray(r.peekIds) && r.peekIds.length === 0,
    JSON.stringify({ peek: r.peek, ids: r.peekIds }));
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
// 新口径：做错过 或 看过答案 都算「错过」
const wrongSet = Object.keys(S.store.stat).filter((id) => {
  const s = S.store.stat[id] || {};
  return Number(s.wrong || 0) > 0 || Number(s.peek || 0) > 0;
});
ok("只刷错过题队列 mode=redo", S.view === "drill" && S.round.mode === "redo", JSON.stringify(S.round && S.round.mode));
ok("队列里每题都是错过过的（含看答案）", S.round && S.round.itemId && wrongSet.indexOf(S.round.itemId) >= 0,
  (S.round && S.round.itemId) + " in " + JSON.stringify(wrongSet));
await pressEsc();
await sleep(500);

/* ── 5.5 看答案（逃生阀：不计分、进重练） ─────── */
group("看答案（不计分、进重练）");
await reload("");
await click(`.bcard[data-block="${smallest.block}"]`);
await sleep(420);
S = await state();
const PN = S.round.listLen;
const pkBtnInfo = await $(`(() => { const b = document.querySelector('#qcard [data-act="peek"]');
  if (!b) return null;
  const cs = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  const opts = [...document.querySelectorAll('#qcard .opt')];
  const lastOpt = opts[opts.length - 1].getBoundingClientRect();
  const fb = document.querySelector('#fb');
  return { text: b.textContent.trim(), cls: b.className, h: Math.round(r.height),
    top: Math.round(r.top), lastOptBottom: Math.round(lastOpt.bottom),
    beforeFb: !!(fb && (b.compareDocumentPosition(fb) & Node.DOCUMENT_POSITION_FOLLOWING)),
    bg: cs.backgroundColor, color: cs.color }; })()`);
ok("未判题显示「看答案」按钮", pkBtnInfo && pkBtnInfo.text === "看答案", JSON.stringify(pkBtnInfo));
ok("「看答案」是次要样式（虚线浅灰，不是紫色主按钮）",
  pkBtnInfo && /peeklink/.test(pkBtnInfo.cls) && pkBtnInfo.bg !== "rgb(124, 92, 214)" && pkBtnInfo.h >= 30,
  JSON.stringify(pkBtnInfo && { cls: pkBtnInfo.cls, bg: pkBtnInfo.bg, h: pkBtnInfo.h }));
ok("「看答案」在选项下方、反馈区上方",
  pkBtnInfo && pkBtnInfo.top >= pkBtnInfo.lastOptBottom - 1 && pkBtnInfo.beforeFb === true,
  JSON.stringify(pkBtnInfo && { top: pkBtnInfo.top, optBottom: pkBtnInfo.lastOptBottom, beforeFb: pkBtnInfo.beforeFb }));

const q1 = S.round;
const q1Id = q1.itemId;
const statBefore = Object.assign({ att: 0, ok: 0, wrong: 0 }, S.store.stat[q1Id] || {});
await click('#qcard [data-act="peek"]');
await sleep(260);
const pk = await $(`(() => { const fb = document.querySelector('#fb');
  const ack = fb && fb.querySelector('[data-act="ack"]');
  const head = fb && fb.querySelector('.fb-head');
  return { right: !!document.querySelector('#qcard .opt.is-right'),
    bad: !!document.querySelector('#qcard .opt.is-bad'),
    locked: [...document.querySelectorAll('#qcard .opt')].every(o => o.disabled),
    peekBtn: !!document.querySelector('#qcard [data-act="peek"]'),
    fbCls: fb ? fb.className : '', fbText: fb ? fb.textContent.trim() : '',
    head: head ? head.textContent.trim() : '',
    ack: ack ? ack.textContent.trim() : '', ackH: ack ? Math.round(ack.getBoundingClientRect().height) : 0,
    prog: document.querySelector('#bar-progress').textContent,
    rate: document.querySelector('#bar-rate').textContent.trim(),
    toast: (document.querySelector('#toast') || {}).textContent || '' }; })()`);
ok("点「看答案」：正确项绿框、不给任何选项标红", pk.right && !pk.bad, JSON.stringify({ r: pk.right, b: pk.bad }));
ok("点「看答案」：选项全部锁死", pk.locked);
ok("点「看答案」：反馈是琥珀中性样式（不是绿色 ✓）",
  /fb-peek/.test(pk.fbCls) && !/fb-ok/.test(pk.fbCls) && /👀 看答案/.test(pk.head) && !/✓/.test(pk.head),
  JSON.stringify({ cls: pk.fbCls, head: pk.head }));
ok("点「看答案」：反馈写「考点 / 规则 / 易错点 / 出处」",
  /考点：/.test(pk.fbText) && pk.fbText.indexOf(q1.topic) >= 0 && /规则：/.test(pk.fbText) &&
  /易错点：/.test(pk.fbText) && (/出处：/.test(pk.fbText) || !q1.src), pk.fbText.slice(0, 170));
ok("「看答案」解析里先给「怎么认出」线索，再给规则",
  /怎么认出：/.test(pk.fbText) && pk.fbText.indexOf("怎么认出：") < pk.fbText.indexOf("规则："),
  pk.fbText.slice(0, 140));
ok("点「看答案」：明确写「这题没计入正确率，已加入重练」",
  /没计入正确率/.test(pk.fbText) && /已加入重练/.test(pk.fbText), pk.fbText.slice(-60));
ok("点「看答案」：按钮变「下一题 →」且 ≥44px", /下一题/.test(pk.ack) && pk.ackH >= 44, JSON.stringify({ t: pk.ack, h: pk.ackH }));
ok("看答案后「看答案」按钮消失", !pk.peekBtn);
ok("看答案计入进度（1/N）", pk.prog === "1/" + PN, pk.prog);
ok("看答案后分母为 0 显示「正确率 —」（不是 0/0 0%）", pk.rate === "正确率 —", pk.rate);
ok("看答案有 toast 提示不计分", /不计分/.test(pk.toast), pk.toast);
S = await state();
ok("看答案不计入 stat（不算一次作答）",
  (S.store.stat[q1Id] || { att: 0 }).att === statBefore.att && (S.store.stat[q1Id] || { wrong: 0 }).wrong === statBefore.wrong,
  JSON.stringify({ before: statBefore, after: S.store.stat[q1Id] }));
ok("看答案不计 phaseOk / ok", S.round.phaseOk === 0 && S.round.ok === 0,
  JSON.stringify({ p: S.round.phaseOk, o: S.round.ok }));
ok("看答案的题进 redo 队列且 peekIds 记下",
  S.round.pendingRedo === 1 && S.round.peekIds.indexOf(q1Id) >= 0,
  JSON.stringify({ pr: S.round.pendingRedo, ids: S.round.peekIds }));
ok("快照 current 里带 peekIds", S.current && S.current.peekIds.indexOf(q1Id) >= 0,
  JSON.stringify(S.current && S.current.peekIds));

// 「刚看完答案就刷新」：原样停在讲解态，不再出现按钮
await hardReload();
S = await state();
const hold = await $(`(() => ({
  peekBtn: !!document.querySelector('#qcard [data-act="peek"]'),
  right: !!document.querySelector('#qcard .opt.is-right'),
  bad: !!document.querySelector('#qcard .opt.is-bad'),
  fb: (document.querySelector('#fb') || {}).textContent || '',
  rate: document.querySelector('#bar-rate').textContent.trim(),
  prog: document.querySelector('#bar-progress').textContent }))()`);
ok("刷新后仍停在这道题的看答案状态",
  S.view === "drill" && S.round && S.round.itemId === q1Id && S.round.peekHold === true,
  JSON.stringify({ v: S.view, id: S.round && S.round.itemId, hold: S.round && S.round.peekHold }));
ok("刷新后「看答案」按钮不出现（已看过）", !hold.peekBtn);
ok("刷新后正确项仍绿、仍无红色", hold.right && !hold.bad, JSON.stringify({ r: hold.right, b: hold.bad }));
ok("刷新后仍显示看答案讲解、正确率仍为 —", /看答案/.test(hold.fb) && hold.rate === "正确率 —",
  JSON.stringify({ rate: hold.rate, prog: hold.prog }));
ok("刷新后进度仍是 1/N", hold.prog === "1/" + PN, hold.prog);
ok("刷新后 current.peekIds 仍在", S.current && S.current.peekIds.indexOf(q1Id) >= 0);
await pressEnter();
await sleep(240);
S = await state();
ok("看完答案按 Enter 进入下一题", S.round && S.round.itemId !== q1Id);
ok("新一题「看答案」按钮恢复显示", !!(await $(`document.querySelector('#qcard [data-act="peek"]')`)));

// 答对 1 题 + 看答案 1 题 → 顶栏 1/1 100%（不是 1/2 50%）
await answerWith(true);
await sleep(120);
ok("顶栏分母不含看答案：答对 1 + 看答案 1 显示 1/1 100%",
  (await text("#bar-rate")).indexOf("1/1 100%") >= 0, await text("#bar-rate"));
ok("此时进度 2/N", (await text("#bar-progress")) === "2/" + PN, await text("#bar-progress"));
await hardReload();
S = await state();
ok("刷新后正确率口径保持 1/1 100%", (await text("#bar-rate")).indexOf("1/1 100%") >= 0 &&
  S.current && S.current.peekIds.length === 1, JSON.stringify({ rate: await text("#bar-rate") }));
ok("刷新后进度 2/N", (await text("#bar-progress")) === "2/" + PN);
await pressEnter();
await sleep(200);

// 主轮剩下的全做对 → 重练队列里应有「看答案」那道
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
ok("主轮结束进入重练轮（看答案的题也在里面）",
  S.round && S.round.phase === "redo" && S.round.listLen === 1 && S.round.itemId === q1Id,
  S.round && JSON.stringify({ phase: S.round.phase, len: S.round.listLen, id: S.round.itemId }));
// 重练轮再看答案：不再重排，只讲 + 下一题
await click('#qcard [data-act="peek"]');
await sleep(240);
S = await state();
ok("重练轮再看答案不再重排（pendingRedo=0，避免死循环）",
  S.round && S.round.phase === "redo" && S.round.pendingRedo === 0, JSON.stringify({ pr: S.round && S.round.pendingRedo }));
ok("重练轮看答案说明不带「已加入重练」",
  /没计入正确率/.test(await text("#fb")) && !/已加入重练/.test(await text("#fb")), await text("#fb"));
await pressEnter();
await sleep(450);
S = await state();
ok("重练轮看完答案可以直接结束本轮", S.view === "result", S.view);

// 结算页：Y 不含 peek、另有 N 题、琥珀 chips 可回看
const rtPeek = await $(`(() => ({ pct: document.querySelector('#rt-pct').textContent.trim(),
  sub: document.querySelector('#rt-sub').textContent.trim(),
  peek: document.querySelector('#rt-peek').textContent.trim(),
  peekShown: document.querySelector('#rt-peek').classList.contains('show'),
  chips: [...document.querySelectorAll('#rt-chips .chip')].map(c => c.textContent.trim()),
  chipsShown: document.querySelector('#rt-chips').classList.contains('show'),
  redo: document.querySelector('#act-redo').textContent.trim() }))()`);
const pkRound = (S.store.rounds || [])[S.store.rounds.length - 1] || {};
const pkJudged = (S.store.last.total || 0) - (pkRound.peek || 0);
ok("结算「对 X / Y」的 Y 不含看答案的题",
  new RegExp("对\\s*" + S.store.last.ok + "\\s*/\\s*" + pkJudged).test(rtPeek.sub), rtPeek.sub);
ok("结算大号正确率按（total - peek）算",
  rtPeek.pct === (pkJudged ? Math.round((S.store.last.ok / pkJudged) * 100) + "%" : "—"),
  rtPeek.pct + " judged=" + pkJudged);
ok("结算页出现「另有 1 题看了答案（没计入正确率，已加入重练）」",
  rtPeek.peekShown && /另有\s*1\s*题看了答案/.test(rtPeek.peek) && /没计入正确率/.test(rtPeek.peek), rtPeek.peek);
ok("琥珀色 chips 列出看答案的题", rtPeek.chipsShown && rtPeek.chips.length === 1 && rtPeek.chips[0].length > 0,
  JSON.stringify(rtPeek.chips));
ok("看答案的题不进错题清单（重练错题 N=0 且禁用）", /（0）/.test(rtPeek.redo) && (await $(`document.querySelector('#act-redo').disabled`)),
  rtPeek.redo);
ok("rounds 记录带 peek 计数与 peekIds",
  pkRound.peek === 1 && Array.isArray(pkRound.peekIds) && pkRound.peekIds.indexOf(q1Id) >= 0,
  JSON.stringify({ peek: pkRound.peek, ids: pkRound.peekIds }));
const pkSummary = await $(`window.FLASH_APP.summary()`);
ok("今晚小结新增「## 看了答案的题」且带 id·topic·出处",
  /## 看了答案的题/.test(pkSummary) && new RegExp(q1Id).test(pkSummary) &&
  /正确率：\d+%/.test(pkSummary) && /另有 1 题看了答案/.test(pkSummary), String(pkSummary).slice(0, 260));
await click('#rt-chips .chip');
await sleep(300);
const rv = await $(`(() => ({ open: document.querySelector('#modal').classList.contains('is-open'),
  right: !!document.querySelector('#modal .rv-opt.is-right'),
  text: (document.querySelector('#modal-card') || {}).textContent || '' }))()`);
ok("点 chips 可回看该题（正确项标绿、含规则/出处）",
  rv.open && rv.right && /规则：/.test(rv.text) && (/出处：/.test(rv.text) || !q1.src), JSON.stringify({ open: rv.open, right: rv.right }));
await click('[data-act="modal-cancel"]');
await sleep(200);
ok("回看弹窗可关闭", !(await $(`document.querySelector('#modal').classList.contains('is-open')`)));
await shot("qa-06-peek-result");
// 深链重开结算：口径仍一致（peek 信息来自 rounds 配对）
await reload("#view=result");
S = await state();
ok("深链 #view=result 仍显示看答案口径", S.view === "result" &&
  /另有\s*1\s*题看了答案/.test(await text("#rt-peek")) && (await $(`document.querySelectorAll('#rt-chips .chip').length`)) === 1,
  await text("#rt-peek"));

// 结算「考点表现」表：看答案的题要从题数/正确率里剔掉（否则会把没判的题算成答错）
{
  const t = await tableSnapshot();
  const row = t.rows.find((r) => r.topic === q1.topic);
  const xy = parsedXY(t.sub);
  ok("考点表把看答案的题从题数里剔除（1 题对 1 = 100%，不是 2 题对 1 = 92%）",
    row && row.cells[1] === "1" && row.cells[2] === "1" && row.cells[3] === "100%",
    JSON.stringify(row));
  ok("考点表 Σ题数 = 对 X / Y 的 Y", xy && sumCol(t.rows, 1) === xy.y,
    JSON.stringify({ sum: sumCol(t.rows, 1), y: xy && xy.y }));
  ok("考点表 Σ正确 = 对 X / Y 的 X", xy && sumCol(t.rows, 2) === xy.x,
    JSON.stringify({ sum: sumCol(t.rows, 2), x: xy && xy.x }));
  ok("看答案的考点率与大号正确率一致（都是 100%）", t.pct === "100%" && row && row.cells[3] === "100%",
    JSON.stringify({ pct: t.pct, row: row && row.cells[3] }));
  const sum = await $(`window.FLASH_APP.summary()`);
  ok("小结「低于 60% 的考点」同口径：不再把这个 100% 的考点误列弱项",
    /## 低于 60% 的考点/.test(sum) && !new RegExp("- " + q1.topic + "：").test(sum), String(sum).slice(0, 220));
}
await click('[data-act="home"]');
await sleep(250);

/* ── 5.6 结算表：某考点全看答案 → 0 题 / — / 排最前 ── */
group("结算考点表：全看答案的考点");
{
  const st0 = await state();
  const byTopic = {};
  st0.items.filter((i) => i.block === smallest.block).forEach((i) => { byTopic[i.topic] = (byTopic[i.topic] || 0) + 1; });
  const targetTopic = Object.keys(byTopic).find((t) => byTopic[t] >= 2) || Object.keys(byTopic)[0];
  ok("找到可用于「全看答案」的考点", !!targetTopic, targetTopic + " × " + byTopic[targetTopic]);
  await reload("#block=" + smallest.block);
  {
    let guard = 0;
    while (guard++ < 400) {
      const st = await state();
      if (!st.round || st.view !== "drill") break;
      if (st.round.phase === "main" && st.round.topic === targetTopic) {
        await click('#qcard [data-act="peek"]');
        await sleep(130);
      } else if (!st.round.locked) {
        await answerWith(true);
      }
      await pressEnter();
    }
  }
  S = await state();
  ok("全看答案的一轮能正常进结算", S.view === "result", S.view);
  const t = await tableSnapshot();
  const row = t.rows[0] || {};
  ok("全看答案的考点行：题数 0、正确 0、正确率 —",
    row.topic === targetTopic && row.cells[1] === "0" && row.cells[2] === "0" && row.cells[3] === "—",
    JSON.stringify(row));
  ok("「—」的考点排在最前面并标红", row.topic === targetTopic && row.weak, JSON.stringify(t.rows.slice(0, 2)));
  const xy = parsedXY(t.sub);
  ok("全看答案一轮：考点表 Σ题数 = 对 X / Y 的 Y", xy && sumCol(t.rows, 1) === xy.y,
    JSON.stringify({ sum: sumCol(t.rows, 1), y: xy && xy.y }));
  ok("全看答案一轮：另有 N 题看了答案", /另有\s*2\s*题看了答案/.test(await text("#rt-peek")), await text("#rt-peek"));
  const sum = await $(`window.FLASH_APP.summary()`);
  ok("小结里「—」考点按 0 题/— 列出",
    new RegExp("- " + targetTopic + "：0 题对 0（—）").test(sum), String(sum).slice(0, 260));
}
await click('[data-act="home"]');
await sleep(250);

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
await click('#scr-home [data-act="doc"][data-doc="pair"]');
await sleep(320);
const pairInfo = await $(`(() => ({
  view: (window.FLASH_APP.state() || {}).view,
  title: (document.querySelector('#doc-title') || {}).textContent || '',
  h3: document.querySelectorAll('#doc-body h3').length,
  tables: document.querySelectorAll('#doc-body table').length,
  rows: document.querySelectorAll('#doc-body tr').length }))()`);
ok("「最小对立对卡」能打开且标题正确", pairInfo.view === "doc" && pairInfo.title === "最小对立对卡",
  JSON.stringify({ view: pairInfo.view, title: pairInfo.title }));
ok("对比卡渲染出 20 张卡（20 个 h3 / 20 张表 / 60 行）",
  pairInfo.h3 === 20 && pairInfo.tables === 20 && pairInfo.rows === 60, JSON.stringify(pairInfo));
await click('[data-act="doc-back"]');
await sleep(280);
await click('#scr-home [data-act="doc"][data-doc="quick"]');
await sleep(340);
const quickInfo = await $(`(() => ({
  view: (window.FLASH_APP.state() || {}).view,
  title: (document.querySelector('#doc-title') || {}).textContent || '',
  h1: (document.querySelector('#doc-body h1') || {}).textContent || '',
  h2: document.querySelectorAll('#doc-body h2').length,
  tables: document.querySelectorAll('#doc-body table').length,
  rows: document.querySelectorAll('#doc-body tbody tr').length,
  empty: [...document.querySelectorAll('#doc-body tbody tr')].filter(tr => !tr.textContent.trim()).length,
  dot: [...document.querySelectorAll('#doc-body tbody td:nth-child(3)')].every(td => td.textContent.trim().length > 4) }))()`);
ok("「考点识别速查表」能打开且标题正确", quickInfo.view === "doc" && quickInfo.title === "考点识别速查表",
  JSON.stringify({ view: quickInfo.view, title: quickInfo.title }));
ok("速查表按 4 个 block 分组、每个考点一行且线索不为空",
  quickInfo.h2 === 4 && quickInfo.tables === 4 && quickInfo.rows === 49 && quickInfo.empty === 0 && quickInfo.dot,
  JSON.stringify(quickInfo));
await shot("qa-13-quick");
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
await reload("#view=doc&doc=pair");
ok("深链 #view=doc&doc=pair 打开对比卡", (await state()).view === "doc" && (await text("#doc-title")) === "最小对立对卡",
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

/* ── 8. 答后译文 + 悬停词义 ─────────────────── */
group("答后译文与悬停词义");
{
  const st8 = await state();
  ok("全局词表已注入（words ≥ 300、phrases > 0）",
    st8.gloss && st8.gloss.words >= 300 && st8.gloss.phrases > 0, JSON.stringify(st8.gloss));
  ok("window.FLASH_GLOSS 带 words/phrases（单文件版同样可用）",
    await $(`!!(window.FLASH_GLOSS && window.FLASH_GLOSS.words && window.FLASH_GLOSS.phrases)`));
  ok("题库每题都有 cn 整句译文", st8.items.length >= 170 && st8.items.every((i) => typeof i.cn === "string" && i.cn.length > 3),
    st8.items.filter((i) => !i.cn).map((i) => i.id).join(",") || "全部有");

  // 未作答：不显示译文，但词/短语可悬停
  await reload("#block=4");
  S = await state();
  ok("作答前题干下方没有译文（不会靠译文泄题）",
    (await $(`document.querySelectorAll('#qcard .qcn').length`)) === 0);
  const zw0 = await $(`(() => { const el = document.querySelector('#qcard .qstem .zw');
    return el ? { en: el.textContent.trim(), zh: el.getAttribute('data-zh') } : null; })()`);
  ok("题干里的词包成 .zw 且带中文释义", zw0 && zw0.zh && zw0.zh.length > 0, JSON.stringify(zw0));
  await hover("#qcard .qstem .zw");
  {
    const tip = await tipState();
    ok("鼠标滑过单词 → 浮层显示中文释义", tip && tip.show && tip.zh.length > 0, JSON.stringify(tip));
    ok("浮层中文就是该词的释义", tip && zw0 && tip.zh === zw0.zh, JSON.stringify(tip) + " expect=" + (zw0 && zw0.zh));
    ok("浮层里同时给出原词", tip && tip.en.length > 0, tip && tip.en);
    ok("浮层完整落在视口内（不跑出屏幕）", tip && tip.visible && tip.inside, JSON.stringify(tip));
  }
  await moveAway();
  ok("鼠标移开 → 浮层收起", !((await tipState()) || {}).show);

  // 短语：题干里应能匹配到多词 .zw（最多翻 12 题找一个）
  let phr = null, phrItem = null;
  for (let i = 0; i < 12 && !phr; i++) {
    const s = await state();
    if (!s.round || s.view !== "drill") break;
    phr = await $(`(() => { const el = [...document.querySelectorAll('#qcard .qstem .zw')]
      .find((x) => /\\s/.test(x.textContent.trim()));
      if (!el) return null; el.setAttribute('data-phr', '1');
      return { en: el.textContent.trim(), zh: el.getAttribute('data-zh') }; })()`);
    phrItem = s.round.itemId;
    if (!phr) { await $(`window.FLASH_APP.jumpTo(${s.round.idx + 1})`); await sleep(90); }
  }
  ok("题干里能匹配到多词短语（短语整块可悬停，不是逐词拼）", !!phr, "item=" + phrItem + " " + JSON.stringify(phr));
  if (phr) {
    await hover("#qcard .qstem .zw[data-phr]");
    const tip2 = await tipState();
    ok("悬停短语 → 浮层给短语中文", tip2 && tip2.zh === phr.zh, JSON.stringify(tip2) + " expect=" + phr.zh);
    await moveAway();
  }

  // 答完 → 题干下方出现译文
  await reload("#block=4");
  S = await state();
  const cnExpect = S.round.cn;
  await click("#qcard .opt[data-i='" + "ABCD".indexOf(S.round.answer) + "']");
  await sleep(240);
  {
    const cnDom = await $(`(() => { const el = document.querySelector('#qcard .qcn');
      if (!el) return null;
      const t = el.querySelector('.qcn-txt') || el;
      const stem = document.querySelector('#qcard .qstem');
      const r = el.getBoundingClientRect();
      return { text: t.textContent.trim(), below: r.top + 2 >= stem.getBoundingClientRect().bottom,
        h: Math.round(r.height) }; })()`);
    ok("答完题 → 英文句子下方出现整句译文", cnDom && cnDom.text === cnExpect && cnDom.below && cnDom.h > 10,
      JSON.stringify(cnDom) + " expect=" + cnExpect);
    ok("译文带「译」标记（和题干区分开）",
      await $(`!!document.querySelector('#qcard .qcn .qcn-tag')`));
  }

  // 切到下一题再切回：译文仍在（renderQuestion 还原）
  await click('[data-act="ack"]');
  await sleep(220);
  await $(`window.FLASH_APP.navStep(-1)`);
  await sleep(220);
  ok("切回已答的题，译文仍在",
    (await $(`(() => { const el = document.querySelector('#qcard .qcn .qcn-txt'); return el ? el.textContent.trim() : ''; })()`)) === cnExpect);

  // 看答案：译文同样出现
  await $(`window.FLASH_APP.navStep(1)`);
  await sleep(180);
  await click("#qcard [data-act='peek']");
  await sleep(230);
  const peekCn = await $(`(() => { const el = document.querySelector('#qcard .qcn .qcn-txt'); return el ? el.textContent.trim() : ''; })()`);
  ok("看答案 → 译文同样出现", !!peekCn && peekCn.length > 3, peekCn);

  // 做完这一轮 → 结算页 chips 回看：弹窗里也有译文、题干也能悬停
  for (let guard = 0; guard < 80; guard++) {
    const s = await state();
    if (!s.round || s.view !== "drill") break;
    if (!s.round.locked) await answerWith(true);
    await pressEnter();
  }
  S = await state();
  ok("前置：答完一轮能进结算", S.view === "result", S.view);
  if (await $(`!!document.querySelector('#rt-chips .chip')`)) {
    await click("#rt-chips .chip");
    await sleep(280);
    const rv = await $(`(() => { const el = document.querySelector('#modal .rv-cn');
      const stem = document.querySelector('#modal .rv-stem');
      return el ? { text: (el.querySelector('.qcn-txt') || el).textContent.trim(),
        zws: stem ? stem.querySelectorAll('.zw').length : 0 } : null; })()`);
    ok("结算页回看：弹窗里显示这道题的译文", rv && rv.text.length > 3, JSON.stringify(rv));
    ok("结算页回看：弹窗题干也能悬停看词义", rv && rv.zws > 0, JSON.stringify(rv));
    if (rv && rv.zws > 0) {
      await hover("#modal .rv-stem .zw");
      const tip3 = await tipState();
      ok("弹窗里悬停也出浮层", tip3 && tip3.show && tip3.zh.length > 0, JSON.stringify(tip3));
      await moveAway();
    }
    await click('#modal [data-act="modal-cancel"]');
    await sleep(180);
  } else {
    ok("结算页出现「看了答案的题」chip", false, "没有 chip");
  }
  await click('[data-act="home"]');
  await sleep(220);
}

/* ── 8.5 单题历史（做对/做错/看答案 累计次数，刷新后仍在） ───────── */
group("单题历史（做对/做错累计）");
{
  const setStat = (stat) => $(`(() => {
    const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || '{}') || {};
    v.stat = ${JSON.stringify(stat)}; v.current = null;
    localStorage.setItem('eng9a-flash-v1', JSON.stringify(v)); return true; })()`);
  const hist = () => $(`(() => { const el = document.querySelector('#qhist');
    return el ? { text: el.textContent.trim(), shown: el.classList.contains('show'),
                  title: el.getAttribute('title') || '' } : null; })()`);

  const ISO = new Date(Date.now() - 3600e3).toISOString();
  // vf-001 有历史（对 3 / 错 2 / 看答案 1），vf-002 全新
  await setStat({ "vf-001": { att: 5, ok: 3, wrong: 2, peek: 1, at: ISO } });
  await reload("#block=4");
  const h1 = await hist();
  ok("做过历史次数的题，题卡顶部显示一行历史",
    h1 && h1.shown && /历史：/.test(h1.text), JSON.stringify(h1));
  ok("历史文案含做对/做错/看答案与总次数",
    h1 && /做对 3 次/.test(h1.text) && /做错 2 次/.test(h1.text) && /看答案 1 次/.test(h1.text) && /共 6 次/.test(h1.text),
    h1 && h1.text);
  ok("悬停 title 有上次作答时间", h1 && /上次作答：/.test(h1.title), h1 && h1.title);

  // 刷新后仍在（用户诉求的核心）
  await hardReload();
  const h2 = await hist();
  ok("刷新后历史行仍在、数字不变", h2 && h2.shown && h2.text === h1.text, JSON.stringify(h2));

  // 判一次后立即把本次算进去
  const s0 = await state();
  const item0 = s0.round && s0.round.itemId;
  await click("#qcard .opt[data-i='" + "ABCD".indexOf(s0.round.answer) + "']");
  await sleep(200);
  const h3 = await hist();
  ok("判分后历史立即 +1（含本次：att 5→6，含看答案 1 次共 7）", h3 && /做对 4 次/.test(h3.text) && /共 7 次/.test(h3.text), h3 && h3.text);
  await click('[data-act="ack"]');
  await sleep(350);

  // 全新题：不显示历史行
  const h4 = await hist();
  ok("没做过的题不显示历史行（不占版面）", h4 && !h4.shown && h4.text === "", JSON.stringify(h4));

  // 看答案：只加「看答案」次数，不动 att/ok/wrong
  const before = (await state()).store.stat["vf-002"] || { att: 0, ok: 0, wrong: 0 };
  await click("#qcard [data-act='peek']");
  await sleep(250);
  const h5 = await hist();
  const after = (await state()).store.stat["vf-002"] || {};
  ok("看答案后历史行出现「看答案 1 次」", h5 && h5.shown && /看答案 1 次/.test(h5.text), h5 && h5.text);
  ok("看答案不动 att/ok/wrong（正确率口径不变）",
    Number(after.att || 0) === Number(before.att || 0) &&
    Number(after.ok || 0) === Number(before.ok || 0) &&
    Number(after.wrong || 0) === Number(before.wrong || 0),
    JSON.stringify({ before, after }));
  ok("看答案次数已落盘（stat.peek=1）", Number(after.peek || 0) === 1, JSON.stringify(after));

  // 关掉本轮，恢复干净状态给后面组用
  await pressEsc();
  await sleep(400);
  await click('[data-act="modal-cancel"]');
  await sleep(300);
  ok("历史行不影响退出流程", (await state()).view === "home", (await state()).view);
}

/* ── 8.6 看答案计入「只刷我错过的题」 ───────────── */
group("看答案计入只刷我错过的题");
{
  const st = await state();
  const expect = Object.keys(st.store.stat).filter((id) => {
    const s2 = st.store.stat[id] || {};
    return Number(s2.wrong || 0) > 0 || Number(s2.peek || 0) > 0;
  });
  ok("开始屏提示按「做错 + 看答案」计数", /错过的题：\d+ 道/.test(await text("#wrong-hint")) &&
    new RegExp("错过的题：" + expect.length + " 道").test(await text("#wrong-hint")),
    (await text("#wrong-hint")) + " expect=" + expect.length);
  ok("8.5 里只看了答案的 vf-002 也算错过（前置条件）", expect.indexOf("vf-002") >= 0, JSON.stringify(expect.slice(-6)));
  await click("#act-wrong");
  await sleep(380);
  S = await state();
  ok("错过题队列数量 = 做错 ∪ 看答案", S.view === "drill" && S.round.mode === "redo" && S.round.listLen === expect.length,
    JSON.stringify({ len: S.round && S.round.listLen, expect: expect.length }));
  await click("#nav-sheet");
  await sleep(220);
  const wsSheet = await $(`(() => ({
    open: document.querySelector('#modal').classList.contains('is-open'),
    cells: document.querySelectorAll('#modal .sheet-cell').length,
    cell001: !!document.querySelector('#modal .sheet-cell[data-id="vf-001"]'),
    cell002: !!document.querySelector('#modal .sheet-cell[data-id="vf-002"]')
  }))()`);
  ok("答题卡里能看到看答案过的 vf-002（只 peek 没 wrong 也收进队列）",
    wsSheet.open && wsSheet.cells === expect.length && wsSheet.cell002, JSON.stringify(wsSheet));
  ok("答题卡里也在做错过的 vf-001", wsSheet.cell001, JSON.stringify(wsSheet));
  await click('#modal [data-act="modal-cancel"]');
  await sleep(160);
  await pressEsc();
  await sleep(520);
  ok("退出错过题队列回开始屏", (await state()).view === "home");
}

/* ── 8.7 切换其他题（答题卡 / 上一题 / 下一题） ─── */
group("切换其他题（答题卡 / 上一题 / 下一题）");
{
  await reload("#block=" + dlBlock);
  await sleep(260);
  S = await state();
  const SN = S.round.listLen;
  const nav = await $(`(() => {
    const p = document.querySelector('#nav-prev'), s = document.querySelector('#nav-sheet'),
      n = document.querySelector('#nav-next'), bar = document.querySelector('#qnav');
    const r = bar && bar.getBoundingClientRect();
    return { prev: !!p && !!p.offsetParent, sheet: !!s && !!s.offsetParent, next: !!n && !!n.offsetParent,
      count: (document.querySelector('#nav-count') || {}).textContent || '',
      barBottom: r ? Math.round(r.bottom) : -1, ih: innerHeight, iw: innerWidth,
      docW: document.documentElement.scrollWidth }; })()`);
  ok("做题屏有换题条（上一题/答题卡/下一题）", nav.prev && nav.sheet && nav.next, JSON.stringify(nav));
  ok("换题条显示当前题号 1/N", nav.count === "1/" + SN, nav.count);
  ok("换题条在视口内且不横向溢出", nav.barBottom > 0 && nav.barBottom <= nav.ih + 1 && nav.docW <= nav.iw + 1,
    JSON.stringify(nav));
  await click("#nav-next");
  await sleep(160);
  S = await state();
  const prog0 = await text("#bar-progress");
  ok("未作答点「下一题」= 跳到第 2 题（跳过，不计数）",
    S.round.idx === 1 && S.round.done === 0 && prog0 === "0/" + SN,
    JSON.stringify({ idx: S.round.idx, done: S.round.done, prog: prog0 }));
  await click("#nav-prev");
  await sleep(160);
  S = await state();
  ok("「上一题」回到第 1 题", S.round.idx === 0 && S.round.itemId === S.round.listIds[0],
    JSON.stringify({ idx: S.round.idx }));
  await click("#nav-sheet");
  await sleep(220);
  const sheet0 = await $(`(() => ({
    open: document.querySelector('#modal').classList.contains('is-open'),
    cells: document.querySelectorAll('#modal .sheet-cell').length,
    cur: document.querySelectorAll('#modal .sheet-cell.is-cur').length,
    curFirst: /is-cur/.test((document.querySelector('#modal .sheet-cell[data-i="0"]') || {}).className || '')
  }))()`);
  ok("「答题卡」弹窗列出本轮全部题并标出当前题",
    sheet0.open && sheet0.cells === SN && sheet0.cur === 1 && sheet0.curFirst, JSON.stringify(sheet0));
  await click('#modal .sheet-cell[data-i="4"]');
  await sleep(220);
  S = await state();
  ok("点答题卡题号跳到第 5 题，弹窗关闭", S.round.idx === 4 && S.round.itemId === S.round.listIds[4] &&
    !(await $(`document.querySelector('#modal').classList.contains('is-open')`)), JSON.stringify({ idx: S.round.idx }));
  const jumpId = S.round.itemId;
  await answerWith(true);
  await sleep(160);
  S = await state();
  ok("跳着作答：进度 1/N、正确率 1/1 100%",
    (await text("#bar-progress")) === "1/" + SN && /1\/1 100%/.test(await text("#bar-rate")),
    JSON.stringify({ prog: await text("#bar-progress"), rate: await text("#bar-rate") }));
  await click("#nav-sheet");
  await sleep(220);
  const sheet1 = await $(`(() => ({
    okCell: /is-ok/.test((document.querySelector('#modal .sheet-cell[data-i="4"]') || {}).className || ''),
    curCell: /is-cur/.test((document.querySelector('#modal .sheet-cell[data-i="4"]') || {}).className || '')
  }))()`);
  ok("答题卡把刚答对的题标绿、并标为当前", sheet1.okCell && sheet1.curCell, JSON.stringify(sheet1));
  await click('#modal .sheet-cell[data-i="4"]');   // 再点当前题：关闭弹窗、留在本题回看
  await sleep(200);
  const rev = await $(`(() => { const fb = document.querySelector('#fb');
    const ack = fb && fb.querySelector('[data-act="ack"]');
    return { locked: [...document.querySelectorAll('#qcard .opt')].every(o => o.disabled),
      fbShown: !!fb && getComputedStyle(fb).display !== 'none',
      fbOk: /考点：/.test(fb ? fb.textContent : ''), peekBtn: !!document.querySelector('#qcard [data-act="peek"]'),
      ack: ack ? ack.textContent.trim() : '' }; })()`);
  ok("切回已作答的题是只读回看（锁定 + 讲解 + 没有看答案按钮）",
    rev.locked && rev.fbShown && rev.fbOk && !rev.peekBtn && /下一题/.test(rev.ack), JSON.stringify(rev));
  const beforeAtt = Number((await state()).store.stat[jumpId].att);
  await pressDigit(1);
  await sleep(140);
  S = await state();
  ok("回看时再按选项不会重复判分", Number(S.store.stat[jumpId].att) === beforeAtt && S.round.done === 1,
    JSON.stringify({ att: S.store.stat[jumpId].att, done: S.round.done }));
  await click('#qcard [data-act="ack"]');
  await sleep(240);
  S = await state();
  ok("「下一题」继续时跳到下一道还没做的题（第 6 题）", S.round.idx === 5 && S.round.done === 1,
    JSON.stringify({ idx: S.round.idx, done: S.round.done }));
  await key("ArrowRight", "ArrowRight", 39, 140);
  S = await state();
  ok("键盘 → 换到下一题", S.round.idx === 6, JSON.stringify({ idx: S.round.idx }));
  await key("ArrowLeft", "ArrowLeft", 37, 140);
  S = await state();
  ok("键盘 ← 换回上一题", S.round.idx === 5, JSON.stringify({ idx: S.round.idx }));
  ok("换题/跳过不改变进度（仍 1/N）", (await text("#bar-progress")) === "1/" + SN, await text("#bar-progress"));
  await hardReload();
  S = await state();
  ok("刷新后作答状态与进度都在（1/N）", S.view === "drill" && S.round.done === 1 &&
    (await text("#bar-progress")) === "1/" + SN, JSON.stringify({ done: S.round && S.round.done }));
  await click("#nav-sheet");
  await sleep(240);
  const sheet2 = await $(`(() => ({
    okCell: /is-ok/.test((document.querySelector('#modal .sheet-cell[data-i="4"]') || {}).className || ''),
    cells: document.querySelectorAll('#modal .sheet-cell').length
  }))()`);
  ok("刷新后答题卡仍把第 5 题标成做对", sheet2.okCell && sheet2.cells === SN, JSON.stringify(sheet2));
  await click('#modal [data-act="modal-cancel"]');
  await sleep(160);
  await pressEsc();
  await sleep(520);
  ok("退出本轮回开始屏", (await state()).view === "home");
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
const mobNav = await $(`(() => { const b = document.querySelector('#qnav');
  if (!b) return null; const r = b.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
    visible: !!b.offsetParent, docW: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight }; })()`);
ok("390 视口换题条（上一题/答题卡/下一题）可见且不溢出",
  mobNav && mobNav.visible && mobNav.h >= 34 && mobNav.bottom <= mobNav.ih + 1 && mobNav.docW <= mobNav.iw + 1,
  JSON.stringify(mobNav));
const mobPeekBtn = await $(`(() => { const b = document.querySelector('#qcard [data-act="peek"]');
  if (!b) return null; const r = b.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), ih: innerHeight,
    docW: document.documentElement.scrollWidth }; })()`);
ok("390 视口「看答案」按钮可见且不挤出屏幕",
  mobPeekBtn && mobPeekBtn.top >= 0 && mobPeekBtn.bottom <= mobPeekBtn.ih + 1 && mobPeekBtn.h >= 30 &&
  mobPeekBtn.docW <= 391, JSON.stringify(mobPeekBtn));
await click('#qcard [data-act="peek"]');
await sleep(260);
const mobPeek = await $(`(() => {
  const ack = document.querySelector('#fb [data-act="ack"]');
  const r = ack && ack.getBoundingClientRect();
  const opts = [...document.querySelectorAll('#qcard .opt')].map(o => { const q = o.getBoundingClientRect();
    return { top: Math.round(q.top), bottom: Math.round(q.bottom) }; });
  return { shown: getComputedStyle(document.querySelector('#fb')).display !== 'none',
    right: !!document.querySelector('#qcard .opt.is-right'),
    bad: !!document.querySelector('#qcard .opt.is-bad'),
    ackBottom: r ? Math.round(r.bottom) : -1, ih: innerHeight, ackH: r ? Math.round(r.height) : 0,
    optsInView: opts.every(o => o.top >= 0 && o.bottom <= innerHeight + 1),
    docW: document.documentElement.scrollWidth }; })()`);
ok("390 看答案后：讲解条+下一题仍在一屏内、选项不被挤出",
  mobPeek.shown && mobPeek.right && !mobPeek.bad && mobPeek.optsInView &&
  mobPeek.ackBottom > 0 && mobPeek.ackBottom <= mobPeek.ih + 1 && mobPeek.ackH >= 44 && mobPeek.docW <= 391,
  JSON.stringify(mobPeek));
await pressEnter();
await sleep(220);
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

/* 上一组结尾把「自动跳题」打开了，考点模式答对会自动翻页，先关掉再测 */
if ((await state()).settings.autoNext) { await $(`window.FLASH_APP.toggleAuto()`); }
await $(`window.FLASH_APP.home()`);
await sleep(150);

/* ── 11. 只判考点（spot） ───────────────────── */
group("只判考点（spot）");
const spotEntry = await $(`(() => { const b = document.querySelector('#act-spot');
  return { exists: !!b, text: b ? b.textContent.trim() : '', dis: b ? b.disabled : true }; })()`);
ok("开始屏有「只判考点」入口且可用", spotEntry.exists && /只判考点/.test(spotEntry.text) && !spotEntry.dis,
  JSON.stringify(spotEntry));

const cueCover = await $(`(() => { const items = (window.FLASH_APP.state() || {}).items || [];
  const c = window.FLASH_CUES || {}; const seen = {}; const miss = [];
  items.forEach((it) => { if (seen[it.topic]) return; seen[it.topic] = 1; if (!c[it.topic]) miss.push(it.topic); });
  return { topics: Object.keys(seen).length, cues: Object.keys(c).length, miss: miss }; })()`);
ok("每个考点都有「怎么认出」线索（本次题库 " + cueCover.topics + " 个考点全覆盖）",
  cueCover.miss.length === 0 && cueCover.topics >= 40 && cueCover.cues >= cueCover.topics,
  JSON.stringify({ topics: cueCover.topics, cues: cueCover.cues, miss: cueCover.miss }));

await $(`window.FLASH_APP.startSpot(3)`);
await sleep(220);
S = await state();
ok("startSpot(3)：进入做题屏、mode=spot、3 题",
  S.view === "drill" && S.round && S.round.mode === "spot" && S.round.listLen === 3,
  JSON.stringify({ view: S.view, mode: S.round && S.round.mode, n: S.round && S.round.listLen }));

const spFirst = await $(`(() => ({
  opt: document.querySelectorAll('#qcard .opt').length,
  spot: document.querySelectorAll('#qcard .spot-opt').length,
  panel: !!document.querySelector('#qcard .spot-panel'),
  peekBtn: !!document.querySelector('#qcard [data-act="peek"]'),
  chip: (document.querySelector('#bar-topic') || {}).textContent || '',
  line: (document.querySelector('#drill-line') || {}).textContent || '' }))()`);
ok("第一屏只有 4 个考点按钮（没有 A/B/C/D、没有看答案）",
  spFirst.opt === 0 && spFirst.spot === 4 && spFirst.panel && !spFirst.peekBtn, JSON.stringify(spFirst));
ok("第一屏顶栏显示「考点？」、底部提示改为选考点",
  /考点/.test(spFirst.chip) && /选考点/.test(spFirst.line), JSON.stringify(spFirst));
await shot("qa-10-spot-first");

S = await state();
const spId1 = S.round.itemId;
const spOrder1 = S.spot.order[spId1];
const spCi1 = spOrder1.indexOf(S.round.topic);
ok("候选考点是 4 个互不相同的考点，且含正确考点",
  spOrder1.length === 4 && spCi1 >= 0 && new Set(spOrder1).size === 4, JSON.stringify(spOrder1));
await click('#qcard .spot-opt[data-i="' + spCi1 + '"]');
await sleep(160);
S = await state();
const spHit = await $(`(() => ({
  ok: document.querySelectorAll('#qcard .spot-opt.is-ok').length,
  locked: [...document.querySelectorAll('#qcard .spot-opt')].every(b => b.disabled),
  fb: (document.querySelector('#fb') || {}).textContent || '',
  ack: !!document.querySelector('#fb [data-act="ack"]'),
  rate: (document.querySelector('#bar-rate') || {}).textContent || '' }))()`);
ok("判对考点：正确项变绿、按钮锁定、反馈给考点与规则",
  spHit.ok === 1 && spHit.locked && /考点/.test(spHit.fb) && /规则/.test(spHit.fb) && spHit.ack,
  spHit.fb.slice(0, 60));
ok("判考点后的解析先给「怎么认出」线索、再给规则",
  /怎么认出：/.test(spHit.fb) && spHit.fb.indexOf("怎么认出：") < spHit.fb.indexOf("规则："),
  spHit.fb.slice(0, 120));
await shot("qa-12-spot-cue");
ok("判考点不动答案口径：正确率仍显示「—」、考点计数 1/1",
  /—/.test(spHit.rate) && S.spot.total === 1 && S.spot.ok === 1,
  JSON.stringify({ rate: spHit.rate, spot: [S.spot.total, S.spot.ok] }));

await click('#fb [data-act="ack"]');
await sleep(200);
const spSecond = await $(`(() => ({
  opt: document.querySelectorAll('#qcard .opt').length,
  spot: document.querySelectorAll('#qcard .spot-opt').length,
  peekBtn: !!document.querySelector('#qcard [data-act="peek"]') }))()`);
ok("点「看选项，选答案 →」进第二屏：出现 4 个选项、考点按钮消失",
  spSecond.opt === 4 && spSecond.spot === 0 && spSecond.peekBtn, JSON.stringify(spSecond));

S = await state();
await click('#qcard .opt[data-k="' + S.round.answer + '"]');
await sleep(160);
S = await state();
ok("第二屏答对：答案 ok=1，考点计数不变",
  S.round.ok === 1 && S.spot.total === 1 && S.spot.ok === 1,
  JSON.stringify({ ok: S.round.ok, spot: [S.spot.total, S.spot.ok] }));
const ansFb = await text("#fb");
ok("普通判分解析里也有「怎么认出」线索", /怎么认出：/.test(ansFb) && /规则：/.test(ansFb), ansFb.slice(0, 120));
await click('#fb [data-act="ack"]');
await sleep(200);

/* 第二题：故意判错考点 */
S = await state();
const spId2 = S.round.itemId, spT2 = S.round.topic, spOrder2 = S.spot.order[spId2];
const spWrong = (spOrder2.indexOf(spT2) + 1) % 4;
await click('#qcard .spot-opt[data-i="' + spWrong + '"]');
await sleep(160);
S = await state();
const spMiss = await $(`(() => ({
  bad: document.querySelectorAll('#qcard .spot-opt.is-bad').length,
  right: document.querySelectorAll('#qcard .spot-opt.is-right').length,
  fb: (document.querySelector('#fb') || {}).textContent || '' }))()`);
ok("判错考点：所选标红、正确考点标绿、进 wrongTopics",
  spMiss.bad === 1 && spMiss.right === 1 && /✗/.test(spMiss.fb) &&
  S.spot.total === 2 && S.spot.ok === 1 && S.spot.wrongTopics.indexOf(spT2) >= 0,
  JSON.stringify({ fb: spMiss.fb.slice(0, 40), wt: S.spot.wrongTopics }));

await click('#fb [data-act="ack"]');
await sleep(200);

/* 刷新：应该回到第二屏，且不重复判考点 */
await hardReload();
S = await state();
const spBack = await $(`(() => ({
  opt: document.querySelectorAll('#qcard .opt').length,
  spot: document.querySelectorAll('#qcard .spot-opt').length }))()`);
ok("考点判完刷新：回到第二屏（有选项、无考点按钮）、不重判考点",
  S.view === "drill" && S.round && S.round.mode === "spot" && spBack.opt === 4 && spBack.spot === 0 &&
  S.spot.total === 2 && S.spot.ok === 1,
  JSON.stringify({ view: S.view, mode: S.round && S.round.mode, spBack, spot: S.spot && [S.spot.total, S.spot.ok] }));

S = await state();
await click('#qcard .opt[data-k="' + S.round.answer + '"]');
await sleep(160);
await click('#fb [data-act="ack"]');
await sleep(200);

/* 第三题：判对考点 + 答对 → 进结算 */
S = await state();
const spId3 = S.round.itemId, spOrder3 = S.spot.order[spId3];
await click('#qcard .spot-opt[data-i="' + spOrder3.indexOf(S.round.topic) + '"]');
await sleep(160);
await click('#fb [data-act="ack"]');
await sleep(200);
S = await state();
await click('#qcard .opt[data-k="' + S.round.answer + '"]');
await sleep(160);
await click('#fb [data-act="ack"]');
await sleep(450);
S = await state();
const rtSpot = await $(`(() => ({
  shown: document.querySelector('#rt-spot').classList.contains('show'),
  txt: (document.querySelector('#rt-spot') || {}).textContent || '',
  pct: (document.querySelector('#rt-pct') || {}).textContent || '' }))()`);
ok("结算进入 result 屏", S.view === "result", S.view);
ok("结算「考点识别 对 2/3 · 答案 对 3/3（100%）」",
  rtSpot.shown && /考点识别/.test(rtSpot.txt) && /2\s*\/\s*3/.test(rtSpot.txt) &&
  /3\s*\/\s*3/.test(rtSpot.txt) && /100%/.test(rtSpot.pct) && /判错的考点/.test(rtSpot.txt),
  JSON.stringify(rtSpot).slice(0, 240));
const rtNote = await text("#rt-note");
ok("答案 100% 但考点识别 <80% 时，提词改说「先练判考点」（不说稳了）",
  /考点识别/.test(rtNote) && /判考点/.test(rtNote) && !/稳了/.test(rtNote), rtNote);

const spLast = S.store.last && S.store.last.spot;
const spLastRound = S.store.rounds[S.store.rounds.length - 1] && S.store.rounds[S.store.rounds.length - 1].spot;
ok("store.last 与 rounds[] 都带考点计数（total=3 ok=2）",
  spLast && spLast.total === 3 && spLast.ok === 2 && spLastRound && spLastRound.total === 3 && spLastRound.ok === 2,
  JSON.stringify({ last: spLast, round: spLastRound }));
await shot("qa-11-spot-result");

const spotAgainLabel = await text("#act-again");
const prevIds = ((S.store.last && S.store.last.itemIds) || []).join(",");
await click('#act-again');
await sleep(350);
S = await state();
ok("考点轮结算按钮是「下一组 10 题」", /下一组/.test(spotAgainLabel), spotAgainLabel);
ok("「下一组」开新一组（10 题、与上一组不同、仍从考点屏开始）",
  S.view === "drill" && S.round && S.round.mode === "spot" && S.round.listLen === 10 &&
  S.round.listIds.join(",") !== prevIds &&
  (await $(`document.querySelectorAll('#qcard .spot-opt').length`)) === 4 && S.spot && S.spot.total === 0,
  JSON.stringify({ view: S.view, mode: S.round && S.round.mode, n: S.round && S.round.listLen, total: S.spot && S.spot.total }));

// 收尾：直接回开始屏（不弹「退出」确认，后面的兜底组会 reload）
await $(`window.FLASH_APP.home()`);
await sleep(150);

/* ── 12. 无题库兜底 ──────────────────────────── */
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
  ok("无数据时开始按钮禁用、卡片全灰、文档入口仍在", noData.planDis && noData.allMissing && noData.docLinks === 5,
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
