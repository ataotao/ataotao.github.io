/* 英语单词闪练卡 · UI 层（scaffold 族，函数式 h() 渲染）
 * 三方向四选一：英→中 / 中→英 / 音→中；年级→单元选题；1/3/7/14 错题回炉。
 * 记录结构与 merge.mjs 兼容（recs 带 kn/prompt，键取 prompt[:40]||kn）。
 */
(function () {
  'use strict';
  var KEY = 'enwordflash_v1';
  var app = document.getElementById('app');
  var tabs = document.getElementById('tabs');

  /* ---------- 存储 ---------- */
  function devId() { return window.__ltSyncUI ? window.__ltSyncUI.deviceId() : undefined; }
  function blankDB() { return { v: EW.VERSION, deviceId: devId(), recs: [], wrong: {}, meta: { created: Date.now() } }; }
  var DB = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankDB();
      var o = JSON.parse(raw);
      if (!o || o.v !== EW.VERSION) return blankDB();
      if (!o.deviceId && window.__ltSyncUI) o.deviceId = devId();
      o.recs = o.recs || []; o.wrong = o.wrong || {}; o.meta = o.meta || {};
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
  function todayRecs() { var t = today(); return DB.recs.filter(function (r) { return dayKey(r.ts) === t; }); }

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
  function statCard(label, val) { return h('div', { class: 'stat' }, h('span', null, label), h('b', null, String(val))); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 发音（浏览器 TTS，无音频文件） ---------- */
  function speak(text, rate) {
    if (!text) return;
    try {
      if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
        alert('这个浏览器不支持朗读。可以只看音标和文字练。'); return;
      }
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate || 0.82;
      speechSynthesis.speak(u);
    } catch (e) { /* 朗读失败不影响答题 */ }
  }

  /* ---------- 状态 ----------
     两区各自持有会话与配置：unit=按单元练习，random=全库随机练习，wrong=错题回炉。
     S.sess 永远是「当前正在练」的那个会话；切回上一区时从 S.sessions 取回，互不覆盖。 */
  var S = {
    view: 'today', sess: null, q: null, res: null, answered: false,
    choice: {}, t0: 0, mode: 'new', area: 'unit',
    sessions: { unit: null, random: null, wrong: null },
    selSource: '', selGrade: '', selUnit: '', selKind: 'mix2',
    randCount: 20, randKinds: 'mix2'
  };
  var VIEWS = { today: renderToday, wrong: renderWrong, report: renderReport,
    practice: renderPractice, summary: renderSummary, random: renderRandom };
  function go(view) { S.view = view; render(); try { window.scrollTo(0, 0); } catch (e) { } }
  function render() {
    clear(app);
    (VIEWS[S.view] || renderToday)();
    if (SAVE_FAIL) app.appendChild(h('div', { class: 'fb bad', style: 'margin-top:10px' },
      '⚠ 记录没能存进本机（隐私模式或空间满）：刷新后会丢，请先「报告 → 导出 JSON」。'));
    var activeGo = S.view === 'summary' || S.view === 'practice'
      ? (S.area === 'random' ? 'random' : (S.area === 'wrong' ? 'wrong' : 'today'))
      : S.view;
    Array.prototype.forEach.call(tabs.children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-go') === activeGo);
    });
  }

  /* ---------- 选题数据 ---------- */
  function sources() { return (typeof EW_VOCAB !== 'undefined' && EW_VOCAB.sources) ? EW_VOCAB.sources : []; }
  function sourceById(id) { return sources().filter(function (s) { return s.id === id; })[0] || null; }
  function gradeById(src, id) { return (src && src.grades || []).filter(function (g) { return g.id === id; })[0] || null; }
  function modId(srcId, gradeId, unitId) { return srcId + '.' + gradeId + '.' + unitId; }

  /* ---------- 今日 ---------- */
  function renderToday() {
    var tr = todayRecs();
    var ok = tr.filter(function (r) { return r.ok; }).length;
    var due = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).filter(function (w) { return w.due <= Date.now(); }).length;
    app.appendChild(h('div', { class: 'grid' },
      statCard('今日题数', tr.length), statCard('今日正确率', pct(ok, tr.length) + '%'), statCard('错题待回炉', due)
    ));

    var srcs = sources();
    if (!srcs.length) { app.appendChild(h('div', { class: 'card' }, '词库没加载出来：请先跑 node 英语/题库工具/extract-vocab.mjs 再重建。')); return; }

    if (!S.selSource || !sourceById(S.selSource)) S.selSource = srcs[0].id;
    var src = sourceById(S.selSource);
    if (!S.selGrade || !gradeById(src, S.selGrade)) S.selGrade = (src.grades[0] || {}).id || '';
    var grade = gradeById(src, S.selGrade);
    var units = (grade && grade.units) || [];
    if (!S.selUnit || !units.filter(function (u) { return u.id === S.selUnit; }).length) S.selUnit = (units[0] || {}).id || '';
    var unit = units.filter(function (u) { return u.id === S.selUnit; })[0] || null;

    // 来源
    var card = h('div', { class: 'card', style: 'margin-top:12px' });
    card.appendChild(h('div', { class: 'small muted', style: 'margin-bottom:6px' }, '① 选教材来源'));
    card.appendChild(h('div', { class: 'row' }, srcs.map(function (s) {
      return h('button', { class: 'btn btn-sm' + (s.id === S.selSource ? ' btn-primary' : ''), onclick: function () {
        S.selSource = s.id; S.selGrade = (s.grades[0] || {}).id || ''; S.selUnit = ''; render();
      } }, s.name);
    })));
    // 年级
    card.appendChild(h('div', { class: 'small muted', style: 'margin:14px 0 6px' }, '② 选年级（册）'));
    card.appendChild(h('div', { class: 'row wrap' }, (src.grades || []).map(function (g) {
      return h('button', { class: 'btn btn-sm' + (g.id === S.selGrade ? ' btn-primary' : ''), onclick: function () {
        S.selGrade = g.id; S.selUnit = (g.units[0] || {}).id || ''; render();
      } }, g.name);
    })));
    // 单元
    card.appendChild(h('div', { class: 'small muted', style: 'margin:14px 0 6px' }, '③ 选单元'));
    card.appendChild(h('div', { class: 'row wrap' }, units.map(function (u) {
      return h('button', { class: 'btn btn-sm' + (u.id === S.selUnit ? ' btn-primary' : ''), onclick: function () {
        S.selUnit = u.id; render();
      } }, u.name);
    })));
    app.appendChild(card);

    // 方向与开练（按单元练习区）
    var nWords = unit ? unit.words.length : 0;
    var scope = unit ? (grade.name + ' · ' + unit.name + ' · ' + nWords + ' 词') : '未选单元';
    var play = h('div', { class: 'card', style: 'margin-top:12px' },
      h('div', { class: 'row' }, h('b', null, '④ 按单元练习'), h('span', { class: 'grow' }), h('span', { class: 'small muted' }, scope)),
      h('p', { class: 'small muted' }, '「整单元」把本单元每个词都练到、不遗漏，可反复完整循环；「快练」每轮 10 题。点选即判，答错自动进错题本按 1/3/7/14 天回炉。')
    );
    var dirs = [{ id: '', n: '三方向混合' }, { id: 'mix2', n: '双向混合（英↔中）' }].concat(
      EW.KINDS.map(function (k) { return { id: k.id, n: k.name }; }));
    play.appendChild(h('div', { class: 'small muted', style: 'margin-top:10px' }, '练习方向'));
    play.appendChild(h('div', { class: 'row wrap', style: 'margin-top:6px' }, dirs.map(function (d) {
      return h('button', { class: 'btn btn-sm' + (S.selKind === d.id ? ' btn-primary' : ''),
        onclick: (function (v) { return function () { S.selKind = v; render(); }; })(d.id) }, d.n);
    })));
    var kindsOf = function () { return S.selKind === 'mix2' ? ['e2c', 'c2e'] : (S.selKind || null); };
    var mod0 = S.selSource + '.' + S.selGrade + '.' + S.selUnit;
    play.appendChild(h('div', { class: 'row wrap', style: 'margin-top:14px' },
      h('button', { class: 'btn btn-primary', onclick: function () { startUnitAll(mod0, kindsOf()); } }, '整单元全词（' + nWords + ' 词）'),
      h('button', { class: 'btn', onclick: function () { startSession(mod0, kindsOf(), 10); } }, '快练 10 题'),
      h('button', { class: 'btn btn-ghost', onclick: startWrong }, '错题回炉' + (due ? '（' + due + '）' : ''))
    ));
    app.appendChild(play);
  }

  /* ---------- 随机练习（独立区，与按单元练习互不读写配置/会话） ---------- */
  function renderRandom() {
    var total = EW.allWordRefs().length;
    app.appendChild(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('b', null, '随机练习 · 全词库'), h('span', { class: 'grow' }),
        h('span', { class: 'pill' }, total + ' 词可选')),
      h('p', { class: 'small muted' }, '从全部词库随机抽词，与「今日」的单元选择、练习进度互不影响；这里「再来一轮」重新抽一组。')
    ));
    var pick = h('div', { class: 'card', style: 'margin-top:12px' },
      h('div', { class: 'small muted' }, '① 每次练多少个词'),
      h('div', { class: 'row wrap', style: 'margin-top:6px' }, [20, 30, 50].map(function (n) {
        return h('button', { class: 'btn btn-sm' + (S.randCount === n ? ' btn-primary' : ''),
          onclick: (function (v) { return function () { S.randCount = v; render(); }; })(n) }, n + ' 词');
      })),
      h('div', { class: 'small muted', style: 'margin-top:14px' }, '② 练习方向'),
      h('div', { class: 'row wrap', style: 'margin-top:6px' }, [
        { id: null, n: '三方向混合' }, { id: 'mix2', n: '双向混合（英↔中）' }
      ].concat(EW.KINDS.map(function (k) { return { id: k.id, n: k.name }; })).map(function (d) {
        return h('button', { class: 'btn btn-sm' + (S.randKinds === d.id ? ' btn-primary' : ''),
          onclick: (function (v) { return function () { S.randKinds = v; render(); }; })(d.id) }, d.n);
      })),
      h('div', { class: 'row wrap', style: 'margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: function () {
          startRandom(S.randCount, S.randKinds === 'mix2' ? ['e2c', 'c2e'] : S.randKinds);
        } }, '开始随机练习（' + S.randCount + ' 词）'),
        h('button', { class: 'btn btn-ghost', onclick: function () { go('today'); } }, '回单元练习')
      )
    );
    app.appendChild(pick);
    var last = S.sessions.random;
    if (last) app.appendChild(h('div', { class: 'card', style: 'margin-top:12px' },
      h('div', { class: 'small muted' }, '上次随机练习'),
      h('div', { class: 'row', style: 'margin-top:4px' },
        h('span', null, last.right + ' / ' + last.total + ' 正确'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn btn-sm', onclick: function () {
          S.sess = S.sessions.random; restart();
        } }, '按同样设置再练')
      )
    ));
  }

  /* ---------- 出题会话 ---------- */
  /* kind 参数三种形态：
     单 kind 字符串（'e2c'）        → 只练这一方向
     数组（如 ['e2c','c2e']）       → 按给定方向轮换（双向混合：英↔中，不练音）
     null                          → 三方向混合（e2c/c2e/p2c）
     注：sess.kind 原样存下，供「再来一轮」保持同一种混合方式。 */
  function kindQueue(n, kinds) {
    var q = (kinds && kinds.length) ? kinds : ['e2c', 'c2e', 'p2c'], out = [];
    for (var i = 0; i < n; i++) out.push(q[i % q.length]);
    return out;
  }
  /* 会话按区存放：S.sessions[area] 保存该区最近一次会话，S.sess 指向当前正在练的。
     builder 记录「再来一轮」所需的重建参数；随机区重建会重新抽词。 */
  function setSession(area, sess) {
    S.area = area;
    sess.area = area;
    S.mode = sess.mode;
    S.sess = sess;
    S.sessions[area] = sess;
    S.view = 'practice';
    nextQuestion();
  }
  function startSession(mod, kind, count) {
    var m = EW.moduleById(mod);
    if (!m) { alert('这个单元词库没加载。'); return; }
    if (Array.isArray(kind) && kind.length === 1) kind = kind[0];
    var n = Math.max(1, Math.min(count || 10, 30));
    var mix = !kind || (Array.isArray(kind) && kind.length > 1);
    setSession('unit', {
      mode: 'new', mod: mod, kind: kind, total: n, done: 0, right: 0, t0: Date.now(), queue: null,
      kinds: mix ? kindQueue(n, Array.isArray(kind) ? kind : null) : null,
      builder: { type: 'session', mod: mod, kind: kind, count: n }
    });
  }
  /* 整单元：每个词恰好一题，乱序不遗漏；「再来一轮」用新 seed 重建，可完整循环。 */
  function startUnitAll(mod, kinds) {
    var m = EW.moduleById(mod);
    if (!m || !m.words.length) { alert('这个单元词库没加载。'); return; }
    if (Array.isArray(kinds) && kinds.length === 1) kinds = kinds[0];
    var qs = EW.genUnitAll(mod, kinds, Date.now() >>> 0);
    if (!qs.length) { alert('这个单元暂时出不出题。'); return; }
    setSession('unit', {
      mode: 'new', mod: mod, kind: kinds, total: qs.length, done: 0, right: 0, t0: Date.now(), queue: qs, kinds: null,
      builder: { type: 'unitAll', mod: mod, kinds: kinds }
    });
  }
  /* 随机练习：从全库去重抽 count 词；与单元区不共享配置或会话。 */
  function startRandom(count, kinds) {
    if (Array.isArray(kinds) && kinds.length === 1) kinds = kinds[0];
    var qs = EW.genRandom(count, Date.now() >>> 0, kinds);
    if (!qs.length) { alert('词库没加载出来。'); return; }
    setSession('random', {
      mode: 'new', mod: 'random', kind: kinds, total: qs.length, done: 0, right: 0, t0: Date.now(), queue: qs, kinds: null,
      builder: { type: 'random', count: count, kinds: kinds }
    });
  }
  function restart() {
    var b = S.sess && S.sess.builder;
    if (!b) { go('today'); return; }
    switch (b.type) {
      case 'session': startSession(b.mod, b.kind, b.count); break;
      case 'unitAll': startUnitAll(b.mod, b.kinds); break;
      case 'random': startRandom(b.count, b.kinds); break;
      case 'wrong': startWrong(); break;
      default: go('today');
    }
  }
  function startWrong() {
    var now = Date.now();
    var due = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).filter(function (w) { return w.due <= now; });
    if (!due.length) { alert(Object.keys(DB.wrong).length ? '错题还没到期（1/3/7/14 天回炉）。今天先练新的。' : '错题本是空的，先练一组词吧。'); return; }
    setSession('wrong', {
      mode: 'wrong', mod: 'wrong', kind: null, total: Math.min(due.length, 8), done: 0, right: 0, t0: now, queue: due.slice(0, 8),
      builder: { type: 'wrong' }
    });
  }
  function startOneWrong(w) {
    setSession('wrong', {
      mode: 'wrong', mod: 'wrong', kind: null, total: 1, done: 0, right: 0, t0: Date.now(), queue: [w],
      builder: { type: 'wrong' }
    });
  }
  function nextQuestion() {
    var s = S.sess;
    if (s.done >= s.total) { S.view = 'summary'; render(); return; }
    if (s.queue) S.q = s.queue[s.done];
    else {
      var kind = s.kinds ? s.kinds[s.done] : s.kind;
      var qs = EW.gen(s.mod, kind, (Date.now() ^ (s.done * 7919)) >>> 0, 10);
      S.q = qs[0];
      if (!S.q) { s.total = Math.max(s.done, 1); S.view = 'summary'; render(); return; }
    }
    S.res = null; S.answered = false; S.choice = {}; S.t0 = Date.now();
    render();
    if (S.q && S.q.speak && S.q.kind === 'p2c') speak(S.q.speak);
  }

  /* ---------- 练习 ---------- */
  function renderPractice() {
    var s = S.sess, q = S.q;
    if (!s || !q) { go('today'); return; }
    var modName = s.area === 'wrong' ? '错题回炉' : (s.area === 'random' ? '随机练习' : ((EW.moduleById(s.mod) || {}).name || '练习'));
    var backView = function () { go(s.area === 'random' ? 'random' : (s.area === 'wrong' ? 'wrong' : 'today')); };
    app.appendChild(h('div', { class: 'row', style: 'margin-bottom:8px' },
      h('span', { class: 'pill' }, modName),
      h('span', { class: 'small muted' }, EW.nameOf(q.kind) || ''),
      h('span', { class: 'grow' }),
      h('span', { class: 'small muted' }, (s.done + 1) + ' / ' + s.total)
    ));
    app.appendChild(h('div', { class: 'progress' }, h('i', { style: 'width:' + (s.done / s.total * 100) + '%' })));

    var card = h('div', { class: 'card', style: 'margin-top:12px' });
    var head = h('div', { class: 'qhead' }, h('span', { class: 'pill' }, EW.nameOf(q.kind) || '新题'));
    if (q.kp) head.appendChild(h('span', { class: 'small muted' }, q.kp.join(' · ')));
    card.appendChild(head);

    /* 题干：音→中显示音标；有 speak 就给喇叭按钮；英→中也可点喇叭听英文 */
    var qbody = h('div', { class: 'qbody' });
    if (q.kind === 'p2c') {
      if (q.ipa) qbody.appendChild(h('div', { class: 'wordipa' }, esc(q.ipa)));
      else qbody.appendChild(h('div', { class: 'small muted' }, '听发音，选出对应的中文'));
    } else {
      qbody.appendChild(h('div', { class: 'wordprompt' }, esc(q.prompt)));
    }
    card.appendChild(qbody);
    if (q.speak) {
      card.appendChild(h('button', { class: 'speakbtn', onclick: function () { speak(q.speak); } }, '🔊 听发音'));
    }

    var f = q.fields[0];
    if (f && f.type === 'choice') {
      f.options.forEach(function (opt, oi) {
        var cls = 'opt';
        if (S.answered) { if (oi === f.ans) cls += ' ok'; else if (S.choice[0] === oi) cls += ' bad'; }
        else if (S.choice[0] === oi) cls += ' sel';
        card.appendChild(h('button', {
          class: cls, onclick: (function (i) { return function () { if (S.answered) return; S.choice[0] = i; render(); }; })(oi)
        }, String.fromCharCode(65 + oi) + '. ' + opt));
      });
    }

    if (!S.answered) {
      card.appendChild(h('div', { class: 'row', style: 'margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: submit }, '提交'),
        h('span', { class: 'grow' }),
        h('span', { class: 'small muted' }, '回车提交')
      ));
    } else {
      var fb = h('div', { class: 'fb ' + (S.res.ok ? 'good' : 'bad') });
      fb.appendChild(h('div', { class: 'ftitle' }, S.res.ok ? '✓ 答对了' : '✗ 答错了'));
      fb.appendChild(h('div', { class: 'small', style: 'margin-top:4px' }, '正确答案：' + EW.ansText(f)));
      fb.appendChild(h('div', { class: 'small', style: 'margin-top:4px' }, q.tip || ''));
      // 例句：提交后才显示，避免泄露答案；目标词高亮。来自粤学词词典语料，非课文原文。
      if (q.ex) {
        var exBox = h('div', { class: 'exbox' },
          h('div', { class: 'exlabel' }, '用法例句（‹' + esc(q.word || q.prompt) + '› 已标出）'),
          h('div', { class: 'exen', html: EW.highlightExample(q.ex, q.word || q.prompt) }),
          q.exZh ? h('div', { class: 'exzh small muted' }, esc(q.exZh)) : null
        );
        fb.appendChild(exBox);
      }
      card.appendChild(fb);
      card.appendChild(h('div', { class: 'row', style: 'margin-top:14px' },
        h('button', { class: 'btn btn-primary', onclick: next }, s.done >= s.total ? '看本轮报告' : '下一题'),
        h('button', { class: 'btn btn-ghost', onclick: backView }, '退出')
      ));
    }
    app.appendChild(card);
  }

  function submit() {
    if (S.answered) return;
    var q = S.q, f = q.fields[0];
    if (S.choice[0] == null) { alert('先选一个答案再提交'); return; }
    var res = EW.judge(q, [S.choice[0]]);
    S.res = res; S.answered = true;
    var s = S.sess;
    s.done++; if (res.ok) s.right++;
    var recMod = s.mod === 'wrong' ? (q.mod || 'primary') : s.mod;
    DB.recs.push({
      ts: Date.now(), mod: recMod, kind: q.kind, kn: q.tip || q.prompt,
      ok: res.ok, got: res.got, total: res.total, sec: Math.max(1, Math.round((Date.now() - S.t0) / 1000)),
      hint: false, mode: S.mode, qid: recMod + '.' + q.kind + '.' + String(q.prompt).slice(0, 40)
    });
    if (!res.ok) addWrong(q);
    else if (S.mode === 'wrong') removeWrong(q);
    save(); render();
  }
  function next() {
    if (S.sess.done >= S.sess.total) { S.view = 'summary'; render(); return; }
    nextQuestion();
  }

  /* ---------- 错题本 ---------- */
  function wrongKey(q) { return q.id + '|' + String(q.prompt).slice(0, 60); }
  function addWrong(q) {
    var k = wrongKey(q), w = DB.wrong[k], now = Date.now();
    var n = w ? (w.n || 1) + 1 : 1;
    var gap = n <= 1 ? 1 : (n === 2 ? 3 : (n === 3 ? 7 : 14));
    DB.wrong[k] = {
      id: q.id, mod: q.mod, kind: q.kind, prompt: q.prompt, speak: q.speak, ipa: q.ipa,
      fields: q.fields, tip: q.tip, answerText: q.answerText, kp: q.kp,
      word: q.word, ex: q.ex, exZh: q.exZh,
      kn: q.tip || q.prompt, ts: now, due: now + gap * EW.DAY, n: n
    };
  }
  function removeWrong(q) { delete DB.wrong[wrongKey(q)]; }
  function renderWrong() {
    var ws = Object.keys(DB.wrong).map(function (k) { return DB.wrong[k]; }).sort(function (a, b) { return a.due - b.due; });
    app.appendChild(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0;font-size:19px' }, '错题本'), h('span', { class: 'pill' }, ws.length + ' 道')),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, '答错的词自动进本，按 1 / 3 / 7 / 14 天到期回炉；回炉答对自动移出。'),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn btn-primary', onclick: startWrong }, '回炉到期的'),
        h('button', { class: 'btn', onclick: function () { go('report'); } }, '看报告'))
    ));
    var card = h('div', { class: 'card' });
    if (!ws.length) card.appendChild(h('div', { class: 'empty' }, '还没有错题，先练一组词吧。'));
    ws.forEach(function (w) {
      var dueTxt = w.due <= Date.now() ? '已到期' : ('还有 ' + Math.ceil((w.due - Date.now()) / EW.DAY) + ' 天');
      card.appendChild(h('div', { class: 'wrongitem' },
        h('div', { class: 'wt' }, String(w.tip || w.prompt).slice(0, 90)),
        h('div', { class: 'small muted' }, dueTxt + ' · 错过 ' + (w.n || 1) + ' 次'),
        h('button', { class: 'btn btn-sm', onclick: (function (ww) { return function () { startOneWrong(ww); }; })(w) }, '重做')
      ));
    });
    app.appendChild(card);
  }

  /* ---------- 本轮总结 ---------- */
  function renderSummary() {
    var s = S.sess;
    app.appendChild(h('div', { class: 'card', style: 'text-align:center;padding:28px 18px' },
      h('div', { style: 'font-size:44px;line-height:1.1' }, s.right === s.total ? '🎉' : (s.right / s.total >= .6 ? '👍' : '💪')),
      h('h2', { style: 'margin:8px 0 4px' }, s.right + ' / ' + s.total + ' 全对'),
      h('p', { class: 'muted' }, '正确率 ' + pct(s.right, s.total) + '%'),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:16px' },
        h('button', { class: 'btn btn-primary', onclick: restart }, '再来一轮'),
        h('button', { class: 'btn', onclick: function () { go(S.area === 'random' ? 'random' : (S.area === 'wrong' ? 'wrong' : 'today')); } },
          S.area === 'random' ? '回随机练习' : (S.area === 'wrong' ? '回错题本' : '回今日')))
    ));
  }

  /* ---------- 报告 ---------- */
  function renderReport() {
    var recs = DB.recs;
    var ok = recs.filter(function (r) { return r.ok; }).length;
    var secs = recs.reduce(function (a, r) { return a + (r.sec || 0); }, 0);
    app.appendChild(h('div', { class: 'grid' },
      statCard('累计题数', recs.length), statCard('总正确率', pct(ok, recs.length) + '%'),
      statCard('累计用时', Math.round(secs / 60) + ' 分'), statCard('错题本', Object.keys(DB.wrong).length)
    ));
    // 按方向
    var byKind = {};
    recs.forEach(function (r) { var k = r.kind || '?'; byKind[k] = byKind[k] || { n: 0, ok: 0 }; byKind[k].n++; if (r.ok) byKind[k].ok++; });
    var kcard = h('div', { class: 'card', style: 'margin-top:12px' }, h('b', null, '按方向'));
    Object.keys(byKind).forEach(function (k) {
      kcard.appendChild(h('div', { class: 'row', style: 'margin-top:6px' },
        h('span', null, EW.nameOf(k) || k), h('span', { class: 'grow' }),
        h('span', { class: 'small muted' }, byKind[k].ok + '/' + byKind[k].n + ' · ' + pct(byKind[k].ok, byKind[k].n) + '%')));
    });
    app.appendChild(kcard);
    app.appendChild(h('div', { class: 'card', style: 'margin-top:12px' },
      h('b', null, '记录管理'),
      h('p', { class: 'small muted' }, '记录只存本机。换设备或清缓存前先导出，到新设备再导入（重复的会自动跳过）。'),
      h('div', { class: 'row wrap', style: 'margin-top:8px' },
        h('button', { class: 'btn', onclick: exportJSON }, '导出记录 JSON'),
        h('button', { class: 'btn', onclick: importJSON }, '导入记录 JSON'),
        h('button', { class: 'btn btn-ghost', onclick: selfCheck }, '自检出题'),
        h('button', { class: 'btn btn-ghost', onclick: clearAll }, '清空记录')),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('input', { id: 'syncPat', type: 'password', placeholder: '云同步 PAT（可选）', class: 'txt' }),
        h('button', { class: 'btn', onclick: runSync }, '云同步')),
      h('div', { id: 'syncMsg', class: 'small muted', style: 'margin-top:6px' })
    ));
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    var t = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = '英语单词闪练记录-' + t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') + '.json';
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
          if (!o || o.v !== EW.VERSION || !Array.isArray(o.recs)) throw new Error('格式不对');
          var before = DB.recs.length;
          var merged = window.__ltMerge.mergeRecords(DB, o);
          DB.recs = merged.recs;
          Object.keys(merged.wrong || {}).forEach(function (k) {
            var w = merged.wrong[k];
            if (!w || !Array.isArray(w.fields) || !w.fields.length || typeof w.due !== 'number') return;
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
    var r = EW.selfTest(200);
    alert('自检：' + r.count + ' 题 + ' + r.cases + ' 项判分用例，' +
      (r.fails.length ? r.fails.length + ' 处失败\n' + r.fails.slice(0, 8).join('\n') : '全部通过') +
      '\n用时 ' + (Date.now() - t0) + ' ms');
  }
  function clearAll() {
    if (!confirm('清空所有记录和错题？建议先导出。')) return;
    DB = blankDB(); save(); render();
  }

  /* ---------- 启动 ---------- */
  Array.prototype.forEach.call(tabs.children, function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || S.view !== 'practice') return;
    e.preventDefault();
    if (!S.answered) submit();
    else next();
  });
  if (window.__ltSyncUI) window.__ltSyncUI.init({
    getDB: function () { return DB; },
    setDB: function (d) { DB = d; save(); render(); },
    notify: function (msg) { var el = document.getElementById('syncMsg'); if (el) el.textContent = msg; }
  });
  (function boot() {
    var m = (location.hash || '').match(/view=([a-z]+)/);
    var v = m && m[1];
    var allowed = { today: 1, random: 1, wrong: 1, report: 1 };
    go(allowed[v] ? v : 'today');
  })();

  window.__ew = {
    S: S, db: function () { return DB; }, EW: EW,
    startSession: startSession, startUnitAll: startUnitAll, startRandom: startRandom,
    startWrong: startWrong, startOneWrong: startOneWrong, restart: restart,
    importJSON: importJSON, clearAll: clearAll, submit: submit, next: next,
    go: go, render: render, exportJSON: exportJSON, selfCheck: selfCheck, speak: speak
  };
})();
