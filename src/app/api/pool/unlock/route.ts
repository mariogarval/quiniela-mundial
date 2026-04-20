import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

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

    if (!productId || !apiKey) {
      // Dev fallback: auto-unlock without payment
      await sb.from("pools").update({
        knockout_unlocked: true,
        payment_status: "paid",
      }).eq("id", poolId);
      return NextResponse.json({ checkoutUrl: null, unlocked: true });
    }

    // Create Lemon Squeezy checkout
    const lsRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            custom_price: 499, // $4.99 in cents
            checkout_data: {
              custom: { pool_id: poolId },
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID },
            },
            variant: {
              data: { type: "variants", id: productId },
            },
          },
        },
      }),
    });

    if (!lsRes.ok) {
      const err = await lsRes.json();
      throw new Error(err?.errors?.[0]?.detail ?? "Lemon Squeezy error");
    }

    const lsData = await lsRes.json();
    const checkoutUrl = lsData?.data?.attributes?.url;

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
