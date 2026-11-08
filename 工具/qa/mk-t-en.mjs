// 验证英语：当场重做按钮 + 累计错次 + 错题本保留/手动清
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '英语', '九上英语过关练习.html'), 'utf8');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[];
  function log(k,v,pass){ L.push((pass===undefined?'  ':(pass?'PASS ':'FAIL '))+k+' = '+v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function tab(v){ document.querySelector('.tab[data-view="'+v+'"]').click(); }
  function st(){ try{ return JSON.parse(localStorage.getItem('eng9a-practice-v1')||'{}'); }catch(e){ return {}; } }
  function mtxt(){ return document.getElementById('view-mistakes').textContent.replace(/\\s+/g,' '); }

  (async function(){
    try{
      localStorage.clear();
      tab('practice'); await wait(120);
      var q = qa('#view-practice .q').filter(function(n){ return !n.querySelector('.opt[disabled]'); })[0];
      var id=q.dataset.id;
      q.querySelectorAll('.opt')[0].click(); await wait(90);
      var n=document.getElementById('q-'+id);
      log('答完当场有「重做本题」', /重做本题/.test(n.textContent), /重做本题/.test(n.textContent));
      log('答完 disabled', n.querySelectorAll('.opt[disabled]').length, n.querySelectorAll('.opt[disabled]').length===4);
      var rightK=n.querySelector('.opt[data-state=right]').dataset.k;
      var firstWrong = (st().stat[id]||{}).wrong||0;

      /* 重做并答对 */
      n.querySelector('[data-act=again]').click(); await wait(80);
      var n2=document.getElementById('q-'+id);
      log('重做后 disabled', n2.querySelectorAll('.opt[disabled]').length, n2.querySelectorAll('.opt[disabled]').length===0);
      log('重做后解析收起', document.getElementById('verify-'+id).style.display, document.getElementById('verify-'+id).style.display==='none');
      log('重做后仍有「重做本题」按钮?（应为已答才显示）', /重做本题/.test(n2.textContent), !/重做本题/.test(n2.textContent));
      n2.querySelector('.opt[data-k="'+rightK+'"]').click(); await wait(90);
      var s2=st();
      log('累计错次保留', (s2.stat[id]||{}).wrong, firstWrong>=0 && (s2.stat[id]||{}).wrong>=1);
      var wn=(s2.stat[id]||{}).wrong||0;
      log('题号旁显示「错 '+wn+' 次」', document.getElementById('q-'+id).textContent.indexOf('错 '+wn+' 次')>=0, document.getElementById('q-'+id).textContent.indexOf('错 '+wn+' 次')>=0);

      /* 错题本：改对后仍在，带累计错次 */
      tab('mistakes'); await wait(120);
      var t1=mtxt();
      log('改对后仍在错题本', /累计错 \\d+ 次/.test(t1), /累计错 \\d+ 次/.test(t1));
      log('错题本有「我会了」', /我会了/.test(t1), /我会了/.test(t1));
      var cnt0=qa('#view-mistakes .mcard').length;

      /* 清掉 */
      var clearBtn=qa('#view-mistakes [data-clear]')[0];
      clearBtn.click(); await wait(120);
      var cnt1=qa('#view-mistakes .mcard').length;
      log('清掉后条目减少', cnt0+'→'+cnt1, cnt1===cnt0-1);
      log('清掉后 store.cleared 有记录', Object.keys(st().cleared||{}).length>=1, Object.keys(st().cleared||{}).length>=1);

      /* 再错一次自动回来 */
      tab('practice'); await wait(120);
      var q2=document.getElementById('q-'+id);
      var again=q2.querySelector('[data-act=again]');
      if(again){ again.click(); await wait(80); }
      var q3=document.getElementById('q-'+id);
      var wrongK=qa('#q-'+id+' .opt').filter(function(b){ return b.dataset.k!==q3.querySelector('.opt[data-state=right]') || true; })[0].dataset.k;
      log('清掉后再重做，当前 disabled', q3.querySelectorAll('.opt[disabled]').length, q3.querySelectorAll('.opt[disabled]').length===0);
      if(q3.querySelector('.opt[data-k="'+rightK+'"]')) {
        var wrongOpt=qa('#q-'+id+' .opt').filter(function(b){ return b.dataset.k!==rightK; })[0];
        wrongOpt.click(); await wait(90);
        log('再答错后 cleared 被撤销', !st().cleared[id], !st().cleared[id]);
        tab('mistakes'); await wait(120);
        log('自动回到错题本', /累计错 \\d+ 次/.test(mtxt()), /累计错 \\d+ 次/.test(mtxt()));
      }
    }catch(e){ log('EXCEPTION', e.message+' @ '+(e.stack||'').split('\\n')[1]); }
    var fails=L.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
    document.getElementById('probe').textContent='RESULT '+(fails?'FAIL '+fails:'ALL_PASS')+'\\n'+L.join('\\n');
    document.title=fails?'FAIL':'ALL_PASS';
  })();
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 't-en.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
