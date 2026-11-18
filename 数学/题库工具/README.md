# 题库工具（问卷 + 答卷 → 题库 JSON → 全部.json + HTML）

目的：把"录入新试卷 / 用老师答卷核对答案"从**手工改 3 处文件 + 手工比对**压缩成
**一条 read 切片 → 一份答案 txt → 两条命令**。

## 目录

```
题库工具/
  qb.py                  主工具（只需 Python 3 + 标准库；sheets 子命令需要 Pillow）
  figs.py                原卷插图生成器（只需标准库；--preview 需要 Pillow）
  hand.py                答卷手写附图生成器（裁图 + 嵌进题包的 hand 字段；需要 PyMuPDF + Pillow）
  check-pack.mjs         读 题库/packs/*.js 分片产物做结构自检（node，无依赖）
  sync.ps1               受限环境下的落盘脚本（qb.py 暂存到 %TEMP%\qb_stage 后运行）
  answers/               每套卷一份"答卷答案"文本（唯一需要手填的东西）
    反比例函数单元测-第8周.txt
    数学练习卷-1014.txt
    九上数学期中模拟练习.txt
    2026-2027第一学期期中.txt   ← 官方《答案卷及评分标准》转录（2026-11-09 核对；18(2) 官方印「5」与正解 3√2 的分歧见 pack note）
    第11周周练-函数与圆.txt      ← 老师批改后的手写答卷转录（2026-11-14 逐题复算核对，17 题全一致）
```

## 数据流（单一真源）

```
题库/pack-<每套卷>.json   ← 唯一真源（核对/改动都在这里）
        │  qb.py build
        ├─→ 题库/pack-全部.json     （自动合并，供导出/备份）
        ├─→ 题库/packs/<id>.js      （每套卷一个分片，页面真正加载的就是它）
        └─→ 函数思维脚手架.html      （只改 `<!-- PACKS:BEGIN -->` … `END` 之间的 <script src> 清单）
                                        │
                                        └─ qb.py bundle → 数学/_单文件/….单文件.html（发手机用，不入库）
```

以后**不要再手改** `pack-全部.json`、`题库/packs/*.js` 和 HTML 里的题包数据——改单卷 JSON，然后 `build`。

## 主包 / 分片（2026-11-14 拆分）

`函数思维脚手架.html` 从 1.92 MB 降到约 300 KB，试卷数据搬到了 `题库/packs/`：

| 文件 | 内容 | 谁维护 |
|---|---|---|
| `函数思维脚手架.html` | 引擎、样式、五步母题（BANK）、闪练（DRILLS）、分片清单 | 手改引擎；分片清单由 build 生成 |
| `题库/packs/<题包id>.js` | 一整套卷（题目/选项/解析/图/手写图） | `qb.py build` 生成，**勿手改** |
| `题库/pack-*.json` | 同上，唯一真源 | 手改 / `qb.py apply` 写回 |

- 加载方式：**classic `<script src>`**，按顺序同步执行，每个分片 `push` 进 `window.__PACKS__`。
  必须是 classic script——`file://` 下 ES module 会被 CORS 拦掉，页面就成空题库了。
- 所以**主包必须和 `题库/packs/` 一起拷**；只拷 HTML 会看到"题库里一套卷也没有"。
- 发手机 / 发给同学：`python 题库工具/qb.py bundle`，产物在 `数学/_单文件/`（gitignore，不占仓库）。
- 加卷只多一个分片文件，主包只多一行 `<script src>`；主包大小不再随题量增长。
- 单个分片超过 700 KB 时 `build` 会提示——那时把这一套拆成两卷（或者先把 `hand` 手写图压小）。

## 标准流程（录入一套新卷）

1) **切答卷图**（省掉手工裁图）：

```powershell
# 一张图里 2x2 四页（常见"两页并排扫在一起"的答卷）
python 题库工具\qb.py sheets "题库\xxx【答卷】.png" --grid 2x2 --zoom 2.5
# 双栏排版、自动检测分不出栏时，强制每页切 2 栏（切片更多但每张更清楚）
python 题库工具\qb.py sheets "题库\xxx【答卷】.png" --grid 2x2 --inner-cols 2 --zoom 2.5
```
   - `--grid 行x列`：一张图里有几页（2x2 = 四页拼一张；单页用 `--grid 1x1`）
   - `--inner-cols N`：每页强制平均切 N 栏（0 = 自动按空白检测）
   - `--zoom`、`--max-h 1400`：放大倍数 / 单张目标最大高度（默认会自动纵向分段）
   - 输出在 `答卷切图/`，文件名带 `r行c列_col栏_段`，按顺序读即可
2) **读切片、填答案**：按 `qb.py template` 的提示，写成 `answers/<卷名>.txt`：

```powershell
python 题库工具\qb.py template 题库\pack-xxx.json
```
   格式：`题号 答案...`，选择题填 `A/B/C/D`，数值可写分数，多空按 fields 顺序空格分隔：

```
1 D
9 A
12 -1
13 A C C (1,-2)
21 8 40 13
```
3) **核对**（不写文件，只出差异表）：

```powershell
python 题库工具\qb.py check 题库\pack-xxx.json 题库工具\answers\<卷名>.txt
```
   输出会区分：一致 / 答案不一致 / 答案形式不同（如"答案不唯一"、文字答案，需人工判断）/ 缺答案 / 题库无此题。
4) **写回并同步**（自动备份、自动 build、自动校验）：

```powershell
python 题库工具\qb.py apply 题库\pack-xxx.json 题库工具\answers\<卷名>.txt
# 若提示"已暂存/无权直接写"（DSH 沙箱里 python 子进程常见），再执行：
pwsh -File 题库工具\sync.ps1
python 题库工具\qb.py verify
```

## 其他命令

| 命令 | 作用 |
|---|---|
| `qb.py build` | 合并 `题库/pack-*.json` → `pack-全部.json` + `题库/packs/*.js` 分片 + 更新 HTML 里的分片清单（自动备份，清掉过期分片） |
| `qb.py bundle` | 把分片内联回主文件，产出 `数学/_单文件/函数思维脚手架.单文件.html`（约 1.8 MB，发手机/发给同学用） |
| `qb.py verify` | 校验：每个 JSON 可解析、题包 id 不重复、`全部.json` 与单卷一致、**分片与 `全部.json` 一致且清单对齐**、**分值/知识点/分步字段形状**、HTML 内嵌脚本 `node --check` |
| `node check-pack.mjs [packId]` | **读 `题库/packs/*.js` 分片产物**做结构自检（选项越界/重复、`coef` 占位符数、`pt` 合计、`fig` 是否坏），能抓到「改了 JSON 忘了 build」 |
| `qb.py checkall` | 批量核对：自动找 `answers/` 里对应的答案文件，汇总每套卷的一致/不一致数 |
| `qb.py apply --dry-run` | 只看会改哪些答案，不落盘 |
| `qb.py check --report r.json` | 差异表另存 JSON，便于批量统计 |

## v2 新增字段（分值 / 知识点 / 应用公式 / 分步）

题包里每题可以带这些字段，`template` 会把分值打在题号后面：

```json
{ "id": "m21", "no": "21", "type": "solve", "score": 8,
  "kp": ["函数与图象", "二次函数"],
  "formula": "① 顶点在 y 轴上：设 y = ax² + c\n② 代底部端点 (±5, 0) 求 a\n③ 通过判断：比较 y 与 车高 + 0.5",
  "steps": [ {"pt": 4, "type": "choice", "label": "(1) 解析式", "options": [...], "ans": 1},
             {"pt": 4, "type": "choice", "label": "(2) 能否通过", "options": [...], "ans": 0} ] }
```

- `score`：本题分值（数字，正数）。
- `kp`：知识点数组，第一个决定报告里的板块。
- `formula`：应用公式（字符串，多行用 `\n`）。**解析页把 `kp` 做成标签、`formula` 逐行加粗，显示在「本题考点 · 应用公式」重点块里**；页面启动时按内置版刷新，本地导入的同 id 题包不用重新导入。
- `steps`：分步给分，`pt` 之和应等于 `score`；不给 `steps` 时按 `fields` 整数均分。
- `qb.py verify` 会检查：`score` 为正数、`kp` 是非空字符串数组、`formula` 是非空字符串（超 400 字提示精简）、`steps` 的 `pt` 合计与 `score` 一致。
- `check` / `apply` / `template` 已兼容 `steps`（把每步当成一个 field，忽略 `pt`）。

## 原卷插图（`fig` 字段 + `figs.py`）

试卷里"墙角围花园""隧道拱形""冷柜温度曲线"这类**几何示意图**，用 `plot`（坐标纸风格：网格 + 刻度）画出来一定和卷面不同，所以改成**按原卷描图**：

```json
"fig": { "w": 300, "h": 215, "svg": "<path d=\"...\"/>…<text …>A</text>" }
```

- `w` / `h`：画布尺寸（页面按 viewBox 显示，1:1 不放大）；`svg`：**内层** SVG 片段（不带 `<svg>`）；
- 有 `fig` 就不再显示 `plot`（页面优先 `fig`；`validatePack` 会给警告）；
- 题包里改 `fig` 之后照样要 `qb.py build` 才会进 HTML；
- 旧版本地导入包（localStorage 里没有 `fig`）在页面启动时会被 `mergePackMeta()` 自动补上内置图，不用手动重新导入。

图由 `figs.py` 生成，别手敲坐标：

```powershell
python 题库工具\figs.py --pack 题库\pack-九上数学期中模拟练习.json --write   # 写回 fig 字段
python 题库工具\qb.py build                                                    # 注入 HTML
python 题库工具\qb.py verify                                                   # 结构 + 脚本语法
python 题库工具\figs.py --preview %TEMP%\fig.png                               # 只出 PNG 预览（Pillow）
```

`figs.py` 的约定：SVG 坐标（y 向下）、字号 16（数字/单位 15）、墨色 `#1b2430`、`line/quad/poly/text/dot/hatch` 几个小函数；要加新图就写一个 `fig_xxx()` 并登记到 `FIGS`（键 = 题包里的**题目 id**，比如 `w11q5`；`write_pack` 按 id 匹配，所以一个 `FIGS` 可以同时服务多套卷）。第 11 周周练卷的 6 张图（`fig_w11q5 / w11q7 / w11q12 / w11q14 / w11q15 / w11q17`）用了两个小工具：`_para_pts()`（把 y = a(x−h)²+k 采样成折线）和 `_axes()`（带箭头的坐标轴）。

## 答卷手写附图（`hand` 字段 + `hand.py`）

有的卷子答案是**老师批改过的学生手写答卷**（扫描 PDF，没有文字层）。这种卷子除了录标准解析，还给每题配一张「原卷 + 手写」的裁切图，显示在**解析**里（答题前不显示，不会剧透）：

```json
"hand": { "w": 900, "h": 209, "svg": "<image x=\"0\" y=\"0\" width=\"900\" height=\"209\" href=\"data:image/webp;base64,…\"/>" }
```

- 和 `fig` 的分工：`fig` 是**题目**配图（答题前就显示），`hand` 是**答案**附图（只在解析里）；
- 页面里点图能放大（手机看手写必须放大），点任意处或 Esc 关闭；
- 图是 WebP、每张几十 KB，**内联进题包 JSON**，所以 build 之后单文件 HTML 仍然离线可用（代价是 HTML 大几百 KB）。

由 `hand.py` 生成，裁切框写在脚本的 `CROPS`（键 = 题包 id，坐标是 dpi 渲染后的像素）：

```powershell
# 从答卷 PDF 重新裁图 + 写回 hand（需要 PyMuPDF + Pillow）
python 题库工具\hand.py --pdf "C:\path\第11周-数学周练卷-函数+圆【答案】.pdf" --pack 题库\pack-第11周周练-函数与圆.json --write
# 已经裁好（题库/<卷名>- 答卷附图/*.webp 在），只把图嵌回题包
python 题库工具\hand.py --pack 题库\pack-第11周周练-函数与圆.json --write
python 题库工具\qb.py build
node 题库工具\check-pack.mjs pk-week11-1111     # 会检查 hand 的 w/h 与 <image href="data:image/…">
```

裁好的图放 `题库/<卷名>- 答卷附图/q<题号>.webp`（也入库，是唯一可复现的源——答卷 PDF 本身不入库）。**裁切按题的行带走，边缘可能带上相邻题的一两笔**，属于预期。

## 闪练题库（`题库/drills.json`）

闪练题也走 build 注入（HTML 里 `/* DRILLS:BEGIN */ … /* DRILLS:END */` 之间）：

```json
{ "id": "dr-105", "pool": "P1", "kp": "函数与图象", "skill": "k-sign",
  "ask": "y = 3x - 2 的图象是哪一个？",
  "opts": [ {"plot": {"expr": "3x-2"}},
            {"plot": {"expr": "-3x-2"}, "why": "k 的符号反了"} ],
  "ans": 0,
  "why": "k > 0 上升，b = -2 交 y 轴负半轴。" }
```

- `pool` 决定每轮从哪一池抽题（P1 一次 / P2 反比例 / P3 二次 / P4 方程 / P5 变换）；`skill` 是易错点标签，判错时显示、结算页按它归组。
- `verify` 会检查闪练题：`ans` 越界 / 选项重复 / `expr` 解析失败 / **两个图选项采样后几乎重合** / **某池题数少于每轮要抽的 3 题** / **某易错点少于 3 题**。
- 改完 `drills.json` 一样要 `build` 才会进 HTML。


## 速查（复制即用）

```powershell
# 1. 切答卷
python 题库工具\qb.py sheets "题库\xxx【答卷】.png" --grid 2x2 --zoom 2.5

# 2. 生成答案模板（照着填 answers\xxx.txt）
python 题库工具\qb.py template 题库\pack-xxx.json

# 3. 核对
python 题库工具\qb.py check 题库\pack-xxx.json 题库工具\answers\xxx.txt

# 4. 写回 + 重建 + 校验（一步到位）
python 题库工具\qb.py apply 题库\pack-xxx.json 题库工具\answers\xxx.txt
pwsh -File 题库工具\sync.ps1 -StageDir "$env:TEMP\qb_stage"   # 仅"无权直接写"时需要
python 题库工具\qb.py verify
node 题库工具\check-pack.mjs                                   # 读分片产物再查一遍

# 5. 要发手机 / 发给同学时，打一个单文件版（平时不用）
python 题库工具\qb.py bundle
```

## 注意

- **解析文字写错、方法写错**时，工具不会自动改（它只对答案字段）。直接改单卷 JSON 里的
  `solution`，然后 `qb.py build`。
- **主包和 `题库/packs/` 是一体的**：只拷 `函数思维脚手架.html` 会看到空题库。要一个文件走天下，
  用 `qb.py bundle`。发布站点时 `ataotao.github.io\tools\publish.ps1` 的 training 清单里也要有
  `数学/题库/packs`（`@{ Path = '数学/题库/packs'; Filter = '*.js' }`），否则线上同样空题库。
- 页面里"题库管理"导入过的题包会覆盖内置分片数据（localStorage）。改完源码后：**分值、知识点、图示（fig）、解析（solution）、提示（tip）会在页面启动时自动用内置版刷新**（`mergePackMeta()`）；只有**改了题目数量 / 选项结构 / 题型**这类结构变更时，才需要重新导入同 id 的 JSON（或删掉该题包）再刷新。
- 备份文件为 `*.bak-<时间戳>`，可随时回滚。
- 如果当前环境里 python 子进程无权写仓库目录（DSH 沙箱常见），`qb.py` 会自动把结果写到
  `%TEMP%\qb_stage`，此时再跑一次 `pwsh -File 题库工具\sync.ps1` 就会备份+落盘。普通终端里
  一般可以直接写入，不需要这一步。
- DSH 里运行 python 需要指定解释器，例如：
  `& "C:\Users\Tao\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" 题库工具\qb.py check ...`
- 中文 Windows 控制台是 GBK，`qb.py` 打印 `✓` 会 `UnicodeEncodeError`。先设
  `$env:PYTHONIOENCODING='utf-8'; $env:PYTHONUTF8='1'`，或 `chcp 65001`。
