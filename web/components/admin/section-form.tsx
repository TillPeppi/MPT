"use client";

import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/admin-schema";
import type { SettingsSection } from "@/types/admin";
import { adminApi } from "./api";
import { EditForm } from "./edit-form";
import type { Obj } from "./fields";

export function SectionForm({ section, fields, initial }: { section: SettingsSection; fields: FieldDef[]; initial: Obj }) {
  const router = useRouter();
  return (
    <EditForm
      fields={fields}
      initial={initial}
      successText="Einstellungen gespeichert."
      onSave={async (value) => {
        await adminApi("PUT", `/api/admin/settings/${section}`, value);
        router.refresh();
      }}
    />
  );
}
