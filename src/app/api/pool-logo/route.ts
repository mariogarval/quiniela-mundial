import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/pool-logo  — multipart: poolId, userId, file
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const poolId = form.get("poolId") as string | null;
    const userId = form.get("userId") as string | null;
    const file = form.get("file") as File | null;

    if (!poolId || !userId || !file) {
      return NextResponse.json({ error: "poolId, userId y file son requeridos" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo no puede superar 2 MB" }, { status: 400 });
    }

    const sb = getServerClient();

    // Verify user is admin of this pool
    const { data: pool } = await sb.from("pools").select("admin_id").eq("id", poolId).maybeSingle();
    if (!pool) return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
    if (pool.admin_id !== userId) return NextResponse.json({ error: "Solo el admin puede subir el logo" }, { status: 403 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${poolId}/logo.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from("pool-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = sb.storage.from("pool-logos").getPublicUrl(path);
    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await sb.from("pools").update({ logo_url: logoUrl }).eq("id", poolId);
    if (updateErr) throw updateErr;

    return NextResponse.json({ logoUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/pool-logo?poolId=x&userId=y
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get("poolId");
  const userId = searchParams.get("userId");
  if (!poolId || !userId) return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });

  const sb = getServerClient();
  const { data: pool } = await sb.from("pools").select("admin_id").eq("id", poolId).maybeSingle();
  if (!pool || pool.admin_id !== userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await sb.storage.from("pool-logos").remove([`${poolId}/logo.jpg`, `${poolId}/logo.png`, `${poolId}/logo.webp`, `${poolId}/logo.gif`]).catch(() => {});
  await sb.from("pools").update({ logo_url: null }).eq("id", poolId);

  return NextResponse.json({ ok: true });
}
