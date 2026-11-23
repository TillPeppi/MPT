import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/admin/toast";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: { default: "Admin | MPT", template: "%s | MPT Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
