/* =====================================================================
   英语单词闪练卡 · 纯逻辑层（不碰 DOM，可在 node 里单测）
   词库来自 data 段的 EW_VOCAB（apps/english 提取）；三方向四选一参数化出题。
   ===================================================================== */
var EW = (function () {
  'use strict';

  var VERSION = 1;
  var DAY = 86400000;

  /* KINDS：e2c 看英文选中文 / c2e 看中文选英文 / p2c 看音标听发音选中文 */
  var KINDS = [
    { id: 'e2c', name: '英→中' },
    { id: 'c2e', name: '中→英' },
    { id: 'p2c', name: '音→中' }
  ];
  var KIND_IDS = ['e2c', 'c2e', 'p2c'];

  /* 从 EW_VOCAB 展平出模块表。mod id = sourceId.gradeId.unitId，如 hb.hb7a.unit1
     word = [en, ipa, pos, zh] */
  var MODULES = [];
  var MODULE_BY_ID = Object.create(null);
  (function build() {
    var vocab = (typeof EW_VOCAB !== 'undefined') ? EW_VOCAB : null;
    if (!vocab || !vocab.sources) return;
    vocab.sources.forEach(function (src) {
      (src.grades || []).forEach(function (g) {
        (g.units || []).forEach(function (u) {
          var id = src.id + '.' + g.id + '.' + u.id;
          var words = (u.words || []).map(function (w, i) {
            return {
              i: i,
              en: String(w[0] || '').trim(),
              ipa: String(w[1] || '').trim(),
              pos: String(w[2] || '').trim(),
              zh: String(w[3] || '').trim(),
              ex: String(w[4] || '').trim(),      // 例句（粤学词词典语料）
              exZh: String(w[5] || '').trim()     // 例句中文
            };
          }).filter(function (w) { return w.en && w.zh; });
          var m = {
            id: id, sourceId: src.id, sourceName: src.name,
            gradeId: g.id, gradeName: g.name,
            unitId: u.id, unitName: u.name,
            name: src.name + ' · ' + g.name + ' · ' + u.name,
            words: words
          };
          MODULES.push(m);
          MODULE_BY_ID[id] = m;
        });
      });
    });
  })();

  function moduleById(id) { return MODULE_BY_ID[id] || null; }
  function allUnitIds() { return MODULES.map(function (m) { return m.id; }); }

  /* 可复现随机：同一 seed 同一题 */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function makeChoice(r, correct, distractors) {
    var pool = [correct].concat(distractors), opts = [];
    for (var i = 0; i < pool.length; i++) if (opts.indexOf(pool[i]) < 0) opts.push(pool[i]);
    opts = shuffle(opts, r);
    return { type: 'choice', label: '', options: opts, ans: opts.indexOf(correct) };
  }

  /* 三方向题干与选项：题干字段 prompt；语音/音标供 UI 渲染；答案与选项同一维度 */
  var FACE = {
    e2c: function (w) { return { prompt: w.en, speak: w.en, ipa: w.ipa, answer: w.zh }; },
    c2e: function (w) { return { prompt: w.zh, speak: '', ipa: '', answer: w.en }; },
    p2c: function (w) { return { prompt: w.ipa || '听发音选中文', speak: w.en, ipa: w.ipa, answer: w.zh }; }
  };
  var FACE_KEY = {
    e2c: function (x) { return x.zh; },
    c2e: function (x) { return x.en; },
    p2c: function (x) { return x.zh; }
  };

  /* 短语判定：英文含空格即为短语。短语题的干扰项必须也是短语，
     否则「长短语 vs 两字单词」的结构差异一眼就能看穿答案（见 2026-11-19 反馈）。 */
  function isPhrase(w) { return String(w.en || '').indexOf(' ') >= 0; }

  /* 借词池：同年级 → 同来源 → 全库，逐层扩大；每层再按短语/单词分组。
     gen（单方向）与 genUnitAll / genRandom（逐词出题）共用。 */
  function donorsFor(m, kind, r) {
    var hasIpa = function (w) { return kind !== 'p2c' || !!w.ipa; };
    var sameGrade = [], sameSource = [], all = [];
    MODULES.forEach(function (o) {
      if (o.id === m.id) return;
      if (o.gradeId === m.gradeId && o.sourceId === m.sourceId) sameGrade = sameGrade.concat(o.words.filter(hasIpa));
      else if (o.sourceId === m.sourceId) sameSource = sameSource.concat(o.words.filter(hasIpa));
      else all = all.concat(o.words.filter(hasIpa));
    });
    return [sameGrade, sameSource, all].map(function (pool) {
      var sh = shuffle(pool, r);
      return {
        phrase: sh.filter(isPhrase),
        word: sh.filter(function (w) { return !isPhrase(w); })
      };
    });
  }

  /* 给指定单词造一道四选一：pool 是本单元可用词（p2c 排除无音标），donors 是借词池。
     干扰项优先「同类型」：短语只混短语、单词只混单词，避免结构差异泄题；
     本层同类不足 3 个才退到异类。造不出 3 个不同干扰项返回 null。 */
  function buildQ(m, w, kind, r, pool, donors) {
    var face = FACE[kind], keyOf = FACE_KEY[kind];
    var correct = face(w);
    var wantPhrase = isPhrase(w);
    var seenVal = Object.create(null);
    seenVal[correct.answer] = 1;
    var chosen = [], chosenWords = [];

    function take(list) {
      for (var k = 0; k < list.length && chosen.length < 3; k++) {
        var d = list[k];
        if (d.i === w.i && d.en === w.en) continue;
        var val = keyOf(d);
        if (val && !seenVal[val]) {
          seenVal[val] = 1; chosen.push(val); chosenWords.push(d.en);
        }
      }
    }
    // 每层按 [同单元, 同年级, 同来源, 全库] 顺序，先取同类，不够再取异类兜底
    var local = {
      phrase: pool.filter(isPhrase),
      word: pool.filter(function (x) { return !isPhrase(x); })
    };
    var own = wantPhrase ? 'phrase' : 'word', other = wantPhrase ? 'word' : 'phrase';
    var layers = [local[own]].concat(donors.map(function (d) { return d[own]; }));
    for (var i = 0; i < layers.length && chosen.length < 3; i++) take(layers[i]);
    if (chosen.length < 3) {
      var fb = [local[other]].concat(donors.map(function (d) { return d[other]; }));
      for (var j = 0; j < fb.length && chosen.length < 3; j++) take(fb[j]);
    }
    if (chosen.length < 3) return null;
    var field = makeChoice(r, correct.answer, chosen);
    return {
      id: m.id + '|' + w.i + '|' + kind,
      mod: m.id, kind: kind,
      modName: m.name, kindName: nameOf(kind),
      prompt: correct.prompt, speak: correct.speak, ipa: correct.ipa,
      fields: [field],
      tip: w.en + (w.ipa ? ' ' + w.ipa : '') + (w.pos ? ' ' + w.pos : '') + ' · ' + w.zh,
      kp: [m.gradeName, m.unitName, nameOf(kind)],
      answerText: correct.answer,
      word: w.en, ex: w.ex, exZh: w.exZh,
      // 调试/自检用：干扰项英文；短语题必须全是短语结构
      disWords: chosenWords
    };
  }

  /* gen(mod, kind, seed, n)：从某单元某方向出题。n 默认 10。
     p2c 只从有音标的词里选题干；干扰项优先同单元，不足时按「同年级→同来源→全库」借词。 */
  function gen(mod, kind, seed, n) {
    var m = typeof mod === 'string' ? moduleById(mod) : mod;
    if (!m || KIND_IDS.indexOf(kind) < 0) return [];
    n = n || 10;
    var hasIpa = function (w) { return kind !== 'p2c' || !!w.ipa; };
    var pool = m.words.filter(hasIpa);
    if (pool.length < 2) return [];
    var r = mulberry32(((seed || 1) >>> 0) ^ hashStr(m.id + kind));
    var order = shuffle(pool, r);
    var donors = donorsFor(m, kind, r);
    var out = [], taken = Object.create(null);
    for (var round = 0; round < n * 4 && out.length < n; round++) {
      var w = order[round % order.length];
      if (taken[w.i]) continue;
      var q = buildQ(m, w, kind, r, pool, donors);
      if (!q) continue;
      taken[w.i] = 1;
      out.push(q);
    }
    return out;
  }

  function normalizeKinds(kinds) {
    if (Array.isArray(kinds) && kinds.length) {
      return kinds.filter(function (k) { return KIND_IDS.indexOf(k) >= 0; });
    }
    if (KIND_IDS.indexOf(kinds) >= 0) return [kinds];
    return KIND_IDS.slice();
  }

  /* genUnitAll：当前单元每个词恰好一题，乱序、不遗漏、可反复重建（完整循环）。
     方向按 kinds 轮换；p2c 遇到无音标词降级 e2c，保证全部词都覆盖。 */
  function genUnitAll(mod, kinds, seed) {
    var m = typeof mod === 'string' ? moduleById(mod) : mod;
    if (!m || !m.words.length) return [];
    var ks = normalizeKinds(kinds);
    if (!ks.length) ks = KIND_IDS.slice();
    var r = mulberry32(((seed || 1) >>> 0) ^ hashStr(m.id + '|all|' + ks.join(',')));
    var order = shuffle(m.words, r);
    var out = [];
    order.forEach(function (w, i) {
      var kind = ks[i % ks.length];
      if (kind === 'p2c' && !w.ipa) kind = 'e2c';
      var pool = m.words.filter(function (x) { return kind !== 'p2c' || !!x.ipa; });
      var q = buildQ(m, w, kind, r, pool, donorsFor(m, kind, r));
      if (q) out.push(q);
    });
    return out;
  }

  /* genSession：快练队列——一次生成 n 题，同一队列内词不重复；
     单元词数不足 n 时才循环复用（换一轮乱序，尽量避免相邻重复）。
     kinds 与 genUnitAll 同义；纯 p2c 只取有音标的词（快练不降级，保持所选方向）。 */
  function genSession(mod, kinds, seed, n) {
    var m = typeof mod === 'string' ? moduleById(mod) : mod;
    if (!m || !m.words.length) return [];
    var ks = normalizeKinds(kinds);
    if (!ks.length) ks = KIND_IDS.slice();
    n = Math.max(1, Math.floor(n || 10));
    var r = mulberry32(((seed || 1) >>> 0) ^ hashStr(m.id + '|sess|' + ks.join(',')));
    var ipaPool = m.words.filter(function (w) { return !!w.ipa; });
    var deckPool = (ks.length === 1 && ks[0] === 'p2c') ? ipaPool : m.words;
    if (!deckPool.length) return [];
    var donorsCache = Object.create(null), poolCache = Object.create(null);
    function donorsOf(kind) { return donorsCache[kind] || (donorsCache[kind] = donorsFor(m, kind, r)); }
    function poolOf(kind) { return poolCache[kind] || (poolCache[kind] = kind === 'p2c' ? ipaPool : m.words); }
    var deck = shuffle(deckPool, r), pos = 0, last = null, out = [];
    for (var guard = 0; guard < n * 12 + 50 && out.length < n; guard++) {
      if (pos >= deck.length) {
        deck = shuffle(deckPool, r); pos = 0;
        if (deck.length > 1 && deck[0] === last) { var t = deck[0]; deck[0] = deck[1]; deck[1] = t; }
      }
      var w = deck[pos++], kind = ks[out.length % ks.length];
      if (kind === 'p2c' && !w.ipa) kind = 'e2c';   // 混合方向里无音标降级；纯 p2c 已在 deckPool 过滤
      var q = buildQ(m, w, kind, r, poolOf(kind), donorsOf(kind));
      if (!q) continue;
      out.push(q); last = w;
    }
    return out;
  }

  /* 全库词引用（含所属模块），供随机抽词用。 */
  function allWordRefs() {
    var out = [];
    MODULES.forEach(function (m) {
      m.words.forEach(function (w) { out.push({ m: m, w: w }); });
    });
    return out;
  }

  /* 按英文词去重的全库引用：词库有 281 个跨册同形词（green×3 等），
     随机练习的去重单位必须是「词」而不是「单元×词位」。取首次出现的条目。
     区分大小写：Miss（小姐）/ miss（错过）、May（五月）/ may（可以）是不同词条。 */
  function uniqueWordRefs() {
    var seen = Object.create(null), out = [];
    MODULES.forEach(function (m) {
      m.words.forEach(function (w) {
        if (seen[w.en]) return;
        seen[w.en] = 1;
        out.push({ m: m, w: w });
      });
    });
    return out;
  }

  /* genRandom：从全库按英文词去重抽 n 词，每词一题，方向轮换。n 超库容则取全库唯一词。
     纯 p2c 只取有音标的词（与 genSession 一致，不静默混入英→中）；混合方向才降级。 */
  function genRandom(n, seed, kinds) {
    var ks = normalizeKinds(kinds);
    if (!ks.length) ks = KIND_IDS.slice();
    var refs = uniqueWordRefs();
    if (ks.length === 1 && ks[0] === 'p2c') refs = refs.filter(function (ref) { return !!ref.w.ipa; });
    n = Math.max(1, Math.min(n || 20, refs.length));
    var r = mulberry32(((seed || 1) >>> 0) ^ hashStr('|rand|' + n));
    var order = shuffle(refs, r);
    var out = [];
    order.forEach(function (ref, i) {
      if (out.length >= n) return;
      var kind = ks[out.length % ks.length];
      if (kind === 'p2c' && !ref.w.ipa) kind = 'e2c';
      var pool = ref.m.words.filter(function (x) { return kind !== 'p2c' || !!x.ipa; });
      var q = buildQ(ref.m, ref.w, kind, r, pool, donorsFor(ref.m, kind, r));
      if (q) out.push(q);
    });
    return out;
  }

  function nameOf(kind) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === kind) return KINDS[i].name;
    return kind;
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function judge(q, vals) {
    var res = q.fields.map(function (f, i) {
      var v = vals[i];
      if (f.type === 'choice') return { ok: v === f.ans };
      var ans = String(f.ans == null ? '' : f.ans).trim().toLowerCase();
      var got = String(v == null ? '' : v).trim().toLowerCase();
      return { ok: ans !== '' && got === ans };
    });
    var got = res.filter(function (x) { return x.ok; }).length;
    return { ok: got === res.length, got: got, total: res.length, res: res };
  }
  function ansText(f) {
    if (f.type === 'choice') return f.options[f.ans];
    return String(f.ans || '');
  }

  /* 例句高亮：把目标词在句子中标出来。
     先按词边界找出所有匹配（大小写不敏感 + 常见词形），再把句子分段转义，
     命中的段包 <mark class="hlword">。避免误伤：art 不会命中 cart（词边界）。
     返回 HTML 字符串，调用方直接用 h('...', {html: ...})。 */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function wordForms(w) {
    var s = String(w || '').trim().toLowerCase();
    if (!s) return [];
    var f = [s];
    if (/[^aeiou]y$/.test(s)) { f.push(s.slice(0, -1) + 'ies', s.slice(0, -1) + 'ied', s.slice(0, -1) + 'ying'); }
    else if (/(fe|f)$/.test(s)) { f.push(s.replace(/(fe|f)$/, 'ves')); }   // leaf→leaves
    else {
      f.push(s + 's', s + 'es');
      if (/e$/.test(s)) f.push(s + 'd', s + 'ing');
      else f.push(s + 'ed', s + 'ing');
      if (/([^aeiou])([aeiou])([^aeiou])$/.test(s)) f.push(s + s.slice(-1) + 'ed', s + s.slice(-1) + 'ing'); // run 类双写
    }
    return f;
  }
  function highlightExample(ex, word) {
    var text = String(ex || '');
    if (!text || !word) return escapeHtml(text);
    /* 整词优先；整词在例句里找不到时，退到首个实词（长短语在例句中常有变体）。
       与提取脚本 exampleHasWord 的判定保持一致：判定有例句就一定能高亮。 */
    var candidates = [String(word).trim().toLowerCase()];
    var stop = /^(a|an|the|of|to|in|on|for|and|or)$/;
    var firstContent = candidates[0].split(/\s+/).filter(function (x) { return x && !stop.test(x); })[0];
    if (firstContent && candidates.indexOf(firstContent) < 0) candidates.push(firstContent);
    var forms = [];
    candidates.forEach(function (c) { wordForms(c).forEach(function (f) { if (forms.indexOf(f) < 0) forms.push(f); }); });
    var pattern = '\\b(?:' + forms.map(function (f) { return f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b';
    var re;
    try { re = new RegExp(pattern, 'gi'); } catch (e) { return escapeHtml(text); }
    var out = '', last = 0, m;
    while ((m = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, m.index));
      out += '<mark class="hlword">' + escapeHtml(m[0]) + '</mark>';
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }

  /* 自检：每方向 × 若干单元 × 多 seed，校验题量与判分 */
  function selfTest(n) {
    n = n || 200;
    var fails = [], count = 0, cases = 0;
    var units = allUnitIds();
    if (!units.length) return { count: 0, fails: ['词库为空：EW_VOCAB 未加载或提取失败'], cases: 0 };
    KIND_IDS.forEach(function (kind) {
      // 覆盖 kind 的所有单元，n 不够就循环
      for (var u = 0; u < units.length; u++) {
        var qs = gen(units[u], kind, u + 1, Math.max(2, Math.min(8, Math.ceil(n / units.length) || 2)));
        qs.forEach(function (q) {
          count++;
          if (!q.prompt || q.prompt.indexOf('undefined') >= 0 || q.prompt.indexOf('NaN') >= 0) fails.push(kind + ' 题干异常: ' + q.id);
          if (!q.fields.length || q.fields[0].type !== 'choice') fails.push(kind + ' 字段异常: ' + q.id);
          else {
            var f = q.fields[0];
            if (f.ans < 0 || f.ans >= f.options.length) fails.push(kind + ' 答案越界: ' + q.id);
            if (new Set(f.options).size !== f.options.length) fails.push(kind + ' 选项重复: ' + q.id);
            if (!judge(q, [f.ans]).ok) fails.push(kind + ' 正确解判错: ' + q.id);
            var bad = (f.ans + 1) % f.options.length;
            if (bad !== f.ans && judge(q, [bad]).ok) fails.push(kind + ' 错误解判对: ' + q.id);
            cases += 2;
          }
          if (kind === 'p2c' && !q.ipa) fails.push('p2c 缺音标: ' + q.id);
          // 例句：有例句必须能高亮出目标词，且转义后不能残留可执行标签
          if (q.ex) {
            var hl = highlightExample(q.ex, q.word);
            if (hl.indexOf('<mark class="hlword">') < 0) fails.push('例句未高亮目标词: ' + q.id + ' / ' + q.ex);
            if (/<script|<img|onerror=/i.test(hl)) fails.push('例句含未转义标签: ' + q.id);
          }
        });
      }
    });
    return { count: count, fails: fails, cases: cases };
  }

  return {
    VERSION: VERSION, DAY: DAY,
    KINDS: KINDS, KIND_IDS: KIND_IDS, nameOf: nameOf,
    modules: MODULES, moduleById: moduleById, allUnitIds: allUnitIds,
    gen: gen, genUnitAll: genUnitAll, genSession: genSession, genRandom: genRandom,
    allWordRefs: allWordRefs, uniqueWordRefs: uniqueWordRefs,
    judge: judge, ansText: ansText, selfTest: selfTest,
    highlightExample: highlightExample
  };
})();
