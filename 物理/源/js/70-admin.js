/* =============================================================
   题库管理：看题包 / 导入题包（JSON）/ 导出全部 / 删除导入的题包
   规则：id 相同 = 覆盖；导入的题包存在 localStorage，优先于内置
   ============================================================= */
(function () {
  'use strict';
  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui;

  var TAGS = null;
  function tagSet() {
    if (TAGS) return TAGS;
    TAGS = {};
    /* 规范清单在这里只做兜底；真正的权威来源是已内置的题库与概念卡（build 已校验过），
       两处并起来，避免「清单没跟上数据」导致合法考点被判非法 */
    ['杠杆五要素', '杠杆平衡条件', '杠杆分类', '最小力', '杠杆动态平衡',
      '定滑轮与动滑轮', '滑轮组', '功', '功率', '机械效率', '测机械效率实验',
      '动能与势能', '机械能转化', '分子动理论', '扩散现象', '分子间作用力',
      '内能', '改变内能的方式', '温度热量内能辨析', '比热容', '热量计算', '热值', '热机效率', '能量守恒',
      '电荷与摩擦起电', '电流与电路', '串并联电路', '电学实验', '实验探究'
    ].forEach(function (t) { TAGS[t] = 1; });
    var D = PHYS.DATA || {};
    (D.packs || []).forEach(function (p) {
      (p.questions || []).forEach(function (q) { (q.tags || []).forEach(function (t) { TAGS[t] = 1; }); });
    });
    (D.concepts || []).forEach(function (c) { (c.tags || []).forEach(function (t) { TAGS[t] = 1; }); });
    return TAGS;
  }

  function validate(obj) {
    var errs = [];
    var packs = obj && Array.isArray(obj.packs) ? obj.packs : (obj && obj.id ? [obj] : null);
    if (!packs) return { packs: null, errs: ['文件里没有 packs 数组（格式：{"version":2,"packs":[...]}）'] };
    packs.forEach(function (p, pi) {
      var at = '第 ' + (pi + 1) + ' 个题包';
      if (!p.id) errs.push(at + '：缺少 id');
      if (!p.name) errs.push(at + '：缺少 name');
      if (!Array.isArray(p.questions) || !p.questions.length) errs.push(at + '：questions 不能为空');
      else p.questions.forEach(function (q, qi) {
        var w = at + ' 第 ' + (qi + 1) + ' 题' + (q.no ? '（卷面第 ' + q.no + ' 题）' : '');
        if (!q.id) errs.push(w + '：缺少 id');
        if (!q.no) errs.push(w + '：缺少 no');
        if (!q.group) errs.push(w + '：缺少 group');
        if (['choice', 'fill', 'solve', 'selfcheck'].indexOf(q.type) < 0) errs.push(w + '：type 非法');
        if (['model', 'cond', 'rule', 'calc', 'check'].indexOf(q.focus) < 0) errs.push(w + '：focus 非法');
        if (!q.askImg) errs.push(w + '：缺少 askImg（原题图路径）');
        if (!Array.isArray(q.tags) || !q.tags.length) errs.push(w + '：tags 不能为空');
        else q.tags.forEach(function (t) { if (!tagSet()[t]) errs.push(w + '：考点不在规范清单 → ' + t); });
        if (q.type === 'choice') {
          if (!Array.isArray(q.opts) || q.opts.length < 2) errs.push(w + '：选择题需要 opts');
          if (!(Number.isInteger(q.ans) || Array.isArray(q.ans))) errs.push(w + '：ans 必须是选项下标');
        } else if (q.type !== 'selfcheck') {
          if (!Array.isArray(q.fields) || !q.fields.length) errs.push(w + '：填空/解答题需要 fields');
        }
      });
    });
    return { packs: errs.length ? null : packs, errs: errs };
  }

  UI.addCSS(
    '.ad-pack{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--line)}' +
    '.ad-pack:last-child{border-bottom:0}' +
    '.ad-pack .nm{font-size:14px;font-weight:600}' +
    '.ad-pack .mt{font-size:12px;color:var(--muted)}' +
    '.ad-err{max-height:220px;overflow:auto;font-size:12.5px;line-height:1.7;color:#8d2a2a;background:var(--bad-bg);padding:10px 12px;border-radius:8px;margin-top:8px}'
  );

  PHYS.registry.register({
    id: 'admin', title: '题库管理', short: '题库', icon: '⊞', order: 40,
    desc: '看题包、导入新卷、导出备份',
    mount: function (root) {
      var importedIds = PHYS.store.get('importedPacks', []).map(function (p) { return p.id; });
      var packs = PHYS.DATA.packs || [];

      var head = UI.el('div', { class: 'card' });
      head.innerHTML = '<h2>题库管理</h2>' +
        '<p class="small muted">题包来自 <code>题库/pack-*.json</code>（构建时内联）。这里可以导入老师后来发的卷子，或导出给别人。</p>';
      root.appendChild(head);

      /* 列表 */
      var list = UI.el('div', { class: 'card' });
      list.innerHTML = '<h3>题包（' + packs.length + ' 套 / ' + packs.reduce(function (a, p) { return a + p.questions.length; }, 0) + ' 题）</h3>';
      packs.forEach(function (p) {
        var isImp = importedIds.indexOf(p.id) >= 0;
        var rec = PHYS.store.get('exam.' + p.id, {});
        var doneN = Object.keys(rec).length;
        var d = UI.el('div', { class: 'ad-pack' });
        d.innerHTML = '<div style="flex:1;min-width:0">' +
          '<div class="nm">' + UI.escape(p.name) + ' <span class="pill">' + (isImp ? '导入' : '内置') + '</span></div>' +
          '<div class="mt">' + UI.escape(p.id) + ' · ' + p.questions.length + ' 题 · 已做 ' + doneN +
          (p.source ? ' · ' + UI.escape(p.source) : '') + '</div></div>';
        var btns = UI.el('div', { class: 'row', style: 'gap:6px' });
        var go = UI.el('a', { class: 'btn-mini', href: '#/exam/' + encodeURIComponent(p.id), text: '去练' });
        btns.appendChild(go);
        if (isImp) {
          var del = UI.el('button', { class: 'btn-mini', type: 'button', text: '删除' });
          del.addEventListener('click', function () {
            UI.confirm('删除导入的题包「' + p.name + '」？（内置的不受影响）').then(function (ok) {
              if (!ok) return;
              var rest = PHYS.store.get('importedPacks', []).filter(function (x) { return x.id !== p.id; });
              PHYS.store.set('importedPacks', rest);
              PHYS.route.reload();
              UI.toast('已删除，刷新后生效', 'ok');
            });
          });
          btns.appendChild(del);
        }
        d.appendChild(btns);
        list.appendChild(d);
      });
      root.appendChild(list);

      /* 导入 */
      var imp = UI.el('div', { class: 'card' });
      imp.innerHTML = '<h3>导入题包</h3>' +
        '<p class="small muted">格式见 <code>源/SPEC.md</code> 第 2 节，或照 <code>题库/pack-模板.json</code> 改。' +
        '图片要放在 <code>图片/</code> 下，路径写相对路径（如 <code>图片/pk-w10/q01.png</code>）。</p>';
      var row = UI.el('div', { class: 'row', style: 'margin-top:10px' });
      var pick = UI.el('label', { class: 'btn', style: 'cursor:pointer', text: '选择 .json 文件' });
      var file = UI.el('input', { type: 'file', accept: '.json', style: 'display:none' });
      pick.appendChild(file);
      row.appendChild(pick);
      var ta = UI.el('textarea', { class: 'inp wide', style: 'height:120px;display:block;margin-top:10px;width:100%', placeholder: '也可以把 JSON 直接粘到这里' });
      imp.appendChild(row);
      imp.appendChild(ta);
      var go2 = UI.el('button', { class: 'btn btn-primary', type: 'button', style: 'margin-top:10px', text: '校验并导入' });
      imp.appendChild(go2);
      var msg = UI.el('div');
      imp.appendChild(msg);
      root.appendChild(imp);

      function doImport(text) {
        msg.innerHTML = '';
        var obj;
        try { obj = JSON.parse(text); } catch (e) {
          msg.innerHTML = '<div class="ad-err">JSON 解析失败：' + UI.escape(e.message) + '</div>';
          return;
        }
        var v = validate(obj);
        if (v.errs.length) {
          msg.innerHTML = '<div class="ad-err"><b>校验没通过（' + v.errs.length + ' 条），整包不导入：</b><br>' +
            v.errs.slice(0, 20).map(function (e) { return '· ' + UI.escape(e); }).join('<br>') +
            (v.errs.length > 20 ? '<br>…还有 ' + (v.errs.length - 20) + ' 条' : '') + '</div>';
          return;
        }
        var cur = PHYS.store.get('importedPacks', []);
        v.packs.forEach(function (p) {
          cur = cur.filter(function (x) { return x.id !== p.id; });
          cur.push(p);
        });
        PHYS.store.set('importedPacks', cur);
        msg.innerHTML = '<div class="fb ok"><b>导入成功。</b>共 ' + v.packs.length + ' 套题；刷新页面后可在「试卷练习」里看到。</div>';
        UI.toast('导入成功', 'ok');
        setTimeout(function () { location.reload(); }, 700);
      }

      file.addEventListener('change', function () {
        var f = file.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { doImport(fr.result); };
        fr.readAsText(f);
      });
      go2.addEventListener('click', function () {
        var t = ta.value.trim();
        if (!t) { UI.toast('先选文件或粘贴 JSON', 'bad'); return; }
        doImport(t);
      });

      /* 导出 */
      var exp = UI.el('div', { class: 'card' });
      exp.innerHTML = '<h3>导出</h3><p class="small muted">导出所有题包（内置 + 导入）为一个 JSON 文件，用于备份或分享。</p>';
      var exb = UI.el('button', { class: 'btn', type: 'button', style: 'margin-top:8px', text: '导出全部题包' });
      exb.addEventListener('click', function () {
        var blob = new Blob([JSON.stringify({ version: 2, packs: PHYS.DATA.packs }, null, 1)], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '物理题包-' + U.today() + '.json';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      });
      exp.appendChild(exb);
      root.appendChild(exp);

      var foot = UI.el('div', { class: 'card' });
      foot.innerHTML = '<h3>加题工作流</h3><ol class="small" style="padding-left:20px;line-height:1.9">' +
        '<li>把新卷子（docx）放进 <code>题库/</code>，用 <code>物理/工具/extract.ps1</code> 裁出逐题图片到 <code>图片/</code>。</li>' +
        '<li>照 <code>题库/pack-模板.json</code> 写一个 <code>pack-新学期.json</code>（题干文本、选项、答案、解析、考点）。</li>' +
        '<li>回到这里「选择 .json 文件」→ 校验并导入；或直接重建页面（改的是内置题包时）。</li>' +
        '</ol>';
      root.appendChild(foot);
      PHYS.shell.refreshChip();
    }
  });
})();
