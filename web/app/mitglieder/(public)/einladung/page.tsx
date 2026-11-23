import Link from "next/link";
import { headers } from "next/headers";
import { ActivateForm } from "@/components/member/activate-form";
import { backend } from "@/lib/api";
import { ApiError } from "@/lib/errors";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = { title: "Einladung | MPT" };

export default async function InvitePage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  let invite: { name: string; email: string } | null = null;
  let error = "Einladung ungültig oder abgelaufen.";
  if (token) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
    try {
      invite = await backend.invite(token, ip);
    } catch (err) {
      if (err instanceof ApiError) error = err.message;
      else throw err;
    }
  }
  return (
    <div className="member-area">
      <div className="wrap">
        <span className="eyebrow">Einladung</span>
        {invite ? (
          <>
            <h1 className="display">Willkommen, {invite.name.split(" ")[0]}.</h1>
            <p className="lead">Lege dein Passwort fest, um dich mit {invite.email} einzuloggen.</p>
            <div className="login">
              <h2>Passwort festlegen</h2>
              <ActivateForm token={token} />
            </div>
          </>
        ) : (
          <>
            <h1 className="display">Link ungültig.</h1>
            <div className="login">
              <p role="alert">{error}</p>
              <p className="note">Melde dich beim Studio, wir schicken dir gern einen neuen Einladungslink.</p>
              <div className="actions">
                <Link className="btn btn-primary" href="/mitglieder/login">
                  Zum Login
                </Link>
                <Link className="btn btn-ghost" href="/#kontakt">
                  Studio kontaktieren
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
