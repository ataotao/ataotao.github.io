(function () {
  'use strict';
  var KEY = 'physTrain_v1';
  var app = document.getElementById('app');
  var tabs = document.getElementById('tabs');

  /* ---------- 存储 ---------- */
  function devId() { return window.__ltSyncUI ? window.__ltSyncUI.deviceId() : undefined; }
  function blankDB() { return { v: PT.VERSION, deviceId: devId(), recs: [], wrong: {}, meta: { created: Date.now() } }; }
  var DB = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankDB();
      var o = JSON.parse(raw);
      if (!o || o.v !== PT.VERSION) return blankDB();
      if (!o.deviceId && window.__ltSyncUI) o.deviceId = devId();   /* 旧记录补 deviceId */
      o.recs = o.recs || []; o.wrong = o.wrong || {}; o.meta = o.meta || {};
      o.meta.lastRound = o.meta.lastRound || {};   /* 兼容旧记录：没有就不去重 */
      return o;
    } catch (e) { return blankDB(); }
  })();
  var SAVE_FAIL = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); SAVE_FAIL = false; }
    catch (e) { SAVE_FAIL = true; }
  }
  function dayKey(ts) { var t = new Date(ts); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }
  function today() { return dayKey(Date.now()); }

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
      if (Array.isArray(kid)) {
        kid.forEach(function (x) {
          if (x != null && x !== false) e.appendChild(typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x);
        });
      } else e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return e;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function fmtSec(s) { s = Math.round(s); return s < 60 ? s + ' 秒' : Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'; }
  function todayRecs() { var t = today(); return DB.recs.filter(function (r) { return dayKey(r.ts) === t; }); }
  function figBlock(desc, cap) {
    var svg = PT.svgFor({ fig: desc });
    if (!svg) return null;
    var box = h('div', { class: 'figbefore' });
    if (cap) box.appendChild(h('div', { class: 'small muted', style: 'margin-bottom:2px' }, cap));
    box.appendChild(h('div', { class: 'figbox', html: svg }));
    return box;
  }

  /* ---------- 状态 ---------- */
  var S = {
    view: 'today', sess: null, q: null, res: null, answered: false,
    choice: {}, draw: {}, hint: false, t0: 0, mode: 'new', draft: null, lastVals: null,
    scratch: false, fix: null, example: false
  };

  /* ---------- 路由 ---------- */
  var VIEWS = {
    today: renderToday, model: renderModule, amount: renderModule, calc: renderModule,
    draw: renderModule, read: renderModule, wrong: renderWrong, report: renderReport,
    practice: renderPractice, summary: renderSummary
  };
  function go(view) { S.view = view; render(); try { window.scrollTo(0, 0); } catch (e) { } }
  function render() {
    clear(app);
    var fn = VIEWS[S.view] || renderToday;
    fn();
    if (SAVE_FAIL) {
      app.appendChild(h('div', { class: 'fb bad', style: 'margin-top:10px' },
        '⚠ 记录没能存进本机（隐私模式或空间满）：刷新后会丢，请先「报告 → 导出 JSON」。'));
    }
    Array.prototype.forEach.call(tabs.children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-go') === S.view ||
        ((S.view === 'practice' || S.view === 'summary') && S.sess && b.getAttribute('data-go') === S.sess.mod));
    });
  }

  /* ---------- 今日任务卡（约 17 分钟） ---------- */
  function renderToday() {
    var tr = todayRecs();
    var META = {
      calc: { n: 4, sub: '4 题 · 8 分钟 · 选公式 → 指认量 → 算到底' },
      amount: { n: 4, sub: '4 题 · 3 分钟 · 先认量再动笔' },
      model: { n: 3, sub: '3 题 · 3 分钟 · 看图认模型' },
      draw: { n: 2, sub: '2 题 · 3 分钟 · 四选一选正确画法' },
      read: { n: 2, sub: '2 题 · 3 分钟 · 量程 / 分度值 / 读数' }
    };
    var dueN = window.__ltReview.dueList(DB.wrong).length;
    var plan = [
      { mod: 'calc', n: 4, label: '算到底', sub: META.calc.sub, go: 'calc' },
      { mod: 'amount', n: 4, label: '认量', sub: META.amount.sub, go: 'amount' },
      { mod: 'model', n: 3, label: '认模型', sub: META.model.sub, go: 'model' },
      { mod: 'wrong', n: 1, label: '错题回炉', sub: (dueN ? '到期 ' + dueN + ' 题' : '暂无到期') + ' · 3 分钟', go: 'wrong' }
    ];
    var alt = (new Date().getDate() % 2 === 0) ? 'draw' : 'read';
    plan.push({ mod: alt, n: 2, label: (alt === 'draw' ? '作图判断' : '读数'), sub: META[alt].sub + '（单双日轮换）', go: alt });

    var done = {};
    plan.forEach(function (p) { done[p.mod] = 0; });
    tr.forEach(function (r) {
      if (r.mode === 'wrong') done.wrong = (done.wrong || 0) + 1;
      else if (done[r.mod] != null) done[r.mod]++;
    });

    var tasks = h('div', { class: 'card' });
    tasks.appendChild(h('div', { class: 'row' },
      h('h2', { style: 'margin:0;font-size:18px' }, '今日任务'),
      h('span', { class: 'pill' }, '约 17 分钟')
    ));
    tasks.appendChild(h('div', { class: 'small muted', style: 'margin-top:4px' }, '顺序：算到底 → 认量 → 认模型 → 错题回炉 → 作图/读数（单双日轮换）。五个都做，不用等一个练熟。'));
    tasks.appendChild(h('div', { class: 'small muted', style: 'margin-top:2px' }, '跳过几天不累计欠账，任务每天重置；每次开始都会换一批题（题型轮换 + 避开上一轮题面）。'));
    plan.forEach(function (p, i) {
      var isDone = done[p.mod] >= p.n;
      tasks.appendChild(h('div', { class: 'task' + (isDone ? ' done' : '') },
        h('div', { class: 'no' }, isDone ? '✓' : String(i + 1)),
        h('div', { class: 'tt' }, h('b', null, p.label), h('span', null, p.sub)),
        h('button', {
          class: 'btn btn-sm ' + (isDone ? '' : 'btn-primary'), onclick: function () {
            if (p.go === 'wrong') startWrong(); else startSession(p.go, null, p.n);
          }
        }, isDone ? '再来' : '开始')
      ));
    });
    app.appendChild(tasks);

    /* 老师反馈专项入口：画清力臂（认概念 → 判断 → 手绘），今天可单独练这一项 */
    var armCard = h('div', { class: 'card', style: 'margin-top:12px;border-left:4px solid var(--brand)' });
    armCard.appendChild(h('div', { class: 'row' },
      h('h2', { style: 'margin:0;font-size:17px' }, '✏️ 画清力臂 · 专项练'),
      h('span', { class: 'pill' }, '老师反馈')
    ));
    armCard.appendChild(h('div', { class: 'small muted', style: 'margin-top:4px' },
      '按老师要求走一遍：先认「力臂是哪个」→ 两道四选一判断画法 → 两道自己动手画垂线、标直角、把力臂这段距离画清楚。共 5 题。'));
    armCard.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn btn-primary', onclick: startArmFocus }, '开始练（5 题）'),
      h('button', { class: 'btn', onclick: function () { startExample('draw', 'armdraw'); } }, '先看例题'),
      h('button', { class: 'btn btn-ghost', onclick: function () { go('draw'); } }, '更多作图题 →')
    ));
    app.appendChild(armCard);

    app.appendChild(h('div', { class: 'grid', style: 'margin-top:12px' },
      statCard('今日题数', tr.length),
      statCard('今日正确率', tr.length ? pct(tr.filter(function (r) { return r.ok; }).length, tr.length) + '%' : '—'),
      statCard('错题待回炉', window.__ltReview.dueList(DB.wrong).length)
    ));

    var mods = h('div', { class: 'grid', style: 'margin-top:16px' });
    PT.modules.forEach(function (m) {
      var card = h('div', { class: 'module' },
        h('div', { class: 'mh' }, h('span', null, m.icon), h('b', null, m.name)),
        h('div', { class: 'desc' }, m.desc),
        h('div', { class: 'kinds' }, (m.kinds || []).slice(0, 4).map(function (k) { return h('span', { class: 'kind' }, k.name); })),
        h('div', { class: 'row', style: 'margin-top:auto' },
          h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, null, m.id === 'draw' ? 4 : (m.id === 'read' ? 3 : 6)); } }, '开始'),
          h('button', { class: 'btn btn-sm', onclick: function () { startExample(m.id, lastKindOf(m.id)); } }, '看例题')
        )
      );
      mods.appendChild(card);
    });
    app.appendChild(mods);

    app.appendChild(h('div', { class: 'card', style: 'margin-top:16px' },
      h('div', { class: 'small' }, h('b', null, '怎么用')),
      h('ul', { class: 'small muted', style: 'margin:6px 0 0;padding-left:20px' },
        h('li', null, '每道题按「第 1 步 选公式 → 第 2 步 指认量 → 第 3 步 代入算结果」排，逐空判分。'),
        h('li', null, '不会就点「提示」，提示不扣分但会记录。'),
        h('li', null, '数值答错要订正：照着解析把正确答案再填一遍，对了才能下一题。'),
        h('li', null, '直接打字：1428000、1.428e6、1.428×10^6、1.428×10⁶、21%、0.21 都认；单位不用打。'),
        h('li', null, '单位默认不判；有效数字只提示不判错。'),
        h('li', null, '打草稿点「草稿纸」；第一次做某类题先点「例题」。')
      )
    ));
  }
  function statCard(label, val) { return h('div', { class: 'stat' }, h('span', null, label), h('b', null, String(val))); }

  /* ---------- 模块首页 ---------- */
  function renderModule() {
    var m = PT.moduleById(S.view);
    if (!m) { go('today'); return; }
    var head = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:19px' }, m.icon + ' ' + m.name)),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, m.desc)
    );
    head.appendChild(h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn btn-primary', onclick: function () { startSession(m.id, null, m.id === 'draw' ? 4 : 6); } }, '开始一轮'),
      h('button', { class: 'btn', onclick: function () { startExample(m.id, lastKindOf(m.id)); } }, '先看例题')
    ));
    app.appendChild(head);
    var list = h('div', { class: 'grid', style: 'margin-top:12px' });
    (m.kinds || []).forEach(function (k) {
      var st = kindStat('new', m.id, k.id);
      list.appendChild(h('div', { class: 'module' },
        h('div', { class: 'mh' }, h('b', null, k.name)),
        h('div', { class: 'desc small muted' }, st.n ? '练过 ' + st.n + ' 题 · 正确率 ' + pct(st.ok, st.n) + '%' : '还没练过'),
        (function () {
          var kn = Math.min(m.id === 'draw' ? 4 : 6, poolSize(m.id, k.id));
          return h('div', { class: 'row', style: 'margin-top:auto' },
            h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, k.id, kn); } }, '练 ' + kn + ' 题'),
            h('button', { class: 'btn btn-sm', onclick: function () { startExample(m.id, k.id); } }, '看例题')
          );
        })()
      ));
    });
    app.appendChild(list);
  }
  function kindStat(mode, mod, kind) {
    var rs = DB.recs.filter(function (r) { return r.mode === mode && r.mod === mod && r.kind === kind; });
    return { n: rs.length, ok: rs.filter(function (r) { return r.ok; }).length };
  }

  /* ---------- 出题去重 / 题型轮换（跨轮避开上一轮题面） ---------- */
  function sigOf(q) { return q.id + '|' + q.prompt; }
  /* 这个模块最近练过的题型（没有就返回 null，例题退化为随机） */
  function lastKindOf(mod) {
    var lk = DB.meta && DB.meta.lastKind;
    return (lk && lk[mod]) || null;
  }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function lastRoundOf(mod) {
    var lr = DB.meta && DB.meta.lastRound, r = lr && lr[mod];
    if (!r || !Array.isArray(r.sigs) || !Array.isArray(r.kinds)) return { at: 0, kinds: [], sigs: [] };
    return r;
  }
  function beginRound(mod) {
    DB.meta = DB.meta || {};
    DB.meta.lastRound = DB.meta.lastRound || {};
    var prev = lastRoundOf(mod);              /* 先把上一轮读走，再覆盖 */
    var rec = { at: Date.now(), kinds: [], sigs: [] };
    DB.meta.lastRound[mod] = rec;
    save();
    return { prev: prev, rec: rec };
  }
  function recordQuestion(rec, q, kindId) {
    if (!rec) return;
    rec.kinds.push(kindId || q.kind || '');
    rec.sigs.push(sigOf(q));
    save();
  }
  /* 同模块内最多试 40 个 seed，取第一个题面签名不在「已做过」集合里的题；都不行才接受重复 */
  function pickQuestion(mod, kindId, seenSigs) {
    var q = null;
    for (var i = 0; i < 40; i++) {
      q = PT.gen(mod, kindId, (Math.random() * 1e9) | 0);
      if (seenSigs.indexOf(sigOf(q)) < 0) return q;
    }
    return q;
  }
  /* kind 队列：上一轮用过的 kind 排后、没用过的排前；一轮内 kind 不重复（用尽后才循环） */
  function kindQueue(mod, n) {
    var m = PT.moduleById(mod);
    var all = (m && m.kinds ? m.kinds.map(function (k) { return k.id; }) : []);
    if (!all.length) return null;
    var prevKinds = lastRoundOf(mod).kinds || [];
    var unused = shuffleArr(all.filter(function (k) { return prevKinds.indexOf(k) < 0; }));
    var used = shuffleArr(all.filter(function (k) { return prevKinds.indexOf(k) >= 0; }));
    var order = unused.concat(used), out = [];
    for (var i = 0; i < n; i++) out.push(order[i % order.length]);
    return out;
  }

  /* ---------- 练习 ---------- */
  /* 一轮题量上限：draw 每个 kind 只有 2 道固定题；生成类模块受 kind 数限制（4.8：一轮内 kind 不重复） */
  function poolSize(mod, kind) {
    var m = PT.moduleById(mod);
    if (!m) return 6;
    var byKind = (m.kinds && m.kinds.length) ? m.kinds.length : 6;
    if (kind) {
      if (m.items) return Math.max(1, m.items.filter(function (x) { return x.kind === kind; }).length);
      return 999;   /* 参数化生成：同一题型题量无限 */
    }
    if (m.items) return Math.max(1, Math.min(m.items.length, byKind));
    return byKind;
  }
  function startSession(mod, kind, count) {
    if (mod === 'wrong') { startWrong(); return; }   /* 兜底：回炉走回炉入口 */
    S.mode = 'new'; S.example = false; S.back = null;
    var n = Math.max(1, Math.min(count || 6, poolSize(mod, kind)));
    var queue = kind ? null : kindQueue(mod, n);   /* 先按上一轮记录排 kind 队列 */
    var rnd = beginRound(mod);                     /* 再开启本轮记录（旧记录已被读走） */
    S.sess = {
      mod: mod, kind: kind, total: n, done: 0, right: 0, t0: Date.now(),
      prevSigs: rnd.prev.sigs, round: rnd.rec, kindQueue: queue
    };
    S.view = 'practice';
    nextQuestion();
  }
  /* 画清力臂专项：认概念 → 判断 → 手绘，固定 5 题顺序（复用 queue 分支，不参与去重） */
  function startArmFocus() {
    S.mode = 'new'; S.example = false; S.back = null;
    var items = PT.armFocusQueue();
    S.sess = {
      mod: 'draw', kind: 'armfocus', total: items.length, done: 0, right: 0, t0: Date.now(),
      queue: items
    };
    S.view = 'practice';
    nextQuestion();
  }
  function startWrong() {
    S.example = false;
    S.back = null;    var now = Date.now();
    var due = window.__ltReview.dueList(DB.wrong, now);
    if (!due.length) {
      var all = Object.keys(DB.wrong).length;
      alert(all ? '错题本里有 ' + all + ' 道，但还没到期（按 1/3/7/14 天档位回炉，到期后连对 2 次才算掌握）。今天先练新的。' : '错题本是空的，先做几题吧。');
      return;
    }
    S.mode = 'wrong';
    S.sess = { mod: 'wrong', kind: null, total: Math.min(due.length, 5), done: 0, right: 0, t0: Date.now(), queue: due };
    S.view = 'practice';
    nextQuestion();
  }
  function startOneWrong(w) {
    S.example = false;
    S.back = null;
    S.mode = 'wrong';
    S.sess = { mod: 'wrong', kind: null, total: 1, done: 0, right: 0, t0: Date.now(), queue: [w] };
    S.view = 'practice';
    nextQuestion();
  }
  function nextQuestion() {
    var s = S.sess;
    if (s.done >= s.total) { S.view = 'summary'; render(); return; }
    if (s.queue) {
      S.q = s.queue[s.done];                 /* 错题回炉：刻意重复，不参与去重 */
    } else {
      var kindId = s.kindQueue ? s.kindQueue[s.done] : s.kind;
      var seen = (s.prevSigs || []).concat(s.round ? s.round.sigs : []);
      S.q = pickQuestion(s.mod, kindId, seen);
      recordQuestion(s.round, S.q, kindId);
    }
    S.res = null; S.answered = false; S.choice = {}; S.draw = {}; S.hint = false;
    S.draft = null; S.lastVals = null; S.t0 = Date.now(); S.fix = null;
    render();
  }

  /* 例题：先看一个完整解答（题目 → 答案 → 怎么想 → 图），再开始练 */
  function startExample(mod, kind) {
    if (!PT.moduleById(mod)) return;   /* 兜底：未知模块不进入例题页 */
    S.example = true;
    S.sess = { mod: mod, kind: kind, total: 6, done: 0, right: 0, t0: Date.now() };
    S.q = PT.gen(mod, kind, (Math.random() * 1e9) | 0);
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
    card.appendChild(h('div', { class: 'qbody', html: q.prompt }));
    if (q.fig) { var f0 = figBlock(q.fig, ''); if (f0) card.appendChild(f0); }
    /* 作图判断：例题页也要把四张选项图铺出来，正确那张标 ✓ */
    q.fields.forEach(function (f) {
      if (f.type === 'drawline') {
        card.appendChild(h('div', { class: 'small muted', style: 'margin-top:12px;font-weight:600' }, '从 O 向作用线作垂线，垂足处标直角——绿线就是力臂 l'));
        var ansFig = q.answerFig || { type: 'armanswer', rodDeg: f.rodDeg, fDeg: f.fDeg };
        card.appendChild(h('div', { class: 'figbox', html: PT.svgFor({ fig: ansFig }) }));
        return;
      }
      if (!f.figs) return;
      if (f.label) card.appendChild(h('div', { class: 'small muted', style: 'margin-top:12px;font-weight:600' }, f.label));
      var box = h('div', { class: 'optgrid' });
      f.options.forEach(function (opt, oi) {
        box.appendChild(h('button', { class: 'opt' + (oi === f.ans ? ' ok' : '') },
          h('div', { class: 'optfig', html: PT.svgFor({ fig: f.figs[oi] }) }),
          h('div', null, opt)));
      });
      card.appendChild(box);
    });
    var ansBox = h('div', { class: 'fb good', style: 'margin-top:14px' });
    ansBox.appendChild(h('div', { class: 'ftitle' }, '答案'));
    var ul = h('ul');
    q.fields.forEach(function (f, i) { ul.appendChild(h('li', null, (f.label ? f.label + ' ' : '') + PT.ansText(f))); });
    ansBox.appendChild(ul);
    card.appendChild(ansBox);
    var exBox = h('div', { class: 'fb', style: 'margin-top:10px' });
    exBox.appendChild(h('div', { class: 'ftitle' }, '怎么想'));
    (q.explain || []).forEach(function (line) { exBox.appendChild(h('div', { class: 'small' }, line)); });
    card.appendChild(exBox);
    card.appendChild(h('div', { class: 'row', style: 'margin-top:14px' },
      h('button', { class: 'btn btn-primary', onclick: function () {
        if (S.back) {
          /* 从练习页点进来的：回到刚才那题，别把今日题单丢掉 */
          var b = S.back; S.back = null;
          S.q = b.q; S.sess = b.sess; S.draft = b.draft; S.choice = b.choice || {}; S.draw = b.draw || {}; S.hint = !!b.hint;
          S.res = null; S.answered = false; S.fix = null; S.example = false;
          S.view = 'practice'; render();
          return;
        }
        startSession(s.mod, s.kind, 6);
      } }, S.back ? '看懂了，回到刚才那题' : '看懂了，开始练'),
      h('button', { class: 'btn', onclick: function () { startExample(s.mod, s.kind); } }, '换一道')
    ));
    app.appendChild(card);
  }

  function draftAt(i) {
    var d = S.draft && S.draft[i];
    return (typeof d === 'string') ? d : '';
  }
  function numInput(base, val, cls) {
    return h('div', { class: 'fin ' + (cls || '') },
      h('input', {
        class: 'fone', id: base + '_n', value: val || '', inputmode: 'text',
        autocomplete: 'off', spellcheck: 'false', placeholder: '数字'
      })
    );
  }
  /* 草稿纸：鼠标 / 手指 / 触控笔都能写，不识别，只当纸用 */
  function scratchPad() {
    var cv = h('canvas', { class: 'pad', width: 900, height: 420 });
    var wrap = h('div', { class: 'padwrap' },
      cv,
      h('div', { class: 'row', style: 'margin-top:6px' },
        h('button', { class: 'btn btn-sm', onclick: function () { cv._pen = !cv._pen; } }, '笔 / 橡皮'),
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
    if (!g) return;
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

  /* 手绘力臂：在题图上用鼠标/手指从 O 拖到作用线，画一条垂线段。
     SVG viewBox=340×280；把线存进 S.draw[i]={x1,y1,x2,y2}（viewBox 坐标）。 */
  function drawArmPad(q, i) {
    var wrap = h('div', { class: 'drawpad' });
    wrap.appendChild(h('div', { class: 'small muted', style: 'margin-bottom:4px' },
      '从支点 O 按住拖到 F 的作用线上（虚线），松手画出垂线。画错可重画。'));
    var figBox = h('div', { class: 'figbox', style: 'position:relative' });
    var baseFig = q.drawFig || { type: 'armbase', rodDeg: f.rodDeg, fDeg: f.fDeg };  /* 兼容早期错题无图字段 */
    figBox.innerHTML = PT.svgFor({ fig: baseFig });
    wrap.appendChild(figBox);
    var status = h('div', { class: 'small muted', style: 'margin-top:4px' }, '还没画线');
    wrap.appendChild(h('div', { class: 'row', style: 'margin-top:6px' },
      h('button', {
        class: 'btn btn-sm', onclick: function () { delete S.draw[i]; render(); }
      }, '重画')
    ));
    wrap.appendChild(status);
    setTimeout(function () { setupDrawArm(figBox, q, i, status); }, 0);
    return wrap;
  }

  function setupDrawArm(figBox, q, i, status) {
    var f = q.fields[i];
    var g = PT.armProbe.geom(f.rodDeg, f.fDeg);
    var svg = figBox.querySelector && figBox.querySelector('svg');
    if (!svg || !svg.addEventListener) return;
    var NS = 'http://www.w3.org/2000/svg', W = g.W, H = g.H;
    var stroke = null, halo = null, drawing = false, startPt = null;
    var readonly = !!S.answered;

    function toView(e) {
      var r = svg.getBoundingClientRect();
      var cx = (e.clientX != null) ? e.clientX : ((e.touches && e.touches[0]) ? e.touches[0].clientX : 0);
      var cy = (e.clientY != null) ? e.clientY : ((e.touches && e.touches[0]) ? e.touches[0].clientY : 0);
      return { x: (cx - r.left) / (r.width || 1) * W, y: (cy - r.top) / (r.height || 1) * H };
    }
    function ensureStroke() {
      if (stroke) return;
      halo = document.createElementNS(NS, 'line');
      halo.setAttribute('stroke', '#ffffff'); halo.setAttribute('stroke-width', '9');
      halo.setAttribute('stroke-linecap', 'round'); halo.setAttribute('opacity', '0.85');
      svg.appendChild(halo);
      stroke = document.createElementNS(NS, 'line');
      stroke.setAttribute('stroke', '#2563eb'); stroke.setAttribute('stroke-width', '4');
      stroke.setAttribute('stroke-linecap', 'round');
      svg.appendChild(stroke);
    }
    function paint(seg) {
      if (!seg) { if (stroke) { stroke.setAttribute('visibility', 'hidden'); halo.setAttribute('visibility', 'hidden'); } return; }
      ensureStroke();
      [[halo], [stroke]].forEach(function (arr) {
        var l = arr[0];
        l.setAttribute('visibility', 'visible');
        l.setAttribute('x1', seg.x1); l.setAttribute('y1', seg.y1);
        l.setAttribute('x2', seg.x2); l.setAttribute('y2', seg.y2);
      });
    }
    function setStatus(t) { if (status) status.textContent = t; }

    var saved = S.draw[i];
    if (readonly) {
      if (saved) {
        paint(saved);
        if (stroke) stroke.setAttribute('stroke', (S.res && S.res.res[i] && S.res.res[i].ok) ? '#0f9d58' : '#d93025');
      }
      return;
    }
    if (saved) { paint(saved); setStatus('已画好一条线，可以提交，或点「重画」重来。'); }

    function down(e) {
      if (S.answered) return;
      e.preventDefault();
      drawing = true; startPt = toView(e);
      paint({ x1: startPt.x, y1: startPt.y, x2: startPt.x, y2: startPt.y });
      setStatus('拖动中…松手后确定垂线');
      if (svg.setPointerCapture && e.pointerId != null) { try { svg.setPointerCapture(e.pointerId); } catch (x) { } }
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = toView(e);
      paint({ x1: startPt.x, y1: startPt.y, x2: p.x, y2: p.y });
    }
    function up(e) {
      if (!drawing) return;
      drawing = false;
      var p = toView(e);
      var seg = { x1: Math.round(startPt.x), y1: Math.round(startPt.y), x2: Math.round(p.x), y2: Math.round(p.y) };
      S.draw[i] = seg;
      paint(seg);
      setStatus('已画好：从 (' + seg.x1 + ',' + seg.y1 + ') 到 (' + seg.x2 + ',' + seg.y2 + ')。可以提交，或点「重画」重来。');
    }
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', function () { drawing = false; });
  }

  function readDraft() {
    return S.q.fields.map(function (f, i) {
      if (f.type === 'choice') return '';
      if (f.type === 'drawline') return S.draw[i] || '';
      var el = document.getElementById('in' + i + '_n');
      return el ? String(el.value || '') : '';
    });
  }
  function rawAns(i) {
    var f = S.q.fields[i], v = (S.lastVals || [])[i];
    if (f.type === 'choice') return S.choice[i] == null ? '空' : (f.figs ? '甲乙丙丁'.charAt(S.choice[i]) : String.fromCharCode(65 + S.choice[i]));
    if (f.type === 'drawline') return (v && isFinite(v.x1)) ? '画的一条线（起点 ' + v.x1 + ',' + v.y1 + '）' : '没画';
    return (v == null || v === '') ? '空' : String(v);
  }

  function renderPractice() {
    if (S.example) { renderExample(); return; }
    var q = S.q, s = S.sess;
    if (!q) { go('today'); return; }
    var modName = S.mode === 'wrong' ? '错题回炉' : ((PT.moduleById(s.mod) || {}).name || '练习');
    app.appendChild(h('div', { class: 'row', style: 'margin-bottom:8px' },
      h('span', { class: 'pill' }, modName),
      h('span', { class: 'small muted' }, q.title || ''),
      h('span', { class: 'grow' }),
      h('span', { class: 'small muted' }, (s.done + 1) + ' / ' + s.total)
    ));
    app.appendChild(h('div', { class: 'progress' }, h('i', { style: 'width:' + (s.done / s.total * 100) + '%' })));

    var card = h('div', { class: 'card', style: 'margin-top:12px' });
    card.appendChild(h('div', { class: 'qhead' },
      h('span', { class: 'pill' }, q.kp ? q.kp[0] : '新题'),
      q.kp ? h('span', { class: 'small muted' }, q.kp.join(' · ')) : null
    ));
    card.appendChild(h('div', { class: 'qbody', html: q.prompt }));
    if (q.fig && q.figBefore) {
      var fb0 = figBlock(q.fig, '看图作答');
      if (fb0) card.appendChild(fb0);
    }

    q.fields.forEach(function (f, i) {
      if (f.type === 'choice') {
        if (f.label) card.appendChild(h('div', { class: 'small muted', style: 'margin-top:12px;font-weight:600' }, f.label));
        var box = f.figs ? h('div', { class: 'optgrid' }) : null;
        f.options.forEach(function (opt, oi) {
          var cls = 'opt';
          if (S.answered) { if (oi === f.ans) cls += ' ok'; else if (S.choice[i] === oi) cls += ' bad'; }
          else if (S.choice[i] === oi) cls += ' sel';
          var kids = [];
          if (f.figs && f.figs[oi]) kids.push(h('div', { class: 'optfig', html: PT.svgFor({ fig: f.figs[oi] }) }));
          kids.push(h('div', null, f.figs ? opt : (String.fromCharCode(65 + oi) + '. ' + opt)));
          var btn = h('button', {
            class: cls, onclick: (function (oi2) {
              return function () { if (S.answered) return; S.choice[i] = oi2; S.draft = readDraft(); render(); };
            })(oi)
          }, kids);
          if (box) box.appendChild(btn); else card.appendChild(btn);
        });
        if (box) card.appendChild(box);
      } else if (f.type === 'drawline') {
        card.appendChild(drawArmPad(q, i));
      } else {
        card.appendChild(h('div', { class: 'field' },
          h('span', { class: 'lbl full' }, f.label),
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
          var mod = S.mode === 'wrong' ? ((S.q && S.q.mod) || 'model') : S.sess.mod;
          var kind = (S.q && S.q.kind) || S.sess.kind || null;
          S.back = { q: S.q, sess: S.sess, draft: readDraft(), choice: S.choice, draw: S.draw, hint: S.hint };
          startExample(mod, kind);
        } }, '例题')
      ));
      card.appendChild(h('div', { class: 'small muted' }, '直接打字：整数、小数、1.428e6、1.428×10^6、21% 都认；单位不用打；回车提交。'));
      if (S.scratch) card.appendChild(scratchPad());
    }
    if (q.tip && !S.answered && S.hint) card.appendChild(h('div', { class: 'tipbox' }, '提示：' + q.tip));

    if (!S.answered) {
      card.appendChild(h('div', { class: 'row', style: 'margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: submit }, '提交'),
        h('button', { class: 'btn btn-ghost', onclick: function () { S.draft = readDraft(); S.hint = true; render(); } }, S.hint ? '提示已展开' : '看提示'),
        h('span', { class: 'grow' }),
        h('span', { class: 'small muted' }, '回车提交')
      ));
    } else {
      /* 逐字段判分：每步 ✓/✗ + 「3 步对 2 步」 */
      var fb = h('div', { class: 'fb ' + (S.res.ok ? 'good' : 'bad') });
      var title = S.res.ok
        ? (S.res.total > 1 ? '✓ ' + S.res.total + ' 步全对' : '✓ 全对')
        : (S.res.total > 1 ? '✗ ' + S.res.total + ' 步对 ' + S.res.got + ' 步' : '✗ 不对');
      fb.appendChild(h('div', { class: 'ftitle' }, title));
      var ul = h('ul', { class: 'steps' });
      q.fields.forEach(function (f, i) {
        var r = S.res.res[i];
        ul.appendChild(h('li', null,
          h('span', { class: 'mk ' + (r.ok ? 'ok' : 'bad') }, r.ok ? '✓' : '✗'),
          h('span', null,
            h('span', { class: 'stepno' }, '第 ' + (i + 1) + ' 步 '),
            (f.label ? f.label + ' ' : ''),
            '正确答案：' + PT.ansText(f),
            r.ok ? '' : ('（你填的是 ' + rawAns(i) + '）')
          )
        ));
      });
      fb.appendChild(ul);
      (q.explain || []).forEach(function (line) {
        fb.appendChild(h('div', { class: 'small', style: 'margin-top:4px' }, line));
      });
      /* 有效数字只提示、不判错 */
      for (var si = 0; si < q.fields.length; si++) {
        var sf = q.fields[si];
        if (sf.type !== 'num' || !S.res.res[si].ok) continue;
        var sraw = String((S.lastVals || [])[si] || '');
        var sm = sraw.match(/\.(\d+)/);
        if (sm && sm[1].length > 2) {
          fb.appendChild(h('div', { class: 'small muted', style: 'margin-top:6px' }, '提示：小数位偏多不判错，考试时按题目要求保留位数即可。'));
          break;
        }
      }
      q.fields.forEach(function (f, i) {
        if (f.figs && f.figs[f.ans]) {
          fb.appendChild(h('div', { class: 'figcap' }, '正确答案：' + (f.figs ? '甲乙丙丁'.charAt(f.ans) : String.fromCharCode(65 + f.ans)) + '（' + f.options[f.ans] + '）'));
          fb.appendChild(h('div', { class: 'figbox', html: PT.svgFor({ fig: f.figs[f.ans] }) }));
        }
        if (f.type === 'drawline') {
          fb.appendChild(h('div', { class: 'figcap' }, '正确画法：绿线是力臂 l，垂足处标了直角'));
          var ansFig = q.answerFig || { type: 'armanswer', rodDeg: f.rodDeg, fDeg: f.fDeg };
          fb.appendChild(h('div', { class: 'figbox', html: PT.svgFor({ fig: ansFig }) }));
        }
      });
      if (q.fig && !q.figBefore) {
        var fb2 = figBlock(q.fig, '图');
        if (fb2) fb.appendChild(fb2);
      }
      card.appendChild(fb);

      /* 答错必须订正：数值字段重填正确答案，对了才出现「下一题」 */
      if (S.fix && !S.fix.ok) {
        var fxb = h('div', { class: 'fb', style: 'margin-top:10px' });
        fxb.appendChild(h('div', { class: 'ftitle' }, '订正：照着上面的解析，把正确答案重新填一遍'));
        S.fix.fields.forEach(function (i) {
          var f = q.fields[i];
          fxb.appendChild(h('div', { class: 'field' },
            h('span', { class: 'lbl full' }, f.label),
            h('input', { class: 'fone', id: 'fx' + i, value: (S.fix.draft && S.fix.draft[i]) || '', placeholder: '数字' }),
            f.unit ? h('span', { class: 'unit' }, f.unit) : null
          ));
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

    if (!S.answered) {
      setTimeout(function () {
        var el = document.querySelector ? document.querySelector('.fone') : null;
        if (el && el.focus) { try { el.focus(); } catch (e) { } }
      }, 30);
    }
  }

  function f_hasDraw(q) {
    return (q.fields || []).some(function (f) { return f.type === 'drawline'; });
  }

  function submit() {
    if (S.answered || S.example) return;
    var q = S.q;
    var draft = readDraft();
    /* 一个空都没填（含选择题未选）时不判分、不记记录、不进错题本 */
    var anyFilled = q.fields.some(function (f, i) {
      if (f.type === 'choice') return S.choice[i] != null;
      if (f.type === 'drawline') return !!(S.draw[i] && isFinite(S.draw[i].x1));
      return String(draft[i] == null ? '' : draft[i]).trim() !== '';
    });
    if (!anyFilled) { alert(f_hasDraw(q) ? '先从 O 画一条线到作用线，再提交' : '先填答案再提交'); return; }
    var vals = q.fields.map(function (f, i) {
      if (f.type === 'choice') return S.choice[i] == null ? null : S.choice[i];
      if (f.type === 'drawline') return S.draw[i] || null;
      return PT.parseNum(draft[i]);
    });
    var res = PT.judge(q, vals);
    S.lastVals = draft; S.draft = draft;
    var fixIdx = [];
    /* drawline 不作数字订正：错了就重画（反馈区给出正确画法图），不进订正框 */
    if (!res.ok) q.fields.forEach(function (f, i) { if (!res.res[i].ok && f.type !== 'choice' && f.type !== 'drawline') fixIdx.push(i); });
    S.fix = fixIdx.length ? { fields: fixIdx, ok: false, tries: 0 } : null;
    var sec = Math.max(1, Math.round((Date.now() - S.t0) / 1000));
    S.res = res; S.answered = true; S.answeredAt = Date.now();
    var s = S.sess;
    s.done++;
    if (res.ok) s.right++;
    var recMod = s.mod === 'wrong' ? (q.mod || 'model') : s.mod;
    var qid = recMod + '.' + (q.kind || '') + '.' + String(q.title || '');
    DB.recs.push({
      ts: Date.now(), mod: recMod,
      kind: q.kind, kn: q.title, ok: res.ok, got: res.got, total: res.total,
      sec: sec, hint: S.hint, mode: S.mode, steps: res.total,
      qid: qid
    });
    /* 记住这个模块最近练的题型：模块页「先看例题」用它，别随机抽到别的题型 */
    if (q.kind) { DB.meta.lastKind = DB.meta.lastKind || {}; DB.meta.lastKind[recMod] = q.kind; }
    reviewAnswer(q, res.ok, sec, qid);   /* 统一错题回炉（ADR-0010）：连对2次+行为约束才算掌握 */
    save();
    render();
  }
  function submitFix() {
    if (!S.fix || S.fix.ok) return;
    var q = S.q, fields = [], vals = [];
    S.fix.fields.forEach(function (i) {
      var f = q.fields[i];
      fields.push(f);
      var el = document.getElementById('fx' + i);
      vals.push(PT.parseNum(el ? el.value : ''));
    });
    var r = PT.judge({ fields: fields }, vals);
    if (r.ok) {
      S.fix.ok = true;
      var last = DB.recs[DB.recs.length - 1];
      if (last) last.fixed = true;
      save();
    } else {
      S.fix.tries++;
      var keep = {};
      S.fix.fields.forEach(function (i) { var el = document.getElementById('fx' + i); if (el) keep[i] = el.value; });
      S.fix.draft = keep;
    }
    render();
  }
  function next() {
    if (S.sess.done >= S.sess.total) { S.view = 'summary'; render(); return; }
    nextQuestion();
  }

  /* ---------- 错题本（共享回炉内核 ADR-0010，规则只在 工具/trainer/review.js） ---------- */
  /* 错题 key：题号 + 题干 + 图/选项图摘要（题面一样、只有图不同的题不能合并成一条） */
  function figSig(q) {
    var s = q.fig ? JSON.stringify(q.fig) : '';
    (q.fields || []).forEach(function (f) { if (f.figs) s += '|' + JSON.stringify(f.figs); });
    return s;
  }
  function wrongKey(q) { return q.id + '|' + String(q.prompt).slice(0, 60) + '|' + figSig(q); }
  /* 物理最短有效用时：算到底/作图判断 10 秒，认模型/认量/读数 3 秒 */
  function minSecOf(q) {
    var mod = q.mod || '', kind = q.kind || '';
    return (mod === 'calc' || mod === 'draw' || kind === 'armdraw') ? 10 : 3;
  }
  function reviewAnswer(q, ok, sec, qid) {
    var R = window.__ltReview, k = wrongKey(q), w = DB.wrong[k], now = Date.now();
    if (R.migrate(w, now)) save();
    if (!ok) {
      if (!w) {
        w = {
          id: q.id, qid: qid, mod: q.mod || S.sess.mod, kind: q.kind, title: q.title, prompt: q.prompt,
          fields: q.fields, explain: q.explain, tip: q.tip, kp: q.kp, fig: q.fig, figBefore: q.figBefore,
          /* 手绘题回炉要重建画板与正确画法图，否则 drawArmPad 拿不到 fig 会渲染空 */
          drawFig: q.drawFig, answerFig: q.answerFig
        };
        DB.wrong[k] = w;
      }
      if (qid && !w.qid) w.qid = qid;   /* 旧条目补 qid，供历史错题清单匹配 */
      R.onWrong(w, now);
      return;
    }
    var sig = { sec: sec, minSec: minSecOf(q), hint: !!S.hint, fixed: false };
    var act = R.onPass(w, sig, now);
    if (act === 'mastered') delete DB.wrong[k];
  }

  function renderWrong() {
    var ws = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).sort(function (a, b) { return a.due - b.due; });
    var head = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:19px' }, '错题本'), h('span', { class: 'pill' }, ws.length + ' 道')),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, '答错的题自动进本；按 1 / 3 / 7 / 14 天档位回炉，到期后连续 2 次答对才算掌握（看提示/秒答不算）。')
    );
    head.appendChild(h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn btn-primary', onclick: startWrong }, '回炉到期的'),
      h('button', { class: 'btn', onclick: function () { go('report'); } }, '看报告')
    ));
    app.appendChild(head);
    var card = h('div', { class: 'card' });
    if (!ws.length) card.appendChild(h('div', { class: 'empty' }, '还没有错题。做几题吧。'));
    ws.forEach(function (w) {
      var dueTxt = window.__ltReview.statusText(w);
      card.appendChild(h('div', { class: 'wrongitem' },
        h('div', { class: 'wt' }, String(w.prompt).replace(/<br\s*\/?>/g, ' ').slice(0, 90) + '…'),
        h('div', { class: 'small muted' }, dueTxt + ' · 错过 ' + (w.n || 1) + ' 次'),
        h('button', { class: 'btn btn-sm', onclick: (function (ww) { return function () { startOneWrong(ww); }; })(w) }, '重做')
      ));
    });
    app.appendChild(card);
  }

  /* ---------- 本轮总结 ---------- */
  function renderSummary() {
    var s = S.sess;
    var mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
    app.appendChild(h('div', { class: 'card', style: 'text-align:center;padding:28px 18px' },
      h('div', { style: 'font-size:44px;line-height:1.1' }, s.right === s.total ? '🎉' : (s.right / s.total >= .6 ? '👍' : '💪')),
      h('h2', { style: 'margin:8px 0 4px' }, s.right + ' / ' + s.total + ' 全对'),
      h('p', { class: 'muted' }, '用时约 ' + mins + ' 分钟 · 正确率 ' + pct(s.right, s.total) + '%'),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: function () { if (s.mod === 'wrong') startWrong(); else startSession(s.mod, s.kind, s.total); } }, '再来一轮'),
        h('button', { class: 'btn', onclick: function () { go('today'); } }, '回今日')
      )
    ));
    var tips = [];
    if (s.total && s.right / s.total < .6) tips.push('正确率偏低：先点「例题」看一遍完整解答，再独立做一遍。');
    if (s.mod === 'calc' && s.right / s.total < .8) tips.push('「算到底」的目标是一次算对：选公式 → 指认量 → 代入，三步各写一行。');
    if (s.mod === 'amount' && s.right / s.total < .8) tips.push('认量的关键是先圈出题目里的 m、Δt、h、s、n，再动笔。');
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
      statCard('看提示做题', recs.filter(function (r) { return r.hint; }).length),
      statCard('错题本', Object.keys(DB.wrong).length)
    ));

    /* 主视图：5 类断点命中率 */
    var t = h('table', { class: 'tb' },
      h('tr', null, h('th', null, '断点'), h('th', { class: 'n' }, '题数'), h('th', { class: 'n' }, '正确率'), h('th', { class: 'n' }, '平均用时')));
    PT.modules.forEach(function (m) {
      var rs = recs.filter(function (r) { return r.mod === m.id; });
      var o = rs.filter(function (r) { return r.ok; }).length;
      t.appendChild(h('tr', null,
        h('td', null, m.icon + ' ' + m.name),
        h('td', { class: 'n' }, rs.length || '—'),
        h('td', { class: 'n' }, rs.length ? pct(o, rs.length) + '%' : '未练'),
        h('td', { class: 'n' }, rs.length ? fmtSec(rs.reduce(function (a, r) { return a + r.sec; }, 0) / rs.length) : '—')
      ));
    });
    app.appendChild(h('div', { class: 'card', style: 'margin-top:16px' }, h('h3', { style: 'margin-top:0' }, '5 类断点命中率'), t));

    /* 按题型（≥5 题才显示） */
    var byKind = {};
    recs.forEach(function (r) { var k = r.kn || r.kind; (byKind[k] = byKind[k] || []).push(r); });
    var rows = Object.keys(byKind).filter(function (k) { return byKind[k].length >= 5; })
      .sort(function (a, b) {
        var ra = byKind[a].filter(function (r) { return r.ok; }).length / byKind[a].length;
        var rb = byKind[b].filter(function (r) { return r.ok; }).length / byKind[b].length;
        return ra - rb;   /* 弱项（正确率低）排前面 */
      });
    var t2 = h('table', { class: 'tb' },
      h('tr', null, h('th', null, '题型'), h('th', { class: 'n' }, '题数'), h('th', { class: 'n' }, '正确率')));
    rows.forEach(function (k) {
      var rs = byKind[k], o = rs.filter(function (r) { return r.ok; }).length;
      t2.appendChild(h('tr', null, h('td', null, k), h('td', { class: 'n' }, rs.length), h('td', { class: 'n' }, pct(o, rs.length) + '%')));
    });
    if (!rows.length) t2.appendChild(h('tr', null, h('td', { colspan: 3, class: 'muted small' }, '每个题型练满 5 题后显示')));
    app.appendChild(h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '按题型（弱项在前）'), t2));

    /* 近 7 天 */
    var days = [], maxN = 1;
    for (var i = 6; i >= 0; i--) {
      var t0 = new Date(Date.now() - i * PT.DAY);
      var k = dayKey(t0.getTime());
      var n = recs.filter(function (r) { return dayKey(r.ts) === k; }).length;
      maxN = Math.max(maxN, n);
      days.push({ label: (t0.getMonth() + 1) + '/' + t0.getDate(), n: n });
    }
    var spark = h('div', { class: 'spark' });
    days.forEach(function (x) {
      spark.appendChild(h('div', { class: 'col' },
        h('i', { style: 'height:' + Math.max(2, Math.round(x.n / maxN * 52)) + 'px' }),
        h('span', null, x.label)
      ));
    });
    app.appendChild(h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '近 7 天题数'), spark));

    /* 错题本最近 10 条 */
    var ws = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; })
      .sort(function (a, b) { return b.ts - a.ts; }).slice(0, 10);
    var wc = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '错题本（最近 10 条）'));
    if (!ws.length) wc.appendChild(h('div', { class: 'empty' }, '还没有错题'));
    ws.forEach(function (w) {
      var dueTxt = window.__ltReview.statusText(w);
      wc.appendChild(h('div', { class: 'wrongitem' },
        h('div', { class: 'wt' }, String(w.prompt).replace(/<br\s*\/?>/g, ' ').slice(0, 80) + '…'),
        h('div', { class: 'small muted' }, dueTxt)
      ));
    });
    wc.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn btn-primary btn-sm', onclick: startWrong }, '回炉到期的'),
      h('button', { class: 'btn btn-sm', onclick: function () { go('wrong'); } }, '看全部错题')
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

    /* 数据 */
    app.appendChild(h('div', { class: 'card' },
      h('h3', { style: 'margin-top:0' }, '数据'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm', onclick: exportJSON }, '导出 JSON'),
        h('button', { class: 'btn btn-sm', onclick: importJSON }, '导入 JSON'),
        h('button', { class: 'btn btn-sm', onclick: selfCheck }, '自检（120 题 × 全部题类）'),
        h('button', { class: 'btn btn-sm', style: 'color:#d93025', onclick: clearAll }, '清空记录')
      ),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn btn-sm', onclick: runSync }, '云同步（跨设备）'),
        h('button', { class: 'btn btn-sm btn-ghost', title: 'PAT 怎么生成', onclick: function () { alert(window.__ltSyncUI.patHelp); } }, 'PAT 是什么？'),
        h('input', { id: 'syncPat', type: 'password', placeholder: 'GitHub PAT（存本机）', style: 'flex:1;min-width:160px;padding:6px;border:1px solid var(--line);border-radius:8px' }),
        h('span', { id: 'syncMsg', class: 'small muted' })
      ),
      h('p', { class: 'small muted', style: 'margin-bottom:0' }, '记录只在本机浏览器（physTrain_v1）；清缓存 / 换设备前先导出，放进 学习记录/。')
    ));
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    var t = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = '物理训练记录-' + t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') + '.json';
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
          if (!o || o.v !== PT.VERSION || !Array.isArray(o.recs)) throw new Error('格式不对');
          /* 与云同步共用同一合并函数（merge.mjs 内联）；同份导入两次不翻倍。
             脚手架族 recs 带 kn 无 prompt，合并键取 prompt[:40]||kn，见 ADR-0007 决定 4。 */
          var before = DB.recs.length;
          var merged = window.__ltMerge.mergeRecords(DB, o);
          DB.recs = merged.recs;
          Object.keys(merged.wrong || {}).forEach(function (k) {
            var w = merged.wrong[k];
            if (!w || !Array.isArray(w.fields) || !w.fields.length || typeof w.due !== 'number') return;   /* 结构坏的错题跳过 */
            DB.wrong[k] = w;
          });
          var added = DB.recs.length - before;
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
    var r = PT.selfTest(120);
    alert('自检：' + r.count + ' 题 + ' + r.cases + ' 项边界用例，' +
      (r.fails.length ? r.fails.length + ' 处失败\n' + r.fails.slice(0, 8).join('\n') : '全部通过') +
      '\n用时 ' + (Date.now() - t0) + ' ms');
  }
  function clearAll() {
    if (!confirm('清空所有记录和错题？建议先导出。')) return;
    DB = blankDB(); save(); render();
  }

  /* ---------- 启动 ---------- */
  Array.prototype.forEach.call(tabs.children, function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-go');
      go(v);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || S.view !== 'practice' || S.example) return;
    e.preventDefault();
    if (!S.answered) { submit(); return; }
    if (S.fix && !S.fix.ok) { submitFix(); return; }
    if (S.answeredAt && Date.now() - S.answeredAt < 600) return;   /* 刚提交，先让学生看解析 */
    next();
  });
  /* 段三：云同步适配层注入宿主接口（DB 读写/通知），报告页「云同步」按钮触发 runSync */
  if (window.__ltSyncUI) window.__ltSyncUI.init({
    getDB: function () { return DB; },
    setDB: function (d) { DB = d; save(); render(); },
    notify: function (msg) { var el = document.getElementById('syncMsg'); if (el) el.textContent = msg; }
  });
  (function boot() {
    var m = (location.hash || '').match(/view=([a-z]+)/);
    var v = m && m[1];
    var allowed = { today: 1, model: 1, amount: 1, calc: 1, draw: 1, read: 1, wrong: 1, report: 1 };
    go(allowed[v] ? v : 'today');
  })();

  /* 调试/自测钩子：不参与界面，供 node 里的 DOM 桩测试使用 */
  window.__pt = {
    S: S, db: function () { return DB; }, MT: PT, PT: PT,
    startSession: startSession, startWrong: startWrong, startOneWrong: startOneWrong, startExample: startExample,
    startArmFocus: startArmFocus,
    importJSON: importJSON, clearAll: clearAll,
    submit: submit, submitFix: submitFix, next: next, go: go, render: render,
    exportJSON: exportJSON, selfCheck: selfCheck
  };
})();
