"use client";

import { useEffect, useState } from "react";

function GoogleG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className={className}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

/**
 * Login com Google via SSO (SAML2):
 * abre {sso}/issue num popup → após o Google, o SSO faz postMessage({code})
 * → enviamos o code pro /api/auth/callback (valida + cookie) → entra no painel.
 */
export function GoogleLoginButton({ ssoBase }: { ssoBase: string }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // limpa o ?erro=... da URL (vindo do proxy) só visualmente
  useEffect(() => {}, []);

  function entrar() {
    setErro(null);
    setLoading(true);

    const w = 500;
    const h = 620;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(
      `${ssoBase}/issue`,
      "sso-login",
      `width=${w},height=${h},left=${left},top=${top}`
    );

    if (!popup) {
      setErro("O popup foi bloqueado. Permita popups para este site e tente de novo.");
      setLoading(false);
      return;
    }

    let recebeu = false; // se chegou a receber o token do SSO

    function onMsg(e: MessageEvent) {
      // segurança: só aceita mensagem vinda do próprio SSO
      if (e.origin !== ssoBase) return;
      const code = (e.data && (e.data as { code?: string }).code) || "";
      if (!code) return;
      recebeu = true;
      window.removeEventListener("message", onMsg);
      try {
        popup?.close();
      } catch {}

      fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) window.location.href = "/";
          else {
            setErro(d.erro ?? "Não foi possível autenticar. Tente novamente.");
            setLoading(false);
          }
        })
        .catch(() => {
          setErro("Erro de conexão. Tente novamente.");
          setLoading(false);
        });
    }

    window.addEventListener("message", onMsg);

    // se o popup fechar SEM ter mandado o token, o login não foi concluído
    // (conta fora do Workspace autorizado, cancelou, etc.)
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", onMsg);
        if (!recebeu) {
          setErro(
            "Login não concluído. Use a conta Google Workspace autorizada (não funciona com conta Google pessoal). " +
              "Se a conta é autorizada e o erro continuar, o seu usuário pode não estar liberado nesse app — fale com a TI."
          );
        }
        setLoading(false);
      }
    }, 500);
  }

  return (
    <>
      <button
        onClick={entrar}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <GoogleG className="h-5 w-5" />
        {loading ? "Entrando…" : "Entrar com o Google"}
      </button>
      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{erro}</p>
      )}
    </>
  );
}
