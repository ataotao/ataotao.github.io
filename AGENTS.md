# 做题思维训练

中学学科做题思维训练仓库：按科目组织的题型、解题思维与公式记背材料。

## 目录

- `开始.html` —— **唯一入口**：今天做什么（读本机记录）+ 六科入口 + 一键备份记录
- `道德与法治/` `历史/` `物理/` `数学/` `英语/` `化学/` `语文/` —— 各科目训练材料
  （`化学/` 两份：`化学思维脚手架.html` 走 `源/shell.html` + `题库/*.json` → `node 工具/build.mjs` 生成；
  `化学闪练卡.html` 是训练器模板首个迁移产物（人教版初三 12 单元 / 53 题型参数化随机出题，解析讲考点难点 + 错题库 1/3/7/14 回炉）：
  内核 `工具/trainer/kernel.js` + 配置 `工具/trainer/subjects/化学.mjs` + core `化学/源/flash.core.js`
  → `node 工具/trainer/build.mjs 化学` 生成；改出题/判分改 core、改壳改内核/配置，**产物不手改**。
  验收：`node 化学/题库工具/check-flash.mjs`（出题）+ `node 工具/trainer/selfcheck.mjs 化学`（UI 运行层）；
  记录键 `chemflash_v1`，见 `docs/plans/单仓发布与记录同步-2026-11-18.md` 段二）；
  `语文/` 是单文件 B 类：`语文思维脚手架.html` 引擎与数据同体，无构建脚本；
  `物理闪练卡.html`、`数学闪练卡.html` 已迁入训练器模板第二族 `scaffold`：
  三源 `物理/源/train.{css,core,ui}.js` / `数学/源/train.*` 逐字节内联，
  `node 工具/trainer/build.mjs 物理|数学` 生成；产物与迁移前逐字节相同，改三源后重建，
  验收 `node 物理|数学/题库工具/check-training.mjs` + `node 工具/trainer/selfcheck.mjs 物理|数学`。
  （两族：闪练卡族 `kernel.js` 壳/统计/记录全共用；脚手架族 `scaffold.js` 只共用壳，
  渲染引擎 h()/SVG/分数独立，因数学无 UI 桩测试不强合并。）
  `数学/` 四份：`函数思维脚手架.html`（B 类，`qb.py` 自动 `.bak`；**主包只有引擎约 300 KB，
  试卷数据在 `题库/packs/*.js` 分片里**，改题只动 `题库/pack-*.json` 再 `qb.py build`，
  发手机用 `qb.py bundle` 生成 `_单文件/` 版）＋ `坐标图象训练.html`
  （五层图象训练：找点／读点／一次函数／二次函数／综合，独立单文件，见 `docs/plans/坐标图象训练-2026-11-11.md`）
  ＋ `数学闪练卡.html`（模块化框架：基础快练／写解析式／大题前两步，参数化出题，独立单文件，
  见 `docs/plans/数学训练脚手架-2026-11-12.md`；改出题/判分后跑 `node 数学/题库工具/check-training.mjs`）
  ＋ `错题本.html`（照片错题：原图内联 + 详细解析 + 1/3/7/14/30 天到期复习 + 打印重做卷，
  见 `docs/plans/数学错题本-2026-11-13.md`；记录键 `mathwrong_v1`））
- `物理/` —— 两套：`物理思维脚手架.html`（构建产物：五步引导／概念闪练／原卷验收，真源在 `源/` + `题库/`）
  ＋ `物理闪练卡.html`（单文件 B 类：认模型／认量／算到底／作图判断／读数，参数化出题、纯 SVG、零图片，
  见 `docs/plans/物理训练脚手架-2026-11-12.md`；改出题/判分后跑 `node 物理/题库工具/check-training.mjs`）
- `公式记背/` —— 公式与需要背诵的内容
- `工具/` —— 生成/处理题表的脚本与工具
- `工具/dsh-plugin/` —— 「训练台」DSH 插件（只读面板：六科体检 + 学习记录统计）
- `学习记录/` —— 练习记录归档（各科「导出记录」或 `开始.html` 的一键备份）

## 会话与上下文卫生

上下文放文件，不放对话历史。长会话的代价是每次模型调用都要为历史付首 token 延迟：
这台机器实测 TTFT 约 3.7 秒（5 万 token）/ 5.1 秒（15 万）/ 9.1 秒（35 万以上），
即「耗时 ≈ 调用次数 ×（2.6 秒 + 上下文 token 数 × 14 微秒）」。

| 场景 | 做法 |
| --- | --- |
| 刚改完，接着微调（第 2、3 轮） | 留在原会话——上下文就是那几百行 |
| 换功能 / 换文件 / 换学科 | 新会话 + 任务卡 |
| 老会话已跑过大任务（> 15 万 token） | 先发 `/compact`（旧历史换成摘要，不耗模型轮次），再继续 |
| 一次性问答、排查 | 新会话，结论写进文件 |

- **任务卡**：预计 30 分钟以上的改动，先写 `docs/plans/<功能>-<日期>.md`（模板见 `docs/plans/_任务卡模板.md`）。
  对话里只放路径，不放正文；范围与验收命令必须写死在卡里。
- **交接卡**：老会话要续命，先让它写 400 字摘要到 `docs/plans/<名>-交接.md`
  （目标 / 已确认结论 / 改过的文件 / 失败过的方案 / 下一步），新会话读它接着做。
- **验收**：每张卡都带确切命令与期望输出（清单见模板文件的附 A），每改一处跑一次；产物不手改（ADR-0003）。

### 上下文卫生 6 条

1. 不整读超过 300 行的文件：先 `grep` 定位，再用 `read` 的 `offset/limit`。
2. 长日志只看尾部（`… | Select-Object -Last 6`），不把整屏输出倒进对话。
3. 中间数据写文件，不回显在对话里。
4. 一次 `write` 写完整文件，不要十次 `edit` 拼。
5. 批量/重复工作（写 30 道题、审 134 题、多入口 QA）交给 subagent，主会话只收结论。
6. 汇报给「结论 + 路径 + 行号」，不贴全文。

### 容量与产物一致性

- **换机器 / 重新 clone 后先跑 `node 工具/setup.mjs`**（装钩子 + 体检，幂等）。
  `core.hooksPath` 是机器级 git 配置，不随 clone 传过来；服务器兜底在
  `.github/workflows/repo-budget.yml`（每次 push + 每月 3 日）。

- **入库判据只有一条：页面或构建运行时读它吗。** 读就入库；不读就本机留档（原卷照片只留 `images/试卷/*.webp`；
  源卷 `*.pdf` / `*.docx` / 答卷扫描 png 一律不入库，本机保留）。跟踪总量 59 MB（2026-11-14 清理后，
  之前是 96 MB），别再加回去。规则与阈值写在 `工具/check-size.mjs` 头部，`pre-commit` 自动跑。
- **产物不手改，改源后重建**（ADR-0003）。改完源跑 `node 工具/parity.mjs`：它快照→构建→比对→还原，
  会告出「盘上产物与重建结果不同」。覆盖历史/道法/公式记背、物理、英语两份；数学 `函数思维脚手架.html`
  属 B 类（引擎与产物同体），靠 `qb.py` 自动 `.bak`。
- 细节见 `docs/adr/0005-容量预算与产物一致性.md`、`工具/README.md` 末两节。

### 错题回炉统一逻辑（强制，所有训练页）
- **凡涉及"答错 → 间隔复习 → 判定掌握"的项目/页面，必须遵守 `docs/规范/错题回炉统一规范.md`**——新增项目一律照它接入，不得自建一套。规则唯一真相源是 `工具/trainer/review.js`，四科闪练卡（数学/物理/化学/英语单词）已接入；规则只允许改内核一处，改完重建所有接入方并全量验收。
- 硬性要点：连对 2 次**有效**答对才移出错题本（秒答/提示/订正/未到期不算）；间隔按本次作答时间戳 + 档位 `[1,3,7,14]` 天重算，不用日历天数；作答流水 `recs` 不截断，掌握后历史清单行保留供期末复盘；手动入口只有「跳过本次」，不直接删错题。
- 新增科目接入清单、验收命令、禁止事项都写在规范文档第 2–4 节；决策背景见 `docs/adr/0010-共享错题回炉内核.md`。

## Agent skills

### 开始页与深链
`开始.html` 是入口页，本地 `file://` 打开时读六科 localStorage 算「今天做什么」，网页发布版只做入口。
它给各科传的 `#mode=` / `#fs=` / `#view=` 是**跨文件契约**：改入口页或改各科 hash 处理时必须同步，
契约、任务生成规则、备份格式、发布链路都记在 `docs/plans/开始页与深链契约.md`。
发布走 `C:\陶宸欣\ataotao.github.io\tools\publish.ps1`（会把 `开始.html` 改名成站点 `1/index.html`；
站点：https://ataotao.github.io/1/ 。旧机器路径 `C:\learn\ataotao.github.io` 在本机不存在，别再找）。

### Issue tracker
Issues live in GitHub Issues on `ataotao/learning-training`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels
Five canonical roles using their default strings (`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs
Single-context: one `GLOSSARY.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.

### 训练台插件
左侧栏「训练台」面板的源码在 `工具/dsh-plugin/`，约定与安装方式见该目录 `README.md`。
改扫描/解析逻辑后先跑 `node 工具/dsh-plugin/selfcheck.mjs`（不装插件、不开浏览器即可验证）。
插件只读仓库：**不要**让它执行构建或写文件，构建仍走各科自己的命令。
