// 生成 preview/ 里的界面截图（干净状态：自检前先清 localStorage）
// 用法：node shots.mjs <url> [outDir]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[3] || join(here, "preview");
const PORT = 9344;
const PROFILE = join(process.env.TEMP || ".", "chrome-shots-profile");
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

async function shot(name, opts = {}) {
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
  const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(res.data, "base64"));
  console.log("saved", name, Math.round(clip.height) + "px");
}

const click = async (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) { el.click(); return true; } return false; })()`);
const setFill = async (vals) => evaluate(`(() => { const fs = [...document.querySelectorAll('#view-practice .field')];
  ${JSON.stringify(vals)}.forEach((v, i) => { if (fs[i]) { fs[i].value = v; fs[i].dispatchEvent(new Event('input', { bubbles: true })); } }); return fs.length; })()`);

// 0) 做题：一题一屏（未作答）
await shot("00-做题-一题一屏");

// 1) 判分与解析：跳到 U1-5 答错一题后提交
await click('[data-act="cards"]');
await sleep(300);
await click('#cardsheet .cell[data-id="U1-5"]');
await sleep(400);
await evaluate(`document.querySelector('#view-practice .opt[data-k="A"]').click()`);
await sleep(200);
await evaluate(`document.querySelector('[data-act="submit"]').click()`);
await sleep(500);
await shot("01-判分与解析");

// 2) 答题卡
await click('[data-act="cards"]');
await sleep(400);
await shot("02-答题卡", { viewport: true });
await click('#cardsheet [data-act="close-cards"]');
await sleep(200);

// 3) 模拟考结算：切模拟考，答两题，交卷
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url: url + "#view=practice&mode=exam" });
await sleep(300);
await send("Page.reload", { ignoreCache: false });
await sleep(1500);
await click('[data-act="cards"]');
await sleep(300);
await click('#cardsheet .cell[data-id="U1-5"]');
await sleep(300);
await evaluate(`(() => { const o = document.querySelector('#view-practice .opt[data-k="B"]'); if (o) o.click(); })()`);
await sleep(200);
await click('[data-act="finish"]');
await sleep(700);
await shot("03-模拟考结算");

// 4) 复盘（错题）
await click('.tab[data-view="review"]');
await sleep(600);
await shot("04-复盘-错题");

// 5) 复盘（原卷批改）
await evaluate(`(() => { const b = document.querySelector('#view-review [data-rtab="paper"]'); if (b) b.click(); })()`);
await sleep(500);
await shot("05-复盘-原卷批改");

// 清理旧版截图（只删 2026-11-04 改版前那 5 个文件名；新图直接覆盖）
for (const f of ["00-解析示例.png", "01-练习批改.png", "02-批改报告.png", "03-错题本.png", "04-填空自测.png"]) {
  try { unlinkSync(join(outDir, f)); } catch {}
}

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(0);
