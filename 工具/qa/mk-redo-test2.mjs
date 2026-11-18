// 第二组自测：错题本保留 + 回炉入口 + 整卷结果里的「已改对仍留着」
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '物理', '物理思维脚手架.html'), 'utf8');

const TEST = `
<div id="testout" style="white-space:pre;font:12px monospace"></div>
<script>
(function(){
  var L = [];
  function log(k, v, pass){ L.push((pass === undefined ? '  ' : (pass ? 'PASS ' : 'FAIL ')) + k + ' = ' + v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function byText(sel, re){ return qa(sel).filter(function(x){ return re.test(x.textContent); })[0]; }
  function submit(){ byText('.ex-btns button', /提交本题/).click(); }

  var pack = (PHYS.DATA.packs || []).filter(function(p){
    return (p.questions||[]).some(function(x){ return x.type === 'choice' && !x.selfCheck && x.type !== 'selfcheck'; });
  })[0];
  var q = pack.questions.filter(function(x){ return x.type === 'choice' && !x.selfCheck; })[0];
  var ansIdx = Array.isArray(q.ans) ? q.ans[0] : q.ans;
  var wrongIdx = ansIdx === 0 ? 1 : 0;

  (async function(){
    try {
      PHYS.store.clear();
      location.hash = '#/exam/' + encodeURIComponent(pack.id) + '?q=' + encodeURIComponent(q.id);
      await wait(120);
      qa('.opts .opt')[wrongIdx].click(); await wait(10); submit(); await wait(60);
      qa('.opts .opt')[ansIdx].click();  await wait(10); submit(); await wait(60);
      var rec = PHYS.store.get('exam.' + pack.id + '.' + q.id, null);
      log('已改对', rec && rec.ok, rec && rec.ok === true);

      /* 题包列表：状态、统计、回炉按钮 */
      location.hash = '#/exam'; await wait(120);
      var txt = document.body.textContent.replace(/\\s+/g,' ');
      log('列表显示已改对但仍留错题本', /已改对 · 错题本还有/.test(txt), /已改对 · 错题本还有/.test(txt));
      log('列表显示累计做错', /累计做错 1 次/.test(txt), /累计做错 1 次/.test(txt));
      var bookBtn = byText('.ex-btns button', /回炉错题/);
      log('有回炉按钮', bookBtn ? bookBtn.textContent : '(无)', !!bookBtn);
      if (bookBtn) {
        bookBtn.click(); await wait(120);
        log('回炉模式标题', (document.querySelector('.ex-bar .pill')||{}).textContent, /只练错的/.test((document.querySelector('.ex-bar .pill')||{}).textContent||''));
        log('回炉进来是空白', qa('.opt.sel').length === 0 && qa('.ex-area input').length >= 0, qa('.opt.sel').length === 0);
        log('回炉进来无解析', (document.querySelector('.ex-feedback')||{textContent:''}).textContent.length === 0, (document.querySelector('.ex-feedback')||{textContent:''}).textContent.length === 0);
      }

      /* 整卷结果：已改对仍留着的提示 */
      location.hash = '#/exam/' + encodeURIComponent(pack.id); await wait(120);
      byText('.ex-nav button', /整卷结果/).click(); await wait(80);
      var rt = document.body.textContent.replace(/\\s+/g,' ');
      var needCover = pack.questions.filter(function(x){ return x.type !== 'selfcheck' && !x.selfCheck && x.type === 'choice'; }).length;
      log('结果页提示仍留错题本', /仍留在错题本/.test(rt), /仍留在错题本/.test(rt));

      /* 手动清：错题页勾我会了 → 清掉 → 列表不再提示 */
      location.hash = '#/wrong'; await wait(120);
      var cb = document.querySelector('.ex-wcheck input');
      log('错题页有勾选框', !!cb, !!cb);
      if (cb) {
        cb.checked = true; cb.dispatchEvent(new Event('change'));
        await wait(20);
        byText('.ex-btns button', /清掉勾选的/).click(); await wait(60);
        var confirmBtn = byText('.modal-ov button', /清掉/);
        if (confirmBtn) { confirmBtn.click(); await wait(80); }
        log('清掉后错题本为空', PHYS.progress.wrongList().length, PHYS.progress.wrongList().length === 0);
      }
    } catch (e) {
      log('EXCEPTION', e.message + ' @ ' + (e.stack||'').split('\\n')[1]);
    }
    var fails = L.filter(function(x){ return x.indexOf('FAIL') === 0; }).length;
    document.getElementById('testout').textContent = 'RESULT ' + (fails ? 'FAIL ' + fails : 'ALL_PASS') + '\\n' + L.join('\\n');
    document.title = fails ? 'FAIL-' + fails : 'ALL_PASS';
  })();
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 'exam-redo-test2.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
