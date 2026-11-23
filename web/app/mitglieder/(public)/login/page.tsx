import { redirect } from "next/navigation";
import { LoginForm } from "@/components/member/login-form";
import { getSession } from "@/lib/session";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getSession()) redirect("/mitglieder");
  const { next } = await searchParams;
  return (
    <div className="member-area">
      <div className="wrap">
        <span className="eyebrow">Mitgliederbereich</span>
        <h1 className="display">Willkommen zurück.</h1>
        <p className="lead">Trainingspläne, Messungen, Buchungen und Shop-Anfragen an einem Ort.</p>
        <div className="login">
          <h2>Einloggen</h2>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
