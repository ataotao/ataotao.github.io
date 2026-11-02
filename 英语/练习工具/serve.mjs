// 极简静态服务器：node serve.mjs 4311
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const PORT = Number(process.argv[2] || 4311);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/designs/";
    let filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) {
      if (!urlPath.endsWith("/")) {
        res.writeHead(301, { Location: urlPath + "/" }).end();
        return;
      }
      const html = `<meta charset="utf-8"><title>designs</title>
<body style="font:14px/1.7 system-ui;padding:24px">
<h1>designs/</h1><ul>${(await readFile("/dev/null").catch(() => "")) && ""}
</ul></body>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
      return;
    }
    if (!info) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404 " + urlPath);
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    }).end(body);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" }).end(String(e));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log("serving " + ROOT + " at http://127.0.0.1:" + PORT + "/");
});
