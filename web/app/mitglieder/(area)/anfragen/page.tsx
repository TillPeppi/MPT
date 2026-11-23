import Link from "next/link";
import { MCard, PageTitle, Pill } from "@/components/member/ui";
import { backend, getSite } from "@/lib/api";
import { eur, fmtDate } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/member-view";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Meine Anfragen | MPT" };

export default async function OrdersPage() {
  const { token } = await requireSession();
  const [orders, site] = await Promise.all([backend.orders(token), getSite()]);
  const { currency, pickupNote } = site.settings.shop;
  return (
    <>
      <PageTitle title="Meine Anfragen" text={pickupNote ?? "Abholung und Bezahlung im Studio."} />
      {orders.length === 0 ? (
        <div className="empty">
          <p>Du hast noch nichts angefragt.</p>
          <p>
            <Link className="btn btn-primary btn-sm" href="/shop">
              Zum Shop
            </Link>
          </p>
        </div>
      ) : (
        <div className="mgrid">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            return (
              <MCard key={o.id} title={`Anfrage ${o.no}`} action={<Pill tone={st.tone}>{st.label}</Pill>}>
                <p className="muted">Gesendet am {fmtDate(o.createdAt.slice(0, 10))}</p>
                <ul className="rows">
                  {o.items.map((i, k) => (
                    <li key={`${i.productId}-${k}`}>
                      <div>
                        <b>
                          {i.qty} × {i.name}
                        </b>
                        {i.variant && <small>{i.variant}</small>}
                      </div>
                      <span className="when">{eur(i.sum, currency)}</span>
                    </li>
                  ))}
                </ul>
                <p className="total-line">
                  Summe <b>{eur(o.total, currency)}</b>
                </p>
                {o.customer.note && <p className="note">Notiz: {o.customer.note}</p>}
              </MCard>
            );
          })}
        </div>
      )}
    </>
  );
}
