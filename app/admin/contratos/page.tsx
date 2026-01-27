import { SectionHeading } from "@/components/section-heading";
import { getContracts } from "@/lib/db";

import { ContractForm } from "./ContractForm";
import { createContractAction, deleteContractAction, updateContractAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContratosAdminPage() {
  const contracts = await getContracts();

  const pendingContracts = contracts.filter((contract) => contract.status !== "paid");
  const approvedContracts = contracts.filter((contract) => contract.status === "paid");

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Contratos"
        subtitle="Genera contratos, controla pendientes y crea viajes."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg text-brand-950">Nuevo contrato</h3>
        <p className="mt-1 text-sm text-slate-600">
          Crea el contrato con los datos del viaje y la lista de pasajeros.
        </p>
        <div className="mt-4">
          <ContractForm
            action={createContractAction}
            submitLabel="Crear contrato"
            resetOnSubmit
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-brand-950">Contratos pendientes</h3>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {pendingContracts.length} pendientes
          </span>
        </div>

        {pendingContracts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            No hay contratos pendientes por revisar.
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingContracts.map((contract) => (
              <details
                key={contract.id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="grid items-center gap-4 md:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contrato
                      </p>
                      <p className="font-display text-lg text-brand-950">
                        {contract.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Cliente
                      </p>
                      <p className="text-sm text-slate-700">{contract.clientName}</p>
                      <p className="text-xs text-slate-500">{contract.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Estado
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                        {contract.status === "pending" && (
                          <span className="rounded-full border border-amber-200 px-2 py-1 text-amber-700">
                            Pendiente
                          </span>
                        )}
                        {contract.status === "signed" && (
                          <span className="rounded-full border border-blue-200 px-2 py-1 text-blue-700">
                            Firmado
                          </span>
                        )}
                        {contract.status === "paid" && (
                          <span className="rounded-full border border-emerald-200 px-2 py-1 text-emerald-700">
                            Pagado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right md:text-left">
                      <span className="inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                        Ver detalles
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 px-6 py-4">
                  <ContractForm
                    action={updateContractAction}
                    deleteAction={deleteContractAction}
                    initialContract={contract}
                    submitLabel="Guardar cambios"
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-brand-950">Contratos aprobados</h3>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {approvedContracts.length} aprobados
          </span>
        </div>

        {approvedContracts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
            Aún no hay contratos aprobados.
          </div>
        ) : (
          <div className="grid gap-4">
            {approvedContracts.map((contract) => (
              <details
                key={contract.id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="grid items-center gap-4 md:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contrato
                      </p>
                      <p className="font-display text-lg text-brand-950">
                        {contract.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Cliente
                      </p>
                      <p className="text-sm text-slate-700">{contract.clientName}</p>
                      <p className="text-xs text-slate-500">{contract.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Estado
                      </p>
                      <span className="rounded-full border border-emerald-200 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Aprobado
                      </span>
                    </div>
                    <div className="text-right md:text-left">
                      <span className="inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                        Ver detalles
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 px-6 py-4">
                  <ContractForm
                    action={updateContractAction}
                    deleteAction={deleteContractAction}
                    initialContract={contract}
                    submitLabel="Guardar cambios"
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
