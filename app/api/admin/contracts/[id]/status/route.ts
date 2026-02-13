import { NextResponse } from "next/server";

import { getContractById, syncTripFromContract, updateContract } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth/admin";
import { canEditContractByRole } from "@/lib/contracts/edit-policy";
import type { ContractStatus } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: "Falta el id del contrato." }, { status: 400 });
  }

  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const contract = await getContractById(id);
  if (!contract) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  if (!canEditContractByRole(admin.role, contract.createdAt)) {
    return NextResponse.json({ error: "Este contrato ya no se puede editar." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "").trim();
  const allowed: ContractStatus[] = ["pending", "signed", "paid", "canceled"];
  if (!allowed.includes(status as ContractStatus)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const normalizedStatus = status as ContractStatus;
  const isSigned = normalizedStatus === "signed" || normalizedStatus === "paid";
  const isPaid = normalizedStatus === "paid";

  const updated = await updateContract(id, {
    status: normalizedStatus,
    isSigned,
    isPaid,
  });

  if (!updated) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  await syncTripFromContract(updated);
  return NextResponse.json({ status: updated.status });
}
