// 交互自检：用 CDP 驱动无头 Chrome，跑断言（不只是截图）
// 用法：node qa.mjs <url> [outDir]
// 退出码：0 全过；1 有失败（并打印失败项）
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3] || ".qa";
const PORT = 9333;
const PROFILE = join(process.env.TEMP || ".", "chrome-qa-profile");
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
async function key(k, code, vk) {
  for (const type of ["rawKeyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
  await sleep(120);
}
const shot = async (name, w = 1440) => {
  const metrics = await send("Page.getLayoutMetrics");
  const css = metrics.cssContentSize || metrics.contentSize;
  const res = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: Math.min(css.height, 9000), scale: 1 },
  });
  const p = join(outDir, name + ".png");
  writeFileSync(p, Buffer.from(res.data, "base64"));
  return p;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Log.enable");
await send("Page.navigate", { url });
await sleep(1200);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1500);

// 自动接受 confirm
setInterval(async () => {
  const dlg = events.filter((e) => e.method === "Page.javascriptDialogOpening");
  if (dlg.length) {
    events.length = 0;
    try { await send("Page.handleJavaScriptDialog", { accept: true }); } catch {}
  }
}, 400);

const checks = [];
function ok(name, cond, detail) {
  checks.push({ name, pass: !!cond, detail: detail === undefined ? "" : String(detail).slice(0, 160) });
}
function group(t) { checks.push({ group: t }); }

/* ── 1. 初始状态 ─────────────────────────────── */
group("初始状态");
ok("练习视图是默认视图", await $(`document.querySelector('#view-practice').classList.contains('is-active')`));
ok("一屏只有一张题卡", (await $(`document.querySelectorAll('#view-practice .qcard').length`)) === 1);
ok("题卡按卷面顺序从 U1-1 开始", (await $(`document.querySelector('#view-practice .qcard').dataset.id`)) === "U1-1");
ok("底部条存在且显示进度", /1\s*\/\s*27/.test((await $(`document.querySelector('.bottombar .progress')?.textContent`)) || ""));
ok("未作答时不显示解析与答案", !(await $(`document.querySelector('#view-practice .qcard .verify')?.textContent`)));
ok("宽屏答题卡常驻", (await $(`(() => { const a = document.querySelector('.sidecards');
  return !!a && getComputedStyle(a).display !== 'none' && a.querySelectorAll('.cell').length > 0; })()`)));
ok("顶栏有答题卡/原卷/只看填空", (await $(`(() => { const b = document.querySelector('#view-practice .bar');
  return !!b.querySelector('[data-act="cards"]') && !!b.querySelector('a[href*="题库"]') && !!b.querySelector('[data-act="only-fills"]'); })()`)));
ok("页面没有错误条", !(await $(`document.getElementById('errbar').classList.contains('show')`)));

/* ── 2. 先选后交（选择题） ───────────────────── */
group("先选后交");
await $(`document.querySelector('[data-act="cards"]').click()`);
await sleep(200);
ok("答题卡打开", await $(`document.querySelector('#cardsheet').classList.contains('is-open')`));
ok("答题卡按大题分组", (await $(`document.querySelectorAll('#cardsheet .sheet-group').length`)) >= 1);
await $(`document.querySelector('#cardsheet .cell[data-id="U1-5"]').click()`);
await sleep(250);
ok("点答题卡跳到该题", (await $(`document.querySelector('#view-practice .qcard').dataset.id`)) === "U1-5");
ok("跳题后答题卡收起", !(await $(`document.querySelector('#cardsheet').classList.contains('is-open')`)));
await key("b", "KeyB", 66);
ok("按字母只选中不判分", (await $(`document.querySelector('#view-practice .qcard').dataset.state`)) === "picked");
ok("选中后仍无解析", !(await $(`document.querySelector('#view-practice .qcard .verify')?.textContent`)));
ok("未提交不显示原卷作答", !(await $(`document.querySelector('#view-practice .qcard .orig')`)));
await key("Enter", "Enter", 13);
ok("回车提交后判分", ["right", "wrong"].includes(await $(`document.querySelector('#view-practice .qcard').dataset.state`)));
ok("提交后展开四段式解析", /考点/.test((await $(`document.querySelector('#view-practice .qcard .verify')?.textContent`)) || ""));
ok("提交后显示原卷作答", /原卷/.test((await $(`document.querySelector('#view-practice .qcard .orig')?.textContent`)) || ""));
ok("提交后记录一次作答", (await $(`JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-5'].att`)) === 1);
ok("提交后 atList 有一条", (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).atList['U1-5']||[]).length`)) === 1);

/* ── 3. 回车进下一题 ─────────────────────────── */
group("节奏");
await key("Enter", "Enter", 13);
ok("已判分后回车进下一题", (await $(`document.querySelector('#view-practice .qcard').dataset.id`)) !== "U1-5");
await key("ArrowLeft", "ArrowLeft", 37);
ok("左方向键回上一题", (await $(`document.querySelector('#view-practice .qcard').dataset.id`)) === "U1-5");

/* ── 4. 重做（追加不覆盖） ───────────────────── */
group("重做");
await $(`document.querySelector('[data-act="redo"]').click()`);
await sleep(200);
ok("重做后回到未判状态", (await $(`document.querySelector('#view-practice .qcard').dataset.state`)) === "unanswered");
await key("a", "KeyA", 65);
await key("Enter", "Enter", 13);
ok("重做再答一次 att=2", (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-5']||{}).att`)) === 2);
const atLen = await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).atList['U1-5']||[]).length`);
ok("atList 追加到 2 条", atLen === 2, "atList=" + atLen);
ok("判分后错选项标红", (await $(`document.querySelector('#view-practice .opt[data-k="A"]').dataset.state`)) === "wrong");
ok("判分后正确项标绿", (await $(`document.querySelector('#view-practice .opt[data-k="B"]').dataset.state`)) === "right");

/* ── 4b. 刷新后记录还在 ─────────────────────── */
group("刷新后记录还在");
await send("Page.reload", { ignoreCache: false });
await sleep(1300);
await $(`document.querySelector('[data-act="cards"]').click()`);
await sleep(250);
ok("刷新后答题卡仍显示已判", ["right", "wrong"].includes(await $(`document.querySelector('#cardsheet .cell[data-id="U1-5"]').dataset.state`)));
await $(`document.querySelector('#cardsheet [data-act="close-cards"]').click()`);
await sleep(150);

/* ── 5. 填空题按空输入 ───────────────────────── */
group("填空");
await $(`document.querySelector('[data-act="cards"]').click()`);
await sleep(150);
await $(`document.querySelector('#cardsheet .cell[data-id="U1-17"]').click()`);
await sleep(250);
ok("多空题渲染多个输入框", (await $(`document.querySelectorAll('#view-practice .qcard .field').length`)) === 3);
const u1_17 = await $(`(() => { const u = window.QUIZ_DATA.units.find(x => x.unit === 'U1');
  const k = u.key.items['17']; return String(k.answer || '').split(/\\s*\\/\\s*/); })()`);
await $(`(() => { const parts = ${JSON.stringify(u1_17)}; const fs = [...document.querySelectorAll('#view-practice .qcard .field')];
  fs.forEach((f, i) => { f.value = parts[i] || ''; f.dispatchEvent(new Event('input', { bubbles: true })); }); return true; })()`);
await key("Enter", "Enter", 13);
ok("整题判分（全对才算对）", (await $(`document.querySelector('#view-practice .qcard').dataset.state`)) === "right");
ok("提交后输入框回填原答案", (await $(`[...document.querySelectorAll('#view-practice .qcard .field')].map(f => f.value).join('|')`)) === (u1_17 || []).join("|"));

/* ── 6. 模拟考：交卷前不剧透 ─────────────────── */
group("模拟考");
const attBefore = (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-5']||{}).att`)) || 0;
await $(`document.querySelector('[data-mode="exam"]').click()`);
await sleep(300);
ok("切到模拟考后没有解析", !(await $(`document.querySelector('#view-practice .qcard .verify')?.textContent`)));
ok("模拟考显示交卷按钮", !!(await $(`document.querySelector('[data-act="finish"]')`)));
ok("模拟考也能开答题卡", !!(await $(`document.querySelector('[data-act="cards"]')`)));
/* 填空：只填不提交 */
await $(`(() => { const f = document.querySelector('#view-practice .qcard .field'); if (!f) return false;
  f.value = 'x'; f.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
await $(`document.querySelector('[data-act="cards"]').click()`);
await sleep(200);
await $(`document.querySelector('#cardsheet .cell[data-id="U1-5"]').click()`);
await sleep(250);
await key("1", "Digit1", 49);
ok("模拟考选中后仍不判分", (await $(`document.querySelector('#view-practice .qcard').dataset.state`)) === "picked");
ok("模拟考选中项只有选中态", (await $(`document.querySelector('#view-practice .opt[data-k="A"]').dataset.state`)) === "picked");
ok("模拟考不剧透转写备注", !/手写字母/.test((await $(`document.querySelector('#view-practice .qcard')?.textContent`)) || ""));
const attAfterPick = (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-5']||{}).att`)) || 0;
ok("模拟考不写记录", attAfterPick === attBefore, "before=" + attBefore + " after=" + attAfterPick);
await $(`document.querySelector('#view-practice .qtools [data-act="mark"]').click()`);
ok("可标记不确定", (await $(`document.querySelector('#view-practice .qcard').dataset.marked`)) === "1");
await $(`document.querySelector('[data-act="finish"]').click()`);
await sleep(600);
ok("交卷出现结算页", await $(`!!document.querySelector('#view-practice .settle')`));
ok("结算页有对/总", /\d+\s*\/\s*\d+/.test((await $(`document.querySelector('.settle .settle-score')?.textContent`)) || ""));
ok("结算页有错题号可点", (await $(`document.querySelectorAll('.settle .settle-wrong .chip').length`)) >= 1);
ok("交卷后写入记录（填空）", (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-1']||{}).att`)) >= 1);
ok("交卷后写入记录（选择）", (await $(`(JSON.parse(localStorage.getItem('eng9a-practice-v1')).stat['U1-5']||{}).att`)) === attBefore + 1);
const round = await $(`(() => { const s = JSON.parse(localStorage.getItem('eng9a-practice-v1'));
  return Array.isArray(s.rounds) && s.rounds.length ? s.rounds[s.rounds.length - 1] : null; })()`);
ok("交卷写入本轮 rounds", !!round && round.mode === "exam" && round.total === 27 && round.ok >= 0, JSON.stringify(round));
const scoreTxt = (await $(`document.querySelector('.settle .settle-score')?.textContent`)) || "";
const scoreMatch = /(\d+)\s*\/\s*(\d+)/.exec(scoreTxt);
ok("结算页与本轮 rounds 口径一致", !!scoreMatch && +scoreMatch[1] === round.ok && +scoreMatch[2] === round.total, scoreTxt + " vs " + round.ok + "/" + round.total);
await key("Escape", "Escape", 27);
ok("Esc 收起结算页", !(await $(`!!document.querySelector('#view-practice .settle')`)));
ok("收起后回到题卡", !!(await $(`document.querySelector('#view-practice .qcard')`)));

/* ── 7. 复盘 ─────────────────────────────────── */
group("复盘");
await $(`document.querySelector('.tab[data-view="review"]').click()`);
await sleep(400);
ok("复盘视图打开", await $(`document.querySelector('#view-review').classList.contains('is-active')`));
ok("错题卡片存在", (await $(`document.querySelectorAll('#view-review .mcard').length`)) > 0);
await $(`document.querySelector('#view-review [data-rtab="paper"]').click()`);
await sleep(300);
ok("原卷批改行存在", (await $(`document.querySelectorAll('#view-review .prow').length`)) > 0);
ok("原卷批改有判定标记", (await $(`document.querySelectorAll('#view-review .prow .verdict').length`)) > 0);
await $(`document.querySelector('#view-review [data-rtab="wrong"]').click()`);
await sleep(300);
const gotoId = await $(`document.querySelector('#view-review [data-goto]').dataset.goto`);
await $(`document.querySelector('#view-review [data-goto]').click()`);
await sleep(400);
ok("复盘「去重做」跳到该题", (await $(`document.querySelector('#view-practice .qcard').dataset.id`)) === gotoId, gotoId);

/* ── 8. 手机布局 ─────────────────────────────── */
group("手机 390px");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await $(`document.querySelector('.tab[data-view="practice"]').click()`);
await sleep(300);
await $(`(() => { const b = document.querySelector('[data-act="again"]'); if (b) { b.click(); return true; } return false; })()`);
await sleep(400);
ok("无横向滚动", (await $(`document.documentElement.scrollWidth <= window.innerWidth + 1`)));
ok("手机隐藏宽屏答题卡侧栏", (await $(`(() => { const a = document.querySelector('.sidecards');
  return !a || getComputedStyle(a).display === 'none'; })()`)));
const bar = await $(`(() => { const b=document.querySelector('.bottombar'); if(!b) return null;
  const r=b.getBoundingClientRect(); return {bottom:Math.round(r.bottom), vh:innerHeight, fixed:getComputedStyle(b).position}; })()`);
ok("底部条固定在视口内", bar && bar.bottom <= bar.vh + 1, JSON.stringify(bar));
const btn = await $(`(() => { const b=document.querySelector('[data-act="next"]')||document.querySelector('[data-act="submit"]');
  if(!b) return null; const r=b.getBoundingClientRect(); return {h:Math.round(r.height), w:Math.round(r.width), bottom:Math.round(r.bottom), vh:innerHeight}; })()`);
ok("主按钮 ≥44px 且可见", btn && btn.h >= 44 && btn.bottom <= btn.vh + 1, JSON.stringify(btn));
await shot("mobile-practice", 390);
await send("Emulation.clearDeviceMetricsOverride");

/* ── 9. 深链 ─────────────────────────────────── */
group("深链");
const dl = async (hash, expr) => {
  await send("Page.navigate", { url: url + hash });
  await sleep(400);
  await send("Page.reload", { ignoreCache: true });
  await sleep(1000);
  ok("深链 " + hash, await $(expr));
};
await dl("#view=review", `document.querySelector('#view-review').classList.contains('is-active')`);
await dl("#view=mistakes", `document.querySelector('#view-review').classList.contains('is-active') && document.querySelector('#view-review [data-rtab="wrong"]').getAttribute('aria-selected')==='true'`);
const nav = async (hash) => {
  await send("Page.navigate", { url: url + hash });
  await sleep(300);
  await send("Page.reload", { ignoreCache: false });
  await sleep(1000);
};
await dl("#view=practice&mode=exam&unit=U3", `document.querySelector('#view-practice .qcard').dataset.id.startsWith('U3-') && document.querySelector('[data-mode="exam"]').getAttribute('aria-pressed')==='true'`);
await nav("#view=fills");
const fillsDiag = await $(`(() => { const c = document.querySelector('#view-practice .qcard');
  const u = window.QUIZ_DATA.units.find(x => x.unit === 'U3');
  return { ref: c ? c.querySelector('.type')?.textContent : null,
    prog: document.querySelector('.bottombar .progress')?.textContent || '',
    want: u.items.filter(i => i.kind === 'fill').length,
    onlyFills: document.querySelector('#view-practice .bar [data-act="only-fills"]')?.getAttribute('aria-pressed') }; })()`);
ok("深链 #view=fills 落到只看填空",
  fillsDiag && fillsDiag.ref === "填空" && fillsDiag.prog === "1 / " + fillsDiag.want && fillsDiag.onlyFills === "true",
  JSON.stringify(fillsDiag));
await dl("#view=practice", `document.querySelector('[data-mode="drill"]').getAttribute('aria-pressed')==='true'`);
ok("迁移表 41 条", (await $(`Object.keys(window.__ID_MIGRATION).length`)) === 41);

/* ── 10. 旧记录 id 迁移 ──────────────────────── */
group("旧记录 id 迁移");
await $(`localStorage.clear(); localStorage.setItem('eng9a-practice-v1', JSON.stringify({
  picks: {}, fills: {}, stat: { 'U3-1': { att: 2, ok: 1, wrong: 1 } },
  cleared: {}, at: {}, atList: {}, unit: 'U3' }))`);
await send("Page.navigate", { url: url + "#view=review&unit=U3" });
await sleep(300);
await send("Page.reload", { ignoreCache: false });
await sleep(1100);
ok("迁移后旧错题仍在复盘里", await $(`[...document.querySelectorAll('#view-review .mcard')].some(c => /阅读/.test(c.textContent))`));
ok("迁移后累计错次数跟着走", await $(`[...document.querySelectorAll('#view-review .mcard')].some(c => /阅读/.test(c.textContent) && /累计错 1 次/.test(c.textContent))`));
await $(`(() => { const c = [...document.querySelectorAll('#view-review .mcard')].find(x => /阅读/.test(x.textContent));
  if (c) c.querySelector('[data-clear-item]').click(); return !!c; })()`);
await sleep(300);
const mig = await $(`(() => { const s = JSON.parse(localStorage.getItem('eng9a-practice-v1') || '{}');
  return { stat: Object.keys(s.stat || {}), cleared: Object.keys(s.cleared || {}) }; })()`);
ok("迁移写回新 id（stat）", mig && mig.stat.length === 1 && mig.stat[0] === "U3-r1", JSON.stringify(mig && mig.stat));
ok("迁移写回新 id（cleared）", mig && mig.cleared.length === 1 && mig.cleared[0] === "U3-r1", JSON.stringify(mig && mig.cleared));

/* ── 11. 清空 ────────────────────────────────── */
group("清空记录");
await $(`document.querySelector('[data-act="clear"]').click()`);
await sleep(500);
ok("清空后没有 stat/picks", (await $(`(() => { const s=JSON.parse(localStorage.getItem('eng9a-practice-v1')||'{}');
  return Object.keys(s.stat||{}).length===0 && Object.keys(s.picks||{}).length===0; })()`)));

/* ── 12. 无报错 ──────────────────────────────── */
group("运行时报错");
const errs = [];
for (const e of events) {
  if (e.method === "Runtime.exceptionThrown") errs.push("EXCEPTION " + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
  if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") errs.push("CONSOLE " + e.params.args.map((a) => a.value ?? a.description).join(" "));
  if (e.method === "Log.entryAdded" && e.params.entry.level === "error") errs.push("LOG " + e.params.entry.text);
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
