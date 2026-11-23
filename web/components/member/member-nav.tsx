"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useMember } from "@/hooks/use-session";

const TABS = [
  { href: "/mitglieder", label: "Übersicht" },
  { href: "/mitglieder/buchen", label: "Buchen" },
  { href: "/mitglieder/training", label: "Training" },
  { href: "/mitglieder/messungen", label: "Messungen" },
  { href: "/mitglieder/recap", label: "Wochenrecap" },
  { href: "/mitglieder/anfragen", label: "Anfragen" },
  { href: "/mitglieder/profil", label: "Profil" },
];

export function MemberNav({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  const { refreshSession } = useMember();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/member/logout", { method: "POST" }).catch(() => undefined);
    await refreshSession();
    router.replace("/mitglieder/login");
    router.refresh();
  }

  return (
    <div className="area-top">
      <div className="area-hello">
        <span className="eyebrow">Mitgliederbereich</span>
        <b>Hallo {name}</b>
      </div>
      <nav className="area-tabs" aria-label="Kundenbereich">
        {TABS.map((t) => {
          const on = t.href === "/mitglieder" ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <button type="button" className="btn btn-ghost btn-sm area-logout" onClick={logout} disabled={busy}>
        Abmelden
      </button>
    </div>
  );
}
