import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getSite } from "@/lib/api";

export default async function NotFound() {
  const site = await getSite();
  return (
    <PageShell site={site} activeSlug="">
      <div className="member-area">
        <div className="wrap">
          <span className="eyebrow">404</span>
          <h1 className="display">Seite nicht gefunden.</h1>
          <p className="lead">Den Link gibt es leider nicht (mehr).</p>
          <div className="login">
            <div className="actions">
              <Link className="btn btn-primary" href="/">
                Zur Startseite
              </Link>
              <Link className="btn btn-ghost" href="/kurse">
                Zum Kursplan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
