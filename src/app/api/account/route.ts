import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });

  const sb = getServerClient();
  const { data: users } = await sb
    .from("users")
    .select("id, name, pool_id, pools(name)")
    .eq("email", email);

  if (!users?.length) return NextResponse.json({ memberships: [] });

  const memberships = users.map((u) => ({
    userId: u.id,
    poolId: u.pool_id,
    poolName: (u.pools as unknown as { name: string } | null)?.name ?? "Quiniela",
    userName: u.name,
  }));

  return NextResponse.json({ memberships });
}
