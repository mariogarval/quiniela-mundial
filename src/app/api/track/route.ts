import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// POST /api/track
// Body: { utm_source?, utm_medium?, utm_campaign?, ref_user_id? }
// Logs an affiliate click row. Fire-and-forget from the client on landing.
export async function POST(req: Request) {
  try {
    const { utm_source, utm_medium, utm_campaign, ref_user_id } = await req.json();
    if (!utm_source && !ref_user_id) {
      return NextResponse.json({ ok: false, error: "Nothing to track" }, { status: 400 });
    }

    const sb = getServerClient();
    await sb.from("affiliate_clicks").insert({
      utm_source: utm_source ?? null,
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
      ref_user_id: ref_user_id ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Tracking failures are silent — never break the user experience
    return NextResponse.json({ ok: false });
  }
}
