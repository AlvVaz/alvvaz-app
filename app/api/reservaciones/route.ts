import { NextResponse } from "next/server";

const requiredFields = ["nombre", "email", "telefono", "destino", "fechas"];

export async function POST(request: Request) {
  const data = await request.json();

  const missing = requiredFields.filter((field) => !data?.[field]);
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Datos incompletos", missing },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
