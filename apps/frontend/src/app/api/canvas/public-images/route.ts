import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// Public image scanner — runs server-side, no filesystem access restrictions
// ---------------------------------------------------------------------------

const IMAGE_EXTS = /\.(svg|png|jpe?g)$/i;

function scanDir(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath, baseDir));
    } else if (IMAGE_EXTS.test(entry.name)) {
      // Convert to a root-relative public URL, e.g. "/lappland/lappland_welcome.png"
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push("/" + rel);
    }
  }
  return results;
}

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");
  const images = scanDir(publicDir, publicDir);
  return NextResponse.json(images);
}
