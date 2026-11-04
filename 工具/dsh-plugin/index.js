/**
 * 训练台 · Host 半：只读扫描本仓库，产出面板所需的 JSON。
 *
 * 设计约束（长期维护用）：
 * - 只读：不写仓库、不跑构建、不执行 python/node 校验脚本；
 * - 单一真源：所有数字都来自仓库里的 JSON 与文件状态，插件不缓存业务数据；
 * - 契约稳定：返回值形状是 Client 的唯一输入，见 buildReport()。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile, execFileSync } from 'node:child_process'
import { scanRecords } from './records.js'

export const NS = 'learning-training.workbench'
const ROUTE = '/api/learning-training.workbench.status'
const AUDIT_ROUTE = '/api/learning-training.workbench.audit'
const CACHE_MS = 1500

/** 六科的定义：加一科只要在这里加一行，并在对应 scan* 里支持新 kind。 */
const SUBJECTS = [
  {
    key: 'history', name: '历史', kind: 'cards',
    data: '历史/考点数据.json', paper: '历史/试卷数据.json',
    html: '历史/核心考点训练.html',
  },
  {
    key: 'politics', name: '道德与法治', kind: 'cards',
    data: '道德与法治/考点数据.json',
    html: '道德与法治/核心考点训练.html',
  },
  {
    key: 'formula', name: '公式记背', kind: 'formula',
    data: '公式记背/公式数据.json',
    html: '公式记背/公式记背.html',
  },
  {
    key: 'physics', name: '物理', kind: 'packs',
    packs: '物理/题库', html: '物理/物理思维脚手架.html',
    imageBase: '物理', recon: '物理/_recon/raw/index.json',
  },
  {
    key: 'math', name: '数学', kind: 'packs',
    packs: '数学/题库', html: '数学/函数思维脚手架.html',
    drills: '数学/题库/drills.json',
    extraHtml: ['数学/今晚急救包.html'],
  },
  {
    key: 'english', name: '英语', kind: 'english',
    data: '英语/练习工具/data', html: '英语/九上英语过关练习.html',
  },
]

const PACK_SKIP = /(全部|模板|bak)/

/** 待办排序：数字小的先出现。新加 kind 记得同时补 client.js 的文案。 */
export const TODO_RANK = [
  'unreadable',
  'draft_pack',
  'missing_solution',
  'missing_figure',
  'stale_artifact',
  'artifact_drift',
  'empty_card',
  'drill_pool',
  'missing_answer',
  'missing_explain',
  'no_cloze',
  'anomaly',
]
function todoRank(kind) {
  const index = TODO_RANK.indexOf(kind)
  return index === -1 ? TODO_RANK.length : index
}

// ---------------------------------------------------------------- 基础读取

function abs(root, rel) {
  return join(root, rel.split('/').join(sep))
}

function relPath(root, path) {
  return path.startsWith(root) ? path.slice(root.length + 1).split(sep).join('/') : path
}

function statOf(path) {
  try {
    const s = statSync(path)
    return { exists: true, mtimeMs: s.mtimeMs, size: s.size }
  } catch {
    return { exists: false, mtimeMs: 0, size: 0 }
  }
}

function readJson(path) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, 'utf8')), error: null }
  } catch (error) {
    return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }
  }
}

function iso(ms) {
  return ms ? new Date(ms).toISOString() : null
}

function newest(paths) {
  let top = null
  for (const path of paths) {
    if (!path) continue
    const s = statOf(path)
    if (!s.exists) continue
    if (top === null || s.mtimeMs > top.mtimeMs) top = { path, mtimeMs: s.mtimeMs }
  }
  return top
}

// ---------------------------------------------------------------- 各科扫描

function emptyTodos() {
  return []
}

function todo(kind, label, detail, file) {
  return { kind, label, detail, file }
}

/** 考点卡的答案可能在 `a` 数组里，也可能整题就是一张表格。 */
function hasAnswer(answer) {
  return Array.isArray(answer) && answer.length > 0
}

/** 物理题的配图字段可能是字符串、逗号分隔的字符串或数组。 */
function imagesOf(askImg) {
  const list = Array.isArray(askImg) ? askImg : String(askImg).split(',')
  return list.map((item) => String(item).trim()).filter(Boolean)
}

/** 英语题的 key / explain 用 `id`（有则）否则用 `no` 作键。 */
function itemKey(item) {
  return item?.id !== undefined && item?.id !== null && item.id !== '' ? String(item.id) : String(item?.no)
}

/**
 * 英语构建脚本里有一张人工剔除表（`const DROP = { U2: [...] }`）：
 * 被剔除的残片本来就没有答案和讲解，不能算「缺」。
 */
function loadEnglishDrops(root) {
  const map = new Map()
  let text = ''
  try {
    text = readFileSync(abs(root, '英语/练习工具/build.mjs'), 'utf8')
  } catch {
    return map
  }
  const block = /const DROP = \{([\s\S]*?)\n\}/.exec(text)
  if (!block) return map
  for (const match of block[1].matchAll(/U(\d+)\s*:\s*\[([^\]]*)\]/g)) {
    const ids = [...match[2].matchAll(/["']([^"']+)["']/g)].map((item) => item[1])
    map.set(match[1], new Set(ids))
  }
  return map
}

function isDropped(drops, fileName, item) {
  const match = /^u(\d+)\.json$/.exec(fileName)
  if (!match) return false
  const set = drops.get(match[1])
  return !!set && (set.has(itemKey(item)) || set.has(String(item?.id ?? '')))
}

/** 考点卡靠 `page` 指回原页图片（图片路径由数据里的 imgBase/imgPrefix/imgExt 拼）。 */
function missingPageImages(root, subject, data, cards) {
  const base = data?.imgBase
  const prefix = data?.imgPrefix
  const ext = data?.imgExt
  if (!base || !prefix || !ext) return []
  const folder = subject.data.split('/')[0]
  const pages = [...new Set(cards.map((card) => card?.page).filter((page) => page !== undefined && page !== null))]
  return pages.filter((page) => !statOf(abs(root, `${folder}/${base}${prefix}${page}.${ext}`)).exists)
}

/** 文字考点（历史 / 道德与法治）：考点卡 + 可选套卷。 */
function scanCards(root, subject) {
  const todos = emptyTodos()
  const dataPath = abs(root, subject.data)
  const data = readJson(dataPath)
  if (!data.ok) return failed(root, subject, dataPath, data.error)

  const cards = Array.isArray(data.value?.cards) ? data.value.cards : []
  const units = new Set(cards.map((c) => c?.unit).filter(Boolean))
  let papers = null

  if (subject.paper) {
    const paperPath = abs(root, subject.paper)
    const paper = readJson(paperPath)
    if (paper.ok) {
      const questions = Array.isArray(paper.value?.questions) ? paper.value.questions : []
      papers = {
        name: paper.value?.name ?? relPath(root, paperPath),
        items: questions.length,
        file: relPath(root, paperPath),
      }
      const noAnswer = questions.filter((q) => q?.ans === undefined || q?.ans === null).length
      if (noAnswer) todos.push(todo('missing_answer', '套卷缺答案', `${noAnswer} 道选择题没有 ans`, papers.file))
    } else {
      todos.push(todo('unreadable', '套卷数据读不出来', paper.error, relPath(root, paperPath)))
    }
  }

  const emptyCards = cards.filter((c) => !c?.q || (!hasAnswer(c?.a) && !c?.table))
  if (emptyCards.length) {
    todos.push(todo('empty_card', '考点卡不完整', `${emptyCards.length} 张缺题干或答案：${ids(emptyCards)}`, relPath(root, dataPath)))
  }

  // 每张卡片靠 page 指回原页图片；缺页图 = 「对照原页」会 404。
  const missingPages = missingPageImages(root, subject, data.value, cards)
  if (missingPages.length) {
    todos.push(
      todo(
        'missing_figure',
        '原页图片缺失',
        `${missingPages.length} 页找不到原图：${missingPages.slice(0, 6).join(', ')}${missingPages.length > 6 ? ' …' : ''}`,
        relPath(root, dataPath),
      ),
    )
  }

  const html = abs(root, subject.html)
  const built = statOf(html)
  const source = newest([dataPath, subject.paper ? abs(root, subject.paper) : null])
  const stale = built.exists && source !== null && source.mtimeMs > built.mtimeMs

  return {
    key: subject.key,
    name: subject.name,
    present: true,
    items: cards.length,
    extra: [
      { label: '考点卡', value: cards.length },
      ...(papers ? [{ label: '套卷题', value: papers.items }] : []),
      { label: '单元', value: units.size },
    ],
    papers,
    built: buildState(root, html, built),
    source: source ? { at: iso(source.mtimeMs), file: relPath(root, source.path) } : null,
    stale,
    todos,
    error: null,
  }
}

/** 公式记背：卡片带简化 LaTeX。 */
function scanFormula(root, subject) {
  const dataPath = abs(root, subject.data)
  const data = readJson(dataPath)
  if (!data.ok) return failed(root, subject, dataPath, data.error)

  const cards = Array.isArray(data.value?.cards) ? data.value.cards : []
  const todos = emptyTodos()
  const broken = cards.filter((c) => !c?.q || (!c?.tex && !c?.table && !c?.steps))
  if (broken.length) {
    todos.push(todo('empty_card', '公式卡不完整', `${broken.length} 张缺题干或公式：${ids(broken)}`, relPath(root, dataPath)))
  }
  // 表格卡（如「三种形式怎么选」）本来就没有公式和挖空，不算缺。
  const noCloze = cards.filter((c) => c?.tex && !c?.cloze)
  if (noCloze.length) {
    todos.push(todo('no_cloze', '公式卡没有挖空', `${noCloze.length} 张：${ids(noCloze)}（填空题模式用不到）`, relPath(root, dataPath)))
  }

  const html = abs(root, subject.html)
  const built = statOf(html)
  const source = newest([dataPath])
  return {
    key: subject.key,
    name: subject.name,
    present: true,
    items: cards.length,
    extra: [
      { label: '公式卡', value: cards.length },
      { label: '单元', value: new Set(cards.map((c) => c?.unit).filter(Boolean)).size },
      { label: '带挖空', value: cards.length - noCloze.length },
    ],
    built: buildState(root, html, built),
    source: source ? { at: iso(source.mtimeMs), file: relPath(root, source.path) } : null,
    stale: built.exists && source !== null && source.mtimeMs > built.mtimeMs,
    todos,
    error: null,
  }
}

/**
 * 合并产物 `pack-全部.json` 是构建缓存。它和单卷不一致（多题、少题、题数不对，
 * 或比单卷还旧）时，页面上的数据就不是真源，需要重跑一次 build。
 */
function checkAggregate(root, dir, signatures, todos, sourcePaths) {
  const aggPath = join(dir, 'pack-全部.json')
  const aggregate = readJson(aggPath)
  if (!aggregate.ok) return
  const packs = Array.isArray(aggregate.value?.packs) ? aggregate.value.packs : []
  const drift = []
  const seen = new Set()
  for (const pack of packs) {
    const id = pack?.id ? String(pack.id) : null
    if (!id) continue
    seen.add(id)
    const single = signatures.get(id)
    if (!single) {
      drift.push(`${id} 只在合并文件里`)
      continue
    }
    const count = Array.isArray(pack?.questions) ? pack.questions.length : 0
    if (count !== single.count) drift.push(`${id} 题数 ${count} ≠ 单卷 ${single.count}`)
  }
  for (const id of signatures.keys()) {
    if (!seen.has(id)) drift.push(`${id} 还没进合并文件`)
  }
  // 用文件 mtime 而不是文件里的 generatedAt：有的构建脚本只写 mtime，字段会停留在旧值。
  const newestSource = sourcePaths.length ? newest(sourcePaths) : null
  if (newestSource && statOf(aggPath).mtimeMs < newestSource.mtimeMs) {
    drift.push(`合并文件比 ${relPath(root, newestSource.path)} 旧`)
  }
  if (drift.length) {
    todos.push(
      todo(
        'artifact_drift',
        '合并产物与真源不一致',
        `${drift.slice(0, 4).join('；')}${drift.length > 4 ? ' …' : ''}；要重跑一次 build`,
        relPath(root, aggPath),
      ),
    )
  }
}

/**
 * 题包科目（物理 / 数学）：`题库/pack-*.json` 是唯一真源，
 * 构建产物 `pack-全部.json` 与单文件 HTML 只是缓存。
 */
function scanPacks(root, subject) {
  const dir = abs(root, subject.packs)
  const todos = emptyTodos()
  const files = []
  let dirEntries
  try {
    dirEntries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    return failed(root, subject, dir, error instanceof Error ? error.message : String(error))
  }
  for (const entry of dirEntries) {
    if (!entry.isFile()) continue
    if (!/^pack-.*\.json$/.test(entry.name)) continue
    if (PACK_SKIP.test(entry.name)) continue
    files.push(join(dir, entry.name))
  }

  let packs = 0
  let questions = 0
  let drafts = 0
  let missingSolution = 0
  let missingFigure = 0
  const sourcePaths = [...files]
  const signatures = new Map()

  for (const file of files) {
    const parsed = readJson(file)
    if (!parsed.ok) {
      todos.push(todo('unreadable', '题包读不出来', parsed.error, relPath(root, file)))
      continue
    }
    const list = Array.isArray(parsed.value?.packs)
      ? parsed.value.packs
      : Array.isArray(parsed.value?.questions)
        ? [parsed.value]
        : []
    if (list.length === 0) {
      todos.push(todo('unreadable', '题包没有题', '既没有 packs 也没有 questions', relPath(root, file)))
      continue
    }
    for (const pack of list) {
      const items = Array.isArray(pack?.questions) ? pack.questions : []
      packs += 1
      questions += items.length
      if (pack?.id) signatures.set(String(pack.id), { count: items.length, file: relPath(root, file) })
      const isDraft = pack?.draft === true || items.some((q) => q?.draft === true)
      if (isDraft) {
        drafts += 1
        const pending = items.filter((q) => !q?.solution && !q?.ansImg && !q?.ansText).length
        todos.push(
          todo(
            'draft_pack',
            '草稿题包待精修',
            `${pack?.name ?? pack?.id ?? relPath(root, file)}（${items.length} 题，其中 ${pending} 题缺解析/答案图）`,
            relPath(root, file),
          ),
        )
      }
      for (const q of items) {
        if (!q?.solution && !q?.ansImg) {
          missingSolution += 1
          todos.push(todo('missing_solution', '题目缺解析', `第 ${q?.no ?? q?.id} 题（${q?.type ?? '未知题型'}）`, relPath(root, file)))
        }
        if (subject.imageBase && q?.askImg) {
          for (const image of imagesOf(q.askImg)) {
            const figure = abs(root, `${subject.imageBase}/${image}`)
            if (statOf(figure).exists) continue
            missingFigure += 1
            todos.push(todo('missing_figure', '题目配图丢失', `第 ${q?.no ?? q?.id} 题：${image}`, relPath(root, file)))
          }
        }
      }
    }
  }

  // 合并产物（pack-全部.json）只是缓存，和单卷不一致就说明该重跑 build。
  checkAggregate(root, dir, signatures, todos, sourcePaths)

  // 数学闪练：每个池每轮抽 3 题，池子不够就是数据问题。
  if (subject.drills) {
    const drills = readJson(abs(root, subject.drills))
    if (drills.ok) {
      const byPool = new Map()
      for (const item of Array.isArray(drills.value?.drills) ? drills.value.drills : []) {
        const pool = String(item?.pool ?? '?')
        byPool.set(pool, (byPool.get(pool) || 0) + 1)
      }
      const thin = [...byPool.entries()].filter(([, count]) => count < 3)
      if (thin.length) {
        todos.push(
          todo('drill_pool', '闪练题池不足', `每轮抽 3 题：${thin.map(([pool, count]) => `${pool}=${count}`).join('，')}`, relPath(root, subject.drills)),
        )
      }
    }
  }

  // 物理另有 _recon/raw/index.json，记录裁图时的人工核对点。
  if (subject.recon) {
    const recon = readJson(abs(root, subject.recon))
    if (recon.ok && Array.isArray(recon.value?.packs)) {
      for (const pack of recon.value.packs) {
        if (!Array.isArray(pack?.anomalies)) continue
        for (const note of pack.anomalies.slice(0, 2)) {
          todos.push(todo('anomaly', '原卷疑点待核对', `${pack?.packId ?? '?'}：${note}`, relPath(root, subject.recon)))
        }
      }
    }
  }

  const html = abs(root, subject.html)
  const built = statOf(html)
  const source = newest(sourcePaths)
  const stale = built.exists && source !== null && source.mtimeMs > built.mtimeMs
  if (stale) {
    todos.push(todo('stale_artifact', '页面未重建', `${relPath(root, source.path)} 比 HTML 新，需要跑一次构建`, relPath(root, html)))
  }

  return {
    key: subject.key,
    name: subject.name,
    present: true,
    items: questions,
    extra: [
      { label: '题包', value: packs },
      { label: '题目', value: questions },
      { label: '草稿包', value: drafts },
      { label: '缺解析', value: missingSolution },
      { label: '缺配图', value: missingFigure },
    ],
    built: buildState(root, html, built),
    source: source ? { at: iso(source.mtimeMs), file: relPath(root, source.path) } : null,
    stale,
    todos,
    error: null,
  }
}

/** 英语：每题有题面 / 答案 / 三段式讲解三份数据。 */
function scanEnglish(root, subject) {
  const dir = abs(root, subject.data)
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    return failed(root, subject, dir, error instanceof Error ? error.message : String(error))
  }
  const units = []
  const todos = emptyTodos()
  let items = 0
  let missingExplain = 0
  let missingKey = 0
  const sourcePaths = []
  const dropped = loadEnglishDrops(root)

  for (const entry of entries) {
    if (!entry.isFile() || !/^u\d+\.json$/.test(entry.name)) continue
    const file = join(dir, entry.name)
    sourcePaths.push(file)
    const unit = readJson(file)
    if (!unit.ok) {
      todos.push(todo('unreadable', '单元题面读不出来', unit.error, relPath(root, file)))
      continue
    }
    const list = Array.isArray(unit.value?.items) ? unit.value.items : []
    items += list.length
    const keyPath = join(dir, entry.name.replace(/\.json$/, '.key.json'))
    const explainPath = join(dir, entry.name.replace(/\.json$/, '.explain.json'))
    const key = readJson(keyPath)
    const explain = readJson(explainPath)
    const keyItems = key.ok && key.value?.items && typeof key.value.items === 'object' ? key.value.items : {}
    const explainItems = explain.ok && explain.value?.items && typeof explain.value.items === 'object' ? explain.value.items : {}
    const noKey = list.filter((item) => !keyItems[itemKey(item)] && !isDropped(dropped, entry.name, item)).length
    const noExplain = list.filter((item) => !explainItems[itemKey(item)] && !isDropped(dropped, entry.name, item)).length
    missingKey += noKey
    missingExplain += noExplain
    if (noKey) todos.push(todo('missing_answer', '缺答案', `${unit.value?.unit ?? entry.name} 有 ${noKey} 题没有答案`, relPath(root, keyPath)))
    if (noExplain) todos.push(todo('missing_explain', '缺三段式讲解', `${unit.value?.unit ?? entry.name} 有 ${noExplain} 题没有讲解`, relPath(root, explainPath)))
    units.push({
      unit: unit.value?.unit ?? entry.name.replace(/\.json$/, ''),
      title: unit.value?.title ?? '',
      items: list.length,
      missingKey: noKey,
      missingExplain: noExplain,
    })
  }

  const html = abs(root, subject.html)
  const built = statOf(html)
  const source = newest(sourcePaths)
  const stale = built.exists && source !== null && source.mtimeMs > built.mtimeMs
  if (stale) todos.push(todo('stale_artifact', '页面未重建', 'data/ 比 HTML 新，需要跑一次 node build.mjs', relPath(root, html)))

  return {
    key: subject.key,
    name: subject.name,
    present: true,
    items,
    extra: [
      { label: '单元', value: units.length },
      { label: '题目', value: items },
      { label: '缺答案', value: missingKey },
      { label: '缺讲解', value: missingExplain },
    ],
    units,
    built: buildState(root, html, built),
    source: source ? { at: iso(source.mtimeMs), file: relPath(root, source.path) } : null,
    stale,
    todos,
    error: null,
  }
}

function ids(cards) {
  const list = cards.slice(0, 6).map((c) => c?.id ?? '?')
  return cards.length > 6 ? `${list.join(', ')} …` : list.join(', ')
}

function buildState(root, html, built) {
  return {
    exists: built.exists,
    at: iso(built.mtimeMs),
    size: built.size,
    file: relPath(root, html),
  }
}

function failed(root, subject, path, message) {
  return {
    key: subject.key,
    name: subject.name,
    present: false,
    items: 0,
    extra: [],
    built: null,
    source: null,
    stale: false,
    todos: [todo('unreadable', '数据读不出来', message, relPath(root, path))],
    error: message,
  }
}

// ---------------------------------------------------------------- git / 根目录

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
      windowsHide: true,
    }).trim()
  } catch {
    return null
  }
}

function scanGit(root) {
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch === null) return null
  const status = git(root, ['status', '--porcelain'])
  const lines = status ? status.split(/\r?\n/).filter(Boolean) : []
  const last = git(root, ['log', '-1', '--format=%h%x09%cI%x09%s'])
  const [hash, date, subject] = last ? last.split('\t') : []
  return {
    branch,
    dirty: lines.length,
    sample: lines.slice(0, 8),
    last: hash ? { hash, date, subject } : null,
  }
}

const REPO_MARKERS = ['AGENTS.md', '工具', '物理']

function looksLikeRepo(dir) {
  try {
    return REPO_MARKERS.every((marker) => existsSync(join(dir, marker)))
  } catch {
    return false
  }
}

function resolveRoot(ctx, config) {
  const tried = []
  const consider = (dir, source) => {
    if (!dir) return null
    const candidate = resolve(dir)
    tried.push({ dir: candidate, source })
    return looksLikeRepo(candidate) ? { root: candidate, source } : null
  }
  const fromConfig = consider(config?.root, 'config')
  if (fromConfig) return { ...fromConfig, tried }
  const fromEnv = consider(process.env.LEARNING_TRAINING_ROOT, 'env')
  if (fromEnv) return { ...fromEnv, tried }
  // 插件是以链接方式装进 profile 的，模块真实路径就在仓库里（工具/dsh-plugin），
  // 所以从自身位置往上找比依赖 workspace 默认目录可靠。
  const here = dirname(fileURLToPath(import.meta.url))
  let cursor = here
  for (let i = 0; i < 4; i += 1) {
    const found = consider(cursor, 'plugin')
    if (found) return { ...found, tried }
    const up = dirname(cursor)
    if (up === cursor) break
    cursor = up
  }
  const fromWorkspace = consider(ctx.get('workingDirectory')?.defaultDirectory, 'workspace')
  if (fromWorkspace) return { ...fromWorkspace, tried }
  cursor = process.cwd()
  for (let i = 0; i < 6; i += 1) {
    const found = consider(cursor, 'cwd')
    if (found) return { ...found, tried }
    const up = dirname(cursor)
    if (up === cursor) break
    cursor = up
  }
  return { root: null, source: 'none', tried }
}

// ---------------------------------------------------------------- 只读校验

/**
 * 「跑校验」按钮的执行表：**只允许这几种命令，全部只读**（不构建、不写仓库）。
 * 面板不接受任意命令，subject 只能是下面的 key。
 */
export const AUDITS = {
  math: [{ id: 'verify', label: 'qb.py verify', runner: 'python', args: ['题库工具/qb.py', 'verify'], cwd: '数学' }],
  physics: [
    { id: 'answers', label: '答案体检', runner: 'python', args: ['物理/工具/check_answers.py'], cwd: '' },
    { id: 'audit', label: '完整性审计', runner: 'python', args: ['物理/工具/audit_packs.py'], cwd: '' },
  ],
  english: [{ id: 'grading', label: '判分清单', runner: 'node', args: ['英语/练习工具/check-grading.mjs'], cwd: '' }],
}

const AUDIT_TIMEOUT_MS = 90_000
const AUDIT_OUTPUT_LIMIT = 20_000

function auditsFor(key) {
  return (AUDITS[key] || []).map((entry) => ({ id: entry.id, label: entry.label }))
}

export function runAudit(root, entry) {
  const cwd = entry.cwd ? join(root, entry.cwd.split('/').join(sep)) : root
  const command = entry.runner === 'python' ? process.env.LEARNING_TRAINING_PYTHON || 'python' : process.env.LEARNING_TRAINING_NODE || 'node'
  return new Promise((resolve) => {
    const started = Date.now()
    execFile(
      command,
      entry.args,
      {
        cwd,
        timeout: AUDIT_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      },
      (error, stdout, stderr) => {
        const text = `${stdout || ''}${stderr || ''}`.trim()
        resolve({
          id: entry.id,
          label: entry.label,
          command: `${command} ${entry.args.join(' ')}`,
          code: error === null ? 0 : typeof error.code === 'number' ? error.code : 1,
          out: text.slice(0, AUDIT_OUTPUT_LIMIT),
          truncated: text.length > AUDIT_OUTPUT_LIMIT,
          durationMs: Date.now() - started,
        })
      },
    )
  })
}

// ---------------------------------------------------------------- 报告

export function buildReport(ctx, config) {
  const resolved = resolveRoot(ctx, config)
  const generatedAt = new Date().toISOString()
  if (!resolved.root) {
    return {
      ok: false,
      generatedAt,
      root: null,
      rootSource: 'none',
      tried: resolved.tried,
      error: {
        code: 'ROOT_NOT_FOUND',
        message: '没有找到做题思维训练仓库（需要同时存在 AGENTS.md、工具/、物理/）。',
      },
    }
  }
  const root = resolved.root
  const subjects = []
  for (const subject of SUBJECTS) {
    try {
      if (subject.kind === 'cards') subjects.push(scanCards(root, subject))
      else if (subject.kind === 'formula') subjects.push(scanFormula(root, subject))
      else if (subject.kind === 'packs') subjects.push(scanPacks(root, subject))
      else if (subject.kind === 'english') subjects.push(scanEnglish(root, subject))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      subjects.push(failed(root, subject, root, message))
    }
  }

  for (const subject of subjects) subject.audits = auditsFor(subject.key)

  const todos = []
  const notes = []
  for (const subject of subjects) {
    const all = subject.todos || []
    // 原卷疑点是裁图时留下的备注，不是待交付的活，单独归到 notes。
    subject.todos = all.filter((item) => item.kind !== 'anomaly')
    subject.notes = all.filter((item) => item.kind === 'anomaly')
    for (const item of all) {
      const entry = { subject: subject.name, subjectKey: subject.key, ...item }
      if (item.kind === 'anomaly') notes.push(entry)
      else todos.push(entry)
    }
  }
  // 先做真正挡交付的（草稿/缺解析/缺图/产物过期）。
  todos.sort((a, b) => todoRank(a.kind) - todoRank(b.kind) || a.subject.localeCompare(b.subject, 'zh'))

  const summary = {
    subjects: subjects.length,
    items: subjects.reduce((sum, s) => sum + (s.items || 0), 0),
    todos: todos.length,
    notes: notes.length,
    stale: subjects.filter((s) => s.stale).length,
    missing: subjects.filter((s) => !s.present).length,
  }

  return {
    ok: true,
    generatedAt,
    root,
    rootSource: resolved.source,
    git: scanGit(root),
    summary,
    subjects,
    todos,
    notes,
    records: scanRecords(root),
  }
}

export function apply(ctx, config = {}) {
  let cache = null
  ctx.inject(['connection'], (sub) => {
    sub.connection.fetch.register({
      path: ROUTE,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        const now = Date.now()
        if (cache === null || now - cache.at > CACHE_MS) {
          cache = { at: now, body: buildReport(ctx, config) }
        }
        return Response.json(cache.body, {
          headers: { 'cache-control': 'no-store' },
        })
      },
    })

    // 只读校验：POST {subject}，按固定执行表跑该科的审计脚本，把输出原样带回面板。
    sub.connection.fetch.register({
      path: AUDIT_ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        let body
        try {
          body = await request.json()
        } catch {
          return Response.json({ ok: false, error: '请求体必须是 JSON' }, { status: 400 })
        }
        const subject = typeof body?.subject === 'string' ? body.subject : ''
        const resolved = resolveRoot(ctx, config)
        if (!resolved.root) {
          return Response.json({ ok: false, error: '没有找到仓库根目录', tried: resolved.tried }, { status: 500 })
        }
        const entries = AUDITS[subject]
        if (!entries) {
          return Response.json({ ok: false, error: `该科目没有配置只读校验命令：${subject || '(空)'}` }, { status: 400 })
        }
        const results = []
        for (const entry of entries) results.push(await runAudit(resolved.root, entry))
        return Response.json(
          {
            ok: results.every((result) => result.code === 0),
            subject,
            ranAt: new Date().toISOString(),
            results,
          },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
    })
  })
}
