/* 物理训练脚手架 · 科目配置
 * 族：scaffold（函数式 h() UI，core 暴露 PT）。三样真源原样内联，不改渲染引擎。
 * 改出题/判分 → 物理/源/train.core.js；改壳 → 本文件 title/brand/tabs；
 * 改 CSS / UI 逻辑 → 物理/源/train.css / train.ui.js（这些是真源，直接改）。
 * 产物不手改，改完跑 node 工具/trainer/build.mjs 物理。
 */
const key = 'physTrain_v1';
const coreGlobal = 'PT';
export default {
  key,
  family: 'scaffold',
  coreGlobal,
  global: '__pt',
  cssFile: '物理/源/train.css',
  coreFile: '物理/源/train.core.js',
  uiFile: '物理/源/train.ui.js',
  outFile: '物理/物理训练脚手架.html',

  brand: { main: '#0f9b8e', hover: '#0c8a7e', soft: '#e6f6f4' },

  // 出题引擎 API 登记（真身在 coreFile；build.mjs 仅把 MODULES/gen/judge 写进构建日志，其余供人阅读）
  contract: {
    VERSION: 'PT.VERSION', MODULES: 'PT.MODULES', gen: 'PT.gen', judge: 'PT.judge',
    selfTest: 'PT.selfTest', svgFor: 'PT.svgFor', armProbe: 'PT.armProbe',
    wrongKey: '示意：q.id + 题目前60字 + figSig(q)'
  },

  plan: [1, 3, 7, 14],
  tabs: [
    { go: 'today', n: '今日' }, { go: 'model', n: '认模型' }, { go: 'amount', n: '认量' },
    { go: 'calc', n: '算到底' }, { go: 'draw', n: '作图判断' }, { go: 'read', n: '读数' },
    { go: 'wrong', n: '错题本' }, { go: 'report', n: '报告' }
  ],
  head: {
    title: '物理训练脚手架', brandName: '物理训练脚手架', ver: 'v1',
    topNote: '认模型 · 认量 · 算到底 · 作图判断 · 读数',
    footer: '记录只存本机浏览器（localStorage）· 每周导出一次 · 单文件离线可用'
  }
};
