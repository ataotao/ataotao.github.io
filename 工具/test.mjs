// 训练器自检：用 jsdom 在 Node 里跑五个模式，断言 UI 与记录逻辑
// 用法：node 工具/test.mjs <科目目录>   例：node 工具/test.mjs 道德与法治
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require2 = createRequire(join(root, '_verify', 'noop.js'));
const { JSDOM, VirtualConsole } = require2('jsdom');

const target = process.argv[2] || '道德与法治';
const html = readFileSync(join(root, target, '核心考点训练.html'), 'utf8');

/* ---------- 静态检查：只看文件，不开浏览器 ---------- */
{
  const res = [];
  const ok = (n, c, extra = '') => res.push({ n, pass: !!c, extra });
  const m = html.match(/const DATA = (\{[\s\S]*?\});\s*\n/);
  ok('数据块能解析', !!m);
  if (m) {
    const D = JSON.parse(m[1]);
    ok('考点数 > 0', D.cards.length > 0, D.cards.length + ' 张');
    const ids = new Set(D.cards.map(c => c.id));
    ok('考点 id 不重复', ids.size === D.cards.length, `${ids.size}/${D.cards.length}`);
    ok('图片用 WebP', D.imgExt === 'webp', String(D.imgExt));
    const pages = [...new Set(D.cards.map(c => c.page))].sort((a, b) => a - b);
    const missing = pages.filter(p => !existsSync(join(root, target, D.imgBase, D.imgPrefix + p + '.' + D.imgExt)));
    ok('每页都能找到原页图', missing.length === 0, missing.length ? '缺 p' + missing.join(',p') : `p${pages[0]}–p${pages[pages.length - 1]} 齐`);
    const badBlank = D.cards.filter(c => {
      const all = (c.a || []).concat(c.table ? c.table.rows.flat() : []).join('');
      return (all.match(/【/g) || []).length !== (all.match(/】/g) || []).length;
    });
    ok('挖空标记【】成对', badBlank.length === 0, badBlank.map(c => c.id).join(',') || '全部成对');
    const stray = D.cards.filter(c => /【\s*易错|【\s*必背|【\s*注意/.test(JSON.stringify(c)));
    ok('批注没混成挖空', stray.length === 0, stray.map(c => c.id).join(',') || '无');
    const tbl = D.cards.filter(c => c.table && c.table.rows.some(r => r.length !== c.table.head.length));
    ok('表格列数一致', tbl.length === 0, tbl.map(c => c.id).join(',') || '无');
    /* 套卷：新的多卷结构 {papers:[...]}，旧的单卷 {id,name,questions} 也认 */
    const PPS = Array.isArray(D.papers) ? D.papers : (D.paper ? [D.paper] : []);
    if (PPS.length) {
      const all = PPS.flatMap(p => p.questions || []);
      const mc = all.filter(q => q.kind !== 'sub');
      const sub = all.filter(q => q.kind === 'sub');
      ok('套卷份数 > 0', PPS.every(p => p.id && p.name), PPS.length + ' 份 / ' + all.length + ' 题');
      ok('套卷题数 > 0', all.length > 0, `${mc.length} 选择 + ${sub.length} 主观`);
      ok('套卷题 id 不重复', new Set(all.map(q => q.id)).size === all.length);
      ok('选择题每题 4 个选项', mc.every(q => Array.isArray(q.opts) && q.opts.length === 4));
      ok('选择题答案都在 0–3', mc.every(q => q.ans >= 0 && q.ans <= 3));
      ok('选择题每题有解析', mc.every(q => (q.why && Object.keys(q.why).length) || q.sol));
      ok('套卷每题有单元', all.every(q => typeof q.unit === 'string' && q.unit.length > 1));
      ok('主观题每题都有设问和参考答案',
        sub.every(q => Array.isArray(q.parts) && q.parts.length && q.parts.every(p => p.ask && p.ans)),
        sub.map(q => (q.parts || []).length + '问').join(','));
      ok('主观题采分点够自评用',
        sub.every(q => q.parts.every(p => !p.pts || p.pts.length >= 2)),
        sub.flatMap(q => q.parts.map(p => (p.pts || []).length)).join(','));
      const imgs = all.flatMap(q => (q.blocks || []).flatMap(b =>
        b.t === 'img' ? [b.src] : b.t === 'tbl' ? b.rows.flatMap(r => r.flatMap(c => c.imgs || [])) : []));
      const miss = imgs.filter(s => !existsSync(join(root, target, s)));
      ok('套卷配图都在', miss.length === 0, `${imgs.length} 张${miss.length ? ' 缺 ' + miss.slice(0, 3).join(',') : ''}`);
    }
  }
  const bad = res.filter(x => !x.pass);
  console.log(`${bad.length ? '❌' : '✅'} static  ${res.length - bad.length}/${res.length}`);
  bad.forEach(x => console.log(`     ✗ ${x.n}${x.extra ? '  → ' + x.extra : ''}`));
  if (bad.length) { console.log('\n静态检查未通过，后面的浏览器测试跳过。'); process.exit(1); }
}

const CASES = {
  recite: `
    ok('考点数 > 0', DATA.cards.length>0, DATA.cards.length+' 张');
    ok('卡片已渲染', !!document.querySelector('.card .q'));
    const q0=document.querySelector('.q').textContent.trim();
    ok('题目文字非空', q0.length>2, q0.slice(0,20));
    ok('未揭晓时没有答案', document.querySelectorAll('.kw').length===0);
    const link=document.querySelector('.meta a');
    ok('「对照原页」指向 webp', link && /\.webp$/.test(link.getAttribute('href')), link && link.getAttribute('href'));
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
    // 顶部「按单元 / 练习范围」下拉框在清单里也要生效
    s.value=''; s.dispatchEvent(new Event('input'));
    const u=[...new Set(DATA.cards.map(c=>c.unit))][1] || [...new Set(DATA.cards.map(c=>c.unit))][0];
    const fu=document.querySelector('#fu'); fu.value=u; fu.dispatchEvent(new Event('change'));
    const inU=DATA.cards.filter(c=>(c.unit||'未分单元')===u).length;
    ok('按单元筛选在清单里生效', $$('details.k').length===inU, $$('details.k').length+'/'+inU);
    ok('单元分组只剩一个', $$('.unitbox').length===1, $$('.unitbox').length+'');
    ok('显示筛选提示', !!document.querySelector('#lclr'), (document.querySelector('#lclr')||{}).textContent);
    // 叠加「只练★必背」
    const fs=document.querySelector('#fs'); fs.value='star'; fs.dispatchEvent(new Event('change'));
    const starN=DATA.cards.filter(c=>(c.unit||'未分单元')===u && (c.star||1)>=2).length;
    ok('范围筛选在清单里也生效', $$('details.k').length===starN, $$('details.k').length+'/'+starN);
    ok('清单里的卡都符合范围', [...document.querySelectorAll('details.k')].every(d=>{
      const c=DATA.cards.find(x=>x.id===d.dataset.id);return c && (c.unit||'未分单元')===u && (c.star||1)>=2;
    }));
    // 清除筛选
    document.querySelector('#lclr').click();
    ok('清除筛选恢复全部', $$('details.k').length===DATA.cards.length, $$('details.k').length+'/'+DATA.cards.length);
    ok('清除后下拉框复位', document.querySelector('#fu').value==='全部' && document.querySelector('#fs').value==='all');
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
  paper: `
    if(!DATA.paper){ ok('这份数据没有套卷（跳过）', true); }
    else{
      const tab=document.querySelector('#tabPaper');
      ok('⑥ 套卷标签显示出来', tab && !tab.hidden);
      tab.click();
      ok('切到套卷模式', S.mode==='paper');
      ok('整卷队列 = 本卷题数', S.paper.queue.length===PQ.length, S.paper.queue.length+' / '+PQ.length);
      if(PAPERS.length>1){
        const pp=document.querySelector('#pp');
        ok('多份卷时有「选卷」下拉', !!pp && pp.options.length===PAPERS.length, pp?pp.options.length+' 项':'没有');
        const before=PQ.length;
        pp.value='1'; pp.dispatchEvent(new Event('change'));
        ok('换卷后题池跟着换', S.paper.pi===1 && PQ.length!==before && S.paper.queue.length===PQ.length, 'pi='+S.paper.pi+' '+PQ.length+' 题');
        pp.value='0'; pp.dispatchEvent(new Event('change'));
        ok('换回第一卷', S.paper.pi===0 && S.paper.queue.length===PQ.length, PQ.length+' 题');
      }
      ok('进度条可见', document.querySelector('#prog') && !document.querySelector('#prog').hidden);
      ok('统计条显示正确率', document.querySelector('#bar').textContent.includes('正确率'));
      const q0=PQ_BY(S.paper.queue[0]);
      ok('题干渲染出来', document.querySelector('.pstem').textContent.length>10, document.querySelector('.pstem').textContent.slice(0,20));
      const ob=$$('#opts button');
      ok('四个选项按钮', ob.length===4, ob.length+'');
      // 故意答错：要标红、标出正确项、给出逐项解析、进错题
      ob[(q0.ans+1)%4].click();
      ok('答错时标红', !!document.querySelector('#opts button.w'));
      ok('正确项标绿', !!document.querySelector('#opts button.c'));
      ok('逐项解析 4 条', $$('.whyrow').length===4, $$('.whyrow').length+'');
      ok('解析里正确项高亮', $$('.whyrow.right').length===1);
      ok('判错记录进 P.paper', P.paper[q0.id] && P.paper[q0.id].wrong===1, JSON.stringify(P.paper[q0.id]));
      ok('答错后选项禁用', $$('#opts button').every(b=>b.disabled));
      // 下一题 → 再上一题：2026-11-03 起回看一律空白重做，要点「看上次的答案与解析」才给判分/解析
      document.querySelector('#pnx').click();
      ok('下一题换到第 2 题', S.paper.qi===1, 'qi='+S.paper.qi);
      document.querySelector('#pv').click();
      ok('回到上一题先空白重做，并给「看上次的答案与解析」', $$('.whyrow').length===0 && !!document.querySelector('#ppeek'), 'whyrow='+$$('.whyrow').length);
      document.querySelector('#ppeek').click();
      ok('点开「看上次的答案与解析」后解析与正确项都在', $$('.whyrow').length===4 && !!document.querySelector('#opts button.c'), 'whyrow='+$$('.whyrow').length);
      // 答对
      document.querySelector('#pnx').click();
      const q1=PQ_BY(S.paper.queue[1]);
      $$('#opts button')[q1.ans].click();
      ok('答对显示绿色判定', !!document.querySelector('.verdict.ok'));
      ok('答对计入 ok', P.paper[q1.id].ok===1, JSON.stringify(P.paper[q1.id]));
      // 配图题：有配图就要能渲染
      const imgQ=PQ.filter(q=>q.blocks.some(b=>b.t==='img'))[0];
      ok('本卷配图题（没有就跳过）', true, imgQ?imgQ.id:'本卷无配图');
      if(imgQ){ S.paper.queue=[imgQ.id];S.paper.qi=0;S.paper.log={};render();
        const im=document.querySelector('.figs img');
        ok('配图渲染成 img', im && /\\.webp$/.test(im.getAttribute('src')), im&&im.getAttribute('src'));
      }
      // 表格题：题表要渲染
      const tblQ=PQ.filter(q=>q.blocks.some(b=>b.t==='tbl'))[0];
      ok('套卷里有题表题', !!tblQ, tblQ&&tblQ.id);
      if(tblQ){ S.paper.queue=[tblQ.id];S.paper.qi=0;S.paper.log={};render();
        ok('题表渲染成表格', $$('.ptbl td').length>0, $$('.ptbl td').length+' 个单元格');
      }
      // 范围筛选
      const sel=document.querySelector('#pr');
      sel.value='round'; sel.dispatchEvent(new Event('change'));
      ok('随机 20 题', S.paper.queue.length===20, S.paper.queue.length+'');
      sel.value='weak'; sel.dispatchEvent(new Event('change'));
      ok('只做错题能捞回答错的题', S.paper.queue.includes(q0.id), S.paper.queue.length+' 题');
      sel.value='seq'; sel.dispatchEvent(new Event('change'));
      // 单元筛选
      const u=PQ[0].unit;
      const pu=document.querySelector('#pu'); pu.value=u; pu.dispatchEvent(new Event('change'));
      ok('按单元筛选生效', S.paper.queue.length>0 && S.paper.queue.every(id=>PQ_BY(id).unit===u), u+' → '+S.paper.queue.length+' 题');
      pu.value='全部'; pu.dispatchEvent(new Event('change'));
      // 本轮结算
      const a=PQ[0].id,b=PQ[1].id;
      S.paper.queue=[a,b];S.paper.qi=0;S.paper.log={};render();
      $$('#opts button')[PQ[0].ans].click();
      document.querySelector('#pnx').click();
      $$('#opts button')[(PQ[1].ans+2)%4].click();
      document.querySelector('#pnx').click();
      ok('答完一轮出结算页', !!document.querySelector('.scoreline'), (document.querySelector('.scoreline')||{}).textContent);
      ok('结算页有错题跳转', $$('[data-jump]').length===1, $$('[data-jump]').length+'');
      $$('[data-jump]')[0].click();
      ok('点题号能回到那题', S.paper.qi===1, 'qi='+S.paper.qi);
      // 主观题：先写 → 对照参考答案 → 勾采分点自评（不判分、不进错题本）
      const subQ=PQ.filter(q=>q.kind==='sub')[0];
      ok('套卷里有主观题（没有就跳过）', !!subQ, subQ?subQ.id:'本卷无主观题');
      if(subQ){
        S.paper.queue=[subQ.id];S.paper.qi=0;S.paper.log={};S.paper.echo=null;render();
        ok('主观题渲染出各问设问', $$('.subask').length===subQ.parts.length, $$('.subask').length+'/'+subQ.parts.length);
        ok('主观题没有选项按钮', $$('#opts button').length===0, $$('#opts button').length+'');
        ok('没点「对照答案」前不给答案', $$('.refans').length===0);
        document.querySelector('#preveal').click();
        ok('点「我写完了」后给参考答案', $$('.refans').length===subQ.parts.length, $$('.refans').length+'/'+subQ.parts.length);
        const boxes=$$('[data-pt]');
        ok('采分点能逐条勾', boxes.length===subQ.parts.reduce((n,p)=>n+(p.pts||[]).length,0), boxes.length+' 条');
        boxes[0].click();
        ok('勾选写进记录', !!P.paper[subQ.id] && JSON.stringify(P.paper[subQ.id].self||[]).includes('true'), JSON.stringify(P.paper[subQ.id]&&P.paper[subQ.id].self));
        ok('主观题不进错题本', P.paper[subQ.id].wrong===0, JSON.stringify(P.paper[subQ.id]));
        ok('自评覆盖显示出来', !!document.querySelector('.selfbar') && /采分点自评/.test(document.querySelector('.selfbar').textContent), (document.querySelector('.selfbar')||{}).textContent);
        document.querySelector('#pnx').click();
        ok('主观题做完能推进/出结算', !!document.querySelector('.scoreline')||S.paper.qi>0, 'qi='+S.paper.qi);
      }
      // 整卷打印视图
      document.querySelector('[data-mode="paper"]').click();
      paperPrint();
      const mcN=PQ.filter(q=>q.kind!=='sub').length, subN=PQ.filter(q=>q.kind==='sub').length;
      ok('打印视图列出全部选择题', $$('.optrow.c').length===mcN, $$('.optrow.c').length+'/'+mcN);
      ok('打印视图有解析', $$('.whybox').length===mcN, $$('.whybox').length+'/'+mcN);
      ok('打印视图带主观题参考答案', $$('.refans').length===PQ.filter(q=>q.kind==='sub').reduce((n,q)=>n+q.parts.length,0), subN+' 题主观');
      document.querySelector('#pback').click();
      ok('返回做题视图', !!document.querySelector('.pstem') && !document.querySelector('.scoreline'));
      // 记录导出/导入不丢套卷记录
      const blob=JSON.stringify({data:P});
      ok('导出记录里带套卷记录', JSON.parse(blob).data.paper && Object.keys(JSON.parse(blob).data.paper).length>0);
    }
  `,
  misc: `    ok('页面标题用数据里的', document.title===DATA.title, document.title);    ok('单元筛选项齐全', $$('#fu option').length>=2, $$('#fu option').length+' 项');
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
    // 清空记录后切到套卷不能崩（P.paper 必须一起重置）
    const oc=window.confirm; window.confirm=()=>true;
    $$('#tabs button').find(b=>b.dataset.mode==='recite').click();
    document.querySelector('#rst').click();
    window.confirm=oc;
    ok('清空后 P.paper 还在', P.paper && typeof P.paper==='object', JSON.stringify(P.paper));
    if(DATA.paper){
      $$('#tabs button').find(b=>b.dataset.mode==='paper').click();
      ok('清空后切套卷不崩', !!document.querySelector('.pstem'));
      ok('清空后套卷统计归零', P.paper && Object.keys(P.paper).length===0);
    }
  `,
  resume: `
    // ---- 续练会话：退出/刷新后能回到上次位置 ----
    S.mode='cloze';S.unit='全部';S.scope='all';buildQueue();
    S.qi=Math.min(2,S.queue.length-1);S.revealed=false;render();
    const raw=localStorage.getItem(SSK);
    ok('会话写入 localStorage', !!raw, raw?'v1':'空');
    const o=JSON.parse(raw);
    ok('会话记住模式/位置/队列', o.mode==='cloze'&&o.qi===S.qi&&o.queue.length===S.queue.length, o.mode+' '+o.qi+'/'+o.queue.length);
    const wantId=S.queue[S.qi];
    // 模拟刷新：状态清空后按会话恢复
    S.mode='recite';S.qi=0;S.revealed=false;
    ok('能恢复上次位置', !!applySess(o) && S.mode==='cloze' && S.queue[S.qi]===wantId, S.mode+' '+S.qi);
    ok('续练提示数据正确', !!RESUME && RESUME.pos===S.qi+1 && RESUME.total===S.queue.length, JSON.stringify(RESUME));
    showResumeBar();
    const rb=document.querySelector('#resume');
    ok('续练提示显示出来', !!rb && rb.hidden===false && /上次练到/.test(rb.textContent), rb&&rb.textContent.trim().slice(0,40));
    document.querySelector('#rnew').click();
    ok('「从头开始」回到第 1 题', S.qi===0 && document.querySelector('#resume').hidden===true, 'qi='+S.qi);
    // 坏会话不能把页面搞崩（队列里的卡 id 都不存在）
    S.mode='recite';S.qi=0;
    ok('无效队列安全回退', applySess({v:1,mode:'recite',qi:5,queue:['不存在']})===false && S.qi===0);
    // ---- ⑥ 套卷：做了一半退出也要接着做（含本轮已答记录）----
    if(DATA.paper){
      document.querySelector('#tabPaper').click();
      const q0=PQ_BY(S.paper.queue[0]);
      $$('#opts button')[q0.ans].click();
      document.querySelector('#pnx').click();
      const raw2=JSON.parse(localStorage.getItem(SSK));
      ok('套卷会话保存位置和本轮作答', raw2.mode==='paper' && raw2.paper.qi===1 && Object.keys(raw2.paper.log).length===1, raw2.mode+' '+raw2.paper.qi+' '+Object.keys(raw2.paper.log).length);
      S.paper.queue=[];S.paper.qi=0;S.paper.log={};S.mode='recite';
      ok('套卷能恢复到原题', !!applySess(raw2) && S.mode==='paper' && S.paper.qi===1, S.mode+' '+S.paper.qi);
      render();
      ok('恢复后停在原题', !!document.querySelector('.pstem') && S.paper.qi===1);
      document.querySelector('#pv').click();
      const blankN=$$('.whyrow').length, peekBtn=document.querySelector('#ppeek');
      const peekN=peekBtn?(peekBtn.click(),$$('.whyrow').length):-1;
      ok('恢复后已答题先空白重做，点「看上次的答案与解析」后解析还在', blankN===0 && peekN===4, '空白 '+blankN+' 条 / 点开后 '+peekN+' 条');
    }
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
