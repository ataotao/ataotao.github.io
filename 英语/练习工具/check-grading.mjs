// 离线核对：按 app 相同规则给「原卷手写」判分，打印清单，便于人工复核
// 用法：node check-grading.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(join(here, "data", p), "utf8").replace(/^\uFEFF/, ""));

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\u2019\u2018\u00b4`]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\//g, " ")
    .replace(/'/g, "")
    .replace(/[.,;:!?"()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function hwFull(it) {
  const hw = (it.handwriting || []).join(" ").trim();
  if (!hw || hw.includes("看不清")) return hw;
  const m = /([A-Za-z]+)_{3,}/.exec(it.stem || "");
  if (!m || !m[1]) return hw;
  const pre = m[1];
  if (hw.toLowerCase().indexOf(pre.toLowerCase()) === 0) return hw;
  return pre + hw;
}
const isSentence = (a) => /\.\s*$/.test(String(a || ""));

const counts = { right: 0, wrong: 0, close: 0, unknown: 0 };
const mcWrong = [];

for (const n of [1, 2, 3, 4]) {
  const data = load(`u${n}.json`);
  const key = load(`u${n}.key.json`);
  console.log(`\n══ U${n} ══`);
  for (const it of data.items) {
    const k = key.items[it.id || String(it.no)] || {};
    if (it.kind === "mc") {
      if (it.marked && it.marked !== k.answer) {
        mcWrong.push(`U${n} ${it.id || ""} 第${it.no}题 原卷${it.marked} → 正确${k.answer}  [${k.topic || ""}]`);
      }
      continue;
    }
    if (it.kind !== "fill") continue;
    const hw = hwFull(it);
    const accepted = [k.answer, ...(k.alt || [])].map(norm).filter(Boolean);
    let g = "unknown";
    if (!k.manual && k.answer && hw && !hw.includes("看不清")) {
      if (accepted.includes(norm(hw))) g = "right";
      else g = isSentence(k.answer) ? "close" : "wrong";
    }
    counts[g]++;
    const flag = g === "right" ? "✓" : g === "wrong" ? "✗" : g === "close" ? "~" : "?";
    console.log(
      `${flag} ${it.id || ""} 第${it.no}题 ${g.padEnd(7)} 手写=${hw || "-"} | 答案=${JSON.stringify(k.answer)}` +
        (k.alt ? ` alt=${JSON.stringify(k.alt)}` : "") +
        (k.manual ? " [manual]" : "") +
        (k.doubt ? " [doubt]" : "")
    );
    if (g === "wrong" || g === "close") {
      console.log(`     题目: ${(it.cn ? it.cn + " // " : "") + it.stem.replace(/\s+/g, " ")}`);
      console.log(`     解析: ${k.why || ""}`);
    }
  }
}

console.log("\n══ 填空题判分统计 ══");
console.log(counts);
console.log("\n══ 选择题原卷错题 ══");
mcWrong.forEach((x) => console.log(" " + x));
if (!mcWrong.length) console.log(" 无");
