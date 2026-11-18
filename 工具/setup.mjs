#!/usr/bin/env node
// 新机器 / 重新 clone 后的第一件事：
//
//   node 工具/setup.mjs
//
// 做三件事：确认 node 在、把 pre-commit 钩子指到 .githooks、跑一次容量体检。
// 幂等，随便跑几次都行。
//
// 为什么必须有这一步：`core.hooksPath` 是**本机** git 配置，不会随 clone 传过来，
// 不配的话 .githooks/pre-commit 就是个没人调用的文件。服务器那层兜底在
// .github/workflows/repo-budget.yml，它不需要任何本机设置。
//
// 用 node 而不是 .ps1：Windows PowerShell 5.1 读 UTF-8 源码、解码子进程输出
// 都要额外折腾（BOM + Console.OutputEncoding），而 node 的 UTF-8 在哪个终端都对。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = (n, s) => `\x1b[${n}m${s}\x1b[0m`;
const ok = (s) => console.log(`${C(32, '✓')} ${s}`);
const bad = (s) => console.log(`${C(31, '✗')} ${s}`);

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

console.log(`\n仓库：${ROOT}\n`);

// 1) node 版本：工具用了 ?? / at() / structuredClone 之类，18 起步最稳
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  bad(`node ${process.versions.node} 太老，需要 18+`);
  process.exit(1);
}
ok(`node ${process.versions.node}`);

if (!existsSync(join(ROOT, '.git'))) {
  bad('这里不是 git 仓库（找不到 .git）');
  process.exit(1);
}

// 2) 钩子
try {
  git(['config', 'core.hooksPath', '.githooks']);
} catch (e) {
  bad(`写 core.hooksPath 失败：${e.message}`);
  process.exit(1);
}
const now = git(['config', 'core.hooksPath']);
if (now !== '.githooks') {
  bad(`core.hooksPath 设置没生效（当前 '${now}'）`);
  process.exit(1);
}
if (!existsSync(join(ROOT, '.githooks', 'pre-commit'))) {
  bad('.githooks/pre-commit 不存在，钩子配了也不会跑');
  process.exit(1);
}
ok('pre-commit 容量闸门已启用（core.hooksPath = .githooks）');

// 3) 体检
console.log('');
try {
  execFileSync(process.execPath, [join(ROOT, '工具', 'check-size.mjs'), '--all'], {
    cwd: ROOT, stdio: 'inherit',
  });
} catch {
  console.log('');
  bad('容量体检没过，先处理上面的清单再开始干活');
  process.exit(1);
}

console.log('');
console.log(C(36, '好了。提交时会自动跑容量闸门；改完源记得 node 工具/parity.mjs'));
console.log(C(90, '（可选：bun + sharp 用于压图/截图；python + python-docx 用于解析试卷）'));
