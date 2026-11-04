// 一次性数据迁移：把「按题型拍平」的 u1–u4 改成「按原卷大题分区 + 大题内题号」的新结构。
// 依据：docs/plans/英语过关练习改版方案.md §三
// 运行：node 英语/练习工具/migrate-sections.mjs
// 产出：覆写 data/u*.json、u*.key.json、u*.explain.json，另写 data/id-migration.json
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "data");
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8").replace(/^\uFEFF/, ""));
const write = (f, o) => writeFileSync(join(dir, f), JSON.stringify(o, null, 1) + "\n", "utf8");
const clone = (x) => JSON.parse(JSON.stringify(x));
const idOf = (it) => (it.id != null && it.id !== "" ? String(it.id) : String(it.no));

const migration = {}; // 旧 id（不含 unit 前缀）→ 新 id
const log = [];

/* ── U1：27 题，连续编号，无大题标题 ───────────────────────── */
{
  const u = read("u1.json"), k = read("u1.key.json"), e = read("u1.explain.json");
  const u2 = read("u2.json"), k2 = read("u2.key.json"), e2 = read("u2.explain.json");

  // 学号按卷面 099；姓名被涂黑不可读、班级字形不清 → 依 SCHEMA「绝不猜」置 null
  u.header = { class: null, name: null, id: "099" };

  const q25 = u.items.find((i) => i.no === 25);
  q25.options = [
    { k: "A", t: "if; whether" },
    { k: "B", t: "that; that" },
    { k: "C", t: "whether; if" },
    { k: "D", t: "that; whether" },
  ];
  q25.note = "选项印在下一页首行（页2 顶部）；题干 certain ___ … unsure ___ → that; whether，作 D";
  k.items["25"] = {
    answer: "D",
    topic: "that / whether 从句",
    why: "certain 后接 that 从句（确信某事），unsure 后接 whether 从句（不确定是否）；四个选项中只有 D 是 that; whether。",
    doubt: false,
  };
  e.items["25"] = {
    topic: "certain that / unsure whether",
    point: "certain 后接 that 从句表示「确信……」；unsure 后接 whether 从句表示「不确定是否……」；宾语从句缺成分时用 that/what/who 等，表「是否」只能用 whether/if。",
    why: "句意：我们确信他出了问题，但不确定他会不会死于这种病。前一空后是完整陈述，用 that；后一空是「是否」的疑问含义，用 whether。A 的 if; whether 顺序反了，B 的 that; that 第二空语义不对，C 的 whether; if 第一空不能表确信。",
    trap: "把「不确定是否」写成 that，或受口语影响在后一空用 if 而前一空用 whether。判断顺序：先看谓语（certain/unsure）要什么从句，再看从句是否缺成分。",
  };

  // 页2 顶部第 26、27 题属于 U1（原被当成他卷残片 DROP 掉）
  for (const old of ["p26", "p27"]) {
    const it = u2.items.find((i) => i.id === old);
    if (!it) throw new Error("找不到 " + old);
    const no = it.no; // 26 / 27
    const moved = {
      no,
      kind: "fill",
      stem: it.stem,
      cn: it.cn,
      options: null,
      marked: null,
      handwriting: it.handwriting || null,
      note: "本页属 U1（跨页题）：题干在页1 末、题号在页2 顶部",
    };
    u.items.push(moved);
    k.items[String(no)] = k2.items[old];
    if (e2.items[old]) e.items[String(no)] = e2.items[old];
    log.push(`U1 +${no}（搬自 U2 ${old}）`);
  }

  u.items.sort((a, b) => a.no - b.no);
  write("u1.json", u);
  write("u1.key.json", k);
  write("u1.explain.json", e);
  log.push(`U1 → ${u.items.length} 题`);
}

/* ── U2：29 题 = 主体 1–13 + 语法 1–10 + 语法填空 1–6 ─────────── */
{
  const u = read("u2.json"), k = read("u2.key.json"), e = read("u2.explain.json");
  const u3 = read("u3.json"), k3 = read("u3.key.json"), e3 = read("u3.explain.json");

  u.items = u.items.filter((i) => !["p26", "p27", "gf11"].includes(i.id));

  for (const it of u.items) {
    if (it.id.startsWith("m")) it.section = null; // 卷面这一段没有大题标题，不编造
    else if (it.id.startsWith("g")) it.section = "语法";
    it.paperNo = it.no; // 卷面题号（大题内重数）
  }

  // 语法填空 6 空：错记在 u3 的第 18–23 条
  const blanks = u3.items.filter((i) => i.no >= 18).sort((a, b) => a.no - b.no);
  if (blanks.length !== 6) throw new Error("U3 语法填空空数不是 6：" + blanks.length);
  blanks.forEach((b, idx) => {
    const n = idx + 1;
    const id = "gf" + n;
    u.items.push({
      id,
      no: n,
      section: "语法填空",
      kind: "fill",
      stem: b.stem,
      cn: null,
      options: null,
      marked: null,
      handwriting: (b.handwriting || []).map((h) => (h === "[看不清]" ? "[看不清]" : h)),
      note: b.note || "",
      fields: 1,
    });
    k.items[id] = k3.items[String(b.no)];
    if (e3.items[String(b.no)]) e.items[id] = e3.items[String(b.no)];
    log.push(`U2 +${id}（搬自 U3 第 ${b.no} 条）`);
  });

  // 短文正文（跨页 2–3；第 4 空附近被修正带遮挡，原文可能缺句）
  u.passages = {
    "语法填空":
      "For thousands of years, people could not measure temperature exactly. They only knew if something was hot or cold by touching it. " +
      "People were {{1}}(doubt) whether this was a safe or accurate way. " +
      "Doctors needed a tool {{2}}(check) fevers, and scientists needed one to study heat. " +
      "A better way to measure temperature {{3}}(need). " +
      "The thermometer helps us {{4}} many ways. " +
      "Cooks use it for baking, {{5}}. Factories use it to keep machines safe. " +
      "It {{6}}(apply) to many aspects of our daily lives, bringing great convenience.",
  };
  u.note = "「语法填空」短文跨页 2–3（页3 顶部之前是它的后半）；第 4 空附近被白色修正带遮挡，短文可能存在未拍到/被遮内容，第 4、5 空答案存疑。";

  // 每个 fill 的按空拆分数
  for (const it of u.items) {
    if (it.kind !== "fill") continue;
    const key = k.items[it.id] || k.items[String(it.no)] || {};
    const parts = String(key.answer || "").split(/\s*\/\s*/).filter(Boolean);
    const blanks = (it.stem.match(/_+/g) || []).length;
    it.fields = it.section === "语法填空" ? 1 : Math.max(parts.length || blanks || 1, 1);
    if (parts.length > 1 && blanks > 1 && parts.length !== blanks) {
      log.push(`! ${it.id} 答案 ${parts.length} 段 vs 题干 ${blanks} 空`);
    }
  }
  // 语法填空的 6 空各只有一个空
  for (const it of u.items) if (it.section === "语法填空") it.fields = 1;

  write("u2.json", u);
  write("u2.key.json", k);
  write("u2.explain.json", e);
  log.push(`U2 → ${u.items.length} 题（含语法填空 6 空）`);
}

/* ── U3：17 题 = 阅读 1–13 + 语法 1–4 ──────────────────────── */
{
  const u = read("u3.json"), k = read("u3.key.json"), e = read("u3.explain.json");
  const dropNo = new Set([...u.items.filter((i) => i.no >= 18).map((i) => String(i.no))]);
  const kept = u.items.filter((i) => i.no < 18).sort((a, b) => a.no - b.no);

  const newItems = [], newKey = {}, newExplain = {};
  kept.forEach((it) => {
    const oldId = idOf(it);
    const isGrammar = it.no >= 14;
    const sec = isGrammar ? "语法" : "阅读";
    const paperNo = isGrammar ? it.no - 13 : it.no;
    const id = (isGrammar ? "g" : "r") + paperNo;
    migration[`U3-${oldId}`] = `U3-${id}`;
    const clone2 = clone(it);
    delete clone2.id;
    Object.assign(clone2, { id, no: paperNo, paperNo, section: sec });
    const key = k.items[oldId] || k.items[String(it.no)] || {};
    const parts = String(key.answer || "").split(/\s*\/\s*/).filter(Boolean);
    const blanks = (it.stem.match(/_+/g) || []).length;
    if (it.kind === "fill") clone2.fields = Math.max(parts.length || blanks || 1, 1);
    newItems.push(clone2);
    if (k.items[oldId]) newKey[id] = k.items[oldId];
    else if (k.items[String(it.no)]) newKey[id] = k.items[String(it.no)];
    const exp = e.items[oldId] || e.items[String(it.no)];
    if (exp) newExplain[id] = exp;
    log.push(`U3 ${oldId} → ${id}（${sec} 第 ${paperNo} 题）`);
  });
  dropNo.forEach((n) => log.push(`U3 −${n}（搬到 U2 语法填空）`));
  write("u3.json", { unit: u.unit, title: u.title, header: u.header, note: u.note || "", items: newItems });
  write("u3.key.json", { unit: k.unit, items: newKey });
  write("u3.explain.json", { unit: e.unit, items: newExplain });
  log.push(`U3 → ${newItems.length} 题`);
}

/* ── U4：16 条 = 单词拼写 2 + 单项选择 6 + 完成句子 5 + 句型翻译 3 ─ */
{
  const u = read("u4.json"), k = read("u4.key.json"), e = read("u4.explain.json");
  const secOf = (no) => {
    if (no <= 2) return { sec: "单词拼写", paperNo: no, prefix: "m", noLabel: null };
    if (no <= 8) return { sec: "单项选择", paperNo: no - 2, prefix: "c", noLabel: null };
    if (no <= 13) return { sec: "完成句子", paperNo: no - 8, prefix: "s", noLabel: null };
    return { sec: "句型翻译", paperNo: no - 13, prefix: "t", noLabel: `(${no - 13})` };
  };
  const newItems = [], newKey = {}, newExplain = {};
  u.items.forEach((it) => {
    const oldId = idOf(it);
    const { sec, paperNo, prefix, noLabel } = secOf(it.no);
    const id = prefix + paperNo;
    migration[`U4-${oldId}`] = `U4-${id}`;
    const clone2 = clone(it);
    delete clone2.id;
    Object.assign(clone2, { id, no: paperNo, paperNo, section: sec });
    if (noLabel) clone2.noLabel = noLabel;
    const key = k.items[oldId] || k.items[String(it.no)] || {};
    const parts = String(key.answer || "").split(/\s*\/\s*/).filter(Boolean);
    const blanks = (it.stem.match(/_+/g) || []).length;
    if (it.kind === "fill") clone2.fields = Math.max(parts.length || blanks || 1, 1);
    newItems.push(clone2);
    if (k.items[oldId]) newKey[id] = k.items[oldId];
    else if (k.items[String(it.no)]) newKey[id] = k.items[String(it.no)];
    const exp = e.items[oldId] || e.items[String(it.no)];
    if (exp) newExplain[id] = exp;
    log.push(`U4 ${oldId} → ${id}（${sec} 第 ${paperNo} 题${noLabel || ""}）`);
  });
  write("u4.json", { unit: u.unit, title: u.title, header: u.header, note: u.note || "", items: newItems });
  write("u4.key.json", { unit: k.unit, items: newKey });
  write("u4.explain.json", { unit: e.unit, items: newExplain });
  log.push(`U4 → ${newItems.length} 条`);
}

write("id-migration.json", { generatedAt: new Date().toISOString(), map: migration });
console.log(log.join("\n"));
console.log(`\n迁移表 ${Object.keys(migration).length} 条 → data/id-migration.json`);
