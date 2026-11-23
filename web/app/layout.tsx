import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { MemberProvider } from "@/components/client/member-provider";
import { getSite } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/header.css";
import "@/styles/hero.css";
import "@/styles/blocks-a.css";
import "@/styles/blocks-b.css";
import "@/styles/member-sched.css";
import "@/styles/shop.css";
import "@/styles/member.css";
import "@/styles/misc.css";
import "@/styles/responsive.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: settings.seo.title,
    description: settings.seo.description,
    applicationName: settings.name,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getSite();
  return (
    // suppressHydrationWarning: das Theme-Skript setzt data-theme/class auf <html>, bevor React hydriert
    <html lang="de" data-scroll-behavior="smooth" className={`${anton.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <MemberProvider shop={{ pickupNote: settings.shop.pickupNote, currency: settings.shop.currency }}>{children}</MemberProvider>
      </body>
    </html>
  );
}
