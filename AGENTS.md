# 做题思维训练

中学学科做题思维训练仓库：按科目组织的题型、解题思维与公式记背材料。

## 目录

- `开始.html` —— **唯一入口**：今天做什么（读本机记录）+ 六科入口 + 一键备份记录
- `道德与法治/` `历史/` `物理/` `数学/` —— 各科目训练材料
- `公式记背/` —— 公式与需要背诵的内容
- `工具/` —— 生成/处理题表的脚本与工具
- `工具/dsh-plugin/` —— 「训练台」DSH 插件（只读面板：六科体检 + 学习记录统计）
- `学习记录/` —— 练习记录归档（各科「导出记录」或 `开始.html` 的一键备份）

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
