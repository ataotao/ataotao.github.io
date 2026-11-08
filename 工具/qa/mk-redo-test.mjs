// 生成注入式自测页：验证「试卷练习」重做与累计错次
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, '物理', '物理思维脚手架.html');
const html = readFileSync(src, 'utf8');

const TEST = `
<div id="testout" style="white-space:pre;font:12px monospace"></div>
<script>
(function(){
  var L = [];
  function log(k, v, pass){ L.push((pass === undefined ? '  ' : (pass ? 'PASS ' : 'FAIL ')) + k + ' = ' + v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function q1(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function submit(){ var b = qa('.ex-btns button').filter(function(x){ return /提交本题/.test(x.textContent); })[0]; if(!b) throw new Error('no submit btn'); b.click(); }
  function optBtn(i){ return qa('.opts .opt')[i]; }
  function headText(){ return qa('.qhead .tag, .qhead .pill').map(function(x){ return x.textContent; }).join(' | '); }
  function fbText(){ return q1('.ex-feedback') ? q1('.ex-feedback').textContent.replace(/\\s+/g,' ').trim() : ''; }

  var pack = (PHYS.DATA.packs || []).filter(function(p){
    return (p.questions||[]).some(function(x){ return x.type === 'choice' && !x.selfCheck && x.type !== 'selfcheck'; });
  })[0];
  var q = pack.questions.filter(function(x){ return x.type === 'choice' && !x.selfCheck; })[0];
  var ansIdx = Array.isArray(q.ans) ? q.ans[0] : q.ans;
  var wrongIdx = ansIdx === 0 ? 1 : 0;
  var key = 'exam.' + pack.id + '.' + q.id;
  var wkey = 'wrong.e:' + pack.id + ':' + q.id;

  (async function(){
    try {
      PHYS.store.clear();
      location.hash = '#/exam/' + encodeURIComponent(pack.id) + '?q=' + encodeURIComponent(q.id);
      await wait(120);
      log('题包/题目', pack.id + ' / ' + q.id);
      log('首次进入无选中项', qa('.opt.sel').length, qa('.opt.sel').length === 0);
      log('首次进入无反馈', fbText() === '', fbText() === '');

      /* 第一次：选错并提交 */
      optBtn(wrongIdx).click();
      await wait(20);
      submit();
      await wait(60);
      var r1 = PHYS.store.get(key, null);
      log('错一次 wrongN', r1 && r1.wrongN, r1 && r1.wrongN === 1);
      log('错一次 ok=false', r1 && r1.ok, r1 && r1.ok === false);
      log('进错题本', !!PHYS.store.get(wkey, null), !!PHYS.store.get(wkey, null));
      log('提交后回显判分', /没对上/.test(fbText()), /没对上/.test(fbText()));
      log('提交后选项已标记', qa('.opt.no, .opt.ok').length > 0, qa('.opt.no, .opt.ok').length > 0);

      /* 离开再回来：不应带着上次的选中状态 */
      location.hash = '#/exam';
      await wait(100);
      location.hash = '#/exam/' + encodeURIComponent(pack.id) + '?q=' + encodeURIComponent(q.id);
      await wait(120);
      log('再进来无选中项', qa('.opt.sel').length, qa('.opt.sel').length === 0);
      log('再进来无判分标记', qa('.opt.ok, .opt.no').length, qa('.opt.ok, .opt.no').length === 0);
      log('再进来解析默认收起', fbText() === '', fbText() === '');
      log('题头显示累计错 1 次', headText(), /累计错 1 次/.test(headText()));
      log('提示条提示重做', (q1('.ex-redo') ? q1('.ex-redo').textContent : ''), /重做/.test(q1('.ex-redo') ? q1('.ex-redo').textContent : ''));

      /* 第二次：不看提示改对 */
      optBtn(ansIdx).click();
      await wait(20);
      submit();
      await wait(60);
      var r2 = PHYS.store.get(key, null);
      log('改对后 ok', r2 && r2.ok, r2 && r2.ok === true);
      log('改对后 wrongN 仍为 1', r2 && r2.wrongN, r2 && r2.wrongN === 1);
      log('改对后 okN', r2 && r2.okN, r2 && r2.okN === 1);
      log('改对后仍在错题本', !!PHYS.store.get(wkey, null), !!PHYS.store.get(wkey, null));
      log('改对后提示仍留错题本', /留在错题本/.test(fbText()), /留在错题本/.test(fbText()));

      /* 第三次：再错，累计变 2 */
      PHYS.route.reload();
      await wait(60);
      optBtn(ansIdx).click();   /* 先清掉上次选中 */
      await wait(10);
      optBtn(wrongIdx).click();
      await wait(10);
      submit();
      await wait(60);
      var r3 = PHYS.store.get(key, null);
      log('再错一次 wrongN', r3 && r3.wrongN, r3 && r3.wrongN === 2);
      log('累计错写进错题本 n', PHYS.store.get(wkey + '.n', null), PHYS.store.get(wkey + '.n', null) === 2);

      /* 错题页展示 */
      location.hash = '#/wrong';
      await wait(120);
      var wt = document.body.textContent.replace(/\\s+/g,' ');
      log('错题页有累计错次数', /累计错 2 次/.test(wt), /累计错 2 次/.test(wt));

      /* 填空题（若有）：回访时输入框应为空 */
      var p2 = (PHYS.DATA.packs || []).filter(function(p){
        return (p.questions||[]).some(function(x){ return x.fields && x.fields.length && x.type !== 'choice' && !x.selfCheck && x.type !== 'selfcheck'; });
      })[0];
      if (p2) {
        var q2 = p2.questions.filter(function(x){ return x.fields && x.fields.length && x.type !== 'choice' && !x.selfCheck && x.type !== 'selfcheck'; })[0];
        location.hash = '#/exam/' + encodeURIComponent(p2.id) + '?q=' + encodeURIComponent(q2.id);
        await wait(120);
        var ins = qa('.ex-area input');
        if (ins.length) {
          ins.forEach(function(x){ x.value = '9.99'; });
          await wait(10);
          submit();
          await wait(60);
          location.hash = '#/exam';
          await wait(90);
          location.hash = '#/exam/' + encodeURIComponent(p2.id) + '?q=' + encodeURIComponent(q2.id);
          await wait(120);
          var vals = qa('.ex-area input').map(function(x){ return x.value; }).filter(Boolean);
          log('填空回访为空(' + q2.id + ')', JSON.stringify(vals), vals.length === 0);
        } else { log('填空题目无输入框，跳过', q2.id); }
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

writeFileSync(join(root, '_verify', 'exam-redo-test.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
