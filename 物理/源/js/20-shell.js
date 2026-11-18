/* =============================================================
   外壳：五步定义 + 首页（Lead 维护）
   ============================================================= */
(function () {
  'use strict';
  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui;

  /* 五步定义（全站共用） */
  PHYS.FIVE = [
    { k: 'model', n: '认情境', d: '这是什么模型 / 什么现象', ask: '先别算，先说清这题在考什么' },
    { k: 'cond', n: '圈条件', d: '已知、所求、隐含条件', ask: '把数字连单位一起抄下来，题目没给的不许自己加' },
    { k: 'rule', n: '选规律', d: '用哪条公式 / 原理', ask: '为什么能用它？适用条件满足了吗' },
    { k: 'calc', n: '代数据', d: '单位统一 → 代入 → 算', ask: '先换单位，再代数字，别跳步' },
    { k: 'check', n: '验结果', d: '单位、量级、常识', ask: '这个数合理吗？有没有超过 100% 这种事' }
  ];
  PHYS.FIVE_BY = {};
  PHYS.FIVE.forEach(function (s) { PHYS.FIVE_BY[s.k] = s; });

  PHYS.shell = {
    /** 顶栏"今天"状态 */
    refreshChip: function () {
      var el = document.getElementById('chip-day');
      if (!el) return;
      var d = PHYS.store.get('days.' + U.today(), null) || { guided: 0, exam: 0, concept: 0 };
      var n = (d.guided || 0) + (d.exam || 0) + (d.concept || 0);
      var st = PHYS.progress.stats();
      if (!n) { el.textContent = '今天还没练 · 连续 ' + st.streak + ' 天'; }
      else { el.textContent = '今天 ' + n + ' 次 · 连续 ' + st.streak + ' 天'; }
    },
    help: function () {
      UI.modal({
        title: '怎么用这个工具',
        body: '<ol class="small" style="padding-left:20px;line-height:1.9">' +
          '<li><b>五步引导</b>：每题只问五步，先想再点。提示分三级，能不看就不看。<b>只有第一次就答对才算会</b>。</li>' +
          '<li><b>概念闪练</b>：每天 2 分钟，把易混概念刷到"掌握"。答错会立刻给一句话解释。</li>' +
          '<li><b>试卷练习</b>：学校发了卷子，<b>先在纸上整张做完</b>，再一题一题录答案；错题自动进错题本。</li>' +
          '<li><b>错题回炉 / 训练报告</b>：一周看一次，只补最红的那一环，不要平均用力。</li>' +
          '<li>所有记录存在这台设备的浏览器里（关掉不丢）；换电脑用「报告」里的导出/导入。</li>' +
          '</ol><p class="tiny muted" style="margin-top:10px">图片在 <code>图片/</code> 文件夹，移动网页时要连文件夹一起搬。</p>',
        actions: [{ text: '知道了', kind: 'primary' }]
      });
    }
  };

  /* ---------------- 首页 ---------------- */
  function pickRecommend(s) {
    var gTotal = (PHYS.DATA.guided || []).length || 0;
    var gDone = s.guidedDone || 0;
    if (!gDone && gTotal) {
      return {
        type: 'guided', mode: 'guided',
        title: '从第 1 题开始走一遍五步',
        why: '第一次不用求快。看着工具一步步问，把「想」和「算」分开。'
      };
    }
    /* 找最弱的一环：至少 3 次作答，命中率最低 */
    var weak = null;
    PHYS.FIVE.forEach(function (st) {
      var r = s.stepRates[st.k];
      if (r === null || r === undefined) return;
      var n = (PHYS.store.get('stepStats.' + st.k, { n: 0 }).n) || 0;
      if (n < 3) return;
      if (!weak || r < weak.r) weak = { k: st.k, r: r, n: n, st: st };
    });
    if (weak && weak.r < 0.7) {
      return {
        type: 'weak', mode: 'guided',
        title: '最弱的一环：' + weak.st.n + '（命中率 ' + U.fmtPct(weak.r) + '）',
        why: '这一环你 ' + weak.n + ' 次作答只对 ' + Math.round(weak.n * weak.r) + ' 次。做 1 题引导训练，卡在这一步时多想 20 秒。'
      };
    }
    var wrong = PHYS.progress.wrongList();
    if (wrong.length) {
      return {
        type: 'wrong', mode: 'wrong',
        title: '错题回炉：' + wrong.length + ' 道还没清',
        why: '错过的题不清，刷再多新题也是把同一个错误刷得更熟。'
      };
    }
    if (s.exam.n < s.exam.packs.reduce(function (a, p) { return a + p.total; }, 0)) {
      return {
        type: 'exam', mode: 'exam',
        title: '用试卷练习验收一下',
        why: '先在纸上整张做完，再回来一题一题录答案、对解析。'
      };
    }
    return {
      type: 'concept', mode: 'concept',
      title: '概念闪练：2 分钟一轮',
      why: '把易混概念刷到"掌握"，做题时就不容易在第一步站错队。'
    };
  }

  function miniFlow(s) {
    var box = UI.el('div', { class: 'flow' });
    PHYS.FIVE.forEach(function (st) {
      var r = s.stepRates[st.k];
      var hint = r === null ? '还没数据' : U.fmtPct(r);
      box.appendChild(UI.el('div', { html: '<b>' + st.n + '</b><span>' + hint + '</span><i>' + st.d + '</i>' }));
    });
    return box;
  }

  PHYS.registry.register({
    id: 'home', title: '首页', short: '首页', icon: '⌂', order: 0,
    mount: function (root) {
      var s = PHYS.progress.stats();
      var rec = pickRecommend(s);
      var gTotal = (PHYS.DATA.guided || []).length || 0;
      var cTotal = (PHYS.DATA.concepts || []).length || 0;
      var exTotal = s.exam.packs.reduce(function (a, p) { return a + p.total; }, 0);

      var hero = UI.el('div', { class: 'card hero' });
      var h2 = '听懂课，不等于会做题。';
      var sub = '上课是跟着老师走一遍；做题得自己走完下面这条链。断在哪一环，多刷题补不上——所以这里一次只练一环。';
      hero.innerHTML =
        '<h2>' + h2 + '</h2>' +
        '<p class="why">' + sub + '</p>';
      hero.appendChild(miniFlow(s));
      hero.appendChild(UI.el('p', { class: 'tiny muted', style: 'margin-top:10px', text: '上面数字 = 这一环「第一次就答对」的比例（看提示后答对不算）。没有数字就先走一题。' }));
      root.appendChild(hero);

      /* 今日建议 */
      var recBox = UI.el('div', { class: 'rec-box' });
      recBox.innerHTML = '<div class="row"><span class="tag">今天先做这个</span></div>' +
        '<h3 style="margin-top:8px">' + UI.escape(rec.title) + '</h3>' +
        '<p class="small muted" style="margin-top:4px">' + UI.escape(rec.why) + '</p>';
      var go = UI.el('button', { class: 'btn btn-primary', style: 'margin-top:12px', type: 'button', text: '开始 →' });
      go.addEventListener('click', function () { PHYS.route.go(rec.mode); });
      recBox.appendChild(go);
      root.appendChild(recBox);

      /* 模式入口 */
      var modes = UI.el('div', { class: 'modes' });
      PHYS.registry.all().forEach(function (m) {
        if (m.id === 'home') return;
        var a = document.createElement('a');
        a.className = 'mode' + (m.id === rec.mode ? ' rec' : '');
        a.href = '#/' + m.id;
        a.innerHTML = '<h3>' + (m.icon ? '<span>' + m.icon + '</span>' : '') + UI.escape(m.title) + '</h3>' +
          '<p>' + UI.escape(m.desc || '') + '</p>' +
          '<span class="go">' + (m.id === rec.mode ? '今天就做这个 →' : '进入 →') + '</span>';
        modes.appendChild(a);
      });
      root.appendChild(modes);

      /* 进度概览 */
      var ov = UI.el('div', { class: 'card' });
      ov.innerHTML = '<h2>练到哪儿了</h2>';
      var g = s.guidedDone;
      ov.appendChild(kvRow('五步引导', g + ' / ' + gTotal + ' 题走完', g / (gTotal || 1)));
      var cMastered = s.concept.levels[3], cFamiliar = s.concept.levels[2];
      ov.appendChild(kvRow('概念掌握', '掌握 ' + cMastered + ' · 熟悉 ' + cFamiliar + ' / ' + cTotal + ' 张', (cMastered + cFamiliar * .6) / (cTotal || 1)));
      ov.appendChild(kvRow('试卷练习', (s.exam.rate === null ? '还没录' : '正确率 ' + U.fmtPct(s.exam.rate)) + '（' + s.exam.n + ' / ' + exTotal + ' 题）', s.exam.rate || 0));
      ov.appendChild(kvRow('错题待清', s.wrong + ' 道', 1 - Math.min(1, s.wrong / 20)));
      root.appendChild(ov);

      /* 最近错题 */
      var wrong = PHYS.progress.wrongList().slice(0, 5);
      if (wrong.length) {
        var wc = UI.el('div', { class: 'card' });
        wc.innerHTML = '<div class="row"><h2 style="margin:0">最近卡住的</h2><span class="spacer"></span>' +
          '<a class="btn-mini" href="#/wrong">全部 →</a></div>';
        var ul = UI.el('div', { style: 'margin-top:8px' });
        wrong.forEach(function (w) { ul.appendChild(wrongRow(w)); });
        wc.appendChild(ul);
        root.appendChild(wc);
      }
      PHYS.shell.refreshChip();
    }
  });

  function kvRow(label, val, rate) {
    var pct = Math.round(U.clamp(rate || 0, 0, 1) * 100);
    var cls = pct >= 75 ? 'ok' : pct >= 40 ? '' : 'warn';
    var d = UI.el('div', { style: 'padding:7px 0' });
    d.innerHTML = '<div class="row" style="justify-content:space-between;font-size:13.5px">' +
      '<span>' + label + '</span><b>' + val + '</b></div>' +
      '<div class="bar ' + cls + '" style="margin-top:5px"><i style="width:' + pct + '%"></i></div>';
    return d;
  }

  function wrongRow(w) {
    var label = '', sub = '', href = '#/wrong';
    if (w.kind === 'guided') {
      var g = (PHYS.DATA.guided || []).filter(function (x) { return x.questionId === w.qid; })[0];
      label = g ? g.title : w.qid;
      sub = '五步引导没走通';
      href = '#/guided?q=' + encodeURIComponent(w.qid);
    } else if (w.kind === 'exam') {
      var p = (PHYS.DATA.packs || []).filter(function (x) { return x.id === w.packId; })[0];
      var q = p ? p.questions.filter(function (x) { return x.id === w.qid; })[0] : null;
      label = (p ? p.name : w.packId) + ' 第 ' + (q ? q.no : '?') + ' 题';
      sub = (q && q.tags ? q.tags.join(' · ') : '试卷练习') + (w.n ? ' · 累计错 ' + w.n + ' 次' : '');
      href = '#/exam/' + encodeURIComponent(w.packId) + '?q=' + encodeURIComponent(w.qid);
    } else if (w.kind === 'concept') {
      var c = (PHYS.DATA.concepts || []).filter(function (x) { return x.id === w.cid; })[0];
      label = c ? c.q : w.cid;
      sub = '概念没掌握' + (c && c.tags ? ' · ' + c.tags.join('/') : '');
    }
    var d = UI.el('a', { class: 'kv', href: href, style: 'text-decoration:none;color:inherit;display:flex' });
    d.innerHTML = '<span style="min-width:0"><b style="font-weight:600">' + UI.escape(label) + '</b>' +
      '<span class="tiny muted" style="display:block">' + UI.escape(sub) + '</span></span>' +
      '<span class="tiny muted" style="margin-left:auto;white-space:nowrap">' + U.daysAgo(w.at) + ' 天前</span>';
    return d;
  }
  PHYS._kvRow = kvRow;
  PHYS._wrongRow = wrongRow;

  /* ---------------- 导航横滑提示 ---------------- */
  /* #nav 在手机上靠 overflow-x 横滑，项目一多后面的模式就推在屏幕外，且没有滚动条。
     CSS 用 mask-image 做边缘渐隐，这里只负责告诉 CSS「左边/右边还有没有内容」：
     只读 scrollWidth / clientWidth / scrollLeft，不碰路由、不碰题目逻辑。 */
  function syncNavEdges(nav) {
    var max = nav.scrollWidth - nav.clientWidth;
    var canRight = max > 1 && nav.scrollLeft < max - 1;
    var canLeft = max > 1 && nav.scrollLeft > 1;
    nav.classList.toggle('can-scroll-right', canRight);
    nav.classList.toggle('can-scroll-left', canLeft);
  }

  function initNavScrollHint(tries) {
    var nav = document.getElementById('nav');
    if (!nav) return;
    /* 导航条目由 PHYS.boot（00-core.js）渲染，而本文件先于 90-app.js 执行：
       拿到空 nav 就等下一拍再试（最多约 1 秒，失败也不影响页面） */
    if (!nav.children.length) {
      if ((tries || 0) < 40) setTimeout(function () { initNavScrollHint((tries || 0) + 1); }, 25);
      return;
    }
    if (nav.getAttribute('data-scroll-hint') === 'on') return;
    nav.setAttribute('data-scroll-hint', 'on');
    nav.addEventListener('scroll', function () { syncNavEdges(nav); }, { passive: true });
    window.addEventListener('resize', function () { syncNavEdges(nav); });
    window.addEventListener('orientationchange', function () { syncNavEdges(nav); });
    window.addEventListener('load', function () { syncNavEdges(nav); });
    if (document.fonts && document.fonts.ready) {
      try { document.fonts.ready.then(function () { syncNavEdges(nav); }); } catch (e) { }
    }
    if (typeof ResizeObserver === 'function') {
      try { new ResizeObserver(function () { syncNavEdges(nav); }).observe(nav); } catch (e) { }
    }
    syncNavEdges(nav);
    nav.classList.add('nav-ready'); /* 关掉窄屏的纯 CSS 兜底遮罩，改由上面精确控制 */
  }

  /* 顶栏按钮 + 导航横滑提示 */
  document.addEventListener('DOMContentLoaded', function () {
    var h = document.getElementById('btn-help');
    if (h) h.addEventListener('click', PHYS.shell.help);
    /* boot 的 DOMContentLoaded 监听在本文件之后注册，推迟一拍才能拿到已渲染的导航 */
    setTimeout(function () { initNavScrollHint(); }, 0);
  });
})();
