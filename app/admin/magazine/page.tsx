import { SectionHeading } from "@/components/section-heading";
import { getMagazineIssues, getMagazineItems } from "@/lib/db";

import { createIssueActionWithState, deleteIssueAction, updateIssueAction } from "./actions";
import { MagazineIssuesManager } from "./MagazineIssuesManager";
import { NewIssueForm } from "./NewIssueForm";
import { UploadItemForm } from "./UploadItemForm";

export const dynamic = "force-dynamic";

export default async function MagazineAdminPage() {
  const issues = await getMagazineIssues();
  const items = await getMagazineItems();

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Revista"
        subtitle="Publica catálogos y adjunta PDFs o páginas visuales."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Nueva edición</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Crea y publica una nueva edición en minutos.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Agregar
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4">
            <NewIssueForm action={createIssueActionWithState} />
          </div>
        </details>
      </section>

      <section className="rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-100 via-white to-brand-200/70 shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Subir PDF o páginas</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Adjunta PDFs completos o imágenes individuales por edición.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Subir
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4">
            <UploadItemForm
              issues={issues.map((issue) => ({ id: issue.id, title: issue.title }))}
            />
          </div>
        </details>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-lg text-brand-950">Ediciones existentes</h3>
        <MagazineIssuesManager
          issues={issues}
          items={items}
          updateIssueAction={updateIssueAction}
          deleteIssueAction={deleteIssueAction}
        />
      </section>
    </div>
  );
}
