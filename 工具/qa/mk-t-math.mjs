// 验证数学：试卷错题本按题聚合的累计错次 + 重做入口
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '数学', '函数思维脚手架.html'), 'utf8');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[];
  function log(k,v,pass){ L.push((pass===undefined?'  ':(pass?'PASS ':'FAIL '))+k+' = '+v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }

  (async function(){
    try{
      localStorage.clear();
      var p = (window.PACKS && PACKS[0]) || (DB.packs && DB.packs[0]);
      if(!p){ log('题包','无'); throw new Error('no pack'); }
      var q0 = p.questions[0];
      log('测试题', p.id + ' / ' + q0.id + ' / ' + q0.type);
      var wrongI = 0, opts = q0.opts || [];
      for(var i=0;i<opts.length;i++){ if(i !== q0.ans){ wrongI = i; break; } }

      for(var k=0;k<2;k++){
        openPack(p.id); await wait(40);
        openPaperQ(0); await wait(40);
        if(q0.type === 'choice') paperPick(wrongI);
        else S.pq.ent = {0:'0'};
        paperSubmit(); await wait(60);
      }
      var hist = (DB.paper||[]).filter(function(r){ return r.pack===p.id && r.qid===q0.id; });
      log('历史作答条数', hist.length, hist.length===2);
      log('历史错误条数', hist.filter(function(r){ return r.ok===false; }).length, hist.filter(function(r){ return r.ok===false; }).length===2);

      S.screen = 'report'; render(); await wait(120);
      var home = document.getElementById('screen').textContent;
      log('首页有「累计错 2 次」', home.indexOf('累计错 2 次')>=0, home.indexOf('累计错 2 次')>=0);
      var redo = qa('[data-act=dueopen]')[0];
      log('错题本有「重做」按钮', !!redo, !!redo);
      if(redo){
        redo.click(); await wait(120);
        log('点重做后 screen', S.screen, S.screen==='paperq');
        log('重做后 phase/sel', S.pq.phase + '/' + S.pq.sel, S.pq.phase==='ask' && S.pq.sel===null);
        log('重做的是同一题', S.packId===p.id && S.pq.idx===0, S.packId===p.id && S.pq.idx===0);
      }
    }catch(e){ log('EXCEPTION', e.message+' @ '+(e.stack||'').split('\\n')[1]); }
    var fails=L.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
    document.getElementById('probe').textContent='RESULT '+(fails?'FAIL '+fails:'ALL_PASS')+'\\n'+L.join('\\n');
    document.title=fails?'FAIL':'ALL_PASS';
  })();
})();
<\/script>
`;

/* 题包数据在 数学/题库/packs/*.js（2026-11-14 起分片）；探针落在 _verify/，相对路径要改前缀 */
writeFileSync(join(root, '_verify', 't-math.html'),
  html.replace(/src="题库\/packs\//g, 'src="../数学/题库/packs/').replace('</body>', TEST + '</body>'));
console.log('written');
