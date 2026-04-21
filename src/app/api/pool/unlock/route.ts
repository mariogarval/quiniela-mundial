import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { createLSCheckout } from "@/lib/lemon-squeezy";

// POST — initiate Lemon Squeezy checkout to unlock knockout phase
export async function POST(req: Request) {
  try {
    const { poolId } = await req.json();
    if (!poolId) return NextResponse.json({ error: "poolId requerido" }, { status: 400 });

    const sb = getServerClient();

    // Verify all 72 group matches are finished
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

    const productId = process.env.LEMONSQUEEZY_PRODUCT_ID_KNOCKOUT;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!productId || !apiKey || !storeId) {
      // Dev fallback: auto-unlock without payment
      await sb.from("pools").update({
        knockout_unlocked: true,
        payment_status: "paid",
      }).eq("id", poolId);
      return NextResponse.json({ checkoutUrl: null, unlocked: true });
    }

    const checkoutUrl = await createLSCheckout(apiKey, storeId, productId, 499, { pool_id: poolId });
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — admin declines knockout phase, pool status → completed
export async function DELETE(req: Request) {
  try {
    const { poolId } = await req.json();
    if (!poolId) return NextResponse.json({ error: "poolId requerido" }, { status: 400 });

    const sb = getServerClient();
    await sb.from("pools").update({
      status: "completed",
      payment_status: "declined",
    }).eq("id", poolId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
