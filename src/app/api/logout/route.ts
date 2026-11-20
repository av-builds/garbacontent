import { NextResponse } from "next/server";
import { GATE_COOKIE } from "@/lib/gate";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  res.cookies.delete(GATE_COOKIE);
  return res;
}
