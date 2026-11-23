"use client";

import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import { getPath, setPath, type FieldDef } from "@/lib/admin-schema";
import { TARIFFS } from "@/lib/admin-schema";
import { errMsg } from "./api";
import { useToast } from "./toast";

/* Generischer Feld-Editor: eine Quelle (lib/admin-schema.ts) für Blöcke, Sammlungen und Einstellungen. */

export type Obj = Record<string, unknown>;

export interface MemberOption {
  id: string;
  name: string;
}
export interface FieldCtx {
  members?: MemberOption[];
}

/** Vorhandene Bilder (public/assets/img und hochgeladene), vom Panel-Layout bereitgestellt */
const ImagesContext = createContext<string[]>([]);

export function ImagesProvider({ images, children }: { images: string[]; children: ReactNode }) {
  return <ImagesContext.Provider value={images}>{children}</ImagesContext.Provider>;
}

export const clone = <T,>(v: T): T => structuredClone(v);

export function withPath(obj: Obj, path: string, value: unknown): Obj {
  const next = clone(obj);
  setPath(next, path, value);
  return next;
}

/* ---------- Einzelne Eingaben ---------- */

function ImagePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const known = useContext(ImagesContext);
  const [extra, setExtra] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const all = [...extra, ...known.filter((k) => !extra.includes(k))];

  async function upload(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast.error("Erlaubt sind nur JPG-, PNG- und WebP-Bilder.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Das Bild ist zu groß (höchstens 5 MB).");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", f);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !json.path) throw new Error(json.error || "Der Upload hat nicht geklappt.");
      setExtra((l) => [json.path as string, ...l]);
      onChange(json.path);
      toast.success("Bild hochgeladen.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="adm-listed">
      <div className="adm-imgpick">
        <div className="adm-thumb" style={value ? { backgroundImage: `url("${value}")` } : undefined} role="img" aria-label={value ? `Vorschau: ${label}` : "Kein Bild gewählt"}>
          {!value && "kein Bild"}
        </div>
        <div className="acts">
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => file.current?.click()}>
            {busy ? "Lädt hoch …" : "Hochladen"}
          </button>
          <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            Aus Bibliothek wählen
          </button>
          {value && (
            <button type="button" className="btn btn-ghost adm-b sm" onClick={() => onChange("")}>
              Entfernen
            </button>
          )}
          <small className="hint" style={{ flexBasis: "100%" }}>JPG, PNG oder WebP bis 5 MB. {value && <code>{value}</code>}</small>
        </div>
      </div>
      {open && (
        <div className="adm-gallery" role="listbox" aria-label="Bildbibliothek">
          {all.map((p) => (
            <button key={p} type="button" role="option" aria-selected={p === value} className={p === value ? "on" : ""} style={{ backgroundImage: `url("${p}")` }} title={p} onClick={() => { onChange(p); setOpen(false); }} />
          ))}
          {all.length === 0 && <span className="adm-empty">Keine Bilder vorhanden.</span>}
        </div>
      )}
    </div>
  );
}

/** Eine Zeile pro Eintrag; hält den Rohtext lokal, damit Leerzeilen beim Tippen nicht verschwinden */
function LinesInput({ value, onChange, id, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; id: string; rows?: number }) {
  const [txt, setTxt] = useState(value.join("\n"));
  return (
    <textarea
      id={id}
      rows={rows}
      value={txt}
      onChange={(e) => {
        setTxt(e.target.value);
        onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean));
      }}
    />
  );
}

function NumbersInput({ value, onChange, id }: { value: number[]; onChange: (v: number[]) => void; id: string }) {
  const [txt, setTxt] = useState(value.join(", "));
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={txt}
      onChange={(e) => {
        setTxt(e.target.value);
        onChange(e.target.value.split(/[,\s;]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n)));
      }}
    />
  );
}

function MemberPicker({ value, onChange, members }: { value: string[]; onChange: (v: string[]) => void; members: MemberOption[] }) {
  const [q, setQ] = useState("");
  const shown = members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || value.includes(m.id));
  return (
    <div className="adm-listed">
      <input type="search" placeholder="Kunden suchen …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Kunden suchen" />
      <div className="adm-checks" style={{ maxHeight: 220, overflow: "auto" }}>
        {shown.map((m) => (
          <label key={m.id} className="adm-check">
            <input type="checkbox" checked={value.includes(m.id)} onChange={(e) => onChange(e.target.checked ? [...value, m.id] : value.filter((x) => x !== m.id))} />
            {m.name}
          </label>
        ))}
        {shown.length === 0 && <span className="adm-empty">Keine Treffer.</span>}
      </div>
    </div>
  );
}

const DAYS: [number, string][] = [[1, "Mo"], [2, "Di"], [3, "Mi"], [4, "Do"], [5, "Fr"], [6, "Sa"], [0, "So"]];

/* ---------- Feld ---------- */

interface FieldProps {
  f: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  ctx: FieldCtx;
}

function Field({ f, value, onChange, ctx }: FieldProps) {
  const id = useId();
  if (f.t === "info") return <p className="hint">{f.l}</p>;

  let control: ReactNode;
  switch (f.t) {
    case "textarea":
      control = <textarea id={id} rows={f.rows} value={String(value ?? "")} maxLength={f.max} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "toggle":
      return (
        <div className="adm-field">
          <label className="adm-check">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
            {f.l}
          </label>
          {f.h && <span className="hint">{f.h}</span>}
        </div>
      );
    case "number":
      control = (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={f.min}
          max={f.max}
          step={f.step ?? (f.int ? 1 : "any")}
          value={typeof value === "number" || value === "" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
      break;
    case "select":
      control = (
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(f.num ? Number(e.target.value) : e.target.value)}>
          {Object.entries(f.o).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      );
      break;
    case "strings":
      control = <LinesInput id={id} value={(value as string[]) ?? []} onChange={onChange} />;
      break;
    case "numbers":
      control = <NumbersInput id={id} value={(value as number[]) ?? []} onChange={onChange} />;
      break;
    case "images": {
      const list = ((value as string[]) ?? []).slice();
      const n = Math.max(3, list.length);
      control = (
        <div className="adm-listed">
          {Array.from({ length: n }, (_, i) => (
            <ImagePicker key={i} label={`${f.l} ${i + 1}`} value={list[i] ?? ""} onChange={(v) => { const next = Array.from({ length: n }, (_, j) => (j === i ? v : (list[j] ?? ""))); onChange(next.filter(Boolean)); }} />
          ))}
        </div>
      );
      break;
    }
    case "image":
      control = <ImagePicker label={f.l} value={String(value ?? "")} onChange={onChange} />;
      break;
    case "days": {
      const cur = (value as number[]) ?? [];
      control = (
        <div className="adm-days" role="group" aria-label={f.l}>
          {DAYS.map(([d, l]) => (
            <label key={d} className={cur.includes(d) ? "on" : ""}>
              <input type="checkbox" checked={cur.includes(d)} onChange={(e) => onChange(e.target.checked ? [...cur, d].sort() : cur.filter((x) => x !== d))} />
              {l}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "memberIds":
      control = <MemberPicker value={(value as string[]) ?? []} onChange={onChange} members={ctx.members ?? []} />;
      break;
    case "allowed": {
      const a = ((value as { tariffs?: string[]; groups?: string[]; memberIds?: string[] }) ?? {}) as { tariffs: string[]; groups: string[]; memberIds: string[] };
      const cur = { tariffs: a.tariffs ?? [], groups: a.groups ?? [], memberIds: a.memberIds ?? [] };
      control = (
        <div className="adm-listed">
          <span className="lab">Tarife</span>
          <div className="adm-checks">
            {Object.entries(TARIFFS).map(([k, l]) => (
              <label key={k} className="adm-check">
                <input type="checkbox" checked={cur.tariffs.includes(k)} onChange={(e) => onChange({ ...cur, tariffs: e.target.checked ? [...cur.tariffs, k] : cur.tariffs.filter((x) => x !== k) })} />
                {l}
              </label>
            ))}
          </div>
          <span className="lab">Gruppen (eine pro Zeile, z. B. golf)</span>
          <LinesInput id={`${id}-g`} rows={2} value={cur.groups} onChange={(g) => onChange({ ...cur, groups: g })} />
          <span className="lab">Einzelne Mitglieder</span>
          <MemberPicker value={cur.memberIds} onChange={(m) => onChange({ ...cur, memberIds: m })} members={ctx.members ?? []} />
        </div>
      );
      break;
    }
    case "list":
      control = <ListEditor f={f} value={(value as Obj[]) ?? []} onChange={onChange} ctx={ctx} />;
      break;
    default: {
      const type = f.t === "datetime" ? "datetime-local" : f.t === "text" || f.t === "link" ? "text" : f.t;
      control = (
        <>
          <input id={id} type={type} list={f.list ? `${id}-dl` : undefined} value={String(value ?? "")} maxLength={f.max} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
          {f.list && (
            <datalist id={`${id}-dl`}>
              {f.list.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          )}
        </>
      );
    }
  }

  const labelled = f.t === "image" || f.t === "images" || f.t === "days" || f.t === "allowed" || f.t === "list" || f.t === "memberIds";
  const max = "max" in f && (f.t === "text" || f.t === "textarea") ? f.max : undefined;
  return (
    <div className="adm-field">
      {labelled ? <span className="lab">{f.l}</span> : <label htmlFor={id}>{f.l}{"req" in f && f.req ? " *" : ""}</label>}
      {control}
      {f.h && <span className="hint">{f.h}</span>}
      {max && (f.t === "text" || f.t === "textarea") && typeof value === "string" && value.length > max * 0.8 && <span className="count">{value.length} / {max}</span>}
    </div>
  );
}

function ListEditor({ f, value, onChange, ctx }: { f: Extract<FieldDef, { t: "list" }>; value: Obj[]; onChange: (v: unknown) => void; ctx: FieldCtx }) {
  const titleKey = f.titleKey ?? (f.fields.find((x) => x.t === "text")?.k ?? "");
  const move = (i: number, d: number) => {
    const next = value.slice();
    const [it] = next.splice(i, 1);
    next.splice(i + d, 0, it);
    onChange(next);
  };
  return (
    <div className="adm-listed">
      {value.map((item, i) => {
        const title = String(getPath(item, titleKey) ?? "").trim();
        return (
          <details key={i} className="adm-sub" open={value.length <= 3 || !title}>
            <summary>
              <span>{title || `${f.l} ${i + 1}`}</span>
            </summary>
            <div className="body">
              <FieldEditor fields={f.fields} value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} ctx={ctx} />
              <div className="acts">
                <button type="button" className="adm-iconbtn" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="adm-iconbtn" aria-label="Nach unten" disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="btn danger adm-b sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  Entfernen
                </button>
              </div>
            </div>
          </details>
        );
      })}
      {value.length === 0 && <span className="adm-empty">Noch keine Einträge.</span>}
      {value.length < (f.max ?? 100) && (
        <div>
          <button type="button" className="btn btn-ghost adm-b sm" onClick={() => onChange([...value, clone(f.item)])}>
            + Hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

/** Rendert eine Feldliste; `value` ist das (verschachtelte) Objekt, Schlüssel dürfen Punkt-Pfade sein */
export function FieldEditor({ fields, value, onChange, ctx = {} }: { fields: FieldDef[]; value: Obj; onChange: (v: Obj) => void; ctx?: FieldCtx }) {
  return (
    <>
      {fields.map((f, i) => (
        <Field key={f.k ?? `info-${i}`} f={f} ctx={ctx} value={f.k ? getPath(value, f.k) : undefined} onChange={(v) => f.k && onChange(withPath(value, f.k, v))} />
      ))}
    </>
  );
}
