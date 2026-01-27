import Link from "next/link";

import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { buttonLinkStyles } from "@/components/ui/button";
import { getMagazineIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MagazinePage() {
  const issues = await getMagazineIssues();

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-12">
        <div className="rounded-[32px] border border-brand-200 bg-gradient-to-br from-white via-white to-brand-200/40 p-8 shadow-sm">
          <SectionHeading
            title="Revista AlvVaz"
            subtitle="Ediciones digitales pensadas para inspirar a tus viajeros con rutas, experiencias y escapes premium."
            kicker="Catálogo"
          />
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-brand-200 px-3 py-1">Actualizado cada temporada</span>
            <span className="rounded-full border border-brand-200 px-3 py-1">PDFs listos para compartir</span>
            <span className="rounded-full border border-brand-200 px-3 py-1">Enfoque editorial premium</span>
          </div>
        </div>

        <section className="space-y-6">
          <h2 className="font-display text-2xl text-brand-950">Últimas ediciones</h2>
          {issues.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
              Aún no hay ediciones publicadas. Vuelve pronto.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {issues.map((issue) => (
                <article
                  key={issue.id}
                  className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      <span>Edición</span>
                      <span>
                        {issue.publishedAt
                          ? new Date(issue.publishedAt).toLocaleDateString("es-MX")
                          : "Próximamente"}
                      </span>
                    </div>
                    <h3 className="font-display text-xl text-brand-950">{issue.title}</h3>
                    <p className="text-sm text-slate-600">{issue.description}</p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/magazine/${issue.slug}`}
                      className={buttonLinkStyles({ variant: "primary" })}
                    >
                      Ver edición
                    </Link>
                    <Link
                      href="/contacto"
                      className={buttonLinkStyles({ variant: "secondary" })}
                    >
                      Pedir info
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
