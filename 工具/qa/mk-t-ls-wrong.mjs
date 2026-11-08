// 验证：历史 ④错题强化 里能看到试卷错题并直接回炉
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
  function w(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function stage(){ return document.getElementById('stage').textContent.replace(/\\s+/g,' ').trim(); }
  function tab(m){ qa('button[data-mode="'+m+'"]')[0].click(); }

  (async function(){
    try{
      localStorage.clear();
      /* 1) 套卷答错一题 */
      tab('paper'); await w(150);
      var pid = S.paper.queue[S.paper.qi], pq = PQ_BY(pid);
      qa('#opts button')[pq.ans===0?1:0].click(); await w(100);
      log('套卷错题数', wrongBookList().length, wrongBookList().length===1);

      /* 2) 进 ④ 错题强化（此时卡片错题为 0） */
      tab('wrong'); await w(220);
      var t=stage();
      log('④ 出现「试卷错题（1 道）」', /试卷错题（1 道）/.test(t), /试卷错题（1 道）/.test(t));
      log('④ 空态提示提到试卷错题', /下面还有 1 道/.test(t), /下面还有 1 道/.test(t));
      log('④ 有「回炉这题」按钮', qa('[data-pwredo]').length, qa('[data-pwredo]').length>=1);
      log('④ 有「累计错 1 次」', /累计错 1 次/.test(t), /累计错 1 次/.test(t));

      /* 3) 点回炉 → 进套卷那一题，空白 */
      qa('[data-pwredo]')[0].click(); await w(200);
      log('点回炉后 mode/range', S.mode+'/'+S.paper.range, S.mode==='paper');
      log('落在同一题', PQ_BY(S.paper.queue[S.paper.qi]).id===pid, PQ_BY(S.paper.queue[S.paper.qi]).id===pid);
      log('回炉进来是空白', qa('#opts button').filter(function(b){return b.disabled;}).length, qa('#opts button').filter(function(b){return b.disabled;}).length===0);

      /* 4) 卡片也错一张后，④ 两栏都在 */
      localStorage.setItem('engNoop','1');
      tab('choice'); await w(200);
      var cid=S.queue[S.qi], right=PLAN[cid].blanks[0][0];
      var wb=qa('#opts button').filter(function(b){ return norm(b.dataset.o)!==norm(right); })[0];
      if(wb){ wb.click(); await w(120); }
      tab('wrong'); await w(250);
      var t2=stage();
      log('④ 同时：卡片题在（翻卡背样式）', !!document.querySelector('#stage .card .q'), !!document.querySelector('#stage .card .q'));
      log('④ 同时：试卷错题块在', /试卷错题（1 道）/.test(t2), /试卷错题（1 道）/.test(t2));
      log('④ 队列长度', S.queue.length, S.queue.length>0);

      /* 5) 打开套卷错题本 */
      var all=qa('[data-pwall]')[0];
      log('有「打开套卷错题本」', !!all, !!all);
      if(all){ all.click(); await w(200); log('错题本视图', /套卷错题本/.test(stage()), /套卷错题本/.test(stage())); }
    }catch(e){ log('EXCEPTION', e.message+' @ '+(e.stack||'').split('\\n')[1]); }
    var fails=L.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
    document.getElementById('probe').textContent='RESULT '+(fails?'FAIL '+fails:'ALL_PASS')+'\\n'+L.join('\\n');
  })();
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 't-ls-wrong.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
