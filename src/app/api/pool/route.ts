import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

function randomCode(len = 6) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
}

// POST /api/pool — create a new pool (and its admin user row)
export async function POST(req: Request) {
  try {
    const { name, adminName, adminEmail } = await req.json();
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
        plan: "free",
        max_players: 10000,
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
    const { joinCode, name, email, referredBy, utm_source, utm_medium, utm_campaign } = await req.json();
    if (!joinCode || !name || !email) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const sb = getServerClient();
    const { data: pool } = await sb.from("pools").select("*").eq("join_code", joinCode).maybeSingle();
    if (!pool) return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });

    // Reuse user if email already joined this pool
    const { data: existing } = await sb
      .from("users")
      .select("*")
      .eq("pool_id", pool.id)
      .eq("email", email)
      .maybeSingle();
    if (existing) return NextResponse.json({ pool, user: existing });

    const newUser: Record<string, unknown> = { name, email, pool_id: pool.id };
    if (referredBy) newUser.referred_by = referredBy;
    if (utm_source) newUser.utm_source = utm_source;
    if (utm_medium) newUser.utm_medium = utm_medium;
    if (utm_campaign) newUser.utm_campaign = utm_campaign;

    const { data: user, error: userErr } = await sb
      .from("users")
      .insert(newUser)
      .select()
      .single();
    if (userErr) throw userErr;

    // Increment referral_count for the referrer (best-effort)
    if (referredBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb.rpc("increment_referral_count", { ref_user_id: referredBy }) as any).catch(() => {});
    }

    return NextResponse.json({ pool, user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
