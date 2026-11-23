import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin-session";

export const metadata = { title: "Anmelden" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  if (await getAdminSession()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="adm-login">
      <div className="adm-card">
        <div className="adm-brand" style={{ padding: 0 }}>
          <span>{"//"}</span>MPT <small>ADMIN</small>
        </div>
        <h1 className="adm-h1" style={{ fontSize: 34 }}>Anmelden</h1>
        <p className="muted">Nur für das MPT-Team. Kunden melden sich im Mitgliederbereich an.</p>
        <AdminLoginForm next={next} />
      </div>
    </main>
  );
}
