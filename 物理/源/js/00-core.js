/* =============================================================
   物理思维脚手架 · 核心（Lead 维护，模块开发者只读调用）
   提供：数据、存储、路由、注册表、判分、进度、UI 工具
   ============================================================= */
(function () {
  'use strict';

  var PHYS = window.PHYS = window.PHYS || {};
  PHYS.DATA = window.PHYS_DATA || { packs: [], concepts: [], guided: [] };
  PHYS.VERSION = 'v2';

  /* ---------------- 通用工具 ---------------- */
  var U = PHYS.util = {
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    shuffle: function (a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    pad2: function (n) { return (n < 10 ? '0' : '') + n; },
    today: function () {
      var d = new Date();
      return d.getFullYear() + '-' + U.pad2(d.getMonth() + 1) + '-' + U.pad2(d.getDate());
    },
    daysAgo: function (iso) {
      if (!iso) return 999;
      var a = new Date(iso.slice(0, 10) + 'T00:00:00'), b = new Date(U.today() + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    },
    fmtPct: function (x) { return (Math.round(x * 1000) / 10) + '%'; },
    fmtTime: function (ms) {
      if (!ms) return '';
      var s = Math.round(ms / 1000);
      return s < 60 ? s + ' 秒' : Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒';
    },
    groupBy: function (arr, fn) {
      var m = {};
      arr.forEach(function (x) { var k = fn(x); (m[k] = m[k] || []).push(x); });
      return m;
    },
    uniq: function (arr) { return arr.filter(function (x, i) { return arr.indexOf(x) === i; }); },
    sum: function (arr) { return arr.reduce(function (a, b) { return a + b; }, 0); },
    clamp: function (x, a, b) { return Math.max(a, Math.min(b, x)); }
  };

  /* ---------------- 存储 ---------------- */
  var STORE_KEY = 'physScaffold.v2';
  function blank() {
    return {
      version: 2,
      createdAt: new Date().toISOString(),
      guided: {},     // qid -> {ok, steps:[bool], usedHint, usedWalk, tries, at, ms}
      stepStats: {},  // focus -> {n, ok}
      exam: {},       // packId -> { qid -> {ok, tries, at, user} }
      concept: {},    // cid -> {n, ok, streak, due, lastAt}
      wrong: {},      // key -> {kind, qid/packId/cid, at, note}
      days: {},       // 'YYYY-MM-DD' -> {guided, exam, concept}
      flags: {}
    };
  }
  var state = (function () {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var o = JSON.parse(raw) || {};
      var b = blank();
      for (var k in b) if (!(k in o)) o[k] = b[k];
      return o;
    } catch (e) { return blank(); }
  })();

  var saveTimer = null;
  function persist() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { }
      saveTimer = null;
    }, 100);
  }
  function pathParts(p) { return String(p).split('.').filter(Boolean); }
  function getPath(obj, parts) {
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  PHYS.store = {
    get: function (path, def) {
      var v = getPath(state, pathParts(path));
      return v === undefined ? def : v;
    },
    set: function (path, val) {
      var parts = pathParts(path), cur = state;
      for (var i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
      persist();
    },
    update: function (path, fn) {
      var cur = this.get(path, undefined);
      this.set(path, fn(cur));
    },
    all: function () { return JSON.parse(JSON.stringify(state)); },
    replaceAll: function (obj) {
      if (!obj || obj.version !== 2) throw new Error('记录格式不对（需要 version 2）');
      var b = blank();
      for (var k in b) if (k in obj) b[k] = obj[k];
      state = b; persist();
    },
    clear: function () { state = blank(); persist(); },
    key: STORE_KEY
  };

  /* ---------------- 判分 ---------------- */
  function parseNum(input) {
    if (input === null || input === undefined) return NaN;
    if (typeof input === 'number') return input;
    var s = String(input).trim();
    if (!s) return NaN;
    s = s.replace(/\s+/g, '')
      .replace(/[，]/g, '.')
      .replace(/×10\^?/gi, 'e')
      .replace(/x10\^?/gi, 'e')
      .replace(/×/g, '*')
      .replace(/[－−—]/g, '-')
      .replace(/[％]/g, '');
    var m = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    if (/^-?[\d.]+e-?[\d.]+$/i.test(s)) return parseFloat(s);
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    /* 允许学生把单位一起打进来：30N / 0.4m / 8400J / 80% */
    var m2 = s.match(/^(-?\d+(?:\.\d+)?)(?:e-?\d+)?([A-Za-z\u4e00-\u9fa5%℃°Ω]+)$/);
    if (m2) {
      var base = parseFloat(s.replace(/[A-Za-z\u4e00-\u9fa5%℃°Ω]+$/, ''));
      if (!isNaN(base)) return base;
    }
    return NaN;
  }

  var J = PHYS.judge = {
    parseNum: parseNum,
    num: function (input, ans, tol) {
      var x = parseNum(input);
      if (isNaN(x)) return false;
      var t = (tol === undefined || tol === null) ? Math.max(Math.abs(ans) * 1e-3, 1e-9) : Math.abs(tol);
      return Math.abs(x - ans) <= t + 1e-9;
    },
    coef: function (inputs, spec) {
      var ans = spec.ans || [];
      if (inputs.length !== ans.length) return false;
      for (var i = 0; i < ans.length; i++) {
        var t = spec.tol === undefined ? Math.max(Math.abs(ans[i]) * 1e-3, 1e-9) : Math.abs(spec.tol);
        if (!this.num(inputs[i], ans[i], t)) return false;
      }
      return true;
    },
    choice: function (sel, ans) {
      var norm = function (v) {
        if (Array.isArray(v)) return v.map(Number).sort(function (a, b) { return a - b; }).join(',');
        return String(Number(v));
      };
      return norm(sel) === norm(ans);
    },
    text: function (input, field) {
      var s = String(input || '').replace(/\s+/g, '');
      if (!s) return false;
      var cands = Array.isArray(field.ans) ? field.ans : [field.ans];
      var mode = field.mode || 'contains';
      for (var i = 0; i < cands.length; i++) {
        var c = String(cands[i]).replace(/\s+/g, '');
        if (mode === 'exact' ? s === c : s.indexOf(c) >= 0) return true;
      }
      return false;
    },
    /* 统一入口：返回 {ok, filled} */
    field: function (field, input) {
      var filled = input !== '' && input !== null && input !== undefined;
      if (Array.isArray(input)) filled = input.some(function (x) { return x !== '' && x !== null && x !== undefined; });
      if (!filled) return { ok: false, filled: false };
      var ok = false;
      switch (field.type) {
        case 'num': ok = this.num(input, field.ans, field.tol); break;
        case 'coef': ok = this.coef(input, field); break;
        case 'choice': ok = this.choice(input, field.ans); break;
        case 'text': ok = this.text(input, field); break;
        default: ok = false;
      }
      return { ok: ok, filled: true };
    }
  };

  /* ---------------- 进度 ---------------- */
  function bump(day, kind, n) {
    var d = state.days[day] = state.days[day] || { guided: 0, exam: 0, concept: 0 };
    d[kind] = (d[kind] || 0) + (n || 1);
  }
  function addWrong(key, data) {
    state.wrong[key] = Object.assign({ at: new Date().toISOString() }, data);
  }
  function delWrong(key) { delete state.wrong[key]; }

  PHYS.progress = {
    /** 五步引导：每一步的作答 */
    stepAttempt: function (o) {
      var f = o.focus;
      var s = state.stepStats[f] = state.stepStats[f] || { n: 0, ok: 0 };
      s.n++;
      if (o.ok && !o.usedHint) s.ok++;
      persist();
    },
    /** 五步引导：一题走完 */
    guidedDone: function (o) {
      var rec = state.guided[o.qid] = state.guided[o.qid] || { tries: 0 };
      rec.tries++;
      rec.ok = !!o.ok;
      rec.steps = o.steps || [];
      rec.usedHint = !!o.usedHint;
      rec.usedWalk = !!o.usedWalk;
      rec.ms = o.ms || rec.ms || 0;
      rec.at = new Date().toISOString();
      bump(U.today(), 'guided');
      if (o.ok) delWrong('g:' + o.qid); else addWrong('g:' + o.qid, { kind: 'guided', qid: o.qid });
      persist();
    },
    /** 试卷练习：一题作答 */
    examAnswer: function (o) {
      var pack = state.exam[o.packId] = state.exam[o.packId] || {};
      var rec = pack[o.qid] = pack[o.qid] || { tries: 0 };
      rec.tries++;
      rec.ok = !!o.ok;
      rec.user = o.user;
      rec.at = new Date().toISOString();
      bump(U.today(), 'exam');
      if (o.ok) delWrong('e:' + o.packId + ':' + o.qid);
      else addWrong('e:' + o.packId + ':' + o.qid, { kind: 'exam', packId: o.packId, qid: o.qid });
      persist();
    },
    /** 概念闪练：一张卡 */
    conceptAnswer: function (o) {
      var rec = state.concept[o.cid] = state.concept[o.cid] || { n: 0, ok: 0, streak: 0 };
      rec.n++;
      if (o.ok) { rec.ok++; rec.streak++; } else { rec.streak = 0; }
      rec.lastAt = new Date().toISOString();
      var gap = o.ok ? (rec.streak >= 3 ? 15 : rec.streak === 2 ? 7 : 3) : 1;
      rec.due = new Date(Date.now() + gap * 86400000).toISOString().slice(0, 10);
      bump(U.today(), 'concept');
      /* 概念错卡不做自动清除：答错过就留在错题本，由本人在「错题回炉」
         勾「我会了」手动清掉 —— 避免"同轮末尾重答一次对了"就把真正的模糊点抹掉。
         再答错会刷新这条记录的时间，排到列表最前面。 */
      if (!o.ok) addWrong('c:' + o.cid, { kind: 'concept', cid: o.cid });
      persist();
    },
    markWrong: addWrong,
    clearWrong: delWrong,
    wrongList: function () {
      var out = [];
      Object.keys(state.wrong).forEach(function (k) {
        out.push(Object.assign({ key: k }, state.wrong[k]));
      });
      return out.sort(function (a, b) { return (b.at || '').localeCompare(a.at || ''); });
    },
    /** 概念掌握度：0 未练 1 生疏 2 熟悉 3 掌握
     *  掌握：最近一次答对（streak ≥1）且总正确率 ≥80%
     *  —— 一张卡答对一次即可算掌握，不必等第二轮复习；
     *     「复习到期日」仍按连对次数拉长（见 conceptAnswer），保证还会回来再见一次。 */
    conceptLevel: function (cid) {
      var r = state.concept[cid];
      if (!r || !r.n) return 0;
      var rate = r.ok / r.n;
      if (r.streak >= 1 && rate >= 0.8) return 3;
      if (rate >= 0.6) return 2;
      return 1;
    },
    stats: function () {
      var focus = ['model', 'cond', 'rule', 'calc', 'check'];
      var stepRates = {};
      focus.forEach(function (f) {
        var s = state.stepStats[f] || { n: 0, ok: 0 };
        stepRates[f] = s.n ? s.ok / s.n : null;
      });
      var packs = PHYS.DATA.packs || [], exN = 0, exOk = 0, packStats = [];
      packs.forEach(function (p) {
        var rec = state.exam[p.id] || {};
        var n = 0, ok = 0;
        p.questions.forEach(function (q) {
          if (q.type === 'selfcheck') return;
          if (rec[q.id]) { n++; if (rec[q.id].ok) ok++; }
        });
        exN += n; exOk += ok;
        packStats.push({ id: p.id, name: p.name, n: n, ok: ok, total: p.questions.length });
      });
      var cN = 0, cOk = 0, levels = [0, 0, 0, 0];
      (PHYS.DATA.concepts || []).forEach(function (c) {
        var r = state.concept[c.id];
        if (r && r.n) { cN += r.n; cOk += r.ok; }
        levels[PHYS.progress.conceptLevel(c.id)]++;
      });
      var days = Object.keys(state.days).sort();
      var streak = 0;
      for (var i = days.length - 1; i >= 0; i--) {
        var d = state.days[days[i]];
        if (d.guided + d.exam + d.concept > 0) streak++; else break;
        if (U.daysAgo(days[i]) > streak + 1) break;
      }
      return {
        stepRates: stepRates,
        exam: { n: exN, ok: exOk, rate: exN ? exOk / exN : null, packs: packStats },
        concept: { n: cN, ok: cOk, rate: cN ? cOk / cN : null, levels: levels },
        guidedDone: Object.keys(state.guided).length,
        wrong: PHYS.progress.wrongList().length,
        days: days.length,
        streak: streak
      };
    }
  };

  /* ---------------- 路由 ---------------- */
  var registry = [];
  var currentRoute = { path: 'home', params: {} };
  var routeListeners = [];
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (!h) return { path: 'home', params: {} };
    var qi = h.indexOf('?');
    var q = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      h = h.slice(0, qi);
    }
    var seg = h.split('/').filter(Boolean);
    return { path: seg[0] || 'home', params: Object.assign({ _arg: seg[1] || '' }, q) };
  }
  PHYS.route = {
    go: function (path, params) {
      var q = [];
      params = params || {};
      Object.keys(params).forEach(function (k) {
        if (params[k] === undefined || params[k] === null || params[k] === '') return;
        q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      });
      location.hash = '#/' + path + (q.length ? '?' + q.join('&') : '');
    },
    current: function () { return currentRoute; },
    onChange: function (fn) { routeListeners.push(fn); },
    reload: function () { renderRoute(); }
  };
  PHYS.registry = {
    register: function (m) {
      if (!m || !m.id || typeof m.mount !== 'function') throw new Error('模块注册需要 id 与 mount');
      registry.push(m);
      registry.sort(function (a, b) {
        var oa = a.order === undefined ? 99 : a.order, ob = b.order === undefined ? 99 : b.order;
        return oa - ob;
      });
      return m;
    },
    all: function () { return registry.slice(); },
    get: function (id) {
      for (var i = 0; i < registry.length; i++) if (registry[i].id === id) return registry[i];
      return null;
    }
  };

  function renderRoute() {
    var r = currentRoute = parseHash();
    var mod = PHYS.registry.get(r.path) || PHYS.registry.get('home');
    var root = document.getElementById('screen');
    if (!root) return;
    if (PHYS._active && PHYS._active.unmount) { try { PHYS._active.unmount(); } catch (e) { } }
    PHYS._active = mod;
    root.innerHTML = '';
    root.scrollTop = 0;
    try {
      mod.mount(root, r.params);
    } catch (err) {
      root.innerHTML = '<div class="card"><b>页面出错了</b><p class="small muted">' + PHYS.ui.escape(err.message) + '</p></div>';
      if (window.console) console.error(err);
    }
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-nav') === r.path);
    });
    routeListeners.forEach(function (fn) { try { fn(r); } catch (e) { } });
    window.scrollTo(0, 0);
  }
  PHYS._renderRoute = renderRoute;

  /* ---------------- UI 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var cssInjected = {};
  var UI = PHYS.ui = {
    escape: esc,
    el: function (tag, attrs, children) {
      var el = document.createElement(tag || 'div');
      if (attrs) Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style') el.setAttribute('style', v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
      (children || []).forEach(function (c) {
        if (c == null || c === false) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return el;
    },
    img: function (src, alt, cls) {
      var wrap = document.createElement('div');
      wrap.className = 'imgwrap ' + (cls || '');
      var im = document.createElement('img');
      im.loading = 'lazy';
      im.alt = alt || '原题图';
      im.src = src;
      im.addEventListener('error', function () {
        wrap.classList.add('imgfail');
        wrap.innerHTML = '<span class="tiny muted">图片没有找到：' + esc(src) + '（请确认「图片」文件夹和网页在同一目录）</span>';
      });
      im.addEventListener('click', function () { UI.zoom(src); });
      wrap.appendChild(im);
      return wrap;
    },
    /** 按路径数组/字符串生成图片块 */
    imgs: function (src, alt) {
      var box = document.createElement('div');
      box.className = 'imglist';
      var arr = Array.isArray(src) ? src : (src ? [src] : []);
      arr.forEach(function (s, i) { box.appendChild(UI.img(s, (alt || '原题图') + (arr.length > 1 ? '（' + (i + 1) + '/' + arr.length + '）' : ''))); });
      return box;
    },
    /** 字符串版图片（用于 innerHTML 模板）；点击自动放大 */
    imgHtml: function (src, cls) {
      if (!src) return '';
      return '<img loading="lazy" data-zoom="' + esc(src) + '" src="' + esc(src) + '" alt="原题图" class="' + (cls || '') + '">';
    },
    /** 按字段说明生成表单；返回 {el, values(), check(), mark(res), reset(), setValues(arr)} */
    fields: function (fields, opts) {
      opts = opts || {};
      var box = document.createElement('div');
      box.className = 'fields';
      var ctrls = [];
      fields.forEach(function (f, idx) {
        var wrap = document.createElement('div');
        wrap.className = 'field';
        if (f.label) {
          var lb = document.createElement('label');
          lb.textContent = f.label;
          if (opts.hideLabel) lb.style.display = 'none';
          wrap.appendChild(lb);
        }
        if (f.type === 'coef') {
          var parts = String(f.tpl || '').split(/(\{\d+\})/);
          var inputs = [];
          var tplBox = document.createElement('span');
          tplBox.className = 'tpl';
          parts.forEach(function (p) {
            if (/^\{\d+\}$/.test(p)) {
              var inp = document.createElement('input');
              inp.className = 'inp';
              inp.style.width = '78px';
              inp.setAttribute('inputmode', 'decimal');
              tplBox.appendChild(inp);
              inputs.push(inp);
            } else if (p) {
              tplBox.appendChild(document.createTextNode(p));
            }
          });
          wrap.appendChild(tplBox);
          ctrls.push({ kind: 'coef', inputs: inputs, field: f });
        } else if (f.type === 'choice') {
          var optsBox = document.createElement('div');
          optsBox.className = 'opts';
          optsBox.style.flexDirection = 'row';
          optsBox.style.flexWrap = 'wrap';
          var sel = { v: null };
          (f.options || []).forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-mini';
            b.textContent = o;
            b.addEventListener('click', function () {
              sel.v = i;
              Array.prototype.forEach.call(optsBox.children, function (c) { c.classList.remove('sel'); });
              b.classList.add('sel');
            });
            optsBox.appendChild(b);
          });
          wrap.appendChild(optsBox);
          ctrls.push({ kind: 'choice', sel: sel, field: f, box: optsBox });
        } else if (f.type === 'text') {
          var tinp = document.createElement('input');
          tinp.className = 'inp wide';
          wrap.appendChild(tinp);
          ctrls.push({ kind: 'text', input: tinp, field: f });
        } else {
          var ninp = document.createElement('input');
          ninp.className = 'inp';
          ninp.setAttribute('inputmode', 'decimal');
          ninp.placeholder = f.ph || '填数值';
          wrap.appendChild(ninp);
          if (f.unit) {
            var u = document.createElement('span');
            u.className = 'unit';
            u.textContent = f.unit;
            wrap.appendChild(u);
          }
          ninp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && opts.onEnter) opts.onEnter(); });
          ctrls.push({ kind: 'num', input: ninp, field: f });
        }
        box.appendChild(wrap);
      });
      return {
        el: box,
        values: function () {
          return ctrls.map(function (c) {
            if (c.kind === 'coef') return c.inputs.map(function (i) { return i.value; });
            if (c.kind === 'choice') return c.sel.v;
            return c.input.value;
          });
        },
        check: function () {
          var vals = this.values();
          return ctrls.map(function (c, i) { return PHYS.judge.field(c.field, vals[i]); });
        },
        mark: function (res) {
          ctrls.forEach(function (c, i) {
            var r = res[i] || {};
            var cls = r.ok ? 'ok' : (r.filled ? 'no' : '');
            if (c.kind === 'coef') c.inputs.forEach(function (inp) { inp.className = 'inp ' + cls; });
            else if (c.kind === 'num') c.input.className = 'inp ' + cls;
            else if (c.kind === 'text') c.input.className = 'inp wide ' + cls;
            else if (c.kind === 'choice') {
              Array.prototype.forEach.call(c.box.children, function (b, bi) {
                b.classList.remove('ok', 'no');
                if (r.filled && bi === c.field.ans) b.classList.add('ok');
                if (r.filled && bi === c.sel.v && !r.ok) b.classList.add('no');
              });
            }
          });
        },
        reset: function () {
          ctrls.forEach(function (c) {
            if (c.kind === 'coef') c.inputs.forEach(function (i) { i.className = 'inp'; i.value = ''; });
            else if (c.kind === 'num') { c.input.className = 'inp'; c.input.value = ''; }
            else if (c.kind === 'text') { c.input.className = 'inp wide'; c.input.value = ''; }
            else if (c.kind === 'choice') {
              c.sel.v = null;
              Array.prototype.forEach.call(c.box.children, function (b) { b.classList.remove('sel', 'ok', 'no'); });
            }
          });
        },
        focus: function () {
          for (var i = 0; i < ctrls.length; i++) {
            var c = ctrls[i];
            if (c.input) { c.input.focus(); return; }
            if (c.inputs && c.inputs[0]) { c.inputs[0].focus(); return; }
          }
        }
      };
    },
    zoom: function (src) {
      var ov = document.createElement('div');
      ov.className = 'zoom-ov';
      ov.innerHTML = '<img src="' + esc(src) + '" alt="原题图">';
      ov.addEventListener('click', function () { ov.remove(); });
      document.body.appendChild(ov);
    },
    toast: function (msg, kind) {
      var t = document.createElement('div');
      t.className = 'toast ' + (kind || 'info');
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add('out'); }, 1600);
      setTimeout(function () { t.remove(); }, 2200);
    },
    modal: function (o) {
      var ov = document.createElement('div');
      ov.className = 'modal-ov';
      var acts = (o.actions || []).map(function (a) {
        var b = document.createElement('button');
        b.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : '');
        b.textContent = a.text;
        b.addEventListener('click', function () { if (a.onClick) a.onClick(); if (a.keep !== true) close(); });
        return b;
      });
      var box = document.createElement('div');
      box.className = 'modal';
      box.innerHTML = '<h3>' + esc(o.title || '') + '</h3>';
      var body = document.createElement('div');
      body.className = 'modal-body small';
      if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
      box.appendChild(body);
      if (acts.length) {
        var foot = document.createElement('div');
        foot.className = 'modal-foot';
        acts.forEach(function (b) { foot.appendChild(b); });
        box.appendChild(foot);
      }
      ov.appendChild(box);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
      function close() { ov.remove(); }
      return close;
    },
    confirm: function (msg, okText) {
      return new Promise(function (resolve) {
        var done = false;
        var close = UI.modal({
          title: '确认一下',
          body: '<p>' + esc(msg) + '</p>',
          actions: [
            { text: '取消', onClick: function () { done = true; resolve(false); } },
            { text: okText || '确定', kind: 'primary', onClick: function () { done = true; resolve(true); } }
          ]
        });
        var timer = setInterval(function () {
          if (!document.body.contains(document.querySelector('.modal-ov'))) { clearInterval(timer); if (!done) resolve(false); }
        }, 300);
      });
    },
    addCSS: function (css) {
      var key = css.slice(0, 60);
      if (cssInjected[key]) return;
      cssInjected[key] = true;
      var s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    },
    /** 通用：把 "A．xxx" 之类的前缀去掉 */
    stripOptionPrefix: function (s) {
      return String(s || '').replace(/^\s*[A-Z][．.、]\s*/, '');
    }
  };

  /* ---------------- 启动 ---------------- */
  PHYS.boot = function () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else start();
    function start() {
      var bar = document.getElementById('nav');
      if (bar) {
        bar.innerHTML = '';
        PHYS.registry.all().forEach(function (m) {
          var a = document.createElement('a');
          a.className = 'navlink';
          a.href = '#/' + m.id;
          a.setAttribute('data-nav', m.id);
          a.innerHTML = (m.icon ? '<i>' + m.icon + '</i>' : '') + '<span>' + esc(m.short || m.title) + '</span>';
          bar.appendChild(a);
        });
      }
      window.addEventListener('hashchange', renderRoute);
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.tagName === 'IMG' && t.getAttribute('data-zoom')) UI.zoom(t.getAttribute('data-zoom'));
      });
      renderRoute();
    }
  };
})();
