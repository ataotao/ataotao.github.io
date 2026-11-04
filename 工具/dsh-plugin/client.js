window.__ModuleLoader__.load({
  id: '@local/learning-training-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const NS = 'learning-training.workbench'
    const PANEL_ID = 'learning-training.workbench'
    const ROUTE = 'api/learning-training.workbench.status'
    const AUDIT_ROUTE = 'api/learning-training.workbench.audit'
    // apply() 里换成 ctx.locale.bind(NS)；组件在渲染时才读取，先给中文兜底。
    let t = (key) => zh[key] || key

    // 文案与 locale/*.json 里的 meta 分开：这里管页面，那里管插件管理器里的显示名。
    const zh = {
      panel: '训练台',
      title: '训练台',
      subtitle: '做题思维训练 · 只读体检',
      refresh: '刷新',
      loading: '正在扫描仓库…',
      retry: '重试',
      failed: '扫描失败',
      rootNotFound: '没有找到做题思维训练仓库',
      rootHint: '设置环境变量 LEARNING_TRAINING_ROOT，或在 cordis.patch.yml 里给这一行加 config.root。',
      tried: '已尝试',
      statItems: '六科条目',
      statTodos: '待办',
      statStale: '产物过期',
      statDirty: '未提交',
      subjects: '六科状态',
      todos: '待办队列',
      todosEmpty: '没有待办。改完内容跑一次构建，再点刷新。',
      records: '学习记录',
      noTodos: '待办',
      built: '构建',
      source: '源',
      never: '未构建',
      subjectMissing: '数据缺失',
      ok: '正常',
      warn: '有待办',
      error: '读不出来',
      readonly: '只读面板：不写仓库、不跑构建，数字全部来自仓库里现有的 JSON 与文件状态。',
      generated: '扫描于',
      branch: '分支',
      lastCommit: '最近提交',
      file: '文件',
      count: '条',
      recordsMissing: '还没有 学习记录/ 目录。把各科网页里「导出记录」得到的 JSON 放进仓库根目录的 学习记录/，刷新后这里会出统计。',
      recordsFiles: '文件',
      recordsParsed: '已解析',
      recordsUsed: '采用',
      audit: '跑校验',
      auditing: '校验中…',
      auditPass: '通过',
      auditFail: '未通过',
      auditEmpty: '（没有输出）',
      exitCode: '退出码',
      recordsEmpty: '目录里有文件，但没有能识别的记录格式。',
      recordsSummary: '汇总',
      recordsSubjects: '分科',
      recordsRecent: '最近练习',
      attempts: '次作答',
      accuracy: '正确率',
      firstTry: '首次就答对',
      weak: '薄弱知识点',
      noWeak: '暂无',
      viewLess: '收起',
      viewMore: '展开全部',
      notes: '原卷疑点',
      notesHint: '裁图时记下的核对备注，不影响使用；有空人工过一遍即可。',
      notesEmpty: '没有原卷疑点。',
      streak: '连续练习',
      days: '最近三周',
      daysUnit: '天',
      recordDaysHint: '按天练习量（合并各科 days 计数）',
      panelNav: '训练台',
      'todo.draft_pack': '草稿题包待精修',
      'todo.missing_solution': '题目缺解析',
      'todo.missing_figure': '题目配图丢失',
      'todo.stale_artifact': '页面未重建',
      'todo.anomaly': '原卷疑点待核对',
      'todo.empty_card': '考点卡不完整',
      'todo.no_cloze': '公式卡没有挖空',
      'todo.missing_answer': '缺答案',
      'todo.missing_explain': '缺三段式讲解',
      'todo.artifact_drift': '合并产物与真源不一致',
      'todo.drill_pool': '闪练题池不足',
      'todo.unreadable': '数据读不出来',
    }
    const en = {
      panel: 'Workbench',
      title: 'Workbench',
      subtitle: 'Learning repo · read-only health check',
      refresh: 'Refresh',
      loading: 'Scanning the repository…',
      retry: 'Retry',
      failed: 'Scan failed',
      rootNotFound: 'Repository not found',
      rootHint: 'Set LEARNING_TRAINING_ROOT, or add config.root to this row in cordis.patch.yml.',
      tried: 'Tried',
      statItems: 'Items',
      statTodos: 'Todos',
      statStale: 'Stale builds',
      statDirty: 'Uncommitted',
      subjects: 'Subjects',
      todos: 'Todo queue',
      todosEmpty: 'Nothing to do. Rebuild after editing, then refresh.',
      records: 'Study records',
      noTodos: 'todos',
      built: 'Built',
      source: 'Source',
      never: 'not built',
      subjectMissing: 'data missing',
      ok: 'ok',
      warn: 'todos',
      error: 'unreadable',
      readonly: 'Read-only: the plugin never writes to the repository or runs builds.',
      generated: 'Scanned',
      branch: 'Branch',
      lastCommit: 'Last commit',
      file: 'File',
      count: '',
      recordsMissing: 'No 学习记录/ directory yet. Export records from a trainer page and drop the JSON into 学习记录/ at the repo root.',
      recordsFiles: 'files',
      recordsParsed: 'parsed',
      recordsUsed: 'used',
      audit: 'Run checks',
      auditing: 'Running…',
      auditPass: 'pass',
      auditFail: 'fail',
      auditEmpty: '(no output)',
      exitCode: 'exit',
      recordsEmpty: 'Files are present but none matched a known record format.',
      recordsSummary: 'Summary',
      recordsSubjects: 'By subject',
      recordsRecent: 'Recent practice',
      attempts: 'answers',
      accuracy: 'accuracy',
      firstTry: 'first-try',
      weak: 'Weak points',
      noWeak: 'none',
      viewLess: 'Collapse',
      viewMore: 'Show all',
      notes: 'Source caveats',
      notesHint: 'Notes recorded while cropping scans. Safe to ignore; worth a human pass.',
      notesEmpty: 'No caveats.',
      streak: 'Streak',
      days: 'Last three weeks',
      daysUnit: 'd',
      recordDaysHint: 'Daily volume, merged from every subject',
      panelNav: 'Workbench',
      'todo.draft_pack': 'Draft pack needs polish',
      'todo.missing_solution': 'Question has no explanation',
      'todo.missing_figure': 'Question figure missing',
      'todo.stale_artifact': 'Page needs rebuild',
      'todo.anomaly': 'Source-page caveat',
      'todo.empty_card': 'Incomplete card',
      'todo.no_cloze': 'Formula card has no blanks',
      'todo.missing_answer': 'Answer missing',
      'todo.missing_explain': 'Lesson notes missing',
      'todo.artifact_drift': 'Merged artifact out of sync',
      'todo.drill_pool': 'Drill pool too small',
      'todo.unreadable': 'Data unreadable',
    }

    const CSS = `
.ltw-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.ltw-inner{max-width:1100px;margin:0 auto;padding:28px 28px 48px}
.ltw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}
.ltw-title{margin:0;font-size:20px;font-weight:600;letter-spacing:.01em}
.ltw-sub{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.ltw-head-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ltw-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}
.ltw-pill code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-primary)}
.ltw-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}
.ltw-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2)}
.ltw-btn:disabled{opacity:.55;cursor:default}
.ltw-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.ltw-tile{padding:14px 16px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ltw-tile-num{font-size:24px;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}
.ltw-tile-label{margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ltw-tile.is-warn .ltw-tile-num{color:var(--dsw-alias-state-warn-primary)}
.ltw-tile.is-error .ltw-tile-num{color:var(--dsw-alias-state-error-primary)}
.ltw-section{margin:0 0 10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.ltw-section .ltw-count{font-weight:400;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ltw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(275px,1fr));gap:12px;margin-bottom:28px}
.ltw-card{padding:14px 16px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ltw-card-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ltw-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}
.ltw-dot.warn{background:var(--dsw-alias-state-warn-primary)}
.ltw-dot.error{background:var(--dsw-alias-state-error-primary)}
.ltw-card-name{font-size:13px;font-weight:600}
.ltw-card-status{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ltw-kv{display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:8px}
.ltw-kv-item{font-size:11px;color:var(--dsw-alias-label-secondary)}
.ltw-kv-item b{font-weight:600;font-size:12px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-right:3px}
.ltw-meta{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;flex-wrap:wrap;gap:4px 12px}
.ltw-meta code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.ltw-tag{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:5px;font-size:10.5px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.ltw-tag.warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.ltw-tag.error{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.ltw-tag.ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.ltw-audit{margin-top:10px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:10px}
.ltw-audit-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ltw-audit-item{margin-top:8px}
.ltw-audit-head{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-bottom:4px}
.ltw-pre{margin:0;padding:8px 10px;max-height:190px;overflow:auto;border-radius:6px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}
.ltw-list{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1);margin-bottom:28px}
.ltw-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px}
.ltw-row:first-child{border-top:0}
.ltw-row:hover{background:var(--dsw-alias-bg-layer-2)}
.ltw-row-sub{flex:none;width:74px;font-size:11px;color:var(--dsw-alias-label-secondary);padding-top:1px}
.ltw-row-main{flex:1;min-width:0}
.ltw-row-label{font-weight:600;font-size:12px}
.ltw-row-detail{margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.55;word-break:break-word}
.ltw-row-file{flex:none;max-width:34%;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-secondary);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:2px}
.ltw-empty{padding:22px 16px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7}
.ltw-empty code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}
.ltw-error{padding:20px;border-radius:10px;border:1px solid var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1);font-size:12px}
.ltw-error h3{margin:0 0 8px;font-size:13px;color:var(--dsw-alias-state-error-primary)}
.ltw-error ul{margin:8px 0 0;padding-left:18px;color:var(--dsw-alias-label-secondary)}
.ltw-error code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}
.ltw-foot{margin-top:8px;font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.7}
.ltw-subgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:12px}
.ltw-records{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;margin-bottom:28px}
.ltw-subline{display:flex;align-items:center;gap:8px;margin:14px 0 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ltw-bar{height:5px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ltw-bar>i{display:block;height:100%;background:var(--dsw-alias-brand-primary)}
.ltw-subject-card{padding:10px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}
.ltw-subject-name{display:flex;align-items:baseline;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px}
.ltw-subject-name span{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.ltw-weakrow{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:2px 0;color:var(--dsw-alias-label-secondary)}
.ltw-weakrow b{font-weight:500;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.ltw-days{display:flex;align-items:flex-end;gap:3px;height:32px;margin-top:10px}
.ltw-days>i{flex:1;min-height:2px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);transition:background .15s}
.ltw-days>i.on{background:var(--dsw-alias-brand-primary)}
.ltw-days-legend{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:4px}
.ltw-streak{display:flex;align-items:baseline;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ltw-streak b{font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.ltw-records-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.ltw-note-row{display:flex;gap:10px;padding:8px 14px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ltw-note-row:first-child{border-top:0}
.ltw-note-row b{flex:none;width:74px;font-weight:500;color:var(--dsw-alias-label-primary)}
.ltw-note-row span{flex:1;min-width:0;word-break:break-word;line-height:1.5}
`

    function fmtDate(value) {
      if (!value) return '—'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    function fmtRelative(value) {
      if (!value) return ''
      const t = new Date(value).getTime()
      if (Number.isNaN(t)) return ''
      const diff = Date.now() - t
      const minute = 60000
      if (diff < 5 * minute) return '刚刚'
      if (diff < 60 * minute) return `${Math.round(diff / minute)} 分钟前`
      if (diff < 24 * 60 * minute) return `${Math.round(diff / (60 * minute))} 小时前`
      return `${Math.round(diff / (24 * 60 * minute))} 天前`
    }

    function Tiles({ report }) {
      const dirty = report.git ? report.git.dirty : null
      const tiles = [
        { label: t('statItems'), value: report.summary.items, tone: '' },
        { label: t('statTodos'), value: report.summary.todos, tone: report.summary.todos > 0 ? 'is-warn' : '' },
        { label: t('statStale'), value: report.summary.stale, tone: report.summary.stale > 0 ? 'is-warn' : '' },
        { label: t('statDirty'), value: dirty === null ? '—' : dirty, tone: dirty ? 'is-warn' : '' },
      ]
      return h(
        'div',
        { className: 'ltw-tiles' },
        tiles.map((tile, i) =>
          h(
            'div',
            { className: `ltw-tile ${tile.tone}`, key: i },
            h('div', { className: 'ltw-tile-num' }, tile.value),
            h('div', { className: 'ltw-tile-label' }, tile.label),
          ),
        ),
      )
    }

    function SubjectCard({ subject, audit, onAudit }) {
      const tone = subject.error || !subject.present ? 'error' : subject.todos.length ? 'warn' : ''
      const status = subject.error || !subject.present ? t('error') : subject.todos.length ? t('warn') : t('ok')
      const running = audit && audit.status === 'running'
      const hasAudits = Array.isArray(subject.audits) && subject.audits.length > 0
      return h(
        'div',
        { className: 'ltw-card' },
        h(
          'div',
          { className: 'ltw-card-head' },
          h('i', { className: `ltw-dot ${tone}` }),
          h('span', { className: 'ltw-card-name' }, subject.name),
          h('span', { className: 'ltw-card-status' }, status),
        ),
        h(
          'div',
          { className: 'ltw-kv' },
          (subject.extra || []).map((item, i) =>
            h('span', { className: 'ltw-kv-item', key: i }, h('b', null, item.value), item.label),
          ),
        ),
        h(
          'div',
          { className: 'ltw-meta' },
          subject.built && subject.built.exists
            ? h('span', null, `${t('built')} ${fmtDate(subject.built.at)}`, ' ', h('code', null, fmtRelative(subject.built.at)))
            : h('span', null, t('never')),
          subject.stale ? h('span', { className: 'ltw-tag warn' }, t('todo.stale_artifact')) : null,
          subject.todos.length ? h('span', { className: 'ltw-tag warn' }, `${subject.todos.length} ${t('noTodos')}`) : null,
          (subject.notes || []).length
            ? h('span', { className: 'ltw-tag' }, `${t('notes')} ${subject.notes.length}`)
            : null,
        ),
        hasAudits
          ? h(
              'div',
              { className: 'ltw-audit' },
              h(
                'div',
                { className: 'ltw-audit-bar' },
                h(
                  'button',
                  { className: 'ltw-btn', disabled: running, onClick: () => onAudit(subject.key) },
                  running ? t('auditing') : t('audit'),
                ),
                audit && audit.data
                  ? h(
                      'span',
                      { className: `ltw-tag ${audit.data.ok ? 'ok' : 'error'}` },
                      audit.data.ok ? t('auditPass') : t('auditFail'),
                    )
                  : null,
                audit && audit.error ? h('span', { className: 'ltw-tag error' }, audit.error) : null,
              ),
              audit && audit.data
                ? audit.data.results.map((result, i) =>
                    h(
                      'div',
                      { className: 'ltw-audit-item', key: i },
                      h(
                        'div',
                        { className: 'ltw-audit-head' },
                        `${result.label} · ${t('exitCode')} ${result.code} · ${result.durationMs}ms`,
                      ),
                      result.out
                        ? h('pre', { className: 'ltw-pre' }, result.out)
                        : h('div', { className: 'ltw-foot' }, t('auditEmpty')),
                    ),
                  )
                : null,
            )
          : null,
      )
    }

    function TodoList({ todos, expanded, onToggle }) {
      if (!todos.length) return h('div', { className: 'ltw-list' }, h('div', { className: 'ltw-empty' }, t('todosEmpty')))
      const shown = expanded ? todos : todos.slice(0, 12)
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ltw-list' },
          shown.map((item, i) =>
            h(
              'div',
              { className: 'ltw-row', key: i },
              h('span', { className: 'ltw-row-sub' }, item.subject),
              h(
                'div',
                { className: 'ltw-row-main' },
                h('div', { className: 'ltw-row-label' }, t(`todo.${item.kind}`) || item.label),
                h('div', { className: 'ltw-row-detail' }, item.detail),
              ),
              h('span', { className: 'ltw-row-file', title: item.file }, item.file),
            ),
          ),
        ),
        todos.length > 12
          ? h(
              'button',
              { className: 'ltw-btn', onClick: onToggle, style: { marginTop: 8 } },
              expanded ? t('viewLess') : `${t('viewMore')} (${todos.length})`,
            )
          : null,
      )
    }

    function DailyBars({ days }) {
      const list = Array.isArray(days) ? days : []
      if (!list.length) return null
      const max = Math.max(...list.map((day) => day.n || 0), 1)
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ltw-days' },
          list.map((day) =>
            h('i', {
              key: day.date,
              className: day.n > 0 ? 'on' : '',
              style: { height: `${Math.max(3, Math.round(((day.n || 0) / max) * 100))}%` },
              title: `${day.date} · ${day.n} 题`,
            }),
          ),
        ),
        h(
          'div',
          { className: 'ltw-days-legend' },
          h('span', null, list[0].date.slice(5)),
          h('span', null, t('recordDaysHint')),
          h('span', null, list[list.length - 1].date.slice(5)),
        ),
      )
    }

    function Notes({ notes, expanded, onToggle }) {
      const list = Array.isArray(notes) ? notes : []
      if (!list.length) return null
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ltw-section' },
          t('notes'),
          h('span', { className: 'ltw-count' }, `${list.length}`),
          h(
            'button',
            { className: 'ltw-btn', style: { marginLeft: 'auto', height: 24 }, onClick: onToggle },
            expanded ? t('viewLess') : t('viewMore'),
          ),
        ),
        h(
          'div',
          { className: 'ltw-list' },
          (expanded ? list : list.slice(0, 3)).map((item, i) =>
            h('div', { className: 'ltw-note-row', key: i }, h('b', null, item.subject), h('span', null, item.detail)),
          ),
        ),
        h('div', { className: 'ltw-foot', style: { marginTop: 6, marginBottom: 28 } }, t('notesHint')),
      )
    }

    function Records({ records }) {
      if (!records || !records.exists) {
        return h(
          'div',
          { className: 'ltw-records' },
          h('div', { className: 'ltw-empty' }, t('recordsMissing')),
        )
      }
      const files = records.files || []
      const parsed = records.parsed || []
      if (parsed.length === 0) {
        return h(
          'div',
          { className: 'ltw-records' },
          h('div', { className: 'ltw-section', style: { marginBottom: 8 } }, t('records'), h('span', { className: 'ltw-count' }, `${files.length} ${t('recordsFiles')}`)),
          h('div', { className: 'ltw-empty' }, t('recordsEmpty')),
          h(
            'div',
            { className: 'ltw-meta', style: { justifyContent: 'center' } },
            files.slice(0, 6).map((file, i) => h('code', { key: i }, file.name)),
          ),
        )
      }
      return h(
        'div',
        { className: 'ltw-records' },
        h(
          'div',
          { className: 'ltw-records-head' },
          h(
            'div',
            { className: 'ltw-streak' },
            t('streak'),
            h('b', null, records.streak || 0),
            t('daysUnit'),
          ),
          h(
            'span',
            { className: 'ltw-count' },
            `${files.length} ${t('recordsFiles')} · ${parsed.length} ${t('recordsParsed')}${
              (records.snapshots || 0) !== parsed.length ? ` · ${records.snapshots} ${t('recordsUsed')}` : ''
            }`,
          ),
        ),
        h(DailyBars, { days: records.days }),
        h(
          'div',
          { className: 'ltw-subgrid', style: { marginTop: 14 } },
          (records.subjects || []).map((item, i) =>
            h(
              'div',
              { className: 'ltw-subject-card', key: i },
              h(
                'div',
                { className: 'ltw-subject-name' },
                item.subject,
                h('span', null, `${item.attempts} ${t('attempts')}`),
              ),
              h('div', { className: 'ltw-bar', title: `${item.accuracy}%` }, h('i', { style: { width: `${Math.max(2, Math.min(100, item.accuracy))}%` } })),
              h(
                'div',
                { className: 'ltw-meta', style: { marginTop: 6 } },
                h('span', null, `${t('accuracy')} ${item.accuracy}%`),
                item.firstTry
                  ? h('span', null, `${t('firstTry')} ${item.firstTry.rate}%（${item.firstTry.ok}/${item.firstTry.total}）`)
                  : null,
                h('span', null, item.last ? fmtDate(item.last) : '—'),
              ),
              (item.weak || []).length
                ? h(
                    'div',
                    { style: { marginTop: 8 } },
                    (item.weak || []).slice(0, 4).map((weak, k) =>
                      h('div', { className: 'ltw-weakrow', key: k }, h('span', null, weak.label), h('b', null, weak.count)),
                    ),
                  )
                : null,
            ),
          ),
        ),
        (records.recent || []).length
          ? h(
              'div',
              null,
              h('div', { className: 'ltw-subline' }, t('recordsRecent')),
              h(
                'div',
                null,
                records.recent.slice(0, 6).map((row, i) =>
                  h(
                    'div',
                    { className: 'ltw-row', key: i },
                    h('span', { className: 'ltw-row-sub' }, row.subject),
                    h('div', { className: 'ltw-row-main' }, h('div', { className: 'ltw-row-detail' }, row.text)),
                    h('span', { className: 'ltw-row-file' }, row.date || ''),
                  ),
                ),
              ),
            )
          : null,
      )
    }

    function Workbench() {
      const [state, setState] = useState({ status: 'loading', report: null, error: '' })
      const [expanded, setExpanded] = useState(false)
      const [notesOpen, setNotesOpen] = useState(false)
      const [audits, setAudits] = useState({})
      const [tick, setTick] = useState(0)

      const load = useCallback(() => {
        setState((prev) => ({ status: prev.report ? 'refreshing' : 'loading', report: prev.report, error: '' }))
        const url = new URL(ROUTE, document.baseURI)
        fetch(url, { cache: 'no-store', credentials: 'same-origin' })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
          })
          .then((report) => setState({ status: 'ready', report, error: '' }))
          .catch((error) => setState({ status: 'error', report: null, error: String(error && error.message ? error.message : error) }))
      }, [])

      useEffect(() => {
        load()
      }, [load, tick])

      const runAudit = useCallback((subjectKey) => {
        setAudits((prev) => ({ ...prev, [subjectKey]: { status: 'running' } }))
        const url = new URL(AUDIT_ROUTE, document.baseURI)
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subject: subjectKey }),
          credentials: 'same-origin',
          cache: 'no-store',
        })
          .then((response) =>
            response.json().then((body) => {
              if (!response.ok || !body || !Array.isArray(body.results)) {
                throw new Error((body && body.error) || `HTTP ${response.status}`)
              }
              return body
            }),
          )
          .then((data) => setAudits((prev) => ({ ...prev, [subjectKey]: { status: 'done', data } })))
          .catch((error) =>
            setAudits((prev) => ({
              ...prev,
              [subjectKey]: { status: 'done', error: String(error && error.message ? error.message : error) },
            })),
          )
      }, [])

      const report = state.report
      const busy = state.status === 'loading' || state.status === 'refreshing'

      const header = h(
        'div',
        { className: 'ltw-head' },
        h(
          'div',
          null,
          h('h2', { className: 'ltw-title' }, t('title')),
          h('p', { className: 'ltw-sub' }, t('subtitle')),
        ),
        h(
          'div',
          { className: 'ltw-head-right' },
          report && report.root ? h('span', { className: 'ltw-pill' }, h('code', null, report.root)) : null,
          report && report.git ? h('span', { className: 'ltw-pill' }, `${t('branch')} `, h('code', null, report.git.branch)) : null,
          h('button', { className: 'ltw-btn', onClick: () => setTick((n) => n + 1), disabled: busy }, busy ? t('loading') : t('refresh')),
        ),
      )

      let body
      if (report && report.ok === false) {
        body = h(
          'div',
          { className: 'ltw-error' },
          h('h3', null, t('rootNotFound')),
          h('p', null, report.error && report.error.message),
          h('p', null, t('rootHint')),
          h('div', { className: 'ltw-subline' }, t('tried')),
          h(
            'ul',
            null,
            (report.tried || []).slice(0, 8).map((item, i) => h('li', { key: i }, h('code', null, `${item.dir}`), ` (${item.source})`)),
          ),
        )
      } else if (!report) {
        body = h('div', { className: 'ltw-empty' }, state.status === 'error' ? `${t('failed')}: ${state.error}` : t('loading'))
      } else {
        body = h(
          'div',
          null,
          h(Tiles, { report }),
          h(
            'div',
            { className: 'ltw-section' },
            t('subjects'),
            h('span', { className: 'ltw-count' }, `${report.summary.subjects}`),
          ),
          h(
            'div',
            { className: 'ltw-grid' },
            report.subjects.map((subject) =>
              h(SubjectCard, {
                subject,
                audit: audits[subject.key],
                onAudit: runAudit,
                key: subject.key,
              }),
            ),
          ),
          h(
            'div',
            { className: 'ltw-section' },
            t('todos'),
            h('span', { className: 'ltw-count' }, `${report.todos.length}`),
          ),
          h(TodoList, { todos: report.todos, expanded, onToggle: () => setExpanded((v) => !v) }),
          h(Notes, { notes: report.notes, expanded: notesOpen, onToggle: () => setNotesOpen((v) => !v) }),
          h(Records, { records: report.records }),
          h(
            'div',
            { className: 'ltw-foot' },
            `${t('readonly')}`,
            report.generatedAt ? ` ${t('generated')} ${fmtDate(report.generatedAt)}（${fmtRelative(report.generatedAt)}）` : '',
            report.git && report.git.last ? ` · ${t('lastCommit')} ${report.git.last.hash} ${report.git.last.subject}` : '',
          ),
        )
      }

      return h('div', { className: 'ltw-page' }, h('div', { className: 'ltw-inner' }, header, body))
    }

    function PanelIcon({ size = 20, active = false }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', opacity: active ? 1 : 0.82 },
        },
        h('path', {
          d: 'M4 5.2c0-.7.5-1.2 1.2-1.2H10c1 0 1.7.5 2 1.3.3-.8 1-1.3 2-1.3h4.8c.7 0 1.2.5 1.2 1.2v12.3c0 .7-.5 1.2-1.2 1.2H14c-1 0-1.6.4-2 1.1-.4-.7-1-1.1-2-1.1H5.2c-.7 0-1.2-.5-1.2-1.2z',
        }),
        h('path', { d: 'M12 6v13.5' }),
        h('path', { d: 'M7.2 10.4h2.6' }),
        h('path', { d: 'M14.4 10.4h2.4' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.pluginCss = `${NS}/page.css`
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        })
        ctx.locale.register(NS, { zh, en })
        t = typeof ctx.locale.bind === 'function' ? ctx.locale.bind(NS) : (key) => zh[key] || key

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Workbench))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 30, locale: NS, label: () => t('panelNav') },
            PanelIcon,
          ),
        )
      },
    }
  },
})
