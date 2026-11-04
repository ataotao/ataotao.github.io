// 合并 OCR 数据为练习工具的数据包，并产出单文件版本。
// 用法：node build.mjs
//
// 数据格式（按原卷大题分区）见 data/SCHEMA.md：
//   items[].section  = 卷面大题标题（卷面没有就 null，不编造）
//   items[].no       = 大题内题号（卷面印的号）
//   items[].noLabel  = 可选，如 U4「句型翻译」的 "(1)"
//   items[].fields   = 填空题按卷面横线数拆几个输入框
//   passages         = 按 section 共享的长文本（U2 语法填空短文）
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const strip = (s) => s.replace(/^\uFEFF/, "");
const readJson = (p) => JSON.parse(strip(readFileSync(p, "utf8")));

const units = [];
const problems = [];

for (const n of [1, 2, 3, 4]) {
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
      if (!it.options || it.options.length !== 4) problems.push(`${unitName} ${rawId} 选项不是 4 个`);
      if (!/^[A-D]$/.test(String(k.answer || ""))) problems.push(`${unitName} ${rawId} 选择题答案缺失`);
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
    items,
    key: key || { items: {} },
    explain: explain ? explain.items || {} : {},
  });
}

// 不带 generatedAt：ADR-0003 要求同一份源重建两次产物 SHA 必须相同
const bundle = { units };
const json = JSON.stringify(bundle, null, 1);

// 旧题号 → 新题号的迁移表（数据改为按原卷大题分区时生成），随数据一起下发
const migPath = join(dataDir, "id-migration.json");
const migration = existsSync(migPath) ? readJson(migPath).map || {} : {};
const migJson = JSON.stringify(migration, null, 1);
const dataScript =
  `window.__ID_MIGRATION = ${migJson};\n` + `window.QUIZ_DATA = ${json};\n`;
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
  console.log("✓ 数据校验通过（id 唯一 / 选择题 4 选项且答案在选项内 / 填空题有答案或标存疑）");
}
console.log(
  `✓ ${units.length} 个单元 · ${total} 题 · 选择 ${mcTotal} · 填空 ${fillTotal}（按空 ${fieldTotal}）· 原卷有作答 ${marked} · 存疑 ${doubt} · 无参考答案 ${manual} · 四段式解析 ${explained}/${total}`
);
console.log(perUnit.join("\n"));
console.log("→ data/bundle.js");
console.log("→ ../九上英语过关练习.html（单文件，可双击打开）");
