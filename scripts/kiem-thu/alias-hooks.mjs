import { existsSync, statSync } from "node:fs";
import { join, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Thư mục gốc dự án = thư mục chạy lệnh (trong image builder là /app)
const SRC = pathResolve(process.cwd(), "src");
const EXTS = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"];

function tryFile(base) {
  for (const ext of EXTS) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return pathToFileURL(p).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = tryFile(join(SRC, specifier.slice(2)));
    if (url) return nextResolve(url, context);
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const base = pathResolve(fileURLToPath(context.parentURL), "..", specifier);
    const url = tryFile(base);
    if (url) return nextResolve(url, context);
  }
  return nextResolve(specifier, context);
}
