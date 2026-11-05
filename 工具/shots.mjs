// 生成 <科目>/预览截图/*.png（用本机 Chrome 无头模式）
// 用法： node 工具/shots.mjs 历史
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || '历史';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmp = join(root, '_verify');
mkdirSync(tmp, { recursive: true });
const outDir = join(root, target, '预览截图');
mkdirSync(outDir, { recursive: true });

const html = readFileSync(join(root, target, '核心考点训练.html'), 'utf8');
const wrap = (code, extra = '') => `\n<script>(function(){try{${code}}catch(e){document.title='ERR:'+e.message}})();<\/script>\n${extra}`;

const SHOTS = [
  ['1-翻卡背', ``, 900, 640],
  ['2-翻卡背-看答案', `S.revealed=true;render();`, 900, 780],
  ['3-填空闯', `document.querySelector('[data-mode="cloze"]').click();`, 900, 700],
  ['4-填空闯-判错', `document.querySelector('[data-mode="cloze"]').click();
    var ins=[].slice.call(document.querySelectorAll('.bi'));
    ins.forEach(function(x,i){ if(i===0) x.value='写错的答案'; });
    document.querySelector('#sub').click();`, 900, 760],
  ['5-四选一', `document.querySelector('[data-mode="choice"]').click();
    var t=DATA.cards.find(function(c){return PLAN[c.id].blanks.some(function(a){return norm(a[0]).length>=6})});
    S.queue=[t.id];S.qi=0;S.choice=null;render();
    setTimeout(function(){var b=document.querySelectorAll('#opts button');if(b[1])b[1].click();},0);`, 900, 640],
  ['6-清单速览', `document.querySelector('[data-mode="list"]').click();
    var cb=document.querySelector('#hide'); if(cb){cb.checked=true;cb.dispatchEvent(new Event('change'));}
    setTimeout(function(){var d=document.querySelectorAll('details.k');for(var i=0;i<2&&i<d.length;i++)d[i].open=true;},0);`, 900, 1500],
];

/* 有套卷的科目多截几张 ⑥ 套卷（多卷结构 "papers":[...] / 旧的单卷 "paper":{...}） */
if (/"papers":\[/.test(html) || /"paper":\{"id"/.test(html)) {  SHOTS.push(
    ['7-套卷', `document.querySelector('[data-mode="paper"]').click();`, 900, 780],
    ['8-套卷-答错看解析', `document.querySelector('[data-mode="paper"]').click();
      var q=PQ_BY(S.paper.queue[0]);
      document.querySelectorAll('#opts button')[(q.ans+1)%4].click();`, 900, 1200],
    ['9-套卷-配图题', `document.querySelector('[data-mode="paper"]').click();
      var q=PQ.filter(function(x){return x.blocks.some(function(b){return b.t==='img'})})[0];
      if(q){S.paper.queue=[q.id];S.paper.qi=0;S.paper.log={};render();}`, 900, 1100],
    ['10-套卷-题表', `document.querySelector('[data-mode="paper"]').click();
      var q=PQ.filter(function(x){return x.blocks.some(function(b){return b.t==='tbl'})})[0];
      if(q){S.paper.queue=[q.id];S.paper.qi=0;S.paper.log={};render();}`, 900, 900],
    ['11-套卷-结算页', `document.querySelector('[data-mode="paper"]').click();
      var qs=PQ.filter(function(q){return q.kind!=='sub'}).slice(0,4);
      S.paper.queue=qs.map(function(q){return q.id});S.paper.qi=0;S.paper.log={};render();
      for(var i=0;i<qs.length;i++){
        var b=document.querySelectorAll('#opts button');
        b[i===1?(qs[i].ans+1)%4:qs[i].ans].click();
        document.querySelector('#pnx').click();
      }`, 900, 700],
    ['12-套卷-主观题', `document.querySelector('[data-mode="paper"]').click();
      var q=PQ.filter(function(x){return x.kind==='sub'})[0];
      if(q){S.paper.queue=[q.id];S.paper.qi=0;S.paper.log={};S.paper.echo=null;render();}`, 900, 1500],
    ['13-套卷-主观题-对照答案', `document.querySelector('[data-mode="paper"]').click();
      var q=PQ.filter(function(x){return x.kind==='sub'})[0];
      if(q){S.paper.queue=[q.id];S.paper.qi=0;S.paper.log={};S.paper.echo=q.id;recSub(q);render();
        var cbs=document.querySelectorAll('[data-pt]'); if(cbs[0])cbs[0].click();}`, 900, 1700],
  );
}

/* 清单里按单元筛选（两个下拉框在清单里也生效） */
SHOTS.push(['14-清单-按单元筛选', `document.querySelector('[data-mode="list"]').click();
  var us=[...new Set(DATA.cards.map(function(c){return c.unit}))];
  var fu=document.querySelector('#fu'); fu.value=us[1]||'全部';
  fu.dispatchEvent(new Event('change'));
  var fs=document.querySelector('#fs'); fs.value='star'; fs.dispatchEvent(new Event('change'));`, 900, 900]);

let n = 0;
for (const [name, code, w, h] of SHOTS) {
  // 临时页面放在科目目录里，相对路径（images/…）才找得到图
  const src = join(root, target, `_shot-tmp-${n}.html`);
  writeFileSync(src, html.replace('</body>', wrap(code) + '</body>'), 'utf8');
  const out = join(outDir, name + '.png');
  if (existsSync(out)) rmSync(out);
  spawnSync(CHROME, ['--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--window-size=${w},${h}`, `--screenshot=${out}`, `--user-data-dir=${join(tmp, 'shotprof' + (n++))}`,
    pathToFileURL(src).href], { stdio: 'ignore' });
  let wait = 0;
  while (!existsSync(out) && wait++ < 150) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},100)']);
  rmSync(src, { force: true });
  console.log(`${existsSync(out) ? '✅' : '❌'} ${target}/预览截图/${name}.png`);
}
