import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/members/:id/export: DSGVO-Auskunft als JSON-Download */
export async function GET(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { id } = await params;
    const data = await adminBackend.exportMember(token, id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kunde-${id.replace(/[^\w-]/g, "")}-export.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
