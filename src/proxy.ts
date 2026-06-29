import { NextResponse, type NextRequest } from "next/server";
import { SSO_COOKIE, validarToken } from "@/lib/sso";
import { authDispensado } from "@/lib/config";

// Rotas livres (não exigem token): login, as rotas de auth e o cron (protegido por segredo).
const LIVRE = ["/login", "/api/auth", "/api/cron-sync"];

// Cache best-effort das validações OK (token -> timestamp) para não chamar o
// /validate do SSO em toda requisição. TTL curto.
const cacheOk = new Map<string, number>();
const TTL = 60_000;

async function tokenValido(token: string): Promise<boolean> {
  const at = cacheOk.get(token);
  if (at && Date.now() - at < TTL) return true;
  const ok = await validarToken(token);
  if (ok) cacheOk.set(token, Date.now());
  else cacheOk.delete(token);
  return ok;
}

export async function proxy(req: NextRequest) {
  // Dev sem SSO configurado: acesso direto (só localhost). Em produção nunca cai aqui.
  if (authDispensado) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (LIVRE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  // libera arquivos estáticos da pasta public (imagens, fontes, etc.)
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|map|woff2?|ttf|eot|txt)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SSO_COOKIE)?.value;
  if (token && (await tokenValido(token))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
