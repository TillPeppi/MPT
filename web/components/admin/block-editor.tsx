"use client";

import { useRouter } from "next/navigation";
import { BLOCK_FIELDS, type BlockType } from "@/lib/admin-schema";
import { adminApi } from "./api";
import { EditForm } from "./edit-form";
import type { Obj } from "./fields";

/** Formular eines festen Abschnitts: nur Daten, kein Layout. Speichern schreibt in site.json und erneuert die öffentlichen Seiten. */
export function BlockEditor({ pageId, blockId, type, props, hidden }: { pageId: string; blockId: string; type: BlockType; props: object; hidden: boolean }) {
  const router = useRouter();
  const fields = BLOCK_FIELDS[type];
  // `_hidden` ist ein Pseudo-Feld, das beim Speichern als `hidden` an den Block geht
  const initial: Obj = { ...(props as Obj), _hidden: hidden };
  return (
    <EditForm
      fields={[{ k: "_hidden", t: "toggle", l: "Abschnitt ausblenden", h: "Der Abschnitt bleibt gespeichert, ist auf der Website aber nicht sichtbar." }, ...fields]}
      initial={initial}
      successText="Gespeichert. Die Website ist aktualisiert."
      onSave={async (value) => {
        const { _hidden, ...rest } = value;
        const res = await adminApi<{ block: { props: Obj; hidden?: boolean } }>("PUT", `/api/admin/pages/${pageId}/blocks/${blockId}`, { props: rest, hidden: _hidden === true });
        router.refresh();
        return { ...res.block.props, _hidden: res.block.hidden === true };
      }}
    />
  );
}
