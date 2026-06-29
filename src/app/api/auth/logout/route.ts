import { NextResponse } from "next/server";
import { SSO_COOKIE } from "@/lib/sso";

export const runtime = "nodejs";

export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SSO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
