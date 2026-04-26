import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = getServerClient();
    const { data, error } = await sb.from("tournament_state")
      .select("group_edit_deadline, bracket_edit_deadline")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      // Columns may not exist yet (migration pending) — return null deadlines
      return NextResponse.json({ groupEditDeadline: null, bracketEditDeadline: null });
    }
    return NextResponse.json({
      groupEditDeadline: data?.group_edit_deadline ?? null,
      bracketEditDeadline: data?.bracket_edit_deadline ?? null,
    });
  } catch {
    return NextResponse.json({ groupEditDeadline: null, bracketEditDeadline: null });
  }
}
