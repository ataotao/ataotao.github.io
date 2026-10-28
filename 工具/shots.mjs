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

let n = 0;
for (const [name, code, w, h] of SHOTS) {
  const src = join(tmp, `s-${target}-${name}.html`);
  writeFileSync(src, html.replace('</body>', wrap(code) + '</body>'), 'utf8');
  const out = join(outDir, name + '.png');
  if (existsSync(out)) rmSync(out);
  spawnSync(CHROME, ['--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--window-size=${w},${h}`, `--screenshot=${out}`, `--user-data-dir=${join(tmp, 'shotprof' + (n++))}`,
    pathToFileURL(src).href], { stdio: 'ignore' });
  let wait = 0;
  while (!existsSync(out) && wait++ < 150) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},100)']);
  console.log(`${existsSync(out) ? '✅' : '❌'} ${target}/预览截图/${name}.png`);
}
