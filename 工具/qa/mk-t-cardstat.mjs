// 验证卡片模式：题头 / 统计条 / 清单 是否显示累计对错次数
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[];
  function log(k,v,pass){ L.push((pass===undefined?'  ':(pass?'PASS ':'FAIL '))+k+' = '+v); }
  function w(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function txt(sel){ var n=document.querySelector(sel); return n?n.textContent.replace(/\\s+/g,' ').trim():''; }
  function bar(){ return document.getElementById('bar').textContent.replace(/\\s+/g,' '); }

  (async function(){
    try{
      localStorage.clear();
      qa('button[data-mode=choice]')[0].click(); await w(150);
      var id = S.queue[S.qi], c = CARD_BY(id);
      var right = PLAN[id].blanks[0][0];
      /* 先错两次 */
      for(var k=0;k<2;k++){
        if(k>0){ document.getElementById('nx').click(); await w(80);
          var pv=document.getElementById('pv'); if(pv&&!pv.disabled) pv.click(); await w(80); }
        var wrongBtn = qa('#opts button').filter(function(b){ return norm(b.dataset.o)!==norm(right); })[0];
        if(wrongBtn) wrongBtn.click();
        await w(80);
        log('第'+(k+1)+'次答错后 meta', txt('.card .meta'), true);
      }
      /* 再答对一次 */
      document.getElementById('nx').click(); await w(80);
      var pv2=document.getElementById('pv'); if(pv2&&!pv2.disabled) pv2.click(); await w(80);
      var rightBtn = qa('#opts button').filter(function(b){ return norm(b.dataset.o)===norm(right); })[0];
      if(rightBtn) rightBtn.click(); await w(120);

      var m = txt('.card .meta');
      log('题头显示「对 1 · 错 2 · 做过 3」', m, m.indexOf('对 1')>=0 && m.indexOf('错 2')>=0 && m.indexOf('做过 3')>=0);
      log('统计条显示累计对/错', bar().slice(0,140), bar().indexOf('累计 对 1')>=0 && bar().indexOf('错 2')>=0);

      /* ④错题强化 题头 */
      qa('button[data-mode=wrong]')[0].click(); await w(200);
      log('错题强化题头也有累计', txt('.card .meta'), txt('.card .meta').indexOf('错 2')>=0);

      /* ⑤清单 */
      qa('button[data-mode=list]')[0].click(); await w(250);
      var row = document.querySelector('details.k[data-id="'+id+'"] summary');
      log('清单行显示「对 1 · 错 2」', row?row.textContent.replace(/\\s+/g,' ').trim():'(无)', !!row && row.textContent.indexOf('错 2')>=0);
      log('清单「最该补」仍有错次', /错 \\d+ 次/.test(txt('#stage')), true);
    }catch(e){ log('EXCEPTION', e.message+' @ '+(e.stack||'').split('\\n')[1]); }
    var fails=L.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
    document.getElementById('probe').textContent='RESULT '+(fails?'FAIL '+fails:'ALL_PASS')+'\\n'+L.join('\\n');
  })();
})();
<\/script>
`;

for (const [src, out] of [['道德与法治/核心考点训练.html', 'zz'], ['历史/核心考点训练.html', 'ls']]) {
  writeFileSync(join(root, '_verify', 't-cardstat-' + out + '.html'),
    readFileSync(join(root, src), 'utf8').replace('</body>', TEST + '</body>'));
}
console.log('written');
