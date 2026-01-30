import { SectionHeading } from "@/components/section-heading";
import { getContracts } from "@/lib/db";

import { ContractForm } from "./ContractForm";
import ContractsToastProvider from "./ContractsToastProvider";
import ContractsSection from "./ContractsSection";
import ImportContractsForm from "./ImportContractsForm";
import {
  createContractAction,
  deleteContractAction,
  bulkDeleteContractsAction,
  updateContractAction,
} from "./actions";
import { SyncClientsButton } from "./SyncClientsButton";

export const dynamic = "force-dynamic";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Contratos"
          subtitle="Genera contratos, controla pendientes y crea viajes."
          kicker="Admin"
        />
        <SyncClientsButton />
      </div>

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

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <details className="group">
          <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-950">Importar contratos</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Sube un Excel para crear contratos, viajes y clientes del 2025.
                </p>
              </div>
              <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Importar
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4">
            <ImportContractsForm />
          </div>
        </details>
      </section>

      <ContractsSection
        title="Contratos pendientes"
        badgeLabel={`${pendingContracts.length} pendientes`}
        emptyMessage="No hay contratos pendientes por revisar."
        contracts={pendingContracts}
        updateAction={updateContractAction}
        deleteAction={deleteContractAction}
        bulkDeleteAction={bulkDeleteContractsAction}
      />

      <ContractsSection
        title="Contratos aprobados"
        badgeLabel={`${approvedContracts.length} aprobados`}
        emptyMessage="Aún no hay contratos aprobados."
        contracts={approvedContracts}
        updateAction={updateContractAction}
        deleteAction={deleteContractAction}
        bulkDeleteAction={bulkDeleteContractsAction}
        enableSort
      />

      <ContractsSection
        title="Contratos cancelados"
        badgeLabel={`${canceledContracts.length} cancelados`}
        emptyMessage="No hay contratos cancelados."
        contracts={canceledContracts}
        updateAction={updateContractAction}
        deleteAction={deleteContractAction}
        bulkDeleteAction={bulkDeleteContractsAction}
      />
    </div>
    </ContractsToastProvider>
  );
}
