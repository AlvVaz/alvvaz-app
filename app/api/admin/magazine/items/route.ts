import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { createMagazineItem } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const issueId = String(formData.get("issueId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const files = formData.getAll("file").filter((item) => item instanceof File) as File[];

  if (!issueId || files.length === 0) {
    return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "magazine";

  const uploaded: { fileUrl: string }[] = [];

  for (const file of files) {
    const mime = file.type;
    const kind = mime === "application/pdf" ? "PDF" : mime.startsWith("image/") ? "IMAGE" : null;

    if (!kind) {
      return NextResponse.json({ ok: false, error: "Formato no soportado" }, { status: 400 });
    }

    const extension = mime === "application/pdf" ? "pdf" : file.name.split(".").pop() || "img";
    const safeName = `${Date.now()}-${randomUUID()}.${extension}`;
    const storagePath = `issues/${issueId}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mime, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: "No se pudo subir el archivo" },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const fileUrl = publicData.publicUrl;
    const resolvedTitle = title || file.name.replace(/\.[^/.]+$/, "") || "Archivo";

    try {
      await createMagazineItem({
        issueId,
        title: resolvedTitle,
        kind,
        fileUrl,
        metadata: { mime, originalName: file.name, bucket, storagePath },
      });
    } catch (error) {
      return NextResponse.json({ ok: false, error: "Issue no encontrado" }, { status: 404 });
    }

    uploaded.push({ fileUrl });
  }

  return NextResponse.json({ ok: true, files: uploaded });
}

// TODO: Add virus scan or file validation before production use.
