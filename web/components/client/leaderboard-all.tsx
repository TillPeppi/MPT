"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { monthLabel } from "@/lib/format";
import type { ReactNode } from "react";

interface Props {
  title: string;
  desc?: string;
  month: string;
  count: number;
  /** Die komplette Rangliste (serverseitig gerendert) */
  children: ReactNode;
}

export function LeaderboardAll({ title, desc, month, count, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="lbt-all" onClick={() => setOpen(true)}>
        Ganze Rangliste ({count}) →
      </button>
      {open && (
        <Modal title={title} text={`${desc ? `${desc} · ` : ""}${monthLabel(month)}`} onClose={() => setOpen(false)}>
          <div className="m-body">{children}</div>
        </Modal>
      )}
    </>
  );
}
