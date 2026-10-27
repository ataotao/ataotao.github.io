/* =============================================================
   概念闪练：快练一轮 / 按考点练 / 错卡重练
   卡片数据来自 源/data/concepts.json（build 时注入 PHYS.DATA.concepts）
   只使用 PHYS.* API；样式用 PHYS.ui.addCSS 注入，类名以 .cd- 前缀
   ============================================================= */
(function () {
  'use strict';

  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui;

  /* 与 SPEC 第 3 节一致（仅用于展示顺序，校验在 build 做） */
  var TAGS = [
    '杠杆五要素', '杠杆平衡条件', '杠杆分类', '最小力', '杠杆动态平衡',
    '定滑轮与动滑轮', '滑轮组', '功', '功率', '机械效率', '测机械效率实验',
    '动能与势能', '机械能转化', '分子动理论', '扩散现象', '分子间作用力',
    '内能', '改变内能的方式', '温度热量内能辨析', '比热容', '热量计算', '热值', '热机效率', '能量守恒', '实验探究'
  ];
  var TOPICS = ['杠杆', '滑轮', '功和功率', '机械效率', '机械能', '分子与内能', '比热容与热值', '热机与能量', '实验探究'];
  var LEVELS = ['未练', '生疏', '熟悉', '掌握'];
  var LEVEL_CLS = ['cd-lv0', 'cd-lv1', 'cd-lv2', 'cd-lv3'];
  var QUICK_N = 20;
  var LETTERS = 'ABCD';

  var CSS = `
.cd-wrap{max-width:100%}
.cd-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}
.cd-back{min-height:40px;padding:6px 9px}
.cd-round{font-size:13px;font-weight:700;color:var(--brand-d)}
.cd-streak{font-size:12.5px;color:var(--muted);white-space:nowrap}
.cd-streak b{font-variant-numeric:tabular-nums}
.cd-streak.hot{color:var(--ok);font-weight:700}
.cd-pbar{height:8px;border-radius:99px;background:#eeeae2;overflow:hidden}
.cd-pbar>i{display:block;height:100%;background:var(--brand);border-radius:99px;transition:width .3s}
.cd-counter{font-size:12.5px;color:var(--muted);margin:6px 0 10px}
.cd-card{padding:18px 20px}
.cd-replay{border-color:#f0dcc0;background:linear-gradient(180deg,#fffdf8,#fff)}
.cd-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.cd-q{font-size:17px;line-height:1.85;margin:0 0 4px;white-space:pre-wrap;word-break:break-word}
.cd-judge{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.cd-jbtn{min-height:64px;border-radius:12px;border:1.5px solid var(--line);background:#fff;font-size:19px;font-weight:700;
  display:flex;align-items:center;justify-content:center;gap:9px;transition:.13s}
.cd-jbtn i{font-style:normal;font-size:17px;color:var(--muted)}
.cd-jbtn:hover{border-color:var(--brand);background:var(--brand-l)}
.cd-jbtn.ok{border-color:#9dd3b4;background:var(--ok-bg);color:var(--ok)}
.cd-jbtn.ok i{color:var(--ok)}
.cd-jbtn.no{border-color:#e5b3af;background:var(--bad-bg);color:var(--bad)}
.cd-jbtn.no i{color:var(--bad)}
.cd-jbtn.dim{opacity:.45}
.cd-opts{display:flex;flex-direction:column;gap:9px;margin-top:16px}
.cd-opt{display:flex;gap:11px;align-items:flex-start;width:100%;min-height:48px;padding:11px 13px;border:1.5px solid var(--line);
  border-radius:11px;background:#fff;font-size:14.5px;line-height:1.65;text-align:left;transition:.13s}
.cd-opt .k{width:22px;height:22px;flex:0 0 22px;border-radius:6px;background:#f0ede6;color:var(--muted);
  font-size:12px;font-weight:700;display:grid;place-items:center;margin-top:1px}
.cd-opt .t{flex:1;min-width:0;word-break:break-word}
.cd-opt:hover{border-color:#bfd0dc;background:#fcfdfd}
.cd-opt.ok{border-color:#9dd3b4;background:var(--ok-bg)}
.cd-opt.ok .k{background:var(--ok);color:#fff}
.cd-opt.no{border-color:#e5b3af;background:var(--bad-bg)}
.cd-opt.no .k{background:var(--bad);color:#fff}
.cd-opt.dim{opacity:.5}
.cd-fb{margin-top:16px;padding:12px 14px;border-radius:11px;font-size:14.5px;line-height:1.75}
.cd-fb.ok{background:var(--ok-bg);border:1px solid #cfe6d8;color:#1c5f3c}
.cd-fb.bad{background:var(--bad-bg);border:1px solid #eccfcd;color:#8d2a2a}
.cd-fb b{font-weight:700}
.cd-fb .ans{display:block;margin-top:3px;font-size:13.5px}
.cd-why{margin-top:8px;font-size:14px;line-height:1.8;color:var(--ink2);font-weight:400}
.cd-why b{color:var(--brand-d)}
.cd-next{margin-top:14px;width:100%;min-height:46px}
.cd-kbd{margin-top:8px;text-align:center}
.cd-hero h2.cd-h2{font-size:19px;margin-top:10px;line-height:1.5}
.cd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 4px}
.cd-stat{background:#fbf9f5;border:1px solid var(--line);border-radius:10px;padding:8px 10px}
.cd-stat b{display:block;font-size:18px;line-height:1.35;color:var(--brand-d);font-variant-numeric:tabular-nums}
.cd-stat span{font-size:11.5px;color:var(--muted)}
.cd-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
.cd-big{min-height:44px;padding:10px 16px;font-size:14.5px}
.cd-hero .cd-actions .cd-big{flex:1;min-width:140px}
.cd-note{margin-top:10px}
.cd-levels{display:grid;gap:9px;margin-top:10px}
.cd-lvrow{display:flex;align-items:center;gap:10px}
.cd-lvrow .cd-lvpill{min-width:86px;text-align:center}
.cd-lvrow .bar{flex:1;min-width:0}
.cd-lvpill{font-size:11.5px;padding:2px 8px;border-radius:999px;white-space:nowrap;display:inline-block}
.cd-lv0{background:#f2efe8;color:var(--muted)}
.cd-lv1{background:var(--bad-bg);color:var(--bad)}
.cd-lv2{background:var(--warn-bg);color:var(--warn)}
.cd-lv3{background:var(--ok-bg);color:var(--ok)}
.cd-taggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:9px}
.cd-tagbtn{width:100%;min-height:58px;text-align:left;padding:9px 11px;border:1px solid var(--line);border-radius:10px;
  background:#fff;box-shadow:var(--sh);transition:.13s}
.cd-tagbtn:hover{border-color:var(--brand);background:#fbfdff}
.cd-tagbtn b{display:block;font-size:13.5px;line-height:1.45}
.cd-tagbtn span{display:block;font-size:11.5px;color:var(--muted);margin-top:1px}
.cd-mini{height:5px;border-radius:99px;background:#eeeae2;overflow:hidden;margin-top:7px}
.cd-mini>i{display:block;height:100%;background:var(--ok);border-radius:99px}
.cd-listcard{padding:16px 18px}
.cd-listhdrow{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:10px 0 2px}
.cd-listhd{font-size:14px;color:var(--brand-d);margin-bottom:4px}
.cd-listrow{display:flex;gap:10px;align-items:flex-start;width:100%;min-height:44px;padding:9px 4px;border:0;
  border-bottom:1px dashed var(--line);background:none;text-align:left}
.cd-listrow:last-child{border-bottom:0}
.cd-listrow:hover{background:#fcfbf8}
.cd-listq{flex:1;min-width:0;font-size:13.5px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden}
.cd-listmeta{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex:0 0 auto}
.cd-listtags{font-size:11px;color:var(--muted);max-width:150px;text-align:right;line-height:1.4}
.cd-score{font-size:40px;font-weight:700;color:var(--brand-d);line-height:1.15;font-variant-numeric:tabular-nums;margin-top:10px}
.cd-score-sub{font-size:18px;color:var(--muted);font-weight:600;margin-left:4px}
.cd-wrongrow{padding:10px 0;border-bottom:1px dashed var(--line)}
.cd-wrongrow:last-child{border-bottom:0}
.cd-wrongq{font-size:14px;line-height:1.7;font-weight:600}
.cd-wrongmeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.cd-pagehead h2{font-size:16.5px}
@media (max-width:520px){
  .cd-stats{grid-template-columns:1fr 1fr}
  .cd-hero .cd-actions .cd-big{flex:1 1 100%;min-width:0}
  .cd-q{font-size:16px}
  .cd-jbtn{min-height:56px;font-size:17px}
  .cd-card{padding:15px 14px}
  .cd-score{font-size:34px}
  .cd-listcard{padding:14px 13px}
}
`;
  UI.addCSS(CSS);

  /* ---------------- 数据与进度读取 ---------------- */
  var BY_ID = null;
  function allCards() { return (PHYS.DATA && PHYS.DATA.concepts) || []; }
  function cardById(id) {
    if (!BY_ID) {
      BY_ID = {};
      allCards().forEach(function (c) { BY_ID[c.id] = c; });
    }
    return BY_ID[id] || null;
  }
  function recOf(id) { return PHYS.store.get('concept.' + id, null); }
  function lvOf(id) { return PHYS.progress.conceptLevel(id); }
  function isFresh(id) { var r = recOf(id); return !r || !r.n; }
  function isDue(id) {
    var r = recOf(id);
    return !!(r && r.n && r.due && r.due <= U.today());
  }
  function freshTotal() {
    var n = 0;
    allCards().forEach(function (c) { if (isFresh(c.id)) n++; });
    return n;
  }
  function dueTotal() {
    var n = 0;
    allCards().forEach(function (c) { if (isDue(c.id)) n++; });
    return n;
  }
  function levelCounts() {
    var a = [0, 0, 0, 0];
    allCards().forEach(function (c) { a[lvOf(c.id)]++; });
    return a;
  }
  function wrongIds() {
    var out = [], seen = {};
    PHYS.progress.wrongList().forEach(function (w) {
      if (w.kind !== 'concept' || !w.cid) return;
      if (seen[w.cid] || !cardById(w.cid)) return;
      seen[w.cid] = 1;
      out.push(w.cid);
    });
    return out;
  }

  /* ---------------- 选题 ---------------- */
  /* 快练一轮：未练 > 到期 > 生疏 > 熟悉 > 掌握；各档内部打乱，凑满 20 张 */
  function pickQuick(n) {
    var buckets = [[], [], [], [], []];
    allCards().forEach(function (c) {
      var l = lvOf(c.id);
      if (isFresh(c.id)) buckets[0].push(c.id);
      else if (isDue(c.id)) buckets[1].push(c.id);
      else if (l <= 1) buckets[2].push(c.id);
      else if (l === 2) buckets[3].push(c.id);
      else buckets[4].push(c.id);
    });
    buckets[1].sort(function (a, b) {
      var ra = recOf(a) || {}, rb = recOf(b) || {};
      return String(ra.due || '').localeCompare(String(rb.due || ''));
    });
    var out = [], i, j, arr;
    for (i = 0; i < buckets.length && out.length < n; i++) {
      arr = i === 1 ? buckets[i] : U.shuffle(buckets[i]);
      for (j = 0; j < arr.length && out.length < n; j++) out.push(arr[j]);
    }
    return out;
  }
  function idsByTag(tag) {
    return U.shuffle(allCards().filter(function (c) {
      return c.tags && c.tags.indexOf(tag) >= 0;
    }).map(function (c) { return c.id; }));
  }
  /* ?topic=杠杆 按主题（9 个）练；?tag=杠杆五要素 按考点（25 个）练 */
  function idsByTopic(topic) {
    return U.shuffle(allCards().filter(function (c) {
      return c.topic === topic;
    }).map(function (c) { return c.id; }));
  }

  /* ---------------- 路由 / 会话 ---------------- */
  var S = null;
  var keyHandler = null;

  function hashFor(params) {
    var q = [];
    params = params || {};
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return '#/concept' + (q.length ? '?' + q.join('&') : '');
  }
  /* 页面切换：目标 hash 与当前一致时直接本地重绘，否则让 hashchange 触发整页重挂载 */
  function nav(params) {
    if (!S) return;
    var target = hashFor(params);
    if (location.hash === target || (location.hash === '' && target === '#/concept')) {
      S.params = params || {};
      S.quiz = null;
      route();
    } else {
      location.hash = target;
    }
  }

  function route() {
    var p = S.params || {};
    if (p.tag) {
      startQuiz({ kind: 'tag', tag: p.tag, label: '考点 · ' + p.tag, back: { mode: 'tags' } });
      return;
    }
    if (p.topic) {
      /* 兼容 #/concept?topic=杠杆（主题）与 #/concept?topic=杠杆五要素（考点）两种写法 */
      if (TOPICS.indexOf(p.topic) >= 0) {
        startQuiz({ kind: 'topic', topic: p.topic, label: '主题 · ' + p.topic, back: { mode: 'list' } });
      } else {
        startQuiz({ kind: 'tag', tag: p.topic, label: '考点 · ' + p.topic, back: { mode: 'tags' } });
      }
      return;
    }
    if (p.mode === 'wrong') { startQuiz({ kind: 'wrong', label: '错卡重练', back: {} }); return; }
    if (p.mode === 'list') { S.page = 'list'; renderList(); return; }
    if (p.mode === 'tags') { S.page = 'tags'; renderTags(); return; }
    if (p.card) {
      var c = cardById(p.card);
      if (c) { startQuiz({ kind: 'single', cid: c.id, label: '单张练习', back: { mode: 'list' } }); return; }
    }
    S.page = 'home';
    renderHome();
  }

  function resolveIds(o) {
    if (o.kind === 'quick') return pickQuick(QUICK_N);
    if (o.kind === 'tag') return idsByTag(o.tag);
    if (o.kind === 'topic') return idsByTopic(o.topic);
    if (o.kind === 'wrong') return wrongIds();
    if (o.kind === 'single') return o.cid ? [o.cid] : [];
    return (o.ids || []).slice();
  }

  function startQuiz(o) {
    if (!S) return;
    var ids = resolveIds(o);
    if (!ids.length) {
      UI.toast(o.kind === 'wrong' ? '暂时没有错卡，先练一轮吧' : '这个考点还没有卡片', 'info');
      nav(o.kind === 'wrong' ? {} : { mode: 'tags' });
      return;
    }
    if (o.kind === 'wrong' && ids.length > QUICK_N) ids = ids.slice(0, QUICK_N);
    S.page = 'quiz';
    S.quiz = {
      options: {
        kind: o.kind, tag: o.tag, topic: o.topic, cid: o.cid, label: o.label || '概念闪练',
        back: o.back || {},
        ids: o.kind === 'custom' || o.kind === 'single' ? ids.slice() : null
      },
      ids: ids.slice(),
      totalFirst: ids.length,
      i: 0,
      firstOk: {},
      wrongIds: [],
      replay: {},
      requeued: {},
      replayOk: {},
      streak: 0,
      best: 0,
      locked: false,
      chosen: null,
      ok: null
    };
    renderQuiz();
  }

  function nextCard() {
    var q = S && S.quiz;
    if (!q) return;
    q.i++;
    q.locked = false;
    q.chosen = null;
    q.ok = null;
    renderQuiz();
  }

  function answer(val) {
    var q = S && S.quiz;
    if (!q || q.locked) return;
    var card = cardById(q.ids[q.i]);
    if (!card) return;
    var ok = card.type === 'judge' ? (val === card.ans) : PHYS.judge.choice(val, card.ans);
    q.locked = true;
    q.chosen = val;
    q.ok = ok;

    if (q.replay[q.i]) {
      if (ok) q.replayOk[card.id] = true;
    } else {
      q.firstOk[card.id] = ok;
      if (!ok) q.wrongIds.push(card.id);
    }

    if (ok) {
      q.streak++;
      if (q.streak > q.best) q.best = q.streak;
    } else {
      q.streak = 0;
    }

    /* 答错的卡本轮末尾再出现一次（只重排一次） */
    if (!ok && !q.requeued[card.id]) {
      q.requeued[card.id] = true;
      q.ids.push(card.id);
      q.replay[q.ids.length - 1] = true;
    }

    PHYS.progress.conceptAnswer({ cid: card.id, ok: ok });
    renderQuiz();
  }

  /* ---------------- 通用小组件 ---------------- */
  function bigBtn(text, cls, fn) {
    var b = UI.el('button', { class: 'btn cd-big ' + (cls || ''), type: 'button', text: text });
    b.addEventListener('click', fn);
    return b;
  }
  function pageHead(title, sub, backParams, tail) {
    var card = UI.el('div', { class: 'card cd-pagehead' });
    var row = UI.el('div', { class: 'row' });
    row.appendChild(UI.el('h2', { style: 'margin:0', text: title }));
    row.appendChild(UI.el('span', { class: 'spacer' }));
    if (tail) row.appendChild(tail);
    var back = UI.el('button', { class: 'btn-ghost cd-back', type: 'button', text: '← 返回' });
    back.addEventListener('click', function () { nav(backParams || {}); });
    row.appendChild(back);
    card.appendChild(row);
    if (sub) card.appendChild(UI.el('p', { class: 'small muted', style: 'margin-top:6px', text: sub }));
    return card;
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var root = S.root;
    root.innerHTML = '';
    var cards = allCards();
    if (!cards.length) {
      root.appendChild(UI.el('div', { class: 'card empty', text: '还没有概念卡数据：先跑一次构建脚本。' }));
      return;
    }
    var lc = levelCounts();
    var freshN = freshTotal(), dueN = dueTotal(), wrongN = wrongIds().length;

    var hero = UI.el('div', { class: 'card cd-hero' });
    hero.appendChild(UI.el('div', { class: 'row' }, [
      UI.el('span', { class: 'tag', text: '概念闪练' }),
      UI.el('span', { class: 'tag-soft', text: '2 分钟一轮' })
    ]));
    hero.appendChild(UI.el('h2', { class: 'cd-h2', text: '概念先过关，再谈做题。' }));
    hero.appendChild(UI.el('p', {
      class: 'small muted', style: 'margin-top:6px',
      text: '每天 2 分钟，把易混的概念刷到「掌握」。答完马上给一句话解释；答错的卡会在本轮末尾再出现一次。'
    }));

    var stats = UI.el('div', { class: 'cd-stats' });
    [['全部卡片', cards.length], ['今天该复习', freshN + dueN], ['已掌握', lc[3]], ['错卡待重练', wrongN]]
      .forEach(function (it) {
        var d = UI.el('div', { class: 'cd-stat' });
        d.appendChild(UI.el('b', { text: String(it[1]) }));
        d.appendChild(UI.el('span', { text: it[0] }));
        stats.appendChild(d);
      });
    hero.appendChild(stats);

    var acts = UI.el('div', { class: 'cd-actions' });
    acts.appendChild(bigBtn('快练一轮 · ' + Math.min(QUICK_N, cards.length) + ' 张', 'btn-primary', function () {
      startQuiz({ kind: 'quick', label: '快练一轮', back: {} });
    }));
    acts.appendChild(bigBtn('按考点练', '', function () { nav({ mode: 'tags' }); }));
    var wb = bigBtn('错卡重练 · ' + wrongN, '', function () {
      startQuiz({ kind: 'wrong', label: '错卡重练', back: {} });
    });
    if (!wrongN) wb.disabled = true;
    acts.appendChild(wb);
    hero.appendChild(acts);
    hero.appendChild(UI.el('p', {
      class: 'tiny muted cd-note',
      text: '今天该复习 = 到期 ' + dueN + ' 张 + 还没练过 ' + freshN + ' 张。'
    }));
    root.appendChild(hero);

    var lvCard = UI.el('div', { class: 'card' });
    lvCard.appendChild(UI.el('h2', { text: '熟练度' }));
    var levels = UI.el('div', { class: 'cd-levels' });
    LEVELS.forEach(function (label, i) {
      var row = UI.el('div', { class: 'cd-lvrow' });
      row.appendChild(UI.el('span', { class: 'cd-lvpill ' + LEVEL_CLS[i], text: label + ' ' + lc[i] + ' 张' }));
      var bar = UI.el('div', { class: 'bar ' + (i === 3 ? 'ok' : i === 2 ? '' : 'warn') });
      bar.innerHTML = '<i style="width:' + Math.round(lc[i] / cards.length * 100) + '%"></i>';
      row.appendChild(bar);
      levels.appendChild(row);
    });
    lvCard.appendChild(levels);
    lvCard.appendChild(UI.el('p', {
      class: 'tiny muted', style: 'margin-top:8px',
      text: '规则：连对 2 次且正确率 ≥80% 记为「掌握」，正确率 ≥60% 记为「熟悉」，其余练过的记为「生疏」。'
    }));
    var lrow = UI.el('div', { class: 'row', style: 'margin-top:10px' });
    var lb = UI.el('button', { class: 'btn-mini', type: 'button', text: '看全部 ' + cards.length + ' 张卡片 →' });
    lb.addEventListener('click', function () { nav({ mode: 'list' }); });
    lrow.appendChild(lb);
    lvCard.appendChild(lrow);
    root.appendChild(lvCard);
    window.scrollTo(0, 0);
  }

  /* ---------------- 按考点练 ---------------- */
  function renderTags() {
    var root = S.root;
    root.innerHTML = '';
    root.appendChild(pageHead('按考点练', '点一个考点，只练这一类。数字是「已掌握 / 总张数」。', {}));
    var grid = UI.el('div', { class: 'cd-taggrid' });
    TAGS.forEach(function (tag) {
      var cs = allCards().filter(function (c) { return c.tags && c.tags.indexOf(tag) >= 0; });
      if (!cs.length) return;
      var m = 0;
      cs.forEach(function (c) { if (lvOf(c.id) === 3) m++; });
      var b = UI.el('button', { class: 'cd-tagbtn', type: 'button' });
      b.innerHTML = '<b>' + UI.escape(tag) + '</b>' +
        '<span>' + m + ' / ' + cs.length + ' 张已掌握</span>' +
        '<div class="cd-mini"><i style="width:' + Math.round(m / cs.length * 100) + '%"></i></div>';
      b.addEventListener('click', function () { nav({ tag: tag }); });
      grid.appendChild(b);
    });
    root.appendChild(grid);
    window.scrollTo(0, 0);
  }

  /* ---------------- 全部卡片 ---------------- */
  function renderList() {
    var root = S.root;
    root.innerHTML = '';
    var tail = UI.el('span', { class: 'tiny muted', text: '共 ' + allCards().length + ' 张' });
    root.appendChild(pageHead('全部卡片', '点一张卡直接练这一张。等级：未练 / 生疏 / 熟悉 / 掌握。', {}, tail));
    var box = UI.el('div', { class: 'card cd-listcard' });
    var seen = {};
    TOPICS.forEach(function (topic) {
      var cs = allCards().filter(function (c) { return c.topic === topic; });
      if (!cs.length) return;
      seen[topic] = 1;
      var hrow = UI.el('div', { class: 'cd-listhdrow' });
      hrow.appendChild(UI.el('h3', { class: 'cd-listhd', text: topic + ' · ' + cs.length + ' 张' }));
      var tb = UI.el('button', { class: 'btn-mini', type: 'button', text: '练这一主题 →' });
      tb.addEventListener('click', function () { nav({ topic: topic }); });
      hrow.appendChild(tb);
      box.appendChild(hrow);
      cs.forEach(function (c) {
        var l = lvOf(c.id);
        var row = UI.el('button', { class: 'cd-listrow', type: 'button' });
        var q = UI.el('span', { class: 'cd-listq', text: c.q });
        var meta = UI.el('span', { class: 'cd-listmeta' });
        meta.appendChild(UI.el('span', { class: 'cd-lvpill ' + LEVEL_CLS[l], text: LEVELS[l] }));
        meta.appendChild(UI.el('span', { class: 'cd-listtags', text: (c.tags || []).join(' · ') }));
        row.appendChild(q);
        row.appendChild(meta);
        row.addEventListener('click', function () { nav({ card: c.id }); });
        box.appendChild(row);
      });
    });
    /* 兜底：topic 不在清单里的卡也列出来（正常数据不会出现） */
    var rest = allCards().filter(function (c) { return !seen[c.topic]; });
    if (rest.length) {
      box.appendChild(UI.el('h3', { class: 'cd-listhd', text: '其他 · ' + rest.length + ' 张' }));
      rest.forEach(function (c) {
        var l = lvOf(c.id);
        var row = UI.el('button', { class: 'cd-listrow', type: 'button' });
        row.appendChild(UI.el('span', { class: 'cd-listq', text: c.q }));
        row.appendChild(UI.el('span', { class: 'cd-lvpill ' + LEVEL_CLS[l], text: LEVELS[l] }));
        row.addEventListener('click', function () { nav({ card: c.id }); });
        box.appendChild(row);
      });
    }
    root.appendChild(box);
    window.scrollTo(0, 0);
  }

  /* ---------------- 做题 ---------------- */
  function renderQuiz() {
    var q = S && S.quiz;
    if (!q) { route(); return; }
    var root = S.root;
    root.innerHTML = '';
    if (q.i >= q.ids.length) { renderDone(); return; }
    var card = cardById(q.ids[q.i]);
    if (!card) { q.i++; renderQuiz(); return; }

    var wrap = UI.el('div', { class: 'cd-wrap' });
    var top = UI.el('div', { class: 'cd-top' });
    var back = UI.el('button', { class: 'btn-ghost cd-back', type: 'button', text: '← 退出' });
    back.addEventListener('click', function () { nav(q.options.back || {}); });
    top.appendChild(back);
    top.appendChild(UI.el('span', { class: 'cd-round', text: q.options.label || '概念闪练' }));
    top.appendChild(UI.el('span', { class: 'spacer' }));
    var streak = UI.el('span', { class: 'cd-streak' + (q.streak >= 3 ? ' hot' : '') });
    streak.innerHTML = '连对 <b>' + q.streak + '</b>';
    top.appendChild(streak);
    wrap.appendChild(top);

    var pbar = UI.el('div', { class: 'cd-pbar' });
    pbar.innerHTML = '<i style="width:' + Math.round((q.i + (q.locked ? 1 : 0)) / q.ids.length * 100) + '%"></i>';
    wrap.appendChild(pbar);
    wrap.appendChild(UI.el('div', {
      class: 'cd-counter',
      text: '第 ' + (q.i + 1) + ' / ' + q.ids.length + ' 张' + (q.replay[q.i] ? ' · 刚才答错的卡，再来一次' : '')
    }));

    var cardEl = UI.el('div', { class: 'card cd-card' + (q.replay[q.i] ? ' cd-replay' : '') });
    var meta = UI.el('div', { class: 'cd-meta' });
    meta.appendChild(UI.el('span', { class: 'tag', text: card.topic }));
    (card.tags || []).forEach(function (t) { meta.appendChild(UI.el('span', { class: 'tag-soft', text: t })); });
    meta.appendChild(UI.el('span', { class: 'tag-soft', text: card.type === 'judge' ? '判断' : '选择' }));
    meta.appendChild(UI.el('span', { class: 'tag-soft', text: '难度 ' + card.diff }));
    cardEl.appendChild(meta);
    cardEl.appendChild(UI.el('p', { class: 'cd-q', text: card.q }));
    cardEl.appendChild(card.type === 'judge' ? judgeArea(card, q) : choiceArea(card, q));
    if (q.locked) cardEl.appendChild(feedback(card, q));
    wrap.appendChild(cardEl);

    if (q.locked) {
      var next = UI.el('button', {
        class: 'btn btn-primary cd-big cd-next', type: 'button',
        text: q.i + 1 >= q.ids.length ? '看本轮结果 →' : '下一张 →'
      });
      next.addEventListener('click', nextCard);
      wrap.appendChild(next);
      wrap.appendChild(UI.el('p', { class: 'tiny muted cd-kbd', text: '回车 / 空格 → 下一张' }));
    } else {
      wrap.appendChild(UI.el('p', {
        class: 'tiny muted cd-kbd',
        text: card.type === 'judge' ? '键盘 1 选「对」、2 选「错」；也可以直接点按钮。' : '键盘 1–4 选答案；也可以直接点。'
      }));
    }
    root.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  function judgeArea(card, q) {
    var box = UI.el('div', { class: 'cd-judge' });
    [[true, '对', '✓'], [false, '错', '✗']].forEach(function (it) {
      var val = it[0], cls = 'cd-jbtn';
      if (q.locked) {
        if (val === card.ans) cls += ' ok';
        else if (val === q.chosen) cls += ' no';
        else cls += ' dim';
      }
      var b = UI.el('button', { class: cls, type: 'button' });
      b.innerHTML = '<i>' + it[2] + '</i><span>' + it[1] + '</span>';
      if (q.locked) b.disabled = true;
      else b.addEventListener('click', function () { answer(val); });
      box.appendChild(b);
    });
    return box;
  }

  function choiceArea(card, q) {
    var box = UI.el('div', { class: 'cd-opts' });
    (card.opts || []).forEach(function (opt, idx) {
      var cls = 'cd-opt';
      if (q.locked) {
        if (idx === card.ans) cls += ' ok';
        else if (idx === q.chosen && !q.ok) cls += ' no';
        else cls += ' dim';
      }
      var b = UI.el('button', { class: cls, type: 'button' });
      b.innerHTML = '<span class="k">' + (LETTERS[idx] || (idx + 1)) + '</span>' +
        '<span class="t">' + UI.escape(opt) + '</span>';
      if (q.locked) b.disabled = true;
      else b.addEventListener('click', function () { answer(idx); });
      box.appendChild(b);
    });
    return box;
  }

  function feedback(card, q) {
    var ansTxt = card.type === 'judge'
      ? (card.ans ? '对' : '错')
      : (LETTERS[card.ans] || '') + '．' + (card.opts[card.ans] || '');
    var fb = UI.el('div', { class: 'cd-fb ' + (q.ok ? 'ok' : 'bad') });
    fb.innerHTML = '<b>' + (q.ok ? '答对了' : '答错了') + '</b>' +
      '<span class="ans">正确答案：' + UI.escape(ansTxt) + '</span>';
    var why = UI.el('div', { class: 'cd-why' });
    why.innerHTML = '<b>为什么：</b>' + UI.escape(card.why);
    fb.appendChild(why);
    return fb;
  }

  /* ---------------- 本轮结束 ---------------- */
  function renderDone() {
    var q = S.quiz, root = S.root;
    root.innerHTML = '';
    var firstIds = q.ids.slice(0, q.totalFirst);
    var okN = 0;
    firstIds.forEach(function (id) { if (q.firstOk[id]) okN++; });
    var rate = firstIds.length ? okN / firstIds.length : 0;
    var replayN = Object.keys(q.replayOk).length;

    var cardEl = UI.el('div', { class: 'card cd-done' });
    cardEl.appendChild(UI.el('div', { class: 'row' }, [
      UI.el('span', { class: 'tag', text: '本轮结束' }),
      UI.el('span', { class: 'tag-soft', text: q.options.label || '概念闪练' })
    ]));
    var score = UI.el('div', { class: 'cd-score' });
    score.innerHTML = okN + '<span class="cd-score-sub">/ ' + firstIds.length + '</span>';
    cardEl.appendChild(score);
    var bar = UI.el('div', { class: 'bar ' + (rate >= 0.8 ? 'ok' : rate >= 0.5 ? 'warn' : 'bad'), style: 'margin:8px 0 4px' });
    bar.innerHTML = '<i style="width:' + Math.round(rate * 100) + '%"></i>';
    cardEl.appendChild(bar);
    var line = '正确率 ' + U.fmtPct(rate) + ' · 本轮最长连对 ' + q.best + ' 张';
    if (replayN) line += ' · 重现场次又对了 ' + replayN + ' 张';
    cardEl.appendChild(UI.el('p', { class: 'small muted', text: line }));

    if (q.wrongIds.length) {
      cardEl.appendChild(UI.el('hr', { class: 'sep' }));
      cardEl.appendChild(UI.el('h3', { text: '这几张没过（' + q.wrongIds.length + ' 张）' }));
      q.wrongIds.forEach(function (id) {
        var c = cardById(id);
        if (!c) return;
        var row = UI.el('div', { class: 'cd-wrongrow' });
        var m = UI.el('div', { class: 'cd-wrongmeta' });
        m.appendChild(UI.el('span', { class: 'tag', text: c.topic }));
        (c.tags || []).forEach(function (t) { m.appendChild(UI.el('span', { class: 'tag-soft', text: t })); });
        row.appendChild(UI.el('div', { class: 'cd-wrongq', text: c.q }));
        var why = UI.el('div', { class: 'cd-why' });
        why.innerHTML = '<b>为什么：</b>' + UI.escape(c.why);
        row.appendChild(why);
        row.appendChild(m);
        cardEl.appendChild(row);
      });
    } else {
      cardEl.appendChild(UI.el('p', { class: 'fb ok', style: 'margin-top:12px', text: '全对，这一轮的卡都答对了。可以再来一轮，或者去走五步引导。' }));
    }
    root.appendChild(cardEl);

    var acts = UI.el('div', { class: 'card' });
    var row = UI.el('div', { class: 'cd-actions' });
    row.appendChild(bigBtn('再来一轮', 'btn-primary', function () { startQuiz(q.options); }));
    if (q.wrongIds.length) {
      row.appendChild(bigBtn('只重练错的 · ' + q.wrongIds.length + ' 张', '', function () {
        startQuiz({ kind: 'custom', ids: q.wrongIds.slice(), label: '只重练错的', back: q.options.back });
      }));
    }
    if (PHYS.registry.get('guided')) {
      row.appendChild(bigBtn('去练五步引导', '', function () { PHYS.route.go('guided'); }));
    }
    row.appendChild(bigBtn('按考点练', '', function () { nav({ mode: 'tags' }); }));
    row.appendChild(bigBtn('返回首页', 'btn-ghost', function () { nav({}); }));
    acts.appendChild(row);
    if (q.options.kind === 'quick') {
      acts.appendChild(UI.el('p', {
        class: 'tiny muted', style: 'margin-top:8px',
        text: '再来一轮会优先挑没练过、到期和生疏的卡。'
      }));
    }
    root.appendChild(acts);
    window.scrollTo(0, 0);
  }

  /* ---------------- 键盘 ---------------- */
  function onKey(e) {
    if (!S || S.page !== 'quiz' || !S.quiz) return;
    var q = S.quiz;
    if (q.i >= q.ids.length) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (q.locked) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      }
      return;
    }
    var card = cardById(q.ids[q.i]);
    if (!card) return;
    if (card.type === 'judge') {
      if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); answer(true); }
      else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); answer(false); }
    } else {
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= (card.opts || []).length) { e.preventDefault(); answer(n - 1); return; }
      if (/^[a-dA-D]$/.test(e.key)) {
        var idx = 'abcd'.indexOf(e.key.toLowerCase());
        if (idx >= 0 && idx < (card.opts || []).length) { e.preventDefault(); answer(idx); }
      }
    }
  }

  /* ---------------- 注册 ---------------- */
  function mount(root, params) {
    S = { root: root, params: params || {}, quiz: null, page: 'home' };
    if (!keyHandler) {
      keyHandler = onKey;
      document.addEventListener('keydown', keyHandler);
    }
    route();
  }
  function unmount() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    S = null;
  }

  PHYS.registry.register({
    id: 'concept',
    title: '概念闪练',
    short: '概念',
    icon: '◈',
    order: 15,
    desc: '2 分钟一轮，把易混概念刷到「掌握」。答错立刻给一句话解释。',
    mount: mount,
    unmount: unmount
  });
})();
