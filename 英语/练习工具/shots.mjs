// 生成 preview/ 里的四张界面截图（干净状态：不带自检产生的作答）
// 用法：node shots.mjs <url> <outDir>
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
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
};
function send(method, params = {}) { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(1200);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1400);

async function shot(name) {
  const metrics = await send("Page.getLayoutMetrics");
  const css = metrics.cssContentSize || metrics.contentSize;
  const res = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 1440, height: Math.min(css.height, 12000), scale: 1 },
  });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(res.data, "base64"));
  console.log("saved", name, Math.min(css.height, 12000) + "px");
  return css.height;
}

// 1) 练习：答对一题、答错一题，展示红笔批改 + 三段式解析
await evaluate(`(() => {
  const qs = [...document.querySelectorAll('#view-practice .q')];
  if (qs[0]) { const b = qs[0].querySelector('.opt[data-k="B"]'); if (b) b.click(); }
  if (qs[1]) { const b = qs[1].querySelector('.opt[data-k="B"]'); if (b) b.click(); }
})()`);
await sleep(600);
await shot("01-练习批改");

// 2) 清空后看批改报告（统计干净）
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1500);
await evaluate(`document.querySelector('.tab[data-view=report]').click()`);
await sleep(700);
await shot("02-批改报告");

// 3) 错题本
await evaluate(`document.querySelector('.tab[data-view=mistakes]').click()`);
await sleep(700);
await shot("03-错题本");

// 4) 填空自测：展开一条的答案
await evaluate(`document.querySelector('.tab[data-view=fills]').click()`);
await sleep(600);
await evaluate(`(() => { const b = document.querySelector('#view-fills [data-reveal]'); if (b) b.click(); })()`);
await sleep(500);
await shot("04-填空自测");

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(0);
