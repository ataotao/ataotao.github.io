/* 训练器内核 · 脚手架族（物理闪练卡 / 数学闪练卡）
 * ============================================================
 * 与 kernel.js（闪练卡族：化学）并列的两大 UI 家族之一。
 *
 * 为什么两个内核：闪练卡族用字符串 innerHTML + 动态 tabs + .statgrid；
 * 脚手架族用函数式 h() + 静态 tabs + .stat，且 core 暴露 PT/MT（不是 CH），
 * 两族只有「壳 + 构建编排」可复用，出题/渲染引擎 0% 复用（见任务卡现状）。
 *
 * 本内核只生成 <head>/<header>/<nav>/<footer> 外壳（title/brand/tabs 配置驱动）。
 * 三样真源按科目原样内联，**逐字节不改**（渲染引擎风险大，数学无 DOM 桩测试）：
 *   源/train.css      → <style>
 *   源/train.core.js  → <script id="core">（暴露 PT / MT，check-training 抽取）
 *   源/train.ui.js    → <script id="ui">（h() 引擎 + 记录/回炉/导入）
 *
 * tabs[] 支持 {go,n}（内部视图按钮）与 {href,n}（外链，如公式表）两种条目。
 * 科目配置需提供：key, family:'scaffold', coreGlobal(PT/MT), head, tabs[],
 *   cssFile/coreFile/uiFile/outFile, contract, plan
 */
export function shell(cfg) {
  const h = cfg.head;
  const tabs = cfg.tabs.map((t) => t.href
    ? '    <a class="tablink" href="' + t.href + '">' + t.n + '</a>'
    : '    <button data-go="' + t.go + '">' + t.n + '</button>').join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${h.title}</title>
<style>
/*__CSS__*/
</style>
</head>
<body>
<header class="top">
  <div class="top-in">
    <div class="brand">${h.brandName}</div>
    <span class="ver">${h.ver}</span>
    <span class="top-note">${h.topNote}</span>
  </div>
  <nav class="tabs" id="tabs">
${tabs}
  </nav>
</header>
<main class="wrap" id="app"></main>
<div class="footer">${h.footer}</div>

`;
}
