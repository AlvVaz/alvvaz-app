import type { Metadata } from "next";

import { getMagazineIssueBySlug } from "@/lib/db";

// Link preview (WhatsApp, Facebook...) for a magazine issue: its title and description,
// always with the AlvVaz logo as the image (covers are too heavy for previews).
export async function getIssueMetadata(slug: string, path: string): Promise<Metadata> {
  const issue = await getMagazineIssueBySlug(slug);
  if (!issue) return {};
  const title = `${issue.title} | Revista AlvVaz`;
  const description = issue.description || "Revista de viajes AlvVaz.";
  const images = ["/logoalvvaz.png"];
  return {
    title,
    description,
    openGraph: { title, description, url: path, type: "article", siteName: "AlvVaz", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
