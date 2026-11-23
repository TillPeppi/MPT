import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kompakte Lieferung der Bilder; die Quellen liegen lokal unter public/assets/img
  images: { formats: ["image/avif", "image/webp"] },
  // Mock-Daten werden per fs gelesen und sind für den Tracer unsichtbar: auf Vercel ausdrücklich mitliefern
  outputFileTracingIncludes: { "/**": ["./data/site.json", "./data/seed/**/*"] },
};

export default nextConfig;
