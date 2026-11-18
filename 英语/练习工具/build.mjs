// 合并 OCR 数据为练习工具的数据包，并产出单文件版本。
// 用法：node build.mjs
//
// 数据格式（按原卷大题分区）见 data/SCHEMA.md：
//   items[].section  = 卷面大题标题（卷面没有就 null，不编造）
//   items[].no       = 大题内题号（卷面印的号）
//   items[].noLabel  = 可选，如 U4「句型翻译」的 "(1)"
//   items[].fields   = 填空题按卷面横线数拆几个输入框
//   passages         = 按 section 共享的长文本（U2 语法填空短文）
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const strip = (s) => s.replace(/^\uFEFF/, "");
const readJson = (p) => JSON.parse(strip(readFileSync(p, "utf8")));

const units = [];
const problems = [];

// 单元列表从 data/ 里的 u<N>.json 自动发现（新增单元只需放文件，不用改这里）
const unitNums = readdirSync(dataDir)
  .map((f) => /^u(\d+)\.json$/.exec(f))
  .filter(Boolean)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b);

for (const n of unitNums) {
  const dataPath = join(dataDir, `u${n}.json`);
  if (!existsSync(dataPath)) {
    console.warn(`! 缺少 ${dataPath}，跳过 U${n}`);
    continue;
  }
  const data = readJson(dataPath);
  const keyPath = join(dataDir, `u${n}.key.json`);
  const explainPath = join(dataDir, `u${n}.explain.json`);
  const key = existsSync(keyPath) ? readJson(keyPath) : null;
  const explain = existsSync(explainPath) ? readJson(explainPath) : null;
  if (!key) problems.push(`U${n} 缺少 key 文件`);
  if (!explain) problems.push(`U${n} 缺少 explain 文件`);

  const unitName = data.unit || `U${n}`;
  const items = (data.items || []).slice().sort((a, b) => {
    const sa = a.section || "",
      sb = b.section || "";
    if (sa !== sb) return 0; // 保持文件里的顺序（= 卷面顺序）
    return a.no - b.no;
  });

  // 校验
  const seen = new Set();
  for (const it of items) {
    const rawId = it.id != null && it.id !== "" ? String(it.id) : String(it.no);
    if (seen.has(rawId)) problems.push(`${unitName} 重复 id: ${rawId}`);
    seen.add(rawId);
    const k = (key?.items || {})[rawId] || {};
    if (it.kind === "mc") {
      // 选项数 2–7：期中/模考卷的「五选五」「六选五」「七选五」匹配题同样按选择处理
      if (!it.options || it.options.length < 2 || it.options.length > 7) problems.push(`${unitName} ${rawId} 选项数不在 2–7 之间`);
      if (!/^[A-G]$/.test(String(k.answer || ""))) problems.push(`${unitName} ${rawId} 选择题答案缺失`);
      else if (!it.options.some((o) => o.k === k.answer)) problems.push(`${unitName} ${rawId} 答案 ${k.answer} 不在选项里`);
    }
    if (it.kind === "fill") {
      if (!(it.fields >= 1)) problems.push(`${unitName} ${rawId} 缺少 fields`);
      if (!k.answer && !k.manual && !k.doubt) problems.push(`${unitName} ${rawId} 填空答案缺失且未标 manual/doubt`);
    }
  }

  units.push({
    unit: unitName,
    title: data.title || `九上 ${unitName} 过关`,
    header: data.header || {},
    note: data.note || "",
    passages: data.passages || {},
    // 原卷图（题库内文件名）；数据里没有就按老约定「九上_U{n}.jpg」，显式 null 表示没有收录
    scan: data.scan === undefined ? `九上_${unitName}.jpg` : data.scan,
    items,
    key: key || { items: {} },
    explain: explain ? explain.items || {} : {},
  });
}

// ---- 悬停词义（data/vocab-zk.json 中考词表 + data/gloss-extra.json 人工补充）----
// 只注入「题库里真的出现过」的词形，bundle 不会被整本词典撑大。
// 屈折变化（-s/-ed/-ing/-er/-est/-ly、不规则动词、名词复数）在这里展开成具体词形，
// 前端只做精确查表，不再带一套词形还原逻辑。
const IRREGULAR = {
  ate: "eat", beaten: "beat", became: "become", began: "begin", begun: "begin", bent: "bend", bit: "bite", bitten: "bite",
  blew: "blow", blown: "blow", broke: "break", broken: "break", brought: "bring", built: "build", bought: "buy", caught: "catch",
  chose: "choose", chosen: "choose", came: "come", did: "do", done: "do", drew: "draw", drawn: "draw", drank: "drink",
  drunk: "drink", drove: "drive", driven: "drive", fell: "fall", fallen: "fall", fed: "feed", felt: "feel", fought: "fight",
  found: "find", flew: "fly", flown: "fly", forgot: "forget", forgotten: "forget", got: "get", gotten: "get",
  gave: "give", given: "give", went: "go", gone: "go", grew: "grow", grown: "grow", hung: "hang", had: "have", heard: "hear",
  hid: "hide", hidden: "hide", held: "hold", kept: "keep", knew: "know", known: "know", laid: "lay", led: "lead",
  left: "leave", lent: "lend", lay: "lie", lain: "lie", lit: "light", lost: "lose", made: "make", meant: "mean", met: "meet",
  paid: "pay", rode: "ride", ridden: "ride", rang: "ring", rose: "rise", risen: "rise", ran: "run", said: "say",
  saw: "see", seen: "see", sold: "sell", sent: "send", shook: "shake", shaken: "shake", shone: "shine", shot: "shoot",
  showed: "show", shown: "show", sang: "sing", sung: "sing", sank: "sink", sat: "sit", slept: "sleep", spoke: "speak",
  spoken: "speak", spent: "spend", stood: "stand", stole: "steal", stolen: "steal", stuck: "stick", swam: "swim",
  swum: "swim", took: "take", taken: "take", taught: "teach", tore: "tear", torn: "tear", told: "tell", thought: "think",
  threw: "throw", thrown: "throw", understood: "understand", woke: "wake", worn: "wear", wore: "wear", won: "win",
  wrote: "write", written: "write", children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth",
  mice: "mouse", knives: "knife", leaves: "leaf", wolves: "wolf", shelves: "shelf", thieves: "thief", wives: "wife",
  halves: "half", better: "good", best: "good", worse: "bad", worst: "bad",
};
const zkPath = join(dataDir, "vocab-zk.json");
const extraPath = join(dataDir, "gloss-extra.json");
const zk = existsSync(zkPath) ? readJson(zkPath) : { words: {}, phrases: {} };
const extra = existsSync(extraPath) ? readJson(extraPath) : { words: {}, phrases: {} };
if (!existsSync(zkPath)) console.warn("! 缺少 data/vocab-zk.json：题干与短文没有悬停词义");
const gWords = Object.assign({}, zk.words || {}, extra.words || {});
const gPhrases = Object.assign({}, zk.phrases || {}, extra.phrases || {});
const irregular = Object.assign({}, IRREGULAR, extra.irregular || {});

// 虚词不注：a/the/of/in 这类词给了释义反而是噪音（还会显示成一长串词性），
// 学生也不会去查。extra.stop 可以再加，写了也不会生效。
const STOP = new Set(
  ("a an the of in on at to for with by from as and or but so if than that this these those it its " +
    "he she they them his her their him we us you your our i me my mine who whom whose which what when where why how " +
    "is am are was were be been being do does did done have has had having will would shall should can could may might must " +
    "not no nor too very just also there here then now more most much many some any all each every both few other another " +
    "one two three up down out off over under about into onto than while because although though unless until since " +
    "s t d ll re ve m th").split(/\s+/)
);
for (const w of extra.stop || []) STOP.add(low(w));

// 词典释义偏长（"n. 感觉；vi. 觉得；vt. 感觉"），气泡里两行就够；超长的截断。
function trimGloss(m) {
  let s = String(m).replace(/\s+/g, " ").trim().replace(/^n\.\s*a\.\s*/i, "");   // "n. a." 是词表给词组打的坏词性
  const parts = s.split("；").filter(Boolean);
  if (parts.length > 2) s = parts.slice(0, 2).join("；");
  if (s.length > 30) s = s.slice(0, 30).replace(/[，,；;、]$/, "") + "…";
  return s;
}

const WORD_RE = /[A-Za-z](?:[A-Za-z'\u2019-]*[A-Za-z])?/g;
const low = (s) => String(s || "").toLowerCase().replace(/\u2019/g, "'");
// 一个词形可能与哪些原形对得上：精确 → 不规则表 → 常见后缀（含双写辅音）
function lemmasOf(w) {
  const out = [w];
  if (irregular[w]) out.push(irregular[w]);
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  const rules = [["ies", "y"], ["ied", "y"], ["es", ""], ["s", ""], ["ing", ""], ["ing", "e"],
    ["ed", ""], ["ed", "e"], ["er", ""], ["er", "e"], ["est", ""], ["ly", ""], ["ily", "y"],
    ["ier", "y"], ["iest", "y"], ["ally", "al"], ["ness", ""], ["ment", ""]];
  for (const [suf, rep] of rules) {
    if (!w.endsWith(suf) || w.length - suf.length < 2) continue;
    const b = w.slice(0, -suf.length) + rep;
    out.push(b);
    if (b.length > 2 && b[b.length - 1] === b[b.length - 2]) out.push(b.slice(0, -1));
  }
  return out;
}
// 题库文本 = 短文 + 题干 + 选项（解析是中文讲解，不做悬停）
const corpus = [];
for (const u of units) {
  for (const t of Object.values(u.passages || {})) corpus.push(String(t));
  for (const it of u.items || []) {
    corpus.push(String(it.stem || ""));
    for (const o of it.options || []) corpus.push(String(o.t || ""));
  }
}
const corpusText = corpus.join("\n");
const forms = new Set();
for (const t of corpus) {
  const m = String(t).match(WORD_RE) || [];
  for (const w of m) forms.add(low(w));
}
const glossWords = {};
const missed = [];
for (const w of [...forms].sort()) {
  if (STOP.has(w)) continue;
  const key = lemmasOf(w).find((c) => Object.prototype.hasOwnProperty.call(gWords, c));
  if (key) glossWords[w] = trimGloss(gWords[key]);
  else if (!/^[a-z]$/.test(w) && !w.includes("'")) missed.push(w);
}
// 词组释义：先剥掉词性标签（词表里大量 "n. a. 第一次"），义项多于 2 条时取最短的那条
// ——"退避三舍；回避；不要到…去" 取「回避」，比按顺序取前两条靠谱。
function trimPhrase(m) {
  let s = String(m).replace(/\s+/g, " ").trim().replace(/^(?:[a-z]{1,4}\.\s*)+/i, "");
  const parts = s.split("；").filter(Boolean);
  if (parts.length > 2) s = parts.slice().sort((a, b) => a.length - b.length)[0];
  if (s.length > 30) s = s.slice(0, 30).replace(/[，,；;、]$/, "") + "…";
  return s || String(m);
}
const phraseOut = {};
const phrasePool = Object.keys(gPhrases)
  .filter((k) => k.split(/\s+/).length > 1 && gPhrases[k])
  .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);
for (const k of phrasePool) {
  const rx = low(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (new RegExp("(^|[^a-z])" + rx + "($|[^a-z])").test(low(corpusText))) phraseOut[low(k)] = trimPhrase(gPhrases[k]);
}
const gloss = { words: glossWords, phrases: phraseOut };
const covHit = Object.keys(glossWords).length;
const covTotal = [...forms].filter((w) => !STOP.has(w)).length;   // 虚词不算进分母

// 不带 generatedAt：ADR-0003 要求同一份源重建两次产物 SHA 必须相同
const bundle = { units };
const json = JSON.stringify(bundle, null, 1);

// 旧题号 → 新题号的迁移表（数据改为按原卷大题分区时生成），随数据一起下发
const migPath = join(dataDir, "id-migration.json");
const migration = existsSync(migPath) ? readJson(migPath).map || {} : {};
const migJson = JSON.stringify(migration, null, 1);
const glossJson = JSON.stringify(gloss);
const dataScript =
  `window.__ID_MIGRATION = ${migJson};\n` + `window.QUIZ_DATA = ${json};\n` +
  `window.PRACTICE_GLOSS = ${glossJson};\n`;
writeFileSync(join(dataDir, "bundle.js"), dataScript, "utf8");

// 单文件版：把数据包内联进 index.html（顺带把原卷图的相对路径改到「英语/」这一层）
const htmlPath = join(here, "index.html");
const html = readFileSync(htmlPath, "utf8");
const marker = '<script src="data/bundle.js"></script>';
if (!html.includes(marker)) {
  console.error("! index.html 中没有找到数据包占位脚本，未生成单文件版");
  process.exitCode = 1;
} else {
  const inline = `<script>${dataScript}</script>`;
  const standalone = html
    .replace(marker, inline)
    .replace('data-scan-base="../题库"', 'data-scan-base="题库"');
  writeFileSync(join(here, "..", "九上英语过关练习.html"), standalone, "utf8");
}

// 汇总
let mcTotal = 0,
  fillTotal = 0,
  fieldTotal = 0,
  marked = 0,
  doubt = 0,
  manual = 0,
  explained = 0,
  total = 0;
const perUnit = [];
for (const u of units) {
  const items = u.items || [];
  const mc = items.filter((i) => i.kind === "mc");
  const fills = items.filter((i) => i.kind === "fill");
  mcTotal += mc.length;
  fillTotal += fills.length;
  fieldTotal += fills.reduce((s, i) => s + (i.fields || 1), 0);
  marked += mc.filter((i) => i.marked).length;
  total += items.length;
  doubt += Object.values(u.key?.items || {}).filter((k) => k.doubt).length;
  manual += Object.values(u.key?.items || {}).filter((k) => k.manual).length;
  for (const it of items) {
    const rawId = it.id != null && it.id !== "" ? String(it.id) : String(it.no);
    const e = u.explain?.[rawId];
    if (e && e.point && e.why && e.trap) explained++;
  }
  const secs = [...new Set(items.map((i) => i.section || "（无大题标题）"))];
  perUnit.push(`  ${u.unit}: ${items.length} 题（${mc.length} 选择 / ${fills.length} 填空 · ${fills.reduce((s, i) => s + (i.fields || 1), 0)} 空）· 大题 ${secs.join(" / ")}`);
}

if (problems.length) {
  console.error("✗ 数据校验未通过：");
  problems.forEach((p) => console.error("  - " + p));
  process.exitCode = 1;
} else {
  console.log("✓ 数据校验通过（id 唯一 / 选择题 2–7 选项且答案在选项内 / 填空题有答案或标存疑）");
}
console.log(
  `✓ ${units.length} 个单元 · ${total} 题 · 选择 ${mcTotal} · 填空 ${fillTotal}（按空 ${fieldTotal}）· 原卷有作答 ${marked} · 存疑 ${doubt} · 无参考答案 ${manual} · 四段式解析 ${explained}/${total}`
);
console.log(perUnit.join("\n"));
console.log(
  `悬停词义：${covHit}/${covTotal} 可注词形（${covTotal ? Math.round((covHit / covTotal) * 100) : 0}%）· ` +
    `虚词 ${forms.size - covTotal} 个不注 · ${Object.keys(phraseOut).length} 个短语` +
    (missed.length ? ` · 未收录 ${missed.length}` : "")
);
if (missed.length) {
  console.log(`  未收录词形（补 data/gloss-extra.json 的 words）：${missed.slice(0, 40).join("、")}${missed.length > 40 ? " 等" : ""}`);
}
console.log("→ data/bundle.js");
console.log("→ ../九上英语过关练习.html（单文件，可双击打开）");
