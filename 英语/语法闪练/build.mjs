// 语法闪练 · 数据校验 + 打包
//   node build.mjs              校验 data/g*.json，生成 data/bundle.js 与 ../语法闪练.html
//   node build.mjs --strict     缺数据文件也当错误（发布前验收用）
//
// 数据格式见 data/SCHEMA.md。产物只能由本脚本生成，不手改（ADR-0003）。
// 不写 generatedAt：同一份源重建两次，产物须逐字节相同。
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const strict = process.argv.includes("--strict");
const strip = (s) => s.replace(/^\uFEFF/, "");
const readJson = (p) => JSON.parse(strip(readFileSync(p, "utf8")));

// ---- 受控词表（与 data/SCHEMA.md 保持一致；改这里要同步改 SCHEMA.md） ----
const TOPICS = {
  clause: [
    "adj + that 从句", "it 作形式主语", "宾语从句", "宾语从句语序", "宾语从句时态",
    "状语从句", "条件状语从句", "让步状语从句", "名词性从句", "定语从句",
    "感叹句", "特殊疑问句", "祈使句", "附加疑问句", "直接引语间接引语",
  ],
  verb: [
    "不定式", "动名词", "非谓语辨析", "一般现在时", "一般过去时", "一般将来时",
    "现在完成时", "过去进行时", "被动语态（现在）", "被动语态（过去）",
    "被动语态（将来）", "被动语态（完成）", "情态动词", "主谓一致",
  ],
  word: [
    "系动词", "形容词副词", "形容词辨析", "副词辨析", "比较级", "最高级",
    "冠词", "代词", "不定代词", "介词", "介词短语", "连词", "并列连词",
    "名词单复数", "量词", "词形转换", "词义辨析", "短语动词",
  ],
  gz: ["广州卷·语法选择", "广州卷·语法填空", "广州卷·语篇填词"],
  verbform: ["不规则动词·过去式", "不规则动词·过去分词"],
};
const ALL_TOPICS = new Set(Object.values(TOPICS).flat());
const GROUP_PREFIX = { clause: "cl", verb: "vb", word: "wd", gz: "gz", verbform: "vf" };
const SPEC = { clause: [1, "从句与句子类型"], verb: [2, "动词三件套"], word: [3, "词法速记"], gz: [null, null], verbform: [4, "不规则动词闪刷"] };

const problems = [];
const warnings = [];
const err = (m) => problems.push(m);
const warn = (m) => warnings.push(m);
const chars = (s) => [...String(s ?? "")].length;
const UNDERSCORE = /_{3,}/g;

// ---- 读 block 元数据 ----
const metaPath = join(dataDir, "blocks.json");
if (!existsSync(metaPath)) err("缺少 data/blocks.json");
const meta = existsSync(metaPath) ? readJson(metaPath) : { blocks: [] };
const metaByBlock = new Map((meta.blocks || []).map((b) => [b.block, b]));

// ---- 读所有数据文件 ----
const files = readdirSync(dataDir)
  .filter((f) => /^g\d.*\.json$/.test(f))
  .sort();
if (!files.length) err("data/ 下没有任何 g*.json 题库文件");

const groups = [];
const seenId = new Map();   // id -> file
const seenStem = new Map(); // stem -> id
const allTopicsSeen = new Set();

for (const f of files) {
  let doc;
  try {
    doc = readJson(join(dataDir, f));
  } catch (e) {
    err(`${f}: JSON 解析失败 — ${e.message}`);
    continue;
  }
  const group = doc.group;
  if (!SPEC[group]) { err(`${f}: group "${group}" 非法（只允许 ${Object.keys(SPEC).join("/")}）`); continue; }
  if (!Array.isArray(doc.items) || !doc.items.length) { err(`${f}: items 为空`); continue; }
  if (doc.block !== SPEC[group][0] && SPEC[group][0] != null) {
    err(`${f}: block 应为 ${SPEC[group][0]}，实际 ${doc.block}`);
  }
  const block = doc.block;
  if (!Number.isInteger(block) || block < 1 || block > 9) err(`${f}: block 非法（${block}）`);
  if (!metaByBlock.has(block)) warn(`${f}: blocks.json 里没有 block ${block} 的元数据，界面会用兜底标题`);

  const prefix = GROUP_PREFIX[group];
  const localStem = new Map();
  let level3 = 0, unverified = 0;

  doc.items.forEach((it, i) => {
    const where = `${f} 第 ${i + 1} 条${it.id ? `（${it.id}）` : ""}`;
    const id = String(it.id ?? "");
    if (!/^[a-z]{2}-\d{3}$/.test(id)) err(`${where}: id 格式应为 "xx-001"`);
    if (!id.startsWith(prefix + "-")) err(`${where}: id 前缀应为 "${prefix}-"（group=${group}）`);
    if (seenId.has(id)) err(`${where}: id 与 ${seenId.get(id)} 重复`);
    else seenId.set(id, f);

    if (!ALL_TOPICS.has(it.topic)) err(`${where}: topic "${it.topic}" 不在受控词表内`);
    else allTopicsSeen.add(it.topic);
    if (!Number.isInteger(it.level) || it.level < 1 || it.level > 3) err(`${where}: level 应为 1/2/3`);
    if (it.level === 3) level3++;

    const stem = String(it.stem ?? "");
    const holes = (stem.match(UNDERSCORE) || []).length;
    if (holes !== 1) err(`${where}: 题干应恰好有一个 ______ 空（实际 ${holes} 个）`);
    if (!stem.trim()) err(`${where}: stem 为空`);
    if (seenStem.has(stem)) err(`${where}: 题干与 ${seenStem.get(stem)} 重复`);
    else seenStem.set(stem, id);
    if (localStem.has(stem)) err(`${where}: 文件内题干重复`);

    const opts = it.options;
    if (!Array.isArray(opts) || opts.length !== 4) err(`${where}: options 必须是长度 4 的数组`);
    else {
      const norm = opts.map((o) => String(o ?? "").trim());
      if (norm.some((o) => !o)) err(`${where}: 有空选项`);
      if (new Set(norm.map((o) => o.toLowerCase())).size !== 4) err(`${where}: 四个选项有重复`);
      if (norm.some((o) => /^[A-Da-d][.、)]/.test(o))) err(`${where}: 选项不要带 "A." 前缀`);
      if (norm.some((o) => /_{3,}/.test(o))) err(`${where}: 选项里不要出现下划线空`);
    }
    if (!/^[A-D]$/.test(String(it.answer ?? ""))) err(`${where}: answer 应为 A–D`);
    if (it.cn != null && typeof it.cn !== "string") err(`${where}: cn 应为字符串或 null`);
    if (!String(it.rule ?? "").trim()) err(`${where}: rule 为空`);
    if (chars(it.rule) > 60) err(`${where}: rule ${chars(it.rule)} 字，超过 60`);
    if (!String(it.trap ?? "").trim()) err(`${where}: trap 为空`);
    if (chars(it.trap) > 50) err(`${where}: trap ${chars(it.trap)} 字，超过 50`);
    if (!String(it.src ?? "").trim()) err(`${where}: src 为空`);
    if (typeof it.verified !== "boolean") err(`${where}: verified 应为 true/false`);
    if (it.verified === false) unverified++;
  });

  if (doc.items.length >= 10 && level3 / doc.items.length > 0.15) {
    err(`${f}: level 3 占 ${level3}/${doc.items.length}，超过 15%`);
  }
  if (unverified) warn(`${f}: ${unverified} 题标了 verified:false，需人工复核`);

  // block 内组顺序：block 升序，同 block 按文件名（= 便宜的顺序控制）
  groups.push({ group, block, title: doc.title, file: f, items: doc.items });
  console.log(`✓ ${f}: ${doc.items.length} 题 · block ${block} · level3 ${level3} · 未复核 ${unverified}`);
}

// ---- 缺文件检查 ----
const MUST = ["g1-clause.json", "g2-verb.json", "g3-word.json", "g5-verbform.json"];
for (const m of MUST) {
  if (!files.includes(m)) (strict ? err : warn)(`缺少题库文件 data/${m}`);
}

// ---- 组包 ----
const items = [];
for (const g of groups) {
  for (const it of g.items) {
    items.push({
      id: it.id, group: g.group, block: g.block,
      topic: it.topic, level: it.level,
      stem: it.stem, cn: it.cn ?? null,
      options: it.options.map((o) => String(o).trim()),
      answer: it.answer,
      rule: it.rule, trap: it.trap, src: it.src,
      verified: it.verified !== false,
    });
  }
}

const blocks = [...new Set(items.map((i) => i.block))]
  .sort((a, b) => a - b)
  .map((b) => {
    const m = metaByBlock.get(b) || {};
    const its = items.filter((i) => i.block === b);
    return {
      block: b,
      title: m.title || its[0]?.blockTitle || `第 ${b} 组`,
      minutes: m.minutes || Math.max(5, Math.round(its.length * 0.5)),
      hint: m.hint || "",
      items: its,
    };
  });

// ---- 附带文档：把仓库里的 markdown 转成页内可读的 HTML ----
// 为什么在构建期转换：`.md` 在浏览器里只会变成下载或源码，页内直接渲染才叫"方便查看"，
// 而且单文件离线版也能一并带走（不依赖相对路径、不依赖联网）。
// 只支持我们这几份文档用到的语法：标题 / 段落 / 粗体 / 行内代码 / 链接 / 列表 / 引用 / 分隔线 / 表格 / 代码块。
function mdToHtml(md) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = String(md).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  const STOP = /^(#{1,6}\s|[-*]\s|\d+\.\s|>|\||```|-{3,}$|\*{3,}$)/;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const before = i;

    if (/^```/.test(line)) {
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]);
      i++;
      out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
    } else if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      out.push("<hr>");
      i++;
    } else if (/^(#{1,6})\s+/.test(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      const lv = Math.min(m[1].length, 4);
      out.push(`<h${lv}>${inline(m[2])}</h${lv}>`);
      i++;
    } else if (line.startsWith("|") && i + 1 < lines.length && /\|/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
      const cells = (s) => s.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((x) => x.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++].trim()));
      out.push(
        "<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>"
      );
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) buf.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push("<blockquote>" + buf.map(inline).join("<br>") + "</blockquote>");
    } else if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const re = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const buf = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (re.test(t)) { buf.push(t.replace(re, "")); i++; }
        else break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>` + buf.map((x) => `<li>${inline(x)}</li>`).join("") + `</${tag}>`);
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !STOP.test(lines[i].trim())) buf.push(lines[i++].trim());
      if (!buf.length) buf.push(lines[i++].trim());
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }
    if (i === before) i++; // 兜底：任何分支都必须前进，避免死循环
  }
  return out.join("\n");
}

const DOC_FILES = [
  { key: "card", title: "考前口诀卡", file: "考前口诀卡.md" },
  { key: "plan", title: "今晚复习方案", file: "../../docs/plans/语法闪练与今晚复习方案.md" },
  { key: "guide", title: "使用说明", file: "使用说明.md" },
];
const docs = {};
for (const d of DOC_FILES) {
  const p = join(here, d.file);
  if (!existsSync(p)) { warn(`缺少文档 ${d.file}，「${d.title}」在页内不可用`); continue; }
  docs[d.key] = { title: d.title, html: mdToHtml(readFileSync(p, "utf8")) };
}

const bundle = { blocks };
const dataScript =
  `window.FLASH_DATA = ${JSON.stringify(bundle, null, 1)};\n` +
  `window.FLASH_DOCS = ${JSON.stringify(docs)};\n`;
writeFileSync(join(dataDir, "bundle.js"), dataScript, "utf8");

// ---- 单文件版 ----
const htmlPath = join(here, "index.html");
if (!existsSync(htmlPath)) {
  warn("index.html 还没生成，跳过单文件版");
} else {
  const html = readFileSync(htmlPath, "utf8");
  const marker = '<script src="data/bundle.js"></script>';
  if (!html.includes(marker)) {
    err('index.html 里找不到数据占位 <script src="data/bundle.js"></script>，无法生成单文件版');
  } else {
    writeFileSync(join(here, "..", "语法闪练.html"), html.replace(marker, `<script>${dataScript}</script>`), "utf8");
  }
}

// ---- 汇总 ----
const byTopic = new Map();
for (const it of items) byTopic.set(it.topic, (byTopic.get(it.topic) || 0) + 1);
const unverifiedIds = items.filter((i) => !i.verified).map((i) => i.id);
const missing = Object.keys(TOPICS).filter((g) => !groups.some((x) => x.group === g));

console.log("");
console.log(`分 block：${blocks.map((b) => `B${b.block} ${b.title} ${b.items.length}题`).join(" ｜ ")}`);
console.log(`合计 ${items.length} 题 · 考点 ${byTopic.size} 个 · 未复核 ${unverifiedIds.length}${unverifiedIds.length ? "（" + unverifiedIds.join(",") + "）" : ""}`);
console.log(`页内文档：${Object.keys(docs).map((k) => `${docs[k].title}(${(docs[k].html.length / 1024).toFixed(0)}KB)`).join(" · ") || "无"}`);
if (missing.length) console.log(`未启用的题组：${missing.join(", ")}`);

if (warnings.length) {
  console.log("\n⚠ 警告：");
  warnings.forEach((w) => console.log("  - " + w));
}
if (problems.length) {
  console.error("\n✗ 数据校验未通过（" + problems.length + " 项）：");
  problems.forEach((p) => console.error("  - " + p));
  process.exitCode = 1;
} else {
  console.log("\n✓ 数据校验通过");
  console.log("→ data/bundle.js");
  if (existsSync(join(here, "..", "语法闪练.html"))) console.log("→ ../语法闪练.html（单文件，可双击打开）");
}
