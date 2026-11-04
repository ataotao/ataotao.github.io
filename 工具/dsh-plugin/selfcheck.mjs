/**
 * 训练台自检：不装插件、不开浏览器，直接跑 Host 侧扫描器校验数据契约。
 *
 *   node 工具/dsh-plugin/selfcheck.mjs
 *
 * 断言的是「面板会显示什么」：六科都扫到、待办字段完整、
 * 学习记录解析器能认出各科真实导出格式并聚合出正确率。改扫描逻辑后先跑这个。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildReport, TODO_RANK } from './index.js'
import { scanRecords } from './records.js'

const repoRoot = decodeURIComponent(new URL('../../../', import.meta.url).pathname)
  .replace(/^\/([A-Za-z]:)/, '$1')
  .replace(/\/$/, '')

const fakeCtx = {
  get(name) {
    if (name === 'workingDirectory') return { defaultDirectory: repoRoot }
    return undefined
  },
}

let checks = 0
function ok(condition, message) {
  checks += 1
  assert.ok(condition, message)
}
function eq(actual, expected, message) {
  checks += 1
  assert.deepStrictEqual(actual, expected, message)
}

// ---------------------------------------------------------------- Host 扫描
const report = buildReport(fakeCtx, {})
ok(report.ok === true, '仓库根目录应能解析')
ok(report.root.toLowerCase().endsWith('learning-training'), `解析到的根目录不对：${report.root}`)
eq(report.subjects.length, 6, `应有六科，实际 ${report.subjects.length}`)
ok(report.summary.items > 300, `条目总数应大于 300，实际 ${report.summary.items}`)

for (const expected of ['历史', '道德与法治', '公式记背', '物理', '数学', '英语']) {
  ok(report.subjects.some((s) => s.name === expected), `缺少 ${expected}`)
}

for (const subject of report.subjects) {
  ok(typeof subject.key === 'string' && subject.key.length > 0, `${subject.name} 缺 key`)
  ok(Array.isArray(subject.todos), `${subject.name} 缺 todos`)
  for (const item of subject.todos) {
    ok(typeof item.kind === 'string', `${subject.name} 待办缺 kind`)
    ok(typeof item.label === 'string' && item.label.length > 0, `${subject.name} 待办缺 label`)
    ok(typeof item.detail === 'string' && item.detail.length > 0, `${subject.name} 待办缺 detail`)
    ok(typeof item.file === 'string' && item.file.length > 0, `${subject.name} 待办缺 file`)
  }
}
ok(report.todos.every((item) => typeof item.subject === 'string' && item.subject.length > 0), '扁平待办缺科目名')
ok(Array.isArray(report.notes), 'notes 段缺失')
ok(report.notes.every((item) => item.kind === 'anomaly'), 'notes 只放原卷疑点')
ok(report.todos.every((item) => item.kind !== 'anomaly'), '原卷疑点不应混进待办队列')
ok(report.summary.todos === report.todos.length, 'summary.todos 应与待办数一致')
ok(report.subjects.every((s) => Array.isArray(s.notes)), '每科都应有 notes 数组')
ok(report.git === null || typeof report.git.dirty === 'number', 'git 摘要字段不对')
ok(report.records && report.records.dir === '学习记录', 'records 段缺失')

// ---------------------------------------------------------------- 记录解析
const fixture = mkdtempSync(join(tmpdir(), 'ltw-records-'))
try {
  const dir = join(fixture, '学习记录')
  mkdirSync(dir, { recursive: true })
  const write = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value))
  const at = '2026-11-04T06:27:11.000Z'

  // 历史：{subject, exported, data:{cards, days, paper}}
  write('历史-练习记录-2026-11-04.json', {
    subject: '历史',
    exported: at,
    data: {
      cards: {
        'ls-p1-01': { seen: 2, ok: 1, wrong: 1, streak: 0, last: 1762300000000, mode: 'cloze' },
        'ls-p1-02': { seen: 3, ok: 3, wrong: 0, streak: 3, last: 1762300100000, mode: 'choice' },
      },
      days: { '2026-11-04': { n: 5, ok: 4 } },
      paper: {},
    },
  })
  // 同一工具的更旧快照：统计时不应重复累加
  write('历史-练习记录-2026-11-01.json', {
    subject: '历史',
    exported: '2026-11-01T06:00:00.000Z',
    data: {
      cards: { 'ls-p1-01': { seen: 9, ok: 9, wrong: 0, streak: 9, last: 1762000000000, mode: 'recite' } },
      days: { '2026-11-01': { n: 9, ok: 9 } },
      paper: {},
    },
  })

  // 公式记背：data.today 是判据，科目在文件里写的是「数学」，归到「公式记背」
  write('数学-公式记录-2026-11-04.json', {
    subject: '数学',
    exported: at,
    data: {
      cards: { '二次函数-01': { seen: 4, ok: 3, wrong: 1, streak: 2, last: 1762300200000, mode: 'fill' } },
      days: { '2026-11-04': { n: 4, ok: 3 } },
      today: { ids: ['二次函数-01'] },
    },
  })

  // 物理：裸 state，version===2 + stepStats + exam + concept
  write('物理训练记录-2026-11-04.json', {
    version: 2,
    createdAt: at,
    guided: { w1q01: { tries: 2, ok: true, steps: [true, true, true, true, true], usedHint: false, usedWalk: false, ms: 96000, at } },
    stepStats: { model: { n: 10, ok: 7 } },
    exam: { 'pk-w1': { w1q01: { tries: 3, okN: 2, wrongN: 1, ok: false, user: ['B'], at } } },
    concept: { 'c-lever-01': { n: 4, ok: 3, streak: 2, lastAt: at, due: '2026-11-19' } },
    wrong: { 'e:pk-w1:w1q01': { at, kind: 'exam', packId: 'pk-w1', qid: 'w1q01', n: 1 } },
    days: { '2026-11-04': { guided: 1, exam: 3, concept: 4 } },
    flags: {},
  })

  // 统一中间格式（今后各科的推荐导出形态）
  write('道法-统一格式.json', {
    schema: 'lt.practice-records/1',
    subject: '道德与法治',
    tool: 'core-template',
    exportedAt: '2026-11-05T02:00:00.000Z',
    items: [{ id: 'zz-p1-01', meta: { unit: '第一单元 富强与创新' }, stats: { seen: 5, ok: 4, wrong: 1 }, lastAt: at }],
    days: { '2026-11-05': { n: 5, ok: 4 } },
  })

  // 认不出来的文件：只列名，不猜
  write('坏文件.json', { nothing: true })

  const scanned = scanRecords(fixture)
  eq(scanned.exists, true, '学习记录目录应被识别')
  eq(scanned.files.length, 6, `应看到 6 个文件，实际 ${scanned.files.length}`)
  eq(scanned.parsed.length, 5, `应解析 5 个文件，实际 ${scanned.parsed.length}`)
  eq(scanned.snapshots, 4, `同一工具的旧快照应被合并，应有 4 份采用，实际 ${scanned.snapshots}`)
  eq(scanned.files.filter((f) => f.note === '未识别的记录格式').length, 1, '坏文件应被标为未识别')
  eq(scanned.files.filter((f) => f.note === '旧快照，统计时只取最新一份').length, 1, '旧快照应标出来')

  const bySubject = new Map(scanned.subjects.map((s) => [s.subject, s]))
  eq(bySubject.size, 4, `应聚合出 4 个科目，实际 ${[...bySubject.keys()].join('/')}`)

  const history = bySubject.get('历史')
  eq(history.attempts, 5, '历史作答次数 = 2 + 3')
  eq(history.accuracy, 80, `历史正确率应为 80，实际 ${history && history.accuracy}`)
  ok(history.weak.length >= 1, '历史薄弱点应非空')

  const formula = bySubject.get('公式记背')
  eq(formula.attempts, 4, '公式记背作答次数')
  eq(formula.accuracy, 75, `公式记背正确率应为 75，实际 ${formula && formula.accuracy}`)
  ok(formula.tools.includes('公式模板'), '公式记背应记录工具名')

  const physics = bySubject.get('物理')
  eq(physics.attempts, 3 + 1 + 4, '物理作答 = exam 3 + guided 1 + concept 4')
  eq(physics.correct, 2 + 1 + 3, '物理答对 = exam 2 + guided 1 + concept 3')

  const politics = bySubject.get('道德与法治')
  eq(politics.attempts, 5, '统一格式的作答次数')
  eq(politics.accuracy, 80, '统一格式的正确率')

  ok(scanned.days.length >= 1, '按天合并后应有数据')
  eq(scanned.days.at(-1).date, '2026-11-05', '按天数据应按日期升序，最后一天是 11-05')
  ok(scanned.recent.length === 4, 'recent 应有 4 条')
  eq(scanned.recent[0].subject, '道德与法治', 'recent 应按导出时间倒序')

  // 同一科目的两份文件要合并，而不是互相覆盖
  const merged = scanRecords(fixture)
  const math = merged.subjects.find((s) => s.subject === '公式记背')
  ok(math && math.attempts === 4, '单科聚合不应被后续文件覆盖')
} finally {
  rmSync(fixture, { recursive: true, force: true })
}

// ---------------------------------------------------------------- 真实仓库
const real = scanRecords(repoRoot)
ok(real && typeof real.exists === 'boolean', '真实记录的 exists 字段不对')

// ---------------------------------------------------------------- Client 半
const clientSource = readFileSync(new URL('./client.js', import.meta.url), 'utf8')

// 待办 kind 与文案必须一一对应：Host 新增一类待办却忘了加文案，面板会显示生 key。
const labelled = new Set([...clientSource.matchAll(/'todo\.([a-zA-Z_]+)'\s*:/g)].map((match) => match[1]))
for (const kind of TODO_RANK) {
  if (kind === 'anomaly') continue // 原卷疑点单独归 notes，不进待办列表
  ok(labelled.has(kind), `client.js 缺少 todo.${kind} 的文案`)
}
for (const kind of labelled) {
  ok(TODO_RANK.includes(kind), `client.js 的 todo.${kind} 在 Host 里不会出现`)
}

// 用一个最小 React/浏览器替身跑一遍 client.js，验证两个 slot 的注册参数。
let loaded = null
const ReactStub = {
  createElement: () => null,
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
}
globalThis.window = {
  __ModuleLoader__: {
    load(module) {
      loaded = module
    },
  },
}
globalThis.document = {
  baseURI: 'http://127.0.0.1:1/',
  head: { appendChild: () => {} },
  createElement: () => ({ dataset: {}, style: {}, remove: () => {} }),
}
const requireStub = (id) => {
  if (id === 'react') return ReactStub
  throw new Error(`client.js 引入了未声明依赖：${id}`)
}
new Function('require', clientSource)(requireStub)
ok(loaded !== null, 'client.js 没有调用 __ModuleLoader__.load')
eq(loaded.id, '@local/learning-training-workbench', '模块 id 应为包名')

const clientModule = loaded.factory(requireStub)
ok(Array.isArray(clientModule.inject), 'client 模块应声明 inject')
ok(clientModule.inject.includes('slots'), 'client inject 应包含 slots')
ok(clientModule.inject.includes('locale'), 'client inject 应包含 locale')

const registrations = []
const fakeClientCtx = {
  effect(fn) {
    const dispose = fn()
    ok(typeof dispose === 'function', 'ctx.effect 的回调应返回清理函数')
    return dispose
  },
  locale: {
    register(namespace, dictionary) {
      eq(namespace, 'learning-training.workbench', 'locale 命名空间应与面板 id 一致')
      ok(dictionary && dictionary.zh && dictionary.en, 'locale 应同时提供 zh / en')
    },
    bind(namespace) {
      eq(namespace, 'learning-training.workbench', 'locale.bind 的命名空间不对')
      return (key) => key
    },
  },
  slots: {
    inject(name, callback) {
      ok(typeof name === 'string' && name.length > 0, 'slots.inject 第一个参数应是 slot 名')
      callback()
    },
    register(options, component) {
      ok(typeof component === 'function', `${options && options.name} 的组件应是函数`)
      registrations.push(options)
      return () => {}
    },
  },
}
clientModule.apply(fakeClientCtx)
eq(registrations.length, 2, '应注册两个 slot（main + sidebar.panellist）')
const mainEntry = registrations.find((entry) => entry.name === 'main')
ok(mainEntry && mainEntry.key === 'learning-training.workbench', 'main 面板的 key 不对')
const panelEntry = registrations.find((entry) => entry.name === 'sidebar.panellist')
ok(panelEntry && panelEntry.id === 'learning-training.workbench', '侧栏入口的 id 不对')
ok(typeof panelEntry.label === 'function', '侧栏入口的 label 应是函数（跟随语言切换）')

console.log(`\n训练台自检通过：${checks} 项断言`)
console.log(
  `  六科条目 ${report.summary.items} · 待办 ${report.summary.todos} · 产物过期 ${report.summary.stale} · git 未提交 ${
    report.git ? report.git.dirty : '—'
  }`,
)
const kinds = new Map()
for (const item of report.todos) kinds.set(item.kind, (kinds.get(item.kind) || 0) + 1)
console.log('  待办分布：', [...kinds.entries()].map(([k, v]) => `${k}=${v}`).join(' ') || '无')
console.log(`  学习记录：${real.exists ? `${real.files.length} 个文件 / 解析 ${real.parsed.length} 个` : '目录不存在'}`)
