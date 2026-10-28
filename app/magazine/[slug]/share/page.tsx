import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { FlipBook } from "@/components/magazine/FlipBook";
import { getMagazineIssueBySlug, getMagazinePages, RENAMED_MAGAZINE_SLUGS } from "@/lib/db";

import { getMagazineContact } from "../../contact";
import { getIssueMetadata } from "../../issue-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return getIssueMetadata(slug, `/magazine/${slug}/share`);
}

export default async function MagazineIssueSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ asesor?: string }>;
}) {
  const { slug } = await params;
  const { asesor } = await searchParams;
  const issue = await getMagazineIssueBySlug(slug);
  if (!issue) {
    const renamed = RENAMED_MAGAZINE_SLUGS[slug];
    if (renamed) permanentRedirect(`/magazine/${renamed}/share${asesor ? `?asesor=${encodeURIComponent(asesor)}` : ""}`);
    notFound();
  }

  const [magazinePages, contact] = await Promise.all([
    getMagazinePages(issue.id),
    getMagazineContact(asesor, issue.title),
  ]);
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

        <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div>
            <h2 className="font-display text-xl text-white">¿Quieres más detalles?</h2>
            <p className="text-sm text-slate-300">
              {contact.advisorName
                ? `Escríbele a tu asesor, ${contact.advisorName}, por WhatsApp.`
                : "Contáctanos y te ayudamos a reservar."}
            </p>
          </div>
          <a
            href={contact.href}
            {...(contact.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-slate-200"
          >
            Contactar
          </a>
        </div>
      </div>
    </div>
  );
}
