import { NextResponse } from "next/server";
import { verifyLSSignature } from "@/lib/lemon-squeezy";
import { getServerClient } from "@/lib/supabase";

// POST — Lemon Squeezy webhook: order_created → grant AI access to user
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifyLSSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventName: string = event?.meta?.event_name ?? "";

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userId: string | undefined = event?.meta?.custom_data?.user_id;
  const poolId: string | undefined = event?.meta?.custom_data?.pool_id;

  if (!userId || !poolId) {
    return NextResponse.json({ error: "No user_id or pool_id in custom_data" }, { status: 400 });
  }

  const sb = getServerClient();
  await sb
    .from("ai_purchases")
    .upsert({ user_id: userId, pool_id: poolId }, { onConflict: "user_id,pool_id" });

  return NextResponse.json({ ok: true });
}
