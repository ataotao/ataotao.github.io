(function () {
  'use strict';
  var KEY = 'mathtrain_v1';
  var app = document.getElementById('app');
  var tabs = document.getElementById('tabs');

  /* ---------- 存储 ---------- */
  function blankDB() { return { v: MT.VERSION, recs: [], wrong: {}, days: {}, meta: { created: Date.now() } }; }
  var DB = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankDB();
      var o = JSON.parse(raw);
      if (!o || o.v !== MT.VERSION) {
        try { localStorage.setItem(KEY + '.bak', raw); } catch (e2) { }   /* 旧版本先留备份，再重置 */
        return blankDB();
      }
      o.recs = o.recs || []; o.wrong = o.wrong || {}; o.days = o.days || {}; o.meta = o.meta || {};
      return o;
    } catch (e) { return blankDB(); }
  })();
  var SAVE_FAIL = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); SAVE_FAIL = false; }
    catch (e) { SAVE_FAIL = true; }
  }
  /* 当天题单固化：同一天打开几次都是同一套；弱项只在换天后影响主力 */
  function dayPlan() {
    var d = today(), p = DB.meta && DB.meta.dayPlan;
    if (p && p.day === d && p.plan) return p.plan;
    var plan = MT.planForDay(d, weakKind());
    DB.meta = DB.meta || {};
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
  var VIEWS = { today: renderToday, write: renderModule, entry: renderModule, drill: renderModule, report: renderReport, practice: renderPractice, summary: renderSummary };
  function go(view) { S.view = view; render(); window.scrollTo(0, 0); }
  function render() {
    clear(app);
    var fn = VIEWS[S.view] || renderToday;
    fn();
    if (SAVE_FAIL) {
      app.appendChild(h('div', { class: 'fb bad', style: 'margin-top:10px' },
        '⚠ 记录没能存进本机（隐私模式或空间满）：刷新后会丢，请先「报告 → 导出 JSON」。'));
    }
    Array.prototype.forEach.call(tabs.children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-go') === S.view || (S.view === 'practice' && b.getAttribute('data-go') === S.sess.mod));
    });
  }

  /* ---------- 今日 ---------- */
  function renderToday() {
    var tr = todayRecs();
    var plan = dayPlan();
    var META = {
      drill: { n: 6, sub: '6 题 · 5 分钟 · ' + plan.drill.note },
      write: { n: 8, sub: '8 题 · 10 分钟 · ' + plan.write.note },
      entry: { n: 3, sub: '3 题 · 8 分钟 · 27 个得分点里按今天这套取 3 个' }
    };
    /* 顺序由 MT.modules 决定，这里只配题量与说明 */
    var tasks_plan = MT.modules.map(function (m) {
      var x = META[m.id] || { n: 6, sub: '' };
      return { mod: m.id, n: x.n, label: m.name, sub: x.sub, go: m.id };
    });
    var dueN = Object.keys(DB.wrong).filter(function (k) { return DB.wrong[k].due <= Date.now(); }).length;
    tasks_plan.push({ mod: 'wrong', n: 1, label: '错题回炉', sub: (dueN ? '到期 ' + dueN + ' 题' : '暂无到期') + ' · 2 分钟', go: 'wrong' });
    var done = {};
    tasks_plan.forEach(function (p) { done[p.mod] = 0; });
    tr.forEach(function (r) {
      if (r.mode === 'wrong') done.wrong++;
      else if (r.daily && done[r.mod] != null) done[r.mod]++;   /* 只有「今日题单」的题才算完成，专项 10 题不算 */
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
        h('li', null, '同一套内题干不重复；错题回炉按 1/3/7/14 天到期；跳过几天不累计欠账。')
      )
    ));

    var stats = h('div', { class: 'grid', style: 'margin-top:12px' },
      statCard('今日题数', tr.length),
      statCard('今日正确率', tr.length ? pct(tr.filter(function (r) { return r.ok; }).length, tr.length) + '%' : '—'),
      statCard('错题待回炉', Object.keys(DB.wrong).filter(function (k) { return DB.wrong[k].due <= Date.now(); }).length)
    );
    app.appendChild(stats);

    var mods = h('div', { class: 'grid', style: 'margin-top:16px' });
    MT.modules.forEach(function (m) {
      var card = h('div', { class: 'module' },
        h('div', { class: 'mh' }, h('span', null, m.icon), h('b', null, m.name)),
        h('div', { class: 'desc' }, m.desc),
        h('div', { class: 'kinds' }, (m.kinds || m.items.map(function (x) { return { name: x.title }; })).slice(0, 5).map(function (k) { return h('span', { class: 'kind' }, k.name); })),
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
    var head = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:19px' }, m.icon + ' ' + m.name)),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, m.desc)
    );
    app.appendChild(head);
    head.appendChild(h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn btn-primary', onclick: function () { startSession(m.id, null, m.id === 'entry' ? 3 : 8); } }, '开始一轮'),
      h('button', { class: 'btn', onclick: function () { startExample(m.id, lastKindOf(m.id)); } }, '先看例题')
    ));
    head.appendChild(h('div', { class: 'small muted', style: 'margin-top:8px' }, '「开始一轮」按题型混抽（每次不同）；下面按板块分组，每个题型可以单独连做 10 题（专项）。'));
    /* 分组：按 group 首次出现的顺序，同 group 的卡片排在一起；没有 group 就不出标题 */
    var groups = [], byGroup = {};
    if (m.kinds) m.kinds.forEach(function (k) {
      var g = k.group || '';
      if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(k);
    });
    var showGroupHead = groups.length > 1 || (groups.length === 1 && groups[0] !== '');
    var list = h('div', { style: 'margin-top:4px' });
    if (m.kinds) {
      groups.forEach(function (g) {
        if (showGroupHead && g) list.appendChild(h('div', { class: 'gsec' }, h('b', null, g), h('span', null, byGroup[g].length + ' 个题型')));
        var grid = h('div', { class: 'grid' });
        byGroup[g].forEach(function (k) {
          var st = kindStat('new', m.id, k.id);
          grid.appendChild(h('div', { class: 'module' },
            h('div', { class: 'mh' }, h('b', null, k.name)),
            h('div', { class: 'desc small muted' }, st.n ? '练过 ' + st.n + ' 题 · 正确率 ' + pct(st.ok, st.n) + '%' : '还没练过'),
            h('div', { class: 'row', style: 'margin-top:auto' },
              h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, k.id, 10); } }, '专项 10 题'),
              h('button', { class: 'btn btn-sm', onclick: function () { startExample(m.id, k.id); } }, '看例题')
            )
          ));
        });
        list.appendChild(grid);
      });
    } else {
      list.appendChild(h('div', { class: 'grid' }, h('div', { class: 'module' },
        h('div', { class: 'mh' }, h('b', null, '全部得分点混排')),
        h('div', { class: 'desc small muted' }, '共 ' + m.items.length + ' 个得分点，每次随机 3 个'),
        h('div', { class: 'row', style: 'margin-top:auto' },
          h('button', { class: 'btn btn-primary btn-sm', onclick: function () { startSession(m.id, null, 3); } }, '练 3 题'),
          h('button', { class: 'btn btn-sm', onclick: function () { startExample(m.id, null); } }, '看例题')
        )
      )));
    }
    app.appendChild(list);
  }
  /* 这个模块最近练过的题型（没有就返回 null，例题退化为随机） */
  function lastKindOf(mod) {
    var lk = DB.meta && DB.meta.lastKind;
    return (lk && lk[mod]) || null;
  }
  function kindStat(mode, mod, kind) {
    var rs = DB.recs.filter(function (r) { return r.mode === mode && r.mod === mod && r.kind === kind; });
    return { n: rs.length, ok: rs.filter(function (r) { return r.ok; }).length };
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
      var items = MT.moduleById('entry').items.map(function (x) {
        var c = JSON.parse(JSON.stringify(x)); c.mod = 'entry'; return c;
      });
      sess.queue = shuffle(items).slice(0, n);
      sess.total = sess.queue.length;
    }
    S.sess = sess;
    S.view = 'practice';
    nextQuestion();
  }
  /* 今日任务：用当天固定题单开一轮（不是现场随机） */
  function startDaily(modId) {
    S.back = null;
    var plan = dayPlan();
    var qs = MT.dailyQueue(modId, plan);
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
    var now = Date.now();
    var due = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).filter(function (w) { return w.due <= now; });
    if (!due.length) {
      var all = Object.keys(DB.wrong).length;
      alert(all ? '错题本里有 ' + all + ' 道，但还没到期（按 1/3/7/14 天回炉）。今天先练新的。' : '错题本是空的，先做几题吧。');
      return;
    }
    S.mode = 'wrong';
    S.sess = { mod: 'wrong', kind: null, total: Math.min(due.length, 5), done: 0, right: 0, t0: Date.now(), queue: due };
    S.view = 'practice';
    nextQuestion();
  }
  function nextQuestion() {
    var s = S.sess;
    if (s.done >= s.total) { S.view = 'summary'; render(); return; }
    if (S.mode === 'wrong') {
      S.q = s.queue[s.done];
    } else if (s.queue) {
      S.q = s.queue[s.done];
    } else {
      S.q = MT.gen(s.mod, s.kind, (Math.random() * 1e9) | 0);
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
    card.appendChild(h('div', { class: 'qbody', html: fracify(q.prompt) }));
    var ansBox = h('div', { class: 'fb good', style: 'margin-top:14px' });
    ansBox.appendChild(h('div', { class: 'ftitle' }, '答案'));
    var ul = h('ul');
    q.fields.forEach(function (f) {
      ul.appendChild(h('li', { html: (f.label ? f.label + ' ' : '') + fracify(MT.ansText(f)) }));
    });
    ansBox.appendChild(ul);
    card.appendChild(ansBox);
    var exBox = h('div', { class: 'fb', style: 'margin-top:10px' });
    exBox.appendChild(h('div', { class: 'ftitle' }, '怎么想'));
    (q.explain || []).forEach(function (line) { exBox.appendChild(h('div', { class: 'small', html: fracify(line) })); });
    card.appendChild(exBox);
    if (q.fig) {
      card.appendChild(h('div', { class: 'figcap' }, '图象'));
      card.appendChild(h('div', { class: 'figbox', html: MT.svgFor(q) }));
    }
    card.appendChild(h('div', { class: 'row', style: 'margin-top:14px' },
      h('button', { class: 'btn btn-primary', onclick: function () {
        if (S.back) {
          /* 从练习页点进来的：回到刚才那题，别把今日题单丢掉 */
          var b = S.back; S.back = null;
          S.q = b.q; S.sess = b.sess; S.draft = b.draft; S.choice = b.choice || {}; S.hint = !!b.hint;
          S.res = null; S.answered = false; S.fix = null; S.example = false;
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
      h('span', { class: 'pill' }, S.mode === 'wrong' ? '错题回炉' : (MT.moduleById(s.mod).name)),
      h('span', { class: 'small muted' }, (q.title || '')),
      h('span', { class: 'grow' }),
      h('span', { class: 'small muted' }, Math.min(s.done + (S.answered ? 0 : 1), s.total) + ' / ' + s.total)
    );
    app.appendChild(head);
    var prog = h('div', { class: 'progress' }, h('i', { style: 'width:' + (s.done / s.total * 100) + '%' }));
    app.appendChild(prog);

    var card = h('div', { class: 'card', style: 'margin-top:12px' });
    card.appendChild(h('div', { class: 'qhead' },
      h('span', { class: 'pill' }, q.no ? qnoLabel(q.no) : (q.mod === 'entry' ? '得分点' : '新题')),
      q.kp ? h('span', { class: 'small muted' }, q.kp.join(' · ')) : null
    ));
    card.appendChild(h('div', { class: 'qbody', html: fracify(q.prompt) }));

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
        } }, '例题')
      ));
      card.appendChild(h('div', { class: 'small muted' }, '负号写哪儿都算对；回车提交。'));
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
          html: (f.label ? f.label + ' ' : '') + '正确答案：' + fracify(MT.ansText(f)) +
            (S.res.res[i].ok ? '' : '（你填的是 ' + fracify(rawAns(i)) + '）')
        }));
      });
      fb.appendChild(ul);
      (q.explain || []).forEach(function (line) { fb.appendChild(h('div', { class: 'small', html: fracify(line) })); });
      if (q.fig) {
        fb.appendChild(h('div', { class: 'figcap' }, '图象验证：上面的式子画出来是这样——对着图再读一遍顶点、交点、增减。'));
        fb.appendChild(h('div', { class: 'figbox', html: MT.svgFor(q) }));
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
  function fracVal(o) {
    return MT.parseNum(o);
  }
  /* 把文本里的 1/2、-1/2、1/-2 都显示成上下结构的分数（负号统一放分子前） */
  function fracify(s) {
    return String(s).replace(/([−-]?)(\d+)\s*\/\s*([−-]?)(\d+)/g, function (m, sa, a, sb, b) {
      var neg = (sa === '-' || sa === '−') !== (sb === '-' || sb === '−');
      return '<span class="frac"><i>' + (neg ? '−' : '') + a + '</i><i>' + b + '</i></span>';
    });
  }
  function readDraft() {
    var out = [];
    S.q.fields.forEach(function (f, i) {
      if (f.type === 'choice') { out.push(''); return; }
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
    if (f.type === 'choice') return S.choice[i] == null ? '空' : String.fromCharCode(65 + S.choice[i]);
    if (f.type === 'set' || f.type === 'expr') {
      return (v || []).map(function (o) { return o ? String(o) : '空'; }).join('、');
    }
    return v ? String(v) : '空';
  }

  /* ---------- 当日题单快照：那天到底做了哪几题（复盘用，只留最近 14 天） ---------- */
  var SNAP_DAYS = 14;
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
    /* 一个空都没填（含选择题未选）时不判分、不记记录、不进错题本 */
    var anyFilled = q.fields.some(function (f, i) {
      if (f.type === 'choice') return S.choice[i] != null;
      var d = draft[i];
      return Array.isArray(d) ? d.some(function (x) { return String(x).trim() !== ''; }) : String(d == null ? '' : d).trim() !== '';
    });
    if (!anyFilled) { alert('先填答案再提交'); return; }
    var vals = q.fields.map(function (f, i) {
      if (f.type === 'choice') return S.choice[i] == null ? null : S.choice[i];
      if (f.type === 'set' || f.type === 'expr') return draft[i].map(fracVal);
      return fracVal(draft[i]);
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
    DB.recs.push({ ts: Date.now(), mod: recMod, kind: q.kind, kn: q.title, ok: res.ok, got: res.got, total: res.total, sec: sec, hint: S.hint, mode: S.mode, daily: !!s.daily });
    /* 记住这个模块最近练的题型：模块页「先看例题」用它，别随机抽到别的题型 */
    if (q.kind) { DB.meta.lastKind = DB.meta.lastKind || {}; DB.meta.lastKind[recMod] = q.kind; }
    snapAdd(s.mod === 'wrong' ? (S.q.mod || 'drill') : s.mod, q, res, sec);
    if (!res.ok) addWrong(q);
    else removeWrong(q);   /* 任何模式答对都移出错题本（11-12 卡判据：答对自动移出） */
    save();
    render();
  }
  function submitFix() {
    if (!S.fix || S.fix.ok) return;
    var q = S.q, fields = [], vals = [];
    S.fix.fields.forEach(function (i) {
      var f = q.fields[i];
      fields.push(f);
      if (f.type === 'set' || f.type === 'expr') {
        var arr = [];
        for (var j = 0; j < nSlots(f); j++) {
          var el = document.getElementById('fx' + i + '_' + j);
          arr.push(MT.parseNum(el ? el.value : ''));
        }
        vals.push(arr);
      } else {
        var el2 = document.getElementById('fx' + i);
        vals.push(MT.parseNum(el2 ? el2.value : ''));
      }
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

  /* ---------- 错题本 ---------- */
  function wrongKey(q) { return q.id + '|' + String(q.prompt).slice(0, 60); }
  function addWrong(q) {
    var k = wrongKey(q);
    var w = DB.wrong[k];
    var now = Date.now();
    var n = w ? (w.n || 1) + 1 : 1;
    var gap = n <= 1 ? 1 : (n === 2 ? 3 : (n === 3 ? 7 : 14));
    DB.wrong[k] = {
      id: q.id, mod: q.mod || S.sess.mod, kind: q.kind, title: q.title, prompt: q.prompt,
      fields: q.fields, explain: q.explain, tip: q.tip, no: q.no, fig: q.fig,
      ts: now, due: now + gap * MT.DAY, n: n
    };
  }
  function removeWrong(q) { delete DB.wrong[wrongKey(q)]; }

  /* ---------- 本轮总结 ---------- */
  function renderSummary() {
    var s = S.sess;
    var mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
    app.appendChild(h('div', { class: 'card', style: 'text-align:center;padding:28px 18px' },
      h('div', { style: 'font-size:44px;line-height:1.1' }, s.right === s.total ? '🎉' : (s.right / s.total >= .6 ? '👍' : '💪')),
      h('h2', { style: 'margin:8px 0 4px' }, s.right + ' / ' + s.total + ' 全对'),
      h('p', { class: 'muted' }, '用时约 ' + mins + ' 分钟 · 正确率 ' + pct(s.right, s.total) + '%'),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: function () { if (s.mod === 'wrong') startWrong(); else if (s.daily) startDaily(s.mod); else startSession(s.mod, s.kind, s.total); } }, '再来一轮'),
        h('button', { class: 'btn', onclick: function () { go('today'); } }, '回今日')
      )
    ));
    var tips = [];
    if (s.right / s.total < .6) tips.push('正确率偏低：先点「看提示」把例题看懂，再独立做一遍。');
    if (s.mod === 'write' && s.right / s.total < .8) tips.push('写解析式的目标是一次就对：设 → 代 → 求，三步各写一行。');
    if (s.mod === 'entry' && s.right / s.total < .7) tips.push('前两步的关键是「先落笔」：写出设、列出式子，比算完更重要。');
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
      var dueTxt = w.due <= Date.now() ? '已到期' : ('还有 ' + Math.ceil((w.due - Date.now()) / MT.DAY) + ' 天');
      wc.appendChild(h('div', { class: 'wrongitem' },
        h('div', { class: 'wt', html: String(w.prompt).replace(/<br>/g, ' ').slice(0, 80) + '…' }),
        h('div', { class: 'small muted' }, dueTxt)
      ));
    });
    wc.appendChild(h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn btn-primary btn-sm', onclick: startWrong }, '回炉到期的')
    ));
    app.appendChild(wc);

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
          /* 去重：同一份 JSON 导入两次不会把统计翻倍 */
          var seen = {};
          DB.recs.forEach(function (r) { seen[r.ts + '|' + r.mod + '|' + r.kind] = 1; });
          var added = 0;
          o.recs.forEach(function (r) {
            if (!r || typeof r.ts !== 'number') return;
            var kk = r.ts + '|' + r.mod + '|' + r.kind;
            if (seen[kk]) return;
            seen[kk] = 1; DB.recs.push(r); added++;
          });
          Object.keys(o.wrong || {}).forEach(function (k) {
            var w = o.wrong[k];
            if (!w || !Array.isArray(w.fields) || typeof w.due !== 'number') return;   /* 结构坏的错题跳过 */
            DB.wrong[k] = w;
          });
          Object.keys(o.days || {}).forEach(function (k) {
            var src = o.days[k];
            if (!src || !Array.isArray(src.qs)) return;
            var dst = DB.days[k] || (DB.days[k] = { qs: [] });
            dst.qs = dst.qs.concat(src.qs);
          });
          save(); render(); alert('已导入 ' + added + ' 条记录（重复的已跳过）');
        } catch (e) { alert('导入失败：' + e.message); }
      };
      fr.readAsText(f);
    };
    inp.click();
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
    e.preventDefault();
    if (!S.answered) { submit(); return; }
    if (S.fix && !S.fix.ok) { submitFix(); return; }
    next();
  });
  (function boot() {
    var m = (location.hash || '').match(/view=([a-z]+)/);
    var v = m && m[1];
    if (v === 'write' || v === 'entry' || v === 'drill') { go(v); return; }
    if (v === 'report') { go('report'); return; }
    go('today');
  })();

  /* 调试/自测钩子：不参与界面，供 node 里的 DOM 桩测试使用 */
  window.__mt = {
    S: S, db: function () { return DB; },
    startSession: startSession, startWrong: startWrong, startDaily: startDaily, startExample: startExample,
    plan: function () { return dayPlan(); },
    submit: submit, submitFix: submitFix, next: next, go: go, render: render
  };
})();
