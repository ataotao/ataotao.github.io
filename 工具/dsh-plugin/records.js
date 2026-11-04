/**
 * 学习记录（`学习记录/*.json`）的只读聚合。
 *
 * 数据来源：各科训练器网页里「导出记录」得到的 JSON，手动放进仓库根的
 * `学习记录/` 目录。这一层只读、不写、不缓存业务数据。
 *
 * 各科导出格式完全不同（详见 docs/plans/学习记录格式清点.md），所以按
 * **内容嗅探**分派，文件名只作科目兜底：
 *   1. `schema: lt.practice-records/1`        —— 统一中间格式（今后各科可直接导出这个）
 *   2. `version===2 && stepStats && exam`     —— 物理脚手架
 *   3. `data.cards` + `data.today`            —— 公式记背
 *   4. `data.cards`（或裸 `cards`）           —— 历史 / 道德与法治
 *   5. `log && recs && (paper || drill)`      —— 函数思维脚手架（当前无 JSON 导出，预留）
 *   6. `firstOk`                              —— 数学·今晚急救包（当前无导出，预留）
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '学习记录'
const MAX_BYTES = 4 * 1024 * 1024
const RECENT_LIMIT = 8
const DAY_LIMIT = 21

export function scanRecords(root) {
  const result = {
    exists: false,
    dir: DIR,
    files: [],
    parsed: [],
    snapshots: 0,
    subjects: [],
    recent: [],
    days: [],
    streak: 0,
  }
  const dir = join(root, DIR)
  if (!existsSync(dir)) return result
  result.exists = true

  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return result
  }

  const meta = loadMetadata(root)
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const file = join(dir, entry.name)
    let size = 0
    let mtimeMs = 0
    try {
      const stat = statSync(file)
      size = stat.size
      mtimeMs = stat.mtimeMs
    } catch {
      continue
    }
    const info = {
      name: entry.name,
      rel: `${DIR}/${entry.name}`,
      size,
      at: new Date(mtimeMs).toISOString(),
      subject: null,
      attempts: 0,
      note: null,
    }
    if (size > MAX_BYTES) {
      info.note = '文件过大，未解析'
      result.files.push(info)
      continue
    }
    let value
    try {
      value = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      info.note = `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`
      result.files.push(info)
      continue
    }
    const record = parseRecord(value, entry.name, meta)
    if (record) {
      info.subject = record.subject
      info.attempts = record.attempts
      result.parsed.push({ ...record, file: info.rel, at: record.at || info.at })
    } else {
      info.note = '未识别的记录格式'
    }
    result.files.push(info)
  }

  // 各科的导出都是「整份快照」而不是增量。同一工具留多份会把作答次数重复累加，
  // 所以每个 (科目, 工具) 只采用最新一份；文件本身仍列出来，方便对账。
  const latest = new Map()
  for (const record of result.parsed) {
    const key = `${record.subject}|${record.tool || ''}`
    const previous = latest.get(key)
    if (!previous || String(record.at || '') >= String(previous.at || '')) latest.set(key, record)
  }
  const snapshots = [...latest.values()]
  const adopted = new Set(snapshots.map((record) => record.file))
  for (const file of result.files) {
    if (file.note === null && !adopted.has(file.rel)) file.note = '旧快照，统计时只取最新一份'
  }

  result.snapshots = snapshots.length
  result.days = collectDays(snapshots)
  result.streak = countStreak(result.days)
  result.subjects = aggregate(snapshots)
  result.recent = snapshots
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, RECENT_LIMIT)
    .map((record) => ({
      subject: record.subject,
      date: record.at ? record.at.slice(0, 10) : '',
      text: `${record.attempts} 次作答 · 正确率 ${record.accuracy}%${record.tool ? ` · ${record.tool}` : ''}`,
    }))
  return result
}

// ------------------------------------------------------------ 元数据映射

/**
 * 记录文件里只有 id，没有单元/知识点。这里读仓库现有数据补上，
 * 只为了把「错得最多的题」归到单元；读不到就退化成 id。
 */
function loadMetadata(root) {
  const cardUnits = new Map()
  const cardSources = [
    ['历史/考点数据.json', '历史'],
    ['道德与法治/考点数据.json', '道德与法治'],
    ['公式记背/公式数据.json', '公式记背'],
  ]
  for (const [rel, subject] of cardSources) {
    const value = readJsonSafe(join(root, rel.split('/').join('\\')))
    if (!value || !Array.isArray(value.cards)) continue
    for (const card of value.cards) {
      if (!card || typeof card.id !== 'string') continue
      cardUnits.set(card.id, { subject, unit: card.unit || card.name || null })
    }
  }
  const packNames = new Map()
  const dir = join(root, '物理', '题库')
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !/^pack-.*\.json$/.test(entry.name)) continue
      if (/(全部|模板|bak)/.test(entry.name)) continue
      const value = readJsonSafe(join(dir, entry.name))
      if (!value) continue
      const packs = Array.isArray(value.packs) ? value.packs : [value]
      for (const pack of packs) {
        if (pack && typeof pack.id === 'string') packNames.set(pack.id, pack.name || pack.id)
      }
    }
  } catch {
    // 没有题库目录就退化成 id
  }
  return { cardUnits, packNames }
}

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

// ------------------------------------------------------------ 解析分派

function parseRecord(value, fileName, meta) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (isNormalized(value)) return parseNormalized(value)
  if (isPhysics(value)) return parsePhysics(value, meta)
  if (isFormula(value)) return parseCoreCards(value, '公式模板', '数学', meta, '公式记背')
  if (isCoreCards(value)) return parseCoreCards(value, '核心考点', null, meta, null, fileName)
  if (isFnScaffold(value)) return parseFnScaffold(value)
  if (isEnglishStore(value)) return parseEnglish(value)
  if (isJiji(value)) return parseJiji(value)
  return null
}

function isNormalized(value) {
  return value.schema === 'lt.practice-records/1' || value.format === 'learning-training.records/v1'
}

function isPhysics(value) {
  return value.version === 2 && value.stepStats && value.exam && value.concept
}

function isFormula(value) {
  return !!value.data && !!value.data.cards && !!value.data.today
}

function isCoreCards(value) {
  return (!!value.data && !!value.data.cards) || (!!value.cards && !value.data)
}

function isFnScaffold(value) {
  return Array.isArray(value.log) && Array.isArray(value.recs) && (value.paper || value.drill)
}

/** 函数脚手架的新导出：统一格式外壳 + `data` 里是原始 DB。 */
function isWrappedFnScaffold(value) {
  const data = value.data
  return !!data && Array.isArray(data.log) && Array.isArray(data.recs)
}

function isJiji(value) {
  return !!value.firstOk
}

/** 英语过关练习：store 里是 picks/fills/stat/at/atList，按题 id（`U1-5`）索引。 */
function isEnglishStore(value) {
  const data = value.data || value
  if (!data || typeof data !== 'object') return false
  return !data.cards && (!!data.stat || !!data.picks || !!data.fills)
}

// ------------------------------------------------------------ 各格式

/** 统一中间格式（今后各科直接导出这个，插件优先吃它）。 */
function parseNormalized(value) {
  // 有的训练器数据层很细（函数脚手架 / 英语），只套一层统一外壳、`data` 里仍是原始 store。
  if (isWrappedFnScaffold(value)) {
    return parseFnScaffold(value.data, {
      subject: value.subject,
      tool: value.tool,
      at: value.exportedAt || null,
    })
  }
  if (isEnglishStore(value)) return parseEnglish(value)
  const items = Array.isArray(value.items) ? value.items : []
  let attempts = 0
  let correct = 0
  const weak = new Map()
  let last = value.exportedAt || null
  for (const item of items) {
    const stats = item?.stats || {}
    const seen = number(stats.seen)
    const ok = number(stats.ok)
    attempts += seen
    correct += ok
    const wrong = number(stats.wrong) || Math.max(0, seen - ok)
    if (wrong > 0) {
      const label = item?.meta?.unit || item?.meta?.kp || item?.id || '未分类'
      weak.set(label, (weak.get(label) || 0) + wrong)
    }
    if (item?.lastAt && (!last || item.lastAt > last)) last = item.lastAt
  }
  if (!attempts && Array.isArray(value.events)) {
    for (const event of value.events) {
      attempts += 1
      if (event?.ok) correct += 1
    }
  }
  return finish({
    subject: value.subject || '未标注科目',
    tool: value.tool || '统一格式',
    at: value.exportedAt || null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: value.days || null,
    last,
  })
}

/** 物理脚手架：exam 累计 + guided 完成 + concept 掌握，另有 wrong 清单。 */
function parsePhysics(value, meta) {
  let attempts = 0
  let correct = 0
  let last = null
  const weak = new Map()

  for (const [packId, questions] of Object.entries(value.exam || {})) {
    let packWrong = 0
    for (const record of Object.values(questions || {})) {
      attempts += number(record?.tries)
      correct += number(record?.okN)
      packWrong += number(record?.wrongN)
      last = later(last, record?.at, record?.lastOkAt, record?.lastWrongAt)
    }
    if (packWrong > 0) {
      const name = meta.packNames.get(packId) || packId
      weak.set(name, (weak.get(name) || 0) + packWrong)
    }
  }
  let guidedOk = 0
  let guidedN = 0
  for (const record of Object.values(value.guided || {})) {
    guidedN += 1
    if (record?.ok === true) guidedOk += 1
    last = later(last, record?.at)
  }
  attempts += guidedN
  correct += guidedOk
  let conceptWrong = 0
  for (const record of Object.values(value.concept || {})) {
    attempts += number(record?.n)
    correct += number(record?.ok)
    conceptWrong += Math.max(0, number(record?.n) - number(record?.ok))
    last = later(last, record?.lastAt)
  }
  if (conceptWrong > 0) weak.set('概念卡', (weak.get('概念卡') || 0) + conceptWrong)
  for (const [key, record] of Object.entries(value.wrong || {})) {
    // 试卷错题已经按 pack 计入，这里只补引导 / 概念两类，避免重复计数。
    if (key.startsWith('e:')) continue
    const scope = key.startsWith('g:') ? '五步引导' : '概念卡'
    const count = number(record?.n) || 1
    weak.set(scope, (weak.get(scope) || 0) + count)
  }

  return finish({
    subject: '物理',
    tool: '物理思维脚手架',
    at: null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: value.days || null,
    last,
  })
}

/**
 * 历史 / 道德与法治 / 公式记背：卡片级聚合（seen/ok/wrong/last），
 * `days` 是按天计数。没有事件流，所以只能算累计口径。
 */
function parseCoreCards(value, tool, fallbackSubject, meta, forcedSubject, fileName) {
  const data = value.data || value
  const cards = data.cards || {}
  const subject =
    forcedSubject ||
    value.subject ||
    subjectFromFileName(fileName) ||
    fallbackSubject ||
    '未标注科目'
  let attempts = 0
  let correct = 0
  let last = null
  const weak = new Map()
  const firstTry = { ok: 0, total: 0 }

  for (const [cardId, record] of Object.entries(cards)) {
    const seen = number(record?.seen)
    const ok = number(record?.ok)
    attempts += seen
    correct += ok
    if (record && (record.firstOk === 0 || record.firstOk === 1)) {
      firstTry.total += 1
      if (record.firstOk === 1) firstTry.ok += 1
    }
    const wrong = number(record?.wrong)
    if (wrong > 0) {
      const unit = meta.cardUnits.get(cardId)?.unit || cardId
      weak.set(unit, (weak.get(unit) || 0) + wrong)
    }
    if (record?.last) last = later(last, new Date(number(record.last)).toISOString())
  }
  if (data.paper && typeof data.paper === 'object') {
    for (const [questionId, record] of Object.entries(data.paper)) {
      attempts += number(record?.seen)
      correct += number(record?.ok)
      if (record && (record.firstOk === 0 || record.firstOk === 1)) {
        firstTry.total += 1
        if (record.firstOk === 1) firstTry.ok += 1
      }
      const wrong = number(record?.wrong)
      if (wrong > 0) weak.set('套卷·选择题', (weak.get('套卷·选择题') || 0) + wrong)
      if (record?.last) last = later(last, new Date(number(record.last)).toISOString())
    }
  }

  return finish({
    subject,
    tool,
    at: value.exported || null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: data.days || null,
    last,
    firstTry,
  })
}

/** 函数思维脚手架：逐次事件最细（log/recs/paper 都有毫秒时间戳），按天计数从事件里现算。 */
function parseFnScaffold(value, options = {}) {
  const log = Array.isArray(value.log) ? value.log : []
  const recs = Array.isArray(value.recs) ? value.recs : []
  const paper = Array.isArray(value.paper) ? value.paper : []
  let attempts = log.length
  let correct = log.filter((item) => item?.ok === true).length
  let last = null
  const stamps = []
  for (const item of log) {
    if (item?.ts) {
      stamps.push(number(item.ts))
      last = later(last, new Date(number(item.ts)).toISOString())
    }
  }
  for (const item of recs) {
    if (item?.ts) {
      stamps.push(number(item.ts))
      last = later(last, new Date(number(item.ts)).toISOString())
    }
  }
  for (const item of paper) {
    if (item?.ts) {
      stamps.push(number(item.ts))
      last = later(last, new Date(number(item.ts)).toISOString())
    }
  }
  const weak = new Map()
  for (const item of recs) {
    for (const dim of Array.isArray(item?.failed) ? item.failed : []) {
      weak.set(dim, (weak.get(dim) || 0) + 1)
    }
  }
  for (const round of Array.isArray(value.drill) ? value.drill : []) {
    attempts += number(round?.total)
    correct += number(round?.right)
  }
  return finish({
    subject: options.subject || '数学',
    tool: options.tool || '函数思维脚手架',
    at: options.at || null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: value.days || daysFrom(stamps),
    last,
  })
}

/** 毫秒时间戳 → 本地日期计数（只用于没有 days 字段的训练器）。 */
function daysFrom(stamps) {
  const days = {}
  for (const stamp of stamps) {
    if (!stamp) continue
    const date = new Date(stamp)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const current = days[key] || { n: 0, ok: 0 }
    current.n += 1
    days[key] = current
  }
  return Object.keys(days).length ? days : null
}

/**
 * 英语过关练习：`stat` 是逐题 `att/ok/wrong`，`at`/`atList` 是本题作答时间。
 * 填空判分不落盘，所以正确率口径是「工具里判过的作答」，与原卷批改无关。
 */
function parseEnglish(value) {
  const data = value.data || value
  const stat = data.stat && typeof data.stat === 'object' ? data.stat : {}
  let attempts = 0
  let correct = 0
  const weak = new Map()
  for (const [id, record] of Object.entries(stat)) {
    attempts += number(record?.att)
    correct += number(record?.ok)
    const wrong = number(record?.wrong)
    if (wrong > 0) {
      const unit = englishUnitOf(id)
      weak.set(unit, (weak.get(unit) || 0) + wrong)
    }
  }

  const stamps = new Set()
  for (const list of Object.values(data.atList || {})) {
    if (!Array.isArray(list)) continue
    for (const stamp of list) if (typeof stamp === 'string') stamps.add(stamp)
  }
  for (const stamp of Object.values(data.at || {})) {
    if (typeof stamp === 'string') stamps.add(stamp)
  }
  const sorted = [...stamps].sort()

  return finish({
    subject: value.subject || '英语',
    tool: value.tool || '九上英语过关练习',
    at: value.exportedAt || null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: daysFromIso(sorted),
    last: sorted.length ? sorted[sorted.length - 1] : null,
  })
}

/** 英语题 id 形如 `U1-5`，取前段当单元。 */
function englishUnitOf(id) {
  const match = /^(U\d+)/i.exec(String(id))
  return match ? match[1].toUpperCase() : '其他'
}

/** ISO 时间戳 → 本地日期计数。 */
function daysFromIso(stamps) {
  const days = {}
  for (const stamp of stamps) {
    const date = new Date(stamp)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const current = days[key] || { n: 0 }
    current.n += 1
    days[key] = current
  }
  return Object.keys(days).length ? days : null
}

/** 数学·今晚急救包：st.log 是逐题次数，firstOk 是「第一次就答对」。 */function parseJiji(value) {
  let attempts = 0
  let correct = 0
  let last = null
  const weak = new Map()
  for (const [id, record] of Object.entries(value.log || {})) {
    attempts += number(record?.n)
    correct += number(record?.r)
    if (number(record?.w) > 0) weak.set(id, (weak.get(id) || 0) + number(record.w))
  }
  for (const stamp of Object.values(value.last || {})) {
    if (typeof stamp === 'number') last = later(last, new Date(stamp).toISOString())
  }
  return finish({
    subject: '数学',
    tool: '今晚急救包',
    at: null,
    attempts,
    correct,
    weak: topWeak(weak),
    days: null,
    last,
  })
}

// ------------------------------------------------------------ 组装

function finish(record) {
  const attempts = number(record.attempts)
  const correct = Math.min(number(record.correct), attempts)
  const firstTry = record.firstTry && record.firstTry.total > 0
    ? {
        ok: number(record.firstTry.ok),
        total: number(record.firstTry.total),
        rate: Math.round((number(record.firstTry.ok) / number(record.firstTry.total)) * 100),
      }
    : null
  return {
    subject: record.subject,
    tool: record.tool,
    at: record.at,
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    firstTry,
    weak: record.weak || [],
    days: record.days || null,
    last: record.last || record.at || null,
  }
}

function topWeak(map) {
  return [...map.entries()]
    .map(([label, count]) => ({ label: String(label), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

function aggregate(parsed) {
  const bySubject = new Map()
  for (const record of parsed) {
    const key = record.subject || '未标注科目'
    const current = bySubject.get(key) || {
      subject: key,
      attempts: 0,
      correct: 0,
      last: null,
      tools: new Set(),
      weak: new Map(),
      firstTryOk: 0,
      firstTryTotal: 0,
    }
    current.attempts += record.attempts || 0
    current.correct += record.correct || 0
    if (record.firstTry) {
      current.firstTryOk += record.firstTry.ok
      current.firstTryTotal += record.firstTry.total
    }
    if (record.tool) current.tools.add(record.tool)
    if (!current.last || (record.at && record.at > current.last)) current.last = record.at || current.last
    for (const item of record.weak || []) {
      current.weak.set(item.label, (current.weak.get(item.label) || 0) + item.count)
    }
    bySubject.set(key, current)
  }
  return [...bySubject.values()].map((item) => ({
    subject: item.subject,
    attempts: item.attempts,
    correct: item.correct,
    accuracy: item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0,
    firstTry: item.firstTryTotal
      ? {
          ok: item.firstTryOk,
          total: item.firstTryTotal,
          rate: Math.round((item.firstTryOk / item.firstTryTotal) * 100),
        }
      : null,
    last: item.last,
    tools: [...item.tools],
    weak: [...item.weak.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  }))
}

/** 合并各科自带的按天计数，给面板画最近三周的小柱状。 */
function collectDays(parsed) {
  const merged = new Map()
  for (const record of parsed) {
    if (!record.days || typeof record.days !== 'object') continue
    for (const [date, value] of Object.entries(record.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const n =
        number(value?.n) ||
        number(value?.guided) + number(value?.exam) + number(value?.concept)
      const ok = number(value?.ok) || Math.min(n, number(value?.ok))
      const current = merged.get(date) || { date, n: 0, ok: 0 }
      current.n += n
      current.ok += ok
      merged.set(date, current)
    }
  }
  return [...merged.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-DAY_LIMIT)
}

function countStreak(days) {
  if (!days.length) return 0
  const dates = new Set(days.map((day) => day.date))
  let streak = 0
  const cursor = new Date()
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (!dates.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function number(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function later(current, ...candidates) {
  let top = current
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue
    if (!top || candidate > top) top = candidate
  }
  return top
}

function subjectFromFileName(fileName) {
  if (!fileName) return null
  for (const subject of ['道德与法治', '历史', '公式记背', '数学', '物理', '英语']) {
    if (fileName.includes(subject)) return subject
  }
  return null
}
