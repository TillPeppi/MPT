import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** GET /api/admin/accounts: Admin-Konten */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json({ accounts: await adminBackend.accounts(token) }));
}

/** POST /api/admin/accounts {username, name, password}: Konto anlegen */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => {
    const account = await adminBackend.createAccount(token, await readBody(request));
    return NextResponse.json({ account }, { status: 201 });
  });
}
