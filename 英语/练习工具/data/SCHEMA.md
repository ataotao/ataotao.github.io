# 数据格式规范（OCR 转录用）

每个单元产出一个 JSON 文件，UTF-8，无注释，严格遵循以下结构。宁缺毋滥：看不清就填 `null` 并在 `note` 里写原因，**绝不猜**。

```json
{
  "unit": "U1",
  "title": "九上 U1 过关",
  "header": {
    "class": null,
    "name": null,
    "id": "099"
  },
  "items": [
    {
      "no": 1,
      "section": null,
      "kind": "fill",
      "stem": "It is ______ that Wang Zhenyi is remembered for her great work.",
      "cn": null,
      "options": null,
      "marked": null,
      "handwriting": ["fact"],
      "fields": 1,
      "note": "手写答案是 fact"
    },
    {
      "no": 5,
      "section": null,
      "kind": "mc",
      "stem": "______ is fitting that hard work finally leads to good results.",
      "cn": null,
      "options": [
        { "k": "A", "t": "There" },
        { "k": "B", "t": "It" },
        { "k": "C", "t": "This" },
        { "k": "D", "t": "That" }
      ],
      "marked": "B",
      "handwriting": null,
      "note": "左侧页边手写字母 B（学生作答）"
    }
  ]
}
```

卷面有大题标题的卷，再带上 `id`（大题代号）、`section`、`noLabel`：

```json
{
  "unit": "U4",
  "title": "九上 U4 过关卷",
  "header": { "class": null, "name": null, "id": null },
  "note": "",
  "items": [
    { "id": "m1", "no": 1, "section": "单词拼写", "kind": "fill",
      "stem": "This lecture shows teenagers the harm of being a ______ to the Internet.",
      "cn": null, "options": null, "marked": null, "handwriting": null, "fields": 1,
      "note": "大题「一、单词拼写」第1题；横线空白，未见作答" },
    { "id": "t1", "no": 1, "noLabel": "(1)", "section": "句型翻译", "kind": "fill",
      "stem": "他经常在敬老院帮忙。（S+A+V+A）", "cn": "句型翻译：按括号内要求的句型结构翻译句子",
      "options": null, "marked": null, "handwriting": ["He often helps in the old people's home."],
      "fields": 1, "note": "大题「6. 句型翻译」第(1)题" }
  ]
}
```

一整段文字被多道题共用时（目前只有 U2 语法填空），在 unit 上写 `passages`，正文里用 `{{1}}`…`{{6}}` 标出第几空：

```json
{
  "unit": "U2",
  "passages": {
    "语法填空": "For thousands of years, people could not measure temperature exactly. … People were {{1}}(doubt) whether this was a safe or accurate way. …"
  },
  "items": [
    { "id": "gf1", "no": 1, "section": "语法填空", "kind": "fill",
      "stem": "People were ______(doubt) whether this was a safe or accurate way.",
      "cn": null, "options": null, "marked": null, "handwriting": ["doubtful"], "fields": 1, "note": null }
  ]
}
```

## 字段规则

- `unit`：单元码 `U1`～`U4`。页面的全局题号是 `U{unit}-{id}`（见下面 `id`）。
- `no`：**大题内题号**，整数，按卷面在大题里印的号照抄（阅读理解、语法填空这类卷面重新从 1 编号的，就照它写的 1、2、3）。整卷只有一组连续题号时（如 U1），`no` 就是卷面题号。
- `section`：**卷面印的大题标题**，去掉前面的序号（`一、`、`二、`、`6.` 之类），只留标题文字，如 `单词拼写`、`单项选择`、`阅读`、`语法`、`语法填空`、`完成句子`、`句型翻译`。**卷面没有大题标题时必须写 `null`，不得编造**（U1 整卷没有大题标题 → `null`；U2 主体那一段也没有 → `null`）。
- `id`：可选的短码，写「**大题代号 + 大题内题号**」，如 `m1`、`c3`、`r13`、`g4`、`gf5`、`s2`、`t1`。页面把它拼成全局 id `U{unit}-{id}`（`build.mjs` 校验唯一性）。**没有 `id` 时退回用 `no`**，全局 id 就是 `U{unit}-{no}`（U1 属于这种，所以 U1 的题号迁移量为零）。大题代号每卷自定、同卷内唯一，已有对照：U1 无代号；U2 `m`（无标题主体）/ `g`（语法）/ `gf`（语法填空）；U3 `r`（阅读）/ `g`（语法）；U4 `m`（单词拼写）/ `c`（单项选择）/ `s`（完成句子）/ `t`（句型翻译）。`key` / `explain` 文件的键必须与 `id`（没有则 `no`）一致。
- `noLabel`：可选。卷面题号不是阿拉伯数字时照抄，如 U4 句型翻译的 `"(1)"`、`"(2)"`、`"(3)"`。
- `kind`：
  - `mc` = 选择题（有 A/B/C/D 选项）。
  - `fill` = 填空/汉译英/词形变化等无选项的题。
  - `other` = 其他（如判断、匹配、作文提纲），在 `note` 说明。
- `fields`：**`fill` 题必填**，整数 = 卷面这道题的**横线数**。页面按它拆输入框，判分按空给红绿，但**整题全对才算对**（与 `stat` 口径一致）。`key` 里的 `answer` 用 `"a / b / c"` 分段，段数必须等于 `fields`（不一致时 `check-grading.mjs` 会列出来）。
- `stem`：题干原文，**逐字照抄印刷体**。空格统一写成 6 个下划线 `______`。中文题干放在 `cn`，英文句子放 `stem`；若整题只有中文，`stem` 放中文即可。
- `cn`：题目的中文提示/中文要求（如果有），没有写 `null`。
- `options`：仅 `mc` 有；`k` 为字母，`t` 为选项文字（不含字母、去掉开头空格）。四行选项若在卷面上分成两列排布，按 A B C D 顺序整理。
- `marked`：**题目序号左侧页边的手写大写字母**（学生作答），仅当清晰可见时填写 A/B/C/D；没有或看不清写 `null`。注意：不要把页面上被划掉的印刷字母当答案。
- `handwriting`：`fill` 题横线上手写内容，字符串数组，看不懂的写 `"[看不清]"`；没作答写 `null`。
- `passages`：**unit 级**可选对象，`{ "大题标题": "短文正文" }`，把「按 section 共享的长文本」集中放一处。空位用 `{{1}}`…`{{6}}` 占位（数字对应那道题的 `no`），页面渲染成 `(1)`…`(6)`。目前只有 U2 的「语法填空」有。
- `note`：题目级的「任何不确定之处」（遮挡、截断、字迹模糊、被划掉）都写在这里，简洁中文。
- `unit.note`：**unit 级**可选说明（如「语法填空短文跨页、第 4 空附近被修正带遮挡」），页面在单元级提示里用。
- `header.note`：可选，说明卷面表头的情况（如「本页未见班级/姓名/学号栏」）；表头字段看不清仍写 `null`。
- `header`：`class` / `name` / `id` 三项，**一律照卷面，看不清就 `null`，绝不猜**。U1 卷面姓名被涂黑、班级字形不清 → 都写 `null`，学号按卷面记 `"099"`；卷面根本没有这一栏也写 `null`（不写空字符串，也不编一个）。
- 若题干/选项在图片边缘被截断，用重叠切片补全；确实补不全就在 `note` 写 `截断`。

## 输出

只写数据文件本身：`英语/练习工具/data/u<N>.json`。不要创建 HTML、不要改其他文件。
返回的消息里列出：题号范围、按大题分组的题数与 `id` 列表、mc 题数量、每题 `marked` 字母、以及所有你无法确定的疑点。

---

# 答案与解析文件（第二步）

在同一目录再产出一个 `u<N>.key.json`，结构：

```json
{
  "unit": "U1",
  "items": {
    "5": { "answer": "B", "topic": "形式主语 it", "why": "It is fitting that… 中 it 作形式主语，真正主语是 that 从句。", "doubt": false },
    "13": { "answer": "as necessary as", "alt": ["as necessary as"], "topic": "as…as 比较", "why": "「和……一样必要」用 as necessary as talent。", "doubt": false }
  }
}
```

规则：
- `items` 的键 = 上一步 `u<N>.json` 里的 `id`（没有 `id` 就用 `no`）的字符串形式。
- `mc` 题：`answer` 填 A/B/C/D 之一。
- `fill` 题：`answer` 填参考答案（多空用 `"a / b"` 形式，与题干横线顺序一一对应，段数 = `fields`）；可用 `alt` 给出同样可接受的写法数组（如大小写、英美拼写、等价短语）。
- `topic`：考点短语，≤10 个汉字（如「be made of/from」「宾语从句 if/whether」）。
- `why`：**一句**中文解析，说清为什么选它 / 为什么错项不对，不超过 60 字，教学口吻、具体不空泛。
- `doubt`：如果你对该题正确答案没有把握（题干被截断、选项有歧义、超纲），填 `true`，并在 `why` 里说明原因。**不要为了凑答案瞎猜，宁可标 doubt。**
- `manual`：该题有多种合理答案、无法机器判分时填 `true`（如开放性单词填空）。
- 只写 `u<N>.key.json` 这一个文件，不要动 HTML。

---

# 解析加强版（第三步）

另写一个 `u<N>.explain.json`，把每题讲解写厚，供练习工具展示：

```json
{
  "unit": "U1",
  "items": {
    "11": {
      "topic": "no less … than",
      "point": "「no less + 形容词原级 + than」表示「不亚于、和……一样」，用于肯定、赞颂的比较；so … as 只用于否定或疑问句。",
      "why": "句意在赞颂王贞仪在科学上的地位不逊于同时代男科学家，故用 no less important than。B「not as important as」与 C「less important than」都把她说得更差，语义相反；A「so important as」缺少否定语境，不能单独使用。",
      "trap": "易把「不亚于」直译成 not as … as 或 so … as，这是中式思维；so … as 必须与 not 连用，且 no less than 才是「不亚于」。"
    }
  }
}
```

字段要求：
- `topic`：考点名，≤12 字（可沿用/优化 key 里的 topic）。
- `point`：**考点是什么**，1–2 句讲清规则或判定标准，≤90 字。
- `why`：**为什么答案对、干扰项错在哪**，2–3 句，≤130 字；四个选项（或主要干扰项）都要有交代。
- `trap`：**易错点**，1–2 句，≤80 字，写清学生常见的误选、混淆点或审题陷阱，并给出规避方法。
- 语气：面向九年级学生的中文讲解，英文术语保留；具体、可操作，禁止空话（如「注意积累」「认真审题」）。
- 键与 `u<N>.key.json` 的键一一对应（有 id 用 id，否则用 no）。
- 只写 `u<N>.explain.json` 一个文件。发现答案本身有问题，**不要改**，在汇报里单独说明。
