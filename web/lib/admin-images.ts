import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./data-paths";

const ROOT = path.join(process.cwd(), "public");

async function list(dir: string, urlBase: string, depth = 1): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(path.isAbsolute(dir) ? dir : path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.isDirectory() && depth > 0) out.push(...(await list(path.join(dir, e.name), `${urlBase}/${e.name}`, depth - 1)));
    else if (/\.(jpe?g|png|webp)$/i.test(e.name)) out.push(`${urlBase}/${e.name}`);
  }
  return out;
}

/** Bilder für die Auswahl im Admin: hochgeladene zuerst, dann die mitgelieferten */
export async function listImages(): Promise<string[]> {
  const [up, base] = await Promise.all([list(UPLOAD_DIR, "/uploads", 0), list("assets/img", "/assets/img")]);
  return [...up.sort().reverse(), ...base.filter((p) => !p.includes("logo")).sort()];
}
