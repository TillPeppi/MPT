"use client";

import { useRouter } from "next/navigation";
import { adminApi } from "./api";
import { EditForm } from "./edit-form";

export function PageSeoForm({ pageId, title, description }: { pageId: string; title: string; description: string }) {
  const router = useRouter();
  return (
    <EditForm
      fields={[
        { k: "title", t: "text", l: "SEO-Titel", max: 70, h: "Leer = Standard aus den Einstellungen" },
        { k: "description", t: "textarea", l: "SEO-Beschreibung", max: 170 },
      ]}
      initial={{ title, description }}
      onSave={async (v) => {
        await adminApi("PUT", `/api/admin/pages/${pageId}/seo`, v);
        router.refresh();
      }}
    />
  );
}
