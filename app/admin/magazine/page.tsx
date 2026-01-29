import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { getMagazineIssues, getMagazineItems } from "@/lib/db";

import { createIssueActionWithState, deleteIssueAction, updateIssueAction } from "./actions";
import { NewIssueForm } from "./NewIssueForm";
import { UploadItemForm } from "./UploadItemForm";
import IssueShareButton from "./IssueShareButton";

export const dynamic = "force-dynamic";

export default async function MagazineAdminPage() {
  const issues = await getMagazineIssues();
  const items = await getMagazineItems();

  const itemsByIssue = new Map<string, typeof items>();
  for (const item of items) {
    const current = itemsByIssue.get(item.issueId) ?? [];
    itemsByIssue.set(item.issueId, [...current, item]);
  }

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
        {issues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Aún no hay ediciones cargadas.
          </div>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue) => {
              const issueItems = itemsByIssue.get(issue.id) ?? [];
              const publishedLabel = issue.publishedAt
                ? new Date(issue.publishedAt).toLocaleDateString("es-MX")
                : "Sin fecha";

              return (
                <details
                  key={issue.id}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                    <div className="grid items-center gap-4 md:grid-cols-[2fr_1.5fr_0.8fr_0.7fr_0.6fr]">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Edición
                        </p>
                        <p className="font-display text-lg text-brand-950">{issue.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          /magazine/{issue.slug}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Resumen
                        </p>
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {issue.description || "Sin descripción."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Publicación
                        </p>
                        <p className="text-sm text-slate-700">{publishedLabel}</p>
                      </div>
                      <div className="text-right md:text-left">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Archivos
                        </p>
                        <p className="text-sm text-slate-700">{issueItems.length}</p>
                      </div>
                      <div className="flex items-end justify-end md:justify-start">
                        <IssueShareButton
                          slug={issue.slug}
                          title={issue.title}
                          deleteAction={deleteIssueAction}
                          issueId={issue.id}
                        />
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-200 px-6 py-4">
                    <form
                      action={updateIssueAction}
                      className="grid gap-4 text-sm md:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={issue.id} />
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Título
                        </label>
                        <input
                          name="title"
                          defaultValue={issue.title}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Fecha de publicación
                        </label>
                        <input
                          type="date"
                          name="publishedAt"
                          defaultValue={issue.publishedAt ? issue.publishedAt.slice(0, 10) : ""}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Descripción
                        </label>
                        <textarea
                          name="description"
                          defaultValue={issue.description}
                          className="min-h-[80px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
                        <Button type="submit" variant="secondary">
                          Guardar cambios
                        </Button>
                        <Button
                          type="submit"
                          formAction={deleteIssueAction}
                          variant="subtle"
                          className="border border-rose-300 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </form>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Archivos cargados
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {issueItems.length === 0 ? (
                          <li>Sin archivos adjuntos.</li>
                        ) : (
                          issueItems.map((item) => (
                            <li key={item.id} className="flex items-center justify-between">
                              <span>{item.title || item.fileUrl}</span>
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                                {item.kind}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
