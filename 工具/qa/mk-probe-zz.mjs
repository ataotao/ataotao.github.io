// 探针：道法（无套卷）的错题累计统计存在哪里、显示在哪里
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '道德与法治', '核心考点训练.html'), 'utf8');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[];
  function log(k,v){ L.push(k+' = '+v); }
  function w(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function stage(){ return document.getElementById('stage').textContent.replace(/\\s+/g,' '); }

  (async function(){
    try{
      localStorage.clear();
      qa('button[data-mode=choice]')[0].click(); await w(150);
      var id = S.queue[S.qi];
      /* 同一张卡连错 3 次：答错 → 下一题 → 上一题 → 再答错 */
      for(var k=0;k<3;k++){
        if(k>0){
          document.getElementById('nx').click(); await w(90);
          var pv=document.getElementById('pv'); if(pv&&!pv.disabled) pv.click(); await w(90);
        }
        var b=qa('#opts button');
        if(b.length) b[0].click();
        await w(90);
      }
      var p=getP(id);
      log('连错 3 次后的记录', JSON.stringify(p));
      log('wrong 是否累加', p && p.wrong, p && p.wrong>=3);
      log('回上一题是否空白', qa('#opts button').filter(function(b){return b.disabled;}).length===0);

      /* 清单里的「最该补的 10 张」 */
      qa('button[data-mode=list]')[0].click(); await w(250);
      var t=stage();
      log('清单出现「错 N 次」', /错 \\d+ 次/.test(t), /错 \\d+ 次/.test(t));
      var m=t.match(/最该补[^。]{0,120}/);
      log('清单片段', m?m[0].slice(0,90):'（没找到「最该补」区块）');
      log('题头/卡片是否显示累计错次(清单外)', '见上一行');

      /* ④错题强化：池子口径 */
      qa('button[data-mode=wrong]')[0].click(); await w(250);
      log('错题强化队列长度', S.queue.length, S.queue.length>=1);
      log('题干是否标「错 N 次」', /错 \\d+ 次/.test(stage()), /错 \\d+ 次/.test(stage()));

      /* 连续答对 2 次是否出库 */
      qa('button[data-mode=wrong]')[0].click(); await w(150);
      for(var j=0;j<2;j++){
        var ib=S.queue[S.qi];
        var right=(PLAN[ib]||{}).blanks ? PLAN[ib].blanks[0][0] : null;
        qa('#opts button').forEach(function(btn){ if(btn.dataset.o===right) btn.click(); });
        await w(120);
        var nx=document.getElementById('nx'); if(nx) nx.click(); await w(120);
      }
      log('后 wrong 计数（累计不清零）', getP(id) ? getP(id).wrong : 'null');
      log('后 streak', getP(id) ? getP(id).streak : 'null');
    }catch(e){ log('EXCEPTION', e.message); }
    document.getElementById('probe').textContent='PROBE\\n'+L.join('\\n');
  })();
})();
<\/script>
`;

writeFileSync(join(root, '_verify', 'probe-zz.html'), html.replace('</body>', TEST + '</body>'));
console.log('written');
