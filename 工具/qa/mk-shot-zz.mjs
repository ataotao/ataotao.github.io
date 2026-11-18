// 截图：道法 卡片题头（累计对/错）+ 清单行
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, '道德与法治', '核心考点训练.html'), 'utf8');

const mk = (body) => `<script>(function(){
  function w(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  (async function(){ try{ ${body} }catch(e){ document.title='ERR:'+e.message; } })();
})();<\/script>`;

// 场景1：答错一题（停在结果页），题头有累计
const s1 = mk(`
  localStorage.clear();
  qa('button[data-mode=choice]')[0].click(); await w(200);
  var id=S.queue[S.qi], right=PLAN[id].blanks[0][0];
  var b=qa('#opts button').filter(function(x){ return norm(x.dataset.o)!==norm(right); })[0];
  if(b) b.click(); await w(150);
`);

// 场景2：清单页（多行「对 X · 错 Y」）
const s2 = mk(`
  localStorage.clear();
  qa('button[data-mode=choice]')[0].click(); await w(150);
  for(var k=0;k<6;k++){
    var id=S.queue[S.qi], right=PLAN[id].blanks[0][0];
    var bts=qa('#opts button');
    var pick = k%3===0 ? bts.filter(function(x){return norm(x.dataset.o)===norm(right);})[0]
                       : bts.filter(function(x){return norm(x.dataset.o)!==norm(right);})[0];
    if(pick) pick.click();
    await w(80);
    var nx=document.getElementById('nx'); if(nx) nx.click(); await w(90);
  }
  qa('button[data-mode=list]')[0].click(); await w(250);
`);

writeFileSync(join(root, '_verify', 'shot-zz-1.html'), html.replace('</body>', s1 + '</body>'));
writeFileSync(join(root, '_verify', 'shot-zz-2.html'), html.replace('</body>', s2 + '</body>'));
console.log('written');
