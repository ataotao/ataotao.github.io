/* =============================================================
   模块：试卷练习（exam）+ 错题回炉（wrong）
   - 只调用 PHYS.* API，不改 core/shell/css
   - 样式用 PHYS.ui.addCSS，类名以 .ex- 前缀
   ============================================================= */
(function () {
  'use strict';

  var PHYS = window.PHYS, U = PHYS.util, UI = PHYS.ui, esc = UI.escape;

  /* ---------------- 样式 ---------------- */
  UI.addCSS(`
.ex-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.ex-bar .ex-title{font-size:15px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-prog{display:flex;align-items:center;gap:10px;margin:0 0 12px;font-size:12px;color:var(--muted);flex-wrap:wrap}
.ex-prog .bar{flex:1;min-width:90px}
.ex-name{font-size:16.5px;font-weight:700;line-height:1.45}
.ex-sub{font-size:12.5px;color:var(--muted);margin-top:2px}
.ex-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.ex-statline{font-size:13px;color:var(--ink2);margin-top:10px}
.ex-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.ex-btns .btn{min-height:40px;display:inline-flex;align-items:center}
.ex-area{margin-top:12px}
.ex-jump{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:7px;margin-top:10px}
.ex-num{min-height:42px;border:1px solid var(--line);border-radius:9px;background:#fff;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums}
.ex-num:hover{border-color:#c9c2b4}
.ex-num.on{border-color:var(--brand);background:var(--brand-l);color:var(--brand-d);font-weight:700}
.ex-num.ok{border-color:#cfe6d8;background:var(--ok-bg);color:var(--ok)}
.ex-num.no{border-color:#eccfcd;background:var(--bad-bg);color:var(--bad)}
.ex-nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.ex-nav .btn{min-height:40px}
.ex-feedback{margin-top:14px;border-top:1px dashed var(--line);padding-top:12px}
.ex-feedback:empty{display:none;border-top:0;margin-top:0;padding-top:0}
.ex-answer{margin-top:10px}
.ex-ansline{margin-top:10px;gap:8px}
.ex-ansbtn{width:100%;min-height:42px;display:flex;align-items:center;justify-content:center;font-size:13.5px}
.ex-ansbtn.open{color:var(--brand-d);border-color:#cfe1ec;background:var(--brand-l)}
.ex-ansbox{margin-top:8px}
.ex-score{display:flex;align-items:baseline;gap:14px;margin-top:8px;flex-wrap:wrap}
.ex-mega{font-size:32px;font-weight:800;line-height:1.1;color:var(--brand-d);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.ex-mega.ok{color:var(--ok)}
.ex-wlist{margin-top:6px}
.ex-wrow{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px dashed var(--line)}
.ex-wrow:last-child{border-bottom:0}
.ex-wcheck{display:flex;align-items:center;gap:5px;flex:0 0 auto;padding-top:2px;cursor:pointer}
.ex-wcheck input{width:17px;height:17px;accent-color:var(--brand)}
.ex-wmain{flex:1;min-width:0}
.ex-wtitle{font-size:14px;font-weight:600;line-height:1.5;word-break:break-word}
.ex-wright{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.ex-wstats{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.ex-wstat{flex:1;min-width:88px;border:1px solid var(--line);border-radius:11px;background:#fff;padding:9px 8px;text-align:center;min-height:58px;cursor:pointer}
.ex-wstat b{display:block;font-size:20px;line-height:1.25;font-variant-numeric:tabular-nums}
.ex-wstat span{font-size:11.5px;color:var(--muted)}
.ex-wstat.on{border-color:var(--brand);background:var(--brand-l)}
.ex-wstat.on b{color:var(--brand-d)}
.ex-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.ex-chip{font-size:12.5px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;min-height:40px}
.ex-chip:hover{border-color:#c9c2b4}
.ex-chip.on{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:700}
.ex-opttext{flex:1;min-width:0}
/* 考点 · 公式（解析区第一块，刻意做得比解析更抢眼） */
.ex-key{margin-top:12px;border:1px solid #d7e5ef;border-left:4px solid var(--brand);border-radius:12px;
  background:linear-gradient(180deg,#f4fafd 0%,#fff 70%);padding:11px 13px 12px}
.ex-key-h{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ex-key-h b{font-size:13px;font-weight:800;letter-spacing:.08em;color:var(--brand-d)}
.ex-key-h span{font-size:11.5px;color:var(--muted)}
.ex-key-row{display:flex;gap:8px;align-items:flex-start;margin-top:9px}
.ex-key-lb{flex:0 0 auto;font-size:11px;font-weight:800;letter-spacing:.06em;color:#fff;background:var(--brand);
  border-radius:6px;padding:2px 7px;margin-top:1px}
.ex-key-txt{font-size:14px;font-weight:700;line-height:1.6;color:var(--ink)}
.ex-key-fs{margin-top:9px;display:flex;flex-direction:column;gap:6px}
.ex-key-f{background:#fff;border:1px solid var(--line);border-radius:9px;padding:7px 10px 8px}
.ex-key-f .ex-f{display:block;font-size:15px;font-weight:800;line-height:1.5;color:var(--brand-d);
  letter-spacing:.01em;font-variant-numeric:tabular-nums;word-break:break-word}
.ex-key-f .ex-fm{display:block;font-size:12px;color:var(--muted);line-height:1.6;margin-top:3px}
.ex-inkey{color:var(--brand-d);font-weight:700;background:#dceaf5;border-radius:4px;padding:0 3px;
  -webkit-box-decoration-break:clone;box-decoration-break:clone}
.ex-key-empty{font-size:12.5px;color:var(--muted);margin-top:8px}
.ex-empty-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.ex-bar a.btn-ghost,.ex-btns a,.ex-empty-actions a,.ex-wright a,.ex-link{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.ex-bar a.btn-ghost,.ex-btns a:not(.btn-primary),.ex-empty-actions a:not(.btn-primary),.ex-wright a,.ex-link:not(.btn-primary){color:inherit}
.ex-bar a.btn-ghost{min-height:38px}
.ex-imgs img{width:100%;max-width:880px}
@media (max-width:640px){
  .ex-mega{font-size:27px}
  .ex-jump{grid-template-columns:repeat(5,1fr)}
  .ex-wstat{min-width:0}
  .ex-wrow{flex-wrap:wrap}
  .ex-wright{flex-direction:row;align-items:center;width:100%;justify-content:flex-end}
  .ex-bar .ex-title{white-space:normal;overflow:visible}
}
`);

  /* ---------------- 小工具 ---------------- */
  function h(tag, attrs, kids) { return UI.el(tag, attrs, kids); }
  function packs() { return (PHYS.DATA && PHYS.DATA.packs) || []; }
  function concepts() { return (PHYS.DATA && PHYS.DATA.concepts) || []; }
  function guidedItems() { return (PHYS.DATA && PHYS.DATA.guided) || []; }

  function findPack(id) {
    var ps = packs();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  function qsOf(pack) { return (pack && pack.questions) || []; }
  function qIndexOf(pack, qid) {
    var qs = qsOf(pack);
    for (var i = 0; i < qs.length; i++) if (qs[i].id === qid) return i;
    return -1;
  }
  function findQ(pack, qid) { var i = qIndexOf(pack, qid); return i < 0 ? null : qsOf(pack)[i]; }
  function isSelf(q) { return q.type === 'selfcheck' || q.selfCheck === true; }
  function recOf(packId, qid) { return PHYS.store.get('exam.' + packId + '.' + qid, null); }
  function packRec(packId) { return PHYS.store.get('exam.' + packId, {}) || {}; }
  function letter(i) { return String.fromCharCode(65 + Number(i)); }
  function lettersOf(v) {
    if (v === null || v === undefined || v === '') return '';
    var a = Array.isArray(v) ? v.slice() : [v];
    a = a.filter(function (x) { return x !== null && x !== undefined && x !== ''; });
    return a.map(function (x) { return letter(x); }).sort().join('');
  }
  function focusOf(q) { return (PHYS.FIVE_BY && PHYS.FIVE_BY[q.focus]) || null; }
  function focusIndex(q) {
    var list = PHYS.FIVE || [];
    for (var i = 0; i < list.length; i++) if (list[i].k === q.focus) return i + 1;
    return 0;
  }
  function barEl(ratio, cls) {
    var b = h('div', { class: 'bar ' + (cls || '') });
    b.appendChild(h('i', { style: 'width:' + Math.round(U.clamp(ratio || 0, 0, 1) * 100) + '%' }));
    return b;
  }

  /* ---------- 考点 · 公式 ---------- */
  /* 题库字段：point（考点一句话）、formulas（[{f:公式, m:怎么用/什么时候用}]） */
  function formulasOf(q) {
    return (q && Array.isArray(q.formulas) ? q.formulas : []).filter(function (x) { return x && x.f; });
  }

  function keyBlock(q) {
    var point = (q && q.point) || '';
    var fs = formulasOf(q);
    if (!point && !fs.length) return null;
    var box = h('div', { class: 'ex-key' });
    var head = h('div', { class: 'ex-key-h' });
    head.appendChild(h('b', { text: '考点 · 公式' }));
    head.appendChild(h('span', { text: '先看这一块，再往下读解析' }));
    box.appendChild(head);

    if (point) {
      var row = h('div', { class: 'ex-key-row' });
      row.appendChild(h('span', { class: 'ex-key-lb', text: '考点' }));
      row.appendChild(h('span', { class: 'ex-key-txt', text: point }));
      box.appendChild(row);
    }
    if (fs.length) {
      var wrap = h('div', { class: 'ex-key-fs' });
      fs.forEach(function (it) {
        var one = h('div', { class: 'ex-key-f' });
        one.appendChild(h('span', { class: 'ex-f', text: String(it.f) }));
        if (it.m) one.appendChild(h('span', { class: 'ex-fm', text: String(it.m) }));
        wrap.appendChild(one);
      });
      box.appendChild(wrap);
    } else {
      box.appendChild(h('p', { class: 'ex-key-empty', text: '这题不用套公式，判断依据在上面的考点里。' }));
    }
    return box;
  }

  /* 把解析原文压成「去空白」串，同时记住每个字符在原文的位置，方便回切 */
  function flatOf(s) {
    var out = '', map = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (/\s/.test(c)) continue;
      out += (c === '＝' ? '=' : c);
      map.push(i);
    }
    return { flat: out, map: map };
  }

  /* 解析里出现的公式加底色：只在本题公式表里出现过才标，找不到就原样输出 */
  function hlFormula(text, q) {
    var src = String(text || '');
    var fs = formulasOf(q);
    if (!src || !fs.length) return esc(src);
    var f = flatOf(src), hits = [];
    fs.forEach(function (it) {
      /* 只按「分句符号」拆，不按「·」拆：· 在物理式子里常常是乘号 */
      String(it.f).split(/[；;、→]/).forEach(function (seg) {
        var s = seg.trim();
        if (s.length < 4 || !/[=＝<>＜＞→⇔]/.test(s)) return;
        var sf = flatOf(s).flat;
        if (sf.length < 4) return;
        var from = 0, at;
        while ((at = f.flat.indexOf(sf, from)) >= 0) {
          hits.push([f.map[at], f.map[at + sf.length - 1] + 1]);
          from = at + sf.length;
        }
      });
    });
    if (!hits.length) return esc(src);
    hits.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    hits.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    var out = '', cur = 0;
    merged.forEach(function (r) {
      if (r[0] > cur) out += esc(src.slice(cur, r[0]));
      out += '<b class="ex-inkey">' + esc(src.slice(r[0], r[1])) + '</b>';
      cur = r[1];
    });
    return out + esc(src.slice(cur));
  }

  /* 题图块：按 SPEC 第 6 节，默认宽度 100%、最大 720px，点击可全屏 */
  function imgBlock(src, alt) {
    var box = UI.imgs(src, alt);
    box.classList.add('ex-imgs');
    return box;
  }

  /* 把当前题写进地址栏（只改 hash，不触发 hashchange），刷新/收藏能回到这题 */
  function syncHash(h) {
    try { window.history.replaceState(null, '', '#' + h); } catch (e) { }
  }

  /* 一套题的统计（selfcheck 不判分，单独计数） */
  function packStat(pack) {
    var rec = packRec(pack.id), qs = qsOf(pack);
    var graded = 0, gradedDone = 0, ok = 0, selfTotal = 0, nextId = '';
    qs.forEach(function (q) {
      var r = rec[q.id];
      if (isSelf(q)) { selfTotal++; return; }
      graded++;
      if (r) { gradedDone++; if (r.ok) ok++; }
      else if (!nextId) nextId = q.id;
    });
    return {
      total: qs.length, graded: graded, gradedDone: gradedDone,
      selfTotal: selfTotal, ok: ok, wrong: gradedDone - ok,
      rate: gradedDone ? ok / gradedDone : null, nextId: nextId
    };
  }

  /* 标准答案文字：优先 ansText，其次由 ans/fields 推 */
  function ansText(q) {
    if (q.ansText) return q.ansText;
    if (q.type === 'choice') return lettersOf(q.ans);
    if (q.fields && q.fields.length) {
      return q.fields.map(function (f) {
        var v = '';
        if (f.type === 'coef') {
          v = String(f.tpl || '').replace(/\{(\d+)\}/g, function (_, n) {
            var a = f.ans || [];
            return a[+n] !== undefined ? a[+n] : '?';
          });
        } else if (Array.isArray(f.ans)) v = String(f.ans[0]);
        else v = String(f.ans);
        return (f.label ? f.label + ' ' : '') + v + (f.unit || '');
      }).join('；');
    }
    return '';
  }

  /* 学生填了什么（用于"你填的"） */
  function userText(q, user) {
    if (user === undefined || user === null || user === '') return '';
    if (q.type === 'choice') return lettersOf(user);
    if (q.fields) {
      var out = [];
      q.fields.forEach(function (f, i) {
        var v = user[i];
        if (v === undefined || v === null || v === '') return;
        if (Array.isArray(v)) v = v.join(' / ');
        out.push((f.label ? f.label + ' ' : '') + v + (f.unit || ''));
      });
      return out.join('；');
    }
    return String(user);
  }

  /* 把上次填的答案填回表单（fields 不支持 setValues，只能操作 DOM / 模拟点击） */
  function prefillForm(form, fields, user) {
    var wraps = form.el.querySelectorAll('.field');
    fields.forEach(function (f, i) {
      var w = wraps[i];
      if (!w || !user) return;
      var v = user[i];
      if (f.type === 'coef') {
        var ins = w.querySelectorAll('input');
        if (Array.isArray(v)) {
          Array.prototype.forEach.call(ins, function (inp, k) {
            if (v[k] !== undefined && v[k] !== null) inp.value = v[k];
          });
        }
      } else if (f.type === 'choice') {
        var bs = w.querySelectorAll('button');
        if (v !== null && v !== undefined && bs[v]) bs[v].click();
      } else {
        var inp = w.querySelector('input');
        if (inp && v !== null && v !== undefined) inp.value = v;
      }
    });
  }

  /* 选项区 */
  function choiceArea(host, q, rec) {
    var multi = Array.isArray(q.ans);
    var sel = [];
    if (rec && rec.user !== undefined && rec.user !== null) {
      sel = Array.isArray(rec.user) ? rec.user.slice() : [rec.user];
    }
    var box = h('div', { class: 'opts' });
    var btns = [];
    (q.opts || []).forEach(function (text, i) {
      var b = h('button', { class: 'opt', type: 'button' });
      b.appendChild(h('span', { class: 'k', text: letter(i) }));
      b.appendChild(h('span', { class: 'ex-opttext', text: text }));
      b.addEventListener('click', function () {
        if (multi) {
          var p = sel.indexOf(i);
          if (p >= 0) sel.splice(p, 1);
          else {
            if (sel.length >= (q.ans || []).length) { UI.toast('这题最多选 ' + q.ans.length + ' 项', 'info'); return; }
            sel.push(i);
          }
        } else {
          sel = [i];
        }
        paint();
      });
      box.appendChild(b);
      btns.push(b);
    });
    host.appendChild(box);
    if (multi) host.appendChild(h('p', { class: 'tiny muted', style: 'margin-top:6px', text: '多选题：这题要选 ' + (q.ans || []).length + ' 项。' }));

    function paint() {
      btns.forEach(function (b, i) { b.classList.toggle('sel', sel.indexOf(i) >= 0); });
    }
    function markCorrect(show) {
      btns.forEach(function (b, i) {
        b.classList.remove('ok', 'no', 'dim');
        if (!show) return;
        var chosen = sel.indexOf(i) >= 0;
        var correct = multi ? (q.ans || []).indexOf(i) >= 0 : i === q.ans;
        if (correct) b.classList.add('ok');
        else if (chosen) b.classList.add('no');
        else b.classList.add('dim');
      });
    }
    paint();
    return {
      read: function () {
        var user = multi ? sel.slice() : (sel.length ? sel[0] : null);
        return {
          filled: multi ? sel.length > 0 : sel.length === 1,
          allFilled: true,
          user: user,
          ok: (multi ? sel.length > 0 : sel.length === 1) && PHYS.judge.choice(user, q.ans)
        };
      },
      mark: markCorrect,
      focus: function () { if (btns[0]) btns[0].focus(); }
    };
  }

  /* 数值 / 文本字段区 */
  function fieldsArea(host, q, rec, onEnter) {
    var form = UI.fields(q.fields, { onEnter: onEnter });
    host.appendChild(form.el);
    if (rec && rec.user !== undefined && rec.user !== null) prefillForm(form, q.fields, rec.user);
    return {
      read: function () {
        var vals = form.values();
        var res = form.check();
        var any = res.some(function (r) { return r.filled; });
        var all = res.every(function (r) { return r.filled; });
        var ok = any && all && res.every(function (r) { return r.ok; });
        return { filled: any, allFilled: all, ok: ok, user: vals, res: res };
      },
      mark: function (res) { form.mark(res || []); },
      focus: function () { form.focus(); }
    };
  }

  /* ---------------- 试卷练习 ---------------- */
  var V = null; // 当前做题视图：{pack, order:[题下标], pos, mode:'all'|'wrong'}

  function renderList(root) {
    root.innerHTML = '';
    var ps = packs();
    var wrongN = PHYS.progress.wrongList().filter(function (w) { return w.kind === 'exam'; }).length;

    var intro = h('div', { class: 'card' });
    intro.innerHTML =
      '<div class="row"><h2 style="margin:0">试卷练习</h2><span class="spacer"></span>' +
      '<span class="pill">' + ps.length + ' 套题</span></div>' +
      '<p class="small muted" style="margin-top:6px">做法：<b>先在纸上把整张卷子做完</b>，再回来一题一题录答案。这里只帮你对答案、看解析、收错题，不排名、不打分。</p>';
    var links = h('div', { class: 'row', style: 'margin-top:10px' });
    links.appendChild(h('a', { class: 'btn ex-link', href: '#/wrong', text: '错题本（' + wrongN + ' 道试卷错题）→' }));
    if (guidedItems().length) links.appendChild(h('a', { class: 'btn ex-link', href: '#/guided', text: '先走五步引导 →' }));
    intro.appendChild(links);
    root.appendChild(intro);

    if (!ps.length) {
      var e = h('div', { class: 'card' });
      e.innerHTML = '<h2>还没有题包</h2>' +
        '<p class="small muted" style="margin-top:6px">题库里还没放周练原卷。先去「五步引导」把五步走通，等家长把题包放进 <code>题库/</code> 再来这里。</p>';
      root.appendChild(e);
      return;
    }
    ps.forEach(function (p) { root.appendChild(packCard(p)); });
  }

  function packCard(p) {
    var st = packStat(p);
    var card = h('div', { class: 'card' });

    var head = h('div', { class: 'row' });
    head.appendChild(h('h3', { class: 'ex-name', text: p.name }));
    head.appendChild(h('span', { class: 'spacer' }));
    if (!st.gradedDone) head.appendChild(h('span', { class: 'pill', text: '还没做' }));
    else if (st.wrong > 0) head.appendChild(h('span', { class: 'tag tag-bad', text: st.wrong + ' 道错' }));
    else head.appendChild(h('span', { class: 'tag tag-ok', text: '全对' }));
    card.appendChild(head);

    if (p.draft) {
      card.appendChild(h('p', { class: 'fb warn', style: 'margin:8px 0 0;padding:7px 11px;font-size:12.5px',
        text: '草稿题包：选择题已能自动判分；填空/解答题暂时只给原卷答案（点「看答案」对照），解析待补。' }));
    }

    var sub = [];
    if (p.exam) sub.push(p.exam);
    if (p.source) sub.push('来源：' + p.source);
    if (sub.length) card.appendChild(h('p', { class: 'ex-sub', text: sub.join(' · ') }));

    var tags = h('div', { class: 'ex-tags' });
    (p.topics || []).forEach(function (t) { tags.appendChild(h('span', { class: 'tag', text: t })); });
    var seenTag = {};
    qsOf(p).slice(0, 4).forEach(function (q) {
      (q.tags || []).forEach(function (t) {
        if (seenTag[t]) return;
        seenTag[t] = true;
        tags.appendChild(h('span', { class: 'tag-soft', text: t }));
      });
    });
    if (tags.children.length) card.appendChild(tags);

    var line = '共 ' + st.graded + ' 题（判分）· 已录 ' + st.gradedDone;
    if (st.gradedDone) line += ' · 对 ' + st.ok + ' · 错 ' + st.wrong + ' · 正确率 ' + U.fmtPct(st.rate);
    if (st.selfTotal) line += ' · 另有 ' + st.selfTotal + ' 题对答案不判分';
    card.appendChild(h('p', { class: 'ex-statline', text: line }));
    card.appendChild(barEl(st.graded ? st.gradedDone / st.graded : 0,
      st.rate === null ? '' : (st.rate >= 0.75 ? 'ok' : (st.rate >= 0.4 ? '' : 'warn'))));

    if (p.note) card.appendChild(h('p', { class: 'tiny muted', style: 'margin-top:8px', text: '备注：' + p.note }));

    var btns = h('div', { class: 'ex-btns' });
    var startText = !st.gradedDone ? '开始练' : (st.gradedDone >= st.graded ? '重做一遍' : '继续（第 ' + nextNo(p, st) + ' 题）');
    var start = h('button', { class: 'btn btn-primary', type: 'button', text: startText });
    start.addEventListener('click', function () {
      PHYS.route.go('exam/' + encodeURIComponent(p.id), st.nextId ? { q: st.nextId } : {});
    });
    btns.appendChild(start);

    if (st.wrong > 0) {
      var only = h('button', { class: 'btn', type: 'button', text: '只练错的 ' + st.wrong + ' 道' });
      only.addEventListener('click', function () {
        PHYS.route.go('exam/' + encodeURIComponent(p.id), { only: 'wrong' });
      });
      btns.appendChild(only);
    }
    card.appendChild(btns);
    return card;
  }

  function nextNo(p, st) {
    var q = st.nextId ? findQ(p, st.nextId) : null;
    return q ? q.no : '?';
  }

  function renderMissingPack(root, pid) {
    root.innerHTML = '';
    var card = h('div', { class: 'card' });
    card.innerHTML = '<h2>找不到这套题</h2>' +
      '<p class="small muted" style="margin-top:6px">题包 <code>' + esc(pid) + '</code> 不在题库里，可能题库更新过。</p>' +
      '<p class="small muted">不用慌，记录都还在。回题包列表重新选一套就行。</p>';
    var b = h('a', { class: 'btn btn-primary ex-link', href: '#/exam', style: 'margin-top:12px', text: '← 回题包列表' });
    card.appendChild(b);
    root.appendChild(card);
  }

  function renderEmptyPack(root, pack) {
    root.innerHTML = '';
    var card = h('div', { class: 'card' });
    card.innerHTML = '<h2>' + esc(pack.name) + '</h2>' +
      '<p class="small muted" style="margin-top:6px">这套题包里还没有题目。</p>';
    card.appendChild(h('a', { class: 'btn ex-link', href: '#/exam', style: 'margin-top:10px', text: '← 回题包列表' }));
    root.appendChild(card);
  }

  function renderQ(root) {
    var pack = V.pack, qs = qsOf(pack);
    var qi = V.order[V.pos];
    var q = qs[qi];
    if (!q) { renderResult(root); return; }
    var rec = recOf(pack.id, q.id);
    var rerender = function () { renderQ(root); window.scrollTo(0, 0); };
    var st = packStat(pack);

    root.innerHTML = '';

    /* 顶栏 */
    var bar = h('div', { class: 'ex-bar' });
    bar.appendChild(h('a', { class: 'btn-ghost', href: '#/exam', text: '← 题包' }));
    bar.appendChild(h('span', { class: 'ex-title', text: pack.name }));
    bar.appendChild(h('span', { class: 'spacer' }));
    bar.appendChild(h('span', { class: 'pill', text: (V.mode === 'wrong' ? '只练错的 · ' : '') + '第 ' + (V.pos + 1) + ' / ' + V.order.length + ' 题' }));
    root.appendChild(bar);

    /* 整套进度 */
    var pr = h('div', { class: 'ex-prog' });
    pr.appendChild(h('span', { text: '整套已录 ' + st.gradedDone + ' / ' + st.graded + ' · 对 ' + st.ok }));
    pr.appendChild(barEl(st.graded ? st.gradedDone / st.graded : 0,
      st.rate === null ? '' : (st.rate >= 0.75 ? 'ok' : (st.rate >= 0.4 ? '' : 'warn'))));
    root.appendChild(pr);

    /* 题目卡 */
    var card = h('div', { class: 'card' });
    var head = h('div', { class: 'qhead' });
    head.appendChild(h('span', { class: 'stepbadge', text: String(q.no || '?') }));
    if (q.group) head.appendChild(h('span', { class: 'tag', text: q.group }));
    (q.tags || []).forEach(function (t) { head.appendChild(h('span', { class: 'tag-soft', text: t })); });
    if (rec) {
      head.appendChild(h('span', { class: 'tag ' + (rec.ok ? 'tag-ok' : 'tag-bad'), text: rec.ok ? '上次做对' : '上次做错' }));
      if (rec.tries > 1) head.appendChild(h('span', { class: 'pill', text: '第 ' + rec.tries + ' 次' }));
    }
    if (q.diff) head.appendChild(h('span', { class: 'pill', text: '难度 ' + q.diff }));
    card.appendChild(head);

    /* 有原题图时以图为准（和卷面一致）；文字版折叠起来，避免重复占屏 */
    if (q.askImg) {
      card.appendChild(imgBlock(q.askImg, '第 ' + q.no + ' 题原题'));
      card.appendChild(h('p', { class: 'tiny muted', style: 'margin:-4px 0 2px;text-align:center', text: '点图可放大 · 图上已印有选项，下面点选作答' }));
      if (q.stem) card.appendChild(h('p', { class: 'small muted', style: 'margin-top:6px', text: q.stem }));
      if (q.ask) {
        var txtBox = h('div', { class: 'stem', text: q.ask });
        txtBox.style.display = 'none';
        var tg = h('button', { class: 'btn-ghost', type: 'button', text: '显示文字版 ▾', style: 'padding-left:0;margin-top:4px' });
        tg.addEventListener('click', function () {
          var show = txtBox.style.display === 'none';
          txtBox.style.display = show ? 'block' : 'none';
          tg.textContent = show ? '收起文字版 ▴' : '显示文字版 ▾';
        });
        card.appendChild(tg);
        card.appendChild(txtBox);
      }
    } else {
      if (q.ask) card.appendChild(h('div', { class: 'stem', text: q.ask }));
      if (q.stem) card.appendChild(h('p', { class: 'small muted', style: 'margin-top:6px', text: q.stem }));
      card.appendChild(h('div', { class: 'fb warn', text: '这题没有原题图，先按上面的文字作答；看不清就回原卷核对。' }));
    }

    /* 作答区 */
    var area = h('div', { class: 'ex-area' });
    var reader = null;
    var submitBtn = h('button', { class: 'btn btn-primary', type: 'button', text: '提交本题' });
    var selfRevealed = false;
    var fbHost = h('div', { class: 'ex-feedback' });

    function doSubmit() {
      if (isSelf(q)) { revealSelf(); return; }
      if (!reader) { UI.toast('这题暂时没法判分，先跳过', 'info'); return; }
      var r = reader.read();
      if (!r.filled) {
        UI.toast('还没填，先把你的答案写上', 'bad');
        if (reader.focus) { try { reader.focus(); } catch (e) { } }
        return;
      }
      if (r.allFilled === false) { UI.toast('还有空没填完，检查一下', 'info'); return; }
      PHYS.progress.examAnswer({ packId: pack.id, qid: q.id, ok: r.ok, user: r.user });
      if (PHYS.shell && PHYS.shell.refreshChip) PHYS.shell.refreshChip();
      renderQ(root);
      var fb = root.querySelector('.ex-feedback');
      if (fb && fb.scrollIntoView) { try { fb.scrollIntoView({ block: 'center' }); } catch (e) { } }
    }

    if (isSelf(q)) {
      area.appendChild(h('div', { class: 'fb info', text: '这题不判分：答案可能不止一种写法。先自己在纸上写完整，再点下面看答案图。' }));
      submitBtn.textContent = '我写完了 · 看答案与解析';
    } else if (q.type === 'choice') {
      reader = choiceArea(area, q, rec);
    } else if (q.fields && q.fields.length) {
      reader = fieldsArea(area, q, rec, doSubmit);
    } else {
      area.appendChild(h('div', { class: 'fb warn', text: '这题的判分字段没配好（缺 fields），先跳过这题，告诉家长补题库。' }));
      submitBtn.disabled = true;
    }
    card.appendChild(area);

    var acts = h('div', { class: 'ex-btns' });
    acts.appendChild(submitBtn);
    if (!isSelf(q) && rec) acts.appendChild(h('span', { class: 'tiny muted', text: '改答案后可以再提交一次（覆盖上次记录）' }));
    card.appendChild(acts);
    card.appendChild(fbHost);

    submitBtn.addEventListener('click', doSubmit);

    /* 已做过的题：回显上次的判分 + 答案 */
    if (!isSelf(q) && rec && rec.user !== undefined && reader) {
      try {
        if (q.type === 'choice') reader.mark(true);
        else { var rr = reader.read(); if (rr.res) reader.mark(rr.res); }
      } catch (e) { }
      buildAnswer();
    }
    if (isSelf(q) && selfRevealed) buildAnswer();
    function revealSelf() {
      if (selfRevealed) return;
      selfRevealed = true;
      buildAnswer();
      submitBtn.disabled = true;
      submitBtn.textContent = '答案已展开';
      var fb2 = root.querySelector('.ex-feedback');
      if (fb2 && fb2.scrollIntoView) { try { fb2.scrollIntoView({ block: 'center' }); } catch (e) { } }
    }

    /* 反馈 + 答案 + 解析 */
    function buildAnswer() {
      fbHost.innerHTML = '';
      var ok = rec ? !!rec.ok : false;
      if (!isSelf(q)) {
        var fb = h('div', { class: 'fb ' + (ok ? 'ok' : 'bad') });
        if (ok) {
          fb.innerHTML = '<b>对了。</b>' + (rec.tries > 1
            ? '这是第 ' + rec.tries + ' 次做，能改过来就是真的会了——记住这次是怎么想的。'
            : '思路保持住，下一题也照这样走。');
        } else {
          fb.innerHTML = '<b>这题没对上。</b>不扣分，也不批评。已经放进错题本，过两天再来一次就行。';
        }
        fbHost.appendChild(fb);

        if (!ok) {
          var f = focusOf(q), fi = focusIndex(q);
          var warn = h('div', { class: 'fb warn', style: 'margin-top:8px' });
          warn.innerHTML = f
            ? '<b>大概率断在第 ' + fi + ' 步「' + esc(f.n) + '」</b><br>' + esc(f.ask) +
            '<br><span class="tiny">下一步：只回这一步想 20 秒，再把这题重做一遍，不用从头算。</span>'
            : '<b>下一步：</b>把题目拆成「情境 → 条件 → 规律 → 代入 → 验结果」五步，看自己卡在哪一步。';
          fbHost.appendChild(warn);
        }
      }

      /* 正确答案 */
      var ansLine = h('div', { class: 'row ex-ansline' });
      ansLine.appendChild(h('span', { class: 'tag', text: isSelf(q) ? '参考答案（不判分）' : '正确答案' }));
      ansLine.appendChild(h('b', { text: ansText(q) || '见下方答案图' }));
      fbHost.appendChild(ansLine);

      if (!isSelf(q) && !ok && rec) {
        var mine = userText(q, rec.user);
        if (mine) fbHost.appendChild(h('p', { class: 'small muted', style: 'margin-top:4px', text: '你填的是：' + mine }));
      }

      /* 考点 · 公式：放在解析最前面，先锁定「考什么、用哪条式子」 */
      var kb = keyBlock(q);
      if (kb) fbHost.appendChild(kb);

      /* 答案图：默认折叠，先想后看 */
      if (q.ansImg) {
        var abtn = h('button', { class: 'btn ex-ansbtn', type: 'button', text: '先自己再想一遍 · 看答案图' });
        var abox = h('div', { class: 'ex-ansbox', style: 'display:none' });
        abox.appendChild(imgBlock(q.ansImg, '第 ' + q.no + ' 题参考答案'));
        abtn.addEventListener('click', function () {
          var open = abox.style.display !== 'none';
          abox.style.display = open ? 'none' : '';
          abtn.classList.toggle('open', !open);
          abtn.textContent = open ? '先自己再想一遍 · 看答案图' : '收起答案图';
        });
        fbHost.appendChild(abtn);
        fbHost.appendChild(abox);
      } else if (!isSelf(q)) {
        fbHost.appendChild(h('p', { class: 'tiny muted', style: 'margin-top:8px', text: '这题没有答案图，答案以原卷参考答案为准。' }));
      }

      /* 解析 */
      var solArr = q.solution ? (Array.isArray(q.solution) ? q.solution : [q.solution]) : [];
      if (solArr.length || q.tip) {
        var sol = h('div', { class: 'sol' });
        if (solArr.length) {
          sol.appendChild(h('h4', { text: '解析' }));
          var ol = h('ol');
          solArr.forEach(function (s) {
            var li = h('li');
            li.innerHTML = hlFormula(s, q);
            ol.appendChild(li);
          });
          sol.appendChild(ol);
        }
        if (q.tip) sol.appendChild(h('div', { class: 'tip', text: '一句话记住：' + q.tip }));
        fbHost.appendChild(sol);
      }

      /* 最后一题：直接给"完成整卷" */
      if (V.pos === V.order.length - 1) {
        var finInline = h('button', { class: 'btn btn-primary', type: 'button', text: '这题是最后一题 → 完成整卷', style: 'margin-top:12px;width:100%;min-height:42px' });
        finInline.addEventListener('click', function () { renderResult(root); });
        fbHost.appendChild(finInline);
      }
    }

    root.appendChild(card);

    /* 导航 */
    var nav = h('div', { class: 'ex-nav' });
    var prev = h('button', { class: 'btn', type: 'button', text: '← 上一题' });
    prev.disabled = V.pos <= 0;
    prev.addEventListener('click', function () { if (V.pos > 0) { V.pos--; rerender(); } });
    nav.appendChild(prev);

    var last = V.pos >= V.order.length - 1;
    var next = h('button', {
      class: 'btn ' + (last ? 'btn-primary' : ''), type: 'button',
      text: last ? '完成整卷，看结果' : '下一题 →'
    });
    next.addEventListener('click', function () {
      if (last) renderResult(root); else { V.pos++; rerender(); }
    });
    nav.appendChild(next);

    var jumpBtn = h('button', { class: 'btn-ghost', type: 'button', text: '题号清单' });
    nav.appendChild(jumpBtn);

    var fin = h('button', { class: 'btn-ghost', type: 'button', text: '整卷结果' });
    fin.addEventListener('click', function () { renderResult(root); });
    if (!last && st.gradedDone >= st.graded) fin.className = 'btn btn-primary';
    nav.appendChild(fin);
    root.appendChild(nav);

    /* 跳题清单 */
    var jumpBox = h('div', { class: 'ex-jump', style: 'display:none' });
    V.order.forEach(function (qi2, pos) {
      var qq = qs[qi2] || {};
      var r2 = recOf(pack.id, qq.id);
      var cls = 'ex-num' + (pos === V.pos ? ' on' : '') + (r2 ? (r2.ok ? ' ok' : ' no') : '');
      var b = h('button', { class: cls, type: 'button', title: '第 ' + qq.no + ' 题', text: String(qq.no || '?') });
      b.addEventListener('click', function () { V.pos = pos; rerender(); });
      jumpBox.appendChild(b);
    });
    jumpBtn.addEventListener('click', function () {
      var open = jumpBox.style.display !== 'none';
      jumpBox.style.display = open ? 'none' : '';
      if (!open) jumpBox.scrollIntoView && jumpBox.scrollIntoView({ block: 'nearest' });
    });
    root.appendChild(jumpBox);

    /* 地址栏跟随当前题（只在整卷模式；只练错的模式刷新后回到"只练错的"） */
    if (V.mode === 'all') syncHash('/exam/' + encodeURIComponent(pack.id) + '?q=' + encodeURIComponent(q.id));
  }

  function renderResult(root) {
    var pack = V.pack, qs = qsOf(pack), rec = packRec(pack.id);
    var st = packStat(pack);
    /* 本卷考点：用规范考点标签按题序去重，比 point 整句更适合做标签 */
    var keyNames = [], keySeen = {};
    qs.forEach(function (q) {
      (q.tags || []).forEach(function (t) {
        if (!t || keySeen[t]) return;
        keySeen[t] = true;
        keyNames.push(t);
      });
    });
    var wrong = [], undone = [];
    qs.forEach(function (q, i) {
      if (isSelf(q)) return;
      var r = rec[q.id];
      if (!r) undone.push({ q: q, i: i });
      else if (!r.ok) wrong.push({ q: q, i: i, r: r });
    });
    root.innerHTML = '';

    var bar = h('div', { class: 'ex-bar' });
    bar.appendChild(h('a', { class: 'btn-ghost', href: '#/exam', text: '← 题包' }));
    bar.appendChild(h('span', { class: 'ex-title', text: pack.name }));
    bar.appendChild(h('span', { class: 'spacer' }));
    bar.appendChild(h('span', { class: 'pill', text: '整卷结果' }));
    root.appendChild(bar);

    var card = h('div', { class: 'card' });
    card.appendChild(h('h2', { text: pack.name + ' · 结果' }));

    var score = h('div', { class: 'ex-score' });
    var mega = h('div', { class: 'ex-mega' + (!wrong.length && !undone.length && st.graded ? ' ok' : '') });
    mega.innerHTML = st.ok + '<span style="font-size:15px;font-weight:600;color:var(--muted)"> / ' + st.graded + ' 题</span>';
    score.appendChild(mega);
    var meta = h('div', { class: 'small muted' });
    meta.innerHTML = (st.rate === null ? '还没开始录' : '正确率 ' + U.fmtPct(st.rate)) +
      '<br>已录 ' + st.gradedDone + ' / ' + st.graded + ' 题' +
      (st.selfTotal ? ' · ' + st.selfTotal + ' 题对答案不判分' : '');
    score.appendChild(meta);
    card.appendChild(score);
    card.appendChild(barEl(st.graded ? st.gradedDone / st.graded : 0,
      st.rate === null ? '' : (st.rate >= 0.75 ? 'ok' : (st.rate >= 0.4 ? '' : 'warn'))));

    if (!wrong.length && !undone.length && st.graded) {
      var good = h('div', { class: 'fb ok', style: 'margin-top:12px' });
      good.innerHTML = '<b>这一套全对了。</b>下一步：过一两周再回来做一遍，看是不是还这么顺；顺手去「错题回炉」看看别的断点。';
      card.appendChild(good);
    }
    if (keyNames.length) {
      var kbox = h('div', { style: 'margin-top:14px' });
      kbox.appendChild(h('div', { class: 'small', style: 'font-weight:700;margin-bottom:7px', text: '这张卷子考了这些（按题序去重）' }));
      var ktags = h('div', { class: 'ex-tags' });
      keyNames.forEach(function (n) { ktags.appendChild(h('span', { class: 'tag-soft', text: n })); });
      kbox.appendChild(ktags);
      card.appendChild(kbox);
    }
    if (undone.length) {
      var un = h('div', { class: 'fb warn', style: 'margin-top:12px' });
      un.innerHTML = '<b>还有 ' + undone.length + ' 题没录：</b>第 ' + undone.map(function (x) { return x.q.no; }).join('、') + ' 题。';
      var goUndone = h('button', { class: 'btn-mini', type: 'button', text: '接着录 →', style: 'margin-top:8px' });
      goUndone.addEventListener('click', function () {
        V.mode = 'all'; V.order = qs.map(function (_, i) { return i; }); V.pos = undone[0].i;
        renderQ(root);
      });
      un.appendChild(goUndone);
      card.appendChild(un);
    }
    if (wrong.length) {
      card.appendChild(h('h3', { style: 'margin-top:14px', text: '错的 ' + wrong.length + ' 题（点重做，当场改）' }));
      var list = h('div', { class: 'ex-wlist' });
      wrong.forEach(function (it) {
        var row = h('div', { class: 'ex-wrow' });
        var main = h('div', { class: 'ex-wmain' });
        main.appendChild(h('div', { class: 'ex-wtitle', text: '第 ' + it.q.no + ' 题 · ' + (it.q.tags || []).join(' / ') }));
        if (it.q.point) main.appendChild(h('div', { class: 'tiny', style: 'color:var(--brand-d);margin-top:2px', text: '考点：' + it.q.point }));
        var mine = userText(it.q, it.r.user);
        main.appendChild(h('div', { class: 'tiny muted', text: '你的答案：' + (mine || '（空）') }));
        row.appendChild(main);
        var rb = h('button', { class: 'btn', type: 'button', text: '重做 →' });
        rb.addEventListener('click', function () {
          V.mode = 'all'; V.order = qs.map(function (_, i) { return i; }); V.pos = it.i;
          renderQ(root);
        });
        row.appendChild(rb);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    var btns = h('div', { class: 'ex-btns' });
    if (wrong.length) {
      var only = h('button', { class: 'btn btn-primary', type: 'button', text: '只练错的 ' + wrong.length + ' 道' });
      only.addEventListener('click', function () {
        V.mode = 'wrong'; V.order = wrong.map(function (x) { return x.i; }); V.pos = 0; renderQ(root);
      });
      btns.appendChild(only);
    }
    var again = h('button', { class: 'btn', type: 'button', text: '再来一遍' });
    again.addEventListener('click', function () {
      V.mode = 'all'; V.order = qs.map(function (_, i) { return i; }); V.pos = 0; renderQ(root);
    });
    btns.appendChild(again);
    btns.appendChild(h('a', { class: 'btn', href: '#/exam', text: '回题包列表' }));
    btns.appendChild(h('a', { class: 'btn-ghost', href: '#/wrong', text: '去错题回炉 →' }));
    card.appendChild(btns);
    root.appendChild(card);
    syncHash('/exam/' + encodeURIComponent(pack.id));
  }

  PHYS.registry.register({
    id: 'exam', title: '试卷练习', short: '试卷', icon: '▤', order: 20,
    desc: '把整张卷子在纸上做完，再一题一题录答案、对解析。错题自动进错题本。',
    mount: function (root, params) {
      params = params || {};
      var pid = params._arg;
      if (!pid) { V = null; renderList(root); return; }
      var pack = findPack(pid);
      if (!pack) { V = null; renderMissingPack(root, pid); return; }
      if (!qsOf(pack).length) { V = null; renderEmptyPack(root, pack); return; }

      V = { pack: pack, order: [], pos: 0, mode: 'all' };
      var all = qsOf(pack).map(function (_, i) { return i; });

      if (params.only === 'wrong') {
        var wr = [];
        all.forEach(function (i) {
          var q = qsOf(pack)[i];
          if (isSelf(q)) return;
          var r = recOf(pack.id, q.id);
          if (r && !r.ok) wr.push(i);
        });
        if (wr.length) { V.mode = 'wrong'; V.order = wr; } else { V.order = all; UI.toast('这套已经没有错题了', 'ok'); }
      } else {
        V.order = all;
      }

      if (params.q) {
        var at = V.order.indexOf(qIndexOf(pack, params.q));
        if (at >= 0) V.pos = at;
        else {
          var valid = qIndexOf(pack, params.q);
          if (valid >= 0) { V.mode = 'all'; V.order = all; V.pos = valid; }
        }
      } else if (V.mode === 'all') {
        /* 续做：第一道没录的题 */
        for (var i = 0; i < V.order.length; i++) {
          if (!recOf(pack.id, qsOf(pack)[V.order[i]].id)) { V.pos = i; break; }
        }
      }
      renderQ(root);
    },
    unmount: function () { V = null; }
  });

  /* ---------------- 错题回炉 ---------------- */
  function wrongGroups() {
    var out = { guided: [], exam: [], concept: [] };
    PHYS.progress.wrongList().forEach(function (w) {
      if (out[w.kind]) out[w.kind].push(w);
    });
    return out;
  }

  function guidedInfo(w) {
    var g = null, pack = null, q = null;
    guidedItems().forEach(function (x) { if (!g && x.questionId === w.qid) g = x; });
    packs().forEach(function (p) {
      if (pack) return;
      var qq = findQ(p, w.qid);
      if (qq) { pack = p; q = qq; }
    });
    var label = g && g.title ? g.title : (pack && q ? pack.name + ' 第 ' + q.no + ' 题' : '五步引导题 ' + w.qid);
    var note = [];
    if (q && focusOf(q)) note.push('卡在「' + focusOf(q).n + '」');
    else note.push('五步没走通');
    if (q && q.tags) note.push(q.tags.join(' / '));
    return {
      label: label, href: '#/guided?q=' + encodeURIComponent(w.qid),
      tagText: '五步引导', tagCls: 'tag-soft', note: note.join(' · ')
    };
  }

  function examInfo(w) {
    var p = findPack(w.packId), q = p ? findQ(p, w.qid) : null;
    var label = p
      ? p.name + ' · 第 ' + (q ? q.no : '?') + ' 题'
      : '题包 ' + w.packId + ' 的题 ' + w.qid;
    var note = [];
    if (q && q.point) note.push(q.point);
    else if (q && q.tags) note.push(q.tags.join(' / '));
    if (q && focusOf(q)) note.push('断点：' + focusOf(q).n);
    if (q && q.ask) note.push(q.ask.length > 26 ? q.ask.slice(0, 26) + '…' : q.ask);
    if (!p) note.push('（题包可能已更新）');
    return {
      label: label, href: '#/exam/' + encodeURIComponent(w.packId) + '?q=' + encodeURIComponent(w.qid),
      tagText: '试卷练习', tagCls: 'tag', note: note.join(' · ')
    };
  }

  function conceptInfo(w) {
    var c = null;
    concepts().forEach(function (x) { if (!c && x.id === w.cid) c = x; });
    var note = [];
    if (c && c.tags) note.push(c.tags.join(' / '));
    /* 概念错卡不会自动清（答错过就留着），这里提示最近一次是否已经答对，方便判断能不能勾掉 */
    var r = PHYS.store.get('concept.' + w.cid, null);
    if (r && r.streak > 0) note.push('最近一次已经答对：确认真会了就勾掉');
    else note.push('到「概念闪练」找这张卡重做');
    var extra = (r && r.n) ? '（练过 ' + r.n + ' 次，对 ' + r.ok + ' 次）' : '';
    return {
      label: c ? c.q : '概念卡 ' + w.cid,
      href: '#/concept', tagText: '概念闪练', tagCls: 'tag-soft', note: note.join(' · ') + extra
    };
  }

  var KIND_META = {
    guided: { name: '五步断点', info: guidedInfo, hint: '五步引导没走通的地方' },
    exam: { name: '试卷错题', info: examInfo, hint: '试卷练习里做错的题' },
    concept: { name: '概念错卡', info: conceptInfo, hint: '概念闪练里答错的卡（答错过就留着，手动勾「我会了」才清）' }
  };

  function renderWrong(root, kind) {
    kind = kind || 'all';
    var g = wrongGroups();
    var total = g.guided.length + g.exam.length + g.concept.length;
    root.innerHTML = '';

    var head = h('div', { class: 'card' });
    head.innerHTML = '<div class="row"><h2 style="margin:0">错题回炉</h2><span class="spacer"></span>' +
      '<span class="pill">共 ' + total + ' 条</span></div>' +
      '<p class="small muted" style="margin-top:6px">这里只放「还没清掉」的断点。清掉的标准很简单：<b>不看答案，自己能完整做一遍</b>。只是「看过了」不算清。</p>';

    /* 三个统计（点一下 = 只看这一类） */
    var stats = h('div', { class: 'ex-wstats' });
    ['guided', 'exam', 'concept'].forEach(function (k) {
      stats.appendChild(statBtn(k, g[k].length, KIND_META[k].name, kind, root));
    });
    head.appendChild(stats);

    /* 筛选 chips */
    var chips = h('div', { class: 'ex-chips' });
    [['all', '全部'], ['guided', '只看五步'], ['exam', '只看试卷'], ['concept', '只看概念']].forEach(function (p) {
      var b = h('button', { class: 'ex-chip' + (kind === p[0] ? ' on' : ''), type: 'button', text: p[1] + '（' + (p[0] === 'all' ? total : g[p[0]].length) + '）' });
      b.addEventListener('click', function () { renderWrong(root, p[0]); });
      chips.appendChild(b);
    });
    head.appendChild(chips);
    root.appendChild(head);

    if (!total) {
      var empty = h('div', { class: 'card' });
      empty.innerHTML = '<h2>错题本是空的</h2>' +
        '<p class="small muted" style="margin-top:8px">这可能是好消息：最近做的都没错。也可能是还没开始录。</p>' +
        '<p class="small" style="margin-top:10px"><b>下一步可以这样做：</b></p>' +
        '<ul class="small muted" style="margin:6px 0 0 18px;line-height:1.9">' +
        '<li>拿一张最近的周练卷，在纸上做完，来「试卷练习」一题一题录答案。</li>' +
        '<li>录完先看断点在哪一步：认情境 / 圈条件 / 选规律 / 代数据 / 验结果。</li>' +
        '<li>只补最断的那一环，别平均用力。</li></ul>';
      var acts = h('div', { class: 'ex-empty-actions' });
      acts.appendChild(h('a', { class: 'btn btn-primary', href: '#/exam', text: '去试卷练习 →' }));
      acts.appendChild(h('a', { class: 'btn', href: '#/concept', text: '去概念闪练' }));
      acts.appendChild(h('a', { class: 'btn', href: '#/guided', text: '去五步引导' }));
      empty.appendChild(acts);
      root.appendChild(empty);
      return;
    }

    var sel = {};   // key -> true
    var clearBtn = h('button', { class: 'btn', type: 'button', text: '勾选「我会了」再清' });
    clearBtn.disabled = true;
    var clearRow = h('div', { class: 'ex-btns' });
    clearRow.appendChild(clearBtn);
    clearRow.appendChild(h('span', { class: 'tiny muted', text: '清掉的题如果再错，会自动回来。' }));

    function refreshClear() {
      var n = Object.keys(sel).length;
      clearBtn.textContent = n ? '清掉勾选的 ' + n + ' 条' : '勾选「我会了」再清';
      clearBtn.disabled = !n;
    }
    clearBtn.addEventListener('click', function () {
      var keys = Object.keys(sel);
      if (!keys.length) { UI.toast('先勾选「我会了」的条目', 'info'); return; }
      UI.confirm('把这 ' + keys.length + ' 条从错题本清掉？以后再做错会自动回来。', '清掉').then(function (ok) {
        if (!ok) return;
        keys.forEach(function (k) { PHYS.progress.clearWrong(k); });
        UI.toast('清掉 ' + keys.length + ' 条，做得好', 'ok');
        renderWrong(root, kind);
      });
    });

    var shown = 0;
    ['guided', 'exam', 'concept'].forEach(function (k) {
      if (kind !== 'all' && kind !== k) return;
      var arr = g[k];
      var card = h('div', { class: 'card' });
      var cr = h('div', { class: 'row' });
      cr.appendChild(h('h2', { style: 'margin:0', text: KIND_META[k].name }));
      cr.appendChild(h('span', { class: 'tag ' + (k === 'exam' ? 'tag-bad' : 'tag-warn'), text: String(arr.length) }));
      cr.appendChild(h('span', { class: 'small muted', text: KIND_META[k].hint }));
      card.appendChild(cr);

      if (!arr.length) {
        card.appendChild(h('p', { class: 'small muted', style: 'margin-top:10px', text: '这一类暂时是空的。' }));
      } else {
        shown += arr.length;
        var list = h('div', { class: 'ex-wlist' });
        arr.forEach(function (w) {
          var info = KIND_META[k].info(w);
          var row = h('div', { class: 'ex-wrow' });
          var cbWrap = h('label', { class: 'ex-wcheck' });
          var cb = h('input', { type: 'checkbox' });
          cb.addEventListener('change', function () {
            if (cb.checked) sel[w.key] = true; else delete sel[w.key];
            refreshClear();
          });
          cbWrap.appendChild(cb);
          cbWrap.appendChild(h('span', { class: 'tiny', text: '我会了' }));
          row.appendChild(cbWrap);

          var main = h('div', { class: 'ex-wmain' });
          main.appendChild(h('div', { class: 'ex-wtitle', text: info.label }));
          var sub = h('div', { class: 'tiny muted' });
          sub.appendChild(h('span', { class: 'tag ' + info.tagCls, style: 'margin-right:6px', text: info.tagText }));
          sub.appendChild(document.createTextNode(info.note || ''));
          main.appendChild(sub);
          row.appendChild(main);

          var right = h('div', { class: 'ex-wright' });
          right.appendChild(h('span', { class: 'tiny muted', text: U.daysAgo(w.at) + ' 天前' }));
          right.appendChild(h('a', { class: 'btn ex-link', href: info.href, text: '去回炉 →' }));
          row.appendChild(right);

          list.appendChild(row);
        });
        card.appendChild(list);
      }
      root.appendChild(card);
    });

    /* 清空「我会了」的入口放在清单后面：勾完就清，动线自然 */
    root.appendChild(clearRow);

    if (!shown) {
      var none = h('div', { class: 'card empty', text: '这个分类下暂时没有待清的题。换个分类看看。' });
      root.appendChild(none);
    }
  }

  function statBtn(k, n, name, kind, root) {
    var b = h('button', { class: 'ex-wstat' + (kind === k ? ' on' : ''), type: 'button' });
    b.innerHTML = '<b>' + n + '</b><span>' + esc(name) + '</span>';
    b.addEventListener('click', function () { renderWrong(root, k); });
    return b;
  }

  PHYS.registry.register({
    id: 'wrong', title: '错题回炉', short: '错题', icon: '↺', order: 25,
    desc: '五步断点、试卷错题、概念错卡，三类断点一起清。清掉一条只需要「不看答案做一遍」。',
    mount: function (root, params) {
      renderWrong(root, (params && params.kind) || 'all');
    }
  });

})();
