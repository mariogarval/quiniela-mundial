import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

function randomCode(len = 6) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
}

// POST /api/pool — create a new pool (and its admin user row)
export async function POST(req: Request) {
  try {
    const { name, adminName, adminEmail, entryFeeDisplay, plan } = await req.json();
    if (!name || !adminName || !adminEmail) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const sb = getServerClient();
    let joinCode = randomCode();
    for (let i = 0; i < 5; i++) {
      const { data } = await sb.from("pools").select("id").eq("join_code", joinCode).maybeSingle();
      if (!data) break;
      joinCode = randomCode();
    }

    const adminId = crypto.randomUUID();
    const { data: pool, error: poolErr } = await sb
      .from("pools")
      .insert({
        name, admin_id: adminId, admin_email: adminEmail,
        entry_fee_display: entryFeeDisplay || null,
        plan: plan === "business" ? "business" : "free",
        max_players: plan === "business" ? 10000 : 15,
        join_code: joinCode,
      })
      .select()
      .single();
    if (poolErr) throw poolErr;

    const { data: user, error: userErr } = await sb
      .from("users")
      .insert({ id: adminId, name: adminName, email: adminEmail, pool_id: pool.id, is_admin: true })
      .select()
      .single();
    if (userErr) throw userErr;

    return NextResponse.json({ pool, user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/pool — join existing pool by code
export async function PUT(req: Request) {
  try {
    const { joinCode, name, email } = await req.json();
    if (!joinCode || !name || !email) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const sb = getServerClient();
    const { data: pool } = await sb.from("pools").select("*").eq("join_code", joinCode).maybeSingle();
    if (!pool) return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });

    const { count } = await sb
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("pool_id", pool.id);
    if ((count ?? 0) >= pool.max_players) {
      return NextResponse.json({ error: "La quiniela está llena" }, { status: 409 });
    }

    // Reuse user if email already joined this pool
    const { data: existing } = await sb
      .from("users")
      .select("*")
      .eq("pool_id", pool.id)
      .eq("email", email)
      .maybeSingle();
    if (existing) return NextResponse.json({ pool, user: existing });

    const { data: user, error: userErr } = await sb
      .from("users")
      .insert({ name, email, pool_id: pool.id })
      .select()
      .single();
    if (userErr) throw userErr;

    return NextResponse.json({ pool, user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
