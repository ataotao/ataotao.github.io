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

// 1) 做题（手机 390 一屏）
const S0 = await st();
const pick = S0.blocks.slice().sort((a, b) => a.n - b.n)[0];
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Page.navigate", { url: url + "#block=" + pick.block });
await sleep(300);
await send("Page.reload", { ignoreCache: false });
await sleep(1200);

// 1) 做题：答对一题后停住（默认不自动跳题）——看得出来「考点：」与「下一题 →」
{
  const s = await st();
  await digit("ABCD".indexOf(s.round.answer));
  await sleep(450);
  await snap("01-做题", { width: 390, viewport: true });
  await enter();
  await sleep(250);
}

// 2) 答错讲解（手机上答一声，停在讲解条）
{
  const s = await st();
  const ci = "ABCD".indexOf(s.round.answer);
  await digit(ci === 0 ? 1 : 0);
  await sleep(400);
  await snap("02-答错讲解", { width: 390, viewport: true });
  await enter();
  await sleep(200);
}

// 3) 结算：把剩下的题做对，重练做对，停在结算屏
{
  let guard = 0;
  while (guard++ < 400) {
    const s = await st();
    if (!s.round || s.view !== "drill") break;
    if (!s.round.locked) await digit("ABCD".indexOf(s.round.answer));
    await enter();
  }
  await send("Emulation.clearDeviceMetricsOverride");
  await sleep(2600);   // 等「错题重练」提示自己淡出，截图干净
  await snap("03-结算", { width: 1440 });
  const st2 = await st();
  console.log("result:", JSON.stringify({ view: st2.view, pct: await evaluate("document.querySelector('#rt-pct').textContent") }));
}

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(0);
