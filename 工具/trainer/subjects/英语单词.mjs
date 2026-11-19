/* 英语单词闪练卡 · 科目配置
 * 族：scaffold（函数式 h() UI，core 暴露 EW）。四源逐字节内联：
 *   train.css / train.core.js / train.ui.js 内联；词库 train.data.js 外置为产物 词库.js
 *   （dataOutFile/dataRef，见 ADR-0009；file:// 用经典 <script src> 加载，不用 fetch）。
 * 改出题/判分 → 英语/源/train.core.js；改词库 → 先 extract-vocab.mjs 重建 data；
 * 改壳/文案 → 本文件；改 CSS/UI → 对应源。产物不手改，改完跑：
 *   node 工具/trainer/build.mjs 英语单词
 */
const key = 'enwordflash_v1';
const coreGlobal = 'EW';
export default {
  key,
  family: 'scaffold',
  coreGlobal,
  global: '__ew',
  cssFile: '英语/源/train.css',
  dataFile: '英语/源/train.data.js',
  dataOutFile: '英语/词库.js',
  dataRef: '词库.js',
  coreFile: '英语/源/train.core.js',
  uiFile: '英语/源/train.ui.js',
  outFile: '英语/英语单词闪练卡.html',

  brand: { main: '#1f7a56', hover: '#196547', soft: '#e7f5ee' },

  contract: {
    VERSION: 'EW.VERSION', MODULES: 'EW.MODULES', gen: 'EW.gen', judge: 'EW.judge',
    selfTest: 'EW.selfTest', wrongKey: 'mod.unit.en|kind'
  },

  plan: [1, 3, 7, 14],
  tabs: [
    { go: 'today', n: '今日' }, { go: 'random', n: '随机练习' },
    { go: 'wrong', n: '错题本' }, { go: 'report', n: '报告' }
  ],
  head: {
    title: '英语单词闪练卡', brandName: '英语单词闪练卡', ver: 'v1',
    topNote: '英→中 · 中→英 · 音→中 · 按年级单元反复练',
    footer: '词库来自 apps/english 沪教版 + 沪教牛津小学 · 记录只存本机浏览器 · 离线可用（词库.js 与本页面放同一目录）'
  }
};
