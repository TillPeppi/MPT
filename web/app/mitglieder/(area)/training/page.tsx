import { PlanView } from "@/components/member/plan-view";
import { PageTitle } from "@/components/member/ui";
import { backend } from "@/lib/api";
import { activePlans, donePlans } from "@/lib/member-view";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Training | MPT" };

export default async function TrainingPage() {
  const { token } = await requireSession();
  const { plans } = await backend.me(token);
  const active = activePlans(plans);
  const done = donePlans(plans);
  return (
    <>
      <PageTitle title="Training" text="Deine Pläne wie auf dem Papierbogen. Die Werte trägt dein Coach ein; hier siehst du sie." />
      {active.length === 0 && <p className="empty">Du hast gerade keinen aktiven Plan.</p>}
      {active.map((p) => (
        <PlanView key={p.id} plan={p} />
      ))}
      {done.length > 0 && (
        <details className="fold">
          <summary>Abgeschlossene Pläne ({done.length})</summary>
          {done.map((p) => (
            <PlanView key={p.id} plan={p} />
          ))}
        </details>
      )}
    </>
  );
}
