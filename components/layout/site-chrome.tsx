"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type SiteChromeProps = {
  children: React.ReactNode;
};

export function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isShareView =
    pathname?.includes("/magazine/") && pathname.endsWith("/share");

  return (
    <>
      {!isShareView ? <Navbar /> : null}
      <main id="top" className="min-h-screen">
        {children}
      </main>
      {!isShareView ? <Footer /> : null}
    </>
  );
}
