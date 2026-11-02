// 用 CDP 驱动无头 Chrome：截图 + 交互点击 + 收集 JS 报错
// 用法：node qa.mjs <url> <outDir>
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3] || ".qa";
const PORT = 9333;
const PROFILE = join(process.env.TEMP || ".", "chrome-qa-profile");
mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-crash-reporter",
  "--disable-breakpad",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + PROFILE,
  "--window-size=1440,1200",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, tries = 100, gap = 200) {
  for (let i = 0; i < tries; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    await sleep(gap);
  }
  throw new Error("timeout waiting for chrome");
}

const version = await waitFor(async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
  return r.ok ? r.json() : null;
});

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
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Runtime.enable");
await send("Page.enable");
await send("Log.enable");
await send("Page.navigate", { url });
await sleep(1200);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1400);

const errors = [];
function collect() {
  for (const e of events) {
    if (e.method === "Runtime.exceptionThrown") {
      errors.push("EXCEPTION: " + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
    }
    if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
      errors.push("CONSOLE: " + e.params.args.map((a) => a.value ?? a.description).join(" "));
    }
    if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
      errors.push("LOG: " + e.params.entry.text + " " + (e.params.entry.url || ""));
    }
  }
  events.length = 0;
}

async function evaluate(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return { value: r.result.value };
}

async function shot(name, viewWidth = 1440) {
  const metrics = await send("Page.getLayoutMetrics");
  const css = metrics.cssContentSize || metrics.contentSize;
  const res = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: viewWidth, height: Math.min(css.height, 12000), scale: 1 },
  });
  const p = join(outDir, name + ".png");
  writeFileSync(p, Buffer.from(res.data, "base64"));
  return p + "  (" + Math.min(css.height, 12000) + "px tall)";
}

const report = [];
report.push("URL: " + url);

// 1. 初始练习页
report.push("shot1: " + (await shot("01-practice")));
report.push("dom: " + JSON.stringify((await evaluate(`(() => {
  return {
    units: document.querySelectorAll('#view-practice .unitseg button').length,
    questions: document.querySelectorAll('#view-practice .q').length,
    options: document.querySelectorAll('#view-practice .opt').length,
    stamp: document.querySelector('#view-practice .stamp')?.className || null,
    errVisible: document.getElementById('errbar').classList.contains('show'),
  };
})()`)).value));

// 2. 答第 1 题（选 A），答第 2 题（选错），答第 3 题（选对）
report.push("click: " + JSON.stringify((await evaluate(`(() => {
  const qs = [...document.querySelectorAll('#view-practice .q')];
  const out = [];
  qs.slice(0,3).forEach((q, i) => {
    const opts = [...q.querySelectorAll('.opt')];
    const btn = opts[Math.min(i, opts.length-1)];
    if (btn) { btn.click(); }
    out.push(q.dataset.id + ':' + (btn ? btn.dataset.k : 'none'));
  });
  return out;
})()`)).value));
await sleep(700);
report.push("after-click: " + JSON.stringify((await evaluate(`(() => {
  const qs = [...document.querySelectorAll('#view-practice .q')].slice(0,3);
  return qs.map(q => ({
    id: q.dataset.id,
    result: q.dataset.result,
    mark: q.querySelector('.mark')?.textContent,
    verifyShown: getComputedStyle(q.querySelector('.verify')).display,
    states: [...q.querySelectorAll('.opt')].map(o => o.dataset.k + '=' + o.dataset.state).join(','),
  }));
})()`)).value));
report.push("shot2: " + (await shot("02-practice-graded")));

// 3. 批改报告
await evaluate(`document.querySelector('.tab[data-view=report]').click()`);
await sleep(600);
report.push("report: " + JSON.stringify((await evaluate(`(() => ({
  rows: document.querySelectorAll('#view-report tbody tr').length,
  wrongRows: document.querySelectorAll('#view-report tr.is-wrong').length,
  caption: document.querySelector('#view-report caption')?.innerText,
}))()`)).value));
report.push("shot3: " + (await shot("03-report")));

// 4. 错题本
await evaluate(`document.querySelector('.tab[data-view=mistakes]').click()`);
await sleep(600);
report.push("mistakes: " + JSON.stringify((await evaluate(`(() => ({
  cards: document.querySelectorAll('#view-mistakes .mcard').length,
  tabCount: document.getElementById('tab-mistake-count').textContent,
  firstWhy: document.querySelector('#view-mistakes .mcard .why')?.innerText?.slice(0,60),
}))()`)).value));
report.push("shot4: " + (await shot("04-mistakes")));

// 5. 填空自测
await evaluate(`document.querySelector('.tab[data-view=fills]').click()`);
await sleep(600);
report.push("fills: " + JSON.stringify((await evaluate(`(() => ({
  items: document.querySelectorAll('#view-fills .fill-item').length,
  inputs: document.querySelectorAll('#view-fills .fill-input').length,
}))()`)).value));
await evaluate(`(() => {
  const inp = document.querySelector('#view-fills .fill-input');
  if (!inp) return;
  inp.value = 'x';
  inp.dispatchEvent(new Event('blur'));
  inp.closest('.fill-item').querySelector('[data-check]').click();
})()`);
await sleep(500);
report.push("shot5: " + (await shot("05-fills")));

// 5b. 填空判定逻辑：多空答案、拼写变体、缺答案
report.push("fillmatch: " + JSON.stringify((await evaluate(`(() => {
  const out = {};
  const tab = (u) => { document.querySelector('.tab[data-view=fills]').click();
    const b = document.querySelector('#view-fills [data-funit=' + u + ']'); if (b) b.click(); };
  const tryOne = (id, val) => {
    const inp = document.querySelector('#view-fills .fill-input[data-id="' + id + '"]');
    if (!inp) return 'missing';
    inp.value = val; inp.dispatchEvent(new Event('blur'));
    const item = inp.closest('.fill-item');
    item.querySelector('[data-check]').click();
    return document.getElementById('res-' + id).textContent;
  };
  tab('U2');
  out.multiBlank = tryOne('U2-m11', 'not satisfied with');
  out.multiBlankWrong = tryOne('U2-m11', 'not satisfy with');
  out.sentenceAlt = tryOne('U3-17', 'you look beautiful in this dress');
  out.noKey = (() => {
    const b = document.querySelector('#view-fills [data-funit=U3]'); if (b) b.click();
    return tryOne('U3-22', 'anything');
  })();
  tab('U1');
  out.uidReset = document.querySelectorAll('#view-fills .fill-item').length;
  return out;
})()`)).value));
await evaluate(`document.querySelector('.tab[data-view=fills]').click()`);

report.push("export: " + JSON.stringify((await evaluate(`(() => {
  try { document.getElementById('btn-export-md').click(); return 'clicked'; }
  catch (e) { return 'ERR ' + e.message; }
})()`)).value));
await sleep(900);

// 7. 移动端布局
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await evaluate(`document.querySelector('.tab[data-view=practice]').click()`);
await sleep(700);
report.push("mobile: " + JSON.stringify((await evaluate(`(() => ({
  width: document.documentElement.scrollWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  optCols: getComputedStyle(document.querySelector('#view-practice .options') || document.body).gridTemplateColumns,
}))()`)).value));
report.push("shot6: " + (await shot("06-mobile", 390)));
await send("Emulation.clearDeviceMetricsOverride");

// 8. 打印样式（错题本）
await evaluate(`document.querySelector('.tab[data-view=mistakes]').click()`);
await sleep(500);
await send("Emulation.setEmulatedMedia", { media: "print" });
await sleep(400);
report.push("print: " + JSON.stringify((await evaluate(`(() => ({
  topbarHidden: getComputedStyle(document.querySelector('.topbar')).display,
  cards: document.querySelectorAll('#view-mistakes .mcard').length,
}))()`)).value));
report.push("shot7: " + (await shot("07-print-mistakes")));
await send("Emulation.setEmulatedMedia", { media: "" });

collect();
report.push("errors: " + (errors.length ? JSON.stringify(errors, null, 1) : "none"));
console.log(report.join("\n"));

ws.close();
chrome.kill();
try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
process.exit(0);
