import { NextResponse } from "next/server";
import { SSO_COOKIE, validarToken } from "@/lib/sso";

export const runtime = "nodejs";

/**
 * Recebe o code (token UUID) capturado no front via popup+postMessage,
 * valida no {SSO}/validate e cria o cookie de sessão.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code || !(await validarToken(code))) {
    return NextResponse.json({ ok: false, erro: "Código inválido ou expirado." }, { status: 401 });
  }

  const https = (req.headers.get("x-forwarded-proto") ?? "https") === "https";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SSO_COOKIE, code, {
    httpOnly: true,
    secure: https, // em http (localhost/dev) não marca secure, senão o cookie some
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
