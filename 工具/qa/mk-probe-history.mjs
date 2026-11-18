// 探针：确认「历史/核心考点训练」套卷模式是否存在"回访仍锁定、无法重做"
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
  function log(k,v){ L.push(k+' = '+v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  (function(){
    var tab = qa('button[data-mode="paper"]')[0];
    if(!tab){ log('套卷入口','无'); finish(); return; }
    tab.click();
    setTimeout(async function(){
      try{
        var opts = qa('#opts button');
        log('选项数', opts.length);
        var q = PQ_BY(S.paper.queue[S.paper.qi]);
        var wrong = q ? (q.ans === 0 ? 1 : 0) : 0;
        opts[wrong].click();
        await wait(60);
        var done1 = qa('#opts button').filter(function(b){ return b.disabled; }).length;
        log('答题后 disabled 数', done1);
        log('答题后解析区有内容', (document.querySelector('#fb')||{textContent:''}).textContent.slice(0,30));

        /* 下一题再回来 */
        var nx = document.getElementById('nx'); if(nx) nx.click();
        await wait(60);
        var pv = document.getElementById('pv'); if(pv) pv.click();
        await wait(60);
        log('回上一题 disabled 数', qa('#opts button').filter(function(b){ return b.disabled; }).length);
        log('回上一题仍显示答案', /正确答案/.test((document.getElementById('fb')||{textContent:''}).textContent));
        log('回上一题有无「重做」按钮', qa('button').filter(function(b){ return /重做/.test(b.textContent); }).length);

        /* 切到「只做错题」范围看这题是否还能重做 */
        var sel = document.getElementById('pr');
        if(sel){ sel.value='weak'; sel.dispatchEvent(new Event('change')); await wait(80); }
        log('只做错题队列长度', S.paper.queue.length);
        if(S.paper.queue.length){
          S.paper.qi=0; render(); await wait(60);
          log('错题模式下 disabled 数', qa('#opts button').filter(function(b){ return b.disabled; }).length);
        }
        log('套卷统计条文案', (document.getElementById('bar')||{textContent:''}).textContent.replace(/\\s+/g,' ').slice(0,120));
        log('该题累计错次(P.wrong)', (function(){ var p=pState(q.id); return p? p.wrong+' / ok '+p.ok+' / streak '+p.streak : 'null'; })());
        log('错题池判定(wrong>0 && streak<2)', (function(){ var p=pState(q.id); return p && p.wrong>0 && p.streak<2; })());
      }catch(e){ log('EXCEPTION', e.message); }
      finish();
    }, 200);
  })();
  function finish(){
    document.getElementById('probe').textContent = 'PROBE\\n' + L.join('\\n');
    document.title = 'PROBE_DONE';
  }
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 'probe-history-paper.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
