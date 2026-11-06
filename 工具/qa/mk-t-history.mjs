// 验证：历史套卷「重做 + 累计错次 + 错题本」
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '历史', '核心考点训练.html'), 'utf8');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[];
  function log(k,v,pass){ L.push((pass===undefined?'  ':(pass?'PASS ':'FAIL '))+k+' = '+v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function opts(){ return qa('#opts button'); }
  function disabledN(){ return opts().filter(function(b){ return b.disabled; }).length; }
  function submitClick(i){ opts()[i].click(); }
  function txt(sel){ var n=document.querySelector(sel); return n?n.textContent.replace(/\\s+/g,' ').trim():''; }

  (async function(){
    try{
      localStorage.clear();
      qa('button[data-mode="paper"]')[0].click();
      await wait(150);
      var id=S.paper.queue[S.paper.qi], q=PQ_BY(id);
      var wrongI = q.ans===0?1:0;
      log('初始 disabled', disabledN(), disabledN()===0);

      submitClick(wrongI); await wait(80);
      log('提交后判分显示', /答错了|答对了/.test(txt('#fb')), /答错了|答对了/.test(txt('#fb')));
      log('提交后 disabled', disabledN(), disabledN()===4);
      log('提交后有「重做本题」', /重做本题/.test(txt('#acts')), /重做本题/.test(txt('#acts')));

      /* 下一题再回来 */
      document.getElementById('nx').click(); await wait(80);
      document.getElementById('pv').click(); await wait(80);
      log('回访后 disabled', disabledN(), disabledN()===0);
      log('回访后无判分', txt('#fb')==='', txt('#fb')==='');
      log('回访后有重做提示条', /已作答/.test(txt('.pnote')), /已作答/.test(txt('.pnote')));
      log('提示条含上次选项', /上次选/.test(txt('.pnote')), /上次选/.test(txt('.pnote')));
      log('题头有累计错 1 次', /累计错 1 次/.test(txt('.meta')), /累计错 1 次/.test(txt('.meta')));

      /* 看上次 */
      document.getElementById('ppeek').click(); await wait(80);
      log('看上次后 disabled', disabledN(), disabledN()===4);
      log('看上次后有解析', /答案/.test(txt('#fb')), /答案/.test(txt('#fb')));

      /* 重做本题 → 空白 */
      document.getElementById('pagain2').click(); await wait(80);
      log('重做本题后 disabled', disabledN(), disabledN()===0);

      /* 再错一次 → 累计 2 */
      submitClick(wrongI); await wait(80);
      log('再错后累计错 2 次', /累计错 2 次/.test(txt('.meta')), /累计错 2 次/.test(txt('.meta')));
      var p=pState(id);
      log('P.wrong', p.wrong, p.wrong===2);

      /* 改对 → 仍在错题本 */
      submitClick === null;
      document.getElementById('pagain2').click(); await wait(60);
      submitClick(q.ans); await wait(80);
      log('改对后结果', txt('#fb').slice(0,12));
      log('改对后仍在错题本', wrongBookList().length, wrongBookList().length===1);

      /* 错题本视图 */
      document.getElementById('pwb').click(); await wait(100);
      var wb=txt('#stage');
      log('错题本条目', /第 /.test(wb)&&/累计错 2 次/.test(wb), /累计错 2 次/.test(wb));
      log('错题本有重做/我会了', /重做这题/.test(wb)&&/我会了/.test(wb), /重做这题/.test(wb)&&/我会了/.test(wb));

      /* 重做这题 → 空白 */
      qa('[data-redo]')[0].click(); await wait(100);
      log('从错题本重做后 disabled', disabledN(), disabledN()===0);

      /* 回错题本勾我会了 */
      document.getElementById('pwb').click(); await wait(100);
      qa('[data-clear]')[0].click(); await wait(100);
      log('清掉后错题本空', wrongBookList().length, wrongBookList().length===0);
      log('清掉后「只做错题」统计', pTally().weak, pTally().weak===0);

      /* 再错一次自动回来 */
      buildPaper(); S.paper.range='seq'; buildPaper(); render(); await wait(80);
      var id2=S.paper.queue[0];
      S.mode='paper'; render(); await wait(60);
      var q2=PQ_BY(id2);
      opts()[q2.ans===0?1:0].click(); await wait(80);
      log('清掉后再错自动回来', wrongBookList().length, wrongBookList().length===1);
    }catch(e){ log('EXCEPTION', e.message+' @ '+(e.stack||'').split('\\n')[1]); }
    var fails=L.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
    document.getElementById('probe').textContent='RESULT '+(fails?'FAIL '+fails:'ALL_PASS')+'\\n'+L.join('\\n');
    document.title=fails?'FAIL':'ALL_PASS';
  })();
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 't-history.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
