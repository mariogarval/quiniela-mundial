import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get("NEXT_LOCALE")) {
    const acceptLang = request.headers.get("accept-language") ?? "";
    const locale = acceptLang.toLowerCase().startsWith("en") ? "en" : "es";
    response.cookies.set("NEXT_LOCALE", locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon).*)"],
};
