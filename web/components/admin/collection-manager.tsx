"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { COLLECTIONS } from "@/lib/admin-schema";
import type { CollectionName } from "@/types/admin";
import { adminApi } from "./api";
import { EditForm } from "./edit-form";
import { clone, type MemberOption, type Obj } from "./fields";

const NEW = "__new__";

/** Liste links, Formular rechts (auf dem Telefon untereinander). Generisch für alle Sammlungen. */
export function CollectionManager({ name, items, members, initialId }: { name: CollectionName; items: Obj[]; members: MemberOption[]; initialId?: string }) {
  const def = COLLECTIONS[name];
  const router = useRouter();
  const sorted = useMemo(() => [...items].sort(def.sort), [items, def]);
  const [sel, setSel] = useState<string>(initialId && items.some((i) => i.id === initialId) ? initialId : sorted.length ? String(sorted[0].id) : NEW);
  /** Ändert sich nur, wenn der Admin einen anderen Eintrag wählt (nicht nach dem Speichern eines neuen Eintrags) */
  const [formKey, setFormKey] = useState(0);
  const current = sel === NEW ? undefined : items.find((i) => i.id === sel);
  const initial: Obj = current ? clone(current) : def.newItem();

  function pick(id: string) {
    if (id === sel) return;
    setSel(id);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="adm-split">
      <div>
        <div className="adm-actions" style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-primary adm-b" onClick={() => pick(NEW)}>
            + Neu: {def.singular}
          </button>
        </div>
        <div className="adm-pick" role="list">
          {sorted.map((it) => (
            <button key={String(it.id)} type="button" role="listitem" className={sel === it.id ? "on" : ""} onClick={() => pick(String(it.id))}>
              <b>{def.title(it) || "(ohne Titel)"}</b>
              {def.subtitle && <small>{def.subtitle(it)}</small>}
            </button>
          ))}
          {sorted.length === 0 && <p className="adm-empty">Noch keine Einträge.</p>}
        </div>
      </div>
      <div>
        <h2 className="adm-h1" style={{ fontSize: 28 }}>{sel !== NEW ? (current ? def.title(current) : "") || def.singular : `Neu: ${def.singular}`}</h2>
        <EditForm
          key={formKey}
          fields={def.fields}
          initial={initial}
          ctx={{ members }}
          successText={name === "news" ? "News gespeichert." : "Gespeichert. Die Website ist aktualisiert."}
          onSave={async (value) => {
            const res = await adminApi<{ item: Obj }>("POST", `/api/admin/collections/${name}`, sel !== NEW ? { ...value, id: sel } : value);
            setSel(String(res.item.id));
            router.refresh();
            return res.item;
          }}
          onDelete={
            sel !== NEW
              ? async () => {
                  await adminApi("DELETE", `/api/admin/collections/${name}/${sel}`);
                  setSel(NEW);
                  setFormKey((k) => k + 1);
                  router.refresh();
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
