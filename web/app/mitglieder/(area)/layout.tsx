import type { ReactNode } from "react";
import { MemberNav } from "@/components/member/member-nav";
import { requireSession } from "@/lib/session";

/** Schutz auch hier (zusätzlich zu proxy.ts); jede Seite ruft requireSession() selbst auf, weil Layouts bei Navigation nicht neu laufen. */
export default async function AreaLayout({ children }: { children: ReactNode }) {
  const { session } = await requireSession();
  return (
    <div className="member-area area">
      <div className="wrap">
        <MemberNav name={session.firstName} />
        {children}
      </div>
    </div>
  );
}
