// 英语单词闪练卡 · 真实浏览器交互自检（CDP 无头 Chrome，file:// 离线打开）
// 用法：node 英语/题库工具/qa.mjs [outDir]
// 退出码：0 全过；1 有失败。截图落在 outDir（默认 英语/题库工具/.qa-word）
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url))), '..', '..');
function dirname(p) { return p.replace(/\\/g, '/').split('/').slice(0, -1).join('/'); }
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = join(ROOT, '英语', '英语单词闪练卡.html');
const url = pathToFileURL(FILE).href;
const outDir = process.argv[2] || join(ROOT, '英语', '题库工具', '.qa-word');
const PORT = 9341;
const PROFILE = join(process.env.TEMP || '.', 'chrome-qa-word-profile');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-crash-reporter",
  "--disable-breakpad", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
  "--window-size=1280,1400", "about:blank",
], { stdio: "ignore" });

async function waitFor(fn, tries = 120, gap = 200) {
  for (let i = 0; i < tries; i++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(gap); }
  throw new Error("timeout waiting for chrome");
}
await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok);
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map(); const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) events.push(msg);
};
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return { value: r.result.value };
};
const $ = async (expr) => { const r = await evaluate(expr); return r.__error ? undefined : r.value; };
const shot = async (name, w = 1280) => {
  const metrics = await send("Page.getLayoutMetrics");
  const css = metrics.cssContentSize || metrics.contentSize;
  const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(css.height, 9000), scale: 1 } });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(res.data, "base64"));
};
const checks = [];
const ok = (name, cond, detail) => { checks.push({ name, pass: !!cond, detail: detail === undefined ? "" : String(detail).slice(0, 200) }); };

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable"); await send("Network.enable");
await send("Page.navigate", { url });
await sleep(1200);
await evaluate("try{localStorage.clear()}catch(e){}");
await send("Page.navigate", { url });
await sleep(1500);

// 捕获 JS 异常
const jsErrors = events.filter((e) => e.method === "Runtime.exceptionThrown").map((e) => e.params.exceptionDetails?.text || 'err');
ok("无 JS 运行时异常", jsErrors.length === 0, jsErrors.join(' | '));

// 今日页渲染
const hasToday = await $(`document.body.innerText.indexOf('选教材来源') >= 0`);
ok("今日页渲染（来源/年级/单元选择器）", hasToday);
const srcBtns = await $(`Array.from(document.querySelectorAll('button')).filter(b=>/沪教版|沪教牛津小学/.test(b.textContent)).length`);
ok("两个来源按钮", srcBtns >= 2, srcBtns);
const unitBtns = await $(`Array.from(document.querySelectorAll('button')).filter(b=>/^Unit \\d+$/.test(b.textContent.trim())).length`);
ok("单元按钮渲染", unitBtns >= 1, unitBtns);
const mixBtn = await $(`Array.from(document.querySelectorAll('button')).some(b=>/双向混合/.test(b.textContent))`);
ok("双向混合按钮存在", mixBtn);
await shot('01-today');

// 三方向出题（用钩子）+ 答案提交
for (const kind of ['e2c', 'c2e', 'p2c']) {
  const info = await $(`(() => {
    const T = window.__ew; if (!T) return {err:'no hook'};
    T.startSession('primary.ox3a.unit1', '${kind}', 3);
    const q = T.S.q;
    const speakBtn = !!document.querySelector('.speakbtn');
    const ipa = q.ipa || '';
    T.S.choice[0] = q.fields[0].ans; T.submit();
    return { kind:q.kind, opts:q.fields[0].options.length, ok:T.S.res.ok, speakBtn, ipa, done:T.S.sess.done, ex:q.ex||'' };
  })()`);
  ok("出题+判对 " + kind, info && info.kind === kind && info.opts >= 4 && info.ok === true, JSON.stringify(info));
  if (kind === 'p2c') {
    ok("音→中显示音标", !!(info && info.ipa), info && info.ipa);
    ok("音→中有喇叭按钮", !!(info && info.speakBtn));
    await shot('02-p2c');
  }
  // 提交后解析区：例句块 + 高亮目标词（只在该题有例句时断言）
  const exInfo = await $(`(() => {
    const box = document.querySelector('.exbox');
    if (!box) return { has: false };
    return { has: true, hasMark: !!box.querySelector('mark.hlword'),
      mark: (box.querySelector('mark.hlword')||{}).textContent || '',
      en: (box.querySelector('.exen')||{}).textContent || '' };
  })()`);
  if (info && info.ex) ok("提交后例句高亮 " + kind, exInfo && exInfo.has && exInfo.hasMark, JSON.stringify(exInfo));
}

// 双向混合：只出 e2c/c2e，不出 p2c
const mixInfo = await $(`(() => {
  const T = window.__ew;
  T.startSession('primary.ox3a.unit1', ['e2c','c2e'], 6);
  const kinds = [];
  for (let i=0;i<6;i++){ kinds.push(T.S.q.kind); T.S.choice[0]=T.S.q.fields[0].ans; T.submit(); if(i<5)T.next(); }
  return { kinds, ok: kinds.every(k=>k==='e2c'||k==='c2e') && kinds.includes('e2c') && kinds.includes('c2e') };
})()`);
ok("双向混合只轮换英↔中", mixInfo && mixInfo.ok, mixInfo && mixInfo.kinds.join(','));
await shot('02b-mix');

// 快练队列：一次出满 10 题、词不重复；题号/进度条不提前进位
const quick = await $(`(() => {
  const T = window.__ew, m = T.EW.modules.find((x) => x.words.length >= 12);
  T.startSession(m.id, 'e2c', 10);
  const words = (T.S.sess.queue || []).map((q) => q.word);
  T.S.choice[0] = T.S.q.fields[0].ans; T.submit();
  const row = document.querySelectorAll('#app > .row')[0];
  const cnt = row ? row.querySelectorAll('.small.muted')[1].textContent.trim() : '';
  const bar = document.querySelector('.progress i') ? document.querySelector('.progress i').style.width : '';
  return { id: m.id, n: words.length, uniq: new Set(words).size, total: T.S.sess.total, done: T.S.sess.done, cnt, bar };
})()`);
ok("快练 10 题按不同词出满", quick && quick.n === 10 && quick.uniq === 10 && quick.total === 10, JSON.stringify(quick));
ok("答完第 1 题题号仍是 1 / 10", quick && quick.cnt === '1 / 10' && quick.done === 0, quick && quick.cnt);
ok("答完第 1 题进度条 10%", quick && quick.bar === '10%', quick && quick.bar);

// 答满 10 题：最后一题答完应显示 10 / 10，而不是 11 / 10
const last = await $(`(() => {
  const T = window.__ew, m = T.EW.modules.find((x) => x.words.length >= 12);
  T.startSession(m.id, 'e2c', 10);
  for (let i = 0; i < 10; i++) { T.S.choice[0] = T.S.q.fields[0].ans; T.submit(); if (i < 9) T.next(); }
  const row = document.querySelectorAll('#app > .row')[0];
  return { cnt: row ? row.querySelectorAll('.small.muted')[1].textContent.trim() : '',
           bar: document.querySelector('.progress i') ? document.querySelector('.progress i').style.width : '',
           done: T.S.sess.done };
})()`);
ok("最后一题答完显示 10 / 10", last && last.cnt === '10 / 10' && last.done === 9, JSON.stringify(last));
ok("最后一题进度条 100%", last && last.bar === '100%', last && last.bar);

// Enter 不再劫持按钮：聚焦选项按 Enter 应选中该选项，而不是弹「先选一个答案」
await $(`window.__alerts = []; window.alert = (m) => window.__alerts.push(String(m)); 1`);
await $(`(() => { const T = window.__ew; T.startSession('primary.ox3a.unit1', 'e2c', 5); document.querySelectorAll('.opt')[2].focus(); return 1; })()`);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r" });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await sleep(150);
const enterPick = await $("({ choice: window.__ew.S.choice[0], answered: window.__ew.S.answered, alerts: window.__alerts })");
ok("Enter 选中聚焦的选项", enterPick && enterPick.choice === 2 && enterPick.answered === false && enterPick.alerts.length === 0, JSON.stringify(enterPick));

// Enter 不再劫持「退出」：答完后聚焦退出按 Enter 应回到今日
await $(`(() => { const T = window.__ew; T.S.choice[0] = T.S.q.fields[0].ans; T.submit();
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '退出'); b.focus(); return 1; })()`);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r" });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await sleep(150);
const enterExit = await $("({ view: window.__ew.S.view, done: window.__ew.S.sess.done })");
ok("Enter 触发退出而不是下一题", enterExit && enterExit.view === 'today' && enterExit.done === 0, JSON.stringify(enterExit));

// 整单元：每词一题不遗漏，可完整循环
const unitAll = await $(`(() => {
  const T = window.__ew, mod='primary.ox3a.unit1';
  const words = T.EW.moduleById(mod).words.length;
  T.startUnitAll(mod, null);
  const q1 = T.S.sess.queue.map(q=>q.word);
  T.restart();
  const q2 = T.S.sess.queue.map(q=>q.word);
  return { words, n1:q1.length, n2:q2.length, uniq:new Set(q1).size, area:T.S.area };
})()`);
ok("整单元全词不遗漏且可循环", unitAll && unitAll.words===unitAll.n1 && unitAll.n1===unitAll.n2 &&
  unitAll.uniq===unitAll.words && unitAll.area==='unit', JSON.stringify(unitAll));

// 随机练习：20/30/50 去重、与单元区隔离
const randInfo = await $(`(() => {
  const T = window.__ew, before=T.S.selUnit;
  T.go('random');
  const view = document.body.innerText.indexOf('随机') >= 0;
  const pill = ([...document.querySelectorAll('.pill')].map((x) => x.textContent).find((x) => /词可选/.test(x))) || '';
  const counts=[];
  for (const n of [20,30,50]) {
    T.startRandom(n, null);
    counts.push({n, got:T.S.sess.total, uniq:new Set(T.S.sess.queue.map(q=>q.word)).size, area:T.S.area});
  }
  return { view, counts, selUntouched:T.S.selUnit===before, pill, pillOk: pill === T.EW.uniqueWordRefs().length + ' 词可选' };
})()`);
ok("随机练习三档去重且隔离", randInfo && randInfo.view && randInfo.selUntouched && randInfo.pillOk &&
  randInfo.counts.every(x=>x.got===x.n && x.uniq===x.n && x.area==='random'), JSON.stringify(randInfo));
await shot('02c-random');

// 答错进错题本
const wrongInfo = await $(`(() => {
  const T = window.__ew;
  T.startSession('primary.ox3a.unit1', 'e2c', 1);
  const q = T.S.q;
  T.S.choice[0] = (q.fields[0].ans + 1) % q.fields[0].options.length;
  T.submit();
  T.go('wrong');
  return { wrong: Object.keys(T.db().wrong).length, text: document.body.innerText.indexOf('错题本') >= 0 };
})()`);
ok("答错进错题本并可渲染", wrongInfo && wrongInfo.wrong >= 1 && wrongInfo.text, JSON.stringify(wrongInfo));
await shot('03-wrong');

// 报告页
const report = await $(`(() => { window.__ew.go('report'); return { text: document.body.innerText.indexOf('累计题数') >= 0, recs: window.__ew.db().recs.length }; })()`);
ok("报告页渲染", report && report.text && report.recs >= 4, JSON.stringify(report));
await shot('04-report');

// 离线：无外部资源请求
const extReqs = events.filter((e) => e.method === "Network.requestWillBeSent" && /^https?:/.test(e.params.request.url)).map((e) => e.params.request.url);
ok("离线无外部网络请求", extReqs.length === 0, extReqs.slice(0, 3).join(' | '));

// 汇总
let failed = 0;
console.log('英语单词闪练卡 · 真实浏览器自检（file://）');
for (const c of checks) { console.log((c.pass ? '  ok  ' : '  ✗   ') + c.name + (c.detail ? ' — ' + c.detail : '')); if (!c.pass) failed++; }
console.log(failed ? `\n✗ ${failed}/${checks.length} 项失败` : `\n✓ ${checks.length}/${checks.length} 项全部通过`);
try { chrome.kill('SIGKILL'); } catch {}
process.exit(failed ? 1 : 0);
