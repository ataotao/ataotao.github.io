// 化学 · 原卷补录
// 用法（在 化学/ 下）：
//   node 工具/ingest-paper.mjs "<源目录>" <id> ["标题"] [bank] [YYYY-MM]
// 例：
//   node 工具/ingest-paper.mjs "C:/OneDrive/陶宸欣/学习资料/题库/化学/2026-2027学年第一学期期中考试" 2026-2027期中卷 "2026—2027 学年第一学期 初三级化学科期中考试" 2026-2027期中卷 2026-11
//
// 作用：扫描源目录图片 → ffmpeg 压成 webp → 写入 images/试卷/<id>/ →
//       登记 题库/试卷库.json（同 id 覆盖）→ 清理旧图与临时文件。
// 约定：原卷 JPG 只在 OneDrive 留档，不入库（ADR-0005）；入库的是页面运行时读的 webp。
// 依赖：ffmpeg（PATH 中，或设 FFMPEG 环境变量指向可执行文件）。

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');                 // 化学/
const manifestPath = path.join(root, '题库/试卷库.json');
const imgRoot = path.join(root, 'images/试卷');
const WIDTH = 1400;
const QUALITY = 72;

const [, , srcArg, id, title, bank, dateArg] = process.argv;
if (!srcArg || !id || !/^[\w\u4e00-\u9fa5-]+$/.test(id)) {
  console.error('用法：node 工具/ingest-paper.mjs "<源目录>" <id> ["标题"] [bank] [YYYY-MM]');
  console.error('  id 只能用字母/数字/下划线/连字符/汉字');
  process.exit(1);
}

const srcDir = path.resolve(srcArg);
if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
  console.error('✗ 源目录不存在：' + srcDir);
  process.exit(1);
}

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const probe = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) {
  console.error('✗ 找不到 ffmpeg（装到 PATH，或设 FFMPEG 环境变量）');
  process.exit(1);
}

const files = fs.readdirSync(srcDir)
  .filter((f) => /\.(jpe?g|png|bmp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
if (!files.length) {
  console.error('✗ 源目录没有图片：' + srcDir);
  process.exit(1);
}

const outDir = path.join(imgRoot, id);
fs.mkdirSync(outDir, { recursive: true });

let manifest = { version: 1, papers: [] };
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.papers)) manifest.papers = [];
}

const pad = (n) => String(n).padStart(2, '0');
const images = [];
const errors = [];
files.forEach((file, i) => {
  const name = 'p' + pad(i + 1) + '.webp';
  const finalPath = path.join(outDir, name);
  const tmpPath = path.join(outDir, '.' + name + '.tmp');
  try {
    const r = spawnSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', path.join(srcDir, file),
      '-vf', 'scale=min(' + WIDTH + '\\,iw):-2',
      '-c:v', 'libwebp', '-q:v', String(QUALITY), '-f', 'webp',
      tmpPath
    ], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error((r.stderr || 'ffmpeg 失败').trim().slice(0, 200));
    fs.renameSync(tmpPath, finalPath);
    images.push({ file: name, label: file.replace(/\.[^.]+$/, ''), bytes: fs.statSync(finalPath).size });
  } catch (e) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    errors.push(file + '：' + e.message);
  }
});

if (errors.length) {
  console.error('✗ 转换失败：\n  ' + errors.join('\n  '));
  process.exit(1);
}

// 清理目标目录里不属于本次清单的旧图 / 临时文件
const keep = new Set(images.map((x) => x.file));
for (const f of fs.readdirSync(outDir)) {
  if (!keep.has(f)) fs.unlinkSync(path.join(outDir, f));
}

const now = new Date();
const date = dateArg || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
const entry = {
  id,
  title: title || path.basename(srcDir),
  date,
  source: srcDir.replace(/\\/g, '/'),
  bank: bank || null,
  note: '试卷页含手写作答；重做请用「打印重做卷」生成的干净版本。',
  addedAt: now.toISOString().slice(0, 10),
  images: images.map(({ file, label }) => ({ file, label }))
};
const idx = manifest.papers.findIndex((p) => p.id === id);
if (idx >= 0) manifest.papers[idx] = entry;
else manifest.papers.push(entry);

// 原子写清单：先写临时文件再 rename，避免中途失败留下半份 JSON
const tmpManifest = manifestPath + '.tmp';
try {
  fs.writeFileSync(tmpManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpManifest, manifestPath);
} finally {
  if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
}

const total = images.reduce((n, x) => n + x.bytes, 0);
console.log('✓ 补录完成：' + entry.title + '（' + images.length + ' 张图）');
images.forEach((x) => console.log('  ' + x.file + '  ' + (x.bytes / 1024).toFixed(0) + ' KB  ← ' + x.label));
console.log('  单卷合计 ' + (total / 1024).toFixed(0) + ' KB　→ images/试卷/' + id + '/');
console.log('  清单 ' + path.relative(root, manifestPath) + '（' + (idx >= 0 ? '覆盖同 id' : '新增') + '）');
if (total > 800 * 1024) console.warn('  ⚠ 单卷超过 800 KB，建议调低 WIDTH 或 QUALITY 后重跑');
