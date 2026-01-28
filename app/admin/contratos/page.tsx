import { SectionHeading } from "@/components/section-heading";
import { getContracts } from "@/lib/db";
import { cn } from "@/lib/utils";

import { ContractForm } from "./ContractForm";
import ContractsToastProvider from "./ContractsToastProvider";
import ContractSummaryActions from "./ContractSummaryActions";
import ContractStatusButtons from "./ContractStatusButtons";
import { createContractAction, deleteContractAction, updateContractAction } from "./actions";

export const dynamic = "force-dynamic";

const getStatusCardStyles = (status: string) => {
  if (status === "pending") {
    return "border border-amber-200/80 bg-gradient-to-br from-white via-amber-50 to-amber-200/60 shadow-[0_12px_28px_rgba(245,158,11,0.18)]";
  }
  if (status === "signed" || status === "paid") {
    return "border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50 to-emerald-200/60 shadow-[0_12px_28px_rgba(16,185,129,0.18)]";
  }
  if (status === "canceled") {
    return "border border-rose-200/80 bg-gradient-to-br from-white via-rose-50 to-rose-200/60 shadow-[0_12px_28px_rgba(244,63,94,0.18)]";
  }
  return "border border-brand-200/80 bg-gradient-to-br from-white via-brand-50 to-brand-200/60 shadow-[0_12px_28px_rgba(77,143,224,0.16)]";
};

export default async function ContratosAdminPage() {
  const contracts = await getContracts();

  const approvedContracts = contracts.filter(
    (contract) => contract.status === "paid" || contract.status === "signed"
  );
  const pendingContracts = contracts.filter((contract) => contract.status === "pending");
  const canceledContracts = contracts.filter((contract) => contract.status === "canceled");

  return (
    <ContractsToastProvider>
    <div className="space-y-10">
      <SectionHeading
        title="Contratos"
        subtitle="Genera contratos, controla pendientes y crea viajes."
        kicker="Admin"
      />

      <section className="rounded-3xl border border-brand-200/70 bg-brand-100/70 shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Nuevo contrato</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Crea el contrato con los datos del viaje y la lista de pasajeros.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Agregar
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4">
            <ContractForm
              action={createContractAction}
              submitLabel="Crear contrato"
              resetOnSubmit
            />
          </div>
        </details>
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
                className="rounded-3xl border border-transparent bg-transparent shadow-none"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-stretch gap-3">
                    <div
                      className={cn(
                        "flex-1 rounded-[28px] px-6 py-4 text-brand-950",
                        getStatusCardStyles(contract.status)
                      )}
                    >
                    <div className="grid items-center gap-4 md:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contrato
                      </p>
                      <p className="font-display text-lg text-brand-950">
                        {contract.title}
                      </p>
                      <p className="text-xs text-brand-700/80">
                        {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Cliente
                      </p>
                      <p className="text-sm text-brand-900">{contract.clientName}</p>
                      <p className="text-sm text-brand-700/80">{contract.destination}</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Estado
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                        {contract.status === "pending" && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                            Pendiente
                          </span>
                        )}
                        {contract.status === "signed" && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
                            Firmado
                          </span>
                        )}
                        {contract.status === "paid" && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                            Pagado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right md:items-start md:text-left">
                      <ContractSummaryActions
                        contractId={contract.id}
                        contractTitle={contract.title}
                        contractNumber={contract.contractNumber}
                      />
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center">
                    <ContractStatusButtons contractId={contract.id} />
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
                className="rounded-3xl border border-transparent bg-transparent shadow-none"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-stretch gap-3">
                    <div
                      className={cn(
                        "flex-1 rounded-[28px] px-6 py-4 text-brand-950",
                        getStatusCardStyles(contract.status)
                      )}
                    >
                    <div className="grid items-center gap-4 md:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Contrato
                      </p>
                      <p className="font-display text-lg text-brand-950">
                        {contract.title}
                      </p>
                      <p className="text-xs text-brand-700/80">
                        {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Cliente
                      </p>
                      <p className="text-sm text-brand-900">{contract.clientName}</p>
                      <p className="text-sm text-brand-700/80">{contract.destination}</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                        Estado
                      </p>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Aprobado
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right md:items-start md:text-left">
                      <ContractSummaryActions
                        contractId={contract.id}
                        contractTitle={contract.title}
                        contractNumber={contract.contractNumber}
                      />
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center">
                    <ContractStatusButtons contractId={contract.id} />
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
          <h3 className="font-display text-lg text-brand-950">Contratos cancelados</h3>
          <span className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
            {canceledContracts.length} cancelados
          </span>
        </div>

        {canceledContracts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white/60 p-6 text-sm text-slate-600">
            No hay contratos cancelados.
          </div>
        ) : (
          <div className="grid gap-4">
            {canceledContracts.map((contract) => (
              <details
                key={contract.id}
                className="rounded-3xl border border-transparent bg-transparent shadow-none"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-stretch gap-3">
                    <div
                      className={cn(
                        "flex-1 rounded-[28px] px-6 py-4 text-brand-950",
                        getStatusCardStyles(contract.status)
                      )}
                    >
                    <div className="grid items-center gap-4 md:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Contrato
                        </p>
                        <p className="font-display text-lg text-brand-950">
                          {contract.title}
                        </p>
                        <p className="text-xs text-brand-700/80">
                          {contract.contractNumber ? `#${contract.contractNumber}` : "Sin folio"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Cliente
                        </p>
                        <p className="text-sm text-brand-900">{contract.clientName}</p>
                        <p className="text-sm text-brand-700/80">{contract.destination}</p>
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                          Estado
                        </p>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                          Cancelado
                        </span>
                      </div>
                    <div className="flex flex-col items-end gap-2 text-right md:items-start md:text-left">
                      <ContractSummaryActions
                        contractId={contract.id}
                        contractTitle={contract.title}
                        contractNumber={contract.contractNumber}
                      />
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center">
                    <ContractStatusButtons contractId={contract.id} />
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
    </ContractsToastProvider>
  );
}
