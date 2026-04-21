import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { createLSCheckout } from "@/lib/lemon-squeezy";

// POST /api/ai/unlock
// Body: { userId, poolId }
// Creates a $2.99 Lemon Squeezy checkout to unlock AI predictions for the full tournament
export async function POST(req: Request) {
  try {
    const { userId, poolId } = await req.json();
    if (!userId || !poolId) {
      return NextResponse.json({ error: "userId y poolId requeridos" }, { status: 400 });
    }

    const productId = process.env.LEMONSQUEEZY_PRODUCT_ID_AI;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!productId || !apiKey || !storeId) {
      // Dev fallback: auto-grant AI access without payment
      const sb = getServerClient();
      await sb
        .from("ai_purchases")
        .upsert({ user_id: userId, pool_id: poolId }, { onConflict: "user_id,pool_id" });
      return NextResponse.json({ checkoutUrl: null, unlocked: true });
    }

    const checkoutUrl = await createLSCheckout(apiKey, storeId, productId, 299, {
      user_id: userId,
      pool_id: poolId,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
