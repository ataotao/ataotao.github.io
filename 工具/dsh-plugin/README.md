# 训练台（DSH 插件）

做题思维训练仓库的只读面板：六科材料健康检查、跨科待办队列、学习记录统计。
它是**维护工具**，不是孩子用的练习页面——孩子仍然双击各科的单文件 HTML。

## 为什么放在仓库里

- 插件代码随仓库版本化，半年后还能找到、还能改。
- 插件只是外围工具：**删掉它，仓库照样能双击使用**，构建脚本也不依赖它。
- 安装把本目录装进 DSH profile（`~/.dsh/profiles/<profile>/node_modules`，
  本地目录安装是链接，源码始终以本目录为准）。

## 安装 / 重装 / 卸载

- 装：在 DSH 里让 agent 执行 `plugin_manager` → `install_bundle`，`target` 传本目录绝对路径。
- 装完左侧栏出现「训练台」图标（在插件、定时任务、Artifacts 图标之后）。
- 改了本目录的 Host 代码（`index.js` / `records.js`）：重装并重启 DSH 会话后生效；
  只改 `client.js` 或文案，刷新页面即可。
- 卸：`plugin_manager` → `remove_bundle`，`target` 传 `@local/learning-training-workbench`。

## 面板能看什么

1. **六科状态**：条目数、题包数、草稿包、缺解析/缺配图、构建时间；
   「源比 HTML 新」会标「页面未重建」。
2. **待办队列**：草稿题包、缺解析、配图丢失、产物与真源不一致、产物过期，跨科汇总，带文件路径。
3. **原卷疑点**：`物理/_recon/raw/index.json` 里裁图时记下的核对备注，默认收起点开。
4. **学习记录**：解析仓库根 `学习记录/*.json`（各科网页「导出记录」的产物），
   算分科正确率、薄弱知识点、连续天数、按天练习量。约定见 `学习记录/README.md`。
5. **跑校验**（每张科目卡上的按钮）：只跑该科**固定白名单**里的只读命令，把 stdout 原样贴回卡片。
   数学 `qb.py verify`、物理 `check_answers.py` + `audit_packs.py`、英语 `check-grading.mjs`。
   历史/道法/公式暂时没有只读校验命令，卡片上不出现按钮。

## 明确不做

- **不跑构建**，不写仓库。构建仍是各科自己的命令，面板只负责告诉你「哪一科现在需要跑」。
  「跑校验」执行表写死在 `index.js` 的 `AUDITS` 里，不接受任意命令（见 ADR-0002）。
- 不替代题库 JSON 这个唯一真源，也不缓存业务数据（每个请求现扫，1.5 秒内复用）。

## 自检

不装插件、不开浏览器，直接跑 Host 侧扫描器 + Client 侧装配检查：

```powershell
node 工具/dsh-plugin/selfcheck.mjs
```

断言内容（122 项）：六科都扫到、待办字段完整、原卷疑点不混进待办、
六种真实导出格式（历史/道法、公式、物理、函数脚手架、英语、统一格式）都能解析且聚合正确、
首次就答对与按天计数、同一工具的旧快照不被重复累加、
待办类型与文案一一对应、校验执行表全是只读命令、两个 slot 的注册参数正确。
改扫描或解析逻辑后先跑这个。

## 根目录怎么找

按顺序找「同时存在 `AGENTS.md`、`工具/`、`物理/`」的目录：

1. `cordis.patch.yml` 里该行的 `config.root`
2. 环境变量 `LEARNING_TRAINING_ROOT`
3. **插件自身位置**往上 4 层（以链接方式安装时，模块真实路径就在仓库里，这是正常命中的来源）
4. DSH 默认工作目录
5. 当前进程目录及其上 6 层

都找不到时，面板会列出尝试过的路径。

## 扩展点

- 加一科：在 `index.js` 的 `SUBJECTS` 加一行，并复用 `scanCards` / `scanFormula` /
  `scanPacks` / `scanEnglish` 之一；新题型就照现有 `scan*` 写一个。
- 加一类待办：在扫描里 `todos.push(todo(kind, ...))`，然后补
  `index.js` 的 `TODO_RANK` 和 `client.js` 的 `todo.<kind>` 文案——`selfcheck` 会检查两边是否配对。
- 统一记录格式：`records.js` 已优先识别 `schema: "lt.practice-records/1"`，
  各科以后直接导出这个格式就不用再写适配（字段见 `docs/plans/学习记录格式清点.md` §9.3）。
