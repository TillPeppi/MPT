import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ImagesProvider } from "@/components/admin/fields";
import { listImages } from "@/lib/admin-images";
import { requireAdmin } from "@/lib/admin-session";

/** Schutz auch hier; jede Seite ruft requireAdmin() selbst auf, weil Layouts bei der Navigation nicht neu laufen. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { admin } = await requireAdmin();
  const images = await listImages();
  return (
    <div className="adm">
      <AdminNav name={admin.name} />
      <main className="adm-main">
        {admin.mustChangePassword && (
          <div className="adm-warn" role="alert">
            <b>Sicherheitswarnung:</b>
            <span>Du verwendest noch das Startpasswort. Bitte ändere es jetzt, bevor die Website live geht.</span>
            <Link className="btn btn-primary adm-b sm" href="/admin/einstellungen?tab=passwort">
              Passwort ändern
            </Link>
          </div>
        )}
        <ImagesProvider images={images}>{children}</ImagesProvider>
      </main>
    </div>
  );
}
