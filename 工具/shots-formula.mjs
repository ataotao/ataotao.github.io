// 生成 公式记背/预览截图/*.png（用本机 Chrome 无头模式）
// 用法： node 工具/shots-formula.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmp = join(root, '_verify');
mkdirSync(tmp, { recursive: true });
const outDir = join(root, '公式记背', '预览截图');
mkdirSync(outDir, { recursive: true });

const html = readFileSync(join(root, '公式记背', '公式记背.html'), 'utf8');
const wrap = (code) => `\n<script>(function(){try{${code}}catch(e){document.title='ERR:'+e.message}})();<\/script>\n`;
const only = (id, mode) => `S.mode='${mode}';S.queue=['${id}'];S.qi=0;resetCardState();render();`;

const SHOTS = [
  ['1-背公式-正面', only('qe-02', 'recite'), 900, 620],
  ['2-背公式-看公式', only('qe-02', 'recite') + 'S.revealed=true;render();', 900, 900],
  ['3-填一填', only('qe-02', 'fill'), 900, 900],
  ['4-填一填-判错', only('qe-02', 'fill') + `
    S.fill=[1,1];S.active=1;
    (function(){var bl=CARD_BY('qe-02').cloze;rec('qe-02',false,'fill');S.scored=true;render();})();`, 900, 1150],
  ['5-认一认', only('cf-04', 'name'), 900, 760],
  ['6-例题-两种方法', only('cf-11', 'recite') + 'S.revealed=true;render();', 900, 1500],
  ['7-公式表-今日必背', `S.mode='list';S.qi=0;render();`, 900, 2000],
  ['9-公式表-章节', `S.mode='list';S.qi=0;render();
    setTimeout(function(){
      var t=document.querySelector('#todaybox'); if(t)t.style.display='none';
      var d=document.querySelectorAll('details.k');
      for(var i=0;i<2&&i<d.length;i++)d[i].open=true;
    },0);`, 900, 1300],
  ['10-公式表-遮住公式', `S.mode='list';S.qi=0;render();
    var d=document.querySelectorAll('details.k'); if(d[1])d[1].open=true;
    var cb=document.querySelector('#mask'); cb.checked=true; cb.dispatchEvent(new Event('change'));
    var tb=document.querySelector('#todaybox'); if(tb)tb.style.display='none';`, 900, 1200],
  ['8-手机-背公式', only('qe-13', 'recite') + 'S.revealed=true;render();', 500, 980],
];

let n = 0;
for (const [name, code, w, h] of SHOTS) {
  const src = join(tmp, `f-${name}.html`);
  writeFileSync(src, html.replace('</body>', wrap(code) + '</body>'), 'utf8');
  const out = join(outDir, name + '.png');
  if (existsSync(out)) rmSync(out);
  spawnSync(CHROME, ['--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1.5',
    `--window-size=${w},${h}`, `--screenshot=${out}`, `--user-data-dir=${join(tmp, 'fprof' + (n++))}`,
    pathToFileURL(src).href], { stdio: 'ignore' });
  let wait = 0;
  while (!existsSync(out) && wait++ < 150) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},100)']);
  console.log(`${existsSync(out) ? '✅' : '❌'} 公式记背/预览截图/${name}.png`);
}
