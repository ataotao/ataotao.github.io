// 截图：历史 ④错题强化（只有试卷错题时）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '历史', '核心考点训练.html'), 'utf8');

const body = `
  localStorage.clear();
  qa('button[data-mode=paper]')[0].click(); await w(180);
  var pid=S.paper.queue[S.paper.qi], pq=PQ_BY(pid);
  qa('#opts button')[pq.ans===0?1:0].click(); await w(120);
  document.getElementById('nx').click(); await w(100);
  var p2=PQ_BY(S.paper.queue[S.paper.qi]);
  qa('#opts button')[p2.ans===0?2:0].click(); await w(120);
  qa('button[data-mode=wrong]')[0].click(); await w(280);
`;

const test = `<script>(function(){
  function w(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  (async function(){ try{ ${body} }catch(e){ document.title='ERR:'+e.message; } })();
})();<\/script>`;

writeFileSync(join(root, '_verify', 'shot-ls-3.html'), html.replace('</body>', test + '</body>'));
console.log('written');
