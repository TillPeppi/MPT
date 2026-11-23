import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { getSite } from "@/lib/api";

export const metadata: Metadata = {
  title: "Mitgliederbereich | MPT",
  robots: { index: false, follow: false },
};

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const site = await getSite();
  return (
    <PageShell site={site} activeSlug="mitglieder">
      {children}
    </PageShell>
  );
}
