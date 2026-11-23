import { notFound } from "next/navigation";
import { CheckupAdmin } from "@/components/admin/checkup-admin";
import { MeasurementsAdmin } from "@/components/admin/measurements-admin";
import { MemberOverview } from "@/components/admin/member-overview";
import { MemberProfile } from "@/components/admin/member-profile";
import { PlansAdmin } from "@/components/admin/plans-admin";
import { AdminTabs, AdminTitle } from "@/components/admin/ui";
import { Pill } from "@/components/member/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { ApiError } from "@/lib/errors";
import { TARIFFS } from "@/lib/admin-schema";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export const metadata = { title: "Kunde" };

const TABS = [
  { key: "stammdaten", label: "Stammdaten" },
  { key: "plaene", label: "Pläne" },
  { key: "messungen", label: "Messungen" },
  { key: "checkup", label: "Check-up" },
  { key: "uebersicht", label: "Übersicht" },
];

export default async function MemberPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "stammdaten" } = await searchParams;
  const { token } = await requireAdmin();
  const [detail, site] = await Promise.all([
    adminBackend.member(token, id).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    adminBackend.site(token),
  ]);
  if (!detail) notFound();
  const m = detail.member;
  const key = TABS.some((t) => t.key === tab) ? tab : "stammdaten";

  return (
    <>
      <AdminTitle title={m.name} crumbs={[{ href: "/admin/kunden", label: "Kunden" }, { label: m.name }]} />
      <div className="adm-actions" style={{ marginBottom: 16 }}>
        <Pill tone={m.active ? "ok" : "off"}>{m.active ? "Aktiv" : "Inaktiv"}</Pill>
        <Pill tone="info">{TARIFFS[m.tariff] ?? m.tariff}</Pill>
        {m.groups.map((g) => (
          <Pill key={g} tone="off">
            {g}
          </Pill>
        ))}
        {!m.hasPassword && <Pill tone="warn">Einladung offen</Pill>}
      </div>
      <AdminTabs tabs={TABS.map((t) => ({ ...t, href: `/admin/kunden/${id}?tab=${t.key}` }))} current={key} />
      {key === "stammdaten" && <MemberProfile member={m} />}
      {key === "plaene" && <PlansAdmin memberId={id} plans={detail.plans} />}
      {key === "messungen" && <MeasurementsAdmin memberId={id} measurements={detail.measurements} due={m.nextMeasurementDue ?? null} config={site.settings.measure} />}
      {key === "checkup" && (
        <CheckupAdmin
          memberId={id}
          checkups={detail.checkups}
          measurements={detail.measurements}
          plans={detail.plans}
          recaps={detail.recaps}
          points={site.settings.checkup.points}
          questions={site.settings.recap.questions}
          measure={site.settings.measure}
        />
      )}
      {key === "uebersicht" && <MemberOverview d={detail} />}
    </>
  );
}
