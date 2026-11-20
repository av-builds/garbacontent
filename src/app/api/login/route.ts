import { NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual, safeNext } from "@/lib/gate";

export async function POST(request: Request) {
  const form = await request.formData();
  const given = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));
  const password = process.env.GATE_PASSWORD;

  if (!password || !safeEqual(await gateToken(given), await gateToken(password))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", password ? "1" : "config");
    if (next !== "/library") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
