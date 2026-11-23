#!/usr/bin/env node
// 中考数学公式列表 · 静态自检
//   node 数学/题库工具/check-formula-list.mjs
// 校验：单文件脚本语法 / 数据完整性 / 两个入口链接 / 发布白名单 / 数学闪练卡产物链接
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const fail = (m) => { console.error('✗ ' + m); process.exit(1); };

const html = read('数学/中考数学公式列表.html');
const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!script) fail('公式表缺少 <script> 数据块');
try { new vm.Script(script); } catch (e) { fail('公式表脚本语法错误：' + e.message); }

const dataM = script.match(/var DATA=(\[[\s\S]*?\]);\s*var \$=/);
if (!dataM) fail('找不到 DATA 数组');
let DATA;
try { DATA = vm.runInNewContext('(' + dataM[1] + ')'); } catch (e) { fail('DATA 解析失败：' + e.message); }
if (!Array.isArray(DATA) || DATA.length < 70) fail('公式条目不足 70 条：' + (DATA && DATA.length));
const groups = new Set();
DATA.forEach((d, i) => {
  if (!d.g || !d.n || !d.t || !d.note) fail('第 ' + (i + 1) + ' 条字段缺失：' + JSON.stringify(d));
  groups.add(d.g);
});
if (groups.size !== 7) fail('分组数异常：期望 7，实际 ' + groups.size);
const groupsM = script.match(/var GROUPS=(\[[^\]]*\]);/);
if (!groupsM) fail('找不到 GROUPS 定义');
const defined = vm.runInNewContext(groupsM[1]);
groups.forEach((g) => { if (defined.indexOf(g) < 0) fail('DATA 使用了未注册分组：' + g); });

/* 用最小 DOM 桩跑一遍页面脚本，确认筛选与公式排版真的能渲染 */
const mkEl = () => ({
  value: '', textContent: '', innerHTML: '', className: '', children: [], onclick: null, attrs: {},
  setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; },
  addEventListener() {}, appendChild(c) { this.children.push(c); }
});
const els = {};
const doc = {
  querySelector(s) { return els[s] || (els[s] = mkEl()); },
  createElement() { return mkEl(); }
};
try {
  vm.runInNewContext(script, { document: doc, window: { print() {} }, console, Set, Array, Object, String, Math, RegExp, JSON, Number });
} catch (e) { fail('公式表运行异常：' + e.message); }
const rendered = els['#list'].innerHTML;
if ((rendered.match(/class="item"/g) || []).length !== DATA.length) fail('渲染条目数与 DATA 不一致');
if (!/class="fr"/.test(rendered) || !/class="rt"/.test(rendered)) fail('分数 / 根号排版未生效');
if (/\\frac|\\sqrt|\\text/.test(rendered)) fail('页面残留 TeX 源码');

/* 高频筛选：独立开关 + 可与分类叠加 */
const hotCount = DATA.filter((d) => d.hot).length;
if (hotCount < 20 || hotCount >= DATA.length) fail('高频条目数异常：' + hotCount);
const chipEls = els['#chips'].children;
const hotBtn = chipEls.find((x) => x.getAttribute('data-kind') === 'hot');
if (!hotBtn || hotBtn.textContent.indexOf('高频') < 0) fail('缺少「只看高频」筛选按钮');
const countItems = () => (els['#list'].innerHTML.match(/class="item"/g) || []).length;

hotBtn.onclick(); // 开
if (countItems() !== hotCount) fail(`只看高频结果数不对：期望 ${hotCount}，实际 ${countItems()}`);
if (!/仅高频/.test(els['#count'].textContent)) fail('计数文案未标注「仅高频」');

const fnBtn = chipEls.find((x) => x.getAttribute('data-kind') === 'group' && x.textContent === '函数');
if (!fnBtn) fail('缺少分组筛选按钮');
fnBtn.onclick();
const comboCount = DATA.filter((d) => d.g === '函数' && d.hot).length;
if (!comboCount) fail('函数分组没有高频公式，组合筛选失去意义');
if (countItems() !== comboCount) fail(`分类+高频组合结果数不对：期望 ${comboCount}，实际 ${countItems()}`);
hotBtn.onclick(); // 关
if (countItems() !== DATA.filter((d) => d.g === '函数').length) fail('关闭高频后未恢复分组全部结果');

if (read('开始.html').indexOf('数学/中考数学公式列表.html') < 0) fail('开始.html 缺少入口链接');
if (read('工具/trainer/subjects/数学.mjs').indexOf('中考数学公式列表.html') < 0) fail('数学闪练卡配置缺少 tab 链接');
if (read('工具/assemble-site.sh').indexOf('pub 数学/中考数学公式列表.html') < 0) fail('发布白名单缺少新页面');
if (read('数学/数学闪练卡.html').indexOf('href="中考数学公式列表.html"') < 0) fail('数学闪练卡产物缺少链接（先重建）');

console.log(`✓ 中考数学公式列表自检通过：${DATA.length} 条 / ${groups.size} 类，入口与白名单齐全`);
