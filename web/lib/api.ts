import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { AdminBackend, Backend } from "./backend";
import { DATA_DIR, ensureDataDir } from "./data-paths";
import { iso } from "./format";
import { createMockAdminBackend } from "./mock-admin-backend";
import { createMockBackend } from "./mock-backend";
import { toPublicProduct } from "./products";
import { createRemoteAdminBackend } from "./remote-admin-backend";
import { createRemoteBackend } from "./remote-backend";
import type { ContactRequest, InquiryRecord, Page, Post, PublicSiteData, SiteData } from "@/types/site";

/*
 * Datenzugriff der Website. Das ist die EINZIGE Stelle, die weiß, woher die Daten kommen.
 *
 *  - ohne API_URL: lokale JSON-Dateien in web/data/ (Mock-Schicht, Etappe 1)
 *  - mit  API_URL: HTTP-Aufrufe gegen das Go-Backend (Etappe 2+), z. B. API_URL=http://localhost:8080/api
 *
 * Erwartete Endpunkte der Go-API (spiegeln die Mock-Routen unter app/api/):
 *   GET  {API_URL}/site      → SiteData
 *   POST {API_URL}/contact   → { ok: true }   (Body: ContactRequest)
 *   Kundenbereich, Buchung, Termine, Recap, Shop-Anfrage: siehe `Backend` in lib/backend.ts und die Tabelle in README.md
 */

const API_URL = process.env.API_URL?.replace(/\/$/, "");

async function readLocal<T>(file: string): Promise<T> {
  await ensureDataDir();
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8")) as T;
}

async function remote<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${pathname}`, init ?? { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${pathname} antwortete mit Status ${res.status}`);
  return (await res.json()) as T;
}

/** Komplette Site-Konfiguration (Einstellungen, Formulare, Seiten, Sammlungen). Pro Request nur einmal geladen. */
export const getSite = cache(async (): Promise<SiteData> => {
  const site = API_URL ? await remote<SiteData>("/site") : await readLocal<SiteData>("site.json");
  // Entwürfe und Beiträge mit Datum in der Zukunft sind öffentlich nicht sichtbar (die Go-API filtert selbst)
  const today = iso(new Date());
  return { ...site, collections: { ...site.collections, posts: site.collections.posts.filter((p) => p.status !== "draft" && p.date <= today) } };
});

/**
 * Site-Daten für öffentliche Aufrufe (GET /api/site): ohne Produktpreise.
 * Mit der Go-API übernimmt das Backend diese Filterung (Preise nur für angemeldete Mitglieder).
 */
export async function getPublicSite(): Promise<PublicSiteData> {
  const { collections, ...site } = await getSite();
  const { news, ...rest } = collections;
  void news; // News gibt es nur im Kundenbereich
  return { ...site, collections: { ...rest, products: rest.products.map(toPublicProduct) } };
}

export async function getPage(slug: string): Promise<Page | undefined> {
  const site = await getSite();
  return site.pages.find((p) => p.slug === slug);
}

export async function getPageSlugs(): Promise<string[]> {
  const site = await getSite();
  return site.pages.map((p) => p.slug).filter(Boolean);
}

export async function getPosts(): Promise<Post[]> {
  const site = await getSite();
  return [...site.collections.posts].sort((a, z) => z.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const site = await getSite();
  return site.collections.posts.find((p) => p.slug === slug);
}

/* ---------- Anfragen (Kontaktformular) ---------- */

let writeQueue: Promise<unknown> = Promise.resolve();

async function appendInquiry(req: ContactRequest): Promise<InquiryRecord> {
  await ensureDataDir();
  const file = path.join(DATA_DIR, "inquiries.json");
  let list: InquiryRecord[] = [];
  try {
    list = JSON.parse(await fs.readFile(file, "utf8")) as InquiryRecord[];
  } catch {
    list = []; // Datei existiert noch nicht
  }
  const record: InquiryRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    formId: req.formId,
    fields: req.fields,
  };
  list.push(record);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
  return record;
}

/** Legt eine Anfrage an. Lokal: Append in data/inquiries.json (serialisiert), später: POST an die Go-API. */
export async function createInquiry(req: ContactRequest): Promise<void> {
  if (API_URL) {
    await remote<unknown>("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
    return;
  }
  const run = writeQueue.then(() => appendInquiry(req));
  writeQueue = run.catch(() => undefined);
  await run;
}

/* ---------- Kundenbereich, Buchung, Shop-Anfragen ---------- */

/**
 * Backend für alles, was Kundendaten betrifft. Route-Handler und Server-Komponenten rufen nur dieses Objekt auf.
 * Ohne API_URL: Mock mit JSON-Dateien (lib/mock-backend.ts), sonst die Go-API (lib/remote-backend.ts).
 */
export const backend: Backend = API_URL ? createRemoteBackend(API_URL) : createMockBackend(getSite);

/**
 * Backend für den Admin-Bereich (Etappe 3), getrennte Sitzung (Cookie `mpt_admin`).
 * Ohne API_URL: Mock (lib/mock-admin-backend.ts), sonst die Go-API unter `{API_URL}/admin/...`.
 */
export const adminBackend: AdminBackend = API_URL ? createRemoteAdminBackend(API_URL) : createMockAdminBackend();
