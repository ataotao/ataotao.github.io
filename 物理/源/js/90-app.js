/* =============================================================
   启动（Lead 维护）：注册路由壳、挂载、全局事件
   ============================================================= */
(function () {
  'use strict';
  var PHYS = window.PHYS;

  /* 导入的题包（localStorage）覆盖同 id 的内置题包 */
  try {
    var imported = PHYS.store.get('importedPacks', []) || [];
    if (imported.length) {
      imported.forEach(function (p) {
        if (!p || !p.id || !Array.isArray(p.questions)) return;
        var at = -1;
        PHYS.DATA.packs.forEach(function (x, i) { if (x.id === p.id) at = i; });
        if (at >= 0) PHYS.DATA.packs[at] = p; else PHYS.DATA.packs.push(p);
      });
    }
  } catch (e) { if (window.console) console.error('导入题包合并失败', e); }

  /* 未实现的模块先给占位，避免白屏 */
  var PLACEHOLDER = ['guided', 'concept', 'exam', 'wrong', 'report', 'admin'];
  PLACEHOLDER.forEach(function (id) {
    if (PHYS.registry.get(id)) return;
    PHYS.registry.register({
      id: id, title: id, short: id, order: 50,
      mount: function (root) {
        root.innerHTML = '<div class="card"><h2>这个模块还在装</h2>' +
          '<p class="small muted">（' + id + '）——页面结构已就位，内容稍后接入。</p></div>';
      }
    });
  });

  /* 若数据加载失败，给出明确提示而不是白屏 */
  window.addEventListener('error', function (e) {
    if (window.console) console.error('[物理脚手架]', e.message);
  });

  PHYS.boot();
})();
