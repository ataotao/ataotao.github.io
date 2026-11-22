/* 化学方程式专项 · 科目配置
 * 2026-11-22 新建。针对今日错题库暴露的两处缺口：配平 + 化学用语（元素/离子/周期表）。
 * 出题/判分真源：化学/源/focus.core.js；壳/记录/回炉复用 工具/trainer/kernel.js + review.js。
 * key 一经使用绝不可改（改一个 = 记录清零）。
 */
const plan = [1, 3, 7, 14];
const views = [{ k: 'today', n: '今日' }, { k: 'wrong', n: '错题回炉' }, { k: 'report', n: '训练报告' }];
const texts = {
  scopePill: '全 {units} 模块 · {kinds} 类考点',
  intro: '先补化学用语地基（元素符号 / 离子 / 周期表），再练配平四法，最后做题图里那种「已知反应物求生成物 + 算质量」。每题随机生成，答错进错题库按 {plan} 天回炉。',
  unitTitle: '按模块练（先地基，再配平，再计算）',
  allScope: '全模块',
  inputPlaceholder: '输入答案',
  summaryGood: '不错！错的题已进错题库，按 {plan} 天再练一遍就稳了。',
  summaryLow: '别急，错题已收进错题库。点「错题回炉」优先清到期题——配平题看清每一步，符号题注意大小写和右上角写法。',
  dueUnit: '天后复习',
  wrongTimes: '错',
  wrongIntro: '答错的题自动进本，按 {plan} 天档位回炉；到期后连续 2 次有效答对才算掌握（看提示/秒答不算）。',
  downloadName: '化学方程式专项记录.json',
  resetConfirm: '确定清空所有做题记录和错题库？此操作不可撤销。'
};
const key = 'chemfocus_v1';
const sessionSuffix = '_sess';
const coreGlobal = 'CF';
const inputPrefix = 'chemFocusIn';
const globalHook = '__chemfocus';

const SUBJECT = {
  key, sessionSuffix,
  global: globalHook,
  coreGlobal,
  inputPrefix,
  coreFile: '化学/源/focus.core.js',
  outFile: '化学/化学方程式专项.html',

  brand: { main: '#b45309', hover: '#92400e', soft: '#fef3c7' },

  contract: {
    MODULES: 'CF.modules',
    gen: 'CF.gen',
    judge: 'CF.judge',
    wrongKey: 'wrongKey()',
    norm: 'CF.normChem'
  },

  plan, views, texts,

  head: {
    icon: '⚗', name: '化学专项', title: '化学方程式专项 · 配平 + 化学用语 + 计算',
    ver: '针对弱项 · 3 模块', note: '配平四法 · 元素离子 · 方程式计算'
  },

  wrongKeyExpr: 'CF.normChem(q.mod + "." + q.kind + "|" + q.prompt).slice(0, 90)',

  ui_cfg: { key, sessionSuffix, coreGlobal, inputPrefix, global: globalHook, plan, views, texts }
};

export default SUBJECT;
