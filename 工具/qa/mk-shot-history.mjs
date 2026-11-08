// 截图：历史套卷回访态（提示条 + 累计错）+ 错题本
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '历史', '核心考点训练.html'), 'utf8');

const mk = (body) => `<script>(function(){
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  (async function(){ try{ ${body} }catch(e){ document.title='ERR'; } })();
})();<\/script>`;

const shot1 = mk(`
  localStorage.clear();
  qa('button[data-mode="paper"]')[0].click();
  await wait(150);
  var id=S.paper.queue[S.paper.qi], q=PQ_BY(id);
  qa('#opts button')[q.ans===0?1:0].click();
  await wait(120);
  document.getElementById('nx').click(); await wait(100);
  document.getElementById('pv').click(); await wait(150);
`);

const shot2 = mk(`
  localStorage.clear();
  qa('button[data-mode="paper"]')[0].click(); await wait(150);
  var id=S.paper.queue[S.paper.qi], q=PQ_BY(id);
  if(q.ans!==0){ qa('#opts button')[q.ans===0?1:0].click(); await wait(100); }
  else { qa('#opts button')[1].click(); await wait(100); }
  renderWrongBook(); await wait(120);
`);

writeFileSync(join(root, '_verify', 'shot-ls-1.html'), html.replace('</body>', shot1 + '</body>'));
writeFileSync(join(root, '_verify', 'shot-ls-2.html'), html.replace('</body>', shot2 + '</body>'));
console.log('written');
