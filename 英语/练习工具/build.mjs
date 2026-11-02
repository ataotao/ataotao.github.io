// 合并 OCR 数据为练习工具的数据包，并产出单文件版本。
// 用法：node build.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");

const units = [];

// 人工剔除：不属于本卷内容的残片（转写时已标注来源）
const DROP = {
  U2: ["p26", "p27", "gf11"], // 页顶残留（疑为他卷末尾）+ 截断的语法填空
};

for (const n of [1, 2, 3, 4]) {
  const dataPath = join(dataDir, `u${n}.json`);
  const keyPath = join(dataDir, `u${n}.key.json`);
  const explainPath = join(dataDir, `u${n}.explain.json`);
  if (!existsSync(dataPath)) {
    console.warn(`! 缺少 ${dataPath}，跳过 U${n}`);
    continue;
  }
  const data = JSON.parse(readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
  const key = existsSync(keyPath)
    ? JSON.parse(readFileSync(keyPath, "utf8").replace(/^\uFEFF/, ""))
    : null;
  if (!key) console.warn(`! 缺少 ${keyPath}，U${n} 将没有答案与解析`);
  const explain = existsSync(explainPath)
    ? JSON.parse(readFileSync(explainPath, "utf8").replace(/^\uFEFF/, ""))
    : null;
  if (!explain) console.warn(`! 缺少 ${explainPath}，U${n} 将使用简版解析`);
  const unitName = data.unit || `U${n}`;
  const drop = DROP[unitName] || [];
  const items = (data.items || []).filter((it) => {
    const id = it.id != null && it.id !== "" ? String(it.id) : String(it.no);
    return !drop.includes(id);
  });
  units.push({
    unit: unitName,
    title: data.title || `九上 ${unitName} 过关`,
    header: data.header || {},
    note: data.note || "",
    items,
    key: key || { items: {} },
    explain: explain ? explain.items || {} : {},
  });
}

const bundle = { generatedAt: new Date().toISOString(), units };
const json = JSON.stringify(bundle, null, 1);

writeFileSync(join(dataDir, "bundle.js"), `window.QUIZ_DATA = ${json};\n`, "utf8");

// 单文件版：把数据包内联进 index.html
const htmlPath = join(here, "index.html");
const html = readFileSync(htmlPath, "utf8");
const marker = '<script src="data/bundle.js"></script>';
if (!html.includes(marker)) {
  console.error("! index.html 中没有找到数据包占位脚本，未生成单文件版");
} else {
  const inline = `<script>window.QUIZ_DATA = ${json};</script>`;
  const standalone = html.replace(marker, inline);
  // 单文件版直接产出到上层「英语」文件夹，双击即用
  writeFileSync(join(here, "..", "九上英语过关练习.html"), standalone, "utf8");
}

// 汇总
let mcTotal = 0, fillTotal = 0, marked = 0, doubt = 0, explained = 0, total = 0;
for (const u of units) {
  const items = u.items || [];
  const mc = items.filter((i) => i.kind === "mc");
  mcTotal += mc.length;
  fillTotal += items.filter((i) => i.kind === "fill").length;
  marked += mc.filter((i) => i.marked).length;
  total += items.length;
  doubt += Object.values(u.key?.items || {}).filter((k) => k.doubt).length;
  for (const it of items) {
    const id = it.id != null && it.id !== "" ? String(it.id) : String(it.no);
    const e = u.explain?.[id];
    if (e && e.point && e.why && e.trap) explained++;
  }
}
console.log(
  `✓ ${units.length} 个单元 · 题目 ${total} · 选择题 ${mcTotal} · 填空 ${fillTotal} · 原卷有作答 ${marked} · 存疑 ${doubt} · 三段式解析 ${explained}/${total}`
);
console.log("→ data/bundle.js");
console.log("→ ../九上英语过关练习.html（单文件，可双击打开）");
