import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium for quote PDFs must stay out of the server bundle.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/quotes/**": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/react/**",
      "./node_modules/react-dom/**",
      "./node_modules/scheduler/**",
      "./public/fonts/Manrope-*.ttf",
      "./public/fonts/Montserrat-Variable.ttf",
      "./public/fonts/Philosopher-*.ttf",
      "./public/logoalvvaz.png",
    ],
    // Contract PDFs use the same headless Chrome renderer (lib/pdf/html-to-pdf.ts).
    "/api/admin/contracts/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./public/fonts/Manrope-*.ttf",
      "./public/fonts/Philosopher-*.ttf",
      "./public/logoalvvaz.png",
    ],
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
