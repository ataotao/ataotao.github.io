/* =============================================================
   五步引导训练（核心模块）
   一次只问一步：认情境 → 圈条件 → 选规律 → 代数据 → 验结果
   只有「第一次就答对」才算会；提示分三级；看思路会标记
   ============================================================= */
(function () {
  'use strict';
  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui;
  var FIVE = PHYS.FIVE;

  /* 题号 → 题目对象索引 */
  function qIndex() {
    if (PHYS._qIndex) return PHYS._qIndex;
    var map = {};
    (PHYS.DATA.packs || []).forEach(function (p) {
      (p.questions || []).forEach(function (q) { map[q.id] = { q: q, pack: p }; });
    });
    return (PHYS._qIndex = map);
  }

  UI.addCSS(
    '.gd-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.gd-item{text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 15px;box-shadow:var(--sh);transition:.15s;display:flex;flex-direction:column;gap:4px}' +
    '.gd-item:hover{border-color:var(--brand);transform:translateY(-1px)}' +
    '.gd-item h4{font-size:14.5px;line-height:1.5}' +
    '.gd-item .meta{font-size:12px;color:var(--muted)}' +
    '.gd-item .st{margin-top:auto;padding-top:8px;font-size:12px;font-weight:700}' +
    '.gd-item .st.ok{color:var(--ok)}.gd-item .st.bad{color:var(--bad)}.gd-item .st.walk{color:var(--warn)}.gd-item .st.idle{color:var(--muted)}' +
    '.gd-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px}' +
    '.gd-bar .qno{min-width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:#fff;font-size:12.5px;font-weight:700;color:var(--muted);display:grid;place-items:center;padding:0 7px}' +
    '.gd-bar .qno.on{background:var(--brand);border-color:var(--brand);color:#fff}' +
    '.gd-bar .qno.ok{border-color:#9dd3b4;background:var(--ok-bg);color:var(--ok)}' +
    '.gd-bar .qno.bad{border-color:#e5b3af;background:var(--bad-bg);color:var(--bad)}' +
    '.gd-q{position:relative}' +
    '.gd-q .qmeta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}' +
    '.gd-q .walk{position:absolute;right:12px;top:12px}' +
    '.gd-stemtext{margin-top:6px;font-size:14px;white-space:pre-wrap;line-height:1.9;color:var(--ink2)}' +
    '.gd-stemtext .toggle{font-size:12px;color:var(--brand);cursor:pointer;margin-left:4px}' +
    '.gd-multi-tip{font-size:12px;color:var(--muted);margin-bottom:8px}' +
    '.gd-done{text-align:left}' +
    '.gd-done .steps{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}' +
    '.gd-done .steps span{font-size:12px;padding:3px 9px;border-radius:99px;background:var(--ok-bg);color:var(--ok);font-weight:700}' +
    '.gd-done .steps span.no{background:var(--bad-bg);color:var(--bad)}' +
    '.gd-done .steps span.hint{background:var(--warn-bg);color:var(--warn)}' +
    '.gd-retry{font-size:12.5px;color:var(--brand);font-weight:700;margin-top:8px}' +
    '@media(max-width:640px){.gd-list{grid-template-columns:1fr}}'
  );

  /* ---------------- 状态 ---------------- */
  var S = null;   // 当前训练状态

  function resetState(g, pack, q) {
    S = {
      g: g, pack: pack, q: q,
      i: 0,
      first: [true, true, true, true, true],
      tries: [0, 0, 0, 0, 0],
      hint: [0, 0, 0, 0, 0],
      usedWalk: false,
      startedAt: Date.now(),
      done: false,
      finalOk: null,
      draft: [null, null, null, null, null]
    };
  }

  function guidedItems() { return PHYS.DATA.guided || []; }

  function statusOf(g) {
    var rec = PHYS.store.get('guided.' + g.questionId, null);
    if (!rec) return { k: 'idle', label: '还没走' };
    if (rec.usedWalk && !rec.ok) return { k: 'walk', label: '看过思路' };
    if (rec.ok) return { k: 'ok', label: '走通了' };
    return { k: 'bad', label: '有断点' };
  }

  /* ---------------- 列表页 ---------------- */
  function renderList(root) {
    var items = guidedItems();
    var done = items.filter(function (g) { return PHYS.store.get('guided.' + g.questionId, null); }).length;
    var okN = items.filter(function (g) { var r = PHYS.store.get('guided.' + g.questionId, null); return r && r.ok; }).length;

    var head = UI.el('div', { class: 'card' });
    head.innerHTML =
      '<div class="row"><div><h2>五步引导</h2>' +
      '<p class="small muted">一次只问一步，答错就指出断在哪一步。不用求快，<b>想清楚再点</b>。</p></div>' +
      '<span class="spacer"></span><div style="text-align:right"><b style="font-size:18px">' + okN + '</b>' +
      '<span class="muted small"> / ' + items.length + ' 走通</span></div></div>';
    var bar = UI.el('div', { class: 'bar', style: 'margin-top:10px' });
    bar.innerHTML = '<i style="width:' + Math.round(okN / (items.length || 1) * 100) + '%"></i>';
    head.appendChild(bar);
    head.appendChild(UI.el('p', { class: 'tiny muted', style: 'margin-top:6px', text: '共走完 ' + done + ' 题；只有「五步第一次全对且没看提示」才记为走通。' }));
    root.appendChild(head);

    if (!items.length) {
      root.innerHTML += '';
      root.appendChild(UI.el('div', { class: 'card empty', text: '五步母题还没装上（数据在 源/data/guided.json）。' }));
      return;
    }

    var groups = {};
    items.forEach(function (g) { (groups[g.topic] = groups[g.topic] || []).push(g); });
    Object.keys(groups).forEach(function (topic) {
      var sec = UI.el('div', { class: 'card' });
      sec.innerHTML = '<h3 style="margin-bottom:10px">' + UI.escape(topic) + '</h3>';
      var list = UI.el('div', { class: 'gd-list' });
      groups[topic].forEach(function (g) {
        var st = statusOf(g);
        var q = qIndex()[g.questionId];
        var tags = q && q.q.tags ? q.q.tags : [];
        var b = UI.el('button', { class: 'gd-item', type: 'button' });
        b.innerHTML = '<h4>' + UI.escape(g.title) + '</h4>' +
          '<span class="meta">' + UI.escape(tags.slice(0, 2).join(' · ')) + '</span>' +
          '<span class="st ' + st.k + '">' + (st.k === 'ok' ? '✓ ' : st.k === 'bad' ? '✗ ' : st.k === 'walk' ? '◎ ' : '') + st.label + '</span>';
        b.addEventListener('click', function () { PHYS.route.go('guided', { q: g.questionId }); });
        list.appendChild(b);
      });
      sec.appendChild(list);
      root.appendChild(sec);
    });

    var foot = UI.el('div', { class: 'card' });
    foot.innerHTML = '<p class="small muted">想先知道自己卡在哪一环？做完 3 题去<a href="#/report">训练报告</a>看五步命中率；概念卡在<a href="#/concept">概念闪练</a>。</p>';
    root.appendChild(foot);
  }

  /* ---------------- 训练页 ---------------- */
  function findGuided(qid) {
    var items = guidedItems();
    for (var i = 0; i < items.length; i++) if (items[i].questionId === qid) return items[i];
    return null;
  }

  function railEl() {
    var rail = UI.el('div', { class: 'rail' });
    FIVE.forEach(function (st, k) {
      var cls = 'n';
      if (S.done) cls += S.first[k] ? ' done' : ' err';
      else if (k < S.i) cls += S.first[k] ? ' done' : ' err';
      else if (k === S.i) cls += ' now';
      rail.appendChild(UI.el('div', { class: cls, html: '<b>' + (k + 1) + '</b><span>' + st.n + '</span>' }));
    });
    return rail;
  }

  function barEl(root) {
    var items = guidedItems();
    var idx = items.indexOf(S.g);
    var bar = UI.el('div', { class: 'gd-bar' });
    var prev = UI.el('button', { class: 'btn-mini', type: 'button', text: '← 上一题' });
    prev.disabled = idx <= 0;
    prev.addEventListener('click', function () { gotoItem(idx - 1); });
    bar.appendChild(prev);
    items.forEach(function (g, k) {
      var st = statusOf(g);
      var cls = 'qno' + (g === S.g ? ' on' : '') + (st.k === 'ok' ? ' ok' : st.k === 'bad' ? ' bad' : '');
      var b = UI.el('button', { class: cls, type: 'button', text: String(k + 1) });
      b.title = g.title;
      b.addEventListener('click', function () { if (g !== S.g) gotoItem(k); });
      bar.appendChild(b);
    });
    var next = UI.el('button', { class: 'btn-mini', type: 'button', text: '下一题 →' });
    next.disabled = idx >= items.length - 1;
    next.addEventListener('click', function () { gotoItem(idx + 1); });
    bar.appendChild(next);
    var back = UI.el('a', { class: 'btn-mini', href: '#/guided', style: 'margin-left:auto', text: '题目清单' });
    bar.appendChild(back);
    root.appendChild(bar);
  }

  function gotoItem(idx) {
    var items = guidedItems();
    if (idx < 0 || idx >= items.length) return;
    var target = items[idx];
    function jump() { PHYS.route.go('guided', { q: target.questionId }); }
    if (S && !S.done && (S.i > 0 || S.tries[0] > 0)) {
      UI.confirm('这题还没走完，换题会丢掉当前进度（已记录的成绩不受影响）。换吗？', '换题').then(function (ok) { if (ok) jump(); });
    } else jump();
  }

  function questionCard(root) {
    var q = S.q;
    var card = UI.el('div', { class: 'card gd-q' });
    var walkBtn = UI.el('button', { class: 'btn-mini walk', type: 'button', text: '看思路' });
    walkBtn.addEventListener('click', openWalk);
    card.appendChild(walkBtn);
    var meta = UI.el('div', { class: 'qmeta' });
    meta.innerHTML = '<span class="tag">第 ' + UI.escape(q.no) + ' 题</span>' +
      '<span class="tag-soft">' + UI.escape(q.group || '') + '</span>' +
      (q.tags || []).slice(0, 2).map(function (t) { return '<span class="tag-soft">' + UI.escape(t) + '</span>'; }).join('') +
      '<span class="tiny muted">' + (q.diff ? '难度 ' + '★'.repeat(q.diff) : '') + '</span>';
    card.appendChild(meta);
    card.appendChild(UI.imgs(q.askImg, '原题'));
    card.appendChild(UI.el('p', { class: 'tiny muted', style: 'margin:-4px 0 2px;text-align:center', text: '点图可放大 · 先自己读题，别急着往下点' }));
    if (q.ask) {
      var st = UI.el('div', { class: 'gd-stemtext' });
      st.style.display = 'none';
      st.innerHTML = UI.escape(q.ask);
      var tg = UI.el('span', { class: 'toggle', text: '显示文字版 ▾' });
      tg.addEventListener('click', function () {
        var show = st.style.display === 'none';
        st.style.display = show ? 'block' : 'none';
        tg.textContent = show ? '收起文字版 ▴' : '显示文字版 ▾';
      });
      card.appendChild(tg);
      card.appendChild(st);
    }
    root.appendChild(card);
  }

  function openWalk() {
    S.usedWalk = true;
    var g = S.g, q = S.q;
    var body = UI.el('div');
    var flow = (g.walk || []).map(function (t) { return '<li>' + UI.escape(t) + '</li>'; }).join('');
    body.innerHTML = '<p class="small muted" style="margin-bottom:8px">先自己走一遍再看，效果最好。看完这题会标记「看过思路」。</p>' +
      '<ol class="small" style="padding-left:20px;line-height:1.9">' + flow + '</ol>';
    if (g.calc && g.calc.length) {
      body.innerHTML += '<h4 class="tiny muted" style="margin:12px 0 4px">参考解答</h4><ol class="small" style="padding-left:20px;line-height:1.9">' +
        g.calc.map(function (t) { return '<li>' + UI.escape(t) + '</li>'; }).join('') + '</ol>';
    }
    if (q.ansImg) {
      var a = UI.el('div', { style: 'margin-top:10px' });
      a.innerHTML = '<div class="tiny muted" style="margin-bottom:4px">原卷参考答案：</div>';
      a.appendChild(UI.imgs(q.ansImg, '参考答案'));
      body.appendChild(a);
    }
    UI.modal({ title: '看思路：' + g.title, body: body, actions: [{ text: '回去自己做', kind: 'primary' }] });
  }

  /* ---------------- 步骤卡 ---------------- */
  function renderStep(root) {
    var st = FIVE[S.i], step = S.g.steps[S.i];
    var card = UI.el('div', { class: 'card' });
    var hd = UI.el('div', { class: 'step-hd' });
    hd.innerHTML = '<div class="stepbadge">' + (S.i + 1) + '</div>' +
      '<div><h2>' + st.n + '</h2><p>' + st.d + ' · ' + st.ask + '</p></div>';
    card.appendChild(hd);

    var askP = UI.el('div', { class: 'ask' });
    askP.innerHTML = '<em>' + UI.escape(step.q) + '</em>';
    card.appendChild(askP);
    if (step.type === 'multi') {
      card.appendChild(UI.el('div', { class: 'gd-multi-tip', text: '可以多选，选完点「确认」。' }));
    }

    var ctrl = null;
    if (step.type === 'choice' || step.type === 'multi') {
      var multi = step.type === 'multi';
      var sel = multi ? [] : null;
      var box = UI.el('div', { class: 'opts' });
      (step.opts || []).forEach(function (o, k) {
        var b = UI.el('button', { class: 'opt', type: 'button' });
        b.innerHTML = '<span class="k">' + String.fromCharCode(65 + k) + '</span><span>' + UI.escape(o) + '</span>';
        b.addEventListener('click', function () {
          if (multi) {
            var at = sel.indexOf(k);
            if (at >= 0) { sel.splice(at, 1); b.classList.remove('sel'); }
            else { sel.push(k); b.classList.add('sel'); }
          } else {
            sel = k;
            Array.prototype.forEach.call(box.children, function (c) { c.classList.remove('sel'); });
            b.classList.add('sel');
            setTimeout(function () { submit(); }, 120);
          }
        });
        box.appendChild(b);
      });
      card.appendChild(box);
      ctrl = { kind: 'opts', box: box, get: function () { return multi ? sel : sel; }, opts: step.opts, ans: step.ans, multi: multi };
    } else if (step.type === 'fields') {
      var fs = PHYS.ui.fields(step.fields, { onEnter: function () { submit(); } });
      card.appendChild(fs.el);
      ctrl = { kind: 'fields', fs: fs };
    }
    var fbbox = UI.el('div');
    card.appendChild(fbbox);
    card.appendChild(hintEl());

    var actRow = UI.el('div', { class: 'row', style: 'margin-top:14px' });
    var submitBtn = UI.el('button', { class: 'btn btn-primary', type: 'button', text: '确认这一步' });
    submitBtn.addEventListener('click', submit);
    actRow.appendChild(submitBtn);
    var skip = UI.el('button', { class: 'btn-ghost', type: 'button', text: '跳过这步' });
    skip.addEventListener('click', function () {
      UI.confirm('跳过的步骤不算对，报告里会记成断点。确定跳过？').then(function (ok) {
        if (!ok) return;
        S.first[S.i] = false; S.tries[S.i]++; recordStep(false);
        S.i++; S.done = S.i >= 5; rerender();
      });
    });
    actRow.appendChild(skip);
    card.appendChild(actRow);
    root.appendChild(card);

    function submit() {
      var ok = false, filled = true;
      if (ctrl.kind === 'opts') {
        var v = ctrl.get();
        if (ctrl.multi ? !v.length : v === null) { UI.toast('还没选', 'bad'); return; }
        ok = PHYS.judge.choice(v, ctrl.ans);
        filled = true;
      } else {
        var res = ctrl.fs.check();
        filled = res.every(function (r) { return r.filled; });
        if (!filled) { UI.toast('还有空没填', 'bad'); return; }
        ok = res.every(function (r) { return r.ok; });
        ctrl.fs.mark(res);
      }
      S.tries[S.i]++;
      var attempt = S.tries[S.i];
      if (attempt === 1) {
        S.first[S.i] = ok;
        recordStep(ok);
      }
      if (ok) {
        if (ctrl.kind === 'opts') markOpts(ctrl, true);
        fbbox.innerHTML = '';
        var good = UI.el('div', { class: 'fb ok' });
        good.innerHTML = '<b>对。</b>' + (step.why ? UI.escape(step.why) : '');
        fbbox.appendChild(good);
        submitBtn.disabled = true;
        var nx = UI.el('button', { class: 'btn btn-primary', type: 'button', text: S.i === 4 ? '走完这一步 →' : '下一步 →' });
        nx.addEventListener('click', function () {
          S.i++;
          if (S.i >= 5) { S.done = true; }
          rerender();
        });
        actRow.innerHTML = '';
        actRow.appendChild(nx);
        if (S.i === 4) actRow.firstChild.textContent = '看最后结果 →';
      } else {
        if (ctrl.kind === 'opts') markOpts(ctrl, false);
        fbbox.innerHTML = '';
        var bad = UI.el('div', { class: 'fb bad' });
        bad.innerHTML = '<b>断在第 ' + (S.i + 1) + ' 步：' + FIVE[S.i].n + '</b><br>' +
          (step.why ? UI.escape(step.why) : '再想一下这一步在问什么。');
        fbbox.appendChild(bad);
        var hintTip = UI.el('div', { class: 'gd-retry', text: '卡住了可以看提示，或再试一次。' });
        fbbox.appendChild(hintTip);
        if (S.hint[S.i] < 3) {
          var hb = UI.el('button', { class: 'btn-mini', type: 'button', text: '看提示 ' + (S.hint[S.i] + 1) + '/3' });
          hb.addEventListener('click', function () { S.hint[S.i]++; rerender(); });
          fbbox.appendChild(hb);
        }
        var again = UI.el('button', { class: 'btn-mini', type: 'button', style: 'margin-left:6px', text: '再试一次' });
        again.addEventListener('click', function () {
          fbbox.innerHTML = '';
          if (ctrl.kind === 'fields') ctrl.fs.reset();
          submitBtn.disabled = false;
          if (ctrl.kind === 'opts') Array.prototype.forEach.call(ctrl.box.children, function (c) { c.classList.remove('ok', 'no', 'dim'); });
        });
        fbbox.appendChild(again);
      }
      if (S.hint[S.i] > 0) hintEl.refresh && hintEl.refresh();
    }
  }

  function markOpts(ctrl, ok) {
    var ansSet = Array.isArray(ctrl.ans) ? ctrl.ans : [ctrl.ans];
    var selSet = Array.isArray(ctrl.get()) ? ctrl.get() : [ctrl.get()];
    Array.prototype.forEach.call(ctrl.box.children, function (b, k) {
      b.classList.remove('sel', 'ok', 'no', 'dim');
      if (selSet.indexOf(k) >= 0) {
        if (ok) b.classList.add('ok'); else b.classList.add('no');
      } else if (ok && ansSet.indexOf(k) >= 0) {
        b.classList.add('ok');
      } else if (ok) {
        b.classList.add('dim');
      }
    });
  }

  function recordStep(ok) {
    PHYS.progress.stepAttempt({ focus: FIVE[S.i].k, ok: ok, usedHint: S.hint[S.i] > 0 });
    PHYS.shell.refreshChip();
  }

  var hintEl = function () {
    var wrap = UI.el('div', { class: 'hints' });
    function refresh() {
      wrap.innerHTML = '';
      var hs = (S.g.hints || {})[FIVE[S.i].k] || [];
      if (!hs.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'flex';
      for (var k = 0; k < Math.min(S.hint[S.i], hs.length); k++) {
        var d = UI.el('div', { class: 'hint on' });
        d.innerHTML = '<b>提示 ' + (k + 1) + '</b>' + UI.escape(hs[k]);
        wrap.appendChild(d);
      }
      if (S.hint[S.i] === 0) {
        var tip = UI.el('div', { class: 'hint', style: 'flex:1 1 100%;border-style:solid;background:#f7f6f2' });
        tip.innerHTML = '<b>卡住了？</b>先自己再想 20 秒，实在不行再点提示（一共三级，最后一级才说怎么做）。';
        wrap.appendChild(tip);
        var b = UI.el('button', { class: 'btn-mini', type: 'button', text: '看提示 1/3' });
        b.addEventListener('click', function () { S.hint[S.i] = Math.max(1, S.hint[S.i]); refresh(); });
        wrap.appendChild(b);
      }
    }
    refresh();
    wrap.refresh = refresh;
    return wrap;
  };

  /* ---------------- 落笔 + 结果 ---------------- */
  function renderDone(root) {
    var q = S.q, g = S.g;
    var card = UI.el('div', { class: 'card gd-done' });
    var allFirstOk = S.first.every(Boolean);
    card.innerHTML = '<h2>五步走完了</h2>' +
      '<p class="small muted">现在再落笔：在纸上把过程写一遍，然后对照答案。别回头改五步的答案。</p>';
    var steps = UI.el('div', { class: 'steps' });
    FIVE.forEach(function (st, k) {
      var s = UI.el('span', { class: S.first[k] ? '' : 'no', text: (k + 1) + ' ' + st.n + (S.first[k] ? ' ✓' : ' ✗') });
      steps.appendChild(s);
    });
    if (S.usedWalk) steps.appendChild(UI.el('span', { class: 'hint', text: '看过思路' }));
    card.appendChild(steps);

    var fb = UI.el('div');
    card.appendChild(fb);

    if (q.type !== 'selfcheck' && q.fields) {
      var form = PHYS.ui.fields(q.fields);
      fb.appendChild(UI.el('div', { class: 'tiny muted', style: 'margin-bottom:6px', text: '把最终答案填在这里（算自动判分，也帮你核对单位）：' }));
      fb.appendChild(form.el);
      var row = UI.el('div', { class: 'row', style: 'margin-top:10px' });
      var sub = UI.el('button', { class: 'btn btn-primary', type: 'button', text: '提交最终答案' });
      row.appendChild(sub);
      fb.appendChild(row);
      var out = UI.el('div');
      fb.appendChild(out);
      sub.addEventListener('click', function () {
        var res = form.check();
        if (!res.every(function (r) { return r.filled; })) { UI.toast('还有空没填', 'bad'); return; }
        form.mark(res);
        var ok = res.every(function (r) { return r.ok; });
        S.finalOk = ok;
        finish(ok, out);
        sub.disabled = true;
      });
    } else {
      var row2 = UI.el('div', { class: 'row', style: 'margin-top:10px' });
      var see = UI.el('button', { class: 'btn btn-primary', type: 'button', text: '看参考答案' });
      row2.appendChild(see);
      fb.appendChild(row2);
      var out2 = UI.el('div');
      fb.appendChild(out2);
      see.addEventListener('click', function () { S.finalOk = null; finish(null, out2); see.disabled = true; });
    }
    root.appendChild(card);
    root.appendChild(footBtns());
  }

  function finish(finalOk, out) {
    var q = S.q;
    if (q.ansImg) {
      out.appendChild(UI.el('div', { class: 'tiny muted', style: 'margin:10px 0 4px', text: '原卷参考答案：' }));
      out.appendChild(UI.imgs(q.ansImg, '参考答案'));
    }
    if (q.solution && q.solution.length) {
      var sol = UI.el('div', { class: 'sol' });
      sol.innerHTML = '<h4>解析</h4><ol>' + q.solution.map(function (t) { return '<li>' + UI.escape(t) + '</li>'; }).join('') + '</ol>' +
        (q.tip ? '<div class="tip">一句话关键：' + UI.escape(q.tip) + '</div>' : '');
      out.appendChild(sol);
    }
    if (S.finalOk === null && finalOk !== null) S.finalOk = finalOk;
    var okAll = S.first.every(Boolean) && !S.usedWalk && (finalOk !== false);
    PHYS.progress.guidedDone({
      qid: q.id,
      ok: okAll,
      steps: S.first.slice(),
      usedHint: S.hint.some(function (x) { return x > 0; }),
      usedWalk: S.usedWalk,
      ms: Date.now() - S.startedAt
    });
    PHYS.shell.refreshChip();
    var banner = UI.el('div', { class: 'fb ' + (okAll ? 'ok' : 'warn') });
    banner.innerHTML = okAll
      ? '<b>走通了。</b>五步第一次就全对，而且没看提示——这是真会。'
      : '<b>这次有断点。</b>' + (S.usedWalk ? '看过思路的题不算会，' : '') +
        '断点已记进报告，去错题回炉再走一遍。';
    out.insertBefore(banner, out.firstChild);
  }

  function footBtns() {
    var row = UI.el('div', { class: 'row', style: 'margin-bottom:16px' });
    var nx = UI.el('button', { class: 'btn btn-primary', type: 'button', text: '下一题 →' });
    nx.addEventListener('click', function () {
      var items = guidedItems(), idx = items.indexOf(S.g);
      if (idx < items.length - 1) gotoItem(idx + 1);
      else PHYS.route.go('guided');
    });
    row.appendChild(nx);
    var again = UI.el('button', { class: 'btn', type: 'button', text: '这题重走一遍' });
    again.addEventListener('click', function () { resetState(S.g, S.pack, S.q); rerender(); });
    row.appendChild(again);
    var rep = UI.el('a', { class: 'btn-ghost', href: '#/report', text: '看训练报告' });
    row.appendChild(rep);
    return row;
  }

  /* ---------------- 渲染 ---------------- */
  function rerender() {
    var root = document.getElementById('screen');
    if (!root) return;
    root.innerHTML = '';
    render(root);
  }

  function render(root) {
    if (!S) { renderList(root); return; }
    barEl(root);
    questionCard(root);
    if (!S.done) {
      root.appendChild(railEl());
      renderStep(root);
    } else {
      root.appendChild(railEl());
      renderDone(root);
    }
    PHYS.shell.refreshChip();
  }

  PHYS.registry.register({
    id: 'guided', title: '五步引导', short: '五步', icon: '⌁', order: 10,
    desc: '一次只问一步：认情境 → 圈条件 → 选规律 → 代数据 → 验结果',
    mount: function (root, params) {
      var qid = params && (params.q || params._arg);
      var g = qid ? findGuided(qid) : null;
      if (g) {
        var ref = qIndex()[g.questionId];
        if (!ref) {
          S = null;
          root.appendChild(UI.el('div', { class: 'card empty', text: '找不到这道题的原始题包。' }));
          return;
        }
        resetState(g, ref.pack, ref.q);
        render(root);
      } else {
        S = null;
        render(root);
      }
    },
    unmount: function () { /* 保留 S 以便返回时继续？统一清空，避免脏状态 */ S = null; }
  });
})();
