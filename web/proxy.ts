import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistische Prüfung (nur Cookie vorhanden?), die echte Prüfung passiert serverseitig:
 *  - /mitglieder/*: ohne Cookie `mpt_member` → Kunden-Login; Seiten rufen requireSession() auf
 *  - /admin/*:      ohne Cookie `mpt_admin`  → Admin-Login; Seiten rufen requireAdmin() auf, /api/admin/* prüft im Backend
 * Die Cookies sind getrennt: ein Kunden-Cookie öffnet nie den Admin.
 */
const PUBLIC = ["/mitglieder/login", "/mitglieder/einladung"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!request.cookies.has("mpt_admin")) {
      const url = new URL("/admin/login", request.url);
      if (pathname !== "/admin") url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (!request.cookies.has("mpt_member")) {
    const url = new URL("/mitglieder/login", request.url);
    if (pathname !== "/mitglieder") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/mitglieder/:path*", "/admin/:path*", "/admin"] };
