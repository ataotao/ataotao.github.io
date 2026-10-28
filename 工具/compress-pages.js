// 把 images/ 里的扫描原页压成 WebP（保留原分辨率方向、去掉 EXIF）
// 用法： bun 工具/compress-pages.js <科目目录> [--keep-jpg]
//   例： bun 工具/compress-pages.js 历史
// 说明：手机拍的页子 EXIF orientation 是 8/6（存的是横图），必须 rotate() 把方向烤进像素，
//       否则去掉 EXIF 后的 WebP 在浏览器里会横过来。
import sharp from "sharp";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const WIDTH = 1600;   // 原页 4096x3072，1600 宽足够看清印刷体和手写批注
const QUALITY = 78;
const KEEP = process.argv.includes("--keep-jpg");

const dir = process.argv[2];
if (!dir) { console.error("用法： bun 工具/compress-pages.js <科目目录> [--keep-jpg]"); process.exit(1); }

const imgDir = join(dir, "images");
const jpgs = readdirSync(imgDir).filter(f => /\.jpe?g$/i.test(f) && !/_original$/i.test(f.replace(/\.jpe?g$/i, ""))).sort();
let before = 0, after = 0;

for (const f of jpgs) {
  const src = join(imgDir, f);
  const out = join(imgDir, f.replace(/\.jpe?g$/i, ".webp"));
  const b = statSync(src).size;
  const info = await sharp(src)
    .rotate()                            // 按 EXIF 摆正
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toFile(out);
  const a = statSync(out).size;
  before += b; after += a;
  console.log(`${f.padEnd(18)} ${(b / 1048576).toFixed(2)}MB → ${(a / 1024).toFixed(0)}KB  (${info.width}x${info.height})`);
  if (!KEEP) unlinkSync(src);
}

console.log(`\n合计 ${jpgs.length} 张：${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB（省 ${(100 - after / before * 100).toFixed(1)}%）${KEEP ? "，原 JPG 已保留" : "，原 JPG 已删除"}`);
