import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contractId: string }>;
};

async function requireAdmin() {
  const admin = await getAdminFromCookies();
  return admin ? null : NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
}

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = await context.params;
  const contractId = String(params.contractId ?? "").trim();

  if (!contractId) {
    return NextResponse.json({ error: "Contract ID requerido." }, { status: 400 });
  }

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { generalNotes: true },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ notes: contract.generalNotes ?? "" });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Error al cargar notas." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = await context.params;
  const contractId = String(params.contractId ?? "").trim();

  if (!contractId) {
    return NextResponse.json({ error: "Contract ID requerido." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const notes = String(body?.notes ?? "").trim() || null;

    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: { generalNotes: notes },
      select: { generalNotes: true },
    });

    return NextResponse.json({ notes: contract.generalNotes ?? "" });
  } catch (error) {
    console.error("Error saving notes:", error);
    return NextResponse.json({ error: "Error al guardar notas." }, { status: 500 });
  }
}
