(function () {
  'use strict';
  var KEY = 'mathtrain_v1';
  var app = document.getElementById('app');
  var tabs = document.getElementById('tabs');

  /* ---------- 存储 ---------- */
  function devId() { return window.__ltSyncUI ? window.__ltSyncUI.deviceId() : undefined; }
  function blankDB() { return { v: MT.VERSION, deviceId: devId(), recs: [], wrong: {}, days: {}, meta: { created: Date.now() } }; }
  /* 记录有两个写入方：本机 UI 和云同步回写。任何一方写坏一个字段（recs 变成字符串、
     wrong 变成数组）都不能让整站白屏，所以统一过一遍规整，坏的条目直接丢弃。 */
  function normalizeDB(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return blankDB();
    var out = { v: MT.VERSION, deviceId: o.deviceId || devId(), recs: [], wrong: {}, days: {}, meta: {} };
    if (Array.isArray(o.recs)) {
      out.recs = o.recs.filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r) && typeof r.ts === 'number'; });
    }
    if (o.wrong && typeof o.wrong === 'object' && !Array.isArray(o.wrong)) {
      Object.keys(o.wrong).forEach(function (k) {
        var w = o.wrong[k];
        if (w && typeof w === 'object' && !Array.isArray(w)) out.wrong[k] = w;
      });
    }
    if (o.days && typeof o.days === 'object' && !Array.isArray(o.days)) {
      Object.keys(o.days).forEach(function (k) {
        var d = o.days[k];
        if (!d || typeof d !== 'object') return;
        out.days[k] = { qs: Array.isArray(d.qs) ? d.qs.filter(function (q) { return q && typeof q === 'object'; }) : [] };
      });
    }
    if (o.meta && typeof o.meta === 'object' && !Array.isArray(o.meta)) {
      out.meta = o.meta;
      var dp = out.meta.dayPlan;
      if (dp && (typeof dp !== 'object' || !dp.plan || !dp.plan.drill)) delete out.meta.dayPlan;
    }
    return out;
  }
  var DB = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankDB();
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || o.v !== MT.VERSION) {
        try { localStorage.setItem(KEY + '.bak', raw); } catch (e2) { }   /* 旧版本先留备份，再重置 */
        return blankDB();
      }
      var n = normalizeDB(o);
      if (!n.deviceId && window.__ltSyncUI) n.deviceId = devId();   /* 旧记录补 deviceId */
      return n;
    } catch (e) { return blankDB(); }
  })();
  var SAVE_FAIL = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); SAVE_FAIL = false; }
    catch (e) { SAVE_FAIL = true; }
  }
  /* 当天题单固化：同一天打开几次都是同一套；弱项只在换天后影响主力 */
  function dayPlan() {
    var d = today();
    if (!DB.meta || typeof DB.meta !== 'object') DB.meta = {};
    var p = DB.meta.dayPlan;
    if (p && typeof p === 'object' && p.day === d && p.plan) return p.plan;
    var plan = MT.planForDay(d, weakKind());
    DB.meta.dayPlan = { day: d, plan: plan };
    save();
    return plan;
  }
  function dayKey(ts) { var t = new Date(ts); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }
  function today() { return dayKey(Date.now()); }
  /* 日期键是 YYYY-M-D（不补零）：字符串排序会把 11-9 排到 11-10 后面，这里按真实日期比较 */
  function dayOrd(k) { var p = String(k).split('-'); return Date.UTC(+p[0], (+p[1]) - 1, +p[2]); }
  function dayKeys() { return Object.keys(DB.days).sort(function (a, b) { return dayOrd(a) - dayOrd(b); }); }

  /* ---------- 小工具 ---------- */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'value') e.value = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) { kid.forEach(function (x) { if (x != null && x !== false) e.appendChild(typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x); }); }
      else e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return e;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  /* 题号标签：数字 →「第 5 题」；非数字（附加题的「附加」）→「附加题」 */
  function qnoLabel(no, fallback) {
    var s = (no == null || no === '') ? (fallback == null ? '?' : String(fallback)) : String(no);
    return /^\d+$/.test(s) ? ('第 ' + s + ' 题') : (s + '题');
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function fmtSec(s) { s = Math.round(s); return s < 60 ? s + ' 秒' : Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'; }
  function todayRecs() { var t = today(); return DB.recs.filter(function (r) { return dayKey(r.ts) === t; }); }

  /* ---------- 状态 ---------- */
  var S = { view: 'today', sess: null, q: null, res: null, answered: false, choice: {}, hint: false, t0: 0, mode: 'new', draft: null, lastVals: null, scratch: false, fix: null, example: false };

  /* ---------- 路由 ---------- */
  var VIEWS = { today: renderToday, write: renderModule, entry: renderModule, drill: renderModule, week12: renderModule, report: renderReport, practice: renderPractice, summary: renderSummary };
  function go(view) { S.view = view; render(); window.scrollTo(0, 0); }
  function render() {
    clear(app);
    var fn = VIEWS[S.view] || renderToday;
    try {
      fn();
    } catch (err) {
      /* 单页渲染炸掉不能整站白屏：把错误摊在页面上，并给两条自救路径 */
      clear(app);
      app.appendChild(renderCrash(err));
    }
    if (SAVE_FAIL) {
      app.appendChild(h('div', { class: 'fb bad', style: 'margin-top:10px' },
        '⚠ 记录没能存进本机（隐私模式或空间满）：刷新后会丢，请先「报告 → 导出 JSON」。'));
    }
    Array.prototype.forEach.call(tabs.children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-go') === S.view || (S.view === 'practice' && b.getAttribute('data-go') === S.sess.mod));
    });
  }
  function renderCrash(err) {
    var box = h('div', { class: 'card' });
    box.appendChild(h('h2', { style: 'margin:0 0 6px' }, '这一页没画出来'));
    box.appendChild(h('div', { class: 'small muted' },
      '本机记录里可能有一条坏数据。先导出备份，再重置本机记录：错题和打卡会清空，题目本身不受影响。'));
    box.appendChild(h('pre', { class: 'small', style: 'white-space:pre-wrap;margin:8px 0;color:#b3261e' },
      String((err && (err.stack || err.message)) || err)));
    box.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn', onclick: function () { try { exportJSON(); } catch (e) { alert('导出也失败了：' + e.message); } } }, '导出备份 JSON'),
      h('button', {
        class: 'btn', onclick: function () {
          if (!window.confirm('确定重置本机记录？建议先导出备份。')) return;
          try { localStorage.setItem(KEY + '.bak', localStorage.getItem(KEY) || ''); } catch (e) { }
          DB = blankDB(); S.view = 'today'; S.sess = null; S.q = null; S.example = false; S.mode = 'new';
          save(); render();
        }
      }, '重置本机记录')));
    return box;
  }

  /* ---------- 今日 ---------- */
  function renderToday() {
    var tr = todayRecs();
    var plan = dayPlan();
    var META = {
      drill: { n: 6, sub: '6 题 · 5 分钟 · ' + plan.drill.note },
      write: { n: 8, sub: '8 题 · 10 分钟 · ' + plan.write.note },
      entry: { n: 3, sub: '3 题 · 8 分钟 · ' + MT.moduleById('entry').items.length + ' 个得分点里按今天这套取 3 个' }
    };
    /* 顺序由 MT.modules 决定，这里只配题量与说明；daily:false 的临时项目（本周错题）不进今日任务 */
    var tasks_plan = MT.modules.filter(function (m) { return m.daily !== false; }).map(function (m) {
      var x = META[m.id] || { n: 6, sub: '' };
      return { mod: m.id, n: x.n, label: m.name, sub: x.sub, go: m.id };
    });
    var dueN = window.__ltReview.dueList(DB.wrong).length;
    tasks_plan.push({ mod: 'wrong', n: 1, label: '错题回炉', sub: (dueN ? '到期 ' + dueN + ' 题' : '暂无到期') + ' · 2 分钟', go: 'wrong' });
    var done = {};
    tasks_plan.forEach(function (p) { done[p.mod] = 0; });
    tr.forEach(function (r) {
      if (r.mode === 'wrong') done.wrong++;
      else if (r.daily && done[r.mod] != null) done[r.mod]++;   /* 只有「今日题单」的题才算完成，专项 3 题 / 板块随机不算 */
    });

    var tasks = h('div', { class: 'card' });
    tasks.appendChild(h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:18px' }, '今日任务'),
      h('span', { class: 'pill' }, '约 25 分钟'),
      h('span', { class: 'pill' + (plan.weak ? ' warn' : '') }, plan.weak ? '弱项覆盖' : '今天这一套')));
    tasks.appendChild(h('div', { class: 'small muted', style: 'margin-top:4px' }, '顺序：热身 → 写式 → 入口 → 错题。四个都做，不用等一个练熟。'));
    tasks_plan.forEach(function (p, i) {
      var isDone = done[p.mod] >= p.n;
      var row = h('div', { class: 'task' + (isDone ? ' done' : '') },
        h('div', { class: 'no' }, isDone ? '✓' : String(i + 1)),
        h('div', { class: 'tt' }, h('b', null, p.label), h('span', null, p.sub)),
        h('button', {
          class: 'btn btn-sm ' + (isDone ? '' : 'btn-primary'), onclick: function () {
            if (p.go === 'wrong') startWrong(); else startDaily(p.go);
          }
        }, isDone ? '再来' : '开始')
      );
      tasks.appendChild(row);
    });
    app.appendChild(tasks);

    /* 今日任务的规则：写在页面上，不藏在代码里 */
    app.appendChild(h('div', { class: 'card', style: 'margin-top:12px' },
      h('div', { class: 'small' }, h('b', null, '今日任务的规则')),
      h('ul', { class: 'small muted', style: 'margin:6px 0 0;padding-left:20px' },
        h('li', null, '一天一套：题目由「日期种子」生成，同一天打开几次都是同一套，换天才换。'),
        h('li', null, '今天的配比：' + plan.note),
        h('li', null, '主力题型按 8 类轮换（顶点式 → 交点式 → 反比例 → 线段 → 分段 → 利润 → 拱桥 → 对称轴），8 天一轮全覆盖；最近一轮有错题时，主力换成错的那一类（弱项优先）。'),
        h('li', null, '难度顺序：因式分解 → 解方程 → 轮换题；写解析式先顶点式（要写全式），再主力，再次主力。'),
        h('li', null, '同一套内题干不重复；错题按 1/3/7/14 天档位回炉，到期后连续 2 次答对才算掌握（看提示/秒答不算）；跳过几天不累计欠账。'),
        h('li', null, '「本周错题」是临时项目（一周一换）：本周卷子里做错/不会的题各练一种同类变式，随时可点，不计入上面 4 个任务。')
      )
    ));

    var stats = h('div', { class: 'grid', style: 'margin-top:12px' },
      statCard('今日题数', tr.length),
      statCard('今日正确率', tr.length ? pct(tr.filter(function (r) { return r.ok; }).length, tr.length) + '%' : '—'),
      statCard('错题待回炉', window.__ltReview.dueList(DB.wrong).length)
    );
    app.appendChild(stats);

    var mods = h('div', { class: 'grid', style: 'margin-top:16px' });
    MT.modules.forEach(function (m) {
      var cm = coverOfMod(m);
      var card = h('div', { class: 'module' },
        h('div', { class: 'mh' }, h('span', null, m.icon), h('b', null, m.name)),
        h('div', { class: 'desc' }, m.desc),
        h('div', { class: 'kinds' }, (m.kinds || m.items.map(function (x) { return { name: x.title }; })).slice(0, 5).map(function (k) { return h('span', { class: 'kind' }, k.name); })),
        (cm.pool ? covLine(cm) : null),
        h('div', { class: 'row', style: 'margin-top:auto' },
          h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, null, m.id === 'entry' ? 3 : 8); } }, '开始'),
          h('button', { class: 'btn btn-sm', onclick: function () { startExample(m.id, lastKindOf(m.id)); } }, '看例题')
        )
      );
      mods.appendChild(card);
    });
    app.appendChild(mods);

    var note = h('div', { class: 'card', style: 'margin-top:16px' },
      h('div', { class: 'small' }, h('b', null, '怎么用')),
      h('ul', { class: 'small muted', style: 'margin:6px 0 0;padding-left:20px' },
        h('li', null, '不用等一个练熟再下一个：四个每天都做，顺序就是上面 1→2→3→4。'),
        h('li', null, '不会就点「提示」，提示不扣分，但会记录。'),
        h('li', null, '答错要订正：照着解析把正确答案再填一遍，对了才能下一题。'),
        h('li', null, '第一次做某类题，先点「例题」看一遍完整解答。'),
        h('li', null, '直接打字：整数、小数、1/2 都行；负号写分子前、分母前都算对。'),
        h('li', null, '打草稿点「草稿纸」；想手写就用系统输入法的手写模式。'),
        h('li', null, '时间不够：砍基础快练，保「写解析式 + 大题前两步」。')
      )
    );
    app.appendChild(note);
  }
  function statCard(label, val) { return h('div', { class: 'stat' }, h('span', null, label), h('b', null, String(val))); }

  /* ---------- 模块首页 ---------- */
  function renderModule() {
    var m = MT.moduleById(S.view);
    if (!m) { go('today'); return; }
    var recs = DB.recs.filter(function (r) { return r.mod === m.id; });
    var okN = recs.filter(function (r) { return r.ok; }).length;
    var cm = coverOfMod(m);
    var head = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:19px' }, m.icon + ' ' + m.name)),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, m.desc),
      h('p', { class: 'small' + (recs.length ? '' : ' muted'), style: 'margin:6px 0 0' },
        recs.length ? '已练 ' + recs.length + ' 题 · 正确率 ' + pct(okN, recs.length) + '%' : '还没开始练')
    );
    if (cm.pool) {
      head.appendChild(h('div', { class: 'cov', style: 'margin-top:4px' },
        h('span', null, '情境覆盖 ' + cm.done + '/' + cm.pool),
        h('div', { class: 'bar' }, h('i', { style: 'width:' + cm.pct + '%' })),
        h('span', null, cm.pct + '%'),
        (cm.legacy ? h('span', { class: 'muted' }, '· 另有 ' + cm.legacy + ' 条早期记录无情境指纹，未计入覆盖（往后新做的都会算）') : null)));
    }
    app.appendChild(head);
    /* 分组抽象：kinds（生成器题型）和 items（固定得分点）都按 group 切板块。
       这样大题前两步也能看到全部题型、单独练某一题、按板块随机练。 */
    var isItems = !m.kinds;
    var cards = m.kinds || m.items.map(function (it) {
      return { id: it.id, name: it.title, group: it.group || '' };
    });
    var groups = [], byGroup = {};
    cards.forEach(function (k) {
      var g = k.group || '';
      if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(k);
    });
    var showGroupHead = groups.length > 1 || (groups.length === 1 && groups[0] !== '');
    function randomBtn(arr) {
      return h('button', { class: 'btn btn-sm btn-random', onclick: function () { startGroupRandom(m.id, arr); } }, '当前板块随机题练习');
    }
    /* 模块头按「题型」统计未练数：判据是 kindStat 的非回炉记录数，不是情境覆盖。
       纯数字随机题型（SKELS -1）没有情境池，老记录也没有 skel，用 done 会把练过的误判成没练。 */
    var freshN = kindIdsOf(m).filter(function (id) { return kindStat(m.id, id).n === 0; }).length;
    head.appendChild(h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn btn-primary', onclick: function () { startSession(m.id, null, m.id === 'entry' ? 3 : 8); } }, '开始一轮'),
      h('button', { class: 'btn', onclick: function () { startExample(m.id, lastKindOf(m.id)); } }, '先看例题'),
      (!showGroupHead) ? randomBtn(cards) : null,
      (freshN > 0 ? h('button', { class: 'btn', onclick: function () { startFreshKinds(m.id); } },
        '练没练过的题型（' + freshN + '）') : null)
    ));
    head.appendChild(h('div', { class: 'small muted', style: 'margin-top:8px' },
      isItems
        ? '「开始一轮」从全部得分点混抽 3 个；每个得分点可单独练 1 题；板块标题右侧按该板块每个得分点各出 1 题。「练没练过的题型」专挑还没练过的得分点。'
        : ('「开始一轮」按题型混抽（每次不同）；每个题型可以单独连做 3 题（专项）。' +
           '「练没练过的题型」从还没练过的题型里各抽 1 题；题型卡的「练没见过的情境」只出固定情境题型里没见过的情境。' +
           (showGroupHead ? '板块标题右侧「当前板块随机题练习」按该板块题型各出 1~2 题。' : '「当前板块随机题练习」按本页题型各出 1~2 题。'))
    ));
    var list = h('div', { style: 'margin-top:4px' });
    groups.forEach(function (g) {
      if (showGroupHead && g) list.appendChild(h('div', { class: 'gsec' },
        h('b', null, g),
        h('span', null, byGroup[g].length + (isItems ? ' 个得分点' : ' 个题型')),
        h('span', null, isItems ? '每个得分点 1 题' : '每种 1~2 题'),
        randomBtn(byGroup[g])
      ));
      var grid = h('div', { class: 'grid' });
      byGroup[g].forEach(function (k) {
        var st = kindStat(m.id, k.id);
        var c = coverOf(m.id, k.id);
        grid.appendChild(h('div', { class: 'module' },
          h('div', { class: 'mh' }, h('b', null, k.name), h('span', { class: 'grow' }),
            h('button', { class: 'btn btn-ghost btn-sm', onclick: function () { startExample(m.id, k.id); } }, '例题')),
          h('div', { class: 'desc small muted' }, st.n ? '练过 ' + st.n + ' 题 · 正确率 ' + pct(st.ok, st.n) + '%' : '还没练过'),
          covLine(c),
          h('div', { class: 'row', style: 'margin-top:auto' },
            h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, k.id, isItems ? 1 : 3); } }, isItems ? '练这个得分点' : '专项 3 题'),
            /* 得分点只有一道题：「练这个得分点」出的就是那道没做过的，不用再单开「练未覆盖」入口 */
            (!isItems && c.open > 0 ? h('button', { class: 'btn btn-sm', onclick: function () { startNocover(m.id, k.id); } }, '练没见过的情境 ' + c.open) : null),
            (c.pct === 100 ? h('span', { class: 'small', style: 'color:var(--ok);font-weight:600' }, '✓ 已全覆盖') : null)
          )
        ));
      });
      list.appendChild(grid);
    });
    app.appendChild(list);
  }
  /* 这个模块最近练过的题型（没有就返回 null，例题退化为随机） */
  function lastKindOf(mod) {
    var lk = DB.meta && DB.meta.lastKind;
    return (lk && lk[mod]) || null;
  }
  /* 练过几题 / 正确率：不含错题回炉（回炉是复习旧题，不该重复算进「练过」）。 */
  function kindStat(mod, kind) {
    var rs = DB.recs.filter(function (r) { return r.mode !== 'wrong' && r.mod === mod && r.kind === kind; });
    return { n: rs.length, ok: rs.filter(function (r) { return r.ok; }).length };
  }

  /* ---------- 知识覆盖面（分母 = core 的 SKELS 情境表）----------
     分子 = 记录里去重后的「情境」指纹 skel（题干抹平数字后哈希）。
     数学题库里同一句话平均换 25 次数值（圆周角 244 条题干只有 4 个情境），
     用题干数当分母会让覆盖率永远涨不动，也看不出真实薄弱点。
     老记录没有 skel（只有 sig）不知道属于哪个情境 —— 单独计数，不进分子，宁可少算。
     「大题前两步」一个得分点一道题，情境数 = 1，做过就是 100%。 */
  function doneSkels(mod, kind) {
    var seen = {}, n = 0, legacy = 0;
    DB.recs.forEach(function (r) {
      if (r.mod !== mod || r.kind !== kind) return;
      if (!r.skel) { legacy++; return; }
      if (!seen[r.skel]) { seen[r.skel] = 1; n++; }
    });
    return { map: seen, n: n, legacy: legacy };
  }
  function coverOf(mod, kind) {
    var pool = MT.kindSkel(mod, kind), d = doneSkels(mod, kind);
    var variants = MT.kindPool(mod, kind);
    if (pool > 0) {
      var got = Math.min(d.n, pool);
      return { pool: pool, done: got, pct: Math.min(100, Math.round(got / pool * 100)), open: Math.max(0, pool - d.n),
        legacy: d.legacy, variants: variants > 0 ? variants : 0 };
    }
    return { pool: 0, done: d.n, pct: null, open: null, legacy: d.legacy, variants: variants > 0 ? variants : 0 };
  }
  /* 模块合计：kinds 型模块按题型累加；大题前两步按得分点累加 */
  function coverOfMod(m) {
    var ids = m.kinds ? m.kinds.map(function (k) { return k.id; })
      : Array.from(new Set(m.items.map(function (it) { return it.kind || it.id; })));
    var pool = 0, done = 0, legacy = 0;
    ids.forEach(function (id) {
      var c = coverOf(m.id, id);
      legacy += c.legacy || 0;
      if (c.pool > 0) { pool += c.pool; done += c.done; }
    });
    return { pool: pool, done: done, pct: pool ? Math.min(100, Math.round(done / pool * 100)) : null, open: Math.max(0, pool - done), legacy: legacy };
  }
  /* 抽一道「本题型没见过情境」的题：从起点扫完整题库（MT.enumerateKind），
     跳过已见过情境与本轮已出情境。同一情境的不同数值版本不重复给 ——
     那是「练 N 题」的活，不是「练未覆盖」。返回 null = 情境都见过了，让调用方换题型。
     seed 可选：传了就当作扫描起点（今日任务用日期种子），不传就随机起点（「练未覆盖」每次换着看）。 */
  function pickUncovered(mod, kind, seenSkels, seed) {
    var list = MT.enumerateKind(mod, kind), d = doneSkels(mod, kind), n = list.length;
    if (!n) return null;
    var start = n > 1 ? (seed == null ? ((Math.random() * n) | 0) : ((seed >>> 0) % n)) : 0;
    for (var i = 0; i < n; i++) {
      var it = list[(start + i) % n];
      if (!d.map[it.skel] && seenSkels.indexOf(it.skel) < 0) return it.q;
    }
    return null;
  }
  /* 首题让给未覆盖：题量、配比、难度顺序都不动，只把第 1 题换成该题型没见过的情境。
     返回 null 的三种情况，调用方一律保持原题：
       ① 题型没有情境表（SKELS -1，页面标「数字随机」）或固定得分点（没有 kind）；
       ② 该题型情境已经全见过；
       ③ 今天这一项已经选过首题了 —— 见下面的冻结。
     为什么要冻结：同一天答完首题后覆盖集就变了，不冻结的话再点「开始」会换题，
     而页面写的是「同一天打开几次都是同一套」。所以当天选定的**具体题目**（sig）
     记进 DB.meta.firstSeen，之后答题、刷新、重开都按它取，换天才重新选。 */
  function firstUncovered(mod, kind, seed, day) {
    if (!kind) return null;
    /* 先看当天有没有冻结：答完首题后这个题型可能已经全覆盖（open=0），
       这时若先查 open 就会退回原题，同一天的第 1 题就换了 —— 所以冻结的判断必须在前面。 */
    var memo = DB.meta.firstSeen = DB.meta.firstSeen || {};
    /* 只留当天：不然一天 3 条、一年上千条，白占 localStorage。换天自然失效。 */
    if (day) Object.keys(memo).forEach(function (k) { if (k.indexOf(day + '|') !== 0) delete memo[k]; });
    var key = (day || '') + '|' + mod + '|' + kind;
    var rec = memo[key];
    if (rec) {
      /* 按 sig（具体题目）而不是 skel（情境）取回：一个情境底下有十几道换数值的变体，
         只记 skel 的话，同一天第二次点「开始」会拿到同情境的另一个数值版本 —— 题面就变了。 */
      if (!rec.sig) return null;
      var list = MT.enumerateKind(mod, kind);
      for (var i = 0; i < list.length; i++) if (list[i].key === rec.sig) return list[i].q;
    }
    var c = coverOf(mod, kind);
    if (c.pct == null || !c.open) return null;
    var q = pickUncovered(mod, kind, [], seed);
    memo[key] = { sig: q ? MT.sigOf(q) : null, skel: q ? MT.skelOf(q) : null };
    save();
    return q;
  }
  /* 同一套里题干+选项完全相同就算重复（core 的 qKey 没导出，这里按同样的口径比） */
  function sameQ(a, b) {
    return a.prompt === b.prompt && JSON.stringify(a.fields) === JSON.stringify(b.fields);
  }
  function covLine(c) {
    if (c.pct == null) return h('div', { class: 'cov' },
      h('span', null, c.done ? '已练 ' + c.done + ' 个情境' : (c.legacy ? '暂无情境记录' : '还没练')),
      h('span', { class: 'muted' }, '· 数字随机，无固定情境'),
      (c.legacy ? h('span', { class: 'muted' }, '· ' + c.legacy + ' 条老记录无情境指纹未计') : null));
    return h('div', { class: 'cov' },
      h('span', null, '情境 ' + c.done + '/' + c.pool),
      h('div', { class: 'bar' }, h('i', { style: 'width:' + c.pct + '%' })),
      h('span', null, c.pct + '%'),
      (c.variants ? h('span', { class: 'muted' }, '· 共 ' + c.variants + ' 道变体') : null),
      (c.legacy ? h('span', { class: 'muted' }, '· 另有 ' + c.legacy + ' 条早期记录无情境指纹未计') : null));
  }
  /* 模块里所有可覆盖的题型 / 得分点 id */
  function kindIdsOf(m) {
    return m.kinds ? m.kinds.map(function (k) { return k.id; })
      : Array.from(new Set(m.items.map(function (it) { return it.kind || it.id; })));
  }

  /* ---------- 练习 ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function startSession(mod, kind, count) {
    if (mod === 'wrong') { startWrong(); return; }   /* 兜底：回炉走回炉入口 */
    S.mode = 'new';
    S.example = false;
    S.back = null;
    var n = count || 8;
    var sess = { mod: mod, kind: kind, total: n, done: 0, right: 0, t0: Date.now() };
    if (mod === 'entry') {
      if (kind) {
        /* 单个得分点专项：固定题只有一道，练 1 题就够，不重复三遍同样的题 */
        sess.queue = [MT.gen('entry', kind, (Math.random() * 1e9) | 0)];
        sess.total = 1;
      } else {
        var items = MT.moduleById('entry').items.map(function (x) {
          var c = JSON.parse(JSON.stringify(x)); c.mod = 'entry'; c.kind = x.id; return c;
        });
        sess.queue = shuffle(items).slice(0, n);
        sess.total = sess.queue.length;
      }
    }
    S.sess = sess;
    S.view = 'practice';
    nextQuestion();
  }
  /* 当前板块随机题：每种题型先保证 1 题，再掷骰子加 1 题（1~2 次），题数 = 板块题型数 ~ 2 倍。
     队列现场生成，「再来一轮」走 sess.replay 重放同一板块规则，不退化成全场混抽。 */
  function startGroupRandom(mod, kinds) {
    if (!kinds || !kinds.length) { startSession(mod, null, 8); return; }
    var isItems = !MT.moduleById(mod).kinds;   /* 大题前两步是固定得分点：每种只出 1 题，避免同题重复 */
    var pool = [];
    kinds.forEach(function (k) {
      pool.push(k.id);
      if (!isItems && Math.random() < 0.5) pool.push(k.id);
    });
    var ids = shuffle(pool), seen = {}, qs = [];
    ids.forEach(function (id) {
      var q, key, tries = 0;
      do {
        q = MT.gen(mod, id, (Math.random() * 1e9) | 0);
        key = MT.sigOf(q);   /* 同一把指纹尺子：去重、覆盖、未覆盖都认它 */
        tries++;
      } while (seen[key] && tries < 6);   /* 同题型出两遍时，尽量不撞同一题干 */
      seen[key] = true;
      qs.push(q);
    });
    S.mode = 'new';
    S.example = false;
    S.back = null;
    var sess = { mod: mod, kind: null, total: qs.length, done: 0, right: 0, t0: Date.now(),
      queue: qs, groupLabel: '本板块 ' + kinds.length + (isItems ? ' 个得分点 · 各 1 题' : ' 个题型 · 每种 1~2 题') };
    sess.replay = function () { startGroupRandom(mod, kinds); };
    S.sess = sess;
    S.view = 'practice';
    nextQuestion();
  }
  /* 专练未覆盖的题：按题型（得分点）排队，一题一抽；某类抽空就换下一个，全空提前收尾。
     题量按「还没做过的题数」封顶，不为了凑满 8 题重复出旧题。 */
  function startNocover(mod, kind) {
    var m = MT.moduleById(mod);
    if (!m) return;
    var queue = [], open = 0;
    kindIdsOf(m).forEach(function (id) {
      if (kind && id !== kind) return;
      var c = coverOf(m.id, id);
      if (c.pct == null || c.open <= 0) return;
      queue.push(id); open += c.open;
    });
    if (!queue.length) {
      alert('这个' + (kind ? '题型' : '模块') + '的题目情境都已经见过了，去「错题本」或「报告」看看哪里还不稳。');
      return;
    }
    S.mode = 'nocover';
    S.example = false;
    S.back = null;
    S.sess = { mod: mod, kind: kind || null, mode: 'nocover', total: Math.min(8, open), done: 0, right: 0,
      t0: Date.now(), queue: queue, sigs: [], skels: [] };
    S.view = 'practice';
    nextQuestion();
  }
  /* 练没练过的题型：模块头按钮用。每个题型抽 1 题，最多 8 题；都练过就退化为全场随机一轮。
     判据走 kindStat（非回炉记录数），不走情境覆盖：老记录没有 skel，数字随机题型没有情境池，
     用 done 判会把「顶点式练过 8 题」误报成没练。队列现场生成，复用普通作答链路。 */
  function startFreshKinds(mod) {
    var m = MT.moduleById(mod);
    if (!m) return;
    var ids = kindIdsOf(m).filter(function (id) { return kindStat(mod, id).n === 0; });
    if (!ids.length) { startSession(mod, null, mod === 'entry' ? 3 : 8); return; }
    var qs = ids.slice(0, 8).map(function (id) { return MT.gen(mod, id, (Math.random() * 1e9) | 0); });
    S.mode = 'new';
    S.example = false;
    S.back = null;
    var sess = { mod: mod, kind: null, total: qs.length, done: 0, right: 0, t0: Date.now(),
      queue: qs, groupLabel: '没练过的题型 · ' + qs.length + ' 个' };
    sess.replay = function () { startFreshKinds(mod); };
    S.sess = sess;
    S.view = 'practice';
    nextQuestion();
  }
  /* 今日任务：用当天固定题单开一轮（不是现场随机） */
  function startDaily(modId) {
    S.back = null;
    var plan = dayPlan();
    var qs = MT.dailyQueue(modId, plan);
    /* 今日任务第 1 题让给未覆盖：同题型换成没见过的情境，题量配比与难度顺序都不动。
       同一天的首题在 firstUncovered 里冻结，答完题再点「开始」也还是这一道（「一天一套」）。
       替换后还要跟同一套后面的题比一次：撞题就放弃替换，守住「同一套内题干不重复」。 */
    if (qs.length) {
      var q1 = firstUncovered(modId, qs[0].kind, plan.seed, plan.day);
      if (q1 && !qs.slice(1).some(function (q) { return sameQ(q, q1); })) qs[0] = q1;
    }
    S.mode = 'new';
    S.example = false;
    S.sess = { mod: modId, kind: null, total: qs.length, done: 0, right: 0, t0: Date.now(), queue: qs, daily: true };
    S.view = 'practice';
    nextQuestion();
  }
  /* 弱项：最近 8 条写解析式记录里，最后一次错的题型 */
  function weakKind() {
    var ws = DB.recs.filter(function (r) { return r.mod === 'write'; }).slice(-8);
    for (var i = ws.length - 1; i >= 0; i--) if (!ws[i].ok) return ws[i].kind;
    return null;
  }
  function startWrong() {
    S.example = false;   /* 例题页残留标记必须清掉，否则回炉会显示例题 */
    S.back = null;
    /* 坏条目（缺 fields 的快照，多半是旧版本或云同步写坏）不能拿去渲染，先清掉，
       否则点「错题回炉」会直接 Cannot read properties of undefined */
    var bad = 0;
    Object.keys(DB.wrong).forEach(function (k) {
      var w = DB.wrong[k];
      if (!w || !Array.isArray(w.fields) || !w.fields.length) { delete DB.wrong[k]; bad++; }
    });
    if (bad) save();
    var now = Date.now();
    var due = window.__ltReview.dueList(DB.wrong, now);
    if (!due.length) {
      var all = Object.keys(DB.wrong).length;
      alert(all ? '错题本里有 ' + all + ' 道，但还没到期（按 1/3/7/14 天档位回炉，到期后连对 2 次才算掌握）。今天先练新的。'
        : (bad ? '有 ' + bad + ' 条错题记录已损坏，已自动清理，现在错题本是空的。' : '错题本是空的，先做几题吧。'));
      return;
    }
    S.mode = 'wrong';
    /* 队列只放本轮真的要做的几道：跳过时顺补的那道才排得进同一个下标序列 */
    S.sess = { mod: 'wrong', kind: null, total: Math.min(due.length, 5), done: 0, right: 0, skipped: 0, supplemented: 0, t0: Date.now(), queue: due.slice(0, Math.min(due.length, 5)) };
    S.view = 'practice';
    nextQuestion();
  }
  /* 回炉轮跳过：难题不硬扛——把这道推到明天（连对进度保留），再从错题本里顺补一道
     本轮还没排过的（最近到期的先补），做题量不缩水。补位题按「练习」判（见 reviewAnswer）。 */
  function skipWrong() {
    var s = S.sess, R = window.__ltReview, now = Date.now();
    var w = DB.wrong[wrongKey(S.q)];
    if (w) R.skip(w, now);
    var used = {};
    Object.keys(DB.wrong).forEach(function (k) { if (s.queue.indexOf(DB.wrong[k]) >= 0) used[k] = 1; });
    var extra = R.pickExtra(DB.wrong, used, now);
    if (extra) { s.queue.push(extra.w); s.total++; s.supplemented = (s.supplemented || 0) + 1; }
    s.skipped = (s.skipped || 0) + 1;
    s.done++;
    save();
    nextQuestion();
  }
  function nextQuestion() {
    var s = S.sess;
    if (s.done >= s.total) { S.view = 'summary'; render(); return; }
    if (s.mode === 'nocover') {
      var qc = null, left = (s.queue || []).slice();
      while (!qc && left.length) {
        qc = pickUncovered(s.mod, left[0], s.skels || []);
        if (!qc) left.shift();
      }
      if (!qc) { s.coveredOut = true; S.view = 'summary'; render(); return; }
      S.q = qc;
      s.skels = s.skels || [];
      s.skels.push(MT.skelOf(qc));
    } else if (S.mode === 'wrong') {
      S.q = s.queue[s.done];
      /* 补位题：还没到期的错题，答对不能算有效确认（会在 reviewAnswer 里走 practice） */
      S.early = !!S.q && !window.__ltReview.isDue(S.q, Date.now());
    } else if (s.queue) {
      S.q = s.queue[s.done];
      S.early = false;
    } else {
      S.q = MT.gen(s.mod, s.kind, (Math.random() * 1e9) | 0);
      S.early = false;
    }
    S.res = null; S.answered = false; S.choice = {}; S.hint = false; S.draft = null; S.lastVals = null; S.t0 = Date.now();
    S.scratch = false;
    S.fix = null;
    render();
  }

  /* 例题：先看一个完整解答（题目 → 答案 → 怎么想 → 图），再开始练 */
  function startExample(mod, kind) {
    if (!MT.moduleById(mod)) mod = 'drill';   /* 兜底：未知模块用基础快练，不抛错 */
    S.example = true;
    S.mode = 'new';
    S.sess = { mod: mod, kind: kind, total: 8, done: 0, right: 0, t0: Date.now() };
    S.q = MT.gen(mod, kind, (Math.random() * 1e9) | 0);
    S.res = null; S.answered = false; S.choice = {}; S.hint = false;
    S.fix = null; S.draft = null; S.lastVals = null; S.t0 = Date.now();
    S.view = 'practice';
    render();
  }
  function renderExample() {
    var q = S.q, s = S.sess;
    app.appendChild(h('div', { class: 'row', style: 'margin-bottom:8px' },
      h('span', { class: 'pill' }, '例题'),
      h('span', { class: 'small muted' }, q.title || ''),
      h('span', { class: 'grow' }),
      h('span', { class: 'small muted' }, '先看懂，再开始练')
    ));
    var card = h('div', { class: 'card' });
    var figEx = figOf(q);
    card.appendChild(h('div', { class: 'qbody', html: fracify(q.prompt) }));
    if (figEx && figEx.need) {
      card.appendChild(h('div', { class: 'figcap' }, figEx.cap || '题图（答题时看这张）'));
      card.appendChild(h('div', { class: 'figbox', html: MT.svgFor({ fig: figEx }) }));
    }
    var ansBox = h('div', { class: 'fb good', style: 'margin-top:14px' });
    ansBox.appendChild(h('div', { class: 'ftitle' }, '答案'));
    var ul = h('ul');
    q.fields.forEach(function (f) {
      ul.appendChild(h('li', { html: (f.label ? escLt(f.label) + ' ' : '') + fracify(MT.ansText(f)) }));
    });
    ansBox.appendChild(ul);
    card.appendChild(ansBox);
    var exBox = h('div', { class: 'fb', style: 'margin-top:10px' });
    exBox.appendChild(h('div', { class: 'ftitle' }, '怎么想'));
    (q.explain || []).forEach(function (line) { exBox.appendChild(h('div', { class: 'small', html: fracify(line) })); });
    card.appendChild(exBox);
    if (figEx && !figEx.need) {
      card.appendChild(h('div', { class: 'figcap' }, figEx.cap || '图象'));
      card.appendChild(h('div', { class: 'figbox', html: MT.svgFor({ fig: figEx }) }));
    }
    card.appendChild(h('div', { class: 'row', style: 'margin-top:14px' },
      h('button', { class: 'btn btn-primary', onclick: function () {
        if (S.back) {
          /* 从练习页点进来的：回到刚才那题，别把今日题单丢掉 */
          var b = S.back; S.back = null;
          S.q = b.q; S.sess = b.sess; S.draft = b.draft; S.choice = b.choice || {}; S.hint = !!b.hint;
          S.res = null; S.answered = false; S.fix = null; S.example = false;
          S.t0 = Date.now();   /* 看例题的时间不算进这题的用时，否则报告里的「平均用时」全被撑大 */
          S.view = 'practice'; render();
          return;
        }
        startSession(s.mod, s.kind, s.mod === 'entry' ? 3 : 8);
      } }, S.back ? '看懂了，回到刚才那题' : '看懂了，开始练'),
      h('button', { class: 'btn', onclick: function () { startExample(s.mod, s.kind); } }, '换一道')
    ));
    app.appendChild(card);
  }

  function renderPractice() {
    if (S.example) { renderExample(); return; }
    var q = S.q, s = S.sess;
    if (!q) { go('today'); return; }
    var head = h('div', { class: 'row', style: 'margin-bottom:8px' },
      h('span', { class: 'pill' }, S.mode === 'wrong' ? '错题回炉' : (MT.moduleById(s.mod).name + (s.groupLabel ? ' · ' + s.groupLabel : ''))),
      h('span', { class: 'small muted' }, (q.title || '')),
      h('span', { class: 'grow' }),
      h('span', { class: 'small muted' }, Math.min(s.done + (S.answered ? 0 : 1), s.total) + ' / ' + s.total)
    );
    app.appendChild(head);
    var prog = h('div', { class: 'progress' }, h('i', { style: 'width:' + (s.done / s.total * 100) + '%' }));
    app.appendChild(prog);

    var card = h('div', { class: 'card', style: 'margin-top:12px' });
    card.appendChild(h('div', { class: 'qhead' },
      h('span', { class: 'pill' }, q.noLabel ? q.noLabel : (q.no ? qnoLabel(q.no) : (q.mod === 'entry' ? '得分点' : '新题'))),
      q.kp ? h('span', { class: 'small muted' }, q.kp.join(' · ')) : null
    ));
    card.appendChild(h('div', { class: 'qbody', html: fracify(q.prompt) }));
    var figP = figOf(q);
    if (figP && figP.need) {
      card.appendChild(h('div', { class: 'figcap' }, figP.cap || '题图（答题时看这张）'));
      card.appendChild(h('div', { class: 'figbox', html: MT.svgFor({ fig: figP }) }));
    }

    q.fields.forEach(function (f, i) {
      if (f.type === 'choice') {
        f.options.forEach(function (opt, oi) {
          var cls = 'opt';
          if (S.answered) { if (oi === f.ans) cls += ' ok'; else if (S.choice[i] === oi) cls += ' bad'; }
          else if (S.choice[i] === oi) cls += ' sel';
          card.appendChild(h('button', {
            class: cls, onclick: function () {
              if (S.answered) return;
              S.choice[i] = oi;
              S.draft = readDraft();   /* 重渲染前先存草稿，已填数字不丢 */
              render();
            }
          }, String.fromCharCode(65 + oi) + '. ' + opt));
        });
      } else if (f.type === 'expr') {
        var ewrap = h('div', { class: 'field' }, h('span', { class: 'lbl' }, f.label + '：'));
        var erow = h('div', { class: 'exprline' });
        var eparts = String(f.tpl || 'y = {}').split('{}');
        eparts.forEach(function (seg, si) {
          if (si > 0) erow.appendChild(h('input', {
            class: 'fone expr-slot', id: 'in' + i + '_' + (si - 1) + '_n', value: draftAt(i, si - 1),
            inputmode: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: '?'
          }));
          if (seg) erow.appendChild(h('span', { class: 'exprtxt' }, seg));
        });
        ewrap.appendChild(erow);
        if (S.answered) ewrap.appendChild(h('span', { class: 'unit', style: 'color:' + (S.res.res[i].ok ? 'var(--ok)' : 'var(--bad)') }, S.res.res[i].ok ? '✓' : '✗'));
        card.appendChild(ewrap);
      } else if (f.type === 'set') {
        var wrap = h('div', { class: 'field' }, h('span', { class: 'lbl' }, f.label + '：'));
        for (var j = 0; j < nSlots(f); j++) {
          wrap.appendChild(numInput('in' + i + '_' + j, draftAt(i, j), S.answered ? (S.res.res[i].ok ? 'ok' : 'bad') : ''));
        }
        card.appendChild(wrap);
      } else {
        card.appendChild(h('div', { class: 'field' },
          h('span', { class: 'lbl' }, f.label),
          numInput('in' + i, draftAt(i), S.answered ? (S.res.res[i].ok ? 'ok' : 'bad') : ''),
          f.unit ? h('span', { class: 'unit' }, f.unit) : null
        ));
      }
    });

    if (!S.answered) {
      card.appendChild(h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn btn-ghost btn-sm', onclick: function () { S.draft = readDraft(); S.scratch = !S.scratch; render(); } }, S.scratch ? '收起草稿' : '草稿纸'),
        h('button', { class: 'btn btn-sm', onclick: function () {
          /* 例题必须和当前这题同题型：今日任务/开始一轮的 sess.kind 是 null，要用当前题的 kind */
          var mod = S.sess.mod === 'wrong' ? ((S.q && S.q.mod) || 'drill') : S.sess.mod;
          var kind = (S.q && S.q.kind) || S.sess.kind || null;
          S.back = { q: S.q, sess: S.sess, draft: readDraft(), choice: S.choice, hint: S.hint };
          startExample(mod, kind);
        } }, '例题'),
        S.mode === 'wrong' ? h('button', { class: 'btn btn-ghost btn-sm', onclick: skipWrong }, '跳过本题（换一道）') : null
      ));
      card.appendChild(h('div', { class: 'small muted' }, '负号写哪儿都算对；系数位只写一个「−」也算 −1；回车提交。'));
      if (S.scratch) card.appendChild(scratchPad());
    }

    if (q.tip && !S.answered && S.hint) card.appendChild(h('div', { class: 'tipbox', html: '提示：' + fracify(q.tip) }));

    if (!S.answered) {
      card.appendChild(h('div', { class: 'row', style: 'margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: submit }, '提交'),
        h('button', { class: 'btn btn-ghost', onclick: function () { S.draft = readDraft(); S.hint = true; render(); } }, S.hint ? '提示已展开' : '看提示'),
        h('span', { class: 'grow' }),
        h('span', { class: 'small muted' }, '回车提交')
      ));
    } else {
      var fb = h('div', { class: 'fb ' + (S.res.ok ? 'good' : 'bad') });
      fb.appendChild(h('div', { class: 'ftitle' }, S.res.ok ? '✓ 全对' : '✗ 差一点（' + S.res.got + '/' + S.res.total + ' 个空对）'));
      var ul = h('ul');
      q.fields.forEach(function (f, i) {
        ul.appendChild(h('li', {
          html: (f.label ? escLt(f.label) + ' ' : '') + '正确答案：' + fracify(MT.ansText(f)) +
            (S.res.res[i].ok ? '' : '（你填的是 ' + fracify(rawAns(i)) + '）')
        }));
      });
      fb.appendChild(ul);
      (q.explain || []).forEach(function (line) { fb.appendChild(h('div', { class: 'small', html: fracify(line) })); });
      if (figP && !figP.need) {
        fb.appendChild(h('div', { class: 'figcap' }, '图象验证：上面的式子画出来是这样——对着图再读一遍顶点、交点、增减。'));
        fb.appendChild(h('div', { class: 'figbox', html: MT.svgFor({ fig: figP }) }));
      }
      card.appendChild(fb);

      /* 答错必须订正：把正确答案重新填一遍，对了才出现「下一题」 */
      if (S.fix && !S.fix.ok) {
        var fxb = h('div', { class: 'fb', style: 'margin-top:10px' });
        fxb.appendChild(h('div', { class: 'ftitle' }, '订正：照着上面的解析，把正确答案重新填一遍'));
        S.fix.fields.forEach(function (i) {
          var f = q.fields[i];
          if (f.type === 'expr') {
            var ew = h('div', { class: 'field' }, h('span', { class: 'lbl' }, f.label + '：'));
            var er = h('div', { class: 'exprline' });
            String(f.tpl || 'y = {}').split('{}').forEach(function (seg, si) {
              if (si > 0) er.appendChild(h('input', { class: 'fone expr-slot', id: 'fx' + i + '_' + (si - 1), placeholder: '?' }));
              if (seg) er.appendChild(h('span', { class: 'exprtxt' }, seg));
            });
            ew.appendChild(er);
            fxb.appendChild(ew);
          } else if (f.type === 'set') {
            var w = h('div', { class: 'field' }, h('span', { class: 'lbl' }, f.label + '：'));
            for (var j = 0; j < nSlots(f); j++) w.appendChild(h('input', { class: 'fone', id: 'fx' + i + '_' + j, placeholder: '数字' }));
            fxb.appendChild(w);
          } else {
            fxb.appendChild(h('div', { class: 'field' },
              h('span', { class: 'lbl' }, f.label),
              h('input', { class: 'fone', id: 'fx' + i, placeholder: '数字' }),
              f.unit ? h('span', { class: 'unit' }, f.unit) : null
            ));
          }
        });
        if (S.fix.tries) fxb.appendChild(h('div', { class: 'small', style: 'color:var(--bad)' }, '还不对（第 ' + S.fix.tries + ' 次），再对一下上面的解析。'));
        fxb.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
          h('button', { class: 'btn btn-primary btn-sm', onclick: submitFix }, '订正'),
          h('span', { class: 'small muted' }, '订正对了才能下一题')
        ));
        card.appendChild(fxb);
      } else if (S.fix && S.fix.ok) {
        card.appendChild(h('div', { class: 'small', style: 'color:var(--ok);margin-top:8px' }, '✓ 已订正'));
      }

      if (S.res.ok || !S.fix || S.fix.ok) {
        card.appendChild(h('div', { class: 'row', style: 'margin-top:14px' },
          h('button', { class: 'btn btn-primary', onclick: next }, s.done >= s.total ? '看本轮总结' : '下一题 →')
        ));
      }
    }
    app.appendChild(card);

    /* 自动聚焦第一个空：打开题就能直接打字 */
    if (!S.answered) {
      setTimeout(function () {
        var el = document.querySelector ? document.querySelector('.fone') : null;
        if (el && el.focus) { try { el.focus(); } catch (e) { } }
      }, 30);
    }
  }
  /* 一个字段要填几个数：expr 看模板空数，set 看 n */
  function nSlots(f) { return f.type === 'expr' ? (f.ans || []).length : f.n; }
  function draftAt(i, j) {
    var d = S.draft && S.draft[i];
    if (d == null) return '';
    if (j != null) d = d[j];
    return (typeof d === 'string') ? d : '';
  }
  /* 普通输入框：整数、小数、分数（1/2 或 ½）都能直接打；负号写哪儿都算对 */
  function numInput(base, val, cls) {
    var v = (val && typeof val === 'object') ? (val.n || '') : (val || '');
    return h('div', { class: 'fin ' + (cls || '') },
      h('input', {
        class: 'fone', id: base + '_n', value: v, inputmode: 'text', autocomplete: 'off', spellcheck: 'false',
        placeholder: '数字'
      })
    );
  }
  /* 草稿纸：鼠标 / 手指 / 触控笔都能写，不识别，只当纸用 */
  function scratchPad() {
    var cv = h('canvas', { class: 'pad', width: 900, height: 420 });
    var wrap = h('div', { class: 'padwrap' },
      cv,
      h('div', { class: 'row', style: 'margin-top:6px' },
        h('button', { class: 'btn btn-sm', onclick: function (e) { cv._pen = !cv._pen; e.currentTarget.textContent = cv._pen ? '工具：橡皮' : '工具：笔'; } }, '工具：笔'),
        h('button', {
          class: 'btn btn-sm', onclick: function () {
            var g = cv.getContext && cv.getContext('2d');
            if (g) g.clearRect(0, 0, cv.width, cv.height);
          }
        }, '清空')
      )
    );
    setTimeout(function () { setupCanvas(cv); }, 0);
    return wrap;
  }
  function setupCanvas(cv) {
    if (!cv.getContext) return;
    var g = cv.getContext('2d');
    var drawing = false, last = null;
    function pos(e) {
      var r = cv.getBoundingClientRect();
      var sx = cv.width / (r.width || 1), sy = cv.height / (r.height || 1);
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }
    function pen() {
      g.strokeStyle = cv._pen ? '#ffffff' : '#1b2333';
      g.fillStyle = cv._pen ? '#ffffff' : '#1b2333';
      g.lineWidth = cv._pen ? 16 : 3.5;
      g.lineCap = 'round'; g.lineJoin = 'round';
    }
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); drawing = true; last = pos(e); pen();
      g.beginPath(); g.arc(last.x, last.y, cv._pen ? 8 : 1.7, 0, 6.3); g.fill();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
      last = p;
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      cv.addEventListener(ev, function () { drawing = false; });
    });
  }
  function toggleSign(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = String(el.value || '');
    el.value = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
  }
  function readFracObj(base) {
    var el = document.getElementById(base + '_n');
    return el ? String(el.value || '') : '';
  }
  /* 题干/解析走 innerHTML，但数学里的 `0<x<5`、`a<b` 会被浏览器当成标签起始，
     一路吞到下一个 `>`（`<x<5 …</span>` 整段消失，孩子看到的就是半截话）。
     这里只放行白名单标签，其余 `<` 一律转义。先把合法标签换成占位符，避免误伤。 */
  var SAFE_TAGS = /<\/?(?:br|span|b|i|sub|sup)\b[^<>]*>/gi;
  function escLt(s) {
    var keep = [];
    var t = String(s == null ? '' : s).replace(SAFE_TAGS, function (m) {
      keep.push(m);
      return '\u0001' + (keep.length - 1) + '\u0001';
    });
    t = t.replace(/</g, '&lt;');
    return t.replace(/\u0001(\d+)\u0001/g, function (m, i) { return keep[+i]; });
  }
  /* 把文本里的 1/2、-1/2、1/-2 都显示成上下结构的分数（负号统一放分子前） */
  function fracify(s) {
    return escLt(s).replace(/([−-]?)(\d+)\s*\/\s*([−-]?)(\d+)/g, function (m, sa, a, sb, b) {
      var neg = (sa === '-' || sa === '−') !== (sb === '-' || sb === '−');
      return '<span class="frac"><i>' + (neg ? '−' : '') + a + '</i><i>' + b + '</i></span>';
    });
  }
  function readDraft() {
    var out = [];
    S.q.fields.forEach(function (f, i) {
      /* 选择也算草稿的一部分：重渲染/存草稿时别把已选的选项抹掉，
         提交时只读这一份，避免 S.choice 与 S.draft 各说各话（2026-11-26 修） */
      if (f.type === 'choice') {
        var c = S.choice[i] != null ? S.choice[i] : (S.draft && typeof S.draft[i] === 'number' ? S.draft[i] : '');
        out.push(c); return;
      }
      if (f.type === 'set' || f.type === 'expr') {
        var arr = [];
        for (var j = 0; j < nSlots(f); j++) arr.push(readFracObj('in' + i + '_' + j));
        out.push(arr);
      } else out.push(readFracObj('in' + i));
    });
    return out;
  }
  function rawAns(i) {
    var f = S.q.fields[i], v = (S.lastVals || [])[i];
    if (f.type === 'choice') {
      var c = S.choice[i] != null ? S.choice[i] : (v != null ? v : '');
      return (typeof c === 'number' && c >= 0) ? String.fromCharCode(65 + c) : '未选';
    }
    if (f.type === 'set' || f.type === 'expr') {
      return (v || []).map(function (o) { return o ? String(o) : '空'; }).join('、');
    }
    return v ? String(v) : '空';
  }

  /* ---------- 当日题单快照：那天到底做了哪几题（复盘用，只留最近 14 天） ---------- */
  var SNAP_DAYS = 14;
  /* 同一天同一题可能做两遍，所以键要带时间戳；只按题干去重会把第二遍吞掉 */
  function snapKey(q) { return [q.mod || '', q.kind || '', q.p || '', q.t || 0].join('|'); }
  function snapAdd(mod, q, res, sec) {
    var k = today();
    var d = DB.days[k] || (DB.days[k] = { qs: [] });
    d.qs.push({
      mod: mod, kind: q.kind || '', kn: q.title || '',
      p: String(q.prompt || '').replace(/<br>/g, ' ').slice(0, 160),
      a: (q.fields || []).map(function (f) { return MT.ansText(f); }).join('；').slice(0, 140),
      ok: !!res.ok, sec: sec, t: Date.now()
    });
    var keys = dayKeys();
    while (keys.length > SNAP_DAYS) delete DB.days[keys.shift()];
  }

  function submit() {
    if (S.answered || S.example) return;
    var q = S.q;
    var draft = readDraft();
    /* 有任何一个空没填就不判分、不记记录、不进错题本。
       以前只在「全空」时才拦，漏选一个依据照样判分：页面报「2/3 个空对」、
       题目被塞进错题本，孩子以为自己填对了却被判错（2026-11-26 修）。
       选择题的值统一从 draft 读（readDraft 已把 S.choice 并进去），不再两处状态来源。 */
    function emptyField(f, i) {
      var d = draft[i];
      if (f.type === 'choice') return !(typeof d === 'number' && d >= 0);
      if (Array.isArray(d)) return !d.some(function (x) { return String(x == null ? '' : x).trim() !== ''; });
      return String(d == null ? '' : d).trim() === '';
    }
    var missing = [];
    q.fields.forEach(function (f, i) { if (emptyField(f, i)) missing.push(i); });
    if (missing.length) {
      var names = missing.map(function (i) { return q.fields[i].label || ('第 ' + (i + 1) + ' 空'); });
      alert('还没填完：' + names.join('、') + '。选择题要先点一下选项。');
      return;
    }
    var vals = q.fields.map(function (f, i) {
      if (f.type === 'choice') return draft[i];
      /* 原始输入 → 判分数值统一走 core.fieldVals：系数位只写一个「−」按 −1 判（2026-11-26） */
      return MT.fieldVals(f, draft[i]);
    });
    var res = MT.judge(q, vals);
    S.lastVals = draft;
    S.draft = draft;
    var fixIdx = [];
    if (!res.ok) {
      q.fields.forEach(function (f, i) { if (!res.res[i].ok && f.type !== 'choice') fixIdx.push(i); });
    }
    S.fix = fixIdx.length ? { fields: fixIdx, ok: false, tries: 0 } : null;
    var sec = Math.max(1, Math.round((Date.now() - S.t0) / 1000));
    S.res = res; S.answered = true;
    var s = S.sess;
    s.done++;
    if (res.ok) s.right++;
    var recMod = s.mod === 'wrong' ? (S.q.mod || 'drill') : s.mod;
    /* qid 要和历史记录兼容：entry 的 kind 现在是得分点 id，拼进去会把老记录拆成两条 */
    var qid = recMod + '.' + (q.mod === 'entry' ? '' : (q.kind || '')) + '.' + String(q.title || '');
    DB.recs.push({ ts: Date.now(), mod: recMod, kind: q.kind, kn: q.title, ok: res.ok, got: res.got, total: res.total, sec: sec, hint: S.hint, mode: S.mode, daily: !!s.daily,
      qid: qid, sig: MT.sigOf(q), skel: MT.skelOf(q) });
    /* 记住这个模块最近练的题型：模块页「先看例题」用它，别随机抽到别的题型 */
    if (q.kind) { DB.meta.lastKind = DB.meta.lastKind || {}; DB.meta.lastKind[recMod] = q.kind; }
    snapAdd(s.mod === 'wrong' ? (S.q.mod || 'drill') : s.mod, q, res, sec);
    reviewAnswer(q, res.ok, sec, qid);   /* 统一错题回炉（ADR-0010）：连对2次+行为约束才算掌握 */
    save();
    render();
  }
  function submitFix() {
    if (!S.fix || S.fix.ok) return;
    var q = S.q, fields = [], vals = [];
    S.fix.fields.forEach(function (i) {
      var f = q.fields[i], raw;
      fields.push(f);
      if (f.type === 'set' || f.type === 'expr') {
        raw = [];
        for (var j = 0; j < nSlots(f); j++) {
          var el = document.getElementById('fx' + i + '_' + j);
          raw.push(el ? el.value : '');
        }
      } else {
        var el2 = document.getElementById('fx' + i);
        raw = el2 ? el2.value : '';
      }
      /* 订正与提交同一把尺子：系数位写「−」也算 −1，否则孩子订正时照样被判错 */
      vals.push(MT.fieldVals(f, raw));
    });
    var r = MT.judge({ fields: fields }, vals);
    if (r.ok) {
      S.fix.ok = true;
      var last = DB.recs[DB.recs.length - 1];
      if (last) last.fixed = true;
      save();
    } else {
      S.fix.tries++;
    }
    render();
  }

  function next() {
    if (S.sess.done >= S.sess.total) { S.view = 'summary'; render(); return; }
    nextQuestion();
  }

  /* ---------- 错题本（共享回炉内核 ADR-0010，规则只在 工具/trainer/review.js） ---------- */
  function wrongKey(q) { return q.id + '|' + String(q.prompt).slice(0, 60); }
  /* 原题裁切图（第 12 周）不进错题本：base64 动辄几十 KB，快照只存 cropKey，渲染时按 key 重建 */
  function figOf(q) {
    if (q.fig) return q.fig;
    if (q.cropKey && MT.cropFig) return MT.cropFig({ key: q.cropKey, cap: q.cropCap });
    return null;
  }
  /* 数学最短有效用时：选择/填空 3 秒，写解析式/大题前两步(entry，含单空题) 10 秒 */
  function minSecOf(q) { return (q.mod === 'write' || q.mod === 'entry' || (q.fields && q.fields.length > 1)) ? 10 : 3; }
  function reviewAnswer(q, ok, sec, qid) {
    var R = window.__ltReview, k = wrongKey(q), w = DB.wrong[k], now = Date.now();
    if (R.migrate(w, now)) save();
    if (!ok) {
      if (!w) {
        w = { id: q.id, qid: qid, mod: q.mod || S.sess.mod, kind: q.kind, title: q.title, prompt: q.prompt,
          fields: q.fields, explain: q.explain, tip: q.tip, no: q.no, noLabel: q.noLabel,
          cropKey: q.cropKey, cropCap: q.cropCap, fig: q.cropKey ? null : q.fig };
        DB.wrong[k] = w;
      }
      if (qid && !w.qid) w.qid = qid;   /* 旧条目补 qid，供历史错题清单匹配 */
      R.onWrong(w, now);
      return;
    }
    /* 补位题（还没到期）：答对只记一下时间，不加连对也不清零、不重排 due */
    if (S.early) { R.practice(w, true, now); return; }
    var sig = { sec: sec, minSec: minSecOf(q), hint: !!S.hint, fixed: false };
    var act = R.onPass(w, sig, now);
    if (act === 'mastered') delete DB.wrong[k];
  }

  /* ---------- 本轮总结 ---------- */
  function renderSummary() {
    var s = S.sess;
    var mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
    /* 专练未覆盖会提前收尾：分母按实际做了几题算，别显示 5/8 好像欠了 3 题 */
    var total = s.coveredOut ? s.done : s.total;
    /* 跳过的不算分母：否则跳过一题会把正确率拉低，孩子会以为自己做错了 */
    var answered = Math.max(0, total - (s.skipped || 0));
    app.appendChild(h('div', { class: 'card', style: 'text-align:center;padding:28px 18px' },
      h('div', { style: 'font-size:44px;line-height:1.1' }, s.right === total ? '🎉' : (s.right / (total || 1) >= .6 ? '👍' : '💪')),
      h('h2', { style: 'margin:8px 0 4px' }, s.right + ' / ' + (answered || total) + ' 全对'),
      h('p', { class: 'muted' }, '用时约 ' + mins + ' 分钟 · 正确率 ' + pct(s.right, answered || total || 1) + '%' +
        (s.skipped ? ' · 跳过 ' + s.skipped + ' 题（明天再来' + (s.supplemented ? '，已顺补 ' + s.supplemented + ' 题' : '') + '）' : '') +
        (s.coveredOut ? ' · 这个范围里没做过的题已经做完了' : '')),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: function () {
          if (s.mode === 'nocover') startNocover(s.mod, s.kind);
          else if (s.replay) s.replay();
          else if (s.mod === 'wrong') startWrong();
          else if (s.daily) startDaily(s.mod);
          else startSession(s.mod, s.kind, s.total);
        } }, '再来一轮'),
        h('button', { class: 'btn', onclick: function () { go('today'); } }, '回今日')
      )
    ));
    var tips = [];
    if (s.right / (total || 1) < .6) tips.push('正确率偏低：先点「看提示」把例题看懂，再独立做一遍。');
    if (s.mod === 'write' && s.right / (total || 1) < .8) tips.push('写解析式的目标是一次就对：设 → 代 → 求，三步各写一行。');
    if (s.mod === 'entry' && s.right / (total || 1) < .7) tips.push('前两步的关键是「先落笔」：写出设、列出式子，比算完更重要。');
    if (tips.length) app.appendChild(h('div', { class: 'card' }, h('b', null, '下一步'), tips.map(function (t) { return h('p', { class: 'small' }, '· ' + t); })));
  }

  /* ---------- 报告 ---------- */
  function renderReport() {
    var recs = DB.recs;
    var ok = recs.filter(function (r) { return r.ok; }).length;
    var secs = recs.reduce(function (a, r) { return a + (r.sec || 0); }, 0);
    app.appendChild(h('div', { class: 'grid' },
      statCard('累计题数', recs.length),
      statCard('总正确率', recs.length ? pct(ok, recs.length) + '%' : '—'),
      statCard('累计用时', recs.length ? fmtSec(secs) : '—'),
      statCard('错题本', Object.keys(DB.wrong).length)
    ));

    /* 知识覆盖面：分母 = 每个题型的「不同情境数」（core 的 SKELS），按模块汇总 */
    var covDone = 0, covPool = 0, covLegacy = 0, covRows = h('div');
    MT.modules.forEach(function (m) {
      var c = coverOfMod(m);
      covLegacy += c.legacy || 0;
      if (c.pool) { covDone += c.done; covPool += c.pool; }
      covRows.appendChild(h('div', { style: 'margin-top:10px' },
        h('div', { class: 'row' }, h('b', { class: 'small' }, m.icon + ' ' + m.name), h('span', { class: 'grow' }),
          h('span', { class: 'small muted' }, c.pct == null ? '不限量 · 已练 ' + c.done : c.done + ' / ' + c.pool + ' · ' + c.pct + '%')),
        h('div', { class: 'bar', style: 'margin-top:4px' },
          h('i', { style: 'width:' + (c.pct || 0) + '%' }))));
    });
    app.appendChild(h('div', { class: 'card', style: 'margin-top:16px' },
      h('h3', { style: 'margin-top:0' }, '知识覆盖面（见过多少个不同情境）'),
      h('p', { class: 'small muted', style: 'margin:0 0 4px' },
        '全科 ' + covDone + ' / ' + covPool + ' 个情境（' + pct(covDone, covPool || 1) + '%）。分母是每个题型的「不同情境数」——' +
        '题干抹平数字后去重：同一句话换十几次数值只算一个情境，所以这个百分比涨得动，也更能看出哪里没见过。' +
        '纯数字随机的题型（判别式、写解析式各题型）不计百分比。' +
        (covLegacy ? '另有 ' + covLegacy + ' 条早期记录没有情境指纹，不知道属于哪个情境，未计入分子。' : '')),
      covRows));

    /* 按模块 */
    var byMod = {};
    recs.forEach(function (r) { var k = r.mod; (byMod[k] = byMod[k] || []).push(r); });
    var t1 = h('table', { class: 'tb' }, h('tr', null, h('th', null, '模块'), h('th', { class: 'n' }, '题数'), h('th', { class: 'n' }, '正确率'), h('th', { class: 'n' }, '平均用时')));
    Object.keys(byMod).forEach(function (k) {
      var rs = byMod[k], o = rs.filter(function (r) { return r.ok; }).length;
      var name = (MT.moduleById(k) || {}).name || k;
      t1.appendChild(h('tr', null, h('td', null, name), h('td', { class: 'n' }, rs.length), h('td', { class: 'n' }, pct(o, rs.length) + '%'), h('td', { class: 'n' }, fmtSec(rs.reduce(function (a, r) { return a + r.sec; }, 0) / rs.length))));
    });
    app.appendChild(h('div', { class: 'card', style: 'margin-top:16px' }, h('h3', { style: 'margin-top:0' }, '按模块'), t1));

    /* 按题型（≥5 题才显示） */
    var byKind = {};
    recs.forEach(function (r) { (byKind[r.kn || r.kind] = byKind[r.kn || r.kind] || []).push(r); });
    var rows = Object.keys(byKind).filter(function (k) { return byKind[k].length >= 5; }).sort(function (a, b) { return byKind[a].length - byKind[b].length; });
    var t2 = h('table', { class: 'tb' }, h('tr', null, h('th', null, '题型'), h('th', { class: 'n' }, '题数'), h('th', { class: 'n' }, '正确率')));
    rows.forEach(function (k) {
      var rs = byKind[k], o = rs.filter(function (r) { return r.ok; }).length;
      t2.appendChild(h('tr', null, h('td', null, k), h('td', { class: 'n' }, rs.length), h('td', { class: 'n' }, pct(o, rs.length) + '%')));
    });
    if (!rows.length) t2.appendChild(h('tr', null, h('td', { colspan: 3, class: 'muted small' }, '每个题型练满 5 题后显示')));
    app.appendChild(h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '按题型（弱项在前）'), t2));

    /* 近 7 天 */
    var days = [], maxN = 1;
    for (var i = 6; i >= 0; i--) {
      var t = new Date(Date.now() - i * MT.DAY);
      var k = dayKey(t.getTime());
      var n = recs.filter(function (r) { return dayKey(r.ts) === k; }).length;
      maxN = Math.max(maxN, n);
      days.push({ label: (t.getMonth() + 1) + '/' + t.getDate(), n: n });
    }
    var spark = h('div', { class: 'spark' });
    days.forEach(function (x) {
      spark.appendChild(h('div', { class: 'col' },
        h('i', { style: 'height:' + Math.max(2, Math.round(x.n / maxN * 52)) + 'px' }),
        h('span', null, x.label)
      ));
    });
    app.appendChild(h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '近 7 天题数'), spark));

    /* 错题本 */
    var ws = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 10);
    var wc = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '错题本（最近 10 条）'));
    if (!ws.length) wc.appendChild(h('div', { class: 'empty' }, '还没有错题'));
    ws.forEach(function (w) {
      var dueTxt = window.__ltReview.statusText(w);
      /* 预览只留纯文字：题干里的 <span class="muted small">、<br> 去掉后再转义，
         否则「0<x<5」这类会被 HTML 解析器吃掉半句话 */
      var brief = String(w.prompt == null ? '' : w.prompt).replace(/<[^<>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      wc.appendChild(h('div', { class: 'wrongitem' },
        h('div', { class: 'wt', html: escLt(brief.slice(0, 80)) + (brief.length > 80 ? '…' : '') }),
        h('div', { class: 'small muted' }, dueTxt)
      ));
    });
    wc.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn btn-primary btn-sm', onclick: startWrong }, '回炉到期的')
    ));
    app.appendChild(wc);

    /* 历史错题清单：从 recs 聚合整学期曾错过的题（掌握后移出错题本仍留档） */
    var hist = window.__ltReview.everWrong(DB.recs, DB.wrong);
    var hc = h('div', { class: 'card' },
      h('h3', { style: 'margin-top:0' }, '曾经错过的题（期末复盘 · ' + hist.length + ' 道）'),
      h('p', { class: 'small muted', style: 'margin:0 0 8px' }, '按错次排序。移到「已掌握」的题仍留档；错题库已清的浏览器无历史，导出 JSON 可长期保存。'));
    if (!hist.length) hc.appendChild(h('div', { class: 'empty' }, '还没有答错的记录'));
    else {
      var ht = h('table', { class: 'tb' }, h('tr', null,
        h('th', null, '题目'), h('th', { class: 'n' }, '错/对'), h('th', null, '首错'), h('th', null, '末错'), h('th', null, '状态')));
      hist.forEach(function (e) {
        ht.appendChild(h('tr', null,
          h('td', null, e.label.slice(0, 40)),
          h('td', { class: 'n' }, e.wrong + '/' + e.okCount),
          h('td', null, window.__ltReview.dayText(e.firstWrongAt)),
          h('td', null, window.__ltReview.dayText(e.lastWrongAt)),
          h('td', null, e.inBook ? '在错题本' : '已掌握')));
      });
      hc.appendChild(ht);
    }
    app.appendChild(hc);

    /* 当日题单快照（最近 14 天，按天倒序） */
    var dkeys = dayKeys().reverse();
    var dc = h('div', { class: 'card' },
      h('h3', { style: 'margin-top:0' }, '题单快照（最近 14 天）'),
      h('p', { class: 'small muted', style: 'margin:0 0 8px' }, '每天做过的题逐条留档：题干、答案、对错、用时；导出 JSON 会一起带走。'));
    if (!dkeys.length) dc.appendChild(h('div', { class: 'empty' }, '还没有记录'));
    dkeys.forEach(function (k) {
      var d = DB.days[k];
      var qs = d.qs || [];
      var okN = qs.filter(function (x) { return x.ok; }).length;
      var sum = qs.reduce(function (a, x) { return a + (x.sec || 0); }, 0);
      dc.appendChild(h('div', { class: 'snapday' },
        h('div', { class: 'snaph' }, h('b', null, k),
          h('span', { class: 'small muted' }, ' · ' + qs.length + ' 题 · 对 ' + okN + ' · ' + fmtSec(sum))),
        h('div', null, qs.map(function (x) {
          return h('div', { class: 'snapq small' },
            h('span', { class: x.ok ? 'ok' : 'bad' }, x.ok ? '✓ ' : '✗ '),
            h('span', null, (x.kn ? '[' + x.kn + '] ' : '') + x.p + ' → ' + x.a));
        }))
      ));
    });
    app.appendChild(dc);

    /* 数据 */
    var data = h('div', { class: 'card' },
      h('h3', { style: 'margin-top:0' }, '数据'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm', onclick: exportJSON }, '导出 JSON'),
        h('button', { class: 'btn btn-sm', onclick: importJSON }, '导入 JSON'),
        h('button', { class: 'btn btn-sm', onclick: selfCheck }, '自检（每组 120 题）'),
        h('button', { class: 'btn btn-sm', style: 'color:#d93025', onclick: clearAll }, '清空记录')
      ),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn btn-sm', onclick: runSync }, '云同步（跨设备）'),
        h('button', { class: 'btn btn-sm btn-ghost', title: 'PAT 怎么生成', onclick: function () { alert(window.__ltSyncUI.patHelp); } }, 'PAT 是什么？'),
        h('input', { id: 'syncPat', type: 'password', placeholder: 'GitHub PAT（存本机）', style: 'flex:1;min-width:160px;padding:6px;border:1px solid var(--line);border-radius:8px' }),
        h('span', { id: 'syncMsg', class: 'small muted' })
      ),
      h('p', { class: 'small muted', style: 'margin-bottom:0' }, '记录只在本机浏览器；清缓存 / 换设备前先导出，放进 学习记录/。')
    );
    app.appendChild(data);
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    var t = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = '数学训练记录-' + t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  function importJSON() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(String(fr.result));
          if (!o || o.v !== MT.VERSION || !Array.isArray(o.recs)) throw new Error('格式不对');
          /* recs/wrong 与云同步共用同一合并函数（merge.mjs 内联），同份导入两次不翻倍。
             脚手架族 recs 带 kn 无 prompt，合并键取 prompt[:40]||kn，见 ADR-0007 决定 4。
             days 是设备态、不进云同步载体；本地导入仍需它算连续天数，故照原样合并。 */
          var before = DB.recs.length;
          var merged = window.__ltMerge.mergeRecords(DB, o);
          DB.recs = merged.recs;
          Object.keys(merged.wrong || {}).forEach(function (k) {
            var w = merged.wrong[k];
            if (!w || !Array.isArray(w.fields) || typeof w.due !== 'number') return;   /* 结构坏的错题跳过 */
            DB.wrong[k] = w;
          });
          var added = DB.recs.length - before;
          Object.keys(o.days || {}).forEach(function (k) {
            var src = o.days[k];
            if (!src || !Array.isArray(src.qs)) return;
            var dst = DB.days[k] || (DB.days[k] = { qs: [] });
            var seen = {};
            dst.qs.forEach(function (q) { if (q && typeof q === 'object') seen[snapKey(q)] = 1; });
            src.qs.forEach(function (q) {
              if (!q || typeof q !== 'object') return;
              var sk = snapKey(q);
              if (seen[sk]) return;   /* 同一份文件导两次，题单快照不该翻倍 */
              seen[sk] = 1;
              dst.qs.push(q);
            });
          });
          save(); render(); alert('已导入 ' + added + ' 条记录（重复的已跳过）');
        } catch (e) { alert('导入失败：' + e.message); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }
  function runSync() {
    if (!window.__ltSyncUI) { alert('云同步组件未加载'); return; }
    var patEl = document.getElementById('syncPat');
    if (patEl && patEl.value) window.__ltSyncUI.setPAT(patEl.value);
    window.__ltSyncUI.run();
  }
  function selfCheck() {
    var t0 = Date.now();
    var r = MT.selfTest(120);
    alert('自检：' + r.count + ' 题，' + (r.fails.length ? r.fails.length + ' 处失败\n' + r.fails.slice(0, 8).join('\n') : '全部通过') + '\n用时 ' + (Date.now() - t0) + ' ms');
  }
  function clearAll() {
    if (!confirm('清空所有记录和错题？建议先导出。')) return;
    DB = blankDB(); save(); render();
  }

  /* ---------- 启动 ---------- */
  Array.prototype.forEach.call(tabs.children, function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-go');
      if (v === 'today') { go('today'); return; }
      if (v === 'report') { go('report'); return; }
      go(v); /* 模块页：题型列表 + 例题 + 开始练 */
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || S.view !== 'practice' || S.example) return;
    /* 焦点在按钮上（尤其是「依据」选项、提交/下一题）时，回车属于这个按钮本身：
       浏览器会派发 click。这里若抢先 preventDefault + submit，选项的 click 就被吃掉，
       出现「点了 B、填空也对，却按 2/3 判错」（回炉三字段题最容易踩，2026-11-26 修）。 */
    if (e.target && String(e.target.tagName || '').toUpperCase() === 'BUTTON') return;
    e.preventDefault();
    if (!S.answered) { submit(); return; }
    if (S.fix && !S.fix.ok) { submitFix(); return; }
    next();
  });
  /* 段三：云同步适配层注入宿主接口（DB 读写/通知），报告页「云同步」按钮触发 runSync */
  if (window.__ltSyncUI) window.__ltSyncUI.init({
    getDB: function () { return DB; },
    setDB: function (d) { DB = normalizeDB(d); save(); render(); },   /* 云端回写也要过一遍规整，坏数据不能进内存 */
    notify: function (msg) { var el = document.getElementById('syncMsg'); if (el) el.textContent = msg; }
  });
  (function boot() {
    var m = (location.hash || '').match(/view=([a-z]+)/);
    var v = m && m[1];
    if (MT.moduleById(v)) { go(v); return; }   /* 模块页：drill / write / entry / week12…按注册表走，加模块不用改这里 */
    if (v === 'report') { go('report'); return; }
    go('today');
  })();

  /* 调试/自测钩子：不参与界面，供 node 里的 DOM 桩测试使用 */
  window.__mt = {
    S: S, db: function () { return DB; },
    fracify: fracify, escLt: escLt, normalizeDB: normalizeDB,
    startSession: startSession, startWrong: startWrong, startDaily: startDaily, startExample: startExample,
    startGroupRandom: startGroupRandom, startNocover: startNocover, startFreshKinds: startFreshKinds,
    cover: coverOf, coverMod: coverOfMod,
    plan: function () { return dayPlan(); },
    submit: submit, submitFix: submitFix, next: next, go: go, render: render,
    skipWrong: skipWrong
  };
})();
