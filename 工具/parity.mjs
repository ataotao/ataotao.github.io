#!/usr/bin/env node
// 产物一致性检查（parity）：源改完忘了 build，会出现"产物比源新/旧"的静默漂移。
// ADR-0003 立的标准是"去掉注入的数据后，产物与模板逐字节相同"。
// 这里把它变成一条命令，覆盖全部 B 类引擎（引擎手写在 HTML 里、只有数据是注入的）。
//
// 用法：
//   node 工具/parity.mjs            检查全部，任何不一致退出码 1（临时文件会还原）
//   node 工具/parity.mjs 英语        只检查名字里含"英语"的目标
//   node 工具/parity.mjs --keep     构建完不还原（= 一次全量重建，产物留在盘上）
//
// 做法：先把产物备份到内存 → 跑真实构建 → 逐字节比对 → 还原。
// 这样"期望值"永远来自构建脚本本身，不另写一份规则（否则检查器自己会漂移）。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RED = '\x1b[31m', YEL = '\x1b[33m', GRN = '\x1b[32m', DIM = '\x1b[2m', OFF = '\x1b[0m';

const TARGETS = [
  {
    name: '历史 · 核心考点训练',
    cmd: ['node', ['工具/build.mjs']],
    watch: ['历史/核心考点训练.html', '道德与法治/核心考点训练.html', '公式记背/公式记背.html'],
    note: '一次构建三科（工具/build.mjs 全量）',
  },
  {
    name: '物理 · 思维脚手架',
    cmd: ['node', ['物理/工具/build.mjs']],
    watch: ['物理/物理思维脚手架.html', '物理/题库/pack-全部.json'],
  },
  {
    name: '物理 · 闪练卡（训练器模板）',
    cmd: ['node', ['工具/trainer/build.mjs', '物理']],
    watch: ['物理/物理闪练卡.html'],
  },
  {
    name: '数学 · 闪练卡（训练器模板）',
    cmd: ['node', ['工具/trainer/build.mjs', '数学']],
    watch: ['数学/数学闪练卡.html'],
  },
  {
    name: '化学 · 思维脚手架',
    cmd: ['node', ['化学/工具/build.mjs']],
    watch: ['化学/化学思维脚手架.html'],
  },
  {
    name: '化学 · 闪练卡（训练器模板）',
    cmd: ['node', ['工具/trainer/build.mjs', '化学']],
    watch: ['化学/化学闪练卡.html'],
  },
  {
    name: '英语 · 语法闪练',
    cmd: ['node', ['英语/语法闪练/build.mjs']],
    watch: ['英语/语法闪练.html', '英语/语法闪练/data/bundle.js', '英语/语法闪练/考点识别速查表.html'],
  },
  {
    name: '英语 · 九上过关练习',
    cmd: ['node', ['英语/练习工具/build.mjs']],
    watch: ['英语/九上英语过关练习.html', '英语/练习工具/data/bundle.js'],
  },
];

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const keep = process.argv.includes('--keep');
const targets = only ? TARGETS.filter((t) => t.name.includes(only) || t.cmd[1].join(' ').includes(only)) : TARGETS;

if (!targets.length) {
  console.error(`没有匹配的目标。可选：${TARGETS.map((t) => t.name).join(' / ')}`);
  process.exit(2);
}

function snapshot(rel) {
  return existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel)) : null;
}

function restore(rel, bytes) {
  const abs = join(ROOT, rel);
  if (bytes === null) {
    if (existsSync(abs)) unlinkSync(abs);
    return;
  }
  const now = existsSync(abs) ? readFileSync(abs) : null;
  if (now && now.equals(bytes)) return;
  writeFileSync(abs, bytes);
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  const line = a.subarray(0, i).toString('utf8').split('\n').length;
  return { offset: i, line };
}

// 构建会写入时间戳（物理 pack-全部.json 的 generatedAt），它每次都变，
// 但"内容"没变。比对前先抹掉，否则每次都是假红灯——红灯多了就没人看。
const VOLATILE = [[/"generatedAt"\s*:\s*"[^"]*"/g, '"generatedAt":"<build-time>"']];
// 本仓 core.autocrlf 生效：git checkout 出来的文本是 CRLF，构建写的是 LF，
// 两者在 git 眼里是同一个文件。所以比"内容"，不比字节。
function normalize(rel, bytes) {
  let text = bytes.toString('utf8');
  if (rel.endsWith('.json')) for (const [re, rep] of VOLATILE) text = text.replace(re, rep);
  return Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
}

let failures = 0;
const results = [];

for (const t of targets) {
  process.stdout.write(`${DIM}▸ ${t.name}${OFF}  `);
  const before = new Map(t.watch.map((rel) => [rel, snapshot(rel)]));

  let buildErr = null;
  try {
    execFileSync(t.cmd[0], t.cmd[1], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    buildErr = (e.stderr || e.stdout || e.message || '').toString().trim().split('\n').slice(-4).join('\n');
  }

  const rows = [];
  for (const rel of t.watch) {
    const oldBytes = before.get(rel);
    const newBytes = snapshot(rel);
    if (newBytes === null) {
      rows.push({ rel, state: oldBytes === null ? 'skip' : 'missing' });
      continue;
    }
    if (oldBytes === null) {
      rows.push({ rel, state: 'created', size: newBytes.length });
    } else if (oldBytes.equals(newBytes)) {
      rows.push({ rel, state: 'ok', size: newBytes.length });
    } else if (normalize(rel, oldBytes).equals(normalize(rel, newBytes))) {
      rows.push({ rel, state: 'ok-ts', size: newBytes.length });
    } else {
      const d = firstDiff(normalize(rel, oldBytes), normalize(rel, newBytes));
      rows.push({ rel, state: 'drift', size: newBytes.length, delta: newBytes.length - oldBytes.length, line: d.line });
    }
  }

  if (buildErr) {
    failures++;
    console.log(`${RED}构建失败${OFF}\n${buildErr}`);
  } else {
    const bad = rows.filter((r) => r.state === 'drift' || r.state === 'missing' || r.state === 'created');
    if (bad.length) {
      failures++;
      console.log(`${RED}不一致${OFF}`);
      for (const r of bad) {
        if (r.state === 'drift') console.log(`    ${RED}✗${OFF} ${r.rel}  盘上版本与重建结果不同（第 ${r.line} 行起，${r.delta >= 0 ? '+' : ''}${r.delta} 字节）`);
        else if (r.state === 'created') console.log(`    ${YEL}+${OFF} ${r.rel}  构建会新增这个文件（盘上没有）`);
        else console.log(`    ${RED}-${OFF} ${r.rel}  盘上有、构建不出（源里已删？）`);
      }
      console.log(`    ${DIM}修法：改源（模板/JSON）后不要手改产物；确认改动只来自源之后跑 node 工具/parity.mjs --keep 重建${OFF}`);
    } else {
      const ts = rows.some((r) => r.state === 'ok-ts') ? `${DIM}（仅 generatedAt 时间戳不同，已忽略）${OFF}` : '';
      console.log(`${GRN}一致${OFF}${ts}  ${DIM}${rows.filter((r) => r.state !== 'skip').map((r) => r.rel.split('/').pop()).join(' / ')}${OFF}`);
    }
  }
  results.push(...rows);

  if (!keep) for (const rel of t.watch) restore(rel, before.get(rel));
}

if (!keep) {
  const touched = results.filter((r) => r.state !== 'ok' && r.state !== 'skip').length;
  if (touched) console.log(`\n${DIM}已还原盘上版本（加 --keep 才保留重建结果）${OFF}`);
}

process.exit(failures ? 1 : 0);
