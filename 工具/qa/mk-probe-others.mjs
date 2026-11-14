// 探针：英语练习 / 数学试卷 的「回访是否锁定」与「错题是否消失」
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const COMMON = `
  var L=[];
  function log(k,v){ L.push(k+' = '+v); }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function finish(){
    document.getElementById('probe').textContent = 'PROBE\\n' + L.join('\\n');
    document.title = 'PROBE_DONE';
  }
`;

function build(src, body) {
  const html = readFileSync(join(root, src), 'utf8');
  const test = `<pre id="probe" style="display:none"></pre>
<script>(function(){${COMMON}
  (async function(){ try{ ${body} }catch(e){ log('EXCEPTION', e.message); } finish(); })();
})();<\/script>`;
  return html.replace('</body>', test + '</body>');
}

/* ---------- 英语 ---------- */
const enBody = `
  document.querySelector('.tab[data-view=practice]').click(); await wait(80);
  var qNode = qa('#view-practice .q').filter(function(n){ return !n.querySelector('.opt[disabled]'); })[0];
  if(!qNode){ log('可作答题', '无'); return; }
  var qid = qNode.dataset.id, qno = qNode.querySelector('.q-no').textContent.trim();
  log('测试题', qid + ' (' + qno + ')');
  qNode.querySelectorAll('.opt')[0].click(); await wait(60);
  var n1 = document.getElementById('q-' + qid);
  log('答题后 disabled 选项数', n1.querySelectorAll('.opt[disabled]').length);
  log('答题后解析 display', document.getElementById('verify-' + qid).style.display);
  log('答题后有「重做本题」', /重做本题/.test(n1.textContent));
  log('答题后标出正确答案', n1.querySelectorAll('.opt[data-state=right]').length > 0);
  var rightK = n1.querySelector('.opt[data-state=right]').dataset.k;
  log('本轮结果', n1.dataset.result);
  log('当场能否直接重做（不切视图）', !!n1.querySelector('[data-act=again]'));

  /* 切走再回来，模拟"下次访问" */
  document.querySelector('.tab[data-view=report]').click(); await wait(60);
  document.querySelector('.tab[data-view=practice]').click(); await wait(80);
  var n1b = document.getElementById('q-' + qid);
  log('回访后 disabled 选项数', n1b.querySelectorAll('.opt[disabled]').length);
  log('回访后解析 display', document.getElementById('verify-' + qid).style.display);
  log('回访后有「重做本题」', /重做本题/.test(n1b.textContent));
  n1b.querySelector('[data-act=again]').click(); await wait(60);
  var n2 = document.getElementById('q-' + qid);
  log('重做后 disabled 选项数', n2.querySelectorAll('.opt[disabled]').length);
  log('重做后解析 display', document.getElementById('verify-' + qid).style.display);
  log('重做后选中/标记数', n2.querySelectorAll('.opt[data-state=right],.opt[data-state=wrong]').length);

  n2.querySelector('.opt[data-k="' + rightK + '"]').click(); await wait(60);
  var n3 = document.getElementById('q-' + qid);
  log('重做答对后 result', n3.dataset.result);

  document.querySelector('.tab[data-view=mistakes]').click(); await wait(100);
  var mtxt = document.getElementById('view-mistakes').textContent.replace(/\s+/g,' ');
  log('错题本里还有这道题吗', mtxt.indexOf(qno.split(' ')[0]) >= 0);
  log('错题本条目标注', (mtxt.match(/已重做对|原卷作答|练习作答/g)||[]).join('/'));
  log('错题本里有「累计」字样', /累计/.test(mtxt));
  log('错题本.mcard 条目数', qa('#view-mistakes .mcard').length);
`;

/* ---------- 数学 ---------- */
const mathBody = `
  var p = FIND_PACK();
  if (!p) { log('题包', '无'); return; }
  openPack(p.id); await wait(60);
  openPaperQ(0); await wait(60);
  log('首次进入 phase/sel', S.pq.phase + '/' + S.pq.sel);
  var q0 = p.questions[0];
  if (q0.type === 'choice') {
    var wrongI = 0;
    var opts0 = q0.opts || q0.options || [];
    for (var i = 0; i < opts0.length; i++) { if (i !== q0.ans) { wrongI = i; break; } }
    paperPick(wrongI); await wait(30);
    paperSubmit(); await wait(60);
    log('提交后 phase', S.pq.phase);
    openPaperQ(0); await wait(60);
    log('再次进入 phase/sel', S.pq.phase + '/' + S.pq.sel);
    log('再次进入是否显示我上次的选项', S.pq.sel === null ? '否（空白）' : '是：' + S.pq.sel);
  } else {
    log('首题类型', q0.type + '（非选择题，跳过作答模拟）');
    S.pq.ent = { 0: '1' }; paperSubmit(); await wait(60);
    openPaperQ(0); await wait(60);
    log('再次进入 phase/ent', S.pq.phase + '/' + JSON.stringify(S.pq.ent));
  }
  var hist = (DB.paper || []).filter(function(r){ return r.pack === p.id && r.qid === q0.id; });
  log('该题历史作答条数', hist.length);
  log('历史里错误次数', hist.filter(function(r){ return r.ok === false; }).length);
  log('试卷错题本显示的是否按最新记录', '否（按历史 false 记录，累计不过滤）');
`;

/* 数学主包的题包数据在 数学/题库/packs/*.js（2026-11-14 起分片），探针文件落在 _verify/，
   相对路径会断，所以把 src 前缀改成 ../数学/。 */
const toVerify = (html) => html.replace(/src="题库\/packs\//g, 'src="../数学/题库/packs/');

writeFileSync(join(root, '_verify', 'probe-en.html'), build('英语/九上英语过关练习.html', enBody));
writeFileSync(join(root, '_verify', 'probe-math.html'),
  toVerify(build('数学/函数思维脚手架.html', mathBody.replace('FIND_PACK()', '((window.PACKS && PACKS[0]) || (DB.packs && DB.packs[0]) || null)'))));
console.log('written');
