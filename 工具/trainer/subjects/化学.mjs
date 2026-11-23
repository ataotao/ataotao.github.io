/* 化学闪练卡 · 科目配置（对象字面量）
 * 段二首个迁移对象。改出题 / 判分请改 化学/源/flash.core.js，改壳 / 文案请改这里或 kernel.js。
 *
 * SUBJECT 契约（对应任务卡「科目配置形如 …」）：
 *   key          localStorage 记录键（绝不可改，改一个 = 记录清零）
 *   brand        主题色（外壳 :root 变量）
 *   MODULES/gen/judge/wrongKey —— 出题四件套，位于 coreFile 暴露的全局里，
 *                这里用 coreGlobal + contract 字段登记，build.mjs 原样内联 core，不重写。
 *   plan         错题回炉间隔天数
 *   texts        所有科目文案（含 {plan} / {units} / {kinds} 占位符）
 */
const plan = [1, 3, 7, 14];
const views = [{ k: 'today', n: '今日' }, { k: 'wrong', n: '错题回炉' }, { k: 'report', n: '训练报告' }];
const texts = {
  scopePill: '全 {units} 单元 · {kinds} 类考点',
  intro: '每题随机生成，选择点选即判、数值 / 符号填空输入后提交；答案解析讲清考点与难点。答错自动进错题库，按 {plan} 天回炉。',
  unitTitle: '按单元练（人教版初三全考点）',
  allScope: '全考点',
  inputPlaceholder: '输入答案',
  summaryGood: '不错！错的题已进错题库，按 {plan} 天再练一遍就稳了。',
  summaryLow: '别急，错题已收进错题库。点「错题回炉」优先清到期题，配合每题的考点难点解析效果最好。',
  dueUnit: '天后复习',
  wrongTimes: '错',
  wrongIntro: '答错的题自动进本，按 {plan} 天档位回炉；到期后连续 2 次答对才算掌握（看提示/秒答不算）。',
  downloadName: '化学闪练卡记录.json',
  resetConfirm: '确定清空所有做题记录和错题库？此操作不可撤销。'
};
const key = 'chemflash_v1';
const sessionSuffix = '_sess';
const coreGlobal = 'CH';
const inputPrefix = 'chemIn';
const globalHook = '__chemflash';

const SUBJECT = {
  key, sessionSuffix,
  global: globalHook,
  coreGlobal,
  inputPrefix,
  coreFile: '化学/源/flash.core.js',
  outFile: '化学/化学闪练卡.html',

  brand: { main: '#0e7490', hover: '#0b6479', soft: '#e4f2f6' },

  // 出题四件套登记（真身在 coreFile 内；build.mjs 仅把 MODULES/gen/judge 写进构建日志，其余供人阅读）
  contract: {
    MODULES: 'CH.modules',      // 11 单元注册表（2024 新版教材）
    gen: 'CH.gen',              // 出题
    judge: 'CH.judge',          // 判分
    wrongKey: 'wrongKey()',     // 错题去重键（内核内，引用 CH.normChem）
    norm: 'CH.normChem'
  },

  plan, views, texts,

  head: {
    icon: '⚗', name: '化学闪练卡', title: '化学闪练卡 · 人教版初三全考点',
    ver: '人教版初三 · 全考点', note: '随机出题 · 答案解析讲考点难点 · 反复练',
    link: { href: '化学每日五写.html', text: '每日五写（手写）↗' }
  },

  // 错题去重键表达式（在内核 UI 作用域内求值，CH 为 core 全局别名）
  wrongKeyExpr: 'CH.normChem(q.mod + "." + q.kind + "|" + q.prompt).slice(0, 90)',

  // 注入 UI 的运行时配置（从上面单一来源派生，避免两处漂移）
  ui_cfg: { key, sessionSuffix, coreGlobal, inputPrefix, global: globalHook, plan, views, texts }
};

export default SUBJECT;
