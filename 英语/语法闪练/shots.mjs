// 生成 preview/ 里的界面截图（干净状态：自检前先清 localStorage）
// 用法：node shots.mjs <url> [outDir]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[3] || join(here, "preview");
const PORT = 9344;
const PROFILE = join(process.env.TEMP || ".", "chrome-shots-flash-profile");
if (!url) { console.error("用法：node shots.mjs <url> [outDir]"); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-crash-reporter",
  "--disable-breakpad", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE, "--window-size=1440,1200", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, tries = 100, gap = 200) {
  for (let i = 0; i < tries; i++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(gap); }
  throw new Error("chrome not ready");
}
await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok);

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); }
  else if (msg.method === "Page.javascriptDialogOpening") {
    try { send("Page.handleJavaScriptDialog", { accept: true }); } catch {}
  }
};
function send(method, params = {}) { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(1200);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1500);

async function snap(name, opts = {}) {
  const w = opts.width || 1440;
  let clip;
  if (opts.viewport) {
    const m = await send("Page.getLayoutMetrics");
    const vv = m.cssVisualViewport || m.visualViewport;
    clip = { x: 0, y: 0, width: w, height: Math.round(vv.clientHeight), scale: 1 };
  } else {
    const metrics = await send("Page.getLayoutMetrics");
    const css = metrics.cssContentSize || metrics.contentSize;
    clip = { x: 0, y: 0, width: w, height: Math.min(Math.max(css.height, 700), 4000), scale: 1 };
  }
  const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !opts.viewport, clip });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(res.data, "base64"));
  console.log("saved", name, Math.round(clip.height) + "px");
}

const st = () => evaluate("window.FLASH_APP && window.FLASH_APP.state()");
const key = async (k, code, vk, wait = 40) => {
  for (const type of ["rawKeyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
  await sleep(wait);
};
const digit = (i) => key(String(i + 1), "Digit" + (i + 1), 49 + i);
const enter = () => key("Enter", "Enter", 13, 35);

// 0) 开始屏（桌面 1440，整页）
await snap("00-开始", { width: 1440 });

// 1) 做题（手机 390 一屏，未作答：能看到「看答案」按钮）
const S0 = await st();
const pick = S0.blocks.slice().sort((a, b) => a.n - b.n)[0];
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Page.navigate", { url: url + "#block=" + pick.block });
await sleep(300);
await send("Page.reload", { ignoreCache: false });
await sleep(1200);
await snap("01-做题", { width: 390, viewport: true });

// 1.2) 悬停词义（未作答时鼠标滑过单词，浮层显示中文）
{
  const box = await evaluate(`(() => { const el = document.querySelector('#qcard .qstem .zw');
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (box) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none" });
    await sleep(320);
    await snap("07-悬停词义", { width: 390, viewport: true });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2, button: "none" });
    await sleep(120);
  } else {
    console.log("⚠ 没找到可悬停的词，跳过 07-悬停词义");
  }
}

// 1.5) 单题历史（给本题塞历史后刷新；随后清掉，不影响后面的截图）
{
  const hid = await evaluate("window.FLASH_APP.state().round.itemId");
  await evaluate(`(() => { const v = JSON.parse(localStorage.getItem('eng9a-flash-v1') || '{}') || {};
    v.stat = v.stat || {};
    v.stat[${JSON.stringify(hid)}] = { att: 5, ok: 3, wrong: 2, peek: 1, at: new Date().toISOString() };
    v.current = null;
    localStorage.setItem('eng9a-flash-v1', JSON.stringify(v)); })()`);
  await send("Page.reload", { ignoreCache: false });
  await sleep(1000);
  await snap("05-历史", { width: 390, viewport: true });
  await evaluate("localStorage.removeItem('eng9a-flash-v1')");
  await send("Page.navigate", { url: url + "#block=" + pick.block });
  await sleep(300);
  await send("Page.reload", { ignoreCache: false });
  await sleep(1000);
}

// 2) 看答案（不计分，琥珀色讲解 + 下一题）
{
  await evaluate(`document.querySelector('#qcard [data-act="peek"]').click()`);
  await sleep(2600);   // 等 toast 淡出，截图干净（toast 文案由 qa.mjs 断言）
  await snap("04-看答案", { width: 390, viewport: true });
  await enter();
  await sleep(250);
}

// 3) 答错讲解（答一声，停在讲解条）
{
  const s = await st();
  const ci = "ABCD".indexOf(s.round.answer);
  await digit(ci === 0 ? 1 : 0);
  await sleep(400);
  await snap("02-答错讲解", { width: 390, viewport: true });
  await enter();
  await sleep(220);
}

// 3.5) 答题卡（此时已有 1 题看答案 + 1 题答错，状态色最全）
{
  await evaluate(`document.querySelector('#nav-sheet').click()`);
  await sleep(320);
  await snap("06-答题卡", { width: 390, viewport: true });
  await evaluate(`document.querySelector('#modal [data-act="modal-cancel"]').click()`);
  await sleep(180);
}

// 4) 结算：把剩下的题做对，重练做对，停在结算屏
{
  let guard = 0;
  while (guard++ < 400) {
    const s = await st();
    if (!s.round || s.view !== "drill") break;
    if (!s.round.locked) await digit("ABCD".indexOf(s.round.answer));
    await enter();
  }
  await send("Emulation.clearDeviceMetricsOverride");
  await sleep(2600);   // 等提示自己淡出，截图干净
  await snap("03-结算", { width: 1440 });
  const st2 = await st();
  console.log("result:", JSON.stringify({ view: st2.view, pct: await evaluate("document.querySelector('#rt-pct').textContent"),
    peek: await evaluate("(document.querySelector('#rt-peek')||{}).textContent"),
    chips: await evaluate("document.querySelectorAll('#rt-chips .chip').length") }));
}

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(0);
