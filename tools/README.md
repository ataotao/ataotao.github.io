# 站点发布说明

本站 `https://ataotao.github.io` 的内容来自**三个文件夹**，本站仓库自己只贡献很少一部分。

| 站点里的东西 | 来自哪里 | 怎么产生 |
|---|---|---|
| 根目录 `index.html`、`favicon.png`、`assets/` | `C:\learn\learn-english\word_table\vocab-app` | Vite 构建出的 `dist\` |
| `1\` 下六个训练器 + 图片 + 开始页 | `C:\work\my-work\learning-training` | 各训练器自己的构建流程；`开始.html` 是手写静态页 |
| `1\index.html`（= 训练仓库根的 `开始.html`）、`*.txt` 验证文件 | 开始页来自训练仓库；`*.txt` 是本仓库自己的 | 脚本把 `开始.html` 改名发布成 `1\index.html` |

> 站点根目录的 `index.html` 和 `favicon.png` 与 `vocab-app\dist\` 里的哈希完全一致，这条链路是核对过的。

三个仓库的分工：

| 仓库 | 性质 | 是否公开 |
|---|---|---|
| `ataotao/learn-english` | 英语内容 + `vocab-app` 前端工程 | 公开 |
| `ataotao/learning-training` | 做题思维训练内容生产（含 docx、`_recon`、构建脚本、`开始.html` 入口页） | 公开 |
| `ataotao/ataotao.github.io` | 发布站，Pages 从 `master` 分支发布 | 公开 |

生产仓库里的大文件（20MB+ docx、`_recon` 中间产物、node_modules、工具链）不进站点，所以没有合并仓库，而是用脚本单向发布。

## 日常发布

改完任何一侧之后，在本仓库根目录跑一条命令：

```powershell
# 先看会改什么（推荐每次都先跑）
.\tools\publish.ps1 -DryRun -Prune

# 全量发布：英语 + 五个训练器，清掉源里已删的文件
.\tools\publish.ps1 -Prune

# 只发一个来源
.\tools\publish.ps1 -Only vocab        # 只发英语单词记背
.\tools\publish.ps1 -Only training     # 只发做题思维训练

# 顺手提交推送
.\tools\publish.ps1 -Prune -Commit -Push
```

前置动作：

| 改了什么 | 发布前要先做 |
|---|---|
| `vocab-app` 的源码 | `cd C:\learn\learn-english\word_table\vocab-app` → `npm run build` |
| 做题思维训练的内容 | 用各自的构建流程生成新的 HTML（先跑各科自检） |
| `开始.html`（入口页） | 改完直接发布，`-Only training` 即可；它会成为 `1\index.html` |

脚本按**文件名 + SHA256** 比对，只复制真正变了的文件，重复运行幂等（第二次必然「新增 0 · 更新 0」）。源目录或清单项不存在时会列出来并以退出码 1 结束。

## 多台电脑（家里 / 公司）：路径不写死

三个仓库在两台机器上的位置不一样，所以脚本里**没有任何绝对路径默认值**。源路径按这个顺序解析：

1. **命令行参数**：`-TrainingRoot <路径>` / `-VocabRoot <路径>`（临时用）
2. **本机配置**：`tools\publish.local.json`（**不入库**，`.gitignore` 已忽略）
3. **环境变量**：`LEARNING_TRAINING_ROOT` / `LEARN_ENGLISH_DIST`
4. **自动探测**：在仓库父目录、用户目录、`C:\learn`、`C:\work`、`D:\...` 等常见位置往下两层找——训练仓库认 `AGENTS.md`+`工具/`+`物理/`，vocab 认 `dist\index.html`。

脚本启动时会打印本机名和每个来源的解析结果（带来源标签），例如：

```
本机：NUCBOX_K9
  做题思维训练 : C:\work\my-work\learning-training  [配置文件（NUCBOX_K9）]
  英语单词 dist: C:\learn\learn-english\word_table\vocab-app\dist  [配置文件（NUCBOX_K9）]
```

### 每台机器一次性设置（推荐）

在**每台机器**上跑一次，把本机路径写死到自己的 `publish.local.json`：

```powershell
# 在公司电脑上（示例：把 <...> 换成那台机器上的实际路径）
.\tools\publish.ps1 -TrainingRoot 'D:\repos\learning-training' `
                    -VocabRoot    'D:\repos\learn-english\word_table\vocab-app\dist' `
                    -WriteConfig
```

之后直接 `.\tools\publish.ps1 -DryRun -Prune` 即可，不用再带参数。换机器、搬目录后重跑一次 `-WriteConfig` 覆盖即可。

### 一个配置文件管两台机器（可选）

如果 `publish.local.json` 通过网盘/手动拷到两台机器，可以用 `machines` 按 `COMPUTERNAME` 分机器；没有匹配项时退回扁平配置：

```json
{
  "machines": {
    "NUCBOX_K9": { "training": "C:/work/my-work/learning-training", "vocab": "C:/learn/learn-english/word_table/vocab-app/dist" },
    "COMPANY-PC": { "training": "D:/repos/learning-training", "vocab": "D:/repos/learn-english/word_table/vocab-app/dist" }
  },
  "training": "C:/work/my-work/learning-training",
  "vocab": "C:/learn/learn-english/word_table/vocab-app/dist"
}
```

样例见 `tools\publish.example.json`。找不到任何来源时，脚本会列出**已尝试的探测位置**和三种修法，并以退出码 1 结束（不会在错路径上“静默成功”）。


## 发布范围

写在脚本顶部的 `$Jobs` 里，改清单即可增删。

**英语（`vocab-app\dist` → 站点根目录）**

| 源 | 说明 |
|---|---|
| `index.html` | 构建产物，会覆盖站点根目录的 index.html |
| `favicon.png` | 同上 |
| `assets\*` | Vite 带哈希的产物文件 |

**做题思维训练（→ 站点 `1\`）**

| 源 | 说明 |
|---|---|
| `道德与法治/核心考点训练.html` | 单文件，数据内嵌 |
| `道德与法治/images/*.webp` | 考点配图 10 张 |
| `公式记背/公式记背.html` | 单文件，数据内嵌 |
| `历史/核心考点训练.html` | 单文件，数据内嵌 |
| `历史/images/试卷/*.webp` | 材料题配图 15 张 |
| `数学/函数思维脚手架.html` | 单文件，数据内嵌 |
| `物理/物理思维脚手架.html` | 单文件，数据内嵌 |
| `物理/图片/*.png` | 按周次分目录的题目原图 166 张 |
| **`开始.html`**（源在训练仓库根） | **改名发布成 `1\index.html`**：一个入口页，六科 + 英语单词 + 记录备份说明；本地 `file://` 打开时还会读本机练习记录算「今天做什么」 |

两条安全边界：

- `1\index.html` 由训练仓库根的 `开始.html` 生成，脚本会覆盖它；旧手写索引已被取代（git 历史里还能找回）。
- `-Prune` 只在清单涉及的子目录内删除，站点根目录的验证 `*.txt` 不会被误删。

### 英语侧的额外规则：只发 `index.html` 可达的产物

Vite 8 实测不会清空 `dist`，历史构建产物会一直堆在里面；如果按 `dist` 内容镜像，这些死文件就会被一遍遍搬上站点。所以发布英语侧时，脚本会从 `dist/index.html` 出发，顺着 `assets/x.js`、`./x.js` 这类引用做一次可达性扫描，**只发布真正被引用到的文件**，其余一律挡在发布之外。

这意味着 `dist` 干不干净都不影响站点：脏了也只是多几个不会被发布的文件。

## 参数

| 参数 | 作用 |
|---|---|
| `-Only all\|vocab\|training` | 发布哪个来源，默认 `all` |
| `-TrainingRoot <path>` | 训练仓库位置（临时覆盖，优先于配置） |
| `-VocabRoot <path>` | vocab-app 的 `dist` 位置（临时覆盖，优先于配置） |
| `-ConfigPath <path>` | 本机配置文件，默认 `tools\publish.local.json` |
| `-WriteConfig` | 把当前解析到的路径写入本机配置（每台机器一次） |
| `-SourceRoot <path>` | 旧用法：父目录按老结构推导（`<root>\learn-english\...`、`<root>\做题思维训练`） |
| `-DryRun` | 只报告，不写文件、不提交 |
| `-Prune` | 删除目标里源已删除的文件（英语侧按可达性裁剪） |
| `-Commit` | 发布后在站点仓库提交（仅本次涉及的路径） |
| `-Push` | 提交后推送，需配 `-Commit` |

## 已处理的历史问题（2026-10）

1. **`assets\` 里 95% 是死文件 —— 已清理。** 原本 39 个文件里 `index.html` 只引用 2 个，其余 37 个是历史构建残留。现在 `assets\` 只剩 `index-C_MTQG6d.js` + `index-Dc47wM3J.css`，9.3 MB → 0.43 MB。清理后已在本地 HTTP 环境实测 SPA 正常渲染。
2. **`dist\` 累积 —— 已从两侧堵住。** 根源是 Vite 8.3.5 不清空输出目录：`build.emptyOutDir: true` 和 CLI 的 `--emptyOutDir` 实测均无效。现在：
   - 构建侧：`vocab-app/package.json` 加了 `prebuild`，构建前用 `node -e` 删掉 `dist`；
   - 发布侧：脚本按可达性裁剪（见上一节），不依赖 `dist` 是否干净。

   > 注意：`prebuild` 的删除在受限沙箱里可能被静默拦截（子进程的删除操作会被拦截且不报错）。在普通终端里正常。
3. **`001.html` —— 已删除。** 248 KB 的数学训练器旧副本，站点内没有任何链接指向它，现版在 `1\数学\` 下。
4. **`1\index.html` 的英语卡片** 指向 `../index.html`，即站点根目录的 SPA，属于跨目录链接，发布脚本不会碰它。

## 想更省事：定时自动发布

`github-actions-nightly-sync.yml.example` 是现成工作流：每天定时（也可手动触发）检出两个源仓库、构建 `vocab-app`、跑同一个 `publish.ps1`、有变化就自动提交。放进 `.github/workflows/` 并去掉 `.example` 后缀即生效。

三个仓库都是公开的，不需要配置密钥。
