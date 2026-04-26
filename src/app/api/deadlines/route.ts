import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET() {
  const sb = getServerClient();
  const { data } = await sb.from("tournament_state")
    .select("group_edit_deadline, bracket_edit_deadline")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({
    groupEditDeadline: data?.group_edit_deadline ?? null,
    bracketEditDeadline: data?.bracket_edit_deadline ?? null,
  });
}
