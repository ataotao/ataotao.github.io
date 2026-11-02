# 数据格式规范（OCR 转录用）

每个单元产出一个 JSON 文件，UTF-8，无注释，严格遵循以下结构。宁缺毋滥：看不清就填 `null` 并在 `note` 里写原因，**绝不猜**。

```json
{
  "unit": "U1",
  "title": "九上 U1 过关",
  "header": {
    "class": "柯三9",
    "name": "（姓名手写，看不清填 null）",
    "id": "0909"
  },
  "items": [
    {
      "no": 1,
      "kind": "fill",
      "stem": "It is ______ that Wang Zhenyi is remembered for her great work.",
      "cn": null,
      "options": null,
      "marked": null,
      "handwriting": ["fact"],
      "note": "手写答案是 fact"
    },
    {
      "no": 5,
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

## 字段规则

- `no`：题目序号，整数，按卷面序号。卷面若重新编号（如阅读理解 1-5），照抄卷面序号。
- `kind`：
  - `mc` = 选择题（有 A/B/C/D 选项）。
  - `fill` = 填空/汉译英/词形变化等无选项的题。
  - `other` = 其他（如判断、匹配、作文提纲），在 `note` 说明。
- `stem`：题干原文，**逐字照抄印刷体**。空格统一写成 6 个下划线 `______`。中文题干放在 `cn`，英文句子放 `stem`；若整题只有中文，`stem` 放中文即可。
- `cn`：题目的中文提示/中文要求（如果有），没有写 `null`。
- `options`：仅 `mc` 有；`k` 为字母，`t` 为选项文字（不含字母、去掉开头空格）。四行选项若在卷面上分成两列排布，按 A B C D 顺序整理。
- `marked`：**题目序号左侧页边的手写大写字母**（学生作答），仅当清晰可见时填写 A/B/C/D；没有或看不清写 `null`。注意：不要把页面上被划掉的印刷字母当答案。
- `handwriting`：`fill` 题横线上手写内容，字符串数组，看不懂的写 `"[看不清]"`。
- `note`：任何不确定之处（遮挡、截断、字迹模糊、被划掉）都写在这里，简洁中文。
- 若题干/选项在图片边缘被截断，用重叠切片补全；确实补不全就在 `note` 写 `截断`。

## 输出

只写数据文件本身：`designs/english-9a-practice/data/u<N>.json`。不要创建 HTML、不要改其他文件。
返回的消息里列出：题号范围、mc 题数量、每题 `marked` 字母、以及所有你无法确定的疑点。

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
- `items` 的键 = 上一步 `u<N>.json` 里的 `no`（字符串）。
- `mc` 题：`answer` 填 A/B/C/D 之一。
- `fill` 题：`answer` 填参考答案（多空用 `"a / b"` 形式，与题干空格顺序对应）；可用 `alt` 给出同样可接受的写法数组（如大小写、英美拼写、等价短语）。
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
