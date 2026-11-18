// 冒烟：两科页面各模式渲染无报错；四选一作答后回访应为空白
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TEST = `
<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var L=[], errs=[];
  window.onerror=function(m,u,l){ errs.push(m+'@'+l); };
  function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  (async function(){
    try{
      var tabs=qa('button[data-mode]');
      L.push('模式数 = '+tabs.length);
      for(var i=0;i<tabs.length;i++){
        tabs[i].click(); await wait(120);
        var st=document.getElementById('stage');
        L.push(tabs[i].dataset.mode+' 渲染 '+(st&&st.innerHTML.length>200?'OK('+st.innerHTML.length+')':'空/过短'));
      }
      var ctab=qa('button[data-mode=choice]')[0];
      if(ctab){
        ctab.click(); await wait(120);
        var b=qa('#opts button');
        if(b.length){
          b[0].click(); await wait(90);
          L.push('四选一作答后 disabled = '+qa('#opts button').filter(function(x){return x.disabled;}).length);
          var nx=document.getElementById('nx'), pv=document.getElementById('pv');
          if(nx)nx.click(); await wait(90);
          if(pv&&!pv.disabled)pv.click(); await wait(120);
          L.push('回上一题 disabled = '+qa('#opts button').filter(function(x){return x.disabled;}).length);
        } else { L.push('四选一无选项'); }
      }
    }catch(e){ L.push('EXCEPTION '+e.message); }
    document.getElementById('probe').textContent='RESULT '+(errs.length?'JS_ERROR':'NO_JS_ERROR')+'\\n'+L.join('\\n')+(errs.length?'\\n'+errs.join('\\n'):'');
  })();
})();
<\/script>
`;

for (const [src, out] of [['道德与法治/核心考点训练.html', 'zz'], ['历史/核心考点训练.html', 'ls']]) {
  const html = readFileSync(join(root, src), 'utf8');
  writeFileSync(join(root, '_verify', 'smoke-' + out + '.html'), html.replace('</body>', TEST + '</body>'));
}
console.log('written');
