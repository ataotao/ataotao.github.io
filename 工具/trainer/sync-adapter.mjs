/* 云同步网络适配层（内联进产物；GitHub Contents API + PAT + sha 乐观锁）
 * ============================================================
 * 本机测试覆盖不到真实 fetch，故这里刻意做薄：只负责 I/O 与提示，
 * 合并编排全部交给 window.__ltSync.syncPlan（已单测）。
 * 由各族 UI 注入宿主接口后调用：
 *   window.__ltSyncUI.init({ getDB, setDB, key, notify })
 *   window.__ltSyncUI.run()  // 点按钮触发
 * PAT / deviceId 存本机浏览器；sha 409 冲突时重拉→重并→重写（最多 3 次）。
 */
(function () {
  'use strict';
  var REPO = 'ataotao/ataotao.github.io_learning-records';
  var API = 'https://api.github.com/repos/' + REPO + '/contents';
  var HOST = null, BRANCH = null, CONFLICT_RETRY = 3;
  var PAT_KEY = '__lt_pat_v1';

  var PAT_HELP = '先到 GitHub → 头像 → Settings → Developer settings → Personal access tokens ' +
    '→ Fine-grained tokens 生成：只选 ' + REPO + ' 这一个仓，权限只开 Contents（读写），' +
    '把生成的令牌填这里（只显示一次）。它存在本机浏览器，随时可在 GitHub 撤销。';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} return true; }
  function deviceId() {
    var id = lsGet('__lt_device_id_v1');
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
      lsSet('__lt_device_id_v1', id);
    }
    return id;
  }
  function headers() {
    return { 'Authorization': 'Bearer ' + (lsGet(PAT_KEY) || ''), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  }

  /* 探测默认分支：失败回退 main，不写死成唯一路径 */
  async function detectBranch() {
    if (BRANCH) return BRANCH;
    try {
      var r = await fetch('https://api.github.com/repos/' + REPO, { headers: headers() });
      if (r.ok) { var j = await r.json(); BRANCH = j.default_branch || 'main'; return BRANCH; }
    } catch (e) {}
    BRANCH = 'main';
    return BRANCH;
  }

  async function pullAll() {
    var r = await fetch(API + '/devices', { headers: headers() });
    if (r.status === 404) {
      // 首次同步：devices/ 目录还不存在，视为空载体（正常情况，不是错误）
      return {};
    }
    if (!r.ok) {
      var msg = r.status === 401 ? 'PAT 无效或已过期，请重新生成并填入'
        : r.status === 403 ? 'PAT 没有该仓权限（需 Contents 读写）'
          : '拉取目录失败 ' + r.status;
      throw new Error(msg);
    }
    var list = await r.json();
    var out = {}, failed = 0;
    for (const item of list) {
      if (!/\.json$/i.test(item.name)) continue;
      var fr = await fetch(item.download_url || (API + '/devices/' + item.name), { headers: headers() });
      if (!fr.ok) { failed++; continue; }
      try {
        var j = await fr.json();
        out[String(j.deviceId || item.name.replace(/\.json$/, ''))] = j;
      } catch (e) { failed++; }
    }
    if (failed) HOST && HOST.notify('有 ' + failed + ' 份快照未能读取，已跳过（下次同步会重试）');
    return out;
  }

  async function pushOne(id, snapshot, branch) {
    var url = API + '/devices/' + id + '.json';
    var sha = null;
    var cur = await fetch(url, { headers: headers() });
    if (cur.ok) { var cj = await cur.json(); sha = cj.sha; }
    var body = {
      message: 'sync ' + id + ' ' + new Date().toISOString(),
      content: btoa(unescape(encodeURIComponent(JSON.stringify(snapshot, null, 2)))),
      branch: branch || 'main'
    };
    if (sha) body.sha = sha;
    var r = await fetch(url, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers()), body: JSON.stringify(body) });
    if (r.status === 409) return false;   // 冲突：交给上层重拉重并重写
    if (!r.ok) {
      var e = await r.json().catch(function () { return {}; });
      throw new Error('写回失败 ' + r.status + (e.message ? '：' + e.message : ''));
    }
    return true;
  }

  window.__ltSyncUI = {
    init: function (host) { HOST = host; },
    setPAT: function (pat) { return lsSet(PAT_KEY, String(pat || '').trim()); },
    hasPAT: function () { return !!lsGet(PAT_KEY); },
    patHelp: PAT_HELP,
    deviceId: deviceId,
    run: async function () {
      if (!HOST) throw new Error('同步未初始化');
      if (!lsGet(PAT_KEY)) { HOST.notify('请先填入 PAT（个人访问令牌）'); return; }
      var branch = await detectBranch();
      for (var attempt = 1; attempt <= CONFLICT_RETRY; attempt++) {
        HOST.notify('正在同步…' + (attempt > 1 ? '（冲突重试 ' + attempt + '/' + CONFLICT_RETRY + '）' : ''));
        try {
          var all = await pullAll();
          var plan = window.__ltSync.syncPlan(HOST.getDB(), all, deviceId());
          HOST.setDB(plan.db);                   // 合并结果先写回本机：即使云端失败，本机记录也不丢（ADR 决定 6）
          var wrote = await pushOne(deviceId(), plan.snapshot, branch);
          if (!wrote) continue;                  // 409：重拉→重并→重写（setDB 幂等，安全）
          HOST.notify('同步完成：本机共 ' + plan.db.recs.length + ' 条记录');
          return;
        } catch (e) {
          HOST.notify('同步失败：' + (e && e.message ? e.message : e));
          return;
        }
      }
      HOST.notify('同步失败：连续 ' + CONFLICT_RETRY + ' 次写回冲突，请稍后再试');
    }
  };
})();
