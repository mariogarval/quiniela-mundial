import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  if (password !== expected) return NextResponse.json({ error: "Incorrect" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("qm_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
