import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/*
 * Speicherorte der Mock-Schicht.
 *
 *  - Lokal: web/data/ und web/public/uploads/ (wie bisher).
 *  - Auf Vercel (Umgebungsvariable VERCEL gesetzt) ist das Projektverzeichnis schreibgeschützt. Laufzeitdaten und
 *    Uploads liegen dann unter /tmp. Das ist eine Demo: /tmp gehört einer einzelnen Serverless-Instanz und wird
 *    beim nächsten Kaltstart geleert, Änderungen setzen sich also von selbst auf den Seed zurück.
 */

export const IS_DEMO_HOST = Boolean(process.env.VERCEL);

/** Mitgelieferte, versionierte Daten (site.json, seed/). Nur lesen. */
export const BUNDLED_DATA_DIR = path.join(process.cwd(), "data");
export const SEED_DIR = path.join(BUNDLED_DATA_DIR, "seed");

/** Laufzeitdaten (beschreibbar) */
export const DATA_DIR = IS_DEMO_HOST ? "/tmp/mpt-data" : BUNDLED_DATA_DIR;

/** Hochgeladene Bilder des Admins */
export const UPLOAD_DIR = IS_DEMO_HOST ? "/tmp/mpt-uploads" : path.join(process.cwd(), "public", "uploads");

let ready: Promise<void> | null = null;

/** Legt auf Vercel das Datenverzeichnis an und kopiert site.json hinein (einmal pro Instanz). */
export function ensureDataDir(): Promise<void> {
  if (!IS_DEMO_HOST) return Promise.resolve();
  ready ??= (async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const target = path.join(DATA_DIR, "site.json");
    try {
      await fs.access(target);
    } catch {
      await fs.copyFile(path.join(BUNDLED_DATA_DIR, "site.json"), target);
    }
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}
