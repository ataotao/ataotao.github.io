#!/usr/bin/env node
/* 云同步网络适配层 · 本机回归测试（vm 里跑产物里的 sync 段 + 假 fetch，不联网、不要 PAT）
 * ============================================================
 * 2026-11-18 真机故障：拉快照走的是 Contents API 返回的 download_url（raw.githubusercontent.com），
 * 该域不响应 CORS 预检（OPTIONS），带 Authorization 的 fetch 被浏览器拦下：
 *   "Response to preflight request doesn't pass access control check: It does not have HTTP ok status."
 * 修法：正文改走 Contents API 的 raw 媒体类型，全程只访问 api.github.com。
 * 本测试把这条约束钉死：任何请求落到别的域就失败；读快照必须带 Accept: raw。
 *
 * 覆盖：三科产物各一遍（合并历史快照 + 跳过元数据 + 写回自己那份）、首次同步目录 404、PAT 失效 401。
 * 用法：node 工具/trainer/sync-adapter.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = 'ataotao/ataotao.github.io_learning-records';
const BASE = 'https://api.github.com/repos/' + REPO;
const PRODUCT = {
  化学: '化学/化学闪练卡.html',
  物理: '物理/物理闪练卡.html',
  数学: '数学/数学闪练卡.html'
};

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
function check(cond, m) {
  if (cond) { ok(m); return; }
  failures++;
  console.log('  ✗ ' + m);
}

/* 假 GitHub：记录每一次请求，按真实 API 语义回包。
   目录列表故意把 download_url 指向 raw.githubusercontent.com（真实行为）——
   适配层若去用它，hits 里就会出现非 api.github.com 的地址，测试立刻失败。 */
function makeFetch(opts) {
  const hits = [], writes = [];
  const subject = opts.subject;
  const snaps = opts.snaps || {};
  const files = opts.files || [];
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    async json() { return JSON.parse(body); },
    async text() { return body; }
  });

  async function fetchStub(url, init) {
    const u = String(url);
    const cfg = init || {};
    const method = cfg.method || 'GET';
    const h = cfg.headers || {};
    const accept = String(h.Accept || h.accept || '');
    const auth = String(h.Authorization || h.authorization || '');
    hits.push({ url: u, method, accept, auth });

    const p = decodeURIComponent(new URL(u).pathname);
    if (opts.unauthorized) return reply(401, '{"message":"Bad credentials"}');
    if (p === '/repos/' + REPO) return reply(200, JSON.stringify({ default_branch: 'main' }));

    const dir = '/repos/' + REPO + '/contents/devices/' + subject;
    if (p === dir) {
      if (!files.length) return reply(404, '{"message":"Not Found"}');
      return reply(200, JSON.stringify(files.map((f) => ({
        name: f,
        download_url: 'https://raw.githubusercontent.com/' + REPO + '/main/devices/' +
          encodeURIComponent(subject) + '/' + encodeURIComponent(f)
      }))));
    }
    if (p.startsWith(dir + '/')) {
      const file = p.slice(dir.length + 1);
      if (method === 'GET') {
        // 只有 Accept: raw 才给正文；否则给元数据（与真实 Contents API 一致）
        return accept === 'application/vnd.github.raw' && snaps[file]
          ? reply(200, JSON.stringify(snaps[file]))
          : reply(200, JSON.stringify({ sha: 'sha-' + file, name: file }));
      }
      if (method === 'PUT') {
        const body = JSON.parse(cfg.body || '{}');
        const snap = JSON.parse(Buffer.from(body.content || '', 'base64').toString('utf8'));
        writes.push({ file, snap, message: body.message, branch: body.branch });
        return reply(201, '{"content":{"sha":"sha-new"}}');
      }
    }
    return reply(404, '{"message":"Not Found"}');
  }
  return { fetch: fetchStub, hits, writes };
}

/* 在 vm 里跑产物自带的 merge + sync 段（含 LT_SUBJECT 注入），返回宿主桩。
   merge 段必须先跑：sync 的 carrierSnapshot/syncPlan 以全局函数名调 mergeRecords
   （产物里 merge、sync 是两个 <script>，靠经典脚本的全局函数互相看见）。 */
function loadAdapter(subject, fetchStub, db, notes) {
  const html = fs.readFileSync(path.join(ROOT, PRODUCT[subject]), 'utf8');
  const mergeM = html.match(/<script id="merge">([\s\S]*?)<\/script>/);
  const m = html.match(/<script id="sync">([\s\S]*?)<\/script>/);
  assert.ok(mergeM, subject + ' 产物缺少 merge 段');
  assert.ok(m, subject + ' 产物缺少 sync 段');
  assert.ok(m[1].includes('var LT_SUBJECT = ' + JSON.stringify(subject)), subject + ' 的 LT_SUBJECT 未注入');

  const store = Object.create(null);
  const sandbox = {
    console, JSON, Date, Math, Object, Array, String, Number,
    fetch: fetchStub, btoa, unescape, encodeURIComponent,
    localStorage: {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(mergeM[1], sandbox, { filename: subject + '.merge.js' });
  assert.ok(sandbox.__ltMerge && typeof sandbox.__ltMerge.mergeRecords === 'function', 'merge 段未挂出 __ltMerge');
  vm.runInContext(m[1], sandbox, { filename: subject + '.sync.js' });
  assert.ok(sandbox.__ltSyncUI && typeof sandbox.__ltSyncUI.run === 'function', 'sync 段未挂出 __ltSyncUI');
  assert.ok(sandbox.__ltSync && typeof sandbox.__ltSync.syncPlan === 'function', 'sync 段未挂出 __ltSync');

  sandbox.__ltSyncUI.init({
    getDB: () => db,
    setDB: (d) => { Object.assign(db, d); },
    notify: (msg) => notes.push(msg)
  });
  sandbox.__ltSyncUI.setPAT('test-pat');
  return sandbox.__ltSyncUI;
}

function noForeignHost(hits, subject) {
  const bad = hits.filter((h) => !h.url.startsWith('https://api.github.com/'));
  check(bad.length === 0, subject + '：全程只访问 api.github.com，未碰 raw.githubusercontent.com（CORS 预检必失败）' +
    (bad.length ? ' → ' + bad[0].url : ''));
  check(hits.every((h) => h.auth === 'Bearer test-pat'), subject + '：每个请求都带 PAT 授权头');
}

/* ---------- A. 三科各一遍：合并历史快照 + 跳过元数据 + 写回自己那份 ---------- */
async function caseMerge(subject) {
  console.log('\n[' + subject + '] 有历史快照：拉取 → 合并 → 写回');
  const snap = {
    v: 1, deviceId: subject + '|legacy-test', subject,
    recs: [
      { ts: 1001, mod: 'calc', kind: 'k1', kn: '历史题一', ok: true },
      { ts: 1002, mod: 'calc', kind: 'k2', kn: '历史题二', ok: false }
    ],
    wrong: {}, meta: {}
  };
  const fake = makeFetch({ subject, files: ['legacy-test.json', 'meta.json'], snaps: { 'legacy-test.json': snap } });
  const db = { v: 1, recs: [], wrong: {}, meta: {}, days: { keep: 1 } };
  const notes = [];
  const api = loadAdapter(subject, fake.fetch, db, notes);
  await api.run();

  noForeignHost(fake.hits, subject);
  const rawRead = fake.hits.filter((h) => h.accept === 'application/vnd.github.raw' &&
    decodeURIComponent(h.url).endsWith('/legacy-test.json'));
  check(rawRead.length === 1, subject + '：快照正文走 Contents API + Accept: raw（不是 download_url）');
  check(/^同步完成/.test(notes[notes.length - 1] || ''), subject + '：提示同步完成（' + (notes[notes.length - 1] || '') + '）');
  check(db.recs.length === 2, subject + '：历史快照并入本机 2 条');
  check(notes.some((n) => /未能读取/.test(n)), subject + '：非快照 JSON（元数据）被跳过并提示，不当设备合并');
  check(fake.writes.length === 1, subject + '：只写回自己那一份');
  const w = fake.writes[0];
  check(!!w && w.snap.deviceId.startsWith(subject + '|'), subject + '：写回快照 deviceId 带科目前缀');
  check(!!w && w.snap.recs.length === 2 && w.snap.days === undefined, subject + '：载体只带 recs/wrong/meta，不带设备态');
  check(!!w && w.file.endsWith('.json') && w.branch === 'main', subject + '：写到 devices/' + subject + '/ 下、默认分支 main');
}

/* ---------- B. 首次同步：本科目录 404 视为空载体 ---------- */
async function caseFirstSync() {
  console.log('\n[数学] 首次同步：devices/数学 目录 404 → 空载体');
  const fake = makeFetch({ subject: '数学', files: [] });
  const db = { v: 1, recs: [{ ts: 2001, mod: 'calc', kind: 'k', kn: '本机题', ok: true }], wrong: {}, meta: {} };
  const notes = [];
  const api = loadAdapter('数学', fake.fetch, db, notes);
  await api.run();

  noForeignHost(fake.hits, '数学');
  check(/^同步完成/.test(notes[notes.length - 1] || ''), '数学：目录不存在也同步成功（不是失败）');
  check(fake.writes.length === 1 && fake.writes[0].snap.recs.length === 1, '数学：本机 1 条照常写回新快照');
}

/* ---------- C. PAT 失效：401 要给出可操作提示 ---------- */
async function caseBadPAT() {
  console.log('\n[数学] PAT 失效：401');
  const fake = makeFetch({ subject: '数学', files: ['legacy-test.json'], unauthorized: true });
  const db = { v: 1, recs: [], wrong: {}, meta: {} };
  const notes = [];
  const api = loadAdapter('数学', fake.fetch, db, notes);
  await api.run();

  noForeignHost(fake.hits, '数学');
  check(/PAT 无效/.test(notes[notes.length - 1] || ''), '数学：401 提示「PAT 无效或已过期」');
  check(fake.writes.length === 0, '数学：拉取失败不写回');
}

for (const subject of Object.keys(PRODUCT)) await caseMerge(subject);
await caseFirstSync();
await caseBadPAT();

console.log('\n' + (failures ? '✗ 云同步适配层测试失败 ' + failures + ' 项' : '✓ 云同步适配层测试全过（3 科 × 10 项 + 首次同步 4 项 + 401 4 项）'));
process.exit(failures ? 1 : 0);
