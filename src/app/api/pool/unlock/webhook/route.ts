import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getServerClient } from "@/lib/supabase";

// POST — Lemon Squeezy webhook: order_created → unlock knockout phase
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

  // Verify webhook signature
  const expectedSig = createHmac("sha256", secret).update(body).digest("hex");
  if (signature !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventName: string = event?.meta?.event_name ?? "";

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const poolId: string | undefined = event?.meta?.custom_data?.pool_id;
  if (!poolId) {
    return NextResponse.json({ error: "No pool_id in custom_data" }, { status: 400 });
  }

  const sb = getServerClient();
  await sb.from("pools").update({
    knockout_unlocked: true,
    payment_status: "paid",
  }).eq("id", poolId);

  return NextResponse.json({ ok: true });
}
