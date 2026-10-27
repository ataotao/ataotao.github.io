/* =============================================================
   训练报告：五步命中率 / 概念熟练度 / 试卷正确率 / 下一步做什么 + 记录导出导入
   ============================================================= */
(function () {
  'use strict';
  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui;

  UI.addCSS(
    '.rp-sec{margin-bottom:14px}' +
    '.rp-step{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--line)}' +
    '.rp-step:last-child{border-bottom:0}' +
    '.rp-step .nm{width:78px;font-size:13.5px;font-weight:600;flex:0 0 78px}' +
    '.rp-step .bw{flex:1;min-width:60px}' +
    '.rp-step .vv{width:74px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums}' +
    '.rp-step .tagx{font-size:11px;padding:1px 7px;border-radius:99px;background:var(--bad-bg);color:var(--bad);font-weight:700}' +
    '.rp-tips{border-left:3px solid var(--brand);padding-left:12px;margin:10px 0}' +
    '.rp-tips b{color:var(--brand-d)}' +
    '.rp-pack{display:flex;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px}' +
    '.rp-pack:last-child{border-bottom:0}' +
    '.rp-lv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}' +
    '.rp-lv div{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;text-align:center}' +
    '.rp-lv b{display:block;font-size:17px}' +
    '.rp-lv span{font-size:11.5px;color:var(--muted)}' +
    '@media(max-width:640px){.rp-step .nm{width:62px;flex:0 0 62px}.rp-lv{grid-template-columns:repeat(2,1fr)}}'
  );

  var STEP_ADVICE = {
    model: '做题前先问一句「这是什么模型」。看到支点+动力阻力=杠杆；看到滑轮=滑轮组；看到温度变化/吸放热=热学。模型认错，后面全白算。',
    cond: '把条件连单位一起抄到纸上（500 N / 20 cm / 2 kg），再标出"题目没给的不许自己加"。单位不统一是这里最常见的断点。',
    rule: '看到题目先别算，先写公式，并默念一遍适用条件（杠杆要平衡、滑轮要不计摩擦、热学要吸放热对应）。公式选错，算得再对也没分。',
    calc: '先换算单位（cm→m、g→kg、kW→W），再代数字。分步写中间量，别在脑子里连乘。',
    check: '最后 10 秒做三件事：看单位、看数量级、看常识（机械效率不会超过 100%，人提东西的功率不会只有几毫瓦）。'
  };

  function stepRow(st, rate, n) {
    var pct = rate === null ? 0 : Math.round(rate * 100);
    var cls = rate === null ? '' : pct >= 75 ? 'ok' : pct >= 50 ? '' : 'bad';
    var d = UI.el('div', { class: 'rp-step' });
    d.innerHTML = '<span class="nm">' + st.n + '</span>' +
      '<span class="bw"><span class="bar ' + cls + '"><i style="width:' + pct + '%"></i></span></span>' +
      '<span class="vv">' + (rate === null ? '没数据' : pct + '% · ' + n + ' 次') + '</span>';
    return d;
  }

  function conceptTagStats() {
    var byTag = {};
    (PHYS.DATA.concepts || []).forEach(function (c) {
      var rec = PHYS.store.get('concept.' + c.id, null);
      (c.tags || []).forEach(function (t) {
        var s = byTag[t] = byTag[t] || { n: 0, ok: 0, total: 0 };
        s.total++;
        if (rec && rec.n) { s.n += rec.n; s.ok += rec.ok; }
      });
    });
    return Object.keys(byTag).map(function (t) {
      var s = byTag[t];
      return { tag: t, n: s.n, ok: s.ok, rate: s.n ? s.ok / s.n : null, total: s.total };
    }).filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return a.rate - b.rate; });
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  PHYS.registry.register({
    id: 'report', title: '训练报告', short: '报告', icon: '▦', order: 30,
    desc: '五步命中率、概念熟练度、试卷正确率，以及下一步补哪儿',
    mount: function (root) {
      var s = PHYS.progress.stats();
      var weakest = null;
      PHYS.FIVE.forEach(function (st) {
        var r = s.stepRates[st.k];
        var n = (PHYS.store.get('stepStats.' + st.k, { n: 0 }).n) || 0;
        if (r !== null && n >= 2 && (!weakest || r < weakest.r)) weakest = { st: st, r: r, n: n };
      });

      /* 概览 */
      var top = UI.el('div', { class: 'card' });
      top.innerHTML = '<h2>训练报告</h2>' +
        '<p class="small muted">只看趋势，不看分数。哪一环最红就补哪一环，不要平均用力。</p>' +
        '<div class="rp-lv">' +
        '<div><b>' + s.streak + '</b><span>连续练习天数</span></div>' +
        '<div><b>' + s.guidedDone + '</b><span>五步引导走完</span></div>' +
        '<div><b>' + (s.exam.rate === null ? '—' : U.fmtPct(s.exam.rate)) + '</b><span>试卷正确率</span></div>' +
        '<div><b>' + s.wrong + '</b><span>错题待清</span></div>' +
        '</div>';
      root.appendChild(top);

      /* 五步 */
      var stc = UI.el('div', { class: 'card' });
      stc.appendChild(UI.el('h2', { text: '① 五步断在哪一环' }));
      stc.appendChild(UI.el('p', { class: 'small muted', style: 'margin-bottom:6px', text: '统计的是「第一次就答对」的比例；看提示后答对不算。' }));
      PHYS.FIVE.forEach(function (st) {
        var n = (PHYS.store.get('stepStats.' + st.k, { n: 0 }).n) || 0;
        var row = stepRow(st, s.stepRates[st.k], n);
        if (weakest && weakest.st.k === st.k) {
          row.children[0].innerHTML = st.n + ' <span class="tagx">最弱</span>';
        }
        stc.appendChild(row);
      });
      if (weakest) {
        var tip = UI.el('div', { class: 'fb info', style: 'margin-top:12px' });
        tip.innerHTML = '<b>下一步：补「' + weakest.st.n + '」。</b>' + STEP_ADVICE[weakest.st.k] +
          '<div style="margin-top:6px"><a class="btn-mini" href="#/guided">做 1 题五步引导 →</a> ' +
          '<a class="btn-mini" href="#/wrong">清错题 →</a></div>';
        stc.appendChild(tip);
      } else {
        stc.appendChild(UI.el('p', { class: 'tiny muted', style: 'margin-top:8px', text: '先各环节做 2–3 题，这里才有诊断价值。' }));
      }
      root.appendChild(stc);

      /* 概念 */
      var cc = UI.el('div', { class: 'card' });
      cc.appendChild(UI.el('h2', { text: '② 概念熟练度' }));
      var lv = s.concept.levels;
      var totalC = lv[0] + lv[1] + lv[2] + lv[3];
      cc.innerHTML += '<div class="rp-lv">' +
        '<div><b>' + lv[3] + '</b><span>掌握</span></div>' +
        '<div><b>' + lv[2] + '</b><span>熟悉</span></div>' +
        '<div><b>' + lv[1] + '</b><span>生疏</span></div>' +
        '<div><b>' + lv[0] + '</b><span>没练过</span></div>' +
        '</div>';
      var tagStats = conceptTagStats();
      var weakestTags = tagStats.slice(0, 3);
      if (weakestTags.length) {
        var tl = UI.el('div', { style: 'margin-top:10px' });
        tl.innerHTML = '<div class="tiny muted" style="margin-bottom:4px">正确率最低的考点（先练这几个）：</div>';
        weakestTags.forEach(function (t) {
          var d = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;font-size:13px;padding:3px 0' });
          d.innerHTML = '<span style="flex:1">' + UI.escape(t.tag) + '</span>' +
            '<span class="bar" style="width:110px"><i style="width:' + Math.round(t.rate * 100) + '%"></i></span>' +
            '<span class="tiny muted" style="width:70px;text-align:right">' + U.fmtPct(t.rate) + '</span>';
          d.style.cursor = 'pointer';
          d.addEventListener('click', function () { PHYS.route.go('concept', { tag: t.tag }); });
          tl.appendChild(d);
        });
        cc.appendChild(tl);
      }
      cc.appendChild(UI.el('p', { class: 'tiny muted', style: 'margin-top:8px', html: '概念卡一共 ' + totalC + ' 张；每天 2 分钟就能推进一步。<a href="#/concept">去概念闪练 →</a>' }));
      root.appendChild(cc);

      /* 试卷 */
      var ec = UI.el('div', { class: 'card' });
      ec.appendChild(UI.el('h2', { text: '③ 试卷正确率' }));
      if (!s.exam.packs.length) {
        ec.appendChild(UI.el('p', { class: 'small muted', text: '还没有题包。' }));
      }
      s.exam.packs.forEach(function (p) {
        var rate = p.n ? p.ok / p.n : null;
        var d = UI.el('div', { class: 'rp-pack' });
        d.innerHTML = '<span style="flex:1;min-width:0">' + UI.escape(p.name) + '</span>' +
          '<span class="tiny muted">' + p.n + '/' + p.total + '</span>' +
          '<span class="bar" style="width:90px"><i style="width:' + Math.round((rate || 0) * 100) + '%"></i></span>' +
          '<span class="tiny" style="width:44px;text-align:right">' + (rate === null ? '—' : U.fmtPct(rate)) + '</span>';
        d.style.cursor = 'pointer';
        d.addEventListener('click', function () { PHYS.route.go('exam', { _arg: p.id }); });
        ec.appendChild(d);
      });
      root.appendChild(ec);

      /* 错题 */
      var wl = PHYS.progress.wrongList();
      var byKind = { guided: 0, exam: 0, concept: 0 };
      wl.forEach(function (w) { byKind[w.kind] = (byKind[w.kind] || 0) + 1; });
      var wc = UI.el('div', { class: 'card' });
      wc.innerHTML = '<div class="row"><h2 style="margin:0">④ 错题待清</h2><span class="spacer"></span>' +
        '<a class="btn-mini" href="#/wrong">去回炉 →</a></div>' +
        '<p class="small muted" style="margin-top:6px">五步断点 ' + byKind.guided + ' · 试卷错题 ' + byKind.exam + ' · 概念错卡 ' + byKind.concept + '</p>';
      root.appendChild(wc);

      /* 数据管理 */
      var dc = UI.el('div', { class: 'card' });
      dc.innerHTML = '<h2>⑤ 记录（换设备用）</h2><p class="small muted">记录保存在这台设备的浏览器里，清缓存会丢。可以导出备份，或换到另一台设备导入。</p>';
      var row = UI.el('div', { class: 'row', style: 'margin-top:10px' });
      var ex = UI.el('button', { class: 'btn', type: 'button', text: '导出记录（JSON）' });
      ex.addEventListener('click', function () {
        download('物理训练记录-' + U.today() + '.json', JSON.stringify(PHYS.store.all(), null, 1));
        UI.toast('已导出', 'ok');
      });
      row.appendChild(ex);
      var im = UI.el('label', { class: 'btn', style: 'cursor:pointer' });
      im.textContent = '导入记录';
      var file = UI.el('input', { type: 'file', accept: '.json', style: 'display:none' });
      file.addEventListener('change', function () {
        var f = file.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            PHYS.store.replaceAll(JSON.parse(fr.result));
            UI.toast('导入成功', 'ok');
            PHYS.route.reload();
          } catch (e) { UI.toast('导入失败：' + e.message, 'bad'); }
        };
        fr.readAsText(f);
      });
      im.appendChild(file);
      row.appendChild(im);
      var cl = UI.el('button', { class: 'btn-ghost', type: 'button', text: '清空所有记录' });
      cl.addEventListener('click', function () {
        UI.confirm('清空后所有进度、错题、报告数据都会消失（不可恢复）。确定？', '清空').then(function (ok) {
          if (!ok) return;
          PHYS.store.clear();
          UI.toast('已清空', 'ok');
          PHYS.route.reload();
        });
      });
      row.appendChild(cl);
      dc.appendChild(row);
      root.appendChild(dc);
      PHYS.shell.refreshChip();
    }
  });
})();
