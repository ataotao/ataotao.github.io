/* 端到端测试：真实 Chrome 打开闪练卡，拦截 GitHub API，验证云同步链路
 * 不碰真实云端、不需要 PAT；模拟数据来自私有仓真实 legacy 快照。
 *
 * 前置：
 *   1) 本机装 playwright-core（只需一次，不下载浏览器）：
 *        mkdir -p C:/learn/.wb-e2e && cd C:/learn/.wb-e2e && npm init -y && npm i playwright-core
 *   2) 系统有 Chrome（默认 C:/Program Files/Google/Chrome/Application/chrome.exe）
 *
 * 运行：node 工具/trainer/e2e-sync.cjs
 * 可覆盖：E2E_CHROME=<chrome路径>  E2E_PLAYWRIGHT=<playwright-core目录>  E2E_RECORDS=<私有仓路径>
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const RECORDS = process.env.E2E_RECORDS || 'C:/learn/ataotao.github.io_learning-records';
const CHROME = process.env.E2E_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.E2E_PORT || 18765);
const REPO = 'ataotao/ataotao.github.io_learning-records';

function loadChromium() {
  const candidates = [
    process.env.E2E_PLAYWRIGHT,
    path.join(ROOT, 'node_modules', 'playwright-core'),
    'C:/learn/.wb-e2e/node_modules/playwright-core'
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c).chromium; } catch (e) {}
  }
  console.error('找不到 playwright-core。请先运行：\n  mkdir -p C:/learn/.wb-e2e && cd C:/learn/.wb-e2e && npm init -y && npm i playwright-core');
  process.exit(1);
}
const chromium = loadChromium();

const results = [];
function ok(name, detail) { results.push({ name, pass: true, detail }); console.log('  ✓ ' + name + (detail ? ' — ' + detail : '')); }
function bad(name, detail) { results.push({ name, pass: false, detail }); console.log('  ✗ ' + name + ' — ' + detail); }
function assert(cond, name, detail) { cond ? ok(name, detail) : bad(name, detail || '断言失败'); }

function readLegacy(subject) {
  return JSON.parse(fs.readFileSync(path.join(RECORDS, 'devices', subject, 'legacy-2026-11-18.json'), 'utf8'));
}
// 期望值来自独立真相源（私有仓真实快照），不是从实现反推，也不会因快照更新而假失败
const EXPECT = {
  物理: { recs: readLegacy('物理').recs.length, wrong: Object.keys(readLegacy('物理').wrong || {}).length },
  数学: { recs: readLegacy('数学').recs.length, wrong: Object.keys(readLegacy('数学').wrong || {}).length }
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.resolve(ROOT, '.' + p);
      if (!fp.startsWith(path.resolve(ROOT))) { res.writeHead(403); res.end(); return; }
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(fp).toLowerCase();
        const ct = ext === '.html' ? 'text/html; charset=utf-8'
          : ext === '.js' ? 'application/javascript; charset=utf-8'
            : ext === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function makeCloud() {
  return {
    cloud: {
      物理: { 'legacy-2026-11-18.json': readLegacy('物理') },
      数学: { 'legacy-2026-11-18.json': readLegacy('数学') }
    },
    writes: []
  };
}

async function mockGithub(page, state) {
  const base = '/repos/' + REPO;
  const contents = base + '/contents';
  /* 真机里 Contents API 返回的 download_url 指向 raw.githubusercontent.com，该域不响应 CORS 预检，
     页面带 Authorization 去 fetch 必被浏览器拦下（2026-11-18 真机 CORS 报错）。这里把该域一律
     拦成失败并计数：用例断言必须为 0，即适配层只走 api.github.com。 */
  state.rawHits = 0;
  await page.route('https://raw.githubusercontent.com/**', (route) => {
    state.rawHits++;
    return route.abort();
  });
  await page.route('https://api.github.com/**', async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const method = req.method();
    const json = (status, obj) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });

    if (p === base && method === 'GET') return json(200, { default_branch: 'main' });

    if (p.startsWith(contents + '/')) {
      let rel = decodeURIComponent(p.slice(contents.length + 1));
      if (rel.startsWith('devices/')) rel = rel.slice('devices/'.length);
      const [subject, file] = rel.split('/');
      if (!file) {
        return json(200, Object.keys(state.cloud[subject] || {}).map((f) => ({
          name: f,
          // 与真实 GitHub 一致：download_url 指向 raw.githubusercontent.com（适配层不该用它）
          download_url: 'https://raw.githubusercontent.com/' + REPO + '/main/devices/' +
            encodeURIComponent(subject) + '/' + encodeURIComponent(f)
        })));
      }
      const snap = (state.cloud[subject] || {})[file];
      if (method === 'GET') {
        if (!snap) return json(404, {});
        // Accept: raw → 直接给文件正文（真实 Contents API 行为）；否则给元数据（sha/name）
        const accept = String((req.headers() || {}).accept || '');
        return accept.indexOf('raw') >= 0
          ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snap) })
          : json(200, { sha: 'sha-' + file, name: file });
      }
      if (method === 'PUT') {
        const body = JSON.parse(req.postData() || '{}');
        let snap = null;
        try { snap = JSON.parse(Buffer.from(body.content || '', 'base64').toString('utf8')); } catch (e) {}
        state.cloud[subject] = state.cloud[subject] || {};
        state.cloud[subject][file] = snap;
        state.writes.push({ subject, file, snap });
        return json(201, { content: { sha: 'sha-new' } });
      }
    }
    return json(404, {});
  });
}

async function waitReady(page, hook) {
  await page.waitForFunction((h) => !!window[h], hook, { timeout: 10000 });
}
async function dbOf(page, hook) {
  return page.evaluate((h) => {
    const d = window[h].db();
    return { recs: d.recs.length, wrong: Object.keys(d.wrong || {}).length, wrongKeys: Object.keys(d.wrong || {}) };
  }, hook);
}
async function clickSync(page, withPAT = true) {
  if (withPAT) await page.locator('#syncPat').fill('e2e-test-pat');
  await page.getByRole('button', { name: /云同步/ }).click();
  await page.waitForFunction(() => {
    const el = document.getElementById('syncMsg');
    return el && /同步完成|同步失败|请先填入/.test(el.textContent || '');
  }, { timeout: 15000 });
  return page.locator('#syncMsg').textContent();
}
const urlOf = (f) => 'http://127.0.0.1:' + PORT + '/' + f + '#view=report';

(async () => {
  if (!fs.existsSync(CHROME)) { console.error('找不到 Chrome：' + CHROME + '（可用 E2E_CHROME 覆盖）'); process.exit(1); }
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  try {
    console.log('\n[1] 物理：本机空 → 云同步');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('物理/物理闪练卡.html')); await waitReady(page, '__pt');
      const before = await dbOf(page, '__pt');
      assert(before.recs === 0 && before.wrong === 0, '同步前本机为空', before.recs + '/' + before.wrong);
      const msg = await clickSync(page);
      const after = await dbOf(page, '__pt');
      assert(/同步完成/.test(msg), '同步提示成功', msg);
      assert(after.recs === EXPECT.物理.recs, '物理记录 ' + EXPECT.物理.recs + ' 条', 'recs=' + after.recs);
      assert(after.wrong === EXPECT.物理.wrong, '物理错题 ' + EXPECT.物理.wrong + ' 道', 'wrong=' + after.wrong);
      assert(state.writes.length === 1 && state.writes[0].subject === '物理', '写回云端自己那份', state.writes.map((w) => w.subject + '/' + w.file).join(','));
      assert(state.rawHits === 0, '只访问 api.github.com，不碰 raw.githubusercontent.com（CORS 预检必失败）', 'rawHits=' + state.rawHits);
      const statText = await page.locator('.stat').filter({ hasText: '累计题数' }).locator('b').textContent();
      assert(statText === String(EXPECT.物理.recs), '报告页显示累计题数 ' + EXPECT.物理.recs, '显示=' + statText);
      await ctx.close();
    }

    console.log('\n[2] 物理：再次同步（幂等）');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('物理/物理闪练卡.html')); await waitReady(page, '__pt');
      await clickSync(page);
      const first = await dbOf(page, '__pt'); const filesAfterFirst = Object.keys(state.cloud['物理']).length;
      await clickSync(page);
      const second = await dbOf(page, '__pt'); const filesAfterSecond = Object.keys(state.cloud['物理']).length;
      assert(second.recs === first.recs && second.wrong === first.wrong, '二次同步条数不翻倍', first.recs + '/' + first.wrong + ' → ' + second.recs + '/' + second.wrong);
      assert(filesAfterSecond === filesAfterFirst, '云端文件数不增长（只覆盖自己）', filesAfterFirst + ' → ' + filesAfterSecond);
      await ctx.close();
    }

    console.log('\n[3] 物理：本地有新作答 → 与云端 legacy 合并（并集）');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('物理/物理闪练卡.html')); await waitReady(page, '__pt');
      // 先同步一次拿到云端 legacy 43/7
      await clickSync(page);
      const base = await dbOf(page, '__pt');
      // 模拟本地新答 2 题 + 新增 1 道错题（本地独有的数据）
      await page.evaluate(() => {
        const d = window.__pt.db();
        d.recs.push({ ts: 9999999990001, mod: 'calc', kind: 'localA', prompt: '本地独有题A', ok: true, got: 3, total: 3, sec: 10, mode: 'new' });
        d.recs.push({ ts: 9999999990002, mod: 'calc', kind: 'localB', prompt: '本地独有题B', ok: false, got: 1, total: 3, sec: 20, mode: 'new' });
        d.wrong['local-only-w'] = { key: 'local-only-w', mod: 'calc', kind: 'localB', prompt: '本地独有错题', fields: [], due: Date.now(), ts: 9999999990002 };
      });
      const withLocal = await dbOf(page, '__pt');
      assert(withLocal.recs === base.recs + 2 && withLocal.wrong === base.wrong + 1, '本地新增 2 题 + 1 错题', base.recs + '/' + base.wrong + ' → ' + withLocal.recs + '/' + withLocal.wrong);
      // 再同步：本地独有 + 云端 legacy 应取并集，条数相加、谁都不丢
      const msg = await clickSync(page);
      const merged = await dbOf(page, '__pt');
      assert(/同步完成/.test(msg), '合并同步提示成功', msg);
      assert(merged.recs === base.recs + 2, '合并后 = 云端 ' + EXPECT.物理.recs + ' + 本地 2（不丢不重）', 'recs=' + merged.recs);
      assert(merged.wrong === base.wrong + 1, '错题合并后 = ' + EXPECT.物理.wrong + ' + 1', 'wrong=' + merged.wrong);
      const allPrompts = await page.evaluate(() => window.__pt.db().recs.map((r) => r.prompt));
      assert(allPrompts.includes('本地独有题A') && allPrompts.includes('本地独有题B'), '本地独有题在合并结果中');
      const cloudRecs = state.writes[state.writes.length - 1].snap.recs.length;
      assert(cloudRecs === merged.recs, '写回云端的快照 = 合并结果', '云端=' + cloudRecs + ' 本机=' + merged.recs);
      await ctx.close();
    }

    console.log('\n[4] 数学：按科隔离 53/4');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('数学/数学闪练卡.html')); await waitReady(page, '__mt');
      const msg = await clickSync(page);
      const after = await dbOf(page, '__mt');
      assert(/同步完成/.test(msg), '数学同步提示成功', msg);
      assert(after.recs === EXPECT.数学.recs, '数学记录 ' + EXPECT.数学.recs + ' 条', 'recs=' + after.recs);
      assert(after.wrong === EXPECT.数学.wrong, '数学错题 ' + EXPECT.数学.wrong + ' 道', 'wrong=' + after.wrong);
      const statText = await page.locator('.stat').filter({ hasText: '累计题数' }).locator('b').textContent();
      assert(statText === String(EXPECT.数学.recs), '数学报告页显示累计题数 ' + EXPECT.数学.recs, '显示=' + statText);
      assert(await page.locator('#syncMsg').count() === 1, '数学报告页渲染完整（days 未丢、syncMsg 在位）');
      const physWrong = Object.keys(readLegacy('物理').wrong || {});
      const leak = after.wrongKeys.filter((k) => physWrong.includes(k));
      assert(leak.length === 0, '数学页无物理错题（不串科）', leak.length ? '串入=' + leak.join(',') : '0 串入');
      await ctx.close();
    }

    console.log('\n[5] 物理：清空本机 → 同步恢复历史');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('物理/物理闪练卡.html')); await waitReady(page, '__pt');
      await clickSync(page);
      await page.evaluate(() => localStorage.removeItem('physTrain_v1'));
      await page.reload(); await waitReady(page, '__pt');
      const cleared = await dbOf(page, '__pt');
      assert(cleared.recs === 0, '本机已清空', 'recs=' + cleared.recs);
      await clickSync(page);
      const recovered = await dbOf(page, '__pt');
      assert(recovered.recs === EXPECT.物理.recs && recovered.wrong === EXPECT.物理.wrong, '同步后历史恢复 ' + EXPECT.物理.recs + '/' + EXPECT.物理.wrong, recovered.recs + '/' + recovered.wrong);
      await ctx.close();
    }

    console.log('\n[5b] 数学：清空本机 → 同步恢复，且报告页渲染完整');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('数学/数学闪练卡.html')); await waitReady(page, '__mt');
      await clickSync(page);
      await page.evaluate(() => localStorage.removeItem('mathtrain_v1'));
      await page.reload(); await waitReady(page, '__mt');
      await clickSync(page);
      const recovered = await dbOf(page, '__mt');
      assert(recovered.recs === EXPECT.数学.recs && recovered.wrong === EXPECT.数学.wrong, '数学同步后历史恢复 ' + EXPECT.数学.recs + '/' + EXPECT.数学.wrong, recovered.recs + '/' + recovered.wrong);
      assert(await page.locator('#syncMsg').count() === 1, '数学空库恢复后报告页仍完整（days 兜底生效）');
      await ctx.close();
    }

    console.log('\n[6] 无 PAT：给出明确提示');
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); const state = makeCloud();
      await mockGithub(page, state);
      await page.goto(urlOf('物理/物理闪练卡.html')); await waitReady(page, '__pt');
      const msg = await clickSync(page, false);
      assert(/请先填入 PAT/.test(msg), '无 PAT 时提示填令牌', msg);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log('\n=== 汇总：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  if (fail) process.exit(1);
})().catch((e) => { console.error('测试脚本异常：', e); process.exit(1); });
