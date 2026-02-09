import { NextResponse } from "next/server";

import { syncTripFromContract, updateContract } from "@/lib/db";
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
