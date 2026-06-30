import { BrandIcon } from "@/components/BrandIcon";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { ssoBase } from "@/lib/sso";
import { BRAND_NAME } from "@/lib/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const base = ssoBase();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Fundo: cor da marca + foto embaçada + degradê */}
      <div className="absolute inset-0 bg-[#1f5237]" />
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-[6px]"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1f5237]/90 via-[#1f5237]/80 to-[#143a22]/90" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <BrandIcon className="mb-5 h-24 w-24 drop-shadow-lg" />

        <div className="w-full rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="text-center leading-none">
            <div className="text-2xl font-semibold tracking-[0.25em] text-[#1f5237]">{BRAND_NAME.toUpperCase()}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.4em] text-[#2d6a40]">
              FINANCEIRO
            </div>
          </div>

          <div className="my-5 h-px bg-slate-200" />

          <h1 className="mb-5 text-center text-base font-medium text-slate-700">Painel Financeiro</h1>

          {erro && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
              Sua sessão expirou ou não foi autenticada. Entre novamente.
            </p>
          )}

          {base ? (
            <GoogleLoginButton ssoBase={base} />
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
              SSO não configurado. Avise a TI.
            </p>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            Acesso com a conta Google Workspace autorizada.
          </p>
        </div>
      </div>
    </div>
  );
}
