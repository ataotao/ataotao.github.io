#!/usr/bin/env node
// 容量闸门：拦住"入库但运行时用不到"的二进制。
//
// 用法：
//   node 工具/check-size.mjs          检查暂存区（pre-commit 自动调用）
//   node 工具/check-size.mjs --all    全库体检：总量预算 + 目录排行 + 超限清单
//
// 规则（改这里就等于改规矩，别在别处写阈值）：
//   新增单个文件 > 2 MB        → 拒绝提交
//   新增单个文件 800 KB–2 MB   → 警告，允许提交
//   新增位图（jpg/jpeg/png）≥ 300 KB → 警告：先去压成 webp（工具/compress-pages.js）
//   全库跟踪总量 > 200 MB      → 拒绝（--all 模式）
//
// 为什么是这几条：仓库的慢性膨胀来自原卷照片和界面截图，不是 HTML/JSON。
// 一份 1 MB 的 HTML 每次重建多存一个 blob，一年几十次也就几十 MB，可以接受；
// 一张 12 MB 的手机原图进库，就再也不能撤回（除非重写历史）。
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const HARD = 2 * 1024 * 1024;
const SOFT = 800 * 1024;
const IMAGE_SOFT = 300 * 1024;
const TOTAL_WARN = 120 * 1024 * 1024;
const TOTAL_FAIL = 200 * 1024 * 1024;

const BITMAP = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif']);
const RED = '\x1b[31m', YEL = '\x1b[33m', GRN = '\x1b[32m', DIM = '\x1b[2m', OFF = '\x1b[0m';

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'buffer' }).toString('utf8').split('\0').filter(Boolean);
}

function sizeOf(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return -1;
  try {
    const st = statSync(abs);
    return st.isFile() ? st.size : -1;
  } catch {
    return -1;
  }
}

// 分类：新增（A）/ 修改（M），已跟踪的旧文件不重复告警
function stagedChanges() {
  const out = execFileSync('git', ['diff', '--cached', '--name-status', '--diff-filter=ACMR', '-z'], {
    cwd: ROOT, encoding: 'buffer',
  }).toString('utf8').split('\0').filter(Boolean);
  const items = [];
  for (let i = 0; i < out.length; i += 2) {
    items.push({ status: out[i][0], rel: out[i + 1] });
  }
  return items;
}

function checkStaged() {
  const items = stagedChanges();
  const fails = [];
  const warns = [];

  for (const { status, rel } of items) {
    const size = sizeOf(rel);
    if (size < 0) continue;
    const ext = extname(rel).toLowerCase();

    if (size > HARD) {
      fails.push({ rel, size, why: `超过 ${mb(HARD)} 单文件上限` });
      continue;
    }
    if (BITMAP.has(ext) && size >= IMAGE_SOFT) {
      warns.push({ rel, size, why: '位图：先压成 webp（工具/compress-pages.js）再入库' });
      continue;
    }
    if (size >= SOFT) {
      warns.push({ rel, size, why: `接近上限（${mb(SOFT)} 起警）${status === 'A' ? '' : '，本次是修改已有文件'}` });
    }
  }

  for (const w of warns) console.log(`${YEL}⚠${OFF}  ${kb(w.size).padStart(8)}  ${w.rel}\n           ${w.why}`);
  if (fails.length) {
    console.error('');
    for (const f of fails) console.error(`${RED}✗${OFF}  ${mb(f.size).padStart(8)}  ${f.rel}\n           ${f.why}`);
    console.error(`\n${RED}提交被拦下${OFF}：${fails.length} 个文件超过单文件上限。`);
    console.error(`处理方式（选一个）：`);
    console.error(`  · 压成 webp / 缩图后入库      node 工具/check-size.mjs --all  看现状`);
    console.error(`  · 本机留档，不入库            把规则加进 .gitignore，再 git rm --cached`);
    console.error(`  · 确实要原样入库（罕见）        git commit --no-verify`);
    return 1;
  }
  if (warns.length) console.log(`\n${DIM}（警告不阻断提交；规则见 本文件头部 / docs/adr/0005）${OFF}`);
  return 0;
}

function fullAudit() {
  const files = git(['ls-files', '-z']);
  let total = 0;
  const byDir = new Map();
  const big = [];

  for (const rel of files) {
    const size = sizeOf(rel);
    if (size < 0) continue;
    total += size;
    const top = rel.includes('/') ? rel.split('/')[0] : '(根目录)';
    byDir.set(top, (byDir.get(top) || 0) + size);
    if (size >= SOFT) big.push({ rel, size });
  }

  console.log(`跟踪文件 ${files.length} 个，合计 ${mb(total)}（预算：>${mb(TOTAL_WARN)} 提醒，>${mb(TOTAL_FAIL)} 拦截）\n`);

  console.log('目录占用：');
  for (const [dir, size] of [...byDir].sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.max(1, Math.round((size / total) * 28)));
    console.log(`  ${mb(size).padStart(9)}  ${bar.padEnd(29)} ${dir}`);
  }

  if (big.length) {
    big.sort((a, b) => b.size - a.size);
    console.log(`\n单文件 ≥ ${kb(SOFT)}（${big.length} 个，存量清单——不是都要处理）：`);
    for (const b of big.slice(0, 25)) {
      const flag = b.size > HARD ? '>2MB' : '     ';
      console.log(`  ${mb(b.size).padStart(9)}  ${flag}  ${b.rel}`);
    }
    if (big.length > 25) console.log(`  ${DIM}…另有 ${big.length - 25} 个${OFF}`);
    console.log(`  ${DIM}判断标准：页面/build 运行时读它吗？读就留（如 英语/题库/九上_U*.jpg 是原卷对照）；`
      + `不读就移出版本库（如原卷照片，页面读的是 images/试卷/*.webp）。${OFF}`);
  }

  if (total > TOTAL_FAIL) {
    console.error(`\n${RED}✗ 全库超预算${OFF}：${mb(total)} > ${mb(TOTAL_FAIL)}。先跑一次上面的清单，把"入库但用不到"的二进制移出去。`);
    return 1;
  }
  if (total > TOTAL_WARN) {
    console.log(`\n${YEL}⚠ 已用掉预算的 ${Math.round((total / TOTAL_FAIL) * 100)}%${OFF}`);
  }
  return 0;
}

const wantAll = process.argv.includes('--all');
const code = wantAll ? fullAudit() : checkStaged();
process.exit(Number(code) || 0);
