/**
 * SSO Google Workspace (SAML2) — serviço externo do escritório.
 * Fluxo: botão → /api/auth/login → {SSO}/issue?redirect_uri=... → Google →
 * volta em /api/auth/callback?token=<uuid> → valida no {SSO}/validate → cookie.
 */
import { config } from "./config";

export const SSO_COOKIE = "painel_sso";

export function ssoBase(): string {
  return config.sso.baseUrl;
}

/** Valida o token no SSO. Válido = HTTP 200 + JSON {status:"valid"}. */
export async function validarToken(token: string): Promise<boolean> {
  const base = ssoBase();
  if (!base || !token) return false;
  try {
    const r = await fetch(`${base}/validate`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return false;
    const data = (await r.json().catch(() => null)) as { status?: string } | null;
    return data?.status === "valid";
  } catch {
    return false;
  }
}
