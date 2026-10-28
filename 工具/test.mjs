// 训练器自检：用 jsdom 在 Node 里跑五个模式，断言 UI 与记录逻辑
// 用法：node 工具/test.mjs <科目目录>   例：node 工具/test.mjs 道德与法治
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require2 = createRequire(join(root, '_verify', 'noop.js'));
const { JSDOM, VirtualConsole } = require2('jsdom');

const target = process.argv[2] || '道德与法治';
const html = readFileSync(join(root, target, '核心考点训练.html'), 'utf8');

const CASES = {
  recite: `
    ok('考点数 > 0', DATA.cards.length>0, DATA.cards.length+' 张');
    ok('卡片已渲染', !!document.querySelector('.card .q'));
    const q0=document.querySelector('.q').textContent.trim();
    ok('题目文字非空', q0.length>2, q0.slice(0,20));
    ok('未揭晓时没有答案', document.querySelectorAll('.kw').length===0);
    document.querySelector('#show').click();
    const kws=document.querySelectorAll('.kw').length;
    ok('揭晓后有关键词高亮', kws>0, kws+' 处');
    const v=document.querySelectorAll('#acts button[data-v]');
    ok('三个自评按钮', v.length===3, v.length+'');
    const id=S.queue[S.qi];
    v[0].click();
    ok('自评会了 streak=1', getP(id) && getP(id).streak===1, JSON.stringify(getP(id)));
    ok('自动跳到下一题', S.qi===1 || S.queue.length===1, 'qi='+S.qi);
    ok('统计条更新', document.querySelector('#bar').textContent.includes('已熟练'), document.querySelector('#bar').textContent.trim().slice(0,40));
  `,
  cloze: `
    $$('#tabs button').find(b=>b.dataset.mode==='cloze').click();
    ok('填空模式有队列', S.queue.length>0, S.queue.length+' 题');
    ok('无挖空的卡被排除', S.queue.every(id=>PLAN[id].count>0), S.queue.length+'');
    const c=CARD_BY(S.queue[0]); const p=PLAN[c.id];
    ok('本卡有挖空', p.count>0, p.count+' 空');
    const ins=$$('.bi');
    ok('输入框数量与挖空数一致', ins.length===p.count, ins.length+'/'+p.count);
    ins.forEach(inp=>{inp.value=p.blanks[+inp.dataset.k][0];});
    document.querySelector('#sub').click();
    ok('全对判定为绿', !!document.querySelector('.verdict.ok'), (document.querySelector('.verdict')||{}).textContent);
    ok('全对记 streak=1', getP(c.id).streak===1, JSON.stringify(getP(c.id)));
    document.querySelector('#again').click();
    const ins2=$$('.bi'); ins2[0].value='故意写错';
    document.querySelector('#sub').click();
    ok('重练不重复计分（错也不新增记录）', getP(c.id).wrong===0, JSON.stringify(getP(c.id)));
    // 换一张卡，故意答错 → 应该进错题本
    document.querySelector('#nx2').click();
    const c2=CARD_BY(S.queue[S.qi]); const p2=PLAN[c2.id];
    const ins3=$$('.bi'); ins3.forEach(inp=>{inp.value='乱写'});
    document.querySelector('#sub').click();
    ok('答错判定为红', !!document.querySelector('.verdict.bad'));
    ok('错处给出正解', $$('.given').length===p2.count, $$('.given').length+'/'+p2.count);
    ok('答错进错题本 wrong>0', getP(c2.id).wrong>0, JSON.stringify(getP(c2.id)));
    ok('答错 streak 归零', getP(c2.id).streak===0);
    const badId=c2.id;
    $$('#tabs button').find(b=>b.dataset.mode==='wrong').click();
    ok('错题强化能捞回这题', S.queue.includes(badId), S.queue.slice(0,3).join(','));
  `,
  choice: `
    $$('#tabs button').find(b=>b.dataset.mode==='choice').click();
    ok('四选一有队列', S.queue.length>0, S.queue.length+' 题');
    const btns=$$('#opts button');
    ok('四个选项', btns.length===4, btns.length+'');
    const txt=b=>b.dataset.o;
    const uniq=new Set(btns.map(txt));
    ok('选项互不重复', uniq.size===4, [...uniq].join('/'));
    const right=PLAN[S.queue[0]].blanks[S.choice.k][0];
    const rb=btns.find(b=>txt(b)===right);
    ok('正确项在选项里', !!rb);
    rb.click();
    ok('点对高亮绿色', !!document.querySelector('#opts button.c'));
    ok('点对记分', getP(S.queue[0]).ok>0, JSON.stringify(getP(S.queue[0])));
    ok('出现下一题按钮', !!document.querySelector('#nx3'));
  `,
  list: `
    $$('#tabs button').find(b=>b.dataset.mode==='list').click();
    ok('清单有单元分组', $$('.unitbox').length>0, $$('.unitbox').length+' 个单元');
    ok('清单有卡片', $$('details.k').length>0, $$('details.k').length+' 张');
    const s=document.querySelector('#sq');
    const kw=(DATA.cards[0].q||'').slice(0,2);
    s.value=kw; s.dispatchEvent(new Event('input'));
    const n=$$('details.k').length;
    ok('搜索能过滤', n>0 && n<=DATA.cards.length, n+' 张命中「'+kw+'」');
    ok('有单元进度条', $$('.ubar').length>0);
    ok('有打印按钮', !!document.querySelector('#prt'));
  `,
  judge: `
    ok('norm 去标点空白', norm(' 根本政治前提、和制度基础。 ')===norm('根本政治前提和制度基础'));
    ok('loose 去虚词', loose('根本政治前提和制度基础')===loose('根本政治前提制度基础'));
    const target=DATA.cards.find(c=>PLAN[c.id].blanks.some(a=>norm(a[0]).length>=8));
    ok('找得到含长答案的卡', !!target, target&&target.id);
    const p=PLAN[target.id];
    S.mode='cloze';S.unit='全部';S.scope='all';S.queue=[target.id];S.qi=0;S.revealed=false;S.scored=false;render();
    $$('.bi').forEach(inp=>{
      const alts=p.blanks[+inp.dataset.k];
      inp.value = norm(alts[0]).length>=8 ? alts[0].replace(/[的地得了着和与及其之]/g,'') : alts[0];
    });
    document.querySelector('#sub').click();
    ok('长答案少一个虚词仍判全对', !!document.querySelector('.verdict.ok'), (document.querySelector('.verdict')||{}).textContent);
  `,
  misc: `    ok('页面标题用数据里的', document.title===DATA.title, document.title);
    ok('单元筛选项齐全', $$('#fu option').length>=2, $$('#fu option').length+' 项');
    ok('范围筛选项齐全', $$('#fs option').length===4);
    // 切换单元后队列只含该单元
    const u=[...new Set(DATA.cards.map(c=>c.unit))][0];
    const sel=document.querySelector('#fu'); sel.value=u; sel.dispatchEvent(new Event('change'));
    ok('按单元筛选生效', S.queue.length>0 && S.queue.every(id=>CARD_BY(id).unit===u), u+' → '+S.queue.length+' 题');
    // 空挖空卡在填空模式给出提示而不是崩
    sel.value='全部'; sel.dispatchEvent(new Event('change'));
    $$('#tabs button').find(b=>b.dataset.mode==='cloze').click();
    ok('填空模式不崩', !!document.querySelector('#stage').innerHTML.length);
    // 越界保护：连点下一题
    for(let i=0;i<30;i++){const n=document.querySelector('#nx');if(n)n.click();}
    ok('连点下一题不崩', !!document.querySelector('#stage').innerHTML.length);
  `,
};

function runCase(name, body) {
  const vc = new VirtualConsole();
  const errs = [];
  // jsdom 没有实现 scrollTo/print 等，会以 "Not implemented" 形式报错，这不算页面的错
  const isJsdomLimitation = m => /Not implemented/i.test(m);
  vc.on('jsdomError', e => { const m = String(e && e.message || e); if (!isJsdomLimitation(m)) errs.push(m); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://kaoshi.local/', virtualConsole: vc, pretendToBeVisual: true });
  const w = dom.window;
  const out = w.eval(`(function(){
    const R=[];const ok=(n,c,extra)=>R.push({n,pass:!!c,extra:extra===undefined?'':String(extra)});
    const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
    try{ ${body} }catch(e){ R.push({n:'脚本异常',pass:false,extra:String(e&&e.stack||e)}) }
    return JSON.stringify(R);
  })()`);
  w.close();
  const res = JSON.parse(out);
  if (errs.length) res.push({ n: '无未捕获 JS 错误', pass: false, extra: errs.join(' | ') });
  return res;
}

let fail = 0, total = 0;
const all = [];
for (const [name, body] of Object.entries(CASES)) {
  let res;
  try { res = runCase(name, body); } catch (e) {
    console.log(`❌ ${name} 载入失败：${e.message}`);
    fail++; continue;
  }
  const bad = res.filter(x => !x.pass);
  total += res.length; fail += bad.length;
  console.log(`${bad.length ? '❌' : '✅'} ${name}  ${res.length - bad.length}/${res.length}`);
  bad.forEach(x => console.log(`     ✗ ${x.n}${x.extra ? '  → ' + x.extra.slice(0, 300) : ''}`));
  all.push({ name, res });
}
console.log(fail ? `\n共 ${fail} 条断言未通过（${total} 条）` : `\n全部通过（${total} 条断言）`);
process.exitCode = fail ? 1 : 0;
