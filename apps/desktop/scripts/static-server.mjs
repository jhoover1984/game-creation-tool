import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../src");
const artifactRootDir = path.resolve(__dirname, "../export-artifacts");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.GCS_STATIC_PORT || "4173", 10);

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".wasm", "application/wasm"],
]);
const securityHeaders = {
  // Dev-only static server, but keep browser defaults aligned with production safety posture.
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Access-Control-Allow-Origin": `http://${host}:${port}`,
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
};

function contentTypeFor(filePath) {
  return types.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function safeJoin(root, requestPath) {
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const resolved = path.resolve(root, `.${normalized}`);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

function resolvePath(urlPath) {
  if (urlPath.startsWith("/export-artifacts/")) {
    const relativePath = urlPath.slice("/export-artifacts".length);
    return safeJoin(artifactRootDir, relativePath);
  }
  return safeJoin(rootDir, urlPath);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    const filePath = resolvePath(url.pathname);
    if (!filePath) {
      res.writeHead(403, securityHeaders);
      res.end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      ...securityHeaders,
      "Content-Type": contentTypeFor(filePath),
    });
    res.end(body);
  } catch {
    res.writeHead(404, securityHeaders);
    res.end("Not Found");
  }
}).listen(port, host, () => {
  process.stdout.write(`static-server listening on http://${host}:${port}\n`);
});
