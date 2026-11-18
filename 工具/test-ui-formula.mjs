// 公式记背 · 界面自检（用本机 Chrome 无头模式真点一遍）
// 用法： node 工具/test-ui-formula.mjs
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmp = join(root, '_verify');
mkdirSync(tmp, { recursive: true });

const html = readFileSync(join(root, '公式记背', '公式记背.html'), 'utf8');

const CODE = String.raw`
var LOG=[],N=0;
/* 每次从空白记录开始，避免浏览器缓存里的旧记录影响断言 */
try{localStorage.clear()}catch(e){}
P=loadProg();
function A(c,m){N++;if(!c)LOG.push('✗ '+m);}
function TXT(sel){var e=document.querySelector(sel);return e?e.textContent:'';}
function pick(k){ // 点第 k 空"正确"选项
  var bl=CARD_BY(S.queue[S.qi]).cloze, i=S.optOrder[k].indexOf(bl.blanks[k].ok);
  document.querySelectorAll('#opts button')[i].click();
}
function pickWrong(k){
  var bl=CARD_BY(S.queue[S.qi]).cloze, i=S.optOrder[k].findIndex(function(x){return x!==bl.blanks[k].ok;});
  document.querySelectorAll('#opts button')[i].click();
}
function go(mode,id){S.mode=mode;S.queue=[id];S.qi=0;resetCardState();render();}

/* ---------- ① 背公式 ---------- */
go('recite','qe-02');
A(!!document.querySelector('#show'),'背公式：没有「看公式」按钮');
A(!document.querySelector('.fx'),'背公式：没点就已显示公式');
document.querySelector('#show').click();
A(!!document.querySelector('.fx'),'背公式：点了没显示公式');
A(document.querySelector('.fx').innerHTML.indexOf('class="fr"')>0,'背公式：求根公式没画成分数');
document.querySelector('[data-v="1"]').click();
A((P.cards['qe-02']||{}).ok===1,'背公式：自评「写对了」没记上');
A(P.cards['qe-02'].streak===1,'背公式：连续计数没加');

/* ---------- ② 填一填（全对） ---------- */
go('fill','qe-03');
A(document.querySelectorAll('.slot').length===1,'填一填：空位数量不对');
A(document.querySelectorAll('#opts button').length===4,'填一填：选项不是 4 个');
pick(0);
A(!!document.querySelector('#sub'),'填一填：填完没出现提交按钮');
document.querySelector('#sub').click();
A(!!document.querySelector('.verdict.ok'),'填一填：全对没给「全对」');
A((P.cards['qe-03']||{}).ok===1,'填一填：全对没记对');

/* ---------- ② 填一填（判错 + 正确写法提示） ---------- */
go('fill','qe-02');
pickWrong(0);pick(1);
document.querySelector('#sub').click();
A(!!document.querySelector('.verdict.bad'),'填一填：错判成对了');
A(TXT('.fixlist').indexOf('第 1 空应为')>=0,'填一填：没给正确写法提示');
A(document.querySelectorAll('.slot.bad').length===1,'填一填：错的空没标红');
A((P.cards['qe-02']||{}).wrong>=1,'填一填：答错没记错');

/* ---------- ② 看答案（算不会） ---------- */
go('fill','qe-04');
document.querySelector('#peek').click();
A(!!document.querySelector('.verdict'),'看答案：没出判分');
A((P.cards['qe-04']||{}).wrong>=1,'看答案：没算不会');

/* ---------- ③ 认一认 ---------- */
go('name','cf-04');
A(document.querySelectorAll('#opts button').length===4,'认一认：选项不是 4 个');
var opts=S.choice.opts, right=opts.indexOf(S.choice.right);
A(right>=0,'认一认：选项里没有正确答案');
document.querySelectorAll('#opts button')[right].click();
A(!!document.querySelector('.verdict.ok'),'认一认：选对没判对');
A((P.cards['cf-04']||{}).ok===1,'认一认：选对没记对');

/* ---------- ③ 认一认（选错） ---------- */
go('name','cf-05');
var wrong=S.choice.opts.findIndex(function(x){return x!==S.choice.right;});
document.querySelectorAll('#opts button')[wrong].click();
A(!!document.querySelector('.verdict.bad'),'认一认：选错没判错');
A(document.querySelectorAll('#opts button.c').length===1,'认一认：没标出正确项');

/* ---------- ④ 错题 ---------- */
S.mode='wrong';S.qi=0;buildQueue();
A(S.queue.indexOf('qe-02')>=0,'错题：错的题没进错题本');
A(S.queue.indexOf('cf-04')<0,'错题：答对的题也进来了');

/* ---------- ⑤ 公式表 ---------- */
S.mode='list';render();
A(document.querySelectorAll('details.k').length===24,'公式表：条目不是 24 条');

/* 今日必背 */
var NT=DATA.cards.filter(function(c){return c.today;}).length;
A(NT===13,'数据里今日必背应为 13 条，实际 '+NT);
A(document.querySelectorAll('#todaybox .tl>li').length===13,'今日必背清单没列出 13 条');
A(!!document.querySelector('#todaybox .tl>li .fx'),'今日必背清单里没显示公式');
A(!!document.querySelector('#tprint'),'缺「打印这张清单」按钮');
document.querySelector('#todaybox .tlh .x').click();
A(document.querySelectorAll('#todaybox .tl>li').length===12,'点「取消」后应剩 12 条');
A(TXT('#ptd').indexOf('12')>=0,'统计条的今日必背数没跟着变');
S.mode='recite';S.scope='today';S.unit='全部';S.qi=0;buildQueue();
A(S.queue.length===12,'「只练今日必背」应为 12 条，实际 '+S.queue.length);
S.scope='all';
toggleToday('qe-02');
A(todayCards().length===13,'再标回来应是 13 条');

/* 清空后走兜底 */
clearToday();S.mode='list';render();
A(document.querySelectorAll('#todaybox .tl>li').length===0,'全部取消后清单应为空');
A(!!document.querySelector('#tall'),'空名单时应有「把★★核心的标上来」按钮');
document.querySelector('#tall').click();
A(todayCards().length===8,'兜底按钮应标上 8 条★★核心');
/* 复原成老师那 13 条，供后面的搜索测试 */
P.today.ids=DATA.cards.filter(function(c){return c.today;}).map(function(c){return c.id;});
saveProg();S.mode='list';render();

/* ---------- 遮住公式 ---------- */
var d0=document.querySelector('details.k');d0.open=true;
var cb=document.querySelector('#mask');cb.checked=true;cb.dispatchEvent(new Event('change'));
A(document.querySelectorAll('details.k[open]').length===1,'勾「遮住公式」把展开的条目折掉了');
A(!!document.querySelector('.bd.maskcur'),'勾了「遮住公式」但公式没被遮');
A(!!document.querySelector('#todaybox li.maskcur'),'今日必背清单没跟着遮');
A(!!document.querySelector('.maskhint'),'没有提示怎么揭开');
var bd=document.querySelector('.bd.maskcur');
bd.click();
A(!bd.classList.contains('maskcur'),'点一下没能揭开');
cb=document.querySelector('#mask');cb.checked=false;cb.dispatchEvent(new Event('change'));
A(!document.querySelector('.bd.maskcur'),'取消勾选后公式还糊着');
document.querySelector('#sq').value='韦达';
document.querySelector('#sq').dispatchEvent(new Event('input'));
A(document.querySelectorAll('details.k').length===4,'公式表：搜「韦达」应剩 4 条（含 qe-01 易错里提到的），实际 '+document.querySelectorAll('details.k').length);
A(document.querySelectorAll('details.k .fx').length>0,'公式表：展开内容里没有公式');

/* ---------- 键盘 ---------- */
go('recite','qe-07');
document.body.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
A(!!document.querySelector('.fx'),'键盘：空格没揭晓答案');
document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'1',bubbles:true}));
A((P.cards['qe-07']||{}).streak===1,'键盘：按 1 没记对');

/* ---------- 筛选 ---------- */
S.mode='recite';S.scope='star';S.unit='全部';S.qi=0;buildQueue();
var starAll=DATA.cards.filter(function(c){return (c.star||1)>=3;}).length;
A(S.queue.length===starAll,'筛选：★★核心 应为 '+starAll+' 条，实际 '+S.queue.length);

/* ---------- 导出结果 ---------- */
var d=document.createElement('div');
d.id='RESULT';
d.textContent=(LOG.length?'FAIL '+LOG.length+'/'+N+'：'+LOG.join(' | '):'PASS '+N);
document.body.appendChild(d);
`;

const src = join(tmp, 'ui-formula.html');
writeFileSync(src, html.replace('</body>', `<script>${CODE}<\/script></body>`), 'utf8');

const r = spawnSync(CHROME, ['--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox',
  '--dump-dom', '--user-data-dir=' + join(tmp, 'uiprof'), '--virtual-time-budget=3000',
  pathToFileURL(src).href], { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });

const m = (r.stdout || '').match(/<div id="RESULT">([\s\S]*?)<\/div>/);
if (m) {
  const txt = m[1];
  console.log(txt.startsWith('PASS') ? '✅ ' + txt : '❌ ' + txt);
  process.exit(txt.startsWith('PASS') ? 0 : 1);
} else {
  const t = (r.stdout || '').match(/<title>([\s\S]*?)<\/title>/);
  console.error('❌ 页面没跑起来（脚本中途抛错）' + (t ? ' title=' + t[1] : ''));
  console.error((r.stdout || '').slice(0, 400));
  process.exit(1);
}
