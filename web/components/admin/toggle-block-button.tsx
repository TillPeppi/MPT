"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";

export function ToggleBlockButton({ pageId, blockId, hidden }: { pageId: string; blockId: string; hidden: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await adminApi("PUT", `/api/admin/pages/${pageId}/blocks/${blockId}`, { hidden: !hidden });
      toast.success(hidden ? "Abschnitt wird wieder angezeigt." : "Abschnitt ist ausgeblendet.");
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn btn-ghost adm-b sm" onClick={toggle} disabled={busy}>
      {hidden ? "Einblenden" : "Ausblenden"}
    </button>
  );
}
