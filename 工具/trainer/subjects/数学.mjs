/* 数学闪练卡 · 科目配置
 * 族：scaffold（函数式 h() UI，core 暴露 MT，含 dayPlan / 分数输入 / 题单快照）。
 * 三样真源原样内联，不改渲染引擎。改出题/判分 → 数学/源/train.core.js；
 * 改壳 → 本文件 title/brand/tabs；改 CSS / UI → 数学/源/train.css / train.ui.js。
 * 产物不手改，改完跑 node 工具/trainer/build.mjs 数学。
 */
const key = 'mathtrain_v1';
const coreGlobal = 'MT';
export default {
  key,
  family: 'scaffold',
  coreGlobal,
  global: '__mt',
  cssFile: '数学/源/train.css',
  coreFile: '数学/源/train.core.js',
  uiFile: '数学/源/train.ui.js',
  /* 第 12 周原题裁切图（data URI）：构建内联成 <script id="data">，只给「本周错题」临时项目引用；
     没有这一项时 core 会退化成不画裁切图，其余功能不受影响。 */
  dataFile: '数学/源/week12-img.js',
  outFile: '数学/数学闪练卡.html',

  brand: { main: '#3b6fe0', hover: '#3260c8', soft: '#eaf0fe' },

  // 出题引擎 API 登记（真身在 coreFile；build.mjs 仅把 MODULES/gen/judge 写进构建日志，其余供人阅读）
  contract: {
    VERSION: 'MT.VERSION', MODULES: 'MT.modules', gen: 'MT.gen', judge: 'MT.judge',
    selfTest: 'MT.selfTest', planForDay: 'MT.planForDay', dailyQueue: 'MT.dailyQueue',
    wrongKey: '示意：q.id + 题目前60字'
  },

  plan: [1, 3, 7, 14],
  tabs: [
    { go: 'today', n: '今日' }, { go: 'drill', n: '基础快练' }, { go: 'write', n: '写解析式' },
    { go: 'entry', n: '大题前两步' }, { go: 'week12', n: '本周错题' }, { go: 'report', n: '报告' }
  ],
  head: {
    title: '数学闪练卡', brandName: '数学闪练卡', ver: 'v1',
    topNote: '基础快练 · 写解析式 · 大题前两步 · 本周错题',
    footer: '记录只存本机浏览器（localStorage）· 每周导出一次 · 单文件离线可用'
  }
};
