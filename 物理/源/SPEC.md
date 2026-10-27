# 物理思维脚手架 · 建设规范（v2）

> 这是一份**给协作者（人和 AI）看的施工图**。所有内容/代码必须符合本文件；不一致以本文件为准。
> 主交付物：`物理/物理思维脚手架.html`（双击打开）+ `物理/图片/` + `物理/使用说明.md`。

---

## 0. 背景与设计目的

学生：初三，上课能听懂、做题就懵，部分概念不熟。
判断：**听课是跟着老师走一遍；做题得自己完成一条检索链**。断在哪一环，多刷题补不上。

所以工具把物理题拆成固定五步，一步步问，答错指出断在哪一步：

| 步 | 名称 | 在问什么 | focus 值 |
|---|---|---|---|
| 1 | 认情境 | 这是什么模型/现象？（杠杆？滑轮组？热传递？） | `model` |
| 2 | 圈条件 | 已知量、所求量、隐含条件（匀速→平衡；不计摩擦→η=100%；标准大气压→100℃） | `cond` |
| 3 | 选规律 | 用哪条公式/原理？为什么能用？ | `rule` |
| 4 | 代数据 | 单位统一 → 代入 → 中间量 → 结果 | `calc` |
| 5 | 验结果 | 单位对不对？量级/常识合理吗？（η<100%，速度/质量是否离谱） | `check` |

**核心原则（不可违背）**
1. **只统计"第一次就答对"**：看提示后答对不算会，要标记 `usedHint`。
2. **提示分三级**：L1 指方向、L2 给方法、L3 说这一步怎么做。不许一上来给答案。
3. **原题必须是原卷样子**：物理题的图（电路、滑轮、温度计、表格）不能重画，一律用从原卷裁出的图片。
4. **答案也是原卷答案**：解答题的答案（含公式、步骤图）用原卷「参考答案」的裁图，另配可判分的数值字段做自动判分。
5. 不评判孩子，只暴露断点；报告给"下一步做什么"，不给分数排名。

---

## 1. 目录结构与构建

```
物理/
  物理思维脚手架.html        ← 构建产物（自动生成，不要手改）
  使用说明.md                ← 家长/学生手册
  图片/                      ← 原卷裁图（相对路径引用，随 HTML 一起移动）
    pk-w1/q01.png            ← 第1周第1题：原题裁图
    pk-w1/q01-a.png          ← 第1周第1题：参考答案裁图
    pk-w1/q11_1.png q11_2.png← 跨页时多张
  题库/
    pack-w1.json ...         ← 单周题包（唯一真源，手改这里）
    pack-全部.json           ← 合并产物（自动生成）
    pack-模板.json
  源/                        ← 源码（改这里，然后 build）
    SPEC.md                  ← 本文件
    shell.html               ← 页面骨架（含占位符）
    css/style.css            ← 全部样式
    js/00-core.js            ← 核心：存储/路由/判分/进度/UI 工具（Lead 维护，别人不改）
    js/10-data.js            ← 占位（build 时注入 packs/concepts，不手写）
    js/20-shell.js           ← 顶栏 + 首页 + 路由注册（Lead）
    js/30-guided.js          ← 五步引导模块
    js/40-concept.js         ← 概念闪练模块
    js/50-exam.js            ← 试卷练习 + 错题本模块
    js/60-report.js          ← 训练报告模块
    js/70-admin.js           ← 题库管理模块
    js/90-app.js             ← 启动（Lead）
    data/concepts.json       ← 概念卡库（唯一真源：cards 数组）
    data/guided.json         ← 五步母题（唯一真源：把 pack 题目 id 组装成引导题）
  工具/
    build.mjs                ← node 构建：校验 + 内联 + 输出 HTML
    README.md
  _recon/                    ← 中间产物（不进交付，可删）
```

构建：`node 物理/工具/build.mjs`（工作目录 = 仓库根）
- 读 `源/shell.html`，把 `<!--__CSS__-->` 换成 style.css，`<!--__JS__-->` 换成按文件名排序的 js 拼接，`/*__DATA__*/` 换成 `window.PHYS_DATA = {packs:[...], concepts:[...], guided:[...]}`。
- 读 `题库/pack-*.json`（排除 `pack-全部.json`）作为 packs；读 `源/data/concepts.json`、`源/data/guided.json`。
- 校验（任一失败必须报错退出，不许产出坏包）：JSON 可解析、pack id/题目 id 全局唯一、`askImg`/`ansImg` 指向的文件真实存在、`tags` 在规范清单里、`steps` 结构合法、合并 JS `node --check` 通过。
- 输出 HTML 用 **UTF-8 无 BOM**。

---

## 2. 题包 schema（pack v2）

### 2.1 pack
```json
{
  "id": "pk-w1",                       // 必填，唯一，建议 pk-w<周>
  "name": "第1周 · 简单机械（杠杆与滑轮）", // 必填
  "source": "题库/第1周.docx",           // 必填，来源
  "exam": "第1周练习",                   // 副标题
  "topics": ["杠杆","滑轮"],             // 主题（报告分组用）
  "note": "第6题图见原卷",                // 备注
  "questions": [ ... ]                  // 必填，非空
}
```

### 2.2 question
| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 全局唯一，`w1q01` 这种：`w<周>q<两位题号>` |
| `no` | ✅ | 卷面题号 `"1"` |
| `group` | ✅ | `"选择"` / `"填空"` / `"实验"` / `"解答"` |
| `type` | ✅ | `"choice"`（选择，含多选）/ `"fill"`（填空或需填数值）/ `"solve"`（解答写过程，仍按 fields 判最终答案）/ `"selfcheck"`（不判分，只给答案图+解析） |
| `askImg` | ✅ | 原题裁图路径，字符串或数组（跨页） |
| `ask` | | 题干纯文本（用于搜索/复习列表；公式用 Unicode：F₁l₁=F₂l₂）。有图也建议填 |
| `stem` | | 附加说明（如"（g 取 10 N/kg）"） |
| `opts` | choice 必填 | 选项文字数组（去掉 "A．" 前缀）；带图的选项写成 `"（图）..."` 并在 askImg 已包含 |
| `ans` | choice 必填 | 正确项下标（从 0 起）；多选给数组如 `[1,2]` |
| `fields` | fill/solve 必填 | 判分字段，见 2.3；全对才算这题对 |
| `ansImg` | 强烈建议 | 参考答案裁图（含公式答案、步骤图），字符串或数组 |
| `ansText` | | 纯文字答案（如 `"B"`、`"改变力的方向；1；小于"`），列表页展示 |
| `solution` | | 解析：字符串数组，一条一段。原卷有【详解】就转写；没有就写 2–4 条关键思路（不求全解，求"下一步想什么"）|
| `tip` | | 一句话关键（解析末尾显示） |
| `focus` | ✅ | 主要断点：`model`/`cond`/`rule`/`calc`/`check` |
| `tags` | ✅ | 考点数组（**必须从第 3 节清单里选**），1–3 个 |
| `diff` | ✅ | 难度 1–3 |
| `selfCheck` | | `true` = 不判分（图形有歧义/答案不唯一时） |
| `steps` | 母题必填 | 五步引导数据，见 2.4（只在 `guided.json` 里用，不写进 pack） |

### 2.3 fields
```json
{"type":"num","label":"拉力 F","ans":20,"unit":"N","tol":0.01}
{"type":"coef","label":"机械效率","tpl":"η = {0}%","ans":[80]}
{"type":"choice","label":"末温","options":["100℃","110℃"],"ans":0}
{"type":"text","label":"甲滑轮的好处","ans":["改变力的方向","改变力的作用方向"],"mode":"contains"}
```
判分规则（`PHYS.judge`）：
- `num`：解析输入（支持 `1/2`、`8.4e3`、`8.4×10^3`、`0.5`），`|x-ans| <= max(tol, 1e-9)`；单位写错不判错，但要求解析里强调单位。
- `coef`：`tpl` 里 `{0}{1}…` 是空位，个数必须等于 `ans` 长度（build 校验）。
- `choice`：下标相等。
- `text`：去空格后 `exact` 或 `contains` 匹配任一候选。
- 有多个 fields 时全部正确才算这题对；错哪个标哪个。

### 2.4 五步引导数据（`源/data/guided.json`）
```json
{
  "id": "g01", "packId": "pk-w1", "questionId": "w1q13",
  "title": "杠杆最小力（水龙头）", "topic": "杠杆",
  "steps": [
    {"focus":"model","q":"这题属于哪一类问题？","type":"choice",
     "opts":["杠杆平衡","滑轮组省力","功与功率","内能改变"],"ans":0,
     "why":"出现支点 O、动力 F、阻力→杠杆模型"},
    {"focus":"cond","q":"先圈条件：哪些是题目给的？","type":"multi",
     "opts":["O 为支点","F 是阻力","a/b/c/d 四个施力方向","水龙头手柄长 30cm"],"ans":[0,1,2],
     "why":"手柄长度题目没给，不要自己编条件"},
    {"focus":"rule","q":"用哪条规律？","type":"choice",
     "opts":["F₁l₁=F₂l₂","W=Fs","P=W/t"],"ans":0,
     "why":"杠杆静止→平衡条件；要比较力的大小，就比力臂"},
    {"focus":"calc","q":"比一比力臂：哪个方向力臂最长？","type":"choice",
     "opts":["a","b","c","d"],"ans":1,
     "why":"力臂=支点到力的作用线的距离，不是到作用点的距离"},
    {"focus":"check","q":"验一验：结论合理吗？","type":"choice",
     "opts":["力臂最长处最省力，合理","力越大越省力，合理"],"ans":0,"why":"..."}
  ],
  "hints": {"model":["先找有没有转轴/支点","有支点、有动力阻力，就是杠杆"],
            "cond":["把数字和单位一起抄下来","题目没给的量不能自己加"]},
  "walk": ["入口：...","① 认情境：...","② 圈条件：...","③ 选规律：...","④ 代数据：...","⑤ 验结果：..."],
  "calc": ["解：力臂是支点到力的作用线的距离……"]
}
```
约束：`steps` 必须恰好 5 条，`focus` 依次 `model,cond,rule,calc,check`；`type` ∈ choice/multi/fields；`hints` 的 key 用 focus 值，每条 2–3 句。

---

## 3. 考点（tags）规范清单 —— 只能用这些

杠杆五要素 / 杠杆平衡条件 / 杠杆分类 / 最小力 / 杠杆动态平衡 /
定滑轮与动滑轮 / 滑轮组 / 功 / 功率 / 机械效率 / 测机械效率实验 /
动能与势能 / 机械能转化 / 分子动理论 / 扩散现象 / 分子间作用力 /
内能 / 改变内能的方式 / 温度热量内能辨析 / 比热容 / 热量计算 / 热值 / 热机效率 / 能量守恒 /
电荷与摩擦起电 / 电流与电路 / 串并联电路 / 电学实验 / 实验探究

主题（topics）只能用：`杠杆` `滑轮` `功和功率` `机械效率` `机械能` `分子与内能` `比热容与热值` `热机与能量` `电学` `实验探究`

---

## 4. 概念卡 schema（`源/data/concepts.json`）
```json
{"version":2,"cards":[
  {"id":"c-lever-01","topic":"杠杆","tags":["杠杆五要素"],"type":"judge",
   "q":"判断：力臂是支点到力的作用点的距离。","ans":false,
   "why":"力臂是支点到力的作用线的距离（垂线段），不是到作用点。","diff":1},
  {"id":"c-pulley-03","topic":"滑轮","tags":["定滑轮与动滑轮"],"type":"choice",
   "q":"定滑轮的作用是：","opts":["省力","省距离","改变力的方向","既省力又改变方向"],
   "ans":2,"why":"定滑轮实质是等臂杠杆，只改变方向，不省力。","diff":1}
]}
```
- `id` 唯一，`topic`/`tags` 用第 3 节清单。
- `type`：`judge`（ans 为 true/false）或 `choice`（opts+ans 下标）。
- `why` 必填（一句话说清为什么）；`diff` 1–3。
- 目标 80–120 张，覆盖全部考点，易混概念要做成"对比卡"（如温度/热量/内能、功率/机械效率、定/动滑轮）。

---

## 5. 前端核心 API（`00-core.js`，模块开发者只需用这些）

```js
// 数据
PHYS.DATA.packs      // 题包数组
PHYS.DATA.concepts   // 概念卡数组
PHYS.DATA.guided     // 五步母题数组

// 路由（hash 路由：#/guided、#/exam/pk-w1、#/concept?topic=杠杆）
PHYS.route.go(path, params?)   // path 形如 'exam'，params 会拼进 query
PHYS.route.current()           // {path, params}
PHYS.registry.register({id, title, icon, order, mount(root, params), unmount()})

// 存储（localStorage 持久化 + 内存缓存；所有写入自动节流）
PHYS.store.get(path, def)      // 路径如 'guided.w1q01'
PHYS.store.set(path, val)
PHYS.store.update(path, fn)
PHYS.store.all()               // 全量快照（导出用）
PHYS.store.replaceAll(obj)     // 导入用（会校验版本）
PHYS.store.clear()

// 进度记录（直接写进 store，报告模块只读）
PHYS.progress.stepAttempt({qid, focus, ok, usedHint})   // 五步引导
PHYS.progress.guidedDone({qid, steps:[true/false...], usedHint, usedWalk, ms})
PHYS.progress.examAnswer({packId, qid, ok, user})        // 试卷练习
PHYS.progress.conceptAnswer({cid, ok})                   // 概念闪练
PHYS.progress.wrongList()                                // 错题/断点汇总
PHYS.progress.stats()                                    // 命中率、连续天数等

// 判分
PHYS.judge.num(input, ans, tol)  // bool
PHYS.judge.coef(inputs[], spec)  // bool
PHYS.judge.choice(sel, ans)      // 单选/多选均支持
PHYS.judge.text(input, field)    // bool
PHYS.judge.field(field, input)   // 统一入口

// UI 工具（返回 DOM 或 HTML 字符串，命名见注释）
PHYS.ui.el(tag, attrs, children)      // 创建元素；attrs 支持 class/text/html/onclick/data-*
PHYS.ui.img(src, alt, cls)            // <img loading="lazy"> 元素，点击可放大
PHYS.ui.zoom(src)                     // 全屏看图
PHYS.ui.toast(msg, kind)              // kind: ok|bad|info
PHYS.ui.modal({title, body, actions}) // 返回 close()
PHYS.ui.confirm(msg)                  // Promise<bool>
PHYS.ui.escape(s)
PHYS.ui.addCSS(css)                   // 该模块样式注入一次（用模块前缀类名）
PHYS.util.shuffle(arr) / PHYS.util.fmtPct(x) / PHYS.util.today() / PHYS.util.daysAgo(iso)
```

**模块契约**
- 一个模块 = 一个文件 + 调用 `PHYS.registry.register({...})`；`mount(root, params)` 负责把 UI 渲染进 root（`root` 是已清空 `.screen` 容器）。
- 不要改别人的文件、不要改 core/shell/css（自己的样式用 `PHYS.ui.addCSS`）。
- 不引入任何外部依赖（无 CDN、无框架、无 emoji 图片）；只用 ES2018 语法（Chrome/Edge/Safari 均可）。
- 移动端优先：375px 宽可用；图片 `max-width:100%`。

**CSS 约定**（`style.css` 已提供）：`.card` `.btn` `.btn-primary` `.btn-ghost` `.btn-mini` `.tag` `.tag-soft` `.tag-warn` `.tag-bad` `.row` `.muted` `.small` `.tiny` `.spacer` `.opts` `.opt`（`.opt.sel/.ok/.no/.dim`）`.rail/.rail .n.done/.now` `.stem` `.qhead` `.stepbadge` `.ask` `.k`（选项字母）`.sep` `.grid2` `.empty` `.pill`。模块自定义类名一律加前缀（如 `.ex-*`、`.cd-*`）。

---

## 6. 图片规则（本项目的关键）

1. 原题图来自 `题库/*.docx` → Word 导出 XPS → 渲染 2× PNG → 按题范围裁切成 `图片/<packId>/q<NN>.png`。
2. 参考答案图同理裁自文末「参考答案」段，命名 `q<NN>-a.png`；跨页时 `q<NN>_1.png`、`q<NN>_2.png`（HTML 里按数组顺序竖排）。
3. 一律**相对路径**引用（`图片/pk-w1/q01.png`），不内嵌 base64（体积会超 30MB）。
4. 显示规则：题目卡片里原题图默认宽度 100%、最大 720px，点击可全屏看；答案图默认折叠（先自己想）。
5. 图片缺失 = build 报错，不允许"图丢了但页面照跑"。

---

## 7. 验收标准（每个模块交付前自查）

- [ ] `node --check` 该 JS 文件通过；build 通过（含图片存在性校验）。
- [ ] 无头 Chrome 截图（1280×900 与 390×844）不白屏、无横向滚动、控制台无报错：
  `chrome --headless=new --screenshot=out.png --window-size=1280,900 "file:///<绝对路径>/物理思维脚手架.html#/<模块>"`
- [ ] 刷新后进度不丢（localStorage）；导出/导入 JSON 往返一致。
- [ ] 触屏可点（按钮 ≥40px 高）、图片不溢出卡片。
- [ ] 判分边界：空输入提示"还没填"、错误答案给 why、`selfCheck` 题不判分。
- [ ] 文案：面向学生，短句，不用"你必须/你怎么又"；错误提示说"断在第 2 步：条件没圈全"。

---

## 8. 协作纪律（多 agent 并行）

- 每个 agent 只写自己 scope 内的文件；写前先 `read`，不整文件覆盖别人的工作。
- 文件级 write scope 见任务卡（team_task）；重叠 = 冲突，先改任务再动手。
- 中间产物放 `_recon/`，交付物只放上面第 1 节的路径。
- 数据文件（pack/concepts/guided）是唯一真源，构建产物（HTML、pack-全部.json）不要手改。
- 有疑问先写进自己的任务备注并继续可推进的部分，不要空等。
