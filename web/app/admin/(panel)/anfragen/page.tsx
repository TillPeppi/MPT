import { OrdersAdmin } from "@/components/admin/orders-admin";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Shop-Anfragen" };

export default async function OrdersPage() {
  const { token } = await requireAdmin();
  const orders = await adminBackend.orders(token);
  return (
    <>
      <AdminTitle title="Shop-Anfragen" text="Ablauf: neu, bestätigt, bereit zur Abholung, abgeholt (oder abgelehnt). Der Kunde sieht den Status im Kundenbereich, die interne Notiz sieht er nicht." />
      <OrdersAdmin orders={orders} />
    </>
  );
}
