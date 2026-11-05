# 做题思维训练

中学学科做题思维训练仓库：按科目组织的题型、解题思维与公式记背材料。

## 目录

- `开始.html` —— **唯一入口**：今天做什么（读本机记录）+ 六科入口 + 一键备份记录
- `道德与法治/` `历史/` `物理/` `数学/` —— 各科目训练材料
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

## Agent skills

### 开始页与深链
`开始.html` 是入口页，本地 `file://` 打开时读六科 localStorage 算「今天做什么」，网页发布版只做入口。
它给各科传的 `#mode=` / `#fs=` / `#view=` 是**跨文件契约**：改入口页或改各科 hash 处理时必须同步，
契约、任务生成规则、备份格式、发布链路都记在 `docs/plans/开始页与深链契约.md`。
发布走 `C:\learn\ataotao.github.io\tools\publish.ps1`（会把 `开始.html` 改名成站点 `1/index.html`）。

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
