#!/usr/bin/env node
/* 训练器构建：内核 + 科目配置 → 单文件 HTML
 *
 * 用法（仓库根执行）：
 *   node 工具/trainer/build.mjs 化学         # 闪练卡族（kernel.js）
 *   node 工具/trainer/build.mjs 物理|数学    # 脚手架族（scaffold.js）
 *   node 工具/trainer/build.mjs all          # 全部已迁移科目
 *
 * 两族共用本构建编排与 <script id="core">/<script id="ui"> 节点契约：
 *   闪练卡族（family 缺省/flash）：core=科目 core 源(CH)，ui=kernel.uiScript() 生成
 *   脚手架族（family=scaffold）  ：css/core/ui 三源逐字节内联，壳由 scaffold.shell() 生成
 *
 * 产物仍是单文件，file:// 可双击；core 由 check-flash/check-training 抽出跑自检。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { shell, uiScript } from './kernel.js';
import { shell as scaffoldShell } from './scaffold.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const r = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 段三：事件并集合并函数（merge.mjs）去 export 后内联进产物，挂到全局供两族 UI 共用。
   去掉 export 后是普通脚本；新 vm.Script 语法体检同样覆盖它。 */
function mergeScript() {
  const src = r('工具/trainer/merge.mjs').replace(/^export\s+/gm, '');
  return '<script id="merge">\n' + src.trimEnd() + '\n' +
    'window.__ltMerge = { pickIdent: pickIdent, recSig: recSig, mergeRecords: mergeRecords };\n' +
    '</script>\n\n';
}

/* 段三：云同步编排（sync.mjs，依赖 merge）与网络适配（sync-adapter.mjs）内联，
   去 export / import 后挂全局 __ltSync / __ltSyncUI，供两族 UI 的同步按钮调用。 */
function syncScript() {
  const core = r('工具/trainer/sync.mjs')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export\s+/gm, '');
  const adapter = r('工具/trainer/sync-adapter.mjs');
  return '<script id="sync">\n' + core.trimEnd() + '\n' +
    'window.__ltSync = { carrierSnapshot: carrierSnapshot, syncPlan: syncPlan };\n' +
    adapter.trimEnd() + '\n</script>\n\n';
}

const arg = process.argv[2];
if (!arg) {
  console.error('用法：node 工具/trainer/build.mjs 化学|物理|数学   (或 all)');
  process.exit(2);
}
const names = arg === 'all' ? ['化学', '物理', '数学'] : [arg];

/* core 全局名从源里读出来，确认与配置一致（防迁移时 core 与配置错配） */
function coreGlobalOf(src) {
  const m = src.match(/var\s+(\w+)\s*=\s*\(function/);
  return m ? m[1] : null;
}

for (const name of names) {
  const cfgPath = path.join(ROOT, '工具', 'trainer', 'subjects', name + '.mjs');
  if (!fs.existsSync(cfgPath)) {
    console.error(`✗ 没有科目配置：工具/trainer/subjects/${name}.mjs`);
    process.exit(1);
  }
  const { default: SUBJECT } = await import('file://' + cfgPath.replace(/\\/g, '/'));
  const isScaffold = SUBJECT.family === 'scaffold';

  const core = r(SUBJECT.coreFile);
  const gotGlobal = coreGlobalOf(core);
  if (!gotGlobal) {
    console.error(`✗ ${SUBJECT.coreFile} 不像暴露全局的 core IIFE（找不到 var X = (function）`);
    process.exit(1);
  }
  if (gotGlobal !== SUBJECT.coreGlobal) {
    console.error(`✗ ${name} core 全局名不一致：源是 ${gotGlobal}，配置写 ${SUBJECT.coreGlobal}`);
    process.exit(1);
  }

  const uiSrc = isScaffold ? r(SUBJECT.uiFile) : uiScript(SUBJECT).replace(/^<script id="ui">|<\/script>\s*$/g, '');
  const mergeSrc = r('工具/trainer/merge.mjs').replace(/^export\s+/gm, '');
  const syncCore = r('工具/trainer/sync.mjs').replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');
  // 语法体检：core / merge / sync / ui 都不能有语法错（适配层用 async/顶层 IIFE，vm 可解析）
  for (const [label, src] of [['core', core], ['merge', mergeSrc], ['sync', syncCore + '\n' + r('工具/trainer/sync-adapter.mjs')], ['ui', uiSrc]]) {
    try { new vm.Script(src, { filename: name + '.' + label + '.js' }); }
    catch (e) { console.error(`✗ ${name} ${label} 语法错误：${e.message}`); process.exit(1); }
  }

  let html;
  if (isScaffold) {
    const shellHtml = scaffoldShell(SUBJECT).replace('/*__CSS__*/', r(SUBJECT.cssFile).trimEnd());
    html = shellHtml +
      '<script id="core">\n' + core.trimEnd() + '\n</script>\n\n' +
      mergeScript() + syncScript() +
      '<script id="ui">\n' + uiSrc.trimEnd() + '\n</script>\n' +
      '</body>\n</html>\n';
  } else {
    html = shell(SUBJECT) +
      '<script id="core">\n' + core.trimEnd() + '\n</script>\n\n' +
      mergeScript() + syncScript() +
      uiScript(SUBJECT);
  }

  // 结构自检：四个约定脚本必须存在且各一次
  const nCore = (html.match(/<script id="core">/g) || []).length;
  const nMerge = (html.match(/<script id="merge">/g) || []).length;
  const nSync = (html.match(/<script id="sync">/g) || []).length;
  const nUi = (html.match(/<script id="ui">/g) || []).length;
  if (nCore !== 1 || nMerge !== 1 || nSync !== 1 || nUi !== 1) {
    console.error(`✗ 产物脚本节点异常：core×${nCore} merge×${nMerge} sync×${nSync} ui×${nUi}`); process.exit(1);
  }

  const dest = path.join(ROOT, SUBJECT.outFile);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html, 'utf8');
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`✓ ${SUBJECT.outFile}  ${kb} KB  [${isScaffold ? 'scaffold' : 'flash'}]`);
  console.log(`  记录键 ${SUBJECT.key} · core ${SUBJECT.contract.MODULES} (${SUBJECT.contract.gen} / ${SUBJECT.contract.judge}) · 回炉 ${SUBJECT.plan.join('/')} 天`);
}
