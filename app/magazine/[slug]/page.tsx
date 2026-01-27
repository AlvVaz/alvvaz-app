import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { FlipBook } from "@/components/magazine/FlipBook";
import { buttonLinkStyles } from "@/components/ui/button";
import { getMagazineIssueBySlug, getMagazinePages } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MagazineIssuePage({
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
  const isDemo = magazinePages.length === 0;

  return (
    <div className="bg-slate-50 pb-24 pt-12">
      <Container className="space-y-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Revista
              </p>
              <h1 className="font-display text-3xl text-brand-950">{issue.title}</h1>
              {isDemo ? (
                <span className="inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Vista demo
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/magazine/${issue.slug}/share`}
                className={buttonLinkStyles({ variant: "primary" })}
              >
                Abrir en página completa
              </Link>
              <Link href="/magazine" className={buttonLinkStyles({ variant: "secondary" })}>
                Volver al catálogo
              </Link>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-slate-600">{issue.description}</p>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Arrastra para pasar página</span>
            <span>{pages.length} páginas</span>
          </div>
          <div className="mt-6">
            <FlipBook pages={pages} />
          </div>
        </section>

        <section className="rounded-3xl border border-brand-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl text-brand-950">¿Quieres más detalles?</h3>
              <p className="text-sm text-slate-600">
                Comparte la edición con tu asesor o solicita un itinerario personalizado.
              </p>
            </div>
            <Link href="/contacto" className={buttonLinkStyles({ variant: "primary" })}>
              Contactar
            </Link>
          </div>
          {/* TODO: Integrate WhatsApp CTA once automation flows are ready. */}
        </section>
      </Container>
    </div>
  );
}
