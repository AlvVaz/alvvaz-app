import { notFound } from "next/navigation";

import { FlipBook } from "@/components/magazine/FlipBook";
import { getMagazineIssueBySlug, getMagazinePages } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MagazineIssueSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = await getMagazineIssueBySlug(slug);
  if (!issue) notFound();

  const magazinePages = await getMagazinePages(issue.id);
  // TODO: PDF-to-image processing for uploaded PDFs so they can appear here.
  const fallbackPages = [
    {
      id: `${issue.id}-placeholder-01`,
      issueId: issue.id,
      pageNumber: 1,
      imageUrl: "/magazine/placeholders/01.svg",
      title: issue.title,
    },
    {
      id: `${issue.id}-placeholder-02`,
      issueId: issue.id,
      pageNumber: 2,
      imageUrl: "/magazine/placeholders/02.svg",
      title: issue.title,
    },
    {
      id: `${issue.id}-placeholder-03`,
      issueId: issue.id,
      pageNumber: 3,
      imageUrl: "/magazine/placeholders/03.svg",
      title: issue.title,
    },
    {
      id: `${issue.id}-placeholder-04`,
      issueId: issue.id,
      pageNumber: 4,
      imageUrl: "/magazine/placeholders/04.svg",
      title: issue.title,
    },
    {
      id: `${issue.id}-placeholder-05`,
      issueId: issue.id,
      pageNumber: 5,
      imageUrl: "/magazine/placeholders/05.svg",
      title: issue.title,
    },
    {
      id: `${issue.id}-placeholder-06`,
      issueId: issue.id,
      pageNumber: 6,
      imageUrl: "/magazine/placeholders/06.svg",
      title: issue.title,
    },
  ];
  const pages = magazinePages.length > 0 ? magazinePages : fallbackPages;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Revista
          </p>
          <h1 className="font-display text-2xl text-white">{issue.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3" />
      </div>

      <div className="px-4 pb-16">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-800 bg-slate-900/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.65)]">
          <FlipBook pages={pages} className="mx-auto" />
        </div>
      </div>
    </div>
  );
}
