# 工具说明（构建 / 裁图 / 截图）

> 只给维护者看。日常使用只需要双击 `物理思维脚手架.html`。
> **本目录所有脚本都不写死机器路径**（从脚本所在位置推导项目路径，用 PATH 或常见安装位置找 node/python/浏览器），克隆到别的电脑直接用。

## 0. 环境（换电脑先看这里）

| 依赖 | 必要性 | 用途 | 怎么装 / 怎么确认 |
|---|---|---|---|
| **node ≥ 18** | 必需 | 构建、校验、生成核验清单 | 装 Node.js 后 `node -v`；没进 PATH 可用 `-NodeExe` 指定 |
| powershell 7（`pwsh`） | 必需 | 跑 `weekly.ps1` / `check.ps1` / `shot.ps1` | Windows 自带 PowerShell 5.1 也能跑 `check.ps1`、`trim.ps1` |
| **Python 3 + python-docx + pymupdf** | 建议 | 答案体检（读 docx / PDF 文末答案表）、完整性审计 | `python -V`；`python -m pip install python-docx pymupdf` |
| **Microsoft Word**（COM） | 仅"加新卷/重裁图"时需要 | docx → XPS → 页面图 | 装 Office 即可；没有 Word 也能用已有图片和题包 |
| Chrome / Edge | 仅截图自检时需要 | 无头截图 | 常见安装位置即可，或设环境变量 `CHROME_PATH` |
| powershell.exe 5.1 | 仅裁图时需要 | Word COM / WPF 渲染必须在 5.1 -STA 里跑 | Windows 自带 |

**一条命令自检环境与数据**（强烈推荐每次改动后跑）：

```powershell
pwsh -File 物理\工具\check.ps1
# 输出 node/python 探测结果 + 四项闸门（构建 / 答案体检 / 完整性 / 核验清单），全过返回 0
# 没装 Python：pwsh -File 物理\工具\check.ps1 -NoPython
```

## 1. 构建页面

```powershell
node 物理\工具\build.mjs                    # 正式产物 物理/物理思维脚手架.html + 题库/pack-全部.json
node 物理\工具\build.mjs --html=_dev.html   # 输出到 物理/_dev.html（并行开发用）
node 物理\工具\build.mjs --packs=pk-w1      # 只构建指定题包（别人的半成品不会挡你）
node 物理\工具\build.mjs --no-fail          # 有错也写文件（仅调试用，产物不要交付）
```

> `node` 不在 PATH？用 `pwsh -File 物理\工具\check.ps1` 会自己找；或直接给出 exe 路径。

构建会做这些事：读 `源/shell.html` + `源/css` + `源/js/*.js` + `题库/pack-*.json` + `源/data/*.json` →
校验（JSON、id 唯一、图片存在、tags 在清单内、steps 结构、`node --check`）→ 内联成单文件 HTML。

**校验不过就不会写出正式 HTML**（防止坏数据混进来）。改数据，不要改产物。

## 2. 截图自检

```powershell
pwsh -NoProfile -File 物理\工具\shot.ps1 -Hash "exam" -W 1280 -H 900 -Out C:\tmp\exam.png
pwsh -NoProfile -File 物理\工具\shot.ps1 -Hash "exam/pk-w1" -W 1280 -H 1500 -Out C:\tmp\q.png
pwsh -NoProfile -File 物理\工具\shot.ps1 -Html _dev.html -Hash "concept" -Out C:\tmp\c.png
```

注意：
- `-Out` 给**绝对路径**；本机已有 Chrome 在跑时，相对路径可能被 Chrome 单例转发写失败（脚本只检查文件存在，会误报 OK）。
- 无头 Chrome 窗口最小约 500px 宽，`-W 390` 不是真移动端（会按 500 排版再裁，看起来像"内容被切"，是假象）。真机效果请用 Chrome DevTools 设备模拟，或 CDP `Emulation.setDeviceMetricsOverride`（`_recon/exam-harness.html` 是当时用的 390 宽 iframe harness）。

## 3. 每周加一卷（一条命令）

```powershell
# 新卷丢到任意位置，一条命令搞定：复制进题库 → 裁图+raw → 生成草稿题包 → 构建页面
pwsh -File 物理\工具\weekly.ps1 -Docx "C:\下载\第10周.docx"   # 换成你自己的路径
# 想指定 id / 显示名：
pwsh -File 物理\工具\weekly.ps1 -Docx "<新卷路径>\第10周.docx" -PackId pk-w10 -Name "第10周 · 电学"
# 图已裁过，只想重生成草稿 + 重建页面：
pwsh -File 物理\工具\weekly.ps1 -Docx "<新卷路径>\第10周.docx" -SkipExtract -Force
```

它做四件事：① docx 复制进 `题库/`；② 跑 `extract.ps1` 裁图 + raw；③ `make_draft.mjs` 生成**草稿题包**；④ `build.mjs` 构建并校验。
packId 自动从文件名推断（`第10周.docx` → `pk-w10`，`第5周_1.docx` → `pk-w5a`）。

**草稿 vs 精修（重要）**

| | 草稿（自动生成，约 1 分钟） | 精修（人工/agent，约 15–25 分钟） |
|---|---|---|
| 选择题 | ✅ 答案取自原卷答案表，可自动判分 | 补解析，微调 tags/focus/难度 |
| 填空/解答 | ⚠️ 按「对答案不判分」：能看原卷答案图 | 拆 `fields`（可判分）+ 写 `solution` |
| 页面显示 | 题包卡片上有黄色「草稿题包」提示 | 删掉 `pack.draft` 与题目上的 `draft` 字段 |

所以流程可以是：**卷子当天先出草稿版给孩子做（对答案、收错题），周末再精修。**

精修后收尾：

```powershell
pwsh -File 物理\工具\check.ps1   # 构建 + 答案体检 + 完整性 + 核验清单，一把过
# 或者手动：node 物理\工具\build.mjs  然后  python 物理\工具\check_answers.py
```

> 不用每周都加「五步母题」：现有 15 组已覆盖各类题型；只有出现新课型（如电学计算）时再补 1–2 组。

## 4. 从 docx 生成裁图与素材（手工分步，需要时）

```powershell
# 全部 8 周（Word 开 8 次，约 3–5 分钟）
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File 物理\工具\extract.ps1
# 只跑某一周
powershell.exe ... -File 物理\工具\extract.ps1 -Only pk-w1
# 只重裁（不开 Word，改裁图边界时用）
powershell.exe ... -File 物理\工具\extract.ps1 -RecropOnly -Only pk-w1
# 新卷：指定 docx 与 packId
powershell.exe ... -File 物理\工具\extract.ps1 -Docx "C:\...\第10周.docx" -PackId pk-w10
# 只重建 raw/index
powershell.exe ... -File 物理\工具\extract.ps1 -Stage raw
```

产物：
- `物理/图片/pk-w1/q01.png`（原题）、`q11-a.png`（参考答案）、跨页 `qNN_1.png`/`qNN_2.png` + 竖向合成 `qNN.png`
- `物理/_recon/raw/pk-w1.json` / `.md`（逐题文本、选项、答案键、答案文本、图片路径）
- `物理/_recon/raw/index.json`（题数、异常清单）
- 中间件：`_recon/xps/`（docx→XPS）、`_recon/pages/`（整页 2x PNG）、`_recon/geom/<packId>.json`（每题边界与文本，**裁图只依赖它**，所以改裁图不必再开 Word）

裁图规则：x 一律整页宽（不切右边）；y 从题号行上沿到下一题号行上沿；浮动图按锚点归属并扩展边界；答案段按行切；跨页自动拆图。

## 5. 加一套新卷（人工 4 步，不用 weekly.ps1 时）

1. docx 丢进 `物理/题库/`，跑第 3 节脚本裁图（`-Docx <路径> -PackId pk-wN`）。
   PDF 原卷（如 `第11周周练.pdf`）：把 PDF 放进 `物理/题库/`，用 pymupdf 渲染 3× 后按题块裁图（参考 `pack-w11` 的 `q10_1/q10_2`、`q14_1/q14_2` 跨页拆图），再跑 `trim.ps1` 去白边；答案体检会按 `pack.source` 的扩展名走 PDF 分支。
2. 照 `题库/pack-模板.json` 写 `题库/pack-wN.json`（规范见 `源/SPEC.md` 第 2 节、`源/内容作者必读.md`）。
3. `node 物理\工具\build.mjs` 重建页面（或 `pwsh -File 物理\工具\check.ps1` 一把跑完所有闸门）。
4. 截图抽查两题；也可以把 JSON 拿到页面「题库管理」里导入（导入版存在浏览器里，优先级高于内置）。

## 6. 数据体检 / 后处理脚本

| 脚本 | 作用 |
|---|---|
| `工具/check_answers.py` | 把每个题包的选择题答案与原卷（docx / PDF）文末答案表逐题比对，报 MISMATCH（交付前跑一次，必须 0 条） |
| `工具/audit_packs.py` | 每题是否有原题图 / 答案（ansImg 或 solution）、每套题数与图片体积 |
| `工具/show_packs.py` | 打印全部题目的答案/字段/tags，快速通读 |
| `工具/trim.ps1` | 裁图后处理：去掉四周纯白边（`-DryRun` 先看效果）。裁图后建议跑一次，可把"内容只占上半截"的长图收紧 |
| `工具/check.ps1` | **一键闸门**：自动探测 node/python，依次跑 build → 答案体检 → 完整性审计 → 核验清单；全过返回 0，适合当"交付前必跑" |
| `工具/核验报告.mjs` | 生成 `物理/核验清单.md`：每题答案的来源（原卷答案表/答案图）、哪些题需人工核、数值转录清单、原卷疑点、改动后必跑的闸门 |
| `工具/make_fix_imgs.py` | 把变式题的题干 + 示意图（内联 SVG）用无头 Chrome 渲染成题面图，PIL 裁白边后存 `图片/<packId>/qNN.png`；改脚本里的 QUESTIONS 即可重出（本次期中专项 12 张就是这么来的） |
| `工具/compress-imgs.py` | 压缩裁图：PNG 转 256 色调色板重编码，**路径/文件名不变**（发布白名单与题包 JSON 都不用动），原图备份到 `_recon/图片备份/`。加 `--dry-run` 只看结果。新卷一入库就跑一次：第12周 A/B 卷 42 张 3.93 MB → 1.59 MB（省 60%） |

python 脚本的运行方式（只读，不需要写权限；`python` 不在 PATH 时用 `py -3` 或 `pwsh -File 物理\工具\check.ps1`，它会自动探测）：

```powershell
python 物理\工具\check_answers.py
python 物理\工具\audit_packs.py
python 物理\工具\show_packs.py
```

## 7. 目录说明

```
源/          源码（改这里）
  源/js/     00-core（核心，别乱改）→ 10-data（占位）→ 20-shell → 30-guided → 40-concept → 50-exam → 60-report → 70-admin → 90-app
  源/data/   concepts.json（概念卡）、guided.json（五步母题）
  源/css/    style.css
题库/        pack-w<周>.json（真源）；pack-全部.json（构建产物，别手改）
图片/        pk-w<周>/qNN.png、qNN-a.png（相对路径引用，必须和 HTML 同目录）
_recon/      中间产物（不进交付，可整个删掉；raw/ 和 geom/ 建议留作增量维护）
```

## 8. 换电脑 / 多人协作

**仓库里已经包含**：源码、题包 JSON、全部裁图、构建好的 HTML、文档与脚本。`git clone` 下来就能双击用；装 node 后就能改数据重建。

| 场景 | 需要装什么 | 命令 |
|---|---|---|
| 只给孩子用 | 无（浏览器即可） | 双击 `物理/物理思维脚手架.html` |
| 加新卷 / 重裁图 | node + Word + Python+python-docx（PDF 原卷另需 pymupdf） | `pwsh -File 物理\工具\weekly.ps1 -Docx "<卷子>\第10周.docx"` |
| 只改题包/解析 | node | 改 `题库/pack-wN.json` → `pwsh -File 物理\工具\check.ps1` |
| 只改界面 | node | 改 `源/js/*.js` 或 `源/css/style.css` → `check.ps1` |

约定（避免冲突）：

- **真源只有两类**：`题库/pack-*.json`、`源/`（js/css/data）。`物理思维脚手架.html` 和 `题库/pack-全部.json` 是**构建产物**——不要手改，改完源之后 `build` 一次。
- 两人同时改：各改各的题包（`pack-wN.json` 一人一周），最后统一跑 `check.ps1` 重新生成 HTML；冲突基本只会发生在 HTML 上，**以 JSON 为准重建**即可。
- 图片 `物理/图片/` 与裁图脚本由 `extract.ps1` 生成，**不要手工替换/改名**；要重裁用 `-RecropOnly`。
- `_recon/图片备份/`、`_recon/pages/`、`_recon/xps/` 已写进 `.gitignore`（可重建、体积大）。若它们已被 git 跟踪，可执行一次（只停止跟踪，不删本地文件）：

```powershell
git rm -r --cached 物理/_recon/图片备份 物理/_recon/pages 物理/_recon/xps
git commit -m "chore: 中间产物不再入库"
```

**每次提交前**：跑 `pwsh -File 物理\工具\check.ps1`，看到「全部通过 ✓」再提交（它会顺带把 HTML 和 `核验清单.md` 更新到最新）。
