import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { poolId } = await req.json();
    if (!poolId) return NextResponse.json({ error: "poolId requerido" }, { status: 400 });

    const sb = getServerClient();

    const { count: finishedCount } = await sb
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("phase", "group")
      .eq("status", "final");

    const { count: totalGroupCount } = await sb
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("phase", "group");

    if ((finishedCount ?? 0) < (totalGroupCount ?? 72)) {
      return NextResponse.json(
        { error: "La fase de grupos aún no ha terminado" },
        { status: 422 }
      );
    }

    await sb.from("pools").update({
      knockout_unlocked: true,
      payment_status: "paid",
    }).eq("id", poolId);

    return NextResponse.json({ unlocked: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
