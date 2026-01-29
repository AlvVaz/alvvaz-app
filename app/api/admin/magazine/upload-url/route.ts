import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type FileDescriptor = {
  name: string;
  type: string;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const issueId = String(payload.issueId ?? "").trim();
  const files = Array.isArray(payload.files) ? (payload.files as FileDescriptor[]) : [];

  if (!issueId || files.length === 0) {
    return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "magazine";

  const uploads = [];

  for (const [index, file] of files.entries()) {
    const name = String(file.name ?? "").trim();
    const mime = String(file.type ?? "").trim();
    const kind =
      mime === "application/pdf" ? "PDF" : mime.startsWith("image/") ? "IMAGE" : null;
    if (!name || !kind) {
      return NextResponse.json(
        { ok: false, error: "Formato no soportado" },
        { status: 400 }
      );
    }

    const safeName = name.replace(/[/\\]/g, "_");
    const storagePath = `issues/${issueId}/${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl || !data?.token) {
      return NextResponse.json(
        { ok: false, error: "No se pudo preparar la subida" },
        { status: 500 }
      );
    }

    uploads.push({
      index,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
      kind,
      mime,
      originalName: name,
    });
  }

  return NextResponse.json({ ok: true, bucket, uploads });
}
