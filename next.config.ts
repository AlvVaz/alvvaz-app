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
    // Keep optimized images for 31 days. The default (4h) plus Supabase's no-cache
    // header made every image re-optimize every 4h, costing a Vercel transformation
    // (Hobby: 5K/month) and a fresh multi-MB download from Supabase each time.
    // Safe because uploaded files are never overwritten (upsert is off).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
