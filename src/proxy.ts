import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual } from "@/lib/gate";

const PUBLIC = ["/login", "/api/login"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const password = process.env.GATE_PASSWORD;
  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  // Fail closed: with no GATE_PASSWORD configured nobody gets in.
  if (password && cookie && safeEqual(cookie, await gateToken(password))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
