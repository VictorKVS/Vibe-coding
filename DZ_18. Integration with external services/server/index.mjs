import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProviderConfigError,
  heygenHealth,
  listHeygenAvatars,
  listHeygenVoices,
} from "./providers/heygen.mjs";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const port = Number(process.env.PORT || 5190);

const server = createServer(async (req, res) => {
  try {
    if (!req.url) return sendJson(res, 400, { error: "Missing URL" });

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        app: "father-content-generator-dz18",
        heygen: await heygenHealth(),
      });
    }

    if (url.pathname === "/api/heygen/avatars") {
      const avatars = await listHeygenAvatars();
      return sendJson(res, 200, {
        provider: "heygen",
        apiVersion: "v3",
        count: avatars.length,
        avatars,
      });
    }

    if (url.pathname === "/api/heygen/voices") {
      const voices = await listHeygenVoices();
      return sendJson(res, 200, {
        provider: "heygen",
        apiVersion: "v3",
        count: voices.length,
        voices,
      });
    }

    if (process.env.NODE_ENV === "production") {
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 404, {
      error: "Route not found",
      hint: "Use Vite on :5188 for the web UI and this API on :5190.",
    });
  } catch (error) {
    const status =
      error instanceof ProviderConfigError
        ? error.statusCode
        : Number(error?.statusCode || 500);

    return sendJson(res, status, {
      error: error instanceof Error ? error.message : "Unexpected server error",
      provider: "heygen",
      upstream: error?.upstream,
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`FATHER DZ-18 server listening on http://localhost:${port}`);
});

async function serveStatic(pathname, res) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  let filePath = join(distDir, safePath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(distDir, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(body);
    } catch {
      sendJson(res, 404, { error: "Build not found. Run npm run build first." });
    }
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
}
